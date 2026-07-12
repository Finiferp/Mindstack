---
title: "IPv6 Fundamentals"
sidebar_label: "IPv6 Fundamentals"
sidebar_position: 23
---

# IPv6 Fundamentals

IPv6 is the successor to IPv4, designed to solve address exhaustion and to simplify many aspects of IP networking. With 128-bit addresses, IPv6 provides 340 undecillion (3.4 × 10^38) addresses — enough for every grain of sand on Earth to have its own address, with plenty to spare.

---

## History and Motivation

By the early 1990s, it was clear IPv4's 32-bit space would run out. The IETF formed the "IP: The Next Generation" (IPng) working group in 1993. After evaluating several proposals, **IPv6** (then called "Simple Internet Protocol Plus" or SIPP) was selected and published as RFC 1883 in 1995, updated to RFC 2460 in 1998, and refined continuously.

Key drivers:
- **Address exhaustion** — IANA's free pool depleted February 2011; APNIC first regional depletion April 2011.
- **NAT elimination** — IPv6 provides enough addresses for true end-to-end connectivity without NAT.
- **Simplified header** — fixed-length 40-byte header (vs. variable IPv4); no header checksum (offloaded to upper layers); options moved to extension headers.
- **Stateless autoconfiguration (SLAAC)** — devices configure their own addresses without DHCP.
- **Mandatory IPsec** — originally required; now optional in practice but designed in from the start.
- **Mobility support** — Mobile IPv6 is cleaner than IPv4 Mobile IP.

---

## IPv6 Address Format

IPv6 addresses are **128 bits**, written as **eight groups of four hexadecimal digits** separated by colons.

```
Full:      2001:0db8:0000:0000:0000:ff00:0042:8329
           ──── ──── ──── ──── ──── ──── ──── ────
           each group = 16 bits = 4 hex digits
```

### Simplification Rules

**Rule 1:** Leading zeros within each group may be omitted.
```
2001:0db8:0000:0000:0000:ff00:0042:8329
→   2001:db8:0:0:0:ff00:42:8329
```

**Rule 2:** One (and only one) consecutive sequence of all-zero groups may be replaced with `::`.
```
2001:db8:0:0:0:ff00:42:8329
→   2001:db8::ff00:42:8329
```

**Both rules together:**
```
Full:       2001:0db8:0000:0000:0000:ff00:0042:8329
Compressed: 2001:db8::ff00:42:8329
```

**`::` can only appear ONCE** — otherwise it would be ambiguous how many groups each `::` expands to.

```
Wrong: 2001::db8::1   (two ::, ambiguous)
Right: 2001::db8:0:0:0:1   (only one ::)
```

### Loopback and Unspecified

```
::1             — loopback (equivalent to 127.0.0.1; all zeros except last bit)
::              — unspecified (0:0:0:0:0:0:0:0; equivalent to 0.0.0.0)
```

---

## IPv6 Header Format

The IPv6 header is fixed at **40 bytes** (vs. IPv4's 20–60 bytes). Complexity is moved to extension headers.

```
 ├───────────────────────────────────────────────────────────────────┤
 │  Ver(4) │ Traffic Class(8) │           Flow Label(20)             │ (32 bits)
 ├───────────────────────────────────────────────────────────────────┤
 │       Payload Length(16)        │  Next Header(8)  │  Hop Limit(8)│ (32 bits)
 ├───────────────────────────────────────────────────────────────────┤
 │                                                                   │
 │                    Source Address (128 bits)                      │
 │                                                                   │
 ├───────────────────────────────────────────────────────────────────┤
 │                                                                   │
 │                  Destination Address (128 bits)                   │
 │                                                                   │
 └───────────────────────────────────────────────────────────────────┘
```

| Field | Size | Description |
|---|---|---|
| Version | 4 bits | Always `0110` (6) |
| Traffic Class | 8 bits | Equivalent to IPv4 DSCP+ECN — QoS marking |
| Flow Label | 20 bits | Identifies a flow for special handling (QoS, load balancing) |
| Payload Length | 16 bits | Length of everything after the header (extension headers + data) |
| Next Header | 8 bits | Type of the next header: 6=TCP, 17=UDP, 58=ICMPv6, 43=Routing Header, 0=Hop-by-Hop |
| Hop Limit | 8 bits | Equivalent to IPv4 TTL; decremented by 1 at each router; 0 → drop |
| Source Address | 128 bits | Sender's IPv6 address |
| Destination Address | 128 bits | Recipient's IPv6 address |

**Fields removed vs. IPv4:**
- No header checksum (upper-layer checksums now mandatory; hardware is fast enough)
- No fragmentation fields (fragmentation is handled by source only, via extension headers)
- No IHL (header is fixed length)
- No options (replaced by extension headers)

### Extension Headers

Extension headers chain between the fixed header and the upper-layer payload. Processed only by the destination (mostly), not intermediate routers.

```
IPv6 Header (Next Header = 43: Routing Header)
  → Routing Header (Next Header = 60: Destination Options)
    → Destination Options (Next Header = 6: TCP)
      → TCP Segment + Data
```

Common extension headers:
| Next Header Value | Extension Header |
|---|---|
| 0 | Hop-by-Hop Options (inspected by EVERY router) |
| 43 | Routing Header (source routing) |
| 44 | Fragment Header |
| 50 | ESP (IPsec Encapsulating Security Payload) |
| 51 | AH (IPsec Authentication Header) |
| 60 | Destination Options |
| 135 | Mobility Header |

---

## IPv6 Address Types

| Type | Scope | Starts With | Description |
|---|---|---|---|
| Unicast | — | Various | One-to-one delivery |
| Multicast | — | `ff00::/8` | One-to-many; replaces broadcast |
| Anycast | — | (any unicast) | One-to-nearest (same address on multiple nodes) |
| **No broadcast in IPv6** | — | — | Broadcast is eliminated; multicast replaces it |

### Unicast Address Types

**Global Unicast (GUA)** — routable on the public internet:
```
Range: 2000::/3 (all addresses starting with 001 in binary)
Currently allocated from 2000:: through 3fff::
Example: 2001:db8::1  (2001:db8::/32 is documentation/example range)
```

**Link-Local** — auto-configured, valid only on a single link, never routed:
```
Range: fe80::/10
Format: fe80::[EUI-64 or random interface ID]
Every IPv6 interface MUST have a link-local address before any other communication
Used by: NDP, routing protocol neighbor relationships, SLAAC RA/RS
Example: fe80::1%eth0  (the %eth0 is the zone ID — identifies the interface)
```

**Unique Local (ULA)** — private, not routable on internet (similar to RFC 1918):
```
Range: fc00::/7 (includes fc00::/8 and fd00::/8)
In practice: fd00::/8 is used (the L bit is set)
Format: fdXX:XXXX:XXXX::/48 where X is randomly generated Global ID
Example: fd12:3456:789a:1::/64
```

**Loopback:**
```
::1/128
```

**Unspecified:**
```
::/128 — used in source field before address assignment
```

**IPv4-mapped IPv6:**
```
::ffff:0:0/96 — represents IPv4 addresses inside IPv6 socket APIs
::ffff:192.168.1.1 — maps 192.168.1.1
```

### Multicast Addresses

```
ff02::1   — All nodes (link-local)
ff02::2   — All routers (link-local)
ff02::5   — All OSPFv3 routers
ff02::6   — All OSPFv3 DRs
ff02::9   — All RIP routers
ff02::a   — All EIGRP routers
ff02::d   — All PIM routers
ff02::1:2 — All DHCP relay agents (link-local)
ff05::1:3 — All DHCP servers (site-local)

ff02::1:ffXX:XXXX — Solicited-node multicast (key for NDP — see file 27)
```

**Multicast scope field** (4 bits after ff):
```
ff01:: — interface-local (loopback only)
ff02:: — link-local (same link)
ff05:: — site-local (organization)
ff08:: — organization-local
ff0e:: — global
```

---

## Interface Identifiers and EUI-64

The last 64 bits of an IPv6 address are the **Interface ID**. The classic method to generate one from a MAC address is **EUI-64**:

```
MAC address:  00:1A:2B:3C:4D:5E   (48 bits)

Step 1: Split in half:
  00:1A:2B   |   3C:4D:5E

Step 2: Insert ff:fe in the middle:
  00:1A:2B:FF:FE:3C:4D:5E   (64 bits)

Step 3: Flip the U/L bit (bit 7 of first byte, 0-indexed):
  00 = 0000 0000  → flip bit 7 → 0000 0010 = 02
  Result: 02:1A:2B:FF:FE:3C:4D:5E

Step 4: Write as IPv6 groups:
  021A:2BFF:FE3C:4D5E

Combined with /64 prefix (e.g. 2001:db8:1:1::/64):
  2001:db8:1:1:021a:2bff:fe3c:4d5e
```

**Privacy concern:** EUI-64 embeds the device's MAC address — allows device tracking across networks. RFC 4941 **Privacy Extensions** generates a random Interface ID instead, and modern OSes use this by default.

---

## IPv6 Prefix Notation

IPv6 uses CIDR-style prefix notation, but by convention subnets are almost always `/64`:

```
2001:db8:1::/48     — a typical ISP allocation to a customer (65,536 /64 subnets)
2001:db8:1:1::/64   — a typical LAN subnet
2001:db8:1:1::1/128 — a host route (single address)
::/0                 — default route (equivalent to 0.0.0.0/0 in IPv4)
```

**Why always /64?** SLAAC requires exactly 64 bits for the Interface ID (EUI-64 and privacy extensions both produce 64-bit IDs). Subnets smaller than /64 break SLAAC.

---

## IPv6 vs IPv4 — Key Differences

| Feature | IPv4 | IPv6 |
|---|---|---|
| Address length | 32 bits | 128 bits |
| Address notation | Dotted-decimal | Colon-hex |
| Header size | 20–60 bytes (variable) | 40 bytes (fixed) |
| Header checksum | Yes | No |
| Fragmentation | Routers and source | Source only |
| Broadcast | Yes | No (multicast instead) |
| ARP | Yes (separate protocol) | No — NDP (ICMPv6) replaces it |
| Autoconfiguration | DHCP (stateful) | SLAAC (stateless) + DHCPv6 |
| IPsec | Optional | Designed in (optional in practice) |
| NAT | Common | Not needed (not recommended) |
| Loopback | 127.0.0.1 | ::1 |

---

## Tips

- `::` can only appear once in an address — when expanding it, count colons to figure out how many zero groups it represents.
- Every IPv6 interface automatically gets a link-local address (`fe80::/10`) — this happens before any other config and is required for NDP.
- Routers do NOT forward link-local addresses (`fe80::`) — they are scoped to one link only.
- The documentation prefix `2001:db8::/32` (RFC 3849) should appear in examples and docs — never route it in production.
- ULA (`fd00::/8`) is the IPv6 equivalent of RFC 1918 private ranges, but unlike RFC 1918, ULA is globally unique (the random Global ID makes collision probability negligible).

---

## Summary

- IPv6 uses 128-bit addresses in colon-hexadecimal notation; the `::` shorthand compresses one consecutive run of all-zero groups.
- The fixed 40-byte IPv6 header removes checksum, fragmentation fields, and options — complexity moves to extension headers.
- Address types: Global Unicast (GUA, internet-routable), Link-Local (`fe80::/10`, single-link), Unique Local (ULA, `fd00::/8`, private), Loopback (`::1`).
- There is no broadcast in IPv6 — multicast (`ff00::/8`) replaces all broadcast functions.
- EUI-64 embeds the MAC address into the Interface ID; Privacy Extensions generate random IDs instead.
- Subnets are conventionally /64 — smaller subnets break SLAAC.
