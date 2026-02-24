---
title: "Introduction to Version Control"
sidebar_label: "Introduction"
sidebar_position: 1
---

# Introduction to Version Control

Version control systems (VCS) manage changes to files over time. They allow developers to track modifications, revert to previous states, and collaborate efficiently.

Before version control, teams manually copied files or maintained separate folders. This caused duplication, conflicts, and loss of history.

A version control system solves three fundamental problems:

1. **History tracking** – Every change is recorded.
2. **Collaboration** – Multiple contributors can work simultaneously.
3. **Recovery** – Previous versions can be restored.

## Centralized vs Distributed Systems

### Centralized Version Control (CVCS)
A single central server stores the entire repository. Clients check out files and commit changes back to the server.

Advantages:
- Simple structure
- Central authority

Disadvantages:
- Single point of failure
- Limited offline work

### Distributed Version Control (DVCS)

Each contributor has a full copy of the repository, including its entire history.

Advantages:
- No single point of failure
- Full offline capability
- High performance

Git is a **distributed version control system (DVCS)**.