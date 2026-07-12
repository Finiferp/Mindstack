---
title: "IPv6 Enterprise Deployment Guide"
sidebar_label: "IPv6 Deployment"
sidebar_position: 76
---

# IPv6 Enterprise Deployment Guide

This page consolidates IPv6 deployment guidance into a practical checklist — from ISP prefix acquisition through SLAAC/DHCPv6 configuration, firewall policy, and monitoring. Building on the fundamentals in files 23-25.

---

## Why Deploy IPv6 Now

```
Business drivers (2024 context):
  IPv4 exhaustion: buying IPv4 addresses costs $40-60 per address (2024)
  Mobile carrier networks: T-Mobile USA, SK Telecom, Reliance Jio — IPv6-only mobile
  Cloud: all major cloud providers (AWS, Azure, GCP) prefer IPv6 natively
  Performance: Happy Eyeballs RFC 8305 — if IPv6 is available, browsers prefer it
  Future: no new protocols designed for IPv4-only operation

Risks of delay:
  IPv4 acquisition costs increase each year
  Retrofitting IPv6 into a deployed network is harder than greenfield
  Increasing percentage of internet content only reachable via IPv6

Common objections and answers:
  "Our apps don't support IPv6" → dual-stack; IPv4 stays; IPv6 adds coverage
  "It's too complex" → SLAAC is simpler than DHCP; modern OS handles it automatically
  "We don't need it" → Try loading an IPv6-only endpoint from your network
```

---

## Obtaining IPv6 Addresses

```
From ISP:
  Request an IPv6 prefix when signing up or ask to add IPv6 to existing service
  Typical allocation: /48 per site (65,536 × /64 subnets available)
  MPLS VPN: ISP may provide a /48 per customer or per site
  Ask for static (not dynamic) assignment — dynamic changes can disrupt DNS

From Regional Internet Registry (RIR):
  Enterprise needing portable (ISP-independent) IPv6 space:
    ARIN (Americas): minimum allocation /48; typical enterprise gets /48 or /40
    RIPE NCC (Europe): minimum /48 for end users
    APNIC (Asia-Pacific): similar
  Requirements: justify need; pay annual membership fees
  Provider-Independent (PI) space: yours forever regardless of ISP changes; requires BGP

From LIR (Local Internet Registry):
  Sponsor membership model: your ISP (as LIR) allocates space from their RIR block to you
  Provider-Aggregatable (PA): cheaper; if you change ISP, addresses change
  Most enterprises use PA space from their ISP; PI only if multi-homed BGP

Typical enterprise design:
  Single site, single ISP: /48 from ISP (PA space)
  Multi-site: one /40 or /44 from ISP, then sub-allocate /48 per site
  Multi-homed BGP: PI /48 from ARIN/RIPE; advertise from both ISPs
```

---

## Address Planning

```
Subnet Scheme (each site gets /48):
  Site prefix: 2001:db8:SITE::/48 (replace SITE with 4 hex digits)
  
  /64 subnets within each /48 (use 4th group for VLAN/purpose):
    2001:db8:0001:0010::/64  → VLAN 10 (Corp WiFi)
    2001:db8:0001:0020::/64  → VLAN 20 (Staff LAN)
    2001:db8:0001:0030::/64  → VLAN 30 (VoIP)
    2001:db8:0001:0100::/64  → VLAN 100 (Servers)
    2001:db8:0001:fffe::/64  → Management
    2001:db8:0001:ffff::/64  → Loopbacks (use ::1, ::2, etc. for routers)
  
  P2P router links:
    /127 per link (RFC 6164): 2001:db8:0001:ff00::/127
      ::0 = one side, ::1 = other side
    Reserve 2001:db8:0001:ff00::/64 for all P2P links; use /127 slices
  
  Loopback addresses:
    2001:db8:0001:ffff::1/128 = Router 1 Loopback
    2001:db8:0001:ffff::2/128 = Router 2 Loopback
    Simple, memorable, consistently documented in NetBox

Site naming in the 3rd group (16 bits = 0000-ffff):
  Use last 4 digits of site code or sequential:
    0001 = Headquarters
    0002 = Branch A
    0003 = Branch B
    0100 = DC East
    0101 = DC West
```

---

## Router Configuration

```cisco
! ── Enable IPv6 globally ──────────────────────────────────────────────────────
ipv6 unicast-routing               ! required to forward IPv6 packets
ipv6 cef                           ! CEF for IPv6 (performance)

! ── Interface configuration ───────────────────────────────────────────────────
interface GigabitEthernet0/0
 ipv6 address 2001:db8:1::1/64    ! GUA (Global Unicast Address) from planning
 ipv6 address fe80::1 link-local  ! explicit link-local (optional; auto-generated if omitted)
 ipv6 enable                       ! enables IPv6 (and generates link-local) even without GUA
 no ipv6 nd suppress-ra            ! enable RA on this interface (for SLAAC to hosts)
 ipv6 nd prefix 2001:db8:1::/64 300 120   ! RA prefix with valid/preferred lifetimes

! ── SLAAC RA configuration (for host autoconfiguration) ─────────────────────
interface GigabitEthernet0/0
 ipv6 nd managed-config-flag      ! M flag = use DHCPv6 for addresses
 ipv6 nd other-config-flag        ! O flag = use DHCPv6 for other info (DNS)
 ! Both clear (default) = SLAAC only
 ! Both set = stateful DHCPv6
 ! Only O set = SLAAC address + DHCPv6 for DNS

 ipv6 nd ra-interval 30           ! RA interval in seconds (30 = faster convergence)
 ipv6 nd ra-lifetime 180          ! how long this router is the default gateway
 ipv6 nd dns-server 2001:db8::53  ! RDNSS (DNS via RA, RFC 8106)
 ipv6 nd domain-search example.com ! DNSSL via RA

! ── Routing (OSPF for IPv6) ──────────────────────────────────────────────────
ipv6 router ospf 1
 router-id 1.1.1.1               ! still dotted-decimal even for v6 OSPF
 area 0 range 2001:db8::/48      ! summarize at ABR

interface GigabitEthernet0/0
 ipv6 ospf 1 area 0
 ipv6 ospf cost 10

! ── Static route ─────────────────────────────────────────────────────────────
ipv6 route ::/0 GigabitEthernet0/0 fe80::2   ! default route via link-local next-hop

! ── IPv6 ACL ─────────────────────────────────────────────────────────────────
ipv6 access-list BLOCK-INBOUND
 deny ipv6 ::/128 any            ! block unspecified source
 deny ipv6 ::1/128 any           ! block loopback source
 deny ipv6 fc00::/7 any          ! block ULA from untrusted
 deny ipv6 fe80::/10 any         ! block link-local from untrusted
 permit tcp any any established  ! allow established sessions
 permit icmp6 any any echo-reply ! allow ping replies
 permit icmp6 any any destination-unreachable  ! allow unreachable messages
 permit icmp6 any any packet-too-big           ! PMTUD — critical, never block!
 permit icmp6 any any time-exceeded
 deny ipv6 any any log

interface GigabitEthernet0/0
 ipv6 traffic-filter BLOCK-INBOUND in

! ── Verification ─────────────────────────────────────────────────────────────
show ipv6 interface brief
show ipv6 route
show ipv6 neighbors                ! NDP table (equivalent of ARP table)
show ipv6 ospf neighbor
ping ipv6 2001:db8::1 source GigabitEthernet0/0
traceroute ipv6 2001:db8::1
```

---

## DHCPv6

```cisco
! ── DHCPv6 Stateful (with address assignment) ────────────────────────────────
ipv6 dhcp pool VLAN10-POOL
 address prefix 2001:db8:1:10::/64 lifetime 3600 2400
 dns-server 2001:db8::53
 domain-name example.com

interface GigabitEthernet0/0.10
 ipv6 dhcp server VLAN10-POOL

! ── DHCPv6 Stateless (DNS only, SLAAC for addresses) ────────────────────────
ipv6 dhcp pool DNS-ONLY
 dns-server 2001:db8::53
 domain-name example.com

interface GigabitEthernet0/0.10
 ipv6 dhcp server DNS-ONLY
 ipv6 nd other-config-flag        ! O flag set; M flag not set

! ── DHCPv6 Relay (when DHCP server not on same segment) ─────────────────────
interface GigabitEthernet0/0.10
 ipv6 dhcp relay destination 2001:db8:ff::1  ! DHCPv6 server address

! ── Verification ─────────────────────────────────────────────────────────────
show ipv6 dhcp pool
show ipv6 dhcp binding
show ipv6 dhcp interface GigabitEthernet0/0
```

---

## Firewall Policy for IPv6

```
Critical: IPv6 firewall policies must be as strict as IPv4
Many deployments accidentally leave IPv6 wide open while IPv4 is locked down

Permit ALWAYS (never block these — they break IPv6 operation):
  ICMPv6 Type 1  — Destination Unreachable
  ICMPv6 Type 2  — Packet Too Big (PMTUD — break this and large transfers fail silently)
  ICMPv6 Type 3  — Time Exceeded (traceroute)
  ICMPv6 Type 128/129 — Echo Request/Reply (ping)
  ICMPv6 Type 133-137 — NDP (RS, RA, NS, NA, Redirect) — allow link-local only
  ICMPv6 Type 143 — MLDv2 reports (multicast group management)

Permit selectively (based on your policy):
  Inbound established connections (TCP established)
  Specific services (port 80, 443, 25, etc.) to specific servers

Block always (ingress filtering):
  ::/128 as source — unspecified
  ::1/128 as source — loopback
  fc00::/7 as source — ULA from external (not routable)
  fe80::/10 as source — link-local from external (never legitimate)
  2002::/16 as source — 6to4 relay (deprecated; often abused)
  ::/96, ::ffff:0:0/96 — IPv4-compatible addresses

RA Guard (Layer 2 protection):
  Rogue Router Advertisements are a major IPv6 threat
  Enable RA Guard on switch access ports:
    switch# ipv6 nd rogue-ra-protection

DHCPv6 Guard:
  Prevent rogue DHCPv6 servers:
    ipv6 dhcp guard policy DHCP-GUARD-POLICY
    device-role client         ! access ports are clients
    interface GigabitEthernet1/0/1
     ipv6 dhcp guard attach-policy DHCP-GUARD-POLICY

IPv6 Source Guard:
  Like DHCP snooping for IPv6 — only allow packets from bound source addresses:
    ipv6 source-guard attach-policy default
```

---

## DNS for IPv6

```
AAAA records:
  Add AAAA records for all public-facing services
  www.example.com A 203.0.113.10
  www.example.com AAAA 2001:db8::10

  Priority: clients with IPv6 will try AAAA first (Happy Eyeballs)
  Result: IPv6-enabled users get IPv6 path; others fall back to IPv4

Reverse DNS (PTR) for IPv6:
  Nibble format: reverse each hex nibble, separated by dots, append .ip6.arpa
  Address: 2001:db8:1::10
  Full: 2001:0db8:0001:0000:0000:0000:0000:0010
  Reversed: 0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

Internal DNS (split-horizon):
  Internal resolver returns both A and AAAA for internal resources
  Ensure internal DNS returns correct IPv6 addresses for internal servers
  RFC 6762 mDNS: works for IPv6 too; no config needed on modern OS

Test DNS resolution:
  dig AAAA example.com
  dig -t AAAA @2001:db8::53 example.com
  nslookup -type=AAAA example.com
```

---

## Deployment Checklist

```
Phase 1: Infrastructure (1-2 months)
  [ ] Obtain /48 prefix per site from ISP or RIR
  [ ] Document complete IPv6 address plan in NetBox
  [ ] Enable IPv6 on WAN/uplink interfaces
  [ ] Configure OSPFv3 or MP-BGP for IPv6 routing on backbone
  [ ] Enable IPv6 on firewall; mirror IPv4 policies to IPv6
  [ ] Configure NTP, syslog, DNS with IPv6 addresses
  [ ] Add AAAA records for management interfaces in internal DNS
  [ ] Enable IPv6 monitoring in Grafana (add v6 metrics)

Phase 2: Server subnets (2-3 months)
  [ ] Enable IPv6 on all server VLANs
  [ ] Configure RA on each server subnet (or DHCPv6 if static IPs needed)
  [ ] Add AAAA records for all internal servers in DNS
  [ ] Test server-to-server communication over IPv6
  [ ] Verify firewall policy for server-to-server IPv6 traffic
  [ ] Update load balancer VIPs with IPv6 addresses

Phase 3: User subnets (3-4 months)
  [ ] Enable IPv6 on user VLANs (corporate, WiFi)
  [ ] Enable SLAAC (M=0, O=0) or DHCPv6 based on policy
  [ ] Configure RDNSS in RA or O-flag + DHCPv6 stateless for DNS
  [ ] Test user workstations get IPv6 addresses and DNS
  [ ] Test internet access via IPv6 (curl -6 https://ipv6.google.com)
  [ ] Verify Happy Eyeballs works (users prefer IPv6 where available)

Phase 4: Public services (4-6 months)
  [ ] Add AAAA records for all public-facing services
  [ ] Verify CDN (Cloudflare, Akamai) has IPv6 enabled for your zones
  [ ] Test from external IPv6-only probe (RIPE Atlas, ping.eu)
  [ ] Monitor IPv6 traffic percentage (target >50% of web traffic for public sites)
  [ ] Email: ensure MX records resolve IPv6; SMTP accepts IPv6 connections
  [ ] Update SPF record to include IPv6 sending addresses

Verification commands:
  # From a host on the network
  ip -6 addr show                           # Linux: show IPv6 addresses
  ipconfig /all | findstr "IPv6"            # Windows
  curl -6 -v https://ipv6.google.com       # test IPv6 internet
  ping6 2001:4860:4860::8888               # ping Google's IPv6 DNS
  traceroute6 2001:4860:4860::8888         # trace IPv6 path
  dig AAAA google.com                       # DNS AAAA lookup
```

---

## Tips

- Block ICMPv6 selectively, never completely — blocking "Packet Too Big" (Type 2) breaks PMTUD and causes mysterious failures for transfers above 1280 bytes (the IPv6 minimum MTU).
- Deploy RA Guard on ALL access switch ports — rogue Router Advertisements are a trivial attack that can redirect all IPv6 traffic on a segment through an attacker's machine.
- Add AAAA records for your public services before enabling IPv6 on them — DNS changes propagate before you're ready causes users to try IPv6 prematurely.
- SLAAC generates privacy addresses (RFC 7217 stable or RFC 4941 temporary) by default on modern OSes — for servers that need stable, predictable addresses, use DHCPv6 stateful.
- Monitor IPv6 traffic percentage separately from IPv4 — as IPv6 adoption grows, issues on the IPv6 path affect increasing numbers of users.

---

## Summary

- Obtain a /48 per site from your ISP or RIR — 65,536 /64 subnets are more than enough for any enterprise.
- Address planning: 3rd group = site ID, 4th group = VLAN number; loopbacks as /128 in a dedicated /64.
- SLAAC (M=0, O=0) with RDNSS in RA is the simplest host configuration — no DHCPv6 server needed; modern OSes handle it automatically.
- Firewall policy: always permit Packet Too Big (Type 2) and NDP messages; block link-local and ULA from external; mirror IPv4 policies to IPv6.
- RA Guard and DHCPv6 Guard on access ports prevent rogue RA/DHCPv6 attacks — Layer 2 security for IPv6 is as important as IPv4 DHCP snooping and DAI.
- Deploy in phases: infrastructure → servers → users → public services — each phase lets you validate before exposing more traffic to IPv6 paths.
