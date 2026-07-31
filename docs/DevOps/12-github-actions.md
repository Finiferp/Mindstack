---
title: "GitHub Actions"
sidebar_label: "GitHub Actions"
sidebar_position: 12
---

# GitHub Actions

GitHub's built-in CI/CD platform — workflows defined as YAML files that run on GitHub-hosted or self-hosted runners, triggered by repository events.

**Docs:** [docs.github.com/actions](https://docs.github.com/en/actions)

---

## Core Concepts

```
Workflow:  a YAML file in .github/workflows/ — defines automated processes
Event:     what triggers a workflow (push, pull_request, schedule, etc.)
Job:       a set of steps that run on the same runner
Step:      an individual task — either a shell command or an Action
Action:    a reusable unit of code (from the Marketplace or custom)
Runner:    the machine that executes jobs (GitHub-hosted or self-hosted)
```

---

## Basic Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

---

## Triggers (on:)

```yaml
on:
  push:
    branches: [main]
    tags: ['v*.*.*']
    paths: ['src/**', 'package.json']          # only if these paths changed
    paths-ignore: ['docs/**', '*.md']

  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  schedule:
    - cron: '0 2 * * *'                          # daily at 2 AM UTC

  workflow_dispatch:                              # manual trigger with inputs
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

  release:
    types: [published]

  workflow_call:                                   # reusable workflow (called by others)
    inputs:
      environment: {required: true, type: string}
    secrets:
      deploy_key: {required: true}
```

---

## Jobs — Dependencies, Matrix, Conditions

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [{run: npm run lint}]

  test:
    needs: lint                    # wait for 'lint' to succeed before starting
    runs-on: ubuntu-latest
    strategy:
      matrix:                       # run this job multiple times with different inputs
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false               # don't cancel other matrix jobs if one fails
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with: {node-version: '${{ matrix.node-version }}'}
      - run: npm test

  build:
    needs: [lint, test]              # wait for BOTH to succeed
    runs-on: ubuntu-latest
    steps: [{run: npm run build}]

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'      # only deploy from main branch
    environment: staging                       # links to GitHub Environments (secrets, approvals)
    steps: [{run: ./deploy.sh staging}]

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    environment:
      name: production
      url: https://myapp.com
    steps: [{run: ./deploy.sh production}]
```

---

## Common Expressions and Contexts

```yaml
# Conditionals
if: github.ref == 'refs/heads/main'
if: github.event_name == 'pull_request'
if: startsWith(github.ref, 'refs/tags/')
if: contains(github.event.head_commit.message, '[skip ci]') == false
if: success()                                # default — run if previous steps succeeded
if: failure()                                 # run only if a previous step failed
if: always()                                  # run regardless of previous outcome
if: cancelled()

# Contexts (available data)
${{ github.actor }}                # who triggered the workflow
${{ github.repository }}           # owner/repo
${{ github.sha }}                  # commit SHA
${{ github.ref }}                  # refs/heads/main or refs/tags/v1.0
${{ github.event_name }}           # push, pull_request, etc.
${{ github.event.pull_request.number }}
${{ runner.os }}                    # Linux, Windows, macOS
${{ secrets.MY_SECRET }}
${{ vars.MY_VARIABLE }}             # non-secret configuration variables
${{ matrix.node-version }}
${{ needs.build.outputs.artifact-name }}   # output from a dependent job
${{ steps.step-id.outputs.value }}          # output from a previous step

# Functions
${{ contains(github.event.head_commit.message, 'skip') }}
${{ startsWith(github.ref, 'refs/tags/') }}
${{ format('{0}-{1}', github.sha, github.run_number) }}
${{ toJSON(github.event) }}
```

---

## Passing Data Between Steps and Jobs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get-version.outputs.version }}
    steps:
      - id: get-version
        run: echo "version=$(cat package.json | jq -r .version)" >> "$GITHUB_OUTPUT"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - run: echo "Deploying version ${{ needs.build.outputs.version }}"

# Environment variables and PATH manipulation within a job
steps:
  - run: echo "MY_VAR=hello" >> "$GITHUB_ENV"     # available to subsequent steps
  - run: echo "$MY_VAR"                             # prints "hello"
  - run: echo "/custom/bin" >> "$GITHUB_PATH"       # add to PATH for subsequent steps
```

---

## Secrets and Environments

```yaml
# Repository secrets: Settings → Secrets and variables → Actions
# Organization secrets: shared across repos
# Environment secrets: scoped to a specific GitHub Environment (staging/production)

jobs:
  deploy:
    environment: production          # requires approval if configured; scopes secrets
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
          DB_URL: ${{ secrets.PRODUCTION_DB_URL }}

# Environment protection rules (configured in GitHub UI):
# - Required reviewers (manual approval before job runs)
# - Wait timer (delay before deployment)
# - Deployment branch restrictions (only main can deploy to production)
```

```yaml
# OIDC — authenticate to cloud providers WITHOUT storing long-lived credentials
permissions:
  id-token: write     # required for OIDC
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions-role
      aws-region: us-east-1
  # No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed — OIDC handles auth
```

---

## Docker Build and Push

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write            # for GitHub Container Registry
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Reusable Workflows

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy
on:
  workflow_call:
    inputs:
      environment: {required: true, type: string}
    secrets:
      deploy_token: {required: true}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: ./deploy.sh ${{ inputs.environment }}
        env:
          TOKEN: ${{ secrets.deploy_token }}
```

```yaml
# .github/workflows/main.yml — calling the reusable workflow
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
    secrets:
      deploy_token: ${{ secrets.STAGING_TOKEN }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
    secrets:
      deploy_token: ${{ secrets.PRODUCTION_TOKEN }}
```

---

## Composite Actions — Custom Reusable Steps

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Checkout, install deps, and cache'
inputs:
  node-version:
    default: '20'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with: {node-version: '${{ inputs.node-version }}'}
    - run: npm ci
      shell: bash
```

```yaml
# Using the composite action
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-project
    with: {node-version: '20'}
```

---

## Caching

```yaml
steps:
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        node_modules
      key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-npm-

  # Many setup-* actions have built-in caching (simpler than manual cache action)
  - uses: actions/setup-node@v4
    with: {node-version: '20', cache: 'npm'}
  - uses: actions/setup-python@v5
    with: {python-version: '3.12', cache: 'pip'}
```

---

## Self-Hosted Runners

```yaml
jobs:
  build:
    runs-on: self-hosted           # or with labels: [self-hosted, linux, gpu]
    steps: [...]

# Use cases: custom hardware (GPU), internal network access, cost savings at scale,
# specific compliance requirements

# Setup: Settings → Actions → Runners → New self-hosted runner
# Runs as a service on your own infrastructure, polls GitHub for jobs
```

---

## How GitHub Actions Actually Executes a Workflow

```
1. An event happens (push, PR, schedule tick, etc.) on GitHub's servers
2. GitHub's workflow engine parses every .github/workflows/*.yml file,
   finds any whose `on:` triggers match the event
3. For each matching workflow, GitHub computes the JOB DEPENDENCY GRAPH
   from `needs:` — this is the same DAG concept as Terraform's resource
   graph: jobs with no dependency relationship run in parallel; jobs
   with `needs:` wait for their dependencies to succeed first
4. For each job ready to run, GitHub finds an available RUNNER matching
   `runs-on:` — either provisions a fresh GitHub-hosted VM (a clean,
   ephemeral machine, destroyed after the job finishes) or dispatches
   to a registered self-hosted runner
5. The runner checks out nothing automatically — this is why
   `actions/checkout@v4` is almost always the first step; GitHub Actions
   itself only prepares the empty VM and network, it does NOT
   automatically clone your repo into it
6. Steps execute IN ORDER, sequentially, within that one job's runner —
   each step either runs a shell command or invokes an Action (itself
   just packaged code, often a Docker container or Node.js script)
7. Job artifacts/outputs are uploaded to GitHub's servers (not directly
   to the next job's runner — see below)
8. The runner VM is destroyed after the job completes (GitHub-hosted;
   self-hosted runners persist and pick up the next queued job)

Ephemeral runner = why every job starts with `actions/checkout` and why
env vars/files don't carry over between jobs automatically — each job
gets a completely fresh machine with nothing on it, even if the previous
job in the same workflow ran mountains of setup.
```

### How Jobs Actually Pass Data to Each Other

```
Jobs do NOT share a filesystem, environment, or memory — they're
different machines, possibly different physical hosts entirely.
Two distinct mechanisms bridge this gap:

1. outputs — small string values, passed via GitHub's servers
   job A: echo "value=hello" >> "$GITHUB_OUTPUT"
   job B references it: ${{ needs.job-a.outputs.value }}
   (limited to small text values — not for files)

2. artifacts — actual files, uploaded to and downloaded from
   GitHub's blob storage
   job A: actions/upload-artifact@v4  (uploads dist/ to GitHub's storage)
   job B: actions/download-artifact@v4 (downloads it onto job B's fresh runner)

This explains why forgetting `actions/download-artifact` in a later job
that `needs:` an earlier build job results in "file not found" — the
build output existed on job A's now-destroyed VM; without an explicit
upload/download, it never reaches job B's separate, fresh VM.
```

---

## Troubleshooting Guide

```
"Workflow doesn't trigger at all"
  Check `on:` conditions exactly match your event — a common mistake is
  `branches: [main]` on a `pull_request` trigger, which means "PRs
  TARGETING main," not "pushes to main" (that's the `push:` trigger's job)
  Check the workflow file itself is valid YAML and on the default branch
  (workflow files must exist on the branch GitHub is evaluating them
  against — a new workflow added only on a feature branch won't run for
  push events to OTHER branches until merged)

"Secret shows as empty string in logs / step fails silently"
  Secrets aren't available to workflows triggered by PRs from FORKS,
  by design (security — a malicious fork PR shouldn't be able to
  exfiltrate your secrets by modifying workflow files)
  Fix (if you understand the risk): pull_request_target trigger, with
  extreme caution about what code that workflow then checks out and runs

"needs.job-name.outputs.x is empty in a dependent job"
  The upstream job's `outputs:` block wasn't defined at the JOB level
  (only the step-level `id:`+`$GITHUB_OUTPUT` isn't enough — you must
  ALSO map it up to the job's own `outputs:` key referencing
  `steps.<id>.outputs.<name>`)

"Job succeeds locally logic but fails in Actions with a permissions error"
  GitHub Actions' default GITHUB_TOKEN permissions became read-only
  by default in newer repos — check the `permissions:` block; you may
  need to explicitly grant `contents: write` or `packages: write`

"Self-hosted runner shows offline / job stuck queued forever"
  Runner process not actually running, or it lost its connection to
  GitHub — check the runner's own service status on that machine
  (./run.sh or the registered systemd service, depending on setup)
```

---

## Tips

- Pin action versions to a specific commit SHA (not just `@v4`) for supply-chain security in sensitive workflows — tags can be moved, SHAs cannot.
- Use `concurrency:` groups to cancel in-progress runs when a new commit is pushed to the same PR — saves CI minutes and avoids race conditions on deploys.
- GitHub Environments (with required reviewers) are the cleanest way to add manual approval gates before production deployment.
- Use OIDC for cloud provider authentication wherever supported (AWS, GCP, Azure) — eliminates long-lived secrets entirely.
- `workflow_call` (reusable workflows) reduces duplication across many repos far more cleanly than copy-pasting YAML.

---

## Summary

- Workflows live in `.github/workflows/*.yml`, triggered by events (`push`, `pull_request`, `schedule`, `workflow_dispatch`).
- Jobs run on runners; `needs:` creates dependencies between jobs; `strategy.matrix` runs the same job with different parameters.
- Secrets are scoped at repository, organization, or environment level; Environments add approval gates and deployment protection rules.
- `actions/upload-artifact` + `download-artifact` pass build outputs between jobs; `actions/cache` speeds up repeated dependency installs.
- Reusable workflows (`workflow_call`) and composite actions reduce duplication across pipelines and repositories.
- OIDC federation eliminates the need to store long-lived cloud credentials as GitHub secrets.
