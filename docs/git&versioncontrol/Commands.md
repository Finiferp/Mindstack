---
title: "Git Commands Reference"
sidebar_label: "Commands"
sidebar_position: 11
---

# Git Commands Reference

This page lists common Git commands, what they do internally, and when to use them.  
Commands are grouped by workflow stage: repository setup, tracking changes, branching, collaboration, recovery, and advanced topics.

Understanding how commands interact with Git’s **working directory**, **staging area**, and **repository** is key to mastering Git.

---

# 1. Repository Initialization

To initialize a new Git repository:

```console
git init
```  
Creates a hidden `.git` folder containing the object database, references, configuration, and HEAD pointer. Use this when starting a new project.

To clone a remote repository:

```console
git clone <repository-url>
```  
Creates a local copy of a remote repository with all commits, branches, full history, and remote configuration (`origin`).  
Example: ```console
git clone https://github.com/example/project.git`

---

# 2. Tracking and Recording Changes

To see the current status of your files:

```console
git status
```  
Shows modified files, staged files, untracked files, and the current branch. Use it to understand the state of your working directory and staging area.

To stage a file for commit:

```console
git add <file>
```  
Stages changes in a file for the next commit. Does **not** commit yet — just prepares the snapshot.

To stage all changes:

```console
git add .
```  
Stages all modified and new files in the current directory. Use carefully — may include unintended files.

To commit staged changes:

```console
git commit -m "message"
```  
Creates a commit from staged changes. A commit contains a tree (snapshot of files), parent commit pointer, metadata (author, timestamp), and commit message.

To modify the most recent commit:

```console
git commit --amend
```  
Creates a new commit object. Do **not** use on commits already shared with others.

---

# 3. Viewing History

To see the full commit history:

```console
git log
```  
Displays commit history in reverse chronological order.

To see a compact, visual view:

```console
git log --oneline --graph --all
```  
Shows branch structure, merge history, and commit relationships. Useful for visualizing Git’s DAG structure.

To view a specific commit:

```console
git show <commit>
```  
Displays commit metadata and changes introduced by that commit.

To see file differences:

```console
git diff
```  
Shows differences between working directory and staging area, or staging area and last commit.

---

# 4. Branching and Navigation

To list all local branches:

```console
git branch
```

To create a new branch:

```console
git branch <branch-name>
```

To switch branches:

```console
git checkout <branch-name>
```  
Updates HEAD pointer and working directory files.

To create and switch to a new branch in one step:

```console
git checkout -b <branch-name>
```

Modern alternative to switching branches:

```console
git switch <branch-name>
```

To merge another branch into the current one:

```console
git merge <branch-name>
```  
Possible outcomes: fast-forward merge, three-way merge, or conflict.

To reapply commits onto another base:

```console
git rebase <branch-name>
```  
Produces a linear history with new commit hashes.

---

# 5. Remote Collaboration

To see configured remotes:

```console
git remote -v
```

To fetch changes from a remote:

```console
git fetch
```  
Downloads changes without merging them. Updates remote-tracking branches.

To fetch and merge:

```console
git pull
```  
Equivalent to
```console
git fetch
git merge (or rebase)
```

To push local commits:

```console
git push
```  
Uploads local commits to the remote repository. May fail if the remote has diverged or history was rewritten.

To force push:

```console
git push --force
```  
**Dangerous** — rewrites remote history. Use with caution.

---

# 6. Undoing Changes

To restore a file to its last committed state:

```console
git restore <file>
```

To move a branch pointer to a specific commit:

```console
git reset <commit>
```  
Options:  
- `--soft` moves HEAD only  
- `--mixed` (default) moves HEAD and resets staging area  
- `--hard` moves HEAD, staging area, and working directory (permanently discards changes)

To undo a specific commit safely:

```console
git revert <commit>
```  
Creates a new commit that undoes changes from the target commit.

---

# 7. Stashing

To temporarily save uncommitted changes:

```console
git stash
```  
Cleans the working directory.

To apply stashed changes:

```console
git stash pop
```  
Restores changes and removes them from the stash list.

To view stashed changes:

```console
git stash list
```

---

# 8. Tags

To create a lightweight tag:

```console
git tag <tag-name>
```  

To create an annotated tag:

```console
git tag -a <tag-name>
```  
Includes metadata; commonly used for releases.

---

# 9. Advanced & Recovery

To see HEAD movement history:

```console
git reflog
```  
Useful for recovering lost commits.

To apply a specific commit to your branch:

```console
git cherry-pick <commit>
```

To find the commit that introduced a bug:

```console
git bisect
```  
Performs a binary search.

To clean unreachable objects:

```console
git gc
```  
Optimizes repository storage.

---

# 10. Submodules

To add a repository inside another repository:

```console
git submodule add <repo>
```  
Useful for dependencies or shared libraries.

---

# Summary

Git commands operate on three main areas:

1. **Working Directory** – where you edit files  
2. **Staging Area (Index)** – prepares changes for commit  
3. **Repository (Commit History)** – stores snapshots and metadata  
