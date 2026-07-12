---
title: "Capacity Planning and Network Performance"
sidebar_label: "Capacity Planning"
sidebar_position: 73
---

# Capacity Planning and Network Performance

Capacity planning prevents the network from becoming the bottleneck for business growth. Done proactively, it avoids emergency purchases and outages caused by congestion. Done reactively, it means you're always one growth spike away from a crisis.

---

## The Capacity Planning Cycle

```
1. Measure current utilization
   Collect baseline: traffic volumes, peak hours, seasonal patterns
   Tools: SNMP/telemetry → Grafana, NetFlow → ElastiFlow/ntopng

2. Model growth
   Historical trend: if traffic grew 30% last year, project 30% next year
   Business input: new project adding 200 users? New site? Acquisition?
   Peak vs average: peak utilization matters more than average (queues fill at peak)

3. Identify constraints
   Links at >70% average utilization during peak → plan upgrade
   Device CPU/memory: >60% average → plan upgrade or offload
   IP address space: <20% remaining → plan expansion

4. Plan and budget
   Lead time: ISP circuits take 30-90+ days; hardware 4-12 weeks
   Budget cycle: capacity plans must align with annual budgets
   Design headroom: provision to 50% target utilization after upgrade
     ("never build to the limit" — traffic always grows faster than planned)

5. Implement and measure again
   Verify upgrade achieved expected headroom
   Set new baselines; adjust monitoring thresholds
```

---

## Utilization Thresholds

```
Interface utilization:
  < 50%: comfortable headroom
  50-70%: watch closely; plan upgrade
  70-80%: elevated; queue buildup begins; upgrade in current budget cycle
  > 80%: critical; immediate upgrade required
  > 90%: links queue continuously; applications impacted; emergency upgrade

Why 70-80% is the planning threshold:
  Traffic is not smooth — bursts exist at all timescales (per millisecond, per minute, per hour)
  An 80% average link has frequent bursts to 100% → queuing → latency spikes → TCP retransmits
  The Bandwidth-Delay Product means even brief congestion has disproportionate impact on TCP

CPU utilization (routers/switches):
  < 60%: comfortable
  60-80%: monitor; identify cause (routing table churn? DDoS?)
  > 80%: immediate investigation; may impact control plane (BGP flaps, OSPF drops)

Memory utilization:
  < 70%: comfortable
  70-85%: watch; increase may be needed
  > 90%: urgent; risk of process death or device crash
  Cisco: "show processes memory sorted" identifies top consumers

BGP routing table growth (router FIB capacity):
  Know your platform's FIB limits (Cisco ASR 9000: millions of routes; ISR 4K: ~500K)
  Monitor table size: "show bgp ipv4 unicast summary | include total"
  Internet full table ~1M prefixes; plan FIB capacity with 20% headroom
```

---

## Bandwidth Trending and Forecasting

```python
# Simple linear trend from collected data
import numpy as np
from datetime import datetime, timedelta

# Monthly 95th-percentile peak bandwidth (Mbps) for a WAN link
months = list(range(12))  # months 0-11
bandwidth_mbps = [120, 135, 128, 142, 151, 158, 163, 172, 180, 189, 195, 208]

# Linear regression
slope, intercept = np.polyfit(months, bandwidth_mbps, 1)
print(f"Monthly growth: {slope:.1f} Mbps/month")
print(f"Annual growth rate: {slope * 12 / bandwidth_mbps[0] * 100:.1f}%")

# Forecast next 6 months
for m in range(12, 18):
    forecast = slope * m + intercept
    date = datetime(2024, 1, 1) + timedelta(days=30 * m)
    print(f"{date.strftime('%b %Y')}: {forecast:.0f} Mbps forecast")

# When will we hit 80% of link capacity (1Gbps = 1000 Mbps)?
capacity_limit = 1000 * 0.80  # 800 Mbps
months_to_limit = (capacity_limit - intercept) / slope
print(f"Will hit 80% threshold in {months_to_limit:.0f} months")
```

### 95th Percentile Bandwidth

```
95th percentile: the bandwidth value exceeded only 5% of the time
Most ISPs bill on the 95th percentile ("burstable billing"):
  All 5-minute samples collected over the month
  Sort ascending; take the 95th percentile value
  Pay for that rate (not the peak, not the average)
  Top 5% (busy hour traffic, short bursts) not billed

Why 95th percentile matters for planning:
  Average utilization masks peak periods (average 200 Mbps, peak 450 Mbps → need 450+)
  Plan to keep 95th percentile below 70% of link capacity
  Monitor and alert on 95th percentile, not just average

Calculating 95th percentile in Grafana:
  quantile_over_time(0.95, rate(ifHCInOctets{...}[5m])[1M:5m]) * 8
```

---

## IPAM Capacity Planning

```
IPv4 address space:
  Monitor prefix utilization (used IPs / total IPs per prefix)
  Alert at 80% utilization → time to request more space or split/renumber
  Document aggregation path: is there room to expand within the supernet?

IPv6 capacity planning:
  Unlike IPv4: address conservation is not a concern
  Plan subnet allocation: /64 per subnet everywhere
  Track prefix assignments to sites/VRFs: who has what /48?

Tools:
  NetBox: prefix utilization report; drill down to IP level
  "show ip dhcp pool" on Cisco: see pool usage (for DHCP-served subnets)

Common mistakes:
  /24 for a server subnet with 5 servers → wastes 249 addresses
  /30 for a data center VLAN with 200 VMs → runs out immediately
  No documentation → no way to find free space when needed urgently
```

---

## Hardware Capacity

### Forwarding Capacity

```
Routing table (FIB / TCAM):
  Hardware routing entries are stored in TCAM — fixed-size, expensive silicon
  Platforms differ dramatically:
    Home router (Cisco RV series): <10K routes
    ISR 4K series: 500K-1M routes
    ASR 1001: 2M routes
    ASR 9K: 4M-8M routes
    Nexus 9K: 128K-512K routes (depends on chipset and mode)
    Juniper MX204: 3M routes
  Know your platform limits before receiving full BGP table

Packet Forwarding Rate:
  Measured in PPS (packets per second) or Gbps
  Mix of packet sizes matters: line-rate at 64 bytes is hardest
  Hardware: 64-byte PPS = forwarding capacity test
    GigE link: 1.488 Mpps @ 64 bytes
    10GigE: 14.88 Mpps
    100GigE: 148.8 Mpps

Traffic Matrix:
  How many flows? (session table size — relevant for stateful devices)
  ASA 5512-X: 500K connections; ASA 5585: 10M connections
  Always check stateful session table limits, not just throughput
```

### Hardware Refresh Planning

```
Hardware End-of-Life (EoL) / End-of-Support (EoS):
  Vendors publish EoL dates (last date to purchase) and EoS dates (last support day)
  After EoS: no security patches, no TAC support, no replacement parts
  Plan hardware refresh 12-18 months before EoS

Cisco hardware lifecycle tracking:
  https://www.cisco.com/c/en/us/products/eos-eol-policy.html
  NetBox stores EoL dates in device type metadata

Refresh trigger criteria:
  Hardware approaching EoS/EoL
  Insufficient memory for routing table growth
  No support for required features (IPv6, VXLAN, etc.)
  Excessive failure rate (tracking via MTBF vs actual failure rate)

Total Cost of Ownership (TCO):
  Purchase price + 5-year maintenance + power + rack space + operations time
  Cloud option TCO: monthly fees + data transfer costs vs on-prem capital
  Refresh cycles: network hardware every 5-7 years (access); 7-10 years (core)
```

---

## Performance Baselining

```
A performance baseline documents "normal" — essential for detecting when something is wrong.

Baseline metrics to capture:
  Interface: utilization (in/out), error rate, packet rate (pps), drops
  Device: CPU 5-min average, memory used, process list
  Routing: BGP prefix count, OSPF neighbor count, convergence time
  Applications: latency to key servers, HTTP response time, DNS resolution time
  QoS: queue depth, drop rate per class, DSCP marking distribution

Baseline windows:
  Time-of-day: traffic at 2am ≠ 10am ≠ 2pm (always compare same time-window)
  Day-of-week: Monday traffic ≠ Saturday (avoid comparing Monday spike to Saturday normal)
  Seasonal: retail traffic spikes at holidays; educational spikes at start of semester

Grafana baseline overlay:
  Display "last week" as a dashed line overlaid on current metrics
  Immediately shows if today's pattern is unusual vs same day last week

Anomaly detection:
  Prometheus: predict_linear() forecasts based on recent trend
  Machine learning: Grafana OnCall, Elastic ML, Datadog anomaly detection
  Rule of thumb: alert if metric is > 2 standard deviations from same-time last week
```

---

## Capacity Plan Document Structure

```
Executive Summary:
  Current state (one page): key constraints, critical links at risk
  Recommended investments: total budget request, priority order
  Risk of inaction: what happens if we don't act

Network summary:
  Link inventory: all WAN/backbone links with current utilization
  Device inventory: all core/distribution devices with CPU/memory utilization
  IPAM status: prefix utilization by site

Trend analysis:
  12-month growth rate per link (chart + table)
  Projected date to reach 80% threshold (when upgrade needed)
  Business growth drivers (new sites, acquisitions, new services)

Recommended upgrades:
  Priority 1 (immediate/within 90 days): links/devices already at threshold
  Priority 2 (within 6 months): projected to hit threshold within 6 months
  Priority 3 (within 12 months): longer-term planning items
  Each item: description, current status, recommended action, estimated cost, risk

Design options:
  For major investments: 2-3 options with cost/benefit/risk comparison
  Recommended option with justification

Implementation timeline:
  Gantt chart or table: which upgrades happen when, dependencies

Appendix:
  Detailed utilization data (all links, 12 months)
  Full device inventory with specifications
  Vendor quotes (if obtained)
```

---

## Tips

- Plan for 2× today's traffic at the time of deployment — by the time procurement, delivery, and installation are done, the original capacity may already be insufficient.
- 95th-percentile utilization is more meaningful than average — a link that averages 40% but peaks at 95% creates user-visible congestion for 5% of the time (an entire day each month at 5%).
- Know your platform's TCAM/FIB limits before deploying — a device running out of forwarding table space becomes a routing black hole silently (routes just stop being programmed).
- Hardware refresh is usually justified on operational savings alone — old hardware has higher failure rates, longer MTTR, and no vendor support; the operational cost often exceeds new hardware cost within 2 years.
- Involve the business in capacity planning — without context on planned growth (new offices, M&A, new services), network capacity planning is just extrapolation of past trends.

---

## Summary

- Capacity planning cycle: measure → trend → identify constraints → plan → implement → measure again — it's a continuous loop, not a one-time event.
- Plan to keep 95th-percentile peak utilization below 70% — above 80% queues build continuously; above 90% is an active problem.
- Know your platform limits: TCAM entries, session table size, PPS rate — hardware constraints are often the hidden bottleneck.
- Baseline "normal" for all key metrics (by time of day and day of week) — anomaly detection requires knowing what normal looks like first.
- Build capacity plans with business input — growth from new offices, acquisitions, and products must be accounted for, not just historical extrapolation.
- Hardware EoL planning: 12-18 months before End-of-Support — security patches stop, TAC support ends, spare parts disappear.
