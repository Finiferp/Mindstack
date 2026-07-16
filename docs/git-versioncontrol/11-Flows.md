---
title: "Standard Git Flows"
sidebar_label: "Flows"
sidebar_position: 11
---

# Standard Git Flows

Real-world step-by-step playbooks for the most common Git scenarios. Copy these, adapt them, and make them muscle memory.

---

## Flow 1 — Start a Brand New Project

```bash
# 1. Create the project directory and enter it
mkdir my-app && cd my-app

# 2. Initialise Git
git init -b main

# 3. Create a .gitignore immediately (before any commits)
# For a Node.js project:
cat > .gitignore << 'IGNORE'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vscode/
IGNORE

# For Python:
cat > .gitignore << 'IGNORE'
__pycache__/
*.pyc
*.pyo
.venv/
venv/
.env
dist/
*.egg-info/
.DS_Store
IGNORE

# 4. Create an initial README
echo "# My App" > README.md

# 5. First commit
git add .
git commit -m "chore: initial project setup"

# 6. Create a remote repo (GitHub CLI — or do it in the browser)
gh repo create my-app --private --source=. --push
# This creates the repo on GitHub and pushes your initial commit

# Or manually:
# Go to github.com → New repository → copy the SSH URL, then:
git remote add origin git@github.com:you/my-app.git
git push -u origin main

# Done — project live on GitHub
```

---

## Flow 2 — Add Git to an Existing Project

```bash
# You have a folder of code with no Git history

cd existing-project/

# 1. Initialise
git init -b main

# 2. Create .gitignore before staging anything
# (add node_modules/, .env, build output, etc.)
code .gitignore   # or nano, vim

# 3. Verify what will be staged — check carefully for secrets/large files
git status

# 4. Stage everything
git add .

# 5. Review what you're about to commit
git diff --staged --stat

# 6. First commit
git commit -m "chore: add Git to existing project"

# 7. Add remote and push
git remote add origin git@github.com:you/existing-project.git
git push -u origin main

# Tip: if node_modules/ or build/ was accidentally staged:
git rm -r --cached node_modules/
echo "node_modules/" >> .gitignore
git add .gitignore
git commit -m "chore: remove node_modules from tracking"
```

---

## Flow 3 — Work on a New Feature

This is the GitHub Flow — the daily bread of software development.

```bash
# 1. Always start from an up-to-date main
git switch main
git pull

# 2. Create a feature branch
git switch -c feature/user-authentication

# 3. Work — edit files, run your app, test things
# Make small, logical commits as you go
git add src/auth/
git commit -m "feat(auth): add JWT generation utility"

git add src/middleware/
git commit -m "feat(auth): add authentication middleware"

git add tests/
git commit -m "test(auth): add unit tests for JWT utility"

# 4. Push your branch (regularly — it's your backup)
git push -u origin feature/user-authentication

# 5. Keep your branch up to date with main (if it takes more than a day)
git fetch origin
git rebase origin/main     # or: git merge origin/main

# 6. Clean up commits before opening a PR (optional but polite)
git rebase -i origin/main
# Squash WIP commits, fix messages, reorder if needed

# 7. Push final version (force push needed after rebase)
git push --force-with-lease origin feature/user-authentication

# 8. Open a Pull Request
# GitHub: compare & pull request button in the UI
# Or via CLI:
gh pr create --title "feat: add user authentication" \
  --body "Adds JWT-based authentication. Closes #42." \
  --base main

# 9. After PR is reviewed and approved — merge on GitHub
# (or via CLI:)
gh pr merge 42 --squash --delete-branch

# 10. Update local main and clean up
git switch main
git pull
git branch -d feature/user-authentication
```

---

## Flow 4 — Fix a Bug

```bash
# 1. Start from up-to-date main
git switch main
git pull

# 2. Create a fix branch
git switch -c fix/login-null-pointer

# 3. Reproduce and fix the bug
# ... make the fix ...

# 4. Commit the fix
git add src/auth/login.js
git commit -m "fix(auth): handle null user object in login handler

Previously a null user from the database would cause an uncaught
TypeError. Now returns a 401 with a clear error message.

Closes #89"

# 5. Add a regression test so this never comes back
git add tests/auth/login.test.js
git commit -m "test(auth): add test for null user login case"

# 6. Push and open PR
git push -u origin fix/login-null-pointer
gh pr create --title "fix: handle null user in login" --base main

# 7. After merge: clean up
git switch main && git pull
git branch -d fix/login-null-pointer
```

---

## Flow 5 — Emergency Hotfix to Production

When production is on fire and you need to ship a fix NOW — bypassing normal development flow.

```bash
# Production is running v1.2.0 (tagged)
# develop has work-in-progress features you can't ship yet

# 1. Branch from the production tag, not from develop/main
git switch -c hotfix/1.2.1 v1.2.0

# 2. Make the minimal fix
git add src/payment/processor.js
git commit -m "fix(payment): prevent double-charge on timeout retry

Idempotency key was not being passed correctly on retry.
This caused duplicate charges for ~0.1% of transactions.

Fixes #201"

# 3. Tag the hotfix
git tag -a v1.2.1 -m "Hotfix: prevent double-charge on payment retry"

# 4. Push and deploy
git push origin hotfix/1.2.1
git push origin v1.2.1
# Deploy v1.2.1 to production → fire extinguished

# 5. Merge hotfix back into main AND develop
# (so the fix isn't lost when the next release happens)
git switch main
git merge --no-ff hotfix/1.2.1
git push origin main

git switch develop
git merge --no-ff hotfix/1.2.1
git push origin develop

# 6. Clean up
git branch -d hotfix/1.2.1
```

---

## Flow 6 — Review and Merge Someone Else's PR

```bash
# Option A: Review on GitHub UI (most common for small PRs)
# Read the diff → leave comments → approve or request changes

# Option B: Check out locally to test/run the code

# Check out the PR branch (GitHub CLI)
gh pr checkout 123

# Or manually:
git fetch origin pull/123/head:pr-123
git switch pr-123

# Run the code, run tests, verify the feature works
npm install && npm test
npm run dev  # manual testing

# Leave a review on GitHub (approve or request changes)
gh pr review 123 --approve --body "LGTM! Tests pass locally."
# or:
gh pr review 123 --request-changes --body "Please add error handling for the null case"

# Merge (if you have permission)
gh pr merge 123 --squash --delete-branch
```

---

## Flow 7 — Sync a Fork with Upstream

Contributing to open source: keeping your fork up to date.

```bash
# One-time setup (after forking on GitHub and cloning):
git remote add upstream git@github.com:original-org/repo.git
git remote -v
# origin    git@github.com:you/repo.git
# upstream  git@github.com:original-org/repo.git

# Regular sync (do this before starting any new feature):
git fetch upstream
git switch main
git rebase upstream/main      # or: git merge upstream/main
git push origin main          # keep your fork's main in sync

# Start a contribution:
git switch -c fix/typo-in-docs
# ... make changes ...
git push -u origin fix/typo-in-docs
# Open PR: from you/repo:fix/typo-in-docs → original-org/repo:main
```

---

## Flow 8 — Undo a Mistake

### Undo last commit (not pushed yet)

```bash
# Keep changes, unstage them
git reset --soft HEAD~1   # if you want to re-commit differently
git reset HEAD~1           # same (--mixed is default): changes stay, unstaged
git reset --hard HEAD~1   # DISCARD changes completely (irreversible!)
```

### Undo a commit already pushed to a shared branch

```bash
# Safe: create a new "undo" commit
git revert HEAD             # revert the last commit
git revert abc1234          # revert a specific commit
git push                    # push the revert commit

# The original bad commit stays in history, but its effects are undone
```

### Recover a deleted branch

```bash
git reflog                  # find the SHA of the branch tip
# abc1234 HEAD@{5}: commit: the last commit on the deleted branch

git switch -c recovered-branch abc1234   # recreate from that SHA
```

### Recover from a bad rebase

```bash
git reflog                  # find HEAD position before the rebase
# def5678 HEAD@{3}: rebase (start): checkout main

git reset --hard def5678    # jump back to before the rebase
# Your branch is restored to exactly where it was
```

### Remove a file from the last commit

```bash
git reset HEAD~1             # undo the commit, keep changes staged
git restore --staged secrets.env   # unstage the secret file
echo "secrets.env" >> .gitignore
git add .gitignore
git commit -c ORIG_HEAD      # recommit with same message
# ORIG_HEAD stores the pre-reset commit message
```

---

## Flow 9 — Release a New Version

```bash
# Using semantic versioning: MAJOR.MINOR.PATCH

# 1. Ensure main is clean and all PRs merged
git switch main && git pull
git log --oneline -10        # review what's in this release

# 2. Update version in your package/config files
# package.json, pyproject.toml, Cargo.toml, etc.
npm version minor --no-git-tag-version  # bumps 1.0.0 → 1.1.0 in package.json
# or manually edit the version field

# 3. Update CHANGELOG.md
# List what's new, what's fixed, any breaking changes

# 4. Commit the version bump
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 1.1.0"

# 5. Tag the release
git tag -a v1.1.0 -m "Release 1.1.0

New features:
- Dark mode toggle
- Keyboard shortcuts

Bug fixes:
- Fix null pointer in login handler
- Correct mobile layout on small screens"

# 6. Push commit and tag
git push origin main
git push origin v1.1.0

# 7. Create a GitHub release from the tag
gh release create v1.1.0 --title "v1.1.0" --generate-notes
# or with a specific notes file:
gh release create v1.1.0 --title "v1.1.0" --notes-file CHANGELOG.md

# 8. CI/CD picks up the tag and deploys to production automatically
```

---

## Flow 10 — Clone and Set Up a Team Project

```bash
# First time joining a project

# 1. Clone the repo
git clone git@github.com:company/my-app.git
cd my-app

# 2. Set up your local config (if different from global)
git config user.email "alice@company.com"

# 3. Install dependencies and run the project
npm install && npm run dev

# 4. Look at the current branch structure
git log --oneline --graph --all -20
git branch -a

# 5. Understand the workflow (ask the team or read CONTRIBUTING.md)
cat CONTRIBUTING.md

# 6. Configure your SSH key if needed
ssh -T git@github.com      # test SSH auth

# 7. Never commit directly to main — always use a branch
git switch -c feature/my-first-contribution
```

---

## Flow 11 — Resolve a Difficult Merge Conflict

```bash
# You ran: git merge feature — and got conflicts

# 1. See what's conflicted
git status
# both modified: src/app.js
# both modified: src/config.js

# 2. Open each file — look for conflict markers
# <<<<<<< HEAD
# const timeout = 5000;
# =======
# const timeout = 3000;
# >>>>>>> feature

# 3. Decide which version to keep (or combine them)
# Edit the file to the correct final state, remove all markers

# 4. For complex conflicts: use a visual merge tool
git mergetool                # opens configured tool
# VS Code: shows 3-panel view: Current | Result | Incoming

# 5. Stage each resolved file
git add src/app.js
git add src/config.js

# 6. Verify nothing is still conflicted
git status     # should show no "both modified" files

# 7. Complete the merge
git commit     # message auto-populated: "Merge branch 'feature'"

# 8. If you want to abort and start over
git merge --abort    # returns to pre-merge state (works before step 7)
```

---

## Flow 12 — Find Who Broke Something and When

```bash
# Symptom: "The payment module is broken. Who changed it and when?"

# 1. Find which commits touched the file recently
git log --oneline -- src/payment/processor.js

# 2. See exactly what changed in those commits
git log -p -- src/payment/processor.js

# 3. Find who last changed each line
git blame src/payment/processor.js
git blame -L 45,60 src/payment/processor.js   # specific lines

# 4. If you know the bug was introduced between v1.1 and v1.2:
git bisect start
git bisect bad v1.2
git bisect good v1.1
# ... answer good/bad for each commit Git checks out ...
# "abc1234 is the first bad commit"
git show abc1234     # see exactly what changed

# 5. When did this line first appear?
git log -S "const idempotencyKey = " -- src/payment/processor.js

# 6. What changed between two releases?
git diff v1.1..v1.2 -- src/payment/
git log v1.1..v1.2 --oneline -- src/payment/
```

---

## Quick Reference Card

```
New project:          git init → .gitignore → git add . → git commit → git push

Daily feature work:   git pull → git switch -c feature/x → work → git add -p
                      → git commit → git push → open PR → merge → git pull

Oops, wrong commit:   git reset --soft HEAD~1 (undo, keep staged)
Oops, pushed bad:     git revert HEAD → git push (safe undo)
Oops, deleted branch: git reflog → git switch -c recovered SHA
Oops, committed .env: rotate secret → git filter-repo → force push

Context switch:       git stash → switch branch → work → git stash pop

Find the bug:         git bisect start → git bisect good v1.0 → git bisect bad
                      → answer good/bad → git bisect reset

Release:              git tag -a v1.2.0 -m "..." → git push origin v1.2.0
                      → gh release create v1.2.0
```
