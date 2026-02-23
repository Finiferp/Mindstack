---
title: "Routing and IP Connectivity"
sidebar_label: "Routing"
sidebar_position: 4
---

# Routing and IP Connectivity

Routing is the process of **forwarding packets between different networks** based on logical addresses (IP addresses). Routers, operating at the Network layer, determine the best path for data to reach its destination, enabling inter-network communication.

---

## Static Routing

**Static routes** are manually configured pathways that tell a router how to reach a particular network. 

Characteristics of static routing:

- Simple to implement in small networks  
- Deterministic and predictable  
- Does **not adapt automatically** to network failures or topology changes  

Static routing is useful for:

- Small, stable networks  
- Default routes to exit points  
- Backup routes in combination with dynamic routing

---

## Dynamic Routing

**Dynamic routing protocols** allow routers to automatically discover and maintain routes in changing or large networks. Key concepts:

- Routers exchange information about network topology  
- Protocols compute the best path using metrics (cost, hop count, bandwidth, delay)  
- Routes are updated automatically when network conditions change  

Dynamic routing improves **scalability, resilience, and fault tolerance** compared to static routing.

---

## Link-State Routing Protocols – OSPF

**OSPF (Open Shortest Path First)** is a widely used link-state protocol.

Key principles:

- Each router maintains a **complete map of the network topology**  
- Routers exchange **Link State Advertisements (LSAs)** with neighbors  
- The **Shortest Path First (SPF) algorithm** calculates optimal paths to all destinations  
- Supports **classless addressing** and **variable-length subnet masks (VLSM)**  
- Networks can be divided into **areas**, with Area 0 acting as the backbone to improve scalability  

Advantages of OSPF:

- Fast convergence  
- Hierarchical network design with areas  
- Supports large-scale enterprise networks  
- Metric based on interface cost, allowing route optimization

---

## Distance-Vector and Hybrid Protocols – EIGRP

**EIGRP (Enhanced Interior Gateway Routing Protocol)** is a hybrid protocol (proprietary to Cisco) that combines concepts of distance-vector and link-state routing.

Key characteristics:

- Uses the **DUAL (Diffusing Update Algorithm)** to compute loop-free routes  
- Supports **unequal-cost load balancing**  
- Converges quickly due to incremental updates rather than full table exchanges  
- Metric incorporates bandwidth, delay, load, and reliability  

EIGRP simplifies routing in environments where rapid convergence and flexible metrics are important.

---

## Routing Metrics and Decision Factors

Routing decisions are based on metrics, which can include:

- **Hop count** – number of routers traversed  
- **Cost** – protocol-defined calculation (e.g., OSPF cost based on bandwidth)  
- **Delay** – total time to traverse a path  
- **Reliability** – probability of link failure  
- **Load** – current utilization of a path  

Routers select routes with the **lowest metric** for forwarding traffic.

---

## Troubleshooting Routing Conceptually

Effective troubleshooting focuses on verifying **reachability and path correctness**:

1. Confirm that routers **know about all necessary networks** (routing table completeness).  
2. Check neighbor relationships (adjacencies) for dynamic protocols.  
3. Ensure **network segmentation and addressing** are correct (subnets, masks, IP ranges).  
4. Test connectivity conceptually by understanding expected packet flow from source to destination.  
5. Use tools like **ping and traceroute** to verify path traversal and isolate failures.  

By reasoning about the network topology and routing logic, problems can often be identified without inspecting device-specific commands.

---

## Conceptual Summary

- **Routing** enables inter-network communication.  
- **Static routes** are simple but rigid; **dynamic protocols** provide scalability and resilience.  
- **OSPF** and other link-state protocols provide full topology awareness and optimal path selection.  
- **EIGRP** combines fast convergence with flexible metrics.  
- Troubleshooting focuses on path verification, neighbor relationships, and metric correctness.

Understanding these principles forms the foundation for more advanced topics, such as **BGP, traffic engineering, and policy-based routing**.