---
title: "Helm"
sidebar_label: "Helm"
sidebar_position: 8
---

# Helm

Helm is the package manager for Kubernetes — it templates YAML manifests and manages releases as a unit, instead of applying dozens of raw files by hand.

**Docs:** [helm.sh/docs](https://helm.sh/docs/)

---

## Why Helm

```
Without Helm: kubectl apply -f deployment.yaml -f service.yaml -f ingress.yaml -f configmap.yaml ...
  Manually manage versions, no templating, hard to parametrize per environment

With Helm: helm install myapp ./mychart --set image.tag=1.2.3
  A "chart" bundles all related manifests as templates
  Values are injected per environment (dev/staging/prod) from a single chart
  Releases are versioned — easy rollback to any previous release
  Dependencies between charts are managed (e.g. app chart depends on postgres chart)
```

---

## Installation and Basic Usage

```bash
brew install helm     # or see helm.sh/docs/intro/install

helm version

# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Search for charts
helm search repo postgres
helm search hub wordpress          # search Artifact Hub

# Install a chart
helm install my-release bitnami/postgresql
helm install my-release bitnami/postgresql --namespace db --create-namespace
helm install my-release bitnami/postgresql -f values.yaml
helm install my-release bitnami/postgresql --set auth.password=secret123

# List releases
helm list
helm list -A                       # all namespaces
helm status my-release

# Upgrade
helm upgrade my-release bitnami/postgresql -f values.yaml
helm upgrade --install my-release bitnami/postgresql   # install if not exists (idempotent)

# Rollback
helm history my-release
helm rollback my-release 2         # rollback to revision 2

# Uninstall
helm uninstall my-release

# Preview what would be installed (no changes made)
helm install my-release bitnami/postgresql --dry-run --debug
helm template my-release bitnami/postgresql            # render templates locally
```

---

## Chart Structure

```
mychart/
├── Chart.yaml           ← chart metadata (name, version, description)
├── values.yaml           ← default configuration values
├── charts/                ← dependency charts (subcharts)
├── templates/              ← Kubernetes manifest templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl        ← reusable template snippets
│   └── NOTES.txt            ← printed after install/upgrade
└── .helmignore              ← files to exclude when packaging
```

```bash
helm create mychart          # scaffold a new chart with sensible defaults
helm lint mychart             # validate chart syntax
helm package mychart          # produce mychart-1.0.0.tgz
```

---

## Chart.yaml

```yaml
apiVersion: v2
name: mychart
description: A Helm chart for my application
type: application
version: 1.2.3           # chart version (SemVer)
appVersion: "2.1.0"       # version of the app this chart deploys

dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

```bash
helm dependency update mychart      # download dependencies into charts/
helm dependency list mychart
```

---

## values.yaml and Templating

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myrepo/myapp
  tag: "1.2.3"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  host: myapp.example.com

resources:
  requests: {cpu: 100m, memory: 128Mi}
  limits:   {cpu: 500m, memory: 512Mi}

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10

postgresql:
  enabled: true
  auth:
    password: changeme
```

```yaml
# templates/deployment.yaml — Go template syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  labels:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 8080
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.autoscaling.enabled }}
          # ... autoscaling-related config
          {{- end }}
```

```
Built-in objects:
  .Release.Name        release name given at install time
  .Release.Namespace   target namespace
  .Chart.Name           chart name (from Chart.yaml)
  .Chart.Version         chart version
  .Values.xxx            values from values.yaml (or --set / -f overrides)
  .Files.Get "file.txt" access files in the chart directory
  .Capabilities.KubeVersion  cluster's Kubernetes version

Template functions:
  {{ .Values.name | upper }}                 pipe to a function
  {{ .Values.name | default "world" }}       default value if unset
  {{ toYaml .Values.resources | nindent 8 }} convert to YAML, indent
  {{ if .Values.x }} ... {{ end }}            conditional
  {{ range .Values.items }} ... {{ end }}     loop
  {{ include "mychart.labels" . }}            call a named template
  {{ required "image.tag is required" .Values.image.tag }}  fail if not set
```

---

## _helpers.tpl — Reusable Templates

```yaml
{{/* templates/_helpers.tpl */}}
{{- define "mychart.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "mychart.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}
```

```yaml
# Usage in a template
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
```

---

## Environment-Specific Values

```bash
# values-dev.yaml, values-staging.yaml, values-prod.yaml
helm install myapp ./mychart -f values-prod.yaml

# Layer multiple files — later files override earlier ones
helm install myapp ./mychart -f values.yaml -f values-prod.yaml

# Override individual values from CLI (highest precedence)
helm install myapp ./mychart -f values-prod.yaml --set replicaCount=5
helm install myapp ./mychart --set image.tag=$(git rev-parse --short HEAD)

# values-prod.yaml
replicaCount: 5
resources:
  requests: {cpu: 500m, memory: 512Mi}
  limits:   {cpu: "2", memory: 2Gi}
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 50
```

---

## Hooks

Run jobs at specific points in a release lifecycle.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade   # runs BEFORE install/upgrade
    "helm.sh/hook-weight": "-5"                 # lower runs first
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["python", "manage.py", "migrate"]
      restartPolicy: Never

# Hook types:
# pre-install, post-install, pre-upgrade, post-upgrade
# pre-delete, post-delete, pre-rollback, post-rollback, test
```

```bash
helm test my-release            # run any "test" hooks
```

---

## GitOps Pattern with Helm

```
Typical production workflow:
  1. Application code lives in one repo
  2. Helm chart lives in the same repo (or a separate "charts" repo)
  3. CI builds and pushes a new image on merge to main
  4. CI (or Argo CD) updates the image tag in values-prod.yaml
  5. Argo CD/Flux detects the Git change and runs 'helm upgrade' automatically

# Manual equivalent of what a GitOps tool automates:
helm upgrade --install myapp ./charts/myapp \
    -f charts/myapp/values-prod.yaml \
    --set image.tag=$CI_COMMIT_SHA \
    --namespace production \
    --atomic \                    # rollback automatically on failure
    --timeout 5m
```

---

## How Helm Actually Renders and Applies a Chart

```
Helm is fundamentally a TEMPLATING engine bolted onto `kubectl apply`,
plus a release-tracking system. Understanding the exact sequence
demystifies most "why did my chart do that" confusion:

  1. Load Chart.yaml, values.yaml, and any -f/--set overrides
  2. MERGE all value sources into one final values object — precedence,
     highest to lowest:
       --set flags (highest — always wins)
       -f custom-values.yaml files (later files override earlier ones)
       values.yaml (chart defaults — lowest)
  3. For EVERY file in templates/, render it as a Go template, injecting
     the merged values, .Release, .Chart, .Files, .Capabilities objects
  4. Concatenate all rendered YAML documents into one giant manifest
  5. Parse that manifest into individual Kubernetes objects
  6. Compare against the PREVIOUS release's manifest (stored by Helm
     itself, NOT re-derived from the cluster) to compute a diff
  7. Apply the diff via the Kubernetes API — same underlying mechanism
     as `kubectl apply`, including the same admission
     controllers/validation from the K8s side (see kubernetes-fundamentals.md)
  8. Record this release (chart version, values used, rendered manifest,
     status) as a new Secret object in the cluster (Helm's own storage
     for its release history — this is literally how `helm rollback`
     and `helm history` work: they're reading these stored release
     records, not inspecting the live cluster state)

This explains why `helm template` (render-only, no cluster interaction)
is your fastest debugging tool — it runs ONLY steps 1-4 above, letting
you see exactly what would be applied without touching anything,
useful when a values override isn't producing the YAML you expect.

It also explains why `helm rollback` can be instant even for complex
changes — it's not recomputing anything, it's re-applying a manifest
that was ALREADY fully rendered and stored from a previous release.
```

---

## Troubleshooting Guide

```
"Template renders wrong / unexpected value used"
  helm template ./mychart -f values-prod.yaml --debug   — see the exact
  final values AND rendered output, no cluster interaction needed
  Common cause: value precedence surprise — a --set flag or a later
  -f file is silently overriding what you expect from an earlier one
  (see the precedence order above)

"helm install fails with 'INSTALLATION FAILED: cannot re-use a name'"
  A release with this name already exists (possibly failed/stuck)
  helm list -a                    — check for it, including failed releases
  helm uninstall <name>            — clean up before retrying, or use
  helm upgrade --install            — which handles "doesn't exist yet" gracefully

"helm upgrade succeeds but pods never actually update"
  Check whether the Deployment's pod template actually CHANGED — if
  only a ConfigMap changed (referenced by name, not by content hash),
  Kubernetes has no reason to restart pods (see the ConfigMap caveat
  in kubernetes-workloads.md troubleshooting)
  Fix: use a checksum annotation trick to force a rollout on config change:
    annotations:
      checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
  (changing the checksum changes the pod template hash, which DOES
  trigger a rolling update)

"Chart dependency (subchart) values aren't being applied"
  Subchart values must be nested under the subchart's name in the
  PARENT chart's values.yaml:
    postgresql:              # ← must match the dependency's name in Chart.yaml
      auth:
        password: secret
  A common mistake is putting subchart values at the top level instead

"helm upgrade hangs / times out"
  Usually: a pod in the new release isn't passing its readinessProbe,
  so the rollout can never complete (identical root cause to the plain
  Kubernetes Deployment troubleshooting — Helm is just wrapping the
  same underlying rollout mechanism)
  kubectl get pods -l app.kubernetes.io/instance=<release-name>
  kubectl describe pod <stuck-pod>
```

---

## Tips

- `helm template` renders the chart locally without touching the cluster — use it to debug templating issues before `helm install`.
- Always use `--atomic` in CI/CD — it automatically rolls back a failed upgrade instead of leaving the release in a broken intermediate state.
- Keep environment-specific values in separate files (`values-prod.yaml`) rather than a maze of `--set` flags — easier to review in a PR.
- `helm diff upgrade` (via the helm-diff plugin) shows exactly what will change before you apply an upgrade — essential for confident production deployments.
- Version your charts independently from your application — a chart version bump for a templating fix doesn't need an app version bump.

---

## Summary

- Helm packages Kubernetes manifests as templated "charts" with a `values.yaml` for configuration.
- `helm install`/`upgrade`/`rollback`/`uninstall` manage releases as a single versioned unit.
- Chart structure: `Chart.yaml` (metadata), `values.yaml` (defaults), `templates/` (Go-templated manifests).
- `{{ .Values.x }}`, `{{ if }}`, `{{ range }}`, `{{ include }}` are the core templating constructs.
- Layer `values-<env>.yaml` files for environment-specific configuration; `--set` for one-off CLI overrides.
- Hooks (`pre-install`, `post-upgrade`, etc.) run Jobs at specific points in the release lifecycle — commonly used for migrations.
