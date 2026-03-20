---
title: "System Services"
sidebar_label: "Services"
sidebar_position: 7
---

# Systemd Services

`systemd` is the **init system** used in most modern Linux distributions.  

It manages:

- System services (daemons)
- Startup and shutdown
- Unit files
- Dependencies between services

Services are processes running in the background, e.g., web servers, databases, or timers.

---

## Service Management

Basic commands use `systemctl`:

### Start a service

`sudo systemctl start service_name`

Example:

`sudo systemctl start nginx`

- Starts immediately
- Does **not** enable on boot

---

### Stop a service

`sudo systemctl stop service_name`

Example:

`sudo systemctl stop nginx`

---

### Restart a service

`sudo systemctl restart service_name`

- Stops and starts the service
- Useful after config changes

---

### Reload a service

`sudo systemctl reload service_name`

- Applies configuration changes **without stopping** service (if supported)

---

### Enable service on boot

`sudo systemctl enable service_name`

- Creates symlinks to start service on boot

---

### Disable service on boot

`sudo systemctl disable service_name`

- Removes symlinks to prevent automatic start

---

### Check service status

`systemctl status service_name`

Example:

`systemctl status nginx`

Shows:

- Active state (active/inactive/failed)
- PID
- Logs

---

## Listing Services

### Active services

`systemctl list-units --type=service --state=active`

### All services

`systemctl list-units --type=service`

### Failed services

`systemctl --failed`

---

## Unit Files

`systemd` manages **unit files**, which define resources:

| Unit Type | Description |
|-----------|------------|
| service   | Background process |
| socket    | IPC / socket activation |
| target    | Group of units (like runlevel) |
| timer     | Scheduled jobs (like cron) |
| mount     | Filesystem mount point |
| automount | Automount filesystems |
| device    | Device units |
| path      | File or directory state |

Unit files are located in:

- `/etc/systemd/system/` → admin overrides  
- `/usr/lib/systemd/system/` → package-installed units  
- `/run/systemd/system/` → runtime units

---

## Viewing Unit Files

- `systemctl cat service_name` → shows full unit definition  
- `systemctl edit service_name` → override config  

---

## Journal Logs

`systemd` uses **journalctl** to view logs.

Examples:

- View service logs: `journalctl -u nginx`  
- Follow live logs: `journalctl -u nginx -f`  
- View boot logs: `journalctl -b`  
- View logs for specific time: `journalctl --since "2026-03-20 09:00"`

---

## Masking Services

Prevent a service from starting at all:

`sudo systemctl mask service_name`

- Links unit to `/dev/null`
- Useful for disabling problematic services completely

---

## Unmasking

Re-enable masked service:

`sudo systemctl unmask service_name`

---

## Targets

Targets group units and define **runlevels**:

- `graphical.target` → full GUI  
- `multi-user.target` → multi-user text mode  
- `rescue.target` → single-user emergency mode  
- `emergency.target` → minimal system for recovery

Switch targets:

`sudo systemctl isolate multi-user.target`

---

## Timers (Replacing cron)

Timers schedule services:

- `/etc/systemd/system/backup.timer`
- `/etc/systemd/system/backup.service`

Enable and start:

```bash
sudo systemctl enable backup.timer
sudo systemctl start backup.timer
```
Check timer status:
```bash
systemctl list-timers
```

---

## Best Practices
- Always check `status` and `journalctl` for troubleshooting
- Use `enable` for persistent services, `start` for temporary
- Override unit files instead of editing `/usr/lib/systemd/system` directly
- Use timers instead of cron for systemd-managed scheduled tasks

---

## Summary
systemd services:

- Manage background processes, startup, and dependencies
- Controlled via `systemctl`
- Unit types include service, socket, timer, target, mount
- Logs accessible via `journalctl`
- Targets replace traditional runlevels
- Timers can replace cron jobs for scheduling