---
title: "Network Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 2
---

# Network Fundamentals

Networking is fundamentally about **moving information between autonomous systems over shared infrastructure**. To understand how this works in a structured way, we rely on layered models — most notably the OSI model and the TCP/IP model.

---

## The OSI Model – Conceptual Foundation

The **OSI (Open Systems Interconnection) model** is a 7-layer conceptual framework:

1. Physical  
2. Data Link  
3. Network  
4. Transport  
5. Session  
6. Presentation  
7. Application  

It does not describe a specific protocol implementation. Instead, it provides a structured abstraction that separates networking responsibilities into clearly defined functional layers.

Each layer:

- Solves a specific part of the communication problem
- Provides services to the layer above
- Relies on services from the layer below
- Communicates logically with its peer layer on a remote system

This separation enables:

- Interoperability between vendors
- Simplified troubleshooting
- Modular protocol design
- Scalability of network architectures

In practice, modern networks use the **TCP/IP model**, which groups responsibilities into four layers:

- Network Access  
- Internet  
- Transport  
- Application  

Although TCP/IP is implementation-driven and OSI is conceptual, their responsibilities align closely.

---

## Physical Layer (Layer 1)

The Physical layer is responsible for transmitting raw bits over a communication medium. It defines:

- Voltage levels
- Signal timing
- Bit encoding
- Connectors and pinouts
- Modulation techniques

At this layer, data is no longer abstract — it becomes **electrical signals, light pulses, or radio waves**.

### Transmission Media

**Copper (Twisted Pair)**  
Used in Ethernet (Cat5e, Cat6, Cat6a).  
Advantages:
- Cost-effective
- Easy to deploy
- Suitable for short-to-medium distances

Limitations:
- Susceptible to electromagnetic interference
- Distance limited (typically 100 meters for Ethernet)

**Coaxial Cable**  
Historically used in early Ethernet and still common in broadband systems.  
Better shielding than twisted pair but less common in modern LANs.

**Fiber Optic Cable**  
Uses light instead of electricity.  
Advantages:
- Very high bandwidth
- Long-distance transmission
- Immune to electromagnetic interference

Limitations:
- Higher cost
- More delicate installation

**Wireless Media (Wi-Fi, Bluetooth)**  
Uses radio frequency spectrum.  
Advantages:
- Mobility
- Flexible deployment

Limitations:
- Shared medium
- Susceptible to interference
- Variable performance

Each medium represents a trade-off between cost, performance, distance, and reliability.

---

## Data Link Layer (Layer 2)

The Data Link layer provides **node-to-node communication** within the same local network segment.

Its primary responsibilities are:

- Framing
- Physical addressing (MAC)
- Error detection
- Media access control

### MAC Addresses

Every Network Interface Card (NIC) has a **MAC address**, a globally unique 48-bit hardware identifier.

MAC addresses operate only within the local network domain. They are not routable.

### Switching Logic

A switch operates at Layer 2 and performs intelligent frame forwarding.

It builds a **MAC address table** dynamically:

1. When a frame arrives, the switch records the source MAC and ingress port.
2. If the destination MAC is known, the frame is forwarded only to the correct port.
3. If unknown, the frame is flooded to all ports (except the source).

This learning process allows switches to create efficient forwarding paths automatically.

Unlike hubs:

- A **hub** repeats incoming bits to all ports (no intelligence).
- A **switch** forwards frames selectively, reducing collisions and improving efficiency.

Modern switches also eliminate collision domains by giving each port its own segment.

---

## Network Topologies

Topology describes the physical or logical arrangement of network devices.

### Star Topology

Each host connects to a central device (switch or hub).

Advantages:
- Easy to manage
- Isolates cable failures
- Scalable

If one link fails, only that device is affected.

### Mesh Topology

Every node connects to multiple or all other nodes.

Advantages:
- High redundancy
- Fault tolerance
- No single point of failure

Disadvantages:
- High complexity
- Expensive cabling
- Difficult scalability

In practice, enterprise networks use **partial mesh** among core or distribution switches to balance redundancy and cost.

Topology design directly impacts:

- Scalability
- Fault tolerance
- Convergence time
- Cost

---

## IP Addressing – Logical Identification

While MAC addresses operate locally, IP addresses provide **logical addressing across networks**.

An IP address serves two purposes:

1. Identifies a host
2. Identifies the network to which it belongs

### IPv4

- 32-bit address space
- Written in dotted decimal (e.g., 192.168.1.1)
- Limited address pool (~4.3 billion addresses)

### IPv6

- 128-bit address space
- Written in hexadecimal (e.g., 2001:0db8::1)
- Designed for massive scalability
- Removes broadcast
- Simplifies hierarchical routing

IPv6 was introduced primarily to address IPv4 exhaustion and improve routing efficiency.

---

## Network and Host Portions

IP addresses are divided into:

- Network portion
- Host portion

This division is defined by the **subnet mask** (IPv4) or prefix length (IPv6).

Example:

192.168.1.0/24  

- First 24 bits → Network
- Last 8 bits → Hosts

Routers use the network portion to determine where to forward packets.

---

## Subnetting – Network Segmentation

Subnetting divides larger networks into smaller logical segments.

Benefits:

- Reduced broadcast domains
- Improved security boundaries
- Efficient address utilization
- Better traffic management

Private IPv4 ranges:

- 10.0.0.0/8  
- 172.16.0.0/12  
- 192.168.0.0/16  

These ranges are not routable on the public Internet and are typically combined with Network Address Translation (NAT).

IPv6 introduces Unique Local Addresses (ULA) for similar private use cases.

---

## Why These Fundamentals Matter

Understanding:

- Physical constraints
- Switching behavior
- Logical addressing
- Topology design
- Subnetting principles

is essential before studying routing, transport protocols, security, and modern networking concepts like SDN and cloud overlays.

These fundamentals form the structural base of all higher-layer network behavior.