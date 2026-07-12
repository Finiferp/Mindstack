---
title: "Switch Security"
sidebar_label: "Switch Security"
sidebar_position: 16
---

# Switch Security

Layer 2 is frequently the weakest link in network security — most security attention historically focused on firewalls and Layer 3/4, while the switching layer trusted devices implicitly. This page covers the core hardening features every production switch should implement.

---

## Port Security

Restricts which devices (by MAC address) may connect to a given switch port — preventing unauthorized devices from simply plugging into an open wall jack and gaining network access.

```
Concepts:
  Maximum MAC addresses — limits how many distinct source MAC addresses
    a port will learn (commonly 1 for a single PC, slightly higher for
    a port also feeding an IP phone + PC, or a small unmanaged switch
    intentionally permitted)
  
  Violation actions (what happens when the limit is exceeded or an
  unauthorized MAC is seen):
    Protect  — silently drops traffic from the offending MAC, no log,
               port stays up
    Restrict — drops traffic from the offending MAC AND logs/increments
               a violation counter, port stays up
    Shutdown — (default, most common) immediately puts the ENTIRE port
               into err-disabled state, requiring manual (or
               auto-recovery timer-based) re-enablement — the strictest
               and most commonly deployed option in security-conscious
               environments
```

```
! Cisco IOS configuration
Switch(config)# interface gigabitethernet 0/5
Switch(config-if)# switchport mode access
Switch(config-if)# switchport port-security
Switch(config-if)# switchport port-security maximum 2
Switch(config-if)# switchport port-security violation shutdown
Switch(config-if)# switchport port-security mac-address sticky
! "sticky" dynamically learns the first MAC(s) seen and converts them
! to permanent entries automatically, avoiding manual MAC entry while
! still locking the port down after the initial learning period

! Verification
Switch# show port-security
Switch# show port-security interface gi0/5

! Recovering an err-disabled port (manual)
Switch(config)# interface gi0/5
Switch(config-if)# shutdown
Switch(config-if)# no shutdown

! Or configure automatic recovery after a timeout
Switch(config)# errdisable recovery cause psecure-violation
Switch(config)# errdisable recovery interval 300
```

---

## DHCP Snooping

Prevents rogue/unauthorized DHCP servers from handing out malicious or simply incorrect IP configuration to clients — a surprisingly common and disruptive real-world problem (an employee plugging in a misconfigured home router, for instance, can silently hijack DHCP for an entire office segment).

```
Concept: every switchport is classified as either TRUSTED (allowed to
  forward DHCP server responses — typically only the uplink toward the
  legitimate DHCP server/router) or UNTRUSTED (default for all access
  ports — DHCP server-type messages, like DHCPOFFER and DHCPACK,
  arriving on an untrusted port are simply DROPPED).

The switch builds a "DHCP Snooping Binding Table" recording legitimate
client MAC-to-IP-to-port assignments learned from observing trusted
DHCP exchanges — this binding table is itself a foundational input
used by other security features (notably Dynamic ARP Inspection,
covered next).
```

```
! Cisco IOS configuration
Switch(config)# ip dhcp snooping
Switch(config)# ip dhcp snooping vlan 10,20

! Mark the uplink toward the legitimate DHCP server as trusted
Switch(config)# interface gigabitethernet 0/24
Switch(config-if)# ip dhcp snooping trust

! All other (access) ports remain untrusted by default — no
! configuration needed on them for the default-deny DHCP server
! behavior to apply

! Verification
Switch# show ip dhcp snooping
Switch# show ip dhcp snooping binding
```

---

## Dynamic ARP Inspection (DAI)

Prevents **ARP spoofing/poisoning** attacks, where a malicious device sends forged ARP replies claiming to own an IP address it doesn't actually own (commonly the default gateway's IP), tricking other devices into sending their traffic to the attacker instead — a classic and still-common man-in-the-middle technique (full attack mechanics in [Network Attacks & Defense](./58-network-hardening.md)).

```
Concept: DAI intercepts ARP packets on UNTRUSTED ports and validates
  them against the DHCP Snooping Binding Table (built by the DHCP
  Snooping feature above) — an ARP reply claiming an IP-to-MAC mapping
  that DOESN'T match what was legitimately observed via DHCP is
  dropped, preventing the spoofed mapping from ever reaching other
  devices' ARP caches.

DAI has a hard DEPENDENCY on DHCP Snooping already being enabled and
having built a valid binding table — they're almost always deployed
together as a pair.
```

```
! Cisco IOS configuration (requires DHCP snooping already configured)
Switch(config)# ip arp inspection vlan 10,20

! Trust the same uplink port (matches DHCP snooping trust)
Switch(config)# interface gigabitethernet 0/24
Switch(config-if)# ip arp inspection trust

! Verification
Switch# show ip arp inspection
Switch# show ip arp inspection interfaces
```

---

## Storm Control

Limits the rate of broadcast, multicast, or unknown-unicast traffic on a port — protecting against both malicious traffic floods AND accidental issues like a Layer 2 loop or a misbehaving NIC generating excessive broadcast traffic.

```
Concept: configure a threshold (percentage of port bandwidth, or
  absolute packets/bits per second) — if traffic of the specified
  type exceeds that threshold, the switch can drop the excess traffic
  or, in stricter configurations, shut the port down entirely (similar
  violation-action concept to port security).

This is a useful LAST LINE of defense even when STP and other loop
prevention is correctly configured — broadcast storms can also
originate from non-loop causes (a misbehaving NIC, certain malware,
or a misconfigured/overloaded device flooding ARP requests).
```

```
! Cisco IOS configuration — limit broadcast traffic to 1% of port bandwidth
Switch(config)# interface gigabitethernet 0/5
Switch(config-if)# storm-control broadcast level 1.00
Switch(config-if)# storm-control action shutdown

! Verification
Switch# show storm-control
```

---

## 802.1X — Port-Based Network Access Control

A fundamentally different security model from port security's MAC-based approach: 802.1X requires actual **authentication** (typically via RADIUS, integrating with a corporate identity system) before a device is granted network access on a port at all — covered in full depth in [Network Security Protocols](./56-aaa-and-access-control.md), but introduced here as it's configured at the switch port level alongside the other features on this page.

```
Conceptual comparison:
  Port Security — "only THIS specific MAC address may use this port"
                   (identity tied to hardware, easily spoofed, no
                   real authentication)
  802.1X        — "only a device that successfully AUTHENTICATES
                   (username/password, certificate, etc.) may use
                   this port" (identity tied to credentials, the
                   modern standard for serious access control)

Many modern enterprise deployments use 802.1X as primary access
control with port security as a defense-in-depth supplement, rather
than relying on port security alone.
```

---

## Disabling Unused Ports

The simplest, most frequently overlooked switch security practice:

```
! Shut down every unused port and place it in an unused/quarantine VLAN
Switch(config)# interface range gigabitethernet 0/30-48
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 999
Switch(config-if-range)# shutdown
```

An active, unused switchport sitting in the default VLAN with no security controls is a genuinely common real-world finding in security audits — and one of the easiest issues to remediate.

---

## Tips

- DHCP Snooping and Dynamic ARP Inspection are almost always deployed together — DAI's effectiveness entirely depends on a correctly populated DHCP Snooping binding table.
- Port security's "sticky" MAC learning mode is a good practical default — it avoids the administrative burden of manually entering every legitimate MAC address while still locking a port down after the first device is seen.
- Always disable and VLAN-quarantine unused switchports — this is low-effort, high-value hardening that's frequently skipped in practice.
- When troubleshooting "DHCP suddenly stopped working" or "users intermittently get a weird IP address," suspect a rogue DHCP server, and verify DHCP Snooping is both enabled and that the legitimate server's uplink is correctly marked trusted.

---

## Summary

- Port security restricts switchports to specific (or a limited number of) MAC addresses, with configurable violation actions (protect/restrict/shutdown).
- DHCP Snooping designates trusted vs untrusted ports for DHCP server traffic, preventing rogue DHCP servers and building a binding table used by other security features.
- Dynamic ARP Inspection validates ARP replies against the DHCP Snooping binding table, preventing ARP spoofing/man-in-the-middle attacks — it requires DHCP Snooping to function.
- Storm control limits broadcast/multicast/unknown-unicast traffic rates per port, providing a safety net against both loops and malicious/malfunctioning traffic floods.
- 802.1X provides genuine identity-based authentication for network access, a stronger and more modern model than MAC-based port security alone.
- Disabling and quarantining unused switchports is simple, frequently overlooked, and meaningfully reduces attack surface.
