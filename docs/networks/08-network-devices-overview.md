---
title: "Network Devices Overview"
sidebar_label: "Network Devices"
sidebar_position: 8
---

# Network Devices Overview

A survey of the physical and logical devices that make up a network, organized by which OSI layer they primarily operate at. Deeper treatment of each device type appears in dedicated pages throughout this reference.

---

## Devices by OSI Layer

```
Layer 7 (Application)  — Firewalls (NGFW), Load Balancers (L7), Proxy servers, WAN optimizers
Layer 4 (Transport)    — Load Balancers (L4), some firewalls
Layer 3 (Network)      — Routers, Layer 3 switches, Layer 3 firewalls
Layer 2 (Data Link)    — Switches, Bridges, Wireless Access Points, NICs
Layer 1 (Physical)     — Hubs, Repeaters, Cabling, Media converters
```

---

## Hub (Layer 1) — Historical

```
Function: receives an electrical signal on one port and repeats it out 
          EVERY other port, with no intelligence about addressing

Characteristics:
- Pure signal repeater/amplifier — operates purely at Layer 1
- ALL ports share a single collision domain (only one device can transmit
  at a time without a collision — see Switching Fundamentals)
- ALL ports share a single broadcast domain
- Half-duplex only

Status: essentially extinct in modern networks, replaced entirely by
switches. Understanding hubs matters mainly for historical context and
for understanding WHY switches were such an improvement.
```

---

## Repeater (Layer 1) — Historical

```
Function: regenerates a weakening electrical/optical signal to extend
          the maximum distance a cable run can cover

Status: largely obsolete as a standalone device for LAN — functionality
absorbed into switches, media converters, and fiber transceivers.
Conceptually still relevant: every switch port that regenerates a signal
is, in a sense, performing a repeater's original function.
```

---

## Bridge (Layer 2) — Historical (Conceptual Ancestor of the Switch)

```
Function: connects two LAN segments, forwarding frames between them
          based on MAC address, while filtering out unnecessary traffic
          (unlike a hub/repeater which blindly repeats everything)

Characteristics:
- Builds a MAC address table by learning source addresses
- Creates SEPARATE collision domains per segment (this was the key
  innovation — see Switching Fundamentals)
- Typically had few ports (2-4), software-based forwarding (slow)

Status: superseded by switches, which are essentially multi-port
bridges implemented in hardware (ASICs) for far greater speed and
port density. The term "bridge" still appears in some standards
documentation and in virtual networking (Linux bridge interfaces).
```

---

## Switch (Layer 2, and Layer 3 for "multilayer" switches)

```
Function: forwards frames between devices on the same network based on
          learned MAC addresses, creating a separate collision domain
          per port

Characteristics:
- Each port = its own collision domain (full-duplex eliminates collisions
  entirely on modern switches)
- All ports in the same VLAN = one broadcast domain (unless segmented
  further — see VLANs)
- Hardware-based forwarding via ASICs — extremely fast, line-rate switching
- Modern "Layer 3 switches" can also route between VLANs, blurring the
  traditional switch/router distinction

Types:
  Unmanaged switch — no configuration interface, plug-and-play, used in
                      home/very small networks
  Managed switch    — full configuration (VLANs, STP, port security, etc.),
                       standard for any business network
  Layer 3 switch     — adds routing capability, common in datacenter and
                        campus distribution/core layers
```

Full depth: [Switching Fundamentals](./12-switching-fundamentals.md).

---

## Router (Layer 3)

```
Function: forwards packets BETWEEN different networks based on IP address,
          using a routing table to determine the best path

Characteristics:
- Each interface is typically on a different IP subnet
- Each router interface = a separate broadcast domain boundary
- Maintains a routing table — built via static routes, directly connected
  routes, and/or dynamic routing protocols (OSPF, EIGRP, BGP)
- Performs the actual "routing decision": given a destination IP, which
  interface/next-hop should this packet go out?

Historically routers were software-based (general purpose CPU running
routing software); modern routers use specialized ASICs for high-speed
forwarding while keeping the control plane (routing protocol computation)
in software/CPU — this hardware/software split is a recurring theme
across modern networking (see also SDN Fundamentals).
```

Full depth: [Routing Fundamentals](./30-routing-fundamentals.md) and the entire Part 4 — Routing section.

---

## Firewall (Layer 3/4, or Layer 7 for NGFW)

```
Function: enforces security policy by permitting or denying traffic based
          on rules

Evolution:
  Packet-filtering firewall (1980s-90s) — inspects each packet in isolation
    against static rules (source/dest IP, port, protocol) — no awareness
    of connection state

  Stateful firewall (1990s-2000s) — tracks the state of active connections,
    automatically permitting return traffic for an established outbound
    connection without needing an explicit inbound rule — a massive
    usability and security improvement

  Next-Generation Firewall / NGFW (2000s-present) — adds deep packet
    inspection, application awareness (can distinguish "this is Netflix
    traffic" vs "this is generic HTTPS"), intrusion prevention (IPS),
    URL filtering, and often integrated threat intelligence
```

Full depth: [Firewalls](./54-firewalls-and-ids.md).

---

## Load Balancer (Layer 4 or Layer 7)

```
Function: distributes incoming traffic across multiple backend servers
          to improve availability and performance

Layer 4 Load Balancer — balances based on IP address and port only,
  doesn't inspect application content, very fast

Layer 7 Load Balancer — balances based on application-layer content
  (HTTP headers, URL paths, cookies), enabling smarter routing decisions
  (e.g. "/api/*" requests go to API servers, "/images/*" go to a CDN-like
  tier) but with higher processing overhead
```

---

## Wireless Access Point (Layer 2, primarily)

```
Function: bridges wireless (802.11) clients to the wired network

Characteristics:
- Operates primarily at Layer 2, translating between 802.11 frames
  and Ethernet frames
- Autonomous AP — fully self-contained, configured individually
- Lightweight AP (LWAP) — managed centrally by a Wireless LAN Controller
  (WLC), the dominant model in enterprise deployments today
```

Full depth: Part 8 — Wireless Networking.

---

## Modem (Layer 1)

```
Function: MOdulator-DEModulator — converts digital signals from a
          computer/router into a format suitable for transmission over
          a different medium (telephone line, cable, fiber) and back

Types:
  Dial-up modem      — historical, converted digital data to audio tones
                        over analog telephone lines (up to 56 Kbps)
  DSL modem          — uses telephone lines but at higher frequencies
                        than voice, allowing simultaneous phone + internet
  Cable modem        — uses DOCSIS over coaxial cable TV infrastructure
  Fiber ONT          — Optical Network Terminal, converts fiber optic
                        signal to Ethernet at the customer premises
```

---

## Media Converter (Layer 1)

```
Function: converts a signal from one physical medium type to another
          (e.g. copper Ethernet to fiber optic) without altering the
          data itself — a pure Layer 1 device
```

---

## Proxy Server (Layer 7)

```
Function: acts as an intermediary for client requests, forwarding them
          to the destination server on the client's behalf

Forward Proxy — sits in front of CLIENTS, used for content filtering,
                caching, anonymizing client requests (common in corporate
                networks for outbound web traffic control)

Reverse Proxy — sits in front of SERVERS, used for load balancing, SSL
                termination, caching, and hiding backend server details
                from the outside world (e.g. nginx, HAProxy as reverse
                proxies in front of web application servers)
```

---

## Device Comparison Summary Table

| Device | OSI Layer | Forwards Based On | Collision Domain | Broadcast Domain |
|---|---|---|---|---|
| Hub | 1 | Nothing (repeats all) | 1 shared across all ports | 1 shared across all ports |
| Switch | 2 (some L3) | MAC address | 1 per port | 1 per VLAN |
| Router | 3 | IP address | 1 per interface | 1 per interface |
| Firewall | 3/4/7 | Rules (IP/port/app) | N/A (routes/bridges) | Depends on mode |
| Access Point | 2 | MAC address (wireless↔wired) | Shared RF medium | Typically bridges to wired VLAN |

---

## Tips

- The fastest way to estimate the scope of a broadcast or collision domain in a diagram: every switch port is its own collision domain; every router interface (or VLAN boundary) is its own broadcast domain.
- "Layer 3 switch" and "router" are increasingly blurred terms in modern hardware — the practical distinction is usually port density and interface types (switches: many copper/fiber LAN ports; routers: often fewer ports but more WAN-oriented interfaces and richer routing protocol support) rather than a hard technical line.
- When diagramming a network, labeling each device with its OSI layer is a fast sanity check — if you've drawn a "router" forwarding based on MAC address, something is conceptually wrong in the diagram.

---

## Summary

- Devices are best understood by which OSI layer they primarily operate at: hubs (L1), switches (L2), routers (L3), most firewalls (L3/4/7).
- Hubs and bridges are historically important but functionally obsolete, replaced by switches which combine bridging's intelligence with hardware-speed forwarding.
- The stateful-to-NGFW evolution of firewalls mirrors a broader trend in networking: moving from simple, blind forwarding rules toward context-aware, application-intelligent decision making.
- Every switch port is its own collision domain; every router interface is its own broadcast domain — this single rule resolves most "how many domains are in this diagram" questions.
- Modern "Layer 3 switches" blur the traditional switch/router boundary, reflecting how networking hardware has converged capabilities once split across dedicated device types.
