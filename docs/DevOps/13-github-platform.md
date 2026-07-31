---
title: "GitHub — The Platform"
sidebar_label: "GitHub Platform"
sidebar_position: 13
---

# GitHub — The Platform

GitHub is more than a place to `git push` — it's a full software delivery platform. This page covers the parts of GitHub that matter for DevOps work: repository management, the pull request workflow, Packages, Security features, Projects, and the API/CLI. For Git commands themselves (branching, rebasing, merging), see the Git & Version Control course.

**Docs:** [docs.github.com](https://docs.github.com)

---

## Repository Structure and Settings

```
Every serious repo should configure, under Settings:

General:
  Default branch (main)
  Merge button options — restrict to one strategy for consistency:
    "Allow squash merging" only → clean, linear history on main
    (vs allowing merge commits + rebase + squash all at once → messy history)
  Auto-delete head branches after merge — keeps the branch list clean

Branches → Branch protection rules (on main, at minimum):
  Require a pull request before merging
  Require approvals (1-2, depending on team size)
  Require status checks to pass before merging (CI must be green)
  Require branches to be up to date before merging
  Require conversation resolution before merging
  Do not allow bypassing the above settings (even for admins, ideally)
  Restrict who can push to matching branches

Rulesets (newer, more powerful than classic branch protection):
  Apply rules across multiple branches/tags with a single ruleset
  Support for tag protection, required deployments, and more granular targeting
```

---

## The Pull Request Workflow, Properly

```
A well-run PR workflow on GitHub:

1. Branch naming
   feature/JIRA-123-add-search
   fix/GH-456-null-pointer-login
   Consistent prefixes make it easy to scan the branch list

2. Draft PRs — open early, mark as Draft
   Signals "not ready for review yet, but here's my direction"
   Converts to "Ready for review" when actually ready
   CI still runs on draft PRs — catches issues before you ask for review

3. PR description — use a template
   .github/pull_request_template.md:
     ## What
     ## Why
     ## How to test
     ## Screenshots (if UI)
     Closes #123

4. Linking issues
   "Closes #123", "Fixes #456", "Resolves #789" in the PR description
   or commit message — automatically closes the issue when the PR merges

5. Requesting reviewers
   CODEOWNERS file auto-assigns reviewers based on changed paths:

   # .github/CODEOWNERS
   /api/          @backend-team
   /frontend/     @frontend-team
   *.tf           @platform-team
   /docs/         @tech-writers

6. Review etiquette
   Use "Suggested changes" for small, exact fixes (author applies with one click)
   Distinguish blocking comments from nitpicks (prefix nitpicks clearly: "nit:")
   Approve, don't just comment, once satisfied — unblocks the merge

7. Merge strategy (pick ONE, consistently)
   Merge commit:    preserves full history, adds a merge commit
   Squash and merge: all PR commits become one commit on main (most common default)
   Rebase and merge: replays commits linearly, no merge commit

8. After merge
   Delete the branch (auto-delete setting handles this)
   Auto-close linked issues (via "Closes #123")
```

---

## GitHub Actions Recap — See Dedicated Page

Full coverage of workflows, jobs, runners, and syntax is in the GitHub Actions page. This page focuses on everything else GitHub offers.

---

## GitHub Packages

GitHub's package registry — supports Docker/OCI images, npm, Maven, NuGet, RubyGems, and generic packages, tied directly to your repository's permissions.

```bash
# Docker/OCI images — GitHub Container Registry (ghcr.io)
docker login ghcr.io -u USERNAME -p $GITHUB_TOKEN
docker tag myapp:1.0 ghcr.io/myorg/myapp:1.0
docker push ghcr.io/myorg/myapp:1.0

# npm packages
# .npmrc
# @myorg:registry=https://npm.pkg.github.com
npm publish

# In package.json:
# "publishConfig": { "registry": "https://npm.pkg.github.com" }

# Maven
# settings.xml or pom.xml configured with GitHub Packages repository + token

# Visibility and retention
# Packages inherit repo visibility by default, but can be configured independently
# Container images support retention policies (auto-delete untagged images after N days)
```

```
Why GitHub Packages over Docker Hub / npm public registry:
  Private packages tied directly to repo/org permissions — no separate access management
  Free for public repos; included in GitHub plans for private
  Works seamlessly with GITHUB_TOKEN in Actions — no extra credentials needed
  Good default for internal packages; public open-source packages often still
  prefer Docker Hub / npmjs.com for maximum reach and discoverability
```

---

## GitHub Advanced Security

```
Dependabot — automated dependency management:
  Dependabot alerts: flags known vulnerabilities in your dependencies (via CVE feeds)
  Dependabot security updates: auto-opens PRs to bump vulnerable dependencies
  Dependabot version updates: auto-opens PRs for ANY outdated dependency
    (not just vulnerable ones) — keeps deps current proactively

  # .github/dependabot.yml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule: {interval: "weekly"}
      open-pull-requests-limit: 10
    - package-ecosystem: "docker"
      directory: "/"
      schedule: {interval: "weekly"}
    - package-ecosystem: "github-actions"
      directory: "/"
      schedule: {interval: "monthly"}

Code scanning (CodeQL):
  Static analysis that finds security vulnerabilities in your code
  Runs as a GitHub Action, results appear as annotations on PRs and in
  the Security tab
  Supports: JavaScript/TypeScript, Python, Java, Go, C/C++, C#, Ruby

  # .github/workflows/codeql.yml
  - uses: github/codeql-action/init@v3
    with: {languages: javascript}
  - uses: github/codeql-action/analyze@v3

Secret scanning:
  Automatically detects known secret patterns (API keys, tokens) in commits
  Push protection: BLOCKS a push that contains a detected secret, before it
    ever reaches the remote — the strongest form of prevention
  Partner integration: many providers (AWS, Stripe, etc.) get notified
    directly if their token format is detected, enabling auto-revocation

Security Overview (org-level):
  Aggregated view of Dependabot alerts, code scanning alerts, and secret
  scanning alerts across every repository in the organization
```

---

## GitHub Projects

```
GitHub's built-in project management — Kanban boards, tables, and roadmaps
linked directly to issues and PRs.

Views:
  Board view    — Kanban-style columns (Todo, In Progress, Done)
  Table view     — spreadsheet-like, sortable/filterable/groupable
  Roadmap view   — timeline/Gantt-style view with date fields

Custom fields:
  Status, Priority, Size/Estimate, Iteration, Text, Number, Date, Single-select

Automation (built-in workflows):
  "When an issue is closed, move it to Done"
  "When a PR is merged, move linked issue to Done"
  Custom workflows via Actions + the Projects GraphQL API for anything more advanced

Why use it over Jira/Linear:
  Zero context-switching — issues, PRs, and the board live in the same place
  Free, included with every GitHub plan
  Best for: small-to-mid teams already fully committed to GitHub
  Larger orgs often still prefer dedicated tools (Jira, Linear) for
  cross-team reporting and more mature workflow customization
```

---

## Issues, Templates, and Labels

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Report a bug
labels: ["bug", "needs-triage"]
body:
  - type: textarea
    id: description
    attributes:
      label: What happened?
      description: A clear description of the bug
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Version
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options: [Low, Medium, High, Critical]
```

```
Label conventions (common pattern):
  type: bug, feature, chore, docs
  priority: p0-critical, p1-high, p2-medium, p3-low
  status: needs-triage, in-progress, blocked, ready-for-review
  size: XS, S, M, L, XL   (rough estimate)

Saved replies and issue forms reduce triage time significantly at scale.
```

---

## GitHub CLI (gh)

```bash
brew install gh
gh auth login

# Repositories
gh repo create myorg/myapp --private --clone
gh repo clone myorg/myapp
gh repo view --web
gh repo fork

# Pull requests
gh pr create --title "feat: add search" --body "Closes #123" --base main
gh pr create --draft
gh pr list
gh pr view 123
gh pr view 123 --web
gh pr checkout 123                  # check out a PR locally to test it
gh pr diff 123
gh pr review 123 --approve
gh pr review 123 --request-changes --body "Please add tests"
gh pr merge 123 --squash --delete-branch
gh pr status                         # your open PRs, PRs needing your review

# Issues
gh issue create --title "Bug: login fails" --body "..." --label bug
gh issue list --label bug --state open
gh issue close 456
gh issue develop 456 --checkout       # create + checkout a branch linked to an issue

# Actions / workflows
gh workflow list
gh workflow run deploy.yml -f environment=staging
gh run list
gh run watch                          # watch the current run live
gh run view 12345 --log

# Releases
gh release create v1.2.0 --title "v1.2.0" --generate-notes
gh release list
gh release download v1.2.0

# Gists and API
gh gist create file.txt
gh api repos/myorg/myapp/pulls        # raw API access, authenticated automatically
gh api graphql -f query='{ viewer { login } }'
```

---

## GitHub API and Automation

```
REST API:    api.github.com — full CRUD over repos, issues, PRs, actions, etc.
GraphQL API: api.github.com/graphql — precise queries, fewer round trips,
             required for some Projects v2 operations

Authentication:
  Personal Access Token (classic or fine-grained) — for personal scripts
  GitHub App — for integrations installed across an org (scoped permissions,
               higher rate limits, doesn't depend on one person's account)
  GITHUB_TOKEN — auto-provided inside Actions workflows, scoped to that run

Common automation use cases:
  Auto-label PRs based on file paths changed
  Auto-assign reviewers beyond what CODEOWNERS covers
  Sync issues to an external tracker
  Generate changelogs from merged PRs
  Enforce custom merge policies not covered by branch protection UI

Webhooks:
  Configure a repo/org to POST an event payload to your server on
  push, pull_request, issues, release, etc. — the foundation for any
  custom bot or integration that reacts to GitHub events in real time
```

---

## GitHub Environments and Deployments

```
Environments (Settings → Environments) represent deployment targets
(staging, production) and let you configure:

  Required reviewers — a person/team must approve before the job runs
  Wait timer — mandatory delay before deployment proceeds
  Deployment branch/tag rules — only allow deploys from specific
    branches (e.g. only 'main' can deploy to 'production')
  Environment-scoped secrets — a 'production' secret is invisible
    to workflows targeting 'staging'

Deployments API / UI:
  Every deployment run creates a Deployment record, visible on the repo's
  homepage sidebar and the Environments tab — a built-in audit trail of
  what was deployed, when, by whom, and its current status
```

---

## Organization-Level Features

```
Teams:            group members, map to CODEOWNERS and repo permissions
SAML SSO:          enforce identity-provider-based login (Enterprise)
Audit log:          who did what, when, across the entire org (Enterprise)
Repository rulesets: org-wide policies applied consistently across many repos
Required workflows:  force specific Actions workflows to run on every repo (Enterprise)
IP allow lists:      restrict access to specific network ranges (Enterprise)

Fork and internal repo visibility:
  Public:    visible to everyone
  Private:   visible only to explicitly granted members
  Internal:  visible to all members of the enterprise (not the general public)
```

---

## Tips

- Configure branch protection on `main` before the first real PR ever lands — retrofitting discipline onto an unprotected repo is much harder than starting correctly.
- Turn on secret scanning push protection immediately — it prevents leaked credentials from ever reaching the remote, which is far better than detecting them after the fact.
- Use a `CODEOWNERS` file the moment more than 2-3 people touch a repo — automatic review routing scales far better than remembering who owns what.
- `gh pr checkout <number>` is the fastest way to test someone else's PR locally — faster than manually adding a remote and fetching.
- Dependabot version updates (not just security updates) prevent the slow accumulation of technical debt from outdated dependencies — enable it even when nothing is currently flagged as vulnerable.

---

## Summary

- Branch protection + required status checks + required reviews on `main` is the non-negotiable baseline for any serious repository.
- Pull requests are GitHub's core collaboration unit — drafts, templates, CODEOWNERS, and a consistent merge strategy make the workflow scale.
- GitHub Packages hosts Docker/npm/Maven packages tied to repo permissions — `ghcr.io` is the default for container images.
- GitHub Advanced Security (Dependabot, CodeQL, secret scanning) shifts security left directly into the PR workflow.
- GitHub Projects gives lightweight Kanban/table/roadmap views linked to issues and PRs — good for small-to-mid teams, without leaving GitHub.
- `gh` CLI and the REST/GraphQL APIs let you automate anything the UI can do — essential for building internal tooling and bots.
- Environments add approval gates, branch restrictions, and scoped secrets specifically for deployment targets.
