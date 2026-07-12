---
title: "Container and Kubernetes Networking"
sidebar_label: "Container Networking"
sidebar_position: 69
---

# Container and Kubernetes Networking

Containers introduced a new layer of networking abstraction. Understanding container networking models — especially Kubernetes' flat-network requirement and how CNI plugins implement it — is essential for anyone operating modern infrastructure.

---

## Container Networking Fundamentals

### Docker Networking

```
Linux network namespaces — the foundation:
  Each container gets its own network namespace
  Namespace: isolated view of network stack (interfaces, routes, iptables, sockets)
  Containers in different namespaces can't see each other's traffic by default

Docker networking drivers:
  bridge (default): containers connect to a virtual bridge (docker0)
  host: container shares host network namespace (no isolation; highest performance)
  overlay: multi-host networking (Docker Swarm / Kubernetes)
  macvlan: container gets own MAC address on physical network
  none: no networking (isolated process)
  ipvlan: like macvlan but shares MAC address with host

Default bridge network:
  docker0 bridge: 172.17.0.0/16
  Each container: veth pair (one end in container, other end on docker0)
  NAT (iptables MASQUERADE): containers reach internet via host's IP
  Port mapping: -p 8080:80 → iptables DNAT rule on host

  Host                   Container A (172.17.0.2)
    docker0 bridge ────── veth pair ─── eth0
    172.17.0.1            172.17.0.2
         │
         └─── MASQUERADE → internet

# Inspect networking
docker network ls
docker network inspect bridge
docker inspect [container] | grep -A 20 NetworkSettings
ip link show                    # see docker0 and veth pairs on host
ip netns exec [ns] ip addr      # inspect container's network namespace

# Custom bridge network (containers resolve each other by name)
docker network create --driver bridge --subnet 10.1.0.0/24 mynet
docker run --network mynet --name web nginx
docker run --network mynet curl http://web    # DNS resolution by container name
```

---

## Kubernetes Networking Model

Kubernetes imposes four requirements on networking:
1. All pods can communicate with all other pods without NAT
2. All nodes can communicate with all pods without NAT
3. The IP a pod sees for itself is the same IP others use to reach it
4. Pod-to-service communication (via Service resources)

```
Pod: smallest deployable unit; 1+ containers sharing a network namespace
  All containers in a pod share: IP address, port space, loopback interface
  Containers in same pod communicate via localhost

Pod network (flat, cluster-wide):
  Every pod gets a unique routable IP in a cluster-wide CIDR (e.g., 10.244.0.0/16)
  Pod on Node A can reach pod on Node B directly (no NAT)
  CNI plugins implement this requirement differently

Node networking:
  Each node gets a subnet slice of the pod CIDR
    Node 1: 10.244.1.0/24 (pods get IPs from this range)
    Node 2: 10.244.2.0/24
  Routes between nodes ensure cross-node pod traffic is routed correctly

kube-proxy: runs on every node
  Implements Service abstraction (ClusterIP → Pod IP)
  Mode: iptables (default), IPVS (scalable), eBPF (modern)
  Watches Service/Endpoint objects; programs iptables/IPVS rules
```

---

## CNI — Container Network Interface

CNI (Cloud Native Computing Foundation) is the plugin standard for Kubernetes networking.

```
CNI plugin responsibilities:
  1. Assign an IP to a new pod
  2. Connect pod to the network (veth pair, etc.)
  3. Program routes/tables so other pods can reach it
  4. Configure NetworkPolicies (for plugins that support it)

How it works:
  kubelet creates pod → calls CNI plugin binary via exec
  CNI adds network interface to pod's namespace, assigns IP
  kubelet hands pod to scheduler; pod becomes Ready once networking is set

Popular CNI plugins:

Flannel:
  Simple, overlay-based (VXLAN mode by default)
  Each node gets a /24 from pod CIDR; VXLAN encapsulates cross-node traffic
  No NetworkPolicy support (needs Calico on top for policies)
  Very easy to set up; good for small clusters

Calico:
  BGP-based (no overlay needed in L3-routable environments)
  Each node runs a BGP speaker; advertises pod CIDR to other nodes
  Cross-node traffic: routed natively (no encapsulation overhead)
  VXLAN/IPIP overlay available for environments without BGP (cloud)
  Full NetworkPolicy support + extended Calico NetworkPolicy
  eBPF dataplane option for high performance

Cilium:
  eBPF-based (replaces iptables entirely)
  L3-L7 policy enforcement (understand HTTP methods, DNS, gRPC)
  Hubble: built-in network observability (per-flow visibility)
  Replaces kube-proxy (full eBPF dataplane)
  Best performance; most features; higher complexity
  Used by: Google Anthos, Azure AKS CNI, many enterprise clusters

Weave Net:
  Mesh overlay; automatic peer discovery
  Encryption option (sleeve mode with crypto)
  Easy set up; less popular than Calico/Cilium now

AWS VPC CNI (for EKS):
  Pods get IPs from the node's VPC subnet directly (not an overlay)
  Each node has multiple ENIs (Elastic Network Interfaces)
  Pods are directly routable within the VPC (no NAT to talk to RDS, etc.)
  Limitation: node instance type limits number of ENIs/pods

Azure CNI (for AKS):
  Similar to AWS CNI — pods get VNet IPs directly
  Overlay mode: pods get private CIDR (more scalable, less IP exhaustion)

GKE (Google Kubernetes Engine):
  VPC-native: pods get IPs from a secondary subnet range in GCP VPC
  Dataplane V2: Cilium-based eBPF dataplane
```

---

## Kubernetes Services

Services provide a stable endpoint for pod groups — pods are ephemeral (IP changes on restart), Services are stable.

```
Service types:

ClusterIP (default):
  Virtual IP accessible only within the cluster
  kube-proxy programs iptables: clusterIP:port → random pod IP:port
  Used for: internal microservice communication

NodePort:
  Exposes service on every node's IP at a static port (30000-32767)
  External client → NodeIP:NodePort → clusterIP → pod
  Used for: development, on-prem with external LB

LoadBalancer:
  Cloud provider provisions a load balancer with external IP
  AWS: NLB or CLB; Azure: Azure LB; GCP: Google Cloud LB
  External IP → LB → NodePort → ClusterIP → pod
  Used for: production public-facing services

ExternalName:
  Maps service to an external DNS name (no proxying)
  DNS CNAME alias for external services (e.g., database.example.com)

Headless service (clusterIP: None):
  No virtual IP; DNS returns pod IPs directly
  Used by: StatefulSets (direct pod addressing)
  Client gets all pod IPs → can implement its own load balancing

Service DNS:
  my-service.my-namespace.svc.cluster.local
  Shortened: my-service (within same namespace)
  my-service.other-namespace (cross-namespace)

Endpoints / EndpointSlices:
  Service tracks healthy pod IPs via Endpoints object
  kube-proxy watches Endpoint changes and updates iptables rules
  EndpointSlice: shards the endpoint list for large services (>100 pods)
```

---

## Ingress and Ingress Controllers

Ingress routes external HTTP/HTTPS traffic to internal services.

```
Ingress resource: Kubernetes object defining routing rules
Ingress Controller: the actual proxy that implements those rules

# Example Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
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
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80

Popular Ingress Controllers:
  nginx-ingress (ingress-nginx): most common; feature-rich; production-proven
  Traefik: automatic config from K8s annotations; Let's Encrypt integration
  Contour (Envoy): high-performance; HTTP/2; gRPC
  HAProxy Ingress: high performance; advanced load balancing
  AWS ALB Controller: native ALB provisioning from Ingress
  Istio Gateway: service mesh integration

Gateway API (newer, replaces Ingress):
  HTTPRoute, TCPRoute, GRPCRoute: richer, role-oriented routing config
  Supported by: Istio, Contour, Cilium, NGINX
```

---

## NetworkPolicy

Kubernetes NetworkPolicy provides L3/L4 filtering between pods.

```yaml
# Default deny all ingress (baseline — apply first)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}   # selects ALL pods in namespace
  policyTypes:
    - Ingress

# Allow specific access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api               # applies to api pods
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web       # allow traffic from web pods
      ports:
        - protocol: TCP
          port: 8080

# Allow database access only from api pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP
          port: 5432

# Cross-namespace policy (allow monitoring namespace to scrape metrics)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - port: 9090    # Prometheus scrape port
```

NetworkPolicy requirements:
- CNI plugin must support NetworkPolicy (Calico, Cilium, Weave, Antrea — yes; Flannel alone — no)
- Without a policy, all pod-to-pod communication is allowed
- Policies are additive — the union of all matching policies applies

---

## Service Mesh — Istio / Linkerd

Service mesh adds traffic management, mTLS, and observability to pod-to-pod communication.

```
Service mesh architecture:
  Sidecar proxy: injected into every pod alongside the application container
  Data plane: sidecars (Envoy for Istio; Linkerd2-proxy for Linkerd)
  Control plane: manages sidecar config; issues mTLS certs; collects telemetry

What service mesh provides:
  mTLS everywhere: automatic mutual TLS between pods (no app code changes)
  Traffic management: canary deployments, A/B testing, traffic shifting
  Observability: per-request tracing (Jaeger), metrics (golden signals per service)
  Circuit breaking: automatic retry, timeout, circuit breaker (without app changes)
  Fault injection: testing resilience (inject delays/errors in specific paths)

Istio virtual service (traffic routing):
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-split
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90    # 90% of traffic to v1
        - destination:
            host: reviews
            subset: v2
          weight: 10    # 10% to v2 (canary)

Alternatives to Istio:
  Linkerd: simpler; lower overhead; Rust-based proxy; less features
  Consul Connect: HashiCorp; integrates with Vault for secrets
  Cilium Service Mesh: eBPF-based; no sidecars needed (node-level)
  AWS App Mesh: managed; Envoy-based; AWS-native
```

---

## Tips

- Calico in BGP mode (no overlay) is the most performant CNI for on-prem — pods get routable IPs, traffic is native IP, no encapsulation overhead.
- Cilium with Hubble gives you per-flow L7 visibility across the cluster without a service mesh — see exactly which service called which, with what HTTP method.
- Always start with a default-deny NetworkPolicy in production namespaces — then explicitly allow only what's needed (principle of least privilege at the network layer).
- AWS VPC CNI pods get VPC IPs directly — great for connectivity to RDS/ElastiCache, but IP-hungry; plan your VPC subnet sizes carefully (each node reserves a block of IPs).
- Service mesh (Istio/Linkerd) adds operational complexity — only adopt it when you need traffic splitting, mTLS enforcement, or per-request observability that CNI-level tools can't provide.

---

## Summary

- Containers use Linux network namespaces; Docker bridges containers via virtual switches with NAT for internet access.
- Kubernetes requires a flat pod network — all pods reachable from all other pods without NAT; CNI plugins implement this.
- Popular CNIs: Flannel (simple overlay), Calico (BGP routing, full policy), Cilium (eBPF, L7 policy, no-kube-proxy).
- Services provide stable virtual IPs (ClusterIP), node ports (NodePort), or cloud LBs (LoadBalancer) for pod groups.
- Ingress routes external HTTP to Services based on host/path; Gateway API is the modern successor.
- NetworkPolicy provides L3/L4 segmentation between pods — always start with default-deny and explicitly allow needed flows.
- Service mesh (Istio/Linkerd) adds mTLS, traffic shaping, and observability at the pod-to-pod level without code changes.
