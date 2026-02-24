---
title: "Git Fundamentals"
sidebar_label: "Git Fundamentals"
sidebar_position: 2
---

# Git Fundamentals

Git is a distributed version control system designed for speed, integrity, and distributed collaboration.

## Core Concepts

### Repository

A **repository** is a complete database of tracked files and their history.

There are two types:
- Local repository
- Remote repository

### Working Directory

The working directory contains the actual files being edited.

### Staging Area (Index)

The staging area is an intermediate layer between the working directory and the repository. It allows selective preparation of changes before committing.

### Commit

A commit is a snapshot of the project at a specific point in time. Each commit contains:
- A unique identifier (hash)
- Author information
- Timestamp
- Reference to previous commit(s)

Commits form a chain, creating a historical timeline.

## Snapshot Model vs Delta Model

Unlike older systems that store file differences (deltas), Git stores full snapshots of files. If a file has not changed, Git references the existing version instead of duplicating it.

This design enables fast branching and merging.---
title: "Git Fundamentals"
sidebar_label: "Git Fundamentals"
sidebar_position: 2
---

# Git Fundamentals

Git is a distributed version control system designed for speed, integrity, and distributed collaboration.

## Core Concepts

### Repository

A **repository** is a complete database of tracked files and their history.

There are two types:
- Local repository
- Remote repository

### Working Directory

The working directory contains the actual files being edited.

### Staging Area (Index)

The staging area is an intermediate layer between the working directory and the repository. It allows selective preparation of changes before committing.

### Commit

A commit is a snapshot of the project at a specific point in time. Each commit contains:
- A unique identifier (hash)
- Author information
- Timestamp
- Reference to previous commit(s)

Commits form a chain, creating a historical timeline.

## Snapshot Model vs Delta Model

Unlike older systems that store file differences (deltas), Git stores full snapshots of files. If a file has not changed, Git references the existing version instead of duplicating it.

This design enables fast branching and merging.---
title: "Git Fundamentals"
sidebar_label: "Git Fundamentals"
sidebar_position: 2
---

# Git Fundamentals

Git is a distributed version control system designed for speed, integrity, and distributed collaboration.

## Core Concepts

### Repository

A **repository** is a complete database of tracked files and their history.

There are two types:
- Local repository
- Remote repository

### Working Directory

The working directory contains the actual files being edited.

### Staging Area (Index)

The staging area is an intermediate layer between the working directory and the repository. It allows selective preparation of changes before committing.

### Commit

A commit is a snapshot of the project at a specific point in time. Each commit contains:
- A unique identifier (hash)
- Author information
- Timestamp
- Reference to previous commit(s)

Commits form a chain, creating a historical timeline.

## Snapshot Model vs Delta Model

Unlike older systems that store file differences (deltas), Git stores full snapshots of files. If a file has not changed, Git references the existing version instead of duplicating it.

This design enables fast branching and merging.