---
title: "Switching Fundamentals"
sidebar_label: "Switching Fundamentals"
sidebar_position: 12
---

# Switching Fundamentals

The switch is the workhorse device of every modern wired LAN. Understanding precisely how it learns, forwards, and floods frames — and the domain concepts (collision/broadcast) this creates — is foundational to virtually everything else in Layer 2 and Layer 3 networking.

---

## How a Switch Operates — Learn, Forward, Flood

A switch builds and maintains a **MAC address table** (also called a CAM table — Content Addressable Memory table, referring to the specialized hardware used to implement it at line rate) through a simple but powerful process:

```
1. LEARN: When a frame arrives on a port, the switch reads the SOURCE
   MAC address and records: "this MAC is reachable via this port,"
   along with a timestamp.

2. FORWARD or FLOOD: The switch reads the DESTINATION MAC address:
   - If the destination MAC is already in the table → forward the
     frame OUT ONLY that specific port (unicast, efficient)
   - If the destination MAC is NOT in the table (unknown unicast) →
     flood the frame out ALL ports except the one it arrived on
   - If the destination is the broadcast address (FF:FF:FF:FF:FF:FF)
     → always flood out all ports (except the source port)
   - If the destination is a multicast address → flood by default,
     unless IGMP snooping is configured to optimize this (see below)

3. AGE OUT: Entries in the MAC table expire after a period of
   inactivity (default is commonly 300 seconds / 5 minutes on most
   platforms) to keep the table accurate as devices move or disconnect.
```

### Worked Example

```
Switch with 4 ports, empty MAC table:

Frame arrives on Port 1, Source=AAAA, Dest=BBBB
  → Switch learns: AAAA is on Port 1
  → BBBB not yet known → FLOOD to Ports 2, 3, 4

Frame arrives on Port 3, Source=BBBB, Dest=AAAA (BBBB's reply)
  → Switch learns: BBBB is on Port 3
  → AAAA IS known (Port 1) → forward ONLY to Port 1

Now both AAAA and BBBB are known. Any future frame between them is
forwarded directly, port to port, with NO flooding — efficient,
predictable, and (critically) private from other ports' perspective.
```

This learn/forward/flood behavior is why switches dramatically outperform hubs: a hub blindly repeats every frame out every port regardless of destination, while a switch quickly learns the topology and sends frames only where they need to go.

---

## Switch Forwarding Methods

How quickly and thoroughly a switch examines a frame before forwarding it involves a real engineering tradeoff between speed and error-checking:

```
Store-and-Forward — receives the ENTIRE frame, verifies the FCS
  (checksum) for errors, THEN forwards. 
  + Catches and drops corrupted frames before they waste bandwidth
    elsewhere on the network
  - Highest latency (must wait for the whole frame before forwarding
    any of it)
  Most common method on modern enterprise switches — the latency cost
  is negligible at modern speeds, and the error-checking benefit is
  valuable.

Cut-Through — begins forwarding as soon as the DESTINATION MAC address
  is read (just the first 6 bytes after the preamble/SFD), without
  waiting for the rest of the frame or checking the FCS.
  + Lowest possible latency — critical for some high-frequency trading
    and specialized low-latency datacenter applications
  - Forwards corrupted frames (errors aren't detected until later,
    if at all, by the receiving device)

Fragment-Free — a compromise: reads the first 64 bytes (the minimum
  legal Ethernet frame size) before forwarding, catching most collision-
  related fragments (which are typically smaller than 64 bytes) while
  still achieving lower latency than full store-and-forward.
```

---

## Collision Domains

```
A collision domain is the set of devices where a frame transmitted by
one device could collide with a frame transmitted by another.

Hub:    ALL ports share ONE collision domain (a frame from any port
        can collide with a frame from any other port — see Ethernet
        Fundamentals for why CSMA/CD existed to manage this)

Switch: EVERY PORT is its OWN separate collision domain. Because each
        switch port operates full-duplex with a dedicated, dedicated
        transmit/receive pair to exactly one device (or, historically,
        to a hub feeding multiple devices into that one collision
        domain), true collisions on modern switched full-duplex links
        are physically impossible.

Router: each interface is also its own collision domain (irrelevant
        to discuss further since routers don't typically share a
        segment with multiple hosts the way hubs/legacy switches might)
```

```
Quick count exercise:
[PC]──[Switch 8-port]──[PC]
                │
              [PC]

A switch with 3 connected devices on 3 separate ports = 3 separate
collision domains (one per active port). If a hub were plugged into
one of those switch ports with 4 PCs hanging off it, that hub's 4 PCs
would all share ONE collision domain (the hub itself), making the
TOTAL collision domain count for this topology = 3 (switch ports) - 1
(the port now feeding the hub) + 1 (the hub's shared domain) = 3 total.
```

---

## Broadcast Domains

```
A broadcast domain is the set of devices that will receive a broadcast
frame (destination FF:FF:FF:FF:FF:FF) sent by any device within it.

Switch (without VLANs): ALL ports on the switch are in ONE broadcast
  domain — a broadcast from any device reaches every other device
  connected to that switch.

Switch (with VLANs): each VLAN is its OWN separate broadcast domain —
  a broadcast in VLAN 10 does NOT reach devices in VLAN 20, even
  though they're physically connected to the same switch hardware
  (full detail in VLANs).

Router: each router INTERFACE represents a boundary between broadcast
  domains — routers do NOT forward broadcasts between interfaces by
  default (this is one of the fundamental, defining differences
  between Layer 2 switching and Layer 3 routing).
```

```
Why broadcast domain size matters: every device in a broadcast domain
must process every broadcast frame sent within it (ARP requests, DHCP
discovers, etc.), consuming CPU even on devices that aren't the
intended recipient. A broadcast domain that's too large ("broadcast
storm" territory, or just chronic background overhead from a large
flat network) degrades performance for everyone in it — this is the
core motivating reason VLANs exist (see VLANs) and why network
designers deliberately keep broadcast domains reasonably small.
```

---

## Switch Port States and Interface Basics (Cisco IOS)

```
! Viewing the MAC address table
Switch# show mac address-table
Switch# show mac address-table dynamic
Switch# show mac address-table interface gi0/1

! Basic interface configuration
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# description Link to PC-Alice
Switch(config-if)# speed auto
Switch(config-if)# duplex auto
Switch(config-if)# no shutdown

! Static MAC entry (rarely needed, occasionally used for security/troubleshooting)
Switch(config)# mac address-table static 0011.2233.4455 vlan 10 interface gi0/1

! Adjusting the MAC address table aging timer
Switch(config)# mac address-table aging-time 600
```

---

## Multicast Optimization — IGMP Snooping

By default, a switch treats multicast traffic the same as broadcast: flood it out every port. This is wasteful when only a subset of devices actually want the multicast stream (e.g. an IPTV channel).

```
IGMP Snooping — the switch "listens in" (snoops) on IGMP (Internet
  Group Management Protocol) messages exchanged between hosts and
  routers to learn WHICH ports actually have devices that joined a
  given multicast group, and forwards multicast traffic ONLY to those
  ports instead of flooding it everywhere — a significant efficiency
  improvement on switches carrying multicast video/streaming traffic.
```

---

## Switch Types and Roles in Network Design

```
Access Layer Switch — connects end devices (PCs, phones, APs) directly;
  typically has many lower-speed ports (e.g. 48x 1GbE) and fewer
  higher-speed uplinks (e.g. 2-4x 10GbE) toward the distribution layer

Distribution Layer Switch — aggregates multiple access switches,
  often the first point where Layer 3 routing/VLAN inter-routing
  happens, enforces policy (ACLs, QoS)

Core Layer Switch — high-speed backbone, moves traffic between
  distribution switches as fast as possible, generally avoids complex
  policy enforcement to keep forwarding decisions simple and fast

This three-tier model (Access-Distribution-Core) is the classic,
still widely-taught Cisco hierarchical network design model. Many
modern datacenter designs instead use a flatter "spine-leaf" topology
(every leaf switch connects to every spine switch) for more predictable,
non-blocking performance — a more recent architectural evolution
covered further in datacenter/cloud networking contexts.
```

---

## Tips

- "How many collision domains" and "how many broadcast domains" are extremely common exam-style and real design questions — the fast rule: collision domains = count every switch/router port; broadcast domains = count every VLAN/router interface boundary.
- Store-and-forward is the right default for virtually all enterprise/campus switching — only consider cut-through switching for specialized, latency-critical datacenter applications where you fully understand and accept the tradeoff of forwarding some corrupted frames.
- A device's MAC address showing up on multiple switch ports in rapid succession ("flapping") in the MAC table is a strong signal of either a Layer 2 loop or a duplicate/spoofed MAC — investigate immediately, as loops can quickly degrade an entire network.

---

## Summary

- Switches learn MAC-to-port mappings by inspecting source addresses, then forward known-destination frames directly and flood unknown-destination/broadcast frames.
- Store-and-forward (verify FCS, higher latency) is standard; cut-through (forward immediately, lower latency, no error checking) is reserved for specialized low-latency use cases.
- Every switch port is its own collision domain on modern full-duplex switching — true collisions are essentially extinct on properly configured modern networks.
- Every VLAN (or router interface) is its own broadcast domain — switches do NOT segment broadcast domains by port alone; that requires VLANs.
- IGMP snooping prevents multicast traffic from being treated as broadcast-style flooding, forwarding it only to ports that actually requested the stream.
- The Access-Distribution-Core hierarchical model remains the standard campus design pattern, while spine-leaf has become dominant in modern datacenter design.
