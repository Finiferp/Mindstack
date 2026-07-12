---
title: "FTP, SFTP, and File Transfer Protocols"
sidebar_label: "FTP & File Protocols"
sidebar_position: 46
---

# FTP, SFTP, and File Transfer Protocols

File transfer protocols evolved from FTP's 1971 origins through the security-conscious SFTP and modern object storage APIs. Understanding FTP's architecture explains many firewall and NAT challenges that engineers still encounter today.

---

## FTP — File Transfer Protocol (RFC 959)

FTP is one of the oldest internet protocols still in common use. It was first defined in 1971 (RFC 114), significantly revised in 1980 (RFC 765), and standardized in its current form in 1985 (RFC 959).

### Why FTP Is Architecturally Unusual

FTP uses **two separate TCP connections**:
1. **Control connection (port 21)** — command and response channel; persists for the session.
2. **Data connection (port 20 or ephemeral)** — opened for each file transfer or directory listing; closed when done.

This dual-channel design made sense in 1971 but causes significant NAT and firewall problems that engineers still deal with today.

---

## Active vs Passive Mode

The dual connections create two operating modes with very different behavior behind NAT.

### Active Mode (FTP Traditional)

```
Client                              Server
Port: ephemeral (e.g. 51234)        Port: 21 (control)
                                    Port: 20 (data)

1. Client opens control connection:
   Client:51234 ──────────────────► Server:21
2. Client sends PORT command: "Connect to me on 51234"
   PORT 192,168,1,100,200,50        ← client's IP, port 200*256+50=51250
3. Server opens data connection BACK to client:
   Server:20 ──────────────────────► Client:51250

PROBLEM: Server initiates the data connection BACK to the client.
→ Client-side firewall blocks incoming connection from server port 20!
→ NAT doesn't know how to forward the inbound connection to the client
→ Active FTP fails through almost all modern firewalls and NAT
```

### Passive Mode (PASV)

```
Client                              Server
Port: ephemeral (e.g. 51234)        Port: 21 (control)
                                    Port: ephemeral (e.g. 49152) (data)

1. Client opens control connection:
   Client:51234 ──────────────────► Server:21
2. Client sends PASV command: "Tell me your data port"
3. Server responds: "Connect to me on 192.0.2.1:49152"
4. Client opens data connection TO server:
   Client:51235 ──────────────────► Server:49152

Client initiates BOTH connections → works through client-side firewalls and NAT!
Server must open a range of passive ports (e.g., 49152-65535) in its firewall.

FTPS (PASV problem with EPSV):
  PASV returns an IPv4 address — doesn't work with IPv6
  EPSV (Extended Passive Mode) — server just returns a port; client uses same IP
  Use EPSV over PASV for IPv6 and modern setups
```

### FTP Commands Reference

```
Control connection commands:
  USER username      — send username
  PASS password      — send password
  QUIT               — close session
  SYST               — server OS type
  TYPE I             — binary mode (image — transfers exactly as-is)
  TYPE A             — ASCII mode (text — may translate line endings: \r\n vs \n)
  PORT h1,h2,h3,h4,p1,p2  — active mode: tell server where to connect
  PASV               — enter passive mode; get server's data port
  EPSV               — extended passive mode (port only, no IP)
  LIST               — directory listing
  NLST               — name list (simpler)
  RETR filename      — download a file
  STOR filename      — upload a file
  APPE filename      — append to file
  DELE filename      — delete file
  MKD dirname        — make directory
  RMD dirname        — remove directory
  CWD dirname        — change working directory
  PWD                — print working directory
  RNFR oldname / RNTO newname — rename
  REST offset        — resume transfer from offset (RETR follows with the offset)
  STAT               — server status / file info
  FEAT               — server features (MLST, EPSV, etc.)
  MLSD               — machine-readable directory listing (modern alternative to LIST)
  SIZE filename      — file size in bytes

FTP response codes:
  1xx: Positive Preliminary (transfer started)
  2xx: Positive Completion (success)
  3xx: Positive Intermediate (more input needed)
  4xx: Transient Negative (try again)
  5xx: Permanent Negative (don't retry)
```

### FTP Security Problems

```
FTP was designed before the concept of network security:

1. Credentials sent in clear text:
   USER alice → visible in packet capture
   PASS secretpassword → completely exposed

2. Data transferred in clear text:
   All file contents readable to any network observer

3. Bounce attack:
   FTP PORT command can specify ANY address — attacker uses your server
   to scan other servers via FTP data connections
   Fix: servers should refuse PORT commands specifying addresses ≠ client's IP

4. No integrity verification:
   File corruption during transfer is possible and undetected by FTP itself
   (md5sum/sha256sum the file after transfer)

FTP is NEVER appropriate for sensitive data over untrusted networks.
Use FTPS (FTP + TLS) or SFTP (SSH) instead.
```

---

## FTPS — FTP over TLS (RFC 4217)

FTPS adds TLS encryption to FTP while keeping the same command structure.

### Two Modes

```
Explicit FTPS (AUTH TLS):
  1. Connect to port 21 normally
  2. Send AUTH TLS command: "I want to upgrade to TLS"
  3. TLS handshake occurs
  4. All subsequent control channel communication encrypted
  5. Issue PBSZ 0 (protection buffer size) and PROT P (encrypt data channel too)
  → Backward compatible: server supports plain FTP if client doesn't request TLS

Implicit FTPS:
  Connects directly to port 990 with TLS from the start
  Less common; port 990 must be open in firewall
  Client must support implicit FTPS explicitly
```

### NAT with FTPS

FTPS breaks FTP's ALG (Application Layer Gateway) in NAT devices:
```
Problem: FTP ALG in NAT/firewall intercepts FTP control traffic to fix IP addresses in
PORT and PASV responses. But with TLS, the control channel is encrypted — the ALG
can't see inside to fix the addresses!

Fix: Use EPSV (Extended Passive Mode) — server returns port only, no IP address.
Client uses the control connection's server IP automatically.
→ No ALG needed; works through most NATs with EPSV
```

---

## SFTP — SSH File Transfer Protocol

SFTP is NOT FTP with SSH — it's an entirely different protocol that runs as a subsystem of SSH. It provides encrypted, authenticated file transfer using SSH's security model.

```
Port 22 (SSH)
Protocol: binary (not text like FTP)
Connection: single channel (multiplexed over SSH) — no dual connections, no passive mode
Authentication: SSH key or password (via SSH)

Advantages over FTP:
  Encrypted by default (SSH encryption)
  Single connection — works perfectly through NAT and firewalls
  SSH key authentication (more secure than passwords)
  All operations over one connection — no data connection complications
  Part of the SSH suite — no separate server needed

Common commands (sftp client interactive):
  sftp user@host
  > ls, lls        — remote and local directory listing
  > cd, lcd        — change remote/local directory
  > get remotefile [localfile]   — download
  > put localfile [remotefile]   — upload
  > mget, mput     — multiple files
  > rm remotefile  — delete remote file
  > mkdir, rmdir   — directory management
  > rename old new — rename
  > pwd, lpwd      — print working directory
  > bye, exit      — close session

Command-line examples:
  sftp user@server
  sftp -P 2222 user@server                        # non-standard port
  sftp user@server:/remote/path /local/path       # non-interactive download
  echo "put /local/file /remote/file" | sftp user@server  # scripted

OpenSSH scp (uses SFTP protocol on modern systems):
  scp local.txt user@server:/path/remote.txt
  scp -r user@server:/path/dir /local/dir
  scp -P 2222 user@server:/file /local/         # non-standard port
```

---

## SCP — Secure Copy Protocol

```
SCP originally used its own protocol (rcp over SSH), but modern OpenSSH
uses SFTP protocol for scp commands by default (since OpenSSH 9.0).

Legacy SCP protocol: deprecated, use -O flag to force old behavior
New behavior: -O uses SFTP subsystem (preferred)

For scripting and automation, prefer:
  rsync over SSH — efficient, resumable, preserves attributes
  rsync -avz -e ssh user@server:/remote/ /local/
  rsync -avz --progress /local/ user@server:/remote/
```

---

## TFTP — Trivial File Transfer Protocol (RFC 1350)

TFTP is the minimal file transfer protocol — no authentication, no directory listing, just read/write a file. Uses UDP port 69.

```
Use cases:
  Network booting (PXE — Preboot eXecution Environment)
  Uploading firmware to network devices (Cisco IOS upgrades via TFTP)
  Downloading configs from TFTP server during device initialization

Protocol:
  UDP-based (no connection)
  5 packet types: Read Request (RRQ), Write Request (WRQ), Data, ACK, Error
  512-byte data blocks; sender waits for ACK before next block
  Block size option: negotiate up to 65464 bytes (tsize option)

Cisco IOS TFTP usage:
  Router# copy tftp flash:
  Address or name of remote host? 192.168.1.100
  Source filename? c2900-universalk9-mz.SPA.157-3.M5.bin
  Destination filename? [c2900-universalk9-mz.SPA.157-3.M5.bin]
  Loading c2900-universalk9-mz.SPA... OK

  Router# copy running-config tftp:
  Router# copy tftp: running-config   # restore config from TFTP
```

---

## Modern File Transfer Alternatives

### rsync

```
rsync: efficient file sync tool — only transfers changed blocks
rsync -avz --progress /local/dir/ user@server:/remote/dir/
rsync -avz --delete /local/ user@server:/remote/  # mirror (delete remote files not in local)

Advantages:
  Delta sync — only sends changed bytes within files (not whole files)
  Preserve permissions, timestamps, symlinks (-a = archive)
  Can run over SSH (default) or rsync daemon (port 873)
  Bandwidth limiting: --bwlimit=1000 (KB/s)
  Dry run: -n or --dry-run (show what would happen)
```

### Object Storage APIs (S3 Compatible)

```
Modern file storage for cloud-native workloads:
  AWS S3, Google Cloud Storage, Azure Blob, MinIO (self-hosted)
  HTTP-based API (PUT, GET, DELETE objects)
  No concept of "directories" — flat namespace with key prefixes
  Scales to unlimited files, unlimited size (within object limits)

AWS CLI:
  aws s3 cp file.txt s3://bucket/prefix/file.txt
  aws s3 sync /local/dir s3://bucket/prefix/
  aws s3 ls s3://bucket/prefix/
  aws s3 rm s3://bucket/key

Advantages over FTP:
  No NAT/firewall issues (standard HTTPS)
  Authentication via IAM, signed URLs
  Versioning, lifecycle policies, encryption at rest
  Multi-region replication built in
  Presigned URLs for temporary access
```

---

## Tips

- Always use SFTP or FTPS — never plain FTP — for any file with sensitive content; credentials are in clear text with FTP.
- When configuring passive FTP on a server behind NAT, set the passive IP address to the server's public IP and limit the passive port range; open those ports in the firewall.
- SFTP through SSH is the simplest secure file transfer — it uses the same port (22), same authentication, and same keys as SSH.
- For large-scale file sync, rsync over SSH is dramatically more efficient than FTP or SCP — it only transfers the delta (changed blocks).
- TFTP requires no authentication — only use it on trusted isolated management networks; never expose TFTP to untrusted networks.

---

## Summary

- FTP uses dual connections (control:21, data:20 or passive port) — Active mode fails through NAT; always use Passive mode (PASV/EPSV).
- FTP sends credentials and data in plain text — use FTPS (AUTH TLS) or SFTP for security.
- SFTP is SSH-based, not FTP-based — single encrypted channel, works perfectly through firewalls and NAT.
- TFTP (UDP/69) is unauthenticated and minimal — used for PXE boot and network device firmware updates.
- For modern workflows: object storage (S3-compatible) APIs over HTTPS replace FTP for cloud-native storage; rsync over SSH replaces FTP for efficient directory synchronization.
