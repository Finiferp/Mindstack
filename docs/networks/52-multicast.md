---
title: "IP Multicast"
sidebar_label: "IP Multicast"
sidebar_position: 52
---

# IP Multicast

Multicast delivers one stream to many receivers simultaneously — a router sends a single copy until it must be duplicated for different paths. Without multicast, a one-to-ten-thousand stream would require 10,000 unicast copies of every packet.

---

## Unicast vs Multicast vs Broadcast

```
Unicast:                         Multicast:                    Broadcast:
  Sender → Router → Receiver1     Sender → Router              Sender → All on subnet
                  → Router        ├── → Receiver1
                  → ...           └── → Receiver2               Doesn't cross routers
  Problem: 1000 receivers =      One copy until split           Limited to L2 segment
  1000 copies from sender        Point of replication = router
```

---

## IP Multicast Addressing

### IPv4 Multicast

```
Range: 224.0.0.0/4 (Class D: 1110xxxx.xxx...)
  224.0.0.0/24  — Link-local (not forwarded by routers)
    224.0.0.1  — All hosts
    224.0.0.2  — All routers
    224.0.0.5  — All OSPF routers
    224.0.0.6  — OSPF DR/BDR
    224.0.0.9  — RIPv2
    224.0.0.10 — EIGRP
    224.0.0.13 — PIM routers
    224.0.0.18 — VRRP
    224.0.0.22 — IGMPv3

  224.0.1.0/24 — Internetwork Control (routed)
    224.0.1.1  — NTP
    224.0.1.39 — Cisco RP Announce
    224.0.1.40 — Cisco RP Discovery

  232.0.0.0/8  — Source-Specific Multicast (SSM)
  233.0.0.0/8  — GLOP (allocated per ASN)
  239.0.0.0/8  — Administratively Scoped (private; like RFC 1918 for multicast)
  All others   — Globally scoped (routable on internet)
```

### MAC Address Mapping

Multicast IP addresses map to a special range of MAC addresses:

```
OUI 01:00:5e:xx:xx:xx for IPv4 multicast
  Lower 23 bits of IP multicast address → lower 23 bits of MAC

Example:
  IP:  239.1.2.3 = 11101111.00000001.00000010.00000011
       Last 23 bits:       0000001.00000010.00000011
  MAC: 01:00:5e:01:02:03

Problem: 5 bits of the IP address are NOT in the MAC
  224.1.2.3 and 225.1.2.3 both map to 01:00:5e:01:02:03!
  → Switches see same MAC for two different multicast groups
  → Layer 2 switches can send group 224.1.2.3 to receivers of 225.1.2.3
  → Solved at L3 by IGMP snooping
```

---

## IGMP — Internet Group Management Protocol

IGMP (RFC 3376) is the protocol hosts use to join and leave multicast groups. Operates between hosts and their local router.

```
IGMP versions:
  IGMPv1 (RFC 1112, 1989): join only; leave via timeout (leave latency up to 3 minutes)
  IGMPv2 (RFC 2236, 1997): adds leave message (fast leave); group-specific query
  IGMPv3 (RFC 3376, 2002): adds Source-Specific Multicast (SSM) — specify source IP too

IGMPv2 operation:
  1. Membership Query (router → 224.0.0.1):
     "Are any of you still interested in multicast?"
     Sent every 125 seconds (Query Interval)

  2. Membership Report (host → multicast group address):
     "Yes, I want group 239.1.2.3"
     Random delay (0-10s) to suppress duplicate reports on same segment

  3. Leave Group (host → 224.0.0.2):
     "I'm leaving 239.1.2.3"
     Router sends Group-Specific Query; if no response → stops forwarding

  4. Group-Specific Query (router → 239.1.2.3):
     "Does anyone still want 239.1.2.3?"

Timers:
  Query Interval: 125s (how often to query)
  Query Response Interval: 10s (max time for hosts to respond)
  Group Membership Interval: 260s (leave if no report heard; 2×125+10)
  Last Member Query Interval: 1s (fast leave detection after Leave message)

Cisco IGMP config:
  Router(config)# ip multicast-routing             ! enable multicast routing
  Router(config-if)# ip igmp version 3
  Router(config-if)# ip igmp query-interval 60     ! more frequent queries
  Router(config-if)# ip igmp last-member-query-interval 100  ! 100ms fast leave
  Router# show ip igmp groups                      ! joined groups per interface
  Router# show ip igmp interface Gi0/0             ! IGMP state per interface
```

### IGMP Snooping (Layer 2)

```
Problem: Without snooping, a switch floods multicast to all ports (same as broadcast)
Solution: IGMP Snooping — switch intercepts IGMP messages to build a multicast
          forwarding table; only send frames to ports with active receivers

Switch IGMP snooping table:
  VLAN 10, Group 239.1.2.3 → ports Gi1/0/1, Gi1/0/3, Gi1/0/7

Cisco switch snooping config:
  Switch(config)# ip igmp snooping                 ! enabled by default
  Switch(config)# ip igmp snooping vlan 10
  Switch(config)# ip igmp snooping querier         ! switch acts as IGMP querier if no router
  Switch# show ip igmp snooping groups vlan 10
  Switch# show ip igmp snooping mrouter            ! which port leads to multicast router
```

---

## PIM — Protocol Independent Multicast

PIM is the multicast routing protocol. "Protocol Independent" because it works with any unicast routing protocol (OSPF, EIGRP, BGP, static) to build multicast forwarding trees.

### PIM Dense Mode (PIM-DM)

```
"Push" model: flood then prune
  1. Source sends multicast
  2. PIM-DM floods to ALL interfaces (including ones with no receivers)
  3. Routers with no downstream receivers send Prune messages
  4. Tree is pruned; traffic stops on pruned branches
  5. Prune timeout (3 minutes): re-flood → re-prune cycle

Disadvantages:
  Flooding wastes bandwidth (especially on large networks)
  Only good for dense networks where most routers have receivers
  Rarely used today (PIM-SM is preferred everywhere)
```

### PIM Sparse Mode (PIM-SM) — The Standard

```
"Pull" model: receivers must explicitly join
  Key component: RP (Rendezvous Point) — the meeting point for sources and receivers

Receiver joins:
  1. Host sends IGMP Join to local router
  2. Router sends PIM Join toward RP
  3. Tree built toward RP (Receiver → ... → RP)
  
Source sends:
  1. Source sends traffic → local DR (Designated Router)
  2. DR encapsulates traffic in PIM Register messages → sends to RP
  3. RP decapsulates; delivers to receivers via Shared Tree (RPT)
  4. RP sends PIM Join toward source → Source-Based Tree (SPT) built
  5. RP stops receiving Register-encapsulated; traffic flows natively source→RP

SPT Switchover (Shortest Path Tree):
  After receiving some traffic, each receiver's DR calculates the SPT
  DR sends PIM Join directly toward the source (not via RP)
  Once SPT established: RP pruned from tree
  Traffic flows source → receivers directly (optimal path, no RP overhead)
  Configurable threshold: ip pim spt-threshold infinity → never switch to SPT (RP-tree only)

PIM Hello:
  Sent every 30s to 224.0.0.13 (all PIM routers)
  DR (Designated Router) elected on each multi-access segment: highest IP wins
  DR receives IGMP from hosts; sends PIM Joins on behalf of receivers
```

### Finding the RP

```
Static RP:
  Simple; every router manually configured with RP address
  No redundancy
  ip pim rp-address 10.255.255.100

Auto-RP (Cisco proprietary):
  RP Announce: RP sends its address to 224.0.1.39 (Cisco-RP-Announce)
  RP Mapping Agent: listens; sends RP-to-group mapping to 224.0.1.40 (Cisco-RP-Discovery)
  Routers listen to 224.0.1.40 and learn RP dynamically

Bootstrap Router (BSR, RFC 5059 — open standard):
  One or more BSR candidates; routers elect a BSR
  RP candidates advertise to BSR; BSR floods RP-to-group mappings via Bootstrap messages
  Routers learn RP dynamically without manual config
  More scalable than Auto-RP; supports multiple RPs per group

Anycast RP (RFC 4610):
  Multiple routers configured with same RP address (anycast)
  All are active; nearest RP used (IGP shortest path)
  MSDP (Multicast Source Discovery Protocol) synchronizes active sources between RPs
  Best practice for redundant RP deployments

Cisco RP config:
  ip pim rp-address 10.255.255.100                  ! static RP
  ip pim rp-address 10.255.255.100 override         ! prefer this RP over auto-discovered

  ip pim autorp listener                            ! enable auto-RP listening
  ip pim send-rp-announce Loopback0 scope 16        ! advertise as RP candidate

  ip pim bsr-candidate Loopback0 32                 ! BSR candidate
  ip pim rp-candidate Loopback0 group-list ALL-GROUPS  ! RP candidate
```

### PIM Source-Specific Multicast (PIM-SSM)

```
Range: 232.0.0.0/8 (IPv4 SSM range)
Model: receivers subscribe to (Source, Group) pair — not just Group
  No RP needed — receivers join directly to source's tree
  No shared tree — optimal path immediately
  Simpler; more secure (source address known upfront; no unknown sources)

Requirements:
  IGMPv3 (to carry source address in IGMP Join)
  PIM-SSM configured on routers

Config:
  Router(config)# ip pim ssm default               ! enable SSM for 232.0.0.0/8
  Router(config)# ip pim ssm range ACCESS-LIST     ! custom SSM group range

Modern deployments often use SSM for all multicast — simpler than PIM-SM with RP
```

---

## Multicast Forwarding Table — (S, G) and (*, G)

```
Multicast routing table entries:
  (*, G) — Shared tree entry (any source, group G)
    Traffic from ANY source to group G forwarded here
    Built via PIM-SM toward RP

  (S, G) — Source-specific entry (source S, group G)
    Traffic specifically from source S to group G
    Built when SPT switchover occurs; or for SSM

(*, 239.1.2.3) [Shared Tree]:
  Incoming interface: toward RP
  Outgoing interfaces: toward receivers
  Prune state per interface

(10.0.1.100, 239.1.2.3) [Source Tree]:
  Incoming interface: toward source
  Outgoing interfaces: toward receivers
  Replaces (*,G) entry after SPT switchover

Verification:
  Router# show ip mroute               ! multicast routing table
  Router# show ip mroute summary       ! compact list of (S,G) and (*,G)
  Router# show ip pim neighbor         ! PIM neighbors
  Router# show ip pim rp mapping       ! which RP serves which groups
  Router# show ip pim interface        ! per-interface PIM mode and state
  Router# show ip rpf 10.0.1.100      ! RPF check: which interface toward source?
```

---

## RPF — Reverse Path Forwarding

RPF prevents multicast loops — a router only forwards multicast traffic if it arrives on the interface it would use to reach the SOURCE.

```
RPF check:
  Packet arrives from source S on interface X
  Router looks up S in its unicast routing table
  If the route to S points out interface X → RPF check passes → forward
  If route to S points out a DIFFERENT interface → RPF fails → DROP

Why this prevents loops:
  Multicast traffic only accepted when arriving from the "correct" direction
  Even if a loop exists at Layer 2, RPF breaks it at Layer 3

RPF failure (common issue):
  Source traffic arrives on wrong interface due to asymmetric routing
  Solution: add static mroute or use ip pim border on appropriate interface

Router# show ip rpf 10.0.1.100       ! shows RPF interface and next-hop for source
Router# ip mroute 10.0.1.100 255.255.255.255 GigabitEthernet0/0  ! static mroute
```

---

## IPv6 Multicast

IPv6 replaces broadcast with multicast entirely — no broadcast address in IPv6.

```
IPv6 multicast range: ff00::/8 (see IPv6 Addressing Deep page for full list)
Key groups:
  ff02::1 — All nodes (link-local) — replaces 255.255.255.255 (broadcast)
  ff02::2 — All routers
  ff02::5 — OSPFv3 all routers (replaces 224.0.0.5)
  ff02::d — All PIM routers

MLD (Multicast Listener Discovery):
  IPv6 equivalent of IGMP; uses ICMPv6
  MLDv1 = IGMPv2 equivalent
  MLDv2 = IGMPv3 equivalent (SSM support)
  All IPv6 nodes must implement MLDv1

PIMv6:
  Same PIM-SM concepts; operates over IPv6
  Uses link-local addresses for PIM Hello and Join/Prune messages
  Configured separately from IPv4 PIM
```

---

## Tips

- Enable IGMP snooping on all switches — without it, multicast floods like broadcast, wasting bandwidth and CPU on all devices.
- RPF check failure is the #1 troubleshooting point for multicast not flowing — use `show ip rpf <source-ip>` to verify.
- Use SSM (232.0.0.0/8 with IGMPv3) for new multicast deployments — simpler than PIM-SM, no RP complexity, more secure.
- Set RP on a loopback interface and advertise it via the IGP — loopback is always up; physical interface RP causes problems if that interface flaps.
- PIM-DM is almost never appropriate in modern networks — the flood-and-prune cycle wastes bandwidth; use PIM-SM even in small networks.

---

## Summary

- Multicast delivers one stream to many receivers by replicating at routers only where paths diverge — far more efficient than unicast per-receiver.
- IGMP (v1/v2/v3) manages host membership on a segment; IGMPv3 adds source-specific (S,G) joins for SSM.
- IGMP Snooping on switches prevents multicast flooding to non-member ports — enabled by default on modern switches.
- PIM-SM is the standard multicast routing protocol: shared tree via RP, SPT switchover for optimal paths.
- RP is the rendezvous point; discovered via static config, Auto-RP, or BSR; Anycast RP provides redundancy.
- RPF check prevents multicast loops by only accepting traffic arriving from the interface toward the source.
- SSM (PIM-SSM with IGMPv3) eliminates RP complexity entirely — receivers join specific (source, group) pairs directly.
