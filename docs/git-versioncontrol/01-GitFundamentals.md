---
title: "Git Fundamentals"
sidebar_label: "Git Fundamentals"
sidebar_position: 1
---

# Git Fundamentals

The essential commands and concepts for daily Git use. Everything here is something you'll use every single day.

---

## Installation and First-Time Setup

```bash
# Install (choose your platform)
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from https://git-scm.com — includes Git Bash

# Verify
git --version

# ─── First-time global config (do this once per machine) ──────────────────
git config --global user.name "Alice Smith"
git config --global user.email "alice@example.com"
git config --global core.editor "code --wait"   # VS Code; or: vim, nano
git config --global init.defaultBranch main      # use 'main' instead of 'master'
git config --global pull.rebase false            # merge on pull (or: true for rebase)
git config --global core.autocrlf input          # Linux/Mac: input; Windows: true

# View all config
git config --list
git config --global --list

# Where config is stored
# --global:  ~/.gitconfig
# --local:   .git/config (per-repo; overrides global)
# --system:  /etc/gitconfig (all users on machine)
```

---

## Creating and Cloning Repositories

```bash
# Start a new repo in the current directory
mkdir my-project && cd my-project
git init
# Creates .git/ directory — the entire repo lives here

# Start with an initial branch named 'main'
git init -b main

# Clone an existing repo (downloads full history)
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-folder   # clone into specific folder
git clone git@github.com:user/repo.git                  # via SSH (preferred)
git clone --depth 1 https://github.com/user/repo.git   # shallow clone (latest only; faster)

# After cloning: the remote is automatically named 'origin'
git remote -v   # verify remote URL
```

---

## The Three Areas

```
Working Tree          Staging Area (Index)      Repository (.git/)
─────────────         ────────────────────      ──────────────────
Files you edit        Files queued for           Committed snapshots
                      the next commit            (permanent history)

     git add ──────────────────────────►
                       git commit ──────────────────────────►
     git checkout / git restore ◄──────────────────────────
```

---

## Tracking Files and Making Commits

```bash
# Check status (most-used command — run it constantly)
git status
git status -s   # short format: M=modified, A=added, ??=untracked

# Stage files
git add filename.txt          # stage one file
git add src/                  # stage entire directory
git add .                     # stage everything in current directory (careful!)
git add -p                    # interactive: stage specific hunks/lines (very useful)
git add -u                    # stage all tracked (modified/deleted) files; skip untracked

# Unstage (remove from staging; file unchanged)
git restore --staged filename.txt   # modern (Git 2.23+)
git reset HEAD filename.txt         # older equivalent

# Commit
git commit -m "Add user authentication endpoint"
git commit                          # opens editor for multi-line message
git commit -am "Fix typo"           # stage all tracked modified files + commit in one step
git commit --amend                  # edit the last commit (message or content)
git commit --amend --no-edit        # amend last commit keeping same message

# Good commit message format (Conventional Commits):
# <type>(<scope>): <short summary>
#
# feat(auth): add JWT refresh token rotation
# fix(api): handle null user in /me endpoint
# docs(readme): update installation instructions
# refactor(db): extract connection pool to separate module
# test(auth): add unit tests for password hashing
# chore(deps): upgrade express to 4.19.2
```

---

## Viewing History

```bash
# Show commit log
git log                              # full log
git log --oneline                    # one line per commit (SHA + message)
git log --oneline --graph            # ASCII branch graph
git log --oneline --graph --all      # include all branches
git log --oneline -10                # last 10 commits
git log --author="Alice"             # filter by author
git log --since="2 weeks ago"        # filter by date
git log --grep="fix"                 # filter by message keyword
git log -- path/to/file              # commits that touched a specific file
git log -p                           # show diff (patch) for each commit
git log --stat                       # show files changed per commit

# Show a specific commit
git show abc1234                     # show commit details + diff
git show HEAD                        # show last commit
git show HEAD~3                      # show 3 commits before HEAD

# Diff
git diff                             # working tree vs staging (unstaged changes)
git diff --staged                    # staging vs last commit (what will be committed)
git diff HEAD                        # working tree vs last commit (all changes)
git diff main..feature               # diff between two branches
git diff abc1234..def5678            # diff between two commits
git diff --stat                      # summary of files changed
```

---

## HEAD, Refs, and Navigating History

```
HEAD: a pointer to the current commit (usually points to a branch name)
  On branch main: HEAD → main → commit abc123
  Detached HEAD:  HEAD → commit abc123 directly (not on a branch)

Relative references:
  HEAD~1  or  HEAD~   = one commit before HEAD (parent)
  HEAD~3              = three commits before HEAD
  HEAD^               = same as HEAD~1 (first parent)
  HEAD^2              = second parent (for merge commits)
  main~5              = five commits before tip of main
```

```bash
# Navigate to a specific commit (detached HEAD state)
git checkout abc1234          # examine old state; don't commit here
git switch --detach abc1234   # modern syntax

# Return to a branch
git checkout main
git switch main

# Reference commits relatively
git show HEAD~3               # show the commit 3 before HEAD
git diff HEAD~5..HEAD         # what changed in last 5 commits
```

---

## Undoing Changes

```bash
# Discard working tree changes (unstaged; cannot be recovered)
git restore filename.txt              # discard changes in one file
git restore .                         # discard ALL unstaged changes (careful!)
git checkout -- filename.txt          # older equivalent

# Unstage (keep working tree changes)
git restore --staged filename.txt
git reset HEAD filename.txt

# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes in working tree (unstaged)
git reset --mixed HEAD~1    # default behavior of 'git reset HEAD~1'

# Undo last commit, DISCARD all changes (destructive!)
git reset --hard HEAD~1

# Safely undo a commit by creating a new "undo" commit (safe for shared branches)
git revert abc1234          # creates a new commit that undoes abc1234
git revert HEAD             # revert the last commit

# When to use reset vs revert:
#   reset:  local commits not yet pushed to shared branches (rewrites history)
#   revert: commits already pushed/shared (safe; doesn't rewrite history)
```

---

## Ignoring Files

```bash
# .gitignore: list of patterns for files Git should not track

# Create .gitignore in repo root
cat > .gitignore << 'IGNORE'
# Dependencies
node_modules/
vendor/

# Build output
dist/
build/
*.class
*.jar

# Environment files (never commit secrets!)
.env
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db

# IDE files
.idea/
.vscode/
*.swp

# Logs
*.log
logs/
IGNORE

# Check what would be ignored
git status --ignored

# Force-add an ignored file (override .gitignore)
git add -f filename.txt

# Stop tracking a file already committed (add to .gitignore first!)
git rm --cached filename.txt          # removes from staging/tracking; keeps file on disk
git rm --cached -r node_modules/      # recursively untrack a directory

# Global gitignore (for OS/IDE files you never want in any repo)
git config --global core.excludesfile ~/.gitignore_global
```

---

## Stashing

Stash saves your uncommitted work temporarily so you can switch context.

```bash
# Stash current changes (working tree + staging area)
git stash
git stash push -m "WIP: half-done login form"   # with a description

# List stashes
git stash list
# stash@{0}: WIP: half-done login form
# stash@{1}: On main: quick experiment

# Apply and remove the latest stash
git stash pop

# Apply without removing (keep in stash list)
git stash apply stash@{1}

# Apply to a different branch
git stash branch new-branch-name    # creates branch + applies stash

# Drop a stash
git stash drop stash@{0}
git stash clear                     # drop ALL stashes

# Stash including untracked files
git stash -u                        # --include-untracked
git stash -a                        # --all (include .gitignored files too)
```

---

## Tips

- Run `git status` before and after every operation — it tells you exactly what state things are in and often suggests the right command to use next.
- `git add -p` (patch mode) is one of Git's most powerful features — it lets you stage only specific lines of a file, so each commit contains exactly one logical change.
- Never `git reset --hard` unless you're certain — this throws away work permanently. Prefer `git stash` if you're unsure.
- Write commit messages in the imperative mood: "Add login page" not "Added login page" — this matches Git's own convention (`git revert` produces "Revert 'Add login page'").
- Add `.gitignore` before your first commit — it's much harder to untrack files after they've been committed.

---

## Summary

- First-time setup: `git config --global user.name/email/editor/init.defaultBranch`.
- Three areas: working tree (edit) → staging area (`git add`) → repository (`git commit`).
- `git status` is your most-used command — check it constantly.
- `git log --oneline --graph --all` gives a visual history of all branches.
- Undo toolkit: `git restore` (discard working tree), `git reset` (move HEAD), `git revert` (safe undo for shared history).
- `.gitignore` prevents secrets, build artifacts, and OS files from being committed — add it first.
- `git stash` is a temporary shelf for work-in-progress when you need to switch context.
