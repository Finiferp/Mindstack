---
title: "Distributed Collaboration"
sidebar_label: "Collaboration"
sidebar_position: 6
---

# Distributed Collaboration

Git is a **distributed** version control system.

This means:

- Every developer has a full copy of the repository
- The entire history exists on every machine
- Work can be done offline
- You can connect to multiple remote repositories

This design makes collaboration very flexible and powerful.

---

# What Does "Distributed" Really Mean?

When you clone a repository:

```console
git clone https://example.com/project.git
```

You do NOT just download the latest version.

You download:
- All commits
- All branches
- All tags
- The complete history

Your local copy is a full repository.

You can:
- Create branches
- Make commits
- View history
- Even delete the remote connection

And everything still works.

---

# Working Offline

Because you have the full repository:

You can commit without internet:

```console
git commit -m "Improve validation logic"
```

You can create branches:

```console
git branch new-feature
```

You only need internet when you want to:

- Push your changes
- Pull updates from others

This is very different from older centralized systems.

---

# Remote Repositories

In Git, a **remote** is just another repository you can communicate with.

Most projects use a remote called:

***origin***

You can see your remotes:

```console
git remote -v
```

You can also add multiple remotes.

Example:

- origin → company repository
- upstream → original open-source project
- personal → your private backup

Git does not limit you to one central server.

---

# Pushing and Pulling

Developers exchange changes using:

## Push

Sends your commits to a remote repository:

```console
git push origin main
```

This updates the remote branch with your local commits.

## Pull

Downloads commits from a remote repository:

```console
git pull origin main
```

This updates your local branch with remote changes.

Under the hood, pull usually does:
- fetch (download changes)
- merge (combine them)

---

# Common Collaboration Models

## 1. Centralized Model

Even though Git is distributed, teams can still work like this:

- One central repository
- Everyone pushes to it
- Everyone pulls from it

Simple and common in small teams.

---

## 2. Fork-Based Development

Common in open-source projects.

How it works:

1. You fork the original repository.
2. You clone your fork.
3. You create a feature branch.
4. You push changes to your fork.
5. You open a Pull Request.

This allows:
- Safe contributions
- Code reviews
- Controlled merging

---

## 3. Feature Branch Workflow

Each feature is developed in its own branch.

Example:

- feature-login
- feature-payment
- bugfix-navbar

Developers:
1. Create a branch
2. Work on it
3. Push it
4. Open a review
5. Merge after approval

This keeps the main branch stable.

---

# Why Distributed Collaboration Is Powerful

Because everyone has the full repository:

- No single point of failure
- Easy backups
- Flexible workflows
- Parallel development at scale

This is one of the key reasons Git became the industry standard.