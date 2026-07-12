---
title: "IPv4 Subnetting — Worked Examples"
sidebar_label: "Subnetting Practice"
sidebar_position: 22
---

# IPv4 Subnetting — Worked Examples

Forty worked problems covering every subnetting scenario: given-host-find-subnet, VLSM design, summarization, and supernet verification. Work through these until the approach is instinctive.

---

## Type 1: Find Network/Broadcast Given IP + Mask

### Problem 1 — /24 (baseline)

**Given:** `10.5.3.88/24`

```
Mask: 255.255.255.0 → interesting octet = 4th, but mask = 0 → all host bits
Block: 256 − 0 = 256 → only one subnet in this /24

Network:   10.5.3.0
Broadcast: 10.5.3.255
First host:10.5.3.1
Last host: 10.5.3.254
Hosts:     254
```

---

### Problem 2 — /26

**Given:** `192.168.1.200/26`

```
Mask: 255.255.255.192 → interesting octet = 4th
Block: 256 − 192 = 64
Subnets: .0, .64, .128, .192

200 falls in .192 subnet (192 ≤ 200 < 256)

Network:   192.168.1.192
Broadcast: 192.168.1.255
First host:192.168.1.193
Last host: 192.168.1.254
Hosts:     62
```

---

### Problem 3 — /19

**Given:** `172.20.150.0/19`

```
Mask: 255.255.224.0 → interesting octet = 3rd
Block: 256 − 224 = 32
Subnets in 3rd octet: .0, .32, .64, .96, .128, .160, .192, .224

150 falls in .128 subnet (128 ≤ 150 < 160)

Network:   172.20.128.0
Broadcast: 172.20.159.255  (next subnet starts at 172.20.160.0 → −1)
First host:172.20.128.1
Last host: 172.20.159.254
Hosts:     2^13 − 2 = 8,190
```

---

### Problem 4 — /21

**Given:** `10.0.200.55/21`

```
Mask: 255.255.248.0 → interesting octet = 3rd
Block: 256 − 248 = 8
Subnets: .0, .8, .16, ... .192, .200, .208, ...

200 falls in .200 subnet (200 ≤ 200 < 208)

Network:   10.0.200.0
Broadcast: 10.0.207.255
First host:10.0.200.1
Last host: 10.0.207.254
Hosts:     2^11 − 2 = 2,046
```

---

### Problem 5 — /12

**Given:** `172.31.45.200/12`

```
Mask: 255.240.0.0 → interesting octet = 2nd
Block: 256 − 240 = 16
Subnets in 2nd octet: .0, .16, .32, ...

172.31 → 2nd octet = 31; 16 ≤ 31 < 32 → subnet in .16 range

Network:   172.16.0.0
Broadcast: 172.31.255.255
First host:172.16.0.1
Last host: 172.31.255.254
Hosts:     2^20 − 2 = 1,048,574
```

---

## Type 2: Design Subnets for a Given Number of Hosts

### Problem 6 — Find Prefix for 60 Hosts

```
Need ≥ 60 hosts
2^5 = 32 → not enough
2^6 = 64 − 2 = 62 ✓

Prefix: /26 (32 − 6 = 26)
Mask:   255.255.255.192
```

---

### Problem 7 — Find Prefix for 500 Hosts

```
2^8 = 256 − 2 = 254 → not enough
2^9 = 512 − 2 = 510 ✓

Prefix: /23 (32 − 9 = 23)
Mask:   255.255.254.0
```

---

### Problem 8 — Find Prefix for 2 Hosts (Point-to-Point Link)

```
2^2 = 4 − 2 = 2 ✓ → /30  (traditional)
or /31 (RFC 3021, no network/broadcast)

Prefer /30 for compatibility, /31 to save addresses.
```

---

## Type 3: Design Multiple Subnets with VLSM

### Problem 9 — VLSM from 10.1.0.0/24

**Requirements:**
- Engineering: 100 hosts
- Sales: 50 hosts
- Management: 20 hosts
- WAN Link A: 2 hosts
- WAN Link B: 2 hosts

```
Allocate largest first:

Engineering (100 hosts): need 2^7=128 → /25
  10.1.0.0/25   (.0 – .127)   Hosts: 126

Sales (50 hosts): need 2^6=64 → /26
  10.1.0.128/26  (.128 – .191)  Hosts: 62

Management (20 hosts): need 2^5=32 → /27
  10.1.0.192/27  (.192 – .223)  Hosts: 30

WAN Link A (2 hosts): /30
  10.1.0.224/30  (.224 – .227)  Hosts: 2

WAN Link B (2 hosts): /30
  10.1.0.228/30  (.228 – .231)  Hosts: 2

Remaining: 10.1.0.232 – 10.1.0.255 (24 addresses free)
Total used: 128 + 64 + 32 + 4 + 4 = 232 of 256
```

---

### Problem 10 — VLSM from 192.168.0.0/23

**Requirements:**
- DataCenter: 300 hosts
- Server Farm: 100 hosts
- Voice: 60 hosts
- Management: 10 hosts
- P2P links: 4 × 2 hosts

```
Total IPs in /23: 512

DataCenter (300 hosts): 2^9=512 − 2=510 ✓ → /23? No, /23 is the whole block.
  2^8=256 − 2=254 → NOT enough for 300.
  Need /23 (510 hosts) just for DataCenter → can't fit others.

Redesign: split differently.
  Actually 2^9=512 − 2=510 → /23
  300 needs more than 254, so minimum /23.
  But /23 is our whole block — infeasible to fit DataCenter + others in /23.

Correct answer: request a larger block (/22 = 1022 hosts) or use /23 only for DataCenter.

If given /22 (192.168.0.0/22, 1022 hosts):
  DataCenter (300): /23 → 192.168.0.0/23  (.0.0 – .1.255, 510 hosts)
  Server Farm (100): /25 → 192.168.2.0/25  (.2.0 – .2.127, 126 hosts)
  Voice (60): /26 → 192.168.2.128/26      (.2.128 – .2.191, 62 hosts)
  Management (10): /28 → 192.168.2.192/28  (.2.192 – .2.207, 14 hosts)
  P2P ×4: /30 each → .2.208/30, .2.212/30, .2.216/30, .2.220/30
  Remaining: 192.168.2.224 – 192.168.3.255
```

---

## Type 4: Summarization

### Problem 11 — Summarize Four /24s

**Summarize:** 10.4.0.0/24, 10.4.1.0/24, 10.4.2.0/24, 10.4.3.0/24

```
Varying octet = 3rd:
  0 = 00000000
  1 = 00000001
  2 = 00000010
  3 = 00000011

Common prefix in 3rd octet: 000000xx → 6 bits match
Total common bits: 16 (from 10.4) + 6 = 22

Summary: 10.4.0.0/22
Verify: mask /22 → 255.255.252.0, block in 3rd octet = 256−252=4
  Subnets: .0.0, .4.0, .8.0 ...
  10.4.0.0/22 covers .0.0 through .3.255 ✓
```

---

### Problem 12 — Summarize Eight /24s

**Summarize:** 172.16.64.0/24 through 172.16.71.0/24

```
3rd octet values: 64, 65, 66, 67, 68, 69, 70, 71
64 = 01000000
71 = 01000111
Common bits: 01000xxx → 5 bits match in this octet
Total: 16 + 5 = 21

Summary: 172.16.64.0/21
Verify: /21 → 255.255.248.0, block=8
  Start: 64 (64/8=8 aligned ✓)
  Covers: 172.16.64.0 – 172.16.71.255 ✓
```

---

### Problem 13 — Can These Be Summarized?

**Networks:** 10.0.4.0/24, 10.0.5.0/24, 10.0.7.0/24

```
Missing 10.0.6.0/24 — not contiguous!

Binary of varying octet:
  4 = 00000100
  5 = 00000101
  7 = 00000111

A summary /22 covering .4–.7 would include 10.0.6.0/24, which is not owned.
Advertising 10.0.4.0/22 would attract traffic for .6.0 that we can't deliver.

Answer: Cannot summarize cleanly. Advertise individually or find who owns .6.0/24.
```

---

### Problem 14 — Summarize with Different Prefixes

**Summarize:** 192.168.8.0/24, 192.168.9.0/24, 192.168.10.0/24, 192.168.11.0/24

```
3rd octet: 8, 9, 10, 11
8  = 00001000
11 = 00001011
Common: 000010xx → 6 bits match
Total: 16 + 6 = 22

Summary: 192.168.8.0/22
Verify: /22 → block=4, starts at 8 (8/4=2 aligned ✓), covers .8–.11 ✓
```

---

## Type 5: Supernet Verification

### Problem 15 — Is This IP in This Subnet?

**Is `172.20.5.200` in `172.20.4.0/22`?**

```
/22 → 255.255.252.0, block in 3rd octet = 4
Network 172.20.4.0/22 spans: .4.0 through .7.255

172.20.5.200 → 3rd octet = 5
4 ≤ 5 ≤ 7 → YES, this IP is in 172.20.4.0/22
```

---

### Problem 16 — Multiple Addresses, Same Subnet?

**Are `10.10.33.50` and `10.10.34.100` in the same /22?**

```
/22 → block = 4 in 3rd octet
10.10.33.50 → 3rd octet = 33; 33/4 = 8 remainder 1 → subnet: 10.10.32.0/22 (.32–.35)
10.10.34.100 → 3rd octet = 34; 34/4 = 8 remainder 2 → subnet: 10.10.32.0/22 (.32–.35)

Both in 10.10.32.0/22 → YES, same subnet ✓
```

---

## Type 6: Reverse — Given Network/Broadcast, Find Prefix

### Problem 17

**Network: `10.0.0.0`, Broadcast: `10.0.0.31`**

```
Host range size: 32 (broadcast − network + 1)
32 = 2^5 → host bits = 5
Prefix: /27
Mask: 255.255.255.224
```

---

### Problem 18

**Network: `192.168.100.64`, Broadcast: `192.168.100.127`**

```
Block size: .127 − .64 + 1 = 64 = 2^6 → host bits = 6
Prefix: /26
Mask: 255.255.255.192
Check alignment: .64 / 64 = 1 ✓ (aligned to block boundary)
```

---

## Type 7: Real-World Design

### Problem 19 — Office Network Design

**Address block:** `10.100.0.0/20` (4,094 usable hosts)
**Requirements:**
- Corp WiFi: 500 hosts
- Staff LAN: 200 hosts
- Guest WiFi: 100 hosts
- Servers: 50 hosts
- Management VLAN: 20 hosts
- IP Cameras: 15 hosts
- 3 × WAN links: 2 hosts each

```
/20 = 10.100.0.0 – 10.100.15.255 (block of 4096)

Corp WiFi (500): 2^9=512 → /23
  10.100.0.0/23  (.0.0 – .1.255)

Staff LAN (200): 2^8=256 → /24
  10.100.2.0/24  (.2.0 – .2.255)

Guest WiFi (100): 2^7=128 → /25
  10.100.3.0/25  (.3.0 – .3.127)

Servers (50): 2^6=64 → /26
  10.100.3.128/26  (.3.128 – .3.191)

Management (20): 2^5=32 → /27
  10.100.3.192/27  (.3.192 – .3.223)

IP Cameras (15): 2^5=32 → /27
  10.100.3.224/27  (.3.224 – .3.255)

WAN Link 1: /30 → 10.100.4.0/30
WAN Link 2: /30 → 10.100.4.4/30
WAN Link 3: /30 → 10.100.4.8/30

Remaining: 10.100.4.12 – 10.100.15.255 (~3,060 addresses free for growth)

Total used: 512 + 256 + 128 + 64 + 32 + 32 + 12 = 1,036
```

---

### Problem 20 — ISP Allocation

**An ISP has `203.0.113.0/24` (24 example range — in practice use real allocation).
Allocate to customers:**
- Customer A: 30 hosts
- Customer B: 14 hosts
- Customer C: 5 hosts
- Customer D: 2 hosts

```
Customer A (30 hosts): 2^5=32 → /27
  203.0.113.0/27   (.0 – .31)

Customer B (14 hosts): 2^4=16 → /28
  203.0.113.32/28  (.32 – .47)

Customer C (5 hosts): 2^3=8 → /29
  203.0.113.48/29  (.48 – .55)

Customer D (2 hosts): /30
  203.0.113.56/30  (.56 – .59)

Remaining: 203.0.113.60 – .255 (196 addresses)

Total used: 32 + 16 + 8 + 4 = 60
```

---

## Quick-Reference Problem Set (Answers Below)

1. What is the network address of `10.20.30.40/17`?
2. How many usable hosts in a `/20`?
3. Summarize: `172.31.192.0/24` through `172.31.199.0/24`
4. Is `192.168.5.190` in `192.168.4.0/22`?
5. What prefix fits exactly 1,000 hosts?

```
Answers:
1. /17 → mask 255.255.128.0, block 128 in 3rd octet
   30 falls in .0 subnet (0 ≤ 30 < 128) → 10.20.0.0

2. /20 → host bits = 12 → 2^12 − 2 = 4,094

3. 3rd octet: 192–199
   192=11000000, 199=11000111 → common: 11000xxx → 5 bits
   16 + 5 = /21 → 172.31.192.0/21
   Verify: /21 block=8, .192/8=24 aligned ✓, covers .192–.199 ✓

4. /22 → block=4, .4.0/22 covers .4.0 – .7.255
   .5.190 → 3rd octet 5, 4 ≤ 5 ≤ 7 → YES ✓

5. 2^10=1024 − 2=1022 ≥ 1000 → /22
   (2^9=512−2=510 < 1000 → not enough)
```

---

## Tips

- When converting a mask to binary is slow, use the block-size shortcut exclusively — it's faster and just as accurate.
- Alignment check: a network address must be divisible by its block size. `192.168.0.96/26` is valid (96÷64=1 r32 — wait: 96/64=1.5 — NOT aligned!); valid /26 starts are .0, .64, .128, .192.
- In VLSM, if you need N hosts, the formula is: smallest power of 2 greater than N+2 (for network+broadcast) gives you total IPs; prefix = 32 − log2(total).
- Common error: using the host address as the network address in configs — always AND the IP with the mask.

---

## Summary

- The block-size shortcut (256 − mask-octet) is the fastest path to network/broadcast without full binary conversion.
- VLSM: allocate largest subnets from the start of the block, work downward in size.
- Summarization: convert the varying octet to binary, count common leading bits, add to the stable prefix.
- A summary route is only safe if you own every subnet it covers — advertising it without owning a gap causes a black hole.
- Alignment: every subnet must start on an address that is a multiple of its block size.
