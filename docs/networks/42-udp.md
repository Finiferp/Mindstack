---
title: "UDP and QUIC"
sidebar_label: "UDP & QUIC"
sidebar_position: 42
---

# UDP and QUIC

UDP is the minimal transport protocol — no connection, no reliability, no congestion control. QUIC is its modern heir: a high-performance protocol that replaces TCP for HTTP/3, running over UDP while implementing its own reliability and encryption.

---

## UDP — History

UDP (User Datagram Protocol) was defined by Jon Postel in RFC 768 (1980) — one of the shortest important RFCs in networking history (just 3 pages). It was intentionally minimal, embodying the end-to-end principle: let applications handle reliability if they need it.

```
RFC 768 (1980) — UDP specification — still in use unchanged, 40+ years later
UDP adds two things to raw IP:
  1. Port numbers (demultiplex to the right application)
  2. Optional checksum (error detection; mandatory in IPv6)
That's it. No connection establishment, no ACK, no ordering, no flow control.
```

---

## UDP Header

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 ├───────────────────────────────┼───────────────────────────────┤
 │         Source Port           │       Destination Port        │
 ├───────────────────────────────┼───────────────────────────────┤
 │             Length            │           Checksum            │
 └───────────────────────────────┴───────────────────────────────┘
```

| Field | Size | Description |
|---|---|---|
| Source Port | 16 bits | Sending port (optional — can be 0 if not needed) |
| Destination Port | 16 bits | Receiving port |
| Length | 16 bits | Length of UDP header + data in bytes (min 8 = header only) |
| Checksum | 16 bits | Error detection (optional in IPv4; mandatory in IPv6) |

Total header: **8 bytes** (vs 20 bytes minimum for TCP).

---

## UDP Characteristics

```
Connectionless:
  No handshake, no session — just send
  Application can send its first data immediately
  No teardown required

Unreliable:
  No acknowledgments
  No retransmission of lost packets
  No ordering guarantee (packets may arrive out of order)
  No duplicate detection (application receives duplicates if they occur)

No flow control:
  Sender can send as fast as it wants
  Receiver buffer overflow → packets silently dropped

No congestion control:
  UDP does not back off when network is congested
  "Unresponsive flows" — a concern for network fairness
  Applications must implement their own or risk causing congestion

Low overhead:
  8-byte header vs TCP's 20+ bytes
  No connection state to maintain
  No RTT measurement, no timer management

Datagram-oriented:
  Preserves message boundaries — one send() = one receive()
  vs TCP's byte stream (no message boundaries preserved)
```

---

## When to Use UDP vs TCP

```
Use UDP when:

Latency matters more than reliability:
  VoIP — losing a voice packet is better than delaying it by 100ms for retransmit
  Real-time video streaming — stale frames are useless; keep playing forward
  Online gaming — old position updates are useless; only current state matters

Application handles reliability itself:
  QUIC (HTTP/3) — runs over UDP but has its own reliability layer
  SCTP, DCCP — other transport protocols that use UDP-like properties
  Custom protocols with application-level retransmit logic

High-frequency small messages:
  DNS — one request, one response; TCP overhead for single query is wasteful
  SNMP monitoring polls
  NTP time synchronization
  DHCP — broadcasts before IP assigned; TCP not possible

Broadcast/Multicast:
  TCP is unicast only; UDP supports broadcast (255.255.255.255, subnet broadcast)
  and multicast (224.0.0.0/4)
  DHCP, RIP, some service discovery protocols use broadcast
  Video distribution uses multicast over UDP

Use TCP when:

Data integrity is critical:
  File transfers — every byte must arrive correctly and in order
  Email, web pages, database queries
  Any transaction where incomplete data is worse than delayed data

You don't want to implement reliability yourself:
  TCP's retransmit, ordering, flow control are proven — reinventing them is hard

The connection model fits:
  Request-response with a persistent connection
  Streaming data that benefits from flow control
```

---

## Common UDP Protocol Reference

| Port | Protocol | Notes |
|---|---|---|
| 53 | DNS | Also TCP for zone transfers and large responses |
| 67/68 | DHCP | 67=server, 68=client |
| 69 | TFTP | Trivial File Transfer Protocol; no auth |
| 123 | NTP | Network Time Protocol |
| 161/162 | SNMP | 161=polls, 162=traps |
| 500 | IKE | IPsec key exchange |
| 514 | Syslog | Legacy syslog (UDP is fire-and-forget) |
| 520 | RIP | Routing Information Protocol |
| 1194 | OpenVPN | (can also use TCP) |
| 1812/1813 | RADIUS | Authentication/accounting |
| 4500 | IKE NAT-T | IPsec through NAT |
| 5353 | mDNS | Multicast DNS |
| Various | RTP | Real-Time Protocol (voice/video); dynamically assigned 16384–32767 |

---

## QUIC — Quick UDP Internet Connections

QUIC was designed at Google in 2012 by Jim Roskind, initially as gQUIC (Google QUIC). The IETF standardized it as RFC 9000 in 2021. HTTP/3 (RFC 9114) runs over QUIC.

### Why QUIC?

TCP has a fundamental problem: it's implemented in the OS kernel. Changing TCP behavior requires OS updates — slow to deploy across the internet. QUIC runs in userspace over UDP — much faster to iterate and deploy.

```
TCP + TLS 1.3 connection:
  1. TCP SYN → SYN-ACK → ACK (1 RTT for handshake)
  2. TLS ClientHello → ServerHello → Certificate → ... (1–2 RTT for TLS)
  Total: 2–3 RTTs before first data byte

QUIC 0-RTT resumption (known server):
  First byte of data included in first packet!
  0 RTT to start sending data (using cached session secrets)
  Even first connection: 1 RTT (crypto handshake + connection establishment combined)
```

### QUIC Architecture

```
Application (HTTP/3)
      │
   QUIC (RFC 9000)
      ├─ Reliability (streams, ACKs, retransmit)
      ├─ Multiplexing (multiple independent streams)
      ├─ Encryption (TLS 1.3 integrated — not optional, always encrypted)
      ├─ Connection migration (connection survives IP address change)
      └─ Congestion control (per-stream or per-connection)
      │
    UDP
      │
     IP
```

### QUIC Key Features

```
Always encrypted (TLS 1.3 mandatory):
  Unlike TCP where encryption is optional (TLS runs over TCP)
  QUIC integrates TLS 1.3 into the protocol itself
  Almost all headers are encrypted (prevents middlebox interference)

Multiple independent streams:
  HTTP/2 over TCP: 10 streams, one lost packet blocks ALL 10 (HOL blocking)
  HTTP/3 over QUIC: 10 streams, one lost packet only blocks the one stream
  → Head-of-Line (HOL) blocking eliminated at the transport layer

Connection migration:
  Identified by Connection ID (not by IP+port like TCP)
  Mobile phone switches from WiFi to LTE:
    TCP: connection dies (IP changes), must reconnect
    QUIC: connection survives (same Connection ID)

Congestion control:
  Pluggable — can use CUBIC, BBR, or others
  More information available per stream → better signal

Connection establishment:
  Initial QUIC handshake: 1 RTT (combined crypto + transport)
  Session resumption: 0-RTT data in first packet
  Compare: TCP + TLS1.3 = minimum 2 RTT

0-RTT caveats:
  Replay attack risk — 0-RTT data can be replayed by attackers
  Safe for GET requests (idempotent); MUST NOT be used for POST/payments without protection
```

### QUIC vs TCP Comparison

| Feature | TCP + TLS | QUIC |
|---|---|---|
| Connection setup | 2–3 RTT | 1 RTT (0-RTT on resumption) |
| Encryption | Optional (TLS adds latency) | Always; integrated |
| HOL blocking | Yes (all streams stall) | No (per-stream) |
| Connection migration | No | Yes (Connection ID) |
| Middlebox compatibility | Excellent (decades of support) | Improving (some firewalls block UDP 443) |
| Deployment | OS kernel (slow to update) | Userspace (fast to update) |
| Header encryption | No | Yes (harder to inspect) |

### QUIC Deployment

```
HTTP/3 / QUIC adoption (2024):
  ~30% of websites support HTTP/3
  Cloudflare, Google, Facebook: all traffic over QUIC
  Chrome, Firefox, Safari, Edge: all support HTTP/3

Common port: UDP 443 (HTTPS equivalent)
  Some firewalls block UDP 443 → browsers fall back to TCP/TLS

Connection ID:
  Variable-length token (1–20 bytes)
  Chosen by client and server independently
  Allows connection to survive IP address change (mobile roaming)

QUIC used in:
  HTTP/3 (web)
  Google's internal RPC
  WebTransport (replacing WebSocket for real-time web apps)
  DoQ (DNS over QUIC, RFC 9250)
  MASQUE (VPN-like proxy)
```

---

## DCCP — Datagram Congestion Control Protocol (RFC 4340)

A lesser-known but elegant protocol designed for real-time media: like UDP but adds congestion control without reliability. Fills the gap between "TCP (reliable, congestion-controlled)" and "UDP (neither)". Rarely deployed but influential as a design reference.

---

## SCTP — Stream Control Transmission Protocol (RFC 4960)

Designed for telecom signaling (SS7 over IP). Features: multi-homing (connect via multiple interfaces natively), multi-streaming (HOL blocking prevention — predates QUIC), message boundaries preserved. Used in: 3G/4G/5G core networks (S1AP, X2AP), diameter protocol transport.

---

## Tips

- DNS over UDP is limited to 512 bytes in the original spec; larger responses (DNSSEC, many records) require EDNS0 extension or fall back to TCP — this is why "DNSSEC breaks DNS" was a concern in early deployments.
- QUIC's 0-RTT must be used carefully — treat 0-RTT data as potentially replayed; only use for idempotent operations.
- Stateful firewalls tracking UDP flows expect traffic in both directions within a timeout (typically 30–120 seconds) — UDP "connections" in firewall state tables time out if only one direction of traffic is seen.
- The Internet's congestion ecosystem depends on TCP's cooperative congestion control — unresponsive UDP floods are antisocial and will be filtered/rate-limited by ISPs.
- For custom real-time protocols over UDP, implement at minimum: sequence numbers (detect out-of-order/loss), timestamps (RTT calculation), and some form of congestion response (even simple: reduce rate when loss detected).

---

## Summary

- UDP adds port numbers and optional checksum to IP — nothing else; 8-byte header; connectionless, unreliable, message-boundary-preserving.
- Use UDP for latency-sensitive (VoIP, gaming), broadcast/multicast, or high-frequency small messages (DNS, NTP, SNMP).
- QUIC (RFC 9000) runs over UDP, always encrypts with TLS 1.3, eliminates HOL blocking via independent streams, and supports 0-RTT connection resumption.
- HTTP/3 runs over QUIC — ~30% of the web as of 2024; all major browsers and CDNs support it.
- QUIC enables connection migration: the connection survives an IP address change (mobile switching from WiFi to LTE) via Connection IDs.
- 0-RTT data risks replay attacks — only use for idempotent (safe-to-repeat) requests.
