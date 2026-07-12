---
title: "Wireless Networking Fundamentals"
sidebar_label: "Wireless Fundamentals"
sidebar_position: 59
---

# Wireless Networking Fundamentals

Wireless networking extends the network over radio frequency (RF) — a shared, unguided medium subject to interference, multipath, and path loss. Understanding RF physics is essential to deploying reliable wireless networks.

---

## RF Fundamentals

### Electromagnetic Spectrum

```
The RF spectrum used for Wi-Fi falls in microwave frequencies:

Frequency   Wavelength   Band      Wi-Fi Standard
2.4 GHz     12.5 cm      UHF/SHF  802.11b/g/n/ax (Wi-Fi 4/5/6)
5 GHz       6 cm         SHF      802.11a/n/ac/ax (Wi-Fi 4/5/6)
6 GHz       5 cm         SHF      802.11ax (Wi-Fi 6E) / 802.11be (Wi-Fi 7)
60 GHz      5 mm         EHF      802.11ad/ay (WiGig) — very short range, line of sight

Relationship: c = f × λ
  c = speed of light (3 × 10^8 m/s)
  f = frequency (Hz)
  λ = wavelength (meters)

Higher frequency → shorter wavelength → more bandwidth available → higher data rates
Higher frequency → shorter range → more absorption by walls, people, air molecules
```

### Signal Strength and Decibels

```
Signal strength measured in dBm (decibel milliwatts):
  0 dBm = 1 milliwatt
  Positive dBm = more than 1 mW; Negative dBm = less than 1 mW
  Wi-Fi signals typically -30 dBm (strong) to -90 dBm (very weak)

Decibel math:
  +3 dB  = approximately double the power
  -3 dB  = approximately half the power
  +10 dB = 10× the power
  -10 dB = 1/10 the power
  +20 dB = 100× the power

RSSI thresholds (approximate, Wi-Fi):
  -30 to -50 dBm: Excellent — very close to AP; max throughput
  -50 to -67 dBm: Good — reliable for most applications
  -67 to -70 dBm: Acceptable — minimum for VoIP and video
  -70 to -80 dBm: Poor — basic browsing; frequent retransmissions
  -80 to -90 dBm: Very poor — barely connected; high loss rate
  Below -90 dBm: Disconnected / unusable

Free Space Path Loss (FSPL):
  FSPL(dB) = 20 × log₁₀(d) + 20 × log₁₀(f) + 20 × log₁₀(4π/c)
  Simplified: FSPL ≈ 20 log₁₀(d) + 20 log₁₀(f) − 147.6 (d in meters, f in Hz)

  At 2.4 GHz, 10 meters: FSPL ≈ 60 dB
  At 5 GHz, 10 meters:   FSPL ≈ 66 dB
  → 5 GHz loses ~6 dB more over the same distance than 2.4 GHz

Link Budget:
  Received power = TX power − FSPL − cable losses + TX antenna gain + RX antenna gain
  
Example:
  TX power:    20 dBm
  FSPL at 50m: 74 dB
  Antenna gain: 3 dBi (each side)
  RX power = 20 − 74 + 3 + 3 = -48 dBm (excellent signal)
```

### RF Propagation Effects

```
Absorption:
  Signal energy absorbed by materials it passes through
  Concrete: 10-15 dB loss; Brick: 8-12 dB; Drywall: 3-5 dB; Glass: 2-4 dB
  Human body: 3-5 dB (crowd of people significantly attenuates 2.4 GHz)
  Water: extreme absorption at GHz frequencies (hence 2.4 GHz microwave ovens!)

Reflection:
  Signal bounces off hard surfaces (concrete, metal, floor, ceiling)
  Reflected signals arrive at receiver with delay → multipath

Diffraction:
  Signal bends around edges of objects
  Allows some signal around corners and obstacles
  More pronounced at lower frequencies

Scattering:
  Signal scattered by irregular objects smaller than wavelength (rough surfaces, foliage)
  Spreads signal in many directions; reduces strength in original direction

Multipath:
  Multiple copies of same signal arrive at different times via different paths
  Constructive interference: copies add up → signal boost
  Destructive interference: copies cancel → signal null
  MIMO exploits multipath (multiple spatial streams); OFDM is robust to multipath

Doppler effect:
  Moving receiver/transmitter causes frequency shift
  Usually not significant for typical Wi-Fi (people walking)
  Significant for automotive/train Wi-Fi
```

---

## Wi-Fi Standards Deep Dive

### OFDM — Orthogonal Frequency Division Multiplexing

OFDM is the modulation scheme used by 802.11a/g/n/ac/ax — it divides the channel into many narrow subcarriers.

```
Traditional single-carrier: one wide signal; entire channel affected by interference
OFDM: channel divided into 64 subcarriers (for 20 MHz channel)
  48 data subcarriers + 4 pilot (reference) subcarriers + 12 null (guard)
  Each subcarrier is very narrow → robust against narrow-band interference
  Guard interval: time between OFDM symbols to absorb multipath echoes
    Long GI: 800 ns (standard — tolerates up to 800ns multipath delay)
    Short GI: 400 ns (20% throughput gain; requires cleaner RF environment)

802.11n added OFDM improvements:
  40 MHz channels: double subcarriers → ~2× throughput (channel bonding)
  Wider bandwidth = faster throughput but less available non-overlapping channels

802.11ac (Wi-Fi 5) added:
  80 MHz and 160 MHz channels (5 GHz only)
  256-QAM modulation (vs 64-QAM in 802.11n) → denser encoding → higher throughput
  MU-MIMO downlink: AP sends to multiple clients simultaneously (up to 4)
  Beamforming: focus energy toward client (steerable antenna patterns)

802.11ax (Wi-Fi 6) added:
  OFDMA (Multiple Access): divide OFDM channel into Resource Units (RUs) per client
    Multiple clients scheduled simultaneously on same channel → better efficiency in dense environments
  1024-QAM: even denser modulation → 10% more throughput than 256-QAM (requires very clean signal)
  BSS Coloring: reduce co-channel interference by tagging frames with a "color"
    Devices ignore frames with different color even on same channel (if below threshold)
  TWT (Target Wake Time): schedule wake times for IoT devices → massive battery savings
  MU-MIMO: 8 streams (vs 4 in Wi-Fi 5) bidirectional (uplink + downlink)
  6 GHz support (Wi-Fi 6E): clean spectrum, no legacy devices
```

### Modulation and Coding Schemes (MCS)

MCS determines how much data is encoded per symbol — higher MCS = more data but requires better signal quality.

```
BPSK:   1 bit per symbol;  lowest data rate; most robust; worst signal OK
QPSK:   2 bits per symbol
16-QAM: 4 bits per symbol
64-QAM: 6 bits per symbol; 802.11n maximum
256-QAM: 8 bits per symbol; 802.11ac
1024-QAM: 10 bits per symbol; 802.11ax; requires excellent SNR (>28 dB)

MCS Index (802.11n/ac/ax):
  MCS 0: BPSK 1/2 coding rate
  MCS 7: 64-QAM 5/6 coding rate (802.11n max single-stream)
  MCS 8: 256-QAM 3/4 (802.11ac)
  MCS 9: 256-QAM 5/6 (802.11ac)
  MCS 10: 1024-QAM 3/4 (802.11ax)
  MCS 11: 1024-QAM 5/6 (802.11ax)

Data rate = MCS × MIMO streams × channel width × (1 - coding overhead)

Example: 802.11ax, 80 MHz, 4 spatial streams, MCS 11:
  ~2.4 Gbps theoretical max

Practical throughput is always 50-70% of theoretical (overhead, retransmissions, etc.)
```

---

## Wi-Fi Deployment Architecture

### Autonomous vs Controller-Based

```
Autonomous AP:
  Each AP independently configured
  Used: home, very small office
  Problem: no central management; inconsistent config; hard to roam between APs

Controller-Based (Lightweight AP / LWAP):
  AP runs stripped firmware (CAPWAP tunnel to controller)
  Controller: central management, RF optimization, security policy
  CAPWAP (Control And Provisioning of Wireless Access Points, RFC 5415/5416)
    UDP port 5246 (control tunnel) and 5247 (data tunnel)
    AP discovers controller via: DHCP option 43, DNS cisco-capwap-controller, broadcast
  All config pushed from controller; APs are "dumb" radios

Cloud-Based:
  Controller in cloud (Cisco Meraki, Ubiquiti UniFi, Aruba Central)
  APs managed via web dashboard; no on-prem controller hardware
  APs may pass data locally (not through cloud) but are managed via cloud

FlexConnect (Cisco):
  AP in "split-MAC" mode: control via CAPWAP, data forwarded locally
  Survives WAN outage (local switching continues, auth cached locally)
  Used: branch offices with slow WAN to central controller
```

### SSID Design

```
SSID (Service Set Identifier): the network name broadcasted by APs

Multiple SSID design:
  Corp-WiFi     → WPA3-Enterprise (802.1X); VLAN 10; full corp access
  Corp-Voice    → WPA3-Enterprise; VLAN 20; QoS for VoIP; low DTIM
  BYOD          → WPA3-Enterprise (device certificates); VLAN 30; limited access
  Guest         → WPA3-Personal or Open (captive portal); VLAN 99; internet only; rate-limited
  IoT           → WPA2-Personal or WPA3; VLAN 50; isolated; no internet

Each SSID = separate BSSID (unique MAC per radio per SSID)
Multiple SSIDs add overhead (more beacons, more probe responses)
Best practice: no more than 4 SSIDs per AP (above 4 noticeably impacts performance)
Disable SSIDs you don't use

BSS Basic Rate Set (BRS):
  Rates that ALL clients must support to associate
  Disable low legacy rates (1, 2, 5.5, 11 Mbps) to reduce airtime consumption
  Recommended minimum: 12 or 24 Mbps basic rate
  Cisco: dot11 rates 1.0 2.0 5.5 11.0 disable; dot11 rates 6.0 9.0 12.0 24.0 basic
```

### Cell Design and Channel Planning

```
Coverage cell sizing:
  Too large: clients at edge have poor signal → low MCS → slow → airtime wasted
  Too small: excessive handoffs; more APs needed
  Target: -67 dBm at cell edge for voice/video; -70 dBm for data

AP placement:
  Omni antennas: place in center of coverage area
  Patch antennas: aim at coverage area
  Dense environments: many APs with lower TX power (avoid one AP serving 100 clients)
  Obstructions: place APs where walls/floors don't block the primary coverage area

2.4 GHz channel plan:
  Only 3 non-overlapping channels: 1, 6, 11
  Cells on same channel: keep -85 dBm distance (cells shouldn't overlap strongly)
  Adjacent cell interference is better than co-channel interference
  Co-channel interference (same channel): MAC-layer collision domain → worst case
  Adjacent channel interference (channels 1 and 2): different frequencies overlap → bad but less bad

5 GHz channel plan:
  Up to 25 non-overlapping 20 MHz channels (region-dependent)
  Common indoor channels: 36, 40, 44, 48, 149, 153, 157, 161
  DFS channels (100-140): require Dynamic Frequency Selection (radar avoidance)
    DFS radar detection causes 60-second outage when radar detected
    Some APs/clients don't support DFS
  80 MHz bonded: {36-48}, {52-64}, {100-112}, {116-128}, {132-144}, {149-161}
  160 MHz bonded: {36-64}, {100-128}, {149-177} (limited availability)

Wi-Fi 6E / 7 (6 GHz):
  1200 MHz of spectrum; 59 × 20 MHz non-overlapping channels
  No legacy devices, no radar; completely clean spectrum
  APs must be tri-band (2.4, 5, 6 GHz) for backward compatibility
```

---

## Roaming and Mobility

```
Layer 2 roaming (same VLAN, same controller):
  Client moves from AP1 to AP2; same subnet; seamless
  Old AP sends client cache to new AP; no re-authentication
  Intra-controller roaming: < 50ms; transparent

Layer 3 roaming (different VLAN, different subnet):
  Client moves between APs on different subnets
  Without help: IP change required (DHCP again); TCP connections break
  With mobility tunneling: controller tunnels traffic to anchor AP (home subnet)
  Client keeps original IP; mobility anchor handles forwarding

Fast BSS Transition (FT, 802.11r):
  Pre-authenticate to target AP before client moves (using R0KH/R1KH key hierarchy)
  Significantly reduces roaming latency (100ms → <50ms)
  Required for VoIP over Wi-Fi (SIP/RTP can't tolerate >150ms interruption)

802.11k (Radio Resource Management):
  AP tells clients about neighboring APs and their signal quality
  Client builds neighbor list; knows where to roam before it's needed
  Reduces roaming decision time (no blind scan required)

802.11v (BSS Transition Management):
  AP can suggest (or force) a client to roam to a better AP
  Helps balance load across APs
  Sticky client problem: client clings to distant AP despite closer one available
  802.11v BSS TM Request: AP asks client to move to neighbor AP

802.11r + 802.11k + 802.11v = "the roaming trifecta" — deploy all three for best roaming

PMKID Roaming (WPA2/3):
  PMKID cached at AP cluster → client doesn't need full EAP re-authentication on roam
  OKC (Opportunistic Key Caching): cache PMK from initial auth across all APs in cluster
```

---

## Wireless Security (WPA2/WPA3)

```
Open (no encryption):
  No auth; no encryption; anyone can join; packet capture by anyone
  Used: captive portals (guest WiFi) — but traffic visible to other Wi-Fi users!
  WPA3-OWE (Opportunistic Wireless Encryption): encrypts even without password
    Replaces "Open" — same UX (no password) but encrypted per-client

WPA2-Personal (WPA2-PSK):
  Pre-Shared Key: passphrase shared among all users
  4-Way Handshake derives per-session PMK (Pairwise Master Key)
  Weakness: PSK handshake capture → offline dictionary attack
  Weakness: one device knows PSK → can decrypt all traffic (no forward secrecy)
  Use: home networks; small offices; IoT devices

WPA3-Personal (SAE — Simultaneous Authentication of Equals):
  Dragonfly key exchange (RFC 7664)
  No more offline dictionary attack from handshake capture
  Forward secrecy: each session has unique keys
  PMF (Protected Management Frames) mandatory
  Backward compatible with WPA2 in transition mode
  Use: home networks; replaces WPA2-PSK for new deployments

WPA2-Enterprise (802.1X):
  Each user authenticates with unique credentials (username+password or certificate)
  RADIUS server validates; unique PMK per user per session
  More secure: one compromised device/user doesn't expose others
  Use: corporate networks; any deployment with user-level accountability

WPA3-Enterprise:
  Same 802.1X model + SAE improvements
  Optional: 192-bit security mode (CNSA suite for government/military)
  PMF mandatory

TKIP (deprecated, from WPA1):
  Never use; multiple attacks demonstrated; deprecated by IEEE

CCMP (Counter Mode with CBC-MAC Protocol):
  Used in WPA2; based on AES-128-CCM
  Current standard for WPA2

GCMP (Galois/Counter Mode Protocol):
  Used in WPA3 and 802.11ad/ay (WiGig)
  AES-128-GCMP (WPA3 standard) or AES-256-GCMP (WPA3-Enterprise 192-bit)

PMF (Protected Management Frames, 802.11w):
  Authenticates management frames (deauth, disassoc) to prevent spoofing
  Prevents deauthentication attacks (one of the most common Wi-Fi attacks)
  WPA3 makes PMF mandatory; WPA2 deployments should enable it
  Cisco: management-frame protection required / optional / disabled
```

---

## Tips

- The 2.4 GHz band is congested in dense areas (neighbors' networks, microwaves, baby monitors, Bluetooth) — push capable clients to 5 GHz or 6 GHz with band steering.
- Co-channel interference is worse than adjacent channel interference — always use 1, 6, 11 on 2.4 GHz and never put adjacent channels on overlapping cells.
- The "sticky client" problem (client stays on distant AP) is a real performance killer — enable 802.11v BSS Transition Management so the AP can ask misbehaving clients to roam.
- Disable 802.11b rates (1/2/5.5/11 Mbps) on SSIDs — legacy rates consume enormous airtime for minimal data delivery and drag down the entire BSS.
- 802.11r + 802.11k + 802.11v are the three roaming standards — deploy all three to support voice-grade wireless; without 802.11r, VoIP calls drop during roaming.

---

## Summary

- Wi-Fi operates in 2.4 GHz (crowded, longer range), 5 GHz (cleaner, faster, shorter range), and 6 GHz (clean spectrum, Wi-Fi 6E/7).
- OFDM divides the channel into many narrow subcarriers — robust against multipath and narrow-band interference.
- Channel planning: only 3 non-overlapping channels in 2.4 GHz (1/6/11); 25 in 5 GHz; 59 in 6 GHz.
- Controller-based architectures (CAPWAP) centralize management, RF optimization, and security — use FlexConnect for branch survivability.
- WPA3-Personal (SAE) replaces WPA2-PSK — no offline dictionary attacks, forward secrecy; WPA3-Enterprise remains 802.1X-based.
- Roaming: 802.11r (fast transition), 802.11k (neighbor reports), 802.11v (BSS transition management) together enable seamless voice-grade roaming.
