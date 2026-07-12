---
title: "Wireless Security"
sidebar_label: "Wireless Security"
sidebar_position: 60
---

# Wireless Security

Wireless networks are inherently more exposed than wired — anyone within range can receive RF frames. This page covers wireless-specific attacks, countermeasures, and enterprise wireless security architecture.

---

## The Wireless Threat Landscape

```
Unlike wired networks, wireless has additional challenges:
  No physical access required — attacker can be in the parking lot
  Shared medium — all devices on same frequency can "hear" each other
  Management frames (pre-802.11w) unauthenticated — easily forged
  Range uncertainty — you don't know exactly how far your signal reaches
  Regulatory limits on TX power but not on receive sensitivity

Attack categories specific to wireless:
  Passive sniffing: capture all frames on a channel (monitor mode)
  Rogue AP / Evil Twin: impersonate legitimate SSID
  Deauthentication attacks: force disconnection
  Key cracking: offline attack against captured handshake
  WPS PIN attacks: brute-force WPS PIN
  PMKID attacks: crack WPA2-PSK without capturing full handshake
  Karma attacks: respond to any probe request with matching SSID
```

---

## Monitor Mode and Frame Capture

```
Monitor mode (rfmon): NIC captures all frames without associating
  Linux: ip link set wlan0 down; iw wlan0 set monitor control; ip link set wlan0 up
  Or: airmon-ng start wlan0    (creates mon0 interface)

Capture all Wi-Fi traffic:
  tcpdump -i wlan0mon -w capture.pcap
  tshark -i wlan0mon -w capture.pcap
  airodump-ng wlan0mon          ! shows all APs and clients on all channels

Channel hopping (see all channels):
  airodump-ng wlan0mon          ! hops through channels automatically
  airodump-ng --channel 6 wlan0mon    ! fixed channel

Frame types captured in monitor mode:
  Management: Beacon, Probe Request/Response, Auth, Assoc, Deauth
  Control: ACK, RTS, CTS, Block ACK
  Data: encrypted data frames (only decryptable if you have the key)

Wireshark wireless display filters:
  wlan.fc.type == 0         ! management frames
  wlan.fc.type == 1         ! control frames
  wlan.fc.type == 2         ! data frames
  wlan.fc.subtype == 8      ! Beacon frames
  wlan.fc.subtype == 12     ! Deauthentication frames
  wlan.addr == xx:xx:xx:xx  ! frames to/from MAC address
  eapol                     ! EAPOL (802.1X) frames (4-way handshake)
```

---

## WEP — Completely Broken (Historical Context)

```
WEP (Wired Equivalent Privacy, 1997):
  RC4 stream cipher with 24-bit IV (Initialization Vector) + 40 or 104-bit key
  IV is only 24 bits → IV reuse guaranteed in a busy network (2^24 = 16M packets)
  IV transmitted in cleartext alongside every frame
  Two WEPs with same IV → XOR to reveal keystream → break encryption

Attack timeline:
  2001: FMS attack (Fluhrer, Mantin, Shamir) — statistical analysis of IV/key relationships
  2004: KoreK attack — faster; practical in ~500K packets
  2007: PTW attack (Pyshkin, Tews, Weinmann) — cracks WEP with ~40,000 packets
        aircrack-ng implements PTW; WEP cracakble in minutes

Tools: aircrack-ng, aireplay-ng (packet injection to generate traffic)

Status: WEP was officially deprecated by IEEE in 2004; withdrawn in 2010
Never deploy WEP — it provides essentially no security
```

---

## WPA2-PSK Attack: 4-Way Handshake Capture

```
Attack flow:
  1. Attacker captures client connecting to AP (or sends deauth to force reconnect)
  2. Captures 4-way EAPOL handshake (4 packets)
  3. Offline dictionary/brute-force attack:
     For each candidate passphrase:
       PMK = PBKDF2-SHA1(passphrase, SSID, 4096, 32)
       PTK = PRF-512(PMK, ANonce, SNonce, AP MAC, Client MAC)
       MIC = HMAC-SHA1(PTK, EAPOL frame 2)
       If computed MIC == captured MIC → passphrase found!

Tools:
  airmon-ng start wlan0                     ! monitor mode
  airodump-ng -c 6 --bssid AA:BB:CC wlan0mon -w capture   ! capture on channel 6
  aireplay-ng -0 1 -a AA:BB:CC -c DD:EE:FF wlan0mon  ! deauth to force reconnect
  aircrack-ng -w /wordlists/rockyou.txt capture.cap   ! dictionary attack
  hashcat -m 22000 capture.hc22000 wordlist.txt       ! GPU-accelerated (modern format)

Performance:
  CPU (i7): ~10K PMK/sec (useless against strong passphrase)
  Single GPU (RTX 4090): ~500K PMK/sec
  GPU cluster: millions/sec
  → Dictionary attacks effective; brute force impractical for long random passphrases

Defense:
  Strong random passphrase: 20+ characters from large character set
  WPA3-SAE: eliminates offline dictionary attack entirely (see below)
  Example strong passphrase: "solar-coffee-mountain-7291-trek" (long but memorable)
  Or: fully random 20-char string: "Xk9#mQ2@vLp5!nRe4Ywt"
```

---

## PMKID Attack (2018)

```
Discovered by Jens Steube (hashcat developer) in 2018:
  PMKID = HMAC-SHA1(PMK, "PMK Name" | BSSID | Client MAC)
  Broadcast in EAPOL frame 1 (AP → Client) during connection initiation
  No full 4-way handshake capture required!
  Attack a single frame from a beacon/association:

hcxdumptool -i wlan0mon -o output.pcapng --enable_status=1  ! capture PMKID
hcxpcapngtool -o hashlist.hc22000 output.pcapng             ! convert
hashcat -m 22000 hashlist.hc22000 wordlist.txt              ! crack

No active client needed — attacker can capture PMKID from any AP response

Defense: same as 4-way handshake — strong passphrase; WPA3-SAE
```

---

## WPA3-SAE — How It Defeats Offline Attacks

```
SAE (Simultaneous Authentication of Equals, IEEE 802.11-2016):
  Based on Dragonfly key exchange (RFC 7664 — Diffie-Hellman on elliptic curves)

Why SAE resists offline attacks:
  The PMK is derived via an interactive cryptographic exchange
  Each authentication attempt requires ACTUAL interaction with the AP (commit + confirm messages)
  If the passphrase candidate is wrong: AP sends back a response that confirms it's wrong
  → Attacker can't try passphrases offline; each attempt requires a live network exchange
  → Even with a captured SAE exchange, offline brute-force is computationally infeasible

Forward secrecy:
  Each SAE exchange derives a unique PMK
  Even if the password is later stolen: past sessions can't be decrypted
  Contrast WPA2-PSK: past sessions decryptable with the PSK

Transition mode:
  AP accepts both WPA2-PSK (old clients) and WPA3-SAE (new clients) on same SSID
  Allows gradual migration

SAE-PK (SAE with Public Key, Wi-Fi 7):
  AP signs its SAE exchange with a private key
  Clients verify against a known-good public key (fingerprint encoded in SSID or provisioned)
  Defeats Evil Twin: fake AP can't produce valid signature
  "In-the-wild" protection against sophisticated MITM attacks
```

---

## Deauthentication Attacks

```
802.11 pre-802.11w: management frames unauthenticated
  Any device can send a deauth/disassoc frame spoofing the AP's MAC
  Client receiving deauth from "its AP" disconnects immediately
  No verification possible → attack universally effective against WPA2 (without PMF)

Attack flow:
  aireplay-ng -0 10 -a AP-MAC -c CLIENT-MAC wlan0mon
  ! -0 = deauth; 10 = count; -a = AP MAC; -c = specific client (or broadcast)
  Client disconnects; must re-associate → attacker captures handshake

Continuous deauth = effective DoS against a client or BSS

Defense:
  802.11w (Protected Management Frames / PMF):
    Cryptographically signs deauth/disassoc frames using TKIP/CCMP derived keys
    Fake deauth frames fail MIC check → client ignores them
    Mandatory in WPA3; optional (but enabled) in WPA2
    Enable PMF: management-frame protection required (on controller/AP)

  WIDS (Wireless IDS):
    Detect deauth flood → alert (even if 802.11w not deployed)
    Some enterprise systems can identify attacking device MAC and block it
```

---

## Rogue APs and Evil Twin Attacks

```
Rogue AP:
  An unauthorized AP connected to the wired network
  Employee plugs in a home router → creates open AP → bypass all network security
  Detection: RF scan + wired-side scan (look for APs connected to authorized ports)
  Cisco WCS/PI: correlates RF scan data with wired port data to identify rogue APs

Evil Twin:
  Attacker creates AP with same SSID as legitimate network
  Broadcasts stronger signal → clients auto-connect (strongest signal wins)
  Once connected: MITM, credentials capture, malware injection

Karma Attack:
  Client sends Probe Requests for its preferred network list: "Is 'HomeNetwork' here?"
  Karma AP responds: "Yes, I am 'HomeNetwork'! Connect to me!"
  Client trusts any AP claiming to be a known SSID
  Defense: WPA3-SAE (client and AP mutually authenticate); no Karma possible with WPA3

Detection and defense:
  Enterprise WIDS: monitors for SSIDs matching your network on unauthorized APs
  802.1X on the wired network: rogue AP can't get IP unless authenticated
  Per-client certificates (EAP-TLS): each client trusts only APs with valid cert → Evil Twin fails
  WPA3-SAE-PK: AP signed with verifiable key → fake AP can't impersonate
  Always verify AP certificate in EAP-TLS (check "Validate server certificate" in client config!)
```

---

## WPS — Wi-Fi Protected Setup (Broken)

```
WPS designed for easy home network setup — push button or PIN method

WPS PIN:
  8-digit PIN; but implementation flaw splits it into two 4-digit halves
  First half: 10,000 possibilities; Second half: 10,000 possibilities
  Effective attack space: 20,000 attempts (not 100 million!)
  Plus: AP confirms "first half correct" or "first half incorrect" in response
    → Oracle attack: crack 4 digits, then crack 4 digits = 11,000 max attempts
  Tools: reaver, bully
  Attack time: ~2-10 hours on unprotected APs

Defense:
  Disable WPS entirely on all APs
  If WPS needed: use push-button only (no PIN)
  Enterprise APs: WPS usually disabled by default; verify this in your deployment
```

---

## Enterprise Wireless Security Architecture

### 802.1X for Wireless

```
Wireless 802.1X flow (same as wired but over the air):
  1. Client associates with AP (unauthenticated connection)
  2. AP presents SSID; client sends EAP-Start
  3. AP proxies EAP to RADIUS server via RADIUS Access-Request
  4. EAP exchange (PEAP/EAP-TLS): client and server negotiate
  5. RADIUS Access-Accept: PMK delivered to AP (encrypted in RADIUS)
  6. 4-Way Handshake: AP and client derive PTK from PMK
  7. Client authorized: traffic flows in correct VLAN

Client fails 802.1X → stays in pre-auth VLAN (typically no access) OR
  redirected to guest VLAN / remediation VLAN

RADIUS response attributes for wireless:
  Tunnel-Type = VLAN
  Tunnel-Medium-Type = 802
  Tunnel-Private-Group-Id = "10"    ! VLAN assignment

Cisco WLC/AP 802.1X config:
  (controller SSID policy → security → WPA+WPA2 → 802.1X)
  RADIUS server: controller → Security → AAA → RADIUS → Auth
```

### Dynamic VLAN Assignment

```
One SSID → different VLANs per user based on RADIUS response:
  Engineering staff → VLAN 10 (engineering network)
  Sales staff → VLAN 20 (sales network)
  Contractors → VLAN 50 (limited access)
  Unknown devices → VLAN 99 (quarantine)

Benefits:
  No need for separate SSID per department (reduces beacon overhead)
  Centralized policy in RADIUS (change once, applies everywhere)
  Users can roam between APs and keep their VLAN

Cisco ISE example policy:
  IF User-Group == "Engineering" AND Device-Type == "Corporate Laptop"
    THEN VLAN = 10, dACL = FULL-CORP-ACCESS
  IF User-Group == "Contractor"
    THEN VLAN = 50, dACL = LIMITED-ACCESS, Session-Timeout = 28800
  IF Device-Type == "iPhone" AND MDM-Enrolled == "Yes"
    THEN VLAN = 30, dACL = MOBILE-ACCESS
```

### Certificate-Based Authentication (EAP-TLS)

```
Most secure wireless auth method:
  Server presents certificate → client verifies it's the real network
  Client presents certificate → server verifies it's a corporate device

Deployment:
  Corporate CA issues:
    Server certificate for RADIUS server (chain to trusted root)
    Client certificates for each device (deployed via MDM, Group Policy, SCEP)
  Client config: verify server certificate against trusted root
    (WITHOUT THIS: client accepts any certificate → Evil Twin succeeds!)

Why verify server cert:
  Without verification: attacker creates Evil Twin with different certificate
  Client connects because it doesn't check the cert → MITM
  With verification: client checks cert chain → unknown cert → refuses connection

Automatic certificate enrollment:
  Windows: Group Policy + SCEP/NDES → auto-enroll domain machines
  MacOS/iOS: MDM profile pushes root CA + client cert → automatic
  Android: MDM (Intune/JAMF) pushes certificate → automatic
  Certificates visible in: certmgr.msc (Windows), Keychain (MacOS)
```

---

## Wireless LAN Controllers (WLC) and Cisco DNA Center

```
Cisco WLC functions:
  Centralized AP configuration
  RF management (auto channel, auto power)
  Client mobility (fast roaming, anchor VLANs)
  SSID management and VLAN assignment
  Security policy (802.1X, RADIUS integration)
  Rogue detection
  Wireless IDS/IPS

Cisco DNA Center (DNAC):
  Next-generation controller (SD-Access)
  AI/ML-driven RF optimization
  Network assurance (client health dashboard)
  Automation: zero-touch AP deployment
  Policy-based access with Cisco ISE integration

WLAN RF health monitoring:
  Channel utilization > 70%: congestion risk
  Noise floor > -85 dBm: interference issues
  Client SNR < 25 dB: poor signal; clients at edge
  Retry rate > 20%: RF quality issue or channel congestion
```

---

## Tips

- Always validate the server certificate in wireless 802.1X client configuration — without this, Evil Twin attacks succeed despite EAP-TLS.
- Enable PMF (802.11w) on all enterprise SSIDs — it defeats deauthentication floods at minimal cost.
- Disable WPS on every AP, including home routers — WPS PIN is crackable in hours regardless of passphrase strength.
- Separate IoT devices onto an isolated VLAN with no access to the corporate network — IoT devices are frequently compromised and have poor security practices.
- Use EAP-TLS with machine certificates for domain-joined devices — not PEAP/MSCHAPv2 — user credentials can be phished; machine certificates cannot.

---

## Summary

- WEP is completely broken (IV reuse + statistical attacks); WPA2-PSK is vulnerable to offline dictionary attack from captured handshake; WPA3-SAE requires live AP interaction — no offline cracking.
- Deauthentication attacks exploit unauthenticated 802.11 management frames — 802.11w (PMF) is the defense; mandatory in WPA3.
- Evil Twin / Karma attacks fool clients into connecting to fake APs — defense is certificate validation (EAP-TLS), WPA3-SAE, or WPA3-SAE-PK.
- WPS PIN is crackable in ~11,000 attempts due to split-oracle flaw — always disable WPS.
- Enterprise wireless: 802.1X with RADIUS, dynamic VLAN assignment, EAP-TLS for device auth, PMF enabled, rogue AP detection via WIDS.
