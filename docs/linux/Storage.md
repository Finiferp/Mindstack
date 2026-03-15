---
title: "Drives and Filesystems"
sidebar_label: "Storage"
sidebar_position: 6
---

# Drives and Filesystems

This chapter focuses on managing drives and filesystems in Linux, including mounting and unmounting drives, understanding filesystems, and using tools like `fdisk`, `mkfs`, and `fsck`.

---

## Understanding Drives and Filesystems

In Linux, drives and filesystems are fundamental components that allow the operating system to store and retrieve data. Each drive can have one or more partitions, and each partition can be formatted with a specific filesystem type.

### Common Filesystem Types

- **ext4**: The most common filesystem for Linux, known for its performance and reliability.
- **xfs**: A high-performance filesystem often used for large files and high-capacity storage.
- **btrfs**: A modern filesystem with advanced features like snapshots and dynamic resizing.
- **vfat**: A filesystem compatible with Windows, often used for USB drives, external storage, and EFI boot partitions.
- **ntfs**: The Windows NT filesystem, used for compatibility with Windows systems.
- **swap**: A special filesystem used for swap space when the system runs out of RAM.

Personally, many users rely on **ext4** for most drives, **xfs** for large storage volumes, and **vfat** for USB drives and EFI partitions. While **btrfs** offers powerful features like snapshots and advanced storage management, it requires more knowledge to manage effectively.

---

## Drive Management Tools

Common tools used for managing drives and storage:

- **cfdisk** – A terminal-based partition editor recommended for beginners.
- **lsblk** – Lists block devices including drives and partitions.
- **blkid** – Displays filesystem type and UUID information.
- **df** – Shows disk space usage for mounted filesystems.
- **du** – Estimates file and directory disk usage.
- **mount** – Mounts filesystems to directories.
- **umount** – Unmounts filesystems.
- **mkfs** – Creates a filesystem on a partition.
- **fsck** – Checks and repairs filesystems.
- **lsusb** – Lists USB devices connected to the system.
- **lspci** – Lists PCI hardware devices.
- **smartctl** – Displays SMART drive health information.
- **hdparm** – Configures and tests disk performance.
- **gparted** – Graphical partition manager.

---

## Drive Partitioning

Partitioning divides a disk into separate sections that can be formatted and used independently.

Most modern systems should use **GPT partitioning**.

Typical Linux installations use:

- **EFI Partition**
- **Root filesystem**
- **Optional Home partition**

---

### Partition Tables

Two main partition table types exist:

#### MBR (Master Boot Record)

- Legacy partitioning system
- Supports disks up to **2 TiB**
- Maximum of **4 primary partitions**
- Not compatible with **UEFI Secure Boot**
- Generally **not recommended for modern systems**

#### GPT (GUID Partition Table)

- Modern partitioning system
- Supports **large disks and many partitions**
- Required for **UEFI systems**
- Includes **backup partition tables** for redundancy

Before partitioning, it is often recommended to remove existing filesystem signatures.

```
sudo wipefs -a /dev/sdX
```

⚠ **Warning:** This will destroy all data on the disk.

---

### Partitioning with cfdisk

`cfdisk` provides a simple interface for partition management.

```
sudo cfdisk /dev/sdX
```

Basic process:

1. Select **New** to create a partition
2. Choose a size (typically **300MB–1GB** for EFI)
3. Set the partition **Type** to **EFI System**

Repeat for additional partitions like root or home.

When finished, choose **Write** to save the partition table.

---

## Filesystem Management

Filesystem management involves creating, formatting, and repairing filesystems.

---

### Creating Filesystems

⚠ **Warning:** Formatting will erase all data on the partition.

Create an **ext4 filesystem**:

```
sudo mkfs.ext4 /dev/sdX1
```

Other examples:

```
sudo mkfs.xfs /dev/sdX1
sudo mkfs.fat -F 32 /dev/sdX1
```

FAT32 is commonly used for **EFI System Partitions**.

---

### Checking Filesystems

Check a filesystem for errors:

```
sudo fsck.ext4 /dev/sdX1
```

Automatically fix detected issues:

```
sudo fsck.ext4 -y /dev/sdX1
```

---

### Viewing Filesystem Information

View disk usage:

```
df -h
```

This shows total space, used space, available space, and mount points.

---

## Mounting and Unmounting Drives

Mounting attaches a filesystem to the Linux directory tree so it can be accessed.

---

### Mounting Drives

Example mount command:

```
sudo mount /dev/sdX1 /mnt/mydrive
```

Specifying filesystem type and options:

```
sudo mount -t ext4 -o rw /dev/sdX1 /mnt/mydrive
```

Options:

- `-t` specifies filesystem type
- `-o` specifies mount options

---

### Unmounting Drives

To safely detach a mounted filesystem:

```
sudo umount /mnt/mydrive
```

Lazy unmount if the filesystem is busy:

```
sudo umount -l /mnt/mydrive
```

---

## Fstab Configuration

The `/etc/fstab` file defines filesystems that should automatically mount at boot.

### Fstab Structure

Each entry contains:

1. **Device** (UUID or device path)
2. **Mount Point**
3. **Filesystem Type**
4. **Options**
5. **Backup Operation**
6. **Filesystem Check Order**

Example structure:

```
# <device> <mount point> <filesystem> <options> <backup> <fsck order>
```

Example entries:

```
UUID=1234-5678 /mnt/data ext4 defaults 0 2
/dev/sdb1 /media/usb vfat defaults,nofail 0 0
```

---

### Common Mount Options

- `defaults` – Standard mount settings
- `nofail` – Ignore mount failures
- `noauto` – Do not mount automatically
- `user` – Allow non-root mounting
- `rw` – Read/write mode
- `ro` – Read-only mode
- `exec` – Allow executable files
- `noexec` – Prevent executable files
- `sync` – Synchronous I/O
- `async` – Asynchronous I/O

Permission options:

- `uid=1000`
- `gid=1000`
- `umask=022`
- `dmask=027`
- `fmask=133`

---

### Example fstab Configuration

```
# Static information about the filesystems

UUID=1188f001-7a26-4d75-819f-202e4ef2da96 / ext4 rw,relatime 0 1
UUID=3337-A669 /boot vfat rw,relatime,fmask=0022,dmask=0022 0 2
UUID=df8df26b-3bdc-427d-be86-43d6a25208b4 /home ext4 rw,relatime 0 2

# Network Drives
10.0.0.2:/volume2/Images /media/images nfs x-systemd.after=network-online.target,x-systemd.automount,_netdev 0 0
```

This example includes:

- Root filesystem
- Boot partition
- Home partition
- Network storage mounted via **NFS**