---
title: "Routing and IP Connectivity"
sidebar_label: "Routing"
sidebar_position: 4
---

# Routing and IP Connectivity

Routers operate at the Network layer, forwarding packets between different IP subnets. **Static routes** are manually configured (e.g. `ip route 10.0.0.0 255.255.255.0 192.168.1.2`) to tell the router how to reach a network. Static routes are simple but do not adapt to failures, so **dynamic routing protocols** are used in larger or changing networks.

**OSPF (Open Shortest Path First)** is a widely used link-state routing protocol. It builds a complete map of the network topology by exchanging Link State Advertisements (LSAs) with neighbors, then uses the Shortest Path First (SPF) algorithm to compute the best routes. OSPF is classless (supports VLSM), has a metric based on interface cost, and by default has an administrative distance of 110. OSPF networks are divided into *areas* (with Area 0 as the backbone) to improve scalability.

Example OSPF configuration on Cisco IOS:
```text
router ospf 1
 network 10.0.0.0 0.0.0.255 area 0
 network 192.168.0.0 0.0.0.255 area 0
```
This enables OSPF on interfaces in the 10.0.0.0/24 and 192.168.0.0/24 networks. Use show ip ospf neighbor to verify adjacency with other routers.

<strong>EIGRP (Enhanced Interior Gateway Routing Protocol)</strong> is a Cisco proprietary hybrid protocol. It has features of both distance-vector and link-state (using the DUAL algorithm)
. EIGRP converges quickly and supports unequal-cost load balancing. By default, EIGRP’s admin distance is 90 (internal routes). Example Cisco config:
```text
 router eigrp 100
  network 10.0.0.0 0.0.0.255
  network 192.168.0.0 0.0.0.255
  no auto-summary
```

This enables EIGRP in AS 100 for the two subnets. Use show ip eigrp neighbors to check neighbor status.

<strong>Troubleshooting (Routing)</strong>: Check show ip route to see routes installed. Verify neighbor/adjacency with show ip ospf neighbor or show ip eigrp neighbors. Confirm network statements match the intended subnets. If a route is missing, ensure correct subnet masks and next-hop addresses. Tools like ping and traceroute help isolate connectivity and path