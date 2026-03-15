---
title: "Managing System Services with Systemd"
sidebar_label: "System Services"
sidebar_position: 4
---

# Managing System Services and Configuration

Modern Linux distributions use an **init system** to control system operations, primarily **systemd**.  
Systemd manages services, boot processes, networking, timers, and more, making it the core of modern Linux administration.

---

## Controlling Services and Units

`systemctl` is the primary tool for managing **systemd services and units**.  
Units can represent:

- Services
- Device drivers
- Network mounts
- Timers (similar to `crontab`)
- Sockets, targets, and more

### Common `systemctl` Commands

| Command | Description |
|---------|-------------|
| `systemctl status servicename` | View the current status of a service |
| `systemctl start servicename` | Start a service |
| `systemctl stop servicename` | Stop a service |
| `systemctl restart servicename` | Restart a service |
| `systemctl reload servicename` | Reload configuration without restarting |
| `systemctl enable servicename` | Enable service at boot |
| `systemctl is-enabled servicename` | Check if a service is enabled at startup |
| `systemctl is-active servicename` | Check if a service is running |
| `systemctl list-units` | List all running systemd units |
| `systemctl list-units --all` | List all units (active + inactive) |
| `systemctl list-units --all --state=inactive` | List all inactive units |
| `systemctl list-units --all --type=service` | List all service units |

---

## Unit File Locations

Systemd unit files are stored in:

- `/usr/lib/systemd` – Default system-created units  
- `/etc/systemd/system` – System-wide unit files; symbolic links often point here. **Highest priority**.  
- `~/.config/systemd/user/` – User-specific unit files (requires `--user` option)

---

## Example System Unit File

```ini
[Unit]
Description=service_description
After=network.target

[Service]
ExecStart=path_to_executable
Type=forking

[Install]
WantedBy=default.target
```

For complete documentation: [Systemd Unit Docs](https://links.thelinuxbook.com/systemd)

---

## User-Based Systemd Services and Unit Files

User-specific unit files are stored in:

```
~/.config/systemd/user/
```

These are managed with the `--user` flag:

```bash
systemctl --user start usercreatedfile.service
```

This command starts a user-created service in the user's home directory.

### Example User Unit File

```ini
[Unit]
Description=Run service as user
DefaultDependencies=no
After=network.target

[Service]
Type=simple
User=titus
Group=users
ExecStart=/home/titus/scripts/startup_script.sh
TimeoutStartSec=0
RemainAfterExit=yes

[Install]
WantedBy=default.target
```