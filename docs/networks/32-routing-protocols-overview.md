---
title: "Routing Protocols Overview"
sidebar_label: "Routing Protocols Overview"
sidebar_position: 32
---

# Routing Protocols Overview

Routing protocols automate the exchange of network reachability information between routers. This page surveys the major categories — how they work conceptually, how they differ, and why each was invented.

---

## History of Routing Protocols

Routing started with static tables and ARPANET's NCP (Network Control Protocol). As networks grew, dynamic routing became essential:

| Year | Protocol / Event | Significance |
|---|---|---|
| 1969 | ARPANET routing | Manual routing tables; first automated protocol was SPF-based |
| 1982 | RIP v1 (informal) | Distance-vector; derived from Xerox PARC's GWINFO; first widely deployed |
| 1988 | RIP RFC 1058 | Formalized; 15-hop max; classful; slow convergence ("counting to infinity") |
| 1984 | EGP (RFC 904) | First exterior gateway protocol for ARPANET interconnect |
| 1988 | OSPF v1 (RFC 1131) | Link-state; faster convergence; scales better than RIP |
| 1989 | BGP v1 (RFC 1105) | Path-vector; replaces EGP for inter-AS routing |
| 1991 | IGRP (Cisco) | Proprietary distance-vector; better than RIP, composite metric |
| 1992 | OSPF v2 (RFC 1247) | Still in use today (updated RFC 2328, 1998) |
| 1993 | EIGRP (Cisco) | IGRP successor; DUAL algorithm, fast convergence, loop-free |
| 1994 | BGP v4 (RFC 1771) | CIDR support; became the internet's routing protocol |
| 1997 | IS-IS gains use | Originally for OSI networks; adapted for IP; preferred by ISPs |
| 1998 | RIPv2 (RFC 2453) | VLSM support, authentication, multicast updates |
| 1999 | OSPFv3 (RFC 2740) | OSPF for IPv6 |
| 2013 | EIGRP opens (RFC 7868) | Cisco opens EIGRP as an informational standard |

---

## Classification: IGP vs EGP

```
Interior Gateway Protocols (IGP):
  Used WITHIN a single Autonomous System (AS)
  Goal: find the best path between routers you control
  Examples: OSPF, EIGRP, RIP, IS-IS

Exterior Gateway Protocols (EGP):
  Used BETWEEN Autonomous Systems
  Goal: exchange reachability between independently managed networks
  Example: BGP (the only EGP in use today)

Autonomous System (AS):
  A collection of IP prefixes under a single administrative control
  Has a unique AS Number (ASN) — 16-bit (1–65535) or 32-bit (RFC 6793)
  Private ASNs: 64512–65534 (16-bit), 4200000000–4294967294 (32-bit)
```

---

## Distance-Vector Protocols

### How They Work

Each router knows only:
1. Its directly connected networks.
2. What its **neighbors** told it — the neighbor's routing table (a "vector" of distances).

Routers periodically share their **entire routing table** with neighbors. The neighbor adds its own cost and installs the best path.

```
Bellman-Ford algorithm (named after Richard Bellman and Lester Ford, 1950s-1960s):
  Router B learns from Router A: "10.0.0.0/8 is 2 hops from me"
  Router B knows: A is 1 hop from me
  Router B computes: 10.0.0.0/8 is 2 + 1 = 3 hops from me via A
  Router B stores: 10.0.0.0/8 → via A, metric 3
```

### The Counting-to-Infinity Problem

When a route is withdrawn, distance-vector routers can enter a loop:

```
A → B → C (each knows path to 10.0.0.0/8 via left neighbor)

C's link to 10.0.0.0/8 fails:
  C removes route to 10.0.0.0/8
  B hasn't told C yet; B still says "10.0.0.0/8 metric 1"
  C thinks: "I can reach it via B! metric 2"
  C updates B: "10.0.0.0/8 metric 2 via C"
  B thinks: "C says 2, I add 1 = 3" — now loops back to C
  They keep incrementing until metric reaches infinity (16 for RIP)
```

### Mitigations

| Technique | How It Works |
|---|---|
| **Maximum metric** | Define "infinity" (RIP: 16 hops) — route unreachable when reached |
| **Split horizon** | Don't advertise a route back out the same interface you learned it from |
| **Poison reverse** | Advertise a route back to its source with an infinite metric immediately |
| **Route hold-down** | Ignore updates for a withdrawn route for a timeout period |
| **Triggered updates** | Send updates immediately on change rather than waiting for periodic timer |

### DV Protocol Characteristics

```
Advantages:
  + Simple to configure and understand
  + Low CPU/memory in steady state
  + Works on low-bandwidth links

Disadvantages:
  - Slow convergence (seconds to minutes)
  - Prone to routing loops during convergence
  - Scalability limited (RIP: 15-hop max; periodic full-table broadcasts)
  - No topology map — "routing by rumor"

Examples: RIP, RIPv2, RIPng, EIGRP* (*EIGRP is "advanced" DV — uses DV but with DUAL to avoid loops)
```

---

## Link-State Protocols

### How They Work

Each router:
1. Discovers its neighbors (Hello protocol).
2. Measures the cost to each neighbor.
3. Builds a **Link State Advertisement (LSA)** describing its links.
4. **Floods** that LSA to every router in the area.
5. Receives LSAs from every other router → builds a **complete topology map**.
6. Runs **Dijkstra's Shortest Path First (SPF)** algorithm on that map → builds routing table.

```
Edsger Dijkstra published SPF in 1959 — one of the most important algorithms in networking.
Every router runs the same algorithm on the same topology data → all converge to a consistent view.
```

### Link-State Database (LSDB)

All routers in a link-state domain share an identical copy of the LSDB. When any link changes:
1. Affected router generates a new LSA.
2. LSA floods to every router.
3. Each router re-runs SPF.
4. New best paths installed within milliseconds (with fast-hello tuning).

### LS Protocol Characteristics

```
Advantages:
  + Fast convergence (SPF runs locally on complete topology)
  + No routing loops (each router computes its own loop-free path)
  + Scales well with areas (OSPF areas limit flooding scope)
  + Rich traffic engineering capabilities (IS-IS TE, OSPF TE)

Disadvantages:
  - More complex configuration
  - Higher CPU/memory (storing LSDB, running SPF)
  - All routers in an area must have consistent LSDB (any mismatch → problems)
  - More complex troubleshooting

Examples: OSPF, IS-IS
```

---

## Path-Vector Protocols

Path-vector is used exclusively by BGP for inter-AS routing.

### How They Work

Each BGP router advertises:
- Reachable prefixes
- The **AS path** — the sequence of AS numbers traversed to reach the prefix

```
AS 100 (Your network) — AS 200 (ISP A) — AS 300 (Major carrier) — AS 400 (Destination)

BGP update from AS 300 to AS 200:
  Prefix: 10.0.0.0/24
  AS_PATH: [300, 400]

BGP update from AS 200 to AS 100:
  Prefix: 10.0.0.0/24
  AS_PATH: [200, 300, 400]

AS 100 installs route to 10.0.0.0/24 via AS 200, path length = 3
```

### Loop Prevention

Simple: **if your own AS number appears in the AS_PATH, reject the update**. You're seeing a route that already passed through you — it's a loop.

### BGP Path Selection

BGP doesn't just minimize hops — it uses **policy** (routing policies, business relationships, traffic engineering) via attributes:

```
Decision process (simplified, in order of preference):
  1. Highest WEIGHT (Cisco-local, not advertised)
  2. Highest LOCAL_PREFERENCE (within your AS)
  3. Shortest AS_PATH length
  4. Lowest ORIGIN (IGP < EGP < Incomplete)
  5. Lowest MED (Multi-Exit Discriminator — hint from neighbor about entry point)
  6. eBGP preferred over iBGP
  7. Lowest IGP metric to BGP next-hop
  8. Oldest eBGP route (stability)
  9. Lowest BGP Router ID
```

---

## Metrics — What Each Protocol Uses

| Protocol | Metric | Details |
|---|---|---|
| RIP | Hop count | 1 per router; max 15; ignores bandwidth |
| OSPF | Cost | 100,000,000 / interface-bandwidth (bps); lower = better |
| EIGRP | Composite | Default: BW + Delay; optional: load, reliability, MTU |
| IS-IS | Cost | Default 10 per link (all equal!); wide metrics up to 16,777,215 |
| BGP | Policy-driven | AS_PATH, LOCAL_PREF, MED, Weight — not bandwidth-based |

---

## Convergence Comparison

```
Fast → Slow convergence (typical, well-tuned networks):

EIGRP         < 1 second   (pre-computed Feasible Successors, no SPF needed)
OSPF (tuned)  1–3 seconds  (fast hellos: 1s/3s; incremental SPF, LSA throttling)
IS-IS (tuned) 1–3 seconds  (similar to OSPF; often faster in large ISP networks)
BGP           seconds-minutes (policy-driven, intentionally slow; MRAI timer)
RIP           minutes      (update timer 30s; hold-down 180s; slow by design)
```

---

## Choosing a Routing Protocol

```
Single router with one ISP connection:
  → Static default route only; no dynamic protocol needed

Small enterprise (< 100 routers, Cisco-centric):
  → EIGRP (fast, easy, low config overhead)
  → OSPF if multi-vendor

Medium-large enterprise (multi-vendor, multi-area):
  → OSPFv2/v3 (open standard, wide support, scales well)

Service Provider / Large ISP backbone:
  → IS-IS (handles massive scale; preferred in SP world)
  → OSPFv2/v3 also common

Internet-facing / Multi-homed / Peering:
  → BGP (the only EGP; required for multi-homing with multiple ISPs)

All-IPv6 or dual-stack:
  → OSPFv3 (handles both IPv4 and IPv6 in same process)
  → EIGRP named mode (supports both)
  → BGP MP-BGP (carries both NLRI types)
```

---

## Tips

- "Routing by rumor" (DV) vs "routing by map" (LS) is the key conceptual difference — link-state protocols have complete topology knowledge; distance-vector protocols only know what neighbors told them.
- Administrative Distance (AD) is used to choose between routes learned from different protocols — not within a single protocol's own paths.
- EIGRP is often described as "hybrid" or "advanced distance-vector" — it uses DV-style updates but the DUAL algorithm prevents routing loops without needing a full topology database.
- IS-IS is an OSI-layer protocol (not IP-encapsulated!) — it runs directly over Layer 2, which is part of why it's resilient and preferred by large ISPs.
- BGP's slow convergence by design (MRAI — Minimum Route Advertisement Interval) prevents route instability from flooding the global internet — what looks like a bug is actually a feature.

---

## Summary

- IGPs operate within an AS (OSPF, EIGRP, RIP, IS-IS); EGP (BGP) operates between ASes.
- Distance-vector: share routing tables with neighbors, compute paths via Bellman-Ford — simple but prone to counting-to-infinity without mitigations.
- Link-state: flood topology information (LSAs), all routers run Dijkstra SPF independently — fast convergence, loop-free, scales well.
- Path-vector (BGP): advertise prefix + AS_PATH — loop prevention via AS_PATH inspection, policy-driven selection.
- Metrics differ dramatically: RIP counts hops, OSPF uses bandwidth-derived cost, EIGRP uses composite metric, BGP uses policy attributes.
- EIGRP is the fastest-converging IGP (pre-computed alternates); OSPF and IS-IS converge in seconds when tuned; RIP takes minutes.
