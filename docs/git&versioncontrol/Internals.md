---
title: "Git Object Model"
sidebar_label: "Internals"
sidebar_position: 3
---

# Git Object Model

Git is basically a **content-addressable database**.

This means:
- Git stores data as objects.
- Each object is identified by a unique hash.
- If the content changes, the hash changes.

Git does not think in terms of "files and folders" like we do.  
Internally, everything is stored as objects.

---

# The Four Object Types

Git has four main object types:

1. Blob
2. Tree
3. Commit
4. Tag

Understand each one in simple terms.

---

## Blob

A **blob** stores the content of a file.

Important:
- It does NOT store the filename.
- It does NOT store folder information.
- It only stores raw file data.

Example:

If you have a file:

hello.txt

With content:

Hello World

Git stores "Hello World" as a blob object.

If two files have exactly the same content, Git may store only one blob and reference it twice.

---

## Tree

A **tree** represents a directory.

It connects:
- Filenames
- Blobs (files)
- Other trees (subfolders)

Think of a tree as a folder structure.

Example:

project/
  app.js
  config/
    db.js

Git stores:
- A blob for app.js
- A blob for db.js
- A tree for config
- A tree for project (root tree)

The tree links everything together.

---

## Commit

A **commit** object connects everything into a snapshot.

A commit contains:

- A reference to a tree (the project snapshot)
- Reference to parent commit(s)
- Author name
- Timestamp
- Commit message

When you run:

```console
git commit -m "Add login feature"
```

Git:
1. Creates blobs for changed files
2. Creates or updates trees
3. Creates a commit object pointing to the root tree

Each commit has a unique hash.

Example commit chain:

Commit C → Commit B → Commit A

Each commit points to its parent.

---

## Tag

A **tag** is a label for a specific commit.

It is usually used for:
- Releases
- Important milestones

Example:

v1.0
v2.0
stable-release

You can create a tag like this:

```console
git tag v1.0
```

Now `v1.0` points to a specific commit.

Tags make it easier to reference important versions.

---

# Hashing and Integrity

Each Git object is identified by a SHA-based hash.

Example of a hash:

a3f5c8d9e12b4f...

This hash is created from:
- The content of the object
- The object type

If the content changes:
- The hash changes
- The object becomes different

This guarantees:

- Data integrity (content cannot change silently)
- Tamper detection
- Safe distributed collaboration

If someone changes even one character in a file, the hash will be completely different.

---

# Git as a Graph (DAG)

Git history is not just a simple list.

It is a **Directed Acyclic Graph (DAG)**.

That means:

- Directed → commits point to parent commits
- Acyclic → it cannot loop back
- Graph → branches create multiple paths

Example:

        C
       /
A → B
       \
        D

Here:
- B has two children (C and D)
- This represents branching
- Later, these branches can be merged

This structure makes Git very powerful for:
- Branching
- Merging
- Parallel development

---

# Why This Design Is Important

Because Git is built on this object model:

- Everything is fast
- Branching is cheap
- History is secure
- Data corruption is extremely unlikely

Understanding this internal model helps you:
- Debug complex issues
- Understand rebasing and merging
- Feel confident using advanced Git features