---
title: "TCP Fundamentals"
sidebar_label: "TCP Fundamentals"
sidebar_position: 40
---

# TCP Fundamentals

TCP (Transmission Control Protocol) is the reliable, ordered, connection-oriented transport protocol that underlies most internet applications. First described in 1974 by Cerf and Kahn, it has been refined over 50 years into one of the most studied protocols in existence.

---

## History

| Year | Event |
|---|---|
| 1974 | Cerf & Kahn publish "A Protocol for Packet Network Intercommunication" — original TCP/IP paper |
| 1978 | TCP and IP formally separated into two protocols (was one in 1974) |
| 1981 | **RFC 793** — TCP specification; foundational document still referenced today |
| 1989 | RFC 1122 — TCP host requirements; clarifies edge cases |
| 1988 | RFC 1072 — TCP extensions for high performance |
| 1996 | RFC 2001 — TCP slow start, congestion avoidance (Tahoe) formalized |
| 1999 | RFC 2581 — TCP congestion control (Reno refinements) |
| 2009 | RFC 5681 — current TCP congestion control standard |
| 2018 | RFC 8312 — CUBIC algorithm standardized; Linux default since 2006 |
| 2016+ | BBR (Bottleneck Bandwidth and RTT) — Google's modern algorithm, deployed in GCP |

---

## TCP Header

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 ├───────────────────────────────┼───────────────────────────────┤
 │         Source Port           │       Destination Port        │
 ├───────────────────────────────┴───────────────────────────────┤
 │                        Sequence Number                        │
 ├───────────────────────────────────────────────────────────────┤
 │                    Acknowledgment Number                      │
 ├───────┬───────┬───────────────────────────────────────────────┤
 │  Data │Reserv │  Flags  │            Window Size              │
 │Offset │       │ CWR ECE │                                     │
 │       │       │ URG ACK │                                     │
 │       │       │ PSH RST │                                     │
 │       │       │ SYN FIN │                                     │
 ├───────┴───────┴───────────────┼───────────────────────────────┤
 │           Checksum            │          Urgent Pointer       │
 ├───────────────────────────────┴───────────────────────────────┤
 │                   Options (if Data Offset > 5)                │
 └───────────────────────────────────────────────────────────────┘
```

| Field | Size | Description |
|---|---|---|
| Source Port | 16 bits | Sending port (ephemeral: 49152–65535 for clients) |
| Destination Port | 16 bits | Receiving port (well-known: HTTP=80, HTTPS=443, etc.) |
| Sequence Number | 32 bits | Byte offset of this segment's first data byte; initial value is random (ISN) |
| Acknowledgment Number | 32 bits | Next expected byte from the other side (seq+len of last received segment) |
| Data Offset | 4 bits | Header length in 32-bit words (min 5=20 bytes, max 15=60 bytes with options) |
| Flags | 9 bits | URG, ACK, PSH, RST, SYN, FIN, (CWR, ECE for ECN) |
| Window Size | 16 bits | Receive buffer space — flow control; sender can send this many bytes before ACK |
| Checksum | 16 bits | Error detection covering header + data (using pseudo-header with IP source/dest) |
| Urgent Pointer | 16 bits | Offset to urgent data when URG flag set (rarely used) |
| Options | 0–40 bytes | MSS, Window Scale, SACK, Timestamps (see below) |

### Common TCP Options

```
MSS (Maximum Segment Size) — carried only in SYN
  Negotiated: each side announces max segment it will accept
  Typical: 1460 bytes (Ethernet MTU 1500 − 20 IP − 20 TCP)

Window Scale (RFC 1323) — carried only in SYN
  Window Size field is 16 bits → max 65,535 bytes
  Window Scale multiplies it: actual window = Window × 2^scale_factor
  Scale factor 0–14; scale factor 7 = window up to 8 MB
  Essential for high-bandwidth × long-delay links (BDP >> 65K)

Selective ACK (SACK, RFC 2018)
  Allows receiver to acknowledge non-contiguous blocks
  Sender retransmits only the missing segments, not everything after the gap
  Huge improvement over cumulative ACK for lossy links

Timestamps (RFC 7323)
  Used to: accurately calculate RTT, handle PAWS (Protect Against Wrapped Sequence numbers)
  High-speed links wrap 32-bit sequence numbers quickly — timestamps prevent confusion

No-Operation (NOP)
  Padding to align options to 32-bit boundary

MPTCP (Multipath TCP, RFC 8684)
  Allows TCP connection to use multiple paths simultaneously (e.g., WiFi + LTE on mobile)
  Used by Apple (Siri, Maps) and increasing number of applications
```

---

## TCP Connection Establishment — Three-Way Handshake

```
Client                              Server
  │                                    │
  │ SYN seq=x                          │
  │ ─────────────────────────────────► │  Client: "I want to connect; my ISN is x"
  │                                    │
  │                   SYN-ACK seq=y    │
  │ ◄───────────────────────────────── │  Server: "OK; my ISN is y; I got your seq"
  │                   ack=x+1          │
  │                                    │
  │ ACK seq=x+1                        │
  │ ─────────────────────────────────► │  Client: "Got it; connection established"
  │ ack=y+1                            │
  │                                    │
  │ ════ DATA TRANSFER ═════════════ ► │
  │ ◄═══ DATA TRANSFER ═══════════════ │

Why random ISN?
  Prevents TCP sequence number attacks (blind reset, session hijacking)
  Both sides pick random Initial Sequence Numbers (ISN) independently
  SYN consumes one sequence number (as if it were 1 byte of data)
  FIN also consumes one sequence number
```

### Connection Options During SYN

```
SYN + options set during handshake (never changed after — no renegotiation):
  MSS — maximum segment size each side will accept
  SACK Permitted — both sides support selective ACK
  Window Scale — scaling factor for receive window
  Timestamps — enable timestamp option
  MPTCP — multipath capability

After handshake, these options remain constant for the connection lifetime.
```

---

## TCP Connection Termination — Four-Way Handshake

```
Client (active closer)          Server (passive closer)
  │                                    │
  │ FIN seq=u                          │
  │ ─────────────────────────────────► │  Client: "I'm done sending"
  │                                    │
  │              ACK ack=u+1           │
  │ ◄───────────────────────────────── │  Server: "Got your FIN; but I may still have data"
  │                                    │  Server enters CLOSE_WAIT; client enters FIN_WAIT_2
  │                                    │
  │              FIN seq=v             │
  │ ◄───────────────────────────────── │  Server: "Now I'm done too"
  │                                    │
  │ ACK ack=v+1                        │
  │ ─────────────────────────────────► │  Client: "Got your FIN"
  │                                    │
  │ [TIME_WAIT: 2 × MSL = 60–240 sec]  │  Client waits in TIME_WAIT before fully closing
  │                                    │
  │ [CLOSED]                           │  [CLOSED]

TIME_WAIT:
  Why 2×MSL (Maximum Segment Lifetime)?
  1. Ensure final ACK reaches server (if lost, server retransmits FIN and client re-ACKs)
  2. Allow old duplicate packets from this connection to expire from the network
     before a new connection with the same 4-tuple (src/dst IP+port) is opened

Half-close:
  One side can stop sending (FIN) while still receiving
  Data can flow one direction after first FIN
  Termination completes only when both FINs are ACKed

RST (Reset):
  Immediate abnormal termination — no graceful close
  Sent when: received packet doesn't belong to any connection, port is closed,
    or application error requires immediate close
  The other side sees RST, closes immediately (no TIME_WAIT)
```

---

## Flow Control

Flow control prevents a fast sender from overwhelming a slow receiver.

```
Receive Window (rwnd):
  Each TCP segment advertises how many bytes the receiver's buffer can accept
  Sender must not have more than rwnd bytes "in flight" (sent but not yet ACKed)

Window update:
  Receiver sends ACK with updated window when buffer drains
  If window = 0: sender must stop until receiver opens window (Zero Window Probe keeps connection alive)

Silly Window Syndrome:
  Receiver opens window just 1-2 bytes → sender sends tiny segments → inefficient
  Fix: Clark's algorithm (receiver delays advertising window until substantial space available)
       Nagle's algorithm (sender buffers small writes until ACK or full MSS — see below)

Nagle's Algorithm (RFC 896):
  "A TCP sender may send a small segment only if there is no unacknowledged data"
  In practice: buffer small writes; send when (1) full MSS, or (2) all previous data ACKed
  Effect: coalesces many small writes into one large segment — much more efficient
  Disable with TCP_NODELAY for latency-sensitive apps (games, VoIP, interactive terminals)
```

---

## Reliability — Retransmission

```
Positive Acknowledgment with Retransmission (PAR):
  Sender transmits → starts Retransmission Timeout (RTO) timer
  If ACK received before timeout: success → send next data
  If timeout: retransmit the segment

RTO calculation:
  SRTT = smoothed RTT estimate (exponential weighted moving average)
  RTTVAR = RTT variance
  RTO = SRTT + 4 × RTTVAR   (RFC 6298)
  Min RTO: 1 second (RFC 6298) — prevents overly aggressive retransmits

Fast Retransmit (RFC 5681):
  When receiver receives out-of-order data, it sends duplicate ACKs for the last in-order byte
  If sender receives 3 duplicate ACKs (dupACKs): retransmit the missing segment immediately
  WITHOUT waiting for RTO — much faster recovery than timeout-based retransmit
  Combined with SACK: sender knows exactly which segments are missing

Cumulative ACK:
  ACK 1001 means: "I have received all bytes up to and including 1000"
  Not: "I received segment 1001"
```

---

## TCP State Machine

```
CLOSED
  │ (passive open: server)    (active open: client)
  ▼                                ▼
LISTEN                          SYN_SENT
  │ (receive SYN)                  │ (receive SYN+ACK)
  ▼                                ▼
SYN_RECEIVED ◄── (also if   ESTABLISHED ◄────── both sides in ESTABLISHED = connection up
  │               simultaneous     │
  │ (receive ACK) open)            │ (active close: send FIN)
  ▼                                ▼
ESTABLISHED                    FIN_WAIT_1
  │ (passive close: receive FIN)   │ (receive ACK)
  ▼                                ▼
CLOSE_WAIT                     FIN_WAIT_2
  │ (send FIN)                     │ (receive FIN)
  ▼                                ▼
LAST_ACK                       TIME_WAIT
  │ (receive ACK)                  │ (2×MSL timeout)
  ▼                                ▼
CLOSED                         CLOSED

Key states in troubleshooting:
  ESTABLISHED   — connection fully up
  TIME_WAIT     — normal post-close; high count = many short-lived connections (HTTP/1.0)
  CLOSE_WAIT    — server got FIN, hasn't closed its side — application bug if stuck here
  SYN_RECEIVED  — three-way handshake in progress; high count = SYN flood attack
  FIN_WAIT_2    — waiting for server's FIN; stuck = server application didn't close

netstat / ss commands:
  netstat -tnp          ! TCP connections with process
  ss -tnp               ! faster alternative to netstat
  ss -s                 ! summary of connection states
  ss state TIME-WAIT    ! count TIME_WAIT connections
```

---

## TCP Port Numbers

```
Well-Known Ports: 0–1023 (requires root/admin to bind)
Registered Ports: 1024–49151
Dynamic/Ephemeral: 49152–65535 (client source ports)

Common TCP services:
  FTP data: 20, FTP control: 21
  SSH: 22
  Telnet: 23 (insecure — avoid)
  SMTP: 25
  DNS: 53 (also UDP)
  HTTP: 80
  POP3: 110
  IMAP: 143
  HTTPS: 443
  SMTPS: 465 / 587
  IMAPS: 993
  POP3S: 995
  MySQL: 3306
  RDP: 3389
  PostgreSQL: 5432
  Redis: 6379
  MongoDB: 27017

A connection is identified by: {src IP, src port, dst IP, dst port, protocol}
Two connections with the same src/dst IP and ports but different protocol (TCP vs UDP) are different.
```

---

## Tips

- TIME_WAIT is normal and correct — don't try to aggressively reduce it by setting `SO_REUSEADDR` everywhere without understanding the implications (can allow new connections to receive stale packets from the old connection).
- TCP_NODELAY disables Nagle's algorithm — use it for interactive protocols (SSH, gaming, VoIP signaling) but not for bulk data transfer (bulk needs Nagle's coalescing).
- Asymmetric routing breaks TCP — if SYN goes one path and SYN-ACK returns a different path through a stateful firewall, the firewall drops the SYN-ACK (no matching SYN state).
- The 3-way handshake adds at least 1 round-trip of latency before any data can flow — TLS adds more; QUIC (UDP-based) eliminates some of this overhead.
- SYN floods exploit TIME_WAIT state and SYN_RECEIVED accumulation — mitigate with SYN cookies, rate limiting, and syn flood protection at the firewall.

---

## Summary

- TCP provides reliable, ordered, connection-oriented delivery via sequence numbers, acknowledgments, and retransmission.
- The three-way handshake (SYN → SYN-ACK → ACK) establishes connection and negotiates options (MSS, window scale, SACK, timestamps).
- The four-way handshake (FIN → ACK → FIN → ACK) terminates connections; TIME_WAIT (2×MSL) ensures clean termination.
- Flow control uses the receive window (rwnd) — sender limited to rwnd bytes in flight; prevents overwhelming a slow receiver.
- Fast Retransmit: 3 duplicate ACKs trigger immediate retransmit of lost segment without waiting for RTO.
- Nagle's algorithm coalesces small writes into full segments — disable with TCP_NODELAY for latency-sensitive apps.
