---
title: "Advanced Git Concepts"
sidebar_label: "Advanced"
sidebar_position: 9
---

# Advanced Git Concepts

Once you understand the basics of Git, these advanced features help you manage complex workflows and optimize your projects.

---

## Cherry-Picking

**Cherry-picking** means applying a specific commit from one branch to another.

Example:

- You fixed a bug in `feature-login` branch (commit `a1b2c3`)  
- You want the same fix in `main` without merging the whole branch  

Command:

```console
git checkout main  
git cherry-pick a1b2c3  
```

Now the bug fix is in `main` as a new commit.

---

## Submodules

A **submodule** allows you to embed one Git repository inside another.

Use cases:
- Reusing shared libraries
- Including external projects
- Managing dependencies

Example:

```console
git submodule add https://github.com/example/library.git libs/library  
```

This creates a folder `libs/library` that tracks another repository separately.

---

## Hooks

**Hooks** are scripts that run automatically when certain Git events happen.

Common hooks:
- pre-commit → checks code before committing  
- post-commit → runs after committing  
- pre-push → runs before pushing  

Example: a pre-commit hook can automatically check code formatting:

`.git/hooks/pre-commit`:
```console
#!/bin/sh  
npm run lint  
```
Git will prevent commits if lint fails.

---

## Garbage Collection

Git stores many objects over time. Some objects may become unreachable (not referenced by any branch or tag).

Git periodically cleans these objects with **garbage collection**:
```console
git gc  
```
This:
- Reduces repository size
- Optimizes performance
- Removes unreachable commits or blobs

---

## Detached HEAD

Normally, HEAD points to a branch.  

A **detached HEAD** means HEAD points directly to a commit.

Example:

```console
git checkout a1b2c3  
```
Now you are not on a branch. You can:
- Inspect files
- Make temporary changes

But beware:
- Commits here are easy to lose if you switch branches
- To keep them, create a new branch:
```console
git checkout -b temp-fix  
```
Detached HEAD is useful for:
- Exploring old commits  
- Testing without affecting branches  

---

# Summary

Advanced Git concepts give you:

- Fine-grained control with cherry-pick  
- Organized projects with submodules  
- Automation with hooks  
- Optimized repositories with garbage collection  
- Safe experimentation with detached HEAD  