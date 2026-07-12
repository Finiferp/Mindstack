---
title: "VXLAN & Modern Layer 2"
sidebar_label: "VXLAN & Modern L2"
sidebar_position: 18
---

# VXLAN & Modern Layer 2

Traditional VLANs (802.1Q) were designed for the scale and topology assumptions of 1990s-2000s campus networks. Modern datacenters and cloud environments outgrew several of VLAN's fundamental limits, motivating VXLAN — an overlay technology that has become the dominant modern approach to large-scale Layer 2 segmentation.

---

## Why VLANs Stopped Being Enough

```
Problem 1 — VLAN ID space is too small:
  802.1Q's 12-bit VLAN ID field allows only 4094 usable VLANs (see
  VLANs). A large multi-tenant cloud/datacenter environment — think
  thousands of customers, each potentially needing multiple isolated
  segments — can exhaust this space entirely.

Problem 2 — VLANs don't span Layer 3 boundaries naturally:
  Classic VLANs are fundamentally a Layer 2 construct, trunked between
  switches via 802.1Q. Extending a single VLAN/broadcast domain across
  a routed Layer 3 network (e.g. between two separate datacenters, or
  across a large Layer 3 "spine-leaf" fabric — see Switching
  Fundamentals) isn't something classic 802.1Q was designed to do.

Problem 3 — Spanning Tree's blocking wastes capacity at scale:
  Large topologies with many redundant Layer 2 links suffer from STP's
  fundamental approach of BLOCKING redundant paths rather than using
  them all simultaneously (see Spanning Tree Protocol) — at datacenter
  scale, with hundreds of links, this becomes a serious capacity and
  design constraint, not just an inconvenience.

Problem 4 — Multi-tenancy and overlapping address spaces:
  Cloud providers need to give DIFFERENT customers (tenants) their own
  isolated Layer 2/Layer 3 environments — potentially with OVERLAPPING
  private IP ranges between completely unrelated customers — something
  classic VLANs alone have no clean mechanism to support at scale.
```

---

## The Overlay Networking Concept

VXLAN's core idea: build a **virtual Layer 2 network on top of (overlaid on) a real Layer 3 network**, by encapsulating Layer 2 Ethernet frames inside Layer 3 UDP packets.

```
Underlay  — the actual, physical Layer 3 IP network (routers/switches
            doing normal IP routing — simple, robust, well-understood,
            highly scalable using standard routing protocols)

Overlay   — a virtual network built ON TOP of the underlay, where
            endpoints believe they're on the same Layer 2 segment,
            even though the actual underlying packets are being
            routed normally across the Layer 3 underlay between them

This separation is powerful: the underlay can use simple, well-proven,
highly scalable Layer 3 routing (no STP blocking problem at all — every
link can be actively used via normal equal-cost routing) while the
overlay provides the Layer 2 adjacency illusion that some applications
and legacy systems still expect.
```

---

## VXLAN — Virtual Extensible LAN

```
VXLAN (RFC 7348, originally developed by Cisco, Arista, VMware, and
others, finalized ~2014) encapsulates an entire Ethernet frame inside
a UDP packet, allowing that frame to be routed across a normal Layer 3
IP network as if it were ordinary IP traffic — while the two endpoints
on either end believe they're directly Layer-2-adjacent.

VXLAN Encapsulation structure:
┌──────────┬──────────┬──────────┬────────────────┬──────────────────┐
│ Outer Eth│ Outer IP │ Outer UDP│ VXLAN Header   │ Original Ethernet│
│ Header   │ Header   │ Header   │ (8 bytes,      │ Frame (the       │
│          │          │ (dest    │  includes 24-  │  original L2     │
│          │          │  port    │  bit VNI)      │  payload being   │
│          │          │  4789)   │                │  carried)        │
└──────────┴──────────┴──────────┴────────────────┴──────────────────┘

Key improvement — the VNI (VXLAN Network Identifier) is 24 BITS,
providing up to ~16 MILLION possible segments — compare to 802.1Q's
12-bit VLAN ID giving only ~4094. This single change resolves Problem 1
above (VLAN ID exhaustion) by several orders of magnitude.

VTEP (VXLAN Tunnel Endpoint) — the device (typically a switch, router,
  or hypervisor virtual switch) that performs the actual encapsulation/
  decapsulation between the "real" Ethernet frame and its VXLAN-wrapped
  form for transport across the Layer 3 underlay.
```

---

## How VXLAN Solves the Original VLAN Problems

```
✓ VNI space (24-bit, ~16M) vastly exceeds VLAN ID space (12-bit, ~4094)
  — solves multi-tenant/cloud-scale segmentation exhaustion

✓ Because the actual transport is normal Layer 3 IP routing, VXLAN
  overlays can span ACROSS routed Layer 3 boundaries naturally —
  extending a "Layer 2" segment between datacenters, or across a
  spine-leaf fabric, becomes simply routing UDP packets — no special
  Layer 2 extension technology required

✓ Because the underlay is pure Layer 3 routing, there's no STP
  blocking problem at all in the underlay — standard equal-cost
  multi-path (ECMP) routing actively uses ALL available links
  simultaneously, rather than blocking redundant ones

✓ Multi-tenancy with overlapping address spaces becomes manageable —
  different tenants' overlapping private IPs are isolated within
  their own VNI, invisible to and unaffected by other tenants sharing
  the same physical underlay infrastructure
```

---

## EVPN — The Modern Control Plane for VXLAN

VXLAN alone defines only the DATA PLANE encapsulation (how frames are wrapped and transported) — it doesn't, by itself, define how VTEPs learn about each other or how MAC/IP reachability information is distributed across the network. Early VXLAN deployments relied on "flood and learn" (conceptually similar to classic switch MAC learning, but flooding across the Layer 3 underlay via multicast) — functional, but inefficient at scale.

```
EVPN (Ethernet VPN, RFC 7432 and related) provides a proper CONTROL
PLANE for VXLAN, using BGP (see BGP Fundamentals) as the protocol to
proactively advertise and distribute MAC address and IP reachability
information between VTEPs — replacing inefficient flood-and-learn
with a more deliberate, scalable, BGP-based learning mechanism,
similar in spirit to how a routing protocol proactively shares
reachability information rather than relying purely on broadcast-based
discovery.

EVPN + VXLAN together is the dominant modern architecture for large-
scale datacenter fabrics and is increasingly used by service providers
for next-generation Layer 2/Layer 3 VPN services, effectively becoming
a modern, more flexible and scalable successor to many use cases that
were previously addressed by MPLS L2VPN/L3VPN techniques (see MPLS).
```

---

## VXLAN in Practice — Datacenter Spine-Leaf Architecture

```
                [Spine 1]      [Spine 2]
                  /    \         /    \
                 /      \       /      \
            [Leaf A]   [Leaf B]   [Leaf C]   ← VTEPs live here
               │           │           │
            [Server]    [Server]    [Server]

- Spine switches: pure Layer 3 routing, no VXLAN awareness needed,
  simply route IP traffic between leaves using ECMP across ALL
  available spine uplinks simultaneously (no STP blocking at all)
- Leaf switches: act as VTEPs, encapsulating/decapsulating VXLAN
  traffic for directly-connected servers, presenting those servers
  with what looks like normal Layer 2 connectivity to other servers
  anywhere in the fabric, regardless of which physical leaf they're
  actually connected to
- This architecture allows a virtual machine to be migrated from a
  server under Leaf A to a server under Leaf C while keeping the SAME
  IP address and remaining in the SAME logical Layer 2 segment (VNI)
  — essential for modern virtualization/cloud workload mobility
```

---

## Other Modern Layer 2 Overlay Concepts (Brief Mention)

```
GENEVE — a newer, more extensible encapsulation format (similar goal
  to VXLAN) designed with a flexible, extensible header to accommodate
  future metadata needs without requiring a new protocol — increasingly
  used in some SDN/cloud platforms (see SDN Fundamentals) as an
  alternative or complement to VXLAN.

NVGRE — an earlier Microsoft-backed alternative to VXLAN using GRE
  encapsulation instead of UDP — saw some adoption but VXLAN became
  the dominant industry standard.
```

---

## Tips

- Don't think of VXLAN as "replacing" IP routing — it runs ON TOP of normal IP routing in the underlay; the underlay design (often a simple, highly scalable spine-leaf with standard routing protocols like BGP or OSPF) is just as important as the VXLAN overlay configuration itself.
- When troubleshooting VXLAN environments, remember there are effectively two separate "networks" to debug: the underlay (can the VTEPs even reach each other via normal IP routing?) and the overlay (is the VXLAN encapsulation/VNI configuration correct?) — always verify underlay connectivity FIRST.
- EVPN's BGP-based control plane means many BGP troubleshooting skills (see BGP Fundamentals) transfer directly to troubleshooting modern VXLAN/EVPN fabrics — this is a deliberate design choice reusing well-understood, battle-tested routing protocol mechanics rather than inventing an entirely new control plane from scratch.

---

## Summary

- VXLAN was created because classic 802.1Q VLANs hit real scaling limits (4094 VLAN ceiling, inability to natively span Layer 3 boundaries, STP's wasteful link-blocking at scale) in modern datacenter and multi-tenant cloud environments.
- VXLAN encapsulates entire Ethernet frames inside UDP/IP packets, creating a Layer 2 overlay on top of a pure Layer 3 underlay — VTEPs perform the encapsulation/decapsulation.
- The 24-bit VNI provides roughly 16 million possible segments, vastly exceeding 802.1Q's ~4094 VLAN limit.
- EVPN provides a proper BGP-based control plane for VXLAN, replacing inefficient flood-and-learn with proactive, scalable MAC/IP reachability advertisement.
- The dominant modern datacenter pattern is a spine-leaf physical topology with pure Layer 3 routing in the underlay (no STP blocking) and VXLAN/EVPN providing the Layer 2 overlay illusion needed for workload mobility and multi-tenancy.
