---
title: "Linux Networking"
sidebar_label: "Networking"
sidebar_position: 8
---

# Linux Networking

Linux provides tools to **configure, monitor, and troubleshoot network connections**.  

Key concepts:

- Network interfaces (wired, wireless, virtual)  
- IP addresses (IPv4/IPv6)  
- Routing and gateways  
- DNS resolution  
- Firewalls (iptables/nftables)

---

## IP Addresses

View IP addresses for all interfaces:

`ip a`  
or  
`ip addr show`

Example output:
```bash
nameserver 8.8.8.8
nameserver 8.8.4.4
```

Test DNS resolution:

`nslookup google.com`  
`dig google.com`

---

## Wireless Networking (Wi-Fi)

List wireless interfaces:

`iw dev`  
or  
`nmcli device status` (if NetworkManager installed)

Connect to Wi-Fi (NetworkManager CLI):

`nmcli device wifi connect SSID password PASSWORD`

---

## Network Statistics

- `ifconfig` → legacy, shows IP and stats  
- `ip -s link` → shows interface statistics  
- `netstat -tulnp` → active TCP/UDP listening ports  
- `ss -tulnp` → newer alternative to netstat  

---

## Firewalls

Linux uses **iptables** or **nftables** for packet filtering.

Check active rules:

`sudo iptables -L -v`  

Enable simple firewall with ufw:

```bash
sudo ufw enable
sudo ufw allow 22/tcp   # allow SSH
sudo ufw status
```
---

## Useful Networking Commands Summary
| Task                 | Command                                  |
| -------------------- | ---------------------------------------- |
| Show IP              | `ip a`                                   |
| Show interfaces      | `ip link`                                |
| Assign IP            | `ip addr add 192.168.1.50/24 dev enp0s3` |
| Default gateway      | `ip route add default via 192.168.1.1`   |
| Test connectivity    | `ping google.com`                        |
| Trace route          | `traceroute google.com`                  |
| DNS lookup           | `dig google.com` / `nslookup google.com` |
| List listening ports | `ss -tulnp`                              |

---

## Best Practices

- Use `ip` instead of `ifconfig` / `route`
- Always check routing and gateway if network fails
- Use `ping` and `traceroute` to debug connectivity
- DNS issues are often resolved by editing `/etc/resolv.conf`
- Firewalls may block services; check `ufw` or `iptables`

---

## Summary

Linux networking tools allow you to:
- Configure IP addresses and interfaces
- Manage routing and gateways
- Test connectivity and resolve DNS
- Monitor network statistics and services
- Control traffic via firewalls