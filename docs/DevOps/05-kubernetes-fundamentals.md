---
title: "Kubernetes Fundamentals"
sidebar_label: "Kubernetes Fundamentals"
sidebar_position: 5
---

# Kubernetes Fundamentals

Kubernetes (K8s) orchestrates containers across a cluster of machines — handling scheduling, scaling, self-healing, and service discovery automatically.

**Docs:** [kubernetes.io/docs](https://kubernetes.io/docs)

---

## Why Kubernetes

```
Docker runs ONE container on ONE machine.
Kubernetes runs THOUSANDS of containers across MANY machines, and:

  Self-healing:       restarts failed containers automatically
  Scaling:             adds/removes replicas based on load
  Service discovery:   containers find each other via DNS, not hardcoded IPs
  Load balancing:      traffic spread across healthy replicas automatically
  Rolling updates:     deploy new versions with zero downtime
  Rollbacks:            instantly revert a bad deployment
  Secret management:   inject credentials without baking them into images
  Storage orchestration: attach persistent storage to the right container
```

---

## Architecture

```
                        CONTROL PLANE
  ┌────────────────────────────────────────────────────────────┐
  │  API Server    ← all communication goes through this       │
  │  etcd          ← cluster state database (key-value store)  │
  │  Scheduler     ← decides which node runs each pod          │
  │  Controller Manager ← runs control loops (deployments, etc)│
  └────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼─────────────────────┐
        ▼                    ▼                    ▼
   WORKER NODE 1        WORKER NODE 2        WORKER NODE 3
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ kubelet      │    │ kubelet      │    │ kubelet      │
  │ kube-proxy   │    │ kube-proxy   │    │ kube-proxy   │
  │ Container    │    │ Container    │    │ Container    │
  │ Runtime      │    │ Runtime      │    │ Runtime      │
  │ ┌───┐ ┌───┐  │    │ ┌───┐        │    │ ┌───┐ ┌───┐  │
  │ │Pod│ │Pod│  │    │ │Pod│        │    │ │Pod│ │Pod│  │
  │ └───┘ └───┘  │    │ └───┘        │    │ └───┘ └───┘  │
  └──────────────┘    └──────────────┘    └──────────────┘

kubelet:      agent that ensures containers are running in a pod
kube-proxy:   maintains network rules, enables service communication
Container Runtime: containerd or CRI-O (Docker Engine deprecated as of 1.24)
```

---

## Setting Up a Local Cluster

```bash
# minikube — single-node local cluster
brew install minikube    # or download from minikube.sigs.k8s.io
minikube start
minikube status
minikube dashboard        # web UI
minikube stop
minikube delete

# kind (Kubernetes in Docker) — great for CI, multi-node clusters
brew install kind
kind create cluster
kind create cluster --name mycluster --config kind-config.yaml
kind delete cluster

# k3d — lightweight, fast (k3s in Docker)
brew install k3d
k3d cluster create mycluster

# kubectl — the CLI to talk to ANY Kubernetes cluster (local or cloud)
brew install kubectl
kubectl version --client
kubectl cluster-info
kubectl get nodes
```

---

## kubectl — Essential Commands

```bash
# Context and configuration
kubectl config get-contexts           # list available clusters
kubectl config current-context
kubectl config use-context my-cluster
kubectl config set-context --current --namespace=my-namespace

# Namespaces — logical partitions within a cluster
kubectl get namespaces
kubectl create namespace staging
kubectl config set-context --current --namespace=staging

# Get resources
kubectl get pods
kubectl get pods -n kube-system       # specific namespace
kubectl get pods -A                    # all namespaces
kubectl get pods -o wide               # more columns (node, IP)
kubectl get pods -w                    # watch for changes
kubectl get pods --show-labels
kubectl get pods -l app=myapp          # filter by label
kubectl get all                        # pods, services, deployments, etc.
kubectl get deployments,services,pods

# Describe — detailed info + recent events (great for debugging)
kubectl describe pod my-pod
kubectl describe node worker-1
kubectl describe deployment my-app

# Logs
kubectl logs my-pod
kubectl logs my-pod -c container-name  # specific container in a multi-container pod
kubectl logs -f my-pod                 # follow
kubectl logs --previous my-pod         # logs from the previous crashed instance
kubectl logs -l app=myapp --all-containers=true  # all pods matching a label

# Exec into a pod
kubectl exec -it my-pod -- bash
kubectl exec -it my-pod -c container-name -- sh

# Apply / create / delete resources
kubectl apply -f deployment.yaml       # create or update (declarative)
kubectl apply -f ./manifests/          # apply all files in a directory
kubectl create -f pod.yaml             # create only (errors if exists)
kubectl delete -f deployment.yaml
kubectl delete pod my-pod
kubectl delete pods -l app=myapp       # delete by label selector

# Editing
kubectl edit deployment my-app         # opens in $EDITOR
kubectl scale deployment my-app --replicas=5
kubectl rollout restart deployment my-app

# Port forwarding — access a pod/service from your local machine
kubectl port-forward pod/my-pod 8080:80
kubectl port-forward service/my-service 8080:80

# Copy files
kubectl cp my-pod:/app/logs.txt ./logs.txt
kubectl cp ./config.yml my-pod:/app/config.yml

# Resource usage (requires metrics-server)
kubectl top nodes
kubectl top pods
```

---

## Pods — The Basic Unit

A Pod is the smallest deployable unit — one or more tightly-coupled containers sharing network and storage.

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  labels:
    app: myapp
    env: production
spec:
  containers:
    - name: web
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:              # guaranteed minimum
          cpu: "100m"           # 100 millicores = 0.1 CPU
          memory: "128Mi"
        limits:                 # maximum allowed
          cpu: "500m"
          memory: "256Mi"
      env:
        - name: ENV
          value: "production"
      livenessProbe:
        httpGet:
          path: /health
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5
  restartPolicy: Always          # Always | OnFailure | Never
```

```bash
kubectl apply -f pod.yaml
kubectl get pods
kubectl describe pod my-pod
```

```
In practice, you almost never create bare Pods directly.
You use higher-level controllers (Deployment, StatefulSet, DaemonSet, Job)
that manage Pods for you — see the next page for these.

Why: bare Pods don't self-heal. If the node dies, the Pod is gone.
Deployments watch Pods and recreate them automatically.
```

---

## YAML Manifest Anatomy

Every Kubernetes resource follows the same four-field structure:

```yaml
apiVersion: apps/v1        # which version of the Kubernetes API
kind: Deployment            # what type of resource
metadata:                   # identifying information
  name: my-app
  namespace: production
  labels:
    app: my-app
  annotations:
    description: "Main application deployment"
spec:                        # desired state (varies by kind)
  replicas: 3
  # ... resource-specific fields
status:                      # current state (managed by Kubernetes, read-only)
  # ... populated automatically; don't write this yourself
```

```bash
# Common apiVersions
apiVersion: v1                 # Pod, Service, ConfigMap, Secret, Namespace, PVC
apiVersion: apps/v1             # Deployment, StatefulSet, DaemonSet, ReplicaSet
apiVersion: batch/v1             # Job, CronJob
apiVersion: networking.k8s.io/v1 # Ingress, NetworkPolicy
apiVersion: autoscaling/v2       # HorizontalPodAutoscaler

kubectl api-resources           # list all resource types and their apiVersion
kubectl explain pod             # documentation for any resource, inline
kubectl explain pod.spec.containers
```

---

## Labels and Selectors

```yaml
# Labels: key-value pairs attached to resources for organisation
metadata:
  labels:
    app: my-app
    tier: backend
    env: production
    version: v1.2.3

# Selectors: how other resources find Pods with matching labels
spec:
  selector:
    matchLabels:
      app: my-app
      tier: backend
```

```bash
# Query by label
kubectl get pods -l app=my-app
kubectl get pods -l 'env in (staging, production)'
kubectl get pods -l app=my-app,tier=backend      # AND condition
kubectl label pod my-pod env=staging              # add a label
kubectl label pod my-pod env-                     # remove a label
```

---

## Namespaces

```bash
# Namespaces isolate resources logically within one cluster
kubectl get namespaces
# default, kube-system, kube-public, kube-node-lease are built-in

kubectl create namespace staging
kubectl create namespace production

# Most kubectl commands default to 'default' namespace unless specified
kubectl get pods -n staging
kubectl get pods --all-namespaces

# Resource quotas per namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

---

## How Kubernetes Actually Works Internally

### The Reconciliation Loop — the Single Most Important Concept

```
Everything in Kubernetes works via the SAME pattern, repeated for every
resource type. Understanding this one loop explains almost all of
Kubernetes' behavior.

     ┌────────────────────────────────────────────────────────────────────┐
     │                                                                    │
     │   1. You declare DESIRED state (kubectl apply -f x.yaml)           │
     │              ↓ stored in etcd                                      │
     │   2. A CONTROLLER continuously WATCHES etcd for this type          │
     │              ↓                                                     │
     │   3. Controller compares desired state vs ACTUAL state             │
     │              ↓                                                     │
     │   4. If different: controller takes action to reconcile them       │
     │              ↓                                                     │
     │   5. Actual state updated → back to step 3, forever                │
     │                                                                    │
     └────────────────────────────────────────────────────────────────────┘

This is called a "control loop" or "reconciliation loop" and it NEVER stops.
Kubernetes isn't executing your YAML once — it's continuously enforcing it.

Example with a Deployment:
  You say: "I want 3 replicas of this pod"
  Deployment controller watches: "how many matching pods currently exist?"
  If 2 exist: controller creates 1 more
  If 4 exist: controller deletes 1
  If a node dies, taking a pod with it: controller notices 2 exist, creates 1
  This is WHY Kubernetes self-heals — it's not special-cased failure recovery,
  it's the SAME reconciliation loop that handles routine scaling, running constantly.

Every controller you'll ever interact with follows this exact pattern:
  Deployment controller, ReplicaSet controller, Job controller,
  HorizontalPodAutoscaler controller, and any custom controller/operator
  you might install — they all watch, compare, act, repeat.
```

### etcd — The Actual Source of Truth

```
etcd is a distributed, consistent key-value store. It is THE database of
the entire cluster — every object (Pod, Service, Deployment, everything)
is a key-value entry in etcd. The API server is the ONLY thing that talks
to etcd directly; nothing else in the cluster (not even the scheduler or
controllers) reads/writes etcd directly.

  kubectl get pods
       │
       ▼
  talks to the API Server (never etcd directly)
       │
       ▼
  API server validates the request, checks auth/RBAC,
  reads from (or writes to) etcd
       │
       ▼
  returns the result to kubectl

Why this matters operationally:
  etcd backup = cluster backup. If etcd is lost with no backup, the entire
  cluster's state (what should be running) is gone, even if the actual
  pods are still physically running on nodes.
  etcdctl snapshot save backup.db   — the command that actually matters
  for disaster recovery, more than any kubectl command.

  etcd requires a quorum (majority) of its members to be healthy to accept
  writes — this is why production etcd clusters run with an ODD number of
  members (3 or 5), tolerating 1 or 2 node failures respectively.
```

### How Scheduling Actually Works

```
When you create a Pod, it doesn't immediately run anywhere — it goes
through a specific decision process:

1. Pod created → written to etcd with no Node assigned (unscheduled)
2. The Scheduler watches for unscheduled pods
3. FILTERING phase — eliminate nodes that CAN'T run this pod:
     Not enough CPU/memory to satisfy the pod's 'requests'
     Node has a Taint the pod doesn't Tolerate
     Pod has a nodeSelector/affinity rule this node doesn't match
     Port conflicts, volume zone mismatches, etc.
4. SCORING phase — rank the remaining valid nodes:
     Prefer nodes with more free resources (spread load)
     Prefer nodes matching pod anti-affinity preferences (spread replicas
     across failure domains/zones)
     Prefer nodes where required images are already cached (faster startup)
5. Highest-scoring node is chosen; Pod's spec is updated with nodeName
6. The kubelet ON THAT NODE notices a Pod has been assigned to it,
   and THAT'S when the container actually starts

This explains a common confusion: a Pod can be "created" but stuck in
Pending for a long time — that means step 3 (filtering) found NO valid
node, usually due to insufficient resources cluster-wide. `kubectl
describe pod` shows exactly which filtering rule eliminated each node.

Taints and Tolerations (repel pods from nodes unless explicitly allowed):
  kubectl taint nodes node1 dedicated=gpu:NoSchedule
  # only pods with a matching toleration can be scheduled onto node1

  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"

Node/Pod Affinity (attract pods toward or away from nodes/other pods):
  affinity:
    podAntiAffinity:            # spread replicas across different nodes
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector: {matchLabels: {app: my-app}}
          topologyKey: "kubernetes.io/hostname"
```

### The Kubelet — What Actually Runs on Each Node

```
kubelet is the agent running on every worker node. Its ENTIRE job is
the same reconciliation loop pattern, but scoped to just the pods
assigned to its node:

  1. Watch the API server for pods assigned to THIS node
  2. For each pod, ensure the containers described in its spec are
     actually running (talks to the container runtime — containerd/CRI-O —
     via the Container Runtime Interface, CRI)
  3. Run liveness/readiness/startup probes, report status back to
     the API server
  4. Report node-level metrics (used by `kubectl top`, requires metrics-server)

kubelet does NOT talk to other kubelets. Nodes don't coordinate directly
with each other — everything flows through the API server, which is why
the API server is the single most critical component to keep available.

kube-proxy — implements the Service abstraction on each node:
  Watches the API server for Service and Endpoint changes
  Programs iptables (or IPVS) rules on the node so that traffic to a
  Service's virtual IP gets load-balanced to one of the matching Pod IPs
  This is literally how "Service load balancing" works under the hood —
  it's kernel-level packet rewriting rules, not a running proxy process
  intercepting every request (in the default iptables mode)
```

### Request Flow — What Happens on `kubectl apply`

```
kubectl apply -f deployment.yaml
     │
     ▼
1. kubectl reads the YAML, converts to JSON, sends HTTP request to API server
     │
     ▼
2. API server AUTHENTICATION — who are you? (certificate, token, etc.)
     │
     ▼
3. API server AUTHORIZATION (RBAC) — are you ALLOWED to do this?
     │
     ▼
4. ADMISSION CONTROLLERS — mutate/validate the request
     (e.g. inject default resource limits, reject if violates a policy,
      inject a sidecar container — this is how tools like the Vault
      Agent Injector and Istio's sidecar injection actually work:
      they register as admission webhooks)
     │
     ▼
5. Object is validated against its schema, written to etcd
     │
     ▼
6. API server returns success to kubectl — kubectl's job is done here
     │
     ▼
7. (Asynchronously, separately) Controllers notice the new/changed object
   via watch and begin their reconciliation loops (creating ReplicaSets,
   which create Pods, which the Scheduler places, which kubelets run)

Critical insight: `kubectl apply` returning successfully does NOT mean
your pods are running yet — it only means your DESIRED state was
accepted and recorded. Everything after step 6 happens asynchronously.
This is why `kubectl rollout status` exists — to actually wait for and
report on the async reconciliation, rather than just the initial write.
```

---

## Common Failure Modes and How to Read Them

```
Pod stuck in "Pending":
  kubectl describe pod <name> — check Events at the bottom
  Usually: insufficient cluster resources, or an unsatisfiable
  affinity/toleration rule (see Scheduling section above)

Pod stuck in "ContainerCreating":
  Usually: image pull taking a long time/failing, or a volume mount
  (e.g. a PVC that can't bind) is blocking startup
  kubectl describe pod <name> — look for "Failed to pull image" or
  volume-related events

Pod in "CrashLoopBackOff":
  The container starts, then exits (crashes), repeatedly — Kubernetes
  backs off retrying with exponential delay (10s, 20s, 40s... capped)
  kubectl logs <pod> --previous   — see the log from the crashed instance
  (plain `kubectl logs` shows the CURRENT instance, which may be too
   new to have produced useful output yet)

Pod in "ImagePullBackOff" / "ErrImagePull":
  Usually: wrong image name/tag, private registry auth missing
  (need an imagePullSecrets reference), or registry unreachable
  from within the cluster's network

Pod "Running" but not "Ready":
  The container process is running, but the readinessProbe is failing
  kubectl describe pod <name> — check the readiness probe's target path
  This pod will NOT receive traffic from its Service until it passes

"OOMKilled" in pod status:
  Container exceeded its memory limit and the kernel killed it
  Fix: either raise the memory limit, or find/fix a memory leak in the app
  (same root concept as the Docker OOM troubleshooting, one layer up)
```

---

## Tips

- `kubectl describe` is your first debugging step for any resource — the Events section at the bottom usually tells you exactly what's wrong.
- Set `requests` and `limits` on every container — without them, a single misbehaving pod can starve the entire node.
- Use `kind` for CI pipelines (fast, fully in Docker) and `minikube` for local development (better dashboard/addons).
- `kubectl explain <resource>.<field>` is faster than searching docs — the schema documentation is built into the cluster.
- Always specify a namespace explicitly in commands and manifests for anything beyond quick local testing — relying on "default" namespace causes confusion in shared clusters.

---

## Summary

- Kubernetes orchestrates containers across a cluster: self-healing, scaling, service discovery, rolling updates.
- Control plane (API server, etcd, scheduler, controller manager) manages worker nodes (kubelet, kube-proxy, container runtime).
- `kubectl get/describe/logs/exec/apply/delete` are the core daily commands.
- A Pod is the smallest deployable unit — usually managed by a higher-level controller (Deployment, StatefulSet), not created directly.
- Every manifest has `apiVersion`, `kind`, `metadata`, `spec` — `status` is managed by Kubernetes.
- Labels + selectors are how Kubernetes resources find and group Pods; namespaces logically partition a cluster.
