---
title: "EIGRP"
sidebar_label: "EIGRP"
sidebar_position: 36
---

# EIGRP

EIGRP (Enhanced Interior Gateway Routing Protocol) combines distance-vector simplicity with near-instant failover via the DUAL algorithm. Originally Cisco-proprietary, it was opened as an informational RFC in 2013.

---

## History

| Year | Event |
|---|---|
| 1985 | Cisco develops IGRP (Interior Gateway Routing Protocol) — classful, proprietary |
| 1992 | EIGRP (Enhanced IGRP) introduced in Cisco IOS 9.21 — replaces IGRP |
| 1994–2013 | EIGRP proprietary; widely deployed in Cisco-centric enterprises |
| 2013 | RFC 7868 — EIGRP published as informational standard (opened by Cisco) |
| 2014+ | Named EIGRP mode added; IPv4+IPv6 in single process, wide metrics |

IGRP itself was Cisco's response to RIP's 15-hop limit and bandwidth-blind metric. EIGRP improved on IGRP with the DUAL algorithm, partial updates (vs full table), and VLSM support.

---

## How EIGRP Works

EIGRP is classified as an **advanced distance-vector** (or "hybrid") protocol:
- Like DV: sends routing updates to neighbors (not full topology like link-state)
- Unlike DV: maintains a topology table with all known paths; uses DUAL to guarantee loop-free alternates

### Key Data Structures

```
Neighbor Table:
  List of directly adjacent EIGRP routers
  One entry per neighbor (IP, interface, hold timer, uptime)

Topology Table:
  All routes learned from all neighbors
  For each destination: all known paths with their metrics
  One entry per destination, with all successors and feasible successors

Routing Table (RIB):
  Only the best path(s) to each destination
  Installed from the topology table (Successor routes)
```

### EIGRP Terminology

```
Reported Distance (RD) / Advertised Distance (AD):
  The metric a neighbor reports for a destination
  = the neighbor's cost to reach that destination

Feasible Distance (FD):
  The total metric from the local router to a destination
  = local link cost to neighbor + neighbor's RD

Successor:
  The neighbor with the best (lowest) FD to a destination
  → This is the route installed in the routing table

Feasible Successor (FS):
  A backup neighbor whose RD < local FD to the destination
  → Pre-computed backup, instantly usable if Successor fails
  → This is EIGRP's secret to fast failover (< 1 second)

Feasibility Condition (FC):
  A neighbor's route qualifies as a Feasible Successor if:
  Neighbor's RD < Local FD
  → Guarantees loop-free path (if RD < FD, the neighbor is going "toward" not "away")
```

---

## The DUAL Algorithm

DIFFUSING UPDATE ALGORITHM (DUAL), developed by Dr. J.J. Garcia-Luna-Aceves at SRI International.

```
Normal operation (Successor and FS both known):
  ┌──────────────────────────────────────────────────────────┐
  │ Successor fails → immediately promote Feasible Successor │
  │ < 1 second failover — no queries needed                  │
  └──────────────────────────────────────────────────────────┘

No Feasible Successor available:
  ┌──────────────────────────────────────────────────────────────────┐
  │ Route goes ACTIVE — EIGRP sends Queries to all neighbors         │
  │ Neighbors reply or query their own neighbors (diffuses outward)  │
  │ When all Replies received → compute new Successor → route PASSIVE│
  │ Stuck-in-Active (SIA): no Reply received within 3 minutes        │
  │ → neighbor declared down; adjacency reset                        │
  └──────────────────────────────────────────────────────────────────┘
```

The "diffusing" in DUAL refers to the query spreading outward — it's bounded by the "query domain" (routers that know about the destination). Stub routers dramatically reduce query scope.

---

## EIGRP Metrics

### Classic Metric (K-values)

```
Composite Metric = [K1 × BW + (K2 × BW)/(256 - Load) + K3 × Delay] × [K5 / (Reliability + K4)]

Default K-values: K1=1, K2=0, K3=1, K4=0, K5=0

Simplified with defaults:
  Metric = (10^7 / slowest-link-bandwidth-kbps + sum-of-delays-in-tens-of-microseconds) × 256

Example for a path through 100Mbps link (delay 1000us) via 10Mbps link (delay 100us):
  BW term = 10^7 / 10000 (slowest link in Kbps) = 1000
  Delay term = (1000 + 100) / 10 = 110
  Metric = (1000 + 110) × 256 = 284,160

EIGRP ALWAYS uses the slowest bandwidth and CUMULATIVE delay in the path.
```

### Wide Metrics (Named Mode, K6)

Classic metrics can't distinguish 1 Gbps from 10 Gbps from 100 Gbps (all yield cost 1). Named EIGRP introduces:
- 64-bit "wide" metrics
- K6 (jitter) optional metric component
- Bandwidth up to 655 Tbps, delay in picoseconds

---

## EIGRP Classic Configuration

```cisco
! Classic (autonomous system based) configuration
Router(config)# router eigrp 100              ! AS number — must match neighbors
Router(config-router)# no auto-summary        ! disable classful auto-summary (CRITICAL)
Router(config-router)# network 10.0.0.0       ! advertise all 10.x.x.x interfaces
Router(config-router)# network 10.1.1.0 0.0.0.255   ! specific subnet with wildcard mask
Router(config-router)# passive-interface GigabitEthernet0/1  ! no hellos out this interface
Router(config-router)# passive-interface default
Router(config-router)# no passive-interface GigabitEthernet0/0

! Tune hello and hold timers
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip hello-interval eigrp 100 5    ! hello every 5s (default 5 on LAN)
Router(config-if)# ip hold-time eigrp 100 15         ! hold = 3× hello

! Set bandwidth on interface (CRITICAL for accurate metrics)
Router(config-if)# bandwidth 1000000    ! 1 Gbps in Kbps (sets EIGRP BW component)

! Unequal-cost load balancing (unique to EIGRP)
Router(config-router)# variance 2   ! use paths up to 2× the best metric (proportional load-balance)
! Without variance: only equal-cost paths get traffic
! With variance 2: paths with metric ≤ 2 × best-metric are used

! Stub configuration (spoke routers in hub-and-spoke)
Router(config-router)# eigrp stub connected summary
! "connected" = advertise connected routes
! "summary"   = advertise summary routes
! Stub routers don't receive queries → reduces SIA risk dramatically
```

## EIGRP Named Mode Configuration (Recommended for New Deployments)

```cisco
! Named mode — unified IPv4 + IPv6, wide metrics, cleaner
Router(config)# router eigrp MYEIGRP          ! name instead of AS number

Router(config-router)# address-family ipv4 unicast autonomous-system 100
Router(config-router-af)# no auto-summary
Router(config-router-af)# eigrp router-id 1.1.1.1

! Topology base configuration (within address family)
Router(config-router-af)# topology base
Router(config-router-af-topology)# variance 2

! Interface configuration (within address family)
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)# summary-address 10.0.0.0 255.255.0.0
Router(config-router-af-interface)# passive-interface

Router(config-router)# address-family ipv6 unicast autonomous-system 100
Router(config-router-af)# eigrp router-id 1.1.1.1
! Similar structure for IPv6
```

---

## EIGRP Verification

```cisco
Router# show ip eigrp neighbors               ! neighbor table
Router# show ip eigrp neighbors detail        ! with AS, K-values, hold timer
Router# show ip eigrp topology               ! full topology table (all paths)
Router# show ip eigrp topology all-links     ! including non-feasible paths
Router# show ip eigrp topology 10.0.0.0/8   ! specific prefix
Router# show ip route eigrp                  ! EIGRP routes in RIB
Router# show ip eigrp interfaces             ! per-interface EIGRP stats
Router# show ip eigrp traffic               ! update/query/reply/ack counters

! Named mode
Router# show eigrp address-family ipv4 neighbors
Router# show eigrp address-family ipv4 topology

! Key output to understand:
! show ip eigrp topology example:
P 10.1.0.0/24, 1 successors, FD is 284160
  via 192.168.1.1 (284160/28160), GigabitEthernet0/0
  via 192.168.2.1 (358400/28160), GigabitEthernet0/1   ← Feasible Successor (RD 28160 < FD 284160)

! P = Passive (stable)  A = Active (querying)
! (284160/28160) = (FD/RD)
! FD = total metric from here; RD = neighbor's reported distance
```

---

## EIGRP Filtering and Summarization

```cisco
! Manual summarization on interface (suppresses component routes, creates Null0 discard)
interface GigabitEthernet0/0
 ip summary-address eigrp 100 10.0.0.0 255.255.0.0

! Prefix list filtering
ip prefix-list BLOCK-RFC1918 seq 5 deny 10.0.0.0/8 le 32
ip prefix-list BLOCK-RFC1918 seq 10 deny 172.16.0.0/12 le 32
ip prefix-list BLOCK-RFC1918 seq 15 deny 192.168.0.0/16 le 32
ip prefix-list BLOCK-RFC1918 seq 20 permit 0.0.0.0/0 le 32

router eigrp 100
 distribute-list prefix BLOCK-RFC1918 out GigabitEthernet0/0  ! filter on output

! Route map with filtering and metric setting
route-map SET-METRIC permit 10
 match ip address prefix-list IMPORTANT-ROUTES
 set metric 10000 100 255 1 1500   ! BW(Kbps) delay(us) reliability load MTU

router eigrp 100
 redistribute connected route-map SET-METRIC
```

---

## EIGRP Troubleshooting

```
Problem: Neighbors not forming
  Check: same AS number? (show ip eigrp neighbors — no output = not forming)
  Check: K-values must match (show ip protocols — K1..K5)
  Check: authentication match?
  Check: same subnet? (show ip interface brief)
  Check: access list blocking EIGRP multicast 224.0.0.10?
  Debug: debug eigrp packets hello

Problem: Routes missing
  Check: show ip eigrp topology — is route in topology table?
  If yes, but not in RIB: split-horizon blocking it? (ip split-horizon eigrp 100)
  Check: distribute-list filtering it out?
  Check: auto-summary summarizing it incorrectly? (always: no auto-summary)

Problem: Stuck-in-Active (SIA)
  Symptom: %DUAL-3-SIA messages; neighbor reset; route goes active
  Cause: query not answered within 3 minutes
  Check: stub routers configured? (reduces query domain)
  Check: link quality? (packet loss causing queries to be lost)
  Check: large query domain? (consider summarization at boundary routers)
  Fix: eigrp stub on spoke routers, summarization to limit query scope

Problem: Suboptimal routing / unequal-cost paths
  Check: show ip eigrp topology — is FS available?
  Check: variance setting (show ip protocols)
  If FS not available: metric mismatch, bandwidth/delay misconfigured?
  Fix: set correct bandwidth on interfaces; adjust variance if needed
```

---

## Tips

- Always disable `auto-summary` (`no auto-summary`) — classful auto-summarization causes black holes in discontiguous networks and confuses VLSM designs.
- Configure `eigrp stub connected summary` on all spoke/branch routers in hub-and-spoke topologies — it prevents queries from reaching the spoke and dramatically reduces SIA incidents.
- Set the `bandwidth` correctly on every interface — EIGRP uses the configured bandwidth (not the real speed) for its metric calculation. A wrong bandwidth = wrong metric = suboptimal routing.
- Use EIGRP named mode for new deployments — it supports wide metrics (differentiates 1G from 10G), is cleaner to read, and handles IPv4 + IPv6 in one process.
- `variance 2` enables proportional load balancing over unequal paths (EIGRP unique feature) — paths up to 2× the best metric receive traffic proportionally.

---

## Summary

- EIGRP uses DUAL to maintain pre-computed Feasible Successors — when a Successor fails, EIGRP instantly promotes the FS without querying neighbors (< 1 second failover).
- The Feasibility Condition: a neighbor qualifies as FS if its Reported Distance < local Feasible Distance — guarantees loop-free alternate paths.
- Default metric uses bandwidth (slowest in path) and delay (cumulative) — always configure correct bandwidth on interfaces.
- `no auto-summary` is mandatory; `eigrp stub` on spokes reduces SIA; named mode is preferred for new configs.
- When no FS exists, the route goes ACTIVE and EIGRP queries all neighbors — SIA occurs if replies don't return within 3 minutes.
- Unequal-cost load balancing with `variance N` is unique to EIGRP among IGPs.
