---
title: "Linux Filesystem"
sidebar_label: "Filesystem"
sidebar_position: 2
---

# Linux Filesystem

Linux uses a **hierarchical filesystem** starting from a single root:

`/`

All files and directories exist under this root.

Unlike Windows:

- No drive letters (C:, D:)
- Everything is mounted into the same directory tree

---

# Core Concepts

## Everything is a File

In Linux, almost everything is represented as a file:

- Regular files → text, binaries
- Directories → containers
- Devices → `/dev/sda`
- Processes → `/proc`
- System info → `/sys`

---

## Case Sensitivity

Linux is case-sensitive:

- `file.txt` ≠ `File.txt`

---

## Paths

### Absolute Path

Starts from root:

`/home/user/file.txt`

---

### Relative Path

Relative to current directory:

`./file.txt`  
`../file.txt`

---

## Mounting

Storage devices must be mounted into the filesystem.

Example:

`mount /dev/sda1 /mnt`

---

# Full Filesystem Overview

Simplified structure:
`/`
- `bin`
- `boot`
- `dev`
- `etc`
- `home`
- `lib`
- `lib64`
- `media`
- `mnt`
- `opt`
- `proc`
- `root`
- `run`
- `sbin`
- `srv`
- `sys`
- `tmp`
- `usr`
- `var`

---

# Directory Structure

## Root Directory

`/` is the top-level directory. Everything starts here.

---

## Essential Directories

### /bin

Essential user commands required for system operation.

Examples:

`ls`  
`cp`  
`mv`  
`sh`

---

### /sbin

System binaries (administrative tools).

Examples:

`reboot`  
`fsck`  
`ip`

---

### /boot

Boot-related files:

- Kernel (`vmlinuz`)
- initramfs
- Bootloader files (GRUB)

---

### /dev

Device files representing hardware.

Examples:

`/dev/sda` → disk  
`/dev/null` → discard output  
`/dev/tty` → terminal  

---

### /etc

System-wide configuration files.

Examples:

`/etc/passwd`  
`/etc/hosts`  
`/etc/fstab`  
`/etc/ssh/sshd_config`

---

### /home

User home directories.

Example:

`/home/user`

Contains:

- Personal files
- User configs (dotfiles like `.bashrc`)

---

### /root

Home directory of the root user.

`/root`

---

### /lib and /lib64

Shared libraries required by binaries.

- `/lib` → 32-bit
- `/lib64` → 64-bit

---

### /usr

Userland programs and data.

Subdirectories:

- `/usr/bin` → user commands
- `/usr/sbin` → admin commands
- `/usr/lib` → libraries
- `/usr/share` → shared files

---

### /var

Variable data (changes frequently).

Examples:

`/var/log` → logs  
`/var/cache` → cache  
`/var/lib` → application data  

---

### /tmp

Temporary files.

- Cleared on reboot (usually)
- Writable by all users

---

### /run

Runtime data (since last boot).

Examples:

- PID files
- system state info

---

### /proc

Virtual filesystem exposing process and kernel information.

Examples:

`/proc/cpuinfo`  
`/proc/meminfo`  
`/proc/[PID]`

---

### /sys

Interface to kernel and hardware.

Used for:

- Device configuration
- Kernel interaction

---

### /mnt

Temporary mount point for manual mounts.

---

### /media

Auto-mounted removable devices:

- USB drives
- External disks

---

### /opt

Optional third-party software.

---

### /srv

Data served by services (web, FTP).

---

## File Types

### Regular Files

Text files, binaries, scripts.

---

### Directories

Contain other files.

---

### Symbolic Links

Pointers to other files.

Example:

`ln -s target link`

---

### Block Devices

Storage devices.

Example:

`/dev/sda`

---

### Character Devices

Stream devices.

Example:

`/dev/tty`

---

### Sockets

Used for inter-process communication.

---

### Named Pipes (FIFO)

Special files for process communication.

---

## Useful Commands

### List Files

`ls -la`

---

### Show Current Directory

`pwd`

---

### Change Directory

`cd /path`

---

### Show File Type

`file filename`

---

### Show Disk Usage

`df -h`

---

### Show Directory Size

`du -sh folder`

---

### Tree View (if installed)

`tree /`

---

## Filesystem Standard (FHS)

Linux follows the **Filesystem Hierarchy Standard (FHS)**.

Defines:

- Directory structure
- Purpose of each directory
- Consistency across distributions

---

## Summary

The Linux filesystem:

- Uses a single-root hierarchy (`/`)
- Does not use drive letters
- Treats everything as a file
- Requires mounting for storage devices

Key directories:

- `/etc` → configuration
- `/home` → users
- `/var` → logs/data
- `/usr` → programs
- `/dev` → devices
- `/proc`, `/sys` → kernel interfaces