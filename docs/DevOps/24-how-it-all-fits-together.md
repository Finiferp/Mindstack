---
title: "How It All Fits Together"
sidebar_label: "How It All Fits Together"
sidebar_position: 24
---

# How It All Fits Together

Every previous page covered one tool in isolation. This page is the map that shows how they connect into one real system — read this when you've forgotten the details of individual tools but need to remember the shape of the whole thing.

---

## The Full Stack, One Diagram

```
DEVELOPER
    │ git push
    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ GITHUB (source of truth for code AND infra config)                    │
│  - Branch protection, PR review, CODEOWNERS                           │
│  - Two repos in the cleanest setup:                                   │
│      app-repo/     → application source code                          │
│      config-repo/   → Kubernetes manifests / Helm values / Terraform  │
└──────────────┬────────────────────────────────────────────────────────┘
               │ push/PR triggers
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CI (GitHub Actions / GitLab CI / Jenkins)                            │
│  1. Lint + unit test                                                 │
│  2. Security scan (SAST, dependency scan, secret scan)               │
│  3. docker build → tag with git SHA → docker push to registry        │
│  4. Update image tag in config-repo (this is the ONLY write CI does  │
│     to infra state — it never touches the cluster directly)          │
└──────────────┬───────────────────────────────────────────────────────┘
               │ image pushed to...
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CONTAINER REGISTRY (ghcr.io / ECR / Docker Hub)                      │
│  Stores versioned, immutable image builds                            │
└───────────────────┬──────────────────────────────────────────────────┘
               │ config-repo change detected by...
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ARGO CD (GitOps operator, runs INSIDE the cluster)                   │
│  Watches config-repo → reconciles cluster state to match Git         │
│  Applies Helm charts / Kubernetes manifests                          │
│  selfHeal: true → reverts any manual kubectl drift automatically     │
└──────────────┬───────────────────────────────────────────────────────┘
               │ applies to
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ KUBERNETES CLUSTER (provisioned by...)                                       │
│                                                                              │
│  Provisioning layer (runs ONCE, or on infra changes — NOT per deploy):       │
│    TERRAFORM → creates the cluster itself, VPC, IAM roles, RDS,              │
│                 S3 buckets, load balancers — the "hardware"                  │
│    ANSIBLE   → (if using self-managed VMs, not managed K8s) configures       │
│                 OS-level packages, users, cron jobs on the nodes             │
│                                                                              │
│  Application layer (changes per deploy, managed by Argo CD/Helm):            │
│    Deployments, Services, Ingress, ConfigMaps, Secrets (or Vault)            │
│    HPA scales replicas based on load                                         │
│                                                                              │
│  Ingress (Nginx Ingress Controller) routes external traffic in               │
│  Vault (or Sealed Secrets/cloud secret manager) injects credentials          │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │ emits
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ OBSERVABILITY (watches everything above)                                │
│  PROMETHEUS scrapes /metrics from every service → stores time series    │
│  GRAFANA visualizes Prometheus data as dashboards                       │
│  Alertmanager routes alerts → Slack/PagerDuty based on severity         │
│  FLUENT BIT/FILEBEAT ships logs → ELASTICSEARCH → KIBANA for search     │
│  OpenTelemetry traces requests across services → Jaeger/Tempo           │
└─────────────────────────────────────────────────────────────────────────┘
               │ feeds
               ▼
        ON-CALL ENGINEER (SRE practices: SLOs, runbooks, incident response)
               │
               └──── if something's wrong: rollback via git revert →
                     Argo CD auto-syncs the previous state → done
```

---

## The Two Fundamentally Different Layers

This is the single most important mental model in the entire course. Almost every tool falls into one of two categories:

```
PROVISIONING LAYER — "what infrastructure exists"
  Tool: Terraform (primarily), sometimes CloudFormation/Pulumi
  Changes: rarely (new environment, new service, capacity change)
  Manages: VPCs, Kubernetes clusters themselves, databases, load balancers,
           IAM roles, DNS zones, S3 buckets
  Mental model: "pouring the concrete foundation and building the walls"

CONFIGURATION / DEPLOYMENT LAYER — "what's running right now"
  Tools: Ansible (VM config), Helm/Kubernetes manifests (app config),
         Argo CD (deployment automation)
  Changes: constantly (every code deploy, every config tweak)
  Manages: which app version is running, how many replicas, environment
           variables, routing rules
  Mental model: "moving furniture and changing what's displayed inside
                the building Terraform already built"

Why this split matters:
  You provision a Kubernetes cluster ONCE (or rarely) with Terraform.
  You deploy NEW APPLICATION VERSIONS to that cluster CONSTANTLY with
  Helm/Argo CD — you don't re-run Terraform for every code deploy.

  Mixing these up is the #1 mental-model mistake beginners make —
  thinking every deploy needs a Terraform apply. It doesn't.
```

---

## The Three "Sources of Truth" and What Each One Owns

```
1. GIT (application code repo)
   Owns: what the application DOES
   Changed by: developers, via pull request

2. GIT (config repo / Terraform repo)
   Owns: what infrastructure EXISTS and what's DEPLOYED
   Changed by: developers (app config) + platform team (infra), via pull request

3. THE CLUSTER / CLOUD (the actual running system)
   Owns: nothing — it should always just be a REFLECTION of #1 and #2
   Never manually changed in a GitOps-mature setup — if you find yourself
   about to run `kubectl edit` or click around the AWS console to "just
   fix this one thing," that's a sign your Git-to-reality pipeline has
   a gap, not a green light to bypass it

If you remember nothing else from this whole course: everything is
converging toward "Git is truth, tooling makes reality match Git."
Docker, Terraform, Helm, Ansible, Argo CD, Kubernetes — every one of
them exists to either (a) turn Git-declared intent into running
infrastructure, or (b) tell you when running infrastructure doesn't
match that intent.
```

---

## How a Single Code Change Flows Through Every Tool

```
Scenario: a developer fixes a bug and the fix needs to reach production.

1. Developer commits on a branch, opens a PR
   → GitHub: branch protection requires CI to pass + 1 approval

2. PR triggers CI (GitHub Actions)
   → runs tests, lint, security scans (all covered in cicd-concepts.md)
   → on merge to main: docker build, tag with commit SHA, docker push

3. CI updates the image tag in the config-repo
   → e.g. changes `image: myapp:abc123` in values-production.yaml
   → this is a Git commit, reviewed like any other change

4. Argo CD detects the config-repo change
   → diffs desired state (Git) vs live state (cluster)
   → runs the equivalent of `helm upgrade` automatically
   → Kubernetes performs a rolling update (old pods drain, new pods start)

5. Kubernetes readiness probes gate traffic
   → new pods only receive traffic once /ready returns 200
   → if new pods crash-loop, the rollout can be configured to auto-rollback

6. Prometheus immediately starts scraping the new pods
   → Grafana dashboards reflect the new version's metrics in real time
   → if error rate spikes, an alert fires (rate() query crossing threshold)

7. If something's wrong:
   → Option A (GitOps way): git revert the config-repo change →
     Argo CD auto-syncs back to the previous version
   → Option B (fast path): `argocd app rollback myapp <previous-revision>`
   → Both are auditable; neither requires manual kubectl surgery

8. Logs from the new version flow through Fluent Bit → Elasticsearch
   → searchable in Kibana within seconds, correlated by request_id
   → if a trace was needed, OpenTelemetry spans show exactly where
     time was spent across any microservices the request touched

Every tool in this course has a specific, non-overlapping role in this
one flow. That's the test for "do I actually understand where this tool
fits" — can you place it on this numbered list?
```

---

## Local Development vs Production — Same Tools, Different Scale

```
LOCAL DEV                              PRODUCTION
─────────────────────────────────────────────────────────────────
Docker Compose                         Kubernetes (many nodes, self-healing)
  (single machine, few containers)     (cluster, auto-scaling, multi-AZ)

.env file                              Vault / cloud Secrets Manager
  (plaintext, fine for local)          (encrypted, audited, dynamic)

docker-compose.yml                     Helm charts / Kustomize overlays
  (one file, hand-edited)              (templated, environment-parametrized)

Manual `docker compose up`             Argo CD (automatic, Git-triggered)
  (you run it yourself)                (continuously reconciled)

No load balancer needed                Nginx Ingress / cloud Load Balancer
  (single instance is enough)          (routes across many replicas)

Terminal logs                          Fluent Bit → Elasticsearch → Kibana
  (docker compose logs -f)             (centralized, searchable, retained)

This mapping matters when you're ramping back up on a project: the LOCAL
tool you remember using daily has a PRODUCTION equivalent doing a scaled-up,
automated version of the exact same job.
```

---

## Which Tool Solves Which Problem — Decision Table

```
"I need to..."                                                   → Use this tool
──────────────────────────────────────────────────────────────────────────────────────────────
Package my app so it runs anywhere                               → Docker
Run my app + its dependencies locally                            → Docker Compose
Run my app reliably across many servers                          → Kubernetes
Template/parametrize my K8s manifests                            → Helm
Create the cloud infrastructure itself                           → Terraform
Configure existing servers (packages, users, cron)               → Ansible
Automatically test every code change                             → CI (GitHub Actions/GitLab CI/Jenkins)
Automatically deploy tested changes to the cluster               → Argo CD (GitOps)
Store and rotate secrets securely                                → Vault
Route external traffic + load balance                            → Nginx / cloud Load Balancer
See if my system is healthy right now                            → Prometheus + Grafana
Search through what happened in detail                           → Elasticsearch + Kibana
Understand why ONE request was slow across services              → Distributed tracing (OpenTelemetry)
Know if I'm meeting my reliability targets                       → SLI/SLO tracking
Respond to a 2 AM page effectively                               → Runbooks + Incident Commander process
```

---

## Tips

- When you come back to this after months away, re-read this page FIRST, then the toolchain reference (page 23) for command syntax, then dive into the specific tool's dedicated page only if you need deep detail.
- The provisioning-vs-configuration split (Terraform vs Helm/Argo CD) is the mental model that unlocks understanding everything else — internalize it before anything else on this page.
- If you're rebuilding a mental model of a project you haven't touched in months, ask: "where does Git live, what watches it, and what does that watcher change?" — answering that for any unfamiliar system gets you oriented fast.

---

## Summary

- Everything flows: Git (code) → CI (test + build) → Registry (store image) → Git (config) → Argo CD (watch + apply) → Kubernetes (run) → Observability (watch it run).
- Two layers: provisioning (Terraform, rare changes, "the building") vs configuration/deployment (Helm/Argo CD, constant changes, "what's inside").
- Git is the single source of truth for both code and infrastructure intent — the cluster should always just be a reflection of Git, never manually edited.
- Local dev tools (Docker Compose, .env, manual commands) have direct production equivalents (Kubernetes, Vault, Argo CD) doing the same job at scale, automatically.
- Use the decision table above as a fast lookup when you've forgotten which tool owns which problem.
