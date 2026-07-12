---
title: "BGP Advanced"
sidebar_label: "BGP Advanced"
sidebar_position: 38
---

# BGP Advanced

Route Reflectors, confederations, communities for traffic engineering, BGP security, and the story of how the internet's routing table grew from 50K to 1M+ prefixes.

---

## The iBGP Full-Mesh Problem

iBGP's split-horizon rule states: a route learned via iBGP is never re-advertised to another iBGP peer. This prevents routing loops within an AS — but it creates a scaling problem.

```
AS 65001 with 5 routers: A, B, C, D, E
Full-mesh iBGP requires: 5×4/2 = 10 sessions
With 100 routers: 100×99/2 = 4,950 sessions
With 1,000 routers: ~500,000 sessions

Full mesh is unmanageable at scale.
```

Two solutions: **Route Reflectors** (most common) and **Confederations**.

---

## Route Reflectors (RFC 4456)

A Route Reflector (RR) relaxes the iBGP split-horizon rule — it re-advertises iBGP-learned routes to its iBGP clients.

```
Without RR:                      With RR:
  A ─── B                          A ─── RR ─── B
  │   × │         (X = must        │              │
  C ─── D          connect all)    C ─────────────D
  → 6 sessions                     → 4 sessions (A,B,C,D all peer with RR only)
```

### RR Terminology

```
Route Reflector (RR) — re-advertises iBGP routes to clients
RR Client — a router that only peers with the RR (not full mesh)
Non-Client — a router that is NOT a client of this RR (still in full mesh with other non-clients)
Cluster — an RR and all its clients; identified by Cluster ID (default: RR's Router ID)
```

### RR Route Propagation Rules

```
Route received from eBGP peer:
  → Reflect to ALL iBGP peers (clients and non-clients)

Route received from RR Client:
  → Reflect to ALL other clients AND all non-clients

Route received from Non-Client iBGP:
  → Reflect to ALL clients only (not to other non-clients — normal iBGP split-horizon)
```

### Loop Prevention with RR

Since the split-horizon rule is relaxed, new loop prevention is needed:

- **ORIGINATOR_ID** — RR adds the Router ID of the originating router; if a router receives a route with its own Router ID in ORIGINATOR_ID, it ignores it.
- **CLUSTER_LIST** — RR adds its Cluster ID; if a route arrives with your own Cluster ID already in the list, it's a loop — ignore it.

### Cisco IOS Route Reflector Configuration

```cisco
! On the Route Reflector router
router bgp 65001
 bgp router-id 10.255.255.1
 ! Non-client iBGP peers (still need session with RR)
 neighbor 10.255.255.10 remote-as 65001
 neighbor 10.255.255.10 update-source Loopback0
 ! Clients — RR will reflect routes to them
 neighbor 10.255.255.2 remote-as 65001
 neighbor 10.255.255.2 update-source Loopback0
 neighbor 10.255.255.2 route-reflector-client     ! <-- makes this peer a client
 neighbor 10.255.255.3 remote-as 65001
 neighbor 10.255.255.3 update-source Loopback0
 neighbor 10.255.255.3 route-reflector-client
 !
 bgp cluster-id 1                                  ! set cluster ID (optional; default = RID)

! Clients need NO special configuration — they just peer with the RR
! Client routers:
router bgp 65001
 neighbor 10.255.255.1 remote-as 65001   ! peer only with RR
 neighbor 10.255.255.1 update-source Loopback0
 neighbor 10.255.255.1 next-hop-self     ! if RR should be next-hop

! Redundant RRs (best practice — always deploy in pairs)
! Both RRs peer with each other as non-clients
! Both RRs have the same clients
! Clients get routes from both RRs
```

---

## BGP Confederations (RFC 5065)

Confederations divide a large AS into sub-ASes, each with a private AS number. eBGP runs between sub-ASes (so routes are re-advertised), but the public AS number appears unchanged to external peers.

```
Public AS: 65001

Internal structure:
  Sub-AS 65111 ←──eBGP (between sub-ASes)──→ Sub-AS 65112
       ↑                                              ↑
    Customer                                       Provider

From outside: looks like AS 65001 everywhere
Inside: sub-AS routers run eBGP between sub-ASes → no full-mesh required
```

```cisco
! Sub-AS configuration
router bgp 65111                              ! local sub-AS
 bgp confederation identifier 65001          ! public AS number
 bgp confederation peers 65112 65113         ! other sub-ASes
 neighbor 10.1.0.2 remote-as 65112           ! treated as eBGP between sub-ASes
 neighbor 10.2.0.2 remote-as 65001           ! external eBGP peer
```

Route Reflectors are generally preferred over confederations — simpler to configure and understand.

---

## BGP Communities

Communities are route tags (32-bit values, format `AS:value`) attached to BGP prefixes. They enable scalable policy without per-prefix configuration.

### Standard Communities

```cisco
! Attach community when advertising
route-map SET-COMMUNITY permit 10
 set community 65001:100               ! tag with local-community 100

router bgp 65001
 neighbor 203.0.113.1 route-map SET-COMMUNITY out
 neighbor 203.0.113.1 send-community   ! required — communities not sent by default!

! Match community in inbound policy
ip community-list 1 permit 65001:100
route-map MATCH-COMMUNITY permit 10
 match community 1
 set local-preference 200
```

### Well-Known Communities (RFC 1997)

```
NO_EXPORT     (65535:65281 / 0xFFFFFF01)
  → Don't advertise this route to eBGP peers
  → Use: tell upstream ISP to keep your route within their AS

NO_ADVERTISE  (65535:65282 / 0xFFFFFF02)
  → Don't advertise to ANY peer (iBGP or eBGP)
  → Use: keep a route local to the receiving router

NO_EXPORT_SUBCONFED (65535:65283 / 0xFFFFFF03)
  → Don't export outside a BGP confederation sub-AS
  → Use: local to a confederation sub-AS
```

### Community-Based Traffic Engineering

```
ISP A offers these communities to customers:
  65002:100 → set local-pref 100 (prefer this path)
  65002:50  → set local-pref 50  (de-prefer this path)
  65002:0   → blackhole this prefix (RTBH)

Customer tags their advertisement:
  route-map OUT-TO-ISP-A permit 10
   set community 65002:100           ! tell ISP A to prefer your route

RTBH (Remotely Triggered Black Hole):
  Customer sends 10.0.0.5/32 with community 65002:0
  ISP A installs a black hole route for that /32
  All traffic to that host is dropped at the ISP edge
  → Effective DDoS mitigation (protect the rest of your network)
```

### Large Communities (RFC 8092)

```
Three-part format: AS:function:value
Example: 65001:1:100   (AS 65001, function 1 = set-local-pref, value 100)
More flexible than 32-bit communities for large networks
```

---

## BGP Route Policies — route-map and prefix-list

```cisco
! Inbound policy: set LOCAL_PREF based on community
route-map INBOUND-POLICY permit 10
 match community PRIMARY-ISP-COMM
 set local-preference 200
route-map INBOUND-POLICY permit 20
 match community BACKUP-ISP-COMM
 set local-preference 100
route-map INBOUND-POLICY permit 30   ! default: permit remaining

ip community-list standard PRIMARY-ISP-COMM permit 65002:200
ip community-list standard BACKUP-ISP-COMM permit 65002:100

! Outbound policy: prepend AS_PATH to make a route less preferred
route-map OUTBOUND-BACKUP permit 10
 set as-path prepend 65001 65001 65001   ! prepend own AS 3× — makes path look longer
 ! Useful for traffic engineering: make backup link less preferred

! Filter specific prefixes outbound
ip prefix-list ONLY-OWN-PREFIXES seq 5 permit 203.0.113.0/24
ip prefix-list ONLY-OWN-PREFIXES seq 10 deny 0.0.0.0/0 le 32

router bgp 65001
 neighbor 203.0.113.1 route-map OUTBOUND-BACKUP out
 neighbor 203.0.113.1 prefix-list ONLY-OWN-PREFIXES out

! Maximum prefix protection (safety valve — prevents routing table bomb)
 neighbor 203.0.113.1 maximum-prefix 1000 80
 ! 80% warning at 800 prefixes; session torn down at 1000
```

---

## BGP Attributes for Multi-Homing

Multi-homing: connecting to two or more ISPs for redundancy and load balancing.

```
AS 65001 connected to ISP-A (AS 65002) and ISP-B (AS 65003)

Outbound traffic policy (which ISP to use for outbound):
  → Control with LOCAL_PREFERENCE
  → Higher LOCAL_PREF = preferred exit
  route-map ISP-A-IN permit 10
   set local-preference 200     ! prefer ISP A for outbound

Inbound traffic policy (which path others use to reach you):
  → Control with AS_PATH prepending (make one path look longer)
  route-map TO-ISP-B permit 10
   set as-path prepend 65001 65001  ! prepend 2× via ISP B → others prefer ISP A

  → Or use MED (only effective within same neighboring AS)
  route-map TO-ISP-A permit 10
   set metric 100      ! lower MED = preferred
```

---

## Internet Routing Table History

The global BGP table growth tracks internet expansion:

| Year | IPv4 Prefixes | Notable event |
|---|---|---|
| 1989 | ~50 | BGP v1 deployed |
| 1994 | ~20,000 | BGP v4, CIDR introduced |
| 1997 | ~60,000 | Rapid commercialization |
| 2001 | ~100,000 | Dot-com bust; growth slows briefly |
| 2007 | ~220,000 | IPv4 exhaustion accelerates; de-aggregation |
| 2014 | ~512,000 | **512K bug** — older routers crash (CAM overflow) |
| 2017 | ~650,000 | |
| 2020 | ~800,000 | IPv6 table: ~100,000 |
| 2024 | ~950,000+ | IPv6 table: ~180,000+ |

**The 512K Bug (August 12, 2014):** Some older routers (Cisco 7600, ASR 9000 with certain line cards) had hardware CAM (Content Addressable Memory) limited to 512K entries. When the global table crossed this threshold, BGP tables couldn't fit — causing widespread internet outages. The fix: hardware upgrades or configuration changes to limit the stored table.

---

## BGP Security

### BGP Hijacking

BGP has no built-in origin authentication — any AS can announce any prefix, accidentally or maliciously.

```
Famous incidents:
  2008: Pakistan Telecom accidentally hijacked YouTube (AS 17557 announced 208.65.153.0/24)
        → YouTube unreachable globally for 2 hours
  2010: China Telecom hijacked ~37,000 prefixes from 170+ countries for ~18 minutes
  2018: Multiple incidents involving route leak amplified by peers not filtering
  2022: Rostelecom hijacked prefixes from major cloud providers
```

### RPKI — Resource Public Key Infrastructure (RFC 6480)

RPKI cryptographically links IP prefixes to AS numbers using digital certificates.

```
Route Origin Authorization (ROA):
  A signed object stating: "AS 65001 is authorized to originate 203.0.113.0/24 with max prefix /24"

Validation states:
  Valid   — prefix matches a ROA (correct AS, within max-length)
  Invalid — prefix exists in ROA but AS or prefix-length doesn't match → POTENTIAL HIJACK
  Unknown — no ROA exists for this prefix

Deployment:
  1. Network operators create ROAs in an RIR (ARIN, RIPE, etc.) portal
  2. RPKI validators (routinator, OctoRPKI, Fort) fetch and validate ROAs
  3. BGP routers query validators; mark routes Valid/Invalid/Unknown
  4. Drop "Invalid" routes (strict) or just prefer Valid routes (loose)

Router config:
  bgp rpki server tcp 10.0.0.1 port 3323 refresh 600   ! connect to RPKI validator
  router bgp 65001
   neighbor 203.0.113.1 route-map CHECK-RPKI in

  route-map CHECK-RPKI deny 10
   match rpki invalid
  route-map CHECK-RPKI permit 20

RPKI adoption: ~40% of global routes have ROAs as of 2024 (growing rapidly)
```

### BGP Session Security

```cisco
! MD5 authentication (standard practice between peers)
neighbor 203.0.113.1 password MyBGPSecret

! GTSM (Generalized TTL Security Mechanism, RFC 5082)
! Only accept BGP packets with TTL >= 254 (i.e., from directly connected routers)
neighbor 203.0.113.1 ttl-security hops 1
! Prevents spoofed BGP packets from distant attackers (would need TTL >= 254)
```

---

## BGP Verification — Advanced

```cisco
Router# show bgp summary                       ! session states, prefix counts
Router# show bgp neighbors 10.0.0.1           ! full neighbor details (timers, AS, capabilities)
Router# show ip bgp community 65002:100        ! routes with specific community
Router# show ip bgp regexp _65002_             ! routes transiting AS 65002
Router# show ip bgp 203.0.113.0/24            ! specific prefix — all paths + best
Router# show ip bgp rib-failure               ! routes that lost to other protocols
Router# show bgp ipv4 unicast update-group     ! BGP update groups (efficient peer grouping)
Router# show bgp rpki summary                  ! RPKI validator status
Router# show bgp rpki table                    ! RPKI prefix table

! Useful regular expressions for AS_PATH matching
_65002_   → any route transiting AS 65002
^65002$   → routes originating FROM AS 65002 only
^$        → locally originated routes
.*        → any route (match all)
^65002_   → routes with AS_PATH starting with 65002 (directly from 65002)
```

---

## Tips

- Always deploy Route Reflectors in redundant pairs — a single RR is a single point of failure for all iBGP routing.
- Send communities to your upstream ISPs to signal routing preferences (local-pref, AS-path prepending) without needing a phone call to them; most large ISPs publish their community schema.
- RPKI validation should be deployed at all internet-facing BGP sessions — it's the most effective defense against BGP hijacking and costs almost nothing to implement.
- Use `maximum-prefix` on all eBGP sessions — if a peer accidentally leaks 800,000 routes (full internet table) toward you, it won't crash your router.
- AS_PATH prepending is a blunt tool for inbound traffic engineering — add 2–3 extra ASN copies, not 10+ (excessive prepending can cause path selection issues at distant peers).

---

## Summary

- Route Reflectors solve the iBGP full-mesh problem — RR re-advertises iBGP client routes to all other clients; loop prevention via ORIGINATOR_ID and CLUSTER_LIST.
- Confederations divide a large AS into sub-ASes running eBGP internally; simpler alternative is Route Reflectors.
- BGP communities enable scalable policy — attach tags to routes; peers act on them (set local-pref, black-hole, prepend).
- BGP hijacking is a real threat with no built-in prevention — RPKI (Route Origin Authorization) provides cryptographic origin validation.
- The global routing table crossed 512K in 2014 causing widespread outages; as of 2024 it exceeds 950K IPv4 + 180K IPv6 prefixes.
- BGP session security: always use MD5 authentication and GTSM (TTL security) with external peers.
