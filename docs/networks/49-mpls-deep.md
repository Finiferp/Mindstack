---
title: "MPLS Deep Dive — Traffic Engineering and Services"
sidebar_label: "MPLS Deep Dive"
sidebar_position: 49
---

# MPLS Deep Dive — Traffic Engineering and Services

MPLS is more than just a VPN technology. This page covers the full label stack, MPLS-TE (traffic engineering), RSVP, QoS marking, and the role MPLS plays in modern service provider networks.

---

## The MPLS Label Stack

MPLS sits between Layer 2 and Layer 3 — the "shim header."

```
Ethernet Frame:
  ┌──────────┬──────────┬──────────┬──────────────────────┬────────────────┐
  │ Eth Hdr  │ MPLS Lbl │ MPLS L2  │ ... More Labels ...  │  IP Packet     │
  │ (14B)    │ (4 bytes)│ (4 bytes)│   (if label stack)   │  + payload     │
  └──────────┴──────────┴──────────┴──────────────────────┴────────────────┘
                    Label Stack

Label format (32 bits):
  ┌──────────────────────┬─────┬────┬───────────┐
  │  Label Value (20b)   │ TC  │ S  │  TTL (8b) │
  │                      │(3b) │(1b)│           │
  └──────────────────────┴─────┴────┴───────────┘

Label Value: 0–1048575 (20 bits)
  Special reserved labels:
    0  — IPv4 Explicit NULL (signal to penultimate hop: pop and send as IPv4)
    1  — Router Alert
    2  — IPv6 Explicit NULL
    3  — Implicit NULL (PHP signal — see below)
    4-15: reserved
    16+: local label allocation

TC (Traffic Class): 3 bits
  Formerly called EXP (Experimental) — misnomer, now officially TC
  Maps to QoS treatment: 0-7; 7=highest priority
  Carried in IP DSCP field → mapped to TC on ingress

S (Bottom of Stack): 1 bit
  S=1 → this is the last label in the stack
  S=0 → more labels follow below

TTL: 8 bits
  Decremented at each hop (same role as IP TTL — prevents loops)
  Copied from IP TTL on ingress; copied back to IP TTL on egress
  "TTL propagation" can be disabled (hides provider topology from traceroute)
```

### Label Stack Operations

```
PUSH:   Add a label on top of the stack (ingress PE; add transport label)
SWAP:   Replace the top label with a different one (P routers in the core)
POP:    Remove the top label (egress PE; or penultimate hop with PHP)

Example: Two-label stack for MPLS VPN

  Customer packet → PE1:
    Push VPN label  (identifies customer VRF on remote PE)
    Push Transport label (identifies LSP path to remote PE)
    Forward based on transport label

  P routers (core):
    Swap transport label only
    Never see the VPN label or customer IP

  Penultimate P router (PHP):
    Pop transport label (Penultimate Hop Popping)
    PE2 receives packet with only VPN label

  Egress PE2:
    Pop VPN label → look up in customer VRF → forward to CE
```

---

## LDP — Label Distribution Protocol

LDP is the default protocol for distributing MPLS labels in a network.

```
Port: TCP 646, UDP 646
Discovery: UDP multicast 224.0.0.2 (all routers) for neighbor discovery
           Then TCP session established

LDP distributes a label for every IP prefix in the routing table.
Each router announces: "I will accept traffic for prefix X using label L"

Process:
  1. LDP neighbor discovery via UDP hellos
  2. TCP session established (higher RID initiates)
  3. Capability exchange
  4. Label bindings advertised for all prefixes
  5. Neighbors merge bindings to build LFIB (Label Forwarding Information Base)

Label distribution modes:
  Downstream Unsolicited (DU) — default; each router sends all its labels unasked
  Downstream on Demand (DoD) — router requests specific labels (less common)

LSP (Label Switched Path):
  Unidirectional; from ingress to egress
  Built by LDP for every FEC (Forwarding Equivalence Class — usually a prefix)
  All traffic for a prefix in same LSP follows same path

Cisco IOS LDP config:
  Router(config)# mpls ip                          ! enable MPLS globally
  Router(config)# mpls label protocol ldp          ! use LDP (also rsvp, tdp)
  Router(config)# interface GigabitEthernet0/0
  Router(config-if)# mpls ip                       ! enable MPLS on interface

  Router# show mpls ldp neighbor                   ! LDP sessions
  Router# show mpls ldp bindings                   ! label bindings per prefix
  Router# show mpls forwarding-table               ! LFIB (actual forwarding table)
  Router# show mpls interfaces                     ! interfaces with MPLS enabled
```

---

## Penultimate Hop Popping (PHP)

```
Without PHP:
  Egress PE receives packet with transport label
  PE must look up the label → find it's for itself → pop it → look up VPN label
  Two lookups at the PE

With PHP:
  Penultimate (second-to-last) router pops the transport label
  Advertises "implicit NULL" (label 3) for prefixes pointing to PE
  PE receives packet with only the VPN label on top
  One lookup at the PE → forward to customer

Default: PHP enabled by default on Cisco IOS
  Label 3 advertised for directly connected PE interfaces

Explicit NULL:
  Sometimes you want the TC bits in the transport label to survive to the PE
  (for QoS marking visibility at PE)
  Explicit NULL (label 0) carries TC bits but is still popped on arrival
  mpls ldp explicit-null — advertise explicit-null instead of implicit-null
```

---

## RSVP-TE — Resource Reservation Protocol for Traffic Engineering

RSVP-TE extends LDP with explicit path control and bandwidth reservation — the foundation of MPLS-TE.

```
RFC 3209 — RSVP-TE (Traffic Engineering Extensions to RSVP)

Why TE?
  LDP/IGP-based MPLS: traffic follows the same path as IP routing (shortest path)
  TE allows: route specific traffic along non-shortest paths to balance load or avoid congestion

RSVP-TE concepts:
  TE tunnel: configured on ingress router; specifies explicit path or constraints
  Explicit Route: list of hops traffic must follow (ignores routing table)
  Bandwidth reservation: RSVP allocates bandwidth along the path
  CSPF (Constrained Shortest Path First): IGP with TE extensions finds path meeting constraints

RSVP-TE signaling:
  PATH message: ingress sends downstream; carries ERO (Explicit Route Object) with hop list
  RESV message: egress sends back upstream; confirms bandwidth reservation; installs labels
  Result: bi-directional state installed; LSP established with reserved bandwidth

Required: IGP must carry TE topology (link bandwidth, delay, affinity)
  OSPF-TE (RFC 3630) — OSPF with TE extensions
  IS-IS TE (RFC 5305) — IS-IS with TE extensions

TE tunnel attributes:
  Bandwidth: reserve X Mbps along the path
  Priority (setup/hold): which tunnel wins when competing for bandwidth
  Path: explicit list of nodes/interfaces OR auto-routed (CSPF computes)
  Affinity/Attribute flags: match link colors (e.g., "use only red links")

Cisco IOS TE config:
  ! Enable TE on OSPF
  router ospf 1
   mpls traffic-eng area 0
   mpls traffic-eng router-id Loopback0

  ! Enable TE on interfaces
  interface GigabitEthernet0/0
   mpls traffic-eng tunnels
   ip rsvp bandwidth 900000      ! reserve up to 900 Mbps (of 1G link)

  ! Create TE tunnel
  interface Tunnel0
   ip unnumbered Loopback0
   tunnel mode mpls traffic-eng
   tunnel destination 10.255.255.2
   tunnel mpls traffic-eng bandwidth 100000        ! reserve 100 Mbps
   tunnel mpls traffic-eng path-option 1 explicit name MY-PATH   ! explicit path
   tunnel mpls traffic-eng path-option 2 dynamic   ! fallback to CSPF auto-path

  ! Define explicit path
  ip explicit-path name MY-PATH enable
   next-address 10.1.1.2
   next-address 10.2.2.2
   next-address 10.255.255.2

  ! Verification
  Router# show mpls traffic-eng tunnels brief
  Router# show mpls traffic-eng link-management bandwidth-allocation
  Router# show rsvp reservation
```

---

## Segment Routing (SR)

Segment Routing is the modern replacement for RSVP-TE — simpler, more scalable, no per-flow state in the network.

```
Concept:
  Source router encodes the explicit path as a list of "segments" (labels or SRv6 SIDs)
  Each segment = instruction: "forward to this node" or "use this specific interface"
  Intermediate routers just follow segment instructions — no signaling, no RSVP, no per-flow state

SR-MPLS (Segment Routing with MPLS data plane):
  Uses regular MPLS label stack
  Node segment (prefix-SID): "deliver to this router" (topological label)
  Adjacency segment (adj-SID): "use this specific interface" (local label)
  Global segment IDs distributed via IS-IS/OSPF extensions

SRv6 (Segment Routing over IPv6):
  Uses IPv6 extension header (SRH — Segment Routing Header)
  128-bit SIDs (segments) = IPv6 addresses
  Natively runs on any IPv6-capable device
  Increasingly deployed in large SP networks (SoftBank, Rakuten, Alibaba)

SR-TE (SR Traffic Engineering):
  Explicit path via segment list: [node-seg-A, adj-seg-B, node-seg-C]
  No per-flow RSVP state in network core — only at the ingress
  Path computation by SR Path Computation Element (SR-PCE) or controller

SR advantages over RSVP-TE:
  No RSVP state in P routers (massive scale improvement)
  No LDP needed (SR distributes labels via IGP directly)
  Simpler to operate; no refresh messages
  Instant reroute (TI-LFA — Topology Independent Loop-Free Alternate)
  Deeply integrated with SD-WAN and network controllers

Status: Mainstream adoption in large ISP and DC networks
Cisco, Juniper, Nokia all support SR-MPLS and SRv6
```

---

## MPLS QoS — Traffic Classes

```
The 3-bit TC field in MPLS label allows 8 priority classes (0-7):
  7 = highest (network control)
  6 = voice (DSCP EF maps here)
  5 = video conferencing
  4 = streaming video
  3 = mission-critical data
  2 = business data
  1 = bulk/best-effort
  0 = scavenger (lowest)

Mapping at ingress PE:
  IP DSCP → MPLS TC
  DSCP EF  (46) → TC 6
  DSCP AF31 (26) → TC 3
  DSCP CS0  (0)  → TC 0

Per-hop behavior (PHB) in the MPLS core:
  P routers treat traffic based on TC bits
  Strict priority queuing for TC 6 (voice)
  Weighted fair queuing for others
  WRED (Weighted Random Early Detection) for congestion avoidance on lower TC

COS (Class of Service) end-to-end:
  Customer marks IP DSCP → PE maps to MPLS TC → P routers forward per TC
  → Remote PE maps MPLS TC back to IP DSCP → Customer CE sees original marking
  E-LSP (EXP-Inferred-PSC LSP): single LSP, QoS from EXP/TC bits
  L-LSP (Label-Inferred-PSC LSP): separate LSP per class (uncommon)
```

---

## VPLS and EVPN — Layer 2 MPLS Services

```
VPLS (Virtual Private LAN Service, RFC 4762):
  Extends Layer 2 Ethernet across MPLS network
  Customers see a single switched LAN spanning all their sites
  PE routers emulate an Ethernet switch (MAC learning, flooding, forwarding)
  Full mesh of pseudowires between PEs (or hierarchical VPLS)
  Use case: customers needing Layer 2 connectivity (don't want routing at ISP)

Pseudowire (RFC 3985):
  Emulates a Layer 2 circuit (Ethernet, Frame Relay, ATM) over MPLS or IP
  Encapsulates L2 frames; adds PW label + transport label
  Used in VPLS, VPWS (Virtual Private Wire Service = P2P pseudowire)

EVPN (Ethernet VPN, RFC 7432):
  Modern replacement for VPLS
  Uses MP-BGP to distribute MAC/IP addresses (vs MAC learning via flooding)
  Features: ECMP for multi-homed devices, ARP suppression, faster convergence
  Used in: data center fabrics (VXLAN + EVPN), SP Ethernet services
  EVPN over MPLS: MAC addresses in BGP type-2 routes; much more scalable than VPLS
  EVPN over VXLAN: same control plane, different data plane (DC fabric)
```

---

## Tips

- PHP (label 3 = implicit null) reduces PE lookup overhead — leave it on unless you need TC bits in the transport label to reach the PE (use explicit null then).
- Segment Routing is the future — if deploying new MPLS infrastructure, use SR-MPLS or SRv6 instead of LDP + RSVP-TE.
- MPLS-TE bandwidth reservation doesn't guarantee link utilization — it reserves capacity; actual traffic must match or exceed the reservation to justify it.
- EVPN is dramatically more scalable than VPLS for large deployments — MAC table sizes in VPLS are bounded by control plane flooding; EVPN distributes them via BGP.
- Always disable TTL propagation (`no mpls ip propagate-ttl`) when you don't want customers to trace through your MPLS core topology.

---

## Summary

- MPLS label = 20-bit value + 3-bit TC (QoS) + 1-bit S (bottom-of-stack) + 8-bit TTL = 32 bits total, inserted between L2 and IP.
- LDP distributes labels for all IGP prefixes; PHP (label 3) lets penultimate hop pop transport label so PE only sees VPN label.
- RSVP-TE enables explicit path and bandwidth reservation — PATH/RESV messages establish per-flow state in the network.
- Segment Routing replaces LDP + RSVP-TE — path encoded as segment stack at the source; no per-flow state in core routers.
- MPLS TC (3 bits) carries QoS class end-to-end; mapped from IP DSCP at ingress, back to DSCP at egress.
- EVPN (RFC 7432) replaces VPLS for Layer 2 VPN services — MAC/IP distribution via MP-BGP instead of flooding, with better scale and ECMP.
