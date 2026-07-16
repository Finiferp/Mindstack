---
title: "Git Workflows"
sidebar_label: "Workflows"
sidebar_position: 7
---

# Git Workflows

A Git workflow is a team agreement on how branches are named, how code flows from development to production, and when merges happen. Choosing the right workflow for your team size and release cadence matters more than which specific commands you use.

---

## The Four Major Workflows

| Workflow | Best for | Release cadence | Complexity |
|---|---|---|---|
| GitHub Flow | Web apps, SaaS, continuous delivery | Continuous | Low |
| Trunk-Based Development | High-velocity teams, CI/CD mature | Continuous | Low-Medium |
| Gitflow | Versioned software, scheduled releases | Periodic (semver) | High |
| GitLab Flow | Mix of environment branches + features | Flexible | Medium |

---

## GitHub Flow

The simplest effective workflow. One rule: `main` is always deployable.

```
main ──────────────────────────────────────────────► (always deployable)
       │                             ▲
       └── feature-branch ──────────┘
           (short-lived; PR → review → merge → delete)
```

```
Steps:
  1. Pull latest main
  2. Create a feature branch from main
  3. Commit your changes (push regularly for backup)
  4. Open a Pull Request when ready
  5. Discuss and review
  6. Deploy from the branch to staging (optional — test before merging)
  7. Merge PR into main
  8. Deploy main to production
  9. Delete the branch

Rules:
  Anything in main is deployable at any time
  Never commit directly to main
  Open a PR early (draft PR for WIP — signals intent and enables early feedback)
  Deploy and test before merging when possible
```

```bash
# GitHub Flow in practice
git switch main
git pull
git switch -c feature/add-dark-mode
# ... work, commit ...
git push -u origin feature/add-dark-mode
# open PR on GitHub → review → merge → delete branch

git switch main
git pull                        # get the merged changes
git branch -d feature/add-dark-mode   # clean up local branch
```

---

## Trunk-Based Development (TBD)

Everyone commits to `main` (the "trunk") directly or via very short-lived branches (1-2 days max). Requires strong CI/CD and feature flags.

```
main ─── A ─── B ─── C ─── D ─── E ─── F ──► (always releasable)
               ↑         ↑
          short branch  short branch
          (merged in    (merged in
           < 2 days)     < 2 days)
```

```
Key practices:
  Branches live hours to 2 days maximum — forces small, focused changes
  Feature flags: incomplete features hidden behind a flag (not a branch)
  Continuous integration: every commit triggers automated tests
  High test coverage: confidence to merge frequently to trunk

  Feature flag example:
    if (featureFlags.darkMode) {
      renderDarkMode();
    }
  The code ships but the feature is off — you can enable it per-user

Why TBD works at scale:
  Google, Facebook, Microsoft all use TBD internally
  Eliminates long-lived branch merge conflicts (the "integration hell" problem)
  Forces small incremental changes (better for review, rollback, debugging)

When NOT to use TBD:
  Team without mature CI/CD (need tests to trust trunk is green)
  Open-source projects with external contributors (no trust to commit to trunk)
  Products with complex versioned release requirements
```

---

## Gitflow

Designed by Vincent Driessen (2010) for software with versioned releases (libraries, desktop apps, mobile apps with app store cycles).

```
main     ─── v1.0 ─────────────────────────── v1.1 ─── v2.0 ──►
              │                                 │         │
develop  ──── ●──────────────────────────────── ●─────── ●────►
              │                     │           │
feature  ─────┴── feature-a ────────┘           │
                         │                      │
release  ────────────────┴── release/1.1 ───────┘
                                   │
hotfix   ────────────────────────── hotfix/1.0.1 ───────────────►
                                        │
                                   (merged to main + develop)
```

### Gitflow Branch Types

```
main (or master):
  Only production releases
  Every commit is tagged with a version number
  NEVER commit directly here

develop:
  Integration branch for features
  Always contains latest delivered development changes
  This is what CI builds and tests constantly

feature/* branches:
  Branch from: develop
  Merge back to: develop
  For: new features
  Convention: feature/user-auth, feature/dark-mode

release/* branches:
  Branch from: develop
  Merge back to: main AND develop
  For: release preparation (bump version, fix bugs, no new features)
  Convention: release/1.2.0

hotfix/* branches:
  Branch from: main (!) — you need to fix production NOW
  Merge back to: main AND develop (both must get the fix)
  Convention: hotfix/1.1.1
  This is the only time you branch from main directly
```

```bash
# Gitflow with the gitflow CLI extension (simplifies the workflow)
git flow init               # sets up branch structure

# Feature
git flow feature start user-auth
# ... work ...
git flow feature finish user-auth    # merges to develop, deletes feature branch

# Release
git flow release start 1.2.0
# bump version number, update changelog
git flow release finish 1.2.0        # merges to main + develop, tags main

# Hotfix
git flow hotfix start 1.1.1
# fix the bug
git flow hotfix finish 1.1.1         # merges to main + develop, tags main

# Manual equivalent (without gitflow CLI):
git switch -c feature/user-auth develop
# ... work ...
git switch develop
git merge --no-ff feature/user-auth
git branch -d feature/user-auth
```

### Gitflow Pros and Cons

```
Pros:
  Clear structure for parallel versions (still supporting v1.x while v2.x is in development)
  Hotfixes go directly to production without carrying unfinished features
  Works well for app stores / package releases with approval delays

Cons:
  Complex — two long-lived branches, four branch types, merge rules
  Slow — features can sit in develop for weeks before release
  Merge conflicts compound over time on develop
  Overkill for most web applications (use GitHub Flow instead)
```

---

## GitLab Flow

A pragmatic middle ground — adds environment branches to GitHub Flow.

```
feature ──► main ──► staging ──► production
                  (auto-deploy) (manual promote)

Or for versioned releases:
feature ──► main ──► stable-1.x ──► stable-2.x
```

```
Principles:
  Downstream branches (staging, production) only receive merges from upstream
  A feature goes: feature branch → main → staging → production
  Never cherry-pick between environment branches (everything flows downstream)
  Use tags to mark releases (not dedicated release branches)

Environment branches:
  main:       latest development; auto-deploys to staging
  production: what's live; merge from main to promote a release
  stable/1.x: maintained old versions (for hotfixes)
```

---

## Choosing a Workflow

```
"Is main always deployable?" → Yes and you deploy often → GitHub Flow or TBD
"Do you have versioned releases with long support windows?" → Gitflow
"Do you have multiple environments (staging, prod)?" → GitLab Flow
"Is your team 2-5 people, early stage?" → GitHub Flow (keep it simple)
"Are you Google-scale with 1000+ engineers?" → Trunk-Based Development

Decision table:
  Web app / SaaS / API:           GitHub Flow or TBD
  Library / package / CLI tool:   Gitflow
  Mobile app (app store cycle):   Gitflow
  Internal tool / microservice:   GitHub Flow
  Open source project:            Gitflow or GitHub Flow
```

---

## Release Tagging

Regardless of workflow, tag releases on `main`:

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
# MAJOR: breaking changes
# MINOR: new features (backward compatible)
# PATCH: bug fixes

# Create annotated tag (recommended for releases)
git tag -a v1.2.0 -m "Release 1.2.0 — adds dark mode and fixes login bug"
git push origin v1.2.0        # push the tag
git push origin --tags         # push all tags

# List tags
git tag                        # all tags
git tag -l "v1.*"              # filter pattern

# Check what's in a release
git show v1.2.0                # tag details + tagged commit
git log v1.1.0..v1.2.0 --oneline  # what changed between releases

# Delete a tag (if you made a mistake)
git tag -d v1.2.0              # delete local
git push origin --delete v1.2.0  # delete remote
```

---

## Tips

- GitHub Flow is right for most teams — simple, effective, and keeps `main` always shippable. Add Gitflow complexity only when you genuinely need it.
- Trunk-Based Development requires discipline and strong automated testing — don't adopt it without CI/CD in place, or `main` will constantly be broken.
- If using Gitflow, consider the `git-flow` CLI extension — it enforces the workflow rules and reduces manual mistakes.
- Always use **annotated** tags for releases (`-a` flag) — they include the tagger's name, date, and message, and can be signed with GPG.
- Environment branches (GitLab Flow) are a good pattern when you need a staging server that doesn't auto-deploy every commit from main.

---

## Summary

- GitHub Flow: `main` is always deployable; feature branches are short-lived; merge via PR. Best for continuous delivery.
- Trunk-Based Development: everyone commits to `main` (or merges in hours); features hidden by flags; requires mature CI/CD.
- Gitflow: `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`; best for versioned software with periodic releases.
- GitLab Flow: adds environment branches (`main` → `staging` → `production`); code flows only downstream.
- Annotated tags mark releases: `git tag -a v1.2.0 -m "..."` + `git push origin --tags`.
- When in doubt: use GitHub Flow — it's the simplest workflow that works for teams of any size.
