---
title: "Remotes and Synchronization"
sidebar_label: "Remotes"
sidebar_position: 6
---

# Remotes and Synchronization

Remotes are the mechanism for sharing repositories across machines and teams. Understanding how remote tracking branches work makes fetch, pull, and push predictable.

---

## Remote Tracking Branches

When you clone or fetch, Git creates **remote tracking branches** — read-only local references that mirror the state of the remote at the time of last fetch.

```bash
# List remote tracking branches
git branch -r
# origin/main
# origin/feature-login
# origin/HEAD -> origin/main

# They live in .git/refs/remotes/origin/
# You CANNOT commit directly to origin/main (it's read-only)
# It only updates when you fetch or pull

# See all branches with tracking info
git branch -vv
# * main        abc1234 [origin/main] Last commit message
#   feature     def5678 [origin/feature: ahead 2] ...
#              ↑ shows how many commits ahead/behind vs remote

# Ahead = commits you have locally not pushed yet
# Behind = commits on remote you haven't pulled yet
```

---

## Fetch vs Pull vs Push — Exactly What Happens

```
git fetch origin:
  1. Connects to origin
  2. Downloads any new objects (commits, trees, blobs)
  3. Updates remote tracking branches (origin/main → new SHA)
  4. Your local branches are UNTOUCHED
  5. Safe to run any time — no working tree changes

git pull origin main:
  = git fetch origin main
  + git merge origin/main  (or rebase if pull.rebase=true)
  Merges (or rebases) the remote changes into your current local branch

git push origin main:
  1. Connects to origin
  2. Sends local objects origin doesn't have
  3. Asks origin to update its 'main' ref to your local main's SHA
  4. Origin accepts IF your push is a fast-forward (no conflict)
  5. Origin rejects if it has commits your local doesn't — "non-fast-forward"
     (you need to pull/fetch first, then push again)
```

---

## Tracking Relationships

```bash
# Set up tracking when creating a branch
git push -u origin feature-x    # -u = --set-upstream

# Set tracking on an existing branch
git branch --set-upstream-to=origin/main main
git branch -u origin/feature feature   # shorthand

# Remove tracking
git branch --unset-upstream

# Push to a different remote branch name (rare)
git push origin local-branch:remote-branch-name

# Pull from a different remote branch
git pull origin main:local-main
```

---

## Multiple Remotes

```bash
# Common scenario: forked repo with both your fork and the original
git remote -v
# origin    git@github.com:you/project.git     (your fork)
# upstream  git@github.com:org/project.git     (original)

# Fetch from all remotes
git fetch --all

# Sync your fork's main with upstream's main
git fetch upstream
git switch main
git rebase upstream/main    # or: git merge upstream/main
git push origin main        # update your fork

# Another scenario: deploy to multiple servers
git remote add staging  git@staging.example.com:repo.git
git remote add production git@prod.example.com:repo.git
git push staging main
git push production main
```

---

## Remote Branch Management

```bash
# Create a remote branch (just push a local branch)
git push origin feature-x           # creates origin/feature-x

# Track a remote branch that exists but isn't local yet
git switch --track origin/feature-x
# or: git checkout -b feature-x origin/feature-x

# Delete a remote branch
git push origin --delete feature-x
git push origin :feature-x          # older syntax (colon prefix = delete)

# Clean up stale remote tracking refs
# (when remote branches are deleted but local tracking refs remain)
git fetch --prune                   # prune on fetch
git remote prune origin             # prune manually
git fetch -p                        # shorthand for --prune

# Check which local branches have no remote counterpart
git branch -vv | grep ': gone]'     # [origin/feature: gone] = remote was deleted
```

---

## Refspecs

A refspec is the specification of which refs map between local and remote — the full form of what `git push/fetch` does.

```bash
# Format: [+]<src>:<dst>
# + means allow non-fast-forward updates

# Push local main to remote main
git push origin refs/heads/main:refs/heads/main
# Shorthand: git push origin main:main
# Shorthand: git push origin main  (when names match)

# Fetch: remote main → local origin/main
git fetch origin refs/heads/main:refs/remotes/origin/main

# Fetch a PR from GitHub without checking out (useful for testing)
git fetch origin pull/123/head:pr-123
# Now you have a local branch pr-123 pointing to the PR's head commit

# Push to a differently named remote branch
git push origin main:staging-deploy

# In .git/config, refspecs are stored automatically after 'git remote add':
# [remote "origin"]
#   url = git@github.com:user/repo.git
#   fetch = +refs/heads/*:refs/remotes/origin/*
#   (meaning: fetch all remote branches to local remote tracking branches)
```

---

## SSH Keys for GitHub / GitLab

```bash
# Generate an Ed25519 key (preferred over RSA for new keys)
ssh-keygen -t ed25519 -C "alice@example.com"
# Saves to: ~/.ssh/id_ed25519 (private) and ~/.ssh/id_ed25519.pub (public)

# Start ssh-agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub    # copy output

# Add to GitHub: Settings → SSH and GPG keys → New SSH key → paste

# Test connection
ssh -T git@github.com
# Hi alice! You've successfully authenticated...

# Multiple GitHub accounts (personal + work):
# ~/.ssh/config:
# Host github-work
#   HostName github.com
#   User git
#   IdentityFile ~/.ssh/id_ed25519_work
#
# Host github-personal
#   HostName github.com
#   User git
#   IdentityFile ~/.ssh/id_ed25519_personal

# Use with:
# git clone git@github-work:company/repo.git
# git remote set-url origin git@github-personal:you/repo.git
```

---

## HTTPS vs SSH

| | SSH | HTTPS |
|---|---|---|
| Auth | SSH key (no password per push) | Username + PAT (or credential manager) |
| Firewall | Port 22 (may be blocked) | Port 443 (almost never blocked) |
| Setup | Generate key, add to GitHub | Generate PAT, configure credential manager |
| Recommended | Yes (for regular use) | When SSH is blocked |

```bash
# Switch remote from HTTPS to SSH
git remote set-url origin git@github.com:user/repo.git

# Or stay on HTTPS with a credential manager (macOS keychain, Windows Credential Manager)
git config --global credential.helper osxkeychain    # macOS
git config --global credential.helper manager        # Windows (Git for Windows)
git config --global credential.helper store          # Linux (stores in plaintext — not ideal)
```

---

## Tips

- `git fetch` is always safe — it never touches your working tree or local branches. Run it before any merge or rebase to ensure you have the latest remote state.
- `git branch -vv` is your at-a-glance view of ahead/behind status for all local branches — great for seeing what needs pushing or pulling.
- After deleting remote branches (e.g. after merging PRs), run `git fetch --prune` to remove the stale `origin/feature-x` remote tracking refs locally.
- Use SSH keys for Git operations — typing passwords or managing Personal Access Tokens manually gets old fast. One key setup, zero friction afterward.
- If `git push` is rejected with "non-fast-forward," the fix is always: `git fetch` first, then `git rebase origin/main` (or merge), then push again.

---

## Summary

- Remote tracking branches (`origin/main`) are read-only snapshots of the remote at last fetch — they only update on `git fetch`/`git pull`.
- `git fetch` is safe (no working tree changes); `git pull` = fetch + merge/rebase; `git push` sends commits and updates the remote ref.
- `git push -u` sets the tracking relationship — then `git push`/`git pull` need no arguments on that branch.
- `git fetch --prune` removes local remote tracking refs for branches deleted on the remote.
- Refspecs define the src:dst mapping for push/fetch; `git fetch origin pull/123/head:pr-123` is how to check out a PR locally.
- SSH keys are the standard for authenticating to GitHub/GitLab — generate once with Ed25519, add public key to the platform, done.
