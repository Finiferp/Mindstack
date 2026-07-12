---
title: "VPN Technologies"
sidebar_label: "VPN Technologies"
sidebar_position: 50
---

# VPN Technologies

VPNs (Virtual Private Networks) create encrypted tunnels over untrusted networks. From IPsec site-to-site tunnels to modern WireGuard, each technology has a distinct design, use case, and trade-off.

---

## VPN Taxonomy

```
By function:
  Site-to-site VPN:  permanent encrypted tunnel between two networks
  Remote-access VPN: individual users connecting to a network (road warriors)
  MPLS VPN:          ISP-managed private WAN (covered in MPLS file)

By protocol:
  IPsec:    standard, complex, flexible; dominant for site-to-site
  SSL/TLS:  browser-compatible; used by clientless SSL VPN
  OpenVPN:  TLS-based; open source; cross-platform
  WireGuard: modern, minimal, fast; gaining rapid adoption
  L2TP:     Layer 2 tunneling (usually combined with IPsec)
  PPTP:     legacy; cryptographically broken; never use
  GRE:      tunneling without encryption (usually combined with IPsec)
```

---

## IPsec — Internet Protocol Security

IPsec (RFC 4301) operates at Layer 3 — it encrypts and authenticates IP packets. It's a framework, not a single protocol.

### IPsec Components

```
IKE (Internet Key Exchange) — negotiates security parameters and keys
AH (Authentication Header, Protocol 51) — integrity + authentication, NO encryption
ESP (Encapsulating Security Payload, Protocol 50) — integrity + authentication + ENCRYPTION
SA (Security Association) — one-directional agreement on encryption/auth parameters
ISAKMP (Internet Security Association and Key Management Protocol) — framework for IKE
```

### IKE Phases

**IKEv1** (RFC 2409) — original, widely deployed, two phases:

```
IKE Phase 1 — establish secure channel for IKE communication
  Main Mode (6 messages, slower, protects initiator identity):
    MSG 1: Initiator → Responder: SA proposals (encryption, hash, DH group, lifetime)
    MSG 2: Responder → Initiator: chosen SA
    MSG 3: Initiator → Responder: DH public key + nonce
    MSG 4: Responder → Initiator: DH public key + nonce
    MSG 5: Initiator → Responder: identity (now encrypted with derived keys)
    MSG 6: Responder → Initiator: identity (encrypted)
    → ISAKMP SA (Phase 1 SA) established

  Aggressive Mode (3 messages, faster, exposes identities):
    Less secure; used for remote access with dynamic IPs

IKE Phase 2 — negotiate IPsec SA for actual data traffic
  Quick Mode (3 messages, inside Phase 1 tunnel):
    Negotiates: ESP vs AH, encryption, integrity, DH (PFS), lifetime, traffic selectors
    → Two IPsec SAs established (one per direction)
```

**IKEv2** (RFC 7296, 2005) — redesigned, simpler, faster:

```
IKEv2 — replaces both phases with:
  IKE_SA_INIT (2 messages): establish IKE SA (crypto negotiation + key material)
  IKE_AUTH (2 messages): authenticate + establish first IPsec child SA

Total: 4 messages (vs 9 for IKEv1 Main Mode + Quick Mode)
Additional child SAs: CREATE_CHILD_SA exchange (2 messages per SA)

IKEv2 improvements:
  Built-in EAP authentication (for remote access with RADIUS)
  MOBIKE (RFC 4555): connection survives IP address change (mobile users)
  Reliability: request/response model; no ambiguous state
  Traffic selectors negotiated properly (no subnet mismatch confusion)
  Always supports PFS (Perfect Forward Secrecy) easily
```

### IPsec Modes

```
Transport Mode:
  Protects only the IP payload (TCP/UDP + data)
  Original IP header preserved (not encrypted)
  Used: host-to-host or when IP addresses aren't private (end-to-end between hosts)

  ┌──────────────────────────────────────────────────────────┐
  │ IP Header │ ESP/AH Hdr │ [encrypted: TCP + Data] │ ESP T │
  └──────────────────────────────────────────────────────────┘

Tunnel Mode:
  Encrypts the ENTIRE original IP packet
  New outer IP header added (from gateway to gateway)
  Used: site-to-site VPNs, remote access VPNs

  ┌────────────────────────────────────────────────────────────────────┐
  │ New IP Hdr │ ESP/AH Hdr │ [encrypted: Original IP Hdr + TCP + Data]│
  └────────────────────────────────────────────────────────────────────┘
```

### IPsec Tunnel Configuration (Cisco IOS — IKEv2)

```cisco
! ── IKEv2 Proposal ─────────────────────────────────────────────────────────
crypto ikev2 proposal PROPOSAL-1
 encryption aes-cbc-256 aes-cbc-128
 integrity  sha256 sha384
 group      20 19 14           ! DH groups: 20=384-bit ECDH, 19=256-bit ECDH, 14=2048-bit MODP

! ── IKEv2 Policy ────────────────────────────────────────────────────────────
crypto ikev2 policy IKEv2-POLICY
 proposal PROPOSAL-1

! ── IKEv2 Keyring (Pre-Shared Key) ─────────────────────────────────────────
crypto ikev2 keyring MY-KEYRING
 peer REMOTE-PEER
  address 203.0.113.2          ! remote peer IP
  pre-shared-key MySecretKey

! ── IKEv2 Profile ───────────────────────────────────────────────────────────
crypto ikev2 profile IKEv2-PROFILE
 match identity remote address 203.0.113.2
 authentication local pre-share
 authentication remote pre-share
 keyring local MY-KEYRING
 dpd 10 3 periodic             ! Dead Peer Detection: every 10s, retry 3, periodic

! ── IPsec Transform Set ─────────────────────────────────────────────────────
crypto ipsec transform-set TS esp-aes 256 esp-sha256-hmac
 mode tunnel

! ── IPsec Profile ───────────────────────────────────────────────────────────
crypto ipsec profile IPSEC-PROFILE
 set transform-set TS
 set ikev2-profile IKEv2-PROFILE
 set pfs group20               ! Perfect Forward Secrecy

! ── Tunnel Interface ────────────────────────────────────────────────────────
interface Tunnel10
 ip address 172.16.0.1 255.255.255.252
 tunnel source GigabitEthernet0/0      ! local WAN interface
 tunnel destination 203.0.113.2        ! remote peer
 tunnel mode ipsec ipv4
 tunnel protection ipsec profile IPSEC-PROFILE

! ── Routing over tunnel ─────────────────────────────────────────────────────
ip route 10.2.0.0 255.255.0.0 Tunnel10   ! route remote site via tunnel

! ── Verification ─────────────────────────────────────────────────────────────
show crypto ikev2 sa                      ! IKE SAs
show crypto ipsec sa                      ! IPsec SAs (packets encrypted/decrypted)
show crypto session                       ! session summary
debug crypto ikev2                        ! IKEv2 negotiation (use carefully)
```

### IPsec NAT Traversal (NAT-T)

```
Problem: IPsec ESP (Protocol 50) has no ports → NAT can't translate it
         AH (Protocol 51) includes authentication over IP header → NAT breaks auth

Solution: NAT-T (RFC 3947/3948)
  Encapsulates IKE and ESP inside UDP port 4500
  Both sides detect NAT by comparing source IP in IKE vs outer IP
  If NAT detected → switch from UDP/500 to UDP/4500
  ESP packets wrapped in UDP/4500 → NAT can translate normally

IKE port: UDP 500 (normal) → UDP 4500 (after NAT-T)
ESP: Protocol 50 → UDP 4500 (after NAT-T)
AH: Not used with NAT (AH breaks with NAT; use ESP for auth)
```

---

## GRE — Generic Routing Encapsulation

GRE (RFC 2784) creates a tunnel that can carry any Layer 3 protocol. It does NOT encrypt.

```
GRE adds 4-byte header (minimum) between outer IP and inner packet.
Commonly combined with IPsec for: tunnel → encrypt.

Use cases for GRE (without IPsec):
  Carry IPv6 over IPv4 backbone (6in4)
  Carry multicast over IP WAN (DMVPN needs GRE for multicast routing protocols)
  Carry routing protocol packets (OSPF/EIGRP) over a WAN

GRE MTU:
  GRE adds 24 bytes (4 GRE + 20 outer IP) to every packet
  Effective MTU inside GRE tunnel: 1500 - 24 = 1476 bytes
  With IPsec: reduce further by ESP overhead
  Always set ip mtu and ip tcp adjust-mss on tunnel interfaces

Cisco GRE config:
  interface Tunnel0
   ip address 172.16.0.1 255.255.255.252
   tunnel source GigabitEthernet0/0
   tunnel destination 203.0.113.2
   tunnel mode gre ip
   ip mtu 1400
   ip tcp adjust-mss 1360
```

---

## DMVPN — Dynamic Multipoint VPN

DMVPN enables any-to-any spoke connectivity without a full mesh of static tunnels.

```
Problem with classic hub-and-spoke IPsec:
  Spoke A → Hub → Spoke B (all traffic via hub; inefficient for large, redundant networks)
  100 spokes → 100 static tunnels at hub

DMVPN solution:
  Spokes register with hub using NHRP (Next Hop Resolution Protocol)
  Hub knows all spoke IP-to-tunnel-IP mappings (NHRP database)
  When Spoke A needs to talk to Spoke B:
    1. Spoke A sends packet to hub (not Spoke B yet)
    2. Hub sends NHRP resolution to Spoke A: "Spoke B is at 203.0.113.50"
    3. Spoke A creates DIRECT tunnel to Spoke B (spoke-to-spoke)
    4. Future traffic A→B bypasses hub entirely

Components:
  NHRP (Next Hop Resolution Protocol, RFC 2332): maps tunnel IP to physical IP
  mGRE (Multipoint GRE): single tunnel interface accepts from many peers
  IPsec: optional encryption (strongly recommended in production)
  Routing: OSPF or EIGRP over the DMVPN (runs over GRE, supports multicast)

DMVPN phases:
  Phase 1: hub-and-spoke only (all traffic via hub)
  Phase 2: spoke-to-spoke (A→B directly after initial hub lookup; routing must send to hub first)
  Phase 3: spoke-to-spoke with NHRP shortcuts (routing uses spoke IP directly; cleanest)

Cisco hub config:
  interface Tunnel0
   ip address 172.16.0.1 255.255.255.0
   tunnel source GigabitEthernet0/0
   tunnel mode gre multipoint
   ip nhrp map multicast dynamic         ! dynamic spoke registration for multicast
   ip nhrp network-id 1
   ip nhrp authentication MyNHRPKey
   tunnel protection ipsec profile IPSEC-PROFILE

Cisco spoke config:
  interface Tunnel0
   ip address 172.16.0.2 255.255.255.0
   tunnel source GigabitEthernet0/0
   tunnel mode gre multipoint
   ip nhrp map 172.16.0.1 203.0.113.1   ! hub tunnel→physical mapping
   ip nhrp map multicast 203.0.113.1    ! hub is multicast NHRP destination
   ip nhrp network-id 1
   ip nhrp nhs 172.16.0.1               ! Next Hop Server = hub
   ip nhrp authentication MyNHRPKey
   tunnel protection ipsec profile IPSEC-PROFILE
```

---

## OpenVPN

```
Protocol: TLS over UDP (preferred) or TCP
Port: UDP 1194 (default)
Authentication: certificates (PKI) or username+password via plugins
Platform: Linux, Windows, macOS, Android, iOS; widely supported

Strengths:
  Open source, audited
  Runs on UDP 1194 or can masquerade as HTTPS (TCP 443)
  Works through most firewalls and NAT
  Flexible authentication (certs, LDAP, RADIUS, OTP)

Weaknesses:
  Complex configuration (separate CA, certs per client)
  Performance: user-space TLS = more CPU than kernel-accelerated IPsec
  Slower than WireGuard

OpenVPN server config snippet:
  port 1194
  proto udp
  dev tun
  ca ca.crt
  cert server.crt
  key server.key
  dh dh2048.pem
  server 10.8.0.0 255.255.255.0
  push "route 10.0.0.0 255.255.0.0"
  push "dhcp-option DNS 8.8.8.8"
  keepalive 10 120
  tls-auth ta.key 0
  cipher AES-256-GCM
  compress lz4-v2
```

---

## WireGuard

```
RFC 8902 (2021); designed by Jason Donenfeld
Port: UDP (default 51820; configurable)
Encryption: ChaCha20 (stream cipher), Poly1305 (MAC), Curve25519 (DH), BLAKE2 (hash)
Key model: static key pairs (no certificates, no CA); peers identified by public key

Strengths:
  ~4,000 lines of code vs ~100,000 for OpenVPN/IPsec (dramatically smaller attack surface)
  Kernel-space implementation (Linux, Windows, macOS, BSD) → very fast
  No negotiation handshake overhead — first packet carries all needed info
  Stateless: handles roaming and IP changes seamlessly
  Simple to configure

Weaknesses:
  Newer; less enterprise feature set (no cert-based auth, no RADIUS, limited policy)
  No obfuscation (WireGuard traffic is identifiable; OpenVPN on 443 is harder to block)
  Less mature enterprise VPN management tooling (though growing rapidly)

WireGuard config (/etc/wireguard/wg0.conf):
  [Interface]
  Address = 10.0.0.1/24
  ListenPort = 51820
  PrivateKey = <server-private-key>

  [Peer]
  PublicKey = <client-public-key>
  AllowedIPs = 10.0.0.2/32        # client tunnel IP
  PersistentKeepalive = 25         # keep NAT mapping alive

Client config:
  [Interface]
  Address = 10.0.0.2/24
  PrivateKey = <client-private-key>
  DNS = 10.0.0.1

  [Peer]
  PublicKey = <server-public-key>
  Endpoint = vpn.example.com:51820
  AllowedIPs = 0.0.0.0/0          # route all traffic through VPN

Commands:
  wg-quick up wg0     # start VPN
  wg-quick down wg0   # stop VPN
  wg show             # status and peer info
  wg showconf wg0     # show full config
```

---

## VPN Protocol Comparison

| Feature | IPsec/IKEv2 | OpenVPN | WireGuard |
|---|---|---|---|
| Standard | IETF RFC | Open source | RFC 8902 |
| Transport | ESP/UDP 500,4500 | UDP 1194 or TCP 443 | UDP 51820 |
| Code size | Large (complex) | ~70K lines | ~4K lines |
| Performance | Fast (kernel) | Slower (user-space) | Very fast (kernel) |
| Key exchange | Certificates or PSK | Certificates | Static key pairs |
| Established in | Very mature | Mature | New (2019+) |
| Traverses NAT | Yes (NAT-T) | Yes | Yes |
| IP roaming | MOBIKE | Limited | Excellent |
| Enterprise features | Rich | Rich | Limited |
| Setup complexity | High | Medium | Low |

---

## Tips

- Always use IKEv2 over IKEv1 for new deployments — IKEv2 is simpler, faster, and fixes IKEv1's ambiguous retry logic.
- Enable Dead Peer Detection (DPD) on all IPsec tunnels — without it, a tunnel can appear UP while the remote side is down (traffic silently blackholed).
- WireGuard's `AllowedIPs = 0.0.0.0/0` routes all traffic through the VPN — for split tunneling, list only specific subnets.
- GRE without IPsec is plaintext — always add `tunnel protection ipsec profile` unless the transport is already secured.
- DMVPN Phase 3 is the cleanest for hub-and-spoke with spoke-to-spoke traffic — it allows routing protocols to install spoke IP as next-hop directly.

---

## Summary

- IPsec is the standard for site-to-site VPN: IKEv2 negotiates security associations; ESP provides encryption + authentication in tunnel mode.
- IKEv2 (4 messages) is simpler and faster than IKEv1 (9 messages); supports MOBIKE for IP roaming.
- NAT-T encapsulates IPsec in UDP/4500 to traverse NAT devices (required since ESP has no ports).
- GRE creates unencrypted tunnels (used for routing protocols over WAN); combine with IPsec for security.
- DMVPN uses mGRE + NHRP to enable dynamic spoke-to-spoke tunnels without pre-configuring all pairs.
- WireGuard is the modern choice for simplicity and performance — ~4K lines of code, kernel-space, static key pairs, excellent IP roaming.
