---
title: "Standards Bodies & the RFC Process"
sidebar_label: "Standards Bodies"
sidebar_position: 9
---

# Standards Bodies & the RFC Process

Networking works globally because of voluntary, collaborative standards — no single company or government controls how the Internet's protocols work. This page covers the organizations that create and maintain those standards, and the open process behind them.

---

## Why Standards Matter

Without agreed standards, a device from one manufacturer couldn't communicate with a device from another. Standards bodies solve this coordination problem by publishing open specifications that any vendor can implement, enabling true multi-vendor interoperability — the entire reason your laptop can connect to a coffee shop's Wi-Fi router from a completely different manufacturer and reach a web server hosted by yet another company, all working flawlessly together.

---

## IETF — Internet Engineering Task Force

```
Founded: 1986
Scope:   develops and maintains Internet protocol standards (TCP/IP suite,
         routing protocols, application protocols, security protocols)
Process: open, consensus-driven, working-group based — "rough consensus
         and running code" is the famous IETF philosophy: working
         implementations matter more than theoretical perfection
Output:  RFCs (Request for Comments) — see below
```

The IETF has no formal membership — anyone can participate in working groups, propose drafts, and contribute to discussions, embodying the open, meritocratic culture established by ARPANET's original RFC tradition (see [History of Networking](./01-history-of-networking)).

### IETF Organizational Structure

```
IETF
 ├── IESG (Internet Engineering Steering Group) — manages the standards process
 ├── IAB  (Internet Architecture Board)          — oversight, architectural guidance
 └── Working Groups — organized by topic area (Routing, Security, Transport, etc.)
       Each working group drafts, discusses, and refines proposed standards
```

---

## The RFC Process

A **Request for Comments (RFC)** is the IETF's standards document format — despite the informal-sounding name (a holdover from the earliest, genuinely casual ARPANET-era documents), RFCs are the authoritative specifications for virtually every core Internet protocol.

```
RFC Lifecycle:
1. Internet-Draft — a working proposal, valid for 6 months, can be revised
2. Working Group review and discussion (often spans months to years)
3. IESG review
4. Published as an RFC with a permanent number — RFCs are NEVER revised or
   deleted once published; if changes are needed, a NEW RFC supersedes
   the old one (e.g. RFC 793 defined TCP in 1981; RFC 9293 obsoletes/updates it)

RFC Status Categories:
  Informational    — provides information, not a standard
  Experimental     — describes experimental protocols/ideas
  Best Current Practice (BCP) — recommended practices, not strict protocol specs
  Standards Track  — Proposed Standard → Internet Standard (full maturity)
  Historic         — obsolete, no longer recommended
```

### Famous RFCs Worth Knowing

```
RFC 791   — Internet Protocol (IPv4), 1981
RFC 793   — Transmission Control Protocol (TCP), 1981 (obsoleted by RFC 9293, 2022)
RFC 1034/1035 — Domain Name System (DNS), 1987
RFC 1918  — Address Allocation for Private Internets (the "private IP ranges"), 1996
RFC 2131  — Dynamic Host Configuration Protocol (DHCP), 1997
RFC 2460  — Internet Protocol, Version 6 (IPv6), 1998 (obsoleted by RFC 8200, 2017)
RFC 2616  — Hypertext Transfer Protocol -- HTTP/1.1, 1999 (later split/obsoleted)
RFC 4271  — Border Gateway Protocol 4 (BGP-4), 2006
RFC 791's "be liberal in what you accept, conservative in what you send"
  (Postel's Law) remains one of the most cited design philosophies in
  protocol engineering, for better and for worse — it enabled
  interoperability but also allowed bugs/ambiguity to persist for decades.
```

---

## IEEE — Institute of Electrical and Electronics Engineers

```
Founded: 1963 (merger of AIEE and IRE, themselves dating to the 1880s-1910s)
Scope:   broad electrical/electronics engineering standards; for networking,
         the critical body is IEEE 802, which standardizes LAN/MAN technologies
Process: formal voting process among member organizations and individuals,
         more structured/slower than IETF's rough-consensus model
```

### IEEE 802 — The LAN/MAN Standards Committee

```
802.1   — Bridging and Network Management (includes 802.1Q VLAN tagging,
          802.1X port-based access control, 802.1D Spanning Tree)
802.2   — Logical Link Control (LLC sublayer)
802.3   — Ethernet (the most economically significant standard in
          networking history — see Ethernet Fundamentals)
802.5   — Token Ring (largely historical now)
802.11  — Wireless LAN / Wi-Fi (see Wireless Fundamentals)
802.15  — Wireless PAN (includes Bluetooth's underlying standard, Zigbee)
802.16  — WiMAX (largely superseded by LTE/5G in practice)
```

802.3 (Ethernet) and 802.11 (Wi-Fi) are, by a wide margin, the two most commercially significant networking standards ever produced by any standards body — virtually every wired and wireless LAN device on Earth implements one or both.

---

## ISO — International Organization for Standardization

```
Founded: 1947
Scope:   broad international standardization across virtually all
         industries (not just networking) — for networking, ISO's most
         famous contribution is the OSI Reference Model (ISO/IEC 7498)
Process: formal, government-backed national standards bodies represent
         their countries in ISO technical committees — slower and more
         bureaucratic than IETF's open working-group model
```

ISO's OSI model "lost" the protocol wars to TCP/IP in terms of actual implementation, but remains, ironically, ISO's most pedagogically influential networking contribution decades later (full history in [History of Networking](./01-history-of-networking)).

---

## ITU — International Telecommunication Union

```
Founded: 1865 (originally the International Telegraph Union — the OLDEST
         international standards organization still in operation, predating
         even the telephone)
Scope:   global telecommunications standards, spectrum allocation,
         satellite orbit coordination — a specialized agency of the
         United Nations since 1947
Key contributions to networking: 
  - E.164 (international telephone numbering plan)
  - X.25 (early packet-switching standard, historical)
  - G.65x series (DSL standards)
  - SDH/SONET (optical transport standards)
  - Global radio spectrum allocation (relevant to all wireless networking)
```

The ITU's telegraph-era origins (1865) make it the oldest organization discussed in this entire reference — a direct institutional link back to the very beginning of electrical communication described in [History of Networking](./01-history-of-networking).

---

## ICANN and IANA — Internet Naming and Numbering

```
IANA (Internet Assigned Numbers Authority) — founded informally in the
  1970s (originally run by Jon Postel at USC), formalized later — manages:
  - IP address allocation (to Regional Internet Registries, who then
    allocate to ISPs/organizations)
  - Autonomous System Number (ASN) allocation (used in BGP)
  - Protocol parameter registries (port numbers, EtherTypes, etc.)
  - The DNS root zone

ICANN (Internet Corporation for Assigned Names and Numbers) — founded
  1998, a nonprofit that oversees IANA's functions and coordinates the
  DNS root system and domain name policy globally — created specifically
  to transition these functions away from direct U.S. government contract
  oversight toward a more international, multi-stakeholder model

Regional Internet Registries (RIRs) — allocate IP address blocks within
  their geographic region:
    ARIN   — North America
    RIPE NCC — Europe, Middle East, parts of Central Asia
    APNIC  — Asia-Pacific
    LACNIC — Latin America and Caribbean
    AFRINIC — Africa
```

---

## Wi-Fi Alliance and Bluetooth SIG — Industry Consortiums

```
Wi-Fi Alliance — a trade association (not a formal standards body) that
  certifies interoperability of 802.11-based products and created the
  consumer-friendly "Wi-Fi" brand name and generational naming (Wi-Fi 4,
  5, 6, 6E, 7) on top of the more technical IEEE 802.11 standard numbers
  (802.11n, ac, ax, be) — IEEE defines the technical standard, the
  Wi-Fi Alliance certifies and markets it

Bluetooth SIG (Special Interest Group) — similarly manages the Bluetooth
  standard and certifies device interoperability
```

---

## How These Bodies Relate — A Practical Example

To understand how multiple standards bodies cooperate on a single piece of technology, consider connecting to Wi-Fi:

```
1. IEEE 802.11 defines the technical radio/MAC layer standard
2. Wi-Fi Alliance certifies your device as interoperable, branding it "Wi-Fi 6"
3. ITU coordinates international radio spectrum allocation so the 2.4/5/6 GHz
   bands are consistently available for this use worldwide
4. IETF protocols (DHCP, TCP/IP, DNS, HTTP) run ON TOP of that wireless link
   to actually deliver your web request
5. ICANN/IANA's DNS root and IP allocation systems make sure the domain
   name you typed resolves to a globally unique, reachable IP address
```

This layered cooperation across multiple independent standards bodies — none of which directly controls the others — is precisely why the Internet works as a single, coherent global system despite having no central owner.

---

## Tips

- When researching a protocol's exact specification, search for its RFC number directly (e.g. "RFC 793") rather than relying solely on secondary summaries — RFCs are the authoritative source.
- Remember the IEEE 802.X numbering pattern: 802.1 = bridging/management, 802.3 = Ethernet, 802.11 = wireless — these three are referenced constantly in real-world networking documentation and configuration.
- "Wi-Fi 6" (marketing name) = 802.11ax (technical standard) — knowing both naming conventions helps when reading older documentation that predates the Wi-Fi Alliance's generational rebrand (introduced in 2018).

---

## Summary

- The IETF (via open RFCs) standardizes the core Internet protocol suite (TCP/IP, routing, DNS, HTTP); the IEEE (via 802 committees) standardizes LAN/MAN technologies (Ethernet, Wi-Fi).
- RFCs are never edited after publication — superseding documents obsolete older ones, preserving a complete historical record of protocol evolution.
- ISO produced the OSI model, which lost the real-world implementation race to TCP/IP but remains the dominant conceptual teaching framework.
- The ITU, dating to 1865, is the oldest standards body discussed here, with roots in international telegraph coordination.
- IANA/ICANN and the five Regional Internet Registries manage the global allocation of IP addresses and AS numbers, the numbering infrastructure that makes global routing (BGP) possible.
- No single organization controls the Internet — its function depends on voluntary, open cooperation between many independent standards bodies, each responsible for a different layer or aspect of the overall system.
