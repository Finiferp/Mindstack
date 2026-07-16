---
title: "Collaboration"
sidebar_label: "Collaboration"
sidebar_position: 5
---

# Collaboration

Git's collaboration model is built around remotes, pull requests, and code review. This page covers how teams use Git together effectively.

---

## Remotes

A remote is a named reference to another Git repository — usually on GitHub, GitLab, or Bitbucket.

```bash
# View remotes
git remote -v
# origin  git@github.com:user/repo.git (fetch)
# origin  git@github.com:user/repo.git (push)

# Add a remote
git remote add origin git@github.com:user/repo.git
git remote add upstream git@github.com:original/repo.git  # for forks

# Rename / remove a remote
git remote rename origin old-origin
git remote remove upstream

# Change remote URL (e.g. switch from HTTPS to SSH)
git remote set-url origin git@github.com:user/repo.git

# Fetch remote info (download objects and refs without merging)
git fetch origin              # fetch all branches from origin
git fetch origin main         # fetch only main
git fetch --all               # fetch from all remotes
git fetch --prune             # also remove deleted remote tracking branches locally
```

---

## Push and Pull

```bash
# Push local commits to remote
git push origin main                    # push main to origin
git push                                # push current branch (if tracking set up)
git push -u origin feature-login       # push + set upstream tracking (-u = --set-upstream)
git push --all                          # push all local branches
git push origin --tags                  # push all tags
git push origin v1.0                   # push a specific tag

# Force push (DANGER — rewrites remote history)
git push --force origin feature         # dangerous: overwrites remote with local
git push --force-with-lease origin feature  # safer: fails if remote has new commits you haven't seen

# Delete remote branch
git push origin --delete feature-login

# Pull = fetch + merge (or fetch + rebase if pull.rebase=true)
git pull                                # pull from tracked upstream
git pull origin main                    # pull specific remote branch
git pull --rebase                       # pull with rebase instead of merge
git pull --ff-only                      # only if fast-forward possible (safe CI pattern)
```

---

## Pull Requests / Merge Requests

A Pull Request (GitHub) or Merge Request (GitLab) is a proposal to merge one branch into another, with code review built in.

```
Typical PR workflow:
  1. Push feature branch to remote
  2. Open PR on GitHub/GitLab: base = main, compare = feature-branch
  3. Write description: what, why, how to test
  4. Request reviewers
  5. Reviewers: read diff, leave comments, approve or request changes
  6. Author: address feedback with new commits (or force-push after amending)
  7. CI: automated tests run on the branch
  8. Once approved + CI green: merge the PR
  9. Delete the feature branch (GitHub can do this automatically)

PR description best practice:
  ## What
  Brief description of the change

  ## Why
  The problem this solves or feature this adds

  ## How to test
  Steps to manually verify the change

  ## Screenshots (if UI change)

  ## Related issues
  Closes #123
```

---

## Code Review

```
What makes a good code review:

For authors:
  Keep PRs small (< 400 lines changed is ideal)
  One PR per logical change (not "fix 10 things")
  Write a clear description — don't make reviewers guess
  Respond to every comment (even if just "done" or "won't fix because...")
  Don't take feedback personally

For reviewers:
  Review the logic first, not the style (let linters handle style)
  Ask questions rather than making demands ("What happens if X?" vs "Change this to Y")
  Distinguish: nitpick (optional) vs must-fix (blocking)
  Approve when it's good enough, not perfect
  Be timely — blocking PRs block others

GitHub review types:
  Comment: general feedback, no decision
  Approve: LGTM (looks good to me), ready to merge
  Request changes: blocking — author must address before merge

Useful review shortcuts:
  GitHub: 'r' to start review, 'n'/'p' to navigate files
  Leave suggestions: GitHub "Suggested changes" feature lets you
    propose exact code edits that the author can apply with one click
```

---

## Forking Workflow

Used for open-source contribution: you don't have push access to the original repo.

```bash
# 1. Fork on GitHub (creates your own copy at github.com/you/repo)

# 2. Clone YOUR fork
git clone git@github.com:you/repo.git
cd repo

# 3. Add the original as 'upstream'
git remote add upstream git@github.com:original/repo.git
git remote -v
# origin    git@github.com:you/repo.git (fetch)
# origin    git@github.com:you/repo.git (push)
# upstream  git@github.com:original/repo.git (fetch)
# upstream  git@github.com:original/repo.git (push)

# 4. Create a feature branch
git switch -c fix/typo-in-readme

# 5. Make changes, commit, push to YOUR fork
git commit -am "fix: correct typo in README"
git push -u origin fix/typo-in-readme

# 6. Open PR: from you/repo:fix/typo-in-readme → original/repo:main

# 7. Keep your fork in sync with upstream
git fetch upstream
git switch main
git merge upstream/main   # or: git rebase upstream/main
git push origin main      # update your fork's main too
```

---

## Resolving Diverged Branches

```bash
# Your local main and origin/main have both advanced (you committed locally
# AND someone pushed to origin — common when you forget to pull first)

git pull origin main
# CONFLICT or: "Your branch and 'origin/main' have diverged"

# Option 1: merge (creates a merge commit)
git pull --no-rebase origin main

# Option 2: rebase (replay your commits on top of origin/main — cleaner)
git pull --rebase origin main

# Option 3: fetch first, then decide
git fetch origin
git log --oneline --graph --all    # visualize the divergence
git rebase origin/main             # rebase local commits onto remote
# or
git merge origin/main              # merge remote into local
```

---

## GitHub-Specific Features

```bash
# Checking out a PR locally (to test someone else's PR)
git fetch origin pull/123/head:pr-123
git switch pr-123

# Or with GitHub CLI:
gh pr checkout 123

# Creating a PR from CLI
gh pr create --title "feat: add dark mode" --body "Adds dark mode toggle" --base main

# Viewing PR status
gh pr status
gh pr list
gh pr view 123

# Merging strategies on GitHub:
# 1. Merge commit: creates merge commit (default)
# 2. Squash and merge: squashes all PR commits into one (clean main history)
# 3. Rebase and merge: replays commits linearly (no merge commit)
#
# Most teams pick ONE strategy and enforce it consistently
# Recommendation: "Squash and merge" for feature branches → clean main history
```

---

## Tips

- `git push --force-with-lease` instead of `--force` — it refuses to push if the remote has commits you haven't seen yet, preventing you from silently overwriting someone else's work.
- Keep PRs small and focused — a 50-line PR gets reviewed in 5 minutes; a 2,000-line PR sits for days and gets rubber-stamped.
- Fetch regularly even when you're not merging: `git fetch --prune` updates your view of the remote and removes stale tracking branches.
- When reviewing, use GitHub's "Suggested changes" feature for small fixes — the author can apply them with one click without needing to interpret your comment.
- Set up branch protection so that `main` always requires at least one approval and green CI — this is a 2-minute setup that prevents a huge class of mistakes.

---

## Summary

- A remote is a named URL to another repo; `origin` is the convention for the main remote; `upstream` for the source repo when forking.
- `git push -u origin branch` pushes and sets the tracking relationship — future `git push`/`git pull` need no arguments.
- `git push --force-with-lease` is the safe version of force push — always prefer it over `--force`.
- Pull Requests are Git's collaboration mechanism — small PRs, clear descriptions, and timely reviews keep velocity high.
- Forking workflow: clone your fork, add upstream remote, sync via `fetch upstream` + `merge/rebase`, PR from your fork to upstream.
- `git pull --rebase` keeps history linear; `git pull` (merge) preserves the parallel work — pick one and be consistent.
