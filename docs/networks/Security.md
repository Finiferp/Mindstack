---
title: "Network Security Fundamentals"
sidebar_label: "Security"
sidebar_position: 6
---

# Security Fundamentals

**Access Control Lists (ACLs)** filter traffic at the router or switch. An ACL is a list of permit/deny rules applied to interfaces. Standard ACLs filter by source IP only, while extended ACLs can filter on source/destination IP, protocol, and port. For example:

```text
access-list 10 deny 10.0.0.0 0.255.255.255
access-list 10 permit any
interface GigabitEthernet0/0
 ip access-group 10 in
```

This ACL 10 denies traffic from 10.0.0.0/8 and permits all else. Remember that ACLs have an implicit “deny all” at the end.

<strong>AAA (Authentication, Authorization, Accounting)</strong> secures device access. Authentication verifies user identity (e.g. username/password), authorization determines what they may do, and accounting logs their actions
. On a Cisco device, you might enable AAA with:
```text
aaa new-model
aaa authentication login default local
aaa authorization exec default local
aaa accounting commands 15 default start-stop
username admin secret cisco123
```
This uses local credentials for login and logs high-level commands.

<strong>Wireless Security</strong>: Wi-Fi networks should use strong encryption. WEP is obsolete; WPA2 (or WPA3) with AES encryption is recommended. Use complex passphrases or enterprise 802.1X authentication (RADIUS) to protect wireless networks.

<strong>VPNs (Virtual Private Networks)</strong>: VPNs encrypt traffic over untrusted networks. IPsec VPNs (site-to-site or remote access) or SSL VPNs provide secure tunnels for data. VPN configuration involves defining encryption domains and shared secrets or certificates.

<strong>Troubleshooting (Security)</strong>: Check ACL hit counts with ``show access-lists`` to see if rules match traffic. Verify AAA login with ``show authentication`` sessions or log files. For VPNs, ensure peer addresses and keys match, and use ``debug crypto`` for IPsec. On wireless, ensure client and AP encryption methods match.