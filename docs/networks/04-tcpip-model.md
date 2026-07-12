---
title: "The TCP/IP Model"
sidebar_label: "TCP/IP Model"
sidebar_position: 4
---

# The TCP/IP Model

While the OSI model is the standard teaching framework, the TCP/IP model (also called the Internet Protocol Suite) describes what's actually implemented in every device connected to the Internet today. It predates OSI and was developed pragmatically by engineers solving real interoperability problems rather than designed top-down by committee.

---

## The Four Layers

```
┌───────────────────────────────────────────┐
│ 4. Application   — HTTP, DNS, SMTP, SSH...│  (combines OSI layers 5-7)
├───────────────────────────────────────────┤
│ 3. Transport     — TCP, UDP               │  (= OSI layer 4)
├───────────────────────────────────────────┤
│ 2. Internet      — IP, ICMP, ARP*         │  (= OSI layer 3)
├───────────────────────────────────────────┤
│ 1. Network Access — Ethernet, Wi-Fi       │  (combines OSI layers 1-2)
└───────────────────────────────────────────┘
* ARP is often discussed alongside Internet layer despite resolving L2 addresses
```

Some textbooks (and Cisco's CCNA curriculum specifically) describe a **5-layer** version that splits Network Access into separate Data Link and Physical layers — making it look almost identical to OSI but with the top three OSI layers merged into one Application layer. Both versions describe the same real implementation; the difference is purely how granularly you want to subdivide the bottom layers for discussion.

```
5-layer (Cisco/many textbooks):       4-layer (original/strict):
┌──────────────────┐                  ┌──────────────────┐
│ 5. Application   │                  │ 4. Application   │
├──────────────────┤                  ├──────────────────┤
│ 4. Transport     │                  │ 3. Transport     │
├──────────────────┤                  ├──────────────────┤
│ 3. Network       │                  │ 2. Internet      │
├──────────────────┤                  ├──────────────────┤
│ 2. Data Link     │                  │ 1. Network Access│
├──────────────────┤                  └──────────────────┘
│ 1. Physical      │
└──────────────────┘
```

---

## Why TCP/IP "Won"

The protocol wars between TCP/IP and OSI (full history in [History of Networking](./01-history-of-networking.md)) were ultimately decided by pragmatism:

- TCP/IP was **simpler** — fewer layers to implement correctly, less theoretical overhead.
- TCP/IP was **free and open** — published as RFCs, implemented in BSD Unix and distributed freely, while many OSI implementations were commercial and tied to specific vendor hardware.
- TCP/IP was **already deployed** — by the time OSI protocols were finalized and ready for production, TCP/IP already ran a large, working internetwork (ARPANET → NSFNET → the early Internet).
- TCP/IP followed the **end-to-end principle** — keep the network core simple ("dumb") and push complexity (reliability, ordering, error recovery) to the endpoints, which proved far more scalable and flexible than building intelligence into the network core itself.

---

## Layer 1 — Network Access (Link Layer)

Combines OSI Layers 1 and 2 — everything needed to get a frame onto the local physical medium and delivered to the next hop.

```
Responsibilities:
- Physical transmission (cabling, signaling, connectors)
- Framing and physical (MAC) addressing
- Media access control (who can transmit and when)

Protocols/Technologies: Ethernet (802.3), Wi-Fi (802.11), PPP, Frame Relay
```

---

## Layer 2 — Internet Layer

Equivalent to OSI Layer 3 — responsible for logical addressing and routing data across multiple interconnected networks.

```
Responsibilities:
- Logical (IP) addressing
- Routing — determining the path across networks
- Packet forwarding
- Fragmentation when necessary

Core Protocols:
  IP (Internet Protocol)    — the addressing and routing protocol itself (IPv4/IPv6)
  ICMP                      — error reporting and diagnostics (ping, traceroute rely on this)
  ARP                       — resolves IP addresses to MAC addresses (IPv4 only; IPv6 uses NDP)
  IGMP                      — manages multicast group membership
```

The Internet Protocol itself does NOT guarantee delivery — IP is a **best-effort, connectionless** protocol. It will try to deliver a packet but makes no promises about ordering, duplication, or even successful delivery. Reliability, if needed, is the Transport layer's job (specifically TCP) — this division of labor is the single most important architectural decision in the entire TCP/IP suite, and it's why the suite is named "TCP/IP" rather than just "IP."

---

## Layer 3 — Transport Layer

Equivalent to OSI Layer 4 — provides end-to-end communication between specific applications/processes on hosts, identified by port numbers.

```
Two transport protocols, two philosophies:

TCP (Transmission Control Protocol)
  - Connection-oriented (3-way handshake before data flows)
  - Reliable — acknowledgments, retransmission of lost data
  - Ordered — data arrives in the order it was sent
  - Flow control — prevents overwhelming the receiver
  - Congestion control — backs off when the network is congested
  - Higher overhead, higher latency
  - Used for: web (HTTP), email, file transfer, anything requiring data integrity

UDP (User Datagram Protocol)
  - Connectionless (no handshake)
  - Unreliable — no acknowledgments, no retransmission
  - Unordered — packets may arrive out of sequence
  - No flow or congestion control (application must handle this if needed)
  - Minimal overhead, lowest latency
  - Used for: DNS queries, video/voice streaming, online gaming, DHCP
```

Full deep dives: [TCP Fundamentals](./40-tcp-fundamentals.md), [TCP Advanced](./41-tcp-advanced.md), [UDP](./42-udp.md).

---

## Layer 4 — Application Layer

Combines OSI Layers 5, 6, and 7 — provides the actual network services that applications use, with no separate session or presentation handling at the protocol-suite level (individual application protocols handle these concerns themselves when needed, e.g. TLS provides session resumption and encryption inline with HTTP).

```
Common Application Layer Protocols:
  HTTP/HTTPS  — web browsing (port 80/443)
  DNS         — name resolution (port 53)
  SMTP        — sending email (port 25/587)
  IMAP/POP3   — retrieving email (port 143/110)
  FTP         — file transfer (port 20/21)
  SSH         — secure remote access (port 22)
  Telnet      — unencrypted remote access (port 23, legacy/insecure)
  DHCP        — automatic IP configuration (port 67/68)
  SNMP        — network device management (port 161/162)
  NTP         — time synchronization (port 123)
```

More reference: [Protocols Quick Reference](./77-network-protocols-quick-reference.md).

---

## The Hourglass Model

A useful way to visualize why TCP/IP succeeded is the "hourglass" shape of the protocol suite:

```
        Many Application Protocols
   HTTP   DNS   SMTP   FTP   SSH  ...
              │     │     │
              ▼     ▼     ▼
            (TCP)       (UDP)        ← few transport protocols
                  │
                  ▼
                 IP                   ← ONE universal network protocol (the "narrow waist")
                  │
                  ▼
        Many Link Layer Technologies
   Ethernet  Wi-Fi  Cellular  Fiber  ...
```

The "narrow waist" at IP is the key architectural insight: **any** application protocol can run over **any** physical medium, as long as both sides agree on IP in the middle. This is why you can browse the same web (HTTP) whether you're on Ethernet, Wi-Fi, or cellular — the application doesn't need to know or care about the physical medium, and new physical media (5G, satellite) don't require rewriting application protocols. This single design decision is arguably the most important reason the Internet was able to scale and evolve for 50+ years without a fundamental redesign.

---

## Tips

- Don't get hung up on whether to use the 4-layer or 5-layer version of the TCP/IP model — they describe identical reality, just with different granularity at the bottom.
- When someone says "Layer 3" in casual conversation among network engineers, they almost always mean the IP/routing layer (consistent in both OSI and TCP/IP numbering for this layer specifically) — this is one of the few layer numbers that's unambiguous across both models.
- Remember: IP is unreliable by design — this isn't a flaw, it's a deliberate architectural choice that pushed complexity to the edges (TCP) and kept the core of the network simple and fast.

---

## Summary

- The TCP/IP model has 4 layers (or 5, in the commonly-taught variant): Network Access, Internet, Transport, Application.
- It's what's actually implemented in every Internet-connected device, unlike OSI which is primarily a teaching/conceptual framework.
- TCP/IP won the protocol wars due to simplicity, openness, and being already deployed when OSI protocols were still being finalized.
- IP (Internet layer) is deliberately unreliable and connectionless — reliability is delegated to TCP at the Transport layer when needed.
- The "hourglass" shape — one universal IP layer between many application protocols above and many physical media below — is the key architectural reason the Internet has scaled for decades without fundamental redesign.
