---
title: "Kubernetes Storage and Scaling"
sidebar_label: "K8s Storage & Scaling"
sidebar_position: 7
---

# Kubernetes Storage and Scaling

Persistent storage, StatefulSets, autoscaling, and resource management for production workloads.

**Docs:** [kubernetes.io/docs/concepts/storage](https://kubernetes.io/docs/concepts/storage/)

---

## Persistent Volumes and Claims

```
PersistentVolume (PV):    a piece of storage in the cluster (provisioned by admin or dynamically)
PersistentVolumeClaim (PVC): a request for storage by a Pod (like a Pod requesting resources)
StorageClass:              defines HOW storage is dynamically provisioned (which backend, parameters)

Flow:
  Pod requests storage via PVC
       ↓
  PVC binds to a matching PV (or triggers dynamic provisioning via StorageClass)
       ↓
  Pod mounts the PVC as a volume
```

```yaml
# StorageClass — usually pre-configured by your cloud provider
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs      # or gcp-pd, azure-disk, etc.
parameters:
  type: gp3
reclaimPolicy: Delete                    # Delete | Retain
volumeBindingMode: WaitForFirstConsumer  # delay binding until a Pod needs it

---
# PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-storage
spec:
  accessModes:
    - ReadWriteOnce      # RWO: one node read-write; ROX: many read-only; RWX: many read-write
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 20Gi

---
# Using the PVC in a Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector: {matchLabels: {app: postgres}}
  template:
    metadata: {labels: {app: postgres}}
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: db-storage
```

```bash
kubectl get pv
kubectl get pvc
kubectl get storageclass
kubectl describe pvc db-storage
```

---

## StatefulSets

For workloads needing stable network identity and persistent storage per replica (databases, message queues).

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres          # headless service (required)
  replicas: 3
  selector:
    matchLabels: {app: postgres}
  template:
    metadata: {labels: {app: postgres}}
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports: [{containerPort: 5432}]
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:            # each replica gets its OWN PVC automatically
    - metadata: {name: data}
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests: {storage: 20Gi}

---
# Headless Service — required for StatefulSet stable DNS
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None                # headless
  selector: {app: postgres}
  ports: [{port: 5432}]
```

```
Deployment vs StatefulSet:

Deployment:
  Pods are interchangeable — any replica can serve any request
  Pod names: my-app-7d9f8b6c4d-x7k2p (random suffix)
  Use for: stateless apps (web servers, APIs)

StatefulSet:
  Pods have stable, unique identities: postgres-0, postgres-1, postgres-2
  Each replica gets its own PVC — data persists per-replica across restarts
  Pods created/deleted in order (0, 1, 2, ... and reverse for deletion)
  DNS: postgres-0.postgres.default.svc.cluster.local
  Use for: databases, Kafka, Elasticsearch, anything with per-instance identity
```

```bash
kubectl get statefulsets
kubectl get pods -l app=postgres    # postgres-0, postgres-1, postgres-2
kubectl scale statefulset postgres --replicas=5
```

---

## Resource Requests and Limits

```yaml
resources:
  requests:            # guaranteed minimum — used for scheduling decisions
    cpu: "250m"          # 250 millicores = 0.25 vCPU
    memory: "256Mi"
  limits:               # maximum allowed — enforced at runtime
    cpu: "1"              # 1 full vCPU
    memory: "512Mi"

# What happens when limits are exceeded:
# CPU:    container is throttled (slowed down, not killed)
# Memory: container is OOMKilled (killed and restarted)

# Quality of Service (QoS) classes — determined by requests/limits:
# Guaranteed: requests == limits for both CPU and memory (highest priority, evicted last)
# Burstable:  requests < limits (medium priority)
# BestEffort: no requests/limits set (lowest priority, evicted first under pressure)
```

```bash
kubectl top pods                    # current usage (requires metrics-server)
kubectl describe node worker-1      # see allocated vs available resources
kubectl get pod my-pod -o jsonpath='{.status.qosClass}'
```

---

## Horizontal Pod Autoscaler (HPA)

Automatically scales the NUMBER of Pod replicas based on observed metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70          # scale up if avg CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60       # wait before scaling up again
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60                 # add at most 4 pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300       # wait 5 min before scaling down (avoid flapping)
```

```bash
kubectl apply -f hpa.yaml
kubectl get hpa
kubectl describe hpa my-app-hpa
kubectl autoscale deployment my-app --min=2 --max=20 --cpu-percent=70  # imperative shortcut

# Custom metrics HPA (requires Prometheus Adapter or similar)
# Example: scale based on requests-per-second, queue depth, etc.
```

---

## Vertical Pod Autoscaler (VPA)

Automatically adjusts CPU/memory REQUESTS for containers (different from HPA, which changes replica count).

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Auto"    # Off (recommend only) | Initial | Auto (evicts + resizes pods)
```

```
HPA vs VPA:
  HPA: more replicas of the same size (horizontal scaling)
  VPA: same number of replicas, but bigger/smaller (vertical scaling)
  Don't use both on CPU/memory for the same workload — they can conflict
  Cluster Autoscaler (separate tool) scales the NUMBER OF NODES based on pending pods
```

---

## Cluster Autoscaler

Scales the number of NODES in the cluster (not pods) — works with your cloud provider.

```
When pods can't be scheduled due to insufficient node resources:
  Cluster Autoscaler adds nodes (cloud provider provisions new VMs)

When nodes are underutilized for a period:
  Cluster Autoscaler removes nodes (after draining pods safely)

Configured per cloud provider (EKS, GKE, AKS have managed node group autoscaling)
Works together with HPA:
  HPA decides how many pods are needed
  Cluster Autoscaler ensures there's enough node capacity to run them
```

---

## Probes in Depth

```yaml
livenessProbe:    # "is this container alive? if not, restart it"
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3       # 3 consecutive failures → restart

readinessProbe:   # "is this container ready for traffic? if not, remove from Service"
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 2

startupProbe:     # "has this SLOW-starting container finished starting?"
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30        # allow up to 30 * periodSeconds to start
  periodSeconds: 10
  # while startupProbe is running, liveness/readiness are disabled
  # prevents killing slow-starting apps (e.g. large JVM apps) prematurely

# Probe types
livenessProbe:
  exec:
    command: ["cat", "/tmp/healthy"]     # exec — run a command, 0 exit = healthy
  # or:
  tcpSocket:
    port: 5432                             # tcpSocket — just check the port is open
  # or:
  httpGet:
    path: /health
    port: 8080
    httpHeaders:
      - name: Custom-Header
        value: check
```

---

## Pod Disruption Budgets

Protect against too many Pods being evicted simultaneously during voluntary disruptions (node drains, cluster upgrades).

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2            # or maxUnavailable: 1
  selector:
    matchLabels:
      app: my-app

# Ensures at least 2 replicas stay available even during a node drain
# kubectl drain will respect this and wait/fail rather than violate it
```

---

## How PV/PVC Binding Actually Works

```
This is another instance of the reconciliation loop pattern (see
kubernetes-fundamentals.md) — a dedicated controller (PersistentVolume
controller) constantly watches for unbound PVCs and tries to match them:

  1. You create a PVC requesting "20Gi, ReadWriteOnce, storageClass=fast-ssd"
  2. PV controller watches for unbound PVCs
  3a. STATIC provisioning: if a matching PV already exists (created
      manually by an admin ahead of time) — bind them together
  3b. DYNAMIC provisioning (far more common today): the PVC references
      a StorageClass with a `provisioner` — the controller calls OUT to
      that provisioner (e.g. the AWS EBS CSI driver) to actually CREATE
      a new cloud disk matching the request, THEN creates a PV object
      representing it, THEN binds the PVC to it
  4. Once bound, the Pod referencing that PVC can be scheduled — but
     ONLY onto a node that can actually reach that volume (e.g. same
     Availability Zone as an EBS volume) — this is why
     volumeBindingMode: WaitForFirstConsumer exists: it delays actually
     PROVISIONING the disk until a Pod needing it is scheduled, so the
     disk can be created in the SAME zone the scheduler picks, rather
     than provisioning it first and then being stuck unable to schedule
     the pod anywhere reachable

CSI (Container Storage Interface): the standardized plugin interface
that lets Kubernetes talk to ANY storage backend (AWS EBS, GCP PD,
Azure Disk, Ceph, NFS, etc.) without Kubernetes core needing built-in
knowledge of each one — same plugin philosophy as CRI for container
runtimes and CNI for networking.
```

## How the HPA Control Loop Actually Decides to Scale

```
The HorizontalPodAutoscaler is, again, a reconciliation loop, running
on a periodic timer (default: every 15 seconds):

  1. Query current metric value (e.g. average CPU utilization across
     all pods in the target Deployment) — comes from the Metrics API,
     served by metrics-server (for CPU/memory) or a custom/external
     metrics adapter (for anything else, like queue depth or RPS)
  2. Compute desired replica count:
     desiredReplicas = ceil(currentReplicas * (currentMetricValue / targetMetricValue))
     Example: 4 replicas currently, avg CPU is 140% of target (70% target,
     currently at 98%) → ceil(4 * (98/70)) = ceil(5.6) = 6 replicas
  3. Clamp to [minReplicas, maxReplicas]
  4. Apply `behavior` stabilization rules (don't scale up/down too
     fast/often — this is what stabilizationWindowSeconds controls)
  5. Update the Deployment's replica count if it changed
  6. The Deployment controller then does its NORMAL reconciliation
     (see kubernetes-workloads.md) to actually create/remove pods

This explains a common point of confusion: HPA doesn't create pods
directly — it just edits the Deployment's `replicas` field, and the
EXISTING Deployment/ReplicaSet machinery handles the actual pod
creation, using the exact same mechanism as if you'd run `kubectl
scale` by hand.
```

## Why Probes Have Three Distinct Types

```
This isn't redundancy — each probe type answers a genuinely different
question, checked by a genuinely different consumer:

livenessProbe  → answered TO: the kubelet on this node
                 question: "is this container's process still healthy,
                 or should it be KILLED AND RESTARTED?"
                 failure action: kubelet kills and restarts the container

readinessProbe → answered TO: the Endpoints/EndpointSlice controller
                 question: "should this pod's IP be included in the
                 Service's load-balancing rotation RIGHT NOW?"
                 failure action: pod removed from Service endpoints
                 (traffic stops routing to it) — but the container
                 keeps running, NOT restarted

startupProbe   → answered TO: the kubelet, but ONLY during startup
                 question: "has this slow-starting app finished
                 initializing yet?"
                 while this probe hasn't succeeded, liveness/readiness
                 probes are NOT executed at all — this prevents a
                 slow-starting app (e.g. a JVM app with a 90-second
                 warmup) from being killed by an impatient liveness
                 probe before it even finished starting once

A container can be "Running" (process alive, passes liveness) but NOT
"Ready" (fails readiness, e.g. still connecting to its database) —
this is a completely normal, common state during startup or a
temporary downstream dependency issue, and it's precisely why these
are separate signals rather than one combined "healthy" check.
```

---

## Troubleshooting Guide

```
"PVC stuck in Pending forever"
  kubectl describe pvc <name>                — check Events
  Common cause: no StorageClass matches, or dynamic provisioner
  can't create the volume (quota exceeded, wrong permissions on the
  cloud provider side, zone mismatch)

"Pod stuck Pending, Events show volume node affinity conflict"
  The bound PV is in a different Availability Zone than any node
  that could otherwise run this pod — classic symptom of provisioning
  a disk before scheduling was considered
  Fix: use volumeBindingMode: WaitForFirstConsumer on the StorageClass
  going forward (doesn't fix already-bound volumes)

"HPA shows <unknown>/70% for target metric"
  metrics-server isn't installed or isn't reachable
  kubectl top pods    — if this also fails, metrics-server is the issue
  kubectl get apiservices | grep metrics    — check its registration status

"StatefulSet pods not coming up in order / stuck"
  StatefulSets create pods ONE AT A TIME, in order, and by default
  wait for each to be Running AND Ready before starting the next
  kubectl get pods -l app=<name>              — see which one is stuck
  kubectl describe pod <name>-0                 — that pod is blocking
  every pod after it from even being created
```

---

## Tips

- Always set `requests` — the scheduler uses it to decide which node to place a Pod on; without it, Kubernetes has no basis for scheduling decisions.
- Use StatefulSets only when you genuinely need stable identity and per-replica storage — Deployments are simpler and sufficient for most workloads.
- Set `stabilizationWindowSeconds` on HPA `scaleDown` to avoid "flapping" (rapid scale up/down cycles) under bursty load.
- `startupProbe` prevents Kubernetes from killing legitimately slow-starting applications (large JVM apps, apps with heavy migrations) during the liveness probe window.
- PodDisruptionBudgets matter more than people expect — without one, a routine node upgrade can take down all replicas of a service simultaneously.

---

## Summary

- PV/PVC/StorageClass: the three-layer abstraction for persistent storage — PVC is what your Pod requests.
- StatefulSet: stable network identity + per-replica storage — use for databases and stateful systems.
- `resources.requests`/`limits`: requests drive scheduling, limits are enforced (CPU throttled, memory OOMKilled).
- HPA: scales replica count based on metrics (CPU, memory, custom); VPA: resizes requests/limits; Cluster Autoscaler: scales nodes.
- `livenessProbe` restarts unhealthy containers; `readinessProbe` controls traffic routing; `startupProbe` protects slow starters.
- PodDisruptionBudget protects service availability during voluntary disruptions like node drains.
