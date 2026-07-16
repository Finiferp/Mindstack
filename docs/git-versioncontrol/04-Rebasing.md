---
title: "Rebasing"
sidebar_label: "Rebasing"
sidebar_position: 4
---

# Rebasing

Rebasing rewrites commit history by replaying commits on top of a different base. It produces a cleaner, linear history compared to merge commits — but comes with rules about when it's safe to use.

---

## What Rebase Does

```
BEFORE rebase:

  A ← B ← C ← D       (main)
            ↑
            └── E ← F  (feature)

git switch feature
git rebase main

AFTER rebase:

  A ← B ← C ← D            (main)
                ↑
                └── E' ← F' (feature — new commits, same changes)

E and F are replayed on top of D.
E' and F' have new SHAs (different parent = different hash).
The original E and F are abandoned (but recoverable via reflog for ~30 days).
```

---

## Basic Rebase

```bash
# Rebase feature branch onto main
git switch feature
git rebase main

# If conflicts occur during rebase:
# 1. Fix the conflict in the file
git add conflicted-file.js
git rebase --continue   # replay next commit

# Abort and go back to pre-rebase state
git rebase --abort

# Skip a conflicting commit (rare — use when the commit is redundant after rebase)
git rebase --skip

# After rebase, merge to main is a fast-forward (no merge commit needed)
git switch main
git merge feature       # fast-forward: main pointer just moves to F'
```

---

## Rebase vs Merge

```
Merge:                           Rebase:
  Preserves full history           Creates linear history
  Non-destructive (no SHA change)  Rewrites SHAs (destructive)
  Adds merge commits               No merge commits
  Shows parallel work clearly      Looks like everything was done sequentially

  A-B-C-D-M (main)                A-B-C-D-E'-F' (main after merge)
          ↗ ↖
         E-F

When to use merge:
  Integrating feature branches into main (especially with PR/MR)
  When you want to preserve the "when did this branch land" history
  On shared/protected branches

When to use rebase:
  Updating a feature branch with latest main changes
  Cleaning up local commits before opening a PR
  Keeping your fork in sync with upstream
  NEVER rebase commits already pushed to a shared branch
```

---

## The Golden Rule of Rebasing

```
NEVER rebase commits that have been pushed to a shared remote branch.

Why: Rebase creates new SHAs. If others have based their work on the
old SHAs, they now have history that doesn't exist in the rewritten repo.

Safe:  rebasing your local feature branch (nobody else has it)
Safe:  rebasing a branch you force-pushed to your own fork
UNSAFE: rebasing main, develop, or any branch others are pulling from

If you break this rule:
  Other developers get "refusing to merge unrelated histories" errors
  The fix involves force-pushes and coordination — painful and disruptive
  In the worst case: lost commits
```

---

## Interactive Rebase

Interactive rebase (`git rebase -i`) lets you rewrite, reorder, squash, and edit commits before sharing them. It's one of Git's most powerful features.

```bash
# Interactively rebase the last 4 commits
git rebase -i HEAD~4

# Interactively rebase everything since branching from main
git rebase -i main

# This opens your editor with a list like:
# pick a1b2c3d feat: add login form
# pick e5f6g7h fix: correct email validation
# pick i9j0k1l WIP: half done
# pick m3n4o5p WIP: more work
# pick q7r8s9t feat: complete login with session

# Commands you can use (replace 'pick'):
# pick   p — keep this commit as-is
# reword r — keep commit, edit the message
# edit   e — keep commit, pause to amend it
# squash s — meld into previous commit, combine messages
# fixup  f — meld into previous commit, discard this message (cleaner than squash)
# drop   d — delete this commit entirely
# reorder  — just move lines to reorder commits
```

### Common Interactive Rebase Operations

```bash
# ─── Squash WIP commits into one clean commit ───────────────────────────────
# Before:
# pick a1b2c3d feat: add user model
# pick e5f6g7h WIP: saving progress
# pick i9j0k1l WIP: more work
# pick m3n4o5p fix: typo

# Change to:
# pick a1b2c3d feat: add user model
# squash e5f6g7h WIP: saving progress
# squash i9j0k1l WIP: more work
# fixup m3n4o5p fix: typo

# Result: one commit "feat: add user model" with all changes combined

# ─── Reword a commit message ─────────────────────────────────────────────────
# pick → reword:
# reword a1b2c3d feat: add user modl   (typo!)
# Git pauses, opens editor → fix the message → save → continues

# ─── Split a commit into two ─────────────────────────────────────────────────
# pick → edit:
# edit a1b2c3d feat: add user model and auth  (too much in one commit)
# Git pauses at that commit:
git reset HEAD~1        # unstage the commit (keep changes in working tree)
git add src/models/     # stage just the model files
git commit -m "feat: add user model"
git add src/auth/       # stage auth files
git commit -m "feat: add authentication"
git rebase --continue

# ─── Drop (delete) a commit ─────────────────────────────────────────────────
# drop e5f6g7h debug: console.log left in by accident
# That commit is gone — as if it never happened
```

---

## Rebase onto Another Branch

```bash
# git rebase --onto <newbase> <upstream> <branch>
# Move commits that are on <branch> but NOT on <upstream> to sit on <newbase>

# Example: feature-b was started from feature-a, but feature-a hasn't merged yet.
# You want feature-b to sit directly on main.

#  main: A ← B ← C
#  feature-a:        D ← E
#  feature-b:                F ← G

git rebase --onto main feature-a feature-b

#  main: A ← B ← C
#  feature-a:        D ← E
#  feature-b:  C ← F' ← G'   (F and G now on top of main)

# Another use: remove a range of commits
git rebase --onto HEAD~5 HEAD~2   # drop commits HEAD~4, HEAD~3, HEAD~2
```

---

## Autosquash

```bash
# Create a "fixup" commit that will auto-merge into a previous commit during rebase

# You're on feature branch; you realize commit abc1234 has a bug
git add fixed-file.js
git commit --fixup=abc1234    # creates: "fixup! feat: the original message"

# When you're ready to clean up:
git rebase -i --autosquash main
# Git automatically places the fixup! commit next to its target and marks it as 'fixup'
# You just confirm and save

# Same with squash: git commit --squash=abc1234 (combines but keeps message)
```

---

## Tips

- Run `git rebase -i HEAD~N` to clean up your last N commits before opening a PR — reviewers love clean, logical commit history.
- If a rebase goes wrong, `git rebase --abort` restores everything to the pre-rebase state. And `git reflog` can get you back even after `--continue` went bad.
- `fixup` (not `squash`) is usually what you want when combining commits — it discards the secondary commit messages and keeps things tidy.
- Set `pull.rebase = true` globally to auto-rebase instead of merge when pulling — keeps your local branch linear.
- VS Code's Source Control view has a visual interactive rebase interface (requires GitLens extension) if you prefer not to edit the rebase todo file manually.

---

## Summary

- Rebase replays commits on top of a new base, producing linear history without merge commits.
- **The golden rule:** never rebase commits already pushed to a shared branch — it rewrites SHAs and breaks others' history.
- `git rebase main` on a feature branch updates it with main's latest changes; the subsequent merge to main is a fast-forward.
- `git rebase -i HEAD~N` (interactive) lets you squash, reword, reorder, edit, and drop commits — essential for clean PR history.
- `--onto` allows precise surgery: move a range of commits from one base to another.
- `--autosquash` + `--fixup` commits automate the "fix a previous commit" workflow cleanly.
