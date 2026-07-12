---
title: "TLS/SSL — Transport Layer Security"
sidebar_label: "TLS/SSL"
sidebar_position: 44
---

# TLS/SSL — Transport Layer Security

TLS is the cryptographic protocol that secures HTTPS, email, VPNs, and virtually every other sensitive internet communication. Understanding TLS means understanding certificates, cipher suites, the handshake, and why TLS 1.3 is a major leap forward.

---

## History

| Year | Version | RFC | Notes |
|---|---|---|---|
| 1995 | SSL 2.0 | — | Netscape; serious flaws; never standardized |
| 1996 | SSL 3.0 | RFC 6101 | Significant redesign; POODLE attack (2014) |
| 1999 | TLS 1.0 | RFC 2246 | IETF standardizes; minor SSL 3.0 improvements; BEAST attack |
| 2006 | TLS 1.1 | RFC 4346 | Fixes BEAST; explicit IV |
| 2008 | TLS 1.2 | RFC 5246 | SHA-256, GCM ciphers, major improvement; still widely used |
| 2018 | **TLS 1.3** | RFC 8446 | Complete overhaul; 1-RTT handshake, 0-RTT resumption, forward secrecy always |
| 2021 | DTLS 1.3 | RFC 9147 | TLS 1.3 over UDP (QUIC uses its own variant) |

SSL is dead — SSL 2.0 and 3.0 are deprecated and should never be used. "SSL certificate" is a colloquial term; the protocol is TLS.

---

## Symmetric vs Asymmetric Cryptography

```
Symmetric encryption (e.g., AES):
  Same key encrypts and decrypts
  Fast — hardware-accelerated in modern CPUs (AES-NI instructions)
  Problem: how do two strangers agree on a shared key securely?

Asymmetric encryption (e.g., RSA, ECDH):
  Key pair: public key (anyone can have) + private key (kept secret)
  What public key encrypts → only private key can decrypt
  Or: digital signature made by private key → anyone with public key can verify
  Slow — not used for bulk data (too expensive CPU-wise)
  Used for: key exchange, digital signatures, certificate verification

TLS uses both:
  Asymmetric: used during handshake to establish a shared secret
  Symmetric: all actual data encrypted with symmetric keys derived from shared secret
  → Best of both worlds: security of asymmetric + speed of symmetric
```

---

## X.509 Certificates

A certificate is a digital document that binds a public key to an identity (domain name, organization).

```
Certificate fields:
  Version        — X.509 v3 (most common)
  Serial Number  — unique identifier assigned by CA
  Issuer         — CA that signed this certificate
  Subject        — who this certificate belongs to (CN=example.com)
  Subject Alternative Names (SANs) — additional domains covered
  Validity       — Not Before, Not After (dates)
  Public Key     — the public key associated with the domain
  Extensions     — Key Usage, Extended Key Usage, OCSP URL, CRL URL, CA flag
  Signature      — CA's digital signature over all the above fields

Reading a certificate:
  openssl x509 -in cert.pem -text -noout

Common fields in Subject:
  CN (Common Name)       — primary domain (legacy; use SAN instead)
  O  (Organization)      — company name
  OU (Organizational Unit)
  C  (Country)           — 2-letter country code
  ST (State/Province)
  L  (Locality/City)
```

### Certificate Types

```
DV (Domain Validated):
  CA verifies you control the domain (DNS challenge or HTTP challenge)
  Automated via ACME protocol (Let's Encrypt)
  Issued in seconds; no human review

OV (Organization Validated):
  CA verifies the organization exists (business registration check)
  Shows organization name in certificate
  Takes hours/days; requires documentation

EV (Extended Validated):
  Strictest vetting; green address bar in older browsers
  Modern browsers removed the visual distinction — EV benefits diminished
  Most organizations use DV (automated via Let's Encrypt)

Wildcard: *.example.com — covers any single-level subdomain (not *.sub.example.com)
SAN multi-domain: covers example.com, www.example.com, api.example.com explicitly

Let's Encrypt:
  Free, automated, open CA — launched 2015; now secures ~50% of HTTPS sites
  ACME protocol (RFC 8555) for automated issuance and renewal
  90-day certificates (short to encourage automation)
  certbot / acme.sh / Caddy automate renewal
```

### Certificate Chain of Trust

```
Root CA (self-signed) — stored in OS/browser trust store
  └── Intermediate CA (signed by Root CA)
        └── End-Entity Certificate (your server cert, signed by Intermediate CA)

Verification:
  1. Browser receives server cert + intermediate cert
  2. Checks server cert signature → valid under intermediate CA key
  3. Checks intermediate cert → valid under Root CA key
  4. Root CA in browser's trust store → TRUSTED ✓

Why intermediates?
  Root CA private keys are kept offline (air-gapped HSMs) — never exposed
  If an intermediate is compromised: revoke just that intermediate
  If a Root CA is compromised: catastrophic (must remove from all browsers)
  Root CAs only sign intermediate CA certs; intermediates sign end-entity certs

Checking a certificate chain:
  openssl s_client -connect example.com:443 -showcerts
  openssl verify -CAfile chain.pem server.crt
```

---

## TLS 1.2 Handshake

Understanding TLS 1.2 shows why TLS 1.3 is an improvement.

```
Client                               Server
  │                                      │
  │──── ClientHello ────────────────────►│  TLS version, random, cipher suites, extensions
  │                                      │
  │◄─── ServerHello ─────────────────────│  Chosen cipher suite, random, session ID
  │◄─── Certificate ─────────────────────│  Server's cert chain
  │◄─── ServerKeyExchange (if needed) ───│  e.g., ECDH parameters
  │◄─── ServerHelloDone ─────────────────│  "I'm done"
  │                                      │
  │──── ClientKeyExchange ──────────────►│  Client's key contribution (ECDH or RSA-encrypted premaster)
  │──── ChangeCipherSpec ───────────────►│  "Switching to encrypted now"
  │──── Finished ───────────────────────►│  First encrypted message; verify handshake integrity
  │                                      │
  │◄─── ChangeCipherSpec ────────────────│
  │◄─── Finished ────────────────────────│
  │                                      │
  │══════════ Encrypted Data ═══════════►│  2 RTT total before first data

Problems with TLS 1.2:
  2 RTT latency before data can flow (TCP 1 RTT + TLS 2 RTT = 3 RTT total from TCP SYN)
  Optional forward secrecy (depends on cipher suite choice)
  Multiple deprecated/weak cipher suites still supported
  Complex negotiation — many options create attack surface
```

---

## TLS 1.3 Handshake (RFC 8446)

TLS 1.3 is a complete redesign for modern security and performance.

```
Client                                Server
  │                                      │
  │──── ClientHello ────────────────────►│  Version, cipher suites, key_share (DH public key!)
  │     (includes key_share = client's   │
  │      DH public key in the SAME msg)  │
  │                                      │
  │◄─── ServerHello ─────────────────────│  Chosen cipher, server's key_share
  │◄─── {Certificate} ───────────────────│  Encrypted! (TLS 1.3 encrypts certs)
  │◄─── {CertificateVerify} ─────────────│  Signature proving server has private key
  │◄─── {Finished} ──────────────────────│  All in ONE server flight
  │                                      │
  │──── {Finished} ─────────────────────►│  Verify handshake; now send data!
  │──── {HTTP Request} ─────────────────►│
  │                                      │  1 RTT total!

Key improvements in TLS 1.3:
  1-RTT handshake (vs 2-RTT in TLS 1.2)
  0-RTT resumption (for known servers; with replay caveats)
  Forward secrecy ALWAYS (ECDHE key exchange mandatory)
  Certificates are encrypted in transit (harder to intercept/analyze)
  Removed all weak/legacy algorithms: RC4, 3DES, MD5, SHA-1, CBC-mode, RSA key exchange
  Only 5 cipher suites allowed (vs 300+ in TLS 1.2)
  Simplified state machine (fewer messages)
```

### TLS 1.3 Cipher Suites (all that's allowed)

```
TLS_AES_128_GCM_SHA256          — most common; strong, fast
TLS_AES_256_GCM_SHA384          — stronger keys
TLS_CHACHA20_POLY1305_SHA256    — alternative; better on mobile CPUs without AES-NI
TLS_AES_128_CCM_SHA256          — constrained IoT devices
TLS_AES_128_CCM_8_SHA256        — very constrained IoT (short authentication tags)

Key exchange: ALWAYS ECDHE (forward secrecy)
Auth: RSA signatures or ECDSA (certificate)
Encryption: AES-GCM or ChaCha20-Poly1305 (AEAD — Authenticated Encryption with Associated Data)
MAC: SHA-256 or SHA-384 (built into AEAD — no separate MAC needed)
```

---

## Forward Secrecy and Key Exchange

```
RSA key exchange (TLS 1.2 optional, TLS 1.3 removed):
  Client encrypts session key using server's RSA public key
  If server's private key is stolen LATER: attacker can decrypt ALL past sessions
  No forward secrecy — every session's key derivable from the private key

ECDHE (Elliptic Curve Diffie-Hellman Ephemeral):
  Each session generates a NEW ephemeral key pair
  Shared secret derived via DH — math that doesn't expose either private key
  Even if server's long-term private key is stolen: past sessions remain secure
  Forward secrecy (also called Perfect Forward Secrecy, PFS)

How ECDHE works:
  1. Both sides have a long-term key (RSA/ECDSA) for identity verification
  2. Both generate a random ephemeral ECDH key pair just for this session
  3. Exchange public halves
  4. Both compute: shared_secret = ECDH(their_priv, other_pub) = same result
  5. Derive encryption keys from shared_secret
  6. Ephemeral private keys are discarded — no one can reconstruct the session key later

Elliptic curve groups used in TLS 1.3:
  x25519  — most common (Curve25519, designed by D.J. Bernstein)
  x448    — stronger, slower
  secp256r1 — NIST P-256 (NIST curves; some distrust them due to NSA involvement)
  secp384r1 — NIST P-384
```

---

## Certificate Revocation

When a certificate is compromised, it must be revoked before expiry.

```
CRL (Certificate Revocation List):
  CA publishes a list of revoked serial numbers
  Clients download and check
  Problem: CRLs can be MBs in size; not checked in real-time; latency

OCSP (Online Certificate Status Protocol, RFC 6960):
  Client queries CA's OCSP responder with cert serial number
  Responder: "good", "revoked", or "unknown"
  Problem: privacy (CA knows every site you visit), latency, OCSP soft-fail

OCSP Stapling (RFC 6066):
  Server gets OCSP response from CA, attaches ("staples") it to TLS handshake
  Client receives fresh signed OCSP response without contacting CA
  Best of both worlds: real-time revocation, no privacy leak, no extra RTT
  Modern servers (Nginx, Apache, Caddy) support OCSP stapling

CRLite / Certificate Transparency logs:
  Mozilla's approach: batch OCSP responses into a compact filter
  Browser ships a pre-computed filter of all revoked certs — no real-time query needed

Short-lived certificates:
  Let's Encrypt issues 90-day certs; ACME automates renewal
  Some propose 24-hour certs that never need revocation (never long enough to matter)
```

---

## Cipher Suite Anatomy (TLS 1.2 example)

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256

TLS        — protocol
ECDHE      — key exchange algorithm (Elliptic Curve Diffie-Hellman Ephemeral)
RSA        — authentication algorithm (server's certificate type)
AES_128_GCM — bulk encryption (AES 128-bit in GCM mode)
SHA256     — MAC algorithm for record integrity (GCM includes this, but specified)

Breaking it down:
  ECDHE_RSA: ephemeral key exchange, RSA cert authentication → forward secrecy
  vs ECDH_RSA: static DH — NO forward secrecy
  vs RSA: no DH at all — NO forward secrecy
  AES_128_GCM: AEAD mode — encryption + authentication in one pass, fast, secure
  vs AES_128_CBC: older CBC mode — vulnerable to padding oracles, BEAST/POODLE
  vs RC4: stream cipher — broken, never use
```

---

## mTLS — Mutual TLS

Standard TLS authenticates only the server. Mutual TLS authenticates both sides.

```
Standard TLS:
  Client verifies server's certificate (is this really example.com?)
  Server doesn't verify client identity

mTLS:
  Client verifies server's certificate
  Server verifies client's certificate (who is this client?)
  Both sides must have certificates issued by a trusted CA

Use cases:
  Service-to-service auth in microservices (each service has a cert)
  API authentication (client cert instead of API key)
  Zero Trust networking (all communication mutually authenticated)
  VPN client auth
  Industrial/IoT device authentication

Service mesh (Istio, Linkerd):
  Automatically provisions mTLS for all pod-to-pod communication
  Sidecar proxy handles cert rotation transparently
```

---

## Diagnosing TLS Issues

```bash
# Check what TLS versions and ciphers a server offers
openssl s_client -connect example.com:443 -tls1_3
openssl s_client -connect example.com:443 -tls1_2
nmap --script ssl-enum-ciphers -p 443 example.com

# View certificate details
openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# Check OCSP stapling
openssl s_client -connect example.com:443 -status 2>/dev/null | grep -A 5 "OCSP Response"

# Test TLS version support
curl -vI --tlsv1.3 https://example.com
curl -vI --tlsv1.2 --tls-max 1.2 https://example.com

# Certificate expiry check (monitoring)
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -enddate

# SSL Labs — comprehensive TLS grade (external tool)
# https://www.ssllabs.com/ssltest/analyze.html?d=example.com

# testssl.sh — comprehensive local TLS testing
testssl.sh example.com
```

---

## Tips

- TLS 1.2 is acceptable but TLS 1.3 should be the default — it's faster (1-RTT), stronger, and forward-secret always.
- Never serve SHA-1-signed certificates — all major browsers have deprecated SHA-1 since 2017; use SHA-256 or SHA-384.
- Enable OCSP stapling on your server — prevents the privacy issue of clients contacting the CA and eliminates the extra RTT for revocation checking.
- `HSTS` (Strict-Transport-Security) prevents SSL stripping attacks — add it with a long `max-age` and include the preload list submission once you're confident.
- Certificate pinning (pinning a specific cert or public key) adds security but breaks if the cert changes — use with caution; prefer CT logs + monitoring over pinning.

---

## Summary

- TLS provides confidentiality (encryption), authentication (certificates), and integrity (AEAD/MAC) for internet connections.
- X.509 certificates bind a public key to a domain/identity, signed by a Certificate Authority — chain of trust from Root CA → Intermediate CA → Server cert.
- TLS 1.3 redesigned the protocol: 1-RTT handshake, 0-RTT resumption, always-on forward secrecy, encrypted certificates, removed all legacy algorithms.
- ECDHE ensures forward secrecy — ephemeral keys mean past sessions can't be decrypted even if the server's private key is later stolen.
- OCSP Stapling is the right revocation mechanism — server attaches signed OCSP response to the handshake, eliminating privacy leaks and extra latency.
- mTLS authenticates both client and server — essential for service mesh, Zero Trust, and API security beyond simple bearer tokens.
