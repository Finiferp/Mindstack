---
title: "Introduction to Version Control"
sidebar_label: "Introduction"
sidebar_position: 1
---

# Introduction to Version Control

Version Control Systems (VCS) help us manage changes to files over time.  
They are mainly used for source code, but they can track any type of file.

In simple words, version control lets you:
- See what changed
- See who changed it
- Go back to an older version if something breaks

## Why Do We Need Version Control?

Before version control existed, teams often:
- Copied files into new folders like `project_v1`, `project_v2`, `final_project_really_final`
- Sent files by email
- Overwrote each other's changes

This caused many problems:
- Lost work
- Conflicts between team members
- No clear history of changes

Version control solves these problems.

## What Problems Does Version Control Solve?

A version control system helps with three main things:

### 1. History Tracking
Every change is recorded.

Example:
- You change a login function.
- Two days later, the app stops working.
- With version control, you can go back and see exactly what changed.

You can even restore the old working version.

### 2. Collaboration
Many people can work on the same project at the same time.

Example:
- Alice works on the homepage.
- Bob works on the database.
- Charlie fixes a bug.

Version control keeps their changes organized and combines them safely.

### 3. Recovery
Mistakes happen. Files get deleted. Code breaks.

With version control, you can:
- Restore deleted files
- Undo changes
- Return the entire project to a previous state

This makes development much safer.

---

# Centralized vs Distributed Version Control

There are two main types of version control systems.

## Centralized Version Control (CVCS)

In a centralized system, there is one main server that stores the project.

Developers:
- Download files from the server
- Make changes
- Send (commit) changes back to the server

Example systems:
- Subversion (SVN)
- CVS

### Advantages
- Simple structure
- One central authority
- Easy to understand for beginners

### Disadvantages
- If the server goes down, no one can work
- You usually need internet access
- If the server data is lost, history may be lost

This is called a **single point of failure**.

---

## Distributed Version Control (DVCS)

In a distributed system, every developer has a full copy of the project, including its entire history.

This means:
- Each person has their own complete repository
- You can work without internet
- You can commit changes locally

Example systems:
- Git
- Mercurial

### Advantages
- No single point of failure
- Full offline work
- Very fast operations
- Better branching and merging

Even if one computer fails, the project still exists on other machines.

---

# Git

Git is a **Distributed Version Control System (DVCS)**.

This means:
- Everyone has a full copy of the repository
- You can work offline
- It is fast and flexible
- It is the most widely used version control system today

In the next sections, we will learn how Git works and how to use it in real projects.