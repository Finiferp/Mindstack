---
title: "Route Redistribution, Route Maps & Filtering"
sidebar_label: "Redistribution & Filtering"
sidebar_position: 39
---

# Route Redistribution, Route Maps & Filtering

Redistribution moves routes between routing protocols. Route maps and prefix lists are the policy tools that filter, match, and modify routes at every boundary.

---

## Why Redistribution

Networks rarely run a single routing protocol everywhere. Redistribution is needed when:
- Two companies merge with different IGPs (OSPF meets EIGRP)
- A legacy RIP network is migrated to OSPF in stages
- BGP-learned external routes must enter OSPF for internal distribution
- Connected/static routes must be injected into a dynamic protocol

Redistribution is a surgical tool — always pair it with route filtering to control what crosses boundaries.

---

## How Redistribution Works

When redistributing from Protocol A into Protocol B:
1. Router takes routes from Protocol A's routing table.
2. Injects them into Protocol B as "external" routes with a configured metric.
3. Protocol B floods them to its domain.

**Key rule:** The route must be in the routing table to be redistributed. If it's been suppressed by a filter or overridden by a better AD route, it won't redistribute.

---

## Redistribution Commands (Cisco IOS)

```cisco
! ─── Into OSPF ───────────────────────────────────────────────────────────
router ospf 1
 redistribute eigrp 100 subnets metric 10 metric-type 1
 ! subnets  — required to include subnets (without it, only classful networks redistributed)
 ! metric 10 — external cost assigned to redistributed routes
 ! metric-type 1 — E1 (cumulative cost); default is E2 (fixed external cost)

 redistribute connected subnets
 redistribute static subnets
 redistribute bgp 65001 subnets metric 20 metric-type 2
 redistribute rip subnets metric 50

 ! With route-map for filtering
 redistribute eigrp 100 subnets route-map EIGRP-TO-OSPF

! ─── Into EIGRP ───────────────────────────────────────────────────────────
router eigrp 100
 redistribute ospf 1 metric 10000 100 255 1 1500
 !                   ^     ^ BW(Kbps)  delay(us)  reliability  load  MTU
 ! All five EIGRP metric components MUST be specified

 redistribute connected metric 1000000 1 255 1 1500
 redistribute static metric 1000000 1 255 1 1500
 redistribute bgp 65001 metric 10000 100 255 1 1500

 ! With route-map
 redistribute ospf 1 route-map OSPF-TO-EIGRP metric 10000 100 255 1 1500

! ─── Into BGP ─────────────────────────────────────────────────────────────
router bgp 65001
 redistribute ospf 1 route-map OSPF-TO-BGP
 redistribute connected route-map CONNECTED-TO-BGP
 redistribute static
 ! Prefer 'network' command for precise control in BGP — redistribute is broader

! ─── Into RIP ─────────────────────────────────────────────────────────────
router rip
 redistribute ospf 1 metric 5          ! hop count metric
 redistribute eigrp 100 metric 5
 redistribute static metric 5

! ─── Default metric for all redistribution (single command vs per-redistribute) ────
router ospf 1
 default-metric 20   ! applies to all redistributed routes unless overridden
```

---

## Bidirectional Redistribution — The Loop Problem

When two protocols are redistributed into each other, routing loops can develop:

```
Network: OSPF domain ── Router A (redistributing) ── EIGRP domain
                                ↑
                         Router B also redistributing (redundant ASBR)

Problem:
  EIGRP route 10.1.0.0/24 → redistributed into OSPF as external (cost 20)
  OSPF learns it and re-distributes BACK into EIGRP as external (metric 10000/100/...)
  Now EIGRP sees the route with a fresh EIGRP metric → looks like a valid EIGRP route
  Router that originated it might now prefer the OSPF-reinjected version → loop!
```

### Solutions for Bidirectional Redistribution

```cisco
! Solution 1: Tag routes and filter tags on re-entry
! Tag all EIGRP→OSPF redistributed routes
route-map EIGRP-TO-OSPF permit 10
 set tag 100          ! mark with tag 100

router ospf 1
 redistribute eigrp 100 subnets route-map EIGRP-TO-OSPF

! Filter OSPF→EIGRP: deny routes with tag 100 (they originated from EIGRP)
route-map OSPF-TO-EIGRP deny 10
 match tag 100        ! these came from EIGRP — don't send back
route-map OSPF-TO-EIGRP permit 20
 ! allow true OSPF routes through

router eigrp 100
 redistribute ospf 1 route-map OSPF-TO-EIGRP metric 10000 100 255 1 1500

! Solution 2: Administrative distance manipulation
! Raise the AD of redistributed routes so native protocol routes always win
router eigrp 100
 distance eigrp 90 170
 ! Internal EIGRP AD = 90 (unchanged)
 ! External EIGRP AD = 170 (high enough that native OSPF 110 wins for OSPF domain prefixes)

! Solution 3: Prefix lists to limit what crosses each boundary (strictest control)
ip prefix-list OSPF-NETWORKS permit 10.0.0.0/8 le 24
ip prefix-list EIGRP-NETWORKS permit 172.16.0.0/12 le 24

route-map EIGRP-TO-OSPF permit 10
 match ip address prefix-list EIGRP-NETWORKS

route-map OSPF-TO-EIGRP permit 10
 match ip address prefix-list OSPF-NETWORKS
```

---

## Prefix Lists

Prefix lists match IP prefixes with optional length constraints. They are faster and cleaner than access lists for routing policy.

```cisco
! Syntax: ip prefix-list NAME seq N {permit|deny} prefix/len [ge min] [le max]

! Exact match — only this exact prefix
ip prefix-list EXACT seq 5 permit 192.168.1.0/24

! Deny a specific prefix, permit everything else
ip prefix-list FILTER seq 5 deny 10.0.0.0/8
ip prefix-list FILTER seq 10 permit 0.0.0.0/0 le 32

! ge (greater-than-or-equal) — prefix with this len OR LONGER within the base
ip prefix-list SUBNETS-OF-10 seq 5 permit 10.0.0.0/8 ge 9
! matches /9, /10, /11, ... /32 within 10.0.0.0/8 — i.e., any subnet of 10/8

! le (less-than-or-equal) — prefix with this len OR SHORTER
ip prefix-list MAX24 seq 5 permit 0.0.0.0/0 le 24
! matches any prefix up to /24 — blocks /25 through /32

! Both ge and le together — a range of lengths
ip prefix-list RANGE seq 5 permit 10.0.0.0/8 ge 16 le 24
! matches /16, /17, ... /24 within 10.0.0.0/8

! Default route
ip prefix-list DEFAULT seq 5 permit 0.0.0.0/0

! Any route
ip prefix-list ANY seq 5 permit 0.0.0.0/0 le 32

! Block long prefixes (common ISP filter: no /25+ from customers)
ip prefix-list NO-LONG-PREFIXES seq 5 deny 0.0.0.0/0 ge 25
ip prefix-list NO-LONG-PREFIXES seq 10 permit 0.0.0.0/0 le 24

! Apply prefix list in BGP
router bgp 65001
 neighbor 203.0.113.1 prefix-list NO-LONG-PREFIXES in   ! filter inbound
 neighbor 203.0.113.1 prefix-list NO-LONG-PREFIXES out  ! filter outbound

! Apply in OSPF distribute-list
router ospf 1
 distribute-list prefix FILTER in                         ! filter into OSPF routing table
 distribute-list prefix FILTER out GigabitEthernet0/0    ! filter what OSPF advertises

! Verify
Router# show ip prefix-list FILTER
Router# show ip prefix-list summary
```

---

## Route Maps

Route maps are the most powerful policy tool — they match routes and set attributes. Think of them as an if-then-else construct for routing.

```cisco
! Structure:
! route-map MAP-NAME {permit|deny} sequence-number
!   match conditions (AND logic within a clause)
!   set actions

! ─── Match conditions ──────────────────────────────────────────────────────
match ip address prefix-list MY-LIST      ! match IP prefix
match ip address access-list 10           ! match via ACL
match interface GigabitEthernet0/0        ! match routes from this interface
match metric 100                           ! match by metric value
match route-type {internal|external}      ! match OSPF E1/E2 or EIGRP internal/external
match tag 100                              ! match by route tag
match community COMM-LIST                 ! match BGP community
match as-path AS-PATH-ACL                 ! match BGP AS_PATH
match origin {igp|egp|incomplete}        ! match BGP ORIGIN

! ─── Set actions ───────────────────────────────────────────────────────────
set metric 1000                            ! override metric
set metric-type type-1                     ! OSPF metric type
set tag 200                               ! set route tag
set ip next-hop 192.168.1.1               ! override next-hop
set local-preference 200                  ! BGP local pref
set community 65001:100 additive          ! set (or add with 'additive') BGP community
set as-path prepend 65001 65001           ! prepend ASNs
set origin igp                            ! set ORIGIN attribute
set weight 1000                           ! BGP weight (Cisco only)

! ─── Logic flow ─────────────────────────────────────────────────────────────
! Multiple match conditions in ONE clause = AND (all must match)
! Multiple route-map clauses = OR (first match wins)
! permit clause: route matches → apply set actions → route allowed through
! deny clause: route matches → route BLOCKED (not just not-set — actually filtered)
! No match in any clause → route DENIED by default (implicit deny)

! ─── Example: redistribute EIGRP into OSPF with metric based on prefix ────
ip prefix-list CRITICAL seq 5 permit 10.10.0.0/24
ip prefix-list NORMAL seq 5 permit 10.0.0.0/8 ge 16

route-map EIGRP-TO-OSPF permit 10
 match ip address prefix-list CRITICAL
 set metric 5                              ! lower cost for critical networks
 set metric-type type-1

route-map EIGRP-TO-OSPF permit 20
 match ip address prefix-list NORMAL
 set metric 50
 set metric-type type-2

route-map EIGRP-TO-OSPF deny 30           ! deny everything else
! (implicit deny anyway, but explicit is clearer)

router ospf 1
 redistribute eigrp 100 subnets route-map EIGRP-TO-OSPF

! ─── Policy-Based Routing (PBR) — route-map applied to packets, not routing ───
! Match traffic by ACL, override next-hop (policy routing — ignores routing table)
ip access-list extended VOIP-TRAFFIC
 permit udp any any range 16384 32767    ! RTP voice packets

route-map PBR-VOIP permit 10
 match ip address VOIP-TRAFFIC
 set ip next-hop 10.1.0.1               ! send voice out a different path

interface GigabitEthernet0/0
 ip policy route-map PBR-VOIP           ! apply PBR inbound on interface
```

---

## distribute-list (OSPF/EIGRP Filtering)

```cisco
! distribute-list filters routes ENTERING the routing table (not the LSDB)
! OSPF: does NOT filter LSA flooding; other routers still know the route

router ospf 1
 distribute-list prefix MY-FILTER in            ! filter on all interfaces
 distribute-list prefix MY-FILTER in Gi0/0      ! filter on specific interface
 distribute-list prefix MY-FILTER out Gi0/0     ! filter what is redistributed out

router eigrp 100
 distribute-list prefix MY-FILTER in            ! filter routes entering RIB from EIGRP
 distribute-list prefix MY-FILTER out           ! filter routes being advertised
```

---

## Verification and Troubleshooting

```cisco
! Route policy debugging
Router# show route-map EIGRP-TO-OSPF              ! policy definition and match counts
Router# show ip prefix-list FILTER                ! prefix list detail
Router# show ip bgp route-map OUTBOUND-POLICY     ! routes matching a BGP route-map
Router# show ip ospf database external            ! redistributed (Type 5) LSAs
Router# show ip route ospf                        ! OSPF routes in table
Router# debug ip routing                          ! watch routes install/remove (busy — use carefully)
Router# debug ip bgp updates                      ! BGP update processing

! Trace why a prefix is or isn't in the routing table
Router# show ip route 10.1.0.0
Router# show ip bgp 203.0.113.0/24              ! BGP specific
Router# show ip eigrp topology 10.1.0.0/24      ! EIGRP topology for prefix
Router# show ip ospf database router 1.1.1.1    ! what a specific router is advertising

! Common redistribution problems:
! "Route present in source protocol but not in destination"
!   → Check: is route in the routing table (not just the protocol database)?
!   → Check: is there a route-map applied with a deny clause blocking it?
!   → Check: is the metric configured? (EIGRP requires all 5 components)
!   → Check: for OSPF: did you include 'subnets' keyword?

! "Routing loop between two protocols"
!   → Check: bidirectional redistribution without loop prevention (use tags!)
!   → Check: AD of redistributed routes vs native protocol AD
!   → Consider: single ASBR to reduce complexity, or strict prefix filtering
```

---

## Tips

- Always use route maps with tags when doing bidirectional redistribution — deny routes bearing the tag from returning to their origin protocol.
- Prefix lists are more efficient than ACLs for routing policy — they're purpose-built for prefix matching and easier to read.
- The `subnets` keyword in OSPF redistribution is mandatory for non-classful routes — forgetting it silently drops subnets.
- EIGRP redistribution requires all five metric components — omitting them causes the redistribute command to silently do nothing.
- Apply the principle of least privilege to redistribution: only redistribute what's explicitly needed, deny everything else — never redistribute all protocols into each other without filters.
- `show route-map` with match counters is the fastest way to see if your policy is actually hitting.

---

## Summary

- Redistribution moves routes between routing protocols; always filter with route maps or prefix lists to prevent loops and control what crosses boundaries.
- Bidirectional redistribution without loop prevention creates routing instability — use route tags to mark the source and deny re-injection.
- Prefix lists match prefixes by network and length (`ge`/`le` provide range matching) — cleaner and faster than ACLs for routing policy.
- Route maps provide if-then-else logic: `match` conditions (AND within clause, OR between clauses) → `set` actions (metric, community, next-hop, tag).
- OSPF: always include `subnets`; EIGRP: always specify all five metric values; BGP: prefer `network` over `redistribute` for precise control.
- `distribute-list` filters routes from entering the local routing table — it doesn't suppress LSA flooding in OSPF (other routers still see the LSA).
