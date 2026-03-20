---
title: "User Management"
sidebar_label: "Users"
sidebar_position: 6
---

# User Management

Linux is a **multi-user system**.  
Each user has:

- Username  
- User ID (UID)  
- Group membership  
- Home directory  
- Shell  

User accounts control access, permissions, and process ownership.

---

## Creating Users

### Add a new user

`sudo useradd username`

By default:

- Home directory may not be created (depends on distro)
- Default shell is `/bin/sh` or `/bin/bash`

### Common options

- `-m` → create home directory  
- `-s /bin/bash` → set default shell  
- `-G group1,group2` → add to supplementary groups  
- `-c "Full Name"` → add comment / description

Example:

`sudo useradd -m -s /bin/bash -G sudo,jail userspecial -c "John Doe"`

---

### Set password

`sudo passwd username`

Example:

`sudo passwd john`

- Prompts for new password  
- Updates `/etc/shadow`  

---

## Deleting Users

Remove user:

`sudo userdel username`

Remove user **and home directory**:

`sudo userdel -r username`

- Deletes home folder and mail spool  
- Optional: `-f` → force deletion  

---

## Groups

Groups are used to **manage permissions for multiple users**.

- Each user has a primary group (usually same as username)  
- Supplementary groups give additional access

### Add user to group

`sudo usermod -aG groupname username`

Example:

`sudo usermod -aG sudo john` → gives sudo access

### Remove user from group

`gpasswd -d username groupname`

### List groups

`groups username` → shows all groups of a user  
`getent group` → list all system groups

---

## User and Group Files

| File | Purpose |
|------|--------|
| `/etc/passwd` | List of all users, UID, GID, shell, home directory |
| `/etc/shadow` | Encrypted passwords and password info |
| `/etc/group` | Group definitions |
| `/etc/gshadow` | Group passwords (rarely used) |

---

## Switching Users

- `su - username` → switch user, load environment  
- `sudo -i -u username` → start login shell as user  
- `whoami` → shows current user  

---

## Special Users

- `root` → superuser, UID 0, full system access  
- System users → for services (nginx, mysql, etc.)  

Check system users:

`cat /etc/passwd | grep /usr/sbin/nologin`  

---

## Best Practices

- Use **sudo** instead of logging in as root  
- Assign users to appropriate groups  
- Set strong passwords  
- Lock unused accounts:

`usermod -L username`

---

## Summary

Linux users and groups:

- Control access to files, processes, and system functions  
- Users have UID, GID, home, shell, and groups  
- Commands:

  - `useradd`, `passwd`, `userdel` → create/manage users  
  - `usermod`, `groups`, `gpasswd` → manage group membership  
- Critical for multi-user security and system management