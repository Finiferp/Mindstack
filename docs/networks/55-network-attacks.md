---
title: "Network Attacks and Defenses"
sidebar_label: "Network Attacks"
sidebar_position: 55
---

# Network Attacks and Defenses

Understanding how attacks work is prerequisite to building effective defenses. This page covers the major categories of network-level attacks with their mechanics and countermeasures.

---

## Reconnaissance

Before attacking, adversaries gather information — passive reconnaissance leaves no footprint; active reconnaissance may be detected.

```
Passive Reconnaissance:
  OSINT (Open Source Intelligence):
    WHOIS lookup: domain ownership, registrar, creation date
    DNS records: MX, A, AAAA, TXT (SPF/DKIM), CNAME, NS — reveals infrastructure
    Certificate Transparency logs: all TLS certs ever issued → reveals subdomains
    Shodan/Censys: search engines for internet-connected devices
    LinkedIn/GitHub: org structure, technology stack (job postings reveal infra)
    Google dork: site:example.com filetype:pdf, inurl:admin, intitle:index.of

  DNS enumeration (passive + active):
    Zone transfer (AXFR): if misconfigured, dumps entire DNS zone
      dig axfr example.com @ns1.example.com
    Subdomain brute-force: try common names (www, mail, vpn, admin...)
      tools: gobuster, subfinder, amass, dnsx
    Reverse DNS: PTR records reveal hostnames for IP ranges

Active Reconnaissance:
  Port scanning (nmap):
    nmap -sS -p- --min-rate 1000 target      # SYN scan all ports
    nmap -sV -sC -p 22,80,443 target         # service/version + default scripts
    nmap -O target                            # OS detection
    nmap -sU -p 53,67,161 target             # UDP scan
    nmap -sn 10.0.0.0/24                     # host discovery (ping sweep)
    Stealth: -T2 (slow), -D decoys, --source-port 80 (evade firewall)

  Service fingerprinting:
    Banner grabbing: nc -nv target 22; curl -I http://target
    Web tech: whatweb, Wappalyzer, nikto
    SSL cert: openssl s_client -connect target:443

  Defenses against reconnaissance:
    Null-route or firewall unused port ranges
    Rate-limit port scans at network edge (block sources scanning > N ports)
    Minimize DNS zone exposure (deny AXFR except to authorized secondaries)
    Remove service banners (Apache ServerTokens Minimal, SSH version string)
    Use certificate transparency monitoring alerts for your domains
    Monitor for excessive DNS queries from single sources
```

---

## ARP-Based Attacks

### ARP Spoofing / ARP Poisoning

```
ARP has no authentication — anyone can send a gratuitous ARP claiming any IP-MAC mapping.

Attack flow:
  Target A: 192.168.1.10, MAC AA:AA:AA:AA:AA:AA
  Gateway: 192.168.1.1, MAC BB:BB:BB:BB:BB:BB
  Attacker: 192.168.1.100, MAC CC:CC:CC:CC:CC:CC

  1. Attacker sends ARP reply to Target A:
     "192.168.1.1 is at CC:CC:CC:CC:CC:CC" (attacker's MAC)
  2. Target A's ARP cache: 192.168.1.1 → CC:CC (wrong!)
  3. Attacker sends ARP reply to Gateway:
     "192.168.1.10 is at CC:CC:CC:CC:CC:CC"
  4. All traffic between A and gateway flows through attacker → MITM

Tools: arpspoof, Ettercap, Bettercap, scapy

Defense:
  Dynamic ARP Inspection (DAI) on switches:
    ip arp inspection vlan 10
    Interface to DHCP server and trusted devices: ip arp inspection trust
    Switch validates ARP against DHCP snooping binding table
    Invalid ARP → dropped → ARP poisoning defeated

  Static ARP entries (for critical devices):
    arp -s 192.168.1.1 BB:BB:BB:BB:BB:BB    # Linux/Windows
    High maintenance; not practical at scale

  XArp: monitors ARP cache for unexpected changes (detection only)
```

### MAC Flooding

```
Attack: Flood switch with frames using random source MAC addresses
Goal: Exhaust the switch's MAC table (CAM table overflow)
Effect: Switch falls into "fail-open" mode → floods ALL traffic to all ports (hub behavior)
Result: Attacker can capture all traffic on the segment

Tools: macof (part of dsniff), yersinia

Defense:
  Port Security (Cisco):
    switchport port-security maximum 5        ! max 5 MACs per port
    switchport port-security violation shutdown ! shutdown port on violation
    switchport port-security mac-address sticky ! remember connected MACs
  VLAN segmentation reduces the impact (only that VLAN's traffic is visible)
```

---

## VLAN Hopping

### Switch Spoofing

```
Attack: Attacker's port is normally an access port.
  Attacker sends 802.1Q DTP (Dynamic Trunking Protocol) frames
  Switch negotiates a trunk link → attacker on a trunk → access to ALL VLANs

Defense:
  Disable auto-trunking on all access ports:
    switchport mode access           ! force access mode (no trunk negotiation)
    switchport nonegotiate           ! disable DTP entirely
  Never use dynamic trunk mode on access ports
```

### Double Tagging

```
Attack: Only works when attacker is on the NATIVE VLAN
  Attacker sends frame with TWO 802.1Q tags:
    Outer tag: native VLAN (e.g., VLAN 1) — stripped by first switch
    Inner tag: victim VLAN (e.g., VLAN 100) — forwarded to VLAN 100
  One-directional attack (return traffic doesn't come back to attacker)

Defense:
  Never use VLAN 1 as native VLAN
  Change native VLAN to an unused VLAN: switchport trunk native vlan 999
  Tag native VLAN on trunks: vlan dot1q tag native
  Better: use access ports everywhere they're not needed as trunks
```

---

## DHCP Attacks

### DHCP Starvation

```
Attack: Flood DHCP server with requests using random MAC addresses
Goal: Exhaust the DHCP pool → legitimate clients can't get addresses
Effect: DoS against new clients joining the network

Defense:
  Port Security: limits number of MAC addresses per port
  DHCP Rate Limiting: ip dhcp snooping limit rate 15
    (drop DHCP messages if rate exceeds 15 per second on a port)
```

### Rogue DHCP Server

```
Attack: Attacker runs a DHCP server on the network
Effect: Wins the race → assigns clients:
  Attacker's gateway → MITM all traffic
  Attacker's DNS → DNS hijacking → redirect to malicious sites

Defense:
  DHCP Snooping (covered in switch security page):
    Only trusted ports (connected to legitimate DHCP server) can send DHCP offers
    All other ports are untrusted → DHCP offers from them dropped

Cisco config:
  ip dhcp snooping
  ip dhcp snooping vlan 10
  interface GigabitEthernet0/0        ! uplink to DHCP server
   ip dhcp snooping trust
  ! All other interfaces: untrusted by default
```

---

## Spanning Tree Attacks

### STP Root Bridge Takeover

```
Attack: Send BPDUs with superior (lower) bridge priority
Effect: Attacker's switch becomes root bridge → STP rebuilds topology
Result:
  Traffic paths change → MITM position for traffic between switches
  Topology flap → brief outage during reconvergence
  Can cause a physical loop if attacker manipulates ports

Defense:
  Root Guard: ports that should never receive superior BPDUs
    spanning-tree guard root
    If superior BPDU arrives → port placed in root-inconsistent state (blocked)

  BPDU Guard: ports that should never receive BPDUs (access ports)
    spanning-tree bpduguard enable
    If any BPDU arrives → port err-disabled immediately

  Increase priority of legitimate root:
    spanning-tree vlan 10 priority 4096   ! make root very unlikely to be displaced
```

---

## DoS and DDoS Attacks

### TCP SYN Flood

```
Attack flow:
  1. Attacker sends thousands of SYN packets with spoofed source IPs
  2. Server responds with SYN-ACK; allocates resources; enters SYN_RCVD state
  3. No ACK arrives (source IP is spoofed — victim doesn't send ACK)
  4. Server's SYN backlog fills → new connections refused
  5. SYN timeout (typically 30s–3min) → server exhausted for duration

Defense:
  SYN Cookies (RFC 4987):
    Server encodes connection state in the SYN-ACK's sequence number
    No resources allocated until valid ACK received with correct cookie
    linux: sysctl -w net.ipv4.tcp_syncookies=1
    Trade-off: TCP options (SACK, window scale) may not work with SYN cookies
    
  SYN Proxy (rate limiting at firewall):
    Firewall handles SYN, completes handshake, then proxies to server
    Server only sees established connections
    
  Rate limiting at ISP/edge:
    Drop SYN packets above N per second from single source IP

  TCP SYN backlog increase:
    sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

### Amplification Attacks

```
General pattern:
  1. Attacker spoofs victim's IP as source
  2. Sends small requests to many open servers
  3. Servers send large responses to victim
  4. Victim overwhelmed by traffic it never requested

DNS Amplification:
  Request: 64-byte ANY query for "." (root zone)
  Response: 3,000+ bytes of root DNS data
  Amplification: ~47×
  Open recursive DNS resolvers are the vector
  Defense: rate-limit/block DNS ANY queries; don't run open resolvers; BCP38

NTP Amplification:
  Request: 8-byte monlist request (get list of last 600 clients)
  Response: up to 48KB of NTP client records
  Amplification: ~556×
  Defense: disable monlist (ntpdc -c "restrict default noquery"); update NTP

Memcached Amplification:
  Request: 15-byte stats command
  Response: up to 750KB
  Amplification: ~51,000×
  Defense: never expose Memcached (port 11211) to internet; firewall it immediately

SSDP Amplification (Smart devices):
  UPnP SSDP search → device description → amplification ~30×

General defenses:
  BCP38 / uRPF: source IP validation prevents spoofing
  Close open resolvers / restrict reflection services
  Work with upstream ISP for volumetric DDoS mitigation
  Anycast BGP null routing for victim IP (traffic-black-hole)
  DDoS scrubbing centers (Cloudflare, Arbor, Akamai)
```

### HTTP Flood (Layer 7 DDoS)

```
Valid HTTP requests from many sources (often botnets)
Each request appears legitimate — hard to filter by IP
Goal: exhaust web server CPU/memory rather than bandwidth

Slowloris attack:
  Open many connections; send partial HTTP headers very slowly
  Server waits for complete request; holds connection open
  Server's max-connections limit exhausted; real users can't connect

Variants: Slow POST (slowly send request body), RUDY (R-U-Dead-Yet)

Defenses:
  Connection rate limiting per IP
  Request timeouts (close partial requests)
  CAPTCHA challenges on suspicious traffic
  CDN/WAF rate limiting (Cloudflare, Akamai)
  IP reputation blocking
  Challenge-response (JS challenge) — bots can't execute JavaScript
```

---

## Routing Protocol Attacks

### OSPF/EIGRP Attacks

```
Without authentication: anyone on the network can:
  Send forged LSA/hello → become OSPF neighbor → inject false routes
  Inject a default route → MITM all traffic
  Black-hole specific routes (withdraw them)
  Create routing loops

Defense:
  Enable MD5 authentication on all OSPF/EIGRP interfaces
  OSPF: ip ospf authentication message-digest + ip ospf message-digest-key 1 md5 KEY
  EIGRP: ip authentication mode eigrp 100 md5 + ip authentication key-chain eigrp 100 CHAIN
  Use area authentication for OSPF (applies to all interfaces in area)
```

### BGP Route Hijacking

```
Covered in BGP Advanced page. Brief summary:
  Unauthorized AS announces another AS's IP prefixes → BGP routers prefer the shorter/more-specific path
  Traffic redirected → MITM or blackhole

Defense: RPKI (Route Origin Authorization) — cryptographically validates which AS can originate which prefix
```

---

## Password and Credential Attacks

### Network-Level Credential Interception

```
Cleartext protocols to never use:
  Telnet (23), HTTP (80), FTP (21), SMTP plain (25), IMAP plain (143)
  Any protocol without TLS in 2025 should be considered compromised

Credential sniffing:
  Tools: Wireshark, tcpdump, Bettercap, Responder (Windows environments)
  Particularly effective with ARP spoofing on LANs

Brute force attacks:
  SSH brute force: try password list against SSH
    medusa -u root -P /wordlists/passwords.txt -h target -M ssh
  Defense: fail2ban, key-only auth, port knocking, rate limiting

NTLM Relay (Windows):
  Capture Windows NTLM challenge-response via poisoned LLMNR/NBT-NS
  Relay to another service that accepts NTLM → authenticate as victim user
  Tools: Responder + ntlmrelayx
  Defense: disable LLMNR and NBT-NS, require SMB signing, enable EPA for LDAP
```

---

## Wireless Network Attacks

### WPA2 PMKID Attack

```
Modern WPA2 key capture without requiring a 4-way handshake:
  PMKID = HMAC-SHA1(PMK, "PMK Name" | BSSID | Client-MAC)
  Capture from beacon/association frames
  Offline dictionary attack against PMKID
  hcxdumptool → capture; hashcat → crack
  Defense: strong random passphrase (20+ chars); avoid dictionary words
```

### Evil Twin / Rogue AP

```
Attacker creates a fake access point with same SSID as legitimate network:
  Clients deauthenticated from real AP (via 802.11 deauth frames)
  Clients auto-connect to fake AP (strongest signal)
  Attacker MITM all traffic
  Tools: hostapd-wpe, airbase-ng

Defense:
  802.11w (Management Frame Protection): authenticates deauth/disassoc frames
  WIDS (Wireless IDS): monitor for rogue APs and deauth floods
  Certificate pinning for sensitive apps: even on evil twin, cert won't match
  WPA3 (SAE): mutual authentication prevents connecting to unauthorized APs
```

---

## Tips

- Set DHCP snooping, Dynamic ARP Inspection, and Port Security on every access VLAN — these three controls block the most common Layer 2 attacks with minimal configuration.
- Never use Telnet for device management; always SSH with key authentication and disable password auth.
- Rate-limit ICMP and UDP on all external interfaces — limits amplification attack effectiveness and ping flood impact.
- Monitor for unexpected route changes (BGP route monitoring, OSPF neighbor changes) — routing attacks often manifest as sudden topology changes.
- For wireless: enforce 802.11w (Management Frame Protection) and use WPA3 where supported; deploy WIDS for rogue AP detection.

---

## Summary

- Reconnaissance: passive (OSINT, certs, DNS) leaves no trace; active (port scan) may be detected — minimize external exposure and monitor for scans.
- ARP spoofing enables MITM on local segments — Dynamic ARP Inspection (DAI) validates ARP against DHCP binding table.
- VLAN hopping: disable DTP on access ports (`switchport mode access`); change native VLAN away from VLAN 1.
- SYN flood exhausts connection backlog — SYN cookies avoid state allocation until ACK received; rate limiting at edge.
- Amplification (DNS, NTP, Memcached) uses spoofed source IPs — BCP38 prevents spoofing; close/restrict open reflectors.
- Routing attacks (OSPF/EIGRP) require authentication — always deploy MD5 (minimum) or SHA on all routing protocol interfaces.
