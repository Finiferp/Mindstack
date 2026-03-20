---
title: "Package Management"
sidebar_label: "Packages"
sidebar_position: 5
---

# Package Management

Package managers are tools to **install, update, remove, and manage software** on Linux.

They handle:

- Dependencies automatically
- Version control
- System-wide software organization

Different distros use different package managers.

---

## APT (Debian/Ubuntu/Mint)

APT is used for **Debian-based distributions**.

### Update Package Lists

`sudo apt update`

- Refreshes repository information
- Does **not** upgrade packages

### Upgrade Installed Packages

`sudo apt upgrade`

- Installs available updates for all packages
- Optionally use `dist-upgrade` for major updates:
  
`sudo apt full-upgrade` → handles dependency changes

### Install Packages

`sudo apt install package_name`

Example:

`sudo apt install nginx`

Options:

- `-y` → auto-confirm prompts  
- `--reinstall` → reinstall an existing package  

### Remove Packages

`sudo apt remove package_name` → removes package but keeps config files  
`sudo apt purge package_name` → removes package **and** config files  

### Search Packages

`apt search package_name`

### Show Package Info

`apt show package_name`

---

## Dpkg (Low-Level for Debian)

`dpkg` manages **individual .deb files**.

Install:

`sudo dpkg -i package.deb`

Fix broken dependencies:

`sudo apt install -f`

Remove package:

`sudo dpkg -r package_name`

---

## pacman (Arch/Manjaro)

Pacman is the default **package manager for Arch-based distributions**.

### Install Packages

`sudo pacman -S package_name`

### Update System

`sudo pacman -Syu` → update package lists and upgrade

### Remove Packages

`sudo pacman -R package_name` → remove package only  
`sudo pacman -Rns package_name` → remove package and dependencies not used elsewhere  

### Search Packages

- Local: `pacman -Qs package_name`  
- Remote repo: `pacman -Ss package_name`  

### Show Info

`pacman -Qi package_name` → info about installed package  
`pacman -Si package_name` → info in repo  

---

## Snap Packages

Snap is a **universal package manager** used across distros.

Install snap:

`sudo snap install package_name`

Remove snap:

`sudo snap remove package_name`

List installed snaps:

`snap list`

---

## Flatpak

Another **universal package system**.

Install flatpak:

`sudo flatpak install repo package_name`

Run application:

`flatpak run package_name`

---

## Best Practices

- Always update package lists before installing:

`sudo apt update` or `sudo pacman -Sy`

- Avoid mixing low-level tools (`dpkg`) with high-level (`apt`) without care  
- Keep system upgraded regularly  
- Remove unused packages:

`sudo apt autoremove` → Debian/Ubuntu  
`sudo pacman -Rns $(pacman -Qdtq)` → Arch  

- Check installed versions:

`apt list --installed`  
`pacman -Q`

---

## Summary

Package managers allow:

- Easy software installation, removal, and updates  
- Automatic dependency handling  
- System maintenance and security updates  

Common package managers:

- **APT** → Debian/Ubuntu  
- **pacman** → Arch/Manjaro  
- **Snap / Flatpak** → cross-distro universal packages  

Commands to remember:

- Install: `apt install`, `pacman -S`  
- Remove: `apt remove/purge`, `pacman -Rns`  
- Update: `apt update && apt upgrade`, `pacman -Syu`  
- Search: `apt search`, `pacman -Ss`