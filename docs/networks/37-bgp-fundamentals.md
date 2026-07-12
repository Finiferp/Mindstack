---
title: "BGP Fundamentals"
sidebar_label: "BGP Fundamentals"
sidebar_position: 37
---

# BGP Fundamentals

BGP (Border Gateway Protocol) is the protocol that runs the internet — the only EGP in active use. It connects tens of thousands of autonomous systems and carries the global routing table of ~1 million prefixes. Understanding BGP is essential for anyone working with ISPs, multi-homing, or large-scale network design.

---

## History

| Year | Event |
|---|---|
| 1984 | EGP (Exterior Gateway Protocol) — RFC 904; first inter-domain routing protocol |
| 1989 | **BGP version 1** — RFC 1105; created by Kirk Lougheed and Yakov Rekhter on "three napkins" |
| 1990 | BGP version 2 — RFC 1163; stability improvements |
| 1991 | BGP version 3 — RFC 1267 |
| **1994** | **BGP version 4** — RFC 1771; adds CIDR support; still the basis in use today |
| 1996 | CIDR Route Registry; internet routing table ~50K prefixes |
| 2006 | RFC 4271 — updated BGP4 spec (current standard) |
| 2008 | 32-bit ASN support (RFC 4893) |
| 2010 | Route Reflectors universal; internet routing table ~350K prefixes |
| 2015 | RFC 7607 — AS_PATH loop prevention improvements |
| 2023 | Internet routing table ~950K+ IPv4 + ~180K+ IPv6 prefixes |

The "three napkins" story: Lougheed and Rekhter designed BGP's core concepts over lunch at an IETF meeting — the simplicity of that design has powered the internet for 35+ years.

---

## BGP vs IGP — Fundamental Differences

| Aspect | IGP (OSPF, EIGRP) | BGP |
|---|---|---|
| Scope | Within one AS | Between ASes |
| Goal | Best path (lowest cost) | Policy-driven path selection |
| Transport | IP (OSPF/EIGRP multicast) | TCP port 179 |
| Trust model | Implicit (same admin) | Explicit (peers must be configured) |
| Scale | Thousands of routes | Millions of routes |
| Convergence | Fast (< 1s–3s) | Slow (intentionally; minutes) |
| Metric | Single (cost, hop, composite) | Multiple attributes (AS_PATH, LOCAL_PREF, MED...) |
| Update model | Full topology / link-state | Incremental prefix advertisements |

---

## Autonomous Systems

An **Autonomous System (AS)** is a collection of IP prefixes under a single administrative control with a unified routing policy.

```
AS Numbers (ASN):
  16-bit: 1 – 65535 (original, "2-byte ASN")
  32-bit: 1 – 4,294,967,295 ("4-byte ASN", RFC 4893, 2007)
  Written as: 65000 or in asdot notation: 1.64464 (for 4-byte)

Private ASNs (not for internet use):
  16-bit private: 64512 – 65534
  32-bit private: 4,200,000,000 – 4,294,967,294

Examples of well-known public ASNs:
  7922  — Comcast (US)
  701   — Verizon (US)
  3356  — Lumen (CenturyLink) backbone
  15169 — Google
  32934 — Facebook / Meta
  16509 — Amazon AWS
  8075  — Microsoft
```

---

## BGP Peering Types

### eBGP (External BGP)
Between routers in **different** ASes. Usually directly connected (default TTL=1 for eBGP packets).

```
AS 100 ←──eBGP──→ AS 200
      TTL=1 (single hop by default)
      ebgp-multihop required for non-directly-connected eBGP
```

### iBGP (Internal BGP)
Between routers in the **same** AS. Used to distribute BGP routes internally.

```
                 AS 100
        R1 ←──iBGP──→ R2 ←──iBGP──→ R3
        ↑                               ↑
      eBGP                           eBGP
        ↓                               ↓
      AS 200                         AS 300

iBGP rules:
  - iBGP neighbors do NOT re-advertise routes learned from iBGP to other iBGP peers
    (prevents routing loops — no AS_PATH loop detection within same AS)
  - This means: full mesh of iBGP sessions required for all routers to have full routing table
  - Full mesh: n(n-1)/2 sessions — impractical at large scale → Route Reflectors solve this
```

---

## BGP Session Establishment

BGP uses **TCP port 179** for all communication. Both routers must explicitly configure each other as peers.

```
BGP State Machine:
  IDLE        → waiting, no TCP connection
  CONNECT     → TCP SYN sent, waiting for SYN-ACK
  ACTIVE       → TCP failed, retrying (or waiting for peer to connect)
  OPENSENT     → TCP up; BGP OPEN message sent; waiting for OPEN from peer
  OPENCONFIRM  → both OPENs received; negotiating capabilities; waiting for KEEPALIVE
  ESTABLISHED  → session fully up; exchanging routing information

Connection setup:
  Both peers try to connect simultaneously to each other's TCP/179
  One connection wins (typically higher BGP RID wins)
  Keep-alive interval: 60 seconds (default)
  Hold time: 180 seconds (3× keepalive; peer declared dead if no message for 180s)
```

### BGP Message Types

| Message | Purpose |
|---|---|
| OPEN | First message after TCP connection; sends AS number, hold time, BGP ID, capabilities |
| UPDATE | Advertise new prefixes (NLRI + path attributes) or withdraw previously advertised prefixes |
| NOTIFICATION | Error notification; sent before closing connection (indicates reason) |
| KEEPALIVE | Heartbeat; sent every 60s to prevent hold timer expiry |
| ROUTE-REFRESH | Request re-advertisement of all routes (RFC 2918) |

---

## BGP Path Attributes

BGP's power comes from its rich set of path attributes, which enable sophisticated routing policy.

### Well-Known Mandatory (must be in every UPDATE)

**AS_PATH** — List of AS numbers the route has traversed.
```
AS_PATH: 200 300 400
→ Route went through AS 200, then AS 300, to originate in AS 400
→ Shorter AS_PATH = preferred (all else equal)
→ Your own AS in AS_PATH = loop detection → reject immediately
```

**NEXT_HOP** — The IP address to use to reach the advertised prefix.
```
eBGP: NEXT_HOP = advertising router's IP (changes at each eBGP hop)
iBGP: NEXT_HOP = NOT changed by iBGP (stays as the eBGP-learned NEXT_HOP)
  → iBGP routers must be able to reach the eBGP NEXT_HOP via IGP
  → "next-hop-self" on iBGP sessions changes this to local address
```

**ORIGIN** — How the route entered BGP.
```
IGP (i)      — network command or redistribute from IGP; most preferred
EGP (e)      — from old EGP protocol; rarely seen
Incomplete (?) — redistribute from a non-IGP source (static, connected)
```

### Well-Known Discretionary (may or may not be present)

**LOCAL_PREFERENCE (LOCAL_PREF)** — Preference within an AS; higher is preferred.
```
Default: 100
Only carried in iBGP updates (not sent to eBGP peers)
Used to control which exit point is preferred for traffic leaving your AS
Example: set LOCAL_PREF 200 on preferred ISP link → all iBGP routers prefer this exit
```

### Optional Transitive (passed to next AS if not understood)

**COMMUNITY** — Arbitrary 32-bit tag attached to routes for policy signaling.
```
Format: AS:value (e.g. 65000:100)
Well-known communities:
  NO_EXPORT (0xFFFFFF01) — don't advertise to eBGP peers
  NO_ADVERTISE (0xFFFFFF02) — don't advertise to any peer
  NO_EXPORT_SUBCONFED — don't advertise outside confederation
  BLACKHOLE (65535:666) — internet black-hole routing community (RTBH)

Large communities (RFC 8092): 3-part notation 65000:100:200 — more flexible
```

### Optional Non-Transitive (not passed beyond the receiving AS)

**MULTI_EXIT_DISC (MED)** — Hint to neighboring AS about preferred entry point.
```
Lower MED = more preferred
Sent to eBGP peers to say "prefer entering my AS via this link"
Only compared between routes from the same AS (by default)
```

**WEIGHT** (Cisco-proprietary, local to the router only):
```
Higher is preferred
Not advertised to any peer — purely local policy
Set in inbound route-maps or per-neighbor configuration
Default: 32768 for locally originated routes; 0 for received routes
```

---

## BGP Path Selection Algorithm

When multiple paths exist to the same prefix, BGP selects the best path in this order:

```
1.  Highest WEIGHT (Cisco only; local to router)
2.  Highest LOCAL_PREFERENCE
3.  Locally originated route (network command / aggregate > iBGP-learned)
4.  Shortest AS_PATH
5.  Lowest ORIGIN (IGP < EGP < Incomplete)
6.  Lowest MED (only compared from same neighboring AS)
7.  eBGP path preferred over iBGP path
8.  Lowest IGP metric to NEXT_HOP (closest next-hop via IGP)
9.  Oldest eBGP route (stability — don't prefer newer paths)
10. Lowest BGP Router ID of advertising router
11. Lowest neighbor IP address (tie-breaker)

Mnemonic: "We Love Oranges As Oranges Mean Pure Refreshment"
  W = Weight
  L = Local Preference
  O = Originate (locally originated)
  A = AS_PATH (shortest)
  O = Origin (IGP/EGP/incomplete)
  M = MED
  P = Peer type (eBGP > iBGP)
  R = Router ID (lowest)
```

---

## Basic BGP Configuration

```cisco
! Enable BGP, specify local AS number
Router(config)# router bgp 65001

! BGP Router ID (best: set manually to loopback IP)
Router(config-router)# bgp router-id 1.1.1.1

! eBGP peer (different AS)
Router(config-router)# neighbor 203.0.113.2 remote-as 65002
Router(config-router)# neighbor 203.0.113.2 description "Upstream ISP"

! iBGP peer (same AS — use loopback for stability)
Router(config-router)# neighbor 10.255.255.2 remote-as 65001
Router(config-router)# neighbor 10.255.255.2 update-source Loopback0

! eBGP multihop (for eBGP peers not directly connected)
Router(config-router)# neighbor 8.8.8.8 remote-as 15169
Router(config-router)# neighbor 8.8.8.8 ebgp-multihop 2

! Advertise own prefixes into BGP
Router(config-router)# network 203.0.113.0 mask 255.255.255.0
! (the exact prefix must exist in the routing table — exact match)

! Redistribute from IGP (less preferred — use 'network' for precise control)
Router(config-router)# redistribute ospf 1

! Aggregate (summarize multiple prefixes)
Router(config-router)# aggregate-address 203.0.113.0 255.255.252.0 summary-only
! summary-only suppresses the more specific routes

! Default route to eBGP peer (useful for ISP→customer)
Router(config-router)# neighbor 203.0.113.2 default-originate

! Suppress BGP sending routes to a neighbor (outbound filter)
ip prefix-list FILTER seq 5 deny 10.0.0.0/8 le 32
ip prefix-list FILTER seq 10 permit 0.0.0.0/0 le 32
Router(config-router)# neighbor 203.0.113.2 prefix-list FILTER out

! next-hop-self (iBGP — make yourself the NEXT_HOP)
Router(config-router)# neighbor 10.255.255.2 next-hop-self
```

---

## BGP Verification

```cisco
Router# show bgp summary                      ! neighbor states and prefix counts
Router# show bgp neighbors 203.0.113.2        ! detailed neighbor info
Router# show bgp                               ! full BGP table (all paths)
Router# show ip bgp                            ! same for IPv4
Router# show bgp ipv6 unicast                  ! IPv6 BGP table
Router# show ip bgp 0.0.0.0/0                  ! specific prefix
Router# show ip bgp neighbor 203.0.113.2 routes   ! routes received from peer
Router# show ip bgp neighbor 203.0.113.2 advertised-routes  ! routes sent to peer

! Example BGP table output:
BGP table version is 1234, local router ID is 1.1.1.1
Status codes: s suppressed, d damped, h history, * valid, > best, i iBGP
  Network          Next Hop         Metric  LocPrf  Weight  Path
*> 0.0.0.0/0       203.0.113.2           0              0  65002 i
*  203.0.113.0/24  0.0.0.0               0          32768  i
!  * = valid route   > = best path   i = IGP origin
```

---

## Tips

- BGP is TCP-based — troubleshoot TCP connectivity first if neighbors aren't establishing (check ACLs, routing to peer IP, firewall rules on port 179).
- The iBGP split-horizon rule (don't re-advertise iBGP-learned routes to other iBGP peers) means every iBGP router must peer with every other iBGP router — use Route Reflectors to avoid this full-mesh requirement (see BGP Advanced).
- NEXT_HOP is not updated by iBGP — always configure `next-hop-self` on iBGP sessions at internet-facing routers, or ensure all iBGP peers can reach the eBGP NEXT_HOP via the IGP.
- LOCAL_PREF controls outbound traffic (which exit to use); MED influences inbound traffic (which entry a neighbor should prefer).
- Use the `network` command with an exact subnet mask to control what you advertise — avoid redistribute unless you have strict filtering.
- BGP convergence is intentionally slow (Minimum Route Advertisement Interval — MRAI: 30s eBGP, 5s iBGP default) — this prevents route flaps from cascading across the global internet.

---

## Summary

- BGP is the only active EGP — it connects tens of thousands of ASes and carries the global routing table.
- BGP uses TCP port 179; sessions must be explicitly configured; the state machine ends at ESTABLISHED.
- Path attributes (AS_PATH, NEXT_HOP, LOCAL_PREF, MED, COMMUNITY, WEIGHT) enable rich policy-driven routing.
- Path selection order: Weight → Local Preference → Locally Originated → AS_PATH length → Origin → MED → eBGP > iBGP → IGP metric → Router ID.
- iBGP: same AS, routes not re-advertised between iBGP peers; NEXT_HOP unchanged; requires full mesh or Route Reflectors.
- eBGP: different ASes; NEXT_HOP updated to advertising router's IP; TTL=1 by default (direct connection required unless ebgp-multihop).
