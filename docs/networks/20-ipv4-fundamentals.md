---
title: "IPv4 Fundamentals"
sidebar_label: "IPv4 Fundamentals"
sidebar_position: 20
---

# IPv4 Fundamentals

IPv4 (Internet Protocol version 4) is the primary addressing protocol of the internet. First defined in RFC 791 (1981), its 32-bit address space was designed for a world where fewer than 1,000 hosts were connected. Today every aspect of IPv4 — routing, addressing, NAT, and its eventual replacement by IPv6 — is shaped by the tension between that original design and the billion-device internet it now underpins.

---

## History and Design Philosophy

The IP protocol grew out of ARPANET research in the 1970s. Vint Cerf and Bob Kahn published the foundational TCP/IP paper in 1974; TCP and IP were then separated in 1978. RFC 791 standardized IPv4 in September 1981.

Key design decisions that still resonate:
- **Connectionless** — each packet is routed independently; no circuit setup required.
- **Best-effort delivery** — the network does not guarantee delivery, order, or timing. Reliability is delegated to transport (TCP).
- **End-to-end principle** — intelligence sits at endpoints (hosts), not in the network core.
- **32-bit addresses** — seemed vast at the time (~4.3 billion addresses); exhausted by 2011 (IANA) / 2019 (RIPE NCC for Europe).

---

## IPv4 Header Format

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 ├───────┼───────┼────────────────────────────────────────────────┤
 │Version│  IHL  │  DSCP / ECN   │          Total Length          │
 ├───────┴───────┼───────────────┴────────────────────────────────┤
 │         Identification        │Flags│    Fragment Offset       │
 ├───────────────┼───────────────┼────────────────────────────────┤
 │  Time to Live │   Protocol    │         Header Checksum        │
 ├───────────────┴───────────────┴────────────────────────────────┤
 │                       Source IP Address                        │
 ├────────────────────────────────────────────────────────────────┤
 │                    Destination IP Address                      │
 ├────────────────────────────────────────────────────────────────┤
 │                    Options (if IHL > 5)                        │
 └────────────────────────────────────────────────────────────────┘
```

| Field | Size | Description |
|---|---|---|
| Version | 4 bits | Always 0100 (4) for IPv4 |
| IHL | 4 bits | Internet Header Length in 32-bit words; minimum 5 (=20 bytes), max 15 (=60 bytes) |
| DSCP | 6 bits | Differentiated Services Code Point — QoS marking |
| ECN | 2 bits | Explicit Congestion Notification |
| Total Length | 16 bits | Entire packet length in bytes (header + data); max 65,535 |
| Identification | 16 bits | Fragment reassembly — fragments of same datagram share this ID |
| Flags | 3 bits | Bit 0: reserved; Bit 1: DF (Don't Fragment); Bit 2: MF (More Fragments) |
| Fragment Offset | 13 bits | Position of this fragment in the original datagram (in 8-byte units) |
| TTL | 8 bits | Decremented by 1 at each router; drops to 0 → ICMP Time Exceeded sent back |
| Protocol | 8 bits | Upper-layer protocol: 6=TCP, 17=UDP, 1=ICMP, 89=OSPF, 47=GRE |
| Header Checksum | 16 bits | Checksum of the header only (not data); recomputed at every hop (TTL changes) |
| Source IP | 32 bits | Sender's IPv4 address |
| Destination IP | 32 bits | Recipient's IPv4 address |
| Options | 0–40 bytes | Rarely used (timestamps, route recording, source routing) |

---

## IPv4 Address Structure

An IPv4 address is 32 bits, written in **dotted-decimal notation** — four octets (0–255) separated by dots.

```
Address:   192.168.10.100
Binary:    11000000.10101000.00001010.01100100
           └──────────────┘ └─────────────────┘
              Network part       Host part
           (defined by subnet mask)
```

### Address Classes (Historic, Pre-CIDR)

Classful addressing divided the 32-bit space into fixed blocks. Superseded by CIDR in 1993 but still referenced in terminology.

| Class | Leading Bits | First Octet Range | Default Mask | Purpose |
|---|---|---|---|---|
| A | 0xxx xxxx | 1–126 | /8 (255.0.0.0) | Large orgs (~16M hosts each) |
| B | 10xx xxxx | 128–191 | /16 (255.255.0.0) | Medium orgs (~65K hosts each) |
| C | 110x xxxx | 192–223 | /24 (255.255.255.0) | Small orgs (254 hosts each) |
| D | 1110 xxxx | 224–239 | — | Multicast |
| E | 1111 xxxx | 240–255 | — | Reserved/Experimental |

Note: 127.x.x.x is reserved for loopback (localhost); 0.x.x.x is "this network."

### CIDR — Classless Inter-Domain Routing (1993)

RFC 1519 introduced CIDR, replacing the rigid class system. The prefix length (e.g. `/24`) explicitly defines how many bits are the network portion.

```
192.168.1.0/24
             ↑ 24 bits are network; 8 bits are host
```

CIDR enabled:
1. **Route aggregation (supernetting)** — summarize many small routes into one advertisement.
2. **Variable-length subnet masks (VLSM)** — allocate exactly the right size per subnet.
3. **Slowed address exhaustion** — more efficient allocation than classful waste.

---

## Special and Reserved Addresses (RFC 5735 / 6890)

| Range | Purpose |
|---|---|
| 0.0.0.0/8 | "This" network; 0.0.0.0 = unspecified/any |
| 10.0.0.0/8 | Private (RFC 1918) |
| 100.64.0.0/10 | Shared address space (CGNAT, RFC 6598) |
| 127.0.0.0/8 | Loopback (127.0.0.1 = localhost) |
| 169.254.0.0/16 | Link-local / APIPA — autoconfigured when DHCP fails |
| 172.16.0.0/12 | Private (RFC 1918): 172.16.0.0–172.31.255.255 |
| 192.0.0.0/24 | IETF Protocol Assignments |
| 192.0.2.0/24 | TEST-NET-1 (documentation, never route) |
| 192.88.99.0/24 | 6to4 relay (historic, RFC 7526) |
| 192.168.0.0/16 | Private (RFC 1918) |
| 198.18.0.0/15 | Benchmarking (RFC 2544) |
| 198.51.100.0/24 | TEST-NET-2 (documentation) |
| 203.0.113.0/24 | TEST-NET-3 (documentation) |
| 224.0.0.0/4 | Multicast (Class D) |
| 240.0.0.0/4 | Reserved/Experimental |
| 255.255.255.255/32 | Limited broadcast |

### Private Ranges (RFC 1918) — Not Routable on the Public Internet

```
10.0.0.0/8        — 10.0.0.0 to 10.255.255.255    (16,777,216 addresses)
172.16.0.0/12     — 172.16.0.0 to 172.31.255.255  (1,048,576 addresses)
192.168.0.0/16    — 192.168.0.0 to 192.168.255.255 (65,536 addresses)
```

These are freely usable internally; ISPs drop packets destined for these ranges.

---

## Subnet Mask

The **subnet mask** separates network bits (1s) from host bits (0s).

```
IP:   192.168.1.100  =  11000000.10101000.00000001.01100100
Mask: 255.255.255.0  =  11111111.11111111.11111111.00000000
AND: ─────────────────────────────────────────────────────────
Net:  192.168.1.0    =  11000000.10101000.00000001.00000000

Network address:  192.168.1.0   (all host bits = 0)  — identifies the subnet
Broadcast address:192.168.1.255 (all host bits = 1)  — sent to all hosts in subnet
Usable hosts:     192.168.1.1 – 192.168.1.254         (256 − 2 = 254 hosts)
```

### CIDR Prefix ↔ Subnet Mask Conversion

| CIDR | Subnet Mask | # IPs | Usable Hosts |
|---|---|---|---|
| /8 | 255.0.0.0 | 16,777,216 | 16,777,214 |
| /16 | 255.255.0.0 | 65,536 | 65,534 |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |
| /31 | 255.255.255.254 | 2 | 2* |
| /32 | 255.255.255.255 | 1 | 1 (host route) |

**/31** (RFC 3021): two addresses, both usable as point-to-point link endpoints (no network/broadcast addresses needed).
**/32** identifies a single host — used for loopbacks and host routes.

---

## Calculating Network, Broadcast, and Host Range

**Formula:**
1. Convert mask to prefix length (count the 1-bits).
2. Network address = IP AND mask (bitwise).
3. Broadcast = Network address OR (inverted mask).
4. First host = Network + 1.
5. Last host = Broadcast − 1.
6. Host count = 2^(32-prefix) − 2.

**Example:** `172.16.45.14/20`

```
Prefix /20 → mask = 255.255.240.0 = 11111111.11111111.11110000.00000000

IP:    172.16.45.14  = 10101100.00010000.00101101.00001110
Mask:  255.255.240.0 = 11111111.11111111.11110000.00000000
AND:                   10101100.00010000.00100000.00000000 = 172.16.32.0

Network:   172.16.32.0
Broadcast: 172.16.47.255   (flip host bits: 00001111.11111111)
First host:172.16.32.1
Last host: 172.16.47.254
# Hosts:   2^12 − 2 = 4,094
```

---

## Packet Forwarding Logic (What a Router Does)

```
1. Receive packet, check destination IP
2. Look up in routing table — longest prefix match wins
3. If match found:
     a. Decrement TTL; if TTL == 0 → discard + send ICMP Time Exceeded to source
     b. Recompute header checksum
     c. Forward out correct interface (or drop if no route)
4. If no route → send ICMP Destination Unreachable to source (or drop)
```

Longest-prefix match: `192.168.1.100` matches both `192.168.1.0/24` and `192.168.0.0/16` — the router picks `/24` because it is more specific.

---

## ICMP — Internet Control Message Protocol

ICMP (RFC 792) is IPv4's diagnostic and error-reporting companion — Protocol 1 in the IP header.

| Type | Code | Message |
|---|---|---|
| 0 | 0 | Echo Reply (ping reply) |
| 3 | 0 | Destination Unreachable — Net |
| 3 | 1 | Destination Unreachable — Host |
| 3 | 3 | Destination Unreachable — Port |
| 3 | 4 | Destination Unreachable — Fragmentation Needed (DF bit set) |
| 5 | — | Redirect |
| 8 | 0 | Echo Request (ping) |
| 11 | 0 | Time Exceeded — TTL exceeded in transit (traceroute mechanism) |
| 11 | 1 | Time Exceeded — Fragment reassembly timeout |
| 12 | — | Parameter Problem |

```
# Ping — sends ICMP Echo Request, receives Echo Reply
ping 8.8.8.8

# Traceroute — sends packets with incrementing TTL; each router that drops
# TTL=0 sends back ICMP Time Exceeded, revealing that hop's address
traceroute 8.8.8.8   (Unix/Linux)
tracert 8.8.8.8      (Windows)
```

---

## Tips

- The subnet mask and IP address must be ANDed bit-by-bit to find the network address — the decimal shortcut: in the "interesting" octet, align to the block size (256 − mask octet).
- /31 links save addresses on point-to-point WAN links between routers — widely supported since RFC 3021 (2001).
- Never use TEST-NET ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) in real configs — they appear in all RFCs/docs and will confuse troubleshooting.
- Blocking ICMP entirely in firewalls breaks Path MTU Discovery (PMTUD) — always permit ICMP Type 3, Code 4 (Fragmentation Needed).
- DSCP markings (the top 6 bits of the old ToS byte) are the standard for QoS across routed networks — set at the ingress, trust at the boundary.

---

## Summary

- IPv4 uses 32-bit addresses in dotted-decimal notation; the prefix length (CIDR) defines the network vs. host boundary.
- The header's TTL field prevents packets from looping forever; traceroute exploits it for path discovery.
- RFC 1918 private ranges (10/8, 172.16/12, 192.168/16) are not routable on the public internet and require NAT to reach it.
- Network address (all host bits 0) and broadcast address (all host bits 1) are reserved — usable hosts = 2^host_bits − 2.
- Longest-prefix match is the routing lookup rule: the most specific route (highest prefix length) wins.
- CIDR replaced classful addressing in 1993 — enabling route aggregation, VLSM, and dramatically more efficient use of the address space.
