---
title: "Switching and VLANs"
sidebar_label: "Switching & VLANs"
sidebar_position: 3
---

# Switching and VLANs

Switches operate at the **Data Link layer (Layer 2)** to forward frames within a local area network (LAN). Their primary function is to deliver frames from a source MAC address to the correct destination MAC address, which is learned dynamically by observing incoming frames.

Key concepts:

- **Collision domains**: Each switch port represents a separate collision domain, reducing collisions compared to hubs.  
- **Broadcast domains**: By default, all ports on a switch belong to a single broadcast domain; broadcasts are sent to all ports.  

This separation allows switches to improve network efficiency, performance, and scalability.

---

## Virtual LANs (VLANs)

**VLANs** divide a physical switch into multiple logical broadcast domains. Each VLAN operates as an independent LAN:

- Devices in the same VLAN communicate freely at Layer 2.  
- Devices in different VLANs require a router or Layer 3 device to communicate.  

Benefits of VLANs:

- **Logical segmentation**: Group users or devices by function, department, or security requirements, independent of physical location.  
- **Reduced broadcast traffic**: Limiting the size of broadcast domains improves performance.  
- **Enhanced security**: Devices in different VLANs are isolated unless explicit routing is provided.

### VLAN Trunking

To transmit multiple VLANs across a single physical link, **trunking** is used. Concepts:

- **Trunk ports** carry frames from multiple VLANs between switches.  
- Each frame is **tagged** with its VLAN identifier (e.g., using 802.1Q encapsulation).  
- Trunking enables efficient inter-VLAN communication and scalability across the network backbone.

---

## Spanning Tree Protocol (STP)

Redundant links between switches increase network resilience but create the risk of **Layer 2 loops**, which can cause broadcast storms and MAC table instability. **STP** addresses this by:

- Electing a **root bridge**, which serves as the reference point for path calculations.  
- Dynamically **blocking redundant ports** to maintain a single active path between switches.  
- Re-activating blocked links automatically if active paths fail, preserving connectivity without loops.

STP ensures a **loop-free topology** while maintaining redundancy for fault tolerance.

---

## Conceptual Troubleshooting

When analyzing a switched network:

- Verify that VLANs are assigned consistently and that devices are in the correct logical segments.  
- Ensure that trunk links carry all required VLANs and that tagging matches across devices.  
- Confirm STP topology is functioning correctly, identifying which ports are forwarding or blocked.  
- Check MAC address tables to ensure that frames are being learned and forwarded properly.  
- Monitor port-level security policies conceptually to ensure they do not block legitimate devices.

---

## Summary

Switching and VLANs enable:

- Efficient frame delivery within LANs  
- Logical segmentation and isolation  
- Redundant, loop-free topologies via STP  
- Scalable inter-VLAN connectivity through trunking  

These concepts are foundational for understanding modern enterprise LAN design, traffic management, and network resilience.