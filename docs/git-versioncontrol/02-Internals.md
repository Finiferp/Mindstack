---
title: "Git Internals"
sidebar_label: "Internals"
sidebar_position: 2
---

# Git Internals

Understanding what Git actually stores makes every command make sense. Git is a content-addressable filesystem with a thin VCS layer on top.

---

## The Object Model

Everything in Git is an **object** stored in `.git/objects/`. There are four types.

### Blob — File Content

```bash
# A blob stores raw file content — no filename, no metadata
echo "Hello, Git" | git hash-object --stdin
# 8ab686eafeb1f44702738c8b0f24f2567c36da6d

# Git stores it at: .git/objects/8a/b686eafeb1f44702738c8b0f24f2567c36da6d
# First 2 chars = directory; rest = filename

# Inspect a blob
git cat-file -t 8ab686ea    # type: blob
git cat-file -p 8ab686ea    # content: Hello, Git

# Two files with identical content share ONE blob — no duplication
```

### Tree — Directory Listing

```bash
# A tree maps filenames to blob/tree SHAs (like a directory listing)
git cat-file -p HEAD^{tree}
# 100644 blob a1b2c3d4... README.md
# 100644 blob e5f6g7h8... package.json
# 040000 tree i9j0k1l2... src/

# File modes:
# 100644 = regular file
# 100755 = executable file
# 120000 = symbolic link
# 040000 = directory (tree)
```

### Commit — Snapshot + Metadata

```bash
# A commit points to a tree + parent commit(s) + author/message
git cat-file -p HEAD
# tree   a3b4c5d6e7f8...         ← root tree SHA
# parent 1a2b3c4d5e6f...         ← previous commit SHA
# author Alice <alice@x.com> 1700000000 +0000
# committer Alice <alice@x.com> 1700000000 +0000
#
# feat: add user authentication

# A commit IS its SHA — if anything changes (message, parent, tree, time),
# the SHA is completely different. This is how history is tamper-evident.
```

### Tag — Named Reference to a Commit

```bash
# Annotated tags are objects (like commits but immutable)
git cat-file -p v1.0
# object abc123...    ← points to a commit
# type commit
# tag v1.0
# tagger Alice <alice@x.com> ...
# Release 1.0
```

---

## SHA-1 / SHA-256 Hashing

```
Git identifies every object by the SHA-1 hash of its content.
(SHA-256 is available in newer Git versions via --object-format=sha256)

SHA-1: 160-bit hash displayed as 40 hex characters
  Collision probability: astronomically low for practical use
  2017: Google found SHA-1 collision (SHAttered attack)
  Git mitigation: hardened SHA-1 (detects the specific SHAttered attack vectors)
  Long-term: migration to SHA-256 ongoing

What gets hashed:
  blob:   "blob <size>\0<content>"
  tree:   "tree <size>\0<entries>"
  commit: "commit <size>\0<content>"

This means:
  Same content → always same SHA (content-addressable)
  Identical files across repos share the same blob SHA
  History is cryptographically verified — any tampering changes all downstream SHAs
```

---

## The .git Directory

```
.git/
├── HEAD              ← current branch or commit SHA
├── config            ← local repo config
├── description       ← used by GitWeb (ignore for local use)
├── COMMIT_EDITMSG    ← last commit message
├── MERGE_HEAD        ← commit being merged (during active merge)
├── CHERRY_PICK_HEAD  ← commit being cherry-picked
├── index             ← staging area (binary file)
├── packed-refs       ← packed branch/tag refs (performance optimization)
│
├── objects/          ← ALL git objects (blobs, trees, commits, tags)
│   ├── 8a/
│   │   └── b686eafeb1f44702738c8b0f24f2567c36da6d
│   ├── pack/         ← packed object files (for efficient storage)
│   └── info/
│
├── refs/
│   ├── heads/        ← local branches (one file per branch)
│   │   ├── main      ← contains SHA of tip commit
│   │   └── feature-x
│   ├── remotes/      ← remote tracking branches
│   │   └── origin/
│   │       ├── main
│   │       └── feature-x
│   └── tags/         ← lightweight tags
│
└── hooks/            ← scripts triggered by Git events
    ├── pre-commit.sample
    ├── commit-msg.sample
    └── pre-push.sample
```

```bash
# Read HEAD directly
cat .git/HEAD
# ref: refs/heads/main

# Read a branch ref
cat .git/refs/heads/main
# abc123def456...  (SHA of the tip commit)

# In detached HEAD state:
cat .git/HEAD
# abc123def456...  (SHA directly)
```

---

## How Commits Form a Chain

```
         older ←─────────────────── newer
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ commit A │◄──│ commit B │◄──│ commit C │◄── main (branch pointer)
    │ tree: .. │   │ tree: .. │   │ tree: .. │◄── HEAD
    │ parent:─ │   │ parent:A │   │ parent:B │
    └──────────┘   └──────────┘   └──────────┘

Each commit stores a FULL snapshot (the tree), not a diff.
But Git deduplicates blobs — unchanged files point to the same blob object.
Git computes diffs on-the-fly when you run 'git diff'.

Pack files (.git/objects/pack/):
  Git periodically "packs" loose objects into a pack file
  Uses delta compression (similar to diffs) for similar blobs
  Dramatically reduces disk usage
  git gc (garbage collection) triggers packing
```

---

## Refs, Branches, and Tags

```bash
# A branch is just a file containing a SHA
cat .git/refs/heads/main
# a1b2c3d4e5f6...

# Creating a branch just creates this file
git branch new-feature     # creates .git/refs/heads/new-feature

# Moving a branch = updating the SHA in the file
git commit → HEAD moves → branch pointer moves automatically

# Tags: lightweight vs annotated
git tag v1.0              # lightweight: just a file pointing to a commit SHA
git tag -a v1.0 -m "..."  # annotated: a full tag object (recommended)

# Difference:
# Lightweight: .git/refs/tags/v1.0 → commit SHA (no extra object)
# Annotated:   .git/refs/tags/v1.0 → tag object SHA → commit SHA
# Use annotated for releases (has tagger, date, message, can be signed)
```

---

## The Index (Staging Area)

```bash
# The index is a binary file tracking what will go into the next commit
# It contains: file path, blob SHA, file mode, timestamps

# Inspect the index
git ls-files --stage
# 100644 a1b2c3... 0    README.md
# 100644 e5f6g7... 0    src/index.js

# The three columns: mode, blob-SHA, stage-number (0=normal, 1-3=during conflict)

# What 'git add' does:
#   1. Hashes the file content → creates blob object in .git/objects/
#   2. Updates .git/index with the new blob SHA for that path

# What 'git commit' does:
#   1. Reads the index → builds tree objects
#   2. Creates a commit object pointing to the root tree + parent
#   3. Updates HEAD (and the current branch) to point to new commit
```

---

## Garbage Collection

```bash
# Git accumulates loose objects over time
# Unreachable objects (orphaned commits, dropped stashes) persist temporarily

git gc                        # pack loose objects; prune unreachable objects
git gc --aggressive           # more thorough repacking (slower; better compression)
git prune                     # remove unreachable objects (git gc runs this)
git fsck                      # verify integrity of all objects
git fsck --unreachable        # find orphaned objects

# Reflog: Git keeps a safety net for 30–90 days
# Even after 'git reset --hard', the old commits are still reachable via reflog
git reflog                    # every position HEAD has ever been at
git reflog expire --expire=90.days --all   # manually expire old reflog entries
```

---

## Git's Data Integrity Guarantee

```
Because every object is identified by the SHA of its content:
  You cannot silently corrupt a file — checksum mismatch = error
  You cannot change a commit's history without changing all downstream SHAs
  Two repos with the same commit SHA have identical content for that commit

This makes Git a content-addressable storage system:
  Store by hash → retrieve by hash
  No duplicates (same content = same hash = stored once)
  Cryptographically verified history
```

---

## Tips

- `git cat-file -p <SHA>` lets you inspect any object — useful for debugging or understanding what Git actually stored.
- Pack files are why cloning a large repo is faster than you'd expect — Git efficiently delta-compresses similar blobs.
- The reflog is your safety net — even after `git reset --hard`, your commits aren't gone for 30+ days. `git reflog` shows every HEAD position.
- Never manually edit `.git/` files unless you know exactly what you're doing — use Git commands instead.
- Understanding that a branch is just a file containing a SHA makes it obvious why branches are cheap and instant to create.

---

## Summary

- Git stores four object types: **blob** (file content), **tree** (directory), **commit** (snapshot + metadata), **tag** (named ref).
- Every object is identified by the SHA hash of its content — the same content always produces the same SHA.
- A branch is simply a file in `.git/refs/heads/` containing the SHA of the tip commit — extremely cheap to create.
- The index (staging area) is a binary file mapping paths to blob SHAs — `git add` updates it; `git commit` reads it.
- Commits store full snapshots (via trees), not diffs — Git computes diffs on-the-fly by comparing trees.
- The reflog keeps every HEAD position for 30–90 days — even "lost" commits are recoverable.
