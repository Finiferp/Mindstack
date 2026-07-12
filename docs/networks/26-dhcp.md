---
title: "DHCP"
sidebar_label: "DHCP"
sidebar_position: 26
---

# DHCP — Dynamic Host Configuration Protocol

DHCP automates IP address assignment and network parameter distribution. Without it, every device would need manual configuration of IP address, subnet mask, default gateway, and DNS servers.

---

## History

Before DHCP, hosts used **RARP** (Reverse ARP, 1984) to get an IP from a MAC address — limited to IP only, required a server on every segment. **BOOTP** (Bootstrap Protocol, 1985, RFC 951) improved on RARP by adding more options and relay agent support. **DHCP** (RFC 1531, 1993; revised RFC 2131, 1997) extended BOOTP with:

- Temporary leases with renewal
- Automatic address pool management
- A rich options framework (DHCP options 1–255)
- Client identification beyond just MAC address

---

## DHCPv4 — How It Works (DORA)

```
Client                                 DHCP Server
  │                                        │
  │── DISCOVER ───────────────────────────►│  Broadcast (255.255.255.255)
  │   src: 0.0.0.0:68, dst: 255.255.255.255:67
  │   "I need an IP address, who's there?"
  │                                        │
  │◄─ OFFER ───────────────────────────────│  Unicast or broadcast
  │   "I offer you 192.168.1.10, valid 24h"
  │   (IP still reserved but not assigned)
  │                                        │
  │── REQUEST ────────────────────────────►│  Broadcast (tells ALL servers which offer won)
  │   "I accept 192.168.1.10 from server 192.168.1.1"
  │                                        │
  │◄─ ACK ─────────────────────────────────│  Unicast or broadcast
  │   "Confirmed. Lease expires at T."     │
  │                                        │
  │   (Client configures the IP address)   │
```

**Why broadcast for REQUEST?** The client may have received OFFERs from multiple DHCP servers. Broadcasting the REQUEST tells all servers which offer was accepted — the others silently release their offered address back to the pool.

### DHCP Lease Times and Renewal

```
T1 = 50% of lease time  → client sends unicast RENEW to original server
T2 = 87.5% of lease time → if no response by T2, client broadcasts REBIND (any server)
Expiry                  → if no response, client must stop using address

Renewal flow (after initial DORA):
  Client ─── DHCPREQUEST (unicast to server) ──► Server
  Server ─── DHCPACK ──────────────────────────► Client  (new lease granted)

Example: 24-hour lease
  T1 = 12 hours → try to renew
  T2 = 21 hours → broadcast REBIND
  T = 24 hours  → address expires
```

### DHCP Release and Inform

```
DHCPRELEASE  — client explicitly releases its IP (e.g. on graceful shutdown)
              → sent unicast to server
              → server returns address to available pool immediately

DHCPINFORM   — client already has an IP (static or remembered) but wants
               other options (DNS, NTP, etc.)
               → unicast to server; server responds with DHCPACK containing options
```

### DHCP Packet Format

```
 ┌────────────────────────────────────────────────────────────┐
 │ op(1) htype(1) hlen(1) hops(1)                             │
 │ xid — transaction ID (4 bytes)                             │
 │ secs(2) flags(2)                                           │
 │ ciaddr — client IP (4) — filled if client knows its IP     │
 │ yiaddr — "your" IP offered by server (4)                   │
 │ siaddr — next server IP (4) — for BOOTP/TFTP boot          │
 │ giaddr — relay agent IP (4)                                │
 │ chaddr — client hardware address (16, padded)              │
 │ sname  — server hostname (64 bytes)                        │
 │ file   — boot filename (128 bytes)                         │
 │ options — magic cookie + options (variable)                │
 └────────────────────────────────────────────────────────────┘
```

---

## DHCP Options (Most Important)

| Option | Name | Description |
|---|---|---|
| 1 | Subnet Mask | Client's subnet mask |
| 3 | Router | Default gateway(s) |
| 6 | Domain Name Server | DNS server(s) |
| 12 | Hostname | Client's hostname |
| 15 | Domain Name | DNS domain name |
| 43 | Vendor-Specific Info | Used by phones (Cisco/Avaya for TFTP boot) |
| 51 | IP Address Lease Time | Lease duration in seconds |
| 53 | DHCP Message Type | DISCOVER/OFFER/REQUEST/ACK/NAK/RELEASE/INFORM |
| 54 | Server Identifier | DHCP server's IP |
| 55 | Parameter Request List | Client's list of options it wants |
| 58 | Renewal Time (T1) | Seconds until renewal attempt |
| 59 | Rebinding Time (T2) | Seconds until rebind attempt |
| 60 | Vendor Class Identifier | Client device type string |
| 61 | Client Identifier | Typically type (0x01) + MAC |
| 66 | TFTP Server Name | Boot server for IP phones |
| 67 | Bootfile Name | Boot file for IP phones |
| 82 | Relay Agent Information | Sub-options added by relay (circuit ID, remote ID) |
| 119 | Domain Search List | DNS search domains |
| 121 | Classless Static Route | Static routes pushed to client (RFC 3442) |
| 150 | TFTP Server Address | Cisco IP phone option |
| 252 | WPAD | Web Proxy Auto-Discovery |

---

## DHCP Relay Agent

Routers don't forward broadcasts — so DHCP DISCOVERs die at the local segment boundary. The **DHCP relay agent** (also called IP Helper) forwards them as unicast to a central DHCP server.

```
Client              Router (Relay Agent)              DHCP Server
  │                       │                               │
  │── DISCOVER ──────────►│                               │
  │  (broadcast)          │── DHCP Request ──────────────►│
  │                       │  (unicast, fills giaddr       │
  │                       │   with relay's IP)            │
  │                       │◄── DHCP Reply ────────────────│
  │◄── OFFER ─────────────│                               │
  │   (relay forwards     │                               │
  │    back to client)    │                               │
```

**Cisco IOS relay configuration:**
```cisco
interface GigabitEthernet0/1
 ip address 10.1.1.1 255.255.255.0
 ip helper-address 10.0.0.10   ! DHCP server IP

! ip helper-address also forwards:
!   UDP port 37 (Time), 49 (TACACS), 53 (DNS), 67 (DHCP/BOOTP), 69 (TFTP),
!   137 (NetBIOS Name), 138 (NetBIOS Datagram)
```

**Option 82 — Relay Agent Information:** The relay can add sub-options to help the DHCP server identify where the client is:
- Circuit ID: the interface/VLAN the client is on
- Remote ID: the relay's hostname or MAC
- Used for IP address assignment policies per-VLAN

---

## DHCP Server Configuration (Cisco IOS)

```cisco
! Exclude addresses from pool (for static devices)
ip dhcp excluded-address 192.168.1.1 192.168.1.20

! Create pool
ip dhcp pool OFFICE_LAN
 network 192.168.1.0 255.255.255.0    ! the subnet
 default-router 192.168.1.1           ! default gateway
 dns-server 8.8.8.8 8.8.4.4           ! DNS servers
 domain-name company.local
 lease 1                              ! 1 day (or "lease 0 12" = 12 hours)
 ! lease infinite  (for static-like devices)

! Pool with VLAN scopes (multiple pools for multiple VLANs)
ip dhcp pool VOICE_VLAN
 network 10.10.10.0 255.255.255.0
 default-router 10.10.10.1
 dns-server 10.0.0.53
 option 150 ip 10.0.0.48             ! TFTP server for Cisco phones
 lease 0 12

! Static binding — reserve an IP for a specific MAC
ip dhcp pool PRINTER_01
 hardware-address 00aa.bb11.cc22
 host 192.168.1.50 255.255.255.0
 default-router 192.168.1.1
 dns-server 8.8.8.8

! Verification
show ip dhcp pool
show ip dhcp binding            ! all active leases
show ip dhcp binding 192.168.1.10  ! specific IP
clear ip dhcp binding *         ! clear all leases (use carefully!)
show ip dhcp conflict           ! IPs that conflicted (ARP probe found in use)
debug ip dhcp server events     ! real-time DHCP events
```

---

## DHCP Security

### DHCP Snooping (Covered in detail in file 16)

```
DHCP snooping marks switch ports as Trusted or Untrusted:
  • Trusted: connected to legitimate DHCP servers or uplinks
  • Untrusted: connected to clients

On untrusted ports:
  • DHCP OFFER and ACK frames dropped (rogue server prevention)
  • DHCP binding table built from DISCOVER/REQUEST on untrusted ports
  • Used by DAI (Dynamic ARP Inspection) and IP Source Guard
```

### Rogue DHCP Server Attack

```
Attacker plugs in a device running DHCP server:
  → Clients receive attacker's OFFER first
  → Clients configured with attacker as default gateway (Man-in-the-Middle)
  → All traffic flows through attacker

Defense: DHCP snooping on all access switches
```

### DHCP Starvation Attack

```
Attacker sends thousands of DISCOVER messages with spoofed MAC addresses
→ DHCP pool exhausted
→ Legitimate clients can't get addresses (DoS)

Defense: DHCP snooping rate limiting + port security (limit MACs per port)
```

---

## DHCPv6

Covered in depth in file 24. Key differences from DHCPv4:

| Feature | DHCPv4 | DHCPv6 |
|---|---|---|
| Discovery | Broadcast DISCOVER | Multicast SOLICIT to ff02::1:2 |
| Ports | Server:67, Client:68 | Server:547, Client:546 |
| Default gateway | Option 3 (Router) | NOT provided by DHCPv6 — comes from RA |
| Stateless mode | No | Yes (M=0, O=1) — only provides options |
| Relay | ip helper-address | ipv6 dhcp relay destination |
| Client ID | Option 61 (MAC-based) | DUID (DHCP Unique Identifier, more stable) |

**DHCPv6 message types:**
```
Solicit        → like DHCPv4 DISCOVER
Advertise      → like DHCPv4 OFFER
Request        → like DHCPv4 REQUEST
Reply          → like DHCPv4 ACK
Renew          → unicast renew to current server
Rebind         → multicast rebind (if no renew response)
Release        → release address
Decline        → client found address in use (DAD failed)
Information-Request → stateless DHCPv6 (options only, no address)
Confirm        → verify address still valid after link change
Reconfigure    → server tells client to re-request (unusual)
```

---

## Tips

- The `giaddr` (relay agent IP) in a DHCP packet tells the server which subnet the client is on — it selects the matching pool based on this field.
- DHCP conflict detection: a Windows DHCP server ARPs before assigning an IP; if something responds, it marks the address as conflicted and skips it. Configure `ip dhcp conflict logging` on Cisco.
- Short leases (1–4 hours) are good for guest/WiFi networks where devices come and go frequently. Long leases (8–24 hours) suit stable corporate LANs.
- Option 82 is critical in enterprise deployments — it lets a single DHCP server serve many VLANs with per-VLAN policies.
- DHCPv6 does NOT provide the default gateway — this is the most common DHCPv6 deployment mistake. The gateway always comes from the Router Advertisement.

---

## Summary

- DHCP automates IP address assignment using the DORA process: Discover → Offer → Request → Acknowledge.
- The relay agent (ip helper-address) enables a single DHCP server to serve multiple subnets across routed boundaries.
- DHCP leases are temporary; renewal at T1 (50%), rebind at T2 (87.5%), expiry at full lease time.
- DHCP snooping distinguishes trusted (server-facing) from untrusted (client-facing) ports, blocking rogue servers.
- DHCPv6 does not provide the default gateway — routers send that in Router Advertisements (ICMPv6 RA).
- Important DHCP options: 1 (mask), 3 (gateway), 6 (DNS), 51 (lease time), 82 (relay info), 121 (static routes).
