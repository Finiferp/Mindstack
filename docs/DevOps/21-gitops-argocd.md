---
title: "GitOps with Argo CD"
sidebar_label: "GitOps (Argo CD)"
sidebar_position: 21
---

# GitOps with Argo CD

GitOps uses Git as the single source of truth for both application code AND infrastructure/deployment state — an operator continuously reconciles the live system to match what's declared in Git.

**Docs:** [argo-cd.readthedocs.io](https://argo-cd.readthedocs.io)

---

## GitOps Principles

```
1. Declarative
   The entire system state is described declaratively (Kubernetes YAML, Helm values)

2. Versioned and immutable
   The desired state is stored in Git — full history, rollback via git revert

3. Pulled automatically
   Software agents (Argo CD, Flux) PULL the desired state from Git —
   nothing pushes changes directly to the cluster from outside

4. Continuously reconciled
   Agents continuously compare live state to desired state and correct drift
```

```
Traditional CI/CD push model:
  CI pipeline runs `kubectl apply` or `helm upgrade` directly against the cluster
  Pipeline needs cluster credentials — broad blast radius if compromised
  No continuous drift detection — manual kubectl changes go unnoticed

GitOps pull model:
  CI pipeline only updates a Git repository (e.g. bumps an image tag)
  A cluster-side operator (Argo CD) notices the Git change and applies it
  The operator continuously watches for drift and can auto-heal it
  Cluster credentials never leave the cluster — nothing external needs them
```

---

## Argo CD Architecture

```
  ┌──────────────┐         watches            ┌───────────────┐
  │  Git Repo    │ <───────────────────────   │  Argo CD      │
  │  (manifests/ │                            │  (in-cluster) │
  │   Helm chart)│                            └────────┬──────┘
  └──────────────┘                                     │
        ▲                                              │ applies/reconciles
        │                                              ▼
  ┌──────────────┐                             ┌───────────────┐
  │  CI Pipeline │  updates image tag          │  Kubernetes   │
  │  (builds,    │  in Git (not the cluster    │   Cluster     │
  │   pushes     │  directly)                  │  (live state) │
  │   image)     │                             └───────────────┘
  └──────────────┘

Two repos pattern (common):
  app-repo:     application source code; CI builds and pushes a container image
  config-repo:  Kubernetes manifests / Helm values; CI updates the image tag here
  Argo CD only watches config-repo — clean separation of code changes vs
  deployment changes, and Argo CD never needs access to build tooling/secrets
```

---

## Installation

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access the UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# CLI
brew install argocd
argocd login localhost:8080
```

---

## Application Definition

An Application is Argo CD's core resource — it maps a Git source to a cluster destination.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/myorg/myapp-config.git
    targetRevision: main
    path: overlays/production        # or a Helm chart path

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true          # delete resources removed from Git
      selfHeal: true        # auto-correct manual/out-of-band cluster changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
kubectl apply -f application.yaml
argocd app list
argocd app get myapp
argocd app sync myapp                # manual sync (if not automated)
argocd app history myapp
argocd app rollback myapp <revision-id>
```

---

## Sync Policies and Self-Healing

```yaml
syncPolicy:
  automated:
    prune: true        # remove resources deleted from Git
    selfHeal: true      # revert manual kubectl changes back to match Git
  syncOptions:
    - Validate=true
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
```

```
selfHeal in action:
  Someone runs `kubectl scale deployment myapp --replicas=10` manually
  Argo CD detects this drift from the Git-declared replica count
  With selfHeal=true: Argo CD automatically reverts it back to match Git
  This enforces Git as the ONLY way to make lasting changes — manual
  kubectl changes are treated as unauthorized drift, not a new desired state

This is a deliberate, sometimes controversial choice — it means "kubectl edit"
during an incident won't stick. Emergency changes should go through Git
(even via a fast-tracked PR) or use `argocd app set --sync-policy none`
temporarily to pause reconciliation during active incident response.
```

---

## App of Apps Pattern

Managing many applications with one root Application.

```yaml
# root-app.yaml — an Application that manages other Applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main
    path: apps                        # directory containing multiple Application YAMLs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated: {prune: true, selfHeal: true}
```

```
gitops-config/
└── apps/
    ├── frontend-app.yaml       ← Application resource
    ├── backend-app.yaml         ← Application resource
    ├── database-app.yaml         ← Application resource
    └── monitoring-app.yaml        ← Application resource

Applying root-app.yaml once causes Argo CD to discover and manage all
Applications defined in apps/ — a single entry point for an entire cluster's
worth of applications, each independently synced from its own source.
```

---

## Environments via Kustomize Overlays

```
base/
├── deployment.yaml
├── service.yaml
└── kustomization.yaml

overlays/
├── staging/
│   ├── kustomization.yaml       ← references base + patches
│   └── replica-patch.yaml
└── production/
    ├── kustomization.yaml
    └── replica-patch.yaml
```

```yaml
# overlays/production/kustomization.yaml
resources:
  - ../../base
patches:
  - path: replica-patch.yaml
images:
  - name: myapp
    newTag: v1.2.3
```

```yaml
# Argo CD Applications point at different overlay paths
# staging Application:    path: overlays/staging
# production Application: path: overlays/production
# Same base manifests, environment-specific patches — no duplication
```

---

## Progressive Delivery — Argo Rollouts

Argo Rollouts extends Kubernetes Deployments with canary and blue-green strategies (see deployment strategies in the CI/CD Concepts page).

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 5
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - setWeight: 30
        - pause: {duration: 5m}
        - setWeight: 60
        - pause: {duration: 5m}
        - setWeight: 100
      analysis:
        templates:
          - templateName: success-rate       # automated rollback if error rate spikes
        startingStep: 2
  selector:
    matchLabels: {app: myapp}
  template:
    metadata: {labels: {app: myapp}}
    spec:
      containers:
        - name: myapp
          image: myapp:1.2.3
```

```yaml
# Analysis Template — automated canary success/failure decision based on metrics
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.95
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status!~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
```

---

## Flux CD — The Alternative

```
Flux is the other major GitOps operator (also a CNCF project).

Argo CD vs Flux:
  Argo CD: richer UI, Application-centric model, very popular for
           multi-team/multi-app visibility
  Flux:     more modular (separate controllers for sources, kustomize,
            helm, notifications), often preferred for pure automation
            without needing a UI, tighter integration with Flagger for
            progressive delivery

Both implement the same GitOps principles — choice often comes down to
UI preference and existing tooling ecosystem (e.g. Flagger pairs
naturally with Flux; Argo Rollouts pairs naturally with Argo CD).
```

---

## How Argo CD Actually Detects and Fixes Drift

```
This is the reconciliation loop pattern one more time, applied at the
level of "entire application deployments" rather than individual
Kubernetes objects — Argo CD is essentially a controller whose desired
state comes from Git instead of etcd-stored object specs directly:

  1. Argo CD's repo-server periodically (and on webhook notification)
     fetches the latest commit from your configured Git repo/path
  2. It RENDERS the manifests — running `helm template` or `kustomize
     build` or just reading raw YAML, depending on your source type
     (this rendering step is IDENTICAL to what Helm itself does — Argo
     CD doesn't reinvent templating, it shells out to the same tools)
  3. Argo CD's application-controller compares this rendered DESIRED
     manifest against the LIVE state of matching objects in the
     cluster (queried via the Kubernetes API — same API every kubectl
     command uses)
  4. The diff is computed per-object, per-field — this is a genuine
     structural diff, not just "did the file change," which is why
     Argo CD can show you EXACTLY which fields differ, down to
     individual YAML keys, in its UI
  5. If `automated` sync is enabled: Argo CD applies the diff
     immediately (essentially `kubectl apply` under the hood, using
     its own service account's permissions, scoped by Argo CD's own
     RBAC configuration — the ONLY entity that needs cluster-write
     credentials in a properly set up GitOps pipeline)
  6. If `selfHeal: true`: this SAME diff-and-apply logic runs
     CONTINUOUSLY, not just when Git changes — so a manual `kubectl
     edit` creating drift gets caught on the very next reconciliation
     pass (default: every few minutes, or immediately via a cluster
     watch on the changed object, depending on Argo CD version/config)
     and is reverted back to match Git

This explains precisely why "Argo CD keeps undoing my manual kubectl
change" isn't a bug — it's the intended behavior of step 6, and the
correct fix is ALWAYS to make the change in Git, never directly against
the cluster, once an Application has selfHeal enabled.
```

---

## Troubleshooting Guide

```
"Application shows 'OutOfSync' but sync doesn't happen automatically"
  automated sync isn't enabled (or was explicitly paused) — check
  spec.syncPolicy.automated is actually present in the Application manifest
  argocd app sync myapp        — trigger it manually to confirm the
  sync mechanism itself works, isolating whether it's an automation
  config issue vs a deeper sync failure

"Sync fails with 'one or more objects failed to apply'"
  argocd app get myapp                — shows per-resource sync status
  Usually a genuine Kubernetes-level rejection (invalid manifest,
  RBAC denial on Argo CD's own service account, resource quota
  exceeded) — the underlying error is the SAME kind you'd get from a
  raw `kubectl apply`, since that's what's happening underneath

"Application is 'Synced' but the app doesn't seem updated"
  Check whether the rendered manifest ACTUALLY changed — a values
  file change that doesn't affect the pod template (see the Helm
  ConfigMap-doesn't-trigger-restart caveat) won't cause a new rollout
  even though Argo CD correctly reports Synced (the live state DOES
  match desired state — desired state just didn't include what you
  expected it to)

"App stuck 'Progressing' forever"
  Same root causes as a stuck kubectl/Helm rollout (failing
  readinessProbe, insufficient cluster resources, etc.) — Argo CD is
  reporting the health status of the underlying Kubernetes rollout,
  not introducing new failure modes of its own
  kubectl get pods -n <namespace>       — diagnose exactly like any
  other stuck Deployment

"Repo-server can't fetch the Git repo"
  Check the configured repo credentials (SSH key/token) under
  Settings → Repositories in the Argo CD UI — a common cause is a
  token that expired or had its scope narrowed after initial setup
```

---

## Tips

- Separate your application source repo from your GitOps config repo — CI writes to the config repo (bumping image tags), Argo CD only ever reads from it.
- Enable `selfHeal: true` deliberately, understanding it means manual `kubectl` changes won't persist — this is a feature, not a bug, but the team needs to know the emergency change process (fast-tracked PR, not `kubectl edit`).
- Use the App of Apps pattern once you have more than a handful of applications — a single root Application becomes your entire cluster's table of contents.
- Rollback in GitOps is just `git revert` — resist the temptation to `kubectl rollback` manually; keep Git as the only path to changing state.
- Argo Rollouts (or Flagger with Flux) adds real canary analysis with automated rollback based on live metrics — worth adopting once basic GitOps is solid.

---

## Summary

- GitOps: declarative, versioned, Git-sourced desired state, continuously reconciled by an in-cluster operator — no direct external `kubectl apply`.
- Argo CD's Application resource maps a Git path to a cluster destination; `syncPolicy.automated` enables auto-sync and self-healing.
- Two-repo pattern (app-repo + config-repo) cleanly separates code changes from deployment changes.
- App of Apps: one root Application manages many child Applications — the entry point for a whole cluster.
- Kustomize overlays (or Helm values files) parametrize the same base manifests across environments without duplication.
- Argo Rollouts/Flagger add canary and blue-green progressive delivery with automated, metrics-driven rollback.
