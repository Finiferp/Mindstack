---
title: "Quality of Service"
sidebar_label: "QoS"
sidebar_position: 51
---

# Quality of Service

QoS is a set of techniques to manage bandwidth, latency, jitter, and packet loss for different traffic types. Without QoS, all packets compete equally for resources — voice calls break up, video freezes, and the CEO's Teams call suffers while a file backup runs.

---

## Why QoS

Networks have finite bandwidth. When links are congested, routers drop packets from their queues. Without QoS, the choice of what to drop is random (tail-drop) — harmful to real-time traffic like voice and video that can't tolerate loss or delay.

```
QoS goals:
  Bandwidth management: guarantee minimum, limit maximum per class
  Low latency: voice requires < 150ms one-way; interactive video < 100ms
  Low jitter: variation in delay; voice requires < 30ms jitter
  Low loss: voice can tolerate < 1% loss; video 0.1%

QoS is only needed at congestion points:
  Fast links (10G+): rarely congested
  Slow WAN links, uplinks with mismatched speeds: where QoS matters most
  "If you have enough bandwidth, you don't need QoS" — true but rarely the case
```

---

## The QoS Model

```
Three approaches:
  Best Effort (no QoS): all packets treated equally; first-come-first-served
  IntServ (Integrated Services, RFC 2210):
    Per-flow reservation via RSVP
    Hard guarantees; doesn't scale (per-flow state in every router)
    Used for: specific high-value flows; not internet-scale

  DiffServ (Differentiated Services, RFC 2474, current standard):
    Mark packets at the edge into classes (aggregates)
    Network treats classes differently (not individual flows)
    Scalable: routers just look at the marking, no per-flow state
    Dominant model in enterprise and SP networks
```

---

## DiffServ — Marking Packets

### DSCP (Differentiated Services Code Point)

The top 6 bits of the IPv4 ToS byte (or IPv6 Traffic Class byte) carry the DSCP value.

```
IPv4 ToS byte (8 bits):
  ┌─────────────────────────┬──────┐
  │    DSCP (6 bits)        │ ECN  │
  │    0-63                 │(2bit)│
  └─────────────────────────┴──────┘

DSCP values → PHB (Per-Hop Behavior):
  CS (Class Selector): backward compatible with old IP Precedence (3 bits)
    CS0 = 0   (000000) — Default (best effort)
    CS1 = 8   (001000)
    CS2 = 16  (010000)
    CS3 = 24  (011000)
    CS4 = 32  (100000)
    CS5 = 40  (101000) — RSVP / Signaling
    CS6 = 48  (110000) — Network control (routing protocols)
    CS7 = 56  (111000) — Reserved

  AF (Assured Forwarding, RFC 2597): four classes, three drop precedences
    Format: AF[class][drop]
    AFxy where x=class(1-4), y=drop(1=low,2=med,3=high)

    AF11=10, AF12=12, AF13=14  — Class 1 (low-priority data)
    AF21=18, AF22=20, AF23=22  — Class 2 (medium data)
    AF31=26, AF32=28, AF33=30  — Class 3 (high-priority data)
    AF41=34, AF42=36, AF43=38  — Class 4 (multimedia)

  EF (Expedited Forwarding, RFC 3246):
    DSCP 46 (101110)
    Low latency, low loss, low jitter: voice, real-time video
    Must be rate-limited at ingress (policed) to prevent starvation of other classes

  DSCP 0 (CS0): Default / Best Effort
  DSCP 48 (CS6): Network control — OSPF/BGP/STP packets should be marked here

Common marking table:
  Traffic type          → DSCP value  → Name
  VoIP (RTP media)     → 46          → EF
  VoIP signaling       → 24-40       → CS3/CS5
  Video conferencing   → 34          → AF41
  Call signaling       → 24          → CS3
  Critical data        → 26          → AF31
  Bulk data            → 10          → AF11
  Best effort          → 0           → CS0/Default
  Network control      → 48          → CS6
  Scavenger            → 8           → CS1
```

### CoS (Class of Service) — Layer 2

802.1Q frames carry a 3-bit Priority Code Point (PCP) / CoS field in the VLAN tag.

```
PCP value → traffic class:
  7 — Network critical
  6 — InterNetwork Control
  5 — Voice < 10ms latency
  4 — Video < 100ms latency
  3 — Critical applications
  2 — Excellent effort
  1 — Background
  0 — Best effort (default)

At Layer 3 boundaries: CoS → DSCP mapping needed (trust boundary)
At Layer 2 boundaries: CoS preserved in 802.1Q tags

MPLS TC (3-bit EXP): equivalent to CoS in MPLS; mapped from DSCP on ingress PE
```

---

## QoS Mechanisms

### Classification and Marking

```
Where to classify and mark:
  Ingress (trust boundary) — at the edge where traffic enters
  Never trust markings from untrusted devices (endpoints, phones can lie)
  Phones: trust phone DSCP markings (managed devices); remark PC traffic to 0

Cisco MQC (Modular QoS CLI):
  class-map: match traffic (ACL, DSCP, protocol, port, NBAR)
  policy-map: define actions per class (mark, police, shape, queue)
  service-policy: apply to interface

! Example: classify and mark
class-map match-any VOICE-RTP
 match ip dscp ef                      ! match already-marked EF traffic
 match protocol rtp                    ! NBAR (application recognition)

class-map match-any CRITICAL-DATA
 match ip dscp af31                    ! AF31 marked traffic
 match access-group name CRITICAL-ACL  ! or match by ACL

ip access-list extended CRITICAL-ACL
 permit tcp 10.0.0.0 0.255.255.255 any eq 443    ! HTTPS from internal

policy-map MARKING
 class VOICE-RTP
  set dscp ef                          ! remark (trust or override)
 class CRITICAL-DATA
  set dscp af31
 class class-default
  set dscp default                     ! remark everything else to 0

interface GigabitEthernet0/0
 service-policy input MARKING          ! apply inbound
```

### Policing and Shaping

```
Policing — enforce rate limit; excess traffic is DROPPED (or re-marked)
  Instantaneous enforcement; hard cap
  Common for: rate limiting customer traffic at ISP edge

Shaping — smooth traffic by BUFFERING excess; delay instead of drop
  Adds buffering delay (jitter) but no drops (up to buffer size)
  Common for: matching WAN speed to avoid downstream queue drops

Token Bucket:
  Bucket holds tokens (credits)
  Token added at CIR (committed rate) continuously
  Packet transmission: consume tokens equal to packet size
  Burst: Bc (committed burst) = tokens accumulated over 1 burst interval
  Excess burst: Be (excess burst, policing only) = additional one-time burst

Cisco policing:
  policy-map POLICE
   class VOICE-RTP
    police rate 2000000 bps burst 8000 byte conform-action transmit exceed-action drop
    ! 2 Mbps; drop if exceeds
   class class-default
    police rate 8000000 bps conform-action transmit exceed-action set-dscp-transmit 0
    ! 8 Mbps; remark to 0 if exceeds (soft policing)

Cisco shaping:
  policy-map SHAPE
   class class-default
    shape average 4000000        ! shape to 4 Mbps average
```

### Queuing and Scheduling

```
Once traffic is classified and marked, queuing determines which packets
get sent first when the link is congested.

FIFO (First In, First Out):
  Default; no QoS; tail-drop when full; unfair to real-time traffic

Priority Queuing (PQ):
  Traffic class with higher priority is ALWAYS dequeued first
  Risk: lower priority classes can be starved forever if high-priority is bursty
  Use: only for voice (strict priority) — limited to < 33% of link bandwidth

CBWFQ (Class-Based Weighted Fair Queuing):
  Minimum bandwidth guarantee per class
  Excess bandwidth shared proportionally
  No absolute priority (all classes share fairly)

LLQ (Low Latency Queuing) = PQ + CBWFQ:
  Most common in enterprise voice/video QoS
  Strict priority queue for voice (EF) — guaranteed, rate-limited to prevent starvation
  CBWFQ for other classes (guaranteed minimums + fair sharing of excess)
  Remainder: best-effort class-default

Cisco LLQ config:
  policy-map WAN-QOS
   class VOICE-RTP
    priority 500                     ! strict priority; 500 Kbps; policed
   class VIDEO-CONF
    bandwidth 2000                   ! minimum 2 Mbps guarantee (CBWFQ)
   class CRITICAL-DATA
    bandwidth percent 20             ! 20% minimum bandwidth
   class class-default
    fair-queue                       ! WFQ for remainder

  interface Serial0/0
   service-policy output WAN-QOS
```

### Congestion Avoidance — WRED

```
WRED (Weighted Random Early Detection):
  Monitors queue depth
  Begins randomly dropping packets BEFORE the queue is full
  Drop probability increases as queue fills
  TCP senders detect early drops (vs timeout) → reduce send rate proactively
  Different DSCP classes get different drop thresholds:
    High-priority DSCP: starts dropping later (larger min-threshold)
    Low-priority DSCP: starts dropping earlier (smaller min-threshold)

vs Tail-Drop (default):
  Tail-drop: all packets dropped when queue is 100% full
  Problem: TCP global synchronization — all flows back off simultaneously → throughput collapses
  WRED avoids global sync by staggering drops across flows

DSCP-based WRED (DSCP-WRED / DSCP-WRED):
  Each DSCP class has: min-threshold, max-threshold, drop probability
  AF classes: AF11/21/31/41 (low drop), AF12/22/32/42 (medium), AF13/23/33/43 (high)
  This is why AF has three drop precedences — WRED uses them!

Cisco WRED config:
  policy-map WRED-POLICY
   class CRITICAL-DATA
    random-detect dscp-based         ! DSCP-based WRED (vs default IP-precedence)
    bandwidth percent 40
```

---

## QoS in Practice

### Trust Boundaries

```
Where to mark traffic and where to trust existing markings:

Trusted zones:
  IP phones: mark RTP traffic as DSCP EF; trust this at switch port
    switchport voice vlan 10
    mls qos trust dscp          ! trust phone's DSCP markings

  Managed servers with known DSCP markings

Untrusted zones:
  User PCs: remark to 0 on ingress (users cannot be trusted)
    mls qos trust cos           ! trust CoS but remap per policy
    ! Or: remark all to 0, classify by ACL at aggregation layer

Trust boundary = where you stop trusting device's own markings
Typically: access layer switch → distribution switch boundary
```

### End-to-End QoS Design

```
Unified Communications QoS model (RFC 4594):
  Voice (RTP): DSCP EF (46); < 150ms latency, < 30ms jitter, < 1% loss
  Voice signaling (SIP/H.323): DSCP CS3 (24)
  Video conferencing: DSCP AF41 (34); < 150ms, < 30ms jitter, < 0.1% loss
  Streaming video: DSCP CS4 (32)
  Critical data: DSCP AF31 (26)
  Call signaling: DSCP CS3 (24)
  Transactional data: DSCP AF21 (18)
  Network management: DSCP CS2 (16)
  Bulk data: DSCP AF11 (10) or CS1
  Best effort: DSCP 0 (CS0)
  Scavenger (P2P, backup): DSCP CS1 (8) — below best effort!

LLQ policy for WAN:
  Voice (EF): strict priority, policed to ≤ 33% of link BW
  Video (AF41): 25% guaranteed
  Critical data (AF31): 20% guaranteed
  Network management (CS6): 5%
  Best effort: remainder
```

---

## Tips

- LLQ (strict priority + CBWFQ) is the industry standard for voice/video QoS — use it whenever real-time traffic shares a link with data.
- Police the EF queue to no more than 33% of link bandwidth — without policing, a surge of voice traffic can starve all other classes.
- Scavenger class (CS1 / DSCP 8) is set BELOW best effort — use it for backup, P2P, and bulk transfers that should yield to everything else.
- QoS at 1 Gbps or higher is often unnecessary in well-provisioned networks — the congestion point is usually the WAN uplink or a specific bottleneck.
- DSCP marking is preserved end-to-end across routed networks; CoS (802.1Q PCP) is not preserved across routed hops — re-map CoS to DSCP at Layer 3 boundaries.

---

## Summary

- DiffServ is the dominant QoS model: mark packets at the edge with DSCP; network forwards per class (PHB).
- Key DSCP values: EF (46) for voice, AF41 (34) for video, AF31 (26) for critical data, CS6 (48) for network control, CS0 (0) for default.
- AF classes have three drop precedences (1=low, 2=medium, 3=high) — used by WRED to preferentially drop lower-precedence traffic.
- LLQ = strict priority queue for voice/video + CBWFQ minimum guarantees for other classes — industry standard for WAN QoS.
- WRED drops packets before the queue is full — prevents TCP global synchronization and provides differentiated treatment by DSCP.
- Trust boundary: remark all untrusted device markings to 0 on ingress; classify by ACL or NBAR; re-mark to appropriate DSCP.
