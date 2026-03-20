---
title: "Linux Commands"
sidebar_label: "Basic Commands"
sidebar_position: 3
---

# Basic Commands

Linux systems are primarily controlled via the **shell (terminal)**.

Commands follow this general structure:

`command [options] [arguments]`

Example:

`ls -la /home/user`

---

## Navigation

### pwd

Print current working directory.

`pwd`

---

### ls

List directory contents.

Common options:

- `-l` → long format (permissions, owner, size)
- `-a` → show hidden files
- `-h` → human-readable sizes

Examples:

`ls`  
`ls -la`  
`ls -lh /etc`

---

### cd

Change directory.

Examples:

`cd /home/user`  
`cd ..` → go up one directory  
`cd ~` → go to home directory  
`cd -` → previous directory  

---

## File Operations

### cp

Copy files and directories.

Examples:

`cp file.txt backup.txt`  
`cp -r folder/ backup/`

Options:

- `-r` → recursive (for directories)
- `-i` → prompt before overwrite

---

### mv

Move or rename files.

Examples:

`mv file.txt new.txt`  
`mv file.txt /home/user/`

---

### rm

Remove files or directories.

Examples:

`rm file.txt`  
`rm -r folder/`

Options:

- `-r` → recursive
- `-f` → force (no confirmation)

---

### touch

Create empty file or update timestamp.

Example:

`touch file.txt`

---

### mkdir

Create directory.

Example:

`mkdir new_folder`

---

### rmdir

Remove empty directory.

Example:

`rmdir folder`

---

## Viewing Files

### cat

Display entire file.

`cat file.txt`

---

### less

Scroll through file (recommended for large files).

`less file.txt`

Navigation:

- `q` → quit
- `/text` → search

---

### head

Show first lines of file.

`head file.txt`  
`head -n 20 file.txt`

---

### tail

Show last lines of file.

`tail file.txt`  
`tail -n 20 file.txt`

Follow live updates:

`tail -f /var/log/syslog`

---

## File Information

### file

Determine file type.

`file filename`

---

### stat

Detailed file information.

`stat file.txt`

---

## Search and Find

### find

Search for files in directory tree.

Example:

`find /home -name file.txt`

---

### grep

Search inside files.

Example:

`grep "text" file.txt`

Options:

- `-i` → ignore case
- `-r` → recursive

---

## Permissions (Quick Use)

### chmod

Change file permissions.

Example:

`chmod 755 script.sh`

---

### chown

Change file ownership.

Example:

`chown user:group file.txt`

---

## Disk and System

### df

Show disk space usage.

`df -h`

---

### du

Show directory size.

`du -sh folder`

---

### free

Show memory usage.

`free -h`

---

## Process Management

### ps

Show running processes.

`ps aux`

---

### top

Real-time process monitoring.

`top`

---

### kill

Terminate process.

`kill PID`  
`kill -9 PID`

---

## Help and Documentation

### man

Manual pages.

`man ls`

---

### --help

Quick help for commands.

`ls --help`

---

## Command Chaining

### Using &&

Run next command only if previous succeeds.

`apt update && apt upgrade`

---

### Using |

Pipe output to another command.

Example:

`ls -la | grep file`

---

## Redirection

### Output to file

`ls > files.txt`

---

### Append output

`ls >> files.txt`

---

### Input from file

`cat < file.txt`

---

## Summary

Linux commands:

- Follow structure: `command [options] [arguments]`
- Are case-sensitive
- Can be combined using pipes and chaining

Core skills:

- Navigation (`cd`, `ls`, `pwd`)
- File management (`cp`, `mv`, `rm`)
- Viewing (`less`, `cat`)
- Searching (`find`, `grep`)
- System inspection (`df`, `ps`, `top`)