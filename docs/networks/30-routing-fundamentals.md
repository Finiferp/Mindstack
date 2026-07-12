---
title: "Routing Fundamentals"
sidebar_label: "Routing Fundamentals"
sidebar_position: 30
---

# Routing Fundamentals

Routing is the process of selecting paths across networks to forward packets from source to destination. Routers operate at Layer 3, making forwarding decisions based on destination IP addresses and routing tables.

---

## What Is a Router?

A router is a device that connects two or more networks and forwards packets between them. It makes per-packet forwarding decisions based on the **routing table** (also called the **Routing Information Base, RIB**) and actually forwards via the **Forwarding Information Base (FIB)** — a hardware-optimized version of the routing table.

```
Router functions:
  1. Receive a packet on an incoming interface
  2. Examine the destination IP address
  3. Look up the routing table → longest-prefix match
  4. Decrement TTL (drop if TTL=0, send ICMP Time Exceeded)
  5. Recompute header checksum (IPv4)
  6. ARP/NDP for next-hop MAC address (if directly connected)
  7. Frame the packet with new Layer 2 header (new src MAC = router's MAC, new dst MAC = next-hop MAC)
  8. Forward out the selected interface
```

---

## The Routing Table

```cisco
show ip route

Codes: C - connected, S - static, R - RIP, O - OSPF, D - EIGRP, B - BGP,
       * - candidate default, [AD/Metric] - Admin distance/Metric

Gateway of last resort is 0.0.0.0 to network 0.0.0.0

C     10.0.1.0/24 is directly connected, GigabitEthernet0/0
L     10.0.1.1/32 is directly connected, GigabitEthernet0/0
C     10.0.2.0/24 is directly connected, GigabitEthernet0/1
S     192.168.1.0/24 [1/0] via 10.0.1.2
O     172.16.0.0/16 [110/20] via 10.0.2.2, 00:15:32, GigabitEthernet0/1
B     0.0.0.0/0 [20/0] via 203.0.113.1
```

**Route entry anatomy:**
```
O     172.16.0.0/16  [110/20]  via 10.0.2.2, GigabitEthernet0/1
│     │              │   │      │             │
│     │              │   │      │             └─ egress interface
│     │              │   │      └─ next-hop IP address
│     │              │   └─ metric (cost to reach this network)
│     │              └─ administrative distance [AD]
│     └─ prefix/mask
└─ source (O = OSPF)
```

**C** = Directly connected (physical/logical link up, IP configured)
**L** = Local host route (the router's own IP on that interface, /32 for IPv4 or /128 for IPv6)

---

## Administrative Distance

When a router learns the same prefix from multiple sources, **administrative distance (AD)** decides which source wins. Lower is more trusted.

| Source | Default AD |
|---|---|
| Directly Connected | 0 |
| Static Route | 1 |
| External BGP (eBGP) | 20 |
| EIGRP (internal) | 90 |
| IGRP (legacy) | 100 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP external | 170 |
| Internal BGP (iBGP) | 200 |
| Unreachable / Floating Static | 254 |
| Unknown / Not installed | 255 |

```cisco
! Float a static route (used as backup if dynamic route disappears)
ip route 10.0.1.0 255.255.255.0 10.0.99.1 210  ! AD 210 > OSPF's 110 → only used if OSPF fails
```

---

## Longest Prefix Match

When multiple routing table entries match a destination, the **most specific** (longest prefix) wins.

```
Routing table:
  10.0.0.0/8    via 10.0.1.1
  10.10.0.0/16  via 10.0.2.1
  10.10.20.0/24 via 10.0.3.1

Packet to 10.10.20.5:
  Matches 10.0.0.0/8  (prefix length 8)
  Matches 10.10.0.0/16 (prefix length 16)
  Matches 10.10.20.0/24 (prefix length 24) ← WINNER (most specific)
  Forwarded via 10.0.3.1
```

**Default route (0.0.0.0/0)** has the shortest possible prefix — it matches anything but loses to every more-specific route. It's the "gateway of last resort."

---

## Static Routes

Static routes are manually configured — no protocol negotiation needed. Best for small networks, specific paths, or security-sensitive routes.

```cisco
! Cisco IOS static route syntax:
! ip route <network> <mask> {<next-hop-ip> | <exit-interface>} [AD] [permanent] [name <desc>]

! Basic static route via next-hop IP
ip route 192.168.10.0 255.255.255.0 10.0.1.2

! Via exit interface (only use for point-to-point — generates proxy ARP on multi-access)
ip route 192.168.10.0 255.255.255.0 GigabitEthernet0/1

! Via both (more specific — prevents ARP issues)
ip route 192.168.10.0 255.255.255.0 GigabitEthernet0/1 10.0.1.2

! Default route
ip route 0.0.0.0 0.0.0.0 203.0.113.1        ! via ISP gateway

! Floating static (backup route, higher AD than primary dynamic route)
ip route 192.168.10.0 255.255.255.0 10.99.99.2 210

! Null route (drop traffic — used for blackholing, summarization)
ip route 10.0.0.0 255.0.0.0 Null0

! Permanent static (stays in table even if next-hop goes down)
ip route 10.10.0.0 255.255.0.0 10.0.1.2 permanent

! Named static route
ip route 172.16.0.0 255.255.0.0 10.0.1.3 name BRANCH_OFFICE

! IPv6 static routes
ipv6 route 2001:db8:1::/48 2001:db8::1
ipv6 route ::/0 2001:db8::1        ! default route
```

---

## Connected and Local Routes

```cisco
! When you configure an interface:
interface GigabitEthernet0/0
 ip address 10.0.1.1 255.255.255.0
 no shutdown

! Two routes are automatically added:
C   10.0.1.0/24 is directly connected, GigabitEthernet0/0
L   10.0.1.1/32 is directly connected, GigabitEthernet0/0

! C route: the entire subnet — packets to this subnet go out this interface
! L route: the router's own IP — packets to this IP are processed locally (not forwarded)
```

---

## Routing Protocols Overview

Routing protocols **dynamically exchange reachability information** between routers so no static configuration of every remote network is needed.

### Classification

```
Interior Gateway Protocols (IGP) — within one autonomous system (AS)
  Distance Vector:
    RIP v1/v2    — legacy; hop count metric; max 15 hops; slow convergence
    EIGRP        — Cisco proprietary (now open); composite metric; DUAL algorithm; fast convergence
  Link State:
    OSPF v2/v3   — industry standard; Dijkstra SPF; areas; scales well
    IS-IS        — used by large ISPs and carriers; very similar to OSPF
  Path Vector:
    (none standard for IGP — EIGRP uses a diffusing calculation, not pure DV)

Exterior Gateway Protocol (EGP) — between autonomous systems
  BGP v4         — THE internet routing protocol; path vector; policy-based
```

### Autonomous System (AS)

```
An AS is a network or collection of networks under a single administrative entity
with a common routing policy, identified by an AS Number (ASN).

ASNs: 16-bit (1–65535) and 32-bit (RFC 4893, now standard)
  Public ASNs: allocated by IANA/RIRs (e.g. Google = AS15169, Cloudflare = AS13335)
  Private ASNs: 64512–65534 (16-bit), 4200000000–4294967294 (32-bit)

BGP carries routes between ASes; IGPs run within each AS
```

---

## Routing Table Lookup — CEF (Cisco Express Forwarding)

Traditional process-switched routing: every packet → CPU lookup → forward.
**CEF** (Cisco Express Forwarding) pre-builds forwarding structures in hardware:

```
RIB (Routing Table) ──→ FIB (Forwarding Info Base) — fast lookup table in hardware
                    ──→ Adjacency Table — pre-built Layer 2 headers for each next-hop
                          (next-hop MAC, egress interface encapsulation)

CEF forwarding:
  Packet arrives → ASIC looks up destination in FIB → retrieves pre-built L2 header
  → forwards at wire speed without CPU involvement

show ip cef                       ! display FIB
show ip cef 10.10.1.0 detail      ! specific prefix
show adjacency detail             ! pre-built L2 headers per next-hop
```

---

## ECMP — Equal-Cost Multi-Path

When the routing table has multiple routes to the same destination with equal metrics, ECMP load-balances across them.

```cisco
! IOS installs up to 4 (or 8/16 depending on platform) equal-cost paths
! "maximum-paths" command controls this

router ospf 1
 maximum-paths 4

! Show multiple next-hops for one prefix:
O     10.10.1.0/24 [110/20] via 10.0.1.2, GigabitEthernet0/0
                   [110/20] via 10.0.2.2, GigabitEthernet0/1
```

Load balancing methods:
- **Per-destination** (default): all packets to a given src-dst pair take the same path. Keeps flow ordering.
- **Per-packet**: round-robin across paths. May cause reordering — rarely desired.
- **CEF hashing**: hash of src IP + dst IP (or src/dst port) selects path. Flow-consistent, good distribution.

---

## Convergence

**Convergence** is the time for all routers in a network to have consistent, accurate routing information after a topology change (link failure, new link, router failure).

```
Factors affecting convergence time:
  Detection time    — how fast the router detects the failure
                     (Hello timer, BFD, physical link-down signal)
  Advertisement time — how fast the change propagates to all routers
  Calculation time  — how fast SPF/DUAL recalculates paths

Fast convergence techniques:
  BFD (Bidirectional Forwarding Detection) — sub-second failure detection
  OSPF fast hello timers (1-second hello, 3-second dead)
  EIGRP feasible successors — pre-computed backup paths (instant failover)
  IP Event Dampening — suppress flapping interfaces
  PIC (Prefix-Independent Convergence) — pre-install backup next-hops in FIB
```

---

## Routing vs Switching — Key Distinction

| Feature | Layer 2 Switching | Layer 3 Routing |
|---|---|---|
| Decision basis | Destination MAC | Destination IP |
| Modifies header | No | Yes (TTL decrement, checksum) |
| Scope | Single broadcast domain | Between broadcast domains |
| Learning | Dynamic (MAC table) | Configuration + protocol |
| Loops | STP prevents | TTL limits damage; no loops in routing |
| Speed | ASIC — wire speed | ASIC (modern) — also wire speed |

---

## Tips

- Always prefer specifying both a next-hop IP **and** exit interface in static routes on multi-access networks — using only the interface causes IOS to ARP for every destination, creating a proxy ARP mess.
- A floating static route (high AD like 254) only appears in the routing table when the primary dynamic route is gone — a clean backup mechanism without running a full routing protocol.
- The `ip route 0.0.0.0 0.0.0.0 Null0` (null route for summarized prefix) is a critical best practice in OSPF/EIGRP summarization — it prevents routing loops when traffic matches a summary but no more-specific route exists.
- TTL decrements at every hop — a traceroute to a destination 15 hops away will show 15 entries; if hops stop responding, firewalls are likely blocking ICMP Time Exceeded.

---

## Summary

- Routers forward packets based on longest-prefix match in the routing table; lower administrative distance wins between competing sources for the same prefix.
- Connected routes (C) and local routes (L) are automatically installed when interfaces are configured; static routes are manually entered; dynamic routes come from routing protocols.
- Administrative distance ranks routing sources: directly connected (0) > static (1) > eBGP (20) > EIGRP (90) > OSPF (110) > RIP (120) > iBGP (200).
- CEF pre-builds FIB and adjacency tables so forwarding happens at hardware speed without CPU intervention.
- ECMP installs multiple equal-cost paths and load-balances traffic across them — per-flow hashing keeps individual TCP flows on one path to prevent reordering.
- Convergence time after a topology change depends on failure detection, propagation, and recalculation speed — BFD and fast hello timers are key tools for sub-second convergence.
