---
title: "Advanced Git"
sidebar_label: "Advanced"
sidebar_position: 8
---

# Advanced Git

Power features for complex scenarios: submodules, worktrees, hooks, bisect, reflog recovery, signing, and more.

---

## Git Bisect — Finding the Bug-Introducing Commit

Bisect performs a binary search through commit history to find exactly which commit introduced a bug.

```bash
# You know: HEAD is broken, v1.0 was fine
git bisect start
git bisect bad                  # current commit is bad
git bisect good v1.0            # this tag/commit was good

# Git checks out the midpoint commit
# Test whether the bug exists:
#   if YES: git bisect bad
#   if NO:  git bisect good

git bisect bad                  # midpoint is bad → bug is in first half
# Git checks out another midpoint...
git bisect good                 # this one is fine → bug is in second half
# ... repeat 6-8 times (binary search: log2(N) steps for N commits)

# Git announces: "abc1234 is the first bad commit"
git show abc1234                # see exactly what changed

# End the bisect session
git bisect reset                # returns to original HEAD

# Automated bisect with a test script
git bisect start
git bisect bad HEAD
git bisect good v1.0
git bisect run npm test         # runs npm test; exit 0 = good, exit 1 = bad
# Git finds the first bad commit automatically
```

---

## Reflog — Recovering "Lost" Work

The reflog records every position HEAD has ever been at. It's your safety net.

```bash
# View the reflog
git reflog
# abc1234 HEAD@{0}: commit: feat: add dark mode
# def5678 HEAD@{1}: checkout: moving from feature to main
# ghi9012 HEAD@{2}: reset: moving to HEAD~3
# jkl3456 HEAD@{3}: commit: WIP: half done

# Recover a commit after accidental reset --hard
git reset --hard HEAD~3         # oops — lost 3 commits
git reflog                      # find the SHA before the reset
git reset --hard abc1234        # restore to that SHA

# Recover a deleted branch
git branch -D my-feature        # oops — deleted unmerged branch
git reflog                      # find the tip commit SHA
git switch -c my-feature abc1234  # recreate the branch

# Recover a dropped stash
git stash drop                  # oops
git reflog stash                # stash has its own reflog
git stash apply stash@{2}       # apply it again

# Reflog is LOCAL — it doesn't exist on remotes
# Reflog entries expire after 90 days (configurable)
git config gc.reflogExpire 180.days
```

---

## Git Worktrees — Multiple Working Trees

Worktrees let you check out multiple branches simultaneously in different directories — without cloning again.

```bash
# Add a worktree for a different branch
git worktree add ../hotfix-1.1 hotfix/1.1
# Now: ./           ← main branch (original)
#      ../hotfix-1.1 ← hotfix/1.1 branch

# Work in the hotfix directory simultaneously
cd ../hotfix-1.1
# make changes, commit — completely independent working tree

# List worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../hotfix-1.1

# Create worktree with a new branch
git worktree add -b experiment/new-idea ../experiment main

# Use case: you're mid-feature and an urgent hotfix arrives
# No need to stash — just add a worktree for the hotfix branch
# Work on both simultaneously, then remove the hotfix worktree when done
```

---

## Submodules — Repos Inside Repos

A submodule embeds another Git repository at a specific commit inside your repo.

```bash
# Add a submodule
git submodule add https://github.com/org/library.git libs/library
# Creates: .gitmodules file + libs/library/ directory (pinned to a commit)

# .gitmodules:
# [submodule "libs/library"]
#   path = libs/library
#   url = https://github.com/org/library.git

# Clone a repo with submodules
git clone --recurse-submodules https://github.com/org/project.git
# or after a regular clone:
git submodule update --init --recursive

# Update a submodule to its latest commit
cd libs/library
git fetch && git checkout main
cd ../..
git add libs/library
git commit -m "chore: update library submodule to latest"

# Update all submodules
git submodule update --remote --merge

# Remove a submodule (3 steps)
git submodule deinit libs/library
git rm libs/library
rm -rf .git/modules/libs/library

# Submodule pitfalls:
# The parent repo stores a specific COMMIT SHA of the submodule
# Cloners must remember --recurse-submodules
# Updates to the submodule must be explicitly pulled and committed in parent
# Consider: git subtree or a package manager as simpler alternatives
```

---

## Git Hooks

Hooks are scripts that run automatically at specific Git lifecycle events. They live in `.git/hooks/`.

```bash
# Hook scripts — make executable (chmod +x)
ls .git/hooks/
# pre-commit.sample
# commit-msg.sample
# pre-push.sample
# post-merge.sample
# prepare-commit-msg.sample
# ... etc

# Remove .sample to activate a hook
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Common Hooks

```bash
# ── pre-commit: run before commit is created ──────────────────────────────────
# Use: linting, formatting, tests on staged files
#!/bin/sh
# .git/hooks/pre-commit

# Run ESLint on staged JS files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep '\.js$')
if [ -n "$STAGED" ]; then
  npx eslint $STAGED
  if [ $? -ne 0 ]; then
    echo "ESLint failed. Fix errors before committing."
    exit 1   # non-zero exit aborts the commit
  fi
fi

# Run Prettier check
npx prettier --check $STAGED
if [ $? -ne 0 ]; then
  echo "Run 'npx prettier --write' to fix formatting"
  exit 1
fi

# ── commit-msg: validate commit message format ────────────────────────────────
#!/bin/sh
# .git/hooks/commit-msg
COMMIT_MSG=$(cat "$1")
PATTERN="^(feat|fix|docs|style|refactor|test|chore|revert)(\(.+\))?: .{1,72}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "Invalid commit message format."
  echo "Use: feat(scope): message (Conventional Commits)"
  exit 1
fi

# ── pre-push: run tests before push ──────────────────────────────────────────
#!/bin/sh
# .git/hooks/pre-push
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Fix before pushing."
  exit 1
fi

# ── post-merge: install dependencies after pull ───────────────────────────────
#!/bin/sh
# .git/hooks/post-merge
# Run when: git merge or git pull with new commits
CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)
if echo "$CHANGED" | grep -q "package.json"; then
  echo "package.json changed — running npm install"
  npm install
fi
```

### Sharing Hooks with the Team

```bash
# Problem: .git/hooks/ is not tracked by Git
# Solution 1: Husky (Node.js projects)
npm install --save-dev husky
npx husky install                  # sets up .husky/ directory (IS tracked by git)
npx husky add .husky/pre-commit "npm test"
npx husky add .husky/commit-msg "npx commitlint --edit $1"

# package.json:
# "scripts": { "prepare": "husky install" }
# prepare runs on npm install → hooks set up automatically for all team members

# Solution 2: Set hooksPath in config
git config core.hooksPath .githooks   # point to a tracked directory
# Store hooks in .githooks/ (tracked by git), not .git/hooks/

# Solution 3: pre-commit framework (Python-based, any language)
pip install pre-commit
# .pre-commit-config.yaml:
# repos:
#   - repo: https://github.com/pre-commit/pre-commit-hooks
#     rev: v4.5.0
#     hooks:
#       - id: trailing-whitespace
#       - id: end-of-file-fixer
#       - id: check-yaml
pre-commit install                 # installs the pre-commit hook
pre-commit run --all-files         # run manually on all files
```

---

## Signing Commits with GPG

Signing proves that commits came from you (not someone who has your GitHub password).

```bash
# Generate a GPG key
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, your real name and email

# List your keys
gpg --list-secret-keys --keyid-format=long
# sec   rsa4096/ABC123DEF456 ...

# Configure Git to use your key
git config --global user.signingkey ABC123DEF456
git config --global commit.gpgsign true    # sign all commits automatically

# Sign a single commit (if not auto-signing)
git commit -S -m "feat: signed commit"

# Verify a signed commit
git log --show-signature -1
git verify-commit HEAD

# Add public key to GitHub:
# gpg --armor --export ABC123DEF456
# GitHub → Settings → SSH and GPG keys → New GPG key → paste

# SSH signing (newer, simpler alternative to GPG — Git 2.34+)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

---

## Git Notes

Attach metadata to commits without changing their SHA.

```bash
# Add a note to a commit
git notes add -m "Deployed to production 2025-01-15" HEAD
git notes add -m "Fixes issue #456" abc1234

# View notes
git log --show-notes
git notes show HEAD

# Notes are stored separately from commits (don't change the SHA)
# Push notes to remote (not pushed by default)
git push origin refs/notes/*
git fetch origin refs/notes/*:refs/notes/*
```

---

## Filter-Branch and git-filter-repo

Rewrite history in bulk — dangerous but sometimes necessary.

```bash
# PREFERRED: git-filter-repo (faster, safer than filter-branch)
pip install git-filter-repo

# Remove a file from ALL history (accidentally committed a secret)
git filter-repo --path secrets.env --invert-paths

# Rename a file in all history
git filter-repo --path-rename old-name.js:new-name.js

# Replace sensitive text in all commits
git filter-repo --replace-text replacements.txt
# replacements.txt: literal:my-password==>REDACTED

# After rewriting history: all SHAs change
# Force push required (coordinate with team — destructive!)
git push --force origin main

# Invalidate GitHub's cached views
# Contact GitHub support to remove cached data if sensitive data was leaked
```

---

## Sparse Checkout — Partial Clone

For monorepos where you only need part of the tree.

```bash
# Clone without checking out files
git clone --no-checkout https://github.com/org/monorepo.git
cd monorepo

# Enable sparse checkout
git sparse-checkout init --cone

# Set which directories to check out
git sparse-checkout set packages/my-service shared/utils

# Check out
git checkout main

# Add more paths later
git sparse-checkout add packages/another-service

# Partial clone (skip large blobs until needed)
git clone --filter=blob:none https://github.com/org/monorepo.git
```

---

## Tips

- `git bisect run` with an automated test is dramatically faster than manually answering good/bad — write a small test script that exits 0 on pass and 1 on fail.
- The reflog saves you from almost every "I accidentally destroyed my work" scenario — it keeps 90 days of history by default. Check it before panicking.
- Use Husky for sharing Git hooks in Node.js projects — `.git/hooks/` is not tracked by Git, so hooks defined there are invisible to the rest of the team.
- Never use `git filter-branch` — `git-filter-repo` is faster, safer, and the official recommendation. If you've committed secrets, rotate them immediately even before rewriting history.
- Worktrees are underrated — instead of stashing and switching branches when an urgent fix arrives, just `git worktree add` a second directory.

---

## Summary

- `git bisect` binary-searches through history to find the exact commit that introduced a bug — automate it with `git bisect run`.
- The reflog is HEAD's full position history — it lets you recover from `reset --hard`, deleted branches, and dropped stashes (within ~90 days).
- Worktrees allow multiple branches checked out simultaneously in different directories — no need to stash when switching context.
- Submodules embed a repo at a pinned commit — require `--recurse-submodules` on clone and explicit updates; often replaced by package managers.
- Hooks automate quality gates (pre-commit lint, commit-msg format, pre-push tests) — share them via Husky (Node.js) or a tracked `.githooks/` directory.
- `git-filter-repo` rewrites history to remove secrets or rename files — all SHAs change afterward; coordinate force-push with the team.
