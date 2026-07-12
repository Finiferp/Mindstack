---
title: "Service Provider Technologies"
sidebar_label: "Service Provider"
sidebar_position: 74
---

# Service Provider Technologies

Service provider (SP) networks differ from enterprise networks in scale, architecture, and operational model. SPs carry millions of customer flows, operate 24/7 with zero-downtime maintenance requirements, and must isolate thousands of customers on shared infrastructure.

---

## SP vs Enterprise Network Characteristics

| Aspect | Enterprise | Service Provider |
|---|---|---|
| Scale | Hundreds–thousands of routers | Tens of thousands |
| Customer isolation | VLANs, VRFs | MPLS VPN, EVPN |
| Routing | OSPF, EIGRP, iBGP internally | IS-IS backbone, MP-BGP, iBGP |
| WAN | Buy from ISP | They ARE the ISP |
| Redundancy | N+1 per component | Hitless maintenance expected |
| NOC | Mon-Fri business hours typical | 24/7 |
| Billing | Fixed monthly IT cost | Per-Mbps, per-port, per-customer |
| Regulation | Some (PCI, HIPAA) | Significant (CALEA, net neutrality) |

---

## SP Network Architecture

### Three Functional Planes

```
Management Plane:
  Out-of-band management network (dedicated management VRF or separate network)
  SSH/NETCONF to all devices
  RADIUS/TACACS+ for engineer authentication
  NMS/OSS systems: fault, performance, configuration, accounting (FCAPS)

Control Plane:
  Routing protocols: IS-IS (IGP backbone), MP-BGP (VPN/internet routes)
  Signaling: LDP, RSVP-TE, Segment Routing
  OAM: BFD (failure detection), TWAMP (performance measurement)

Data Plane:
  ASIC-based forwarding at line rate
  MPLS label switching (P routers)
  QoS classification and queuing (per customer SLA)
  NetFlow/sFlow/IPFIX export for traffic analysis and billing
```

### Backbone Architecture

```
Points of Presence (PoP):
  SP has PoPs in cities; each PoP has core routers with interconnects
  PoP size: 1-4 core routers; connected to multiple other PoPs (mesh)
  Colocation facilities: neutral "meet-me rooms" where carriers interconnect

P Router (Provider Core):
  Fast MPLS forwarding; label swap only
  No customer routes in FIB (only transport routes)
  Massive PPS forwarding rate (Tbps range for backbone P routers)

PE Router (Provider Edge):
  Customer-facing; runs VRFs for each MPLS VPN customer
  Participates in MP-BGP for VPN route distribution
  Interfaces: customer CE connections (Ethernet, Serial, GPON)

RR (Route Reflector):
  Handles iBGP between PE routers (avoids full mesh)
  Typically 2 RR clusters per region for redundancy

AS (Autonomous System) numbers:
  Large SPs have multiple ASNs (one per region, or one for backbone, one for customers)
  Large SPs: AT&T (7018/AT&T Internet Services ASN pool), Lumen/CenturyLink (3356)
  Common: one AS for iBGP backbone + same AS for all iBGP sessions
```

---

## IS-IS as SP IGP

Most large SPs use IS-IS instead of OSPF for their backbone — here's why:

```
IS-IS (Intermediate System to Intermediate System, ISO 10589):
  Link-state protocol (like OSPF) using Dijkstra SPF
  Originally designed for OSI protocol suite
  Extended for IP: Integrated IS-IS (RFC 1195)

Why IS-IS over OSPF for SP:
  1. Protocol independence: IS-IS runs directly over L2 (not IP-encapsulated)
     Router crash with IP stack issues: IS-IS still functions; OSPF may not
  2. Scalability: IS-IS has fewer hierarchical constraints than OSPF
     OSPF: ALL areas must connect to Area 0; complex multi-area design
     IS-IS: Level 1 (intra-area) and Level 2 (inter-area); simpler
  3. Fast convergence: sub-second with fast hellos + incremental SPF
  4. TE extensions: IS-IS-TE extensions well-established in SP world
  5. Scale: IS-IS handles very large databases better than OSPF in practice
  6. History: early adoption by large ISPs; inertia and proven track record

IS-IS levels:
  Level 1 (L1): intra-area routing (like OSPF intra-area)
  Level 2 (L2): inter-area routing (backbone; all SP backbones run L2 or L1L2)
  L1L2 router: border between areas (like OSPF ABR)
  Most SPs run all backbone routers as L2 only (flat backbone; no Level 1 areas)

IS-IS metric:
  Default metric: 10 per link (all links equal — must be changed!)
  Wide metric (ISO 10589): up to 16,777,214 per link
  Always configure wide metrics: metric-style wide
  TE extensions use wide metrics for bandwidth reservation

IS-IS configuration (Cisco IOS):
  router isis BACKBONE
   net 49.0001.0000.0000.0001.00  ! Network Entity Title (ISO NET address)
   !                                 49=area; 0001=area number; middle=system ID; 00=selector
   is-type level-2-only             ! backbone runs L2 only
   metric-style wide                ! enable wide metrics (required for TE)
   log-adjacency-changes
   nsf ietf                        ! Non-Stop Forwarding (hitless restart)
   fast-reroute per-prefix level-2 ! TI-LFA (Topology-Independent LFA)

  interface GigabitEthernet0/0
   isis circuit-type level-2-only
   isis metric 10                  ! link cost (set based on bandwidth)
   isis network point-to-point     ! P2P links (skip DIS election)
   bfd interval 300 min_rx 300 multiplier 3  ! BFD for fast failure detection
```

---

## MPLS LDP and Transport

```
LDP distributes transport labels (see MPLS deep dive page for full detail)
Key SP considerations:

LDP-IGP synchronization:
  Problem: IGP installs route to neighbor before LDP session established
           Traffic forwarded without MPLS label → drops at MPLS-expecting P router
  Solution:
    router isis BACKBONE
     mpls ldp sync         ! don't announce IS-IS adjacency until LDP session up
    interface GigabitEthernet0/0
     mpls ldp igp sync     ! per-interface synchronization

LDP session protection:
  LDP sessions typically use link-local addresses; if link fails, LDP session drops
  LDP session protection: maintain targeted LDP sessions (non-link-local) as backup
    mpls ldp session protection for 60   ! maintain session for 60 seconds after link failure

Loop-Free Alternate (LFA / TI-LFA):
  Pre-compute backup paths for all prefixes
  On link failure: immediately switch to pre-computed alternate (< 50ms)
  TI-LFA (Topology-Independent LFA): works for all topologies (not just rings)
  Standard with Segment Routing; available with IS-IS and OSPF

Segment Routing (modern replacement for LDP):
  IS-IS/OSPF carry segment IDs (prefix-SIDs) as IGP TLVs
  No LDP sessions, no state machine, no per-flow state
  Simpler operations; faster convergence
  Enables TI-LFA natively
```

---

## BGP in SP Networks — Advanced Patterns

### iBGP Full Mesh → Route Reflectors at Scale

```
SP with 500 PE routers → 500×499/2 = 124,750 iBGP sessions needed for full mesh
Solution: Route Reflector hierarchy

Cluster design:
  RR Cluster 1 (region): 2 RR servers; 50 PE clients
  RR Cluster 2 (region): 2 RR servers; 50 PE clients
  ...
  Super-RR (backbone): reflects between regional RR clusters
  Or: flat 2-tier (all PEs → regional RRs → inter-regional iBGP)

ADDPATH (BGP ADD-PATH, RFC 7911):
  By default RR only advertises best path to clients
  Problem: client loses visibility into backup paths
  ADDPATH: RR sends multiple paths per prefix (2-4 best paths)
  Enables faster failover (client already has backup path installed)

BGP PIC (Prefix Independent Convergence):
  Pre-programs backup nexthop in FIB even before the primary fails
  On PE: if egress PE fails, immediately switch to backup path (already in FIB)
  Sub-second failover without waiting for BGP reconvergence

BGP graceful restart (RFC 4724):
  Router restarts without dropping BGP sessions (helpful for maintenance)
  Peer continues forwarding during restart; routes remain installed
  Router announces graceful restart capability in OPEN message
  Peers maintain stale routes for graceful restart timer (240 seconds typical)

NSF (Non-Stop Forwarding) / NSR (Non-Stop Routing):
  NSF: control plane restarts; data plane continues forwarding (works with peer GR support)
  NSR: control plane state synchronized between active/standby RPs; transparent restart
  Critical for SP maintenance windows (hitless RP switchover)
```

### BGP Policy at Scale

```
SP BGP policies are complex — thousands of customers, hundreds of peers, traffic engineering

BGP communities for SP:
  Customer receives → set local-pref (prefer this ISP or that)
  Customer sends → tag routes with community to influence SP behavior
  Peer receives → accept their routes; set local-pref 100 (use only as last resort)
  Upstream → set local-pref 80 (backup)

Large BGP community (RFC 8092):
  Format: ASN:function:value (48-bit total)
  65000:1:100 → "set local-pref 100 for this community"
  Enables scalable policy without per-customer config

Route policy language:
  Cisco IOS: route-map
  Junos: policy-statement / routing-policy
  Cisco IOS-XR: route-policy language (RPL) — full if/then/else statements
    route-policy SET-LOCAL-PREF-200
      if community matches-any COMMUNITY-HIGH-PREF then
        set local-preference 200
      elseif community matches-any COMMUNITY-LOW-PREF then
        set local-preference 50
      else
        set local-preference 100
      endif
    end-policy
```

---

## Carrier-Grade NAT (CGNAT)

```
ISPs exhausted IPv4 space → CGNAT (RFC 6598) shares public IPs across many subscribers

CGNAT architecture:
  Subscriber gets private address (100.64.0.0/10 — Shared Address Space)
  CGNAT device translates subscriber private → shared public pool
  Like home NAT (PAT) but at massive scale (1 public IP → 500-2000 subscribers)

CGNAT challenges:
  Traceability: multiple subscribers map to same public IP → must log port allocations
    IP + port + time → subscriber (legally required in many countries)
  Application impact: P2P, gaming, VoIP, SIP (NAT traversal issues)
  IPv6 is the real long-term fix; CGNAT is a bridge

Shared Address Space: 100.64.0.0/10 (RFC 6598)
  Reserved for ISP CGNAT use (not route on public internet)
  ISP assigns from this range to CPE (home router); CPE then NAT to real addresses

Port Block Allocation (PBA):
  Instead of per-session logging (billions of entries), allocate a block of ports per subscriber
  Subscriber gets: 100.64.x.x:10000-10511 (512-port block) → one log entry for entire session
  PBA dramatically reduces logging overhead while maintaining traceability
```

---

## Peering and Internet Exchange Points

```
ISP interconnection models:

Transit (customer-provider):
  Customer pays provider for internet access
  Provider carries customer traffic to all destinations
  Provider advertises customer's prefixes to all peers
  Common for: enterprises, smaller ISPs

Peering (settlement-free):
  Two ISPs exchange traffic for free (mutual benefit)
  Only exchange traffic for each other's customers (not transit)
  BGP no-export community: don't advertise peering routes as transit

Internet Exchange Point (IXP):
  Neutral facility where networks peer at lower cost
  Shared switched fabric; hundreds of networks in one location
  Route server: optional; simplifies peering (advertise once → all members)
  Major IXPs: DE-CIX Frankfurt (largest), AMS-IX Amsterdam, LINX London, Equinix Exchange
  NYIIX, SIX, TORIX, etc. in North America

Peering policy types:
  Open peering: peer with any ASN that requests (smaller ISPs)
  Selective peering: criteria — traffic volume, geographic balance, network size
  Restricted: large ISPs that only peer in specific locations / traffic-balanced only

Traffic ratio:
  Peering disputes often arise from traffic imbalance
  If ISP A sends 3× more traffic to ISP B than receives → B may bill A or de-peer
  "Hot potato" routing: offload traffic to peer as early as possible in your network
  "Cold potato" / "BGR" routing: carry traffic as long as possible in your own network
```

---

## SP Ethernet Services

```
Metro Ethernet (covered in WAN page) — commercial naming:
  E-Line: point-to-point Ethernet service (EPL or EVPL)
  E-LAN: multipoint Ethernet (EP-LAN or EVP-LAN)
  E-Tree: hub-spoke Ethernet (one root, many leaves)
  E-Access: last-mile Ethernet hand-off

MEF (Metro Ethernet Forum):
  Industry body that defines CE 2.0 certification for Ethernet services
  EVC (Ethernet Virtual Connection): unit of Ethernet service
  UNI (User-to-Network Interface): handoff point between customer and SP

Pseudowire (RFC 3985):
  Emulates point-to-point L2 service over MPLS
  Used for: private line replacement, legacy circuit migration

EVPN (RFC 7432) for SP Ethernet:
  MAC/IP distribution via BGP → replaces VPLS flooding
  Benefits over VPLS: ECMP, ARP suppression, faster convergence, multi-homing
  Deployed by: major SPs for retail Ethernet, colocation interconnect, DCI
```

---

## Operational Excellence in SP

```
NOC (Network Operations Center):
  24/7 monitoring and incident response
  Tiered: L1 (alert triage, runbook execution) → L2 (advanced troubleshooting) → L3 (engineering)
  Staffing: minimum 2 engineers at all times; escalation path defined

FCAPS (ISO network management model):
  Fault: detect and resolve faults (SNMP traps, syslog alerts, telemetry)
  Configuration: manage device configurations (change management, compliance)
  Accounting: track usage for billing (NetFlow, RADIUS accounting)
  Performance: collect and analyze performance data (TNMS, Grafana, Zabbix)
  Security: manage security posture (ACLs, authentication, incident response)

OSS/BSS:
  OSS (Operations Support System): network inventory, service management, trouble tickets
    Tools: NetBox, ServiceNow, JIRA Service Management
  BSS (Business Support System): billing, customer management, order management
    Tools: vendor-specific billing platforms, Salesforce

SLA (Service Level Agreement):
  Latency: <50ms within region; <150ms cross-continent
  Packet loss: <0.1% in steady state
  Availability: 99.99% or 99.999% uptime
  MTTR: <4 hours for outage restoration
  Measurement: TWAMP (RFC 5357) for latency/loss measurement end-to-end
```

---

## Tips

- IS-IS is preferred over OSPF for SP backbones — it runs directly over Layer 2, scales better, and has decades of deployment in the world's largest networks.
- Always configure LDP-IGP synchronization — without it, traffic blackholes occur during convergence when the IGP is up but LDP hasn't exchanged labels yet.
- CGNAT log retention is a legal requirement in most jurisdictions — design the logging infrastructure before deploying CGNAT, not after.
- BGP ADD-PATH (RFC 7911) on Route Reflectors significantly improves resilience — clients have pre-installed backup paths, enabling instant failover without waiting for BGP reconvergence.
- TI-LFA (Topology-Independent Loop-Free Alternate) with Segment Routing provides sub-50ms restoration for any topology — no longer constrained to ring or specific topology requirements.

---

## Summary

- SP backbones use IS-IS (not OSPF) for the IGP — runs over L2, proven at massive scale, TE extensions well-established.
- MP-BGP with Route Reflectors distributes VPN routes between PE routers — RR hierarchy avoids full-mesh iBGP, ADD-PATH gives clients backup paths.
- NSF/NSR enables hitless router maintenance — control plane restarts without dropping traffic; BFD with GR provides fast failure detection with graceful handling.
- Peering at IXPs reduces cost and improves latency vs transit-only — traffic stays on shorter paths; mutual benefit without settlement fees.
- CGNAT shares public IPv4 across many subscribers — 100.64.0.0/10 Shared Address Space, port block allocation for logging efficiency; IPv6 is the real long-term fix.
- EVPN replaces VPLS for SP Ethernet services — BGP-based MAC/IP distribution eliminates flooding, enables ECMP and faster convergence.
