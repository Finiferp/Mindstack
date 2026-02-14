---
title: "Network Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 2
---

# Network Fundamentals

At the core of networking is the **OSI model**, a conceptual 7-layer framework (Physical, Data Link, Network, Transport, Session, Presentation, Application) that describes how data moves through a network. Understanding OSI helps isolate functions for troubleshooting. Modern networks often use the TCP/IP model (Internet, Transport, Application layers), which roughly aligns with OSI layers.

The **physical layer** (Layer 1) includes the transmission media and hardware. Common wired media are *twisted-pair copper* (Ethernet cables), *coaxial cable*, and *fiber-optic* cable. Wireless media (Wi-Fi, Bluetooth) use radio frequencies to transmit data without cables. Each medium has its trade-offs: for example, fiber supports very high speeds and long distances with low interference, while copper (Cat5/6) is cost-effective for most LANs.

The **Data Link layer** (Layer 2) handles local network switching. It uses *MAC addresses* (hardware addresses) on each Network Interface Card (NIC) to forward frames. A switch builds a MAC address table by learning which MAC is on which port. Unlike a simple hub (which repeats incoming data to all ports), a switch forwards each frame only to the correct port using the MAC table. This greatly reduces collisions and improves network efficiency.

In a *star topology*, each host connects to a central hub or switch. The hub/switch manages all traffic: when one device sends data, the hub forwards it to the destination. A hub in a star broadcasts every incoming frame to all ports (like a bus), whereas a switch in a star sends each frame only to the intended host. This means a cable failure affects only one link (isolating one host) rather than the entire LAN.

A *fully connected (mesh) topology* has every node connected to every other node. This provides maximum redundancy and no single point of failure, but requires many links. In practice, large networks use partial mesh (redundant links among key switches). Topology design impacts scalability and fault tolerance.

Another key concept is **IP addressing**. Each device on an IP network has a unique IP address. For example, IPv4 addresses are 32-bit numbers written in dotted-decimal form (e.g. `192.168.1.1`). IPv6 uses 128-bit hexadecimal addresses (e.g. `2001:0db8::1`) for a much larger address space. IP addresses are divided into network and host portions (controlled by the subnet mask), enabling routers to forward packets between different networks.

Subnetting divides IP networks into smaller segments. For example, a /24 mask (255.255.255.0) means the first 24 bits are the network ID and the remaining 8 bits define hosts. Efficient IP planning uses private address ranges (like 10.x.x.x or 192.168.x.x for IPv4, or unique-local addresses for IPv6) to conserve public addresses and enhance security.
