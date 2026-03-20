---
title: "Linux Permissions"
sidebar_label: "Permissions"
sidebar_position: 4
---

# Permissions and Ownership

Each file and directory in Linux has:

- Owner → user who owns the file
- Group → group associated with the file
- Permissions → access rights

View permissions with:

`ls -l`

---

## Permission Format

Example:

`-rwxr-xr--`

---

### Breakdown

- First character → file type  
- Next 3 → owner permissions  
- Next 3 → group permissions  
- Last 3 → others (everyone else)  

---

### File Type Indicator

| Symbol | Type |
|-------|------|
| - | regular file |
| d | directory |
| l | symbolic link |
| c | character device |
| b | block device |

---

## Permission Types

| Symbol | Meaning |
|-------|--------|
| r | read |
| w | write |
| x | execute |

---

### Meaning of Permissions

#### Files

- r → read file content  
- w → modify file  
- x → execute file (script/binary)  

---

#### Directories

- r → list contents  
- w → create/delete files inside  
- x → enter directory (cd)  

---

## Numeric (Octal) Permissions

Each permission has a numeric value:

| Permission | Value |
|-----------|------|
| r | 4 |
| w | 2 |
| x | 1 |

---

### Calculation

Example:

`rwxr-xr--`

- rwx → 4+2+1 = 7  
- r-x → 4+0+1 = 5  
- r-- → 4+0+0 = 4  

Result:

`754`

---

### Common Permission Sets

- `755` → owner full, others read+execute  
- `644` → owner write, others read-only  
- `700` → owner only  
- `777` → full access (not recommended)  

---

## chmod (Change Permissions)

### Numeric Mode

Example:

`chmod 755 script.sh`

---

### Symbolic Mode

Syntax:

`chmod [who][operator][permissions] file`

Who:

- u → user (owner)
- g → group
- o → others
- a → all

Operators:

- + → add permission
- - → remove permission
- = → set exact permission

---

### Examples

Add execute for user:

`chmod u+x script.sh`

Remove write for group:

`chmod g-w file.txt`

Set exact permissions:

`chmod u=rwx,g=rx,o=r file.txt`

---

## Recursive Permissions

Apply to directories and contents:

`chmod -R 755 folder/`

---

## chown (Change Ownership)

### Change owner

`chown user file.txt`

---

### Change owner and group

`chown user:group file.txt`

---

### Recursive

`chown -R user:group folder/`

---

## chgrp (Change Group)

Change only group:

`chgrp group file.txt`

---

## Special Permissions

### SUID (Set User ID)

Runs file as owner.

`chmod u+s file`

---

### SGID (Set Group ID)

Runs file with group permissions or applies group inheritance.

`chmod g+s folder`

---

### Sticky Bit

Prevents users from deleting others' files in shared directories.

Common on `/tmp`.

`chmod +t folder`

---

## Default Permissions (umask)

Controls default permission creation.

Check:

`umask`

---

### Example

Default:

- Files → 666
- Directories → 777

umask subtracts permissions.

Example:

`umask 022`

Result:

- Files → 644
- Directories → 755

---

## Access Control Lists (ACL)

Advanced permission system for fine-grained access.

Set ACL:

`setfacl -m u:user:rwx file.txt`

View ACL:

`getfacl file.txt`

---

## Summary

Linux permissions consist of:

- Owner, group, others
- Read, write, execute flags
- Numeric (octal) representation

Core commands:

- `chmod` → change permissions
- `chown` → change owner
- `chgrp` → change group

Advanced:

- Special permissions (SUID, SGID, sticky bit)
- ACL for fine-grained control

Permissions are critical for:

- System security
- Multi-user environments
- Process isolation