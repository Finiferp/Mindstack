---
title: "ARP and NDP"
sidebar_label: "ARP & NDP"
sidebar_position: 27
---

# ARP and NDP — Address Resolution

IP addresses identify hosts logically; MAC addresses identify them on a specific link. **ARP** (IPv4) and **NDP** (IPv6) bridge these two worlds — they resolve an IP address to the MAC address needed to actually frame a packet for local delivery.

---

## Why Address Resolution Is Necessary

A router has a routing table entry for `10.0.1.5/32` via interface `eth0`. Before it can send the packet, it needs to encapsulate it in an Ethernet frame — which requires a destination MAC address. The IP address alone is not enough. ARP/NDP provides the mapping.

```
IP layer knows: send packet to 10.0.1.5
Ethernet layer needs: what MAC does 10.0.1.5 use?
ARP: "Who has 10.0.1.5? Tell 10.0.1.1" → "10.0.1.5 is at aa:bb:cc:dd:ee:ff"
```

---

## ARP — Address Resolution Protocol (RFC 826, 1982)

ARP is a link-layer protocol (it's not IP — it uses EtherType 0x0806). It maps IPv4 addresses to MAC addresses on a local network segment.

### ARP Packet Format

```
 ┌─────────────────────────────────────────────────────┐
 │ Hardware Type (2)  │ Protocol Type (2)              │
 │   0x0001 = Ethernet   0x0800 = IPv4                 │
 ├─────────────────────────────────────────────────────┤
 │ HW Addr Len (1) │ Proto Addr Len (1) │ Opcode (2)   │
 │    6 (MAC)           4 (IPv4)          1=Req 2=Rep  │
 ├─────────────────────────────────────────────────────┤
 │       Sender Hardware Address (MAC, 6 bytes)        │
 ├─────────────────────────────────────────────────────┤
 │       Sender Protocol Address (IP, 4 bytes)         │
 ├─────────────────────────────────────────────────────┤
 │       Target Hardware Address (6 bytes)             │
 │  (all zeros in Request — unknown by definition)     │
 ├─────────────────────────────────────────────────────┤
 │       Target Protocol Address (IP, 4 bytes)         │
 └─────────────────────────────────────────────────────┘
```

### ARP Request and Reply

```
Host A (10.0.1.1/24, MAC aa:aa:aa:aa:aa:aa) wants to reach Host B (10.0.1.5):

ARP Request (broadcast):
  Ethernet: src=aa:aa:aa, dst=ff:ff:ff:ff:ff:ff (broadcast)
  ARP: Opcode=1 (Request)
       Sender IP=10.0.1.1, Sender MAC=aa:aa:aa:aa:aa:aa
       Target IP=10.0.1.5,  Target MAC=00:00:00:00:00:00

All hosts on segment receive this.
Host B (10.0.1.5, MAC bb:bb:bb:bb:bb:bb) responds:

ARP Reply (unicast):
  Ethernet: src=bb:bb:bb, dst=aa:aa:aa (directly to requester)
  ARP: Opcode=2 (Reply)
       Sender IP=10.0.1.5,  Sender MAC=bb:bb:bb:bb:bb:bb
       Target IP=10.0.1.1,  Target MAC=aa:aa:aa:aa:aa:aa

Host A learns: 10.0.1.5 → bb:bb:bb:bb:bb:bb
Caches this in ARP table (typically 20 minutes)
```

### ARP Cache

```bash
# Linux
arp -n                    # show ARP table
ip neigh show             # modern equivalent
ip neigh show dev eth0    # for specific interface

# Windows
arp -a                    # show all entries

# Cisco IOS
show arp                  # full ARP table
show ip arp               # same
show ip arp 10.0.1.5      # specific IP
clear arp-cache           # flush ARP table
```

### Proxy ARP

A router responds to ARP requests on behalf of hosts on another network. Allows hosts with no default gateway configured to reach other subnets (they ARP for the remote IP, the router replies with its own MAC).

```
Enabled by default on Cisco IOS interfaces: ip proxy-arp (on by default)
Disable if not needed: no ip proxy-arp

Use case: legacy hosts without default gateway, or misconfigured masks
Drawback: hides network topology, wastes ARP bandwidth
```

### Gratuitous ARP

An ARP where sender IP = target IP. Used to:
1. Announce/update neighbors' ARP caches after IP change or failover.
2. Detect IP conflicts (if someone replies to your own IP announcement, conflict exists).
3. HSRP/VRRP virtual IP takeover — new active router sends GARP to update switches.

```
Gratuitous ARP:
  Sender IP = Target IP = 10.0.1.100 (the newly active address)
  Sender MAC = new active device's MAC
  Broadcast — all neighbors update their caches
```

### ARP Security Issues

**ARP Spoofing / ARP Poisoning:**
```
ARP has NO authentication — anyone can send an ARP reply claiming any IP.

Attack:
  Attacker sends unsolicited ARP Reply:
    "10.0.1.1 (gateway) is at attacker_mac"
  Victims update their ARP cache
  Traffic destined for gateway goes to attacker (MITM)

Defense:
  Dynamic ARP Inspection (DAI) — validates ARP against DHCP snooping binding table
  ARP rate-limiting — limits ARP packets per port
  Static ARP entries — for critical hosts (not scalable)
```

---

## NDP — Neighbor Discovery Protocol (RFC 4861)

NDP is ICMPv6's answer to ARP — but it does much more. It replaces ARP, ICMP Router Discovery, and ICMP Redirect all in one protocol. All NDP messages are ICMPv6 packets.

### NDP Message Types

| ICMPv6 Type | Name | Purpose |
|---|---|---|
| 133 | Router Solicitation (RS) | Host asks "are there any routers?" |
| 134 | Router Advertisement (RA) | Router announces prefix, gateway, flags |
| 135 | Neighbor Solicitation (NS) | "Who has this IPv6 address?" (like ARP Request) |
| 136 | Neighbor Advertisement (NA) | "I have this IPv6 address" (like ARP Reply) |
| 137 | Redirect | Router tells host of a better next-hop |

### Neighbor Solicitation and Advertisement (ARP Equivalent)

```
Host A (2001:db8::1, MAC aa:aa:aa) wants to reach Host B (2001:db8::5):

Step 1: Host A computes solicited-node multicast for target:
  2001:db8::5 → last 24 bits = 00:00:05
  Solicited-node multicast: ff02::1:ff00:0005

Step 2: Host A sends Neighbor Solicitation:
  IPv6 src: 2001:db8::1 (or link-local)
  IPv6 dst: ff02::1:ff00:0005 (only Host B is in this multicast group!)
  ICMPv6 Type 135: Target = 2001:db8::5
  Option: Source Link-Layer Address = aa:aa:aa:aa:aa:aa

Step 3: Host B (member of ff02::1:ff00:0005) receives it:
  Sends Neighbor Advertisement:
  IPv6 src: 2001:db8::5
  IPv6 dst: 2001:db8::1 (unicast reply)
  ICMPv6 Type 136: Target = 2001:db8::5
  Flags: Solicited=1, Override=1
  Option: Target Link-Layer Address = bb:bb:bb:bb:bb:bb

Host A learns: 2001:db8::5 → bb:bb:bb:bb:bb:bb
```

**Key advantage over ARP:** NS uses solicited-node multicast instead of broadcast — only the target node (and occasionally one other with the same last 24 bits) receives the NS. Dramatically reduces interrupt load on all hosts.

### Neighbor Cache

The IPv6 equivalent of the ARP cache. Each entry transitions through states:

```
INCOMPLETE  → NS sent, NA not yet received
REACHABLE   → NA received, communication confirmed recently
STALE       → reachability timeout; still using cached MAC but needs confirmation
DELAY       → grace period; waiting for upper-layer confirmation of reachability
PROBE       → sending NS to reconfirm reachability (NUD — see below)
FAILED      → NS sent multiple times, no response
```

```bash
# Linux
ip -6 neigh show          # show neighbor cache
ip -6 neigh show dev eth0

# Cisco IOS
show ipv6 neighbors
show ipv6 neighbors 2001:db8::5
clear ipv6 neighbors      # flush neighbor cache
```

### NUD — Neighbor Unreachability Detection

NDP actively tracks whether a neighbor is still reachable using upper-layer hints and probing:

```
1. Upper-layer protocols (TCP ACK, etc.) provide "forward progress" confirmation
2. If no forward progress for ReachableTime (~30s default):
   State: REACHABLE → STALE
3. If STALE entry needed again:
   State: STALE → DELAY (5s grace period)
4. No upper-layer confirmation in DELAY period:
   State: DELAY → PROBE
5. Send NS unicast to neighbor (not multicast — known MAC)
6. If NA received: PROBE → REACHABLE
7. If no response after MaxProbes:
   State → FAILED (entry removed)
```

NUD is much more proactive than ARP's passive cache expiry — it detects dead gateways and failed peers faster.

### Router Solicitation and Advertisement

```
Router Solicitation (RS, ICMPv6 Type 133):
  Host → ff02::2 (all routers)
  "Any routers out there? I need prefix info."
  Sent at boot; typically triggers immediate RA

Router Advertisement (RA, ICMPv6 Type 134):
  Router → ff02::1 (all nodes)  [periodic, ~200s default]
  or → host (unicast response to RS)
  Contains:
    • Hop Limit recommendation
    • M flag, O flag
    • Router Lifetime (how long to use this router as default gateway)
    • Reachable Time / Retransmit Timer
    • Prefix Information Option (PIO): prefix, lifetimes, L/A flags
    • MTU option
    • RDNSS / DNSSL options (DNS servers/domains, RFC 8106)
    • Route Information Options (more specific routes)
```

### Redirect (ICMPv6 Type 137)

A router tells a host to use a better (more specific) next-hop on the same link:

```
Host sends packet to Router1 for destination 2001:db8:99::1
Router1 knows Router2 is a better path AND Router2 is on the same link
Router1:
  1. Forwards the packet to Router2 (this one time)
  2. Sends ICMPv6 Redirect to the host:
     "For 2001:db8:99::/48, use Router2 (fe80::2) directly"
Host updates its destination cache to use Router2 for that prefix
```

### DAD — Duplicate Address Detection

Before using any address (link-local or GUA), a host must verify it's unique:

```
1. Address is "tentative" — cannot send or receive with it yet
2. Join solicited-node multicast for the tentative address
3. Send NS:
   IPv6 src: :: (unspecified — not using tentative address yet)
   IPv6 dst: ff02::1:ff[last24bits of tentative address]
   Target: tentative address
4. Wait RetransTimer (default 1 second)
5. If no NA received → address is unique → "preferred" state → assign
6. If NA received → conflict detected → cannot use this address

Note: RFC 7527 Enhanced DAD can distinguish real conflicts from own transmissions
(important in VLAN environments with mirrored traffic)
```

---

## Comparison: ARP vs NDP

| Feature | ARP (IPv4) | NDP (IPv6) |
|---|---|---|
| Protocol | Separate (EtherType 0x0806) | ICMPv6 (IP Protocol 58) |
| Address resolution | ARP Request/Reply | NS/NA |
| Uses broadcast? | Yes (ARP Request) | No — solicited-node multicast |
| Router discovery | ICMP Router Discovery (separate) | RA/RS (built in) |
| Prefix/SLAAC | DHCP only | RA (built in) |
| Duplicate detection | No built-in | DAD (built in) |
| Reachability tracking | Passive cache expiry | NUD (active probing) |
| Redirect | ICMP Redirect | NDP Redirect (built in) |
| Security | No auth (susceptible to spoofing) | SEcure ND (SEND, RFC 3971) optional |
| Defense mechanism | DAI (external, via DHCP snooping) | SEND / RA Guard |

---

## NDP Security

**RA Guard (RFC 6105):** Switch feature that blocks unauthorized Router Advertisements on untrusted ports — prevents rogue RA attacks where an attacker sends fake RAs with attacker's MAC as the gateway.

```cisco
! Cisco IOS RA Guard
ipv6 nd raguard policy HOST_POLICY
 device-role host

interface GigabitEthernet1/0/1
 ipv6 nd raguard attach-policy HOST_POLICY
! Now no RAs can be sent from this port (client-facing)
```

**SEND — Secure Neighbor Discovery (RFC 3971):** Cryptographic protection for NDP messages using RSA keys and Cryptographically Generated Addresses (CGA). Complex to deploy; rarely seen outside high-security environments.

---

## Tips

- ARP only works on the local subnet — a host ARPs for its default gateway's MAC, not for remote IPs.
- If a host tries to ARP for a remote IP (missing or wrong default gateway), the ARP will flood the segment with no useful reply — this is a common misconfiguration symptom.
- NDP's solicited-node multicast is far more efficient than ARP broadcast — in a 1,000-host subnet, each NS interrupts at most one or two hosts instead of all 1,000.
- Gratuitous ARP is essential in HSRP/VRRP failover — after the standby becomes active, it GARPs to update all neighbors' ARP caches immediately.
- `ip -6 neigh show` is the Linux equivalent of `arp -a` for IPv6 — know both commands for troubleshooting.

---

## Summary

- ARP resolves IPv4 addresses to MAC addresses using broadcast Request and unicast Reply; results cached in the ARP table.
- Gratuitous ARP announces address changes and is critical for HSRP/VRRP failover.
- ARP has no authentication — Dynamic ARP Inspection (DAI) defends against ARP spoofing by validating entries against the DHCP snooping binding table.
- NDP (ICMPv6) replaces ARP and adds router discovery, SLAAC support, DAD, and NUD in a single protocol.
- NDP uses solicited-node multicast instead of broadcast — far more efficient at scale.
- NUD actively probes neighbors for reachability — detects dead gateways faster than ARP's passive cache expiry.
- RA Guard blocks rogue Router Advertisements on client-facing switch ports — essential in multi-tenant or untrusted environments.
