---
title: "Remote Repositories"
sidebar_label: "Remotes"
sidebar_position: 7
---

# Remote Repositories

A **remote repository** is a version of your project that is hosted somewhere else.

Usually, this means:
- A server
- A cloud platform
- A shared company repository

Remotes allow multiple developers to work on the same project.

---

# Common Hosting Platforms

Popular Git hosting platforms include:

- GitHub  
- GitLab  
- Bitbucket  

These platforms provide:
- Repository hosting
- Access control
- Pull requests
- Code reviews
- CI/CD integration

---

# What Is a Remote in Git?

In Git, a remote is simply a reference (a name) that points to another repository.

When you clone a repository:

```console
git clone https://example.com/project.git
````

Git automatically creates a remote called:

***origin***

You can see your configured remotes:

```console
git remote -v
```

You can also add a new remote:

```console
git remote add upstream https://example.com/original.git
```

This is common in open-source workflows.

---

# Remote Tracking Branches

Git keeps special branches that track the state of remote branches.

They look like this:

origin/main  
origin/feature-login  

These are called **remote tracking branches**.

Important:
- You do NOT work directly on them.
- They show the last known state of the remote repository.

When you fetch updates, these branches are updated.

---

# Synchronizing with a Remote

Working with remotes usually involves three main actions:

- Fetch
- Pull
- Push

Let’s understand each one clearly.

---

## Fetch (Download Only)

Fetch downloads new commits from the remote repository.

git fetch origin

This:
- Updates remote tracking branches
- Does NOT modify your current branch
- Is safe to run anytime

It allows you to see what changed before merging.

---

## Pull (Fetch + Merge)

Pull downloads changes and merges them into your current branch.

git pull origin main

Under the hood, this usually does:

1. git fetch  
2. git merge  

After pulling, your local branch is updated.

---

## Push (Upload Changes)

Push sends your local commits to the remote repository.

```console
git push origin main
```

This updates the remote branch with your local commits.

If others are collaborating, they can now fetch or pull your changes.

---

# Example Workflow

Imagine this situation:

1. You clone a repository.
2. You create a new feature branch.
3. You commit your changes.
4. You push the branch:

```console
git push origin feature-login
```

Now:
- The branch exists on the remote
- Other team members can review it
- You can open a pull request

---

# Why Remotes Are Important

Remotes provide:

- Collaboration between developers
- Backup of your work
- Centralized coordination
- Integration with DevOps tools

Even though Git is distributed, remotes make teamwork structured and organized.