---
title: "Email Protocols — SMTP, IMAP, POP3"
sidebar_label: "Email Protocols"
sidebar_position: 45
---

# Email Protocols — SMTP, IMAP, POP3

Email predates the web and remains one of the internet's most important communication systems. SMTP delivers mail; IMAP and POP3 retrieve it. Modern email security (SPF, DKIM, DMARC) is as important as the protocols themselves.

---

## History

| Year | Protocol/Event |
|---|---|
| 1971 | Ray Tomlinson sends first email on ARPANET; introduces @-sign notation |
| 1982 | RFC 821 — SMTP standardized (still recognizable today) |
| 1984 | RFC 918 — POP1; 1988 RFC 1081 POP3 |
| 1994 | RFC 1730 — IMAP4 (current IMAP version) |
| 1995 | POP3S/IMAPS introduced (TLS wrapping) |
| 1998 | RFC 2476 — SMTP Submission (port 587, AUTH required) separates relay from submission |
| 2008 | RFC 5321 — current SMTP standard |
| 2010s | SPF, DKIM, DMARC become standard anti-spoofing trio |
| 2022 | SMTP TLS enforcement (MTA-STS, RFC 8461) widely deployed |

---

## SMTP — Simple Mail Transfer Protocol

SMTP is used to **send** email: from mail client to mail server, and between mail servers (relay).

### Ports

```
Port 25  — Server-to-server relay (SMTP relay)
           Client submission historically used port 25; now blocked by ISPs to prevent spam
           Modern firewalls block outbound port 25 from end-user networks

Port 587 — Mail Submission (RFC 2476)
           Clients (Outlook, Thunderbird, apps) submit mail to their SMTP server
           Requires STARTTLS + AUTH — authenticated and encrypted

Port 465 — SMTP over TLS (smtps)
           Implicit TLS from connection start; older standard, came back in use
           RFC 8314 recommends port 465 for clients with implicit TLS
```

### SMTP Session Example

```
Client connects to mail.example.com:587

Server: 220 mail.example.com ESMTP Postfix
Client: EHLO myserver.example.com         ← Extended Hello (announces extensions)
Server: 250-mail.example.com
        250-STARTTLS                        ← TLS upgrade available
        250-AUTH LOGIN PLAIN               ← authentication methods
        250-SIZE 52428800                   ← max message size
        250 8BITMIME

Client: STARTTLS                           ← upgrade to TLS
Server: 220 2.0.0 Ready to start TLS
[TLS handshake occurs]

Client: EHLO myserver.example.com         ← must repeat EHLO after STARTTLS
Server: 250-mail.example.com
        250 AUTH LOGIN PLAIN

Client: AUTH PLAIN <base64-encoded credentials>
Server: 235 2.7.0 Authentication successful

Client: MAIL FROM:<alice@example.com>     ← sender envelope address
Server: 250 2.1.0 Ok
Client: RCPT TO:<bob@remote.com>          ← recipient envelope address
Server: 250 2.1.5 Ok
Client: DATA
Server: 354 End data with <CR><LF>.<CR><LF>
Client: From: Alice <alice@example.com>   ← message headers
        To: Bob <bob@remote.com>
        Subject: Hello
        MIME-Version: 1.0
        Content-Type: text/plain
                                           ← blank line separates headers from body
        Hi Bob, how are you?
        .                                  ← single dot on line = end of message
Server: 250 2.0.0 Ok: queued as 1234567
Client: QUIT
Server: 221 2.0.0 Bye
```

### SMTP Relay Path

```
Alice's mail client (MUA)
      │  SMTP submission (port 587, authenticated)
      ▼
Alice's SMTP server (MSA/MTA)
      │  SMTP relay (port 25, TLS opportunistic or forced)
      ▼
Bob's SMTP server (MTA) ← MX record lookup for remote.com
      │
      ▼ (stored in mailbox)
Bob's mail client (MUA) ← retrieves via IMAP or POP3

MUA = Mail User Agent (client: Outlook, Thunderbird, Gmail web)
MTA = Mail Transfer Agent (relay server: Postfix, Sendmail, Exim)
MSA = Mail Submission Agent (accepts from clients: often same as MTA)
MDA = Mail Delivery Agent (delivers to mailbox: Dovecot, procmail)
```

### SMTP Commands Reference

```
EHLO domain    — extended hello (use instead of HELO)
HELO domain    — simple hello (legacy)
MAIL FROM:     — sender's envelope address
RCPT TO:       — recipient's envelope address (one per recipient)
DATA           — start message data
.              — single dot on its own line = end of DATA
RSET           — reset current transaction (keep connection)
VRFY address   — verify if address exists (often disabled - privacy/spam)
EXPN list      — expand a mailing list (often disabled)
QUIT           — end session
STARTTLS       — upgrade to TLS
AUTH           — authenticate (PLAIN, LOGIN, CRAM-MD5, etc.)
SIZE n         — declare message size (sent with MAIL FROM)
```

### SMTP Response Codes

```
2xx — Success
  220 Service ready
  221 Closing connection
  235 Authentication successful
  250 Requested action OK
  251 User not local, forwarding
  354 Start mail input

4xx — Temporary failure (retry later)
  421 Service not available (try again)
  450 Mailbox unavailable (try again)
  451 Local error (try again)
  452 Insufficient storage (try again)

5xx — Permanent failure (do not retry)
  500 Syntax error (command unrecognized)
  501 Syntax error in parameters
  502 Command not implemented
  503 Bad sequence of commands
  504 Command parameter not implemented
  550 Mailbox unavailable (permanent)
  551 User not local, no forwarding
  552 Exceeded storage allocation
  553 Mailbox name not allowed
  554 Transaction failed (spam rejection, etc.)
```

---

## Email Security — SPF, DKIM, DMARC

Email spoofing is trivially easy in raw SMTP — the `MAIL FROM` and `From:` header can be anything. These three DNS-based mechanisms fix this.

### SPF — Sender Policy Framework (RFC 7208)

SPF specifies which mail servers are authorized to send email for a domain.

```
DNS TXT record for example.com:
  v=spf1 ip4:203.0.113.10 ip4:203.0.113.11 include:sendgrid.net -all

Parsing:
  v=spf1           — SPF version
  ip4:203.0.113.10 — authorize this specific IP
  include:sendgrid.net — include SendGrid's authorized IPs
  -all             — fail everything else (hard fail)
  ~all             — soft fail everything else (spam folder)
  +all             — pass everything (NEVER use this!)
  ?all             — neutral (not recommended)

How it works:
  1. Receiving MTA gets email claiming to be from alice@example.com
  2. Looks up SPF TXT record for example.com
  3. Checks if sending server's IP is in the authorized list
  4. Pass: deliver normally; Fail: reject or spam; SoftFail: spam folder

Limitations:
  Checks the MAIL FROM (envelope sender), not the From: header
  SPF breaks on email forwarding (forwarder's IP isn't in original domain's SPF)
  Maximum 10 DNS lookups allowed in SPF evaluation
```

### DKIM — DomainKeys Identified Mail (RFC 6376)

DKIM uses public key cryptography to sign outgoing email — proves the email hasn't been tampered with.

```
How it works:
  1. Sending server signs the email (headers + body) with a private key
  2. Signature added as DKIM-Signature: header
  3. Public key published in DNS: selector._domainkey.example.com
  4. Receiving server fetches public key, verifies signature

DNS TXT record (public key):
  selector1._domainkey.example.com:
  v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...

DKIM-Signature header in email:
  DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
    d=example.com; s=selector1;
    h=from:to:subject:date:message-id;
    bh=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=;
    b=ABC123...signature-bytes...

Advantages over SPF:
  Checks the From: header (what users see)
  Survives forwarding (signature travels with the email)
  Provides message integrity (tampering breaks signature)

Limitations:
  Doesn't prevent delivery of unsigned emails
  Private key compromise allows impersonation
  Use 2048-bit RSA or Ed25519 keys; rotate periodically
```

### DMARC — Domain-based Message Authentication, Reporting and Conformance (RFC 7489)

DMARC ties SPF and DKIM together and adds a policy for what to do when they fail.

```
DNS TXT record at _dmarc.example.com:
  v=DMARC1; p=reject; rua=mailto:dmarc-reports@example.com; pct=100

Fields:
  v=DMARC1              — version
  p=none/quarantine/reject — policy when SPF/DKIM fail
    none:       monitor only; take no action
    quarantine: send to spam folder
    reject:     reject the message outright
  rua=mailto:...        — aggregate report destination (daily digest)
  ruf=mailto:...        — forensic report destination (individual failures)
  pct=100               — percentage of mail to apply policy to (100=all)
  adkim=s               — strict DKIM alignment (domain must exactly match)
  aspf=s                — strict SPF alignment
  sp=reject             — policy for subdomains

DMARC alignment:
  Requires SPF or DKIM to "align" with the From: domain
  SPF alignment: envelope-from domain matches From: domain
  DKIM alignment: d= in DKIM signature matches From: domain
  Alignment prevents: alice@example.com From: with attacker.com envelope sender

Deployment strategy:
  1. p=none — monitor for 2-4 weeks; review reports
  2. p=quarantine; pct=10 — apply to 10% of mail; watch bounce/delivery reports
  3. p=quarantine; pct=100 — full quarantine
  4. p=reject — full enforcement (goal)
```

---

## IMAP — Internet Message Access Protocol

IMAP retrieves email while keeping it **on the server** — multiple devices stay synchronized.

```
Port 143  — plain IMAP (use STARTTLS)
Port 993  — IMAP over TLS (IMAPS)

IMAP session example:
  Client: A001 LOGIN alice secretpassword
  Server: A001 OK LOGIN completed
  Client: A002 LIST "" "*"
  Server: * LIST (\HasNoChildren) "." INBOX
          * LIST (\HasNoChildren) "." Sent
          A002 OK LIST completed
  Client: A003 SELECT INBOX
  Server: * 1847 EXISTS          ← total messages
          * 0 RECENT             ← new since last access
          * OK [UNSEEN 1823]     ← first unseen message
          A003 OK [READ-WRITE] SELECT completed
  Client: A004 FETCH 1823:1847 (FLAGS ENVELOPE)   ← get metadata for new messages
  Server: * 1823 FETCH (FLAGS (\Seen) ENVELOPE ...)
          ...
  Client: A005 FETCH 1847 (BODY[])               ← fetch complete message
  Server: * 1847 FETCH (BODY[] {3847}
          <message content>)
  Client: A006 STORE 1847 +FLAGS (\Seen)         ← mark as read
  Client: A007 LOGOUT
```

### IMAP Key Features

```
Server-side storage:
  Mail stays on server; client downloads and displays
  Multiple clients (phone, laptop, webmail) see same state
  Folder sync, read/unread status, flags synchronized

Push vs Poll:
  IMAP IDLE (RFC 2177): client sends IDLE command, server pushes notifications
  Without IDLE: client polls periodically (every 5-15 minutes)
  IDLE is "push" — immediate notification of new mail
  Required for good mobile battery life (no continuous polling)

IMAP folders/flags:
  Standard flags: \Seen \Answered \Flagged \Deleted \Draft \Recent
  Application-specific keywords: Junk NotJunk MDNSent
  Folders are virtual containers on the server

Important IMAP commands:
  LOGIN user pass         — authenticate
  LIST "" "*"             — list all folders
  SELECT INBOX            — open a mailbox
  EXAMINE mailbox         — open read-only
  FETCH n (FLAGS ENVELOPE BODY[]) — get message info and/or content
  STORE n +FLAGS (\Seen)  — set flags
  COPY n destination      — copy message to folder
  EXPUNGE                 — permanently delete messages marked \Deleted
  SEARCH UNSEEN           — search for messages
  IDLE                    — enter push notification mode
  LOGOUT                  — close session
```

---

## POP3 — Post Office Protocol version 3

POP3 **downloads** email and (typically) **deletes it from the server** — designed for a single-device world.

```
Port 110 — plain POP3 (use STARTTLS)
Port 995 — POP3 over TLS (POP3S)

POP3 commands:
  USER username    — specify username
  PASS password    — specify password
  STAT             — number of messages and total size
  LIST [n]         — list messages (and sizes)
  RETR n           — retrieve message n
  DELE n           — mark message n for deletion
  RSET             — reset (undelete all)
  NOOP             — keep-alive
  QUIT             — end session (and delete marked messages)

POP3 session:
  +OK POP3 server ready
  USER alice
  +OK
  PASS secretpassword
  +OK Welcome alice
  STAT
  +OK 5 14823         ← 5 messages, total 14823 bytes
  LIST
  +OK
  1 4096
  2 2048
  3 8679
  .
  RETR 1
  +OK 4096 octets
  <message content>
  .
  DELE 1              ← mark for deletion
  +OK message 1 deleted
  QUIT
  +OK Dewey POP3 server signing off (1 message deleted)
```

### IMAP vs POP3

| Feature | IMAP | POP3 |
|---|---|---|
| Storage | Server (permanent) | Downloaded to client |
| Multiple devices | Yes — all see same state | No — device that downloads gets the mail |
| Server-side search | Yes | No |
| Folder sync | Yes | No |
| Push notifications | Yes (IDLE) | No |
| Bandwidth | Only downloads requested headers/bodies | Downloads everything |
| Use today | Standard for most users | Legacy; simple scripts; single-device setups |

---

## Mail Authentication DNS Records Summary

```
SPF:   TXT record at example.com
       "v=spf1 include:sendgrid.net ip4:203.0.113.0/24 -all"

DKIM:  TXT record at selector1._domainkey.example.com
       "v=DKIM1; k=rsa; p=<public key>"

DMARC: TXT record at _dmarc.example.com
       "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"

MX:    MX record at example.com → mail.example.com (priority 10)
       A/AAAA record at mail.example.com → server IP

BIMI:  TXT record at default._bimi.example.com (Brand Indicators for Message Identification)
       Associates brand logo with authenticated email — requires DMARC p=quarantine/reject

MTA-STS (RFC 8461):  _mta-sts.example.com TXT + https://mta-sts.example.com/.well-known/mta-sts.txt
       Forces TLS on incoming connections — prevents downgrade attacks
```

---

## Tips

- Always use port 587 (SMTP submission with STARTTLS) or 465 (implicit TLS) for client submission — port 25 is for server-to-server relay and blocked by most ISPs.
- Implement all three: SPF + DKIM + DMARC — SPF and DKIM alone don't prevent spoofing; DMARC aligns them and provides policy + reporting.
- Start DMARC with `p=none` for monitoring before enforcing `p=quarantine` or `p=reject` — blind enforcement can cause legitimate mail to be rejected.
- DKIM keys should be at least 2048 bits; rotate them periodically (every 6-12 months) — short keys can be factored.
- IMAP IDLE is critical for responsive mobile email — it uses a single long-lived connection for push instead of polling every few minutes.

---

## Summary

- SMTP delivers email: port 587 (submission, authenticated) and port 25 (server relay); STARTTLS or implicit TLS required.
- IMAP (port 143/993) keeps mail on the server — multiple devices synchronized; POP3 (port 110/995) downloads and deletes — single-device legacy.
- SPF: DNS-based whitelist of authorized sending IPs (checks envelope sender).
- DKIM: cryptographic signature on email headers/body, public key in DNS (checks From: domain, survives forwarding).
- DMARC: policy for SPF/DKIM failures (none/quarantine/reject) + alignment checking + aggregate/forensic reporting.
- Deploy SPF + DKIM + DMARC with `p=reject` for full email security; start with `p=none` to monitor before enforcing.
