---
title: "High Availability and Redundancy"
sidebar_label: "HA & Redundancy"
sidebar_position: 71
---

# High Availability and Redundancy

High availability (HA) is engineered into a network at every layer — from redundant power supplies to dual ISP connections, from HSRP for gateway failover to BGP for path diversity. This page covers the design patterns and protocols that keep networks running when components fail.

---

## Availability Mathematics

```
Availability = uptime / (uptime + downtime) × 100%

"Five nines" = 99.999% = 5.26 minutes downtime per year
"Four nines" = 99.99%  = 52.6 minutes downtime per year
"Three nines" = 99.9%  = 8.76 hours downtime per year

Combining redundant components (parallel systems):
  Two independent components, each 99% available:
  Combined unavailability = 0.01 × 0.01 = 0.0001 = 99.99% available
  Parallel redundancy dramatically improves availability

Serial components (all must work):
  Two components, each 99% available, both required:
  Combined availability = 0.99 × 0.99 = 98.01%
  Every dependency in series reduces overall availability

Key metric: MTTR (Mean Time To Repair)
  Lower MTTR → higher availability (even with same MTBF)
  Automation reduces MTTR by detecting and responding faster than humans
  Pre-staged spares reduce MTTR for hardware failures

Recovery objectives:
  RTO (Recovery Time Objective): maximum acceptable downtime
  RPO (Recovery Point Objective): maximum acceptable data loss window
  Hot standby: RTO ≈ seconds (automatic failover)
  Warm standby: RTO = minutes (some manual intervention)
  Cold standby: RTO = hours (full manual rebuild)
```

---

## Layer 1/2 Redundancy

### Physical Redundancy

```
Redundant power:
  Dual power supplies in switches/routers (connect to separate UPS/PDU)
  Generator backup for UPS
  Separate utility feeds from different substations (for critical DCs)

Redundant uplinks (Switch stacking / chassis):
  Cisco StackWise / StackWise Virtual: 2-8 switches as one logical switch
    Single management plane; active/active uplinks; no STP between stacked switches
  Cisco VSS (Virtual Switching System): two Catalyst 6K/9K as one logical switch
  Cisco Nexus vPC: two Nexus switches present as one switch to downstream
  Benefits: eliminate STP (port-channel spans both chassis), hitless failover

Link aggregation (LACP):
  Bond 2-8 links → single logical port; active-active load sharing
  ECMP across member links (per-flow hashing)
  Member failure: traffic re-hashed to remaining links
  See: EtherChannel page for full detail

Redundant cabling paths:
  Critical links: duplex fiber (separate physical paths through building)
  MRC (Meet-Me Room) diversity: cables enter DC from different sides
  Never run primary and backup cables in the same conduit/tray
```

### LACP Link Aggregation (Quick Reference)

```cisco
! Active-active LACP (both sides: active)
interface Port-channel1
 description "LACP Bond to Core"
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30

interface GigabitEthernet1/0/1
 channel-group 1 mode active
interface GigabitEthernet1/0/2
 channel-group 1 mode active

! LACP fast timers (detect failure in 3 seconds vs 30 seconds default)
interface GigabitEthernet1/0/1
 lacp rate fast
```

---

## Layer 3 Gateway Redundancy

When a host's default gateway fails, it can't reach anything outside its subnet. HSRP, VRRP, and GLBP solve this.

### HSRP — Hot Standby Router Protocol (Cisco)

```
HSRP creates a virtual IP (VIP) and virtual MAC shared between two routers.
One is Active (forwards traffic); one is Standby (monitors; takes over on failure).

How it works:
  Virtual IP: 192.168.1.1 (configured on both routers; not a real interface IP)
  Virtual MAC: 0000.0c07.ac[group] (Cisco proprietary)
  Hosts configure default gateway = virtual IP
  Active router: responds to ARP for VIP; forwards traffic
  Standby router: monitors Active via Hello messages (every 3 seconds)
  Active failure detected (missed 3 Hellos = 10 second dead timer):
    Standby promotes to Active; begins responding to VIP
    ARP Gratuitous sent: updates ARP caches on segment
    Failover: ~10 seconds default; configurable to 1-2 seconds

States:
  Initial → Learn → Listen → Speak → Standby → Active

Cisco HSRP config:
  ! Router 1 (preferred Active — higher priority)
  interface GigabitEthernet0/0
   ip address 192.168.1.2 255.255.255.0    ! real IP
   standby 1 ip 192.168.1.1               ! virtual IP (HSRP group 1)
   standby 1 priority 110                  ! higher than default 100
   standby 1 preempt                       ! take back Active when recovered
   standby 1 timers msec 200 msec 750     ! aggressive: 200ms hello, 750ms hold
   standby 1 authentication md5 key-string MyHSRPKey
   standby 1 track GigabitEthernet0/1 20  ! decrement priority 20 if Gi0/1 goes down

  ! Router 2 (Standby)
  interface GigabitEthernet0/0
   ip address 192.168.1.3 255.255.255.0
   standby 1 ip 192.168.1.1
   standby 1 priority 100                  ! lower; stays Standby
   standby 1 preempt
   standby 1 timers msec 200 msec 750

  ! Verify
  Router# show standby
  Router# show standby brief

HSRP tracking:
  If uplink (Gi0/1) fails → Active Router drops priority by 20 → becomes 90
  Standby (priority 100) > Active (priority 90) → Standby preempts → becomes Active
  Traffic shifts to router that still has a working uplink
```

### VRRP — Virtual Router Redundancy Protocol (Open Standard)

```
RFC 5798 (v3); functionally identical to HSRP
  Virtual MAC: 0000.5e00.01[group] (IANA-assigned)
  Hello interval: 1 second default (faster configurable with v3)
  Master vs Backup (vs HSRP's Active vs Standby)
  Supports IPv4 and IPv6 (v3)

Cisco VRRP config:
  interface GigabitEthernet0/0
   ip address 192.168.1.2 255.255.255.0
   vrrp 1 ip 192.168.1.1
   vrrp 1 priority 110
   vrrp 1 preempt
   vrrp 1 timers advertise msec 200

Key VRRP difference from HSRP:
  IP address owner: router whose actual IP = VIP is always Master (can't be preempted)
  If no IP owner: highest priority wins (same as HSRP)
  VRRP uses IP multicast 224.0.0.18 (vs HSRP 224.0.0.2)
```

### GLBP — Gateway Load Balancing Protocol (Cisco)

```
GLBP provides both redundancy AND load balancing:
  One Active Virtual Gateway (AVG): responds to ARP requests for virtual IP
  Up to 4 Active Virtual Forwarders (AVF): each has different virtual MAC
  AVG returns different virtual MACs in round-robin to ARP requests
  Different hosts send to different routers → active-active load balancing

Configuration:
  interface GigabitEthernet0/0
   glbp 1 ip 192.168.1.1
   glbp 1 priority 110
   glbp 1 preempt
   glbp 1 load-balancing round-robin   ! or: host-dependent, weighted
```

### Comparison

| Feature | HSRP | VRRP | GLBP |
|---|---|---|---|
| Standard | Cisco proprietary | Open (RFC 5798) | Cisco proprietary |
| Load balancing | No (active-standby) | No | Yes (active-active) |
| IPv6 support | HSRPv2 | VRRPv3 | Yes |
| Max groups | 255 | 255 | 1024 |
| Use when | Simple redundancy | Multi-vendor | Active-active LB |

---

## WAN Redundancy

### Dual ISP

```
Dual-homed: two ISPs with independent circuits
  Primary and backup: one ISP active, other dormant (or both active with policy)

BGP-based dual ISP (best practice):
  Your AS: 65001; ISP A: 65002; ISP B: 65003
  You advertise your prefix to BOTH ISPs
  You receive routes from both ISPs

Outbound traffic policy (which ISP you use for outbound):
  Set LOCAL_PREF higher on preferred ISP routes
  route-map ISP-A-IN: set local-preference 200  → prefer ISP A
  route-map ISP-B-IN: set local-preference 100  → use ISP B only as fallback

Inbound traffic policy (which ISP others use to reach you):
  AS_PATH prepending to make one path less preferred
  route-map TO-ISP-B: set as-path prepend 65001 65001
  Others see: AS_PATH [65002 65001 65001] via ISP B vs [65002 65001] via ISP A → prefer ISP A

Static default with tracking (simpler alternative to BGP):
  ip route 0.0.0.0 0.0.0.0 ISP-A-GW 10 track 10   ! primary (AD 10)
  ip route 0.0.0.0 0.0.0.0 ISP-B-GW 20 track 20   ! backup (AD 20, lower priority)

  ip sla 10
   icmp-echo 8.8.8.8 source-interface GigabitEthernet0/0
   frequency 5
  ip sla schedule 10 life forever start-time now

  track 10 ip sla 10 reachability   ! track ISP A path
  ! If 8.8.8.8 unreachable via ISP A: primary static route removed; backup installs
```

---

## Data Center HA — Spine-Leaf Redundancy

```
Every server connected to TWO leaf switches (dual-homed via LACP):
  MLAG / vPC: two leaf switches appear as one switch to server
  Server NIC teaming: active-active bond across both leaf switches

Every leaf connected to ALL spine switches:
  Full any-to-any connectivity
  ECMP: traffic load-balanced across all spine paths
  Spine failure: traffic re-hashed to remaining spines

Any component failure:
  Server NIC fails: other NIC continues; no service interruption
  Leaf switch fails: other leaf carries all traffic
  Spine switch fails: ECMP re-hashes to remaining spines
  Link fails: LACP removes from bond; other links carry traffic

Result:
  N-1 redundancy: any single component can fail with zero downtime
  N-2 (with more spines): two simultaneous failures tolerated
```

---

## Stateful Device HA — Firewall Failover

```
Active/Standby firewall HA:
  Primary and secondary firewall synchronize state table
  Connection table mirrored via dedicated HA link (or over network link)
  Secondary monitors primary via failover link (heartbeat)
  If primary fails: secondary promotes to active; existing connections maintained
  Client doesn't notice: same IP (virtual IP or shared IP); state preserved

Cisco ASA HA:
  failover
  failover lan unit primary
  failover lan interface ha GigabitEthernet0/2
  failover link ha GigabitEthernet0/2
  failover interface ip ha 10.10.10.1 255.255.255.252 standby 10.10.10.2

Active/Active firewall HA:
  Each firewall handles traffic from different contexts/VLANs
  Load balanced; both active simultaneously
  State still synchronized
  More complex; requires GLBP or ECMP to distribute traffic

Stateless failover (acceptable for stateless protocols):
  New requests simply go to the standby after it promotes
  TCP connections during failover: client must reconnect (stateless)
  For web apps with short-lived requests: often acceptable
```

---

## Disaster Recovery

### Design Tiers (Uptime Institute)

```
Tier 1: Basic site infrastructure
  Single path power + cooling; no redundancy
  94.99% availability; 28.8 hours downtime/year
  Small businesses; acceptable for non-critical systems

Tier 2: Redundant capacity components
  Redundant power and cooling; single path distribution
  99.741% availability; 22 hours downtime/year

Tier 3: Concurrently maintainable
  Multiple active power and cooling paths; N+1 minimum
  Maintenance without shutting down anything
  99.982% availability; 1.6 hours downtime/year

Tier 4: Fault tolerant
  Fully redundant; 2N power and cooling
  Any single failure has no impact
  99.995% availability; 0.4 hours downtime/year

Active-Active DC: both data centers serve traffic simultaneously
  GSLB (Global Server Load Balancing): DNS-based traffic distribution
  Data replication: synchronous (zero RPO) or asynchronous (small RPO)
  On failure: GSLB redirects DNS; all traffic to surviving DC
  Network requirement: both DCs advertise same prefixes (anycast BGP)

Active-Passive DC: primary DC serves traffic; DR DC is on hot standby
  Simpler; data replicated to DR
  On failure: promote DR to active; update DNS/BGP; direct traffic
  RTO: 15-60 minutes typically; RPO: depends on replication lag
```

---

## Tips

- Set HSRP/VRRP timers aggressively (200ms hello, 750ms hold) on critical gateway links — the default 10-second failover causes noticeable outage; sub-second is achievable.
- Enable preempt on the preferred Active router — without it, when the primary recovers, the standby stays active indefinitely (sub-optimal path).
- For dual-ISP redundancy with BGP, always send your prefix to both ISPs — if only one ISP knows your prefix, inbound traffic can't failover when that ISP has issues.
- Test HA failover regularly — documented HA that's never been tested often has silent failures (HA link broken, state sync not working) discovered only during a real outage.
- GLBP is elegant but adds complexity — only use it when you need active-active gateway load balancing; HSRP/VRRP is simpler for most environments.

---

## Summary

- Five nines (99.999%) = 5.26 minutes downtime/year — require redundancy at every layer to approach this.
- HSRP/VRRP: virtual gateway IP/MAC shared between two routers; Active/Master forwards; Standby/Backup takes over on failure in 1-10 seconds (configurable).
- Aggressive HSRP timers: `standby 1 timers msec 200 msec 750` — reduces failover from 10s to ~750ms.
- Track uplinks with HSRP `track` command — if the uplink fails, decrement priority so Standby with working uplink becomes Active.
- Dual-ISP with BGP: LOCAL_PREF controls outbound path; AS_PATH prepend influences inbound path; IP SLA + floating static is a simpler alternative.
- HA requires testing — untested failover procedures often fail when needed; schedule regular failover drills.
