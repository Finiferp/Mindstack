---
title: "Firewalls, IDS, and IPS"
sidebar_label: "Firewalls, IDS & IPS"
sidebar_position: 54
---

# Firewalls, IDS, and IPS

Firewalls enforce policy at network boundaries; IDS detects threats passively; IPS detects and blocks inline. Together they form the core of network-based threat detection and prevention.

---

## Stateful Firewall Deep Dive

### Connection Tracking

A stateful firewall maintains a session table — every active TCP/UDP/ICMP flow has an entry:

```
Session table entry:
  Protocol  | Src IP    | Src Port | Dst IP        | Dst Port | State        | Timeout
  TCP       | 10.0.1.5  | 52341    | 93.184.216.34 | 443      | ESTABLISHED  | 300s
  TCP       | 10.0.1.5  | 52342    | 93.184.216.34 | 443      | SYN_SENT     | 30s
  UDP       | 10.0.1.5  | 54321    | 8.8.8.8       | 53       | (UDP_IDLE)   | 30s
  ICMP      | 10.0.1.5  | id=1234  | 8.8.8.8       | echo     | (ICMP)       | 10s

TCP states tracked:
  SYN_SENT: SYN sent, waiting for SYN-ACK
  SYN_RECV: SYN-ACK seen, waiting for ACK
  ESTABLISHED: three-way handshake complete
  FIN_WAIT: FIN seen from one side
  CLOSE_WAIT: both FINs seen
  TIME_WAIT: waiting for stale packets to expire

When return traffic arrives: firewall checks session table
  Match found → automatically allowed (no policy check needed)
  No match → check inbound policy (usually denied by default)
```

### Cisco ASA / Firepower Configuration

```cisco
! ── Interface configuration ─────────────────────────────────────────────────
interface GigabitEthernet0/0
 nameif outside
 security-level 0                          ! untrusted (0=lowest)
 ip address 203.0.113.1 255.255.255.252

interface GigabitEthernet0/1
 nameif inside
 security-level 100                        ! trusted (100=highest)
 ip address 192.168.1.1 255.255.255.0

interface GigabitEthernet0/2
 nameif dmz
 security-level 50                         ! semi-trusted
 ip address 172.16.0.1 255.255.255.0

! ── Object definitions ───────────────────────────────────────────────────────
object network WEBSERVER-OBJ
 host 172.16.0.10                          ! DMZ web server

object network INSIDE-NET
 subnet 192.168.1.0 255.255.255.0

! ── NAT ─────────────────────────────────────────────────────────────────────
! PAT (overload NAT) — inside hosts go out as the outside interface IP
nat (inside,outside) dynamic interface

! Static NAT — DMZ web server accessible on public IP
nat (dmz,outside) static 203.0.113.5      ! external IP for web server

! ── Access control policy ────────────────────────────────────────────────────
! Object-group for simplification
object-group service WEB-PORTS tcp
 port-object eq www
 port-object eq https

! ACL for inbound traffic on outside interface
access-list OUTSIDE-IN extended permit tcp any object WEBSERVER-OBJ object-group WEB-PORTS
access-list OUTSIDE-IN extended permit icmp any any echo-reply
access-list OUTSIDE-IN extended deny ip any any log

access-group OUTSIDE-IN in interface outside

! ACL for DMZ → inside (deny all — DMZ servers cannot initiate to inside)
access-list DMZ-IN extended deny ip any 192.168.1.0 255.255.255.0
access-list DMZ-IN extended permit ip any any        ! allow DMZ to internet
access-group DMZ-IN in interface dmz

! ── Inspection ───────────────────────────────────────────────────────────────
! ASA deep inspection (stateful protocol validation)
policy-map global_policy
 class inspection_default
  inspect ftp                              ! FTP ALG
  inspect h323 h225                        ! VoIP H.323
  inspect sip                              ! SIP VoIP
  inspect dns                              ! DNS validation
  inspect http                             ! HTTP inspection
  inspect icmp                             ! ICMP stateful
service-policy global_policy global

! ── Verification ─────────────────────────────────────────────────────────────
show conn                                  ! connection table
show xlate                                 ! NAT translation table
show access-list                           ! ACL hit counts
show service-policy                        ! inspection policy
```

---

## iptables / nftables (Linux Firewall)

### iptables

```bash
# List rules
iptables -L -n -v --line-numbers
iptables -L INPUT -n -v

# Default policy
iptables -P INPUT DROP                     # drop all inbound by default
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT                  # allow all outbound

# Allow established/related connections (stateful)
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow SSH from management subnet
iptables -A INPUT -p tcp -s 10.0.0.0/24 --dport 22 -m conntrack --ctstate NEW -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow ICMP echo (ping)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Rate limit new SSH connections (anti-brute-force)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m limit --limit 3/min --limit-burst 3 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP

# Log and drop everything else
iptables -A INPUT -j LOG --log-prefix "DROPPED: " --log-level 4
iptables -A INPUT -j DROP

# Persist rules
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4

# NAT (masquerade — SNAT for outbound)
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
echo 1 > /proc/sys/net/ipv4/ip_forward    # enable routing

# DNAT (port forward — inbound NAT)
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to 192.168.1.10:80
```

### nftables (modern replacement for iptables)

```bash
# Create a basic nftables config
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \; policy drop \; }
nft add chain inet filter forward { type filter hook forward priority 0 \; policy drop \; }
nft add chain inet filter output { type filter hook output priority 0 \; policy accept \; }

# Allow established connections
nft add rule inet filter input ct state established,related accept

# Allow loopback
nft add rule inet filter input iifname lo accept

# Allow SSH
nft add rule inet filter input tcp dport 22 accept

# Allow HTTP/HTTPS
nft add rule inet filter input tcp dport { 80, 443 } accept

# Drop and log everything else
nft add rule inet filter input log prefix \"DROPPED: \" drop

# View rules
nft list ruleset

# Persist
nft list ruleset > /etc/nftables.conf
```

---

## IDS — Intrusion Detection System

An IDS passively monitors traffic and generates alerts. It does NOT block traffic.

```
IDS placement: traffic mirror (SPAN/TAP) — receives a copy of all traffic
Benefits: zero impact on traffic (passive — no latency added)
Limitation: detects but cannot prevent; alerts may arrive after damage

Detection methods:

Signature-based:
  Match traffic against database of known attack patterns
  Fast, accurate for known threats
  Misses: zero-day attacks, obfuscated attacks, novel techniques
  Requires regular signature updates

Anomaly-based (statistical):
  Build baseline of "normal" traffic; alert on deviations
  Detects: zero-days, insider threats, novel attacks
  Requires: training period; high false positive rate
  Example: "Host X suddenly scans 10,000 ports" → alert

Protocol analysis:
  Validates that protocols conform to RFC specifications
  Detects: malformed packets, protocol abuse, evasion techniques
  Example: HTTP request with malformed headers → alert

Behavioral analysis:
  Track behavior over time; detect slow attacks (low-and-slow)
  Example: one failed login per day for 100 days → alert (under per-minute threshold)

IDS categories:
  NIDS (Network IDS): positioned on network segment; monitors all traffic
  HIDS (Host IDS): agent on the host; monitors system calls, file access, logs
  
Popular open-source:
  Suricata: NIDS; can be used as IDS or IPS; very high performance; Lua rules
  Snort: original open-source NIDS; rule-based; powers many commercial products
  Zeek (formerly Bro): network analysis framework; excellent for protocol analysis and logging
```

---

## IPS — Intrusion Prevention System

An IPS is an IDS deployed inline — it can block traffic, not just alert.

```
IPS placement: inline between network segments
Benefits: can block attacks in real-time
Risk: false positives cause legitimate traffic to be dropped ("blocking mode")
Approach: start in detection mode; tune; move to prevention mode

IPS modes:
  Detection (IDS mode): alert only; no blocking
  Prevention (IPS mode): block matching traffic; alert
  Mixed: block high-confidence rules; alert on low-confidence

IPS tuning:
  Too strict: high false positive rate → legitimate traffic blocked → network outage
  Too loose: attacker traffic passes → detection value limited
  Goal: minimize false positives while maintaining detection rate

Common IPS/IDS platforms:
  Snort 3:         open-source; most widely used ruleset ecosystem
  Suricata:        multi-threaded; AF_PACKET; higher throughput than Snort
  Cisco Firepower: commercial NGFW with integrated IPS; Snort engine
  Palo Alto PAN:   NGFW with App-ID and threat prevention
  Fortinet FortiGate: NGFW with IPS + AV + web filtering
  Zeek:            primarily a logging/analysis tool; not blocking
```

### Snort 3 Rule Syntax

```
Rule format:
  action proto src_ip src_port direction dst_ip dst_port (options)

Examples:
  # Alert on HTTP with SQL injection patterns
  alert http any any -> any 80 (
    msg:"SQL Injection Attempt";
    http.uri;
    content:"union select";
    nocase;
    sid:1000001;
    rev:1;
  )

  # Alert on SSH brute force (too many connections)
  alert tcp any any -> any 22 (
    msg:"SSH Brute Force Attempt";
    flags:S;
    detection_filter:track by_src, count 5, seconds 60;
    sid:1000002;
    rev:1;
  )

  # Block known malicious user agent
  drop http any any -> any any (
    msg:"Malicious User Agent";
    http.header;
    content:"User-Agent|3a 20|";
    content:"known-bad-scanner/1.0";
    within:30;
    sid:1000003;
  )

Options:
  msg:         human-readable alert message
  content:     byte string to match in payload
  nocase:      case-insensitive matching
  offset:      start matching at this byte offset
  within:      match within N bytes of previous content match
  distance:    match after N bytes from previous content match
  http.uri:    match in HTTP URI (request URL)
  http.header: match in HTTP header
  flags:       TCP flags (S=SYN, A=ACK, R=RST, F=FIN, P=PSH)
  sid:         unique rule ID
  rev:         rule revision number
  classtype:   categorize the attack
  priority:    1 (highest) - 3
  reference:   external references (CVE, URL)
  detection_filter: threshold (count per time window)
  threshold:   alert suppression / rate limiting
```

---

## WAF — Web Application Firewall

```
WAF operates at Layer 7 — inspects HTTP/HTTPS request content
Protects against: SQLi, XSS, CSRF, path traversal, RCE, web scraping

Deployment modes:
  Inline (reverse proxy): WAF sits in front of web server; all traffic through WAF
  Out-of-band: receives mirrored traffic; alert only (no blocking)
  Agent: software agent on web server

Detection models:
  Negative model (blacklist): block known-bad patterns
    Faster to deploy; misses novel attacks
    OWASP ModSecurity Core Rule Set (CRS): open-source ruleset
  Positive model (whitelist): only allow known-good patterns
    More secure; very slow to deploy; high maintenance

ModSecurity + OWASP CRS (open-source WAF for nginx/Apache):
  SecRuleEngine On                 # enable blocking mode
  Include /etc/modsecurity/crs/setup.conf
  Include /etc/modsecurity/crs/rules/*.conf

Commercial WAF: Cloudflare WAF, AWS WAF, Imperva, Akamai Kona Site Defender

WAF bypass techniques (for pen testers to know):
  Case variation: UNION → uNiOn
  URL encoding: SELECT → %53%45%4C%45%43%54
  Comment injection: UN/**/ION SEL/**/ECT
  Double encoding: %2527 → %27 → '
→ These are why rule tuning and positive model are important
```

---

## DMZ Architecture Patterns

```
Traditional Three-Legged DMZ:
  Internet ─── FIREWALL ─── DMZ (web/mail/DNS servers)
                         └── Inside (LAN)
  
  One firewall with three interfaces
  Compromise of firewall = direct inside access
  DMZ servers get two-firewall protection (internet→outer FW→DMZ→inner FW→inside)

Two-Firewall DMZ (stricter):
  Internet ─── Outer FW ─── DMZ ─── Inner FW ─── Inside
  
  Two separate firewalls (preferably different vendors)
  Compromising one FW still requires compromising the second
  Defense-in-depth for the most sensitive segments

Common DMZ residents:
  Web servers (80/443 inbound)
  Mail relay / MTA (25 inbound; 587 to internal mail server)
  DNS resolver / authoritative (53 in/out)
  VPN concentrator (IPsec/OpenVPN)
  Reverse proxy / load balancer

DMZ rules:
  Internet → DMZ: specific ports only (80, 443, 25, etc.)
  DMZ → Internet: outbound for updates, lookups (limited; no P2P)
  Inside → DMZ: management access (SSH 22, RDP 3389)
  DMZ → Inside: DENY (compromised DMZ can't pivot inside)
  Inside → Internet: via DMZ proxy or separate path
```

---

## Tips

- Deploy IPS in detection mode first — tune rules until false positive rate is acceptable before switching to prevention mode. Blocking mode with untuned rules causes outages.
- A WAF is not a substitute for secure application code — WAFs are a mitigation layer; fixing SQL injection in code is always better than filtering it at the WAF.
- The DMZ rule "DMZ cannot initiate to Inside" is critical — if a web server is compromised, this stops the attacker from reaching your database servers.
- Log every denied packet at the firewall — a denied packet may mean a misconfiguration or an attack attempt; logs are the only way to distinguish.
- SPAN ports for IDS monitoring can be oversubscribed — if a 10G switch sends a SPAN of all traffic to a 1G IDS port, 90% of packets are silently dropped. Use dedicated TAPs for high-speed links.

---

## Summary

- Stateful firewalls track connection state — return traffic is automatically permitted; only inbound initiation needs explicit policy.
- Cisco ASA uses security levels (0–100); higher to lower is permitted by default; lower to higher requires explicit ACL.
- IDS passively monitors (SPAN/TAP); IPS is inline and can block — both use signatures, anomaly detection, and protocol analysis.
- Snort/Suricata rules match on protocol + IP + port + payload; `detection_filter` enables rate-based rules (brute force detection).
- WAF protects Layer 7 against SQLi, XSS, path traversal — negative model (block known-bad) faster to deploy; positive model (allow known-good) more secure.
- DMZ isolates public-facing servers — the key rule: DMZ cannot initiate connections to the inside network.
