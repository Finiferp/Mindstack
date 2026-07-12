---
title: "Wireless Architecture — Controllers and Roaming"
sidebar_label: "Wireless Architecture"
sidebar_position: 61
---

# Wireless Architecture — Controllers and Roaming

Enterprise wireless deployments use centralized controllers (or cloud management) to coordinate dozens or hundreds of APs, manage roaming, enforce policy, and troubleshoot at scale.

---

## Wireless Architecture Models

### Autonomous AP (Fat AP)

```
Each AP manages itself independently:
  Configuration stored locally on each AP
  Security policies enforced locally
  SSID management per-device
  Roaming: basic only (client re-associates with new AP; session breaks)

Use cases: small deployments (home, tiny office)
Problems at scale:
  100 APs = configure 100 devices individually
  Firmware update = 100 individual updates
  Policy change = change each AP
  Roaming: client drops connection; re-associates with new AP (no seamless handoff)
  No centralized visibility
```

### Centralized (Controller-Based) Architecture

```
Thin AP (Lightweight AP) + Wireless LAN Controller (WLC):
  APs are "thin" — minimal local processing
  All configuration, policy, and management centralized in WLC
  APs register with WLC on boot; receive config from WLC
  New AP joins the network: auto-discovers WLC, downloads config, joins

CAPWAP (Control and Provisioning of Wireless Access Points, RFC 5415/5416):
  Tunneling protocol between AP and WLC
  UDP 5246 (control channel): configuration, management
  UDP 5247 (data channel): client data traffic (optional — split tunneling)
  Uses DTLS (Datagram TLS) for encryption of control channel

Two CAPWAP forwarding modes:
  Central switching (tunneled): all client traffic sent to WLC via CAPWAP tunnel
    WLC applies policy, then forwards to wired network
    Pro: centralized policy enforcement; visibility at WLC
    Con: all WiFi traffic hairpins to WLC (latency; WLC bandwidth bottleneck)
    Used for: corporate networks with central Internet/security inspection

  Local switching (FlexConnect): client data stays local at AP/site
    AP decapsulates client frames; forwards to local switch
    CAPWAP used only for control (config, authentication, management)
    Pro: remote site traffic stays local (no WAN hairpin); WAN failure resilience
    Con: policy enforcement at AP (less visibility at WLC)
    Used for: branch offices; SSID still managed centrally

Cisco WLC discovery:
  AP learns WLC IP via: DHCP option 43, DNS "cisco-capwap-controller", broadcast, static config
  AP → WLC: discovery request; WLC responds; AP sends join request
  AP downloads config from WLC: SSIDs, channels, power, security policies
```

### Cloud-Managed Architecture

```
AP managed via cloud controller (SaaS):
  Cisco Meraki, Ubiquiti UniFi Cloud, Aruba Central, Juniper Mist AI
  APs connect to cloud; receive config from cloud controller
  Data traffic: local (APs forward locally; cloud only for control)
  Zero-touch provisioning: ship AP to site; plug in; auto-joins cloud controller

Advantages:
  No on-premises WLC hardware to maintain
  Automatic updates
  Unified visibility across all sites
  Zero-touch provisioning for branch offices
  AI-based optimization (Juniper Mist AI, Cisco DNA Center)

Disadvantages:
  Internet dependency for management (AP still forwards data if cloud unreachable)
  Subscription cost
  Data sovereignty concerns (what goes to cloud)
  Less control over timing of updates

Juniper Mist AI:
  AI-based RF optimization and troubleshooting
  Per-client SLAs (latency, throughput, success rate)
  AI root cause analysis for wireless issues
  Automatic channel and power optimization
```

### Distributed / SD-Access Architecture

```
Cisco SD-Access (Software-Defined Access):
  Fabric-based; uses VXLAN + LISP for overlay
  Identity-based policy applied consistently (wired + wireless)
  APs join fabric; client traffic over VXLAN tunnels
  ISE provides AAA + policy; DNA Center provides management plane

Aruba CX / HPE Aruba Networking:
  AOS-CX switches + APs + ClearPass (AAA) + Aruba Central (cloud management)

Cambium Networks:
  Cloud-managed; popular in outdoor and ISP deployments
```

---

## SSID Architecture

```
Multiple SSIDs per AP (typical design):
  CORPORATE: WPA3-Enterprise (802.1X/EAP); VLAN 10 for employees
  IoT: WPA2-PSK; isolated VLAN 50; no access to corporate network
  GUEST: WPA3-SAE or OWE; isolated VLAN 100; Internet-only; no internal access
  BYOD: WPA2/WPA3-Enterprise + posture check; VLAN 20 with limited access

SSID → VLAN mapping:
  Each SSID maps to a VLAN
  AP trunk port carries all VLANs
  WLC assigns client to VLAN based on SSID (and optionally RADIUS attributes)
  RADIUS can override VLAN per-user (dynamic VLAN assignment):
    RADIUS attributes: Tunnel-Type=VLAN, Tunnel-Medium-Type=802, Tunnel-Private-Group-Id=20
    Same SSID, different users → different VLANs based on identity

SSID best practices:
  Minimum SSIDs: each SSID adds beacon overhead (every 100ms per SSID)
    10 SSIDs = 10× beacon overhead → reduces available airtime for data
    Guideline: ≤ 5 SSIDs per AP (preferably ≤ 3)
  Use dynamic VLAN assignment via RADIUS rather than one SSID per VLAN
  Disable SSIDs on bands where clients won't use them (e.g., IoT on 2.4 GHz only)
```

---

## Roaming

Client roaming happens when a device moves between AP coverage areas. The goal: seamless handover with no perceptible interruption to voice/video calls.

### Basic Roaming

```
Without roaming assistance:
  Client A: connected to AP1; moves toward AP2
  Client detects signal from AP1 degrading (SNR drops)
  Client decides to roam (vendor algorithm; may vary — often too sticky!)
  Client sends 802.11 Authentication + Association Request to AP2
  AP2 checks with WLC: new client association
  Client gets new IP (or retains via DHCP lease) — depends on subnet/VLAN
  Approx time: 50–200ms; VoIP call may drop packets

Sticky client problem:
  Client holds on to AP1 even as signal degrades below AP2's signal
  AP doesn't control when client roams — client decides
  Solutions: band steering, client steering via 802.11v/r/k
```

### Fast Roaming Standards

```
802.11r — Fast BSS Transition (FT):
  Pre-authenticates the 4-way handshake BEFORE client connects to new AP
  Reduces roaming time from 200ms to < 50ms
  How:
    Client obtains "R0 key" from current AP/WLC
    Pre-authorizes with target AP: exchanges keys before actually roaming
    On roam: minimal frames (2 instead of many) → very fast
  Deployment: both APs must support 802.11r; same mobility domain
  WPA3 requirement: mandatory for WPA3 networks

802.11k — Radio Resource Measurement:
  AP sends neighbor reports to client (list of nearby APs on other channels)
  Client builds roaming candidate list without having to scan all channels
  Reduces roam decision time (client knows what's available)
  Not roaming acceleration by itself; reduces scan time before roaming decision

802.11v — BSS Transition Management:
  AP can "suggest" or "force" a client to roam
  BSS Transition Request: AP sends recommendation to roam to a specific AP
  Client may comply (most do) or reject
  Enables load balancing (AP can steer clients to less congested AP)
  Combines with 802.11k: AP knows which AP to recommend from neighbor list

Cisco Fast Roaming features:
  CCKM (Cisco Centralized Key Management): Cisco proprietary pre-802.11r; WPA2-Enterprise
  OKC (Opportunistic Key Caching): WPA2-Enterprise fast roaming via PMK caching
  Adaptive 802.11r: Cisco negotiates 802.11r with capable clients, falls back for others

For VoIP:
  Target: < 50ms roam time (VoIP typically tolerates ~150ms)
  Requires: 802.11r + 802.11k + 802.11v (called "the trio")
  Without 802.11r: > 150ms → dropped calls are common
```

### Mobility Groups (WLC)

```
Single WLC:
  All APs registered to one WLC
  Roaming between any APs: L2 roam (same VLAN/subnet) or L3 roam (different subnet)
  L2 roam: client IP unchanged; WLC just updates AP association (seamless)
  L3 roam: client moves to AP on different VLAN; would need new IP
            WLC uses CCKM/mobility tunnel to maintain original IP at new AP

Multiple WLCs — Mobility Group:
  WLCs communicate via mobility tunnel (CAPWAP or EoIP)
  Client roams from AP on WLC1 to AP on WLC2
  WLC2 notifies WLC1: client moved
  WLC1 tunnels client traffic to WLC2 (EoIP tunnel) so client keeps same IP
  Seamless inter-controller roaming

Mobility Group limitations:
  Usually ≤ 24 WLCs per mobility group (Cisco)
  All WLCs must trust each other (shared mobility key)

Inter-domain roaming (between mobility groups):
  Client gets new IP; session breaks (no tunnel between domains)
  For most applications: acceptable
  For VoIP: problematic
```

---

## Band Steering and Client Load Balancing

```
Band Steering:
  Goal: move dual-band (5 GHz capable) clients from crowded 2.4 GHz to 5 GHz
  Method:
    Client probes both 2.4 and 5 GHz
    AP suppresses 2.4 GHz probe response (doesn't answer) if client heard on 5 GHz
    Client: "Only 5 GHz responded → connect to 5 GHz"
  
  Configurable: aggressiveness (how long to suppress 2.4 GHz response)
  Risks: over-aggressive → client gives up and connects anyway, or can't find SSID
  6 GHz steering (Wi-Fi 6E): similar mechanism to push clients to 6 GHz

Client Load Balancing:
  AP has maximum client count threshold
  New client trying to associate to congested AP: AP delays or denies
  Client tries another AP with better capacity
  Risk: aggressive load balancing → roaming artifacts, sticky clients stay stuck
  802.11v BSS Transition Request: more graceful approach

Minimum RSSI threshold:
  WLC/AP rejects association below configured RSSI (e.g., -80 dBm)
  Forces clients to connect to nearest AP (better signal)
  Prevents weak-signal clients from consuming airtime inefficiently
```

---

## Mesh Wireless

```
Mesh AP: APs communicate wirelessly with each other (backhaul) instead of requiring Ethernet to each AP
  Root AP: connected to wired network
  Mesh AP: wirelessly connected to root or another mesh AP; daisy-chain

Use cases:
  Outdoor coverage where trenching cable is impractical
  Temporary deployments (events, construction sites)
  Historical buildings where cable runs are restricted

Backhaul channels:
  Dedicated radio for backhaul (some APs have 3 radios: 2.4 GHz client + 5 GHz client + 5/6 GHz backhaul)
  Or: shared radio (same radio for both clients and mesh backhaul — reduces capacity)

Throughput degradation:
  Each mesh hop halves throughput (half-duplex — AP transmits to next hop AND receives from clients)
  2 hops: ~25% of root AP throughput
  Maximum practical: 2–3 mesh hops
  Dedicated backhaul radio largely eliminates this problem

AWPP (Adaptive Wireless Path Protocol, Cisco):
  Cisco mesh routing protocol; selects best path to root AP based on: RSSI, throughput, hop count

Ubiquiti UniFi Mesh, Cisco Meraki, Aruba all support mesh deployments
```

---

## Wireless QoS

```
WMM (Wi-Fi Multimedia) / 802.11e:
  Four access categories (same as covered in QoS page):
    AC_VO (Voice): lowest AIFS; strict priority
    AC_VI (Video): second priority
    AC_BE (Best Effort): default
    AC_BK (Background): lowest priority

  Devices tag their own traffic (phones tag RTP voice as AC_VO)
  AP honors the tags in its EDCA (Enhanced Distributed Channel Access) parameters
  Not enforced: devices can self-elevate any traffic to AC_VO (gaming apps do this)

U-APSD (Unscheduled Automatic Power Save Delivery):
  Extension to WMM; enables voice calls with power saving
  Phone can enter sleep between packets; AP buffers and delivers on trigger frame
  Required for good voice-over-WiFi battery life

DSCP → WMM mapping at AP:
  DSCP EF (46) → AC_VO
  DSCP AF41 (34) → AC_VI
  DSCP CS0 (0) → AC_BE

Call Admission Control (CAC):
  AP limits number of admitted AC_VO flows to protect call quality
  New call: AP checks available bandwidth; rejects if would degrade existing calls
  Required for predictable voice quality in shared deployments
```

---

## Tips

- Deploy the "trio" (802.11r + 802.11k + 802.11v) for any wireless network used for voice — without fast roaming, VoIP calls break when users walk between APs.
- Minimize SSIDs per AP: each SSID adds beacon overhead every 100ms; more than 5 SSIDs causes noticeable airtime waste.
- Use dynamic VLAN assignment via RADIUS rather than separate SSIDs for each department — one secure SSID, user identity determines VLAN.
- Band steering requires careful tuning — too aggressive causes clients to fail to connect; too lenient leaves clients on 2.4 GHz unnecessarily.
- FlexConnect (local switching) is essential for branch offices — sends client data directly to the local switch, not hairpinned over the WAN to a central WLC.

---

## Summary

- Autonomous (fat) APs are unmanageable at scale — use controller-based (Cisco WLC/CAPWAP) or cloud-managed (Meraki, UniFi, Mist) for enterprise.
- CAPWAP tunnels AP-to-WLC control and optionally data; FlexConnect/local switching breaks data out locally at the AP for branch deployments.
- Roaming: 802.11r (fast key exchange), 802.11k (neighbor reports), 802.11v (AP-directed steering) — all three needed for seamless VoIP roaming.
- Multiple SSIDs waste airtime (beacons every 100ms each) — use RADIUS dynamic VLAN assignment to reduce SSID count.
- Mesh extends wireless to areas without Ethernet cable — each hop halves throughput; dedicated backhaul radio avoids this.
- WMM/802.11e provides QoS within the wireless medium — AC_VO for voice, AC_VI for video; requires Call Admission Control for predictable performance.
