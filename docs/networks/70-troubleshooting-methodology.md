---
title: "Network Troubleshooting Methodology"
sidebar_label: "Troubleshooting"
sidebar_position: 70
---

# Network Troubleshooting Methodology

Systematic troubleshooting distinguishes engineers from operators. Guessing at random fixes wastes time and risks creating new problems. A structured approach — gathering information, forming hypotheses, testing, and verifying — consistently leads to faster resolution.

---

## The Troubleshooting Process

```
1. Define the problem
   What exactly is broken? (not "the network is slow" — "FTP transfers to 10.1.0.5 
   from host 192.168.1.10 fail after 30 seconds starting at 14:23 UTC")
   When did it start? What changed?
   Who is affected? (one user, one subnet, the whole network)
   Is it reproducible? (always, intermittent, at specific times)

2. Gather information
   Collect relevant data: logs, show commands, packet captures, tickets
   Establish a timeline: what events preceded the problem?
   Check change management: any changes in the last 24 hours?

3. Analyze and form hypotheses
   What could cause this specific symptom?
   Rank hypotheses by likelihood and ease of verification
   Most likely cause first; highest-impact changes last

4. Test hypotheses
   One change at a time — never make multiple changes simultaneously
   If change doesn't fix it: revert before trying the next hypothesis
   Document what you tried and what happened

5. Solve and verify
   Apply the fix; verify symptoms are gone
   Test edge cases (did fixing X break Y?)
   Monitor for recurrence

6. Document and prevent
   Root cause analysis (RCA)
   What change caused this? (if change-induced)
   What monitoring would have caught this earlier?
   What preventive measure prevents recurrence?
```

---

## Top-Down vs Bottom-Up vs Divide-and-Conquer

```
Bottom-up (Physical → Application):
  Start at Layer 1; verify each layer before moving up
  Best for: new installations; physical layer suspicion; methodical unknown problems
  
  L1: cable, link light, SFP, interface status
  L2: duplex, VLAN, STP, MAC table
  L3: IP config, routing, ARP
  L4: TCP/UDP, firewall, ports
  L7: application, DNS, authentication

Top-down (Application → Physical):
  Start at L7; work down until you find the broken layer
  Best for: user-reported application issues
  
  L7: Can the user access the application? Error message?
  L4: Can we TCP connect to the port? (telnet/nc)
  L3: Can we ping the destination?
  L2: Is ARP resolving?
  L1: Is the interface up?

Divide-and-conquer (middle-out):
  Start in the middle of the path; rule out half the problem space
  Best for: known working endpoints but unknown path; large topologies
  
  Client → [Router A] → WAN → [Router B] → Server
  Start at WAN link: if pings from Router A reach Router B → problem is on Router B or Server side
  Binary search the path until you isolate the segment
  
Follow-the-path:
  Trace the actual packet path hop by hop (traceroute + show commands at each hop)
  Best for: routing issues, asymmetric routing, QoS problems
```

---

## Layer-by-Layer Checklist

### Layer 1 — Physical

```cisco
! Check interface status
Router# show interfaces GigabitEthernet0/0
  Status output interpretation:
  "GigabitEthernet0/0 is up, line protocol is up" → L1 and L2 up
  "GigabitEthernet0/0 is up, line protocol is down" → L1 ok; L2 problem (encapsulation, keepalive)
  "GigabitEthernet0/0 is down, line protocol is down" → L1 problem (no carrier)
  "GigabitEthernet0/0 is administratively down" → shutdown; use "no shutdown"

! Check for physical errors
Router# show interfaces GigabitEthernet0/0 | include error|CRC|reset|collision
  CRC errors: bad cabling, damaged SFP, length mismatch, duplex mismatch
  Input errors: also includes runt frames (< 64 bytes — duplex mismatch signature)
  Giants: frames > 1518 bytes (MTU mismatch or QinQ not configured)
  Collisions: usually means duplex mismatch (shouldn't see collisions on full-duplex)
  Late collisions: DEFINITIVE duplex mismatch indicator (or cable too long)

! Check auto-negotiation
Router# show interfaces GigabitEthernet0/0 | include Duplex|Speed
! Duplex mismatch: one end full, other half → CRC errors, late collisions, poor performance

! Fiber optic checks
  Rx power too low: dirty connector, bend radius exceeded, fiber break, wrong wavelength SFP
  No Rx power: fiber not connected, wrong fiber strand, TX fault on far end
Router# show interfaces GigabitEthernet0/0 transceiver detail
! Shows Tx/Rx power in dBm; compare to SFP specifications
```

### Layer 2 — Data Link

```cisco
! MAC table
Switch# show mac address-table
Switch# show mac address-table address [MAC]
Switch# show mac address-table interface Gi1/0/1
Switch# show mac address-table vlan 10

! VLAN verification
Switch# show vlan brief                    ! VLANs and assigned ports
Switch# show interfaces trunk              ! trunk ports and allowed VLANs
Switch# show interfaces GigabitEthernet0/0 trunk  ! specific trunk

Common VLAN problems:
  Access port in wrong VLAN
  VLAN not created on switch (must be in VLAN database)
  VLAN not in trunk allowed list
  Native VLAN mismatch on trunk (causes CDP/STP issues, VLAN hopping risk)

! Spanning Tree
Switch# show spanning-tree vlan 10         ! STP state per VLAN
Switch# show spanning-tree vlan 10 detail  ! includes port states and times
Switch# show spanning-tree summary         ! root bridges per VLAN
! Look for: unexpected root bridge, ports in blocking state unexpectedly
! Topology change? show spanning-tree vlan 10 | include changes

! ARP table
Router# show arp                           ! ARP cache
Router# show ip arp 192.168.1.5           ! specific IP
! Missing ARP entry → host unreachable at L2
! ARP entry with wrong MAC → ARP poisoning or HSRP/VRRP issue
```

### Layer 3 — Network

```cisco
! Routing table
Router# show ip route                      ! full routing table
Router# show ip route 10.1.0.0            ! specific network
Router# show ip route 10.1.0.0 255.255.0.0 longer-prefixes  ! more specifics
! "%" next to a route: multiple paths (ECMP)
! S — static, C — connected, O — OSPF, E — EIGRP, B — BGP, R — RIP

! Longest prefix match
Router# show ip route 10.1.2.3            ! what route matches this destination?

! IP interface config
Router# show ip interface brief           ! all interfaces: IP, status, protocol
Router# show ip interface GigabitEthernet0/0  ! detailed L3 info, ACL applied

! Ping tests
Router# ping 10.1.0.1                    ! basic ICMP
Router# ping 10.1.0.1 source Loopback0  ! source from specific interface
Router# ping 10.1.0.1 repeat 1000 size 1472  ! larger packets (test MTU)
Router# ping 10.1.0.1 df-bit size 1450  ! ping with DF bit (PMTUD test)

! Traceroute
Router# traceroute 10.1.0.1              ! L3 path (TTL-based, ICMP)
Router# traceroute 10.1.0.1 source Lo0  ! from specific source
Router# traceroute 10.1.0.1 probe 1     ! one probe per hop (faster)

! Check for asymmetric routing
! Traceroute from A to B: path is A→R1→R2→B
! Traceroute from B to A: path is B→R3→R1→A
! Asymmetric: OK for most traffic; breaks stateful firewalls

! ICMP issues
! If ping fails but routing looks correct:
!   - ACL blocking ICMP?
!   - Firewall dropping?
!   - PMTUD black hole (DF bit set, MTU issue, ICMP Type 3 Code 4 blocked)?
Router# debug ip icmp           ! see ICMP traffic on router (careful in production)
```

### Layer 4 — Transport

```bash
# Test TCP connectivity
nc -zv 10.1.0.5 443           # quick TCP port check
nc -zv 10.1.0.5 80 443 8080   # multiple ports
telnet 10.1.0.5 443           # old-school check (still works)
curl -v https://10.1.0.5      # full HTTP check with TLS

# Check listening services
ss -tlnp                       # Linux: TCP listening ports + process
ss -tlnp | grep :443
netstat -tlnp                  # same (older)

# Check established connections
ss -tnp state established
ss -tnp dst 10.1.0.5          # connections to specific host

# Test UDP
nc -uzv 10.1.0.5 53           # UDP DNS port check
nc -uzv 10.1.0.5 123          # NTP
# UDP check: no response ≠ down (UDP is stateless; firewall may block)
```

```cisco
! Firewall / ACL hit counts
Router# show access-lists                  ! see if ACL denying traffic
Router# show ip access-lists OUTSIDE-IN   ! specific ACL
! Look for incrementing deny counters

! TCP state in NAT table (if NAT is between you and the destination)
Router# show ip nat translations          ! active NAT translations
Router# debug ip nat                      ! watch NAT translations (careful)
```

---

## Essential Troubleshooting Commands — Quick Reference

```cisco
! ─── Routing ────────────────────────────────────────────────────────────────
show ip route                    ! routing table
show ip route summary            ! route count per protocol
show ip bgp summary              ! BGP peers and prefix counts
show ip ospf neighbor            ! OSPF neighbors
show ip eigrp neighbors          ! EIGRP neighbors
show ip protocols                ! routing protocol timers and configuration

! ─── Interfaces ──────────────────────────────────────────────────────────────
show interfaces                  ! all interface details
show interfaces status           ! Cisco switch: simplified status table
show ip interface brief          ! all interfaces: IP, up/down
show interfaces counters errors  ! Cisco switch: error counters all ports

! ─── Connectivity ────────────────────────────────────────────────────────────
ping [dest]
ping [dest] source [interface]
traceroute [dest]
traceroute [dest] source [interface]

! ─── Layer 2 ─────────────────────────────────────────────────────────────────
show mac address-table
show arp
show spanning-tree [vlan N]
show vlan brief
show interfaces trunk
show cdp neighbors detail        ! directly connected devices (model, IPs)
show lldp neighbors detail       ! LLDP equivalent

! ─── CPU/Memory/Logs ─────────────────────────────────────────────────────────
show processes cpu sorted        ! top CPU-consuming processes
show processes memory sorted     ! top memory consumers
show version                     ! IOS version, uptime, hardware
show logging                     ! local log buffer
show log | include ERROR|Warning|BGP|OSPF

! ─── QoS ─────────────────────────────────────────────────────────────────────
show policy-map interface Gi0/0  ! queue stats, drop counts
show class-map
```

```bash
# Linux / host-side commands
ip addr show                     # IP addresses
ip route show                    # routing table
ip neigh show                    # ARP table
ss -tnp                          # TCP connections
traceroute / tracepath 10.0.0.1
mtr 10.0.0.1                     # continuous traceroute with loss stats
dig @8.8.8.8 example.com         # DNS query
nslookup example.com
nmap -sS -p 80,443 10.0.0.0/24  # port scan
tcpdump -i eth0 -n host 10.0.0.1 # capture packets to/from host
tcpdump -i eth0 port 80 -w /tmp/capture.pcap  # save to file
wireshark                         # GUI packet analysis
curl -v --trace-time https://example.com  # detailed HTTP trace
openssl s_client -connect example.com:443  # TLS test
iperf3 -c 10.0.0.1 -t 30        # throughput test
ping -f -s 1472 10.0.0.1         # flood ping with large packets (MTU test)
```

---

## Packet Capture and Analysis

```bash
# tcpdump essentials
tcpdump -i eth0                              # capture on interface
tcpdump -i eth0 -n                           # no hostname resolution (faster)
tcpdump -i eth0 -nn                          # no hostname or port resolution
tcpdump -i eth0 -v                           # verbose (more header info)
tcpdump -i eth0 -w capture.pcap             # write to file
tcpdump -r capture.pcap                      # read from file

# Filters (BPF — Berkeley Packet Filter)
tcpdump host 10.0.0.1                        # traffic to/from host
tcpdump src 10.0.0.1                         # from specific source
tcpdump dst 10.0.0.1                         # to specific destination
tcpdump port 443                             # specific port
tcpdump tcp port 80                          # TCP port 80
tcpdump udp port 53                          # UDP port 53 (DNS)
tcpdump net 10.0.0.0/24                      # subnet traffic
tcpdump 'tcp[tcpflags] & (tcp-syn) != 0'    # only SYN packets
tcpdump 'tcp[tcpflags] & (tcp-rst) != 0'    # only RST packets (connection resets)
tcpdump icmp                                  # ICMP only
tcpdump not port 22                          # exclude SSH

# Combination filters
tcpdump -i eth0 -nn host 10.0.0.5 and port 443

# Wireshark display filters (different from tcpdump capture filters)
ip.addr == 10.0.0.1             # all traffic to/from
tcp.port == 443
http.request.method == "POST"
tcp.analysis.retransmission     # TCP retransmissions (packet loss indicator)
tcp.analysis.zero_window        # zero window (receiver buffer full)
dns.flags.response == 1         # DNS responses only
tls.handshake                   # TLS handshake packets
icmp                            # ICMP
wlan.fc.retry == 1              # WiFi retransmitted frames
```

---

## Common Problems and Quick Diagnostics

```
Problem: "Can't ping destination"
  Step 1: ping the default gateway → if fails: local subnet issue
  Step 2: ping from router toward destination → removes client from equation
  Step 3: check routing table → is route present? Correct?
  Step 4: check ACL → is ICMP being blocked?
  Step 5: traceroute → where does it stop?

Problem: "Slow throughput but ping is fine"
  Step 1: check interface error counters → CRC/input errors suggest physical
  Step 2: check duplex → "late collisions" = definitive mismatch
  Step 3: iperf3 test → measure actual throughput vs expected
  Step 4: large ping (ping -s 1472 -f) → if small ping ok but large fails → MTU issue
  Step 5: QoS policy → is traffic being shaped/policed to low rate?

Problem: "Routing protocol not forming neighbors"
  OSPF: check hello/dead timers match; area ID match; auth match; MTU match
  EIGRP: check AS number match; K-values match; auth match
  BGP: check TCP reachability to neighbor IP; ASN correct; password match
  Tool: debug ip ospf adj / debug ip bgp updates

Problem: "Intermittent connectivity"
  Check: spanning tree topology changes (TCN = MAC table flush = forwarding drops)
    show spanning-tree vlan X detail | include changes
  Check: interface flapping in logs: show log | include changed state
  Check: routing protocol flapping: show log | include BGP|OSPF|neighbor
  Check: duplex mismatch (high CRC count, late collisions)
  Check: wireless: sticky client, co-channel interference

Problem: "DNS not resolving"
  dig @8.8.8.8 example.com → bypass local DNS; if works = local DNS problem
  dig @[local-dns] example.com → test local DNS directly
  dig +trace example.com → trace full resolution from root
  Check: firewall blocking UDP 53 outbound? TCP 53 for large responses?
```

---

## Tips

- Always revert a change that didn't fix the problem before trying the next one — multiple simultaneous changes make it impossible to know which one fixed or broke something.
- `show interface` error counters: clear them first (`clear counters`), wait 1 minute, then read — this gives you a current rate, not accumulated historical counts.
- MTU problems are notorious for causing mysterious failures — ICMP pings work (small packets) but large file transfers fail. Always test with large packets when diagnosing intermittent issues.
- `show processes cpu` first on a suspected CPU-bound device — some problems are caused by device overload, not configuration. Never add debug commands before checking CPU.
- Document your troubleshooting steps in a ticket as you go — if you hand off to another engineer or need to revisit tomorrow, the history is invaluable.

---

## Summary

- Structured troubleshooting: define → gather → hypothesize → test (one change at a time) → verify → document — skipping steps wastes time.
- Bottom-up (L1→L7) for unknown problems; top-down (L7→L1) for user-reported application issues; divide-and-conquer to isolate segments.
- Layer 1: `show interfaces` error counters; duplex/speed; late collisions = duplex mismatch.
- Layer 2: `show mac address-table`, `show spanning-tree`, `show vlan brief`, `show interfaces trunk`.
- Layer 3: `show ip route`, `ping` with source, `traceroute`, `show ip ospf neighbor`, `show ip bgp summary`.
- Packet capture (tcpdump/Wireshark) is the definitive diagnostic — when logic fails, capture the traffic and see exactly what's happening.
