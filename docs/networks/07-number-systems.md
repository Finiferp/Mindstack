---
title: "Number Systems for Networking"
sidebar_label: "Number Systems"
sidebar_position: 7
---

# Number Systems for Networking

Networking is built on binary at its core — IP addresses, subnet masks, MAC addresses, and countless protocol fields are fundamentally binary numbers, frequently expressed in decimal or hexadecimal for human convenience. Fluency in converting between these systems is essential, not optional, for real subnetting work.

---

## Why Networking Uses These Number Systems

```
Binary (Base 2)      — what computers/network hardware actually process: 1s and 0s
Decimal (Base 10)    — what humans read most naturally: IPv4 addresses (192.168.1.1)
Hexadecimal (Base 16) — compact human-readable representation of binary: MAC addresses,
                         IPv6 addresses, memory addresses (each hex digit = exactly 4 bits)
```

---

## Binary Basics

```
Binary uses only two digits: 0 and 1
Each position represents a power of 2, read right to left:

Position:  2^7  2^6  2^5  2^4  2^3  2^2  2^1  2^0
Value:     128   64   32   16   8    4    2    1

Example: binary 10110101
  1    0    1    1    0    1    0    1
  128  64   32   16   8    4    2    1
  128 + 0 + 32 + 16 + 0 + 4 + 0 + 1 = 181

So binary 10110101 = decimal 181
```

### Converting Decimal to Binary

```
Method: repeatedly divide by 2, track remainders, read remainders bottom to top

Convert 181 to binary:
181 ÷ 2 = 90 remainder 1
 90 ÷ 2 = 45 remainder 0
 45 ÷ 2 = 22 remainder 1
 22 ÷ 2 = 11 remainder 0
 11 ÷ 2 =  5 remainder 1
  5 ÷ 2 =  2 remainder 1
  2 ÷ 2 =  1 remainder 0
  1 ÷ 2 =  0 remainder 1

Read remainders bottom to top: 10110101 ✓ (matches our earlier example)

Faster method for networking — subtract powers of 2:
181: is 128 in it? yes (181-128=53) → 1
      is 64 in it?  no (53<64)      → 0
      is 32 in it?  yes (53-32=21)  → 1
      is 16 in it?  yes (21-16=5)   → 1
      is 8 in it?   no (5<8)        → 0
      is 4 in it?   yes (5-4=1)     → 1
      is 2 in it?   no (1<2)        → 0
      is 1 in it?   yes (1-1=0)     → 1
Result: 10110101
```

### The 8-Bit Octet — Critical for IPv4

Every IPv4 address octet is exactly 8 bits, ranging from 0-255:

```
0 0 0 0 0 0 0 0 = 0    (minimum)
1 1 1 1 1 1 1 1 = 255  (maximum: 128+64+32+16+8+4+2+1)

Memorize these powers of 2 cold — they are used constantly in subnetting:
2^0=1  2^1=2  2^2=4  2^3=8  2^4=16  2^5=32  2^6=64  2^7=128
```

---

## Hexadecimal Basics

```
Hex uses 16 digits: 0-9, then A-F (A=10, B=11, C=12, D=13, E=14, F=15)
Each hex digit represents exactly 4 bits (a "nibble") — this clean mapping
is WHY hex is used for MAC and IPv6 addresses instead of decimal.

Hex digit → 4-bit binary:
0=0000  1=0001  2=0010  3=0011  4=0100  5=0101  6=0110  7=0111
8=1000  9=1001  A=1010  B=1011  C=1100  D=1101  E=1110  F=1111

Example: hex byte 0xB5
  B = 1011
  5 = 0101
  Combined: 10110101 (same value as our binary example above = decimal 181)

This is why hex is convenient: ONE byte = exactly TWO hex digits, always.
Decimal doesn't divide evenly into bytes this way (255 needs up to 3 digits,
inconsistently), which is why hex is preferred for raw protocol field display.
```

### Converting Hex to Decimal

```
Each position is a power of 16:
Position:  16^3    16^2   16^1  16^0
Value:     4096    256    16    1

Convert hex 0x2F4A to decimal:
2×4096 + F(15)×256 + 4×16 + A(10)×1
= 8192 + 3840 + 64 + 10
= 12106
```

---

## Quick Reference Table — Binary, Decimal, Hex (0-255)

```
Dec   Bin         Hex     Dec   Bin         Hex
0     00000000    0x00    16    00010000    0x10
1     00000001    0x01    32    00100000    0x20
2     00000010    0x02    64    01000000    0x40
4     00000100    0x04    128   10000000    0x80
8     00001000    0x08    255   11111111    0xFF

These specific values (1, 2, 4, 8, 16, 32, 64, 128, 255) are the ONLY
valid values in a subnet mask octet — recognizing them on sight is a
core skill for fast subnetting (see IPv4 Subnetting).
```

---

## Application: MAC Addresses (Hex)

```
MAC address: 00:1A:2B:3C:4D:5E
- 6 bytes total (48 bits)
- Written as 12 hex digits, grouped in pairs (or sometimes in 4s: 001A.2B3C.4D5E — Cisco style)
- First 3 bytes (00:1A:2B) = OUI (Organizationally Unique Identifier, assigned to manufacturer)
- Last 3 bytes (3C:4D:5E) = device-specific identifier assigned by the manufacturer

Full detail in MAC Addressing.
```

---

## Application: IPv4 Addresses and Subnet Masks (Decimal + Binary)

```
IPv4 address: 192.168.1.1
- 4 octets (bytes), each 0-255, separated by dots — this is "dotted decimal notation"
- Underlying reality is 32 bits of pure binary:

192       . 168       . 1         . 1
11000000  . 10101000  . 00000001  . 00000001

Subnet mask: 255.255.255.0
11111111  . 11111111  . 11111111  . 00000000
(24 ones followed by 8 zeros — this is a /24 network)

Subnetting REQUIRES binary fluency — every subnetting calculation is, at its
core, binary arithmetic, even though we conventionally write results in
decimal. See IPv4 Subnetting for the full subnetting methodology.
```

---

## Application: IPv6 Addresses (Hex)

```
IPv6 address: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- 128 bits total, written as 8 groups of 4 hex digits (16 bits each), separated by colons
- Each hex digit = 4 bits, so each group of 4 hex digits = exactly 16 bits

Why hex for IPv6? Decimal would make a 128-bit address absurdly long and
unreadable (up to 39 decimal digits). Hex compresses this to 32 hex digits
(written as 8 groups of 4), which is far more manageable — and additional
shorthand rules (leading zero omission, :: for consecutive zero groups)
compress it further still. Full detail in IPv6 Fundamentals.
```

---

## Bitwise Operations — The Logic Behind Subnetting

Subnetting and ACL wildcard masks fundamentally rely on bitwise AND operations.

```
AND operation truth table:
0 AND 0 = 0
0 AND 1 = 0
1 AND 0 = 0
1 AND 1 = 1     (only 1 AND 1 produces 1 — this is how subnet masks "filter" the network portion)

Determining the network address: IP address AND subnet mask

IP:      192.168.1.135    11000000.10101000.00000001.10000111
Mask:    255.255.255.0    11111111.11111111.11111111.00000000
AND:     ─────────────────────────────────────────────────────
Result:  192.168.1.0      11000000.10101000.00000001.00000000

The mask's 1-bits "pass through" the IP's bits unchanged (1 AND x = x);
the mask's 0-bits force the result to 0 regardless of the IP's bits
(0 AND x = 0) — this is precisely how a subnet mask identifies which
portion of an address is "network" and which is "host."
```

---

## Tips

- Memorize the powers of 2 from 1 to 128 cold — this single piece of memorization makes subnetting dramatically faster.
- For quick binary-to-decimal conversion of subnet mask octets, memorize the 9 magic numbers: 0, 128, 192, 224, 240, 248, 252, 254, 255 — these are the only possible values in any subnet mask octet.
- Practice converting MAC address hex pairs to binary until it's automatic — this matters for understanding multicast MAC addresses and OUI-based device identification.
- When working with IPv6, get comfortable doing hex arithmetic directly rather than always converting to decimal and back — it's faster once internalized.

---

## Summary

- Binary is the native language of all networking hardware; decimal and hexadecimal are human-readable representations layered on top.
- Each hex digit maps cleanly to exactly 4 bits, which is why hex is used for MAC and IPv6 addresses — the conversion is direct and lossless.
- IPv4 addresses and subnet masks are conventionally written in decimal but are fundamentally 32-bit binary numbers — subnetting is binary arithmetic underneath.
- The bitwise AND operation between an IP address and its subnet mask determines the network address — this is the mathematical foundation of all subnetting.
- Fluency in fast binary/hex/decimal conversion (especially memorized powers of 2 and the 9 "magic numbers") is a practical requirement for real-world subnetting speed, not just an academic exercise.
