---
title: "WAN Technologies"
sidebar_label: "WAN Technologies"
sidebar_position: 48
---

# WAN Technologies

WAN technologies connect geographically dispersed sites. The landscape has shifted dramatically — from leased lines and Frame Relay to MPLS and now to SD-WAN over broadband internet. Understanding the history explains why modern designs look the way they do.

---

## WAN Technology Timeline

| Era | Technologies | Characteristics |
|---|---|---|
| 1960s–80s | Leased lines (T1/E1), X.25 | Dedicated copper; expensive; reliable |
| 1990s | Frame Relay, ATM | Statistical multiplexing; cheaper than leased; complex |
| 2000s | MPLS | ISP-managed IP VPN; QoS; scalable; dominant enterprise WAN |
| 2010s | Metro Ethernet, VPLS | Ethernet extension over SP networks |
| 2015+ | SD-WAN, Internet VPN | Software-defined; broadband-based; centrally managed |
| 2020s | SASE, Cloud-first WAN | Security and routing in the cloud edge |

---

## Leased Lines

A leased line is a dedicated, always-on physical circuit between two points — no sharing with other customers.

```
T1 (North America / Japan):
  24 DS0 channels × 64 Kbps = 1.544 Mbps
  DS1 signal; transported over 2 pairs of copper or fiber

E1 (Europe / rest of world):
  32 DS0 channels × 64 Kbps = 2.048 Mbps (30 usable + 2 for framing/signaling)

T3 / DS3:
  28 T1s = 44.736 Mbps

E3:
  16 E1s = 34.368 Mbps

OC-3 / STM-1:
  3 × DS3 = 155.52 Mbps (SONET/SDH carrier)

OC-12 / STM-4:
  622.08 Mbps

OC-48 / STM-16:
  2.488 Gbps

OC-192 / STM-64:
  9.953 Gbps

Properties:
  Dedicated bandwidth (not shared with other customers)
  Low latency (direct circuit)
  High availability (SLA-backed)
  Very expensive (monthly charge per distance × bandwidth)
  Fixed capacity — can't burst
  Symmetric (same upload/download speed)

Use cases today:
  Mostly replaced by MPLS and SD-WAN
  Still used for: PSTN trunking, critical link backup, specific regulatory requirements
```

---

## Frame Relay (Legacy)

Frame Relay was the dominant enterprise WAN technology through the 1990s and early 2000s, largely replaced by MPLS.

```
Layer 2 packet-switched technology:
  Data split into variable-length frames
  Statistical multiplexing — multiple virtual circuits over one physical link
  No error correction, no flow control (left to upper layers)
  Standardized in ITU-T Q.922 / ANSI T1.617

Key concepts:
  DLCI (Data Link Connection Identifier):
    16-bit local identifier for a virtual circuit (like a MAC address for Frame Relay)
    Locally significant — same DLCI can mean different VCs on different routers

  PVC (Permanent Virtual Circuit):
    Provisioned by carrier; always available; fixed endpoints
    Most common in enterprise Frame Relay

  SVC (Switched Virtual Circuit):
    Established on demand; rarely used

  CIR (Committed Information Rate):
    Guaranteed bandwidth level
    Traffic above CIR: marked DE (Discard Eligible) — dropped first when congested

  LMI (Local Management Interface):
    Keepalive and status protocol between router and Frame Relay switch
    Three variants: Cisco (proprietary), ANSI, ITU-T
    Router sends LMI status inquiry; switch responds with PVC status

  DLCI-to-IP mapping:
    Static: frame-relay map ip 10.1.1.2 100 broadcast
    Dynamic: via Inverse ARP (sends requests to all DLCIs)

Status: Officially withdrawn from ITU-T standards in 2016; no new deployments.
Legacy networks may still run Frame Relay in remote or rural areas.
```

---

## ATM — Asynchronous Transfer Mode

ATM was designed to carry both voice and data with guaranteed QoS — fixed 53-byte cells (48-byte payload + 5-byte header).

```
Why 53 bytes?
  US wanted 64-byte cells (for voice); Europe wanted 32-byte cells (for efficiency)
  Compromise: 48 bytes payload + 5 bytes header = 53 bytes total
  Fixed cell size enables hardware-speed switching without parsing

ATM properties:
  Connection-oriented: virtual circuits set up before data flows
  Fixed cell size: predictable delay (important for voice)
  Very rich QoS: CBR, VBR-rt, VBR-nrt, ABR, UBR service categories

ATM addressing:
  VPI (Virtual Path Identifier) + VCI (Virtual Channel Identifier)
  Cells switched based on VPI/VCI label lookup

ATM layers:
  AAL (ATM Adaptation Layer) — maps higher-layer data to ATM cells
    AAL5: most common for data; adds CRC and padding
    AAL1: constant bit rate (voice/video)
    AAL2: variable bit rate real-time (voice multiplexing)

Status: Largely replaced by MPLS and Ethernet.
Still used as transport in some DSL deployments (ATM over ADSL).
```

---

## DSL — Digital Subscriber Line

DSL technologies use existing telephone copper pairs for broadband access.

```
ADSL (Asymmetric DSL):
  Download: up to 8 Mbps; Upload: up to 800 Kbps
  Distance-sensitive: degrades with distance from DSLAM
  Most common residential DSL

ADSL2+:
  Download: up to 24 Mbps; Upload: up to 1 Mbps
  Better noise immunity, longer reach

VDSL / VDSL2:
  Download: up to 100 Mbps; Upload: up to 100 Mbps (symmetric)
  Short range: requires fiber to neighborhood (fiber-to-the-cabinet/node)
  FTTC (Fiber to the Curb): fiber to cabinet, VDSL for last 100-300m

G.fast:
  Download: up to 1 Gbps; Upload: up to 1 Gbps over 100m of copper
  Very short range — fiber must be very close (fiber-to-the-building/distribution-point)

Architecture:
  DSLAM (Digital Subscriber Line Access Multiplexer) — at the CO or cabinet
    Aggregates many DSL lines into one uplink
    Connects to ISP backbone (often via ATM or Ethernet)

PPPoE (Point-to-Point Protocol over Ethernet):
  Common authentication/encapsulation for DSL
  Router establishes PPPoE session with ISP BRAS (Broadband Remote Access Server)
  Overhead: 8 bytes → effective MTU 1492 (vs 1500 for Ethernet)
  MSS clamping often needed (ip tcp adjust-mss 1452 on Cisco)

IPoE (IP over Ethernet):
  DHCP-based assignment; no PPP overhead
  More common in modern deployments
```

---

## Cable Broadband (DOCSIS)

```
DOCSIS (Data Over Cable Service Interface Specification):
  Uses cable TV HFC (Hybrid Fiber-Coax) infrastructure
  Fiber from headend to neighborhood nodes; coax to homes
  Shared medium in the neighborhood (vs DSL's dedicated pair)

DOCSIS versions:
  DOCSIS 1.0/1.1 (1997/2001): ~38 Mbps down / ~10 Mbps up
  DOCSIS 2.0 (2001): 38/30 Mbps; better upstream
  DOCSIS 3.0 (2006): channel bonding → 1.2 Gbps down / 200 Mbps up
  DOCSIS 3.1 (2013): OFDM → 10 Gbps down / 1–2 Gbps up
  DOCSIS 4.0 (2020): 10G down / 6G up; Full Duplex variant

Architecture:
  CMTS (Cable Modem Termination System) — at the headend; similar to DSLAM
  CM (Cable Modem) — at subscriber premises
  Shared downstream: all CMs in a node receive all downstream traffic (encrypted per CM)
  Contention upstream: CMs time-share upstream bandwidth (TDMA / OFDMA)
```

---

## MPLS — Multiprotocol Label Switching

MPLS is the dominant enterprise WAN transport technology — ISPs provision MPLS VPNs for customers, providing the appearance of a private network over shared infrastructure.

```
How MPLS works:
  Packets are labeled at the ingress (entering the MPLS network)
  Labels forwarded by Label Switch Routers (LSRs) — pure label lookup, no IP routing
  Labels removed at egress (leaving the MPLS network)
  Forwarding decisions: label lookup in LFIB (not IP FIB)

MPLS header (inserted between L2 and L3):
  Label (20 bits) + EXP/TC (3 bits, QoS) + S (1 bit, bottom of stack) + TTL (8 bits)
  = 32 bits total

MPLS VPN (RFC 4364 — Layer 3 VPN):
  CE (Customer Edge) router — customer's router; runs BGP, OSPF, or static with PE
  PE (Provider Edge) router — ISP's router; terminates customer's routing protocols
  P (Provider) router — core LSR; only does label switching (no customer routes)

  VRF (Virtual Routing and Forwarding):
    Separate routing table per customer on the PE
    Customer A's routes isolated from Customer B's routes on same PE
    Allows overlapping address space (both customers can use 10.0.0.0/8)

  MP-BGP (Multiprotocol BGP):
    PE routers exchange customer routes via iBGP with VPNv4 address family
    VPNv4: 64-bit Route Distinguisher prepended to IPv4 prefix → makes routes unique
    Route Target communities: import/export controls which VRFs exchange routes

  Traffic flow:
    Customer packet → CE → PE (add VPN label + transport label) → P routers (swap labels)
    → remote PE (remove both labels) → remote CE → customer destination

MPLS advantages:
  Any-to-any connectivity without full mesh of static tunnels
  Layer 3 convergence handled by ISP
  Built-in QoS (traffic engineering, EXP/TC bits)
  Supports VoIP, video, and data with different treatment
  Proven, mature technology; 20+ years in production

MPLS disadvantages:
  Expensive vs internet
  Traffic is backhauled to MPLS hub even for internet-bound traffic
  Changes require ISP involvement; slow provisioning
  Limited flexibility for cloud workloads
  Fixed bandwidth; hard to burst
```

---

## Metro Ethernet

Metro Ethernet extends Ethernet from the LAN into the service provider WAN.

```
Service types:
  E-Line (EVC = Ethernet Virtual Connection — point-to-point):
    EPL (Ethernet Private Line): dedicated; transparent Layer 2 tunnel between two sites
    EVPL (Ethernet Virtual Private Line): shared; multiple EVCs on same port (via VLAN)

  E-LAN (point-to-multipoint):
    EP-LAN: dedicated; full mesh of Layer 2 connectivity
    EVP-LAN: multiple customer LANs over shared infrastructure

  E-Access: connecting to another service provider's Ethernet service

Encapsulation options:
  IEEE 802.1Q VLAN tagging (most common)
  QinQ (802.1ad): double VLAN tagging (customer VLAN inside provider VLAN)
    - Outer tag = Provider VLAN (S-tag); Inner = Customer VLAN (C-tag)
    - Isolates customers while preserving their VLAN numbering

Advantages over MPLS:
  Simpler — standard Ethernet tooling
  Lower cost than traditional MPLS for metro distances
  Easier troubleshooting

Use cases:
  Data center interconnect (DCI)
  Enterprise campus connectivity
  Last-mile access for MPLS
```

---

## SD-WAN — Software-Defined WAN

SD-WAN abstracts the WAN transport from the routing and security policy — enabling centralized control, automatic failover, and intelligent path selection across multiple links (MPLS + internet + LTE).

```
Architecture:
  SD-WAN Edge appliance (at each site)
  SD-WAN Orchestrator/Controller (central management — cloud or on-prem)
  SD-WAN Gateway (cloud or data center hub for centralized internet breakout)

Key capabilities:
  Transport independence: works over any link (MPLS, internet, LTE, satellite)
  Zero-touch provisioning: new site deployed by shipping a box; no manual config
  Application-aware routing: identify applications, route to best path
  Dynamic path selection: measure jitter/latency/loss per path; switch if degraded
  WAN optimization: deduplication, compression, TCP acceleration
  Centralized policy: change routing/security policy from one dashboard

Path selection example:
  Three paths: MPLS (low jitter), internet-1 (high BW), LTE (fallback)
  VoIP traffic → MPLS (lowest jitter)
  YouTube → internet-1 (local breakout; no backhaul to HQ)
  Everything else → MPLS primary; internet-1 secondary; LTE emergency

Major SD-WAN vendors:
  Cisco Viptela (acquired 2017)
  VMware VeloCloud (acquired 2017, now Broadcom)
  Fortinet SD-WAN
  Palo Alto Prisma SD-WAN (CloudGenix acquired 2020)
  Aruba (HPE) EdgeConnect
  Open-source: FRR + overlay tunnels (DIY)

Replacing MPLS with SD-WAN:
  Large bandwidth savings (internet << MPLS per Mbps)
  Cloud-first: direct internet breakout at each site vs backhauling to HQ
  Risk: internet reliability ≠ MPLS SLA; need HA design + carrier redundancy
  Common pattern: keep MPLS for critical apps; add internet for bulk/cloud
```

---

## SASE — Secure Access Service Edge (Gartner, 2019)

SASE converges networking (SD-WAN) and security (firewall, SWG, CASB, ZTNA) into a cloud-delivered service.

```
Components:
  SD-WAN (networking)
  SWG (Secure Web Gateway — web filtering, SSL inspection)
  CASB (Cloud Access Security Broker — cloud app visibility/control)
  ZTNA (Zero Trust Network Access — replaces VPN)
  FWaaS (Firewall as a Service — cloud-delivered NGFW)
  DNS Security

Vendors: Zscaler, Cisco Umbrella + Viptela, Palo Alto Prisma, Netskope, Cloudflare for Teams

Why it matters:
  Traditional design: all traffic backhauled to central firewall → terrible latency for cloud
  SASE: security enforcement at the cloud edge nearest the user
  User in Singapore hitting Office 365: inspected at Singapore PoP, not routed to US HQ
```

---

## Tips

- Frame Relay and ATM are legacy — know them for certification and troubleshooting old networks, but never deploy them new.
- MPLS VPN uses VRFs on PE routers and MP-BGP with VPNv4 to separate customer routing — the RT (Route Target) community controls import/export between VRFs.
- SD-WAN's biggest operational advantage is zero-touch provisioning — a non-technical person at a remote site can rack a box and it self-provisions from the controller.
- QinQ (802.1ad) double tagging lets service providers carry customer VLANs over their own VLAN infrastructure without customer/provider VLAN ID conflicts.
- MSS clamping (`ip tcp adjust-mss`) is required on DSL/PPPoE interfaces to avoid fragmentation — PPPoE's 8-byte overhead reduces the effective MTU to 1492.

---

## Summary

- WAN evolution: Leased lines (dedicated, expensive) → Frame Relay/ATM (statistical mux) → MPLS (ISP-managed IP VPN) → SD-WAN (software-controlled, any transport).
- MPLS uses label switching (not IP routing) in the core; VRFs isolate customers; MP-BGP distributes VPN routes between PE routers.
- DSL technologies run over copper phone lines; distance-sensitive; DSLAM aggregates at the CO; PPPoE is common encapsulation (watch MSS clamping).
- Metro Ethernet extends Ethernet to WAN; E-Line (P2P) and E-LAN (multipoint); QinQ enables VLAN transparency.
- SD-WAN decouples policy from transport — route applications to the best path (MPLS/internet/LTE) with automatic failover and centralized management.
- SASE combines SD-WAN networking with cloud-delivered security (SWG, CASB, ZTNA) — security enforcement at the edge, not the data center.
