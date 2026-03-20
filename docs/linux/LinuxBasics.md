---
title: "Linux Basics and Filesystem"
sidebar_label: "Linux Basics"
sidebar_position: 1
---

# What is Linux

Linux is an open-source **kernel** created by Linus Torvalds in 1991.

The kernel is responsible for:

- Process management
- Memory management
- Hardware communication (drivers)
- System calls interface

Linux by itself is **not a complete operating system**.

---

## GNU/Linux

Most systems referred to as "Linux" are actually **GNU/Linux systems**.

This means they combine:

- Linux kernel → low-level system control
- GNU tools → user-space utilities and core commands

Examples of GNU components:

- bash → shell
- coreutils → basic commands (ls, cp, mv)
- gcc → compiler
- glibc → standard C library

The GNU project provides the majority of userland tools used in Linux systems.

---

## Linux Distributions

A distribution (distro) is a complete operating system built around the Linux kernel.

It includes:

- Kernel
- Package manager
- Default tools and utilities
- Optional desktop environment

---

### Examples

- Ubuntu → user-friendly, Debian-based
- Debian → stable, widely used in servers
- Arch Linux → minimal, rolling release
- Fedora → upstream-focused, newer technologies

---

## Summary

Linux:

- Kernel providing low-level system control
- Combined with GNU tools → full operating system (GNU/Linux)