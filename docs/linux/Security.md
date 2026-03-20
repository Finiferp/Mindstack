---
title: "Linux Security"
sidebar_label: "Security"
sidebar_position: 12
---

# Linux Security

System security is critical to protect your Linux server or workstation from unauthorized access, malware, and data breaches. Security involves configuring firewalls, securing remote access, maintaining up-to-date software, and following best practices to minimize vulnerabilities. This guide covers essential Linux security practices for both beginners and system administrators.

---

## Firewall Configuration (UFW)

A firewall controls network traffic to and from your system, blocking unauthorized access while allowing legitimate connections. Ubuntu and many Linux distributions provide **UFW (Uncomplicated Firewall)** for easy firewall management.

- **Enable the firewall:** `ufw enable`  
Activates UFW and applies default rules. Ensure you configure necessary services before enabling to avoid locking yourself out.

- **Allow SSH connections:** `ufw allow ssh`  
Ensures you can access the system remotely via SSH. Replace `ssh` with a port number if using a non-standard SSH port.

- **Check firewall status:** `ufw status verbose`  
Displays active rules, allowed/denied services, and logging status.

- **Deny all incoming traffic by default:** `ufw default deny incoming`  
Blocks all unsolicited connections unless explicitly allowed.

- **Allow specific services or ports:** `ufw allow 80/tcp` (for HTTP) or `ufw allow 443/tcp` (for HTTPS)

**Tip:** Always verify UFW rules after enabling to ensure essential services remain accessible.

---

## Securing SSH

SSH (Secure Shell) is the primary method for remote administration of Linux servers. Hardening SSH reduces the risk of brute-force attacks and unauthorized access.

- **SSH configuration file:** **/etc/ssh/sshd_config**  
  Key parameters to enhance security:  
  - **PermitRootLogin no** → Disables direct root login.  
  - **PasswordAuthentication no** → Enforces key-based authentication.  
  - **Port 22** → Consider changing to a non-standard port for added security.  
  - **AllowUsers `<username>`** → Restricts login to specific users.

- **Restart SSH after changes:** `systemctl restart sshd`  
Applies configuration changes safely.

- **Use key-based authentication:** Generate an SSH key pair and copy the public key to the server using `ssh-copy-id user@host`.

**Tip:** Consider enabling `Fail2Ban` to automatically block repeated failed SSH login attempts.

---

## Best Practices for Linux Security

1. **Keep the system updated:**  
   - Regularly run `apt update && apt upgrade` to apply security patches.

2. **Use strong passwords:**  
   - Enforce complexity and length using tools like `passwd` and `chage` for password expiration policies.

3. **Limit root access:**  
   - Use **sudo** for administrative tasks instead of logging in as root.  
   - Restrict root login via SSH in **sshd_config**.

4. **Minimize installed software:**  
   - Remove unnecessary packages to reduce the attack surface: `apt autoremove`.

5. **Monitor logs for suspicious activity:**  
   - Use `journalctl`, `dmesg`, or tools like `logwatch to track anomalies.

6. **Use file permissions and SELinux/AppArmor:**  
   - Enforce proper ownership and permissions on sensitive files.  
   - Enable AppArmor or SELinux for mandatory access control.

7. **Implement backups and recovery plans:**  
   - Regular backups protect data in case of security incidents.  
   - Store backups offsite or on a separate system.

---

## Summary

Linux security is an ongoing process that involves:

- Configuring a firewall (**UFW**) to control network access.  
- Hardening remote access (**SSH**) to prevent unauthorized logins.  
- Regular updates and system maintenance to patch vulnerabilities.  
- Following best practices for users, passwords, and file permissions.  

**Key Takeaways:**

- Never leave default settings exposed—especially for SSH and root access.  
- Regularly monitor logs and system activity for signs of compromise.  
- Automate updates, backups, and intrusion detection where possible.  
