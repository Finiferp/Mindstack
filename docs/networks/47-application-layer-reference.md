---
title: "Application Layer Protocol Reference"
sidebar_label: "App Layer Reference"
sidebar_position: 47
---

# Application Layer Protocol Reference

A concise reference for the application-layer protocols that engineers encounter regularly — ports, transport, function, and key details.

---

## Well-Known Ports Reference

### Remote Access and Management

| Port | Proto | Service | Notes |
|---|---|---|---|
| 22 | TCP | SSH | Secure Shell; replaces Telnet/rsh/rcp |
| 23 | TCP | Telnet | Unencrypted; deprecated; never use on production |
| 3389 | TCP/UDP | RDP | Remote Desktop Protocol (Windows) |
| 5900+ | TCP | VNC | Virtual Network Computing; +display number |
| 830 | TCP | NETCONF | Network configuration via SSH |

### File Transfer

| Port | Proto | Service | Notes |
|---|---|---|---|
| 20 | TCP | FTP-DATA | FTP active mode data connection |
| 21 | TCP | FTP | FTP control; STARTTLS → FTPS |
| 69 | UDP | TFTP | Trivial FTP; unauthenticated; PXE boot |
| 115 | TCP | SFTP | Old "Simple FTP" (not SSH SFTP) — rare |
| 990 | TCP | FTPS | Implicit FTPS |

### Web

| Port | Proto | Service | Notes |
|---|---|---|---|
| 80 | TCP | HTTP | Unencrypted web; redirect to 443 in production |
| 443 | TCP/UDP | HTTPS/HTTP3 | TCP=HTTP/1.1+2; UDP=HTTP/3(QUIC) |
| 8080 | TCP | HTTP alt | Common dev/proxy port |
| 8443 | TCP | HTTPS alt | Common dev/proxy TLS port |

### Email

| Port | Proto | Service | Notes |
|---|---|---|---|
| 25 | TCP | SMTP | Server-to-server relay; blocked by most ISPs for clients |
| 465 | TCP | SMTPS | SMTP implicit TLS (client submission) |
| 587 | TCP | SMTP submission | SMTP + STARTTLS + AUTH; client submission |
| 110 | TCP | POP3 | Plain; use STARTTLS or port 995 |
| 995 | TCP | POP3S | POP3 over TLS |
| 143 | TCP | IMAP | Plain; use STARTTLS or port 993 |
| 993 | TCP | IMAPS | IMAP over TLS |

### Name Resolution and Directory

| Port | Proto | Service | Notes |
|---|---|---|---|
| 53 | TCP/UDP | DNS | UDP for queries (< 512B); TCP for zone transfers & large responses |
| 853 | TCP | DNS-over-TLS | DoT (RFC 7858) |
| 5353 | UDP | mDNS | Multicast DNS; zero-conf; 224.0.0.251 |
| 389 | TCP/UDP | LDAP | Directory service; use STARTTLS or LDAPS |
| 636 | TCP | LDAPS | LDAP over TLS |
| 3268 | TCP | Global Catalog | AD LDAP global catalog |

### Network Infrastructure

| Port | Proto | Service | Notes |
|---|---|---|---|
| 67 | UDP | DHCP server | Receives client broadcasts |
| 68 | UDP | DHCP client | Client sends from port 68 |
| 546 | UDP | DHCPv6 client | |
| 547 | UDP | DHCPv6 server | |
| 123 | UDP | NTP | Network Time Protocol |
| 179 | TCP | BGP | Border Gateway Protocol |
| 161 | UDP | SNMP | Management polling |
| 162 | UDP | SNMP trap | Unsolicited notifications to manager |
| 514 | UDP | Syslog | Legacy; RFC 5426; no reliability |
| 6514 | TCP | Syslog/TLS | Reliable encrypted syslog (RFC 5425) |

### VPN and Security

| Port | Proto | Service | Notes |
|---|---|---|---|
| 500 | UDP | IKE | IPsec key exchange |
| 4500 | UDP | IKE NAT-T | IPsec through NAT |
| 1194 | TCP/UDP | OpenVPN | |
| 1723 | TCP | PPTP | Point-to-Point Tunneling Protocol; deprecated |
| 1701 | UDP | L2TP | Layer 2 Tunneling Protocol |
| 51820 | UDP | WireGuard | Modern VPN |

### Databases

| Port | Proto | Service | Notes |
|---|---|---|---|
| 1433 | TCP | MS SQL Server | |
| 1521 | TCP | Oracle DB | |
| 3306 | TCP | MySQL / MariaDB | |
| 5432 | TCP | PostgreSQL | |
| 6379 | TCP | Redis | No auth by default — bind to loopback! |
| 27017 | TCP | MongoDB | No auth by default — always enable auth |
| 9200 | TCP | Elasticsearch HTTP | |
| 9300 | TCP | Elasticsearch transport | |
| 5601 | TCP | Kibana | |

### Messaging and Streaming

| Port | Proto | Service | Notes |
|---|---|---|---|
| 5672 | TCP | AMQP | RabbitMQ |
| 5671 | TCP | AMQPS | AMQP over TLS |
| 9092 | TCP | Kafka | Default broker port |
| 2181 | TCP | ZooKeeper | Kafka coordination |
| 6650 | TCP | Pulsar | Apache Pulsar |

### Containers and Orchestration

| Port | Proto | Service | Notes |
|---|---|---|---|
| 2376 | TCP | Docker daemon | TLS |
| 2375 | TCP | Docker daemon | Unencrypted — never expose |
| 6443 | TCP | Kubernetes API | kubectl, control plane |
| 10250 | TCP | Kubelet API | |
| 2379/2380 | TCP | etcd | Kubernetes state store |
| 8472 | UDP | Flannel VXLAN | Kubernetes pod network overlay |

---

## SSH — Secure Shell Deep Dive

SSH (RFC 4253) replaced Telnet for remote access in the mid-1990s, invented by Tatu Ylönen after a password-sniffing incident at Helsinki University of Technology (1995).

```
SSH architecture (three layered protocols):
  SSH-TRANS   — SSH Transport Layer Protocol (TCP connection, encryption, server auth)
  SSH-AUTH    — SSH Authentication Protocol (client authentication)
  SSH-CONN    — SSH Connection Protocol (multiplexed channels: shell, exec, tunnel, SFTP)

Authentication methods:
  publickey     — SSH key pair (most secure; recommended)
  password      — password (vulnerable to brute force if exposed)
  keyboard-interactive — challenge-response (used for 2FA, OTP)
  none          — no auth (very limited use)
  gssapi-with-mic — Kerberos/GSSAPI (enterprise)
  hostbased     — host-level trust (legacy; avoid)

Key types (in order of preference):
  Ed25519       — modern, fast, small keys, recommended
  ECDSA P-256   — older elliptic curve, still good
  RSA 4096      — legacy; use Ed25519 for new keys
  DSA           — deprecated; never use
  RSA 1024/2048 — deprecated; minimum 3072; prefer Ed25519

Key generation:
  ssh-keygen -t ed25519 -C "user@host"
  ssh-keygen -t rsa -b 4096 -C "user@host"   # legacy RSA

Key files:
  ~/.ssh/id_ed25519      — private key (permissions: 600)
  ~/.ssh/id_ed25519.pub  — public key (add to server's authorized_keys)
  ~/.ssh/authorized_keys — server: list of authorized public keys

SSH config (~/.ssh/config):
  Host bastion
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_bastion
    Port 22

  Host internal-server
    HostName 10.0.1.50
    User ubuntu
    ProxyJump bastion    # jump through bastion host

Common SSH usage:
  ssh user@host
  ssh -p 2222 user@host                         # non-standard port
  ssh -i ~/.ssh/mykey user@host                 # specific key
  ssh -L 8080:localhost:80 user@host            # local port forward
  ssh -R 8080:localhost:80 user@host            # remote port forward
  ssh -D 1080 user@host                         # SOCKS proxy
  ssh -N -f user@host -L 3306:db:3306          # background tunnel; no shell
  ssh -J bastion user@internal                   # jump host

SSH hardening best practices:
  PasswordAuthentication no     # keys only
  PermitRootLogin no            # no root login
  Port 2222                     # non-standard port (security through obscurity, minor)
  AllowUsers alice bob          # whitelist specific users
  MaxAuthTries 3                # limit failed auth attempts
  LoginGraceTime 30             # timeout for auth
  UsePAM yes                    # PAM integration (2FA support)
  X11Forwarding no              # disable X11 forwarding
  AllowTcpForwarding no         # disable tunneling (if not needed)
```

---

## NTP — Network Time Protocol

Accurate time is critical for security (certificate validity, Kerberos tickets, log correlation, TLS), databases (transaction ordering), and distributed systems.

```
NTP versions:
  NTPv4 (RFC 5905) — current standard; millisecond accuracy
  NTS (Network Time Security, RFC 8915) — authenticated NTP; prevents time spoofing

Stratum levels:
  Stratum 0: atomic clocks, GPS receivers (reference clocks — not network-accessible)
  Stratum 1: servers directly connected to stratum 0 (ntp.pool.org tier 1)
  Stratum 2: synced from stratum 1 (most enterprise NTP servers)
  Stratum 3-15: synced from stratum above
  Stratum 16: unsynchronized

NTP pools:
  pool.ntp.org — public NTP pool with thousands of volunteers
  time.google.com, time.cloudflare.com — major public NTP servers
  0.pool.ntp.org, 1.pool.ntp.org, 2.pool.ntp.org, 3.pool.ntp.org — regional pools

Cisco NTP config:
  Router(config)# ntp server 216.239.35.0 prefer
  Router(config)# ntp server 216.239.35.4
  Router(config)# ntp update-calendar           ! sync hardware clock
  Router# show ntp status
  Router# show ntp associations

Linux:
  timedatectl status
  chronyc tracking                              ! chrony (modern, preferred)
  ntpq -p                                       ! ntpd (legacy)
  timedatectl set-ntp true
```

---

## SNMP — Simple Network Management Protocol

SNMP monitors and manages network devices — routers, switches, servers, printers.

```
Versions:
  SNMPv1 (RFC 1157, 1988): community string auth; not secure
  SNMPv2c (RFC 1901, 1993): community string; adds bulk operations
  SNMPv3 (RFC 3411, 2002): user auth (MD5/SHA), encryption (DES/AES); use this!

Architecture:
  Manager (NMS) — monitoring system (Zabbix, Nagios, SolarWinds, PRTG)
  Agent — process on managed device
  MIB (Management Information Base) — database of manageable objects
  OID (Object Identifier) — hierarchical ID for each managed object

Operations:
  GET      — manager requests specific object value
  GETNEXT  — next OID in tree (walking the MIB)
  GETBULK  — efficient bulk retrieval (SNMPv2+)
  SET      — manager changes a value on agent
  TRAP     — agent sends unsolicited notification to manager (UDP 162)
  INFORM   — acknowledged trap (manager sends ACK back) (SNMPv2+)
  RESPONSE — agent response to GET/GETNEXT/SET

Common MIBs / OIDs:
  1.3.6.1.2.1.1 — system info (sysDescr, sysUpTime, etc.)
  1.3.6.1.2.1.2 — interface table (ifDescr, ifSpeed, ifInOctets, ifOutOctets, ifInErrors)
  1.3.6.1.2.1.4 — IP MIB (routing table, fragmentation stats)
  1.3.6.1.4.1   — enterprise MIBs (Cisco, Juniper, HP, etc.)

Cisco SNMPv3 config:
  Router(config)# snmp-server group MONITOR v3 priv
  Router(config)# snmp-server user nms MONITOR v3 auth sha MyAuthPass priv aes 128 MyPrivPass
  Router(config)# snmp-server host 10.0.0.100 version 3 priv nms
  Router# show snmp user
  Router# show snmp group
```

---

## Syslog — System Logging

```
Syslog (RFC 5424) — standard logging protocol
Legacy UDP port 514 (unreliable, unencrypted)
Modern: TCP port 514 or TLS port 6514 (RFC 5425)

Severity levels (0=highest, 7=lowest):
  0 Emergency   — system is unusable
  1 Alert       — immediate action required
  2 Critical    — critical conditions
  3 Error       — error conditions
  4 Warning     — warning conditions (most common threshold)
  5 Notice      — normal but significant condition
  6 Informational — informational messages
  7 Debug       — debug-level messages

Facility codes (0-23):
  0  kernel   4  security/auth  9  clock daemon
  1  user     5  syslog        16-23 local0-local7 (custom)
  3  daemon   6  printer

Priority = facility × 8 + severity
  Example: local7.debug = 23×8+7 = 191

Cisco Syslog config:
  Router(config)# logging host 10.0.0.100
  Router(config)# logging trap informational       ! min severity to send
  Router(config)# logging buffered 64000 debugging ! local buffer
  Router(config)# service timestamps log datetime msec localtime show-timezone
  Router# show logging

Linux syslog (rsyslog / journald):
  logger -p local0.info "Test message"     ! send syslog message
  journalctl -f                            ! follow systemd journal
  journalctl -p err -n 50                  ! last 50 error+ messages
```

---

## LDAP and Active Directory

```
LDAP (RFC 4511): protocol for accessing directory services
AD (Active Directory): Microsoft's directory service built on LDAP + Kerberos + DNS

Port 389 TCP/UDP — LDAP
Port 636 TCP      — LDAPS (TLS)
Port 3268 TCP     — AD Global Catalog
Port 3269 TCP     — AD Global Catalog over TLS

LDAP structure:
  DN (Distinguished Name): cn=Alice,ou=Users,dc=example,dc=com
  Components:
    cn = Common Name
    ou = Organizational Unit
    dc = Domain Component
    uid = User ID

Common operations:
  bind    — authenticate
  search  — query objects
  add/delete/modify — manage objects
  compare — test an attribute value

ldapsearch examples:
  ldapsearch -H ldap://ldap.example.com -b "dc=example,dc=com" "(uid=alice)"
  ldapsearch -H ldaps://ldap.example.com -D "cn=admin,dc=example,dc=com" \
    -W -b "dc=example,dc=com" "(objectClass=user)" cn mail
```

---

## Tips

- Port numbers are just conventions — any service can run on any port, but well-known ports let clients connect without prior coordination.
- UDP-based services (DNS, SNMP, NTP, DHCP) have no connection state — stateful firewalls track them by source/destination IP+port with a timeout.
- SNMPv3 is the only version with real security — SNMPv1/v2c community strings are cleartext "passwords" visible to any network tap.
- SSH key authentication with Ed25519 is faster to verify, produces smaller signatures, and is resistant to timing attacks compared to RSA.
- NTP must be secured in high-security environments — NTS (Network Time Security, RFC 8915) adds authentication to prevent time-spoofing attacks.

---

## Summary

- Memorize the major port ranges: well-known (0-1023), registered (1024-49151), dynamic (49152-65535).
- SSH: Ed25519 keys preferred; always disable password auth in production; ProxyJump for bastion-host access.
- NTP: hierarchical stratum system; use pool.ntp.org or vendor servers; secure with NTS for sensitive environments.
- SNMP: always deploy v3 with auth and encryption; v1/v2c community strings are cleartext.
- Syslog: use TCP or TLS transport for reliable logging; never rely on UDP/514 for critical log delivery.
- LDAP: directory access protocol underlying Active Directory; always use LDAPS (636) or STARTTLS; never plain LDAP for auth.
