---
title: "AAA, 802.1X, and Network Access Control"
sidebar_label: "AAA & 802.1X"
sidebar_position: 56
---

# AAA, 802.1X, and Network Access Control

AAA (Authentication, Authorization, Accounting) is the framework for controlling who can access a network, what they can do, and tracking what they did. 802.1X brings AAA to the network port level.

---

## AAA Framework

```
Authentication — Who are you?
  Prove identity via credentials: password, certificate, OTP, biometric
  Protocols: RADIUS, TACACS+, LDAP, Kerberos, SAML

Authorization — What can you do?
  Once authenticated, what resources/actions are permitted?
  RADIUS: returns VSA (Vendor-Specific Attributes) for policy
  TACACS+: per-command authorization (granular control on network devices)
  Examples: VLAN assignment, ACL download, privilege level

Accounting — What did you do?
  Track all access events for audit, billing, compliance
  Start/stop records, session duration, bytes transferred
  RADIUS accounting messages (start, interim-update, stop)
  TACACS+: every command executed logged to accounting server
```

---

## RADIUS — Remote Authentication Dial-In User Service

RADIUS (RFC 2865/2866) is the most widely deployed AAA protocol — used for:
- Wi-Fi authentication (802.1X/EAP)
- VPN user authentication
- Network device management (via vendor extensions)
- ISP subscriber management

```
UDP port 1812 — Authentication
UDP port 1813 — Accounting
(Legacy: UDP 1645/1646)

RADIUS packet structure:
  Code (1B) | Identifier (1B) | Length (2B) | Authenticator (16B) | Attributes (variable)

Codes:
  1  = Access-Request    (client → server: "Is this user valid?")
  2  = Access-Accept     (server → client: "Yes; here are their attributes")
  3  = Access-Reject     (server → client: "No")
  4  = Accounting-Request (client → server: "Log this session event")
  5  = Accounting-Response (server → client: "Got it")
  11 = Access-Challenge  (server → client: "Need more info")

Security:
  Shared secret between NAS and RADIUS server (PSK)
  Password encrypted in Access-Request using shared secret + MD5 hash
  Entire packet NOT encrypted — only the password field!
  Use RADIUS over TLS (RadSec, RFC 6614) for full encryption

Common RADIUS Attributes:
  User-Name (1)
  User-Password (2)
  CHAP-Password (3)
  NAS-IP-Address (4)
  NAS-Port (5)
  Service-Type (6)
  Framed-Protocol (7)
  Framed-IP-Address (8)
  Session-Timeout (27)
  Idle-Timeout (28)
  Called-Station-Id (30): AP MAC + SSID (for wireless)
  Calling-Station-Id (31): client MAC address
  NAS-Identifier (32)
  Acct-Session-Id (44)
  Reply-Message (18): reason for reject (shown to user)
  Class (25): pass-through value for accounting correlation

VSA (Vendor-Specific Attributes, attribute 26):
  Cisco-AVPair: "ip:inacl=PERMIT-WEB", "shell:priv-lvl=15"
  Airespace-ACL-Name: ACL to apply on wireless client
  Tunnel-Type, Tunnel-Medium-Type, Tunnel-Private-Group-ID: VLAN assignment
  Filter-Id: named ACL to apply

RADIUS accounting flow (session):
  1. NAS sends Accounting-Request (Start): session begins
  2. NAS sends Accounting-Request (Interim-Update): every N seconds
  3. NAS sends Accounting-Request (Stop): session ends (with stats)
```

### FreeRADIUS Configuration

```
/etc/freeradius/3.0/clients.conf:
  client switch1 {
    ipaddr  = 192.168.1.1
    secret  = MyRadiusSecret
    shortname = core-switch
  }

/etc/freeradius/3.0/users:
  alice   Cleartext-Password := "password123"
          Tunnel-Type = VLAN,
          Tunnel-Medium-Type = IEEE-802,
          Tunnel-Private-Group-Id = "10",     # assign to VLAN 10
          Reply-Message = "Welcome, Alice"

  admins  Cleartext-Password := "admin-pass"
          Service-Type = NAS-Prompt-User,
          Cisco-AVPair = "shell:priv-lvl=15"  # Cisco privilege level 15

/etc/freeradius/3.0/mods-enabled/ldap:
  server = 'ldap.example.com'
  identity = 'cn=radius,dc=example,dc=com'
  password = 'ldap-bind-pass'
  base_dn = 'dc=example,dc=com'
  filter = "(uid=%{%{Stripped-User-Name}:-%{User-Name}})"
  # LDAP authentication: FreeRADIUS checks credentials against LDAP
```

---

## TACACS+ — Terminal Access Controller Access-Control System Plus

TACACS+ (RFC 8907) is designed for device administration — controlling access to network device CLIs. Unlike RADIUS:

```
Differences from RADIUS:
  TCP port 49 (vs RADIUS UDP 1812/1813) — reliable delivery
  ENTIRE packet encrypted (vs RADIUS only encrypts password)
  Separates Authentication, Authorization, Accounting into distinct packets
  Per-command authorization: can allow "show" but deny "configure"
  Designed for device management; RADIUS designed for user network access

AAA flow with TACACS+:
  1. User SSHs to switch
  2. Switch sends Authentication-Start to TACACS+ server
  3. TACACS+ challenges for username → password
  4. Switch collects credentials → TACACS+ Authentication-Reply: PASS/FAIL
  5. Switch sends Authorization-Request: "User alice wants to run 'show ip route'"
  6. TACACS+ Authorization-Reply: PASS / FAIL (can even rewrite the command)
  7. TACACS+ Accounting-Request logged: alice ran 'show ip route' at timestamp

Privilege levels (Cisco IOS):
  Level 0: basic commands (disable, enable, exit, help, logout)
  Level 1: user EXEC (show commands, limited access)
  Level 15: privileged EXEC (full access — "enable" mode)
  Levels 2-14: customizable

Per-command authorization example (TACACS+ server config):
  User engineer:
    - Allow: show *, ping, traceroute
    - Deny: configure, reload, write, debug

TACACS+ advantages over RADIUS for device management:
  Command accounting (know exactly what each admin ran)
  Per-command authorization (least privilege for admins)
  Full encryption of all traffic (including username in auth phase)
  Reliable TCP transport
```

### Cisco IOS TACACS+ Configuration

```cisco
! TACACS+ server group
aaa new-model
tacacs server TACACS-PRIMARY
 address ipv4 10.0.0.100
 key MyTacacsSecret

! Server group
aaa group server tacacs+ TACACS-GROUP
 server name TACACS-PRIMARY
 server name TACACS-BACKUP  ! fallback server

! AAA method lists
aaa authentication login default group TACACS-GROUP local
! "default" = applies to all lines unless overridden
! "local" = use local username database if TACACS unreachable (important fallback!)

aaa authorization exec default group TACACS-GROUP local
! Controls whether user gets EXEC shell (privilege level from TACACS)

aaa authorization commands 1 default group TACACS-GROUP local
aaa authorization commands 15 default group TACACS-GROUP local
! Per-command authorization for levels 1 and 15

aaa accounting commands 1 default start-stop group TACACS-GROUP
aaa accounting commands 15 default start-stop group TACACS-GROUP
aaa accounting exec default start-stop group TACACS-GROUP

! Verify
Router# show tacacs
Router# debug tacacs events
Router# debug aaa authentication
```

---

## 802.1X — Port-Based Network Access Control

802.1X (IEEE, 2001) enforces authentication before a switch port allows network access. Until authenticated, the port is in an "unauthorized" state — only EAP frames pass through.

```
Three parties:
  Supplicant: device requesting access (PC, phone, IoT — needs 802.1X client)
  Authenticator: switch or WAP (enforces policy; passes EAP frames to auth server)
  Authentication Server: RADIUS server (validates credentials)

Port states:
  Unauthorized: only 802.1X/EAP frames pass; no IP traffic
  Authorized: full network access (VLAN + ACL applied based on RADIUS response)
  Force-authorized: always open (override for printers/legacy devices)
  Force-unauthorized: always closed

Authentication flow:
  1. Supplicant connects to switch port
  2. Authenticator sends EAP-Request/Identity (or supplicant sends EAPOL-Start)
  3. Supplicant replies with EAP-Response/Identity (username)
  4. Authenticator wraps EAP in RADIUS and sends to Authentication Server (Access-Request)
  5. Server sends challenge (RADIUS Access-Challenge → Authenticator → EAP-Request)
  6. Supplicant responds to challenge
  7. Server validates: RADIUS Access-Accept (with attributes) or Access-Reject
  8. Authenticator moves port to authorized; applies VLAN from RADIUS

EAPOL (EAP over LAN):
  EtherType 0x888E
  Only travels between supplicant and authenticator (not beyond)
  Authenticator converts to RADIUS for auth server communication
```

### EAP Methods

```
EAP (Extensible Authentication Protocol, RFC 3748) — container for auth methods

EAP-MD5:
  Challenged-based hash; no certificate needed
  Weak: dictionary attack on MD5; no server authentication
  Never use in production

EAP-TLS (RFC 5216):
  BOTH client and server present certificates
  Strongest method; requires client certificates (PKI overhead)
  Used in: high-security environments, enterprise wireless

EAP-TTLS (Tunneled TLS):
  Server presents certificate (establishes TLS tunnel)
  Client authenticates inside the tunnel (PAP/CHAP/MS-CHAPv2 — no client cert needed)
  More common than EAP-TLS (no client cert deployment)

PEAP (Protected EAP, Microsoft/Cisco/RSA):
  Similar to EAP-TTLS: server cert establishes tunnel
  Inside: EAP-MSCHAPv2 or EAP-GTC for actual auth
  PEAPv0/EAP-MSCHAPv2: most common in Windows environments
  PEAPv1/EAP-GTC: more flexible; used with OTP tokens

EAP-FAST (Flexible Authentication via Secure Tunneling, Cisco):
  No server certificate required (uses PAC — Protected Access Credential)
  Faster provisioning; used in Cisco environments

Comparison:
  EAP-TLS: most secure; requires PKI for client certs; highest deployment cost
  PEAP/EAP-TTLS: good balance; only server cert needed; username+password for clients
  EAP-MD5: avoid — no server auth, weak crypto
```

### Cisco Switch 802.1X Configuration

```cisco
! Enable AAA and RADIUS
aaa new-model
radius server ISE
 address ipv4 10.0.0.200 auth-port 1812 acct-port 1813
 key MyRadiusSecret

aaa group server radius RADIUS-SERVERS
 server name ISE

aaa authentication dot1x default group RADIUS-SERVERS
aaa authorization network default group RADIUS-SERVERS
aaa accounting dot1x default start-stop group RADIUS-SERVERS

! Enable 802.1X globally
dot1x system-auth-control

! Per-interface configuration
interface GigabitEthernet1/0/1
 switchport mode access
 switchport access vlan 10              ! default VLAN before auth
 dot1x port-control auto               ! auto = enforce 802.1X
 authentication host-mode single-host  ! one auth per port (or multi-auth, multi-domain)
 authentication event fail action next-method   ! try next method on fail
 authentication order dot1x mab        ! try 802.1X first, then MAB
 authentication priority dot1x mab
 mab                                   ! enable MAC Authentication Bypass (MAB)
 spanning-tree portfast                 ! don't wait for STP (802.1X needs to start immediately)

! VLAN assignment from RADIUS:
! RADIUS sends: Tunnel-Type=VLAN, Tunnel-Medium-Type=802, Tunnel-Private-Group-Id=20
! Switch places port in VLAN 20

! Auth VLAN (for devices that fail authentication)
authentication event fail action authorize vlan 999   ! quarantine VLAN

! Verification
show dot1x all summary
show authentication sessions interface Gi1/0/1
show authentication sessions brief
show radius server-group RADIUS-SERVERS
```

### MAB — MAC Authentication Bypass

```
For devices that can't run 802.1X (printers, IP phones, IoT, legacy):
  Switch sends MAC address as username/password to RADIUS
  RADIUS checks MAC against approved list
  If approved: RADIUS returns VLAN/ACL attributes; port authorized

Security consideration:
  MAB is weaker than 802.1X (MAC addresses are easily spoofed)
  Use MAC addresses as a fingerprint hint, not a security guarantee
  Combine MAB with device profiling (Cisco ISE profiles device type from
  DHCP/CDP/LLDP data and applies stricter policy to unknown devices)
```

---

## Network Access Control (NAC)

NAC extends 802.1X with device posture assessment:

```
Posture check: verify endpoint health before granting access
  Is the OS patched to current level?
  Is antivirus installed and updated?
  Is a host firewall enabled?
  Is disk encryption enabled?
  Is the device domain-joined / MDM enrolled?

Outcome-based access:
  Healthy device + authenticated user → full VLAN access
  Authenticated user, outdated AV → remediation VLAN (access to update servers only)
  Unknown device → guest VLAN

Cisco ISE (Identity Services Engine):
  Central policy decision point
  Integrates: 802.1X, MAB, profiling, posture, guest access, BYOD
  Policy: who (user/group) + what (device type/posture) + where (switch/AP) + when = which VLAN/ACL

Guest access portals:
  Redirect unauthenticated users to captive portal
  Register email; accept terms → limited internet access
  CWA (Central Web Authentication): RADIUS redirects to ISE's portal URL
```

---

## Tips

- Always configure a local fallback (`aaa authentication login default group TACACS-GROUP local`) — if the TACACS/RADIUS server is unreachable, you need a way to log in.
- Use TACACS+ for device management (CLI access, per-command authorization) and RADIUS for network access control (802.1X, VPN).
- Enable 802.1X with MAB fallback on all access ports — pure 802.1X blocks printers and IoT; MAB allows them while still logging their MAC.
- EAP-TLS with client certificates is the gold standard for wireless security but requires a PKI — PEAP/MSCHAPv2 with strong passwords is a practical alternative.
- Test RADIUS authentication before deploying: `test aaa group RADIUS-SERVERS alice MyPassword new-code` on Cisco IOS.

---

## Summary

- AAA: Authentication (who), Authorization (what), Accounting (log what) — implemented via RADIUS or TACACS+.
- RADIUS: UDP 1812/1813; partial encryption; designed for user network access (802.1X, VPN); VLAN/ACL attributes in Access-Accept.
- TACACS+: TCP 49; fully encrypted; per-command authorization; designed for device management (CLI); logs every command.
- 802.1X keeps switch ports unauthorized until EAP authentication succeeds — supplicant → authenticator (switch) → RADIUS server.
- EAP-TLS (both certs) is strongest; PEAP/EAP-TTLS (server cert + password) is most common; avoid EAP-MD5.
- MAB authenticates devices by MAC address — weaker than 802.1X but needed for printers/IoT that can't run 802.1X.
