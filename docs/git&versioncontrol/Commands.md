---
title: "Git Commands Reference"
sidebar_label: "Commands"
sidebar_position: 11
---

# Git Commands Reference

This section explains common Git commands, what they do internally, and when they should be used. Commands are grouped by lifecycle stage: repository setup, tracking changes, branching, collaboration, and recovery.

---

# 1. Repository Initialization

```console
git init
```
Initializes a new Git repository in the current directory.  
Creates a hidden .git directory containing the object database, references, configuration, and HEAD pointer.  
Use when starting a new project.

---

```console
git clone <repository-url>
```

Creates a full local copy of a remote repository.  
This includes:
- All commits
- All branches
- Full history
- Remote configuration

Clone establishes a default remote called "origin".

---

# 2. Tracking and Recording Changes

```console
git status
```

Shows:
- Modified files
- Staged files
- Untracked files
- Current branch

Used to understand the current working directory and staging area state.

---

```console
git add <file>
```

Adds file changes to the staging area (index).  
This does NOT commit changes — it prepares them.

Git records a snapshot of the file’s current content into the index.

---

```console
git add .
```

Stages all modified and new files in the current directory.

Use carefully — may include unintended files.

---

```console
git commit -m "message"
```

Creates a commit from the staged snapshot.  
A commit contains:
- Tree reference
- Parent commit pointer
- Metadata
- Commit message

Commits form the project history.

---

```console
git commit --amend
```

Modifies the most recent commit.  
Rewrites commit history by creating a new commit object.

Should not be used on shared commits.

---

# 3. Viewing History

```console
git log
```

Displays commit history in reverse chronological order.

---

```console
git log --oneline --graph --all
```

Compact view of:
- Branch structure
- Merge history
- Commit relationships

Useful for visualizing DAG structure.

---

```console
git show <commit>
```

Displays:
- Commit metadata
- File changes introduced in that commit

---

```console
git diff
```

Shows differences between:
- Working directory and staging area
- Staging area and last commit

Helps inspect changes before committing.

---

# 4. Branching and Navigation

```console
git branch
```

Lists all local branches.

---

```console
git branch <branch-name>
```

Creates a new branch pointer at current commit.

---

```console
git checkout <branch-name>
```

Switches working directory to another branch.  
Updates:
- HEAD pointer
- Working directory files

---

```console
git checkout -b <branch-name>
```

Creates and switches to a new branch in one step.

---

```console
git switch <branch-name>
```

Modern alternative to checkout for switching branches.

---

```console
git merge <branch-name>
```

Integrates another branch into the current branch.

Possible outcomes:
- Fast-forward merge
- Three-way merge
- Conflict

---

```console
git rebase <branch-name>
```

Reapplies commits from current branch onto another base.

Creates new commit hashes.

Produces linear history.

---

# 5. Remote Collaboration

```console
git remote -v
```

Displays configured remote repositories.

---

```console
git fetch
```

Downloads changes from remote repository.  
Does NOT merge them.

Updates remote-tracking branches.

---

```console
git pull
```

Equivalent to:
- Fetch
- Then merge (or rebase)

Updates local branch with remote changes.

---

```console
git push
```

Uploads local commits to remote repository.

Push may be rejected if:
- Remote has diverged
- History was rewritten

---

```console
git push --force
```

Forces remote branch update.

Dangerous: rewrites remote history.

---

# 6. Undoing Changes

```console
git restore <file>
```

Restores file to last committed state.

---

```console
git reset <commit>
```

Moves branch pointer to specified commit.

Types:

--soft  
Moves HEAD only.

--mixed (default)  
Moves HEAD and resets staging area.

--hard  
Moves HEAD and resets staging area and working directory.

Hard reset permanently discards changes.

---

```console
git revert <commit>
```

Creates a new commit that reverses changes from a specific commit.

Safe for shared history.

---

# 7. Stashing

```console
git stash
```

Temporarily stores uncommitted changes.

Working directory becomes clean.

---

```console
git stash pop
```

Restores stashed changes and removes them from stash list.

---

```console
git stash list
```

Shows saved stashes.

---

# 8. Tags

```console
git tag <tag-name>
```

Creates lightweight tag pointing to current commit.

---

```console
git tag -a <tag-name>
```

Creates annotated tag with metadata.

Used for releases.

---

# 9. Advanced & Recovery

```console
git reflog
```

Shows history of HEAD movements.

Allows recovery of lost commits.

---

```console
git cherry-pick <commit>
```

Applies changes from a specific commit onto current branch.

---

```console
git bisect
```

Binary search tool to find commit that introduced a bug.

---

```console
git gc
```

Runs garbage collection to clean unreachable objects and optimize repository.

---

# 10. Submodules

```console
git submodule add <repo>
```

Adds external repository inside current repository.

Used for dependency embedding.

---

# Summary

Git commands operate on three main areas:

1. Working Directory
2. Staging Area (Index)
3. Repository (Commit History)

Understanding how commands move data between these three areas is the key to mastering Git.