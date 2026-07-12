---
title: "Network Documentation and Design"
sidebar_label: "Documentation & Design"
sidebar_position: 72
---

# Network Documentation and Design

Good documentation is the foundation of operational excellence. Network design without documentation creates tribal knowledge that evaporates when engineers leave. This page covers documentation standards, IP address management, and design methodology.

---

## Why Documentation Fails (and How to Fix It)

```
Common failures:
  "We'll document it later" → it never happens; later = never
  Stale documentation: network changed; diagram didn't → wrong diagram is worse than no diagram
  Documentation in the wrong place: Word docs buried in SharePoint nobody searches
  Too much detail: nobody reads a 200-page Word doc for a quick reference

What works:
  Source of truth system (NetBox, Nautobot): mandatory before change, not after
  Diagrams as code (Draw.io, Mermaid, NetBox topology): version-controlled, auto-updated
  Runbooks tied to alerts: documentation lives where engineers look during incidents
  Lightweight "just enough" docs: topology + IPAM + runbooks; not novels
```

---

## Source of Truth — NetBox

NetBox is the industry-standard open-source network source of truth system.

```
NetBox capabilities:
  DCIM (Data Center Infrastructure Management):
    Sites, regions, racks, devices, device types
    Power feeds, PDUs, cables
    Virtual machines, clusters

  IPAM (IP Address Management):
    IP prefixes and ranges
    VRFs, VLANs
    IP address assignments
    Aggregate (parent blocks) → Prefixes → IP Addresses hierarchy

  Circuits: ISP circuits, cross-connects, A/Z endpoints
  Virtualization: clusters, VMs, interfaces
  Automation: NetBox as Ansible dynamic inventory source; webhook triggers

NetBox REST API:
  GET /api/ipam/ip-addresses/?device=core-rtr-01
  GET /api/dcim/interfaces/?device=core-rtr-01
  POST /api/ipam/ip-addresses/ (create)
  PATCH /api/ipam/ip-addresses/42/ (update)

Python requests to NetBox:
  import pynetbox
  nb = pynetbox.api("https://netbox.example.com", token="your-api-token")

  # Query all active IP addresses
  ips = nb.ipam.ip_addresses.filter(status="active", role="loopback")
  for ip in ips:
      print(ip.address, ip.assigned_object)

  # Create a new IP address
  nb.ipam.ip_addresses.create({
      "address": "10.255.255.10/32",
      "status": "active",
      "role": "loopback",
      "description": "core-rtr-10 Loopback0"
  })

  # Use as Ansible dynamic inventory
  # ansible-playbook site.yaml -i netbox.yml
  # netbox.yml: plugin: netbox.netbox.nb_inventory; api_endpoint: https://netbox.example.com
```

---

## IP Address Management (IPAM)

### IP Plan Structure

```
Aggregate (parent allocation): 10.0.0.0/8 (RFC 1918 internal)
  ├── Supernet: 10.0.0.0/16 (Infrastructure)
  │   ├── Prefix: 10.0.0.0/24 → Network management (SNMP, SSH, NTP)
  │   ├── Prefix: 10.0.1.0/24 → WAN links /30 and /31 assignments
  │   ├── Prefix: 10.0.2.0/24 → Loopback addresses /32 (one per device)
  │   └── Prefix: 10.0.3.0/24 → Point-to-point links (routers)
  │
  ├── Supernet: 10.1.0.0/16 (Campus A)
  │   ├── 10.1.0.0/24 → VLAN 10 — Corp WiFi
  │   ├── 10.1.1.0/24 → VLAN 20 — Staff LAN
  │   ├── 10.1.2.0/24 → VLAN 30 — Servers
  │   └── 10.1.3.0/24 → VLAN 40 — Printers
  │
  ├── Supernet: 10.2.0.0/16 (Campus B)
  │   └── ... same structure
  │
  └── Supernet: 10.100.0.0/16 (Data Center)
      ├── 10.100.0.0/24 → Production servers
      ├── 10.100.1.0/24 → Database tier
      └── 10.100.2.0/24 → Management / OOB

IPv6 plan:
  ISP allocation: 2001:db8::/32
    Site A: 2001:db8:0001::/48  (65,536 /64 subnets)
      VLAN 10: 2001:db8:0001:0010::/64
      VLAN 20: 2001:db8:0001:0020::/64
      Loopbacks: 2001:db8:0001:ffff::/64 (use ::1, ::2, ::3 etc. for each router)
    Site B: 2001:db8:0002::/48
```

### VLAN Plan

```
VLAN numbering convention (consistent across all sites):

VLAN 1:    Native VLAN (unused in data; required default)
VLAN 10:   Corporate WiFi
VLAN 11:   Guest WiFi
VLAN 20:   Staff LAN (wired)
VLAN 30:   VoIP / Phones
VLAN 40:   Printers / IoT
VLAN 50:   Video Surveillance
VLAN 100:  Server Tier 1 (Web)
VLAN 101:  Server Tier 2 (App)
VLAN 102:  Server Tier 3 (DB)
VLAN 200:  Out-of-Band Management
VLAN 999:  Native VLAN (trunk native VLAN — unused tag)

Documentation per VLAN in NetBox:
  VLAN ID, Name, Site, Tenant, Prefix (link to IPAM), Role, Description, Status
```

---

## Network Diagrams

### Logical vs Physical

```
Physical diagram (L1):
  Shows: actual cables, interfaces, patch panels, rack positions, fiber paths
  Purpose: physical troubleshooting, cable tracing, installation
  Tool: Visio, Draw.io, NetBox topology plugin

Logical diagram (L2/L3):
  Shows: IP addresses, VLANs, routing protocols, logical connectivity
  Hides: physical cabling details
  Purpose: troubleshooting, design review, onboarding new engineers
  Tool: Draw.io, Lucidchart, Mermaid (text-based, version-control friendly)

Network topology levels:
  L1 (topology): physical connectivity; which device connects to which
  L2 (VLAN/STP): VLAN assignments, trunk links, STP root bridge
  L3 (routing): IP addressing, routing protocol relationships, summarization
  Security: ACL placement, firewall zone boundaries, DMZ

Diagram best practices:
  Always include: device hostnames, interface names, IP addresses, WAN links with bandwidth
  Include legend: icons/shapes meaning
  Include date and version (auto-populated from git tag)
  Layer diagrams: separate L1, L2, L3 — one diagram trying to show everything is unreadable
  Diagrams as code (Mermaid): text format, version-controlled in git alongside configs
```

### Mermaid Network Diagram Examples

```
graph TD
    internet((Internet))
    fw1[Firewall Primary<br/>192.168.0.1]
    fw2[Firewall Secondary<br/>192.168.0.2]
    core1[Core Switch 1<br/>Gi0/1: 10.0.0.1/30]
    core2[Core Switch 2<br/>Gi0/1: 10.0.0.5/30]
    dist1[Distribution 1]
    dist2[Distribution 2]
    server1[Server 1<br/>10.100.0.10]

    internet --> fw1
    internet --> fw2
    fw1 <--> fw2
    fw1 --> core1
    fw2 --> core2
    core1 <--> core2
    core1 --> dist1
    core2 --> dist2
    dist1 --> server1
```

---

## Change Management

```
Change types:
  Standard: pre-approved routine changes (e.g., adding a VLAN to an existing trunk)
    No CAB approval needed; documented template; low risk
  Normal: non-emergency changes requiring CAB approval
    Change window; pre-/post-test plan; rollback procedure
  Emergency: urgent fix for active outage
    Verbal approval; document ASAP after the fact

Change template (what every change should document):
  1. Summary: what is being changed and why
  2. Change window: date, time, duration, maintenance window
  3. Risk assessment: impact if change fails; affected services
  4. Implementation plan: exact commands/steps in order
  5. Rollback plan: exact steps to undo if change fails
  6. Pre-change tests: what to verify before starting
  7. Post-change tests: what to verify after completing
  8. Approval: who approved (CAB members, management)

Change best practices:
  Test in lab first (GNS3, EVE-NG, vendor sandbox)
  Schedule in maintenance window (low-traffic period)
  Communicate to users/stakeholders in advance
  Have rollback ready before starting
  Two-engineer rule for critical changes (one makes changes, one verifies)
  Time-bounded changes: if not done in N minutes, rollback
  Never make changes during incident response (unless it IS the fix)
```

---

## Network Design Methodology

### The Design Process

```
1. Requirements gathering
   Business requirements: SLA, availability, compliance, budget
   Technical requirements: bandwidth, latency, security, scalability
   Growth planning: 3-5 year capacity plan
   Stakeholder interviews: IT, security, operations, business units

2. Current state assessment
   Existing topology map (if brownfield)
   Traffic patterns (NetFlow analysis)
   Pain points / known deficiencies
   Hardware end-of-life timeline

3. Design options
   Develop 2-3 candidate designs
   Pros/cons/cost for each
   Alignment with requirements
   Present to stakeholders for selection

4. Detailed design
   IP addressing plan (IPAM)
   VLAN design
   Routing design (protocol choice, summarization)
   Security zones and policies
   HA design (redundancy levels)
   Management plane (monitoring, AAA, logging)

5. Proof of concept (lab validation)
   Test critical functions in lab before production
   Failover testing, performance testing

6. Implementation plan
   Phased rollout (site by site, building by building)
   Cutover plan (critical: minimize production downtime)
   Risk mitigation for each phase

7. Operations handover
   Runbooks for common operations
   Monitoring dashboards
   Training for operations team
```

### Design Principles

```
1. Simplicity over complexity
   Simple networks are easier to troubleshoot and less likely to fail in unexpected ways
   Question every complexity: "Why do we need this? What problem does it solve?"

2. Hierarchy and modularity
   Three-tier (core/distribution/access) or spine-leaf: each layer has defined role
   Modular design: add modules (sites, VLANs) without redesigning the whole network

3. Consistency
   Same configuration template across all devices in same role
   Consistent naming: [site]-[role]-[number] (e.g., NYC-CORE-01, LON-DIST-02)
   Consistent IP scheme: same VLAN numbers and IP ranges at each site

4. Design for failure
   Assume every component will fail; design for graceful degradation
   N+1 minimum; N+2 for mission-critical
   Test failover before production (not during an incident)

5. Security by design
   Network segmentation baked in from the start (not bolted on)
   Least privilege access at every layer
   Audit trail for all management access

6. Scalability
   Design for 2× current capacity; plan the path to 10×
   Don't paint yourself into a corner with addressing or protocol choices
   Document the scale limits of each design decision

7. Operational simplicity
   Network must be operable by the team that runs it (skill level matters)
   Standardize on fewer technologies rather than best-of-breed sprawl
   Document everything (the team that built it won't always be there)
```

---

## Standard Naming Conventions

```
Device naming: [site]-[role]-[number]
  NYC-CORE-01, NYC-CORE-02   — core switches, NYC
  NYC-DIST-01 through 04     — distribution switches
  NYC-ACC-101, NYC-ACC-102   — access switches, building 1
  NYC-RTR-01                 — WAN router
  NYC-FW-01                  — firewall
  NYC-AP-101                 — access point

Interface descriptions:
  "To NYC-CORE-02 Gi0/1 — uplink"
  "To ISP-A — 1Gbps MPLS"
  "To SERVER-01 — ESXi management"

VLAN naming:
  CORP-WIFI, GUEST-WIFI, STAFF-LAN, VOIP, SERVERS-DMZ, MGMT

Circuit IDs:
  Document ISP circuit IDs on WAN interfaces
  interface GigabitEthernet0/0
   description "ISP-A MPLS | CID: AT&T-12345678 | 100Mbps | NOC: 1-800-xxx-xxxx"

Loopback IP conventions:
  10.0.2.1/32 = NYC-CORE-01 Loopback0
  10.0.2.2/32 = NYC-CORE-02 Loopback0
  Loopback IPs = Router IDs for OSPF/BGP/EIGRP
  Sequential; document in NetBox

P2P link conventions:
  /30 between routers: .0 = network, .1 = near side, .2 = far side, .3 = broadcast
  /31 between routers (RFC 3021): .0 = near side, .1 = far side
  Always document both ends: "To NYC-RTR-02 Gi0/0 — /30 10.0.1.0"
```

---

## Runbooks

Runbooks are step-by-step guides for common operational tasks — essential for consistent execution and on-call rotation.

```
Runbook structure:
  Title: clear action statement ("Add a new VLAN to production trunk")
  Purpose: when to use this runbook
  Prerequisites: access, approvals, lab validation required
  Steps: numbered; exact commands; expected output
  Verification: how to confirm success
  Rollback: exact steps if something goes wrong
  Related: links to related runbooks, change templates

Example runbook index:
  VLAN-01: Add new VLAN to production
  VLAN-02: Remove VLAN from production
  BGP-01: Add new BGP peer
  BGP-02: Remove BGP peer
  OSPF-01: Add router to OSPF area
  FW-01: Create firewall rule
  CRT-01: Renew TLS certificate
  HW-01: Replace failed switch
  ISP-01: Failover to backup ISP

Store runbooks: wiki (Confluence, Notion), or Markdown in git alongside configs
  Runbooks in git: version-controlled; changes tracked; engineers can suggest improvements via PR
```

---

## Tips

- NetBox should be updated BEFORE implementing a change, not after — treat it as the authoritative plan, not a post-change log.
- Diagrams as code (Mermaid in git) solves the stale diagram problem — developers review diagram changes in PRs alongside config changes.
- Never skip the rollback procedure in a change template — when an outage is happening, engineers don't have time to figure out how to undo a failed change.
- Name every interface with a description including remote device, interface, and circuit ID — a year from now, no one will remember what that unlabeled cable connects to.
- IP plan consistency pays off at 3 AM: if every site uses the same VLAN/IP scheme, an engineer on-call can troubleshoot any site without re-learning the addressing.

---

## Summary

- NetBox is the industry-standard open-source source of truth — devices, IPs, VLANs, circuits, and their relationships, accessible via REST API.
- IPAM hierarchy: Aggregate → Supernet → Prefix → IP Address — plan a logical scheme with consistent per-site blocks and document in NetBox.
- Separate logical diagrams (L1, L2, L3) — one diagram showing everything is unreadable; diagrams-as-code (Mermaid) enables version control.
- Every change needs: summary, window, risk, implementation steps, post-tests, and rollback plan — skip any of these and you create risk.
- Naming conventions (site-role-number, interface descriptions, VLAN names) make troubleshooting at 3 AM much faster — be consistent across the entire network.
- Runbooks for common operations prevent tribal knowledge loss — store them in git alongside configurations.
