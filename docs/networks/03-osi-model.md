---
title: "The OSI Model"
sidebar_label: "OSI Model"
sidebar_position: 3
---

# The OSI Model

The Open Systems Interconnection (OSI) model is a 7-layer conceptual framework for understanding network communication. Almost nothing on the Internet today implements OSI protocols directly — but the *model itself* remains the universal teaching and troubleshooting framework. Understanding why each layer exists, and what problem it solves, is more valuable than memorizing the layer names.

---

## Why a Layered Model?

Before layered models, network protocols were often monolithic — a single piece of software handled addressing, reliability, and application logic together, making it hard to upgrade one part without rewriting everything. Layering solves this by:

- **Separating concerns** — each layer solves one problem and exposes a clean interface to the layer above
- **Enabling independent evolution** — you can replace Ethernet with Wi-Fi (Layer 1-2) without changing how a web browser (Layer 7) works
- **Standardizing interoperability** — vendors can build interoperable products by implementing well-defined layer boundaries
- **Aiding troubleshooting** — "is this a Layer 1 problem (cable unplugged) or a Layer 7 problem (application bug)?" is a genuinely useful diagnostic question

---

## The Seven Layers

```
┌───────────────────────────────────────────┐
│ 7. Application   — HTTP, DNS, SMTP, FTP   │  "the data the user cares about"
├───────────────────────────────────────────┤
│ 6. Presentation  — encryption, encoding   │  "make sure both ends understand the format"
├───────────────────────────────────────────┤
│ 5. Session       — session establishment  │  "manage the conversation"
├───────────────────────────────────────────┤
│ 4. Transport     — TCP, UDP               │  "reliable or fast delivery"
├───────────────────────────────────────────┤
│ 3. Network       — IP, routing            │  "get it across networks"
├───────────────────────────────────────────┤
│ 2. Data Link     — Ethernet, MAC, switches│  "get it across one local link"
├───────────────────────────────────────────┤
│ 1. Physical      — cables, radio, voltage │  "actual bits on the wire/air"
└───────────────────────────────────────────┘
```

**Mnemonics** (bottom to top): "Please Do Not Throw Sausage Pizza Away"
(top to bottom): "All People Seem To Need Data Processing"

---

## Layer 1 — Physical

Concerned with the actual transmission of raw bits over a physical medium — voltage levels, light pulses, radio frequencies, connector pinouts, cable types.

```
Responsibilities:
- Bit-level transmission (1s and 0s as electrical/optical/radio signals)
- Cable and connector specifications (RJ45, fiber connectors, pinouts)
- Signaling method (how a "1" and "0" are physically represented)
- Data rate and synchronization (how fast bits are sent, clocking)
- Physical topology (bus, star, ring — see Network Fundamentals)

PDU (Protocol Data Unit): Bits

Examples: Ethernet cabling (Cat5e/6/6a), fiber optic cable, radio waves (Wi-Fi PHY),
          DSL/cable modem signaling, hub (legacy device — pure Layer 1 repeater)
```

A hub is a pure Layer 1 device — it has no concept of addresses or frames, it simply repeats every electrical signal out every port. This is why hub-based networks suffer from collisions (see [Switching Fundamentals](./12-switching-fundamentals.md)).

---

## Layer 2 — Data Link

Concerned with reliable transfer of data across a single physical link (one "hop"), and the framing of raw bits into discrete units. The data link layer is itself conceptually split into two sublayers by the IEEE 802 model:

```
┌────────────────────────────────────┐
│ LLC (Logical Link Control)         │ — interfaces to Layer 3, handles flow control
├────────────────────────────────────┤
│ MAC (Media Access Control)         │ — physical addressing, media access (CSMA/CD, CSMA/CA)
└────────────────────────────────────┘

Responsibilities:
- Framing — packaging Layer 3 packets into frames with headers/trailers
- Physical (MAC) addressing — uniquely identifying devices on the local link
- Media access control — deciding who can transmit and when (avoiding collisions)
- Error detection (not correction) — typically via CRC/FCS in the frame trailer

PDU: Frame

Examples: Ethernet, Wi-Fi (802.11), PPP, Frame Relay, ARP (technically sits between L2/L3)
Devices: Switches, bridges, network interface cards (NICs), wireless access points
```

This is where **MAC addresses** live (see [MAC Addressing](./11-mac-addressing.md)) and where **switches** operate, building MAC address tables to forward frames efficiently instead of flooding like a hub.

---

## Layer 3 — Network

Concerned with delivering data **across multiple networks** (not just one local link) via logical addressing and routing.

```
Responsibilities:
- Logical addressing — IP addresses (unlike MAC addresses, these are hierarchical and routable)
- Routing — determining the best path across multiple interconnected networks
- Path determination and forwarding — building and consulting routing tables
- Fragmentation — splitting packets too large for a given link's MTU

PDU: Packet

Examples: IP (IPv4/IPv6), ICMP, IPsec, routing protocols (OSPF, EIGRP, BGP)
Devices: Routers, Layer 3 switches
```

The critical distinction from Layer 2: MAC addresses are **flat** and tied to physical hardware (not hierarchical, not summarizable), while IP addresses are **hierarchical** and can be aggregated/summarized — this is precisely why IP can scale to a global Internet while pure Layer 2 (flat MAC addressing) cannot (see [IPv4 Subnetting](./21-ipv4-subnetting.md)).

---

## Layer 4 — Transport

Concerned with end-to-end communication between *applications* (not just hosts) — segmenting data, providing reliability (or not), and flow control.

```
Responsibilities:
- Segmentation and reassembly — breaking application data into manageable chunks
- Port numbers — identifying which application/process on a host should receive data
- Connection management — establishing/maintaining/tearing down conversations (TCP)
- Reliability — acknowledgments, retransmission, sequencing (TCP only)
- Flow control — preventing a fast sender from overwhelming a slow receiver
- Error recovery (not just detection) — TCP can detect AND retransmit lost data

PDU: Segment (TCP) or Datagram (UDP)

Examples: TCP, UDP, QUIC (built on UDP)
```

This is where the fundamental reliability-vs-speed tradeoff in networking lives: **TCP** guarantees delivery and ordering at the cost of overhead and latency; **UDP** is fast and simple but provides no guarantees (see [TCP Fundamentals](./40-tcp-fundamentals.md) and [UDP](./42-udp.md)).

---

## Layer 5 — Session

Concerned with establishing, managing, and terminating the "conversation" (session) between two applications — distinct from the connection itself (Layer 4) or the data format (Layer 6).

```
Responsibilities:
- Session establishment, maintenance, and termination
- Dialog control — who talks when (full-duplex vs half-duplex application-level dialog)
- Session checkpointing and recovery (resuming a transfer after interruption)

Examples: NetBIOS sessions, RPC, SQL sessions, PPTP control channel,
          (in practice, often blended into the application protocol itself, e.g. HTTP cookies/sessions)
```

In real-world TCP/IP networking, the session layer is the **most blurred** of the seven — most modern application protocols handle session concepts themselves (e.g. HTTP session cookies, TLS session resumption) rather than relying on a distinct OSI Layer 5 protocol. This is one of the clearest places where OSI's clean theoretical separation doesn't map to real implementations.

---

## Layer 6 — Presentation

Concerned with ensuring data is in a usable format for the application layer — translation, encryption, and compression.

```
Responsibilities:
- Data translation/formatting — ensuring sender and receiver agree on data representation
- Encryption/decryption — securing data before transmission
- Compression — reducing data size for efficient transmission
- Character encoding — ASCII, EBCDIC, Unicode conversions

Examples: SSL/TLS (often taught here, though it spans session/presentation in practice),
          JPEG, GIF, MPEG encoding, ASCII/Unicode
```

Like the session layer, the presentation layer is largely absorbed into application protocols in real-world TCP/IP networking (e.g. TLS is often implemented as a layer that wraps the application protocol, and HTTP itself defines content encoding via headers like `Content-Type` and `Content-Encoding`).

---

## Layer 7 — Application

The layer closest to the end user — provides network services directly to applications. **Important misconception**: Layer 7 is NOT the application itself (e.g. not your web browser) — it's the *protocol* the application uses to communicate over the network (e.g. HTTP).

```
Responsibilities:
- Provides the interface between network services and user applications
- Defines protocols for specific services: web browsing, email, file transfer, name resolution

PDU: Data (sometimes called Message)

Examples: HTTP/HTTPS, DNS, SMTP, FTP, SSH, Telnet, DHCP
```

---

## PDU Names by Layer — Full Encapsulation Stack

```
Layer 7-5 (Application/Presentation/Session): Data
Layer 4 (Transport):                          Segment (TCP) / Datagram (UDP)
Layer 3 (Network):                            Packet
Layer 2 (Data Link):                          Frame
Layer 1 (Physical):                           Bits
```

This naming matters in real troubleshooting conversations: a network engineer says "I see the packet arriving but the segment looks malformed" to communicate precisely which layer's header is being inspected. See [Data Encapsulation](./05-data-encapsulation.md) for the full encapsulation/decapsulation walkthrough.

---

## OSI vs Real-World TCP/IP — Mapping

```
OSI Layer          TCP/IP Layer          Real Protocols
─────────────────────────────────────────────────────────
7 Application   ┐
6 Presentation  ├─→  Application      →  HTTP, DNS, SMTP, SSH, FTP
5 Session       ┘
4 Transport     →    Transport        →  TCP, UDP
3 Network       →    Internet         →  IP, ICMP, OSPF, BGP
2 Data Link     ┐
                ├─→  Network Access   →  Ethernet, Wi-Fi, ARP
1 Physical      ┘
```

The TCP/IP model (covered next) collapses OSI's top three layers into one "Application" layer and its bottom two into one "Network Access" layer — because that's how protocols are *actually* implemented in practice. See [The TCP/IP Model](./04-tcpip-model.md) for the full comparison.

---

## Why Engineers Still Use OSI Layer Numbers

Even though almost no software implements pure OSI protocols, the layer *numbers* are universal shorthand in real engineering conversations:

```
"It's a Layer 1 problem"   → cable, port, physical connectivity issue
"It's a Layer 2 problem"   → switching, VLAN, MAC address, STP issue
"It's a Layer 3 problem"   → IP addressing, subnetting, routing issue
"It's a Layer 4 problem"   → port blocked, TCP connection issue
"It's a Layer 7 problem"   → application bug, malformed HTTP request, DNS misconfiguration

"Layer 3 switch"            → a switch that can also route between VLANs (does L3 forwarding)
"Layer 7 firewall"          → a firewall that inspects application-layer content (NGFW), not just IP/port
"Layer 4 load balancer"     → balances based on IP/port only, doesn't inspect application data
"Layer 7 load balancer"     → balances based on HTTP headers, URLs, cookies, etc.
```

---

## Tips

- When troubleshooting, work the OSI model **bottom-up**: check Layer 1 (is it plugged in, link light on?) before assuming a Layer 7 application bug.
- The session and presentation layers are largely theoretical in modern networking — don't spend excessive time trying to map real protocols cleanly onto layers 5 and 6.
- Remember the PDU names — using "frame" when you mean "packet" (or vice versa) signals imprecision to other engineers and obscures which layer you're actually describing.
- A Layer 3 switch is NOT just a router with switch ports — it's a switch with added routing capability between VLANs, and it has architectural differences in how routing decisions are made (often in hardware ASICs vs the router's general-purpose CPU).

---

## Summary

- The OSI model is a 7-layer conceptual framework: Physical, Data Link, Network, Transport, Session, Presentation, Application.
- Each layer solves a distinct problem and exposes a clean interface to the layer above it, enabling independent evolution of networking technology.
- Layers 1-2 deal with a single physical link; Layer 3 deals with routing across multiple networks; Layer 4 deals with end-to-end application delivery.
- Layers 5 and 6 (Session, Presentation) are largely absorbed into application protocols in real-world TCP/IP networking — they're the most "theoretical" layers.
- The TCP/IP model is what's actually implemented; OSI remains the standard teaching and troubleshooting vocabulary.
- "Layer N problem" is universal networking shorthand for narrowing down where in the stack an issue lives — always troubleshoot bottom-up.
