---
title: "Layer 2 Troubleshooting"
sidebar_label: "Layer 2 Troubleshooting"
sidebar_position: 17
---

# Layer 2 Troubleshooting

A structured approach to diagnosing switching/Layer 2 problems, building on the concepts covered throughout Part 2 — Ethernet framing, MAC addressing, VLANs, trunking, spanning tree, and switch security.

---

## General Layer 2 Troubleshooting Methodology

Always work bottom-up through the stack — confirm Layer 1 before assuming a Layer 2 problem, and confirm Layer 2 before chasing what might actually be a Layer 3 issue further up.

```
1. Physical (Layer 1) check — link light on? Cable seated? Correct
   cable type/category for the desired speed?
2. Interface status check — is the interface administratively up?
   Operationally up? What speed/duplex did it negotiate?
3. VLAN/trunk check — is the port in the expected VLAN? If a trunk,
   is the needed VLAN in the allowed list? Does native VLAN match
   on both ends?
4. MAC address table check — is the expected device's MAC showing up
   on the expected port? Is it flapping between ports?
5. Spanning tree check — is the port in forwarding state? Has there
   been a recent topology change?
6. Error counters — CRC errors, collisions, runts, giants — these
   point to physical/duplex issues even when the link is technically "up"
```

---

## Interface Status — Up/Up, Up/Down, Down/Down

Cisco IOS reports interface status as two independent values: line protocol status and physical (line) status — understanding what each combination means is foundational.

```
show interfaces gi0/1
"GigabitEthernet0/1 is up, line protocol is up"     ← fully working

"GigabitEthernet0/1 is up, line protocol is down"   ← Layer 1 is fine
  (physical link/cable detected) but Layer 2 isn't establishing —
  common causes: encapsulation mismatch, duplex mismatch on some
  platforms, keepalive misconfiguration, or a problem on the OTHER
  end's Layer 2 configuration

"GigabitEthernet0/1 is down, line protocol is down" ← no physical
  link at all — cable unplugged, bad cable, port shut down on the
  other end, or hardware failure

"GigabitEthernet0/1 is administratively down"       ← someone (or some
  automation) issued a "shutdown" command on this interface — the
  most common cause of unexpected port-down reports, worth checking
  FIRST before assuming a hardware fault
```

---

## Diagnosing Duplex Mismatches

A classic, still-common real-world issue, especially when one side has autonegotiation disabled.

```
Symptoms: connection technically "works" but is extremely slow,
  with intermittent errors, especially under load — easy to
  misdiagnose as a bandwidth or application problem.

Diagnostic signature in interface counters:
  show interfaces gi0/1
  Look for: "late collisions" (a strong duplex mismatch signal —
  true collisions should be essentially impossible on modern
  full-duplex switched links, so their presence at all is suspicious)
  Also check: CRC errors, runts — these increase when one side
  expects full-duplex (sends whenever it wants) and the other expects
  half-duplex (uses CSMA/CD, expects to detect collisions)

Resolution: ensure autonegotiation is enabled on BOTH ends, or if
  manually configuring speed/duplex, ensure BOTH ends are configured
  IDENTICALLY (never leave one side on auto and force the other —
  this is the classic mismatch-causing configuration).
```

---

## Diagnosing VLAN/Trunk Issues

```
Symptom: devices in the same VLAN, on different switches, can't
  communicate, despite both having correct individual access port
  VLAN assignments.

Checklist:
  show interfaces trunk    — confirm the link is actually operating
    as a trunk (not accidentally negotiated down to access mode)
  Check "allowed vlan" list — is the specific VLAN actually permitted
    across this trunk? (a VLAN missing from the allowed list is one
    of the single most common real-world VLAN troubleshooting findings)
  Check native VLAN match  — mismatched native VLAN on either end of
    a trunk can cause subtle, hard-to-diagnose traffic leakage between
    VLANs or dropped traffic, depending on the exact mismatch scenario
  Check VLAN exists on both switches — if VTP isn't propagating
    correctly (or isn't in use), a VLAN might exist on Switch A but
    not yet have been manually created on Switch B
```

```
Diagnostic commands:
Switch# show vlan brief
Switch# show interfaces trunk
Switch# show interfaces gi0/24 switchport
Switch# show mac address-table vlan 10
```

---

## Diagnosing Spanning Tree Issues

```
Symptom: a previously-working redundant link path now seems "blocked"
  unexpectedly, OR the network experienced a sudden, severe slowdown
  consistent with a possible broadcast storm.

Checklist:
  show spanning-tree vlan 10  — confirm which switch is currently
    root, and which ports are in each state (blocking/forwarding) —
    compare against the expected/designed topology
  Look for unexpected ROOT BRIDGE CHANGES — if a switch that was
    never intended to be root suddenly wins root election (e.g. due
    to a misconfiguration or a new switch with default/low Bridge
    Priority being added to the network), this can cause unexpected
    and suboptimal traffic paths network-wide
  Check for recent TOPOLOGY CHANGE NOTIFICATIONS (TCNs) — frequent
    TCNs indicate an unstable link (flapping) somewhere in the
    topology, worth investigating as the root cause of broader
    instability rather than treating each individual symptom separately
  If suspecting an actual unprotected loop (e.g. someone connected
    an unmanaged switch/hub creating an inadvertent loop, and BPDU
    Guard wasn't configured to catch it) — look for MAC addresses
    rapidly flapping between multiple ports in the MAC address table,
    a strong loop signature
```

```
Diagnostic commands:
Switch# show spanning-tree vlan 10
Switch# show spanning-tree summary
Switch# show spanning-tree detail | include Topology|Root|Port
```

---

## Diagnosing MAC Address Table Issues

```
Symptom: intermittent connectivity, or a device "disappears" from
  the network unpredictably.

Checklist:
  show mac address-table address <mac>  — confirm where the switch
    currently believes this device lives (which port)
  If a MAC is flapping rapidly between ports — strong signal of either
    a Layer 2 loop, a misconfigured failover/clustering setup
    (two devices presenting the same MAC unexpectedly), or in rare
    cases, intentional MAC spoofing
  If a MAC is simply MISSING from the table — check the aging timer
    (entries expire after a period of inactivity, default often
    300 seconds) — the device may simply have been idle, or there
    may be a genuine connectivity break preventing the switch from
    ever seeing a frame from it
```

---

## Common Layer 2 Error Counters and What They Mean

```
CRC Errors   — frame failed the Frame Check Sequence validation,
  indicating physical-layer corruption (bad cable, interference,
  bad connector, or occasionally a duplex mismatch)

Runts        — frames smaller than the 64-byte Ethernet minimum,
  often caused by a collision fragment (on legacy half-duplex links)
  or a failing NIC

Giants       — frames larger than the maximum allowed size (1518/1522
  bytes for standard/tagged frames), often caused by a misconfigured
  jumbo frame setting somewhere along the path, or a malfunctioning device

Late Collisions — a collision detected AFTER the first 64 bytes of
  the frame have already been transmitted — should be essentially
  impossible on a correctly functioning full-duplex link; a strong
  signal of a duplex mismatch

Input/Output Errors — generic error counters worth investigating
  further with more specific counters above, but a rising count over
  time (use "show interfaces" repeatedly, note the DELTA, not just
  the absolute total) indicates an active, ongoing problem rather
  than historical/already-resolved issues
```

---

## Useful Diagnostic Commands Reference

```
show interfaces <int>              — status, errors, speed/duplex
show interfaces <int> switchport   — VLAN/trunk mode details
show interfaces trunk              — all trunk ports and their allowed VLANs
show vlan brief                    — VLAN-to-port mapping
show mac address-table             — full MAC table
show mac address-table address <mac> — locate a specific MAC
show spanning-tree                 — overall STP state
show spanning-tree vlan <id>       — STP state for a specific VLAN
show interfaces status             — quick summary of all ports (speed/
                                       duplex/VLAN/connected status)
show etherchannel summary          — EtherChannel bundle status
show port-security interface <int> — port security status/violations
show ip dhcp snooping binding      — DHCP snooping binding table
show errdisable recovery           — err-disabled recovery settings
show logging                       — recent log messages (often the
                                       fastest way to spot recent
                                       port flaps, security violations,
                                       or STP topology changes)
```

---

## Tips

- Always check `show logging` early in any troubleshooting session — many Layer 2 issues (port security violations, STP topology changes, interface flaps) leave a clear timestamped trail that immediately narrows the investigation.
- "Up/up but slow and unreliable" almost always points to a duplex mismatch or a marginal physical layer issue (bad cable/connector) rather than a configuration logic problem — check error counters before VLAN/STP configuration.
- A device that intermittently "disappears" from the network is a strong candidate for an aging MAC table entry combined with an actual physical connectivity flap — correlate MAC table changes with interface up/down logging timestamps.

---

## Summary

- Always troubleshoot Layer 2 issues bottom-up: physical link, then interface status, then VLAN/trunk configuration, then MAC table, then spanning tree.
- "Up/up", "up/down", and "down/down" interface status combinations each point to a different category of root cause — administratively down is the most common and easiest to overlook.
- Duplex mismatches produce a distinctive signature (late collisions, CRC errors) despite the link otherwise appearing operational.
- Missing VLANs from a trunk's allowed list is one of the single most common real-world Layer 2 misconfigurations.
- Rapidly flapping MAC table entries are a strong signal of either a loop or a duplicate/spoofed MAC address requiring immediate investigation.
- `show logging` should be an early step in almost any Layer 2 troubleshooting session — most relevant events (flaps, violations, topology changes) are logged with timestamps that quickly narrow the search.
