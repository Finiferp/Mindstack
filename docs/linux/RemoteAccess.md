---
title: "Remote Access"
sidebar_label: "Remote Access"
sidebar_position: 5
---

# Remote Access and SSH - The Linux Desktop Guide

Remote access is a crucial aspect of server management. The most common method for remote access in Linux is through SSH (Secure Shell). SSH allows you to securely connect to a remote machine and execute commands as if you were physically present.

---

## Setting Up SSH

To set up SSH on your Linux server, follow these steps:

1. **Install OpenSSH Server**

```bash
sudo apt install openssh-server  # Debian/Ubuntu
sudo dnf install openssh-server  # Fedora/RHEL
sudo pacman -S openssh            # Arch Linux
```

2. **Start and Enable the SSH Service**

```bash
sudo systemctl start sshd         # Start the SSH service
sudo systemctl enable sshd        # Enable SSH to start on boot
```

3. **Check SSH Status**

```bash
sudo systemctl status sshd
```

4. **Configure SSH**  
Edit `/etc/ssh/sshd_config` to customize settings such as port number, allowed users, and authentication methods.

Common configurations include:

- `Port 22` (change to a different port for security)  
- `PermitRootLogin no` (disable root login for security)  
- `PasswordAuthentication yes/no` (enable or disable password authentication)

5. **Restart SSH Service**

```bash
sudo systemctl restart sshd
```

For advanced SSH configurations, set up key-based authentication:

```bash
ssh-keygen
ssh-copy-id user@server_ip -i ~/.ssh/id_rsa.pub
```

---

## Connecting to a Remote Server

```bash
ssh user@server_ip
# If using a non-default port:
ssh -p port_number user@server_ip
```

---

## Common SSH Options

- `-i /path/to/private_key` : Specify a private key file for authentication  
- `-X` : Enable X11 forwarding  
- `-C` : Enable compression  
- `-v` : Enable verbose mode

---

## SSH Configuration File

Create a configuration file at `~/.ssh/config`:

```text
Host myserver
    HostName server_ip
    User user
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

Connect easily:

```bash
ssh myserver
```

---

## Remote File Transfer with SCP and SFTP

**Using SCP**

```bash
scp /path/to/local/file user@server_ip:/path/to/remote/directory
scp user@server_ip:/path/to/remote/file /path/to/local/directory
```

**Using SFTP**

```bash
sftp user@server_ip
# Inside SFTP session:
get remote_file.txt
put local_file.txt
ls
cd /path/to/directory
```

---

## Remote Desktop Access

For graphical remote access, you can use VNC or RDP.

**VNC Setup Example (Debian/Ubuntu)**

```bash
sudo apt update
sudo apt install tigervnc-standalone-server tigervnc-common
vncpasswd
```

**Start VNC Server**

```bash
vncserver :1 -geometry 1024x768 -depth 24 -localhost
```

**SSH Tunnel (recommended)**

```bash
ssh -L 5901:localhost:5901 username@remote-server
# Then connect to localhost:5901 using VNC viewer
```

**Security Tips**

- Always use SSH tunneling  
- Bind to localhost only  
- Use strong passwords  
- Consider `x11vnc` for existing sessions

---

## Troubleshooting VNC

```bash
vncserver -list
vncserver -kill :1
tail -f ~/.vnc/*.log
```

Check permissions and desktop environment if display issues occur. Ensure firewall allows the correct port.

---

## Alternative: x11vnc for Existing Sessions

```bash
# Install
sudo apt install x11vnc  # Debian/Ubuntu
sudo dnf install x11vnc  # Fedora
sudo pacman -S x11vnc    # Arch

# Usage
x11vnc -display :0 -auth ~/.Xauthority -localhost -rfbauth ~/.vnc/passwd
```