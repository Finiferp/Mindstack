---
title: "Cryptography for Network Engineers"
sidebar_label: "Cryptography"
sidebar_position: 57
---

# Cryptography for Network Engineers

Network engineers don't need to implement cryptographic algorithms, but they must understand which ones are secure, which are broken, and why — to make informed choices in protocol configuration, certificate management, and key exchange.

---

## Symmetric Encryption

One key encrypts and decrypts. Fast — suitable for bulk data.

### AES — Advanced Encryption Standard

```
History:
  DES (Data Encryption Standard, 1977): 56-bit key; broken by 1999 (EFF DES Cracker)
  3DES (Triple-DES): DES applied 3 times; 112-bit effective security; slow; deprecated (NIST 2023)
  AES: NIST competition 1997–2001; Rijndael algorithm by Belgian cryptographers Joan Daemen
       and Vincent Rijmen won; standardized as FIPS 197 (2001)

AES properties:
  Key sizes: 128, 192, or 256 bits (AES-128, AES-192, AES-256)
  Block size: always 128 bits (16 bytes)
  Structure: Substitution-Permutation Network (SPN)
  AES-NI: hardware instruction set in x86 CPUs (Intel 2010, AMD 2011)
           hardware AES is ~10× faster than software implementation

Security:
  No practical attack on AES-128 with a good mode (best known attack needs 2^126 ops — infeasible)
  AES-256 for post-quantum preparations (quantum computers theoretically halve symmetric key strength)
  Key management is harder than breaking AES — most AES "breaks" are key management failures

Block cipher modes:
  ECB (Electronic Codebook): encrypt each block independently
    Problem: identical plaintext blocks → identical ciphertext blocks (reveals patterns)
    Never use ECB for real data (famously: ECB-encrypted Linux Tux image still shows Tux)

  CBC (Cipher Block Chaining): XOR with previous ciphertext before encrypting
    Each block depends on all previous
    Requires IV (initialization vector) — must be random and unpredictable
    Vulnerable: BEAST (TLS 1.0 CBC), POODLE (SSL 3.0 CBC) — don't use in TLS
    Still acceptable for disk encryption (AES-CBC-ESSIV in LUKS)

  CTR (Counter Mode): generates keystream from counter; XOR with plaintext
    Turns block cipher into stream cipher
    Parallelizable; no padding needed
    Used in: AES-CTR-HMAC combinations

  GCM (Galois/Counter Mode): CTR mode + authentication tag
    AEAD: Authenticated Encryption with Associated Data
    Provides: confidentiality + integrity + authenticity in one operation
    No separate MAC needed; hardware-accelerated; very fast
    Used in: TLS 1.3, IPsec ESP, SSH, WireGuard
    AES-128-GCM or AES-256-GCM is the recommended choice for most applications

  CCM (Counter with CBC-MAC): GCM alternative; used in 802.11 (CCMP) WPA2
  SIV (Synthetic IV): deterministic AEAD; used in some key wrapping applications
  XTS: disk sector encryption (NIST SP 800-38E); LUKS, BitLocker, FileVault

ChaCha20-Poly1305 (RFC 7539):
  Stream cipher (ChaCha20) + MAC (Poly1305) = AEAD
  Designed by Daniel J. Bernstein; no AES dependency
  Faster than AES on devices without AES-NI hardware (mobile, IoT, embedded)
  Comparable security to AES-256-GCM
  Used in: TLS 1.3, WireGuard, SSH
```

---

## Asymmetric Encryption and Key Exchange

Two mathematically linked keys: public (share freely) and private (keep secret).

### RSA

```
History: Invented 1977 by Rivest, Shamir, Adleman at MIT
  Based on difficulty of factoring large integers
  Originally 512-bit; then 1024-bit; now minimum 2048-bit recommended; 4096-bit preferred

RSA operations:
  Encrypt with PUBLIC key → only private key can decrypt (for key exchange/encryption)
  Sign with PRIVATE key → anyone with public key can verify (for authentication/signatures)

Current status:
  RSA-2048: still considered safe (not yet broken by classical computers)
  RSA-1024: broken by nation-state actors; deprecated since 2015
  RSA-4096: strong; very slow for key exchange (milliseconds)
  Quantum threat: Shor's algorithm would break RSA with sufficient qubits
                  → post-quantum cryptography needed; NIST standardizing 2024

RSA in practice:
  TLS 1.2: RSA key exchange (no forward secrecy) OR RSA authentication + ECDHE key exchange
  TLS 1.3: RSA only for authentication (signatures); ECDHE always used for key exchange
  SSH: RSA host keys, RSA client auth keys (prefer Ed25519 for new keys)
  S/MIME, PGP: RSA for email encryption/signing
  Code signing: RSA or ECDSA

Key generation time:
  RSA-2048: ~50ms; RSA-4096: ~200ms; ECDSA P-256: <1ms; Ed25519: <1ms
  Why RSA is slow: key generation requires finding large primes
```

### Elliptic Curve Cryptography (ECC)

```
Based on mathematics of elliptic curves over finite fields
Same security as RSA with much smaller keys:

  RSA-2048 ≈ ECC-224   (224-bit ECC = 2048-bit RSA security)
  RSA-3072 ≈ ECC-256   (256-bit ECC = 3072-bit RSA security)
  RSA-7680 ≈ ECC-384

Benefits:
  Much smaller keys → smaller certs → faster TLS handshake
  Faster computation (especially on mobile/IoT)
  Hardware wallet friendly (deterministic signatures)

ECDSA (Elliptic Curve Digital Signature Algorithm):
  Signing algorithm; needs good randomness (Sony PS3 ECDSA attack: reused k-value → private key exposed)
  P-256 (secp256r1), P-384 (secp384r1): NIST curves; widely deployed
  Some distrust NIST curves due to unclear seed parameters ("nothing up my sleeve" numbers unverified)

EdDSA — Edwards-curve DSA:
  Ed25519 (Curve25519 in Edwards form), Ed448 (Curve448)
  Deterministic signatures (no random k — eliminates ECDSA's k-reuse vulnerability)
  Faster than ECDSA; cleaner design; recommended for new deployments
  Used in: SSH, WireGuard, Signal, modern TLS certs

ECDH — Elliptic Curve Diffie-Hellman:
  Key agreement (not signing) — compute shared secret without exchanging keys
  ECDHE (Ephemeral): new keys each session → forward secrecy
  Curve25519: Bernstein's curve; used in X25519 key exchange (WireGuard, TLS 1.3)
  P-256, P-384: NIST curves; used in TLS 1.2/1.3

Post-Quantum Cryptography (NIST 2024 standards):
  ML-KEM (CRYSTALS-Kyber): key encapsulation mechanism
  ML-DSA (CRYSTALS-Dilithium): digital signatures
  SLH-DSA (SPHINCS+): signature, hash-based
  FN-DSA (FALCON): signature
  These resist quantum computer attacks; larger keys and signatures than ECC
  TLS 1.3 hybrid mode: combine X25519 + Kyber for current+future security
```

---

## Hash Functions

A hash function takes arbitrary input and produces a fixed-size output (digest). Properties:
- Deterministic (same input → same output)
- One-way (can't reverse the hash to find the input)
- Collision-resistant (can't find two inputs with the same hash)
- Avalanche effect (tiny input change → completely different output)

```
MD5 (Message Digest 5, 1992):
  128-bit output; extremely fast
  BROKEN: collision attacks demonstrated (2004, Wang et al.)
  Two different files can have the same MD5 hash → file integrity verification is useless
  Never use MD5 for security purposes
  OK for: non-security checksums (detecting accidental corruption)

SHA-1 (Secure Hash Algorithm 1, NIST 1995):
  160-bit output
  BROKEN: SHAttered (2017, Google/CWI): first practical SHA-1 collision — two PDFs, same SHA-1
  Certificate authorities dropped SHA-1 certs in 2017
  Never use SHA-1 for signatures or certificates

SHA-2 (NIST 2001):
  SHA-224, SHA-256, SHA-384, SHA-512
  No practical collision attacks; still secure
  SHA-256 is the current standard for most uses
  SHA-384 and SHA-512 for higher security requirements

SHA-3 (Keccak, NIST 2015):
  Completely different design from SHA-2 (sponge construction vs Merkle-Damgård)
  No practical weaknesses; future-proof
  Slower than SHA-256 in software; faster in hardware
  SHA3-256, SHA3-512, SHAKE128, SHAKE256 (XOF — extensible output)

BLAKE2 / BLAKE3:
  Designed as fast SHA-3 alternative; faster than SHA-256 in software
  BLAKE2b: 512-bit; used in WireGuard, libsodium, Argon2
  BLAKE3: even faster; parallel; 2020; used in emerging protocols

Password hashing — special requirements:
  Regular hash (SHA-256) is fast → billions of guesses/second on GPU → unusable for passwords
  Password hashes must be slow (work factor) and memory-hard
  bcrypt: adaptive work factor; recommended; very widely deployed
  scrypt: memory-hard; good; used in file encryption
  Argon2 (winner of Password Hashing Competition 2015): memory-hard + parallelism-hard
    Argon2id: recommended for new deployments (RFC 9106)
    Parameters: memory cost, time cost, parallelism
  PBKDF2: standard but not memory-hard; used in WPA2, many KDFs
```

---

## MACs and Digital Signatures

### HMAC — Hash-based Message Authentication Code

```
HMAC(key, message) = H(key XOR opad || H(key XOR ipad || message))

Properties:
  Requires the secret key to generate or verify
  Without the key: can't compute or verify the MAC
  Message + HMAC sent together; receiver recomputes HMAC and compares

HMAC-SHA256: most common; used in AWS Signature v4, JWT (HS256), many protocols
HMAC-SHA512: stronger; used for higher-security applications

Use cases:
  JWT token verification: HMAC(secret, header.payload) = signature
  API request signing: HMAC(API-key, canonical-request) = Authorization header
  TLS 1.2: HMAC-SHA256 for record MAC (replaced by AEAD in TLS 1.3)
  IPsec: HMAC-SHA256 for AH authentication
  Cookie signing: HMAC to prevent cookie tampering

Difference from digital signature:
  HMAC: shared secret → symmetric; both parties can verify AND create
  Digital signature: private key signs; public key verifies; non-repudiation
```

### Digital Signatures

```
RSA signature:
  Sign:   signature = RSASP1(private_key, hash(message))
  Verify: verify RSAVP1(public_key, signature) == hash(message)

ECDSA/EdDSA signature:
  Sign:   (r, s) = sign(private_key, hash(message))
  Verify: verify(public_key, r, s, hash(message))

Properties:
  Non-repudiation: only the holder of the private key can sign
  Public verification: anyone with the public key can verify
  Integrity: any modification to the message invalidates the signature

Applications:
  TLS certificates: CA signs server cert with its private key
  Code signing: publisher signs binary with private key; OS verifies before running
  Email (S/MIME, PGP): sign email to prove it came from you
  SSH: server proves identity with host key signature; client authenticates with user key
  JWT (RS256/ES256): signature with RSA or ECDSA for token authentication
  Blockchain: transactions signed with private key (ECDSA secp256k1 for Bitcoin)
```

---

## Key Derivation Functions (KDF)

```
Purpose: derive cryptographic keys from passwords or other key material

HKDF (HMAC-based Key Derivation Function, RFC 5869):
  Two steps: extract (hash the input) → expand (derive output of needed length)
  Used in: TLS 1.3 (derives all session keys from master secret), Signal Protocol

PBKDF2 (Password-Based KDF 2, RFC 2898):
  iterations = tunable work factor (slow down brute force)
  Used in: WPA2 (4096 iterations), iOS backup encryption, many password stores

KDF in TLS 1.3:
  IKM (Input Key Material) = ECDHE shared secret
  HKDF-Extract → Handshake Secret → HKDF-Expand → traffic keys
  Every session has unique keys (forward secrecy)
```

---

## PKI — Public Key Infrastructure

```
Hierarchy:
  Root CA (self-signed)
    └── Intermediate CA
          └── End-entity certificate (server, user, device)

Certificate issuance:
  1. Subscriber generates key pair
  2. Subscriber creates CSR (Certificate Signing Request):
     Contains: public key, DN (Distinguished Name), SANs, signature
  3. CA verifies identity (DV/OV/EV checks)
  4. CA signs CSR with its private key → issues certificate
  5. Subscriber installs certificate + intermediate chain

Certificate fields (X.509 v3):
  Subject: CN, O, OU, C — who the cert is for
  Issuer: who signed it (CA)
  Serial Number: unique per CA
  Not Before / Not After: validity window
  Public Key: the cert holder's public key
  Subject Alternative Names (SANs): additional valid domains/IPs
  Key Usage: digitalSignature, keyEncipherment, etc.
  Extended Key Usage: serverAuth, clientAuth, codeSigning, emailProtection
  Authority Key Identifier: which CA key signed this
  Subject Key Identifier: fingerprint of this cert's public key
  CRL Distribution Points: where to fetch revocation list
  OCSP URL: revocation check endpoint
  Basic Constraints: is this cert a CA? (CA:TRUE / CA:FALSE)
  Certificate Transparency SCTs: proof the cert was logged in CT log

Certificate operations:
  Generate key pair: openssl genrsa -out key.pem 4096
                     openssl ecparam -genkey -name prime256v1 -out key.pem
  Create CSR: openssl req -new -key key.pem -out req.csr -subj "/CN=example.com"
  Sign (CA): openssl x509 -req -in req.csr -CA ca.pem -CAkey ca-key.pem -days 365 -out cert.pem
  View cert: openssl x509 -in cert.pem -text -noout
  Verify chain: openssl verify -CAfile chain.pem cert.pem

Automating with ACME (Let's Encrypt):
  certbot --nginx -d example.com -d www.example.com
  certbot renew --dry-run
  DNS challenge: certbot certonly --manual --preferred-challenges dns -d '*.example.com'
```

---

## Cryptographic Protocol Decisions — Quick Reference

```
Encryption (symmetric bulk):
  ✅  AES-256-GCM, AES-128-GCM, ChaCha20-Poly1305
  ⚠️  AES-256-CBC with HMAC (legacy; acceptable with proper IV)
  ❌  3DES, RC4, DES, AES-ECB

Key exchange / agreement:
  ✅  X25519 (Curve25519 ECDH), X448, ECDH P-256
  ⚠️  RSA key transport (no forward secrecy; legacy TLS 1.2)
  ❌  DH < 2048-bit, static ECDH

Digital signatures:
  ✅  Ed25519, Ed448, ECDSA P-256/P-384, RSA-4096 PSS
  ⚠️  RSA-2048 PKCS1v1.5 (adequate but not ideal)
  ❌  RSA-1024, DSA-1024, ECDSA with bad randomness

Hash functions:
  ✅  SHA-256, SHA-384, SHA-512, SHA3-256, BLAKE2/BLAKE3
  ⚠️  SHA-1 for non-security checksums only
  ❌  MD5, SHA-1 (for any security purpose)

Password hashing:
  ✅  Argon2id, bcrypt (cost ≥ 12), scrypt
  ⚠️  PBKDF2 (acceptable if iterations high enough: 600,000+ for SHA-256)
  ❌  MD5(password), SHA256(password), unsalted hash of any kind

MAC:
  ✅  HMAC-SHA256, HMAC-SHA512, Poly1305 (with ChaCha20)
  ✅  AES-GCM (built-in MAC — no separate MAC needed)
  ❌  MD5-based HMAC
```

---

## Tips

- Never roll your own cryptography — use well-vetted libraries (libsodium, BoringSSL, OpenSSL 3, Go's crypto package). Subtle bugs in crypto are catastrophic.
- The weakest link in any cryptographic system is usually key management (storage, rotation, distribution), not the algorithm itself.
- AES-GCM nonce reuse is catastrophic — if the same (key, nonce) pair is used twice, both the confidentiality and authentication tag are compromised. Use random 96-bit nonces or counter-based nonces.
- SHA-256 is fine for file integrity; Argon2id or bcrypt is required for passwords — they are completely different use cases.
- Start planning for post-quantum now — NIST finalized ML-KEM/ML-DSA in 2024; hybrid key exchange (X25519 + Kyber) is available in modern TLS implementations.

---

## Summary

- AES-GCM (128 or 256 bit) and ChaCha20-Poly1305 are the correct choices for symmetric encryption — both are AEAD (encrypt + authenticate in one operation).
- RSA is being replaced by ECC: Ed25519 for signatures, X25519 for key exchange — smaller keys, faster, cleaner security proofs.
- MD5 and SHA-1 are broken for collision resistance — never use them for signatures, certificates, or security MACs. SHA-256 minimum.
- Password hashing requires slow, memory-hard functions: Argon2id (preferred), bcrypt, scrypt — never use fast hash functions directly.
- ECDHE provides forward secrecy (ephemeral keys per session) — mandatory in TLS 1.3, recommended in TLS 1.2.
- PKI: Root CA → Intermediate CA → End-entity cert; certificate validity enforced via chain of trust, revocation (OCSP stapling), and short lifetimes.
