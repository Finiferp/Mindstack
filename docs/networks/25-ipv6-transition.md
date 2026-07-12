---
title: "IPv6 Transition Mechanisms"
sidebar_label: "IPv6 Transition"
sidebar_position: 25
---

# IPv6 Transition Mechanisms

Moving from IPv4 to IPv6 cannot happen instantaneously — the internet and enterprise networks must coexist in mixed states for years. Several mechanisms bridge the two protocol worlds.

---

## Why Transition Is Hard

IPv4 and IPv6 are not backward compatible. An IPv6-only host cannot natively communicate with an IPv4-only host. With IPv4 address exhaustion and billions of IPv4-only devices still in service, networks need strategies to:

1. **Run both simultaneously** (dual stack).
2. **Carry IPv6 traffic across IPv4 infrastructure** (tunneling).
3. **Translate between IPv4 and IPv6** (NAT64/DNS64).

The IETF's general philosophy (RFC 6180) is: dual-stack first, then native IPv6, with translation as a last resort.

---

## Dual Stack

Every device and network element runs **both IPv4 and IPv6 simultaneously**. This is the simplest, most compatible, and recommended approach.

```
Host with dual stack:
  IPv4: 192.168.1.10/24, gateway 192.168.1.1
  IPv6: 2001:db8:1::a/64, gateway fe80::1 (link-local of router)

Application behavior:
  - DNS lookup for "example.com" returns both A (IPv4) and AAAA (IPv6) records
  - Host chooses address per RFC 6724 (default address selection)
  - Prefer IPv6 if available (IPv6 comes first in preference table)
  - "Happy Eyeballs" (RFC 8305): browser tries IPv6 and IPv4 nearly simultaneously,
    uses whichever connects first — hides any IPv6 path issues from users

Router dual-stack:
  - Each interface has IPv4 and IPv6 addresses
  - Runs separate routing tables for IPv4 and IPv6
  - Participates in IPv4 routing (OSPFv2, BGP4) AND IPv6 routing (OSPFv3, BGP4+ MP-BGP)
```

**Pros:** Full functionality, no translation overhead, native performance.
**Cons:** Requires all devices and infrastructure to support IPv6; maintains complexity of managing two protocols.

---

## Tunneling — Carrying IPv6 Over IPv4

When IPv6 islands are separated by IPv4 infrastructure, tunnels encapsulate IPv6 packets inside IPv4.

```
IPv6 Packet → encapsulate in IPv4 → traverse IPv4 network → decapsulate → deliver IPv6

Protocol 41 in IPv4 header = "IPv6 encapsulated in IPv4"
```

### 6in4 (RFC 4213) — Manual / Static Tunnels

Simple, reliable, requires manual configuration at both ends. IPv6 in IPv4 (protocol 41).

```cisco
! Cisco IOS — 6in4 tunnel example
interface Tunnel0
 ipv6 address 2001:db8:1::1/64
 tunnel source GigabitEthernet0/0    ! local IPv4 address
 tunnel destination 198.51.100.2      ! remote tunnel endpoint IPv4 address
 tunnel mode ipv6ip                   ! IPv6 in IPv4
```

**Pros:** Simple, predictable, low overhead.
**Cons:** Manual config at both ends; doesn't scale; both endpoints need public IPv4.

### 6to4 (RFC 3056) — Automatic Tunneling

Embeds the IPv4 address into a special IPv6 prefix: `2002::/16`. The full address is `2002:AABB:CCDD::/48` where AABB:CCDD is the hex encoding of the public IPv4 address.

```
IPv4: 203.0.113.1 = 0xcb00 7101
6to4 prefix: 2002:cb00:7101::/48
Subnets from this: 2002:cb00:7101:0001::/64, 2002:cb00:7101:0002::/64, ...

Tunnel to: 192.88.99.1 (6to4 anycast relay — deprecated by RFC 7526)
```

**Status:** Deprecated (RFC 7526, 2015). Relay infrastructure is unpredictable; security concerns.

### ISATAP (Intra-Site Automatic Tunnel Addressing Protocol, RFC 5214)

Embeds IPv4 within the Interface ID: `::0:5EFE:a.b.c.d` (where a.b.c.d is the IPv4 address). Designed for use within a single organization.

```
IPv4: 10.0.0.5
ISATAP Interface ID: 0000:5EFE:0a00:0005 = 0:5efe:a00:5

With prefix 2001:db8::/32:
  ISATAP address: 2001:db8::5efe:a00:5
```

**Status:** Mostly obsolete; replaced by native dual-stack.

### Teredo (RFC 4380)

Tunnels IPv6 through IPv4 UDP — specifically designed to traverse NAT. Used historically by Windows hosts behind NAT to access IPv6.

```
Teredo prefix: 2001::/32
Address format: 2001:0:server_IP:flags:~client_port:~client_IP
                (~ denotes bitwise complement, to obfuscate)

Teredo server: public IPv4 host that helps clients discover NAT mapping
Teredo relay:  router that connects Teredo clients to native IPv6 internet
```

**Status:** Largely obsolete with native IPv6 and dual stack becoming common. Windows still supports it.

### 6RD — IPv6 Rapid Deployment (RFC 5969)

Operator-managed stateless tunneling. ISP deploys 6RD gateways (BR — Border Relays); CPE devices tunnel to them automatically. Similar to 6to4 but operator-controlled and using ISP's own prefix.

```
ISP assigns: 6rd prefix (e.g. 2001:db8::/32), 6rd prefix length, BR IPv4 addresses
CPE derives its /64 automatically from the 6rd prefix + its IPv4 WAN address
All IPv6 traffic tunneled to BR via IPv4
```

**Status:** Was widely deployed by ISPs (France Telecom, AT&T, Comcast, BT) during 2010–2016 as a quick path to IPv6. Being phased out as native dual-stack becomes standard.

---

## Translation — NAT64 and DNS64

Translation allows IPv6-only hosts to communicate with IPv4-only servers. No IPv4 address required on the client.

### NAT64 (RFC 6146)

A gateway translates between IPv6 and IPv4 packets. The NAT64 gateway maintains state, similar to NAT44.

```
IPv6-only host wants to reach 93.184.216.34 (IPv4 server):

  1. Host does DNS lookup for "example.com"
  2. DNS64 synthesizes AAAA record: 64:ff9b::93.184.216.34  (see below)
  3. Host sends IPv6 packet to 64:ff9b::93.184.216.34
  4. NAT64 gateway translates:
     Src: [host's IPv6] → [gateway's IPv4]
     Dst: 64:ff9b::93.184.216.34 → 93.184.216.34 (strips the /96 prefix)
  5. Returns IPv4 packet, translates response back
```

**Well-Known Prefix:** `64:ff9b::/96` (RFC 6052) — the standard prefix for embedding IPv4 in IPv6. The last 32 bits are the IPv4 address.

```
IPv4 address 93.184.216.34:
In hex: 5db8:d822
NAT64 address: 64:ff9b::5db8:d822  or equivalently  64:ff9b::93.184.216.34
```

**Limitations:**
- Does not work for protocols that embed IP addresses in their payload (FTP, SIP — need ALGs).
- IPv4 literals in URLs/configs break (can't represent IPv4 address as AAAA).
- Stateful — requires a persistent gateway.

### DNS64 (RFC 6147)

Works alongside NAT64. When a client queries for AAAA records and only an A record exists, DNS64 synthesizes a AAAA record using the NAT64 prefix.

```
Client: AAAA lookup for "legacy-server.example.com"
Real DNS: only A record exists (93.184.216.34)
DNS64: synthesizes AAAA → 64:ff9b::93.184.216.34
Client: uses this address → NAT64 translates the packet
```

### Stateless NAT64 (MAP-T, RFC 7599)

Deterministic (no state table) mapping between IPv4 and IPv6. More scalable for ISPs.

---

## 464XLAT (RFC 6877)

Allows IPv4-only applications to work in IPv6-only networks — critical for mobile carriers with large IPv4 application ecosystems.

```
Architecture:
  CLAT (Customer-side translator): on the device (or CPE)
    - Translates IPv4 → IPv6 (using a local 192.0.0.x address for apps)
  PLAT (Provider-side translator): at carrier network (= NAT64)
    - Translates IPv6 → IPv4 for reaching IPv4 internet

Flow:
  IPv4 app → CLAT translates to IPv6 → crosses IPv6-only network → PLAT translates to IPv4
```

**Usage:** Widely deployed by mobile carriers (T-Mobile, AT&T USA, NTT Docomo, SK Telecom). Allows carrier to deploy IPv6-only mobile network while supporting all legacy IPv4 apps.

---

## Transition Strategy in Practice

```
Recommended phasing for an organization:

Phase 1 — Assess and prepare (months 1-3):
  • Inventory all devices for IPv6 support
  • Enable IPv6 on internet perimeter (dual-stack with ISP)
  • Enable AAAA records for public DNS entries

Phase 2 — Dual-stack internal (months 4-12):
  • Deploy IPv6 prefixes (usually get /48 from ISP)
  • Enable IPv6 on routers, switches, firewalls
  • Assign /64 per VLAN
  • Configure RA on each segment (SLAAC + RDNSS or DHCPv6)
  • Update firewall rules for IPv6 traffic
  • Monitor: are users/apps actually preferring IPv6?

Phase 3 — IPv6-first (months 12-24):
  • Applications prefer IPv6
  • IPv4 maintained for legacy systems
  • Begin decommissioning IPv4 where possible

Phase 4 — IPv6-only islands (long-term):
  • Some segments go IPv6-only
  • 464XLAT or NAT64/DNS64 for remaining IPv4 needs
```

---

## Tips

- Never use 6to4 or Teredo in new designs — they're deprecated and unreliable; use native dual-stack or 6RD.
- NAT64 + DNS64 is the right choice for IPv6-only networks that need to reach IPv4 content (mobile carriers use this at scale).
- Firewall policies often forget IPv6 — a host can bypass an "effective" IPv4 firewall policy by communicating over IPv6 if the firewall isn't configured for both.
- Document the IPv6 prefix plan before deploying — changing prefixes later (if the ISP changes) is painful.
- The `Happy Eyeballs` algorithm (RFC 8305) means if IPv6 paths are slow or broken, browsers fall back to IPv4 automatically — so dual-stack deployments tolerate imperfect IPv6 infrastructure.

---

## Summary

- Dual stack (both IPv4 and IPv6 simultaneously) is the primary and recommended transition mechanism.
- Tunneling (6in4, 6RD) carries IPv6 over IPv4 infrastructure — useful for connecting IPv6 islands across IPv4 WANs.
- NAT64 + DNS64 allows IPv6-only hosts to reach IPv4-only services — the ISP/carrier deploys NAT64, DNS64 synthesizes AAAA records.
- 464XLAT lets IPv4-only applications run in IPv6-only mobile networks — CLAT on device + PLAT (NAT64) at the carrier.
- 6to4 and Teredo are deprecated — avoid in any new design.
- Firewalls and ACLs must explicitly address IPv6 — IPv6 is often accidentally "open" in IPv4-centric firewall policies.
