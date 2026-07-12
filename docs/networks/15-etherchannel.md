---
title: "EtherChannel & Link Aggregation"
sidebar_label: "EtherChannel"
sidebar_position: 15
---

# EtherChannel & Link Aggregation

Link aggregation bundles multiple physical links between two devices into a single logical link — increasing total bandwidth and providing redundancy, while presenting Spanning Tree with just one logical link instead of multiple parallel physical ones (avoiding the loop-and-blocking tradeoff entirely for that bundle).

---

## Why Bundle Links?

```
Without aggregation:                With aggregation (EtherChannel):
[Switch A]══[Switch B]               [Switch A]═══[Switch B]
[Switch A]══[Switch B]  (2nd link)   (logically ONE 2Gbps link,
                                       physically TWO 1Gbps cables)

Without bundling, STP sees two parallel physical links between the
same two switches as a LOOP RISK and blocks one of them entirely
(see Spanning Tree Protocol) — wasting half the available bandwidth
and capacity that was paid for.

With EtherChannel, STP sees ONE logical interface (a "Port Channel")
and treats the bundle as if it were a single link — both physical
links are actively used, traffic is load-balanced across them, and
if one physical link fails, traffic simply continues over the
remaining link(s) with no STP recalculation needed.
```

---

## Link Aggregation Protocols

```
Static (manual) — both ends are simply configured to treat the links
  as a bundle, with no negotiation protocol — works, but risky: if one
  side is misconfigured (e.g. fewer/more links, or "static" while the
  other side expects negotiation), you can end up with a silent
  mismatch, sometimes resulting in an actual unprotected forwarding
  loop. Generally considered less safe than a negotiated protocol.

PAgP (Port Aggregation Protocol) — Cisco proprietary, predates the
  open standard, negotiates and verifies that bundled links are
  correctly matched on both ends before activating the bundle.

LACP (Link Aggregation Control Protocol) — IEEE 802.3ad (and now part
  of 802.1AX) open standard, functionally similar to PAgP but vendor-
  neutral, making it the standard choice for any modern multi-vendor
  or future-proofed deployment.
```

```
LACP/PAgP negotiation modes:
  Active / Desirable — actively sends negotiation packets, initiates
                        bundle formation
  Passive / Auto     — waits to receive negotiation packets, responds
                        but doesn't initiate

Both ends must NOT both be set to passive/auto — if neither side
initiates, the bundle never forms. At least one side must be active
(LACP) or desirable (PAgP).
```

---

## Load Balancing Across Bundled Links

A common misconception: EtherChannel does NOT simply alternate packets round-robin across the bundled links. Instead, it uses a **hashing algorithm** based on configurable fields (source/destination MAC, source/destination IP, or port numbers, or a combination) to deterministically assign each individual conversation (flow) to one specific physical link in the bundle.

```
Why hash instead of round-robin? To PRESERVE PACKET ORDER within a
single conversation. If packets from the same TCP flow could land on
different physical links with different latencies, they might arrive
out of order, forcing the receiving TCP stack to do unnecessary
reordering work (and potentially mistaking it for packet loss,
triggering unnecessary retransmission — see TCP Fundamentals).
Hashing the SAME flow consistently to the SAME physical link avoids
this entirely, at the cost of not perfectly balancing load packet-by-
packet (a single very high-bandwidth flow will always use only ONE
physical link's worth of bandwidth, never spreading across multiple).

Common hash inputs (configurable, varies by platform):
  src-mac, dst-mac
  src-ip, dst-ip
  src-port, dst-port (Layer 4, more granular — better balancing when
                       many flows exist between the same two IP hosts)
```

---

## Configuration Example (Cisco IOS)

```
! Configure LACP EtherChannel between two switches (2 links)
Switch(config)# interface range gigabitethernet 0/23-24
Switch(config-if-range)# channel-group 1 mode active
Switch(config-if-range)# exit

! The resulting logical interface
Switch(config)# interface port-channel 1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20,30

! Configure the load-balancing hash method (platform-dependent options)
Switch(config)# port-channel load-balance src-dst-ip

! Verification
Switch# show etherchannel summary
Switch# show etherchannel load-balance
Switch# show interfaces port-channel 1
```

---

## Requirements for Successful Bundling

All physical links in a bundle must match on several characteristics, or the bundle will fail to form (or individual links will be excluded):

```
✓ Same speed (e.g. all 1 Gbps, or all 10 Gbps — not a mix)
✓ Same duplex (all full-duplex)
✓ Same VLAN/trunk configuration (all access in the same VLAN, or all
  trunks with matching allowed VLAN lists and native VLAN)
✓ Same switchport mode (all access, or all trunk — not mixed)
✓ Same negotiation mode compatibility (active+active/passive, or
  desirable+desirable/auto — not active+passive incompatibilities
  for LACP specifically, though active+passive DOES work; passive+
  passive does NOT)
```

---

## Multi-Chassis Link Aggregation

A more advanced variant bundles links not just across multiple physical cables, but across links terminating on **two different physical switches**, providing redundancy even against the failure of an entire switch chassis, not just a single link.

```
[Server]══╗
          ╠══[Switch A]
          ╚══[Switch B]   (Switch A and B act as ONE logical
                            switch for EtherChannel purposes)

This requires vendor-specific technology to make two physical switches
appear as a single logical switch to the connected device for
aggregation purposes:
  Cisco — Virtual Port Channel (vPC) on Nexus platforms, or
          StackWise/StackWise Virtual on Catalyst platforms
  Other vendors — similar concepts under different names (MLAG being
          a common generic industry term — Multi-Chassis Link Aggregation)
```

This pattern is extremely common in modern datacenter and server-facing top-of-rack switch designs, where a server (or another switch) connects redundantly to two separate physical switches for maximum resilience, while still appearing as one simple aggregated link from the server's perspective.

---

## Tips

- Always use LACP (active mode on at least one side) over static/manual bundling in production — the negotiation protects against silent misconfiguration that could otherwise create an unprotected loop or a non-functional bundle.
- When experiencing a "this one specific large file transfer is slow but overall switch throughput looks fine," remember that a single flow on an EtherChannel bundle is hashed to exactly ONE physical link — it will never exceed that single link's bandwidth, even if the bundle has multiple links and plenty of spare aggregate capacity.
- Mismatched configuration (speed, duplex, VLAN, trunk settings) across bundled links is the most common real-world cause of EtherChannel bundles failing to form or operating in a degraded state — always double check `show etherchannel summary` for any link shown as individually "suspended" rather than part of the active bundle.

---

## Summary

- EtherChannel/link aggregation bundles multiple physical links into one logical link, increasing usable bandwidth and avoiding STP blocking one of the redundant physical links.
- LACP (open IEEE standard) is preferred over PAgP (Cisco proprietary) or static/manual bundling for safety via negotiation.
- Traffic is load-balanced via a hashing algorithm (based on MAC/IP/port fields) that keeps each individual flow consistently on one physical link to preserve packet ordering — meaning a single flow never exceeds one physical link's bandwidth even within a larger bundle.
- All bundled links must match in speed, duplex, and VLAN/trunk configuration or the bundle will fail to form correctly.
- Multi-chassis link aggregation (vPC, StackWise Virtual, MLAG) extends this concept across two physical switches, protecting against a full switch chassis failure, not just a single link failure.
