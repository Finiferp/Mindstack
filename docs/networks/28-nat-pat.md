---
title: "NAT and PAT"
sidebar_label: "NAT & PAT"
sidebar_position: 28
---

# NAT and PAT — Network Address Translation

NAT translates IP addresses as packets cross a router boundary. It was invented as a stopgap for IPv4 exhaustion — one public IP can represent hundreds or thousands of private-addressed hosts. Today NAT is ubiquitous: every home router does it.

---

## Why NAT Exists

RFC 1918 defines private address ranges that are not routed on the public internet. A host at `192.168.1.10` cannot directly communicate with `8.8.8.8` because:

1. `192.168.1.10` is a private address — ISP routers drop packets to/from it.
2. The destination (`8.8.8.8`) has no route back to `192.168.1.10`.

NAT solves this by translating the private source address to a public one as packets leave, and reversing the translation when packets return.

NAT was described in RFC 1631 (1994) and became widespread by the mid-1990s alongside the home internet boom.

---

## NAT Terminology

| Term | Cisco Meaning | Simple Description |
|---|---|---|
| Inside Local | Private IP of the internal host | The real IP of your PC |
| Inside Global | Public IP representing the internal host | What the internet sees |
| Outside Global | IP of the external destination server | The real IP of the server |
| Outside Local | IP of the external server as seen from inside | Usually same as Outside Global |
| Inside Interface | Router interface connected to private network | LAN interface |
| Outside Interface | Router interface connected to internet | WAN interface |

---

## Static NAT — One-to-One Mapping

One inside local address always maps to one specific inside global address. Used for servers that must be reachable from the internet with a fixed IP.

```
Inside Local   ←→   Inside Global
192.168.1.10   ←→   203.0.113.10  (always, bidirectionally)
```

```cisco
! Configure static NAT
ip nat inside source static 192.168.1.10 203.0.113.10

! Mark interfaces
interface GigabitEthernet0/0
 ip nat inside

interface GigabitEthernet0/1
 ip nat outside

! Verification
show ip nat translations
show ip nat statistics
debug ip nat
```

**Use case:** Web server, mail server, FTP server — anything that must be consistently reachable from the internet at a fixed public IP.

---

## Dynamic NAT — Pool-Based Mapping

Maps inside local addresses to inside global addresses from a pool. Connections fail if the pool is exhausted. Not commonly used — PAT is almost always preferred.

```
Pool: 203.0.113.10 – 203.0.113.20
Host 192.168.1.5 → assigned 203.0.113.10 (first available)
Host 192.168.1.6 → assigned 203.0.113.11
...
21st host → no pool address available → connection fails!
```

```cisco
! Define the public IP pool
ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.240

! ACL identifying inside hosts to translate
ip access-list standard NAT_INSIDE
 permit 192.168.1.0 0.0.0.255

! Link ACL to pool
ip nat inside source list NAT_INSIDE pool PUBLIC_POOL

interface GigabitEthernet0/0
 ip nat inside
interface GigabitEthernet0/1
 ip nat outside
```

---

## PAT — Port Address Translation (NAT Overload)

PAT is the overwhelming majority of real-world NAT. Many inside local addresses share a single inside global address, distinguished by unique source port numbers.

```
Inside Local          Source Port   Inside Global      Translated Port
192.168.1.5:12345   ──────────────► 203.0.113.1:40001
192.168.1.6:44321   ──────────────► 203.0.113.1:40002
192.168.1.7:55123   ──────────────► 203.0.113.1:40003
...thousands more   ──────────────► 203.0.113.1:XXXXX

Return traffic to 203.0.113.1:40002 maps back to 192.168.1.6:44321
```

The NAT translation table tracks: inside local IP:port ↔ inside global IP:port ↔ outside global IP:port.

```cisco
! PAT using the outside interface's IP (most common)
ip access-list standard NAT_CLIENTS
 permit 192.168.0.0 0.0.255.255

ip nat inside source list NAT_CLIENTS interface GigabitEthernet0/1 overload
! "overload" keyword = PAT

interface GigabitEthernet0/0
 ip nat inside
interface GigabitEthernet0/1
 ip nat outside

! PAT with a pool (multiple public IPs, each used for ~65K sessions)
ip nat pool PAT_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.240
ip nat inside source list NAT_CLIENTS pool PAT_POOL overload
```

### PAT Port Capacity

```
TCP/UDP port range: 1–65535
Reserved: 1–1023 (well-known)
NAT typically uses: 1024–65535 = 64,512 ports per protocol
Per single IP: ~65K simultaneous TCP + ~65K simultaneous UDP sessions
Total per IP: ~130K concurrent sessions

With a /24 pool (254 IPs): ~33 million concurrent sessions
```

---

## NAT Translation Table

```
show ip nat translations

Pro Inside global     Inside local       Outside local      Outside global
tcp 203.0.113.1:40001 192.168.1.5:12345 8.8.8.8:443       8.8.8.8:443
tcp 203.0.113.1:40002 192.168.1.6:44321 8.8.8.8:443       8.8.8.8:443
tcp 203.0.113.1:40003 192.168.1.7:55123 93.184.216.34:80  93.184.216.34:80
---  203.0.113.10      192.168.1.10      ---                ---  (static NAT)

show ip nat statistics
  Total active translations: 3 (1 static, 2 dynamic; 2 extended)
  Peak translations: 100
  Outside interfaces: GigabitEthernet0/1
  Inside interfaces: GigabitEthernet0/0
  Hits: 12847  Misses: 0

clear ip nat translation *          ! clear all dynamic entries
clear ip nat translation tcp ...    ! clear specific entry
```

---

## NAT and Port Forwarding

**Port forwarding** (also called Destination NAT / DNAT) allows inbound connections to reach a specific inside server — the internet sends to a public IP:port, NAT translates to a private IP:port.

```cisco
! Port forward: external TCP/443 → internal 192.168.1.10:443
ip nat inside source static tcp 192.168.1.10 443 203.0.113.1 443

! Web server on non-standard internal port
ip nat inside source static tcp 192.168.1.10 8080 203.0.113.1 80

! Multiple services on different internal hosts
ip nat inside source static tcp 192.168.1.20 22  203.0.113.1 2222  ! SSH on port 2222
ip nat inside source static tcp 192.168.1.30 3389 203.0.113.1 3389  ! RDP

! DMZ (all traffic to a specific IP forwarded to one host)
ip nat inside source static 192.168.1.100 203.0.113.50  ! full static NAT for DMZ server
```

---

## Carrier-Grade NAT (CGNAT)

As ISPs ran out of IPv4 addresses, they began applying NAT at the ISP level — **CGNAT** (also known as Large Scale NAT or LSN).

```
Home User → Home Router (NAT: 192.168.x.x → 100.x.x.x) → ISP CGNAT → Internet
                          ↑                                  ↑
                    First NAT (home)              Second NAT (ISP)

RFC 6598 defines 100.64.0.0/10 as "Shared Address Space" for CGNAT:
  100.64.0.0 – 100.127.255.255 (4 million addresses)
  Used between subscriber CPE and ISP CGNAT devices
  Not routable on public internet
```

**CGNAT problems:**
- Double NAT makes troubleshooting very difficult.
- Breaks applications that embed IP addresses in payload (SIP, FTP, some games).
- Shared public IP means security logs point to CGNAT IP, not individual subscriber.
- Port numbers must be carefully allocated to avoid exhaustion across all subscribers.
- Many hosting/gaming services block CGNAT IP ranges.

---

## NAT64 (Brief — Detailed in File 25)

Translates between IPv6 and IPv4 — allows IPv6-only hosts to reach IPv4 servers.

```
IPv6 host → packet to 64:ff9b::93.184.216.34 → NAT64 router → IPv4 host at 93.184.216.34
```

---

## NAT Limitations and Problems

```
1. Breaks end-to-end connectivity
   → Hosts behind NAT cannot accept unsolicited inbound connections
   → Workarounds: port forwarding, UPnP, STUN, TURN, ICE (WebRTC)

2. Breaks protocols with embedded IP addresses
   → FTP (PORT command contains IP:port in payload)
   → SIP/VoIP (SDP contains IP addresses)
   → Fix: Application Layer Gateways (ALG) in NAT device, or STUN/TURN

3. IPsec in tunnel mode
   → Changes IP addresses → breaks AH authentication (AH protects outer header)
   → Fix: NAT Traversal (NAT-T, RFC 3947) — encapsulates IPsec in UDP/4500

4. Translation table state
   → NAT router must maintain state for every session
   → State lost on reboot → all connections drop
   → High-availability NAT requires session synchronization between redundant devices

5. Logging complexity
   → Many subscribers share one IP → logs show public IP, not actual client
   → ISPs must log {public IP, port, timestamp} to identify subscriber
   → Privacy vs. legal compliance tension

6. Breaks peer-to-peer applications
   → BitTorrent, gaming, VoIP — all need inbound connections or direct peer paths
   → NAT traversal techniques (STUN, hole-punching) are complex
```

---

## Cisco IOS NAT — Full Reference

```cisco
! ── Configure NAT interfaces ─────────────────────────────────────
interface GigabitEthernet0/0
 description LAN
 ip address 192.168.1.1 255.255.255.0
 ip nat inside

interface GigabitEthernet0/1
 description WAN
 ip address dhcp
 ip nat outside

! ── PAT (most common) ─────────────────────────────────────────────
ip access-list standard RFC1918
 permit 10.0.0.0 0.255.255.255
 permit 172.16.0.0 0.15.255.255
 permit 192.168.0.0 0.0.255.255

ip nat inside source list RFC1918 interface GigabitEthernet0/1 overload

! ── Static NAT (server publishing) ──────────────────────────────
ip nat inside source static 192.168.1.100 203.0.113.100

! ── Port forwarding ──────────────────────────────────────────────
ip nat inside source static tcp 192.168.1.100 80  203.0.113.1 80
ip nat inside source static tcp 192.168.1.100 443 203.0.113.1 443
ip nat inside source static udp 192.168.1.50  53  203.0.113.1 53

! ── Verification ─────────────────────────────────────────────────
show ip nat translations
show ip nat translations verbose
show ip nat statistics
clear ip nat translation *
debug ip nat           ! (use with care in production)
debug ip nat detailed
```

---

## Tips

- When configuring PAT with a DHCP-assigned WAN IP, use `interface <WAN> overload` — not a pool — so NAT updates automatically when DHCP renews the IP.
- The `ip helper-address` and NAT on the same interface can conflict — understand the packet flow order (NAT happens before/after routing depending on direction).
- NAT ALGs for SIP/FTP can cause more problems than they solve in complex deployments — use STUN/TURN or move applications behind a session border controller.
- In troubleshooting: `show ip nat translations` shows active state; `show ip nat statistics` shows hit/miss counts — a high miss count suggests traffic matching the NAT ACL is reaching the router but failing translation.
- CGNAT deploys 100.64.0.0/10 between CPE and CGNAT device — if you see this range in traceroutes, you're behind CGNAT.

---

## Summary

- Static NAT: one-to-one permanent mapping — for servers reachable from the internet.
- Dynamic NAT: one-to-one from a pool — rarely used; PAT is almost always preferred.
- PAT (NAT overload): many-to-one using port numbers — the standard for home/office internet.
- NAT translation table tracks the full 5-tuple (proto, inside IP, inside port, outside IP, outside port).
- Port forwarding (static PAT) allows inbound connections to specific internal servers.
- NAT breaks end-to-end connectivity, embedded-IP protocols, and some security mechanisms — IPv6 is the long-term solution.
- CGNAT (100.64.0.0/10) adds a second layer of NAT at the ISP — doubles problems, required by IPv4 exhaustion.
