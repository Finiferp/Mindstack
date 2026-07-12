---
title: "Network Device Hardening"
sidebar_label: "Device Hardening"
sidebar_position: 58
---

# Network Device Hardening

Network devices (routers, switches, firewalls) are high-value targets. A compromised router can intercept all traffic, inject routes, and persist across reboots. This page covers systematic hardening for Cisco IOS and general principles applicable to any platform.

---

## Hardening Principles

```
Principle of Least Privilege:
  Accounts have only the access they need — nothing more
  Network admin needs full access; help desk needs read-only "show" commands

Minimize attack surface:
  Disable every service, protocol, and interface not explicitly needed
  Every running service is a potential vulnerability vector

Defense in Depth:
  Multiple layers — don't rely on a single control
  Even if SSH is compromised, AAA limits privilege; ACLs limit source IPs

Secure management plane:
  In-band management: same network as data traffic
  Out-of-band (OOB) management: dedicated management network (preferred)
  Management plane protection: limit who can SSH/Telnet to the device

Separation of management and data planes:
  Management plane: SSH, SNMP, NTP, syslog, AAA
  Data plane: forwarding customer traffic
  Control plane: routing protocols, ARP, STP, OSPF hellos
```

---

## Cisco IOS Hardening — Complete Checklist

### Management Plane

```cisco
! ─── 1. Set hostname and domain name ────────────────────────────────────────
hostname CORE-SW-01
ip domain-name example.internal

! ─── 2. Disable DNS lookup (stops mistyped commands from hanging) ────────────
no ip domain-lookup

! ─── 3. Encrypt all stored passwords ────────────────────────────────────────
service password-encryption         ! Encrypts type 7 (weak Vigenere) — better than clear text
! Better: use type 9 (scrypt) for secret passwords:
enable algorithm-type scrypt secret MyEnablePassword
username admin algorithm-type scrypt secret MyPassword

! ─── 4. Set strong enable secret (NOT enable password) ──────────────────────
enable secret MyStrongPassword       ! type 5 (MD5) by default
! Or use AAA to require TACACS+ authentication for enable

! ─── 5. Generate RSA keys for SSH ────────────────────────────────────────────
crypto key generate rsa modulus 4096  ! or use ECDSA:
! crypto key generate ec keysize 384 label SSH-KEY

! ─── 6. Configure SSH only (disable Telnet) ──────────────────────────────────
ip ssh version 2
ip ssh time-out 60              ! kick idle SSH sessions
ip ssh authentication-retries 3 ! lockout after 3 failed auths
ip ssh rsa keypair-name SSH-KEY ! specify key to use (IOS 15.2+)

! ─── 7. Configure VTY lines ─────────────────────────────────────────────────
line vty 0 15
 login local                     ! use local username database (or AAA)
 transport input ssh              ! SSH ONLY — no Telnet!
 exec-timeout 10 0               ! disconnect idle sessions after 10 minutes
 access-class MGMT-ONLY in       ! restrict SSH source IPs

! ─── 8. Configure console ───────────────────────────────────────────────────
line con 0
 login local
 exec-timeout 10 0
 logging synchronous             ! stop log messages interrupting typing

! ─── 9. Configure AUX port (disable if not used) ─────────────────────────────
line aux 0
 no exec
 transport input none
 exec-timeout 0 1                ! disconnect immediately

! ─── 10. Management ACL ──────────────────────────────────────────────────────
ip access-list standard MGMT-ONLY
 permit 10.0.0.0 0.0.0.255       ! management hosts/subnet
 deny any log                    ! log and deny everything else

! ─── 11. Banner configuration ────────────────────────────────────────────────
! DON'T use welcoming banners — use legal warning banners
banner motd ^
WARNING: Unauthorized access prohibited. This system is for authorized users only.
All activity is monitored and may be reported to law enforcement.
^

! Login banner (shown before authentication)
banner login ^
Authorized access only. Disconnect if you are not authorized.
^

! ─── 12. NTP (synchronized time is essential for logs and AAA) ───────────────
ntp server 10.0.0.1 prefer
ntp server 10.0.0.2
ntp authenticate
ntp authentication-key 1 md5 MyNTPKey
ntp trusted-key 1
ntp source Loopback0

! ─── 13. Logging ─────────────────────────────────────────────────────────────
logging host 10.0.0.100
logging trap informational       ! send severity 0-6 to syslog server
logging buffered 65536 informational  ! local buffer
service timestamps log datetime msec localtime show-timezone year
! Timestamps on every log message: yyyy mmm dd hh:mm:ss.mmm timezone
```

### Control Plane Policing (CoPP)

```cisco
! Protect the router's CPU from flooding
! Routing protocol updates and management traffic are prioritized
! Malicious floods (high-rate packets to CPU) are rate-limited

! CoPP — Cisco IOS CoPP (modular QoS)
class-map match-any CoPP-OSPF
 match access-group name OSPF-TRAFFIC

class-map match-any CoPP-BGP
 match access-group name BGP-TRAFFIC

class-map match-any CoPP-SSH-SNMP
 match access-group name MGMT-TRAFFIC

class-map match-any CoPP-ICMP
 match access-group name ICMP-TRAFFIC

ip access-list extended OSPF-TRAFFIC
 permit ospf any any

ip access-list extended BGP-TRAFFIC
 permit tcp any any eq bgp
 permit tcp any eq bgp any

ip access-list extended MGMT-TRAFFIC
 permit tcp 10.0.0.0 0.0.0.255 any eq 22   ! SSH
 permit udp 10.0.0.0 0.0.0.255 any eq 161  ! SNMP

ip access-list extended ICMP-TRAFFIC
 permit icmp any any

policy-map CoPP
 class CoPP-OSPF
  police rate 1000 pps
  conform-action transmit
  exceed-action drop

 class CoPP-BGP
  police rate 1000 pps
  conform-action transmit
  exceed-action drop

 class CoPP-SSH-SNMP
  police rate 200 pps
  conform-action transmit
  exceed-action drop

 class CoPP-ICMP
  police rate 500 pps
  conform-action transmit
  exceed-action drop

 class class-default
  police rate 100 pps        ! rate-limit everything else to 100 pps
  conform-action transmit
  exceed-action drop

control-plane
 service-policy input CoPP

! Verify
Router# show policy-map control-plane
```

### Disable Unnecessary Services

```cisco
! ─── Commonly abused services — disable them all ────────────────────────────
no service finger                 ! legacy; info disclosure
no service udp-small-servers      ! echo, discard, chargen on UDP
no service tcp-small-servers      ! echo, discard, chargen on TCP
no service pad                    ! X.25 padding
no ip source-route                ! IP source routing (used in attacks)
no ip proxy-arp                   ! proxy ARP (can cause routing issues)
no ip bootp server                ! BOOTP server
no ip http server                 ! HTTP management (use HTTPS only or disable)
no ip http secure-server          ! disable HTTPS management if not needed
  (or) ip http secure-server      ! keep HTTPS; set ACL
ip http access-class MGMT-ONLY
ip http authentication local

! ─── CDP (Cisco Discovery Protocol) ─────────────────────────────────────────
! CDP reveals model, IOS version, IP addresses — turn off on external interfaces
no cdp run                        ! disable globally
  (or) cdp run                    ! enable globally; then per-interface:
  interface GigabitEthernet0/0
   no cdp enable                  ! disable on external-facing interfaces

! ─── LLDP ───────────────────────────────────────────────────────────────────
no lldp run                       ! disable if not needed
lldp run                          ! or selectively:
  interface Gi0/0
   no lldp transmit
   no lldp receive

! ─── Unused interfaces ────────────────────────────────────────────────────────
interface GigabitEthernet0/3
 shutdown                         ! disable unused ports
 description NOT IN USE

! ─── DHCP server (disable if not acting as DHCP server) ──────────────────────
no service dhcp

! ─── IP redirects and unreachables ───────────────────────────────────────────
interface GigabitEthernet0/0
 no ip redirects                  ! don't send ICMP redirects (info disclosure)
 no ip unreachables               ! rate-limit or disable unreachables (used in recon)
 no ip proxy-arp

! ─── TCP keepalives ──────────────────────────────────────────────────────────
service tcp-keepalives-in         ! detect dead sessions on incoming connections
service tcp-keepalives-out        ! detect dead sessions on outgoing connections
```

### SNMP Hardening

```cisco
! ─── SNMPv3 (never use v1/v2c in production) ────────────────────────────────
! Remove any v1/v2c communities
no snmp-server community public   ! remove default public community!
no snmp-server community private  ! remove default private community!

! Configure SNMPv3 with authentication + encryption
snmp-server group NMS_GROUP v3 priv
snmp-server user nms_user NMS_GROUP v3 auth sha256 MyAuthPass priv aes 128 MyPrivPass
snmp-server host 10.0.0.100 version 3 priv nms_user
snmp-server location "Data Center A, Rack 12"
snmp-server contact "noc@example.com"

! ACL to restrict SNMP to management hosts
snmp-server community                    ! not needed with v3
ip access-list standard SNMP-ACL
 permit 10.0.0.100                       ! NMS server
 deny any log

! Limit SNMP writes
snmp-server group NMS_READONLY v3 priv noauth nowrite  ! read-only view
```

### Routing Protocol Security

```cisco
! ─── OSPF authentication ─────────────────────────────────────────────────────
interface GigabitEthernet0/0
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 OSPFSecret

! Area-wide authentication:
router ospf 1
 area 0 authentication message-digest

! ─── EIGRP authentication ────────────────────────────────────────────────────
key chain EIGRP-KEYS
 key 1
  key-string EIGRPSecret
  accept-lifetime 00:00:00 Jan 1 2024 infinite
  send-lifetime 00:00:00 Jan 1 2024 infinite

interface GigabitEthernet0/0
 ip authentication mode eigrp 100 md5
 ip authentication key-chain eigrp 100 EIGRP-KEYS

! ─── BGP authentication ───────────────────────────────────────────────────────
router bgp 65001
 neighbor 203.0.113.1 password BGPSharedSecret
 neighbor 203.0.113.1 ttl-security hops 1   ! GTSM: TTL must be >= 254

! ─── Passive interfaces (stop sending routing updates where not needed) ──────
router ospf 1
 passive-interface default          ! passive by default
 no passive-interface Gi0/0         ! enable only on router-facing interfaces

router eigrp 100
 passive-interface default
 no passive-interface Gi0/0

! ─── Prefix filtering (route filtering) ──────────────────────────────────────
! Don't accept default route from OSPF peers (unless explicitly intended)
router ospf 1
 distribute-list prefix DENY-DEFAULT in
ip prefix-list DENY-DEFAULT seq 5 deny 0.0.0.0/0
ip prefix-list DENY-DEFAULT seq 10 permit 0.0.0.0/0 le 32
```

---

## Hardening Verification Checklist

```cisco
! Verify SSH is the only VTY transport
show line vty 0 15                ! check transport input = ssh

! Verify no weak passwords
show running-config | include password
show running-config | include secret

! Verify SSH version 2
show ip ssh

! Verify service disabled
show running-config | include service
show ip interface brief           ! any unexpected interfaces up?

! Verify SNMP configuration
show snmp                         ! verify v3 only
show snmp user
show snmp group

! Check for default/obvious community strings
show running-config | include community

! Verify NTP
show ntp status
show ntp associations

! Verify logging
show logging

! Check access lists applied to VTYs
show line vty 0 15                ! check access-class

! Check CDP status
show cdp                          ! should say disabled or per-interface
show cdp neighbors                ! who can see us?

! Verify CoPP
show policy-map control-plane

! Check routing protocol auth
show ip ospf interface Gi0/0      ! shows auth type
show key chain                    ! show EIGRP key chains

! Audit all open TCP/UDP listeners
show control-plane host open-ports
```

---

## Linux Network Device Hardening (For SDN/NFV/Linux Routers)

```bash
# Disable IP forwarding if this is not a router
sysctl -w net.ipv4.ip_forward=0

# Enable IP forwarding (for routers/gateways)
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv6.conf.all.forwarding=1

# Harden TCP/IP stack
sysctl -w net.ipv4.tcp_syncookies=1           # SYN flood protection
sysctl -w net.ipv4.conf.all.rp_filter=1       # Strict uRPF (BCP38)
sysctl -w net.ipv4.conf.all.accept_source_route=0   # No source routing
sysctl -w net.ipv4.conf.all.accept_redirects=0      # No ICMP redirects
sysctl -w net.ipv4.conf.all.send_redirects=0
sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1    # No smurf attacks
sysctl -w net.ipv4.conf.all.log_martians=1          # Log invalid source IPs
sysctl -w net.ipv4.tcp_timestamps=0           # Remove OS fingerprinting info

# SSH hardening (/etc/ssh/sshd_config)
PermitRootLogin no
PasswordAuthentication no           # Keys only
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
AllowUsers alice bob netadmin
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowTcpForwarding no               # Unless specifically needed
X11Forwarding no
Subsystem sftp /usr/lib/openssh/sftp-server

# Persist sysctl settings
echo "net.ipv4.tcp_syncookies=1" >> /etc/sysctl.conf
sysctl -p
```

---

## Tips

- Remove the `public` and `private` SNMP communities immediately on every new device — they are the first thing attackers check.
- Use type 9 (scrypt) or type 8 (PBKDF2) secrets on modern Cisco IOS instead of type 7 (trivially reversible) or type 5 (MD5, crackable offline).
- CoPP is one of the most important control-plane protections — without it, a packet flood directed at the router's CPU can crash it or cause it to stop forwarding.
- Never use `transport input all` on VTY lines — explicitly set `transport input ssh` and explicitly disable Telnet.
- Disable CDP/LLDP on all external-facing interfaces — they reveal device model, IOS version, and IP addresses to anyone who can sniff the link.

---

## Summary

- Minimize attack surface: disable all unused services (`no service finger`, `no ip http server`, `no cdp enable` on external interfaces).
- Secure access: SSH v2 only, key-based when possible, ACL on VTY lines, TACACS+ for accounting, `exec-timeout` on all lines.
- Protect passwords: `enable secret` (not `enable password`), type 9 scrypt, `service password-encryption` for others.
- Control plane policing (CoPP): rate-limit all traffic to the router CPU — prevent routing protocol floods and management plane exhaustion.
- Routing protocol authentication: always configure MD5 or SHA on OSPF, EIGRP, BGP — unauthenticated routing protocols allow route injection.
- SNMP: SNMPv3 with auth+priv only; delete public/private communities immediately; restrict with ACL.
