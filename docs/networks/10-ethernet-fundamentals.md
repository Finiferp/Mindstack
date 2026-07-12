---
title: "Ethernet Fundamentals"
sidebar_label: "Ethernet Fundamentals"
sidebar_position: 10
---

# Ethernet Fundamentals

Ethernet is, by a wide margin, the most successful networking technology ever created — it has dominated wired LANs for five decades and continues to scale from its original 10 Mbps to 800+ Gbps today while remaining fundamentally the same frame format.

---

## History of Ethernet

```
1973 — Robert Metcalfe and David Boggs invent Ethernet at Xerox PARC,
       inspired by ALOHAnet's random-access radio protocol, running at
       2.94 Mbps over coaxial cable

1980 — DIX (Digital, Intel, Xerox) consortium publishes "Ethernet Blue
       Book" — the first commercial 10 Mbps Ethernet standard

1983 — IEEE publishes 802.3, a closely related but not byte-identical
       standard to DIX Ethernet (the two frame formats coexisted for years,
       distinguished by the Type/Length field — see Frame Format below)

1980s — Ethernet competes with Token Ring (IBM) and Token Bus through
        the decade; Ethernet's lower cost and simplicity gradually win
        out despite Token Ring's more deterministic performance under
        heavy load

1990 — 10BASE-T standardized — Ethernet moves from shared coaxial cable
       to twisted pair wired in a STAR topology through a hub, a pivotal
       shift (full topology discussion in Network Fundamentals)

1995 — Fast Ethernet (100BASE-TX, 100 Mbps) standardized (802.3u)

1997-98 — Full-duplex switched Ethernet becomes mainstream, effectively
          ending the CSMA/CD collision problem on modern networks (hub
          based shared-medium Ethernet still required CSMA/CD; switches did not)

1998-99 — Gigabit Ethernet standardized (802.3z for fiber, 802.3ab for
          copper/1000BASE-T)

2002 — 10 Gigabit Ethernet standardized (802.3ae)

2010 — 40/100 Gigabit Ethernet standardized (802.3ba)

2017+ — 25G, 50G, 200G, 400G Ethernet standardized for datacenter/
        service provider backbone use

2020s — 800G Ethernet emerging for hyperscale datacenter interconnects
```

The single most important historical fact about Ethernet: it has scaled from 2.94 Mbps (1973) to 800,000 Mbps (2020s) — roughly a 270,000x increase — while the fundamental frame format has remained almost entirely unchanged. Few technologies in any engineering discipline have shown this combination of longevity and scalability.

---

## CSMA/CD — The Original Access Method

Carrier Sense Multiple Access with Collision Detection governed how devices shared the original coaxial Ethernet cable.

```
CSMA/CD process:
1. Carrier Sense  — before transmitting, listen to the medium; if busy, wait
2. Multiple Access — many devices share the same physical medium
3. Collision Detection — if two devices transmit simultaneously (a collision),
   both detect it (voltage anomaly on the wire), stop transmitting immediately,
   send a jam signal, then each waits a random backoff period before retrying
   (exponential backoff — the wait time range doubles after each successive
   collision involving the same frame, up to a maximum, reducing the chance
   of repeated collisions between the same two devices)

This entire mechanism was ONLY necessary because original Ethernet (and
hub-based Ethernet) used a SHARED medium where only one device could
transmit at a time without collision (a single collision domain).
```

**Why CSMA/CD is mostly irrelevant today**: modern switched, full-duplex Ethernet gives every device its own dedicated point-to-point link to the switch, with separate transmit and receive paths — collisions are physically impossible in this configuration, so CSMA/CD logic, while still technically part of the 802.3 standard, is not actively used on full-duplex links. It remains important to understand historically and for any legacy half-duplex scenario (rare today, but occasionally still seen with old hubs or misconfigured duplex settings).

---

## Ethernet Frame Format

```
┌──────────┬──────────┬──────────┬──────┬──────────────┬─────────┬─────┐
│ Preamble │   SFD    │ Dest MAC │ Src  │  Type/Length │ Payload │ FCS │
│ 7 bytes  │ 1 byte   │ 6 bytes  │ MAC  │   2 bytes    │ 46-1500 │  4  │
│          │          │          │ 6 B  │              │  bytes  │ B   │
└──────────┴──────────┴──────────┴──────┴──────────────┴─────────┴─────┘

Preamble (7 bytes)  — alternating 1s and 0s (10101010...), allows receiver
                       to synchronize its clock to the sender's timing
SFD (1 byte)        — Start Frame Delimiter (10101011) — signals "the
                       actual frame starts NOW"
Destination MAC (6B)— the receiving device's hardware address
Source MAC (6B)     — the sending device's hardware address
Type/Length (2B)    — if value ≥ 1536 (0x0600), interpreted as EtherType
                       (identifies the encapsulated protocol, e.g. 0x0800=IPv4,
                       0x86DD=IPv6, 0x0806=ARP); if < 1536, interpreted as
                       the LENGTH of the payload (the original 802.3 meaning) —
                       this dual meaning is how DIX Ethernet and IEEE 802.3
                       frames coexist on the same wire
Payload (46-1500B)  — the actual data (the IP packet, typically); padded
                       with zeros if the payload is smaller than 46 bytes
                       (Ethernet has a MINIMUM frame size of 64 bytes total,
                       needed historically so collisions could be reliably
                       detected across the maximum cable length)
FCS (4 bytes)       — Frame Check Sequence, a CRC-32 checksum used to
                       detect (NOT correct) transmission errors; a frame
                       failing this check is silently discarded
```

```
Total frame size range: 64 bytes (minimum) to 1518 bytes (maximum standard) 
  — or up to 1522 bytes with an 802.1Q VLAN tag (4 extra bytes)
  — or up to 9000+ bytes for "jumbo frames" (non-standard but widely
    supported, common in datacenter/storage networks for efficiency)
```

---

## Ethernet Speed Standards — Naming Convention


| Standard | Speed | Typical Medium | Max Distance | Signaling Type / Medium |
|---|---|---|---|---|
| 10BASE-T | 10 Mbps | Cat3+ UTP | 100m | BASEband signaling, Twisted pair |
| 100BASE-TX | 100 Mbps | Cat5+ UTP | 100m | BASEband, Twisted pair (X = encoding scheme variant)|
| 1000BASE-T | 1 Gbps | Cat5e+ UTP | 100m | BASEband, Twisted pair |
| 10GBASE-T | 10 Gbps | Cat6a+ UTP | 100m |  BASEband, Twisted pair |
| 1000BASE-SX | 1 Gbps | Multi-mode fiber | ~550m | BASEband, Short-range fiber (multi-mode) |
| 1000BASE-LX | 1 Gbps | Single-mode fiber | ~10km | BASEband, Long-range fiber (single-mode) |
| 10GBASE-SR | 10 Gbps | Multi-mode fiber | ~400m | hort Range fiber |
| 10GBASE-LR | 10 Gbps | Single-mode fiber | ~10km | Long Range fiber (single-mode) |
| 40GBASE-SR4 | 40 Gbps | Multi-mode fiber (MPO) | ~150m | BASEband, Short-range fiber (multi-mode, 4 parallel lanes) |
| 100GBASE-LR4 | 100 Gbps | Single-mode fiber | ~10km | BASEband, Long-range fiber (single-mode, 4 WDM wavelengths) |

---

## Duplex and Autonegotiation

```
Half-Duplex — transmit OR receive, not simultaneously (requires CSMA/CD;
              essentially extinct today except rare legacy equipment)
Full-Duplex — transmit AND receive simultaneously (standard for all
              modern switched Ethernet)

Autonegotiation (802.3u, extended by later standards):
  Connected devices automatically negotiate the best mutually-supported
  speed and duplex setting. A classic, still-relevant troubleshooting
  scenario: a "duplex mismatch" occurs when one side is forced to a
  specific speed/duplex (autonegotiation disabled) while the other side
  is left on auto — this commonly results in one side running full-duplex
  and the other half-duplex, causing late collisions and severely
  degraded performance that's easy to misdiagnose as a cabling or
  bandwidth problem. Best practice: leave autonegotiation enabled on
  both ends unless there's a specific, well-understood reason not to.
```

---

## EtherType Reference (Common Values)

```
0x0800 — IPv4
0x0806 — ARP
0x86DD — IPv6
0x8100 — 802.1Q VLAN-tagged frame
0x8847 — MPLS unicast
0x88CC — LLDP (Link Layer Discovery Protocol)
```

---

## Jumbo Frames

```
Standard Ethernet MTU: 1500 bytes payload
Jumbo Frame MTU:       typically 9000 bytes payload (not formally
                        standardized by IEEE, but a widely-adopted
                        de facto convention)

Why use them? Each frame carries fixed overhead (headers, interframe
gap, processing). Larger frames mean fewer total frames for the same
amount of data, reducing per-frame overhead — meaningful for high-
throughput storage networks (iSCSI, NFS) and datacenter east-west traffic.

Caveat: ALL devices along a path must support and be configured for
the same jumbo frame size, or fragmentation/drops occur — a frequent
real-world misconfiguration when only some switches in a path have
jumbo frames enabled.
```

---

## Tips

- A duplex mismatch is one of the most commonly misdiagnosed real-world Ethernet problems — symptoms (slow performance, intermittent errors) look like many other issues; always check interface counters for late collisions or CRC errors on suspect links.
- When troubleshooting "no connectivity" on a copper link, check the link light first (Layer 1), then check interface error counters for CRC/FCS failures, which point to a cabling or duplex problem rather than a configuration problem higher up the stack.
- Jumbo frames must be enabled consistently end-to-end — a single device in the path without jumbo frame support will cause silent drops or fragmentation, not a clean error.

---

## Summary

- Ethernet originated at Xerox PARC in 1973, inspired by ALOHAnet, and has scaled roughly 270,000x in speed while preserving the same fundamental frame format.
- CSMA/CD governed access on shared-medium (hub-based) Ethernet; it's effectively unused on modern full-duplex switched links, where collisions are physically impossible.
- The Ethernet frame's Type/Length field's dual meaning is a historical artifact of DIX Ethernet and IEEE 802.3 standards coexisting on the same wire.
- Speed standard naming follows a [Speed][Signaling][Medium] convention — 1000BASE-T means 1Gbps, baseband, twisted pair.
- Always leave autonegotiation enabled on both ends of a link to avoid duplex mismatches, one of the most common and confusing real-world Ethernet faults.
