---
title: "IPv6 Addressing — Deep Dive"
sidebar_label: "IPv6 Addressing Deep"
sidebar_position: 24
---

# IPv6 Addressing — Deep Dive

This page covers SLAAC, DHCPv6, address assignment flows, IPv6 subnetting, and the full scope of multicast address allocation.

---

## SLAAC — Stateless Address Autoconfiguration (RFC 4862)

SLAAC is IPv6's killer feature: a host can configure its own globally routable address without a DHCP server, by combining a prefix advertised by the router with a locally generated Interface ID.

### The SLAAC Flow

```
Host boots up:
  1. Host generates link-local address: fe80::[Interface ID]
  2. Host performs Duplicate Address Detection (DAD) — sends NS, waits for 1s
     → if no NA reply → address is unique → assigns link-local
  3. Host sends Router Solicitation (RS) to ff02::2 (all routers)
  4. Router sends Router Advertisement (RA) to ff02::1 (all nodes)
     RA contains:
       • Network prefix(es) (e.g. 2001:db8:1::/64) with L and A flags
       • Prefix lifetime (valid, preferred)
       • Default gateway = router's link-local address
       • Other config flags (M flag, O flag)
  5. Host generates Interface ID (EUI-64 or random)
  6. Host combines: prefix + Interface ID = GUA
     e.g. 2001:db8:1:: + 0218:8bff:fe1a:2c3d = 2001:db8:1::218:8bff:fe1a:2c3d
  7. Host performs DAD on the GUA
  8. Host configures GUA and default route via router's link-local address
```

### RA Flags

```
M flag (Managed) = 1   → use DHCPv6 for address assignment
M flag = 0             → use SLAAC for address assignment

O flag (Other) = 1     → use DHCPv6 for OTHER info (DNS, NTP) but NOT address
O flag = 0             → all config comes from RA (use RDNSS option for DNS)

Combinations:
  M=0, O=0  → SLAAC only (pure stateless)
  M=0, O=1  → SLAAC for address + DHCPv6 stateless for DNS/NTP
  M=1, O=1  → Full DHCPv6 (stateful — DHCPv6 assigns address AND other info)
  M=1, O=0  → DHCPv6 stateful (unusual; O=1 is implied when M=1)
```

### RA Content (ICMPv6 Type 134)

```
ICMPv6 Router Advertisement contains:
  • Hop Limit (current hop count for host to use)
  • M flag, O flag
  • Router Lifetime (seconds this router is default gateway; 0 = not a default router)
  • Reachable Time (for NUD)
  • Retransmission Timer (for NS retransmission)
  • Options:
      - Prefix Information option (PIO): prefix, length, L flag (on-link), A flag (SLAAC), lifetimes
      - MTU option: link MTU
      - RDNSS option (RFC 8106): DNS server address (eliminates need for O flag in many cases)
      - DNSSL option: DNS search list
      - Route Information option: more specific routes

L flag (on-link) = 1 → hosts can communicate directly on this prefix (no router needed)
A flag (autonomous) = 1 → use this prefix for SLAAC
```

---

## Duplicate Address Detection (DAD)

Before assigning any address (link-local or GUA), the host verifies it's unique:

```
1. Host tentatively assigns address
2. Joins the solicited-node multicast group: ff02::1:ffXX:XXXX
   (last 24 bits of the address form the XX:XXXX part)
3. Sends Neighbor Solicitation (NS) to the solicited-node multicast address
   Source: :: (unspecified — not yet using the address)
   Target: the tentative address
4. Wait ~1 second (RetransTimer)
5. If no Neighbor Advertisement (NA) received → address is unique → assign it
6. If NA received → Duplicate! → address conflict → cannot use this address
```

---

## DHCPv6 — Stateful and Stateless

### Stateful DHCPv6 (M flag = 1)

Server assigns addresses and all configuration — analogous to DHCPv4.

```
Client                                  DHCPv6 Server
  │                                          │
  │── Solicit (ff02::1:2, port 547) ────────►│
  │◄─ Advertise ─────────────────────────────│
  │── Request ──────────────────────────────►│
  │◄─ Reply (address + DNS + options) ───────│
  │                                          │
  │── Renew (at T1, default 50% of lifetime)►│
  │◄─ Reply ─────────────────────────────────│
  │── Rebind (at T2, default 80% of lifetime, broadcast to ff02::1:2)─►│
  │◄─ Reply ─────────────────────────────────│
  │── Release ──────────────────────────────►│ (on shutdown)
```

**Ports:** Client sends from UDP 546; server on UDP 547.

### Stateless DHCPv6 (M=0, O=1)

Host gets address from SLAAC, uses DHCPv6 only for other options (DNS servers, NTP, domain name).

```
Client                                  DHCPv6 Server
  │                                          │
  │── Information-Request ──────────────────►│
  │◄─ Reply (DNS, NTP, etc.) ────────────────│
No address assignment — address from SLAAC
```

### DHCPv6 Relay

Like DHCPv4, when client and server are on different segments, a relay agent (the router) forwards DHCPv6 messages:

```
Router config (Cisco IOS):
  interface GigabitEthernet0/0
   ipv6 dhcp relay destination 2001:db8::1
```

---

## Privacy Extensions (RFC 4941)

EUI-64 embeds the MAC address — the Interface ID never changes, enabling cross-network device tracking. Privacy Extensions generate a random, temporary Interface ID:

```
Temporary address:
  - Random 64-bit Interface ID (regenerated periodically)
  - Preferred lifetime: typically 1 day
  - Valid lifetime: typically 7 days
  - Used for outgoing connections (source address)
  - Old temporary addresses kept valid until timeout (for existing sessions)

Stable address (from EUI-64 or stable secret algorithm):
  - Used for incoming connections (published in DNS, stable)
  - Kept permanently

RFC 7217 "Semantically Opaque Interface IDs":
  - Generates stable (not random) but opaque Interface IDs
  - Based on: network prefix + interface name + stable secret + counter
  - Stable per network, different across networks → no cross-network tracking
  - Now the default in most modern OSes
```

---

## IPv6 Subnetting

Unlike IPv4 where every bit matters, IPv6 subnetting is mostly about carving up the address space on 4-bit (nibble) or 16-bit (group) boundaries.

### Typical Allocation Hierarchy

```
/32   — allocated to a large ISP (IANA → RIR → ISP)
/48   — allocated to a single site/customer (65,536 /64 subnets available)
/56   — allocated to smaller customers (256 /64 subnets available)
/64   — a single LAN subnet (standard size for any network segment)
/128  — a host route (loopback, anycast)
```

### Subnetting a /48 into /64 Subnets

`2001:db8:abcd::/48` provides the 4th group (bits 49–64) for subnet numbering:

```
2001:db8:abcd:0000::/64   → Subnet 0
2001:db8:abcd:0001::/64   → Subnet 1
2001:db8:abcd:0002::/64   → Subnet 2
...
2001:db8:abcd:ffff::/64   → Subnet 65,535
```

Total /64 subnets from a /48: **65,536** (2^16).

### Subnetting a /56 into /64 Subnets

A /56 provides 8 bits (the last byte of the 4th group) for subnets:

```
2001:db8:abcd:1200::/64
2001:db8:abcd:1201::/64
...
2001:db8:abcd:12ff::/64
Total: 256 subnets (2^8)
```

### Subnets Smaller than /64

Technically valid but **breaks SLAAC** (Interface ID needs 64 bits). Only use for:
- Point-to-point router links (use /127, RFC 6164 — analogous to IPv4 /31)
- Loopback addresses (/128)

```
Router link example:
  RouterA: 2001:db8:1:1::1/127
  RouterB: 2001:db8:1:1::0/127  (the /127 pair is .::0 and .::1)
```

---

## Full Multicast Address Structure

```
ff  [flgs] [scpe]  :  [group ID — 112 bits]
    ├─────────┤
    4 bits each

Flags: 0RPT
  R = Rendezvous point embedded (RFC 3956)
  P = Prefix-based (RFC 3306)
  T = Transient (1 = dynamically assigned; 0 = permanently assigned by IANA)

Scope:
  1 = interface-local
  2 = link-local    (ff02::x — most common)
  4 = admin-local
  5 = site-local    (ff05::x)
  8 = organization-local
  e = global        (ff0e::x)
```

### Well-Known Multicast Addresses

```
ff02::1      All nodes (link-local) — replaces limited broadcast
ff02::2      All routers (link-local)
ff02::4      DVMRP routers
ff02::5      OSPFv3 all routers
ff02::6      OSPFv3 DR/BDR
ff02::9      RIPng routers
ff02::a      EIGRP routers
ff02::d      All PIM routers
ff02::16     MLDv2-capable routers
ff02::1a     All RPL nodes
ff02::1:2    DHCPv6 relay agents
ff02::1:3    Link-local multicast name resolution (LLMNR)
ff02::fb     mDNS (Multicast DNS)
ff05::1:3    DHCPv6 servers (site-local)
ff0e::       Global scope (must be globally routable — rarely used in practice)
```

### Solicited-Node Multicast

Every unicast/anycast address generates a corresponding solicited-node multicast address — used for efficient address resolution (replaces ARP broadcast).

```
Unicast address: 2001:db8::1:2345:6789
Last 24 bits:    45:6789

Solicited-node multicast: ff02::1:ff45:6789

A device joins this multicast group for every unicast address it has.
NDP uses this to find the MAC address associated with an IPv6 address
without broadcasting to ff02::1 (all nodes).
```

---

## IPv6 Address Configuration on Cisco IOS

```cisco
! Enable IPv6 globally
Router(config)# ipv6 unicast-routing

! Interface configuration
Router(config)# interface GigabitEthernet0/0

! Manual static address
Router(config-if)# ipv6 address 2001:db8:1::1/64

! Additional link-local (override auto-generated)
Router(config-if)# ipv6 address fe80::1 link-local

! EUI-64 auto-generated GUA
Router(config-if)# ipv6 address 2001:db8:1::/64 eui-64

! Enable SLAAC (for end hosts — not typically on routers, but possible)
Router(config-if)# ipv6 address autoconfig

! Enable RA on interface (for sending prefix to hosts)
Router(config-if)# no ipv6 nd suppress-ra

! Verification
Router# show ipv6 interface GigabitEthernet0/0
Router# show ipv6 neighbors
Router# show ipv6 route
```

---

## Tips

- Every IPv6-enabled interface has at least two addresses: a link-local (`fe80::`) and (once configured) one or more global or ULA addresses.
- SLAAC uses the Router Advertisement — if the router doesn't send RAs (or you have `ipv6 nd suppress-ra`), hosts won't autoconfigure.
- The solicited-node multicast is specific enough that usually only one host per link is in that multicast group — NDP is much more efficient than ARP broadcast.
- DHCPv6 does NOT replace the default gateway — hosts learn the default gateway from RA regardless of M/O flags. This catches many network admins off guard.
- When subnetting for documentation/exam purposes, work with the 4th group (hexadecimal subnet field) and increment in hex — 0, 1, 2, ... 9, a, b, c, d, e, f, 10, 11, ...

---

## Summary

- SLAAC combines a router-advertised prefix with a locally generated Interface ID (EUI-64 or random) to build a global address without DHCP.
- RA flags: M=1 means use DHCPv6 for addresses; O=1 means use DHCPv6 for other info only (DNS etc.); both 0 means SLAAC only.
- DHCPv6 does NOT provide the default gateway — hosts learn it from the RA Router Lifetime field regardless.
- Privacy Extensions (RFC 4941 / RFC 7217) generate opaque Interface IDs to prevent device tracking.
- A typical IPv6 assignment is /48 per site → /64 per subnet, with 65,536 subnets available to every site.
- The solicited-node multicast (`ff02::1:ffXX:XXXX`) enables NDP to resolve MAC addresses without broadcasting to all nodes.
