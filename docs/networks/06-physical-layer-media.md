---
title: "Physical Layer & Media"
sidebar_label: "Physical Layer & Media"
sidebar_position: 6
---

# Physical Layer & Media

The physical layer is where bits become real — voltage on copper, light in glass, or radio waves through air. This page covers the media types, connectors, and signaling concepts that underpin every higher layer.

---

## Copper Media — Twisted Pair

The dominant LAN cabling type since the 1990s, twisted pair cable uses pairs of insulated copper wires twisted together to reduce electromagnetic interference (EMI) between pairs — a technique borrowed from telephone cabling.

```
Why twisting?
Two adjacent untwisted wires act like an antenna, picking up and
emitting EMI. Twisting the pair causes induced interference to
largely cancel out between the two wires (differential signaling).
```

### UTP vs STP

```
UTP (Unshielded Twisted Pair) — no additional shielding, cheaper, standard for office LANs
STP (Shielded Twisted Pair)   — foil/braid shielding around pairs or the whole cable,
                                  used in high-EMI environments (factories, near heavy machinery)
```

### Cable Category Standards

| Category | Max Speed | Max Distance | Typical Use |
|---|---|---|---|
| Cat3 | 10 Mbps | 100m | Legacy telephone/10BASE-T (obsolete for data) |
| Cat5 | 100 Mbps | 100m | Legacy Fast Ethernet (largely obsolete) |
| Cat5e | 1 Gbps | 100m | Common Gigabit Ethernet, still widely installed |
| Cat6 | 1 Gbps (10 Gbps @ 55m) | 100m / 55m | Modern standard for new installs |
| Cat6a | 10 Gbps | 100m | Datacenters, future-proofed installs |
| Cat7/7a | 10-40 Gbps | 100m/50m | Shielded, less common (proprietary connectors historically) |
| Cat8 | 25-40 Gbps | 30m | Datacenter switch-to-switch short runs |

### Connectors and Pinouts

```
RJ45 connector — 8 pins (8P8C), used for all modern Ethernet twisted pair

T568A vs T568B wiring standards (pin order differs):
T568A: White/Green, Green, White/Orange, Blue, White/Blue, Orange, White/Brown, Brown
T568B: White/Orange, Orange, White/Green, Blue, White/Blue, Green, White/Brown, Brown

Straight-through cable: same standard (e.g. T568B) on both ends — connects DIFFERENT
                         device types (PC to switch, router to switch)
Crossover cable:        T568A on one end, T568B on the other — connects SAME device
                         types (switch to switch, PC to PC) — historically required,
                         now largely obsolete due to Auto-MDIX (see below)
```

**Auto-MDIX**: modern switches automatically detect cable type and adjust internally, eliminating the practical need to choose straight-through vs crossover cables for most situations — though understanding the distinction remains a core CCNA/networking fundamental.

---

## Copper Media — Coaxial Cable

Largely historical for LAN data networking today, but still used for cable internet (DOCSIS) and historically for early Ethernet (10BASE2, 10BASE5 — "Thinnet" and "Thicknet").

```
Structure: center conductor → insulation → braided/foil shield → outer jacket
Advantage: better EMI resistance than twisted pair, longer max distances
Decline:   bus topology (shared cable) was a single point of failure;
           twisted pair + star topology (with hubs/switches) won out for LANs
Modern use: cable television and cable internet (last-mile delivery to homes)
```

---

## Fiber Optic Media

Fiber transmits data as pulses of light rather than electrical signals, offering far greater bandwidth, distance, and immunity to electromagnetic interference than copper.

### Single-Mode vs Multi-Mode

```
Single-Mode Fiber (SMF):
  - Very thin core (~9 microns) — light travels in a single straight path
  - Uses laser light source
  - Long distance: kilometers to 100s of km
  - More expensive equipment, used for long-haul/WAN/service provider links

Multi-Mode Fiber (MMF):
  - Larger core (50 or 62.5 microns) — light bounces along multiple paths (modes)
  - Uses LED or VCSEL light source
  - Shorter distance: up to ~550m-2km depending on type/speed
  - Cheaper equipment, used for datacenter/campus short-to-medium runs

Why does core size matter? Multi-mode's larger core lets light enter at multiple
angles ("modes"), each taking a slightly different path length, causing modal
dispersion that limits distance. Single-mode's narrow core forces light down
essentially one path, eliminating this dispersion — enabling far greater range.
```

### Common Fiber Connectors

```
SC  — Subscriber Connector, square push-pull, older but still common
LC  — Lucent Connector, smaller form factor, dominant in modern datacenters
ST  — Straight Tip, bayonet-style twist lock, older/legacy
MPO/MTP — Multi-fiber Push On, bundles 12+ fibers in one connector, used for
          high-density datacenter and 40/100GbE breakout cabling
```

### Fiber Advantages and Disadvantages

```
Advantages:
+ Much higher bandwidth potential than copper
+ Much longer maximum distances (km vs ~100m for copper)
+ Complete immunity to electromagnetic interference
+ More secure — extremely difficult to tap without detection
+ No risk of electrical hazards (ground loops, lightning induction)

Disadvantages:
- More expensive (cable, connectors, transceivers)
- More fragile — fiber can crack with tight bends (minimum bend radius)
- Requires more specialized skills/tools to terminate and splice
- Cannot deliver electrical power (PoE is copper-only)
```

---

## Wireless Media

Radio frequency (RF) transmission — covered in full depth in [Wireless Fundamentals](./59-wireless-fundamentals.md); summarized here as a physical medium type.

```
Common networking RF bands:
2.4 GHz  — longer range, more interference (shared with Bluetooth, microwaves, cordless phones)
5 GHz    — shorter range, less interference, more channels available
6 GHz    — newest (Wi-Fi 6E/7), least congested, shortest range

Key physical layer concepts:
- Attenuation — signal strength decreases with distance
- Absorption — walls/objects absorb RF energy (concrete/metal worse than drywall)
- Reflection — RF bounces off surfaces, can cause multipath interference
- Interference — other devices on the same frequency degrade signal quality
```

---

## Signaling and Encoding

How a "1" and a "0" are physically represented on the medium.

```
Baseband vs Broadband:
  Baseband  — entire medium's bandwidth used for ONE digital signal at a time
              (standard for Ethernet — "10BASE-T" the "BASE" means baseband)
  Broadband — medium's bandwidth divided into multiple channels via frequency
              (used in cable TV/cable internet, allowing TV channels + internet
              to share one coaxial cable simultaneously)

Common Line Encoding Schemes:
  Manchester Encoding               — used in original 10 Mbps Ethernet; encodes both clock
                                       and data in transitions (a "1" is a transition one way,
                                       a "0" the other) — simple but uses bandwidth inefficiently
  4B/5B, 8B/10B                     — used in Fast Ethernet/Gigabit Ethernet/Fibre Channel;
                                       more bandwidth-efficient encoding that still guarantees
                                       enough signal transitions for clock recovery
  PAM (Pulse Amplitude Modulation)  — used in 10GBASE-T and above; encodes
                                    multiple bits per symbol using different voltage levels
```

---

## Decibels (dB) — Signal Loss and Gain

Networking (especially fiber and wireless) frequently expresses signal strength changes in decibels — a logarithmic scale.

```
+3 dB  ≈ signal power DOUBLES
-3 dB  ≈ signal power HALVES
+10 dB ≈ signal power increases 10x
-10 dB ≈ signal power decreases to 1/10th

dBm — power relative to 1 milliwatt (absolute power measurement)
  0 dBm   = 1 mW
  +20 dBm = 100 mW
  -50 dBm = a typical "usable but weak" Wi-Fi signal
  -90 dBm = essentially unusable Wi-Fi signal (noise floor territory)

Why logarithmic? Because signal loss over distance/obstacles is multiplicative,
not additive — logarithms turn multiplication into addition, making it far
easier to calculate cumulative loss across multiple cable segments/connectors.
```

---

## Power over Ethernet (PoE)

PoE delivers electrical power to devices (IP phones, wireless APs, cameras) over the same twisted-pair cable used for data — eliminating the need for a separate power cable/outlet at the device.

```
PoE Standards:
802.3af  (PoE)    — up to 15.4W delivered, ~12.95W usable at the device
802.3at  (PoE+)   — up to 30W delivered, ~25.5W usable
802.3bt  (PoE++/4PPoE) — Type 3: up to 60W, Type 4: up to 100W

How it works: power is injected onto the unused pairs (in 10/100BASE-T)
or phantom-powered alongside data signaling (in Gigabit+, using all 4 pairs)
via either the switch itself (endspan) or an inline injector (midspan)

LLDP/CDP negotiation: modern PoE devices negotiate power class with the
switch to avoid delivering more power than necessary (and to avoid
under-powering a device that needs more)
```

---

## Tips

- When troubleshooting "no link light," it's almost always Layer 1 — bad cable, bad port, wrong cable category for the desired speed, or a disabled switchport.
- For new cable installations, always pull Cat6a or better — the cost difference vs Cat5e is small relative to the cost of re-cabling later when speed requirements increase.
- Fiber's minimum bend radius is a real constraint — sharp bends cause attenuation or outright breakage; always follow manufacturer specs when routing fiber in cable trays.
- When calculating PoE budget for a switch, sum the power class of every connected device — exceeding the switch's total PoE power budget will cause ports to fail to power on, not gracefully share power.

---

## Summary

- Twisted pair copper (UTP) dominates LAN cabling; category ratings (Cat5e through Cat8) determine maximum supported speed and distance.
- Auto-MDIX has made straight-through vs crossover cable selection mostly irrelevant in modern equipment, though understanding the distinction remains foundational.
- Single-mode fiber supports much longer distances than multi-mode due to eliminating modal dispersion, at higher equipment cost.
- Decibels (dB/dBm) express signal strength and loss on a logarithmic scale — essential for fiber loss budgets and Wi-Fi signal strength assessment.
- PoE delivers power and data over the same cable, simplifying deployment of APs, phones, and cameras — always verify a switch's total PoE power budget before deployment.
