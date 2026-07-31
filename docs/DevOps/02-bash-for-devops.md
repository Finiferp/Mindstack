---
title: "Bash Scripting for DevOps"
sidebar_label: "Bash for DevOps"
sidebar_position: 2
---

# Bash Scripting for DevOps

DevOps work runs on shell scripts — deployment scripts, CI pipeline steps, cron jobs, glue code between tools. This page covers the patterns used constantly in real automation (not general Linux usage — see the Linux course for that).

---

## Script Basics

```bash
#!/usr/bin/env bash
set -euo pipefail
# -e: exit immediately if any command fails
# -u: error on undefined variables
# -o pipefail: a pipeline fails if ANY command in it fails (not just the last)
# This trio should be at the top of every production script

IFS=$'\n\t'   # safer word splitting (avoids issues with spaces in filenames)

# Make executable and run
chmod +x script.sh
./script.sh
bash script.sh          # or run without making executable
```

---

## Variables and Parameters

```bash
#!/usr/bin/env bash
set -euo pipefail

NAME="production"
readonly VERSION="1.2.3"    # constant — cannot be reassigned

# Command substitution
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Script arguments
echo "Script name: $0"
echo "First arg: $1"
echo "All args: $@"
echo "Number of args: $#"

# Default values
ENVIRONMENT="${1:-staging}"        # use $1, or "staging" if not provided
DEBUG="${DEBUG:-false}"            # use env var DEBUG, or "false" if unset

# Required argument check
if [ -z "${1:-}" ]; then
    echo "Usage: $0 <environment>" >&2
    exit 1
fi

# Environment variables
export DATABASE_URL="postgres://localhost/mydb"
echo "$DATABASE_URL"

# Arrays
SERVICES=("api" "worker" "scheduler")
for service in "${SERVICES[@]}"; do
    echo "Restarting $service"
done
echo "Number of services: ${#SERVICES[@]}"

# Associative arrays (bash 4+)
declare -A ENV_URLS=(
    [staging]="https://staging.example.com"
    [production]="https://example.com"
)
echo "${ENV_URLS[production]}"
```

---

## Conditionals

```bash
#!/usr/bin/env bash

# String comparison
if [ "$ENVIRONMENT" == "production" ]; then
    echo "deploying to prod"
elif [ "$ENVIRONMENT" == "staging" ]; then
    echo "deploying to staging"
else
    echo "unknown environment" >&2
    exit 1
fi

# [[ ]] is preferred over [ ] — more features, fewer gotchas
if [[ "$BRANCH" == release/* ]]; then    # glob matching
    echo "release branch"
fi

if [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then  # regex matching
    echo "valid semver"
fi

# File tests
if [ -f "$FILE" ]; then     echo "file exists"; fi
if [ -d "$DIR" ]; then      echo "directory exists"; fi
if [ -x "$SCRIPT" ]; then   echo "executable"; fi
if [ -s "$FILE" ]; then     echo "file exists and is not empty"; fi
if [ -z "$VAR" ]; then      echo "empty string"; fi
if [ -n "$VAR" ]; then      echo "non-empty string"; fi

# Numeric comparison
if [ "$COUNT" -gt 10 ]; then echo "more than 10"; fi
if [ "$COUNT" -eq 0 ]; then  echo "zero"; fi
# -eq -ne -gt -ge -lt -le

# Command success check
if command -v docker &> /dev/null; then
    echo "docker is installed"
fi

if kubectl get pods &> /dev/null; then
    echo "cluster is reachable"
fi

# Combining conditions
if [[ "$ENV" == "prod" && "$FORCE" != "true" ]]; then
    echo "Refusing to deploy to prod without --force"
    exit 1
fi
```

---

## Loops

```bash
# for loop
for i in {1..5}; do
    echo "Iteration $i"
done

for file in *.log; do
    echo "Processing $file"
done

for service in api worker scheduler; do
    systemctl restart "$service"
done

# C-style for loop
for ((i=0; i<10; i++)); do
    echo "$i"
done

# while loop
COUNT=0
while [ "$COUNT" -lt 5 ]; do
    echo "$COUNT"
    COUNT=$((COUNT + 1))
done

# Retry loop — common DevOps pattern
MAX_RETRIES=5
RETRY_DELAY=10
attempt=1
until curl -sf http://localhost:8080/health; do
    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
        echo "Health check failed after $MAX_RETRIES attempts" >&2
        exit 1
    fi
    echo "Attempt $attempt failed, retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
    attempt=$((attempt + 1))
done
echo "Service is healthy"

# Read a file line by line
while IFS= read -r line; do
    echo "Line: $line"
done < "input.txt"

# Process output of a command line by line
kubectl get pods --no-headers | while read -r name ready status rest; do
    echo "Pod: $name, Status: $status"
done
```

---

## Functions

```bash
#!/usr/bin/env bash
set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

check_prerequisites() {
    local missing=()
    for cmd in docker kubectl terraform; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        return 1
    fi
}

deploy() {
    local environment="$1"
    local version="$2"

    log "Deploying version $version to $environment"

    if [[ "$environment" == "production" ]]; then
        read -rp "Confirm production deploy [y/N]: " confirm
        if [[ "$confirm" != "y" ]]; then
            log "Deployment cancelled"
            return 1
        fi
    fi

    kubectl set image deployment/app app="myapp:$version" -n "$environment"
    kubectl rollout status deployment/app -n "$environment" --timeout=300s
}

# Main script logic
main() {
    check_prerequisites || exit 1
    deploy "${1:-staging}" "${2:-latest}"
}

main "$@"
```

---

## Error Handling and Cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

TEMP_DIR=$(mktemp -d)

cleanup() {
    local exit_code=$?
    echo "Cleaning up..."
    rm -rf "$TEMP_DIR"
    exit "$exit_code"
}
trap cleanup EXIT              # runs on ANY exit (success or failure)
trap 'echo "Error on line $LINENO"' ERR

# Trap specific signals
trap 'echo "Interrupted"; exit 130' INT   # Ctrl+C

# Custom error function
die() {
    echo "FATAL: $*" >&2
    exit 1
}

[ -f "config.yml" ] || die "config.yml not found"

# Check exit codes explicitly
if ! terraform apply -auto-approve; then
    die "Terraform apply failed"
fi

# Capture output and exit code separately
if output=$(docker build -t myapp . 2>&1); then
    echo "Build succeeded"
else
    exit_code=$?
    echo "Build failed with exit code $exit_code"
    echo "$output"
    exit "$exit_code"
fi
```

---

## Common DevOps Script Patterns

```bash
#!/usr/bin/env bash
# ── Health check / wait-for-it pattern ────────────────────────────────────────
wait_for_service() {
    local url="$1"
    local timeout="${2:-60}"
    local elapsed=0

    while ! curl -sf "$url" > /dev/null 2>&1; do
        if [ "$elapsed" -ge "$timeout" ]; then
            echo "Timed out waiting for $url" >&2
            return 1
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    echo "$url is ready"
}

wait_for_service "http://localhost:5432" 30

# ── Deploy with rollback on failure ───────────────────────────────────────────
deploy_with_rollback() {
    local deployment="$1"
    local new_image="$2"
    local previous_image
    previous_image=$(kubectl get deployment "$deployment" -o jsonpath='{.spec.template.spec.containers[0].image}')

    kubectl set image "deployment/$deployment" "app=$new_image"

    if ! kubectl rollout status "deployment/$deployment" --timeout=180s; then
        echo "Deployment failed, rolling back to $previous_image" >&2
        kubectl set image "deployment/$deployment" "app=$previous_image"
        kubectl rollout status "deployment/$deployment"
        return 1
    fi
}

# ── Backup with rotation ──────────────────────────────────────────────────────
backup_database() {
    local backup_dir="/backups"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$backup_dir/db-$timestamp.sql.gz"

    pg_dump mydb | gzip > "$backup_file"
    echo "Backup created: $backup_file"

    # Keep only the last 7 backups
    find "$backup_dir" -name "db-*.sql.gz" -type f | sort -r | tail -n +8 | xargs -r rm
}

# ── Parse JSON with jq (essential DevOps tool) ────────────────────────────────
RESPONSE=$(curl -s https://api.example.com/status)
STATUS=$(echo "$RESPONSE" | jq -r '.status')
COUNT=$(echo "$RESPONSE" | jq '.items | length')

if [[ "$STATUS" != "ok" ]]; then
    echo "API returned status: $STATUS" >&2
    exit 1
fi

# jq common patterns
echo "$RESPONSE" | jq '.items[] | select(.status == "active")'
echo "$RESPONSE" | jq -r '.items[].name'                # extract field from array
echo "$RESPONSE" | jq '{name, status}'                    # pick fields
kubectl get pods -o json | jq -r '.items[].metadata.name'  # combine with kubectl

# ── Slack/webhook notification ────────────────────────────────────────────────
notify_slack() {
    local message="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:?SLACK_WEBHOOK_URL not set}"
    curl -sf -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        "$webhook_url"
}

notify_slack "Deployment to production completed successfully"
```

---

## Cron Jobs

```bash
# Crontab syntax:  minute hour day-of-month month day-of-week  command
# *  *  *  *  *
# │  │  │  │  │
# │  │  │  │  └── day of week (0-6, 0=Sunday)
# │  │  │  └───── month (1-12)
# │  │  └──────── day of month (1-31)
# │  └─────────── hour (0-23)
# └────────────── minute (0-59)

crontab -e                     # edit current user's crontab
crontab -l                     # list current crontab
crontab -r                     # remove crontab

# Examples
0 2 * * *       /scripts/backup.sh                  # daily at 2:00 AM
*/15 * * * *    /scripts/health-check.sh             # every 15 minutes
0 0 * * 0       /scripts/weekly-report.sh            # weekly on Sunday midnight
0 9-17 * * 1-5  /scripts/business-hours-check.sh     # hourly, 9-5, weekdays

# Always redirect output and set PATH in cron scripts (cron has minimal environment)
0 2 * * * /usr/bin/bash /scripts/backup.sh >> /var/log/backup.log 2>&1

# In the script itself, use absolute paths (cron PATH is minimal)
#!/usr/bin/env bash
/usr/bin/pg_dump mydb | /usr/bin/gzip > /backups/db.sql.gz
```

---

## systemd Services (for Long-Running Scripts)

```ini
# /etc/systemd/system/my-worker.service
[Unit]
Description=My Background Worker
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/python3 /opt/myapp/worker.py
Restart=on-failure
RestartSec=5
Environment=ENVIRONMENT=production
EnvironmentFile=/opt/myapp/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable my-worker
sudo systemctl start my-worker
sudo systemctl status my-worker
journalctl -u my-worker -f          # follow logs
```

---

## ShellCheck — Linting Bash Scripts

```bash
# pip install shellcheck / apt install shellcheck / brew install shellcheck
shellcheck script.sh

# Common issues it catches:
# - Unquoted variables (word splitting / globbing bugs)
# - Missing 'local' in functions
# - Using [ ] instead of [[ ]] where it matters
# - Comparing strings with = instead of ==

# Ignore a specific warning (use sparingly, with justification)
# shellcheck disable=SC2086
some_command $unquoted_var
```

---

## Tips

- Start every production script with `set -euo pipefail` — it turns silent failures into loud, immediate ones.
- Quote all variable expansions: `"$VAR"` not `$VAR` — unquoted variables are the source of countless subtle bugs (word splitting, glob expansion).
- Use `trap cleanup EXIT` for any script that creates temp files or resources — guarantees cleanup even on failure or Ctrl+C.
- `jq` is non-negotiable for any script that talks to a REST API or `kubectl -o json` — learn its query syntax well.
- Run `shellcheck` on every script before committing — it catches the majority of common bash bugs automatically.

---

## Summary

- `set -euo pipefail` at the top of every script — fail fast, fail loud.
- `"${VAR:-default}"` for defaults; `"${VAR:?error message}"` to require a variable.
- `[[ ]]` for conditionals (prefer over `[ ]`); `$(...)` for command substitution (prefer over backticks).
- `trap cleanup EXIT` for guaranteed resource cleanup; `trap 'handler' ERR` for error handling.
- Retry loops, health checks, and rollback-on-failure are the three most common DevOps script patterns.
- `jq` for JSON parsing, `cron` for scheduled scripts, `systemd` service units for long-running processes.
- Always lint with `shellcheck` before deploying any script to production.
