---
title: "IPv4 Subnetting"
sidebar_label: "IPv4 Subnetting"
sidebar_position: 21
---

# IPv4 Subnetting

Subnetting divides a network into smaller sub-networks to improve security, manageability, and address efficiency. VLSM (Variable-Length Subnet Masking) allows each subnet to be sized independently — a critical skill for exam and real-world network design.

---

## Why Subnet?

Before subnetting (RFC 950, 1985), IP addresses came in classful blocks — a Class B gave you one network of 65,534 hosts whether you needed 10 or 60,000. The problems:

1. **Wasted addresses** — a class B block assigned to a company with 500 hosts wastes 65,034 addresses.
2. **Large broadcast domains** — all hosts share one subnet, so all receive every ARP/broadcast.
3. **No isolation** — one network means no Layer 3 boundary to filter traffic between departments.

Subnetting fixes all three.

---

## The Core Concept — Borrowing Host Bits

To create subnets, you "borrow" bits from the host portion and assign them to the network portion.

```
Original /24 (C-class):
  Network bits: 24  |  Host bits: 8
  Hosts: 2^8 - 2 = 254

Borrow 2 bits → /26:
  Network bits: 26  |  Host bits: 6
  Subnets created: 2^2 = 4
  Hosts per subnet: 2^6 - 2 = 62

Borrow 4 bits → /28:
  Network bits: 28  |  Host bits: 4
  Subnets created: 2^4 = 16
  Hosts per subnet: 2^4 - 2 = 14
```

**The fundamental tradeoff:** more subnets = fewer hosts per subnet.

---

## Subnetting a /24 — Full Reference

Starting with `192.168.1.0/24`:

| Prefix | Mask | Subnets | Hosts/Subnet | Increment |
|---|---|---|---|---|
| /25 | 255.255.255.128 | 2 | 126 | 128 |
| /26 | 255.255.255.192 | 4 | 62 | 64 |
| /27 | 255.255.255.224 | 8 | 30 | 32 |
| /28 | 255.255.255.240 | 16 | 14 | 16 |
| /29 | 255.255.255.248 | 32 | 6 | 8 |
| /30 | 255.255.255.252 | 64 | 2 | 4 |
| /31 | 255.255.255.254 | 128 | 2* | 2 |
| /32 | 255.255.255.255 | 256 | 1 | 1 |

**Increment** = block size = 256 − mask-octet-value. Subnets start at 0, increment, increment, ...

---

## The "Magic Number" Shortcut

The fastest way to subnet without going full binary:

1. **Find the "interesting" octet** — the one where the mask is neither 0 nor 255.
2. **Block size = 256 − mask octet value**.
3. **Subnets start at:** 0, block-size, 2×block-size, 3×block-size... in that octet.
4. **Network** = that starting address.
5. **Broadcast** = next subnet's start − 1.
6. **First host** = network + 1; **Last host** = broadcast − 1.

**Example:** Is `10.0.0.130` in `10.0.0.128/26`?

```
Mask: /26 → 255.255.255.192 → interesting octet = 4th
Block size = 256 − 192 = 64
Subnets: .0, .64, .128, .192
128 ≤ 130 < 192 → YES, in the 10.0.0.128/26 subnet
Network: 10.0.0.128, Broadcast: 10.0.0.191, Hosts: .129 – .190
```

---

## Subnetting Larger Blocks

### Subnetting a /16

Starting with `172.16.0.0/16`, need 8 subnets of ~8,000 hosts each:

```
Need at least 8 subnets → borrow 4 bits (2^4 = 16 ≥ 8) → /20
Block size in 3rd octet = 256 − 240 = 16

Subnets:
  172.16.0.0/20    → .0.0 – .15.255   (broadcast: 172.16.15.255)
  172.16.16.0/20   → .16.0 – .31.255
  172.16.32.0/20   → .32.0 – .47.255
  172.16.48.0/20   → .48.0 – .63.255
  ...
  172.16.240.0/20  → .240.0 – .255.255 (16th subnet)

Hosts per subnet: 2^12 − 2 = 4,094
```

### Subnetting a /8

Starting with `10.0.0.0/8`, need 500 subnets with ~100 hosts each:

```
Need ≥ 500 subnets → borrow 10 bits (2^10 = 1024) → /18
Host bits remaining: 32 − 18 = 14 → 2^14 − 2 = 16,382 hosts per subnet (overkill but fits)

Or: need ~100 hosts → host bits = 7 (2^7 − 2 = 126) → prefix = /25
From /8, borrow 17 bits for /25 → 2^17 = 131,072 subnets → plenty

Block size in 4th octet = 256 − 128 = 128
10.0.0.0/25, 10.0.0.128/25, 10.0.1.0/25, 10.0.1.128/25, ...
```

---

## VLSM — Variable-Length Subnet Masking

VLSM lets each subnet be a different size — perfect for real networks where some segments need 200 hosts and some point-to-point links only need 2.

**Design rule:** allocate largest subnets first, then smaller ones from the remaining space.

**Scenario:** You have `192.168.10.0/24`. Allocate:
- Subnet A: 100 hosts
- Subnet B: 50 hosts
- Subnet C: 25 hosts
- Subnet D: 2 hosts (point-to-point link)

```
Step 1: Subnet A — 100 hosts → need 2^7 = 128 addresses → /25
  192.168.10.0/25     Hosts: .1 – .126   Broadcast: .127

Step 2: Subnet B — 50 hosts → need 2^6 = 64 addresses → /26
  Next available: 192.168.10.128
  192.168.10.128/26   Hosts: .129 – .190   Broadcast: .191

Step 3: Subnet C — 25 hosts → need 2^5 = 32 addresses → /27
  Next available: 192.168.10.192
  192.168.10.192/27   Hosts: .193 – .222   Broadcast: .223

Step 4: Subnet D — 2 hosts → /30 (4 addresses)
  Next available: 192.168.10.224
  192.168.10.224/30   Hosts: .225 – .226   Broadcast: .227

Remaining unallocated: 192.168.10.228 – 192.168.10.255 (28 addresses)
```

---

## Route Summarization (Supernetting)

The reverse of subnetting — combine multiple contiguous subnets into one route advertisement. This keeps routing tables smaller.

**Rule:** subnets to be summarized must:
1. Be contiguous.
2. Share the same higher-order bits up to the summary prefix.

**Example:** Summarize these four routes into one:

```
192.168.0.0/24
192.168.1.0/24
192.168.2.0/24
192.168.3.0/24

Binary of 3rd octet:
  .0  = 00000000
  .1  = 00000001
  .2  = 00000010
  .3  = 00000011
         ──────
Common prefix: 000000xx → 6 bits match in this octet

Full common bits: 24 (from 192.168) + 6 = … actually easier:
  Total prefix of each: /24, check 3rd octet:
  0  = 00
  1  = 01
  2  = 10
  3  = 11
  All share top 6 bits of octet 3 (which are 000000) AND
  first two common bits of the varying byte are 0 and 0.

Summary: 192.168.0.0/22
  (covers .0.0 through .3.255)

Check: 192.168.0.0/22 mask = 255.255.252.0
  Block size in 3rd octet = 256 − 252 = 4
  Starts at .0, next at .4 — so .0 through .3 → correct ✓
```

**Practical check:** network addresses must all fall within the summary block, and no "extra" networks outside the intended set must be included.

---

## Subnetting Cheat Sheet

```
Powers of 2 (memorize):
  2^1=2  2^2=4  2^3=8  2^4=16  2^5=32  2^6=64  2^7=128  2^8=256
  2^9=512  2^10=1024  2^11=2048  2^12=4096

Prefix → block size (256 − last non-255 octet):
  /25 → 128   /26 → 64   /27 → 32   /28 → 16   /29 → 8   /30 → 4

Hosts per prefix:
  /24=254  /25=126  /26=62  /27=30  /28=14  /29=6  /30=2

To find needed prefix for N hosts:
  Find smallest 2^n > N+2 (for net+broadcast)
  prefix = 32 − n
  E.g., 50 hosts → 2^6=64 > 52 → n=6 → /26

To find needed prefix for N subnets (from a given block):
  Find smallest 2^n ≥ N
  Add n to current prefix
  E.g., 10 subnets from /24 → 2^4=16 ≥ 10 → borrow 4 bits → /28
```

---

## Tips

- Always allocate the largest subnets first in VLSM — it's easier to place big blocks at the start than to squeeze them in later.
- Subnets must be on boundaries aligned to their block size. `/26` subnets start at .0, .64, .128, .192 — never at .50.
- For summarization, convert the range to binary in the varying octet and count matching high-order bits.
- Point-to-point router links: use /30 (2 usable hosts) or /31 (RFC 3021, no waste) — never waste a /24 on a two-device link.
- Exam tip: if given a host address and mask, the network address is found by zeroing all host bits — the block-size trick is fastest for this.

---

## Summary

- Subnetting borrows host bits to create smaller networks; each borrowed bit doubles the subnet count and halves hosts per subnet.
- Block size = 256 − mask-octet is the fastest shortcut; subnets start at multiples of the block size.
- VLSM allows different prefix lengths within the same address space — always design largest-to-smallest.
- Summarization (supernetting) combines contiguous subnets into one advertisement — reduces routing table size.
- /30 for point-to-point links, /31 for zero-waste P2P, /32 for host routes and loopbacks.
- Memorize powers of 2 up to 2^12 and the common prefix-to-mask mappings — subnetting questions are faster with recall than calculation.
