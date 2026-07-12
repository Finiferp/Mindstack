---
title: "Network Protocols Quick Reference"
sidebar_label: "Protocol Reference"
sidebar_position: 77
---

# Network Protocols Quick Reference

A comprehensive at-a-glance reference for protocols, ports, timers, defaults, and decision tables used throughout this tab.

---

## Routing Protocol Comparison

| Protocol | Type | Metric | AD | Transport | Hello | Dead | Multicast |
|---|---|---|---|---|---|---|---|
| RIPv2 | DV | Hop count | 120 | UDP 520 | 30s | 180s | 224.0.0.9 |
| RIPng | DV | Hop count | 120 | UDP 521 | 30s | 180s | FF02::9 |
| OSPF | LS | Cost (BW) | 110 | IP 89 | 10s LAN / 30s NBMA | 40s / 120s | 224.0.0.5/6 |
| OSPFv3 | LS | Cost | 110 | IP 89 | 10s | 40s | FF02::5/6 |
| EIGRP | ADV | Composite | 90 (int) / 170 (ext) | IP 88 | 5s (LAN) / 60s | 15s / 180s | 224.0.0.10 |
| IS-IS | LS | Wide metric | 115 | L2 directly | 10s (L1L2) | 30s | direct L2 |
| BGP (eBGP) | PV | AS_PATH | 20 | TCP 179 | Keepalive 60s | Hold 180s | unicast |
| BGP (iBGP) | PV | Policy | 200 | TCP 179 | 60s | 180s | unicast |

---

## Administrative Distance Reference

| Source | Default AD |
|---|---|
| Connected | 0 |
| Static | 1 |
| EIGRP Summary | 5 |
| eBGP | 20 |
| EIGRP internal | 90 |
| IGRP (legacy) | 100 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP external | 170 |
| iBGP | 200 |
| Unreachable | 255 |

---

## Port and Protocol Reference

### Core Protocols by Layer

| Protocol | Layer | Port / Number | Transport | Notes |
|---|---|---|---|---|
| ICMP | 3 | Protocol 1 | IP | Ping, traceroute, error reporting |
| ICMPv6 | 3 | Protocol 58 | IPv6 | NDP, ping, errors |
| OSPF | 3 | Protocol 89 | IP | Multicast 224.0.0.5/6 |
| EIGRP | 3 | Protocol 88 | IP | Multicast 224.0.0.10 |
| GRE | 3 | Protocol 47 | IP | Tunneling |
| ESP | 3 | Protocol 50 | IP | IPsec encryption |
| AH | 3 | Protocol 51 | IP | IPsec auth (no encryption) |
| VRRP | 3 | Protocol 112 | IP | Multicast 224.0.0.18 |
| BGP | 4 | TCP 179 | TCP | |
| NETCONF | 4 | TCP 830 | TCP | SSH-based |
| DNS | 4 | UDP/TCP 53 | UDP (queries), TCP (zone xfer, large) | |
| DHCP | 4 | UDP 67/68 | UDP | Server:67, Client:68 |
| DHCPv6 | 4 | UDP 546/547 | UDP | Client:546, Server:547 |
| NTP | 4 | UDP 123 | UDP | |
| SNMP | 4 | UDP 161/162 | UDP | 161=poll, 162=trap |
| RADIUS | 4 | UDP 1812/1813 | UDP | Auth:1812, Acct:1813 |
| TACACS+ | 4 | TCP 49 | TCP | |
| Syslog | 4 | UDP 514 / TCP 6514 | UDP (legacy), TCP+TLS | |
| TFTP | 4 | UDP 69 | UDP | |
| SSH | 4 | TCP 22 | TCP | |
| Telnet | 4 | TCP 23 | TCP | Insecure — never use |
| HTTP | 4 | TCP 80 | TCP | |
| HTTPS | 4 | TCP 443 / UDP 443 | TCP (HTTP/1.1, HTTP/2), UDP (HTTP/3) | |
| SMTP | 4 | TCP 25/587/465 | TCP | 25=relay, 587=submission, 465=implicit TLS |
| IMAP | 4 | TCP 143/993 | TCP | 143=plain, 993=TLS |
| POP3 | 4 | TCP 110/995 | TCP | 110=plain, 995=TLS |
| FTP | 4 | TCP 20/21 | TCP | 21=control, 20=active data |
| SFTP | 4 | TCP 22 | TCP | SSH subsystem |
| RDP | 4 | TCP 3389 | TCP | |
| IKEv2 | 4 | UDP 500/4500 | UDP | 500=normal, 4500=NAT-T |
| WireGuard | 4 | UDP 51820 | UDP | Default; configurable |
| OpenVPN | 4 | UDP 1194 | UDP | Default; TCP also supported |
| BGP | 4 | TCP 179 | TCP | |

---

## Ethernet Frame Sizes

| Frame | Size | Notes |
|---|---|---|
| Runt | < 64 bytes | Discarded; duplex mismatch indicator |
| Normal minimum | 64 bytes | Ethernet minimum (header + min data + FCS) |
| Standard maximum | 1518 bytes | 1500 payload + 14 header + 4 FCS |
| 802.1Q tagged | 1522 bytes | Add 4-byte VLAN tag |
| QinQ (802.1ad) | 1526 bytes | Add second 4-byte tag |
| Jumbo | 9000-9216 bytes | Non-standard; data center use; must configure end-to-end |
| Baby giant | 1600 bytes | Some WAN encap (PPPoE, MPLS, GRE) allow slightly larger |
| Giant | > 1518 bytes (standard) | Discarded unless jumbo frames enabled |

---

## IPv4 Special Address Ranges

| Range | Purpose | Routable on Internet? |
|---|---|---|
| 0.0.0.0/8 | This network | No |
| 10.0.0.0/8 | Private (RFC 1918) | No |
| 100.64.0.0/10 | Shared / CGNAT (RFC 6598) | No |
| 127.0.0.0/8 | Loopback | No |
| 169.254.0.0/16 | APIPA / Link-local | No |
| 172.16.0.0/12 | Private (RFC 1918) | No |
| 192.0.0.0/24 | IETF Protocol Assignments | No |
| 192.0.2.0/24 | TEST-NET-1 (documentation) | No |
| 192.88.99.0/24 | 6to4 relay (deprecated) | No |
| 192.168.0.0/16 | Private (RFC 1918) | No |
| 198.18.0.0/15 | Benchmarking (RFC 2544) | No |
| 198.51.100.0/24 | TEST-NET-2 (documentation) | No |
| 203.0.113.0/24 | TEST-NET-3 (documentation) | No |
| 224.0.0.0/4 | Multicast (Class D) | Partially |
| 240.0.0.0/4 | Reserved / Experimental | No |
| 255.255.255.255/32 | Limited broadcast | No |

---

## IPv6 Special Address Ranges

| Prefix | Purpose |
|---|---|
| ::/128 | Unspecified (like 0.0.0.0) |
| ::1/128 | Loopback |
| ::ffff:0:0/96 | IPv4-mapped IPv6 |
| 64:ff9b::/96 | NAT64 well-known prefix |
| 2001::/32 | Teredo (legacy) |
| 2001:db8::/32 | Documentation (never route!) |
| 2002::/16 | 6to4 (deprecated) |
| fc00::/7 | Unique Local (ULA) |
| fd00::/8 | ULA (L bit set — use this) |
| fe80::/10 | Link-local |
| ff00::/8 | Multicast |
| ff02::1 | All nodes (link-local) |
| ff02::2 | All routers (link-local) |
| ff02::5 | OSPFv3 all routers |
| ff02::6 | OSPFv3 DR/BDR |
| ff02::9 | RIPng |
| ff02::a | EIGRP |
| ff02::1:2 | DHCPv6 relay agents |
| ff05::1:3 | DHCPv6 servers |

---

## Subnetting Reference (IPv4)

| Prefix | Mask | Hosts | Block Size | Common Use |
|---|---|---|---|---|
| /8 | 255.0.0.0 | 16,777,214 | 16M | Large RFC 1918 (10.0.0.0/8) |
| /16 | 255.255.0.0 | 65,534 | 64K | Site aggregate |
| /20 | 255.255.240.0 | 4,094 | 16 (3rd octet) | Large campus VLAN |
| /22 | 255.255.252.0 | 1,022 | 4 (3rd octet) | Large VLAN |
| /23 | 255.255.254.0 | 510 | 2 (3rd octet) | Medium VLAN |
| /24 | 255.255.255.0 | 254 | 256 (4th octet) | Standard LAN |
| /25 | 255.255.255.128 | 126 | 128 | Half a /24 |
| /26 | 255.255.255.192 | 62 | 64 | Small VLAN |
| /27 | 255.255.255.224 | 30 | 32 | Small segment |
| /28 | 255.255.255.240 | 14 | 16 | Very small |
| /29 | 255.255.255.248 | 6 | 8 | Tiny |
| /30 | 255.255.255.252 | 2 | 4 | P2P link |
| /31 | 255.255.255.254 | 2* | 2 | P2P link (RFC 3021) |
| /32 | 255.255.255.255 | 1 | 1 | Host route / loopback |

---

## OSPF LSA Types

| Type | Name | Generated By | Scope | Content |
|---|---|---|---|---|
| 1 | Router | Every router | Area | Links and costs |
| 2 | Network | DR | Area | Routers on segment |
| 3 | Summary | ABR | Domain | Inter-area prefix |
| 4 | ASBR Summary | ABR | Domain | ASBR location |
| 5 | AS External | ASBR | Domain | External routes |
| 7 | NSSA External | ASBR (NSSA) | NSSA | External in NSSA |

---

## BGP Path Selection (Decision Process)

| Step | Attribute | Prefer |
|---|---|---|
| 1 | WEIGHT | Highest (Cisco only; local) |
| 2 | LOCAL_PREFERENCE | Highest |
| 3 | Origination | Locally originated |
| 4 | AS_PATH | Shortest |
| 5 | ORIGIN | IGP < EGP < Incomplete |
| 6 | MED | Lowest (same AS comparisons) |
| 7 | Peer type | eBGP over iBGP |
| 8 | IGP metric to next-hop | Lowest |
| 9 | eBGP route age | Oldest |
| 10 | BGP Router ID | Lowest |
| 11 | Neighbor IP | Lowest |

---

## QoS DSCP Reference

| DSCP Name | DSCP Value | Decimal | Traffic Type |
|---|---|---|---|
| CS0 / Default | 000000 | 0 | Best effort |
| CS1 | 001000 | 8 | Scavenger / bulk |
| AF11 | 001010 | 10 | Low-priority data |
| AF21 | 010010 | 18 | Medium-priority data |
| AF31 | 011010 | 26 | Critical data |
| AF41 | 100010 | 34 | Video conferencing |
| CS4 | 100000 | 32 | Streaming video |
| CS5 | 101000 | 40 | Signaling |
| EF | 101110 | 46 | Voice (RTP) |
| CS6 | 110000 | 48 | Network control |
| CS7 | 111000 | 56 | Reserved |

---

## WPA Security Comparison

| Version | Encryption | Auth | Key Exchange | Vulnerability |
|---|---|---|---|---|
| WEP | RC4 (IV 24-bit) | PSK | Static | Broken — crack in minutes |
| WPA-TKIP | RC4 (TKIP) | PSK / 802.1X | 4-way HS | Partially broken |
| WPA2-CCMP | AES-128-CCMP | PSK / 802.1X | 4-way HS | Offline dict attack (PSK); KRACK |
| WPA3-SAE | AES-128-CCMP | SAE / 802.1X | SAE (DH-based) | Dragonblood (patched) |
| WPA3-Enterprise 192-bit | AES-256-GCMP | 802.1X EAP-TLS | SAE | Strongest; no known practical attacks |

---

## Spanning Tree Port States

| Protocol | States | Fast Path |
|---|---|---|
| 802.1D (STP) | Blocking → Listening → Learning → Forwarding → Disabled | 30–50s convergence |
| 802.1w (RSTP) | Discarding → Learning → Forwarding | 1–6s convergence |
| 802.1s (MSTP) | Same as RSTP | Multiple instances per VLAN group |
| PVST+ (Cisco) | Same as 802.1D per VLAN | Per-VLAN STP |
| Rapid PVST+ | Same as RSTP per VLAN | Per-VLAN RSTP |

---

## HSRP / VRRP / GLBP Comparison

| Feature | HSRP | VRRP | GLBP |
|---|---|---|---|
| Standard | Cisco proprietary | RFC 5798 | Cisco proprietary |
| Virtual MAC | 0000.0c07.ac[grp] | 0000.5e00.01[grp] | 0007.b4XX.XX[VF] |
| Default priority | 100 | 100 | 100 |
| Election | Highest priority (tie: highest IP) | Highest priority / IP owner | Highest priority |
| Multicast | 224.0.0.2 (v1) / 224.0.0.102 (v2) | 224.0.0.18 | 224.0.0.102 |
| Load balancing | No | No | Yes (active-active) |
| IPv6 | v2 | v3 | Yes |

---

## TLS Version Support Status

| Version | Status | Notes |
|---|---|---|
| SSL 2.0 | Broken — never use | All major browsers dropped 2011+ |
| SSL 3.0 | Broken — never use | POODLE attack 2014; RFC 7568 |
| TLS 1.0 | Deprecated | BEAST, POODLE (v2); RFC 8996 |
| TLS 1.1 | Deprecated | RFC 8996; browsers dropped 2020 |
| TLS 1.2 | Acceptable | Still widely deployed; many weak cipher suites |
| TLS 1.3 | **Recommended** | RFC 8446; 1-RTT; only strong ciphers |

---

## Common IOS Show Commands by Problem Type

| Problem | Primary Commands |
|---|---|
| Interface down | `show interfaces`, `show ip interface brief` |
| No IP connectivity | `show ip route`, `ping`, `traceroute` |
| Wrong route | `show ip route <dest>`, `debug ip routing` |
| OSPF not forming | `show ip ospf neighbor`, `debug ip ospf adj` |
| BGP not forming | `show bgp summary`, `debug ip bgp` |
| Spanning tree issue | `show spanning-tree`, `show mac address-table` |
| VLAN problem | `show vlan brief`, `show interfaces trunk` |
| QoS drops | `show policy-map interface <int>` |
| High CPU | `show processes cpu sorted` |
| Memory issue | `show processes memory sorted` |
| Authentication fail | `debug aaa authentication`, `debug tacacs` |
| ACL blocking | `show access-lists`, `debug ip packet` |
| NAT issue | `show ip nat translations`, `debug ip nat` |
| DHCP issue | `show ip dhcp binding`, `debug ip dhcp server` |
| SNMP issue | `show snmp`, `debug snmp packet` |
| NTP problem | `show ntp status`, `show ntp associations` |
| CDP neighbors | `show cdp neighbors detail` |
| HSRP state | `show standby`, `show standby brief` |
| Crypto/VPN | `show crypto ikev2 sa`, `show crypto ipsec sa` |

---

## Useful RFC Index

| RFC | Title |
|---|---|
| RFC 791 | Internet Protocol (IPv4) |
| RFC 793 | Transmission Control Protocol (TCP) |
| RFC 768 | User Datagram Protocol (UDP) |
| RFC 826 | Ethernet Address Resolution Protocol (ARP) |
| RFC 894 | IP over Ethernet |
| RFC 1035 | Domain Names — Implementation |
| RFC 1058 | Routing Information Protocol (RIPv1) |
| RFC 1122 | Requirements for Internet Hosts |
| RFC 1812 | Requirements for IP Version 4 Routers |
| RFC 2131 | Dynamic Host Configuration Protocol (DHCP) |
| RFC 2328 | OSPF Version 2 |
| RFC 2453 | RIP Version 2 |
| RFC 2460 | IPv6 Specification |
| RFC 2474 | Differentiated Services (DSCP) |
| RFC 2865 | RADIUS |
| RFC 3168 | Explicit Congestion Notification (ECN) |
| RFC 3246 | Expedited Forwarding (EF) |
| RFC 3376 | IGMPv3 |
| RFC 4271 | BGP-4 |
| RFC 4291 | IPv6 Addressing Architecture |
| RFC 4301 | Security Architecture for IP (IPsec) |
| RFC 4862 | IPv6 Stateless Address Autoconfiguration (SLAAC) |
| RFC 5321 | SMTP |
| RFC 5340 | OSPFv3 |
| RFC 5681 | TCP Congestion Control |
| RFC 5798 | VRRP |
| RFC 6241 | NETCONF |
| RFC 6332 | 802.1ad (QinQ) |
| RFC 6598 | Shared Address Space (CGNAT) |
| RFC 7296 | IKEv2 |
| RFC 7348 | VXLAN |
| RFC 7432 | BGP MPLS-Based Ethernet VPN (EVPN) |
| RFC 7540 | HTTP/2 |
| RFC 7868 | EIGRP |
| RFC 8040 | RESTCONF |
| RFC 8174 | Ambiguity of Uppercase vs Lowercase in RFC 2119 |
| RFC 8200 | IPv6 (replaces RFC 2460) |
| RFC 8312 | CUBIC TCP |
| RFC 8384 | Transparent Interconnection of Lots of Links (TRILL) |
| RFC 8402 | Segment Routing Architecture |
| RFC 8446 | TLS 1.3 |
| RFC 9000 | QUIC |
| RFC 9114 | HTTP/3 |

---

## Summary

This page is a quick-reference companion to the detailed pages throughout the tab. For depth on any topic, follow the links to the dedicated pages. Key tables to memorize:
- Administrative Distance: Connected=0, Static=1, EIGRP=90, OSPF=110, IS-IS=115, RIP=120, iBGP=200.
- DSCP: EF=46 (voice), AF41=34 (video), AF31=26 (critical data), CS6=48 (network control), CS0=0 (default).
- BGP path selection: Weight → Local Pref → Local Origin → AS_PATH → Origin → MED → eBGP>iBGP → IGP metric → RID.
- WPA: never WEP/WPA-TKIP; use WPA2-CCMP with strong passphrase or WPA3-SAE.
