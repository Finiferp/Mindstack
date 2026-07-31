---
title: "Kubernetes Workloads and Networking"
sidebar_label: "K8s Workloads"
sidebar_position: 6
---

# Kubernetes Workloads and Networking

Deployments, Services, Ingress, ConfigMaps, and Secrets — the resources you'll use in almost every application deployment.

**Docs:** [kubernetes.io/docs/concepts/workloads](https://kubernetes.io/docs/concepts/workloads/)

---

## Deployments

A Deployment manages a set of identical Pods (via ReplicaSets), handling rolling updates and self-healing.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate           # RollingUpdate | Recreate
    rollingUpdate:
      maxSurge: 1                 # extra pods allowed during rollout
      maxUnavailable: 0           # pods that can be down during rollout
  template:                        # Pod template — same fields as a Pod spec
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myrepo/my-app:1.2.3
          ports:
            - containerPort: 8080
          resources:
            requests: {cpu: "100m", memory: "128Mi"}
            limits:   {cpu: "500m", memory: "512Mi"}
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          livenessProbe:
            httpGet: {path: /healthz, port: 8080}
            initialDelaySeconds: 10
          readinessProbe:
            httpGet: {path: /ready, port: 8080}
            initialDelaySeconds: 5
```

```bash
kubectl apply -f deployment.yaml
kubectl get deployments
kubectl rollout status deployment/my-app
kubectl rollout history deployment/my-app
kubectl rollout undo deployment/my-app                # rollback to previous
kubectl rollout undo deployment/my-app --to-revision=2 # rollback to specific revision
kubectl set image deployment/my-app my-app=myrepo/my-app:1.2.4  # update image
kubectl scale deployment/my-app --replicas=5
kubectl autoscale deployment/my-app --min=2 --max=10 --cpu-percent=80
```

---

## Services — Stable Networking for Pods

Pods are ephemeral (IPs change on restart). A Service provides a stable DNS name and IP that load-balances across matching Pods.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app                # routes to Pods with this label
  ports:
    - protocol: TCP
      port: 80                  # port the Service exposes
      targetPort: 8080          # port the container listens on
  type: ClusterIP               # see types below
```

```
Service types:

ClusterIP (default):
  Only reachable from inside the cluster
  Use for: internal services (databases, internal APIs)

NodePort:
  Exposes the service on a static port on every node's IP
  Range: 30000-32767
  Use for: quick testing; rarely used in production (LoadBalancer/Ingress preferred)

LoadBalancer:
  Provisions an external cloud load balancer (AWS ELB, GCP LB, etc.)
  Use for: public-facing services (requires a cloud provider integration)

ExternalName:
  Maps the service to an external DNS name (e.g. a managed database)
  No proxying — just DNS CNAME
```

```yaml
# NodePort example
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080

# LoadBalancer example (cloud provider provisions an external IP)
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8443
```

```bash
kubectl get services
kubectl get svc my-app-service -o wide
kubectl describe svc my-app-service

# DNS inside the cluster:
# <service-name>.<namespace>.svc.cluster.local
# From within any pod: curl http://my-app-service.production.svc.cluster.local
# Same namespace: curl http://my-app-service
```

---

## Ingress — HTTP Routing

Ingress routes external HTTP(S) traffic to Services based on hostname/path — like a reverse proxy configuration.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts: ["myapp.example.com"]
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port: {number: 80}
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port: {number: 80}
```

```bash
# Requires an Ingress Controller installed in the cluster (nginx-ingress, Traefik, etc.)
helm install nginx-ingress ingress-nginx/ingress-nginx

kubectl get ingress
kubectl describe ingress my-app-ingress

# cert-manager automates TLS certificate provisioning (Let's Encrypt)
```

---

## ConfigMaps — Non-Sensitive Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"
  config.yaml: |
    server:
      port: 8080
      timeout: 30s
```

```yaml
# Using a ConfigMap in a Deployment
spec:
  containers:
    - name: my-app
      envFrom:
        - configMapRef:
            name: app-config           # inject ALL keys as env vars
      env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL             # inject ONE key
      volumeMounts:
        - name: config-volume
          mountPath: /etc/config
  volumes:
    - name: config-volume
      configMap:
        name: app-config                 # mount as files
```

```bash
kubectl create configmap app-config --from-literal=LOG_LEVEL=info
kubectl create configmap app-config --from-file=config.yaml
kubectl get configmaps
kubectl describe configmap app-config
```

---

## Secrets — Sensitive Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:                          # values must be base64-encoded
  username: YWRtaW4=            # echo -n 'admin' | base64
  password: c2VjcmV0MTIz
stringData:                    # plain-text values (K8s encodes automatically)
  url: "postgres://user:pass@db:5432/mydb"
```

```yaml
# Using a Secret in a Deployment
spec:
  containers:
    - name: my-app
      envFrom:
        - secretRef:
            name: db-credentials
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
      volumeMounts:
        - name: secret-volume
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secret-volume
      secret:
        secretName: db-credentials
```

```bash
kubectl create secret generic db-credentials \
    --from-literal=username=admin \
    --from-literal=password=secret123
kubectl create secret generic tls-cert \
    --from-file=tls.crt=cert.pem --from-file=tls.key=key.pem
kubectl create secret docker-registry regcred \
    --docker-server=myregistry.com --docker-username=user --docker-password=pass

kubectl get secrets
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d

# IMPORTANT: Secrets are base64-encoded, NOT encrypted, by default
# base64 is trivially reversible — this is encoding, not security
# For real secret management: enable encryption at rest, or use Vault/Sealed Secrets
```

---

## Jobs and CronJobs

```yaml
# Job — run a task to completion (e.g. database migration)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  backoffLimit: 3               # retry up to 3 times on failure
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:1.0
          command: ["python", "manage.py", "migrate"]
      restartPolicy: Never       # or OnFailure

---
# CronJob — scheduled recurring Job
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
spec:
  schedule: "0 2 * * *"          # standard cron syntax
  concurrencyPolicy: Forbid       # Allow | Forbid | Replace
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: myapp:1.0
              command: ["/scripts/backup.sh"]
          restartPolicy: OnFailure
```

```bash
kubectl apply -f job.yaml
kubectl get jobs
kubectl logs job/db-migration
kubectl get cronjobs
kubectl create job manual-run --from=cronjob/nightly-backup   # trigger manually
```

---

## DaemonSet

Ensures a copy of a Pod runs on every (or selected) node — used for node-level agents.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels: {app: log-collector}
  template:
    metadata:
      labels: {app: log-collector}
    spec:
      containers:
        - name: fluentd
          image: fluent/fluentd:v1.16
          volumeMounts:
            - name: varlog
              mountPath: /var/log
      volumes:
        - name: varlog
          hostPath:
            path: /var/log

# Common uses: log collectors (Fluentd), monitoring agents (node-exporter),
# network plugins (Calico, Cilium)
```

---

## How Deployments Actually Work Underneath

```
A Deployment doesn't directly manage Pods — it manages a chain of objects:

  Deployment → creates/manages → ReplicaSet → creates/manages → Pods

  kubectl get deployment my-app
  kubectl get replicaset -l app=my-app     # you'll see one (or more, during rollout)
  kubectl get pods -l app=my-app

Why the extra layer (ReplicaSet) exists — this is EXACTLY how rolling
updates and rollbacks work mechanically:

  1. You update the Deployment's image (kubectl set image / apply new YAML)
  2. Deployment controller creates a NEW ReplicaSet with the new pod template
  3. NEW ReplicaSet scales up gradually (maxSurge controls how fast)
  4. OLD ReplicaSet scales down gradually (maxUnavailable controls how fast)
  5. Once new ReplicaSet is fully up and old is fully down, rollout is complete
  6. The OLD ReplicaSet is NOT deleted — it's kept around (scaled to 0)
     for rollback purposes, up to revisionHistoryLimit (default 10)

This is why `kubectl rollout undo` is instant — it's not recreating pods
from scratch, it's just re-scaling a ReplicaSet that already exists
(scaling the current one down, the previous one back up):

  kubectl rollout history deployment/my-app        # see revision history
  kubectl rollout undo deployment/my-app --to-revision=3
  # under the hood: finds the ReplicaSet matching revision 3, scales it
  # up, scales the current one down — same rolling update mechanism,
  # just in reverse
```

## How Services Actually Route Traffic

```
A Service is NOT a running process/proxy sitting in the traffic path in
the way a load balancer application would be. It's a set of rules:

  1. Service has a stable virtual IP (ClusterIP) — this IP doesn't
     correspond to any real network interface; it's virtual
  2. Service continuously watches for Pods matching its selector,
     tracking their real IPs as an EndpointSlice object
  3. kube-proxy (running on EVERY node) watches Services and
     EndpointSlices, and programs the node's iptables/IPVS rules:
     "traffic destined for this virtual IP:port → randomly pick one
     of these real Pod IP:port combinations → rewrite the packet"
  4. This rewriting happens IN THE KERNEL, on whichever node
     originated the request — there's no single choke-point proxy
     process that all traffic flows through

This explains DNS for Services (via CoreDNS, running as cluster pods):
  my-service.my-namespace.svc.cluster.local resolves to the Service's
  stable ClusterIP — CoreDNS watches the API server for Service objects
  and auto-generates these DNS records; nothing manual is configured

And it explains why Service load balancing has NO session affinity by
default and no visibility into HTTP-level details (paths, headers) —
it's operating at the IP/port level (Layer 4), not understanding HTTP
at all. That's precisely the gap Ingress (Layer 7, HTTP-aware) fills.
```

---

## Troubleshooting Guide

```
"Deployment stuck, rollout never completes"
  kubectl rollout status deployment/my-app       — shows exactly where it's stuck
  kubectl describe deployment my-app              — check Conditions section
  Common cause: new pods failing their readinessProbe — they never become
  Ready, so the rollout can never finish scaling down the old ReplicaSet
  kubectl get pods -l app=my-app                  — check pod status directly
  kubectl logs <new-pod>                           — check WHY it's not ready

"Service exists but I can't reach any Pods through it"
  kubectl get endpoints my-service                 — THE critical check:
  if this shows "<none>", the Service's selector doesn't match ANY pod's
  labels (a typo in labels is the most common cause, by far)
  kubectl get pods --show-labels                    — compare against the
  Service's spec.selector exactly

"502/503 errors through Ingress, but Service works via port-forward"
  kubectl describe ingress my-ingress                  — check for backend
  errors in Events
  Common cause: Ingress pointing at wrong Service port, or the Ingress
  Controller itself isn't running/healthy
  kubectl get pods -n ingress-nginx                     — check controller health

"ConfigMap/Secret change doesn't seem to take effect"
  Env vars sourced from ConfigMap/Secret are only re-read on POD RESTART —
  changing a ConfigMap does NOT automatically restart pods using it
  (mounted-as-file ConfigMaps/Secrets DO update in-place after a short
  delay, but env-var-injected ones need a pod restart)
  kubectl rollout restart deployment/my-app             — force a restart
  to pick up the change
```

---

## Tips

- Always define both `livenessProbe` and `readinessProbe` — liveness restarts a hung container, readiness controls whether it receives traffic while starting up or recovering.
- Use `envFrom` + ConfigMap/Secret for entire configuration sets, and `env` + specific key refs when you need only one or two values.
- Kubernetes Secrets are base64-encoded, not encrypted — for real production security, enable etcd encryption at rest or use an external secret manager (see the Vault page).
- `kubectl rollout undo` is your emergency brake — memorise it; a bad deployment can be reverted in seconds.
- Ingress requires an Ingress Controller to be installed separately — the Ingress resource alone does nothing without one running in the cluster.

---

## Summary

- Deployment: manages replica Pods, handles rolling updates and rollbacks — the standard way to run stateless apps.
- Service: stable DNS/IP for a set of Pods; types are ClusterIP (internal), NodePort, LoadBalancer, ExternalName.
- Ingress: HTTP(S) routing by hostname/path to Services — requires an Ingress Controller.
- ConfigMap: non-sensitive config; Secret: sensitive config (base64-encoded, not encrypted by default).
- Job: run-to-completion task; CronJob: scheduled recurring Job.
- DaemonSet: one Pod per node — used for logging agents, monitoring, network plugins.
