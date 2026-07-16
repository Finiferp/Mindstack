---
title: "Git Command Reference"
sidebar_label: "Commands"
sidebar_position: 10
---

# Git Command Reference

A complete reference of Git commands organised by category. All commands you'll actually use.

---

## Setup and Configuration

```bash
git config --global user.name "Alice Smith"
git config --global user.email "alice@example.com"
git config --global core.editor "code --wait"
git config --global init.defaultBranch main
git config --global pull.rebase false          # merge on pull
git config --global pull.rebase true           # rebase on pull
git config --global push.default current       # push current branch by default
git config --global core.autocrlf input        # Mac/Linux
git config --global core.autocrlf true         # Windows
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.lg "log --oneline --graph --all"
git config --global credential.helper osxkeychain   # macOS
git config --list
git config --list --show-origin               # show which file each setting comes from
```

---

## Creating Repositories

```bash
git init                                      # init in current directory
git init my-project                           # init in new directory
git init -b main                              # init with 'main' as default branch
git clone https://github.com/user/repo.git   # clone via HTTPS
git clone git@github.com:user/repo.git       # clone via SSH (preferred)
git clone --depth 1 URL                      # shallow clone (latest commit only)
git clone --recurse-submodules URL           # clone with all submodules
git clone URL my-folder                      # clone into specific directory
```

---

## Staging and Committing

```bash
git status                                    # current state of working tree
git status -s                                 # short format
git add file.txt                             # stage a file
git add src/                                 # stage a directory
git add .                                    # stage everything
git add -p                                   # interactive: stage hunks
git add -u                                   # stage all tracked modified/deleted files
git restore --staged file.txt               # unstage a file (keep changes)
git restore file.txt                        # discard working tree changes (destructive)
git diff                                     # unstaged changes
git diff --staged                            # staged changes (vs last commit)
git diff HEAD                                # all changes vs last commit
git commit -m "message"                      # commit with inline message
git commit                                   # open editor for message
git commit -am "message"                     # stage tracked files + commit
git commit --amend                           # edit last commit
git commit --amend --no-edit                 # add staged to last commit (same message)
git commit --fixup=abc1234                   # create fixup commit for abc1234
```

---

## Viewing History

```bash
git log                                      # full log
git log --oneline                            # compact: SHA + message
git log --oneline --graph                    # with branch graph
git log --oneline --graph --all              # all branches
git log --oneline -10                        # last 10 commits
git log --author="Alice"                     # filter by author
git log --since="2 weeks ago"               # filter by date
git log --until="2024-01-01"               # filter before date
git log --grep="fix"                         # filter by commit message
git log -- path/to/file                      # commits touching a file
git log -p                                   # show diff per commit
git log --stat                               # files changed per commit
git log main..feature                        # commits on feature not on main
git log --merges                             # merge commits only
git log --no-merges                          # exclude merge commits
git show abc1234                             # show commit + diff
git show HEAD                                # show last commit
git show HEAD~3                              # 3 commits back
git show HEAD:path/to/file                   # file content at HEAD
git show v1.0:README.md                      # file content at tag
```

---

## Diffing

```bash
git diff                                     # working tree vs staging
git diff --staged                            # staging vs HEAD
git diff HEAD                                # working tree vs HEAD
git diff main feature                        # between branches
git diff abc1234 def5678                     # between commits
git diff v1.0 v1.1                          # between tags
git diff --stat                              # summary of files changed
git diff --name-only                         # only file names
git diff --word-diff                         # word-level diff (good for prose)
git diff -w                                  # ignore whitespace
git diff origin/main                         # vs remote main
```

---

## Undoing Things

```bash
git restore file.txt                         # discard unstaged changes (irreversible)
git restore .                                # discard ALL unstaged changes
git restore --staged file.txt               # unstage (keep working tree changes)
git restore --staged .                       # unstage everything
git clean -fd                                # remove untracked files and directories
git clean -n                                 # dry run (show what would be cleaned)
git reset --soft HEAD~1                      # undo last commit; keep staged
git reset --mixed HEAD~1                     # undo last commit; keep unstaged (default)
git reset --hard HEAD~1                      # undo last commit; discard changes
git reset --hard origin/main                 # reset to match remote (destructive)
git revert HEAD                              # safe undo: creates new "undo" commit
git revert abc1234                           # revert a specific commit
git revert abc1234 --no-commit               # stage the revert without committing
git revert HEAD~3..HEAD                      # revert last 3 commits
```

---

## Branching

```bash
git branch                                   # list local branches
git branch -r                                # list remote tracking branches
git branch -a                                # list all
git branch -v                                # with last commit info
git branch -vv                               # with upstream tracking + ahead/behind
git branch feature-x                         # create branch (don't switch)
git switch -c feature-x                      # create + switch (modern)
git switch feature-x                         # switch to branch
git checkout feature-x                       # switch (classic)
git checkout -b feature-x                    # create + switch (classic)
git switch -c feature from-commit            # create from specific commit
git branch -d feature-x                      # delete (safe: merged only)
git branch -D feature-x                      # force delete
git branch -m old-name new-name              # rename branch
git branch -m new-name                       # rename current branch
git branch --merged                          # branches merged into HEAD
git branch --no-merged                       # branches not merged into HEAD
```

---

## Merging

```bash
git merge feature-x                          # merge feature-x into current branch
git merge --no-ff feature-x                  # always create a merge commit
git merge --squash feature-x                 # squash all commits into one (then commit)
git merge --abort                            # abort in-progress merge
git merge --continue                         # continue after resolving conflicts
git mergetool                                # open merge tool for conflicts
git diff --name-only --diff-filter=U        # list conflicted files
```

---

## Rebasing

```bash
git rebase main                              # rebase current branch onto main
git rebase -i HEAD~4                         # interactive rebase last 4 commits
git rebase -i main                           # interactive rebase since branching from main
git rebase --onto main feature-a feature-b  # transplant feature-b onto main
git rebase --continue                        # continue after resolving conflict
git rebase --abort                           # abort rebase
git rebase --skip                            # skip conflicting commit
git rebase --autosquash main                 # auto-arrange fixup! commits
git pull --rebase                            # pull with rebase instead of merge
```

---

## Remotes

```bash
git remote -v                                # list remotes
git remote add origin URL                    # add a remote
git remote add upstream URL                  # add upstream (for forks)
git remote remove origin                     # remove a remote
git remote rename origin old-origin          # rename a remote
git remote set-url origin NEW_URL            # change remote URL
git remote show origin                       # detailed info about a remote
git fetch origin                             # fetch all from origin
git fetch --all                              # fetch from all remotes
git fetch --prune                            # fetch + remove stale tracking refs
git push origin main                         # push main to origin
git push -u origin feature-x                 # push + set tracking
git push --force-with-lease origin feature   # safe force push
git push --force origin feature              # force push (dangerous)
git push origin --delete feature-x          # delete remote branch
git push origin --tags                       # push all tags
git push origin v1.0                         # push specific tag
git pull                                     # fetch + merge tracked upstream
git pull origin main                         # pull specific branch
git pull --rebase                            # pull with rebase
git pull --ff-only                           # only if fast-forward
```

---

## Tags

```bash
git tag                                      # list all tags
git tag -l "v1.*"                           # filter tags
git tag v1.0                                 # create lightweight tag at HEAD
git tag v1.0 abc1234                         # create lightweight tag at commit
git tag -a v1.0 -m "Release 1.0"           # create annotated tag (recommended)
git tag -a v1.0 abc1234 -m "..."           # annotated at specific commit
git show v1.0                                # show tag details
git push origin v1.0                         # push a tag
git push origin --tags                       # push all tags
git tag -d v1.0                             # delete local tag
git push origin --delete v1.0               # delete remote tag
git checkout v1.0                            # check out code at a tag (detached HEAD)
git describe                                 # describe HEAD relative to nearest tag
git describe --tags --abbrev=0              # latest tag reachable from HEAD
```

---

## Stashing

```bash
git stash                                    # stash working tree + staging area
git stash push -m "WIP: login form"         # stash with description
git stash -u                                 # include untracked files
git stash list                               # list all stashes
git stash show                               # show stash diff (latest)
git stash show stash@{2}                    # show specific stash
git stash pop                                # apply and remove latest stash
git stash apply                              # apply without removing
git stash apply stash@{2}                   # apply specific stash
git stash drop stash@{0}                    # remove a stash
git stash clear                              # remove all stashes
git stash branch new-branch                  # create branch from latest stash
```

---

## Cherry-Pick

```bash
git cherry-pick abc1234                      # apply a commit to current branch
git cherry-pick abc1234 def5678             # apply multiple commits
git cherry-pick abc1234..def5678            # apply a range (exclusive of abc1234)
git cherry-pick abc1234^..def5678           # apply a range (inclusive of abc1234)
git cherry-pick -n abc1234                   # apply without committing
git cherry-pick -e abc1234                   # apply with edited message
git cherry-pick --continue                   # after resolving conflict
git cherry-pick --abort                      # cancel
```

---

## Inspection and Debugging

```bash
git blame file.txt                           # who last changed each line
git blame -L 10,20 file.txt                 # blame a specific line range
git blame -w file.txt                        # ignore whitespace changes
git log -S "function name"                   # commits that added/removed a string
git log -G "regex pattern"                   # commits where pattern changed
git grep "TODO"                              # search working tree content
git grep "TODO" HEAD                         # search at a specific commit
git grep "TODO" $(git rev-list --all)       # search all history
git bisect start                             # start bisect session
git bisect good v1.0                         # mark a known-good commit
git bisect bad                               # mark current as bad
git bisect run npm test                      # automate bisect with a script
git bisect reset                             # end bisect
git reflog                                   # HEAD position history
git reflog show feature-x                    # reflog for a specific branch
git cat-file -t abc1234                      # object type (blob/tree/commit/tag)
git cat-file -p abc1234                      # object content
git ls-files                                 # list tracked files
git ls-files --others --exclude-standard    # list untracked files
git ls-tree HEAD                             # list tree at HEAD
git ls-tree -r HEAD --name-only             # all files recursively
```

---

## Submodules

```bash
git submodule add URL path/to/sub            # add a submodule
git submodule update --init --recursive      # init + update all submodules
git submodule update --remote --merge        # pull latest for all submodules
git submodule foreach 'git pull'             # run command in each submodule
git submodule status                         # status of all submodules
git submodule deinit path/to/sub             # deinit before removing
git rm path/to/sub                           # remove submodule (then rm -rf .git/modules/sub)
```

---

## Worktrees

```bash
git worktree add ../hotfix hotfix/1.1        # add worktree for a branch
git worktree add -b experiment ../exp main   # add worktree with new branch
git worktree list                            # list worktrees
git worktree remove ../hotfix                # remove a worktree
git worktree prune                           # clean up stale worktree metadata
```

---

## Maintenance

```bash
git gc                                       # garbage collect + pack objects
git gc --aggressive                          # thorough repack (slower)
git fsck                                     # verify integrity of object database
git fsck --unreachable                       # find unreachable objects
git prune                                    # remove unreachable objects
git count-objects -vH                        # repo size stats (human-readable)
git verify-pack -v .git/objects/pack/*.idx  # inspect pack file contents
```

---

## Aliases Worth Setting

```bash
git config --global alias.st "status"
git config --global alias.co "checkout"
git config --global alias.br "branch"
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.unstage "restore --staged"
git config --global alias.discard "restore"
git config --global alias.aliases "config --get-regexp alias"
git config --global alias.undo "reset --soft HEAD~1"
git config --global alias.contributors "shortlog --summary --numbered --email"
git config --global alias.whoami "config user.email"
git config --global alias.root "rev-parse --show-toplevel"   # show repo root
git config --global alias.standup "log --since yesterday --author='$(git config user.email)' --oneline"
```

---

## Summary

The commands you'll use every day (roughly in order of frequency):

```bash
git status          # always
git add -p          # stage carefully
git commit -m "..."  # commit
git log --oneline --graph --all  # visualise
git switch -c / git switch       # branch management
git push / git pull              # sync with remote
git diff / git diff --staged     # review changes
git stash / git stash pop        # context switching
git rebase -i HEAD~N             # clean up before PR
git restore / git reset          # undo things
git bisect                       # find regressions
git reflog                       # recover anything
```
