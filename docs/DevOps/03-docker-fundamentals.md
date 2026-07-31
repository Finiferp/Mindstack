---
title: "Docker Fundamentals"
sidebar_label: "Docker"
sidebar_position: 3
---

# Docker Fundamentals

Docker packages an application and its dependencies into a portable container — the foundation of modern DevOps deployment.

**Docs:** [docs.docker.com](https://docs.docker.com)

---

## Core Concepts

```
Image:      a read-only template — application code + dependencies + OS layer
Container:  a running instance of an image (isolated process)
Registry:   a store for images (Docker Hub, GitHub Container Registry, ECR, GCR)
Dockerfile: a recipe for building an image
Layer:      each instruction in a Dockerfile creates a cached, reusable layer

Container vs VM:
  VM:        full OS per instance — heavy (GBs), slow to boot (minutes)
  Container: shares host OS kernel — light (MBs), fast to boot (seconds)

  ┌─────────────┐  ┌──────────────┐        ┌──────────────┐  ┌──────────────┐
  │   App A     │  │   App B      │        │   App A      │  │   App B      │
  │  Bins/Libs  │  │  Bins/Libs   │        │  Bins/Libs   │  │  Bins/Libs   │
  ├─────────────┤  ├──────────────┤        ├──────────────┴──┴──────────────┤
  │  Guest OS   │  │  Guest OS    │        │         Container Engine       │
  ├─────────────┴──┴──────────────┤        ├────────────────────────────────┤
  │        Hypervisor             │        │         Host OS Kernel         │
  ├───────────────────────────────┤        ├────────────────────────────────┤
  │          Host OS              │        │          Hardware              │
  ├───────────────────────────────┤        └────────────────────────────────┘
  │          Hardware             │
  └───────────────────────────────┘
        Virtual Machines                        Containers
```

---

## Installation and Basic Commands

```bash
# Install: docker.com/get-started

docker --version
docker info                    # system-wide info

# Run a container
docker run hello-world
docker run -it ubuntu bash     # -i interactive, -t tty (get a shell)
docker run -d nginx            # -d detached (background)
docker run -d -p 8080:80 nginx # -p host:container port mapping
docker run --name myapp -d nginx  # named container
docker run --rm alpine echo hi # --rm auto-remove after exit

# List / manage containers
docker ps                      # running containers
docker ps -a                   # all containers (including stopped)
docker stop <container>        # graceful stop (SIGTERM, then SIGKILL after timeout)
docker start <container>       # start a stopped container
docker restart <container>
docker kill <container>        # immediate stop (SIGKILL)
docker rm <container>          # remove a stopped container
docker rm -f <container>       # force remove (stops first)
docker rename old_name new_name

# Inspect and debug
docker logs <container>
docker logs -f <container>     # follow logs
docker logs --tail 100 <container>
docker exec -it <container> bash   # shell into a running container
docker exec <container> ls /app
docker inspect <container>     # full JSON metadata
docker stats                   # live resource usage (CPU, memory, network)
docker top <container>         # processes inside container

# Images
docker images                  # list local images
docker pull nginx:1.25         # download an image
docker push myrepo/myapp:1.0   # upload an image
docker rmi <image>             # remove an image
docker tag myapp:latest myrepo/myapp:1.0
docker history myapp           # show layer history
docker image prune             # remove unused images
docker system prune -a         # remove all unused containers/images/networks (aggressive)
```

---

## Dockerfile

```dockerfile
# Base image — always pin a specific version, never 'latest' in production
FROM node:20-alpine AS base

# Metadata
LABEL maintainer="team@example.com"
LABEL version="1.0"

# Set working directory
WORKDIR /app

# Copy dependency manifests FIRST (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Then copy the rest of the source (changes more often)
COPY . .

# Build step (if needed)
RUN npm run build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port (documentation only — doesn't actually publish it)
EXPOSE 3000

# Run as non-root user (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Command to run when container starts
CMD ["node", "server.js"]
# vs ENTRYPOINT (harder to override; CMD becomes args to ENTRYPOINT)
# ENTRYPOINT ["node"]
# CMD ["server.js"]
```

```bash
# Build an image
docker build -t myapp:1.0 .
docker build -t myapp:1.0 -f Dockerfile.prod .   # custom Dockerfile name
docker build --build-arg NODE_ENV=production -t myapp .
docker build --no-cache -t myapp .               # ignore layer cache

# .dockerignore — exclude files from build context (like .gitignore)
# node_modules
# .git
# .env
# *.log
```

---

## Multi-Stage Builds

The single most important optimisation technique — dramatically smaller production images.

```dockerfile
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build          # produces /app/dist

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]

# Result: final image doesn't contain build tools, source TypeScript,
# devDependencies, or any build-time artifacts — much smaller, more secure

# Go example — even more dramatic size reduction
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM scratch     # empty base image — no OS at all
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
# Final image: just the compiled binary — often under 20MB
```

---

## Image Layers and Caching

```
Each Dockerfile instruction creates a new layer. Docker caches layers and
reuses them if the instruction and its inputs haven't changed.

Order matters — put things that change LEAST OFTEN first:

  BAD (invalidates cache on every code change):
    COPY . .
    RUN npm install

  GOOD (only re-runs npm install if package.json changes):
    COPY package.json package-lock.json ./
    RUN npm install
    COPY . .

Inspect layers:
  docker history myapp:1.0
  docker image inspect myapp:1.0

Layer size matters:
  RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
  # ^ combine into ONE RUN — separate RUNs each create a layer that persists
  #   even if you delete files in a LATER layer (deleted files still take space
  #   in the earlier layer)
```

---

## Networking

```bash
# Default bridge network — containers can reach each other by IP, not by name
docker network ls
docker network inspect bridge

# Custom network — containers CAN resolve each other by container name (DNS)
docker network create mynetwork
docker run -d --name db --network mynetwork postgres
docker run -d --name api --network mynetwork myapp
# Inside 'api' container: can reach postgres at hostname "db"

# Port mapping
docker run -p 8080:80 nginx         # host:8080 → container:80
docker run -p 127.0.0.1:8080:80 nginx  # bind only to localhost
docker run -P nginx                  # publish all EXPOSEd ports to random host ports

# Network drivers
# bridge  — default; isolated network on a single host
# host    — container shares the host's network namespace (no isolation, faster)
# none    — no networking
# overlay — multi-host networking (Docker Swarm)
```

---

## Volumes and Persistence

```bash
# Containers are ephemeral — data is lost when the container is removed
# Volumes persist data outside the container's writable layer

# Named volume (managed by Docker — preferred for production data)
docker volume create mydata
docker run -d -v mydata:/var/lib/postgresql/data postgres
docker volume ls
docker volume inspect mydata
docker volume rm mydata

# Bind mount (map a host directory — useful for development)
docker run -d -v $(pwd)/src:/app/src myapp
docker run -d -v /host/path:/container/path:ro myapp   # read-only

# tmpfs mount (in-memory, never persisted — for secrets/temp data)
docker run -d --tmpfs /app/tmp myapp

# Backup a volume
docker run --rm -v mydata:/data -v $(pwd):/backup alpine \
    tar czf /backup/backup.tar.gz -C /data .

# Restore a volume
docker run --rm -v mydata:/data -v $(pwd):/backup alpine \
    tar xzf /backup/backup.tar.gz -C /data
```

---

## Registries

```bash
# Docker Hub (default)
docker login
docker pull nginx:1.25
docker push myusername/myapp:1.0

# Private registries — GitHub Container Registry
docker login ghcr.io -u USERNAME -p TOKEN
docker tag myapp:1.0 ghcr.io/myorg/myapp:1.0
docker push ghcr.io/myorg/myapp:1.0

# AWS ECR
aws ecr get-login-password | docker login --username AWS --password-stdin \
    123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag myapp:1.0 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0

# Tagging conventions
docker tag myapp:latest myapp:1.2.3          # semver
docker tag myapp:latest myapp:$(git rev-parse --short HEAD)  # commit SHA
docker tag myapp:latest myapp:$(date +%Y%m%d)  # date-based
```

---

## Image Security

```bash
# Scan for known vulnerabilities
docker scout cves myapp:1.0          # Docker's built-in scanner
trivy image myapp:1.0                # Aqua Security's Trivy (very popular)
grype myapp:1.0                      # Anchore's Grype

# Best practices
# 1. Use minimal base images (alpine, distroless, scratch)
FROM gcr.io/distroless/nodejs20      # Google's distroless — no shell, no package manager

# 2. Never run as root
USER 1000:1000

# 3. Don't bake secrets into images (they persist in layer history!)
# BAD:
RUN echo "API_KEY=secret123" > .env
# GOOD: pass at runtime
docker run -e API_KEY=$API_KEY myapp

# 4. Pin exact versions
FROM node:20.11.0-alpine3.19   # not node:latest or node:20

# 5. Multi-stage builds to exclude build tools from final image

# 6. Regularly rebuild to pick up base image security patches
```

---

## How Docker Actually Works Internally

Understanding the internals makes every command make sense instead of feeling like magic.

```
Docker is built on three Linux kernel primitives (not invented by Docker itself):

1. Namespaces — ISOLATION
   Give a process its own isolated view of a global resource
   PID namespace:     process sees itself as PID 1, can't see host processes
   NET namespace:      own network stack, interfaces, routing table
   MNT namespace:       own filesystem mount points
   UTS namespace:        own hostname
   IPC namespace:         own inter-process communication resources
   USER namespace:         own user/group ID mapping (root in container ≠ root on host, if configured)

   This is WHY a container "feels" like its own machine — it's not virtualization,
   it's the same kernel showing each process group a different, isolated view of itself.

2. Control Groups (cgroups) — RESOURCE LIMITS
   Limit and account for CPU, memory, disk I/O, network usage per process group
   This is what --memory and --cpus flags configure under the hood
   docker run --memory=512m --cpus=1.5 myapp
   → cgroup enforces: OOM-kill if memory exceeded, CPU throttled if over limit

3. Union/OverlayFS — LAYERED FILESYSTEM
   Each image layer is a read-only diff; a container adds one thin read-write layer on top
   This is why layers are cacheable/shareable and why containers start instantly
   (no copying the whole filesystem — just stacking diffs)

   Image layers (read-only, shared across containers using this image):
     Layer 4: COPY . .
     Layer 3: RUN npm install
     Layer 2: COPY package.json ./
     Layer 1: FROM node:20-alpine
   Container (thin writable layer on top, unique per container):
     Layer 5: writable — anything the running container changes

   When a container writes to a file that exists in a lower read-only layer,
   OverlayFS copies it up into the writable layer first (copy-on-write) —
   this is why writing large files inside a container is slower than on
   a bind-mounted volume, and why container writable layers should be
   treated as disposable, not a place to store real data.

The Docker daemon (dockerd) sits on top of these primitives and exposes them
through a simple API. When you run `docker run`, the CLI talks to the daemon
over a REST API (usually via a Unix socket), which then:
  1. Pulls the image if not present locally (unpacks its layers)
  2. Creates namespaces + cgroups for the new process
  3. Sets up networking (attaches to the specified network, assigns an IP)
  4. Mounts the OverlayFS combining image layers + new writable layer
  5. Executes the container's entrypoint/cmd as a process within those namespaces

containerd and runc:
  Modern Docker delegates actual container execution to containerd (a
  separate daemon, also a standalone CNCF project used by Kubernetes)
  containerd in turn uses runc to do the actual namespace/cgroup setup
  per the OCI (Open Container Initiative) runtime spec
  This layered architecture is why "OCI-compliant" images/runtimes are
  interchangeable between Docker, Kubernetes (containerd/CRI-O), and others
```

---

## Storage Drivers and Disk Usage

```
overlay2 (default, recommended on all modern Linux) uses the OverlayFS
kernel driver directly — fast, efficient, well-supported.

Check your current driver:
  docker info | grep "Storage Driver"

Inspect actual disk usage:
  docker system df                    # summary: images, containers, volumes, cache
  docker system df -v                 # detailed breakdown per image/container

Where Docker actually stores data on Linux:
  /var/lib/docker/overlay2/     — image and container layers
  /var/lib/docker/volumes/      — named volumes
  /var/lib/docker/containers/   — container logs and config
```

---

## Container Lifecycle States

```
                docker create
                     │
                     ▼
                 [CREATED]  ← container exists, filesystem set up, not running
                     │
                docker start
                     │
                     ▼
                 [RUNNING]  ← process executing
                 │       │
          docker pause    docker stop/kill
                 │       │
                 ▼       ▼
             [PAUSED]  [STOPPED/EXITED]  ← process terminated, filesystem intact
                 │       │       │
          docker unpause  docker start   docker rm
                 │       │       │
                 └───▶[RUNNING]  ▼
                              [REMOVED]  ← container and its writable layer gone

docker run = docker create + docker start in one step (the common case)

Signals on stop:
  docker stop  → sends SIGTERM, waits (default 10s), then SIGKILL if still running
  docker kill  → sends SIGKILL immediately (or a custom signal: docker kill -s SIGUSR1)

Exit codes matter for debugging:
  0    — success
  1    — general application error
  125  — docker daemon error (e.g. invalid flag)
  126  — command found but not executable
  127  — command not found
  137  — SIGKILL (128+9) — often means OOM-killed by cgroup memory limit
  143  — SIGTERM (128+15) — graceful stop signal received

docker inspect <container> --format='{{.State.ExitCode}}'
docker inspect <container> --format='{{.State.OOMKilled}}'   # true if killed by OOM
```

---

## Troubleshooting Guide

```
"Container exits immediately after starting"
  docker logs <container>              — check for a crash/error message first
  docker run -it myapp sh               — override CMD, get an interactive shell,
                                          manually run the intended command to see the error
  Common cause: the main process is a script that finishes and exits
                (container lifecycle = the main process's lifecycle —
                 when PID 1 exits, the container stops, regardless of
                 background processes you may have started)

"Container using way more memory than expected"
  docker stats <container>              — live view
  Common cause: no --memory limit set → app can consume unbounded host memory;
  or the app itself has a memory leak, made visible because cgroups account
  for it precisely (Node.js/JVM apps often need explicit heap size flags
  tuned BELOW the container memory limit, or they'll get OOM-killed by the
  cgroup before their own internal GC has a chance to run)

"Can't connect to a service in another container"
  docker network inspect <network>       — confirm both containers are on it
  Common cause: containers on DIFFERENT networks (e.g. default bridge doesn't
  do container-name DNS resolution — only user-defined networks do)
  Fix: create and use a custom network, not the default bridge

"Permission denied writing to a bind-mounted volume"
  Common cause: container runs as a UID that doesn't match the host directory's
  ownership — bind mounts preserve host permissions exactly, unlike named
  volumes which Docker manages
  Fix: match UIDs (--user flag), or chmod/chown the host directory,
  or switch to a named volume if exact host-path access isn't required

"Build is slow / cache never hits"
  docker history <image>                  — see which layers are large/uncached
  Common cause: COPY . . placed before dependency installation (see Dockerfile
  layer ordering section above) — any file change invalidates everything after it

"Disk filling up on the Docker host"
  docker system df                         — see what's consuming space
  docker system prune -a --volumes          — aggressive cleanup (careful — removes
                                              ALL unused images/containers/volumes)
  Common cause: old images/containers/build cache accumulating over time,
  especially in CI runners that build many images per day without cleanup

"docker: permission denied while trying to connect to the Docker daemon socket"
  Common cause (Linux): current user isn't in the 'docker' group
  Fix: sudo usermod -aG docker $USER, then log out/in
  (Note: membership in the docker group is equivalent to root — a known
  security consideration for shared/multi-user hosts)
```

---

## Advanced Runtime Options

```bash
# Resource constraints (cgroups under the hood)
docker run --memory=512m --memory-swap=512m myapp   # hard memory cap, no swap
docker run --cpus=1.5 myapp                           # limit to 1.5 CPU cores

# Restart policies
docker run --restart=no myapp                # default — never auto-restart
docker run --restart=always myapp              # always restart, even after daemon restart
docker run --restart=on-failure:3 myapp          # restart up to 3 times, only on non-zero exit
docker run --restart=unless-stopped myapp          # like always, but respects manual docker stop

# Capabilities — fine-grained privilege control (more precise than --privileged)
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
# drops all Linux capabilities, adds back only what's needed (binding to low ports)
# Avoid --privileged in production — it disables ALL isolation, essentially
# giving the container full access to the host

# Read-only root filesystem — defense in depth
docker run --read-only --tmpfs /tmp myapp
# container can't write anywhere except explicitly mounted tmpfs/volumes

# PID limits — prevent fork bombs
docker run --pids-limit=100 myapp
```

---

## Docker Best Practices Checklist

```
✓ Multi-stage builds for compiled languages
✓ Pin exact base image versions
✓ .dockerignore to exclude unnecessary files from build context
✓ Order Dockerfile instructions from least-to-most frequently changed
✓ Combine RUN commands to minimize layers (apt-get update && install && cleanup)
✓ Run as non-root user
✓ Use HEALTHCHECK for orchestrators to detect unhealthy containers
✓ Never bake secrets into the image
✓ Scan images for vulnerabilities in CI
✓ Use minimal base images (alpine, distroless) where possible
✓ Set resource limits when running (--memory, --cpus)
```

---

## Tips

- Always use multi-stage builds for compiled/transpiled applications — it's the single biggest lever for image size and security.
- `docker system prune -a --volumes` reclaims significant disk space during local development — but double-check nothing important is unnamed and unreferenced first.
- Named volumes for databases, bind mounts for source code during development — different tools for different jobs.
- Run `trivy image` or `docker scout` in CI on every image build — catching a critical CVE before deployment is far cheaper than after.
- `docker logs -f` and `docker exec -it <container> sh` are your two most-used debugging commands — know them by muscle memory.

---

## Summary

- Containers share the host kernel (lightweight) vs VMs which virtualize hardware (heavy).
- `docker build` reads a `Dockerfile`; each instruction creates a cached layer — order matters for cache efficiency.
- Multi-stage builds separate build-time dependencies from the runtime image — dramatically smaller, more secure final images.
- Volumes (`docker volume`) persist data beyond container lifecycle; bind mounts map host directories directly.
- Custom networks (`docker network create`) enable container-to-container DNS resolution by name.
- Never run as root, never bake secrets into images, always scan for vulnerabilities before deploying.
