---
title: "Networking with NetworkManager"
sidebar_label: "Networking"
sidebar_position: 5
---

# Networking in Linux

Most Linux distributions use **NetworkManager** for network management. While **systemd** provides networking capabilities, they are cumbersome to configure. NetworkManager simplifies networking with two main tools:

- **`nmcli`** – Command-line tool to manage network connections (Wi-Fi, Ethernet, VPNs).  
- **`nmtui`** – Text-based user interface for easier configuration, though less powerful than `nmcli`.

---

## Get Full List of Network Interfaces

- Basic IP information:

```bash
ip address
```

- Detailed interface information (DNS, routing, gateway, etc.):

```bash
nmcli device show <interface>
```

- Status of all interfaces managed by NetworkManager:

```bash
nmcli device status
```

---

## Managing Network Connections with `nmcli`

> ⚠️ Important: Conflicting network managers can cause issues. Disable any of the following if running: `systemd-networkd`, `netplan`, `dhcpcd`, `dnsmasq`, `dhclient`, or `wicd`.

- List all network connections:

```bash
nmcli con show
```

- List available Wi-Fi networks:

```bash
nmcli device wifi list
```

- Connect to a Wi-Fi network:

```bash
nmcli device wifi connect <SSID> password <PASSWORD>
```

- Disconnect from a network:

```bash
nmcli device disconnect <INTERFACE>
```

- Delete a connection:

```bash
nmcli con delete <CONNECTION_NAME>
```

- Add a new Ethernet connection:

```bash
nmcli con add type ethernet ifname <INTERFACE> con-name <CONNECTION_NAME>
```

- Modify an existing connection:

```bash
nmcli con mod <CONNECTION_NAME> <SETTING> <VALUE>
```

- Activate a connection:

```bash
nmcli con up <CONNECTION_NAME>
```

- Deactivate a connection:

```bash
nmcli con down <CONNECTION_NAME>
```

- Make connections persistent across reboots:

```bash
nmcli con mod <CONNECTION_NAME> connection.autoconnect yes
```

---

## DHCP

Dynamic Host Configuration Protocol (DHCP) automatically assigns IP addresses and network settings. Common Linux DHCP clients:

- `dhclient` – Standard, reliable, slightly slow.  
- `dhcpcd` – Lightweight, fast, full-featured.  
- `systemd-networkd` – Fast, works well, but hard to configure.  
- NetworkManager internal DHCP client – Simple, fast, integrated.

---

## Static IP Configuration with `nmcli`

Steps to configure a static IP:

1. List interfaces:

```bash
nmcli device status
```

2. Set static IP, gateway, DNS, and method:

```bash
nmcli con mod eth0 ipv4.addresses <IP_ADDRESS>/24
nmcli con mod eth0 ipv4.gateway <GATEWAY_IP>
nmcli con mod eth0 ipv4.dns <DNS_IP>
nmcli con mod eth0 ipv4.method manual
```

3. Restart the connection:

```bash
nmcli con down eth0 && nmcli con up eth0
```

4. Ensure autoconnect:

```bash
nmcli con mod eth0 connection.autoconnect yes
```

---

## DNS Configuration

By default, Linux uses **`systemd-resolved`**. Configure DNS via `nmcli`:

1. List connections:

```bash
nmcli con show
```

2. Set DNS server:

```bash
nmcli con mod eth0 ipv4.dns <DNS_IP>
```

3. Restart the connection:

```bash
nmcli con down eth0 && nmcli con up eth0
```

---

## Managing Connections with `nmtui`

`nmtui` provides a text-based interface:

1. Launch `nmtui`:

```bash
nmtui
```

2. Navigate menus using arrow keys:  
   - **Edit a connection** – modify settings.  
   - **Activate a connection** – bring it up.  
   - **Quit** – exit the interface.  

> Persistent configuration is automatic, as `nmtui` edits NetworkManager profiles directly.

---

## Creating a Network Bridge with `nmcli`

1. Create a bridge:

```bash
nmcli con add type bridge ifname br0
```

2. Add an interface to the bridge:

```bash
nmcli con add type bridge-slave ifname eth0 master br0
```

3. Configure the bridge:

- Static IP:

```bash
nmcli con mod br0 ipv4.addresses <IP_ADDRESS>/24
nmcli con mod br0 ipv4.gateway <GATEWAY_IP>
nmcli con mod br0 ipv4.dns <DNS_IP>
nmcli con mod br0 ipv4.method manual
```

- DHCP:

```bash
nmcli con mod br0 ipv4.method auto
```

4. Activate the bridge:

```bash
nmcli con up br0
```

---

### Adding the Bridge to Virtual Machines (via `virsh`)

1. Create XML configuration `bridge-network.xml`:

```xml
<network>
  <name>br0net</name>
  <forward mode='bridge'/>
  <bridge name='br0'/>
</network>
```

2. Define the network:

```bash
sudo virsh net-define bridge-network.xml
```

3. Start the network:

```bash
sudo virsh net-start br0net
```

4. Enable autostart:

```bash
sudo virsh net-autostart br0net
```

---

## Troubleshooting Network Issues

Common tools:

- `ping` – test connectivity.  
- `traceroute` – trace packet routes.  
- `ifconfig` / `ip addr` – view interface configuration.  
- `netstat` / `ss` – monitor connections and routing.  
- `nmcli` – manage NetworkManager.  
- `journalctl -u NetworkManager` – view logs.  
- `systemctl status NetworkManager` – check service status.  
- `resolvectl` – manage and inspect DNS.  
- `ethtool <interface>` – inspect Ethernet settings.

> ⚠️ Disable conflicting network managers (`systemd-networkd`, `netplan`, `dhcpcd`, `dnsmasq`, `dhclient`, `wicd`) to avoid interference.
