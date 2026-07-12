---
title: "Network Security Fundamentals"
sidebar_label: "Security Fundamentals"
sidebar_position: 53
---

# Network Security Fundamentals

Network security is a discipline unto itself, but every network engineer must understand the foundational concepts — threat models, defense-in-depth, CIA triad, and the evolution from perimeter-centric to Zero Trust security.

---

## The CIA Triad

Every security control protects one or more of these three properties:

```
Confidentiality — data is only accessible to authorized parties
  Threats: eavesdropping, man-in-the-middle, credential theft
  Controls: encryption (TLS, IPsec), access control, authentication

Integrity — data is accurate and unmodified by unauthorized parties
  Threats: tampering, replay attacks, routing manipulation (BGP hijack)
  Controls: digital signatures (HMAC, ECDSA), message authentication codes,
            version control, checksums, RPKI for BGP

Availability — systems are accessible when needed
  Threats: DDoS, ransomware, hardware failure, misconfiguration
  Controls: redundancy, rate limiting, DDoS mitigation, backups,
            graceful degradation, capacity planning
```

---

## Defense in Depth

No single control is sufficient. Security requires multiple overlapping layers:

```
Layer 1 — Perimeter security
  Internet-facing firewalls, DDoS protection, BGP security (RPKI), ISP filtering

Layer 2 — Network segmentation
  VLANs, subnets, DMZ, ACLs between segments

Layer 3 — Host hardening
  Endpoint security, host-based firewalls, patch management

Layer 4 — Application security
  WAF (Web Application Firewall), input validation, authentication

Layer 5 — Identity and access management
  MFA, privileged access management (PAM), least privilege

Layer 6 — Monitoring and response
  SIEM, IDS/IPS, threat hunting, incident response

Each layer assumes the ones above and below can be breached.
An attacker who breaks through the perimeter still faces segmentation, host hardening, etc.
```

---

## Attack Categories

### Passive Attacks

The attacker observes traffic without modifying it.

```
Eavesdropping / Sniffing:
  Capture packets on shared medium (WiFi, hub, port mirror)
  Tools: Wireshark, tcpdump, tshark
  Mitigation: encryption (TLS, IPsec); no sensitive data over HTTP

Traffic Analysis:
  Even encrypted traffic reveals: timing, size, frequency, endpoints
  Reveals: who is communicating, how often, how much data
  Mitigation: VPN/Tor to hide metadata; dummy traffic (impractical at scale)

Reconnaissance:
  Port scanning, service discovery, WHOIS, DNS enumeration
  Tools: nmap, masscan, Shodan, theHarvester
  Mitigation: minimize attack surface; don't expose unnecessary services
```

### Active Attacks

The attacker modifies, replays, or injects traffic.

```
Man-in-the-Middle (MITM):
  Attacker intercepts and potentially modifies communication
  ARP Spoofing: attacker sends gratuitous ARP claiming to be the gateway
  SSL Stripping: downgrade HTTPS to HTTP if HSTS not enforced
  BGP Hijacking: announce someone else's prefix (see BGP security page)
  Mitigation: HTTPS with HSTS, certificate pinning, DNSSEC, ARP inspection

Denial of Service (DoS / DDoS):
  Flood target with traffic to exhaust resources
  Volumetric: bandwidth exhaustion (UDP floods, DNS amplification, NTP amplification)
  Protocol: TCP SYN flood, ICMP Smurf
  Application: HTTP flood (Layer 7 DDoS), slowloris
  Amplification: small request → large response sent to spoofed source IP
    DNS: 1-byte query → 3KB response (3000× amplification)
    NTP: monlist command → 200+ server addresses (amplification 556×)
    Memcached: 15-byte query → 750KB response (51,000× amplification!)
  Mitigation: rate limiting, scrubbing centers, BCP38 (ingress filtering), anycast

Injection Attacks (network-level):
  SQL injection (application level, reaches DB via network)
  BGP route injection
  DNS cache poisoning (Kaminsky attack, 2008)
  OSPF route injection via unauthenticated adjacency
  Mitigation: authentication (MD5/SHA on routing protocols), DNSSEC

Replay Attacks:
  Capture valid packets; replay them later to repeat an action
  Example: capture authentication packet; replay to re-authenticate
  Mitigation: nonces (one-time numbers), timestamps, sequence numbers in protocols

Spoofing:
  IP spoofing: forge source IP in packet header
  MAC spoofing: change MAC address to impersonate another device
  ARP spoofing: send forged ARP replies
  Mitigation: BCP38, Dynamic ARP Inspection, 802.1X, ingress filtering
```

---

## ACLs — Access Control Lists

ACLs are the fundamental traffic filtering mechanism — on routers, firewalls, and switches.

### Cisco IOS ACL Types

```
Standard ACL (numbers 1-99, 1300-1999):
  Matches on SOURCE IP ONLY
  Apply as close to destination as possible (can't distinguish by dest)

Extended ACL (numbers 100-199, 2000-2699):
  Matches on: source IP, destination IP, protocol, source port, dest port
  Apply as close to source as possible (stop traffic early)

Named ACL:
  Same function as numbered; human-readable names; easier to manage
  Allows adding entries at specific sequence numbers without rewriting the whole ACL
```

### Standard ACL

```cisco
! Numbered standard ACL
access-list 10 permit 192.168.1.0 0.0.0.255    ! wildcard mask (inverse of subnet mask)
access-list 10 deny any                          ! implicit deny (always at end)

! Named standard ACL
ip access-list standard MGMT-HOSTS
 permit 10.0.0.0 0.255.255.255
 deny any

! Apply to interface
interface GigabitEthernet0/1
 ip access-group 10 in         ! inbound — filter arriving packets
 ip access-group MGMT-HOSTS out ! outbound — filter departing packets
```

### Extended ACL

```cisco
! Numbered extended ACL
access-list 100 permit tcp 10.0.0.0 0.255.255.255 any eq 80
access-list 100 permit tcp 10.0.0.0 0.255.255.255 any eq 443
access-list 100 deny ip any any log           ! deny with logging

! Named extended ACL
ip access-list extended WEBSERVER-INBOUND
 remark Allow HTTP and HTTPS from anywhere
 permit tcp any host 203.0.113.10 eq 80
 permit tcp any host 203.0.113.10 eq 443
 remark Allow established return traffic
 permit tcp any any established
 remark Allow ICMP echo (ping)
 permit icmp any any echo
 permit icmp any any echo-reply
 remark Deny and log everything else
 deny ip any any log

! Keywords for ports:
 eq 80           ! equals port 80
 gt 1024         ! greater than 1024
 lt 1024         ! less than 1024
 neq 25          ! not equal to 25
 range 20 21     ! port range 20-21
 
! Keywords for protocols:
 permit tcp ...   ! TCP
 permit udp ...   ! UDP
 permit icmp ...  ! ICMP
 permit ip ...    ! any IP (catch-all)

! 'established' keyword — matches TCP sessions with ACK or RST bit set
! (return traffic from a TCP connection initiated from inside)
 permit tcp any any established    ! allow established TCP return traffic

! Apply to interface
interface GigabitEthernet0/0
 ip access-group WEBSERVER-INBOUND in
```

### ACL Placement Rules

```
Standard ACL (source only):
  Apply CLOSE TO DESTINATION
  Far from source means traffic has already traversed the network before being filtered

Extended ACL (source + destination):
  Apply CLOSE TO SOURCE
  Filter as early as possible — don't waste bandwidth on traffic that will be denied

ACL on VTY lines (Telnet/SSH access control):
  line vty 0 15
   access-class MGMT-ACL in
   transport input ssh
```

### Wildcard Masks

```
Wildcard mask is the INVERSE of the subnet mask:
  Subnet mask:   255.255.255.0   → Wildcard: 0.0.0.255
  Subnet mask:   255.255.0.0     → Wildcard: 0.0.255.255
  Subnet mask:   255.255.255.128 → Wildcard: 0.0.0.127

Bit meaning:
  0 = must match this bit exactly
  1 = ignore this bit (wildcard)

Special wildcards:
  host 10.0.0.1   = 10.0.0.1 0.0.0.0      ! exact host match
  any             = 0.0.0.0 255.255.255.255 ! match anything
  
Examples:
  permit ip 10.0.0.0 0.0.0.255 any         ! any source in 10.0.0.0/24
  permit ip 10.0.0.0 0.255.255.255 any     ! any source in 10.0.0.0/8
  permit ip 10.0.1.0 0.0.0.255 any         ! 10.0.1.0/24 only
  permit ip any host 203.0.113.10           ! to exactly one host
```

---

## Firewalls

### Packet Filter vs Stateful vs NGFW

```
Packet Filter (stateless):
  Examines individual packets independently
  No awareness of TCP connection state
  Can't distinguish: established connection return traffic vs attack
  Fast but limited security
  Example: simple ACLs on routers

Stateful Inspection (stateful firewall):
  Tracks TCP/UDP session state in a connection table
  Allows return traffic automatically (no need for ACL for established)
  Detects: SYN floods, out-of-state packets, some spoofing
  Much safer than packet filters
  Example: ASA, iptables with conntrack, pfSense

Next-Generation Firewall (NGFW):
  All stateful capabilities plus:
  Deep Packet Inspection (DPI): inspect payload, not just headers
  Application Identification: identify applications regardless of port
  User Identity: tie policies to username, not just IP
  SSL/TLS Inspection: decrypt, inspect, re-encrypt HTTPS
  IPS (Intrusion Prevention System): detect and block exploits
  Threat intelligence: block known malicious IPs/domains
  URL filtering: block categories (gambling, malware, etc.)
  Examples: Palo Alto PA, Fortinet FortiGate, Cisco Firepower, Check Point

Stateful connection table entry (example):
  Proto | Src IP | Src Port | Dst IP | Dst Port | State | Timer
  TCP   | 10.0.1.5 | 52341 | 93.184.216.34 | 443 | ESTABLISHED | 300s
```

### Firewall Zones

```
Common zone architecture:
  Inside (trusted) — internal LAN, 10.0.0.0/8
  Outside (untrusted) — internet
  DMZ (demilitarized zone) — publicly accessible servers

Security levels (ASA-style):
  Inside: level 100 (most trusted)
  DMZ:    level 50
  Outside: level 0 (least trusted)

Default behavior:
  High security → low security: permitted by default (stateful)
  Low security → high security: denied by default (must permit explicitly)
  Same security: denied by default (require same-security-traffic permit)

Traffic flows:
  Inside → Internet: permit (stateful return allowed)
  Internet → DMZ web server: permit specific ports (80, 443)
  Inside → DMZ: permit (management access)
  Internet → Inside: deny all (block direct inbound)
  DMZ → Inside: deny all (compromised DMZ can't pivot inside)

DMZ design rule: DMZ servers should NEVER be able to initiate connections to the inside network.
If a DMZ server is compromised, the firewall stops lateral movement.
```

---

## Zero Trust Network Access

Zero Trust is a security model, not a product. The principle: **"Never trust, always verify."**

```
Traditional perimeter model assumptions (BROKEN):
  "If traffic is inside the network, it's trusted"
  "VPN users are trusted"
  → Fails when: insider threat, compromised machine inside, lateral movement after breach

Zero Trust principles:
  1. Verify explicitly: authenticate and authorize every request (user + device + context)
  2. Use least privilege: minimal access to do the job (time-limited if possible)
  3. Assume breach: act as if the network is already compromised; segment; monitor

Zero Trust architecture:
  Identity provider (IdP): Okta, Azure AD, Google Workspace
  Device trust: verified posture (up-to-date OS, EDR installed, compliant)
  Policy engine: combines identity + device + context → allow/deny
  Policy enforcement point: near every resource; not just at perimeter
  Microsegmentation: no implicit east-west trust within the network
  Continuous validation: re-check; don't trust a session forever

Zero Trust ≠ no perimeter:
  Perimeter still exists but is not the trust boundary
  Trust boundary is at the individual resource level
  ZTNA (Zero Trust Network Access) replaces VPN: grants access per application,
    not per network segment

Practical ZTNA flow:
  User requests access to CRM application
  → Policy engine checks: correct identity? MFA verified? Device compliant? Time of day OK?
  → If all good: proxied access to CRM only (not to the whole network)
  → Session continuously validated; revoked immediately if posture changes
```

---

## BCP38 — Network Ingress Filtering

```
BCP38 (RFC 2827): ISPs should filter packets from customers that have spoofed source IPs.

Rule: Only forward packets from a customer whose source IP is from the customer's allocated block.

Example:
  Customer AS 65001 is assigned 203.0.113.0/24
  If customer sends packets with source 10.0.0.0/8 → ISP DROPS them (not customer's range)

Why it matters:
  DDoS amplification attacks require IP spoofing to send amplified responses to victim
  If all ISPs enforced BCP38, amplification attacks would be impossible
  
Status: widely documented, rarely fully enforced — especially at smaller ISPs
  MANRS (Mutually Agreed Norms for Routing Security): industry initiative for BCP38 + RPKI

Cisco IOS implementation:
  ! uRPF (Unicast Reverse Path Forwarding):
  interface GigabitEthernet0/0
   ip verify unicast source reachable-via rx      ! strict uRPF
   ip verify unicast source reachable-via any     ! loose uRPF (for asymmetric routing)
  ! Drops packets where source IP has no route back out the same interface (strict)
  ! or no route in the routing table at all (loose)
```

---

## Tips

- The implicit deny at the end of every ACL is invisible in the config — always add an explicit `deny any any log` before the end so denies are logged.
- Extended ACLs applied close to the source save bandwidth — don't let denied traffic traverse the entire network before being dropped.
- Stateful firewalls are not magic — they track state but can still be overwhelmed by SYN floods; rate limiting at the ISP edge is also needed.
- Zero Trust doesn't mean no trust ever — it means verifying before granting trust rather than assuming trust based on network location.
- In an ACL, `permit tcp any any established` allows return traffic for outbound TCP sessions — but this is handled automatically by stateful firewalls; only use this on stateless packet filters.

---

## Summary

- CIA Triad: Confidentiality (encryption), Integrity (signatures/MACs), Availability (redundancy, rate limiting) are the three security pillars.
- Defense in depth layers controls at perimeter, network, host, application, identity, and monitoring levels.
- Standard ACLs match source only — apply near destination. Extended ACLs match src+dst+port+protocol — apply near source.
- Wildcard masks are the inverse of subnet masks; `host x.x.x.x` = /32 exact match; `any` = match all.
- Stateful firewalls track connection state and automatically allow return traffic; NGFWs add DPI, application identification, and IPS.
- Zero Trust: verify every request explicitly (identity + device + context); least privilege; assume breach; microsegment; continuously validate.
- BCP38/uRPF drops packets with spoofed source IPs — critical for preventing amplification attacks; `ip verify unicast source` on Cisco.
