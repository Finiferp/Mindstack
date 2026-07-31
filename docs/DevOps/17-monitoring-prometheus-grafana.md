---
title: "Monitoring with Prometheus and Grafana"
sidebar_label: "Prometheus & Grafana"
sidebar_position: 17
---

# Monitoring with Prometheus and Grafana

Prometheus collects and stores time-series metrics; Grafana visualizes them. Together they're the most widely used open-source monitoring stack in cloud-native environments.

**Docs:** [prometheus.io/docs](https://prometheus.io/docs) | [grafana.com/docs](https://grafana.com/docs/)

---

## How Prometheus Works

```
Prometheus PULLS metrics (scrapes) from targets at regular intervals —
this is the opposite of many older monitoring tools that PUSH metrics.

  ┌──────────────┐   scrape every 15s    ┌────────────┐
  │  Your App    │   <────────────────   | Prometheus |
  │  /metrics    │ ──────────────────>   │   Server   │
  └──────────────┘    metrics response   └────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   Grafana    │
                                        │  (dashboards)│
                                        └──────────────┘

Why pull-based:
  Easier to tell if a target is down (scrape fails = target down)
  No need for apps to know where to send metrics (centralized configuration)
  Built-in service discovery (Kubernetes, Consul, EC2, etc.)

Exception: short-lived jobs use the Pushgateway to push metrics
(since Prometheus can't scrape something that's already finished running)
```

---

## Exposing Metrics — /metrics Endpoint

```python
# Python example with prometheus_client
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Number of active connections')

def handle_request(method, endpoint):
    start = time.time()
    # ... handle the request ...
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=200).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

start_http_server(8000)   # exposes metrics at :8000/metrics
```

```
Metric types:
  Counter:    only increases (total requests, total errors) — use rate() to see per-second rate
  Gauge:      goes up and down (current memory usage, active connections, queue depth)
  Histogram:  samples observations into buckets (request duration, response size)
              — enables percentile calculations (p50, p95, p99)
  Summary:    similar to histogram but calculates quantiles client-side (less flexible for aggregation)

Most applications/frameworks have a Prometheus client library:
  Node.js: prom-client
  Java: micrometer (Spring Boot integrates automatically)
  Go: client_golang
  Python: prometheus_client
```

---

## prometheus.yml Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['app1:8000', 'app2:8000']

  - job_name: 'node-exporter'                # host-level metrics (CPU, disk, memory)
    static_configs:
      - targets: ['node1:9100', 'node2:9100']

  # Kubernetes service discovery — auto-discovers pods/services with annotations
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

```bash
# Run Prometheus (Docker)
docker run -d -p 9090:9090 \
    -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus

# Common exporters (translate third-party metrics into Prometheus format)
# node_exporter     — host/OS metrics (CPU, memory, disk, network)
# cadvisor            — container metrics
# postgres_exporter   — PostgreSQL metrics
# mysqld_exporter      — MySQL metrics
# blackbox_exporter    — probe endpoints (HTTP, TCP, ICMP) from outside
# kube-state-metrics    — Kubernetes object state (deployments, pods, etc.)
```

---

## PromQL — Query Language

```promql
# Instant vector — current value of a metric
http_requests_total

# Filter by label
http_requests_total{status="500"}
http_requests_total{method="GET", endpoint="/api/users"}
http_requests_total{status=~"5.."}          # regex match — all 5xx statuses

# Rate — per-second average rate of increase (essential for Counters)
rate(http_requests_total[5m])                # average rate over last 5 minutes
irate(http_requests_total[5m])                # instant rate (last two data points)

# Aggregation
sum(rate(http_requests_total[5m]))            # total requests/sec across all instances
sum by (endpoint) (rate(http_requests_total[5m]))   # broken down by endpoint
avg(node_memory_MemAvailable_bytes)
max(container_memory_usage_bytes) by (pod)
count(up == 1)                                 # number of healthy targets

# Percentiles from a Histogram
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
# 95th percentile request latency over the last 5 minutes

# Math and comparisons
http_requests_total{status="500"} / http_requests_total * 100   # error rate %
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1  # low memory alert condition

# Common built-in metrics
up                          # 1 if target is up, 0 if down (auto-generated for every target)
scrape_duration_seconds     # how long the scrape took

# Range vector — values over a time window (used as input to functions like rate())
http_requests_total[5m]

# Offset — compare to a point in the past
http_requests_total offset 1d      # value from 24 hours ago (week-over-week comparisons)

# predict_linear — forecast based on recent trend
predict_linear(node_filesystem_free_bytes[6h], 4 * 3600) < 0
# will disk fill up in the next 4 hours based on the last 6 hours of trend?
```

---

## Alerting Rules

```yaml
# alerts.yml
groups:
  - name: app-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m                              # must be true for 5 min before firing
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"
          description: "Error rate has exceeded 5% for 5 minutes"

      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.instance }} is down"

      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage above 90% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: |
          node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
          / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
```

---

## Alertmanager — Routing and Notifications

```yaml
# alertmanager.yml
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        api_url: 'https://hooks.slack.com/services/...'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-pagerduty-integration-key'

  - name: 'slack'
    slack_configs:
      - channel: '#warnings'

inhibit_rules:                              # suppress noisy alerts when a bigger one fires
  - source_match: {severity: 'critical'}
    target_match: {severity: 'warning'}
    equal: ['alertname', 'instance']
```

---

## Grafana — Dashboards

```bash
docker run -d -p 3000:3000 grafana/grafana
# Default login: admin/admin — visit http://localhost:3000
```

```
Setting up a dashboard:
  1. Add Prometheus as a data source (Configuration → Data Sources)
     URL: http://prometheus:9090
  2. Create a dashboard, add panels
  3. Each panel runs a PromQL query and renders it (graph, gauge, table, etc.)

Panel types:
  Time series      — the classic line graph over time
  Stat               — single big number (current value)
  Gauge               — speedometer-style visual
  Bar gauge            — horizontal/vertical bars
  Table                 — tabular data
  Heatmap                — good for histogram/latency distributions
  Logs                    — when using Loki as a data source

Variables — make dashboards reusable across environments/instances:
  $environment, $instance, $namespace as dropdown filters
  Query: label_values(up, instance)

Dashboard as Code (recommended for production):
  Export dashboard JSON, store in git
  Use Grafana provisioning (YAML) to auto-load dashboards on startup
  Or use Grafonnet/Jsonnet for programmatically generated dashboards

Popular pre-built dashboards (import by ID from grafana.com/grafana/dashboards):
  Node Exporter Full (ID 1860)     — host metrics
  Kubernetes cluster monitoring     — many community options
  PostgreSQL / MySQL dashboards
```

---

## The Four Golden Signals

The signals Google's SRE book recommends monitoring for any user-facing system:

```
Latency:      how long requests take (track separately for success vs failure —
              a fast error is not the same as a fast success)
Traffic:       how much demand the system is experiencing (requests/sec)
Errors:        rate of failed requests
Saturation:    how "full" the system is (CPU, memory, queue depth, connection pool)

A good dashboard for any service starts with these four — everything else
is supplementary detail once these are covered.
```

---

## USE and RED Methods

```
USE Method (for resources — CPU, memory, disk, network):
  Utilization — % time the resource is busy
  Saturation  — how much extra work is queued
  Errors       — count of error events

RED Method (for services/requests):
  Rate        — requests per second
  Errors       — failed requests per second
  Duration     — time each request takes

USE for infrastructure, RED for services — combine both for full coverage.
```

---

## How Prometheus Actually Stores and Queries Data

```
Every metric Prometheus scrapes is stored as a TIME SERIES — identified
by its metric name PLUS the complete set of its label key-value pairs.
Two metrics with the same name but different labels are ENTIRELY
different time series internally:

  http_requests_total{method="GET", status="200"}    ← one time series
  http_requests_total{method="POST", status="500"}    ← a completely different one

This is why label CARDINALITY matters so much operationally: if you
carelessly add a label with unbounded values (like a raw user_id or a
full request URL with query params), you create potentially MILLIONS
of distinct time series, which can overwhelm Prometheus's memory and
storage — this is the single most common Prometheus production
incident ("cardinality explosion"). Keep labels to bounded, low-cardinality
values (status codes, methods, service names — not user IDs, IPs, or
free-text).

Storage internals:
  Each scrape (every scrape_interval, e.g. 15s) appends one new sample
  per active time series
  Data is written to an in-memory block first, then periodically
  flushed to disk as immutable 2-hour blocks
  Old blocks are periodically compacted together (merged into larger
  blocks, reducing overhead) — this is why Prometheus's own storage
  directory structure shows multiple date-stamped block subdirectories

Why Prometheus is pull-based (scrapes), not push-based, and why this
matters for reliability: if your app crashes and stops responding to
scrapes, Prometheus KNOWS immediately (the `up` metric becomes 0) — with
a push-based system, a crashed app simply stops pushing, which looks
identical to "everything is fine, nothing changed" until you specifically
notice the absence. Pull-based monitoring makes "target is down" a
first-class, directly observable signal rather than an inference from silence.
```

### How rate() Actually Computes a Rate

```
rate(http_requests_total[5m]) doesn't just take (now - 5m ago) / 5m —
it does linear regression across ALL samples in that 5-minute window,
and CRUCIALLY, it automatically handles Counter RESETS (e.g. when your
app restarts and http_requests_total drops back to 0):

  Without reset-handling, a naive "last value minus first value" would
  show a NEGATIVE rate when a counter resets on restart — clearly wrong.
  rate() detects this drop and correctly treats it as "counter reset,
  don't count this transition as a decrease."

This is exactly why Counters should ALWAYS be wrapped in rate() (or
irate()/increase()) before being displayed or alerted on — the raw
Counter value by itself is nearly meaningless (it's just "total since
the process last started"), and manual math on it is error-prone
around restarts in a way rate() specifically solves for you.
```

---

## Troubleshooting Guide

```
"Metric shows up in /metrics but not in Prometheus queries"
  Check Prometheus's own Targets page (Status → Targets in the UI) —
  confirm the target shows "UP", not "DOWN"
  Common cause: scrape_configs targets list doesn't include this
  endpoint, or a firewall/network policy blocks Prometheus from
  reaching it (very common in Kubernetes — check NetworkPolicies)

"Query returns 'No data'"
  Metric name typo (case-sensitive) — check exact spelling in /metrics
  Label filter doesn't match anything — remove filters incrementally
  to find where the match breaks: start with just the metric name,
  add labels back one at a time
  Time range issue — the data may simply not exist yet for the
  selected time window (e.g. querying 7 days back but retention is 3 days)

"rate() query returns weird/spiky values"
  Range window too short relative to scrape_interval — rate() needs
  AT LEAST 2 data points in the window to compute anything meaningful;
  if scrape_interval=60s, a rate(...[30s]) query can never have 2 points
  Rule of thumb: range window should be at least 4x your scrape_interval

"Prometheus using huge amounts of memory / disk"
  Almost always a cardinality problem (see storage internals above)
  topk(10, count by (__name__)(({__name__=~".+"})))   — find which
  metric names have the most distinct label combinations
  Fix: remove high-cardinality labels at the source (don't emit them),
  or use metric_relabel_configs to drop them before storage

"Alert fires but Alertmanager never sends a notification"
  Check Alertmanager's own UI (usually :9093) for the alert's actual
  routing decision — a common cause is an inhibition rule or a
  route match that silently sends it somewhere unexpected
  Check `for:` duration — the alert must be CONTINUOUSLY true for
  that full duration before it fires at all (a query that's
  intermittently true won't trigger until it's sustained)
```

---

## Tips

- Use `rate()` on Counters before doing anything else with them — a raw Counter value is meaningless on its own (it only ever goes up); the rate of change is what matters.
- Set `for:` durations on alerts to avoid flapping — a metric crossing a threshold for 10 seconds shouldn't page anyone; require it to persist.
- Store dashboards as JSON in git (Dashboard as Code) — manually-edited dashboards drift and get lost; version-controlled ones are reviewable and reproducible.
- Start with the Four Golden Signals for any new service dashboard — resist the urge to add dozens of panels before the basics are solid.
- `histogram_quantile()` requires a Histogram metric type (not Summary) if you want to aggregate percentiles across multiple instances — plan your metric types accordingly from the start.

---

## Summary

- Prometheus pulls (scrapes) metrics from `/metrics` endpoints on a schedule; stores them as time series.
- Metric types: Counter (only up, use `rate()`), Gauge (up/down), Histogram (buckets, enables percentiles).
- PromQL: `rate()`, `sum by ()`, `histogram_quantile()` are the queries you'll write constantly.
- Alerting rules define conditions; Alertmanager routes and dedupes alerts to Slack/PagerDuty/etc.
- Grafana visualizes Prometheus (and other) data sources as dashboards — store dashboard JSON in git.
- The Four Golden Signals (latency, traffic, errors, saturation) are the starting point for any service dashboard.
