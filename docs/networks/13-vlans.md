.md---
title: "VLANs"
sidebar_label: "VLANs"
sidebar_position: 13
---

# VLANs

A Virtual LAN (VLAN) divides a single physical switch (or set of switches) into multiple logically separate broadcast domains, without requiring separate physical hardware for each. VLANs are one of the most consequential and widely-used Layer 2 technologies in all of enterprise networking.

---

## Why VLANs Exist

Before VLANs (1990s and earlier), achieving network segmentation required physically separate switches for each group of devices that needed isolation — expensive, inflexible, and wasteful when groups didn't need a full switch's worth of ports.

```
Without VLANs:                    With VLANs:
[Switch A]──Finance PCs           [One Switch]──Finance PCs (VLAN 10)
[Switch B]──Engineering PCs                  └──Engineering PCs (VLAN 20)
[Switch C]──Guest PCs                        └──Guest PCs (VLAN 30)

Same physical switch, same cabling — but Finance, Engineering, and
Guest are now in completely separate broadcast domains, as if they
were on entirely separate physical switches.
```

VLANs solve several problems simultaneously:

```
Broadcast control — limits broadcast domain size (see Switching
  Fundamentals), improving performance as networks grow
Security/Isolation — devices in different VLANs cannot communicate
  without going through a Layer 3 device (router or L3 switch) with
  explicit routing/policy configured — accidental cross-department
  visibility is eliminated by design
Flexibility — devices can be grouped logically (by department, function,
  or security level) independent of their PHYSICAL location/cabling —
  a Finance PC on the 3rd floor and one on the 1st floor can be in the
  same VLAN despite being on different physical switches
Simplified moves/adds/changes — moving a user to a different VLAN is
  a switchport configuration change, not a re-cabling project
```

---

## VLAN Tagging — IEEE 802.1Q

For a single physical link to carry traffic from MULTIPLE VLANs (a "trunk" link, typically between switches or a switch and a router), frames must be tagged to indicate which VLAN they belong to.

```
Standard Ethernet Frame:
┌──────────┬──────────┬──────┬─────────┬─────┐
│ Dest MAC │ Src MAC  │ Type │ Payload │ FCS │
└──────────┴──────────┴──────┴─────────┴─────┘

802.1Q Tagged Frame (4 extra bytes inserted after the Source MAC):
┌──────────┬──────────┬──────────────┬──────┬─────────┬─────┐
│ Dest MAC │ Src MAC  │ 802.1Q Tag   │ Type │ Payload │ FCS │
│          │          │ (4 bytes)    │      │         │     │
└──────────┴──────────┴──────────────┴──────┴─────────┴─────┘

The 802.1Q tag itself breaks down as:
┌────────────────┬─────┬─────┬───────────────┐
│ TPID (0x8100)  │ PCP │ DEI │ VLAN ID (12b) │
│ 16 bits        │ 3b  │ 1b  │               │
└────────────────┴─────┴─────┴───────────────┘

TPID (Tag Protocol Identifier) — fixed value 0x8100, signals "this is
  an 802.1Q tagged frame" (this is the EtherType seen in Ethernet
  Fundamentals' EtherType reference table)
PCP (Priority Code Point) — 3 bits, used for QoS marking/prioritization
  (see QoS)
DEI (Drop Eligible Indicator) — 1 bit, marks frames as eligible to be
  dropped first under congestion
VLAN ID — 12 bits, giving a theoretical range of 0-4095 VLANs
  (0 and 4095 are reserved, and VLAN 1 is typically a default/management
  VLAN by convention — practical usable range is 1-4094, with 1002-1005
  historically reserved on Cisco equipment for legacy Token Ring/FDDI)
```

Because the tag adds 4 bytes, a maximum-size tagged Ethernet frame is 1522 bytes instead of the standard 1518 — a detail that occasionally matters for devices with strict frame size limits.

---

## Access Ports vs Trunk Ports

```
Access Port — carries traffic for exactly ONE VLAN, untagged. This is
  how an end device (PC, printer, phone) connects — the device itself
  has no awareness of VLANs at all; the switch silently associates
  that port (and therefore the device) with a specific VLAN.

Trunk Port — carries traffic for MULTIPLE VLANs simultaneously, using
  802.1Q tags to distinguish which frame belongs to which VLAN. Used
  between switches, and between a switch and a router (or firewall)
  performing inter-VLAN routing.
```

```
                    Trunk (VLANs 10,20,30 tagged)
[Switch A]═══════════════════════════════════[Switch B]
   │                                              │
   │ Access (VLAN 10)                             │ Access (VLAN 20)
  [PC-1]                                         [PC-2]
```

---

## Native VLAN

```
On a trunk port, ONE VLAN can be designated the "native VLAN" — frames
belonging to the native VLAN are sent UNTAGGED across the trunk
(a legacy compatibility feature for devices/links that don't support
802.1Q tagging at all).

Critical security/operational note: if the native VLAN doesn't MATCH
on both ends of a trunk, frames can be misdelivered to the wrong VLAN
(a "VLAN hopping" attack vector — see Network Attacks & Defense) —
best practice is to EXPLICITLY set the native VLAN to match on both
ends, and many security guidelines recommend using an unused, non-default
VLAN as the native VLAN (rather than the default VLAN 1) specifically
to reduce attack surface.
```

---

## VLAN Configuration (Cisco IOS)

```
! Creating VLANs
Switch(config)# vlan 10
Switch(config-vlan)# name Finance
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Engineering
Switch(config-vlan)# exit

! Configuring an access port
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10

! Configuring a trunk port
Switch(config)# interface gigabitethernet 0/24
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20,30
Switch(config-if)# switchport trunk native vlan 99

! Verification
Switch# show vlan brief
Switch# show interfaces trunk
Switch# show interfaces gi0/1 switchport
```

---

## Voice VLAN

A specific, very common real-world VLAN pattern: IP phones with a built-in switch passthrough port for a connected PC.

```
                [Switch Port]
                      │
                  [IP Phone] ── (Voice VLAN, tagged)
                      │
                    [PC]   ── (Data/Access VLAN, untagged)

The switch port is configured as an access port for the DATA VLAN
(for the PC) AND a separate voice VLAN (for the phone itself, tagged) —
both riding the same physical cable to the desk, with the phone
intelligently tagging its own traffic while passing the PC's untagged
traffic straight through unchanged.

! Configuration
Switch(config)# interface gigabitethernet 0/5
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# switchport voice vlan 110
```

This pattern lets organizations run separate QoS policy, security policy, and broadcast domains for voice traffic vs general data traffic, over a single cable run to each desk — eliminating the need for two separate cable drops.

---

## VLAN Trunking Protocol (VTP) — Historical Context

```
VTP (Cisco proprietary) was designed to let one switch propagate VLAN
database changes automatically to other switches in a "VTP domain,"
avoiding the need to manually create matching VLANs on every switch.

Modes:
  Server  — can create/modify/delete VLANs, propagates changes
  Client  — receives and applies changes from a server, cannot make
            its own changes
  Transparent — passes VTP messages through but maintains its own
            independent, locally-configured VLAN database

VTP is widely considered a legacy/risky feature today: a classic,
well-known operational disaster scenario involves a NEW switch with a
HIGHER VTP revision number than the existing domain accidentally
wiping out the entire production VLAN database when connected — for
this reason, many organizations explicitly avoid VTP server/client
modes in production and use VTP transparent mode (or simply configure
VLANs manually/via automation on each switch) instead.
```

---

## Private VLANs (PVLANs) — Advanced Isolation

```
A further refinement allowing isolation WITHIN a single VLAN:

Primary VLAN — the overall VLAN
  Community VLAN — ports can talk to each other AND to promiscuous ports,
                   but not to isolated ports or other community VLANs
  Isolated VLAN  — ports can ONLY talk to promiscuous ports, never to
                   each other or to community VLAN ports
  Promiscuous port — typically the router/gateway port, can talk to everyone

Common use case: hotel/guest Wi-Fi or shared hosting environments where
each device should reach the internet gateway but NEVER see or
communicate with other devices on the same subnet.
```

---

## Tips

- Always explicitly configure the native VLAN to match on both ends of every trunk — relying on the default (VLAN 1) is a known security risk and a common source of subtle misconfiguration.
- When troubleshooting "two devices in the same VLAN can't communicate but everything else works," check the trunk's allowed VLAN list (`switchport trunk allowed vlan`) — a VLAN accidentally excluded from a trunk's allowed list is a very common real-world mistake.
- VTP's automatic propagation has caused enough real production outages industry-wide that defaulting to VTP transparent mode (or avoiding VTP server/client entirely) is now widely considered a safer default in modern deployments.
- Voice VLAN is the standard pattern for any deployment with desk IP phones — it lets one cable serve both the phone and the PC behind it with appropriate, separate QoS and broadcast domain treatment.

---

## Summary

- VLANs create logically separate broadcast domains on shared physical switch hardware, providing segmentation, security isolation, and flexibility without separate physical switches per group.
- 802.1Q tagging adds a 4-byte tag (including a 12-bit VLAN ID, supporting up to 4094 usable VLANs) to frames crossing trunk links.
- Access ports carry one untagged VLAN for end devices; trunk ports carry multiple tagged VLANs between switches/routers.
- The native VLAN is sent untagged across a trunk for legacy compatibility — mismatched native VLANs between trunk ends is a real security risk (VLAN hopping).
- Voice VLAN lets a single cable serve both an IP phone and a connected PC with separate VLAN/QoS treatment for each.
- VTP automates VLAN database propagation but has a well-documented history of causing accidental production outages — many organizations now avoid it in favor of manual or automated-but-controlled VLAN configuration.
