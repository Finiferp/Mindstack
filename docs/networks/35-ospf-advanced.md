---
title: "OSPF Advanced"
sidebar_label: "OSPF Advanced"
sidebar_position: 35
---

# OSPF Advanced

This page covers OSPF tuning for fast convergence, route summarization, virtual links, OSPFv3 for IPv6, and troubleshooting methodology.

---

## Fast Convergence Tuning

Default OSPF convergence (40-second dead interval) is acceptable for many networks but far too slow for critical infrastructure. Modern OSPF can converge in under a second with proper tuning.

### Hello and Dead Timers

```cisco
! Fast hellos (sub-second detection)
interface GigabitEthernet0/0
 ip ospf hello-interval 1         ! send hello every 1 second
 ip ospf dead-interval 3          ! declare dead after 3 seconds
! Both sides must match

! Even faster — BFD (Bidirectional Forwarding Detection)
! BFD detects link failures in milliseconds independently of OSPF
interface GigabitEthernet0/0
 bfd interval 300 min_rx 300 multiplier 3   ! 300ms × 3 = 900ms detection
 ip ospf bfd                                 ! tie OSPF to BFD for fast detection

! With BFD: OSPF dead timer doesn't matter — BFD detects failure in <1 second
! and notifies OSPF immediately
```

### SPF Throttling

OSPF can delay SPF recalculation to avoid repeated computation during route flaps (oscillating links):

```cisco
router ospf 1
 ! timers throttle spf <start> <hold> <max>
 timers throttle spf 50 200 5000
 ! First SPF: starts 50ms after change
 ! Subsequent: holds double each time (200ms, 400ms, 800ms...) up to 5000ms
 ! After 5 seconds of stability: resets to 50ms delay

 ! LSA pacing / throttle (limit how fast LSAs are generated)
 timers throttle lsa all 50 200 5000
 ! First origination: 50ms delay; hold doubles; max 5s

 ! LSA arrival minimum (don't accept same LSA more often than this)
 timers lsa arrival 100           ! 100ms minimum between same LSA
```

### Incremental SPF

Cisco IOS runs incremental SPF (iSPF) by default — only the affected part of the SPF tree is recalculated, not the full tree. This dramatically reduces CPU load in large networks.

---

## Route Summarization in OSPF

OSPF summarization only happens at ABRs (inter-area) and ASBRs (external routes).

```cisco
! ABR — summarize inter-area routes (Type 3 LSA summarization)
router ospf 1
 area 1 range 10.1.0.0 255.255.0.0           ! summarize all of Area 1 into /16
 area 1 range 10.1.0.0 255.255.0.0 cost 100   ! with explicit cost
 area 1 range 10.1.0.0 255.255.0.0 not-advertise ! suppress (filter out the summary)

! ASBR — summarize external routes (Type 5 LSA summarization)
router ospf 1
 summary-address 172.16.0.0 255.255.0.0        ! summarize external routes before redistribution

! Rule: add a discard (null) route when summarizing to prevent routing loops
! Cisco IOS adds this automatically when you configure 'area X range'
! You'll see: O  172.16.0.0/16 is directly connected, Null0 (summary route to null)
```

---

## Virtual Links

Virtual links allow an area that doesn't physically touch Area 0 to connect through a transit area.

```
Normal (required):           Virtual link needed:
  Area 0 ─── Area 1            Area 0 ─── Area 2 ─── Area 1
                               (Area 1 can't reach Area 0 directly)

Virtual link: logical tunnel through Area 2, connecting Area 1's ABR to Area 0
```

```cisco
! Both ABRs must configure the virtual link
! Syntax: area <transit-area> virtual-link <other-router-id>

! ABR in Area 2, connecting Area 0 side:
Router-A(config-router)# area 2 virtual-link 2.2.2.2   ! 2.2.2.2 = Area 1's ABR Router-ID

! ABR in Area 2, connecting Area 1 side:
Router-B(config-router)# area 2 virtual-link 1.1.1.1   ! 1.1.1.1 = Area 0 ABR Router-ID

! Verify
Router# show ip ospf virtual-links
```

Virtual links are a last resort — if you're designing a network and need them, reconsider the physical design. A non-Area-0-connected area is an OSPF design flaw.

---

## OSPFv3 — OSPF for IPv6

OSPFv3 (RFC 5340) adapts OSPF for IPv6. Key differences from OSPFv2:

| Feature | OSPFv2 | OSPFv3 |
|---|---|---|
| IP version | IPv4 | IPv6 (and optionally IPv4 via address families) |
| Network protocol | IPv4 with Protocol 89 | IPv6 with Next Header 89 |
| Link-local use | No | Uses link-local for hellos and updates |
| Authentication | MD5/plain text in header | IPsec (AH or ESP header) |
| Address family | IPv4 only | Can carry IPv4 and IPv6 (RFC 5838) |
| LSA types | Type 1-7 | Renamed/restructured (Intra-Area-Prefix, Router, Network, etc.) |
| Router ID | 32-bit (can match IPv4) | 32-bit — still dotted-decimal even on IPv6-only routers |

OSPFv3 uses link-local source addresses for all packets — this means neighbors must be on the same physical link (can't use OSPFv3 across tunnels without special handling).

```cisco
! Enable IPv6 routing
Router(config)# ipv6 unicast-routing

! OSPFv3 process
Router(config)# ipv6 router ospf 1
Router(config-rtr)# router-id 1.1.1.1     ! still a 32-bit number
Router(config-rtr)# area 0 authentication ipsec spi 256 sha1 0 mykey   ! IPsec auth

! Enable on interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 ospf 1 area 0    ! attach to process 1, Area 0
Router(config-if)# ipv6 ospf cost 10

! Passive interface
Router(config-rtr)# passive-interface GigabitEthernet0/1

! Verification
Router# show ipv6 ospf neighbor
Router# show ipv6 ospf database
Router# show ipv6 route ospf
Router# show ipv6 ospf interface
```

### OSPFv3 Address Families (Dual-Stack)

RFC 5838 added address-family support to OSPFv3 — run a single OSPF process for both IPv4 and IPv6:

```cisco
Router(config)# router ospfv3 1
Router(config-router)# address-family ipv4 unicast
Router(config-router-af)# router-id 1.1.1.1
Router(config-router-af)# area 0 range 10.0.0.0 255.0.0.0
Router(config-router-af)# exit-address-family

Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# router-id 1.1.1.1
Router(config-router-af)# exit-address-family

Router(config)# interface GigabitEthernet0/0
Router(config-if)# ospfv3 1 ipv4 area 0
Router(config-if)# ospfv3 1 ipv6 area 0
```

---

## OSPF Authentication

```cisco
! Interface-level MD5 authentication (most common)
interface GigabitEthernet0/0
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 MyOSPFSecret

! Area-level authentication (applies to all interfaces in area)
router ospf 1
 area 1 authentication message-digest    ! all interfaces in area 1 use MD5

! Null authentication (disable, override area setting)
interface GigabitEthernet0/0
 ip ospf authentication null

! Key chain based (for graceful key rollover)
key chain OSPF-KEYS
 key 1
  key-string OldPassword
  accept-lifetime 00:00:00 Jan 1 2024 00:00:00 Jan 1 2025
  send-lifetime 00:00:00 Jan 1 2024 00:00:00 Dec 31 2024
 key 2
  key-string NewPassword
  accept-lifetime 00:00:00 Dec 1 2024 infinite
  send-lifetime 00:00:00 Jan 1 2025 infinite

interface GigabitEthernet0/0
 ip ospf authentication key-chain OSPF-KEYS
```

---

## Route Redistribution Into OSPF

```cisco
! Redistribute connected routes (useful to bring in directly connected subnets)
router ospf 1
 redistribute connected subnets

! Redistribute static routes
 redistribute static subnets

! Redistribute from EIGRP (default metric required)
 redistribute eigrp 100 metric 10 subnets   ! external cost 10

! Redistribute from BGP
 redistribute bgp 65001 subnets metric 100

! Set type of external route (E1 or E2)
! E2 (default) — fixed external cost; doesn't add internal OSPF cost
! E1 — adds internal OSPF cost to external cost (truer total path cost)
 redistribute static subnets metric-type 1   ! E1
 redistribute static subnets metric-type 2   ! E2 (default)

! Use route map for selective redistribution
 redistribute static subnets route-map FILTER-STATIC
```

---

## OSPF Troubleshooting

```
Problem: Neighbors stuck in EXSTART / EXCHANGE
Most common cause: MTU mismatch
  Check: show ip ospf interface (shows configured MTU)
  Check: interface mtu on both sides (must match)
  Fix (temp): ip ospf mtu-ignore on both sides
  Fix (real): match MTU values

Problem: Neighbors in INIT (one-way communication)
Cause: Hello received but our Router ID not in their Hello
  Check: is there a network/firewall blocking OSPF multicast in one direction?
  Check: access list filtering 224.0.0.5 or 224.0.0.6?
  Check: are interfaces in same subnet?

Problem: 2-WAY but not FULL (on broadcast networks)
Expected: DROTHERs stay at 2-WAY with each other → this is CORRECT
Unexpected: not FULL with DR or BDR → check priority, check DR election

Problem: Route missing from routing table
  Check: show ip ospf database — is the LSA there?
  Check: show ip route — is the route there with a different mask?
  Check: is there a filter (distribute-list, route-map) blocking it?
  Check: is there a more specific match from another source?

Problem: Routes flapping / OSPF instability
  Check: show ip ospf neighbor — are neighbors going up/down?
  Check: is the link reliable? (duplex mismatch, CRC errors)
  Check: is the dead timer too tight? (1/3 rule: dead = at least 3× hello)
  Check: show ip ospf statistics — SPF recalculation frequency

Common show commands for troubleshooting:
  show ip ospf neighbor [detail]
  show ip ospf database [type]
  show ip ospf interface [interface]
  show ip ospf border-routers
  show ip ospf statistics
  debug ip ospf adj          ! neighbor adjacency formation (use carefully)
  debug ip ospf hello        ! hello packets (very verbose)
  debug ip ospf events       ! SPF events and OSPF state changes
```

---

## OSPF Design Best Practices

```
Area sizing:
  Goal: ≤ 50 routers per area (industry rule of thumb)
  Very large areas: more SPF CPU, more flooding on changes
  Very many areas: ABR memory increases (holds LSDB for all areas it's in)

Address design for OSPF:
  Summarize at ABRs — assign address space so each area has a contiguous block
  Example: Area 0 = 10.0.0.0/16, Area 1 = 10.1.0.0/16, Area 2 = 10.2.0.0/16
  This lets each ABR summarize to one Type 3 LSA per area

Loopback interfaces:
  Every router should have a /32 loopback configured and in OSPF
  Use loopback IP as the Router ID
  Advertise loopbacks — they're always up and useful for management/NMS

Non-backbone areas:
  All non-zero areas should be stubs unless they have an ASBR
  Stub or totally stubby reduces LSDB size and SPF computation
```

---

## Tips

- BFD (Bidirectional Forwarding Detection) provides sub-second failure detection independent of OSPF hello timers — pair it with OSPF for fastest failover on critical links.
- Always summarize at ABRs — prevents a topology change in one area from causing SPF recalculation in other areas.
- Virtual links are for patching bad designs, not a first-choice tool — if you need them, reconsider the topology.
- OSPFv3 always uses link-local addresses as source — this means you can't tell which physical interface the neighbor is on just from the OSPFv3 neighbor table; cross-reference with MAC/ARP.
- E1 vs E2 external routes: E2 is default (external cost doesn't change as it propagates deeper into OSPF), E1 adds internal cost (more accurate total path cost) — prefer E1 when you have multiple exit points.

---

## Summary

- Fast convergence: tune hello/dead timers (or use BFD), configure SPF throttling to delay SPF after rapid changes.
- Summarize at ABRs with `area X range` — a discard null route is automatically added to prevent loops.
- Virtual links tunnel through a transit area to connect a disconnected area to Area 0 — use only as a last resort.
- OSPFv3 uses link-local source addresses and IPsec for authentication; address families (RFC 5838) allow a single OSPFv3 process to carry IPv4 and IPv6.
- External routes are Type E1 (cost accumulates) or E2 (cost stays fixed) — E1 gives a more accurate total path cost when multiple exit points exist.
- Most OSPF neighbor failures are caused by: MTU mismatch (EXSTART stuck), timer mismatch, area ID mismatch, or authentication mismatch.
