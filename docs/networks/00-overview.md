---
title: "Networking  Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# Networking Overview

A comprehensive networking reference from first principles to production-grade SP and cloud networks. Covers CCNA → CCNP → enterprise architecture → automation → modern cloud and SDN.

---

## How to Use This

Each page is a self-contained deep-dive — terse intro, historical context, ASCII diagrams, configuration blocks, and a Tips + Summary close. Pages are cross-linked where concepts build on each other. Use the Quick Reference pages (77-78) for fast lookups during lab and production work.

---

## Part 1 — Foundations

| # | Title | Key Topics |
|---|---|---|
| [01](./01-history-of-networking.md) | History of Networking | ARPANET, TCP/IP, OSI, standardization timeline |
| [02](./02-network-fundamentals.md) | Network Fundamentals | Nodes, links, topology, bandwidth, latency, BDP |
| [03](./03-osi-model.md) | OSI Model | All 7 layers, PDUs, encapsulation, troubleshooting with OSI |
| [04](./04-tcpip-model.md) | TCP/IP Model | 4-layer model, comparison to OSI |
| [05](./05-data-encapsulation.md) | Encapsulation | Headers, trailers, how data moves through layers |
| [06](./06-physical-layer-media.md) | Physical Media | Copper, fiber, wireless, cables, connectors |
| [07](./07-number-systems.md) | Number Systems | Binary, hex, decimal conversion; subnetting math |
| [08](./08-network-devices-overview.md) | Network Devices | Hubs, switches, routers, firewalls, function of each |
| [09](./09-standards-bodies.md) | Standards Bodies | IEEE, IETF, ITU-T, IANA, how RFCs are made |

---

## Part 2 — Ethernet and Layer 2

| # | Title | Key Topics |
|---|---|---|
| [10](./10-ethernet-fundamentals.md) | Ethernet Fundamentals | CSMA/CD, frames, EtherTypes, evolution to GigE/10GE |
| [11](./11-mac-addressing.md) | MAC Addressing | Format, OUI, unicast/multicast/broadcast, learning |
| [12](./12-switching-fundamentals.md) | Switching | CAM table, forwarding logic, cut-through vs store-forward |
| [13](./13-vlans.md) | VLANs | 802.1Q tagging, access/trunk ports, native VLAN, design |
| [14](./14-stp.md) | Spanning Tree | STP, RSTP, PVST+, root election, port states, BPDUs |
| [15](./15-etherchannel.md) | EtherChannel | LACP, PAgP, load balancing, configuration |
| [16](./16-switch-security.md) | Switch Security | Port security, DHCP snooping, DAI, RA Guard |
| [17](./17-layer2-troubleshooting.md) | L2 Troubleshooting | show commands, MAC table, STP issues |
| [18](./18-vxlan-and-modern-l2.md) | VXLAN and Modern L2 | VXLAN encapsulation, VNI, overlay networks |
| [19](./19-wireless-layer2.md) | Wireless Layer 2 | 802.11 MAC, association, CSMA/CA, EDCA |

---

## Part 3 — IP Addressing

| # | Title | Key Topics |
|---|---|---|
| [20](./20-ipv4-fundamentals.md) | IPv4 Fundamentals | Header, address classes, public vs private, TTL |
| [21](./21-ipv4-subnetting.md) | Subnetting | CIDR, prefix lengths, subnet math, VLSM |
| [22](./22-ipv4-subnetting-practice.md) | Subnetting Practice | 20 worked problems from /24 to /19 |
| [23](./23-ipv6-fundamentals.md) | IPv6 Fundamentals | Why IPv6, header, address types, notation |
| [24](./24-ipv6-addressing-deep.md) | IPv6 Addressing Deep | GUA, ULA, link-local, EUI-64, SLAAC, special ranges |
| [25](./25-ipv6-transition.md) | IPv6 Transition | Dual stack, 6to4, Teredo, NAT64, 464XLAT |
| [26](./26-dhcp.md) | DHCP | DORA, options, relay, failover, DHCPv6 |
| [27](./27-arp-and-ndp.md) | ARP and NDP | ARP request/reply, gratuitous ARP, NDP, SLAAC |
| [28](./28-nat-pat.md) | NAT and PAT | Static NAT, dynamic NAT, PAT/overload, troubleshooting |
| [29](./29-dns.md) | DNS | Resolution hierarchy, record types, DNSSEC, DoT, DoH |

---

## Part 4 — Routing

| # | Title | Key Topics |
|---|---|---|
| [30](./30-routing-fundamentals.md) | Routing Fundamentals | Routing table, AD, metrics, convergence |
| [31](./31-static-routing.md) | Static Routing | Default routes, floating statics, IP SLA tracking |
| [32](./32-routing-protocols-overview.md) | Routing Protocols Overview | DV vs LS vs PV, IGP vs EGP comparisons |
| [33](./33-rip.md) | RIP | RIPv1/v2, hop count, split horizon, poison reverse |
| [34](./34-ospf-fundamentals.md) | OSPF Fundamentals | LSAs, SPF, areas, hello/dead, DR/BDR, cost |
| [35](./35-ospf-advanced.md) | OSPF Advanced | Area types, LSA types, virtual links, NSSA, authentication |
| [36](./36-eigrp.md) | EIGRP | DUAL, topology table, K-values, unequal-cost LB |
| [37](./37-bgp-fundamentals.md) | BGP Fundamentals | eBGP/iBGP, attributes, path selection, communities |
| [38](./38-bgp-advanced.md) | BGP Advanced | Route Reflectors, confederations, RPKI, BGP security |
| [39](./39-route-redistribution.md) | Redistribution & Filtering | Redistribute between protocols, prefix-lists, route-maps |

---

## Part 5 — Transport and Application

| # | Title | Key Topics |
|---|---|---|
| [40](./40-tcp-fundamentals.md) | TCP Fundamentals | Header, 3-way handshake, flow control, states, Nagle |
| [41](./41-tcp-advanced.md) | TCP Advanced | Tahoe, Reno, CUBIC, BBR, BDP, Window Scale, SACK |
| [42](./42-udp.md) | UDP and QUIC | UDP header, UDP use cases, QUIC, 0-RTT, multiplexing |
| [43](./43-http.md) | HTTP | HTTP/1.1, HTTP/2, HTTP/3, caching, REST, headers |
| [44](./44-tls-ssl.md) | TLS/SSL | X.509 certs, TLS 1.3 handshake, ECDHE, OCSP stapling |
| [45](./45-email-protocols.md) | Email Protocols | SMTP, IMAP, POP3, SPF, DKIM, DMARC |
| [46](./46-ftp-and-file-protocols.md) | FTP and File Protocols | Active/passive FTP, FTPS, SFTP, TFTP, rsync |
| [47](./47-application-layer-reference.md) | App Layer Reference | Port table, SSH, NTP, SNMP, Syslog, LDAP deep dive |

---

## Part 6 — WAN and Service Provider

| # | Title | Key Topics |
|---|---|---|
| [48](./48-wan-technologies.md) | WAN Technologies | Leased lines, Frame Relay, DSL, MPLS, SD-WAN, SASE |
| [49](./49-mpls-deep.md) | MPLS Deep Dive | Label stack, LDP, PHP, RSVP-TE, Segment Routing, EVPN |
| [50](./50-vpn-technologies.md) | VPN Technologies | IPsec/IKEv2, GRE, DMVPN, OpenVPN, WireGuard |
| [51](./51-qos.md) | Quality of Service | DiffServ, DSCP, LLQ, WRED, policing, shaping, trust boundary |
| [52](./52-multicast.md) | IP Multicast | IGMP, PIM-SM, RP, SSM, RPF, IGMP snooping |

---

## Part 7 — Network Security

| # | Title | Key Topics |
|---|---|---|
| [53](./53-network-security-fundamentals.md) | Security Fundamentals | CIA triad, defense-in-depth, ACLs, Zero Trust, BCP38 |
| [54](./54-firewalls-and-ids.md) | Firewalls, IDS and IPS | Stateful firewalls, iptables, Snort, WAF, DMZ design |
| [55](./55-network-attacks.md) | Network Attacks | Recon, ARP spoofing, VLAN hopping, SYN flood, amplification |
| [56](./56-aaa-and-access-control.md) | AAA and 802.1X | RADIUS, TACACS+, 802.1X, EAP methods, MAB, NAC |
| [57](./57-cryptography-for-networks.md) | Cryptography | AES-GCM, RSA, ECC, hashes, HMAC, PKI, post-quantum |
| [58](./58-network-hardening.md) | Device Hardening | CoPP, SSH hardening, SNMP v3, routing auth, Linux hardening |

---

## Part 8 — Wireless Networking

| # | Title | Key Topics |
|---|---|---|
| [59](./59-wireless-fundamentals.md) | Wireless Fundamentals | RF, MIMO, OFDMA, 802.11ax/be, channel planning, site survey |
| [60](./60-wireless-security.md) | Wireless Security | WEP, WPA2, WPA3-SAE, PMF, evil twin, PSK cracking |
| [61](./61-wireless-architecture.md) | Wireless Architecture | Controllers, CAPWAP, FlexConnect, roaming (802.11r/k/v), mesh |
| [62](./62-wireless-troubleshooting.md) | Wireless Troubleshooting | RSSI/SNR targets, interference, 802.1X failures, sticky client |

---

## Part 9 — Network Automation and SDN

| # | Title | Key Topics |
|---|---|---|
| [63](./63-network-automation-fundamentals.md) | Automation Fundamentals | NETCONF, RESTCONF, gNMI, Python, Netmiko, NAPALM, Jinja2 |
| [64](./64-ansible-for-networks.md) | Ansible | Inventory, playbooks, Cisco IOS modules, vault, roles |
| [65](./65-sdn-and-controllers.md) | SDN and Controllers | OpenFlow, Cisco ACI, DNA Center, P4, SONiC, EVPN/VXLAN |
| [66](./66-terraform-and-infrastructure-as-code.md) | Terraform and IaC | HCL, providers, modules, state, CI/CD pipeline |
| [67](./67-cloud-networking.md) | Cloud Networking | AWS VPC, Azure VNet, GCP, Transit Gateway, Direct Connect |
| [68](./68-network-telemetry.md) | Network Telemetry | gNMI, Prometheus, InfluxDB, Grafana, alerting, NetFlow |

---

## Part 10 — Operations and Troubleshooting

| # | Title | Key Topics |
|---|---|---|
| [69](./69-containers-and-networking.md) | Container Networking | Docker, Kubernetes CNI, Services, Ingress, NetworkPolicy, Cilium |
| [70](./70-troubleshooting-methodology.md) | Troubleshooting | OSI-layer approach, show commands, tcpdump, Wireshark |
| [71](./71-high-availability-and-redundancy.md) | HA and Redundancy | HSRP, VRRP, GLBP, dual-ISP BGP, firewall HA, DC design |
| [72](./72-network-documentation-and-design.md) | Documentation and Design | NetBox, IPAM, diagrams, change management, naming conventions |

---

## Part 11 — Advanced Topics

| # | Title | Key Topics |
|---|---|---|
| [73](./73-capacity-planning.md) | Capacity Planning | 95th percentile, trending, hardware limits, refresh planning |
| [74](./74-service-provider-technologies.md) | Service Provider | IS-IS backbone, MPLS LDP, BGP RR, CGNAT, peering, IXP |
| [75](./75-optical-networking.md) | Optical Networking | SMF/MMF, SONET/SDH, DWDM, coherent optics, OTN, OTDR |

---

## Part 12 — Capstone and Reference

| # | Title | Key Topics |
|---|---|---|
| [76](./76-ipv6-deployment-guide.md) | IPv6 Deployment Guide | Addressing plan, SLAAC/DHCPv6, firewall policy, checklist |
| [77](./77-network-protocols-quick-reference.md) | Protocol Quick Reference | Ports, ADs, DSCP, BGP decision, OSPF LSAs, subnetting table |
| [78](./78-cisco-ios-command-reference.md) | IOS Command Reference | Show commands by problem, interface/routing/security/QoS config |
| [79](./79-capstone-network-design-scenario.md) | Capstone Design | Full enterprise design: HQ + 2 branches, dual-ISP, DMVPN, 802.1X |

---

## Quick Navigation by Role

**Network Operations:**
Start with [70 — Troubleshooting](./70-troubleshooting-methodology.md), [77 — Protocol Reference](./77-network-protocols-quick-reference.md), [78 — IOS Commands](./78-cisco-ios-command-reference.md)

**Network Engineer (Design):**
[03 OSI](./03-osi-model.md) → [20-29 IP](./20-ipv4-fundamentals.md) → [30-39 Routing](./30-routing-fundamentals.md) → [48-52 WAN](./48-wan-technologies.md) → [71 HA](./71-high-availability-and-redundancy.md) → [79 Capstone](./79-capstone-network-design-scenario.md)

**Security Engineer:**
[53-58 Security](./53-network-security-fundamentals.md) → [44 TLS](./44-tls-ssl.md) → [57 Crypto](./57-cryptography-for-networks.md) → [56 AAA](./56-aaa-and-access-control.md)

**Cloud/DevOps:**
[63-68 Automation](./63-network-automation-fundamentals.md) → [67 Cloud](./67-cloud-networking.md) → [69 Containers](./69-containers-and-networking.md) → [66 Terraform](./66-terraform-and-infrastructure-as-code.md)

