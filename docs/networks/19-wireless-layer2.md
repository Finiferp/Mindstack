---
title: "Wireless Layer 2"
sidebar_label: "Wireless Layer 2"
sidebar_position: 19
---

# Wireless Layer 2

Wireless networks operate at Layer 2 but face fundamentally different challenges than wired Ethernet — the medium is shared, untethered, noisy, and invisible. This page covers how 802.11 manages the air.

---

## Why Wireless Layer 2 Is Different from Ethernet

Ethernet uses CSMA/CD: transmit, detect a collision, stop. Wireless cannot do this — a station's own transmission drowns out any signal it might receive simultaneously (the "hidden node" problem). Instead, 802.11 uses **CSMA/CA** — Collision *Avoidance*.

Key differences:

| Property | Ethernet (802.3) | Wi-Fi (802.11) |
|---|---|---|
| Medium | Dedicated wire | Shared RF air |
| Collision detection | Yes (CD) | No — avoidance instead (CA) |
| Duplex | Full-duplex (switched) | Half-duplex per channel |
| Acknowledgement | No — rely on upper layers | Yes — every unicast frame ACK'd |
| Frame format | Simpler, two MAC addresses | Complex, up to four MAC addresses |

---

## 802.11 Standards Timeline

| Standard | Year | Band | Max Data Rate | Notes |
|---|---|---|---|---|
| 802.11 (original) | 1997 | 2.4 GHz | 2 Mbps | DSSS/FHSS; historically significant |
| 802.11b | 1999 | 2.4 GHz | 11 Mbps | Mass adoption, "Wi-Fi" brand launched |
| 802.11a | 1999 | 5 GHz | 54 Mbps | Less crowded band, shorter range |
| 802.11g | 2003 | 2.4 GHz | 54 Mbps | Backward-compatible with b |
| 802.11n (Wi-Fi 4) | 2009 | 2.4/5 GHz | 600 Mbps | MIMO introduced (up to 4 streams) |
| 802.11ac (Wi-Fi 5) | 2013 | 5 GHz | 6.9 Gbps | MU-MIMO, 160 MHz channels, beamforming |
| 802.11ax (Wi-Fi 6) | 2019 | 2.4/5 GHz | 9.6 Gbps | OFDMA, BSS Coloring, Target Wake Time |
| 802.11ax (Wi-Fi 6E) | 2021 | 6 GHz | 9.6 Gbps | Opens new 6 GHz band (1200 MHz spectrum) |
| 802.11be (Wi-Fi 7) | 2024 | 2.4/5/6 GHz | 46 Gbps | Multi-Link Operation (MLO), 320 MHz channels |

The Wi-Fi Alliance maintains the "Wi-Fi N" branding — the underlying IEEE standard is always 802.11x.

---

## The 802.11 Frame Format

Unlike Ethernet's two MAC addresses, 802.11 carries **up to four** MAC addresses depending on the network mode.

```
 ┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────────────┬────────┬───┐
 │ Frame Control│ Duration │ Addr 1   │ Addr 2   │ Addr 3   │ Seq Control  │ Addr 4 │...│
 │  (2 bytes)   │ (2 bytes)│ (6 bytes)│ (6 bytes)│ (6 bytes)│  (2 bytes)   │ (6 B)  │   │
 └──────────────┴──────────┴──────────┴──────────┴──────────┴──────────────┴────────┴───┘
 ┌─────────────────────────────────────────────────────────────────────┬──────────────────┐
 │                       Frame Body (0–2304 bytes)                     │  FCS (4 bytes)   │
 └─────────────────────────────────────────────────────────────────────┴──────────────────┘
```

### Frame Control Field (2 bytes, expanded)

```
 Bits: 0-1    Protocol version (always 00)
       2-3    Type: 00=Management, 01=Control, 10=Data
       4-7    Subtype (within type — e.g. 0000=Association Request in Management)
       8      To DS (to the distribution system / wired network)
       9      From DS (from the distribution system)
       10     More Fragments
       11     Retry
       12     Power Management (station about to enter sleep)
       13     More Data (AP has frames queued for sleeping station)
       14     Protected Frame (encrypted)
       15     Order
```

### Four-Address Scheme

The **To DS** and **From DS** bits determine which MAC address means what:

| To DS | From DS | Addr 1 | Addr 2 | Addr 3 | Addr 4 |
|---|---|---|---|---|---|
| 0 | 0 | Destination | Source | BSSID | — |
| 0 | 1 | Destination | BSSID | Source | — |
| 1 | 0 | BSSID | Source | Destination | — |
| 1 | 1 | Receiver AP | Transmitter AP | Destination | Source |

The 4-address mode (`To DS=1, From DS=1`) is used in **Wireless Distribution System (WDS)** links — AP-to-AP bridging over the air.

---

## CSMA/CA — Collision Avoidance

### DCF (Distributed Coordination Function) — the Basic Mechanism

```
 Station wants to transmit:
  1. Listen to the channel (physical + virtual carrier sense)
  2. If channel idle for DIFS (DCF Interframe Space) duration:
       → Pick a random backoff value in the contention window
       → Count down the backoff while channel remains idle
       → Transmit when counter reaches zero
  3. If channel is busy:
       → Wait until idle, then restart backoff
  4. Receiver sends ACK after SIFS (Short Interframe Space)
  5. If no ACK received → assume collision, double contention window, retry
```

```
Timeline:
  ───BUSY──────DIFS──[backoff: 7 slots]──TX──────SIFS──ACK───
                                          ↑ transmit when countdown done
```

**Interframe spaces (IFS) — used to prioritize different frame types:**

| IFS | Duration | Used for |
|---|---|---|
| SIFS (Short) | 16 µs (2.4 GHz) | ACK, CTS, data in fragmented burst |
| DIFS | SIFS + 2 slots | Normal data frames (DCF) |
| AIFS | Variable | Wi-Fi 6 QoS — different queues have different AIFS |
| PIFS | SIFS + 1 slot | PCF polling (legacy, rarely used) |
| EIFS | Longer | After a frame error — allow time to clear |

The shorter the IFS, the higher the priority to access the channel.

### Virtual Carrier Sense — NAV

A station that cannot hear a transmission can still be blocked by the **Network Allocation Vector (NAV)** — a timer set by hearing the Duration field in other frames.

```
 Hidden node problem:
   Station A ←→ AP ←→ Station B
   A and B can't hear each other — collision at AP!

 RTS/CTS solves this:
   A sends RTS → AP hears it, all nearby stations set NAV
   AP sends CTS → B hears it, sets NAV (even though it couldn't hear A's RTS)
   A transmits data → no collision because B is silenced by NAV

 Cost: overhead of RTS+CTS frames (only worth it for large frames)
```

---

## Frame Types

### Management Frames — for Infrastructure Control

```
Beacon              — AP broadcasts ~10 times/sec; contains SSID, BSSID, rates, capabilities
Probe Request       — client broadcast asking "who's here?"
Probe Response      — AP replies with its capabilities (same info as beacon)
Authentication      — legacy two-frame exchange (mostly Open System now)
Association Request — client asks to join AP
Association Response— AP accepts/rejects
Reassociation       — client roaming from one AP to another in same ESS
Disassociation      — clean disconnect
Deauthentication    — forceful disconnect (also used in deauth attacks)
Action              — management actions: spectrum management, block ACK, QoS, etc.
```

### Control Frames — for Channel Access

```
RTS    (Request to Send)   — client asks for channel reservation
CTS    (Clear to Send)     — AP grants; other stations silence themselves
ACK                        — receiver confirms successful receipt
Block ACK                  — acknowledge a burst of frames (A-MPDU aggregation)
PS-Poll                    — power-saving station asks AP to deliver buffered frames
CF-End                     — end of contention-free period (legacy PCF)
```

### Data Frames

```
Data                       — normal data frame
Null Function              — no data; carries Power Management bit (sleep announcement)
QoS Data                   — data with QoS tag (WMM — 802.11e)
A-MPDU                     — Aggregated MPDU (Wi-Fi 4+) — bundles multiple frames, huge throughput gain
A-MSDU                     — Aggregated MSDU — different aggregation level, less common
```

---

## The Association Process

How a device connects to a Wi-Fi network:

```
Client                                      AP
  │                                         │
  │◄─────── Beacon (every 100ms) ───────────│  Passive scan
  │                                         │
  │─── Probe Request (any SSID) ───────────►│  Active scan
  │◄── Probe Response ──────────────────────│
  │                                         │
  │────── Auth Request ────────────────────►│  Open auth (legacy formality)
  │◄───── Auth Response ────────────────────│
  │                                         │
  │──── Association Request ───────────────►│  Client requests membership
  │     (supported rates, HT/VHT caps, etc) │
  │◄─── Association Response ───────────────│  AP assigns AID, confirms
  │     (AID, supported rates)              │
  │                                         │
  │═══════ 4-Way Handshake (WPA2/3) ════════│  Key exchange (EAPOL)
  │◄───────────────────────────────────────►│
  │                                         │
  │◄══════ Data Traffic ══════════════════─►│  Connected
```

**Active vs Passive Scanning:**
- **Passive**: client listens for Beacons on each channel — slower, lower power
- **Active**: client sends Probe Requests on each channel — faster, but uses more power

---

## BSSID, SSID, ESSID

```
BSSID  (Basic Service Set ID)     — the AP's MAC address; uniquely identifies a BSS
SSID   (Service Set ID)           — the human-readable network name ("HomeNetwork")
ESSID  (Extended Service Set ID)  — same as SSID when referring to a multi-AP network sharing one name
IBSS   (Independent BSS)          — ad-hoc mode; no AP; stations connect directly
BSS    (Basic Service Set)        — one AP + its associated clients
ESS    (Extended Service Set)     — multiple APs sharing the same SSID (enterprise Wi-Fi)
```

---

## Power Management

```
Active Mode     — station always awake; receives traffic immediately
PS (Power Save) — station announces sleep via PM bit in Null frames
                  AP buffers frames for sleeping stations
                  AP includes station's AID in TIM (Traffic Indication Map) in Beacon
                  Station wakes before each Beacon, reads TIM
                  If its AID is set: sends PS-Poll to retrieve buffered frames
                  Then sleeps again

APSD (Automatic PS Delivery, 802.11e)
  — more sophisticated; station specifies trigger frames for delivery

Wi-Fi 6 TWT (Target Wake Time)
  — AP schedules exact wake times for each station, dramatically reducing contention
  — critical for IoT battery life
```

---

## Channel Planning

```
2.4 GHz band (channels 1-13 in most regions, 1-11 in US)
  — only 3 non-overlapping 20 MHz channels: 1, 6, 11
  — used by Bluetooth, baby monitors, microwaves — very congested

    ← Ch 1 ←──────→ Ch 6 ←──────→ Ch 11 →
    overlapping channels cause co-channel interference (worst) and adjacent-channel interference

5 GHz band (many more non-overlapping channels)
  — 25 non-overlapping 20 MHz channels available (region-dependent)
  — DFS (Dynamic Frequency Selection) — radar avoidance on some channels
  — less congested, shorter range than 2.4 GHz

6 GHz band (Wi-Fi 6E/7)
  — opens 1200 MHz of new spectrum (channels 1–233 in US)
  — no legacy devices; clean slate

Channel bonding:
  — 40 MHz = 2× 20 MHz bonded (doubles throughput, halves available non-overlapping channels)
  — 80 MHz, 160 MHz for 802.11ac/ax (mainly in 5/6 GHz; impractical in 2.4 GHz)
  — 320 MHz for Wi-Fi 7 (6 GHz only)
```

---

## WMM / 802.11e — QoS

Wi-Fi Multimedia (WMM) maps to four access categories (AC), each with its own contention window and AIFS:

| Priority | AC | AIFS | Traffic Type |
|---|---|---|---|
| Lowest | AC_BK (Background) | 7 | Bulk file transfers, backups |
| Low | AC_BE (Best Effort) | 3 | Standard data (default) |
| High | AC_VI (Video) | 2 | Video streaming |
| Highest | AC_VO (Voice) | 2 (smaller CW) | VoIP |

Lower AIFS = accesses the channel sooner = higher priority.

---

## Tips

- The 2.4 GHz band has only three non-overlapping channels (1, 6, 11) — use these exclusively in channel planning to avoid adjacent-channel interference.
- CSMA/CA never eliminates collisions entirely — it reduces probability; the backoff algorithm and ACK mechanism handle recovery.
- Deauthentication attacks send spoofed management frames because 802.11 management frames are unauthenticated by default — 802.11w (Management Frame Protection) fixes this.
- Monitor mode on a wireless NIC lets you capture all 802.11 frames — essential for troubleshooting; wireshark displays all frame types.
- Co-channel interference (two APs on same channel overlapping) is worse than adjacent-channel interference — use non-overlapping channels even when farther apart.

---

## Summary

- 802.11 uses CSMA/CA (not CD) because a transmitting station cannot detect simultaneous collisions over the air.
- Every unicast frame requires an explicit ACK; missing ACK triggers retransmission with an exponential backoff.
- Up to four MAC addresses exist in a wireless frame; To DS and From DS bits determine their roles.
- The association process: Probe → Auth → Associate → 4-Way Handshake (WPA2/3 key exchange).
- BSSID identifies a single AP; SSID/ESSID identifies the network name shared across multiple APs.
- WMM provides QoS via four access categories with different contention window sizes and AIFS values.
- Wi-Fi 6 introduced OFDMA (multiple simultaneous clients per channel) and TWT (scheduled wakeup times) — big improvements in dense environments and IoT battery life.
