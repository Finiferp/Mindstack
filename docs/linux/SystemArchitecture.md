---
title: "Linux System Architecture"
sidebar_label: "System Architecture"
sidebar_position: 1
---

# What is a Linux Distribution Made Of?

A **Linux distribution** is made of multiple components that together create a full operating system.

One of the biggest strengths of Linux is that **most of these components can be replaced or customized**.  
This flexibility is why there are so many different Linux distributions.

Main components of a Linux system:

- Bootloader
- Display Renderer
- Display Manager
- Desktop Environment
- Window Manager
- Package Manager
- Installation Type

---

# Bootloader

The **bootloader** is the first program that starts when your computer boots.

Its job is to load the Linux kernel and start the operating system.

There are two common boot methods used by operating systems:

- **EFI / UEFI**
- **Legacy BIOS**

Most Linux distributions use **GRUB (GRand Unified Bootloader)**.

Some newer distributions use **systemd-boot**, which is simpler and faster.

---

# Display Renderer

The **display renderer** is responsible for drawing graphics on the screen.

Linux currently has two main rendering systems:

## Xorg

Xorg is the traditional graphics system used by Linux for decades.

Pros:

- Very mature
- Supports almost all software
- Highly compatible

Cons:

- Old architecture
- Complex internal design

## Wayland

Wayland is the modern replacement for Xorg.

Pros:

- Cleaner design
- Better security
- Improved performance for modern desktops

Cons:

- Some older software still relies on Xorg

Many distributions are slowly **moving to Wayland by default**.

Servers usually **do not install graphical systems** at all and run only a **CLI (Command Line Interface)**.

---

# Display Manager

The **display manager** is the graphical login screen.

It starts before your desktop environment and lets you:

- Log into your system
- Choose a desktop session
- Start the graphical interface

## SDDM

SDDM is mainly used by **KDE**.

Features:

- Supports Wayland and Xorg
- Highly themeable
- Modern interface

## GDM

GDM is used by **GNOME**.

Features:

- Tight GNOME integration
- Supports Wayland and Xorg
- Simple interface

## LightDM

LightDM is a **lightweight display manager** used by multiple desktops.

Features:

- Very fast
- Highly customizable
- Mainly designed for Xorg

## No Display Manager

You do not strictly need a display manager.

Without one, the system boots into a **terminal login prompt**.

From there you can manually start your desktop using commands such as:

`startx`

---

# Desktop Environments

A **Desktop Environment (DE)** controls the overall look and behavior of your system.

It includes:

- Panels or taskbars
- Application menus
- File managers
- System settings
- Window management

Think of a desktop environment as the **full user interface of the operating system**.

---

## KDE

KDE Plasma is a **feature-rich desktop environment**.

Characteristics:

- Windows-like workflow
- Taskbar and start menu
- Extremely customizable
- Many built-in tools and widgets

---

## GNOME

GNOME uses a **unique workflow** different from Windows.

Characteristics:

- Activities overview
- Extension system
- Strong accessibility features
- Good scaling support

---

## Cinnamon

Cinnamon is designed to be **easy for Windows users**.

Characteristics:

- Traditional desktop layout
- Simple menus
- Clean interface
- Developed by the Linux Mint team

---

## MATE

MATE is based on the older **GNOME 2 desktop**.

Characteristics:

- Very lightweight
- Traditional interface
- Highly stable

It may look dated by default but works well on older systems.

---

## XFCE

XFCE focuses on **speed and simplicity**.

Characteristics:

- Very lightweight
- Modular design
- Highly customizable
- Ideal for older hardware

---

## LXQt / LXDE

LXQt is one of the **lightest desktop environments available**.

Characteristics:

- Very low resource usage
- Minimal features
- Good for very old computers

LXDE was the older version before LXQt.

---

## Deepin

Deepin has a **modern interface similar to macOS**.

Characteristics:

- Smooth animations
- Stylish interface
- User-friendly design

---

## Other Desktop Environments

There are many other desktop environments such as:

- Budgie
- Pantheon
- Enlightenment

Exploring different desktops is part of the Linux experience.

---

# Window Managers

A **window manager** is not the same as a desktop environment.

Difference:

Desktop Environment:

- Full system interface
- Includes many utilities

Window Manager:

- Only controls window placement and behavior

Examples include:

- i3
- DWM
- Openbox
- AwesomeWM

Window managers usually require **manual configuration**.

Users often configure them through **text configuration files** and keyboard shortcuts.

They are mostly used by **advanced users who want maximum control**.

---

# Package Manager

The **package manager** installs and updates software.

Different Linux distributions use different package managers.

---

## APT

Used by **Debian-based distributions**:

- Debian
- Ubuntu
- Linux Mint
- Pop!_OS

Example install command:

`apt install package`

APT is one of the **most widely used package managers**.

---

## DNF / YUM

Used by **Red Hat based distributions**:

- Fedora
- CentOS
- RHEL

Example install command:

`dnf install package`

DNF replaced the older **YUM** system.

---

## Pacman

Used by **Arch-based distributions**:

- Arch Linux
- Manjaro
- EndeavourOS

Example install command:

`pacman -S package`

Pacman uses a different syntax than other package managers.

---

## Universal Package Formats

Some software can run on **any Linux distribution**, regardless of the package manager.

Examples:

### Flatpak

Sandboxed applications with their own dependencies.

### Snap

Another universal package system maintained by Canonical.

### AppImage

A portable executable file.

Example:

`Program.AppImage`

No installation is required.

---

# Common Misconceptions

Many people think software only works on one distribution.

This is not true.

Programs can often be installed in multiple ways:

- Package manager
- External repositories
- Building from source
- Flatpak / Snap / AppImage

Package managers simply **make installation easier**.

---

# Types of Linux Installations

There are different levels of Linux installation complexity.

---

## Beginner Installation

This is the most common method.

Characteristics:

- Easy graphical installer
- Desktop environment included
- Preconfigured system

Examples:

- Ubuntu
- Linux Mint
- Fedora Workstation

---

## Intermediate Installation

This method installs a **minimal system first**, then you add packages manually.

Advantages:

- More customization
- Smaller system
- More control

Disadvantage:

- Requires knowledge of packages.

---

## Expert Installation

This method builds almost everything manually.

Characteristics:

- Minimal system
- No preinstalled desktop
- Often requires compiling software

Examples:

- Arch Linux manual install
- Gentoo
- Linux From Scratch

This approach offers **maximum control but requires advanced knowledge**.

---

# Learning Progression

Most Linux users naturally progress through different levels:

1. Beginner distributions
2. Custom installations
3. Minimal systems
4. Advanced customization

Linux allows you to **build exactly the system you want**.