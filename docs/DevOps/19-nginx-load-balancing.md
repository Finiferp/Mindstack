---
title: "Nginx and Load Balancing"
sidebar_label: "Nginx & Load Balancing"
sidebar_position: 19
---

# Nginx and Load Balancing

Nginx is the most widely deployed reverse proxy and load balancer — sitting in front of applications to handle TLS termination, routing, caching, and traffic distribution.

**Docs:** [nginx.org/en/docs](https://nginx.org/en/docs/)

---

## Reverse Proxy Basics

```nginx
# /etc/nginx/nginx.conf or /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name myapp.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```
Why put a reverse proxy in front of your app:
  TLS termination — handle HTTPS once, at the proxy, not in every app instance
  Load balancing — distribute traffic across multiple app instances
  Caching — serve repeated requests without hitting the app
  Compression — gzip/brotli responses before sending to clients
  Rate limiting / DDoS mitigation
  Single entry point for multiple backend services (path-based routing)
  Static file serving — much faster than serving static files from your app
```

---

## Load Balancing

```nginx
# Define a group of backend servers
upstream backend {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}

server {
    listen 80;
    server_name myapp.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```nginx
# Load balancing algorithms
upstream backend {
    # Round robin (default) — requests distributed evenly in sequence
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

upstream backend_weighted {
    # Weighted — server with weight=3 gets 3x the traffic of weight=1
    server 10.0.1.10:3000 weight=3;
    server 10.0.1.11:3000 weight=1;
}

upstream backend_least_conn {
    # Least connections — route to the server with fewest active connections
    least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

upstream backend_ip_hash {
    # IP hash — same client always routes to the same server (sticky sessions)
    ip_hash;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

upstream backend_health {
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 backup;        # only used if all others are down
}
```

```
Algorithm comparison:

Round Robin:        simplest, even distribution, no session affinity
Weighted:             give more powerful servers a larger share of traffic
Least Connections:    better for long-lived/variable-duration requests
IP Hash:               sticky sessions without a session store (simple, but
                       uneven if client IPs aren't evenly distributed, and
                       breaks if a server goes down — clients hashed to it
                       get moved, losing their "stickiness")

For stateless apps (the DevOps-recommended pattern): Round Robin or Least
Connections. Avoid session affinity by storing session state externally
(Redis) instead of relying on IP Hash.
```

---

## SSL/TLS Termination

```nginx
server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate /etc/nginx/certs/myapp.com.crt;
    ssl_certificate_key /etc/nginx/certs/myapp.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS — force browsers to always use HTTPS for this domain
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://backend;
    }
}

# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name myapp.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Let's Encrypt (free, automated certificates) via Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d myapp.com -d www.myapp.com
# Auto-renewal is set up automatically via a systemd timer / cron job
sudo certbot renew --dry-run       # test renewal works
```

---

## Path-Based and Host-Based Routing

```nginx
# Path-based routing — different services under one domain
server {
    listen 80;
    server_name myapp.com;

    location /api/ {
        proxy_pass http://api_backend/;
    }

    location /admin/ {
        proxy_pass http://admin_backend/;
    }

    location / {
        proxy_pass http://frontend_backend;
    }
}

# Host-based routing — different domains to different backends
server {
    listen 80;
    server_name api.myapp.com;
    location / { proxy_pass http://api_backend; }
}

server {
    listen 80;
    server_name admin.myapp.com;
    location / { proxy_pass http://admin_backend; }
}
```

---

## Caching

```nginx
# Define a cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

server {
    location / {
        proxy_pass http://backend;
        proxy_cache my_cache;
        proxy_cache_valid 200 10m;               # cache successful responses for 10 min
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating;  # serve stale on backend error
        add_header X-Cache-Status $upstream_cache_status;  # HIT/MISS/BYPASS for debugging
    }

    # Static assets — long cache, served directly by nginx (no proxy needed)
    location /static/ {
        root /var/www/myapp;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Rate Limiting

```nginx
# Define a rate limit zone — 10 requests/sec per IP address
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;   # allow bursts up to 20
        proxy_pass http://backend;
    }
}

# Connection limiting — max concurrent connections per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    location / {
        limit_conn conn_limit 10;
        proxy_pass http://backend;
    }
}
```

---

## Health Checks and Failover

```nginx
upstream backend {
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout http_502 http_503;  # retry on another server
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}

# Nginx open source has passive health checks only (based on failed requests)
# Nginx Plus (commercial) adds active health checks (periodic probing)
# For active health checks with open-source nginx, use an external tool
# (e.g. Consul, or a Kubernetes readiness probe if running in K8s)
```

---

## Layer 4 vs Layer 7 Load Balancing

```
Layer 4 (Transport layer — TCP/UDP):
  Routes based on IP address and port only
  Doesn't inspect HTTP content (headers, paths, cookies)
  Faster, lower overhead
  Examples: AWS Network Load Balancer (NLB), nginx 'stream' module

Layer 7 (Application layer — HTTP/HTTPS):
  Routes based on URL path, headers, cookies, hostname
  Can do content-based routing, SSL termination, request modification
  More overhead but far more flexible
  Examples: AWS Application Load Balancer (ALB), nginx 'http' module (the
            examples throughout this page), most API gateways

Choose L4 for: raw TCP/UDP services, maximum throughput, minimal latency
Choose L7 for: HTTP APIs, path/host-based routing, SSL termination, WAF integration
```

```nginx
# nginx L4 (stream) example — TCP load balancing
stream {
    upstream postgres_backend {
        server 10.0.1.20:5432;
        server 10.0.1.21:5432;
    }
    server {
        listen 5432;
        proxy_pass postgres_backend;
    }
}
```

---

## Cloud Load Balancers vs Self-Managed Nginx

```
Managed cloud load balancers (AWS ALB/NLB, GCP Load Balancer, Azure LB):
  No servers to patch/manage
  Auto-scaling built in
  Integrated health checks, TLS certificate management (ACM), WAF
  Higher cost, less low-level configuration control

Self-managed Nginx:
  Full control over every configuration detail
  Cheaper at scale (running on your own compute)
  You manage patching, scaling the load balancer itself, and HA setup

Common production pattern:
  Cloud Load Balancer (ALB) → Nginx (or directly to app) → App instances
  Cloud LB handles TLS, DDoS protection, and cross-AZ distribution;
  Nginx (if present) handles finer application-level routing/caching
```

---

## How Nginx Actually Handles Requests

```
Nginx's architecture is WHY it handles massive concurrency with
relatively little memory/CPU, compared to older thread-per-connection
web servers:

  1. One MASTER process starts on boot — reads nginx.conf, opens the
     configured listening sockets (80, 443, etc.), then spawns a
     configurable number of WORKER processes (`worker_processes auto;`
     typically one per CPU core)
  2. Each WORKER is a single-threaded EVENT LOOP — it can handle
     THOUSANDS of concurrent connections without spawning a thread
     per connection, by using the OS's async I/O primitives (epoll
     on Linux) to efficiently wait on many sockets at once and only
     do work when a socket actually has data ready
  3. When a request arrives, whichever worker's event loop picks it
     up handles the ENTIRE request lifecycle: parsing the HTTP
     request, matching it against `server`/`location` blocks,
     proxying to `proxy_pass` upstream (opening a NEW connection to
     the backend, itself also async/non-blocking), and streaming
     the response back
  4. The master process's ONLY ongoing job after startup is
     supervising workers (restarting crashed ones) and handling
     config reloads (`nginx -s reload` spawns NEW workers with the
     new config, gracefully drains and terminates OLD workers once
     their in-flight requests complete — this is why config reloads
     don't drop active connections)

This event-loop model is WHY a single nginx worker can efficiently
proxy far more concurrent connections than a naive thread-per-request
model, and why nginx has historically been chosen specifically for
the reverse-proxy/load-balancer role — that role is fundamentally
"manage huge numbers of mostly-idle-waiting-for-I/O connections,"
exactly what an event loop is built for.
```

---

## Troubleshooting Guide

```
"502 Bad Gateway"
  Nginx successfully received the request but the UPSTREAM (your
  backend app) either refused the connection, closed it unexpectedly,
  or returned an invalid response
  Check: is the backend actually running and listening on the
  configured proxy_pass address/port?
  tail -f /var/log/nginx/error.log     — nginx logs the specific
  upstream connection failure reason here

"504 Gateway Timeout"
  Nginx connected to the upstream fine, but it didn't respond within
  proxy_read_timeout (default 60s) — the backend is too slow, hung,
  or deadlocked
  Distinguish from 502: 504 means nginx DID reach the backend; 502
  means it couldn't establish/maintain that connection at all

"Config test passes but reload doesn't seem to apply changes"
  nginx -t                    — ALWAYS run before reload, catches
  syntax errors that would otherwise be silently ignored on reload
  Check you're editing the file nginx is ACTUALLY including — a
  common mistake with multiple sites-available/sites-enabled or
  conf.d fragments is editing a file that isn't actually referenced
  by an `include` directive in the main nginx.conf

"SSL certificate errors after renewal"
  nginx caches the certificate in each worker process's memory at
  startup/reload — replacing the cert FILE on disk alone does
  nothing until nginx is told to reload
  systemctl reload nginx        — or ensure your renewal automation
  (certbot) includes this reload as its deploy hook

"Rate limiting rejecting legitimate traffic"
  limit_req_zone keys by $binary_remote_addr by default — if many
  real users share one IP (corporate NAT, mobile carrier NAT), they
  collectively hit the SAME rate limit bucket
  Consider a higher limit for known-shared-IP scenarios, or key by
  a more specific identifier (API key, session token) where available
```

---

## Tips

- Always set `proxy_set_header X-Forwarded-For` and `X-Real-IP` — without them, your application sees the load balancer's IP for every request, breaking IP-based logging, rate limiting, and geolocation.
- Avoid IP-hash sticky sessions for new applications — externalize session state (Redis) instead, so any request can go to any backend instance.
- `proxy_next_upstream` with sensible error conditions gives you automatic failover between backend instances without needing an external orchestrator.
- Use Let's Encrypt + Certbot for free, auto-renewing TLS certificates — there's rarely a reason to pay for a certificate for a standard web app anymore.
- In Kubernetes, an Ingress Controller (often nginx-based) replaces manually configuring nginx.conf — but the underlying concepts (upstream, routing, TLS termination) are identical.

---

## Summary

- Nginx as a reverse proxy: terminates TLS, load balances, caches, and routes traffic to backend application instances.
- Load balancing algorithms: Round Robin (default), Weighted, Least Connections, IP Hash (sticky sessions) — prefer stateless approaches with externalized session state.
- `proxy_pass` + `upstream {}` blocks define backend groups; `proxy_set_header` forwards real client info.
- Rate limiting (`limit_req_zone`) and caching (`proxy_cache`) protect and speed up backends directly at the proxy layer.
- Layer 4 (TCP/UDP, faster, less flexible) vs Layer 7 (HTTP-aware, content-based routing) — choose based on need.
- Managed cloud load balancers handle scaling/patching for you; self-managed Nginx offers full configuration control at lower cost.
