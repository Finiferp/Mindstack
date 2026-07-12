---
title: "Optical Networking"
sidebar_label: "Optical Networking"
sidebar_position: 75
---

# Optical Networking

Optical networking carries data as light pulses through fiber. Understanding SONET/SDH history, DWDM technology, and coherent optics is essential for anyone working with high-speed transport networks.

---

## Why Optical

```
Electrical vs Optical signal comparison:
  Copper (electrical):
    Attenuation: severe over distance (signal lost to resistance, skin effect)
    Bandwidth: limited by parasitic capacitance (frequency ceiling)
    Interference: susceptible to electromagnetic interference (EMI)
    Max practical: Cat8 → 40 Gbps at 30m; coaxial → 10 Gbps at short distances

  Fiber (optical):
    Attenuation: very low (0.2 dB/km for SMF vs 100s dB/km for copper at high frequency)
    Bandwidth: theoretically unlimited (carrier frequency ~200 THz)
    Interference: immune to EMI; no ground loops; no crosstalk between fibers
    Distance: 80–160 km between amplifiers without regeneration; 1000s km with amplifiers
    Practical: 400 Gbps per wavelength; 100+ wavelengths per fiber → Tbps per strand
```

---

## Fiber Types

### Single-Mode Fiber (SMF)

```
Core diameter: 8-10 µm (very narrow — only one mode of light travels)
Cladding: 125 µm (standard)
Wavelength: 1310 nm or 1550 nm (infrared)
Attenuation: 0.2-0.4 dB/km at 1550 nm (very low)
Bandwidth: effectively unlimited for practical purposes
Distance: up to 160 km between amplifiers; 40 km+ without amplification

Types of SMF:
  G.652 (Standard SMF): most common; OS1 (indoor), OS2 (outdoor)
  G.653 (Dispersion-Shifted): shifted dispersion minimum to 1550 nm; problematic for DWDM
  G.654 (Ultra-Low Loss): submarine cables; 0.17 dB/km
  G.655 (Non-Zero Dispersion-Shifted): DWDM optimized; used in long-haul
  G.656 (Non-Zero DSF for wideband): supports C+L band DWDM

Use for: all long-distance (> 2 km), datacenter interconnect, WAN

Connectors for SMF:
  SC (square connector): snap-in; widely used in telco
  LC (lucent connector): smaller; most common in datacenter SFPs
  FC (threaded connector): secure; used in lab/test equipment
  MPO/MTP: 12 or 24 fibers in one connector; high-density datacenter
```

### Multi-Mode Fiber (MMF)

```
Core diameter: 50 µm or 62.5 µm (larger — multiple modes of light travel)
Cladding: 125 µm (same as SMF)
Wavelength: 850 nm or 1300 nm
Attenuation: 2-3 dB/km (higher than SMF)
Distance: 300-400m at 10G; 100m at 40/100G (limited by modal dispersion)
Bandwidth: limited by modal dispersion (different modes travel different paths → arrive at different times)

Types (OM = Optical Multimode):
  OM1: 62.5 µm core; 200 MHz·km bandwidth; legacy
  OM2: 50 µm; 500 MHz·km; older deployments
  OM3 (Laser-Optimized): 50 µm; 2000 MHz·km; 10G up to 300m
  OM4 (Laser-Optimized): 50 µm; 4700 MHz·km; 40/100G up to 150m
  OM5 (Wideband MMF): 50 µm; supports 4 wavelengths (850, 877, 906, 953 nm); 100G+

Use for: intra-datacenter short runs, building riser, within rack rows
  Where SMF is overkill for short distances; cheaper transceivers (VCSEL lasers vs DFB)
```

---

## SONET and SDH (Legacy)

SONET (Synchronous Optical Networking, ANSI) and SDH (Synchronous Digital Hierarchy, ITU-T) were the dominant transport standards from the 1980s through the 2000s.

```
Design philosophy:
  Synchronous: all clocks synchronized to a common reference (Stratum hierarchy)
  TDM-based: fixed timeslots for each circuit; guaranteed bandwidth
  Operations overhead: rich OAM (Operations, Administration, Maintenance) built in
  Protection switching: 50ms failover via APS (Automatic Protection Switching)

SONET hierarchy (North America):
  STS-1 (OC-1):   51.84 Mbps    — base signal
  OC-3:           155.52 Mbps   — 3 × STS-1
  OC-12:          622.08 Mbps   — 12 × STS-1
  OC-48:          2.488 Gbps    — 48 × STS-1
  OC-192:         9.953 Gbps    — 192 × STS-1
  OC-768:         39.813 Gbps   — 768 × STS-1

SDH hierarchy (international):
  STM-1:  155.52 Mbps   (= OC-3)
  STM-4:  622.08 Mbps   (= OC-12)
  STM-16: 2.488 Gbps    (= OC-48)
  STM-64: 9.953 Gbps    (= OC-192)

SONET frame structure:
  Each STS-1 frame: 9 rows × 90 columns = 810 bytes; sent 8000 times/second
  → 810 × 8 × 8000 = 51.84 Mbps
  Overhead: 9 rows × 3 columns (27 bytes) = transport overhead
  Payload: 9 rows × 87 columns (783 bytes) = SPE (Synchronous Payload Envelope)

SONET/SDH today:
  Legacy: still in service on old carrier networks for leased lines and TDM transport
  Being replaced by: OTN (Optical Transport Network) + DWDM Ethernet
  Enterprise: rarely seen; ISPs migrating to OTN/Ethernet transport
```

---

## DWDM — Dense Wavelength Division Multiplexing

DWDM is the technology that puts terabits of data on a single fiber strand by transmitting on many different wavelengths simultaneously.

```
WDM concept:
  Each wavelength (color) carries an independent signal
  Combine multiple wavelengths on one fiber via optical multiplexer
  Separate at the other end via optical demultiplexer
  Total capacity = wavelengths × capacity-per-wavelength

CWDM (Coarse WDM):
  Wavelengths: 18 channels from 1270 nm to 1610 nm (20 nm spacing)
  No optical amplification required (low cost)
  Max distance: ~80 km
  Use: metro access; short-haul; cheaper than DWDM

DWDM (Dense WDM):
  Wavelengths: up to 96 channels on C-band (1530-1565 nm) at 50 GHz spacing
              Up to 160 channels at 25 GHz spacing
  With L-band: doubles channel count (add 1565-1625 nm band)
  Each wavelength: today 100G, 200G, 400G (coherent optics)
  Total capacity: 96 × 400G = 38.4 Tbps on a single fiber pair

EDFA (Erbium-Doped Fiber Amplifier):
  Amplifies all DWDM wavelengths simultaneously (no OEO conversion needed)
  Operating range: 1530-1565 nm (C-band) — same band as DWDM
  Amplification: +20 to +30 dB gain; repeat every 80-100 km
  Limitation: amplifies noise too; limited span count before regeneration

ROADM (Reconfigurable Optical Add/Drop Multiplexer):
  Add or drop individual wavelengths at intermediate nodes
  Remotely reconfigurable (software-defined wavelength routing)
  Degree: how many directions fiber enters/exits the ROADM
  CDC (Colorless, Directionless, Contentionless): any wavelength to any port — flexible
  Enables: optical circuit provisioning without visiting each intermediate site
```

---

## Coherent Optics

Modern DWDM uses coherent detection — the receiver tracks phase and amplitude, enabling dramatically higher spectral efficiency.

```
Traditional (Direct Detection):
  Receiver measures light intensity only
  On/Off Keying (OOK): 1 = light, 0 = dark
  Limited to 10G-40G per wavelength before dispersion limits capacity

Coherent (Phase Detection):
  Receiver tracks: amplitude (I) and phase (Q) of the optical carrier
  Modulation formats:
    QPSK: 2 bits per symbol (2 polarizations × 2 bits = 4 bits/symbol) → 100G at 50 GHz
    16-QAM: 4 bits per symbol (2 pol × 4 bits = 8 bits/symbol) → 200G at 50 GHz
    64-QAM: 6 bits per symbol → 400G at 50 GHz
    256-QAM: 8 bits per symbol → 800G at 50 GHz

DP (Dual Polarization):
  Light has two orthogonal polarization states (X and Y)
  Modulate both independently → double capacity
  DP-QPSK: most robust (100G, long haul)
  DP-16QAM: higher capacity (200G), shorter reach
  DP-64QAM: 400G, metro/short-haul

DSP (Digital Signal Processor):
  Coherent systems include powerful ASIC DSP
  Compensates: chromatic dispersion (CD), polarization mode dispersion (PMD), OSNR
  Makes long-haul 100G viable without inline dispersion compensation modules

Current deployed rates:
  100G: DP-QPSK; deployed since 2010; backbone standard
  200G: DP-16QAM; metro/regional standard
  400G: DP-16QAM or DP-64QAM; being widely deployed
  800G: DP-64QAM or DP-256QAM; emerging; research labs at 1.6T

Open ROADM / Open Line System:
  Disaggregate DWDM: use any vendor's transponders with any vendor's ROADM
  OpenConfig for optical: standard data models for coherent transceivers
  Avoids vendor lock-in in optical layer (historically very proprietary)
```

---

## OTN — Optical Transport Network (ITU-T G.709)

OTN is the modern replacement for SONET/SDH — provides an "optical wrapper" for client signals.

```
OTN frame hierarchy:
  OTU1:  2.66 Gbps  (carries OC-48/STM-16)
  OTU2:  10.7 Gbps  (carries OC-192/STM-64/10GE)
  OTU3:  43.0 Gbps  (carries OC-768/STM-256/40GE)
  OTU4:  112 Gbps   (carries 100GE — most widely deployed today)
  OTUCn: n × 100G   (for 200G, 400G, 800G signals)

OTN overhead:
  FEC (Forward Error Correction): G.709 includes 7% overhead for FEC
    Corrects bit errors introduced by optical noise
    Hard FEC: Reed-Solomon (7% overhead)
    Soft FEC / Turbo FEC / LDPC: 20-25% overhead; much better performance
    Modern coherent systems: soft FEC enables lower OSNR operation → longer reach

  OAM: rich overhead like SONET — performance monitoring, alarm propagation, TCM
  TCM (Tandem Connection Monitoring): end-to-end and segment monitoring

OTN benefits over SONET:
  Client-agnostic: wrap Ethernet, Fibre Channel, SDH — anything
  Non-synchronous: client clocks not required to be synchronous to network
  FEC: built-in; significantly extends reach vs SDH
  Scalable: OTUCn → arbitrary capacity multiples
```

---

## Fiber Troubleshooting

```
OTDR (Optical Time Domain Reflectometer):
  Sends pulse of light; measures reflections and backscatter vs time
  Time → distance (speed of light in fiber: ~200,000 km/s)
  Shows: connector loss, splice loss, bends, fiber breaks, fiber end
  Can locate a fiber break to within 1 meter over 100 km

Reading an OTDR trace:
  Flat slope: healthy fiber (0.2 dB/km for SMF)
  Step down: splice or connector (loss point)
  Large reflection peak: mechanical connector (Fresnel reflection)
  End of fiber: large step down to noise floor (Fresnel reflection at end + no more backscatter)
  Sudden drop to noise floor: fiber break (no more backscatter beyond break)

Optical power meter:
  Measures received power in dBm
  Compare to launch power → calculate insertion loss
  Insertion loss budget: launch power - minimum sensitivity = max allowed loss
  Example: QSFP28 100G LR: launch +3 dBm; sensitivity -10 dBm; budget = 13 dB (≈10 km)

Optical cleaning:
  Dirty connectors: #1 cause of fiber problems
  Always clean with fiber optic cleaning tools before connecting
  Inspect with fiber inspection scope (200×-400×) before and after cleaning
  Connector endface damage: scratches, chips → must be repolished or connector replaced

OSNR (Optical Signal-to-Noise Ratio):
  Signal power vs amplified spontaneous emission (ASE) noise from EDFAs
  Minimum OSNR required per modulation format:
    DP-QPSK (100G): ~15 dB OSNR
    DP-16QAM (200G): ~19 dB OSNR
    DP-64QAM (400G): ~26 dB OSNR
  OSNR degrades with each EDFA span; limits maximum system reach
```

---

## Tips

- Always clean fiber connectors before connecting — a fingerprint on an LC connector attenuates the signal by 3–10 dB (the equivalent of several kilometers of additional fiber).
- Know your loss budget before deploying: (launch power dBm) − (sensitivity dBm) = max dB of insertion loss the link can tolerate. Measure actual loss before commissioning.
- OM3/OM4 multimode is fine for intra-DC runs under 100m; use SMF for anything crossing between buildings or exceeding 100-400m — the transceiver cost difference is small compared to fiber replacement later.
- Coherent 400G transceivers are software-tunable — the same QSFP-DD hardware can run at 100G, 200G, or 400G by changing the modulation format in software (trading reach for speed).
- OSNR margin: always design with 3-4 dB OSNR margin beyond the minimum — this accounts for aging components, seasonal temperature effects, and unexpected added spans.

---

## Summary

- SMF (8-10µm core) for long distances (>2km); MMF (50µm) for intra-DC short runs (< 400m) — SMF supports DWDM, MMF does not.
- SONET/SDH (TDM-based, synchronous) is the legacy standard; OTN (client-agnostic wrapper with FEC) is the modern replacement; both run over DWDM wavelengths.
- DWDM multiplexes 40-160 wavelengths per fiber strand; EDFA amplifies all wavelengths simultaneously; ROADM enables remote wavelength routing.
- Coherent optics (DP-QPSK, DP-16QAM, DP-64QAM) enables 100G-400G per wavelength by detecting both amplitude and phase — DSP compensates for dispersion and noise.
- Total fiber capacity: 96 channels × 400G = 38.4 Tbps per fiber pair — and more with L-band extension.
- Dirty connectors and insufficient OSNR margin are the two most common optical network failures — clean before connecting; measure before commissioning.
