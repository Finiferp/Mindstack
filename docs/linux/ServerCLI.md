---
title: "Linux Command Line and Server Administration"
sidebar_label: "Server CLI"
sidebar_position: 3
---

# Linux Command Line Interface (CLI)

The Linux CLI is a powerful tool for interacting with the system.  
It allows administrators and users to perform tasks efficiently, often faster than graphical tools.

This chapter covers:

- Basic CLI usage
- Server administration commands
- Text editing and file manipulation
- User and permission management

---

# Basic Linux Commands

Common commands for everyday tasks:

| Command | Description |
|---------|-------------|
| `ls` | List directory contents |
| `cd` | Change directory |
| `pwd` | Print current working directory |
| `mkdir` | Create a new directory |
| `rm` | Remove files or directories |
| `cp` | Copy files or directories |
| `mv` | Move or rename files/directories |
| `cat` | Display file contents |
| `less` | View file contents page by page |

---

# File Permissions and Ownership

Linux uses **users, groups, and permissions** to control access.

### Viewing Permissions

ls -l

Example output:

```
-rw-r--r-- 1 user group 1024 Mar 10 10:00 file.txt
```

### Changing Permissions

- **chmod** – change file permissions

```
chmod 644 file.txt
chmod +x script.sh
```

- **chown** – change file owner and group

```
chown user:group file.txt
```

---

# Package Management (Server Commands)

Different distributions have different package managers.

### Debian / Ubuntu

```
sudo apt update
sudo apt upgrade
sudo apt install package_name
sudo apt remove package_name
```

### Red Hat / CentOS / Fedora

```
sudo dnf update
sudo dnf install package_name
sudo dnf remove package_name
```

---

# Process Management

Linux provides tools to monitor and manage running processes.

| Command | Description |
|---------|-------------|
| `ps aux` | List all running processes |
| `top` | Dynamic real-time view of processes |
| `htop` | Enhanced interactive process viewer |
| `kill PID` | Terminate a process by PID |
| `pkill name` | Kill processes by name |

---

# Networking Commands

Manage network interfaces, test connectivity, and monitor traffic.

| Command | Description |
|---------|-------------|
| `ip a` | Show network interfaces and addresses |
| `ping host` | Test connectivity to a host |
| `netstat -tuln` | List open ports and listening services |
| `ss -tuln` | Alternative to netstat |
| `traceroute host` | Show path packets take to a host |
| `curl url` | Retrieve content from a URL |

---

# Disk Usage and Management

Monitor storage and usage on Linux systems.

- `df -h` – disk usage per partition
- `du -sh /path` – size of directory or file
- `lsblk` – display block devices
- `mount` / `umount` – mount or unmount storage devices

---

# Text Editing

Two common terminal-based text editors:

### nano

```
nano file.txt
```

- Simple and easy to use
- Use `Ctrl+O` to save, `Ctrl+X` to exit

### vim

```
vim file.txt
```

- More powerful and flexible
- Modes: normal, insert, visual
- Commands:
  - `i` → insert mode
  - `:w` → save
  - `:q` → quit
  - `:wq` → save and quit

---

# User and Group Management

Linux users and groups control system access.

- **Add user:**

```
sudo adduser username
```

- **Delete user:**

```
sudo deluser username
```

- **Add group:**

```
sudo addgroup groupname
```

- **Assign user to group:**

```
sudo usermod -aG groupname username
```

- **Switch user:**

```
su - username
```

---

# System Logs

Logs are critical for server administration.

- **View system logs:**

```
journalctl
```

- **View real-time logs:**

```
journalctl -f
```

- **Filter logs by service:**

```
journalctl -u ssh
```

---

# Scheduling Tasks

Automate tasks using `cron`:

- Edit user cron jobs:

```
crontab -e
```

- Cron format:

```
* * * * * command
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7)
│ │ │ └── Month (1-12)
│ │ └─── Day of month (1-31)
│ └──── Hour (0-23)
└───── Minute (0-59)
```

---

# Summary

The Linux CLI is essential for:

- Server administration
- Efficient system monitoring
- Automation and scripting
- File and user management

Mastering the CLI is crucial for any Linux power user or system administrator.