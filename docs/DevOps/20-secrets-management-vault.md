---
title: "Secrets Management with Vault"
sidebar_label: "Secrets (Vault)"
sidebar_position: 20
---

# Secrets Management with Vault

HashiCorp Vault is the standard tool for centralized secrets management — storing, generating, and controlling access to credentials, API keys, and certificates dynamically.

**Docs:** [developer.hashicorp.com/vault](https://developer.hashicorp.com/vault)

---

## Why a Dedicated Secrets Manager

```
Without one — secrets scattered everywhere:
  Hardcoded in source code (worst case — leaked in every git clone forever)
  In .env files (better, but still static, unencrypted, manually rotated)
  In CI/CD variables (fine for CI itself, but doesn't help runtime app secrets)
  In Kubernetes Secrets (base64, not encrypted by default — see K8s pages)

With Vault:
  Single source of truth for all secrets across all environments
  Dynamic secrets — generated on-demand, short-lived, auto-expiring
  Fine-grained access control — who/what can read which secrets
  Full audit log — every secret access is recorded
  Automatic rotation — reduce the blast radius of a leaked credential
  Encryption as a service — encrypt/decrypt data without managing keys yourself
```

---

## Core Concepts

```
Secrets Engine:  a component that stores or generates secrets (KV, database, PKI, AWS, etc.)
Auth Method:      how a client authenticates to Vault (token, AppRole, Kubernetes, LDAP, OIDC)
Policy:            HCL rules defining which paths a client can read/write
Seal/Unseal:        Vault starts "sealed" (encrypted, inaccessible) and must be
                    "unsealed" with a quorum of unseal keys before use
Lease:              secrets can have a TTL — after which they expire and must be renewed
```

---

## Installation and Basic Setup

```bash
brew install vault

# Dev server (in-memory, NOT for production — great for learning/testing)
vault server -dev
# Prints a root token and unseal key — export them:
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='<root-token-from-output>'

vault status
```

---

## KV (Key-Value) Secrets Engine

```bash
# Enable the KV v2 secrets engine (versioned key-value store)
vault secrets enable -path=secret kv-v2

# Write a secret
vault kv put secret/myapp/database username=admin password=supersecret123

# Read a secret
vault kv get secret/myapp/database
vault kv get -field=password secret/myapp/database

# Update (creates a new version — old versions retained)
vault kv put secret/myapp/database username=admin password=newpassword456

# View version history
vault kv get -version=1 secret/myapp/database
vault kv metadata get secret/myapp/database

# Delete (soft delete — can be undeleted)
vault kv delete secret/myapp/database
vault kv undelete -versions=2 secret/myapp/database
vault kv destroy -versions=2 secret/myapp/database   # permanent
```

```bash
# From the CLI in scripts
DB_PASSWORD=$(vault kv get -field=password secret/myapp/database)

# From an application (using a client library)
```

```python
# Python example using hvac
import hvac

client = hvac.Client(url='http://127.0.0.1:8200', token='my-token')
secret = client.secrets.kv.v2.read_secret_version(path='myapp/database')
password = secret['data']['data']['password']
```

---

## Dynamic Secrets — Databases

Instead of a static, long-lived database password shared across the app fleet, Vault generates unique, short-lived credentials on demand.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure a connection to PostgreSQL
vault write database/config/my-postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db:5432/mydb" \
    allowed_roles="readonly" \
    username="vault-admin" \
    password="admin-password"

# Define a role — what SQL to run when generating a new credential
vault write database/roles/readonly \
    db_name=my-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate a dynamic credential — unique, auto-expiring
vault read database/creds/readonly
# Returns: username, password, lease_id, lease_duration

# The credential is automatically revoked when the lease expires
# Applications request fresh credentials rather than sharing one static password
```

```
Why dynamic secrets matter:
  Leaked credential? It expires soon regardless — much smaller blast radius
  No manual rotation process needed — Vault handles the whole lifecycle
  Full audit trail of exactly which service/instance requested which credential
  Revoke access instantly by revoking the lease, without changing a shared password
```

---

## Authentication Methods

```bash
# AppRole — for machine-to-machine authentication (services, CI/CD)
vault auth enable approle

vault write auth/approle/role/myapp \
    token_policies="myapp-policy" \
    token_ttl=1h \
    token_max_ttl=4h

vault read auth/approle/role/myapp/role-id             # public-ish identifier
vault write -f auth/approle/role/myapp/secret-id       # secret, distribute carefully

# App authenticates with role_id + secret_id to get a Vault token
vault write auth/approle/login role_id="..." secret_id="..."
```

```yaml
# Kubernetes auth method — pods authenticate using their Service Account token
# No secret_id distribution problem — Kubernetes already manages pod identity

# vault write auth/kubernetes/role/myapp \
#     bound_service_account_names=myapp \
#     bound_service_account_namespaces=production \
#     policies=myapp-policy \
#     ttl=1h
```

```bash
# From inside a pod, using the Vault Agent Injector (see below) — fully automatic
# Or manually:
JWT=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
vault write auth/kubernetes/login role=myapp jwt=$JWT
```

---

## Policies

```hcl
# myapp-policy.hcl
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

path "database/creds/readonly" {
  capabilities = ["read"]
}

path "secret/data/myapp/admin/*" {
  capabilities = ["deny"]     # explicit deny even if another rule allows it
}
```

```bash
vault policy write myapp-policy myapp-policy.hcl
vault policy list
vault policy read myapp-policy

# Attach policy to an auth method role
vault write auth/approle/role/myapp token_policies="myapp-policy"
```

---

## Vault in Kubernetes — Agent Injector

The Vault Agent Injector automatically injects secrets into pods as files, without any application code changes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/readonly"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/readonly" -}}
          DB_USERNAME={{ .Data.username }}
          DB_PASSWORD={{ .Data.password }}
          {{- end -}}
    spec:
      serviceAccountName: myapp        # bound to a Vault Kubernetes auth role
      containers:
        - name: myapp
          image: myapp:1.0
          # The injector adds a sidecar container that authenticates to Vault
          # and writes the rendered secret to /vault/secrets/db-creds
          # inside the pod — the app reads it as a local file
```

---

## Alternatives and Complementary Tools

```
Kubernetes Sealed Secrets:
  Encrypt secrets client-side so they're safe to commit to git
  A controller in the cluster decrypts them into normal K8s Secrets
  Simpler than Vault for small teams; no dynamic secrets or rich policies

External Secrets Operator (ESO):
  Kubernetes-native — syncs secrets FROM Vault/AWS Secrets Manager/etc.
  INTO native Kubernetes Secret objects, refreshed on a schedule
  Good middle ground: Vault as source of truth, native K8s Secret usage in pods

AWS Secrets Manager / GCP Secret Manager / Azure Key Vault:
  Cloud-native, fully managed, tightly integrated with IAM in that cloud
  Simpler than running Vault yourself if you're single-cloud
  Lacks some of Vault's dynamic secrets breadth across arbitrary systems

SOPS (Secrets OPerationS):
  Encrypts values within YAML/JSON files using KMS/PGP/age
  Encrypted files are safe to commit to git — decrypted at deploy time
  Popular in GitOps workflows (see the GitOps page) alongside Sealed Secrets
```

---

## Secret Rotation Strategy

```
Static secrets (API keys for third-party services you don't control):
  Rotate on a schedule (quarterly/annually) or immediately upon suspected leak
  Store rotation date as metadata; alert before expiry

Dynamic secrets (databases, cloud credentials Vault can generate):
  Short TTLs (1 hour to 24 hours) — rotation happens automatically by design
  No manual rotation process needed at all

Certificates (via Vault PKI secrets engine):
  Vault can act as a full internal Certificate Authority
  Issue short-lived certs (days, not years) automatically renewed by services

General rule: the shorter the secret's lifetime, the smaller the damage
if it leaks. Push toward dynamic, short-lived secrets wherever the
downstream system supports it.
```

---

## How Vault Actually Protects Secrets

```
The core security model, understood mechanically, explains almost every
Vault operational behavior:

1. THE ENCRYPTION BARRIER
   Everything Vault stores (in its backend storage — could be a file,
   Consul, an integrated Raft cluster, etc.) is encrypted with a single
   ROOT ENCRYPTION KEY before it ever touches disk. Vault's storage
   backend itself doesn't need to be trusted — even if someone stole
   the raw storage files, they'd see only encrypted bytes.

2. SEALED vs UNSEALED
   The root encryption key is NEVER stored anywhere in plaintext,
   ever — not on disk, not in memory at rest. When Vault starts, it
   is SEALED: it physically cannot decrypt anything, including its
   own configuration, because it doesn't have the key yet.
   To UNSEAL, Vault needs a QUORUM of separate "unseal keys" (Shamir's
   Secret Sharing splits the root key into N shares, requiring a
   threshold T of them, e.g. 3-of-5) — no single person holds enough
   of the key alone to unseal Vault; this is a deliberate no-single-
   point-of-compromise design.
   Once enough unseal keys are provided, Vault reconstructs the root
   key in memory ONLY (never written to disk) and becomes operational.
   A Vault restart returns to SEALED state — the whole unseal
   ceremony must happen again (this is why production Vault often uses
   auto-unseal via a cloud KMS, trading a bit of the "no single point"
   purity for operational practicality).

3. TOKENS — the session/identity layer ON TOP of the encryption barrier
   Every request to Vault (after unsealing) needs a valid TOKEN.
   Auth methods (AppRole, Kubernetes, LDAP, etc.) all have ONE job:
   verify who you are through SOME external mechanism, then EXCHANGE
   that verified identity for a Vault token with an attached POLICY.
   The token itself has a TTL and is what's actually checked on every
   subsequent request — not your original AppRole/Kubernetes credentials.

This explains why "Vault is unsealed but I still can't read a secret" —
being unsealed only means Vault CAN decrypt data; you still separately
need a valid, appropriately-scoped token to be authorized to do so.
```

### How Dynamic Secrets and Leases Actually Work

```
1. You request a dynamic secret: vault read database/creds/readonly
2. Vault's database secrets engine connects to the ACTUAL target
   database (using ITS OWN admin credentials, configured once ahead
   of time) and runs the `creation_statements` SQL to create a
   brand-new, uniquely-named database user, right at that moment
3. Vault returns the new username/password to you, ALONG WITH a
   LEASE — a tracked promise of "this secret is valid for X duration"
4. Vault stores this lease in its own internal lease database,
   independent of the secret data itself
5. When the lease EXPIRES (or is explicitly revoked), Vault
   automatically runs `revocation_statements` against the target
   database — actually DROPPING that database user

This is why dynamic secrets need Vault to remain RUNNING and
REACHABLE for the FULL lifetime of any credential it issued — Vault
isn't just handing out a value once and forgetting about it; it's
actively managing the CREATED resource's lifecycle end-to-end. If
Vault is down when a lease should expire, revocation is simply
delayed until Vault comes back and processes the backlog — leases
don't silently vanish, but the cleanup is deferred.
```

---

## Troubleshooting Guide

```
"Vault is sealed and won't accept any requests"
  This is expected after any restart — someone with unseal key shares
  needs to run `vault operator unseal` the required threshold of times
  (or, if auto-unseal via KMS is configured, this should happen
  automatically — check cloud KMS connectivity/permissions if it doesn't)

"permission denied reading a secret I think I should have access to"
  vault token lookup                — check what policies your CURRENT
  token actually has attached (not what you THINK your auth method
  should have granted — always verify the actual token, since a stale
  cached token from an earlier session is a common culprit)
  vault policy read <policy-name>   — verify the policy itself actually
  grants the path/capability you expect (a common typo: forgetting the
  "data/" segment required for KV v2 paths — v2 requires
  secret/data/myapp/x, not secret/myapp/x, in policy path rules,
  even though the CLI abstracts this away for you)

"Dynamic secret works once, then stops (database user disappears
 mid-use)"
  The lease expired and Vault revoked the credential — check
  default_ttl / max_ttl on the role; either request secrets with a
  longer TTL for legitimate long-running needs, or have your
  application handle credential rotation gracefully by re-requesting
  before expiry (Vault Agent can automate this renewal transparently)

"Kubernetes auth method login fails"
  vault read auth/kubernetes/config    — verify the configured
  Kubernetes API address/CA cert actually matches your cluster
  Common cause after a cluster upgrade/recreation: the CA certificate
  Vault has on file no longer matches the (regenerated) cluster CA
```

---

## Tips

- Never store the Vault root token for daily use — it's for initial setup only; create scoped policies and auth methods for everything else.
- Prefer dynamic secrets over static ones wherever the target system supports it (most databases and major clouds do) — it eliminates rotation as a manual process entirely.
- Use the Kubernetes auth method + Agent Injector in K8s environments — it avoids ever having to manually distribute Vault tokens to pods.
- Enable Vault's audit log from day one — it's the single source of truth for "who accessed which secret, when" during incident investigation.
- For small teams not ready for full Vault operational overhead, Sealed Secrets or your cloud provider's native secrets manager are reasonable starting points — you can graduate to Vault later.

---

## Summary

- Vault centralizes secrets management: storage (KV), dynamic generation (databases, cloud, PKI), and access control (policies + auth methods).
- Dynamic secrets are short-lived and auto-generated per request — dramatically reduce the impact of a leaked credential compared to static secrets.
- Auth methods (AppRole for services, Kubernetes for pods) let clients authenticate without a human manually distributing credentials.
- Policies (HCL) define fine-grained read/write access per path — least privilege by default.
- The Vault Agent Injector automates secret delivery into Kubernetes pods with zero application code changes.
- Alternatives exist for simpler needs: Sealed Secrets, External Secrets Operator, cloud-native secret managers, SOPS.
