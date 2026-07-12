---
title: "DNS — Domain Name System"
sidebar_label: "DNS"
sidebar_position: 29
---

# DNS — Domain Name System

DNS translates human-readable names (`www.example.com`) into IP addresses that computers use. It is one of the most critical protocols on the internet — nearly every network action begins with a DNS lookup.

---

## History and Design

Before DNS, a single file called `HOSTS.TXT` was maintained at the Stanford Research Institute and distributed to all hosts on ARPANET. By the early 1980s this had become unmanageable — thousands of hosts, a file that needed constant manual updates, no way to delegate zones.

Paul Mockapetris designed DNS in 1983 (RFC 882, 883; superseded by RFC 1034/1035 in 1987). Key design goals:

- **Distributed** — no single server holds all records; authority is delegated.
- **Hierarchical** — names follow a tree structure; zones are independently managed.
- **Cached** — resolvers cache answers to reduce query load on authoritative servers.
- **Scalable** — the system handles billions of queries per day without central coordination.

---

## The DNS Namespace

```
                        . (root)
                        │
         ┌──────────────┼────────────────┐
        com            org              net   (TLDs — Top-Level Domains)
         │              │
    ┌────┴────┐      wikipedia
  google   example
              │
             www          (subdomain / hostname)
```

A Fully Qualified Domain Name (FQDN) reads right to left from the root:
```
www.example.com.
   │       │  │└── root (the trailing dot — often omitted but always implied)
   │       │  └─── TLD
   │       └────── second-level domain (SLD)
   └────────────── subdomain / hostname
```

---

## DNS Hierarchy and Delegation

```
Root Zone → managed by IANA/root server operators (13 root server clusters, A through M)
  ↓ delegates .com to Verisign
TLD (.com) → Verisign's name servers know which NS servers handle each .com domain
  ↓ delegates example.com to example's own name servers
Authoritative zone (example.com) → your servers (ns1.example.com, ns2.example.com)
  → hold actual records: A, AAAA, MX, CNAME, TXT, etc.
```

The delegation is recorded as **NS records** — the parent zone lists the NS records for the child zone, and **glue records** (A records for the NS servers themselves, to avoid circular lookups).

---

## DNS Resolution — Full Recursive Lookup

```
User types "www.example.com" in browser:

1. Browser checks its own DNS cache
2. Browser checks OS resolver cache
3. OS asks the configured Recursive Resolver (usually ISP's or 8.8.8.8)

Recursive Resolver:
  4. Checks its cache → miss
  5. Asks a Root Name Server: "Who handles .com?"
     → Root: "Try Verisign's servers: a.gtld-servers.net (192.5.6.30)"  [NS + glue]
  6. Asks a.gtld-servers.net: "Who handles example.com?"
     → TLD: "Try ns1.example.com (93.184.216.9)"  [NS + glue]
  7. Asks ns1.example.com: "What is www.example.com?"
     → Authoritative: "www.example.com A 93.184.216.34"  [the answer!]
  8. Resolver caches the answer (TTL = 300 seconds, per the response)
  9. Resolver returns 93.184.216.34 to the OS
 10. OS returns to the browser
 11. Browser connects to 93.184.216.34 on TCP/80 or 443

Total: up to 3 queries from the resolver (root → TLD → authoritative)
If cached at any level, fewer (often zero) external queries needed
```

### Iterative vs Recursive

- **Recursive query**: client asks resolver "give me the final answer." Resolver does all the work.
- **Iterative query**: server responds with a referral ("ask this other server"). Client follows referrals.

Clients use recursive queries to their resolver. Resolvers use iterative queries to root/TLD/authoritative servers.

---

## DNS Record Types

| Type | Description | Example |
|---|---|---|
| **A** | IPv4 address | `www.example.com. 300 IN A 93.184.216.34` |
| **AAAA** | IPv6 address | `www.example.com. 300 IN AAAA 2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | Canonical name alias | `mail.example.com. 300 IN CNAME ghs.google.com.` |
| **MX** | Mail exchanger | `example.com. 300 IN MX 10 mail.example.com.` |
| **NS** | Name server | `example.com. 86400 IN NS ns1.example.com.` |
| **PTR** | Reverse lookup (IP→name) | `34.216.184.93.in-addr.arpa. 300 IN PTR www.example.com.` |
| **SOA** | Start of Authority | (zone metadata — serial, refresh, retry, expire, min TTL) |
| **TXT** | Arbitrary text | SPF, DKIM, domain verification |
| **SRV** | Service location | `_http._tcp.example.com. SRV 10 20 80 www.example.com.` |
| **CAA** | Cert Authority Authorization | Which CAs may issue certs for this domain |
| **DS** | DNSSEC delegation signer | |
| **DNSKEY** | DNSSEC public key | |
| **NAPTR** | Name Authority Pointer | VoIP, URI mapping |
| **TLSA** | TLS cert association (DANE) | |

### Record Format

```
owner-name  TTL  class  type  rdata
example.com. 3600  IN    A    93.184.216.34
│            │     │     │    └── data (IP address)
│            │     │     └─────── record type
│            │     └───────────── class (IN = Internet, always)
│            └─────────────────── TTL in seconds
└──────────────────────────────── owner name (zone apex)
```

### SOA Record (Start of Authority)

```
example.com. 86400 IN SOA ns1.example.com. hostmaster.example.com. (
    2024010101  ; Serial (YYYYMMDDnn format — increment on every change)
    3600        ; Refresh — how often secondary servers check for updates
    900         ; Retry — how often secondary retries failed refresh
    604800      ; Expire — secondary stops serving zone if can't refresh in 7 days
    300         ; Minimum TTL — negative cache TTL (NXDOMAIN caching)
)
```

### MX Record Priority

Lower priority number = higher preference:

```
example.com. IN MX 10 mail1.example.com.   (primary — try first)
example.com. IN MX 20 mail2.example.com.   (backup — try if 10 fails)
example.com. IN MX 30 mail3.example.com.   (tertiary)
```

### PTR Records and Reverse Zones

PTR records enable reverse DNS (rDNS) — looking up a name given an IP. The IP is reversed and `.in-addr.arpa.` is appended:

```
IP: 93.184.216.34
Reverse zone: 216.184.93.in-addr.arpa.
PTR record: 34.216.184.93.in-addr.arpa. IN PTR www.example.com.
             ↑ full reversed IP as a DNS name

IPv6 reverse zone: ip6.arpa.
2606:2800:220:1:248:1893:25c8:1946
→ Reversed nibble: 6.4.9.1.8.c.5.2.3.9.8.1.8.4.2.0.1.0.0.0.0.2.2.0.0.0.8.2.6.0.6.2.ip6.arpa.
```

---

## DNS Caching and TTL

TTL (Time To Live) on each record controls how long resolvers and clients may cache it:

```
Low TTL (60-300s):  quick propagation after changes; more DNS queries; good for failover
High TTL (3600-86400s): fewer queries; slower propagation; good for stable records

Best practices:
  Before a planned change: lower TTL to 60-300s (wait for caches to expire old value)
  After change: raise TTL back to normal (1-24h)
  Default for most records: 3600 (1 hour)
  SOA minimum (negative cache TTL): 60-300s
```

**Negative caching (RFC 2308):** NXDOMAIN (name doesn't exist) responses are also cached, up to the SOA minimum TTL. This prevents repeated queries for non-existent names.

---

## DNS Transport

```
Default: UDP port 53
  → Query + response fits in one packet (historically ≤512 bytes)
  → No connection overhead
  → Resolver retries on timeout

EDNS0 (RFC 6891): Extension for larger UDP messages (up to 4096+ bytes)
  → Needed for DNSSEC responses, large TXT records
  → OPT pseudo-record signals EDNS support and max payload size

TCP port 53: used when:
  → Response exceeds UDP message size
  → Zone transfers (AXFR/IXFR) — always TCP
  → DNS over TCP is always valid; some firewalls incorrectly block it

DNS over TLS (DoT, RFC 7858): TCP port 853
  → Encrypts DNS queries between stub resolver and recursive resolver
  → Prevents eavesdropping and tampering in transit

DNS over HTTPS (DoH, RFC 8484): HTTPS port 443
  → DNS queries inside HTTPS — indistinguishable from web traffic
  → Used by browsers (Firefox, Chrome) for encrypted DNS
  → Can bypass network-level DNS filtering/logging
```

---

## DNSSEC — DNS Security Extensions

DNSSEC adds cryptographic signatures to DNS records, allowing resolvers to verify that responses came from the legitimate zone owner and haven't been tampered with.

```
Without DNSSEC: a resolver can't tell if a response is legitimate or injected (DNS poisoning)
With DNSSEC:   each record set is signed; the chain of trust runs from root to zone

Chain of Trust:
  Root zone (.) → signed with root KSK (Root DNSSEC key — managed by IANA/ICANN)
  .com zone     → DS record in root zone points to .com's DNSKEY
  example.com   → DS record in .com zone points to example.com's DNSKEY
  Records       → signed with example.com's ZSK (Zone Signing Key)

Key record types:
  DNSKEY — contains the public key
  RRSIG  — signature over a record set
  DS     — hash of child zone's DNSKEY (stored in parent zone)
  NSEC / NSEC3 — proves non-existence of names (authenticated denial)
```

**DNSSEC does NOT encrypt DNS** — it only authenticates. Use DoT/DoH for encryption.

---

## DNS Security Threats

**DNS Cache Poisoning (Kaminsky Attack, 2008):**
```
Attacker races to inject a forged answer into the resolver's cache before
the legitimate response arrives. If successful, clients are redirected to
attacker-controlled IPs.

Defense: DNSSEC, source port randomization (RFC 5452), 0x20 encoding
```

**DNS Amplification DDoS:**
```
Attacker sends small DNS queries with spoofed source IP (victim's IP)
to many open resolvers. Resolvers send large responses to the victim.
Amplification factor: up to 100x (small query → large response).

Defense: BCP 38 (ingress filtering), response rate limiting (RRL), not running open resolvers
```

**DNS Hijacking:**
```
Attacker redirects DNS queries to a malicious resolver (via malware, router compromise,
ISP-level manipulation). Resolver returns wrong answers for legitimate names.

Defense: DoH/DoT to trusted resolver, DNSSEC validation
```

**NXDOMAIN Hijacking:**
```
ISP or DNS provider returns a search page IP instead of NXDOMAIN for non-existent names.
Breaks applications that depend on NXDOMAIN behavior.
```

---

## DNS Configuration — Cisco IOS

```cisco
! Configure DNS on a router
ip domain-name company.local
ip name-server 8.8.8.8 8.8.4.4

! DNS lookup for host resolution (enabled by default)
ip domain-lookup

! Disable DNS lookups (stops router from trying to resolve mistyped commands)
no ip domain-lookup

! Static host entries (local hosts file)
ip host router1 192.168.1.1
ip host switch1 192.168.1.2

! Run DNS proxy on router (forwards queries from clients to real DNS servers)
ip dns server

! Verification
show ip dns view        ! DNS view configuration
show hosts              ! cached hostname resolutions
debug ip dns

! Test resolution from IOS
Router# ping www.example.com  ! IOS resolves the name first
Router# nslookup www.example.com
```

---

## DNS Tools

```bash
# Basic lookup
nslookup example.com              # Windows/Linux — simple query
nslookup example.com 8.8.8.8     # query specific server

# dig — the professional DNS debugging tool (Linux/macOS)
dig example.com                   # A record (default)
dig example.com A                 # explicit A record
dig example.com AAAA              # IPv6 address
dig example.com MX                # mail exchangers
dig example.com NS                # name servers
dig example.com TXT               # TXT records
dig example.com ANY               # all records (often restricted by servers)
dig example.com SOA               # start of authority

dig @8.8.8.8 example.com         # query specific DNS server (8.8.8.8)
dig +short example.com            # terse output (IP only)
dig +trace example.com            # full recursive trace from root (iterative)
dig -x 93.184.216.34             # reverse lookup (PTR record)
dig +dnssec example.com DNSKEY   # DNSSEC key records

# host — simpler alternative to dig
host example.com
host -t MX example.com
host 93.184.216.34               # reverse lookup

# Windows
Resolve-DnsName example.com -Type A
Resolve-DnsName example.com -Type MX -Server 8.8.8.8

# Flush DNS cache
ipconfig /flushdns               # Windows
sudo systemd-resolve --flush-caches   # Linux (systemd)
sudo killall -HUP mDNSResponder  # macOS

# Check what resolver is being used
cat /etc/resolv.conf             # Linux
systemd-resolve --status         # Linux (systemd)
```

---

## Tips

- Low TTLs (60s) during a DNS migration prevent stale cached records from routing users to old servers — but plan ahead, as lowering TTL only takes effect after the old TTL expires.
- CNAME records cannot be used at the zone apex (root of a domain) — `example.com IN CNAME something.else.com` is invalid. Use ALIAS/ANAME records (proprietary) or A records directly.
- DNS round-robin (multiple A records for the same name) provides crude load balancing — the resolver cycles through them. Not a replacement for a real load balancer (no health checking).
- A resolver cache hit answers in microseconds; a full iterative resolution chain takes 50–200ms.
- `dig +trace` is the most useful single DNS debugging command — it shows every step from root to answer.

---

## Summary

- DNS translates names to IPs through a hierarchical, distributed, cached system — root → TLD → authoritative.
- The recursive resolver does the heavy lifting; clients simply ask it and get a final answer.
- TTL controls how long records are cached — lower TTL before making changes; raise it back afterward.
- Key record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (name server), PTR (reverse), TXT (verification/SPF/DKIM), SOA (zone metadata).
- DNSSEC authenticates DNS responses with cryptographic signatures but does not encrypt them.
- DoT (port 853) and DoH (port 443) encrypt DNS transport between stub resolvers and recursive resolvers.
- `dig +trace` and `dig @server name` are essential DNS troubleshooting commands.
