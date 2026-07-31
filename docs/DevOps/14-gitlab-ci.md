---
title: "GitLab CI/CD"
sidebar_label: "GitLab CI"
sidebar_position: 14
---

# GitLab CI/CD

GitLab's built-in CI/CD system — pipelines defined in `.gitlab-ci.yml`, deeply integrated with GitLab's issue tracking, container registry, and deployment features.

**Docs:** [docs.gitlab.com/ee/ci](https://docs.gitlab.com/ee/ci/)

---

## Core Concepts

```
Pipeline: the full set of jobs for a commit/branch/MR
Stage:    a phase of the pipeline (build, test, deploy) — stages run sequentially
Job:      a single unit of work within a stage — jobs in the same stage run in parallel
Runner:   the agent that executes jobs (GitLab-hosted or self-hosted)
Artifact: files produced by a job, passed to later stages or downloadable
```

---

## Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  NODE_ENV: "test"

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 week

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run lint
    - npm test
  coverage: '/Coverage: \d+\.\d+%/'    # regex to extract coverage % for GitLab's UI

deploy-staging:
  stage: deploy
  image: alpine:3.19
  script:
    - apk add --no-cache curl
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - main

deploy-production:
  stage: deploy
  image: alpine:3.19
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  when: manual                        # requires a human to click "run" in the UI
  only:
    - main
```

---

## Rules — Modern Conditional Logic

`rules:` is the modern replacement for `only:`/`except:` — more expressive and composable.

```yaml
deploy-production:
  stage: deploy
  script: [./deploy.sh production]
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
    - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
      when: on_success
    - when: never                      # default: don't run otherwise

test:
  stage: test
  script: [npm test]
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
    - changes:                          # only run if these paths changed
        - src/**/*
        - package.json

# Common predefined variables used in rules:
# $CI_COMMIT_BRANCH        current branch name
# $CI_COMMIT_TAG            tag name (if triggered by a tag)
# $CI_PIPELINE_SOURCE       push, merge_request_event, schedule, web, api, trigger
# $CI_MERGE_REQUEST_IID     merge request number
# $CI_DEFAULT_BRANCH        the repo's default branch name
```

---

## Jobs In Depth

```yaml
my-job:
  stage: test
  image: python:3.12-slim               # Docker image the job runs in

  before_script:                          # runs before 'script' — good for setup
    - pip install -r requirements.txt

  script:
    - pytest --cov=src

  after_script:                           # always runs, even on failure — cleanup
    - echo "Job finished"

  variables:
    DJANGO_SETTINGS_MODULE: "myapp.settings.test"

  needs: [build]                          # DAG dependency — run as soon as 'build' finishes
                                            # (instead of waiting for the whole build STAGE)

  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths: [.cache/pip, venv/]

  artifacts:
    paths: [coverage.xml]
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    when: always                          # upload artifacts even if job failed
    expire_in: 30 days

  retry:
    max: 2
    when: runner_system_failure           # only retry on infra flakiness, not test failures

  timeout: 15 minutes

  tags: [docker, linux]                    # only run on runners with matching tags

  allow_failure: false                     # if true, pipeline continues even if this job fails
```

---

## Environments and Deployments

```yaml
deploy-review:
  stage: deploy
  script: [./deploy.sh "review-$CI_MERGE_REQUEST_IID"]
  environment:
    name: review/$CI_COMMIT_REF_SLUG        # dynamic environment per branch/MR
    url: https://$CI_ENVIRONMENT_SLUG.example.com
    on_stop: stop-review                     # job to run when environment is stopped
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

stop-review:
  stage: deploy
  script: [./teardown.sh "review-$CI_MERGE_REQUEST_IID"]
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

# Review Apps — automatically spin up a temporary environment per merge request
# GitLab tracks all environments under Deployments → Environments in the UI
# with deployment history, rollback buttons, and status
```

---

## Includes — Reusable Pipeline Configuration

```yaml
# .gitlab-ci.yml
include:
  - local: '/ci/build.yml'
  - project: 'myorg/ci-templates'
    ref: main
    file: '/templates/deploy.yml'
  - template: 'Security/SAST.gitlab-ci.yml'     # GitLab-provided templates
  - remote: 'https://example.com/ci/shared.yml'

# Extends — DRY job configuration via inheritance
.deploy-template:
  image: alpine:3.19
  before_script: [apk add --no-cache curl]

deploy-staging:
  extends: .deploy-template
  script: [./deploy.sh staging]
  environment: staging

deploy-production:
  extends: .deploy-template
  script: [./deploy.sh production]
  environment: production
  when: manual
```

---

## Variables and Secrets

```yaml
# Project-level: Settings → CI/CD → Variables (in the GitLab UI)
# Types: Variable (plain), File (written to a temp file), masked, protected

variables:
  DEPLOY_ENV: "staging"                    # pipeline-level default

job:
  variables:
    LOCAL_VAR: "value"                       # job-level override
  script:
    - echo "$CI_PROJECT_SECRET_KEY"         # reference a UI-configured secret

# Protected variables: only exposed to pipelines running on protected branches/tags
# Masked variables: hidden from job logs automatically

# External secret managers (recommended for production secrets)
job:
  secrets:
    DATABASE_PASSWORD:
      vault:
        engine: {name: kv-v2, path: secret}
        path: myapp/production
        field: db_password
```

---

## Docker-in-Docker (Building Images in CI)

```yaml
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind                        # Docker-in-Docker service
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest

# $CI_REGISTRY, $CI_REGISTRY_IMAGE, $CI_REGISTRY_USER, $CI_REGISTRY_PASSWORD
# are all auto-populated for GitLab's built-in Container Registry
```

---

## Merge Request Pipelines and Pipeline Efficiency

```yaml
# Only run full pipeline on MRs, not every push to a feature branch
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

# Parallel jobs — split a test suite across multiple runners
test:
  parallel: 5
  script:
    - npm run test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL

# Matrix jobs
test-matrix:
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        OS: ["alpine", "debian"]
  image: node:$NODE_VERSION-$OS
  script: [npm test]
```

---

## GitLab-Specific Features

```
Auto DevOps:
  GitLab can auto-detect your project type and generate an entire
  build/test/deploy pipeline with zero configuration — good for getting
  started fast; most production teams eventually replace it with custom config

Built-in Container Registry:
  registry.gitlab.com/myorg/myproject — no separate registry needed

Security scanning templates (built-in, just 'include' them):
  SAST, DAST, Dependency Scanning, Container Scanning, Secret Detection
  include: [{template: 'Security/SAST.gitlab-ci.yml'}]

Value Stream Analytics:
  Built-in DORA-style metrics dashboard — cycle time, deployment frequency

GitLab Pages:
  Free static site hosting directly from a repo (docs sites, demos)

Multi-project pipelines:
  Trigger a pipeline in another project and pass variables/artifacts through
```

---

## How GitLab CI Actually Executes a Pipeline

```
1. A push/MR/schedule event happens on the GitLab server
2. GitLab parses .gitlab-ci.yml (following any `include:`), resolves
   `rules:`/`only`/`except` to determine which jobs should actually run
   for this specific event
3. GitLab computes the execution order: `stage:` order is sequential
   by default, but `needs:` creates a DAG that can skip waiting for
   an entire stage (identical DAG concept to Terraform's resource
   graph and GitHub Actions' `needs:`)
4. For each runnable job, GitLab looks for an available RUNNER —
   a separate process (gitlab-runner) that polls the GitLab server
   asking "any jobs for me?" — this is a PULL model, not GitLab
   pushing work to runners; runners initiate the connection
5. The chosen runner receives the job definition, and depending on
   its configured EXECUTOR:
     docker executor    — runner spins up a fresh container per job
                          from the specified `image:`, runs the script
                          inside it, destroys it after
     shell executor       — runs directly on the runner's host OS,
                          no isolation between jobs (faster, less safe)
     kubernetes executor    — runner creates a Pod in a K8s cluster
                          per job
6. Job output streams back to the GitLab server in real time (what
   you see in the pipeline UI's live log)
7. Artifacts are uploaded to GitLab's storage; cache is uploaded to
   configured cache storage (S3-compatible, typically) for reuse by
   FUTURE pipeline runs (not just later jobs in this same run — this
   is the key difference from artifacts, same distinction as covered
   in cicd-concepts.md)

Runner registration is a one-time setup connecting a runner process to
a specific project/group — this is why a stuck pipeline is often a
runner availability problem, not a pipeline logic problem: check
Settings → CI/CD → Runners for whether any runner matching your job's
`tags:` is actually online and idle.
```

---

## Troubleshooting Guide

```
"Pipeline never starts / stuck at 'pending'"
  No available runner matches this job (check `tags:` on the job vs
  tags configured on your runners — an exact-match requirement)
  Settings → CI/CD → Runners — confirm a runner is online (green dot)

"Job fails with 'This job could not be executed because it would
 create a cyclical dependency'"
  A `needs:` chain that (directly or indirectly) references itself —
  same class of error as Terraform's dependency cycle, fix by
  restructuring the dependency chain

"Variable is empty inside the job even though I set it in the UI"
  Protected variables are only exposed to pipelines running on
  PROTECTED branches/tags — if your job runs on an unprotected
  feature branch, protected variables won't be there
  Settings → CI/CD → Variables — check the Protected checkbox status
  against which branch triggered this pipeline

"Cache never seems to help — every run reinstalls everything"
  The cache `key:` isn't stable across runs (e.g. includes something
  that changes every commit when it shouldn't), so GitLab treats
  every run as needing a fresh cache
  Common fix: key off a lockfile hash, not the commit SHA:
    cache:
      key:
        files: [package-lock.json]

"docker-in-docker job fails with 'Cannot connect to the Docker daemon'"
  Missing the `services: [docker:24-dind]` service, or
  DOCKER_TLS_CERTDIR mismatch between the job and service — see the
  exact working example in the Docker-in-Docker section above
```

---

## Tips

- Use `rules:` instead of the older `only:`/`except:` for new pipelines — more powerful and the direction GitLab is moving.
- `needs:` creates a DAG (directed acyclic graph) between jobs instead of waiting for entire stages — dramatically speeds up pipelines with independent job chains.
- GitLab's built-in security scanning templates are essentially free to add (`include: [{template: ...}]`) — there's rarely a reason not to enable SAST and dependency scanning.
- Review Apps (dynamic environments per MR) are one of GitLab's most underused features — huge for catching integration issues before merge.
- `extends:` (job inheritance) keeps large `.gitlab-ci.yml` files DRY — define common patterns once as hidden jobs (prefixed with `.`).

---

## Summary

- `.gitlab-ci.yml` defines `stages` (sequential) containing `jobs` (parallel within a stage); `image:` sets the Docker image per job.
- `rules:` is the modern way to control when jobs run — more expressive than `only`/`except`.
- `needs:` creates job-level dependencies (DAG) instead of stage-level blocking — faster pipelines.
- `environment:` tracks deployments in the UI, supports dynamic Review App environments per merge request.
- `include:` + `extends:` keep pipeline configuration DRY and reusable across projects.
- Docker-in-Docker (`services: [docker:24-dind]`) is the standard pattern for building images inside GitLab CI.
- Built-in security scanning templates, Container Registry, and Auto DevOps reduce setup effort significantly.
