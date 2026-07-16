---
title: "Git and DevOps"
sidebar_label: "Git & DevOps"
sidebar_position: 9
---

# Git and DevOps

Git is the foundation of modern DevOps — every CI/CD pipeline starts with a Git event. This page covers how Git integrates with automated testing, deployment, and platform engineering practices.

---

## Git as the Source of Truth

```
In DevOps, Git is the single source of truth for:
  Application code
  Infrastructure configuration (Terraform, Ansible)
  Kubernetes manifests
  CI/CD pipeline definitions
  Documentation

GitOps principle: the desired state of the system is always described
in Git. The actual state is continuously reconciled toward it.
Rollback = git revert. Audit = git log. Diff = git diff.
```

---

## CI/CD Triggered by Git Events

Every CI/CD platform (GitHub Actions, GitLab CI, Jenkins, CircleCI) listens for Git events:

```
Git events → CI/CD triggers:
  push to main        → run tests + deploy to production
  push to feature/*   → run tests (no deploy)
  open pull request   → run tests + preview deploy
  tag v*.*.* pushed   → build release artifact + deploy to production
  scheduled cron      → nightly build, dependency updates
```

### GitHub Actions

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
      - uses: actions/checkout@v4

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

  deploy:
    needs: test              # only runs if test job passes
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # only on main branch
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: ./scripts/deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

```yaml
# Deploy on tagged release
name: Release

on:
  push:
    tags:
      - 'v*.*.*'    # triggers on v1.0.0, v2.1.3, etc.

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_ENV

      - name: Build release artifact
        run: npm run build:release

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*.zip
          generate_release_notes: true
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_ENV: test

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run lint
    - npm test
  only:
    - merge_requests
    - main

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  only:
    - main
    - tags

deploy-staging:
  stage: deploy
  script:
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - main

deploy-production:
  stage: deploy
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  only:
    - tags
  when: manual      # requires a human to click "deploy" in GitLab UI
```

---

## Conventional Commits and Automated Changelog

```
Conventional Commits format:
  <type>(<scope>): <description>

  [optional body]

  [optional footer: BREAKING CHANGE: ...]

Types:
  feat      → new feature → bumps MINOR version (1.0.0 → 1.1.0)
  fix       → bug fix → bumps PATCH version (1.0.0 → 1.0.1)
  BREAKING CHANGE in footer → bumps MAJOR version (1.0.0 → 2.0.0)
  docs      → documentation only
  style     → formatting (no logic change)
  refactor  → code restructure (no feature or fix)
  test      → adding or fixing tests
  chore     → tooling, dependencies, config

Tools that use Conventional Commits:
  semantic-release: auto-version + auto-changelog + auto-publish to npm
  conventional-changelog: generate CHANGELOG.md from commit history
  commitlint: lint commit messages in CI

# semantic-release setup (GitHub Actions):
# It reads commit messages, determines version bump,
# tags the release, generates changelog, and publishes to npm — all automatically
```

```bash
# Install commitlint to enforce Conventional Commits
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional']
};

# Add as a Git hook (via Husky)
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

---

## GitOps — Git as the Deployment Mechanism

```
Traditional deployment: developer SSHes into server and runs scripts
GitOps: desired state is in Git; an operator watches Git and applies changes

GitOps principles:
  1. Declarative: desired state defined in Git (Kubernetes YAML, Terraform HCL)
  2. Versioned: Git is the single source of truth; full audit history
  3. Pulled automatically: operator (Argo CD, Flux) pulls from Git — not pushed to
  4. Continuously reconciled: operator detects drift and restores desired state

GitOps tools:
  Argo CD: Kubernetes GitOps; watches a Git repo; syncs K8s cluster to match
  Flux CD: similar to Argo CD; GitOps for Kubernetes
  Terraform Cloud: GitOps for infrastructure; watches repo; auto-applies on merge

Workflow:
  Developer PRs a change to the Kubernetes YAML in Git
  PR reviewed, merged to main
  Argo CD detects the change (polls every 3 minutes or webhook)
  Argo CD applies the YAML to the cluster
  If cluster drifts from Git state: Argo CD alerts (or auto-corrects)
  Rollback: git revert the change → Argo CD restores previous state

Separate repos pattern:
  app-repo:   application source code
  config-repo: Kubernetes manifests / Helm values
  CI: builds app → updates image tag in config-repo → commits
  Argo CD: watches config-repo only
  Clear separation: code changes vs deployment changes
```

---

## Trunk-Based Development with Feature Flags

```javascript
// Feature flags in code (simple env-var approach)
const flags = {
  darkMode:    process.env.FEATURE_DARK_MODE === 'true',
  newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
  aiSearch:    process.env.FEATURE_AI_SEARCH === 'true',
};

// Use in code
if (flags.darkMode) {
  renderDarkMode();
} else {
  renderLightMode();
}

// Deploy to production with flag OFF (code ships but feature is hidden)
// Enable flag for internal users first
// Gradually roll out: 1% → 10% → 50% → 100%
// If problems: flip flag off immediately — instant rollback, no git revert needed

// Feature flag services: LaunchDarkly, Unleash, Split.io, Flagsmith (open source)
// These enable percentage rollouts, user targeting, A/B testing
```

---

## Branch-Based Deployment Strategies

```
Branch-to-environment mapping (common patterns):

Pattern 1 (GitHub Flow):
  main → staging (auto-deploy)
  tags/v*.*.* → production (auto-deploy)

Pattern 2 (environment branches):
  main → development
  staging → staging environment
  production → production environment
  (code flows: main → PR to staging → PR to production)

Pattern 3 (Gitflow):
  develop → development environment
  release/* → QA environment
  main → production environment

Blue-Green deployment (zero downtime):
  Blue: current production
  Green: new version deployed alongside
  Switch traffic from Blue to Green (load balancer rule change)
  If Green has issues: instantly route back to Blue (instant rollback)
  Git tag the blue version before switching — easy reference point

Canary deployment:
  New version deployed to small % of users (1%, then 5%, then 100%)
  Monitor error rates; if healthy, increase percentage
  Git: tag the canary commit; if bad, git revert + redeploy
```

---

## Protecting Secrets in Git

```bash
# NEVER commit secrets to Git
# Even private repos leak: ex-employees, security breaches, accidental public repos

# Detecting secrets already committed
git log -p | grep -i "password\|secret\|api_key\|token"

# Tools that scan for secrets:
# git-secrets (AWS): prevents committing AWS credentials
git secrets --install    # installs hooks
git secrets --register-aws

# Gitleaks: scans full history for secrets
gitleaks detect --source .
gitleaks protect --staged  # use as pre-commit hook

# truffleHog: scans commits for high-entropy strings
trufflehog git file://. --since-commit HEAD~50

# If you've already committed a secret:
# 1. Rotate the secret IMMEDIATELY (assume it's compromised)
# 2. Remove it from history (git-filter-repo)
# 3. Force push to all remotes
# 4. Notify all contributors to re-clone

# The correct way: environment variables or secret managers
# .env file → add to .gitignore → load at runtime
# Production: use secret manager (AWS Secrets Manager, HashiCorp Vault, GitHub Secrets)
```

---

## Git in Monorepos

```bash
# Monorepo: multiple packages/services in one Git repo

# Affected-only CI (only test what changed)
git diff --name-only origin/main...HEAD
# packages/api/src/user.js
# packages/web/src/app.tsx
# → only run tests for 'api' and 'web' packages

# Tools for monorepo workflows:
# Nx: affected detection, task graph, caching
# Turborepo: task pipeline, caching
# Rush: Microsoft's monorepo manager
# Bazel: Google's build system

# Conventional Commits in monorepo (scope = package):
# feat(api): add user authentication
# fix(web): correct mobile layout
# chore(deps): upgrade React to 18.3 in web package

# Sparse checkout (check out only one service):
git clone --filter=blob:none --no-checkout https://github.com/org/monorepo.git
cd monorepo
git sparse-checkout init --cone
git sparse-checkout set packages/api shared
git checkout main
```

---

## Tips

- Never store secrets in Git — even for a moment. Rotate immediately if you do. The commit is in history forever even after deletion.
- CI should run on every push and every PR — failing CI on a PR is a gift (catches the bug before it reaches main).
- Use `git tag` to mark every production deployment, not just releases — `git log v2025-01-15..v2025-01-22` shows exactly what went to production last week.
- Keep CI fast: parallelize jobs, cache dependencies (`npm ci` with cache is 10× faster than `npm install`), run the slowest tests last.
- GitOps (Argo CD/Flux) makes rollback trivial — `git revert` + merge = production restored. No manual kubectl commands, no heroics.

---

## Summary

- Every CI/CD pipeline starts with a Git event: push, PR open, tag, or schedule — Git is the trigger for all automation.
- GitHub Actions / GitLab CI: YAML files in the repo define the pipeline; run tests on PR, deploy on merge to main, release on tag.
- Conventional Commits (`feat:`, `fix:`, `BREAKING CHANGE:`) enable automated versioning, changelog generation, and semantic releases.
- GitOps: declare desired infrastructure/deployment state in Git; operators (Argo CD, Flux) continuously reconcile the actual state toward it.
- Feature flags decouple deployment from release — code ships to production behind a flag; the feature is enabled independently.
- Never commit secrets — use environment variables and secret managers; scan history with gitleaks or truffleHog as a pre-commit hook.
