---
title: "CI/CD Concepts"
sidebar_label: "CI/CD Concepts"
sidebar_position: 11
---

# CI/CD Concepts

The theory behind Continuous Integration and Continuous Delivery/Deployment — applicable across every CI/CD tool (GitHub Actions, GitLab CI, Jenkins, all covered in the following pages).

---

## CI vs CD vs CD

```
Continuous Integration (CI):
  Every code change is automatically built and tested
  Goal: catch integration problems early, keep main branch always working
  Practice: merge to main frequently (at least daily); automated test suite runs on every push

Continuous Delivery (CD):
  Every change that passes CI is automatically prepared for release
  A human clicks a button to deploy — but the artifact is always deployable
  Goal: reduce the RISK and EFFORT of releasing, not necessarily the frequency

Continuous Deployment (also CD):
  Every change that passes CI is automatically deployed to production — no human gate
  Goal: minimize lead time from commit to production
  Requires: very high confidence in automated tests; feature flags for risk mitigation

Most teams do: CI + Continuous Delivery (automated up to a manual "deploy" click)
Elite teams do: CI + Continuous Deployment (fully automated, safety nets everywhere)
```

---

## The Pipeline Model

```
Every CI/CD pipeline, regardless of tool, is a sequence of STAGES made of JOBS made of STEPS:

Pipeline
├── Stage: Build
│   └── Job: compile
│       ├── Step: checkout code
│       ├── Step: install dependencies
│       └── Step: compile/build artifact
├── Stage: Test
│   ├── Job: unit-tests
│   ├── Job: integration-tests    ← jobs in a stage often run in PARALLEL
│   └── Job: lint
├── Stage: Security
│   ├── Job: dependency-scan
│   └── Job: sast-scan
├── Stage: Package
│   └── Job: build-docker-image
└── Stage: Deploy
    ├── Job: deploy-staging
    └── Job: deploy-production    ← often gated by manual approval

Stages run sequentially (each waits for the previous to succeed).
Jobs within a stage can run in parallel (unless dependencies are declared).
```

---

## Triggers

```
What starts a pipeline run:

push:              every commit pushed to any/specific branches
pull_request:       opening or updating a PR (run tests before merge)
tag:                pushing a version tag (v1.2.3) — often triggers a release pipeline
schedule:           cron-based (nightly builds, dependency updates)
manual:             a human clicks "run" (often used for production deploys)
workflow_dispatch:   manually triggered with custom inputs
repository_dispatch: triggered by an external system via API call
```

---

## Artifacts and Caching

```
Artifact: a file or set of files produced by a job, passed to later jobs
  or stored for later use (a compiled binary, a Docker image, a test report)

  Build job produces a binary → Test job downloads it → Deploy job downloads it
  Without artifact passing, each job would need to rebuild from scratch

Cache: speeds up REPEATED runs by reusing unchanged data between pipeline runs
  node_modules/, ~/.m2 (Maven), pip cache, Docker layer cache

Artifact vs Cache:
  Artifact: passed between JOBS in the SAME pipeline run; often kept as a build output
  Cache:    reused ACROSS DIFFERENT pipeline runs to speed up repeated work
            (not guaranteed to exist; treated as a performance optimisation, not a dependency)
```

---

## Environments and Promotion

```
Typical environment chain:
  Feature branch → CI runs tests
       ↓ (merge to main)
  Development/Integration environment → auto-deployed on every merge to main
       ↓ (promote — automatic or manual)
  Staging environment → mirrors production; final testing ground
       ↓ (promote — usually manual approval gate)
  Production environment → real users

"Promotion" = taking the SAME tested artifact and deploying it to the next
environment — never rebuild between environments (rebuilding risks introducing
differences between what was tested and what ships)

Environment-specific configuration (URLs, feature flags, secrets) is injected
at DEPLOY time, not BUILD time — the artifact itself is environment-agnostic
```

---

## Deployment Strategies

```
Recreate:
  Stop the old version entirely, then start the new version
  Downtime: yes (brief)
  Simplicity: highest
  Use when: downtime is acceptable (internal tools, batch systems)

Rolling Update:
  Gradually replace old instances with new ones, few at a time
  Downtime: none (if done correctly)
  Risk: both versions run simultaneously during rollout (need backward compatibility)
  Default strategy in Kubernetes Deployments

Blue-Green:
  Two complete environments: Blue (current) and Green (new)
  Deploy to Green fully, test it, then switch ALL traffic instantly (load balancer/DNS)
  Rollback: instant — switch traffic back to Blue
  Cost: requires 2x infrastructure during the transition

Canary:
  Route a small percentage of traffic (1%, 5%, 10%) to the new version
  Monitor error rates/latency; gradually increase percentage if healthy
  Rollback: fast — reduce canary traffic to 0%
  Most sophisticated; requires traffic-splitting infrastructure (service mesh, load balancer)

Feature Flags:
  Deploy code with the new feature DISABLED behind a flag
  Enable the flag for specific users/percentages independently of deployment
  Decouples "deploying code" from "releasing a feature" entirely
  Rollback: instant — flip the flag off, no redeploy needed
```

```
Comparison:

Strategy       | Downtime | Rollback speed | Infra cost | Complexity
───────────────┼──────────┼────────────────┼────────────┼───────────
Recreate       | Yes      | Slow (redeploy)| Low        | Low
Rolling        | No       | Medium         | Low        | Low
Blue-Green     | No       | Instant        | High (2x)  | Medium
Canary         | No       | Fast           | Medium     | High
Feature Flags  | No       | Instant        | Low        | Medium (app-level)
```

---

## Quality Gates

```
Automated checks that must pass before code can proceed to the next stage:

Code quality:
  Linting (ESLint, Pylint, golangci-lint)
  Code coverage threshold (e.g. must be >80%)
  Static analysis (SonarQube — code smells, complexity, duplication)

Security:
  SAST (Static Application Security Testing) — Semgrep, CodeQL
  Dependency scanning — Dependabot, Snyk, npm audit
  Secret scanning — gitleaks, trufflehog
  Container scanning — Trivy, Grype

Testing:
  Unit tests
  Integration tests
  End-to-end tests (Playwright, Cypress, Selenium)
  Load/performance tests (k6, JMeter)

Approval gates:
  Required PR reviews (1-2 approvals)
  Required status checks (CI must be green)
  Manual approval before production deploy (a named team/person clicks "approve")
```

---

## Pipeline as Code

```
Modern CI/CD tools define pipelines as version-controlled YAML files,
living alongside the application code:

  .github/workflows/*.yml    → GitHub Actions
  .gitlab-ci.yml               → GitLab CI
  Jenkinsfile                   → Jenkins (Groovy-based)
  .circleci/config.yml          → CircleCI
  azure-pipelines.yml           → Azure DevOps

Benefits over UI-configured pipelines:
  Reviewable in pull requests, like application code
  Versioned — pipeline changes are tracked in git history
  Reproducible — pipeline behaviour doesn't depend on manual UI configuration
  Portable — easier to migrate between CI providers (though syntax differs)
```

---

## Secrets in CI/CD

```
Never commit secrets to a repository — use the CI platform's secret store:

  GitHub Actions: repository/organization Secrets, environment Secrets
  GitLab CI:       CI/CD Variables (masked, protected)
  Jenkins:          Credentials Plugin, integrated with Vault

Best practices:
  Scope secrets to the minimum environment that needs them
    (a staging secret shouldn't be visible to a PR from a fork)
  Rotate secrets periodically
  Use OIDC (OpenID Connect) for cloud provider auth instead of long-lived keys
    where possible — GitHub Actions + AWS/GCP/Azure support OIDC federation,
    eliminating the need to store cloud credentials as secrets at all
  Mask secret values in logs (most CI tools do this automatically for declared secrets)
```

---

## Monorepo vs Polyrepo CI

```
Monorepo (multiple projects, one repository):
  Challenge: don't rebuild/retest everything on every change
  Solution: "affected" detection — only run pipelines for changed packages
  Tools: Nx, Turborepo, Bazel (compute dependency graphs, cache aggressively)

Polyrepo (one project per repository):
  Simpler CI per repo, but cross-repo changes need coordination
  Versioned packages/APIs to decouple deployment timing between services

Path-based triggers (works in both, more useful for monorepos):
  Only run backend tests if backend/ files changed
  Only run frontend tests if frontend/ files changed
```

---

## Tips

- CI should run on every push and every PR — a red pipeline on a PR is a gift (it caught the bug before merge, not after deploy).
- Keep pipelines fast — parallelize independent jobs, cache dependencies, and split slow test suites; a 20-minute pipeline gets skipped or ignored, a 3-minute one gets used constantly.
- Prefer promotion (same artifact through environments) over rebuilding per environment — eliminates "works in staging, breaks in prod" caused by build differences.
- Adopt OIDC-based cloud authentication in CI/CD instead of long-lived access keys — it eliminates an entire class of credential leak risk.
- Canary deployments and feature flags together give you the fastest, safest rollback options — invest in them once you're past basic rolling deploys.

---

## Summary

- CI: automatically build and test every change. Continuous Delivery: always deployable, manual release. Continuous Deployment: fully automated to production.
- Pipelines are stages → jobs → steps; stages run sequentially, jobs within a stage can run in parallel.
- Artifacts pass build outputs between jobs in one run; caches speed up repeated work across runs.
- Deployment strategies trade off downtime, rollback speed, and infrastructure cost: Recreate, Rolling, Blue-Green, Canary, Feature Flags.
- Quality gates (linting, security scanning, test coverage, approvals) block bad code from progressing through the pipeline.
- Pipeline as Code: define pipelines in version-controlled YAML alongside application code.
- Never commit secrets — use the CI platform's secret store; prefer OIDC over long-lived cloud credentials.
