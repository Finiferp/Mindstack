---
title: "IP Services"
sidebar_label: "IP Services"
sidebar_position: 5
---

# IP Services

**DHCP (Dynamic Host Configuration Protocol)** automatically provides IP addressing and configuration to hosts. A DHCP server leases an IP address, subnet mask, default gateway, and often DNS servers to a client. The typical client process is Discover → Offer → Request → ACK. On a Cisco router, you can configure a DHCP pool like:

```text
ip dhcp pool Clients
 network 192.168.10.0 255.255.255.0
 default-router 192.168.10.1
 dns-server 8.8.8.8
 ```
 This will assign addresses in 192.168.10.0/24 to clients.
 
<strong>NAT (Network Address Translation)</strong> allows a private IP network to access external networks (e.g. the Internet) by translating private addresses to a public address. <strong>PAT (Port Address Translation)</strong>, or NAT overload, lets multiple hosts share a single public IP by using different ports. Example Cisco configuration for NAT overload:
```text
interface GigabitEthernet0/0
 ip address 203.0.113.5 255.255.255.248
 ip nat outside
!
interface GigabitEthernet0/1
 ip address 192.168.0.1 255.255.255.0
 ip nat inside
!
ip nat inside source list 1 interface GigabitEthernet0/0 overload
access-list 1 permit 192.168.0.0 0.0.0.255
```

This maps 192.168.0.0/24 internal addresses to the outside IP 203.0.113.5. Use `show ip nat translations` to verify active mappings.

<strong>Additional Services</strong>: DNS (Domain Name System) resolves hostnames to IPs. NTP (Network Time Protocol) synchronizes device clocks. SNMP (Simple Network Management Protocol) is used for monitoring devices. These services are typically configured on servers or network devices to support network operation.

<strong>Troubleshooting (IP Services)</strong>: For DHCP, ensure the correct network is defined and check `show ip dhcp binding`. Verify NAT by checking interface `ip nat inside/outside` settings and using `show ip nat statistics`. Use `ping` and `telnet` for DNS testing, and check SNMP with appropriate queries or `show snmp`.