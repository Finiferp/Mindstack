---
title: "Docker Compose"
sidebar_label: "Docker Compose"
sidebar_position: 4
---

# Docker Compose

Docker Compose defines and runs multi-container applications from a single YAML file — the standard tool for local development environments.

**Docs:** [docs.docker.com/compose](https://docs.docker.com/compose/)

---

## Basic Structure

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
      - redis
    volumes:
      - ./src:/app/src              # bind mount for live reload
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

```bash
docker compose up                 # start all services (foreground)
docker compose up -d              # detached (background)
docker compose up --build         # rebuild images before starting
docker compose down               # stop and remove containers, networks
docker compose down -v            # also remove volumes (destroys data!)
docker compose ps                 # list running services
docker compose logs               # all logs
docker compose logs -f web        # follow logs for one service
docker compose exec web bash      # shell into a running service
docker compose restart web        # restart one service
docker compose build web          # rebuild one service's image
docker compose stop / start       # stop/start without removing
```

---

## Service Configuration Reference

```yaml
services:
  api:
    # Image source — either 'image' or 'build', not both
    image: myapp:1.0                    # use existing image
    build:                               # or build from Dockerfile
      context: .
      dockerfile: Dockerfile.dev
      args:
        NODE_ENV: development
      target: development                # multi-stage build target

    container_name: my-api               # fixed name (otherwise auto-generated)
    hostname: api                        # hostname inside the network

    ports:
      - "3000:3000"                     # host:container
      - "127.0.0.1:9229:9229"          # bind to localhost only

    environment:                          # env vars (or use env_file)
      NODE_ENV: development
      DEBUG: "true"
    env_file:
      - .env
      - .env.local

    volumes:
      - ./src:/app/src                  # bind mount
      - node_modules:/app/node_modules  # named volume
      - ./config.yml:/app/config.yml:ro # read-only bind mount

    depends_on:
      db:
        condition: service_healthy       # wait for healthcheck to pass
      redis:
        condition: service_started

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

    restart: unless-stopped              # no | always | on-failure | unless-stopped

    command: npm run dev                 # override the image's default CMD
    entrypoint: /custom-entrypoint.sh

    working_dir: /app
    user: "1000:1000"

    networks:
      - frontend
      - backend

    deploy:                              # resource limits (Swarm; partial support elsewhere)
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          memory: 256M

    labels:
      - "com.example.description=API service"
```

---

## Networks

```yaml
services:
  frontend:
    networks: [frontend-net]
  api:
    networks: [frontend-net, backend-net]  # bridges both networks
  db:
    networks: [backend-net]

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true          # no external internet access — DB isolated from outside

# Services on the same network can reach each other by service name (DNS)
# 'api' can reach 'db' at hostname "db:5432"
# 'frontend' CANNOT reach 'db' directly (different network)
```

---

## Volumes

```yaml
services:
  db:
    volumes:
      - postgres-data:/var/lib/postgresql/data    # named volume
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro  # bind mount, read-only
      - db-logs:/var/log/postgresql

volumes:
  postgres-data:
    driver: local
  db-logs:
    driver: local
  external-data:
    external: true          # reference a volume created outside this compose file
```

---

## Environment Variables and .env

```bash
# .env (auto-loaded by docker compose, same directory as docker-compose.yml)
POSTGRES_USER=admin
POSTGRES_PASSWORD=supersecret
API_PORT=3000
```

```yaml
services:
  api:
    ports:
      - "${API_PORT}:3000"          # variable substitution from .env
    environment:
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DEBUG: ${DEBUG:-false}         # default if not set in .env
```

```bash
# Override .env file
docker compose --env-file .env.production up

# Pass variables directly
API_PORT=8080 docker compose up
```

---

## Multiple Compose Files (Environment Overlays)

```yaml
# docker-compose.yml — base configuration
services:
  api:
    build: .
    environment:
      NODE_ENV: production

# docker-compose.override.yml — auto-merged in dev (loaded automatically)
services:
  api:
    build:
      target: development
    volumes:
      - ./src:/app/src
    environment:
      NODE_ENV: development
      DEBUG: "true"
    ports:
      - "9229:9229"       # expose debugger port

# docker-compose.prod.yml — explicit production overrides
services:
  api:
    restart: always
    deploy:
      replicas: 3
```

```bash
# Dev: docker-compose.yml + docker-compose.override.yml (automatic)
docker compose up

# Production: explicitly specify files (override.yml NOT auto-loaded)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Merge order matters — later files override earlier ones
```

---

## Profiles — Conditional Services

```yaml
services:
  api:
    build: .
    # always starts

  debug-tools:
    image: adminer
    ports: ["8081:8080"]
    profiles: ["debug"]      # only starts if profile is activated

  test-runner:
    build:
      context: .
      target: test
    profiles: ["test"]
```

```bash
docker compose up                      # only 'api' starts
docker compose --profile debug up      # 'api' + 'debug-tools' start
docker compose --profile test up       # 'api' + 'test-runner' start
```

---

## Full-Stack Example

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [frontend, api]

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost/api

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  worker:
    build: ./api
    command: python worker.py     # different command, same image as api
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes: [redis-data:/data]

volumes:
  postgres-data:
  redis-data:
```

---

## How Docker Compose Actually Works

```
Docker Compose is NOT a separate runtime — it's a orchestration layer
that translates your YAML into a SEQUENCE of regular Docker Engine API
calls (the same API `docker run`, `docker network create`, etc. use):

  1. Parse docker-compose.yml (+ any override files, merged in order)
  2. Create a dedicated NETWORK for this compose project (if not
     already existing) — named `<project-name>_default` by default,
     which is WHY services can resolve each other by service name:
     this is a real Docker user-defined bridge network, and Compose
     automatically attaches every service to it, getting the same
     container-name DNS resolution described in docker-fundamentals.md
  3. For each service with `build:`, run the equivalent of `docker build`
  4. Create containers for each service (equivalent to `docker create`),
     naming them `<project-name>_<service-name>_<index>`
  5. Start containers IN DEPENDENCY ORDER based on `depends_on` — but
     critically, "order" here originally only meant "the depended-on
     container's PROCESS has started," NOT "the depended-on SERVICE is
     actually ready to accept connections" — this is exactly why
     `condition: service_healthy` was added: it makes Compose actually
     wait for the healthcheck to pass, not just for the process to exist

This explains the classic "database connection refused" error on first
`docker compose up`: without a healthcheck-based depends_on, the app
container starts moments after the database CONTAINER starts, but
long before PostgreSQL/MySQL has actually finished its own internal
startup and begun accepting connections — a race condition that
`condition: service_healthy` specifically closes.

Compose project isolation: everything Compose creates (containers,
networks, volumes) is tagged with a project name (directory name by
default, or --project-name) — this is why `docker compose down` only
tears down THIS project's resources, and why you can run the same
compose file twice under different project names to get two fully
isolated stacks side by side.
```

---

## Troubleshooting Guide

```
"Service fails to connect to another service by name"
  Confirm both services are actually on the SAME Compose network —
  if you've defined custom `networks:` sections and only attached one
  service to a given network, they can't resolve or reach each other
  docker network inspect <project>_default   — verify both containers
  are listed as connected

"Changes to source code don't show up in the running container"
  Bind mount not actually configured, or configured for the wrong
  path, or the image was built with a COPY that shadows the bind
  mount's intended location — check `volumes:` maps your LOCAL path
  to the EXACT path your app reads code from inside the container

"docker compose up works, but 'depends_on' didn't wait properly"
  Plain depends_on (no `condition:`) only waits for the container to
  START, not to be READY — add a healthcheck to the dependency and
  use `condition: service_healthy` (see the internals section above)

"Environment variable from .env file isn't being substituted"
  .env must be in the SAME DIRECTORY you run `docker compose` from
  (not necessarily where docker-compose.yml lives, if you're running
  the command from elsewhere with -f)
  Variable substitution syntax is ${VAR}, not $VAR, for reliable
  parsing in docker-compose.yml specifically

"Stale container after changing docker-compose.yml"
  docker compose up -d --force-recreate    — forces recreation even
  if Compose doesn't think the config changed enough to warrant it
  (usually only needed for edge cases; normally `up` alone detects
  config changes and recreates automatically)
```

---

## Tips

- Use `depends_on` with `condition: service_healthy` — plain `depends_on` only waits for the container to *start*, not to be *ready* (a common source of "connection refused" errors on startup).
- Keep `docker-compose.override.yml` for local dev conveniences (bind mounts, exposed debug ports) — it's loaded automatically and never needed in CI/production.
- Named volumes for databases (data survives `docker compose down`); bind mounts for source code (instant reflect of local changes).
- Use `internal: true` on backend networks that shouldn't reach the internet — an easy security win for database networks.
- `docker compose config` validates and prints the fully-resolved configuration (with all variable substitutions and merges applied) — useful for debugging complex setups.

---

## Summary

- `docker-compose.yml` defines multiple services, networks, and volumes declaratively.
- `docker compose up -d` / `down` / `logs -f` / `exec` are the core daily commands.
- Services on the same network resolve each other by service name — no manual IP management.
- `depends_on` + `healthcheck` ensures services start in the correct order and only when dependencies are actually ready.
- Multiple compose files (`-f base.yml -f prod.yml`) layer configuration for different environments.
- `profiles` let you conditionally include services (debug tools, test runners) without always starting them.
