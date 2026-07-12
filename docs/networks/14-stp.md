---
title: "Spanning Tree Protocol"
sidebar_label: "Spanning Tree (STP)"
sidebar_position: 14
---

# Spanning Tree Protocol

Spanning Tree Protocol (STP) prevents Layer 2 loops in switched networks with redundant physical links — a deceptively simple-sounding problem that, if unsolved, causes catastrophic broadcast storms capable of taking down an entire network within seconds.

---

## Why Redundant Links Cause Catastrophic Problems at Layer 2

Physical link redundancy is good for availability — but unlike Layer 3 (where routing protocols inherently understand topology and avoid loops via metrics/hop counts), raw Layer 2 switching has NO loop prevention built in by default.

```
The Loop Problem:
        [Switch A]
        /        \
   [Switch B]──[Switch C]

If Switch A, B, and C are connected in this redundant triangle WITHOUT
spanning tree, a single broadcast frame (e.g. an ARP request) entering
this topology gets FLOODED out every port by EVERY switch (recall:
switches flood broadcasts — see Switching Fundamentals) — and because
the topology has a loop, that same frame circulates endlessly,
getting duplicated and re-flooded at every switch, every cycle.

Within seconds, this exponential duplication consumes 100% of available
bandwidth and CPU on every involved switch — a "broadcast storm" — and
the network becomes completely unusable until the loop is physically
broken. MAC address tables also become unstable, with switches seeing
the same source MAC arrive on multiple ports in rapid succession
(MAC flapping), unable to converge on a consistent forwarding decision.
```

This is precisely why blindly adding redundant links to a switched network is actively dangerous without a loop-prevention protocol — STP exists specifically to allow the *physical* redundancy (for resilience) while preventing the *logical* loop (which would otherwise be catastrophic).

---

## History of Spanning Tree

```
1985 — Radia Perlman develops the original Spanning Tree algorithm at
       Digital Equipment Corporation (DEC), famously summarized in a
       playful poem she wrote: "I think that I shall never see / A
       graph more lovely than a tree..." — DEC's proprietary version
       predates the IEEE standard

1990 — IEEE standardizes 802.1D, codifying STP as an industry standard
       (convergence time: up to 30-50 seconds — slow by modern standards,
       a real operational pain point through the 1990s)

2001 — IEEE 802.1w standardizes Rapid Spanning Tree Protocol (RSTP),
       dramatically improving convergence time (typically under a few
       seconds) by rethinking port states and adding direct
       switch-to-switch negotiation instead of relying purely on timers

2002-03 — IEEE 802.1s standardizes Multiple Spanning Tree Protocol
          (MSTP), allowing multiple spanning tree instances to map to
          different groups of VLANs, enabling load balancing across
          redundant links instead of single STP's "one tree fits all
          VLANs" limitation
```

---

## How STP Builds a Loop-Free Tree

STP's fundamental approach: elect a **root bridge**, then have every other switch calculate the single best (lowest-cost) path back to that root, and **block** any redundant port that would otherwise create a loop — while keeping that blocked link in reserve, ready to activate automatically if the active path fails.

```
Step 1 — Root Bridge Election:
  Every switch has a Bridge ID = Bridge Priority (default 32768) + MAC
  address. The switch with the LOWEST Bridge ID becomes the Root Bridge
  — the single reference point the entire tree is built around.
  (Lower priority value wins; ties broken by lowest MAC address.)

Step 2 — Root Port Selection (on every NON-root switch):
  Each non-root switch selects exactly ONE Root Port — the port with
  the lowest-cost path back to the root bridge. Cost is based on link
  speed (lower cost = faster link, see table below).

Step 3 — Designated Port Selection (per network segment):
  For each LAN segment, exactly one switch becomes "designated" for
  that segment (usually whichever switch is closer to the root, or
  has the lowest Bridge ID in a tie) and its port stays in forwarding state.

Step 4 — Blocking:
  Any port that is NEITHER a Root Port NOR a Designated Port is placed
  into BLOCKING state — it physically still exists and is ready to
  activate, but does not forward any data frames, eliminating the loop.
```

```
STP Path Cost (IEEE 802.1D original / 802.1t revised, by link speed):
10 Mbps    → cost 100
100 Mbps   → cost 19
1 Gbps     → cost 4
10 Gbps    → cost 2
(Lower cost = preferred path — faster links are "cheaper" in STP math)
```

---

## STP Port States (802.1D Classic)

```
Blocking   — does not forward frames, listens for BPDUs only (loop prevention)
Listening  — transitioning toward forwarding, listens for BPDUs, builds
             active topology understanding, still does NOT forward data
Learning   — begins learning MAC addresses into the table, still does
             NOT forward data
Forwarding — fully active, forwards data AND learns MAC addresses
Disabled   — administratively shut down

Classic 802.1D STP convergence (moving through these states after a
topology change) could take 30-50 seconds — a significant, often
business-impacting delay in an era before RSTP.
```

---

## BPDUs — Bridge Protocol Data Units

Switches exchange **BPDUs** to communicate Bridge IDs, path costs, and topology information, enabling the entire root-election and port-role-assignment process described above.

```
BPDUs are sent as multicast frames (destination MAC 01:80:C2:00:00:00)
every 2 seconds by default (the "Hello Timer"), allowing switches to
continuously verify the topology is stable and to detect failures.

Key BPDU fields:
  Root Bridge ID    — who the sender believes is currently the root
  Sender Bridge ID  — the sending switch's own Bridge ID
  Root Path Cost    — the sender's cumulative cost to reach the root
  Timers            — Hello Time, Max Age, Forward Delay
```

---

## RSTP — Rapid Spanning Tree Protocol (802.1w)

RSTP is the modern default on virtually all current switching equipment, providing dramatically faster convergence by reworking both the port state model and the underlying signaling mechanism.

```
RSTP Port States (simplified from 5 to 3):
  Discarding  — combines classic STP's Blocking AND Listening states
  Learning    — same concept as classic STP
  Forwarding  — same concept as classic STP

RSTP Port Roles (new concept, beyond classic STP's Root/Designated/Blocked):
  Root Port        — same as classic STP
  Designated Port  — same as classic STP
  Alternate Port   — a backup path to the root, ready to take over almost
                     instantly if the root port fails (this is the
                     conceptual replacement for "blocked," but actively
                     pre-computed and ready rather than purely passive)
  Backup Port      — a backup for a designated port on the SAME segment
                     (relevant when a switch has two links to the same
                     shared segment, a less common scenario)

Why RSTP is so much faster: instead of relying primarily on fixed
timers (waiting out the Listening/Learning delay), RSTP switches
actively exchange explicit handshake messages ("proposal/agreement")
with neighboring switches to rapidly confirm new port roles, achieving
sub-second to low-single-digit-second convergence in most real
topologies — a dramatic practical improvement over classic 802.1D's
30-50 second convergence.
```

---

## MSTP — Multiple Spanning Tree Protocol (802.1s)

```
Problem MSTP solves: classic STP and RSTP compute exactly ONE spanning
tree for the ENTIRE switched network, regardless of how many VLANs
exist. This means ALL VLANs share the same blocked/forwarding link
decisions — even if it would be more efficient to forward VLAN 10's
traffic over Link A while forwarding VLAN 20's traffic over Link B
(load balancing the redundant links instead of leaving one entirely idle).

MSTP allows mapping GROUPS of VLANs to separate "MST instances," each
with its own independently-computed spanning tree — enabling genuine
load balancing across redundant links rather than always leaving one
link 100% idle in blocking state for every VLAN simultaneously.

Cisco's proprietary PVST+ (Per-VLAN Spanning Tree Plus) and Rapid
PVST+ achieve a SIMILAR practical outcome (a separate STP instance
PER VLAN, rather than grouped instances like MSTP) and are extremely
common in real Cisco deployments — worth knowing as the most likely
STP variant you'll actually encounter on Cisco gear in practice,
even though MSTP is the open IEEE standard.
```

---

## STP Protection Features

Beyond the base protocol, several widely-deployed features harden STP against common real-world misconfiguration and edge cases:

```
PortFast — applied to ACCESS ports connecting to end devices (PCs,
  servers) ONLY. Skips the Listening/Learning delay entirely, moving
  straight to Forwarding, since end devices don't create loops and
  shouldn't have to wait 30+ seconds after a reboot just to get an IP
  via DHCP. NEVER enable PortFast on a port that connects to another
  switch — doing so risks a real loop if that "end device" port ever
  actually receives a BPDU from an accidentally-connected switch.

BPDU Guard — applied alongside PortFast: if a port configured for
  PortFast EVER receives a BPDU (meaning a switch, not an end device,
  is actually connected there — perhaps an employee plugged in a
  cheap unmanaged switch/hub creating an accidental loop), the port is
  immediately disabled (err-disabled), preventing the very loop
  scenario PortFast's assumption was designed around.

Root Guard — applied on a port to prevent a downstream/unexpected
  switch from becoming the root bridge — if a superior BPDU (one that
  would normally win root election) is received on a Root-Guard-
  protected port, that port is put into a "root-inconsistent" state
  instead of allowing the topology to be hijacked.

Loop Guard — protects against a specific failure mode where a port
  stops receiving BPDUs (e.g. due to a unidirectional link failure)
  and incorrectly transitions to forwarding, potentially creating a
  loop — Loop Guard keeps such a port in a blocking state instead
  until BPDUs resume.

BPDU Filter — suppresses BPDU transmission/processing on a port
  entirely (different from BPDU Guard, which reacts to BPDU arrival
  by disabling the port) — used more rarely and more carefully, as
  misuse can itself create loop vulnerabilities.
```

---

## Configuration Example (Cisco IOS)

```
! Enable Rapid PVST+ (per-VLAN RSTP) globally
Switch(config)# spanning-tree mode rapid-pvst

! Influence root bridge election (lower priority = more likely to be root)
Switch(config)# spanning-tree vlan 10 priority 4096
! Or, simpler: force this switch to be root for VLAN 10
Switch(config)# spanning-tree vlan 10 root primary

! PortFast + BPDU Guard on an access port
Switch(config)# interface gigabitethernet 0/5
Switch(config-if)# spanning-tree portfast
Switch(config-if)# spanning-tree bpduguard enable

! Root Guard on an uplink port that should NEVER become a root port
Switch(config)# interface gigabitethernet 0/24
Switch(config-if)# spanning-tree guard root

! Verification
Switch# show spanning-tree
Switch# show spanning-tree vlan 10
Switch# show spanning-tree interface gi0/1 detail
```

---

## Tips

- Never enable PortFast on a switch-to-switch (trunk) port — pair PortFast with BPDU Guard on access ports specifically, and treat any err-disabled port (caused by BPDU Guard firing) as a strong signal someone plugged in an unauthorized switch/hub.
- When designing redundant Layer 2 topologies today, strongly consider whether STP is even the right tool — many modern datacenter designs avoid Layer 2 loops architecturally (e.g. via Layer 3 leaf-spine designs or technologies like VXLAN/EVPN — see VXLAN & Modern L2) rather than relying on STP's loop *tolerance* via blocking.
- If troubleshooting intermittent, severe network slowdowns that resolve themselves after a port flaps, suspect a Layer 2 loop or an STP misconfiguration (e.g. an unintended root bridge change) before assuming a Layer 3 or application-level cause.

---

## Summary

- STP exists because raw Layer 2 switching has no native loop prevention — a physical loop without STP causes a broadcast storm capable of taking down an entire network within seconds.
- Classic 802.1D STP (Radia Perlman, 1985, standardized 1990) elects a root bridge, computes shortest paths, and blocks redundant ports — but converges slowly (30-50 seconds).
- RSTP (802.1w, 2001) dramatically improves convergence (sub-second to low seconds) via active proposal/agreement handshakes and a simplified port state model.
- MSTP (and Cisco's PVST+/Rapid PVST+) allow per-VLAN or per-VLAN-group spanning trees, enabling load balancing across redundant links instead of always idling one link entirely.
- PortFast + BPDU Guard is the standard hardening pattern for access ports; Root Guard and Loop Guard protect against specific topology-hijacking and unidirectional-link failure scenarios respectively.
- Modern network designs increasingly avoid Layer 2 loops architecturally rather than relying purely on STP's tolerate-and-block approach.
