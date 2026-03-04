---
title: "Git Fundamentals"
sidebar_label: "Git Fundamentals"
sidebar_position: 2
---

# Git Fundamentals

Git is a distributed version control system.  
It is designed to be fast, reliable, and good for teamwork.

---

# Core Concepts

## Repository

A **repository** (or "repo") is the place where Git stores your project and its history.

It contains:
- Your project files
- All previous versions (commits)
- Git configuration data

There are two main types of repositories:

### Local Repository
This is the repository on your computer.

You can:
- Make commits
- Create branches
- View history
- Work without internet

### Remote Repository
This is a repository stored on a server.

It is used to:
- Share code
- Collaborate with others
- Backup your work

Example:
- Your laptop has the local repository.
- GitHub or GitLab hosts the remote repository.

---

## Working Directory

The **working directory** is the folder where you actually edit your files.

Example:
- You open `app.js`
- You change some code
- You save the file

At this point:
- The file is changed
- But Git has NOT saved this change yet

Git sees the modification, but it is not part of history until you commit it.

---

## Staging Area (Index)

The **staging area** is a middle step between editing files and making a commit.

It allows you to choose exactly what will go into the next commit.

Think of it like a "preparation table".

Example:

You changed three files:
- login.js
- register.js
- style.css

But you only want to commit the login feature first.

You can stage only `login.js`, then commit it.

To add a file to the staging area:

```console
git add login.js
```
Now Git prepares this file for the next commit.

---

## Commit

A **commit** is a snapshot of your project at a specific moment.

When you commit, Git saves:
- The current staged files
- Your name
- The date and time
- A message describing the change
- A unique ID (called a hash)

To create a commit:

```console
git commit -m "Add login functionality"
```

Each commit has a unique hash (like: a3f5c8d9...).  
This allows Git to identify it exactly.

---

### How Commits Work

Commits form a chain.

Each commit:
- Points to the previous commit
- Creates a timeline of changes

Example timeline:

Commit A → Commit B → Commit C

If something breaks in Commit C, you can go back to Commit B.

This makes Git very powerful and safe.

---

# Snapshot Model vs Delta Model

Older version control systems stored changes as **file differences** (called deltas).

Example:
- Line 5 changed from "Hello" to "Hello World"

Git works differently.

## Git's Snapshot Model

Git stores a full snapshot of your project at each commit.

Important:
- Git does NOT copy every file again and again.
- If a file did not change, Git simply references the existing version.

This makes Git:
- Very fast
- Very efficient
- Great for branching and merging

---

## Why This Matters

Because Git stores snapshots:

- Creating branches is very fast.
- Switching between versions is very fast.
- Merging changes is more reliable.

This design is one of the main reasons Git became so popular.

---

In the next section, we will see how these concepts work together in real workflows.