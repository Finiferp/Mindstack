---
title: "Switching and VLANs"
sidebar_label: "Switching & VLANs"
sidebar_position: 3
---

# Switching and VLANs

Switches operate at the Data Link layer to forward frames within a LAN. They learn which MAC addresses reside on which ports by examining incoming frames. Once learned, a switch forwards each frame only to the port of the destination MAC, greatly increasing efficiency compared to a hub. Each switch port defines its own **collision domain**, while the whole switch (by default) is a single **broadcast domain**.

**Virtual LANs (VLANs)** segment a switch into multiple separate broadcast domains. Each VLAN functions like an independent LAN: devices in VLAN 10, for example, communicate freely among themselves but require a router to reach VLAN 20. VLANs are configured by assigning switch ports to a VLAN ID. This allows network designers to group users logically (by function, department, etc.) regardless of physical location, improving security and performance by limiting broadcasts.

To carry multiple VLANs over one link, switches use a **trunk port**. A trunk link carries traffic for several VLANs by tagging frames with the VLAN ID using 802.1Q (industry standard) or ISL (Cisco proprietary) encapsulation. For example, on a Cisco switch:

```text
switch(config)# interface GigabitEthernet0/1
switch(config-if)# switchport mode access
switch(config-if)# switchport access vlan 10

switch(config)# interface GigabitEthernet0/24
switch(config-if)# switchport trunk encapsulation dot1q
switch(config-if)# switchport mode trunk
```
This assigns VLAN 10 to port `G0/1` and makes port `G0/24` a 802.1Q trunk. Use `show interfaces trunk` to verify trunk status and allowed VLANs.

## Spanning Tree Protocol (STP)

Spanning Tree Protocol (STP) prevents Layer 2 loops in networks with redundant switch links. Redundant links improve resilience but create loops that cause broadcast storms. STP dynamically blocks certain switch ports so that only one active path exists between switches.  

If an active link fails, STP reactivates a blocked link to maintain connectivity. Each switch elects a **root bridge** (lowest Bridge ID) and blocks redundant ports to ensure a loop-free topology.

## Troubleshooting (Switching/VLAN)

- Verify trunks are configured consistently on both ends (check encapsulation and native VLAN).  
- Use `show vlan` to confirm port VLAN assignments.  
- Check STP with `show spanning-tree` to see which ports are blocked or forwarding.  
- Use `show mac address-table` to see learned MAC addresses and ensure correct traffic flow.  
- If using port security, check violation counters with `show port-security`.
