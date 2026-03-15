---
title: "Linux Bootloaders and Boot Process"
sidebar_label: "Bootloaders"
sidebar_position: 2
---

# Linux Bootloaders

Bootloaders are responsible for loading the Linux kernel during system startup.  
They are executed after the firmware (BIOS or UEFI) and prepare the system to launch the operating system.

Many bootloaders exist, but the two most widely used are:

- **GRUB 2**
- **systemd-boot**

---

# GRUB 2 (Grand Unified Bootloader)

GRUB 2 is the most widely used Linux bootloader. It supports:

- Multiboot systems
- Custom themes
- Multiple operating systems
- Advanced boot configuration

GRUB is commonly used for systems running **Linux and Windows dual boot**.

---

# GRUB Configuration

Before installing or updating GRUB, configuration files must be created.

A good reference for GRUB documentation is:  
https://wiki.gentoo.org/wiki/GRUB2

---

## GRUB Configuration Files

| File | Editable | Description |
|-----|-----|-----|
| /boot/grub/grub.cfg | No | Generated automatically. Do not edit directly. |
| /etc/grub.d/* | Yes | Scripts used to generate boot entries. |
| /etc/default/grub | Yes | Main configuration file for GRUB settings. |

The recommended place to modify GRUB behavior is:

`/etc/default/grub`

---

# Editing `/etc/default/grub`

Common configuration options include:

### GRUB_DEFAULT

Defines the default boot entry.

Example:

GRUB_DEFAULT=0

`0` selects the first entry, `1` selects the second, etc.

---

### GRUB_TIMEOUT_STYLE

Controls how the boot menu appears.

Possible values:

- menu
- hidden

Example:

GRUB_TIMEOUT_STYLE=hidden

---

### GRUB_TIMEOUT

Defines how long the boot menu is displayed.

Example:

GRUB_TIMEOUT=5

If set to `-1`, the menu will wait indefinitely for user input.

---

### GRUB_CMDLINE_LINUX_DEFAULT

Kernel parameters passed during boot.

Common examples:

- quiet splash → hide boot messages
- nomodeset → disable graphics mode setting
- single → boot into single-user mode

Example:

GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"

---

### GRUB_DISABLE_RECOVERY

Disables recovery boot entries.

Example:

GRUB_DISABLE_RECOVERY=true

---

# Example GRUB Configuration

Example `/etc/default/grub` configuration:

GRUB_DEFAULT="0"  
GRUB_TIMEOUT_STYLE="hidden"  
GRUB_TIMEOUT="0"  
GRUB_DISTRIBUTOR="Debian"  
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"  
GRUB_CMDLINE_LINUX=""  
GRUB_DISABLE_RECOVERY="true"  
GRUB_DISABLE_LINUX_RECOVERY="true"

---

# Generating GRUB Configuration

After modifying GRUB configuration files, regenerate the boot configuration.

Command:

grub-mkconfig -o /boot/grub/grub.cfg

On Debian-based systems you can instead use:

update-grub

---

# Determining Boot Mode (UEFI vs BIOS)

To check whether the system is using UEFI:

ls /sys/firmware/efi

If the directory exists and contains files, the system is booted in **UEFI mode**.

---

# Installing GRUB

Once configuration is complete, GRUB can be installed to the disk.

---

## UEFI Installation

UEFI systems require an **EFI System Partition (ESP)**.

Ensure the partition is mounted at `/boot/efi`.

Then install GRUB:

grub-install --efi-directory=/boot/efi

---

## Legacy BIOS Installation

In legacy BIOS systems, GRUB installs directly to the disk.

Example installation:

grub-install

If multiple drives exist, specify the device:

grub-install /dev/sda

Useful commands to inspect disks:

lsblk

blkid

---

# systemd-boot

systemd-boot is a **minimal bootloader designed for UEFI systems**.

Characteristics:

- Lightweight
- Simple configuration
- Integrated with systemd

Unlike GRUB, systemd-boot only works on **UEFI systems**.

To verify UEFI mode:

ls /sys/firmware/efi

---

# systemd-boot Directory Structure

Typical layout:

Main directory  
/boot/efi

Configuration files  
/boot/efi/loader

Boot entries  
/boot/efi/loader/entries

---

# Loader Configuration

The main configuration file is:

/boot/efi/loader/loader.conf

Example configuration:

default arch.conf  
timeout 4  
console-mode max  
editor no  

---

## Configuration Options

### default

Defines the default boot entry.

Example:

default arch.conf

---

### timeout

Defines how long the menu is displayed.

Example:

timeout 4

---

### editor

Allows editing boot parameters during startup.

Example:

editor no

---

# Boot Entries

Each operating system has its own configuration file in:

/boot/efi/loader/entries

---

## Linux Boot Entry Example

Example file:

/boot/efi/loader/entries/arch.conf

Configuration:

title Arch Linux  
linux /vmlinuz-linux  
initrd /intel-ucode.img  
initrd /initramfs-linux.img  
options root="LABEL=arch" rw  

---

## Windows Boot Entry Example

Example file:

/boot/efi/loader/entries/win10.conf

Configuration:

title Windows 10  
efi /EFI/Microsoft/Boot/bootmgfw.efi

---

# Finding Disk UUIDs

To identify partitions and their UUIDs:

sudo blkid

To inspect disks and mount points:

sudo lsblk

---

# Creating EFI Boot Entries

Boot entries can also be created manually using:

efibootmgr

Example:

efibootmgr --create --disk /dev/sda --part 1 --loader "\EFI\systemd\systemd-bootx64.efi" --label "Linux OS" --verbose

---

# Installing systemd-boot

To install systemd-boot:

bootctl install

To update boot entries:

bootctl update

---

# Summary

Bootloaders are responsible for loading the Linux kernel during startup.

Two common bootloaders are:

- **GRUB 2** – full-featured and widely supported
- **systemd-boot** – lightweight and minimal for UEFI systems

GRUB is recommended for:

- Dual boot systems
- Complex boot configurations

systemd-boot is ideal for:

- Simple Linux installations
- Minimal systems
- Pure UEFI environments