---
title: "Wireless Troubleshooting"
sidebar_label: "Wireless Troubleshooting"
sidebar_position: 62
---

# Wireless Troubleshooting

Wireless problems are notoriously hard to diagnose because the medium is invisible, shared, and affected by physics. A structured methodology and the right tools transform wireless troubleshooting from guesswork into engineering.

---

## The Wireless Troubleshooting Framework

```
Layer 1 (Physical/RF):
  Signal strength (RSSI/dBm), SNR, noise floor, channel utilization, retries
  Interference sources: adjacent channels, non-WiFi RF (Bluetooth, microwave), other APs

Layer 2 (Association/Authentication):
  Client associates with AP? Authentication succeeds? DHCP works?
  VLAN assignment correct? 802.1X EAP completes?

Layer 3 (IP Connectivity):
  IP address obtained? Default gateway reachable? DNS resolving?
  Routing correct for the VLAN/subnet?

Layer 4+ (Application):
  Specific application failing? TCP retransmits? Latency high?
  QoS applied correctly? Firewall blocking?
```

---

## Layer 1 — RF Troubleshooting

### Key Metrics and Targets

```
RSSI (signal strength) targets:
  VoIP: -65 dBm or better (ideally -60 dBm)
  Video conferencing: -67 dBm
  Data: -70 dBm
  Below -80 dBm: connection unreliable; look for coverage hole

SNR targets:
  VoIP: ≥ 25 dB
  Video: ≥ 20 dB
  Data: ≥ 15 dB
  < 10 dB: unusable

Channel utilization:
  < 30%: light load; good performance
  30–50%: moderate; acceptable
  > 50%: congested; throughput degradation begins
  > 70%: heavy congestion; increase capacity (more APs or 5/6 GHz migration)

Retry rate:
  < 5%: excellent
  5–10%: acceptable
  > 10%: troublesome; investigate interference or coverage
  > 25%: severe problem

Noise floor:
  -95 dBm: very quiet (rural/low-interference)
  -90 dBm: typical indoors
  -85 dBm: elevated noise (some interference)
  -75 dBm: high interference environment
```

### Common RF Problems

```
Coverage hole (too-weak signal):
  Symptoms: -75 dBm or worse; high retries; slow throughput in specific area
  Cause: AP too far; wall attenuation; AP antenna pointing wrong direction
  Diagnosis: walk the area with Ekahau Analyzer or Wi-Fi analyzer app
  Fix: add AP; adjust antenna; increase transmit power (carefully — may increase interference)

Co-channel interference:
  Symptoms: high channel utilization; high retries; throughput drops but RSSI OK
  Cause: two APs on same channel with overlapping coverage
  Diagnosis: WiFi analyzer (inSSIDer) — see which APs share your channel
  Fix: change channel of one AP; automatic channel assignment (RRM); reduce transmit power

Adjacent-channel interference:
  Symptoms: random errors; performance issues despite adequate RSSI
  Cause: nearby AP using channel 3 or 4 (overlaps with channel 1 and 6)
  Diagnosis: WiFi analyzer — look for APs on channels 2,3,4,7,8,9,10
  Fix: coordinate channel use; only channels 1, 6, 11

Non-WiFi interference:
  Microwave ovens: burst interference on 2.4 GHz (2.45 GHz center) during use
    Symptom: connection drops when kitchen microwave runs
    Fix: move to 5 GHz; replace microwave

  Bluetooth: 2.4 GHz FHSS; generally low impact with AFH
    High density of BT devices (warehouse with Bluetooth scanners) can cause issues

  DECT phones (Europe): 1.9 GHz; generally no impact on WiFi

  Video transmitters (cameras): some use 2.4 GHz or 5 GHz; vary by product
    Fix: replace with wired cameras or ensure different channels

Sticky client (client won't roam):
  Symptoms: client holds weak connection to distant AP; other AP visible at stronger signal
  Cause: client's roaming algorithm is conservative; doesn't roam until signal is very bad
  Diagnosis: check client signal; compare to nearby AP signal
  Fix: 
    Enable 802.11v (BSS Transition Request) — AP can suggest roam to client
    Minimum RSSI threshold on AP (reject weak-signal associations)
    Client-side: some operating systems have "prefer 5GHz" / aggressive roaming settings
    In worst case: adjust AP placement/power so overlap zones are better defined
```

### RF Diagnostic Tools

```
On-device (client side):
  Windows: netsh wlan show networks mode=bssid
           netsh wlan show interfaces
           Wi-Fi Analyzer app (Microsoft Store)
  macOS:   Option+click WiFi icon → shows RSSI, channel, noise, TX rate
           Wireless Diagnostics (Command+Space "Wireless Diagnostics")
           /System/Library/CoreServices/Wi-Fi Diagnostics.app → Scan tab
  iOS:     AirPort Utility app → enable WiFi scanner (shows RSSI per BSSID)
  Android: Wi-Fi Analyzer (by farproc) or Network Analyzer

AP/WLC side (Cisco):
  WLC: show ap summary
       show ap dot11 5ghz summary
       show client detail [MAC]
       show 802.11a cleanair device type all  ! CleanAir interference sources
       show ap auto-rf dot11 5ghz [AP-name]   ! RRM decisions per AP

  Lightweight AP show commands (over WLC):
       debug client [MAC]
       show ap stats dot11 5ghz [AP-name]

Spectrum analysis:
  Cisco CleanAir (built into APs): identifies interference sources and type
  Ekahau Sidekick: dedicated spectrum analyzer hardware
  Metageek Chanalyzer + Wi-Spy: software + USB spectrum analyzer dongle

Packet capture on wireless:
  AP packet capture (Cisco): transfer to WLC; download from WLC
  Laptop in monitor mode:
    Linux: iw dev wlan0 interface add mon0 type monitor; ip link set mon0 up
    macOS: tcpdump -I -i en0 -w capture.pcap  (built-in capture in monitor mode)
    Wireshark: capture on monitor interface; display filter: wlan
  Key Wireshark display filters:
    wlan.addr == [MAC]          ! frames to/from specific client
    wlan.fc.type_subtype == 8   ! Beacon frames
    wlan.fc.type_subtype == 4   ! Probe request frames
    eapol                       ! 802.1X/EAP frames (4-way handshake)
    wlan.fc.retry == 1          ! Retransmitted frames (high retry = interference/signal issue)
```

---

## Layer 2 — Association and Authentication Troubleshooting

### Association Failures

```
Client not associating at all:
  Check: is client seeing the SSID?
    WiFi scanner — is the SSID visible with adequate signal?
    Hidden SSID: client must be configured with exact SSID name
  Check: correct security type configured on client?
    WPA3-only AP + WPA2-only client = no association possible
  Check: channel supported by client?
    Some older clients don't support all 5 GHz channels (DFS channels)
  Check: band configured?
    2.4 GHz-only client can't connect to 5 GHz-only SSID

Client associates but immediately drops:
  Check: duplicate IP address? (DHCP conflict)
  Check: MAC filter on AP rejecting the client?
  Check: maximum client count per AP reached?

Deauthentication storms:
  Symptoms: clients constantly associating and deassociating
  Cause: rogue AP sending deauth frames; interference on control channel
  Diagnosis: Wireshark → filter for wlan.fc.type_subtype == 12 (Deauthentication)
             If reason code 6/7 (class 2/3 frame from unauthenticated station):
               client → AP communication problem
             Many deauths from AP → check AP stability; rogue AP attack possible
```

### 802.1X / EAP Authentication Failures

```
Client can't authenticate (WPA2-Enterprise):
  Check: RADIUS server reachable from WLC/AP?
    ping from WLC to RADIUS server
    WLC logs: show radius statistics

  Check: correct RADIUS shared secret on both WLC and RADIUS?
    Shared secret mismatch → RADIUS rejects WLC as an NAS

  Check: correct EAP method on client?
    Server sends EAP-TLS; client configured for PEAP → negotiation fails

  Check: CA certificate trusted by client?
    PEAP/TTLS: server presents cert; client must trust the CA
    If client doesn't have the CA cert → authentication fails silently

  Check: user credentials correct?
    RADIUS authentication failure → check Active Directory / LDAP

Debugging:
  WLC debug commands:
    debug client [MAC]             ! full client association debug
    debug dot1x events enable      ! 802.1X EAP events
    debug dot1x packets enable     ! EAP packet-level debug (verbose)
    debug aaa events enable         ! AAA/RADIUS events
    debug radius events enable      ! RADIUS packets
    show debug                      ! verify what debugging is active
    undebug all                     ! ALWAYS clean up after debugging

  FreeRADIUS debug:
    freeradius -X                   ! run in debug/foreground mode; shows full EAP exchange

Common EAP failure reasons (from WLC logs):
  "EAP-Failure after Identity" → RADIUS rejected username (not in directory)
  "Server certificate rejected" → client doesn't trust CA or cert expired
  "MSCHAPv2 failure" → wrong password in PEAP inner method
  "Timeout" → RADIUS unreachable; shared secret wrong (RADIUS drops the request)
```

---

## Layer 3 — IP and Routing Troubleshooting

```
Client associated, no IP address:
  Check: DHCP server reachable? (WLC or upstream DHCP)
  Check: DHCP pool not exhausted?
  Check: correct VLAN on the trunk port to the WLC?
    If VLAN 10 not in the trunk allowed VLANs → DHCP request never reaches server
  Check: DHCP snooping blocking DHCP? (if a rogue check is triggered)

Wrong IP range or VLAN:
  Client in VLAN 10 when should be in VLAN 20
  Check: RADIUS dynamic VLAN attributes sent? Correct Tunnel-Private-Group-Id?
  Check: WLC SSID → VLAN mapping in controller config

Client has IP but can't reach gateway:
  Check: ARP for gateway resolving correctly?
  Check: IP subnet correct? (client in wrong subnet for its VLAN)
  Check: L3 gateway configured on the correct VLAN interface?

Client has IP and reaches gateway but not internet:
  Check: routing on gateway router (default route to ISP?)
  Check: NAT configured? (inside interface on correct VLAN?)
  Check: firewall allowing outbound traffic from wireless VLAN?
  Check: DNS resolving? (nslookup example.com)
```

---

## Performance Troubleshooting

```
Slow throughput despite good signal:
  Check: MCS rate in use (too low → signal-to-noise problem even at good RSSI)
    Client showing -65 dBm but connecting at MCS 0 → noise floor high → low SNR
    Check noise floor separately from RSSI

  Check: channel utilization too high (> 50%)
    More APs needed; 5 GHz migration; fewer devices per AP

  Check: 802.11b protection overhead
    One old 802.11b client on 2.4 GHz network triggers protection mode for ALL clients
    Fix: disable 802.11b rates (require minimum 802.11g/n rates)
    WLC: disable 802.11b/g 1, 2, 5.5, 11 Mbps rates

  Check: client running old 802.11 standard
    802.11g client on 802.11n AP: only uses single spatial stream; lower throughput
    May also trigger protection overhead for other clients

  Check: transmit power mismatch (AP vs client)
    AP: 20 dBm; client: 15 dBm (mobile devices are lower power)
    AP can "hear" the client; client can "hear" the AP; but client's signal to AP weak
    Near-far problem: reduce AP power so clients can match it more closely

High latency on WiFi:
  Check: queue depth on AP? (buffer bloat on wireless)
  Check: channel utilization? (contention adds latency)
  Check: proper QoS marking? (VoIP traffic should be AC_VO)
  Check: uAPSD configured? (voice clients need this for low-latency on power save)

Roaming quality problems (dropped calls):
  Check: 802.11r/k/v enabled? (fast roaming trio)
  Check: overlap zone signal level? (both APs should be ≥ -65 dBm in overlap)
  Check: roam time in WLC logs? (should be < 50ms with 802.11r)
  Check: CCKM or OKC for WPA2-Enterprise? (pre-authentication before roaming)
```

---

## Wireless Troubleshooting Methodology

```
Step 1: Reproduce and characterize the problem
  What exactly fails? (slow speed, can't connect, drops, specific application)
  Affects: all clients? Specific device? Specific location? Specific time?
  Duration: constant? Intermittent? After specific events (microwave on)?

Step 2: Check Layer 1 (RF)
  Walk the problem area with WiFi analyzer: RSSI, SNR, noise, channels
  Look for coverage holes, co-channel interference, high channel utilization
  If signal is bad → fix RF before anything else

Step 3: Check association/authentication
  Can the client associate to the correct AP?
  Does 802.1X complete successfully? Any RADIUS rejections?
  Is the client on the correct VLAN?

Step 4: Check Layer 3
  Does the client get a valid IP address?
  Can the client ping the gateway?
  Is DNS resolving?

Step 5: Check application layer
  If L1-L3 are fine: capture traffic; look for TCP retransmits, high latency, application errors
  Check firewall/ACL denying specific traffic

Step 6: Isolate scope
  Is it this AP only? (try another AP) → AP problem
  Is it this WLC only? (if dual-WLC) → WLC problem
  Is it this SSID only? (try another SSID) → SSID/VLAN/policy problem
  Is it this client only? (try another device) → client-side problem
```

---

## Common Wireless Problems and Quick Reference

| Symptom | Likely Cause | Check First |
|---|---|---|
| Client sees SSID but can't connect | Auth failure; wrong PSK; EAP issue | Logs on WLC; check RADIUS |
| Client connects but no IP | DHCP failure; wrong VLAN | DHCP scope; trunk VLANs |
| Slow speed, good signal | High channel utilization; 802.11b protection | Channel util; rates configured |
| Random disconnects | Interference; sticky client; coverage hole | RF survey; roam config |
| VoIP drops during movement | No fast roaming | 802.11r/k/v config |
| Slow after microwave runs | Microwave interference on 2.4 GHz | Move to 5 GHz |
| High retries, good RSSI | High noise floor; hidden node | Noise floor; SNR (not just RSSI) |
| Can't connect on 5 GHz, works on 2.4 | DFS channel CAC delay; client incompatibility | AP channel; client 5 GHz support |
| Only specific user can't authenticate | Wrong certificate; wrong AD group; account locked | RADIUS logs; AD account |

---

## Tips

- Check SNR, not just RSSI — a client at -65 dBm in a high-noise environment (-80 dBm noise floor, SNR=15 dB) will perform worse than one at -70 dBm with low noise (-95 dBm floor, SNR=25 dB).
- `debug client [MAC]` on Cisco WLC is the most powerful wireless debug — it shows every step of association, EAP, DHCP, and policy application for a specific client.
- The most common WPA2-Enterprise failure is a certificate trust issue on the client — validate that the EAP server certificate's CA is in the client's trust store.
- Disable 802.11b legacy rates (1, 2, 5.5, 11 Mbps) on all 2.4 GHz SSIDs unless you have actual 802.11b devices — they trigger protection overhead that slows the entire cell.
- RF problems can't be fixed with configuration alone — physical AP placement, proper channel planning, and adequate AP density must be right first.

---

## Summary

- Wireless troubleshooting follows the OSI model: RF (L1) → Association/Auth (L2) → IP (L3) → Application (L4+).
- Key metrics: RSSI (target ≥ -70 dBm for data, -65 dBm for VoIP), SNR (≥ 20 dB), channel utilization (< 50%), retry rate (< 5%).
- Co-channel interference is caused by APs on the same channel with overlapping coverage — ensure 20% overlap between APs, not 60%.
- `debug client [MAC]` on WLC traces every step; Wireshark in monitor mode captures the full 802.11 frame exchange including EAP.
- Fast roaming (802.11r/k/v) is required for VoIP — target < 50ms roam time; without it VoIP calls break on every AP transition.
- SNR = Signal - Noise — high noise floor (interference) reduces SNR even with strong signal; treat RF environment issues before blaming configuration.
