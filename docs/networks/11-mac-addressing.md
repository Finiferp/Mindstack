---
title: "MAC Addressing"
sidebar_label: "MAC Addressing"
sidebar_position: 11
---

# MAC Addressing

A Media Access Control (MAC) address is a unique, 48-bit hardware identifier burned into (or assigned to) every network interface — the foundational addressing mechanism for Layer 2 communication.

---

## MAC Address Structure

```
48 bits total, written as 12 hexadecimal digits, typically grouped in pairs:

00:1A:2B:3C:4D:5E    (colon-separated, common Unix/Linux/Wireshark style)
00-1A-2B-3C-4D-5E    (hyphen-separated, common Windows style)
001A.2B3C.4D5E       (dot-separated in groups of 4, Cisco IOS style)

All three represent the IDENTICAL address — just different display conventions.

Structure:
┌─────────────────────┬──────────────────────┐
│   OUI (24 bits)     │  Device ID (24 bits) │
│   00:1A:2B          │  3C:4D:5E            │
└─────────────────────┴──────────────────────┘

OUI (Organizationally Unique Identifier) — assigned by the IEEE Registration
  Authority to each hardware manufacturer (e.g. a specific OUI identifies
  "this device was made by Cisco" or "this device was made by Apple")

Device ID — assigned by the manufacturer itself, must be unique within
  that manufacturer's OUI allocation
```

You can look up which manufacturer made a device just from its OUI — useful during troubleshooting or security investigation ("there's an unknown device on the network with OUI 00:50:56 — that's a VMware virtual NIC, so this is likely a VM, not a rogue physical device").

---

## Universal vs Local Addressing — The I/G and U/L Bits

Two special bits within the first byte of a MAC address carry meaning:

```
First byte of MAC address, in binary:  X X X X X X I G
                                                    │ │
                                                    │ └─ I/G bit (bit 0, rightmost)
                                                    └─── U/L bit (bit 1)

I/G bit (Individual/Group):
  0 = unicast address (this MAC identifies exactly one device)
  1 = multicast address (this MAC identifies a group of devices)

U/L bit (Universal/Local):
  0 = universally administered (assigned by IEEE/manufacturer, globally unique)
  1 = locally administered (manually assigned/overridden by an administrator
      or software, not guaranteed globally unique — commonly used for
      virtual machine NICs, VPN interfaces, and MAC randomization features)
```

```
Example: is 02:00:00:00:00:01 unicast or multicast? Universal or local?
First byte: 02 = 00000010 in binary
  I/G bit (rightmost) = 0 → unicast
  U/L bit (second from right) = 1 → locally administered
This is a classic "locally administered unicast" address, commonly seen
on virtual interfaces and devices using randomized MAC addresses.
```

---

## Types of MAC Addresses by Destination

```
Unicast    — one sender, one specific receiver (the vast majority of traffic)
             Example: 00:1A:2B:3C:4D:5E (I/G bit = 0)

Multicast  — one sender, a GROUP of interested receivers
             Example: 01:00:5E:xx:xx:xx (IPv4 multicast mapping, I/G bit = 1)
             Used for: streaming to multiple subscribers, OSPF/EIGRP hello
             packets, IPTV

Broadcast  — one sender, EVERY device on the local network segment
             Always: FF:FF:FF:FF:FF:FF (all bits set to 1)
             Used for: ARP requests, DHCP discovery — anything where the
             sender doesn't yet know a specific destination MAC
```

### IPv4 Multicast-to-MAC Mapping

There's a deterministic, partially-wasteful mapping from IPv4 multicast addresses to Ethernet multicast MAC addresses:

```
IPv4 multicast range: 224.0.0.0 – 239.255.255.255 (Class D)
Maps to MAC range:     01:00:5E:00:00:00 – 01:00:5E:7F:FF:FF

Mapping process: take the LOWER 23 bits of the IPv4 multicast address
and place them into the lower 23 bits of the MAC address (after the
fixed 01:00:5E prefix and a forced 0 in the 24th bit)

Because only 23 of the 28 host bits in the IPv4 multicast space map to
the MAC address, this mapping is NOT unique — 32 different IPv4
multicast addresses can map to the SAME multicast MAC address, a
known limitation that occasionally causes a host to receive multicast
traffic it didn't actually subscribe to, filtered out at a higher layer.
```

---

## How MAC Addresses Are Used

```
1. Switch forwarding — switches build a MAC address table (CAM table)
   mapping MAC addresses to the physical port they were learned on,
   enabling intelligent frame forwarding instead of blind flooding
   (full detail in Switching Fundamentals)

2. ARP resolution — IPv4 hosts use ARP to discover the MAC address
   corresponding to a known IP address on the local network before
   they can actually send a frame to it (full detail in ARP & NDP)

3. Frame addressing — every Ethernet frame's header contains both a
   source and destination MAC address (see Ethernet Fundamentals for
   the full frame format)

4. DHCP reservations and security — many DHCP servers and security
   tools (port security, NAC) use MAC addresses to identify and
   control which devices may connect or receive specific configuration
```

---

## MAC Address Table (Switch Operation Preview)

```
Switch MAC Address Table (example):
┌───────────────────┬──────┬──────┐
│ MAC Address       │ VLAN │ Port │
├───────────────────┼──────┼──────┤
│ 00:1A:2B:3C:4D:5E │  10  │ Gi0/1│
│ 00:1A:2B:3C:4D:5F │  10  │ Gi0/2│
│ 00:50:56:AB:CD:EF │  20  │ Gi0/3│
└───────────────────┴──────┴──────┘

The switch learns this table dynamically by inspecting the SOURCE MAC
address of every incoming frame and recording which port it arrived on.
Full mechanics and aging behavior covered in Switching Fundamentals.
```

---

## MAC Address Spoofing and Randomization

```
MAC Spoofing — manually changing a device's MAC address (most OSes and
  many NICs support this) — can be used legitimately (e.g. matching an
  ISP's expected MAC for a replaced router) or maliciously (impersonating
  another device to bypass MAC-based access controls, a known weakness
  of relying on MAC addresses alone for security)

MAC Randomization — modern smartphones/laptops (iOS, Android, Windows,
  macOS all support this) generate a RANDOM, locally-administered MAC
  address when probing for or connecting to different Wi-Fi networks,
  specifically to prevent passive tracking of a device's movement across
  different locations by correlating its real, fixed MAC address —
  this is a privacy feature with real operational implications: networks
  relying on MAC-based device identification (e.g. captive portals, MAC
  allowlisting) must account for a device potentially presenting a
  DIFFERENT MAC address each time it associates
```

---

## Vendor MAC OUI Lookup — Practical Example

```
Common well-known OUI prefixes (illustrative, not exhaustive — these
DO change/expand over time as IEEE allocates new ranges):
00:50:56, 00:0C:29  — VMware virtual machines
00:1C:42             — Parallels virtual machines  
B8:27:EB, DC:A6:32   — Raspberry Pi Foundation
00:1A:11             — Google
3C:5A:B4             — Google (different allocation)

Practical use: spotting an unexpected OUI on the network (e.g. a
consumer router OUI showing up on a corporate switch port) is a classic,
simple first step in identifying unauthorized or rogue devices —
though MAC spoofing means this should never be the ONLY security control.
```

---

## Tips

- When troubleshooting "duplicate IP" or intermittent connectivity issues, checking the switch's MAC address table for a MAC address flapping between two different ports is a strong signal of either a loop, a misconfigured failover setup, or — rarely — actual MAC spoofing/duplication.
- Remember the broadcast MAC address (FF:FF:FF:FF:FF:FF) by heart — seeing it in a packet capture immediately tells you this is ARP, DHCP discovery, or some other "I don't know the destination yet" protocol exchange.
- Don't rely on MAC address filtering alone as a security control — it's trivially spoofable and, combined with MAC randomization on client devices, increasingly unreliable as a primary access control mechanism on its own.

---

## Summary

- A MAC address is a 48-bit hardware address split into a manufacturer-assigned OUI (24 bits) and a device-specific identifier (24 bits).
- The I/G bit distinguishes unicast (0) from multicast (1) addresses; the U/L bit distinguishes universally-administered (0, IEEE-assigned) from locally-administered (1, manually/software-assigned) addresses.
- IPv4 multicast addresses map to Ethernet multicast MAC addresses in a non-unique, many-to-one fashion due to only 23 of 28 possible host bits being preserved in the mapping.
- Switches learn MAC-to-port mappings dynamically by inspecting source addresses of incoming frames, building the MAC address table that enables intelligent forwarding.
- MAC randomization on modern client devices is a deliberate privacy feature that breaks the assumption that a device always presents the same MAC address — relevant for any network design relying on MAC-based identification.
