---
title: "Introduction to Version Control"
sidebar_label: "Introduction"
sidebar_position: 0
---

# Introduction to Version Control

Version control is the practice of tracking and managing changes to files over time. Git is the dominant version control system — used by virtually every software team on the planet. Understanding *why* it exists makes learning *how* to use it much faster.

---

## The Problem Git Solves

Before version control, teams shared code by copying files. The result:

```
project_final.zip
project_final_v2.zip
project_final_REAL.zip
project_final_REAL_johns_edits.zip
project_final_USE_THIS_ONE.zip
```

Problems with manual versioning:
- No record of *what* changed or *why*
- Merging two people's edits was manual, error-prone work
- Rolling back a bad change meant restoring an old zip
- Only one person could "safely" edit at a time
- No way to work on two features simultaneously without chaos

---

## What Version Control Gives You

```
Every change is recorded:
  Who made it, when, and why (commit message)

Full history:
  See every version of every file going back to day one
  Diff any two versions instantly

Safe experimentation:
  Branch: create a parallel copy of the codebase
  Try something risky → if it fails, delete the branch
  If it works, merge it back

Parallel work:
  Alice works on the login feature
  Bob fixes a bug in the payment system
  Neither blocks the other
  Git merges their work intelligently

Audit trail:
  "Who broke this and when?" → git blame + git log
  "What changed in this release?" → git diff v1.0..v1.1
  Compliance requirement: full change history preserved

Backup:
  Remote repository (GitHub, GitLab, Bitbucket) = off-site backup
  Every clone of the repo is a full copy of the history
```

---

## Brief History

| Year | Event |
|---|---|
| 1972 | SCCS (Source Code Control System) — first VCS, Bell Labs |
| 1982 | RCS (Revision Control System) — file-level locking |
| 1990 | CVS (Concurrent Versions System) — first multi-user VCS |
| 2000 | Subversion (SVN) — centralized; directory versioning; widely adopted |
| 2000 | BitKeeper — commercial DVCS used for Linux kernel |
| **2005** | **Git created by Linus Torvalds** after BitKeeper revoked free license |
| 2007 | GitHub launched — Git + social coding |
| 2008 | Git becomes dominant in open source |
| 2011 | GitHub passes 1 million repositories |
| 2018 | Microsoft acquires GitHub for $7.5B |
| 2024 | Git used by &gt;90% of professional developers |

**Why Linus wrote Git in two weeks:**
The Linux kernel had thousands of contributors and needed a system that was fast, distributed (no central server required), and handled branching/merging well. No existing VCS met all three requirements.

---

## Centralized vs Distributed

```
Centralized (SVN, CVS):            Distributed (Git):
  Central server holds history       Every clone has full history
       │                                  Dev A ←──→ Remote ←──→ Dev B
    Server                               (full)       (full)     (full)
   /    \                            
 Dev A  Dev B                       Git advantages:
   ↑      ↑                           Work offline (full local history)
 Checks out latest snapshot          Faster operations (no network needed)
 No history locally                  Branching is cheap and fast
 Server down = can't commit          No single point of failure
```

---

## Git's Core Concepts (Preview)

```
Repository (repo): the project + its full history
  .git/ directory: hidden folder containing all history

Commit: a snapshot of all tracked files at a point in time
  Has: unique SHA hash, author, date, message, parent commit(s)

Branch: a named pointer to a commit
  main/master: default branch (the "trunk")
  feature/login: a branch for the login feature
  Branches are free to create, cheap, and disposable

Working tree: the files you actually see and edit
Staging area (index): files queued for the next commit
Remote: a copy of the repository on another machine (GitHub, etc.)

The three states a file can be in:
  Modified  → you changed it; not staged yet
  Staged    → marked to go into the next commit
  Committed → safely stored in the local repo history
```

---

## Tips

- Git tracks *content*, not files — if you move a file, Git detects the rename by comparing content hashes, not filenames.
- Every Git repo is self-contained — the entire history lives in the `.git/` directory. Delete that folder and you have a plain directory with no version history.
- `git` is the tool; GitHub/GitLab/Bitbucket are *hosting services* for Git repositories. Git works perfectly without them (over SSH, local paths, or any URL).
- The default branch was historically called `master`; modern convention (and GitHub default) is `main`. They are functionally identical — just a name.

---

## Summary

- Version control solves the "final_REAL_v2.zip" problem — every change is tracked with who, when, and why.
- Git is a distributed VCS — every clone contains the full project history; no central server required to commit.
- Linus Torvalds wrote Git in 2005 for Linux kernel development; it is now used by &gt;90% of developers.
- Core concepts: repository, commit (snapshot), branch (named pointer), working tree, staging area, remote.
- Three file states: modified → staged → committed.
