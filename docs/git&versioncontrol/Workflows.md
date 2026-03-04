---
title: "Git Workflows"
sidebar_label: "Workflows"
sidebar_position: 8
---

# Git Workflows

A **Git workflow** is a set of rules or patterns that a team uses to organize branches, commits, and releases.

Using a workflow helps:

- Keep the main branch stable  
- Organize features and bug fixes  
- Make collaboration easier  
- Prepare releases safely  

---

# Common Workflows

There are several popular workflows. Let’s look at them.

---

## 1. Centralized Workflow

The simplest workflow.

- One main branch (`main` or `master`)  
- Everyone commits directly to it  

Example:

```console
git checkout main  
git commit -m "Fix login bug"  
git push origin main  
```

### Pros:
- Easy to understand  
- Simple for small teams  

### Cons:
- Not ideal for multiple developers working in parallel  
- Main branch can break easily  

---

## 2. Feature Branch Workflow

Every new feature or bug fix gets its own branch.

Example:

```console
git checkout -b feature-login  
```

- Work on the branch  
- Commit changes  
- Merge back to `main` when ready  

### Pros:
- Isolates work  
- Keeps `main` stable  
- Easy code reviews  

### Cons:
- Requires merging branches  
- Small overhead for branch management  

---

## 3. Git Flow

A more structured workflow, popular in release-based projects.

Defined branches:

- **Main** → stable production-ready code  
- **Develop** → integration branch for features  
- **Feature** → one branch per feature  
- **Release** → prepare a new release  
- **Hotfix** → quick fixes on main  

Example flow:

1. Create feature branch from `develop`  
2. Work and commit  
3. Merge feature into `develop`  
4. Create release branch from `develop`  
5. Merge release into `main` and `develop`  
6. Hotfix branch for urgent production issues  

### Pros:
- Structured  
- Clear separation of work  
- Supports multiple releases  

### Cons:
- Can be complex for small teams  
- More branches to manage  

---

## 4. Forking Workflow

Common in open-source projects.

- Developers fork the original repository  
- Work on a feature branch in their fork  
- Push changes to their fork  
- Open a Pull Request to the original repo  

### Pros:
- Safe contributions  
- Controlled code reviews  
- Easy collaboration for many developers  

### Cons:
- Requires understanding forks and pull requests  
- Can be confusing for beginners  

---

# Choosing a Workflow

The right workflow depends on:

- **Team size** – small teams may use centralized or feature branch workflow  
- **Release frequency** – frequent releases benefit from Git Flow or feature branch workflow  
- **Deployment strategy** – some workflows integrate better with CI/CD pipelines  

---

# Summary

Workflows are important because they:

- Organize branches  
- Keep main code stable  
- Support collaboration and releases  
- Reduce mistakes  

Choosing a workflow is about balancing **simplicity** and **control**.