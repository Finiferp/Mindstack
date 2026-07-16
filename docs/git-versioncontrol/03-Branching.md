---
title: "Branching"
sidebar_label: "Branching"
sidebar_position: 3
---

# Branching

Branches are Git's killer feature. They let you isolate work, experiment safely, and collaborate without stepping on each other. Because a branch is just a pointer (a file containing a SHA), creating one is instant and free.

---

## Branch Basics

```bash
# List branches
git branch              # local branches (* = current)
git branch -r           # remote tracking branches
git branch -a           # all (local + remote)
git branch -v           # with last commit SHA and message

# Create a branch (doesn't switch to it)
git branch feature-login

# Create and switch in one step (preferred)
git switch -c feature-login       # modern (Git 2.23+)
git checkout -b feature-login     # classic equivalent

# Switch branches
git switch main
git checkout main       # classic equivalent

# Create a branch from a specific commit or tag
git switch -c hotfix/v1.1 v1.0
git switch -c experiment abc1234

# Delete a branch
git branch -d feature-login     # safe delete (only if merged)
git branch -D feature-login     # force delete (even if not merged)
git push origin --delete feature-login  # delete remote branch

# Rename a branch
git branch -m old-name new-name
git branch -m new-name            # rename current branch
```

---

## How Branching Works Internally

```
Before branching:

  A ← B ← C   ← main, HEAD

After: git switch -c feature

  A ← B ← C   ← main
            ↑
           HEAD, feature    (both point to same commit C)

After two commits on feature:

  A ← B ← C ← D ← E   ← feature, HEAD
            ↑
           main

main has not moved. feature has advanced. They diverge at C.
```

---

## Merging

Merging integrates the work from one branch into another.

### Fast-Forward Merge

```bash
# If the target branch hasn't moved since the feature branch started,
# Git simply moves the pointer forward — no merge commit needed.

git switch main
git merge feature-login

# Before:  main → C;  feature-login → C → D → E
# After:   main → E  (fast-forward — pointer just moved)

# Force a merge commit even when fast-forward is possible (keeps history explicit)
git merge --no-ff feature-login
```

### Three-Way Merge

```bash
# When both branches have diverged, Git needs a merge commit.
# Git finds the common ancestor and combines both sets of changes.

#  A ← B ← C ← D (main)
#             ↑
#             └── E ← F (feature)

git switch main
git merge feature

# Creates a merge commit M with two parents: D and F
#  A ← B ← C ← D ← M  (main)
#             ↑       ↑
#             └── E ← F

# The merge commit message auto-fills: "Merge branch 'feature' into main"
# You can edit it with: git merge --edit
```

### Resolving Merge Conflicts

```bash
# Conflict: both branches modified the same lines in the same file

git merge feature
# CONFLICT (content): Merge conflict in src/app.js
# Automatic merge failed; fix conflicts and then commit the result.

# Conflict markers in src/app.js:
# <<<<<<< HEAD            ← your current branch's version
# const port = 3000;
# =======                 ← separator
# const port = 8080;
# >>>>>>> feature         ← incoming branch's version

# Steps to resolve:
# 1. Edit the file — remove the markers, keep the correct code
# 2. Stage the resolved file
git add src/app.js

# 3. Complete the merge
git commit

# Abort a merge in progress (go back to pre-merge state)
git merge --abort

# Tools for conflict resolution
git mergetool               # opens configured merge tool (VS Code, vimdiff, etc.)

# VS Code: configure as merge tool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# View conflicts only
git diff --name-only --diff-filter=U   # list conflicted files
```

---

## Cherry-Picking

Apply a specific commit from one branch onto another without merging the whole branch.

```bash
# Apply commit abc1234 to current branch
git cherry-pick abc1234

# Cherry-pick a range of commits
git cherry-pick abc1234..def5678   # from abc1234 (exclusive) to def5678 (inclusive)
git cherry-pick abc1234^..def5678  # include abc1234 (use ^ to make it inclusive)

# Cherry-pick without committing (stage the changes for review first)
git cherry-pick -n abc1234         # --no-commit

# Cherry-pick with a custom message
git cherry-pick -e abc1234         # --edit: opens editor for commit message

# When cherry-pick conflicts:
git cherry-pick --continue         # after resolving conflicts
git cherry-pick --abort            # cancel

# Use case: a bug is fixed on main; you need the fix on a release branch too
git switch release/1.x
git cherry-pick abc1234            # bring just the fix
```

---

## Squash Merging

Combines all commits from a feature branch into one commit on the target.

```bash
# All feature branch commits (A, B, C) become one commit on main
git switch main
git merge --squash feature-login
git commit -m "feat: add login feature"

# Result: one clean commit on main; feature branch history discarded
# Good for: keeping main history clean when feature branch had messy "WIP" commits
# Bad for: losing the detailed history of how the feature was built
```

---

## Branch Naming Conventions

```
Common patterns:
  feature/<name>     feature/user-authentication
  fix/<name>         fix/null-pointer-login
  hotfix/<name>      hotfix/critical-payment-bug
  release/<version>  release/1.2.0
  chore/<name>       chore/upgrade-dependencies
  docs/<name>        docs/api-reference
  experiment/<name>  experiment/new-caching-layer

Rules:
  Use lowercase and hyphens (not underscores or spaces)
  Keep it short but descriptive
  Include ticket/issue number if using a tracker:
    feature/JIRA-123-user-auth
    fix/GH-456-null-pointer
```

---

## Branch Protection (GitHub / GitLab)

```
In real teams, main/master is protected:
  Require pull request reviews before merging (1-2 approvals)
  Require status checks to pass (CI must be green)
  Require branches to be up to date before merging
  Disallow force pushes to main
  Disallow deletion of main

This ensures:
  No one accidentally pushes directly to main
  Every change is reviewed
  CI passes before anything lands on main

Configure in: GitHub → repo Settings → Branches → Branch protection rules
```

---

## Tips

- `git switch -c` is the modern command for creating and switching branches — prefer it over `git checkout -b` for new work.
- Delete branches after merging — keep the branch list clean. GitHub can do this automatically after PR merge.
- When a merge conflict is confusing, `git log --merge` shows the commits that caused the conflict.
- `git merge --no-ff` creates an explicit merge commit even on fast-forwards — useful on `main` to preserve a clear record of when features landed.
- Cherry-pick creates a new commit with a new SHA, even though the content is the same — the original commit on the source branch still exists.

---

## Summary

- A branch is a file containing a commit SHA — instant and free to create; delete after merging.
- Fast-forward merge: pointer just moves forward (no divergence). Three-way merge: creates a merge commit (branches diverged).
- Conflict resolution: edit conflict markers in files → `git add` → `git commit` (or `git merge --abort` to cancel).
- Cherry-pick applies a specific commit from anywhere onto the current branch — useful for backporting fixes.
- `git merge --squash` collapses a branch's entire history into one commit — good for cleaning up messy feature work.
- Use branch protection rules on `main` in team projects — require PR reviews and CI passing before merge.
