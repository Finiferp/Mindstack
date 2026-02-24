---
title: "Git Object Model"
sidebar_label: "Internals"
sidebar_position: 3
---

# Git Object Model

Git is fundamentally a content-addressable database.

Everything in Git is stored as an object, identified by a cryptographic hash.

## The Four Object Types

### Blob
Stores file content. It does not contain filename or metadata.

### Tree
Represents a directory. It maps filenames to blobs or other trees.

### Commit
Points to:
- A tree (snapshot of project)
- Parent commit(s)
- Metadata (author, message)

### Tag
Optional reference to a specific commit.

## Hashing and Integrity

Each object is identified by a SHA-based hash. If the content changes, the hash changes.

This guarantees:
- Data integrity
- Tamper detection
- Consistency across distributed copies

Git’s history is a directed acyclic graph (DAG).