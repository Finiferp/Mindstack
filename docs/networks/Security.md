---
title: "Network Security Fundamentals"
sidebar_label: "Security"
sidebar_position: 6
---

# Network Security Fundamentals

Network security ensures that data, devices, and infrastructure are protected from unauthorized access, misuse, and attacks. Security in networking involves **access control, authentication, encryption, and monitoring**, all designed to maintain confidentiality, integrity, and availability.

---

## Access Control Lists (ACLs)

**ACLs** are rules applied at network devices (routers or switches) to filter traffic based on defined criteria. They act as the first line of defense for controlling which packets are allowed or denied.

Key points:

- **Standard ACLs** filter traffic based solely on the **source IP address**.  
- **Extended ACLs** can filter based on **source and destination IP**, **protocol type**, and **port numbers**.  
- ACLs are processed **top-to-bottom**, and unmatching traffic is typically **implicitly denied**.  
- ACLs can be applied **inbound** (traffic entering an interface) or **outbound** (traffic leaving an interface).  

ACLs are essential for **traffic segmentation, enforcing security policies, and limiting access to critical resources**.

---

## AAA – Authentication, Authorization, and Accounting

**AAA** is a security framework for managing access to network devices:

1. **Authentication** – Verifies the identity of users or devices (e.g., passwords, certificates, multi-factor methods).  
2. **Authorization** – Determines **what actions** an authenticated user is allowed to perform.  
3. **Accounting** – Logs actions and events for auditing, monitoring, or compliance purposes.  

AAA allows administrators to **enforce policy consistently, monitor usage, and track accountability** across network infrastructure.

---

## Wireless Security

Wireless networks are inherently more vulnerable due to the broadcast nature of radio signals. Key principles include:

- **Strong encryption**: Use AES-based protocols such as WPA2 or WPA3. Avoid deprecated methods like WEP.  
- **Secure authentication**: Enterprise-grade networks can implement 802.1X authentication with RADIUS servers to control access.  
- **Complex passphrases**: Protects against brute-force attacks.  
- **Segmentation**: Isolating guest networks from internal resources prevents unauthorized access.

Wireless security ensures that mobile and IoT devices can connect safely without exposing the network to attackers.

---

## Virtual Private Networks (VPNs)

**VPNs** create secure tunnels over untrusted networks, such as the Internet. Concepts:

- **Encryption** – Data is encoded to prevent eavesdropping.  
- **Authentication** – Devices or users prove identity before connecting.  
- **Types of VPNs**:  
  - **Site-to-site VPNs**: Connect entire networks securely.  
  - **Remote access VPNs**: Provide secure access for individual users.  

VPNs maintain **confidentiality, integrity, and authenticity** of transmitted data across public networks.

---

## Conceptual Troubleshooting of Security Services

When ensuring network security works as intended, consider:

- **ACLs**: Verify that rules align with intended traffic flows. Check which traffic is permitted or blocked conceptually.  
- **AAA**: Confirm that user authentication, permissions, and logging policies are correctly enforced.  
- **VPNs**: Ensure peers, encryption domains, and authentication mechanisms are compatible.  
- **Wireless**: Ensure encryption protocols match between client devices and access points, and verify access policies and isolation are correctly applied.  

Troubleshooting security conceptually focuses on **policy correctness, alignment between security mechanisms, and verification of intended access and protection**, rather than on device-specific commands.

---

## Summary

Network security integrates multiple layers of defense:

- **Traffic filtering (ACLs)**  
- **Identity management (AAA)**  
- **Secure connectivity (VPNs)**  
- **Wireless protection**  

These principles provide **confidential, reliable, and auditable network operations**, forming the foundation for secure modern IT infrastructure.