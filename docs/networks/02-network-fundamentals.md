---
title: "Network Fundamentals"
sidebar_label: "Network Fundamentals"
sidebar_position: 2
---

# Network Fundamentals

A network is a collection of devices connected together to share resources and communicate. This page establishes the vocabulary and conceptual building blocks used throughout the rest of this reference.

---

## What Is a Network?

At minimum, a network requires:

- **Two or more end devices** (hosts) — computers, phones, servers, IoT devices
- **A medium** to carry signals between them — copper cable, fiber, or radio waves
- **A shared protocol** — an agreed-upon set of rules so devices can understand each other
- **(Usually) intermediate devices** — switches, routers, access points that relay traffic between hosts that aren't directly connected

The purpose of a network is **resource sharing**: files, printers, internet access, compute power, and communication itself (voice, video, messaging).

---

## Types of Network Devices

| Category | Examples | Role |
|---|---|---|
| **End devices (hosts)** | PCs, laptops, phones, servers, printers, IoT sensors | Source/destination of data |
| **Intermediate devices** | Switches, routers, access points, firewalls | Forward and direct traffic between end devices |
| **Network media** | Copper (UTP), fiber optic, wireless (RF) | Physically carries the signal |

---

## Network Size Classifications

```
PAN  (Personal Area Network)   — a few meters    — Bluetooth earbuds to phone
LAN  (Local Area Network)      — building/campus  — office network, home network
CAN  (Campus Area Network)     — multiple buildings, one organization
MAN  (Metropolitan Area Network) — a city          — municipal fiber network
WAN  (Wide Area Network)       — country/continent — connects multiple LANs over long distances
GAN  (Global Area Network)     — the Internet itself
```

- **LAN** — high speed, low cost per bit, typically owned and fully controlled by one organization (e.g. Ethernet/Wi-Fi in an office).
- **WAN** — connects geographically separated LANs, typically leased from a service provider, historically much slower and more expensive per bit than LAN links (though this gap has narrowed with modern fiber).
- **Intranet** — a private network using Internet protocols (TCP/IP, HTTP) but restricted to an organization.
- **Extranet** — a controlled extension of an intranet to external partners (e.g. supplier portals).
- **Internet** — the global, public "network of networks" with no single owner, interconnected by agreements between Internet Service Providers (ISPs) and a shared global addressing scheme.

---

## Network Topologies

A topology describes how devices are interconnected — both **physical** (actual cabling) and **logical** (how data actually flows, which may differ from the physical layout).

```
Bus Topology:
    A───B───C───D───E       (single shared cable — legacy Ethernet, mostly historical)

Star Topology:
        A
        │
    B───●───D     (● = central switch/hub — dominant LAN topology today)
        │
        C

Ring Topology:
    A───B
    │   │
    D───C          (each device connects to exactly two neighbors — Token Ring, SONET)

Mesh Topology (full):
    A───B
    │╲ ╱│
    │ X │
    │╱ ╲│
    D───C          (every device connects to every other — max redundancy, max cost)

Partial Mesh:
    A───B
        │
    D───C          (some but not all direct connections — common WAN/datacenter design)

Hybrid Topology:
    Combination of the above — e.g. star-of-stars (hierarchical), 
    common in real enterprise networks (access-distribution-core)
```

| Topology | Pros | Cons |
|---|---|---|
| Bus | Cheap, simple | Single point of failure (the cable), collision-prone, hard to troubleshoot |
| Star | Easy to manage, fault isolation (one cable failing doesn't take down others) | Central device is a single point of failure |
| Ring | Predictable performance (token-based) | One broken link can disrupt the whole ring (mitigated with dual-ring designs) |
| Full Mesh | Maximum redundancy, no single point of failure | Expensive — n(n-1)/2 links for n nodes, doesn't scale |
| Partial Mesh | Good balance of redundancy and cost | More complex routing/design decisions |
| Hybrid | Matches real-world scale and redundancy needs | More complex to design and document |

**Modern reality**: virtually all wired LANs today are physically star-topology (cables radiate from a switch), but historically (1980s-90s) bus and ring were common due to cheaper cabling requirements at the time.

---

## Logical vs Physical Topology

- **Physical topology** — how cables/wireless links are actually laid out.
- **Logical topology** — how data actually flows, which may not match the physical layout.

Example: a Token Ring network was physically wired as a **star** (using a Multistation Access Unit, MAU) but operated **logically** as a ring (token passed in a circular order). Modern Ethernet is physically a star/hierarchy but, with VLANs and broadcast domains, can be logically structured very differently from its physical cabling.

---

## Network Architectures

### Peer-to-Peer

Every device can act as both client and server — no centralized control.

```
   PC-A ←──→ PC-B
     ↑         ↑
     └──→ PC-C ┘
```

- **Pros**: simple, cheap, no dedicated server hardware needed.
- **Cons**: doesn't scale, inconsistent security, hard to manage at scale.
- **Examples**: home file sharing, BitTorrent, early Windows workgroups.

### Client-Server

Centralized servers provide services; clients consume them.

```
   Client-A ──┐
   Client-B ──┼──→ [ Server ]
   Client-C ──┘
```

- **Pros**: centralized management, security, and backup; scales well.
- **Cons**: server is a potential single point of failure and bottleneck (mitigated with redundancy/load balancing).
- **Examples**: virtually all modern enterprise networks, web applications, email.

---

## Bandwidth, Throughput, and Latency

These three terms are frequently confused but mean different things.

```
Bandwidth   — the theoretical maximum capacity of a link (e.g. "1 Gbps Ethernet")
Throughput  — the actual measured data transfer rate, always ≤ bandwidth
Goodput     — throughput minus protocol overhead (just the useful application data)
Latency     — the time for a signal/packet to travel from source to destination (delay)
Jitter      — the variation in latency over time (critical for voice/video)
```

- Bandwidth is like the width of a highway; throughput is how many cars actually get through given traffic, accidents, and merging.
- Latency matters enormously for real-time applications (voice, gaming, video calls) even when bandwidth is abundant — a satellite link can have huge bandwidth but 500+ ms latency, making it poor for interactive use.
- **Round-Trip Time (RTT)** — the time for a packet to go to a destination and the response to come back; commonly measured with `ping`.

---

## Bit Rate Units — Don't Confuse Bits and Bytes

```
Networking conventionally measures speed in BITS per second:
  1 Kbps = 1,000 bits/sec
  1 Mbps = 1,000,000 bits/sec
  1 Gbps = 1,000,000,000 bits/sec

File sizes are conventionally measured in BYTES:
  1 KB = 1,024 bytes (or 1,000 in marketing contexts — ambiguous, hence KiB/MiB/GiB)
  1 MB = 1,024 KB
  1 GB = 1,024 MB

Conversion: 1 byte = 8 bits
  A "100 Mbps" link can theoretically transfer ~12.5 MB per second (100/8), not 100 MB/sec
```

---

## Simplex, Half-Duplex, Full-Duplex

```
Simplex      — one direction only             (A ──→ B, e.g. broadcast radio)
Half-Duplex  — both directions, one at a time (A ←─→ B, e.g. old hub-based Ethernet, walkie-talkies)
Full-Duplex  — both directions simultaneously (A ⇄ B, e.g. modern switched Ethernet, phone calls)
```

Modern switched Ethernet operates full-duplex, eliminating the collision domain problem entirely on point-to-point switch links (see [Switching Fundamentals](./12-switching-fundamentals.md)).

---

## Network Reliability Goals

Cisco and most networking curricula describe four pillars of network reliability:

```
Fault Tolerance    — the network limits the impact of a failure, recovers quickly (redundancy)
Scalability        — the network can grow to accommodate new users/applications without major redesign
Quality of Service — the network can prioritize traffic to meet application requirements (voice > bulk download)
Security           — the network protects data and infrastructure from threats
```

---

## Tips

- When troubleshooting "the network is slow," always clarify: is it a bandwidth problem, a latency problem, or packet loss? They require entirely different fixes.
- Don't confuse Mbps (megabits) with MBps (megabytes) — a common source of confusion when interpreting download speeds vs file transfer times.
- Physical topology diagrams are useful for cabling and hardware planning; logical topology diagrams (showing VLANs, routing domains) are more useful for understanding traffic flow.

---

## Summary

- A network requires end devices, intermediate devices, media, and a shared protocol.
- Networks are classified by size (PAN/LAN/MAN/WAN) and by architecture (peer-to-peer vs client-server).
- Topology can be physical (actual cabling) or logical (actual data flow) — these often differ.
- Star topology dominates modern wired LANs; full mesh is reserved for small, high-redundancy needs due to its n(n-1)/2 scaling cost.
- Bandwidth is theoretical capacity; throughput is actual measured performance; latency is delay — all three matter independently.
- Networking speeds are measured in bits per second; file sizes in bytes — always convert carefully (÷8).
- Modern switched networks operate full-duplex, eliminating shared-medium collisions present in early Ethernet.
