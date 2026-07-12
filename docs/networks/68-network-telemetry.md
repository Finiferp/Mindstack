---
title: "Network Telemetry and Observability"
sidebar_label: "Network Telemetry"
sidebar_position: 68
---

# Network Telemetry and Observability

Modern networks generate enormous amounts of operational data. Telemetry — the automated collection and transmission of measurements from network devices — enables proactive operations, faster troubleshooting, and capacity planning.

---

## From SNMP Polling to Streaming Telemetry

```
Traditional SNMP polling:
  NMS polls each device every 5 minutes for interface counters
  Problems:
    Poll interval too long — 5 minutes misses micro-bursts
    Scale: 1,000 devices × 100 OIDs = 100,000 SNMP requests per cycle
    CPU: SNMP polling taxes device CPU; UDP; no guarantee of delivery
    Fixed MIB objects — can't easily add new operational data

Streaming telemetry (gNMI / gRPC):
  Device pushes data to collector as it changes
  gNMI SUBSCRIBE modes:
    SAMPLE: push every N seconds (like polling but device-initiated)
    ON_CHANGE: push only when value changes (event-driven, near-real-time)
    TARGET_DEFINED: device decides per path (optimal)
  
  Advantages:
    Sub-second granularity (100ms or faster)
    Device CPU friendly (one persistent connection vs thousands of SNMP GETs)
    Structured data (protobuf binary, not SNMP OID trees)
    Works with YANG data models (same model as NETCONF)
    Scales better: device sends; collector receives (push vs pull)

Comparison:
  SNMP: Pull (NMS asks) → 5-minute interval → OID-based → UDP (lossy)
  Telemetry: Push (device sends) → milliseconds → YANG-based → gRPC/TLS (reliable)
```

---

## gNMI Streaming Telemetry

```
gNMI subscription paths (OpenConfig YANG):
  /interfaces/interface[name=*]/state/counters         # interface counters
  /interfaces/interface[name=*]/state/oper-status      # up/down
  /network-instances/network-instance[name=*]/protocols/protocol/bgp/neighbors
  /platform/components/component/state/memory          # memory usage
  /qos/interfaces/interface[name=*]/output/queues       # QoS queue depths

Python gNMI subscribe example:
  from pygnmi.client import gNMIclient

  with gNMIclient(target=("10.0.0.1", 6030), username="admin",
                  password="secret", insecure=True) as gc:
      subscribe_request = {
          "subscription": [
              {
                  "path": "/interfaces/interface[name=*]/state/counters",
                  "mode": "sample",
                  "sample_interval": 10_000_000_000,  # 10 seconds in nanoseconds
              },
              {
                  "path": "/bgp/neighbors/neighbor/state",
                  "mode": "on_change",
              },
          ],
          "mode": "stream",
          "encoding": "proto",
      }
      for update in gc.subscribe(subscribe_request):
          print(update)

Pipeline (Cisco):
  config.json:
  {
    "pipeline": [
      {
        "input": {
          "type": "grpc",
          "server": ":57500"
        },
        "output": {
          "type": "kafka",
          "brokers": ["kafka:9092"],
          "topic": "network-telemetry"
        }
      }
    ]
  }
```

---

## The Modern Observability Stack

### Time-Series Database — InfluxDB / Prometheus

```
Time-series databases store data indexed by time — perfect for metrics:
  (timestamp, metric_name, value, tags)

InfluxDB:
  Storage: time-series optimized; line protocol:
    interface_counters,host=rtr01,interface=Gi0/0 in_bytes=1234567890i 1704067200000000000
    ├────────────────┘ ├────────────────────────┘ ├──────────────────┘ ├─────────────────┘
    measurement name    tags (indexed)               field (value)       timestamp (ns)

  Flux query language:
    from(bucket: "network")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "interface_counters" and r.host == "rtr01")
      |> filter(fn: (r) => r._field == "in_bytes")
      |> derivative(unit: 1s, nonNegative: true)   // calculate rate (bytes/sec)
      |> map(fn: (r) => ({ r with _value: r._value * 8.0 }))  // convert to bits/sec
      |> yield()

Prometheus:
  Pull-based (scrapes exporters); PromQL query language
  Alertmanager for alerting
  
  PromQL examples:
    # Interface throughput in Mbps (5-minute rate)
    rate(ifHCInOctets{job="snmp",instance="rtr01"}[5m]) * 8 / 1e6

    # BGP peer down alert
    bgp_peer_up{instance="rtr01"} == 0

    # CPU utilization > 80% for 5 minutes
    cpu_utilization > 80
```

### Grafana — Visualization

```
Grafana connects to time-series DBs and renders dashboards
  Data sources: InfluxDB, Prometheus, Elasticsearch, CloudWatch, SNMP, etc.
  Dashboards: panels (graphs, tables, stat boxes, heatmaps, gauges)
  Alerting: alert rules on any metric; notify to PagerDuty, Slack, email

Key dashboard panels for networking:
  Interface utilization: line graph; bps in/out per interface
  BGP session state: stat panel or table; up/down/flapping
  CPU/memory: gauge; % utilization with color thresholds
  Top talkers: table; sorted by traffic volume
  Packet loss / error rate: line graph; highlight thresholds
  Latency (ICMP/BFD): line graph; ms; SLA thresholds

Grafana dashboard JSON can be version-controlled (git) and deployed via API
  Dashboard import: POST /api/dashboards/import
```

### Prometheus + SNMP Exporter

```
# For legacy devices without gNMI: use SNMP Exporter to convert SNMP to Prometheus

# snmp.yml (generated from MIB definitions):
modules:
  cisco_ios:
    walk:
      - ifTable
      - ifXTable
      - ip
      - bgp
    metrics:
      - name: ifHCInOctets
        oid: 1.3.6.1.2.1.31.1.1.1.6
        type: counter
        indexes:
          - labelname: ifIndex
            type: gauge
      - name: ifHCOutOctets
        oid: 1.3.6.1.2.1.31.1.1.1.10
        type: counter

# prometheus.yml:
scrape_configs:
  - job_name: snmp
    static_configs:
      - targets:
          - 10.0.0.1  # router
          - 10.0.0.2  # switch
    metrics_path: /snmp
    params:
      module: [cisco_ios]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: snmp-exporter:9116  # SNMP exporter host
```

---

## Log Aggregation — ELK / Loki

```
Network devices generate syslog; log aggregation makes them searchable.

ELK Stack (Elasticsearch, Logstash, Kibana):
  Logstash / Filebeat / Fluentd: collect and parse logs
  Elasticsearch: index and store; full-text search
  Kibana: visualization; KQL (Kibana Query Language) search

Grafana Loki (lightweight alternative to ELK):
  Log aggregation; indexes only labels (not full text) → cheaper storage
  LogQL query language
  Integrates natively with Grafana

Syslog → Loki pipeline:
  Network device → rsyslog / syslog-ng → Promtail → Loki → Grafana

Useful syslog queries:
  # BGP neighbor changes
  {job="network_syslog"} |= "BGP" |= "state" | logfmt | level="WARNING"

  # Interface flaps
  {host=~"rtr.*"} |= "changed state to down" or "changed state to up"

  # Authentication failures
  {job="network_syslog"} |= "LOGIN FAILED" | logfmt | count_over_time([5m]) > 5
```

---

## Alerting

### Alert Design Principles

```
Good alert = actionable + urgent + precise
Bad alert = noise that responders learn to ignore

Alert fatigue: too many false positives → responders stop reacting → real incidents missed

Alert types:
  Threshold: value exceeds a fixed level (CPU > 90%, interface > 95% utilization)
  Rate-of-change: value changing too fast (BGP routes increasing 100/min → route leak?)
  Anomaly: deviation from historical baseline (traffic 3× typical for this hour)
  Absence: expected signal not received (device stopped sending telemetry → down?)
  Composite: multiple conditions together (high CPU AND high interface utilization AND BGP changes)

Alert severity levels:
  P1 (Critical): immediate response required; 24/7; pages on-call
    Examples: core device down, WAN link down, internet unreachable
  P2 (High): response within 30 minutes; may page
    Examples: BGP session down, link at >95% utilization, device CPU >90% sustained
  P3 (Medium): response within 4 hours; ticket created
    Examples: link at >75% utilization, high error rate on interface
  P4 (Low): next business day; informational
    Examples: device approaching end-of-life, certificate expiring in 30 days
```

### Prometheus Alertmanager Rules

```yaml
# alert_rules.yaml
groups:
  - name: network_alerts
    rules:
      - alert: InterfaceDown
        expr: ifOperStatus{job="snmp"} == 2  # 2 = down
        for: 2m   # must be true for 2 minutes before firing
        labels:
          severity: critical
        annotations:
          summary: "Interface {{ $labels.ifDescr }} on {{ $labels.instance }} is DOWN"
          description: "Interface has been down for more than 2 minutes"
          runbook: "https://wiki.example.com/runbooks/interface-down"

      - alert: BGPSessionDown
        expr: bgpPeerState{job="snmp"} != 6  # 6 = established
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "BGP session to {{ $labels.bgpPeerRemoteAddr }} is not established"

      - alert: HighInterfaceUtilization
        expr: >
          rate(ifHCInOctets{job="snmp"}[5m]) * 8
          / ifHighSpeed{job="snmp"} / 1000000
          > 0.90   # >90% of interface speed
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Interface {{ $labels.ifDescr }} utilization > 90%"

      - alert: DeviceCPUHigh
        expr: cpmCPUTotal5min{job="snmp"} > 90
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Device {{ $labels.instance }} CPU > 90% for 5 minutes"

      - alert: DeviceTelemetryMissing
        expr: up{job="gnmi"} == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "No telemetry from {{ $labels.instance }} — device may be down"
```

---

## SNMP Reference (Legacy but Ubiquitous)

```
Key MIBs for network monitoring:
  MIB-II (RFC 1213) — system, interfaces, ip, tcp, udp
  IF-MIB (RFC 2863) — interface statistics (ifTable, ifXTable)
  IP-MIB — IP forwarding, fragmentation
  OSPF-MIB — OSPF state, neighbors
  BGP4-MIB — BGP peer state, prefix counts
  CISCO-PROCESS-MIB — CPU and memory on Cisco
  CISCO-MEMORY-POOL-MIB — memory pools
  ENTITY-MIB — hardware components (chassis, modules)

Useful OIDs:
  sysName:      1.3.6.1.2.1.1.5.0   — hostname
  sysUpTime:    1.3.6.1.2.1.1.3.0   — uptime (hundredths of seconds)
  ifDescr:      1.3.6.1.2.1.2.2.1.2 — interface name
  ifOperStatus: 1.3.6.1.2.1.2.2.1.8 — 1=up, 2=down
  ifHCInOctets: 1.3.6.1.2.1.31.1.1.1.6  — 64-bit in bytes
  ifHCOutOctets: 1.3.6.1.2.1.31.1.1.1.10 — 64-bit out bytes
  ifInErrors:   1.3.6.1.2.1.2.2.1.14 — input errors
  ifOutErrors:  1.3.6.1.2.1.2.2.1.20 — output errors
  bgpPeerState: 1.3.6.1.2.1.15.3.1.2 — BGP peer state (6=Established)

Command-line SNMP tools:
  snmpget -v3 -u nms_user -l authPriv -a SHA -A authpass -x AES -X privpass \
    10.0.0.1 1.3.6.1.2.1.1.5.0         # get hostname

  snmpwalk -v3 -u nms_user -l authPriv -a SHA -A authpass -x AES -X privpass \
    10.0.0.1 1.3.6.1.2.1.2.2.1         # walk ifTable

  snmptranslate -On 1.3.6.1.2.1.1.5.0  # translate OID to name
  snmptranslate -Of sysName.0           # translate name to OID
```

---

## Network Performance Monitoring

```
Active monitoring (synthetic probes):
  ICMP ping: basic reachability and round-trip time
  TCP connect: is port 443 accepting connections?
  HTTP probe: is the service returning 200?
  BGP reachability: can we reach specific prefixes?

Tools:
  Smokeping: ICMP latency graphing; shows jitter and packet loss over time
  Blackbox Exporter (Prometheus): probes HTTP, HTTPS, TCP, ICMP, DNS
  Catchpoint, Thousand Eyes: commercial synthetic monitoring

Passive monitoring (analyze real traffic):
  NetFlow / sFlow / IPFIX: flow records from routers/switches
    Who talks to whom, how much, which protocol/port
    Top talkers, top applications, bandwidth planning
  
  NetFlow export (Cisco):
    ip flow-export destination 10.0.0.200 9996
    ip flow-export version 9
    interface GigabitEthernet0/0
     ip flow ingress
     ip flow egress

  sFlow (vendor-neutral):
    Samples 1:N packets; lower overhead than NetFlow
    sflowtool, ntopng, Elasticsearch + Logstash parse sFlow

  Collectors: Elastic + Logstash, ntopng, ElastiFlow, Akvorado, Grafana + network-plugin

RIPE Atlas / CAIDA:
  Global measurement platforms
  Distributed probes run ping, traceroute, DNS from volunteers
  Useful for: validating IPv6 reachability, BGP change impact, geographic latency
```

---

## Unified Observability Stack Example

```
Data collection:
  gNMI streaming → Telegraf → InfluxDB (modern devices)
  SNMP polling → Prometheus SNMP Exporter → Prometheus (legacy devices)
  Syslog → rsyslog → Loki
  NetFlow/sFlow → ntopng / ElastiFlow → Elasticsearch
  Synthetic probes → Blackbox Exporter → Prometheus

Storage:
  Metrics: Prometheus (short-term) + Thanos / InfluxDB (long-term)
  Logs: Loki or Elasticsearch
  Flows: Elasticsearch or ClickHouse

Visualization:
  Grafana: unified dashboard (connects to all data sources above)
  Dashboards: per-device, per-site, per-service, executive summary

Alerting:
  Prometheus Alertmanager → PagerDuty / Opsgenie (P1/P2)
  Grafana Alerting → Slack (P3/P4 informational)

CMDB:
  NetBox (source of truth: devices, IPs, VLANs, circuits, rack locations)
  NetBox → Ansible dynamic inventory
  NetBox → Grafana (device labels, site information)
```

---

## Tips

- Deploy gNMI telemetry for any device that supports it — ON_CHANGE subscription delivers BGP state changes in milliseconds vs SNMP's 5-minute poll cycle.
- Alert on absence of telemetry (`up == 0`) as well as metric thresholds — a device that stops sending data may be down, and you want to know that as fast as any other failure.
- Start with interface utilization, BGP state, CPU/memory, and device reachability — these cover 80% of production incidents with low implementation effort.
- NetBox (open-source DCIM/IPAM) as your source of truth — devices without proper documentation in a CMDB make automation impossible and troubleshooting a guessing game.
- Tune alert thresholds with historical data — setting CPU alert at 90% when "normal" is 70% generates useful alerts; setting it at 95% because the device hits 92% regularly creates alert fatigue.

---

## Summary

- Streaming telemetry (gNMI) replaces SNMP polling — device pushes data at sub-second intervals instead of being polled every 5 minutes.
- Prometheus/InfluxDB store time-series metrics; Grafana visualizes them; Alertmanager fires alerts — the standard open-source observability stack.
- gNMI subscription modes: SAMPLE (periodic), ON_CHANGE (event-driven), TARGET_DEFINED (device chooses) — use ON_CHANGE for state (BGP, interface status) and SAMPLE for counters.
- NetFlow / sFlow / IPFIX capture traffic flow data — who talks to whom, top applications, bandwidth usage — essential for capacity planning and security investigation.
- Effective alerts are actionable, urgent, and precise — alert fatigue from excessive false positives is as dangerous as having no alerts at all.
- A complete observability stack: gNMI/SNMP → time-series DB → Grafana dashboards + Alertmanager → PagerDuty/Slack — every production network needs this.
