---
title: "Logs and Monitoring"
sidebar_label: "Logs"
sidebar_position: 9
---

# Logs and Monitoring

Monitoring and logging are essential for understanding system behavior, diagnosing issues, and ensuring smooth operation. Linux provides a variety of tools for viewing logs, tracking resource usage, and analyzing processes in real-time. This section covers essential commands and best practices.

---

## Viewing System Logs with `journalctl`

`journalctl` is a powerful tool for querying and displaying logs collected by `systemd`’s journal service. It allows filtering by time, service, priority, and more.

### Basic Usage

- **View all logs:** `journalctl`  
Displays all logs from the system journal. Output is paginated for easier reading.

- **View recent logs with details:** `journalctl -xe`  
Shows explanatory messages for errors and jumps to the end of the log to see the most recent entries.

- **View logs for a specific service:** `journalctl -u nginx.service`  
Replace `nginx.service` with the name of the service to focus on its logs.

- **Follow logs in real-time:** `journalctl -f`
Continuously outputs new log entries as they occur.

- **Filter by time range:** `journalctl --since "2026-03-20 08:00" --until "2026-03-20 12:00"`
Useful for debugging incidents during a specific period.

**Tip:** Combine filters for precise queries, e.g., follow recent error-level logs for a specific service using `journalctl -u nginx.service -p err -f`

---

## Monitoring Disk Usage

Disk space issues can cause unexpected system behavior. The following commands help you monitor disk usage:

- **Check disk usage by partition:** `df -h`
Displays mounted filesystems, usage, available space, and mount points in human-readable units.

- **Check detailed usage per directory:** `du -sh /var/log/*`
Summarizes the size of directories, helping identify ones consuming excessive space.

**Tip:** Set up alerts for disk usage exceeding thresholds using cron jobs or monitoring tools like **Prometheus**.

---

## Monitoring Processes

Processes affect system performance and resource usage. Use these tools to inspect and manage them.

- **View real-time system processes:** `top`
Shows CPU, memory, and swap usage per process. Navigate with keys to sort and manage processes.

- **Enhanced process monitoring:** `htop`
A more user-friendly alternative to top with colored output, process trees, and easier navigation.

- **Check specific process resource usage:** `ps aux | grep <process_name>`
Displays details of processes matching `<process_name>`, including PID, memory, and CPU usage.

---

## Summary

Effective monitoring and logging are crucial for:

- Quickly identifying and diagnosing system issues.  
- Tracking resource usage to prevent performance degradation.  
- Maintaining operational reliability and security.  

**Key takeaways:**

- Use `journalctl` for detailed, filterable system logs.  
- Regularly check disk usage with `df` and `du`.  
- Monitor active processes using `top` or `htop`.  
- Combine monitoring with alerts for proactive system management.
