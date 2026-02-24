---
title: "Branching and Merging"
sidebar_label: "Branching"
sidebar_position: 4
---

# Branching and Merging

A branch in Git is simply a pointer to a commit.

Creating a branch does not copy files; it creates a new reference.

## Why Branching is Powerful

Branches allow:
- Parallel development
- Feature isolation
- Experimental changes
- Safe releases

Because Git uses a snapshot-based object model, branching is lightweight and fast.

## Merging

Merging integrates changes from one branch into another.

Types of merges:

- Fast-forward merge
- Three-way merge

A three-way merge uses:
- Common ancestor
- Current branch
- Target branch

Conflicts occur when changes affect the same lines differently.