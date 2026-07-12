---
title: "RIP — Routing Information Protocol"
sidebar_label: "RIP"
sidebar_position: 33
---

# RIP — Routing Information Protocol

RIP is the oldest standardized routing protocol. Despite being largely obsolete in enterprise and ISP networks, its history directly influenced every protocol that followed it, and its limitations drove the creation of OSPF, EIGRP, and BGP.

---

## History

RIP's lineage traces to Xerox PARC's **GWINFO** program (1970s), used in Xerox's XNS (Xerox Network Systems) protocol suite. When the internet community needed a standard routing protocol, RIP was derived from this work.

| Year | Milestone |
|---|---|
| 1969 | ARPANET uses manually-configured routing tables |
| Early 1980s | RIP deployed informally on ARPANET; distributed with BSD Unix as `routed` |
| 1988 | **RFC 1058** — Charles Hedrick formalizes RIPv1 |
| 1993 | **RFC 1388** — RIPv2 adds VLSM, authentication, multicast updates |
| 1998 | **RFC 2453** — RIPv2 obsoletes 1388 (current standard) |
| 1997 | **RFC 2080** — RIPng (RIP for IPv6) |
| 2000s | OSPF and EIGRP displace RIP in most networks; RIP relegated to legacy/education |

The name "RIP" has a double meaning in networking culture — both "Routing Information Protocol" and, given its limitations, "Rest in Peace." Despite this, RIP deployments still exist in small networks where its simplicity outweighs its drawbacks.

---

## How RIP Works

RIP is a **distance-vector** protocol using **hop count** as its metric. Every 30 seconds, each RIP router broadcasts (v1) or multicasts (v2) its **entire routing table** to neighbors.

```
Metric: hop count
  1 hop = directly connected
  2 hops = reachable through one router
  Maximum: 15 hops (16 = infinity / unreachable)
  → This is why RIP cannot scale beyond ~15 router hops

Update behavior:
  RIPv1: broadcasts full table every 30s to 255.255.255.255
  RIPv2: multicasts full table every 30s to 224.0.0.9
  RIPng: multicasts to FF02::9 (all RIP routers link-local multicast)
```

### Timers

| Timer | Default | Purpose |
|---|---|---|
| Update | 30 seconds | Interval between full routing table broadcasts |
| Invalid | 180 seconds | If no update heard for 180s, route marked invalid (metric 16) |
| Holddown | 180 seconds | After route goes invalid, ignore better-metric updates for 180s |
| Flush | 240 seconds | Route purged from table 240s after last update |

The holddown timer prevents routing instability — if a route flaps, RIP waits 180 seconds before accepting a new path, even one that looks better.

---

## RIPv1 vs RIPv2 vs RIPng

| Feature | RIPv1 | RIPv2 | RIPng |
|---|---|---|---|
| RFC | 1058 | 2453 | 2080 |
| IP version | IPv4 | IPv4 | IPv6 |
| Updates sent to | 255.255.255.255 (broadcast) | 224.0.0.9 (multicast) | FF02::9 (multicast) |
| Subnet masks | No — classful only | Yes — VLSM/CIDR | Yes |
| Authentication | No | Yes (plain text or MD5) | No (use IPsec) |
| Next-hop field | No | Yes (explicit next-hop in update) | Yes |
| Route tags | No | Yes (mark external routes) | Yes |
| Auto-summary | Yes (classful) | Yes (can disable) | N/A |

---

## Loop Prevention in RIP

RIP uses multiple mechanisms to prevent or limit routing loops:

**Split Horizon:** Don't advertise a route back out the interface you learned it from.
```
Router A → Router B: "10.0.0.0/8, metric 1"
Router B would NOT re-advertise "10.0.0.0/8" back to Router A
(because A is the source — B learned it from A)
```

**Poison Reverse:** Send the route back to the source with metric 16 (infinity).
```
Stronger than split horizon — explicitly tells the source "this route is unreachable via me"
Generates more traffic but converges faster
```

**Triggered Updates:** Send update immediately when a route changes rather than waiting 30s.
```
Route fails → immediate update sent → neighbors learn faster → reduces counting-to-infinity window
```

**Maximum Metric (Infinity = 16):** When hop count reaches 16, route is unreachable — stops infinite counting.

Even with all these, RIP can still count to infinity in complex topologies. This fundamental limitation drove development of link-state protocols.

---

## Cisco IOS RIP Configuration

### RIPv2 — Basic Setup

```cisco
! Enable RIP, configure as version 2
Router(config)# router rip
Router(config-router)# version 2
Router(config-router)# no auto-summary              ! disable classful summarization

! Advertise directly connected networks
Router(config-router)# network 10.0.0.0             ! advertise all interfaces in 10.x.x.x
Router(config-router)# network 192.168.1.0          ! advertise this classful network

! The 'network' command uses classful masks — 10.0.0.0 matches 10.anything
! It also enables RIP on those interfaces (sends/receives updates)

! Prevent RIP updates from going out toward hosts/stub networks
Router(config-router)# passive-interface GigabitEthernet0/1  ! no outbound updates
Router(config-router)# passive-interface default             ! passive by default everywhere
Router(config-router)# no passive-interface GigabitEthernet0/0  ! then enable on router-facing interfaces

! Default route propagation
Router(config-router)# default-information originate    ! advertise default route into RIP
```

### Authentication (RIPv2)

```cisco
! Key chain defines authentication keys
Router(config)# key chain RIP-KEYS
Router(config-keychain)# key 1
Router(config-keychain-key)# key-string MyRIPPassword

! Apply to interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip rip authentication mode md5     ! or 'text' for clear text
Router(config-if)# ip rip authentication key-chain RIP-KEYS
```

### Timers (tuning)

```cisco
! Syntax: timers basic <update> <invalid> <holddown> <flush>
Router(config-router)# timers basic 30 180 180 240   ! defaults
Router(config-router)# timers basic 5 15 15 20       ! aggressive (small networks only)
! All RIP routers in domain must have identical timers
```

### RIPng (IPv6)

```cisco
! Global config
Router(config)# ipv6 router rip MYRIP-PROCESS

! Enable per-interface (RIPng doesn't use 'network' command)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 rip MYRIP-PROCESS enable

! Passive interface
Router(config-if)# ipv6 rip MYRIP-PROCESS passive
```

### Verification

```cisco
Router# show ip rip database                  ! RIP routing database
Router# show ip protocols                     ! protocol settings, neighbors, timers
Router# show ip route rip                     ! routes learned via RIP in routing table
Router# debug ip rip                          ! real-time RIP update debugging (use carefully)

! Example output of show ip route rip:
R    10.0.0.0/8 [120/2] via 192.168.1.1, 00:00:15, GigabitEthernet0/0
!    ^            ^  ^  ^                  ^          ^
!    RIP        AD=120 hop=2  next-hop    age       interface
```

---

## Why RIP Declined

RIP's limitations became critical as networks grew:

1. **15-hop limit** — large networks simply can't use RIP; any path longer than 15 routers is unreachable.
2. **Slow convergence** — 30-second update interval + 180-second holddown = minutes before a network converges after a failure.
3. **No bandwidth awareness** — a 10 Mbps path with 2 hops is preferred over a 10 Gbps path with 3 hops.
4. **Full table every 30 seconds** — wasteful on slow WAN links; floods the same information repeatedly.
5. **No VLSM in v1** — classful design made v1 useless in modern networks.
6. **Security** — v1 has no authentication; anyone can inject false routes.

OSPF (link-state, 1988) and EIGRP (DUAL algorithm, 1993) both addressed these failures directly.

---

## RIP Today — Where It Persists

Despite obsolescence in most contexts, RIP still appears in:

- **Certification study** (CCNA, Network+) — foundational distance-vector concepts
- **Very small networks** — branch offices with 1-3 routers, single-path topology
- **Legacy equipment** — older devices that only support RIP
- **Lab/test environments** — quick setup without complex protocol config
- **Some embedded/IoT routing** — lightweight platforms with RIP implementations
- **RIPng** — still occasionally used in simple IPv6 lab or small-network scenarios

---

## Tips

- Always use RIPv2 over RIPv1 — v1 is classful (no subnet masks) and broadcasts to all hosts, not just routers.
- Always disable `auto-summary` in RIPv2 — classful summarization breaks VLSM and creates routing black holes in discontiguous networks.
- Set `passive-interface default` and only enable RIP on router-facing interfaces — prevents sending update packets toward hosts (a security and bandwidth best practice).
- RIP's AD of 120 means any other IGP (OSPF 110, EIGRP 90) will win if the same prefix is learned via multiple protocols.
- The hop count metric ignores bandwidth — never use RIP where you have links of different speeds and want traffic to prefer faster links.

---

## Summary

- RIP is the oldest standard routing protocol, derived from Xerox PARC's GWINFO and formalized in RFC 1058 (1988).
- Distance-vector: full routing table exchanged every 30 seconds; metric is hop count; maximum 15 hops.
- Loop prevention: split horizon, poison reverse, holddown timers, triggered updates, maximum metric (16 = infinity).
- RIPv1 is classful (no subnet masks, broadcast updates); RIPv2 adds VLSM, authentication, multicast (224.0.0.9).
- RIPng extends RIPv2 for IPv6, using FF02::9 multicast and configured per-interface.
- RIP's 15-hop limit, slow convergence, and bandwidth-blind metric made it obsolete in large networks — replaced by OSPF and EIGRP in the 1990s.
