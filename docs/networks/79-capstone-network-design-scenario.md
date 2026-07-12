---
title: "Capstone — Full Network Design Scenario"
sidebar_label: "Capstone: Design"
sidebar_position: 79
---

# Capstone — Full Network Design Scenario

This capstone works through a complete greenfield enterprise network design for a fictional company, Acme Corp, applying concepts from every section of this tab — physical topology, addressing, routing, security, wireless, automation, and operations.

---

## Scenario Brief

**Acme Corp** is a 500-person technology company that has outgrown its current network. Requirements:

```
Sites:
  Headquarters (HQ): 350 staff; New York City; primary data center
  Branch Office A:   80 staff; Chicago
  Branch Office B:   70 staff; Austin

Data Center:
  Co-located at Equinix NY5 (same building as HQ)
  VMware-based virtualization; ~200 servers; 10G server connectivity

Internet:
  HQ: two ISPs (ISP-A 10Gbps fiber, ISP-B 1Gbps fiber — backup)
  Branches: SD-WAN over business broadband (primary) + LTE (backup)

Users:
  Mix: wired workstations, laptops, smartphones, VoIP phones, video conferencing
  WiFi 6 throughout; WPA3-Enterprise for corp devices

Security requirements:
  Segment IoT, BYOD, guests from corporate traffic
  All corp traffic encrypted in transit
  Zero Trust principles for remote access
  SIEM and 24/7 monitoring

Compliance: SOC 2 Type II (requires audit logs, access controls, change management)

Budget: $800K capital + $120K/year operational (3-year plan)
```

---

## Physical Topology Design

### HQ + Data Center

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                    INTERNET                              │
                    └──────────┬──────────────────────────┬────────────────────┘
                               │ ISP-A (10Gbps)           │ ISP-B (1Gbps)
                    ┌──────────▼──────────────────────────▼────────────────────┐
                    │   HQ-FW-01 (Primary)      HQ-FW-02 (Secondary)           │
                    │   FortiGate 2600F (Active/Active HA pair)                │
                    │   NGFW: IPS, SSL-Inspect, Web filter, App-ID             │
                    └──────────┬───────────────────────────────────────────────┘
                               │ 10G LACP bond (2×10G)
              ┌────────────────┴────────────────────────────────────────────┐
              │ HQ-CORE-01                                HQ-CORE-02        │
              │ Cisco Catalyst 9500X-28C8D               (Active/Active VSS)│
              │ 100G spine ports; 25G downlinks                             │
              └──┬──────────────┬──────────┬────────────────┬───────────────┘
                 │              │          │                │
          ┌──────▼──┐    ┌──────▼───┐  ┌───▼───────┐  ┌──────▼──────┐
          │HQ-DIST-01│   │HQ-DIST-02│  │DC-LEAF-01 │  │DC-LEAF-02   │
          │C9300L    │   │C9300L    │  │Nexus 93180│  │(vPC pair)   │
          │Floor 1-3 │   │Floor 4-6 │  │DC switches│  │             │
          └──┬───────┘   └──┬───────┘  └────┬──────┘  └─────┬───────┘
             │              │               │               │
       Access│ switches    Access│switches  Servers (dual-homed)
       C9200L per floor    C9200L per floor  └─────10G bond─────┘

Wireless:
  HQ: Cisco Catalyst 9136 APs (Wi-Fi 6E); C9800-40 WLC (HA pair)
  APs on every floor; one AP per ~2500 sq ft; coverage survey done

OOB management:
  Cisco Catalyst 9800 OOB management network; separate VLAN 200
  Console server: Opengear IM7200 for all core/distribution devices
```

### Branch Topology (Chicago and Austin)

```
Branch A and B use identical design (consistency principle):

  Internet (Broadband 1Gbps + LTE backup)
        │
  ┌─────▼──────────────────────────────────────────────────┐
  │   SD-WAN Edge (Cisco Catalyst SD-WAN / Viptela vEdge)  │
  │   Primary: ISP broadband; Secondary: LTE 5G USB        │
  │   Zero-touch provisioned from SD-WAN controller        │
  └─────┬──────────────────────────────────────────────────┘
        │ 1G uplink
  ┌─────▼──────────────────────────┐
  │   Branch-SW-01 (Cisco C9300L)  │
  │   Core + Distribution combined │
  │   Stack of 2 for redundancy    │
  └─────┬───────────────┬──────────┘
        │               │
   Access ports    Branch APs
   (all VLANs)    (2-4 per branch; C9130AXI)
```

---

## IP Addressing Plan

### Summary Allocation

```
10.0.0.0/8 allocated internally (RFC 1918)

10.0.0.0/16 — Infrastructure (management, routing, loopbacks)
10.1.0.0/16 — HQ user VLANs
10.2.0.0/16 — HQ Data Center
10.10.0.0/16 — Branch A (Chicago)
10.20.0.0/16 — Branch B (Austin)
172.16.0.0/12 — SD-WAN overlay addressing

IPv6:
  ISP-A delegation: 2001:db8:acme::/48 (replace with real prefix)
  HQ: 2001:db8:acme:0001::/52
  Branch A: 2001:db8:acme:0010::/52
  Branch B: 2001:db8:acme:0020::/52
  DC: 2001:db8:acme:0100::/52
```

### HQ Detailed Addressing

```
Infrastructure (10.0.0.0/16):
  10.0.0.0/24  — OOB Management
  10.0.1.0/24  — Core-to-Core P2P links (/30 or /31 each)
  10.0.2.0/24  — WAN interfaces
  10.0.255.0/24 — Loopbacks (10.0.255.1 = HQ-CORE-01, .2 = HQ-CORE-02, etc.)

HQ User VLANs (10.1.0.0/16):
  VLAN 10: 10.1.10.0/24  — Corporate WiFi (SLAAC + DHCP)
  VLAN 11: 10.1.11.0/24  — Guest WiFi (isolated; DHCP; NAT to internet)
  VLAN 20: 10.1.20.0/23  — Staff LAN (wired; 10.1.20.0 and .21.0 combined for 510 hosts)
  VLAN 30: 10.1.30.0/24  — VoIP Phones
  VLAN 40: 10.1.40.0/24  — IoT devices (cameras, HVAC, printers)
  VLAN 41: 10.1.41.0/24  — BYOD (limited trust; captive portal + MDM check)
  VLAN 50: 10.1.50.0/24  — Video Conferencing systems
  VLAN 200: 10.0.0.0/24  — OOB Management

HQ Data Center (10.2.0.0/16):
  10.2.0.0/24  — DMZ (web servers, reverse proxy)
  10.2.1.0/24  — App tier
  10.2.2.0/24  — Database tier
  10.2.3.0/24  — DevOps / CI-CD runners
  10.2.10.0/24 — vMotion network
  10.2.11.0/24 — Storage (iSCSI / NFS)
  10.2.20.0/24 — Kubernetes pod CIDR allocation pool
  10.2.100.0/24 — DC Management

Branch A (10.10.0.0/16):
  VLAN 10: 10.10.10.0/24 — Corp WiFi
  VLAN 11: 10.10.11.0/24 — Guest WiFi
  VLAN 20: 10.10.20.0/24 — Staff LAN
  VLAN 30: 10.10.30.0/24 — VoIP
  VLAN 200: 10.10.200.0/24 — Management
```

---

## Routing Design

### Internal Routing (OSPF)

```
Single OSPF area 0 for HQ and DC (flat backbone; no ABR needed for this size)
  Protocol: OSPFv2 + OSPFv3 (dual-stack)
  Process ID: 1
  Reference bandwidth: 100,000 Mbps (100Gbps — so 10G links have cost 10, 1G cost 100)
  Authentication: MD5 on all interfaces (upgrade to SHA-256 when supported)

Passive interfaces: all access-facing SVIs (users can't inject OSPF)
Active interfaces: core-to-core P2P links, uplinks between layers

OSPF metrics (10G reference @ 100G reference bandwidth):
  100G link: cost 1
  10G link:  cost 10
  1G link:   cost 100

Summarization at HQ-CORE:
  Advertise 10.1.0.0/16 summary toward DC (not individual /24s)
  Advertise 10.2.0.0/16 summary toward users
  Keep routing table compact and stable
```

### WAN Routing (BGP)

```
Dual-ISP BGP at HQ:
  AS: 65001 (Acme Corp)
  ISP-A: AS 65002 (10G primary)
  ISP-B: AS 65003 (1G backup)

Outbound preference (LOCAL_PREF):
  From ISP-A: LOCAL_PREF 200 → prefer ISP-A for all outbound
  From ISP-B: LOCAL_PREF 100 → fallback only

Inbound preference (AS_PATH prepend):
  Advertise to ISP-B with 2× prepend → others prefer ISP-A path
  route-map TO-ISP-B: set as-path prepend 65001 65001

Prefix-list OUT: only advertise Acme's owned prefixes (203.0.113.0/24 example)
  No transit routing; no default route leaked from ISP into internal

SD-WAN for branches:
  vEdge appliances connect to SD-WAN controller (Cisco vManage in cloud)
  Policy: Corp traffic (DSCP AF31/EF) → internet direct or SD-WAN tunnel to HQ
  Guest: local breakout to internet at branch (no HQ hairpin)
  Split tunneling: O365/Google Workspace → direct internet; internal apps → SD-WAN tunnel
  Failover: broadband down → LTE; LTE down → SD-WAN tunnel gracefully degrades
```

---

## Security Architecture

### Firewall Zones

```
Zone topology (FortiGate NGFW):
  OUTSIDE (level 0): internet, untrusted
  DMZ (level 50): public-facing servers (web, mail relay, VPN termination)
  TRUST (level 100): internal corporate LAN
  DC (level 80): data center servers
  MGMT (level 100): OOB management network

Policy (deny-by-default; explicit permits):
  OUTSIDE → DMZ: permit TCP 80/443 to web servers; TCP 25 to mail relay
  DMZ → TRUST: deny (compromised DMZ can't pivot inside)
  DMZ → DC App tier: permit only required application ports
  TRUST → DC: permit internal application traffic
  TRUST → OUTSIDE: permit TCP established (stateful); DNS; web
  MGMT → ALL: permit SSH, SNMP from management addresses only

SSL Inspection:
  Decrypt outbound HTTPS from corporate users
  Inspect for malware, data exfiltration, policy violations
  Exempt: banking, healthcare, known-good financial sites (certificate pinning)
  BYOD VLAN: inform users of inspection; legal requirement disclosure

IPS Profile:
  Enable on all inbound internet traffic
  Enable on TRUST → DC traffic (east-west inspection)
  Threat feeds: Fortinet ThreatIntelligence + CISA KEV (Known Exploited Vulnerabilities)
```

### Network Segmentation

```
VLAN to security zone mapping:
  VLAN 20 (Staff LAN) → TRUST
  VLAN 10 (Corp WiFi) → TRUST (WPA3-Enterprise; identity verified)
  VLAN 30 (VoIP) → VOICE zone (firewall permits SIP/RTP; QoS EF)
  VLAN 40 (IoT) → IoT zone (no access to TRUST; only internet for updates)
  VLAN 41 (BYOD) → BYOD zone (MDM compliance check; limited TRUST access)
  VLAN 11 (Guest WiFi) → OUTSIDE equivalent (internet only; no internal)
  VLAN 200 (MGMT) → MGMT zone (only admin access)

Zero Trust for remote access:
  VPN replaced by ZTNA (Fortinet ZTNA / Zscaler Private Access)
  Remote users: authenticate with SSO (Okta) + device posture check
  Access granted per-application, not per-network
  Compromised device posture → access revoked immediately
  All remote access logged and auditable

MFA:
  Required for: VPN/ZTNA, admin SSH to network devices, privileged applications
  Tool: Okta (SAML/OIDC) + Duo for network devices (TACACS+ Duo integration)
```

### 802.1X and AAA

```
802.1X on all access ports:
  Corp devices: EAP-TLS (certificates from MDM — Jamf for Mac/iOS, Intune for Windows)
  Corp phones: EAP-TLS (Cisco IP Phone certificate)
  Printers/IoT: MAB (MAC Auth Bypass) with device profiling in ISE
  BYOD: PEAP/MSCHAPv2 + posture check → BYOD VLAN
  Unknown devices: Guest VLAN (captive portal)

Cisco ISE deployment:
  3-node cluster (Primary + Secondary + PSN for scale)
  Integrates: Active Directory (user identity), Cisco Catalyst (switch enforcement)
  Dynamic VLAN: RADIUS returns VLAN ID based on user identity + device type
  SGT (Security Group Tags): SD-Access micro-segmentation tags

TACACS+ for device management:
  All Cisco devices → Cisco ISE (TACACS+)
  Network engineers: full privilege (level 15 after MFA)
  Help desk: read-only (show commands only; privilege 7)
  Automation account: programmatic access; restricted commands; certificate auth
  Every command logged: `aaa accounting commands 1 default start-stop group TACACS`
```

---

## Wireless Design

```
WLC: Cisco Catalyst 9800-40 HA pair (Active/Standby)
APs: Cisco Catalyst 9136AXI (Wi-Fi 6E, 3-radio, ceiling mount)
     One AP per 2,500 sq ft open office; one per 1,000 sq ft cubicle/dense areas

SSIDs:
  ACME-CORP: WPA3-Enterprise (802.1X EAP-TLS); VLAN 10; 2.4+5+6 GHz
  ACME-VOICE: WPA3-Enterprise; VLAN 30; QoS AC_VO; 802.11r/k/v mandatory
  ACME-BYOD: WPA3-Enterprise (PEAP); VLAN 41; MDM enrollment required
  ACME-IOT: WPA2-PSK (IoT devices can't do 802.1X); VLAN 40; 2.4 GHz only
  ACME-GUEST: OWE (open with encryption); VLAN 11; captive portal

Channel plan:
  2.4 GHz: channels 1/6/11 only; 20 MHz channels
  5 GHz: 40 MHz channels; RRM automatic; avoid DFS where possible
  6 GHz (Wi-Fi 6E): 80 MHz channels; exclusively for corp and voice SSIDs

Roaming:
  802.11r (FT) + 802.11k (neighbor reports) + 802.11v (BSS Transition) enabled
  Target: < 50ms roam time for voice
  PMF (802.11w) mandatory for all SSIDs
```

---

## QoS Design

```
WAN QoS policy (applied on SD-WAN uplinks):
  EF (46): VoIP RTP — strict priority; 20% max
  AF41 (34): Video conferencing — 25% guaranteed
  AF31 (26): Critical business apps (ERP, CRM) — 20% guaranteed
  CS6 (48): Network control — 5% guaranteed
  AF21 (18): General business data — 20% guaranteed
  CS1 (8): Bulk/backup — best effort (yields to all others)
  Default (0): Best effort — remainder

Trust boundary:
  Access layer: remark all traffic from PCs to DSCP 0 (zero trust)
  IP phones: trust DSCP from Cisco IP Phone (managed device)
  Servers: preserve DSCP marking (applications mark correctly)
  WAN edge: re-mark per policy before queuing

DSCP marking by application (FortiGate App-ID):
  Zoom/Teams/WebEx: → AF41 (34)
  Cisco UCM / SIP signaling: → CS3 (24)
  RTP media: → EF (46)
  Salesforce/SAP/Oracle: → AF31 (26)
  HTTP/HTTPS default: → AF21 (18)
  Software updates, backup: → CS1 (8)
```

---

## Automation and Operations

```
Source of truth: NetBox
  All devices, IPs, VLANs, circuits documented before implementation
  NetBox as Ansible dynamic inventory source

Configuration management: Ansible
  Roles: cisco_base_hardening, ios_ospf, ios_bgp, ios_vlan, ios_qos
  Playbook pipeline: PR → Ansible lint → syntax check → lab test → production apply
  All configs version-controlled in GitLab; MR required for any production change
  Ansible Vault for credentials; HashiCorp Vault for PKI/certificate management

Monitoring: Prometheus + Grafana + Alertmanager
  gNMI streaming telemetry (IOS-XE 17.x+): interface counters, BGP state, OSPF
  SNMP for legacy devices (SNMP Exporter → Prometheus)
  Syslog → Loki → Grafana (logs)
  NetFlow → ElastiFlow → Elasticsearch (traffic analysis)
  Grafana dashboards: per-device, per-site, BGP health, wireless health, security events

Alerting policy:
  P1 (page immediately): core device down, WAN link down, BGP session down, firewall down
  P2 (page within 15 min): link >90% utilization, device CPU >80%, certificate expiring <7 days
  P3 (ticket next business day): link >70% utilization, error rate >1%, config drift detected
  Alert routing: PagerDuty → on-call rotation → escalation if no ack in 10 minutes

SIEM: Elastic Security
  All syslog, NetFlow, firewall logs ingested
  Correlation rules: port scan detection, authentication brute force, lateral movement
  SOAR integration: auto-quarantine port on confirmed IoC match (firewall ACL automation)

Change management: Jira Service Management
  All changes approved before execution
  CAB (Change Advisory Board): weekly review of normal changes
  Emergency changes: CTO approval via Slack → document within 24h
  Automated: zero-touch provisioning for branch SD-WAN edges (config from vManage)

Certificates: HashiCorp Vault PKI + Let's Encrypt
  Internal CA: Vault issues certificates for 802.1X (EAP-TLS), mTLS, HTTPS management
  Public cert: Let's Encrypt (auto-renew via Certbot/ACME) for public-facing services
  Certificate monitoring: alert 30 days before expiry
```

---

## Disaster Recovery Plan

```
RTO (Recovery Time Objective): 4 hours for complete site failure
RPO (Recovery Point Objective): 15 minutes data loss maximum

HQ DC failure:
  Compute: VMware vSphere HA restarts VMs on surviving hosts within 5 minutes
  Storage: Pure Storage ActiveCluster (synchronous replication; RPO = 0)
  Network: OSPF re-converges in < 1 second; HSRP failover < 1 second
  Internet: BGP convergence when ISP-A routes withdrawn; ISP-B active within 3 minutes

Full HQ site failure:
  DNS failover: Route 53 health checks; CNAME to AWS standby within 60 seconds
  AWS DR site: warm standby in us-east-1 (snapshots replicated every 15 minutes)
  Manual activation: playbook in Confluence; < 30 minute process
  Users: ZTNA users redirected to DR ZTNA endpoint automatically

Branch site failure:
  SD-WAN handles path failure automatically (sub-second)
  LTE backup activates when broadband fails (< 30 seconds)
  Users: Zoom/Teams via internet (local breakout); internal apps via LTE SD-WAN tunnel
  If edge appliance fails: ship replacement; ZTP provisions from vManage in < 1 hour

DR tests:
  Quarterly: failover simulation for each site (tabletop then live)
  Annual: full DR test (activate AWS DR; run production for 2 hours)
  Monthly: backup restoration verification
```

---

## Implementation Timeline

```
Phase 1 (Months 1-3): Foundation
  Week 1-2:   NetBox populated; addressing plan finalized; procurement ordered
  Week 3-4:   HQ physical infrastructure (racks, power, cabling, fiber)
  Week 5-8:   Core switches and firewalls installed and configured
  Week 9-12:  Distribution and access layer; OOB management; monitoring
  Milestone:  HQ LAN operational; staff migrated from old network

Phase 2 (Months 4-6): DC and Security
  Month 4:    Data center leaf/spine; server connectivity; vSphere vDS
  Month 5:    802.1X deployment; ISE; certificate infrastructure
  Month 6:    NGFW fine-tuning; IPS; SSL inspection; SIEM ingestion
  Milestone:  Full security stack operational; SOC 2 evidence collection begins

Phase 3 (Months 7-9): Branches and WiFi
  Month 7:    SD-WAN controller and policies; Branch A SD-WAN edge
  Month 8:    Branch B SD-WAN edge; wireless deployment HQ
  Month 9:    Branch wireless; guest/BYOD portals; MDM integration
  Milestone:  All sites on new network; old MPLS circuit cancelled

Phase 4 (Months 10-12): Hardening and Automation
  Month 10:   Ansible playbooks for all device types; GitLab CI pipeline
  Month 11:   Grafana dashboards; alerting; runbook documentation
  Month 12:   DR test; SOC 2 audit; IPv6 deployment begins
  Milestone:  Production-ready; automated operations
```

---

## Design Decisions Rationale

```
Why FortiGate over Palo Alto?
  Cost: FortiGate 2600F ~$35K each (PA-5250 ~$120K each)
  Features: comparable NGFW feature set at lower price point
  Budget: saved budget allocated to SD-WAN and monitoring
  Tradeoff: less mature threat intelligence vs Palo Alto WildFire

Why Cisco Catalyst over Arista?
  Staff familiarity: team has CCNA/CCNP certifications
  Support: Cisco SmartNet available; local reseller support
  Integration: native ISE integration for 802.1X at no extra cost
  Tradeoff: higher cost than Arista; less programmable API

Why OSPF over EIGRP?
  Open standard: if Cisco devices ever replaced, OSPF works with any vendor
  Simplicity: single protocol throughout; EIGRP's dual algorithm is complex to troubleshoot
  Skills: widely understood; more engineers know OSPF than EIGRP

Why dual ISP vs single ISP + MPLS for branches?
  Cost: two business broadband circuits << MPLS per Mbps
  SD-WAN: intelligent path selection gives better performance than MPLS for cloud apps
  Tradeoff: internet SLA worse than MPLS; mitigated by SD-WAN redundancy

Why Cisco ISE vs FreeRADIUS?
  Profiling: ISE identifies device type (phone, printer, IoT) automatically
  Scale: ISE handles thousands of concurrent authentications
  Integration: native Cisco switch integration; no manual RADIUS config per switch
  Tradeoff: expensive (~$50K license); FreeRADIUS is free but requires manual config
```

---

## Summary

This capstone integrates every major concept from the tab:
- Physical design: redundant spine-leaf topology; dual-homed at every layer; OOB management.
- Addressing: hierarchical IPv4 plan (site-based supernets); dual-stack IPv6 from day one.
- Routing: OSPF internally; BGP externally; SD-WAN for branches with split tunneling.
- Security: defense-in-depth (NGFW + IPS + 802.1X + ZTNA + SIEM); segmented zones; Zero Trust.
- Wireless: Wi-Fi 6E; WPA3-Enterprise; 802.11r/k/v for roaming; separate SSIDs per security zone.
- QoS: DSCP marking at ingress; LLQ on WAN; application-based marking via NGFW App-ID.
- Automation: NetBox source of truth; Ansible configuration management; GitLab CI pipeline.
- Operations: Prometheus + Grafana + Alertmanager; PagerDuty on-call; change management via ITSM.
- DR: synchronous storage replication (RPO=0); warm AWS standby (RPO=15min); quarterly DR tests.
