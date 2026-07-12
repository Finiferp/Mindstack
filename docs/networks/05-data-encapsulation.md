---
title: "Data Encapsulation"
sidebar_label: "Data Encapsulation"
sidebar_position: 5
---

# Data Encapsulation

Encapsulation is the process of wrapping data with protocol-specific headers (and sometimes trailers) as it moves down the protocol stack for transmission, and decapsulation is the reverse process as it moves up the stack at the receiver. This is the mechanical process that makes the layered model (OSI/TCP-IP) actually work in practice.

---

## The Encapsulation Process — Sending Data

When an application sends data, each layer adds its own header (encapsulates) before passing it to the layer below:

```
Application Layer:    [ HTTP Data ]
                            │  Application creates the data (e.g. an HTTP GET request)
                            ▼
Transport Layer:    [TCP Hdr][ HTTP Data ]
                            │  TCP adds source/destination PORT numbers, sequence numbers
                            │  → now called a SEGMENT
                            ▼
Internet Layer:  [IP Hdr][TCP Hdr][ HTTP Data ]
                            │  IP adds source/destination IP ADDRESSES
                            │  → now called a PACKET
                            ▼
Link Layer: [Eth Hdr][IP Hdr][TCP Hdr][ HTTP Data ][Eth Trailer]
                            │  Ethernet adds source/destination MAC ADDRESSES + FCS trailer
                            │  → now called a FRAME
                            ▼
Physical Layer:    101001110100101011001011...
                            │  Converted to electrical/optical/radio signals
                            │  → now just called BITS
```

**Each layer only understands its own header.** A switch reading a frame only cares about the Ethernet header (MAC addresses) — it doesn't parse the IP header inside. A router reads the IP header to make a forwarding decision but doesn't need to inspect the TCP header (though many modern routers/firewalls do for QoS or security purposes — this is the exception, not the base requirement).

---

## The Decapsulation Process — Receiving Data

At the destination, the process runs in reverse — each layer **strips its own header** before passing the remainder up to the layer above:

```
Physical Layer:    101001110100101011001011...
                            │  Bits received, reassembled into a frame
                            ▼
Link Layer: [Eth Hdr][IP Hdr][TCP Hdr][ HTTP Data ][Eth Trailer]
                            │  NIC checks destination MAC — is it for me?
                            │  Strips Ethernet header/trailer, checks FCS for errors
                            ▼
Internet Layer:  [IP Hdr][TCP Hdr][ HTTP Data ]
                            │  IP checks destination IP — is it for me?
                            │  Strips IP header, passes up based on Protocol field (TCP=6, UDP=17)
                            ▼
Transport Layer:    [TCP Hdr][ HTTP Data ]
                            │  TCP checks destination PORT — which application?
                            │  Strips TCP header, reassembles segments in order
                            ▼
Application Layer:    [ HTTP Data ]
                            │  Delivered to the web server/browser application
```

---

## PDU (Protocol Data Unit) Names — Full Reference

```
Layer                    PDU Name
─────────────────────────────────────
Application (L7/L5-7)    Data / Message
Transport (L4)           Segment (TCP) or Datagram (UDP)
Internet/Network (L3)    Packet
Link/Data Link (L2)      Frame
Physical (L1)            Bits
```

Using these terms precisely matters: saying "the packet is dropping" implies a Layer 3 issue (routing), while "the frame is malformed" implies a Layer 2 issue (switching/NIC) — imprecise terminology obscures where in the stack a problem actually lives.

---

## Header Structure — What Each Layer Adds

```
Ethernet Header (Layer 2) — typically 14 bytes + 4 byte FCS trailer:
┌──────────────┬──────────────┬──────┬─────────┬─────┐
│ Dest MAC (6B)│ Src MAC (6B) │ Type │ Payload │ FCS │
└──────────────┴──────────────┴──────┴─────────┴─────┘

IPv4 Header (Layer 3) — 20 bytes minimum:
┌──────┬──────┬─────────┬────────────┬──────────────┬─────────────┐
│ Ver  │ IHL  │ TTL     │ Protocol   │ Src IP (4B)  │ Dst IP (4B) │ ...
└──────┴──────┴─────────┴────────────┴──────────────┴─────────────┘

TCP Header (Layer 4) — 20 bytes minimum:
┌──────────┬──────────┬────────────┬─────┬─────────────┬─────┐
│ Src Port │ Dst Port │ Seq Number │ Ack │ Flags/Window│ ... │
└──────────┴──────────┴────────────┴─────┴─────────────┴─────┘

UDP Header (Layer 4) — 8 bytes only (much simpler than TCP):
┌──────────┬──────────┬─────────┬──────────┐
│ Src Port │ Dst Port │ Length  │ Checksum │
└──────────┴──────────┴─────────┴──────────┘
```

Full header field breakdowns: see [Ethernet Fundamentals](./10-ethernet-fundamentals.md), [IPv4 Fundamentals](./20-ipv4-fundamentals.md), [TCP Fundamentals](./40-tcp-fundamentals.md), and [UDP](./42-udp.md).

---

## Why Each Layer's Header Matters

| Header | Key Fields | Purpose |
|---|---|---|
| Ethernet | Destination/Source MAC, EtherType | Get the frame to the correct device on the *local* link |
| IP | Destination/Source IP, TTL, Protocol | Get the packet to the correct device *anywhere* on the internetwork |
| TCP/UDP | Destination/Source Port | Get the data to the correct *application/process* on that device |

This is the famous "three addresses" needed to deliver data precisely: **MAC address** (which physical device on this segment), **IP address** (which device anywhere in the world), **port number** (which application on that device). Losing or corrupting any one of these breaks delivery at a different layer — useful diagnostic insight.

---

## MTU and Fragmentation

The **Maximum Transmission Unit (MTU)** is the largest frame/packet size a given link can carry.

```
Standard Ethernet MTU: 1500 bytes (payload, excluding Ethernet header/trailer)
Jumbo Frames:          up to 9000 bytes (used in datacenters/storage networks for efficiency)
PPPoE links:            often reduced to 1492 bytes (8 bytes of PPPoE overhead)
```

If a packet is larger than the MTU of a link it needs to cross:

- **IPv4** — routers can fragment the packet into smaller pieces (unless the "Don't Fragment" (DF) bit is set in the IP header, in which case the router drops it and sends an ICMP "Fragmentation Needed" message back to the source).
- **IPv6** — routers do NOT fragment packets in transit at all. Fragmentation, if needed, must happen at the *source* host. This is a deliberate IPv6 design simplification that pushes the complexity to the edges, similar in philosophy to how TCP/IP pushed reliability to the edges instead of the network core.

**Path MTU Discovery (PMTUD)** is the mechanism by which a sending host determines the smallest MTU along an entire path to avoid fragmentation entirely — it works by sending packets with the DF bit set and reducing the packet size in response to ICMP "fragmentation needed" messages until no more such messages are received.

```
Common PMTUD failure mode: a firewall along the path blocks ALL ICMP
(including the "fragmentation needed" message), causing large packets
to silently vanish with no error — a classic, hard-to-diagnose issue
known as a "PMTUD black hole." Lesson: never blanket-block ICMP.
```

---

## Worked Example — Encapsulation in Action

A user types `https://example.com` into a browser:

```
1. Application Layer: Browser builds an HTTP GET request:
   "GET / HTTP/1.1\r\nHost: example.com\r\n..."

2. Transport Layer: TCP wraps it in a segment:
   [Src Port: 51234, Dst Port: 443, Seq: 1000, ...] + [HTTP request]
   (Port 443 indicates HTTPS — also triggers TLS encryption at this stage in practice)

3. Internet Layer: IP wraps the segment in a packet:
   [Src IP: 192.168.1.50, Dst IP: 93.184.216.34, TTL: 64, Protocol: 6 (TCP)] + [TCP segment]

4. Link Layer: Ethernet wraps the packet in a frame:
   [Dst MAC: <default gateway's MAC>, Src MAC: <my NIC's MAC>, Type: 0x0800 (IPv4)]
     + [IP packet] + [FCS]

5. Physical Layer: The frame is converted to electrical signals (copper) 
   or light pulses (fiber) or radio waves (Wi-Fi) and transmitted.
```

Notice the **destination MAC address is the default gateway's MAC**, not the web server's — because the web server is on a different network, the frame only needs to reach the *next hop* (the router), which will decapsulate, make a routing decision, and re-encapsulate in a new frame with a new destination MAC for the next hop. The **destination IP address**, by contrast, stays the same as the original web server's IP for the entire journey across the Internet — this MAC-changes-but-IP-stays-the-same pattern is one of the most important things to internalize about how routing actually works hop by hop.

---

## Tips

- When troubleshooting with a packet capture tool (Wireshark), encapsulation is visible literally — you can expand each layer's header in the capture and see exactly what each protocol added.
- Remember: MAC addresses change at every hop (router); IP addresses stay constant for the whole journey (barring NAT). This single fact resolves a huge amount of confusion for people new to routing.
- If large file transfers mysteriously fail or hang (but small ones work fine), suspect a Path MTU Discovery black hole caused by ICMP being blocked somewhere on the path.

---

## Summary

- Encapsulation wraps data with each layer's own header as it descends the stack for transmission; decapsulation strips those headers as it ascends the stack at the receiver.
- PDU names change at each layer: Data → Segment/Datagram → Packet → Frame → Bits.
- MAC addresses identify devices on the *local* link and change at every router hop; IP addresses identify devices *globally* and remain constant for the journey (without NAT); ports identify the specific application.
- MTU defines the largest frame a link can carry; IPv4 routers can fragment oversized packets in-transit, but IPv6 explicitly does not — fragmentation must happen at the source.
- Path MTU Discovery relies on ICMP messages — blocking all ICMP at a firewall is a common cause of mysterious, hard-to-diagnose large-transfer failures.
