---
title: "TCP Advanced — Congestion Control & Performance"
sidebar_label: "TCP Advanced"
sidebar_position: 41
---

# TCP Advanced — Congestion Control & Performance

TCP's congestion control is one of the most important algorithmic achievements in networking. This page traces its evolution from Van Jacobson's 1988 crisis fix through BBR's modern bandwidth-probing approach.

---

## The 1986 Internet Congestion Collapse

In October 1986, ARPANET throughput between LBL (Lawrence Berkeley Laboratory) and UC Berkeley dropped from 32 kbps to 40 bps — a 1000× reduction. The cause: TCP senders kept retransmitting into an already-congested network, making it worse (a positive feedback loop).

Van Jacobson diagnosed the problem and developed a fix — published as RFC 1072 (1988) and later RFC 2001 (1996). His algorithms — slow start, congestion avoidance, fast retransmit, and fast recovery — became the foundation of all TCP congestion control that followed.

---

## Core Congestion Control Concepts

```
Congestion Window (cwnd):
  Sender-side limit: sender can have at most min(cwnd, rwnd) bytes in flight
  Managed by congestion control algorithms (adjusted up/down based on signals)

Sender's effective window:
  send_window = min(congestion_window, receive_window)
  → limited by BOTH the network's capacity AND the receiver's buffer

Congestion signals (how TCP detects congestion):
  1. Packet loss:
     - Timeout (RTO): segment not ACKed in time → severe congestion signal
     - Triple duplicate ACK: out-of-order segments → mild congestion signal (fast retransmit)
  2. ECN (Explicit Congestion Notification, RFC 3168):
     - Network marks packets instead of dropping them
     - Much earlier signal than actual loss

Slow Start Threshold (ssthresh):
  Boundary between Slow Start (exponential growth) and Congestion Avoidance (linear growth)
  Initial value: typically 65535 bytes (or infinity — up to implementation)
  Updated when congestion detected
```

---

## TCP Tahoe (Van Jacobson, 1988)

The original congestion control. Named after Lake Tahoe (site of the USENIX conference).

```
Algorithm phases:

1. SLOW START (exponential growth):
   cwnd starts at 1 MSS
   Each ACK received: cwnd += 1 MSS
   → cwnd doubles every RTT
   → NOT actually "slow" — grows exponentially
   → Continues until cwnd ≥ ssthresh

2. CONGESTION AVOIDANCE (linear growth):
   cwnd starts at ssthresh
   Each RTT (approx): cwnd += 1 MSS
   → Additive Increase — probes for more bandwidth cautiously
   → Continues until loss detected

3. ON LOSS (any loss — timeout OR triple dupACK):
   ssthresh = max(cwnd/2, 2 MSS)   ! save half of cwnd as new threshold
   cwnd = 1 MSS                     ! back to slow start!
   Return to phase 1

Visualized (saw-tooth pattern):
cwnd ^
     │    /
     │   /  (slow start)
     │  /
     │ /
ssth │.........
     │        \ /       (congestion avoidance)
     │         /
     │        /
     1───────────────► time
       loss → reset
```

**Tahoe's weakness:** Triple dupACK (mild loss) and timeout (catastrophic loss) get the same reaction — drop to cwnd=1. This is too conservative for dupACK.

---

## TCP Reno (1990)

Added Fast Recovery — different response to dupACK vs timeout.

```
On triple duplicate ACK (mild loss signal):
  1. FAST RETRANSMIT: immediately send the missing segment (don't wait for RTO)
  2. FAST RECOVERY:
     ssthresh = max(cwnd/2, 2 MSS)
     cwnd = ssthresh + 3 MSS   ! NOT back to 1 — stay at half capacity
     → Each additional dupACK: cwnd += 1 MSS (inflate by dupACKs in flight)
     → When new ACK arrives (hole filled): cwnd = ssthresh (deflate)
     → Continue in Congestion Avoidance from ssthresh (not Slow Start)

On TIMEOUT (severe loss signal):
  Same as Tahoe: ssthresh = cwnd/2; cwnd = 1 MSS; slow start

Reno's weakness:
  Only one segment can be recovered per RTT
  If multiple segments lost: enters Slow Start after partial recovery ("multiple losses")
  This is called "Reno's problem with multiple losses"
```

---

## TCP NewReno (RFC 3782, 1996-1999)

Fixed Reno's multiple-loss problem by tracking partial ACKs and retransmitting additional missing segments during Fast Recovery without leaving recovery mode.

---

## SACK-Based Congestion Control (RFC 2018 + RFC 2883)

With SACK, the sender knows exactly which segments arrived and which are missing — allows retransmitting only the lost segments (Selective Repeat). Combined with Fast Recovery, this handles multiple losses in one RTT much more efficiently than Reno.

---

## TCP CUBIC (RFC 8312, 2008)

CUBIC replaced the additive-increase with a cubic function — designed for high-bandwidth, long-delay networks (BDP ≫ 1 MB).

```
Growth function:
  W(t) = C × (t - K)³ + W_max

  where:
    t = time since last congestion event
    W_max = window size at last congestion event
    K = time to grow back to W_max = ∛(W_max × β / C)
    C = 0.4 (scaling constant)
    β = 0.7 (multiplicative decrease factor — less aggressive than Reno's 0.5)

Key properties:
  Slow initial increase (concave portion) — careful near W_max where last loss occurred
  Fast increase in mid-range (far from W_max)
  Slow again near W_max (probing cautiously)
  Unlike Reno: growth rate is independent of RTT — fair to flows with different delays

On loss:
  W_max = cwnd (save current window)
  cwnd = cwnd × β = cwnd × 0.7 (multiplicative decrease — less drastic than /2)
  ssthresh = cwnd
  Enter Fast Recovery, then Congestion Avoidance with cubic growth

Status: Default in Linux since 2006; Windows since Windows 10; macOS uses its own variant
```

---

## TCP BBR — Bottleneck Bandwidth and RTT (Google, 2016)

BBR is a fundamentally different approach. Instead of reacting to packet loss (which indicates full queues, not full links), BBR models the actual bottleneck bandwidth and RTT.

```
Key insight:
  Loss-based algorithms like CUBIC react AFTER queues are full — they operate at peak loss rate
  BBR models what the network can ACTUALLY deliver — targets high throughput with low latency
  BBR explicitly probes for BtlBW (bottleneck bandwidth) and RTprop (minimum RTT)

BBR's model:
  BtlBW = measured delivery rate at bottleneck
  RTprop = minimum RTT observed (no queuing delay = empty queue)
  Optimal operating point = BtlBW × RTprop (the Bandwidth-Delay Product)

BBR Phases:
  STARTUP: exponential growth (like Slow Start) until delivery rate stops increasing
  DRAIN: reduce pacing to drain any queue built during STARTUP
  PROBE_BW: steady state, cycles pacing rate to probe for more bandwidth periodically
  PROBE_RTT: periodically reduce cwnd to 4 packets to measure true minimum RTT (drain queues)

Key BBR properties:
  Pacing-based (not burst): sends packets evenly over time at the estimated BtlBW rate
  NOT triggered by loss: retransmits only when necessary — doesn't overreact to AQM drops
  Achieves high throughput AND low latency — fills the pipe without filling the queue
  Unfairness: BBRv1 can be unfair to CUBIC flows (takes more bandwidth); BBRv2 improves this

Deployment:
  Google deployed BBR v1 in 2016; reported 2-25% throughput improvement, 75%+ latency reduction on congested paths
  Available in Linux kernel 4.9+; widely used in CDNs, cloud providers
  BBRv2 (2019+) addresses fairness issues
```

---

## Bandwidth-Delay Product (BDP)

BDP is the volume of data that can be "in flight" on a network path at any time:

```
BDP = Bandwidth (bits/sec) × RTT (seconds)

Example: 1 Gbps WAN link, 100ms RTT
  BDP = 1,000,000,000 × 0.1 = 100,000,000 bits = ~12.5 MB

Implication:
  TCP window must be at least 12.5 MB to fully utilize this link
  Without Window Scale option (max window 65,535 bytes = 64 KB), throughput is capped at:
    64,000 bytes / 0.1 sec = 640 KB/s — only 0.5% of 1 Gbps capacity!
  With Window Scale (scale factor 8): window up to 16 MB → can fill the pipe

"Long Fat Network" (LFN) = high BDP — requires:
  Large receive windows (Window Scale option)
  SACK (for efficient loss recovery)
  Timestamps (for RTT measurement and PAWS)
  These three are RFC 7323 "TCP Extensions for High Performance"
```

---

## TCP Performance Diagnostics

```bash
# Linux: show TCP congestion control
sysctl net.ipv4.tcp_congestion_control      # current algorithm
cat /proc/sys/net.ipv4.tcp_available_congestion_control
sysctl -w net.ipv4.tcp_congestion_control=bbr  # switch to BBR

# Show socket statistics
ss -ti dst 8.8.8.8     # detailed TCP info for connection to 8.8.8.8
# Output includes: cwnd, ssthresh, rtt, delivery_rate, retrans

# iperf3 — measure TCP throughput
iperf3 -s                                   # server
iperf3 -c 10.0.0.1 -t 30 -P 4            # client: 30s test, 4 parallel streams

# netstat — connection statistics
netstat -s | grep -i "tcp\|retransmit\|segment"

# tcpdump — capture TCP headers
tcpdump -i eth0 tcp and host 10.0.0.1 -w capture.pcap

# Wireshark TCP stream analysis:
# Statistics → TCP Stream Graphs → Time Sequence (shows cwnd growth)
# Statistics → TCP Stream Graphs → Throughput
# Statistics → TCP Stream Graphs → RTT (round-trip time over time)

# Check for TCP buffer tuning (Linux)
sysctl net.core.rmem_max         # max receive socket buffer
sysctl net.core.wmem_max         # max send socket buffer
sysctl net.ipv4.tcp_rmem         # min/default/max TCP receive buffer
sysctl net.ipv4.tcp_wmem         # min/default/max TCP send buffer
# For high-BDP networks, increase max buffers:
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"
```

---

## ECN — Explicit Congestion Notification (RFC 3168)

ECN allows routers to mark packets (instead of dropping them) when congestion begins — TCP gets an early warning before loss occurs.

```
How it works:
  1. TCP negotiates ECN capability in the SYN (ECE + CWR flags in SYN/SYN-ACK)
  2. IP header ECN field: CE (Congestion Experienced) set by congested router
  3. Receiver echoes CE to sender via ECE flag in ACK
  4. Sender reacts as if loss occurred (halves cwnd) but WITHOUT actual packet drop
  5. Sender sets CWR (Congestion Window Reduced) flag in next segment to acknowledge

Benefit:
  Reduces latency — react to congestion BEFORE queue fills and drops occur
  Particularly valuable in data centers (DCB — Data Center Bridging, DCQCN, DCTCP)

DCTCP (Data Center TCP, RFC 8257):
  Uses multi-bit ECN marking (proportion of marked packets) to scale response
  Keeps queue occupancy very low → microsecond latency in data center fabrics
  Widely deployed in cloud provider networks (AWS, Azure, Google)
```

---

## Tips

- BBR is generally better than CUBIC for WAN connections with varying RTT and mild packet loss — but test in your environment; BBRv1 can hurt competing CUBIC flows.
- For maximum TCP performance on high-BDP links, ensure: Window Scale enabled, SACK enabled, TCP buffers tuned (Linux defaults are often too small).
- If TCP throughput is low on a high-speed link, check the effective window: `throughput = window / RTT`. If limited, enable or increase Window Scale.
- Asymmetric paths (send/receive going different routes) can cause duplicate ACKs and spurious retransmits — check routing when unexplained retransmission rate is high.
- SYN cookies mitigate SYN flood attacks at the cost of losing the ability to negotiate options (MSS, SACK, Window Scale don't work with SYN cookies) — acceptable trade-off for most servers.

---

## Summary

- TCP congestion control evolved from Van Jacobson's 1988 crisis fix through Tahoe → Reno → NewReno → SACK → CUBIC → BBR.
- Slow Start: exponential cwnd growth until ssthresh; Congestion Avoidance: linear (additive) growth afterward.
- Fast Retransmit + Fast Recovery: triple dupACK triggers immediate retransmit and halves cwnd (without dropping to 1 MSS like timeout does).
- CUBIC uses a cubic growth function, independent of RTT — fairer across flows with different delays; default in Linux/Windows/macOS.
- BBR models the bottleneck bandwidth and RTT directly — achieves high throughput without filling queues, avoiding the latency penalty of loss-based algorithms.
- For Long Fat Networks: enable Window Scale, SACK, and Timestamps (RFC 7323), and tune OS TCP buffer sizes to match the path's BDP.
