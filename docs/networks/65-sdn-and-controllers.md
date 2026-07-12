---
title: "SDN and Network Controllers"
sidebar_label: "SDN & Controllers"
sidebar_position: 65
---

# SDN and Network Controllers

Software-Defined Networking separates the control plane (routing decisions) from the data plane (packet forwarding), enabling centralized network programmability. This page covers the theory, OpenFlow, and real-world SDN deployments.

---

## SDN Fundamentals

### The Traditional Problem

```
Traditional networking:
  Every device (router, switch) has both:
    Control plane: runs routing protocols, builds tables (OSPF, STP, ARP)
    Data plane: forwards packets based on those tables (FIB, CAM)

  Consequences:
    Configuration complexity: each device configured individually
    Slow change velocity: change 200 switches one-by-one
    Hard to implement global policy: each device only knows its local view
    Vendor lock-in: proprietary CLIs, features, behaviors per vendor

SDN decouples these planes:
  Data plane stays on each device (forwarding must be fast — ASICs)
  Control plane moves to a centralized controller
  Controller has complete network view → makes better decisions
  Controller speaks to devices via a southbound API (OpenFlow, NETCONF, gRPC)
  Applications speak to controller via a northbound API (REST)
```

### The SDN Architecture

```
                    ┌────────────────────────────────────┐
                    │       Applications (L7)            │
                    │  Network monitoring, orchestration │
                    │  Traffic engineering, security     │
                    └──────────────┬─────────────────────┘
                                   │ Northbound API (REST/gRPC)
                    ┌──────────────▼────────────────────┐
                    │          SDN Controller           │
                    │  Network OS / Control Plane       │
                    │  (OpenDaylight, ONOS, Cisco DNA)  │
                    └──┬──────────┬──────────┬──────────┘
                       │          │          │  Southbound API
                       │ OpenFlow │ NETCONF  │  (per device type)
                    ┌──▼──┐  ┌───▼──┐  ┌───▼───┐
                    │ SW1 │  │ SW2  │  │  RTR  │
                    │Data │  │Data  │  │ Data  │
                    │Plane│  │Plane │  │ Plane │
                    └─────┘  └──────┘  └───────┘
```

---

## OpenFlow — The Original SDN Protocol

OpenFlow (ONF, 2008) was the first standardized southbound API — a protocol for controllers to directly program flow tables in switches.

```
OpenFlow concepts:
  Flow table: ordered list of flow entries in the switch
  Flow entry: match + action + counters
    match: which packets match (fields: in_port, eth_src, eth_dst, ip_src, ip_dst, tcp_port...)
    action: what to do with matching packets (forward to port, drop, modify header, send to controller)
    counters: how many packets/bytes matched

  Pipeline: multiple flow tables chained; packet processed through each
  Controller channel: TCP connection (port 6633/6653) between controller and switch

Flow entry example:
  Match: ip_dst=10.1.0.0/24, ip_protocol=TCP, tcp_dst=80
  Action: output:port_3
  Priority: 100
  
  Meaning: "TCP traffic destined for 10.1.0.0/24 on port 80 → forward out port 3"

OpenFlow messages:
  HELLO: version negotiation on connection
  FEATURES_REQUEST/REPLY: controller asks switch for its capabilities
  FLOW_MOD: controller adds/modifies/deletes a flow entry
  PACKET_IN: switch sends unmatched packet to controller (table miss)
  PACKET_OUT: controller sends a packet to be forwarded by the switch
  PORT_STATUS: switch notifies controller of port state changes
  FLOW_REMOVED: notification when a flow entry expires or is deleted

Versions:
  OpenFlow 1.0 (2009): single flow table; simple matching
  OpenFlow 1.3 (2012): multiple pipeline tables; meters; IPv6; current standard
  OpenFlow 1.5 (2014): egress tables; better multipath support

Challenges with OpenFlow at scale:
  Reactive mode: packet hits, controller decides, installs flow → high latency for first packet
  Flow table size: hardware ASICs have limited TCAM (10K–100K entries); full internet table = ~1M
  Controller failure: single point of failure for entire network
  Limited abstractions: very low-level (bit-matching on headers)
  OpenFlow is now primarily used in research and data center overlays
```

---

## Open SDN Controllers

### OpenDaylight (ODL)

```
Linux Foundation project; enterprise SDN controller
Java-based; modular architecture (OSGi/Karaf)
Southbound: OpenFlow, NETCONF, BGP, OVSDB, gRPC
Northbound: REST API (RESTCONF)
Applications (plugins): L2 switch emulation, path computation, VPN services

Used by: service providers for traffic engineering, NEC, AT&T, China Mobile

Deploy:
  docker run -it opendaylight/opendaylight
  REST API: http://localhost:8181/restconf/
```

### ONOS — Open Network Operating System

```
Linux Foundation project; designed for carrier-grade scale
Java-based; highly clustered (3-5 controller nodes for HA)
Southbound: OpenFlow, NETCONF, gRPC, P4Runtime, BGP
Applications: SDN-IP (BGP-to-SDN bridge), optical networking, PCE
Used by: AT&T (CORD project), Comcast, NTT

Distinct from ODL: ONOS designed specifically for SP scale;
ODL designed for enterprise/multi-purpose use
```

---

## Cisco SDN Solutions

### Cisco ACI — Application Centric Infrastructure

ACI is Cisco's SDN solution for data center networks — an intent-based, policy-driven overlay fabric.

```
Architecture:
  APIC (Application Policy Infrastructure Controller): the SDN controller cluster (3 nodes typical)
  Spine switches: ACI spine (Nexus 9000); non-blocking; CLOS fabric
  Leaf switches: ACI leaf (Nexus 9000); connect servers, firewalls, external networks
  VXLAN + IS-IS: data plane overlay across spine-leaf fabric

Key ACI concepts:
  Tenant: organizational unit (Business Unit A, B, C)
  VRF (Virtual Routing and Forwarding): routing domain within a tenant
  BD (Bridge Domain): Layer 2 domain (equivalent to VLAN) within a VRF
  EPG (Endpoint Group): collection of endpoints with same policy requirements
    e.g., "All web servers," "All DB servers"
  Contract: policy between EPGs (what traffic is allowed between them)

Policy model:
  Web EPG ←──── Contract (port 443, 8080) ────→ App EPG
  App EPG ←──── Contract (port 5432) ──────────→ DB EPG
  No contract = no communication (default deny between EPGs)
  
  Traditional: configure ACLs on every VLAN interface
  ACI: declare intent ("Web talks to App on 443") → APIC programs fabric

APIC REST API:
  https://apic-ip/api/
  JSON/XML; uses class-based object model (fvTenant, fvBD, fvAEPg, vzBrCP...)

Python ACI toolkit (cobra):
  from cobra.mit.access import MoDirectory
  from cobra.mit.session import LoginSession

  session = LoginSession("https://apic-ip", "admin", "password")
  moDir = MoDirectory(session)
  moDir.login()

  # Query all tenants
  tenants = moDir.lookupByClass("fvTenant")
  for tenant in tenants:
      print(tenant.dn, tenant.name)

Benefits: zero-touch provisioning for new VMs; policy consistent across fabric;
          micro-segmentation; single pane of glass for fabric
Challenges: complex; requires new hardware; Cisco lock-in; learning curve
```

### Cisco DNA Center / Catalyst Center

```
DNA (Digital Network Architecture) Center: enterprise SDN controller
  Intent-based networking for campus and branch
  Manages: Catalyst switches, ISR/ASR routers, wireless (Cisco WLCs)
  Southbound: NETCONF/YANG, RESTCONF, gRPC (traditional CLI for older devices)
  Northbound: REST API; 500+ APIs

Key capabilities:
  Intent-based: configure policy by business intent, not CLI
  Automation: device provisioning, software image management
  Assurance: real-time network health; AI-based root cause analysis
  SD-Access: macro/micro-segmentation with SGTs (Security Group Tags)

SD-Access (Software-Defined Access):
  Fabric: VXLAN overlay on IP underlay
  LISP: location/ID separation for mobility (maps endpoint to location)
  ISE: provides identity and policy (SGTs for micro-segmentation)
  DNA Center: orchestrates the fabric

Segmentation without VLANs:
  Traditional: 100 departments = 100 VLANs; complex trunking
  SD-Access: ANY location, same policy (SGT) follows the user
  User tagged with SGT 10 (Finance) at ingress → fabric enforces policy everywhere
  Finance talking to HR → ISE policy → permitted or denied regardless of VLAN
```

---

## Data Plane Programmability — P4

```
P4 (Programming Protocol-Independent Packet Processors, 2013):
  Domain-specific language to program the data plane (the switch ASICs)
  Describe: what headers to parse, what tables to match, what actions to take
  Deploy P4 programs to hardware switches (Tofino) or software switches (BMv2)

Why P4:
  OpenFlow is fixed-function (only match predefined headers: IP, TCP, etc.)
  P4 is fully programmable: define your own protocol headers and processing
  Example: implement a custom encapsulation protocol directly in the switch
  Used for: INT (In-band Network Telemetry), custom protocol support,
            new routing schemes, network function offload

P4 program structure:
  Headers: define packet header fields (custom protocols)
  Parser: extract headers from packet bits
  Match-Action tables: define flow tables and their actions
  Control flow: logic between tables
  Deparser: reconstruct packet from headers + metadata

Example (simplified):
  header ethernet_t {
    bit<48> dstAddr;
    bit<48> srcAddr;
    bit<16> etherType;
  }

  table ipv4_forward {
    key = { hdr.ipv4.dstAddr: lpm; }
    actions = { forward; drop; }
    default_action = drop;
  }

Hardware: Intel Tofino (6.5 Tbps; fully P4-programmable; used by major hyperscalers)
Software: BMv2 (behavioral model; for testing P4 programs)
P4Runtime API: controller communicates with P4 switch to populate tables
```

---

## Network OS — Disaggregated Networking

```
Traditional: switch = vendor hardware + vendor OS (tightly coupled)
Disaggregated: open/commodity switch hardware + open network OS (decoupled)

Open hardware:
  SONiC, OCP (Open Compute Project) switches
  Broadcom Tomahawk, Trident ASICs (same chips in Cisco Nexus, Arista EOS)
  Vendors: Edgecore, Delta, Mellanox/NVIDIA

Open Network OSes:
  SONiC (Software for Open Networking in the Cloud):
    Microsoft's open-source network OS; now widely deployed
    Runs on: Facebook, Google, Microsoft, Alibaba data center switches
    Management: Redis database; YANG models; gNMI
    Supports: BGP, OSPF, VXLAN, EVPN, QoS, ACL, 100G-400G-800G

  FRR (Free Range Routing):
    Open-source routing suite (fork of Quagga); runs on Linux
    Supports: BGP, OSPF, IS-IS, PIM, EIGRP, BFD
    Used in: SONiC, Cumulus Linux, network appliances, VMs
    vtysh shell mimics Cisco CLI

  Cumulus Linux (acquired by NVIDIA):
    Linux-based switch OS; standard Debian + FRR
    Configure with standard Linux tools (ip, FRR, ifupdown)
    Same tools as Linux servers → networking team = Linux team

  OpenWRT:
    Linux distribution for embedded routers/APs
    Used in: home routers, access points, IoT gateways

Benefits of disaggregation:
  Commodity pricing: hardware much cheaper than branded alternatives
  Flexibility: run any software; mix vendors
  Community-driven: open-source improvements
  Automation: standard Linux tools and APIs
  Used by: Facebook, Microsoft (SONiC), hyperscalers at scale
```

---

## EVPN/VXLAN Data Center Fabric

```
Modern data center uses VXLAN (overlay) + EVPN (control plane) instead of STP:

VXLAN (Virtual eXtensible LAN, RFC 7348):
  Encapsulates L2 frames in UDP (VXLAN port 4789)
  24-bit VNI (VXLAN Network Identifier): ~16M unique segments
  Allows: L2 domains to span IP routers (no STP across DC)

EVPN (Ethernet VPN, RFC 7432):
  BGP-based control plane for VXLAN
  Distributes MAC/IP addresses via BGP route-types:
    Type 2: MAC/IP advertisement (replaces L2 flooding for ARP)
    Type 3: Inclusive Multicast Route (BUM traffic handling)
    Type 5: IP Prefix Route (inter-VRF routing)

Spine-Leaf fabric with EVPN:
  Leaf switches: connect servers; are VXLAN TEPs (Tunnel End Points)
  Spine switches: route VXLAN traffic; no VXLAN awareness needed (just BGP)
  iBGP: between leaves and spines (Route Reflector on spines)
  ARP suppression: leaf caches ARP/MAC from EVPN; no flooding
  Symmetric IRB: leaf does L3 routing across VNIs; optimal path

Benefits over traditional campus design:
  No STP (spanning tree) — any-to-any connectivity via IP fabric
  ECMP everywhere (packets can use any spine path)
  Micro-segmentation: VNI per tenant; Policy enforced at leaf
  Scale: easily add spine/leaf pairs; no STP recalculation
```

---

## Tips

- SDN ≠ "use an API instead of CLI" — true SDN decouples the control plane centrally; most "network automation" is better described as "configuration management."
- ACI's EPG/contract model is powerful but requires a complete mental shift from VLAN-centric thinking — invest time in the data model before deploying.
- SONiC is production-ready and deployed at hyperscale — it's not a toy; understanding it is increasingly valuable as enterprises adopt cloud-native data center patterns.
- OpenFlow is largely a research/academic protocol now — real production SDN uses NETCONF/YANG, gNMI, and vendor-specific controllers.
- P4 represents the future of programmable networking — even if you don't write P4 programs, understanding it explains how INT (telemetry) and custom protocols will work at hardware speed.

---

## Summary

- SDN separates control plane (centralized controller) from data plane (distributed ASICs) — enables global network view, programmability, and policy abstraction.
- OpenFlow was the original southbound API — directly programs flow tables; now largely superseded by NETCONF/YANG, gRPC, and vendor APIs.
- Cisco ACI (data center) and DNA Center (campus/branch) are the dominant commercial SDN solutions — intent-based, policy-driven, require specific hardware.
- P4 enables full data plane programmability — define custom headers and processing beyond what OpenFlow's fixed-function model allows.
- SONiC + FRR represents the disaggregated future — open-source, commodity hardware, standard Linux tooling; deployed at hyperscale by Microsoft, Facebook, and Google.
- EVPN/VXLAN has replaced STP-based data center fabrics — BGP control plane, VXLAN data plane, spine-leaf topology with ECMP and no spanning tree.
