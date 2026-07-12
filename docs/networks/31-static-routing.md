---
title: "Static Routing"
sidebar_label: "Static Routing"
sidebar_position: 31
---

# Static Routing

Static routes are manually configured entries in a routing table — no protocol overhead, no dynamic learning, full administrative control. They remain the right tool for simple topologies, stub networks, default routes, and policy overrides.

---

## Why Static Routes

Dynamic routing protocols discover paths automatically but require:
- CPU and memory to run the protocol
- Bandwidth for hello/update messages
- Convergence time when topology changes

Static routes have none of that overhead — but require a human to configure every path and update them when the network changes. The tradeoff: **simplicity and control vs operational overhead**.

Static routes are appropriate for:
- Stub routers with a single uplink (one way in, one way out — no need for a protocol)
- Default routes pointing toward an ISP
- Floating static routes as backup paths
- Route leaking between VRFs
- Out-of-band management paths that must survive a protocol failure

---

## Route Types and Syntax

### Basic Static Route

```cisco
! Syntax: ip route <destination-network> <mask> {next-hop-ip | exit-interface} [distance] [permanent]

! Via next-hop IP (preferred — interface-independent)
Router(config)# ip route 10.1.0.0 255.255.0.0 192.168.1.2

! Via exit interface (only appropriate on point-to-point links)
Router(config)# ip route 10.1.0.0 255.255.0.0 GigabitEthernet0/1

! Via both (most specific — best practice when on multi-access networks)
Router(config)# ip route 10.1.0.0 255.255.0.0 GigabitEthernet0/0 192.168.1.2
```

**Why next-hop-only is better than interface-only:**
Specifying only an exit interface on Ethernet causes recursive lookups and ARP for every destination within that network (the router ARPs for the actual destination, not the next hop). This can generate thousands of ARP entries on a large Ethernet segment.

---

### Default Route

```cisco
! "Route of last resort" — matches any destination when no more specific route exists
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1      ! next-hop to ISP
Router(config)# ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0 ! exit interface

! IPv6 default route
Router(config)# ipv6 route ::/0 GigabitEthernet0/0 2001:db8::1

! Verify
Router# show ip route static
Router# show ip route 0.0.0.0
```

The default route appears in the routing table as:
```
S*   0.0.0.0/0 [1/0] via 203.0.113.1
```
`S*` = static, default route (`*` indicates "candidate default").

---

### Host Route (/32)

```cisco
! Route to a single specific host
Router(config)# ip route 10.0.0.50 255.255.255.255 192.168.1.2

! Common use: loopback reachability, management plane isolation
Router(config)# ip route 10.255.255.1 255.255.255.255 Loopback0
```

---

### Summary Route

```cisco
! Manually summarize downstream networks before advertising upstream
! Example: 192.168.0.0/24 through 192.168.3.0/24 → 192.168.0.0/22
Router(config)# ip route 192.168.0.0 255.255.252.0 10.0.0.2

! Discard route (null interface) — prevents routing loops when summarizing
! If none of the /24s match, the summary /22 would still match and be forwarded
! → loop. Null0 route drops it instead.
Router(config)# ip route 192.168.0.0 255.255.252.0 Null0 254
! High AD (254) ensures real routes win; only falls back to Null0 when no specific match
```

---

### Floating Static Routes

A floating static route has a higher Administrative Distance than the primary routing protocol — it stays hidden in the routing table until the primary route disappears (link or protocol failure).

```cisco
! Primary: OSPF learns 10.2.0.0/24 with AD 110 automatically

! Floating backup via a backup link — AD 200 (higher than OSPF's 110)
Router(config)# ip route 10.2.0.0 255.255.255.0 172.16.0.1 200

! When OSPF route exists:  floating static NOT in routing table (AD 200 > 110, loses)
! When OSPF route drops:   floating static INSTALLS (only route available)

! Common pattern: primary OSPF, backup via cellular/LTE with floating static
Router(config)# ip route 0.0.0.0 0.0.0.0 Dialer1 254  ! cellular backup default route
```

---

### IPv6 Static Routes

```cisco
! Basic IPv6 static route
Router(config)# ipv6 route 2001:db8:1::/64 2001:db8:ff::2

! Via exit interface (P2P links)
Router(config)# ipv6 route 2001:db8:1::/64 GigabitEthernet0/0

! Must specify next-hop as link-local on multi-access interfaces:
Router(config)# ipv6 route 2001:db8:1::/64 GigabitEthernet0/0 fe80::1

! IPv6 default route
Router(config)# ipv6 route ::/0 2001:db8:ff::1

! IPv6 floating static (AD after next-hop)
Router(config)# ipv6 route ::/0 GigabitEthernet0/1 fe80::2 200
```

---

## Administrative Distance

AD is a trustworthiness ranking — lower = more trusted. When multiple sources (static, OSPF, EIGRP) know a route to the same destination, the lowest AD wins.

| Route Source | Default AD |
|---|---|
| Connected interface | 0 |
| Static route | 1 |
| EIGRP summary | 5 |
| External BGP | 20 |
| Internal EIGRP | 90 |
| IGRP (legacy) | 100 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP external | 170 |
| Internal BGP | 200 |
| Unreachable (blackhole) | 255 |

```cisco
! Override the default AD of a static route (for floating static)
Router(config)# ip route 10.0.0.0 255.0.0.0 192.168.1.1 200

! AD of 255 = never install in routing table (useful for administrative suppression)
Router(config)# ip route 10.0.0.0 255.0.0.0 192.168.1.1 255
```

---

## Recursive Routing and Route Resolution

When a static route points to a next-hop IP (not an interface), the router must resolve that next-hop IP to an exit interface — called **recursive lookup**.

```
Static: 10.1.0.0/24 via 192.168.1.2
  → Router looks up 192.168.1.2 in the routing table
  → Finds: 192.168.1.0/24 connected on GigabitEthernet0/0
  → Exits GigabitEthernet0/0 and ARPs for 192.168.1.2

If 192.168.1.2 is not reachable (no route to it):
  → Static route is NOT installed (recursive lookup fails)
  → Route goes into "not in table" state

! Verify recursive lookup:
Router# show ip route 10.1.0.0
! Output shows: via 192.168.1.2, GigabitEthernet0/0 (resolved interface)
```

---

## The `permanent` Keyword

By default, if the exit interface goes down, the static route is removed from the routing table (because the recursive lookup fails). The `permanent` keyword keeps the route installed even if the interface is down.

```cisco
! Keep route in table even when interface is down
Router(config)# ip route 10.1.0.0 255.255.0.0 192.168.1.2 permanent

! Use case: route that should always exist for policy/filtering reasons
! (traffic will be dropped at the unreachable next-hop, not by a missing route)
```

---

## Verification and Troubleshooting

```cisco
! Show all routes
Router# show ip route

! Show only static routes
Router# show ip route static

! Show route to a specific destination (longest prefix match)
Router# show ip route 10.1.2.3

! Show IPv6 routes
Router# show ipv6 route
Router# show ipv6 route static

! Check if next-hop is reachable
Router# ping 192.168.1.2
Router# traceroute 10.1.0.1

! Check ARP table (for Ethernet next-hops)
Router# show arp
Router# show ip arp

! Debug (verbose — use with care in production)
Router# debug ip routing          ! route installs/removals
Router# debug ip packet detail    ! packet forwarding decisions
Router# undebug all               ! always clean up after debugging
```

### Common Static Route Problems

```
Problem: Route installed but traffic doesn't reach destination
→ Check: is the next-hop itself reachable? (ping next-hop)
→ Check: does the remote end have a return route back?
→ Check: ACL blocking traffic on either router?

Problem: Route not in routing table
→ Check: is the next-hop reachable (recursive lookup fails silently)?
→ Check: is there a more specific route overriding this one?
→ Check: is the AD too high (losing to a dynamic protocol)?

Problem: Routing loop
→ Check: both routers pointing at each other?
→ Fix: null route on summarizing router to black-hole unmatched traffic

Problem: Asymmetric routing (path in ≠ path out)
→ Usually not a problem for TCP/UDP, but breaks stateful firewalls
→ Check return path; may need symmetric static routes on both sides
```

---

## Tips

- Always add a Null0 route when manually summarizing to prevent routing loops — if no specific route matches within the summary, drop the packet instead of forwarding in a loop.
- On multi-access (Ethernet) networks, specify both the exit interface AND the next-hop IP in the static route — interface-only routes on Ethernet cause proxy-ARP issues.
- Use floating static routes (AD 200+) as automatic failover backup paths behind dynamic routing protocols.
- The `permanent` keyword is rarely needed — think carefully before using it, as it can mask link failures.
- Document every static route with a comment in the config and in change management — static routes don't self-document like dynamic protocol configurations.

---

## Summary

- Static routes are manually configured — no protocol overhead, but no automatic failover either.
- `ip route destination mask next-hop [AD]` is the basic syntax; AD defaults to 1 (very trusted).
- Default route `0.0.0.0 0.0.0.0` matches everything not matched by a more specific route.
- Floating static routes (high AD) stay hidden behind dynamic routes and install automatically when the dynamic route disappears.
- Recursive lookup: next-hop IP must itself be reachable via another route, or the static route won't install.
- IPv6 static routes on Ethernet must specify a link-local next-hop to avoid NDP resolution failures.
