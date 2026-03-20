---
title: "Troubleshooting"
sidebar_label: "Troubleshooting"
sidebar_position: 11
---

# Troubleshooting

Troubleshooting is the process of identifying, diagnosing, and resolving system issues. Effective troubleshooting requires a combination of **logs, monitoring tools, and systematic analysis**. Linux provides a wide range of commands and strategies to pinpoint problems, from hardware errors to software failures.

---

## Essential Troubleshooting Tools

Linux offers several built-in tools to help diagnose issues quickly:

- **View kernel messages:** `dmesg`  
Displays kernel-related messages, including hardware detection, driver issues, and critical errors during boot.  
**Tips:**  
  - Use `dmesg | less` to scroll through messages.  
  - Use `dmesg -T` to convert timestamps to human-readable format.  
  - Filter for errors/warnings: `dmesg | grep -i error`  

- **View system logs:** `journalctl`  
A comprehensive tool to access logs collected by `systemd`.  
**Use cases:**  
  - `journalctl -xe` to see recent errors with explanations.  
  - `journalctl -u <service_name>` to inspect service-specific logs.  
  - `journalctl -b` to view logs from the current boot session.

- **Monitor processes and system load:** **top**  
Provides a real-time view of running processes, CPU, memory, and swap usage.  
**Tip:** Use `htop` as a more interactive alternative with easier navigation and process management.

- **Other useful commands:**  
  - `ps aux` – Lists all running processes with detailed resource usage.  
  - `free -h` – Checks memory and swap usage.  
  - `uptime` – Shows system load averages to detect performance bottlenecks.

---

## Troubleshooting Boot Issues

Boot failures are common and require systematic investigation:

1. **Check GRUB configuration:**  
   - Ensure the bootloader points to the correct kernel and root partition.  
   - Use **GRUB recovery mode** to boot into a safe environment if normal boot fails.

2. **Use Recovery Mode:**  
   - Allows booting with minimal services and mounting filesystems in read/write mode for repairs.  
   - Common tasks in recovery mode: repairing broken packages, fixing permissions, and checking disk integrity.

3. **Inspect Logs:**  
   - Use `journalctl -b` or `dmesg` to identify errors during boot.  
   - Look for failed services, missing modules, or disk errors that prevent startup.

4. **Hardware Checks:**  
   - Verify disk health using `smartctl` for SMART-enabled drives.  
   - Check memory using `memtest86` to rule out RAM issues.

---

## Troubleshooting Network Issues

- **Check connectivity:** `ping <host>`  
- **Inspect network configuration:** `ip addr` / `ifconfig`  
- **Monitor open connections:** `netstat -tulnp` or `ss -tulnp`  
- **Check routing and firewall rules:** `ip route` / `iptables -L`  

**Tip:** Troubleshoot step by step: physical connections → IP configuration → routing → firewall → service connectivity.

---

## Troubleshooting Performance Issues

- **CPU and memory usage:** `top` / `htop`  
- **Disk I/O:** `iotop` or `iostat`  
- **Swap usage:** `free -h`  
- **Long-running processes:** `ps aux --sort=-%cpu | head`  

Identify processes consuming excessive resources and investigate whether they are legitimate workloads or runaway processes.

---

## Summary

Effective troubleshooting requires:

- Accessing and analyzing **logs** with `journalctl` and `dmesg`.  
- Monitoring **processes, memory, CPU, and disk usage** using `top`, `htop`, and related tools.  
- Systematic investigation of **boot, network, and performance issues**.  

**Key Practices:**

- Always document errors and steps taken for future reference.  
- Prioritize critical services when resolving issues.  
- Combine real-time monitoring with historical logs for accurate diagnosis.  
- Automate alerts for recurring problems to reduce manual troubleshooting.

