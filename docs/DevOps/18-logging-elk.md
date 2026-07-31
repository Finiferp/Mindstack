---
title: "Centralized Logging with ELK/EFK"
sidebar_label: "Logging (ELK Stack)"
sidebar_position: 18
---

# Centralized Logging with ELK/EFK

The ELK Stack (Elasticsearch, Logstash, Kibana) — or EFK with Fluentd/Fluent Bit instead of Logstash — centralizes logs from every service into one searchable system.

**Docs:** [elastic.co/guide](https://www.elastic.co/guide/index.html)

---

## Why Centralized Logging

```
Without it: SSH into each server, grep through log files individually
  Doesn't scale past a handful of servers
  Impossible during an incident spanning multiple services
  No correlation between logs from different services for one request

With centralized logging:
  Search across ALL services/instances from one place
  Correlate a single request across microservices (via trace/request ID)
  Retention and archival policies applied consistently
  Alerting based on log patterns (not just metrics)
```

---

## The Stack Components

```
Elasticsearch: distributed search and analytics engine — stores and indexes logs
Logstash:       data processing pipeline — parses, transforms, enriches logs
Kibana:          visualization and search UI on top of Elasticsearch
Beats:            lightweight shippers (Filebeat, Metricbeat, etc.) — send data to
                  Logstash or directly to Elasticsearch

Fluentd/Fluent Bit: alternative to Logstash — lighter weight, very popular in
                     Kubernetes environments (EFK = Elasticsearch + Fluentd + Kibana)

  Application logs
       │
       ▼
  Filebeat / Fluent Bit (lightweight agent on each host/pod)
       │
       ▼
  Logstash / Fluentd (optional — parsing, filtering, enrichment)
       │
       ▼
  Elasticsearch (storage + indexing)
       │
       ▼
  Kibana (search + dashboards)
```

---

## Filebeat — Shipping Logs

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/myapp/*.log
    fields:
      service: myapp
      environment: production
    fields_under_root: true
    multiline:                          # combine stack traces into one event
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after

  - type: container                     # Docker/Kubernetes container logs
    paths:
      - '/var/lib/docker/containers/*/*.log'

output.logstash:
  hosts: ["logstash:5044"]

# Or send directly to Elasticsearch (skip Logstash for simpler setups)
# output.elasticsearch:
#   hosts: ["elasticsearch:9200"]
#   index: "myapp-logs-%{+yyyy.MM.dd}"
```

```bash
docker run -d --name filebeat \
    -v $(pwd)/filebeat.yml:/usr/share/filebeat/filebeat.yml \
    -v /var/log:/var/log:ro \
    docker.elastic.co/beats/filebeat:8.12.0
```

---

## Logstash — Parsing and Enrichment

```ruby
# logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse structured JSON logs
  json {
    source => "message"
  }

  # Parse unstructured logs with grok patterns
  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}"
    }
  }

  # Parse timestamp
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  # Enrich with GeoIP data
  geoip {
    source => "client_ip"
  }

  # Drop noisy health-check logs
  if [url] == "/health" {
    drop { }
  }

  # Add/remove fields
  mutate {
    remove_field => ["agent", "ecs"]
    add_field => { "environment" => "production" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "myapp-logs-%{+YYYY.MM.dd}"
  }
}
```

```
Common grok patterns:
  %{IP:client_ip}
  %{WORD:http_method}
  %{URIPATHPARAM:request}
  %{NUMBER:status}
  %{NUMBER:bytes}
  %{TIMESTAMP_ISO8601:timestamp}
  %{LOGLEVEL:level}
  %{GREEDYDATA:message}

Test patterns at: Kibana → Dev Tools → Grok Debugger
```

---

## Structured Logging — Log in JSON from the Start

```python
# The single biggest improvement to logging: emit JSON, not free text
import logging
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "myapp",
            "message": record.getMessage(),
            "logger": record.name,
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

logger = logging.getLogger("myapp")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

logger.info("User logged in", extra={"request_id": "abc-123", "user_id": 42})
```

```json
// Output — directly parseable, no grok patterns needed
{"timestamp": "2024-01-15T10:30:00Z", "level": "INFO", "service": "myapp",
 "message": "User logged in", "request_id": "abc-123", "user_id": 42}
```

```
Why structured (JSON) logging beats free-text logging:
  No fragile grok/regex parsing needed downstream
  Every field is instantly filterable/aggregatable in Kibana
  Consistent schema across all services makes cross-service correlation trivial
  Machine-readable from the moment it's written

Standard fields every log line should have:
  timestamp, level, service, message, environment
  request_id / trace_id (for correlating logs across microservices)
```

---

## Kibana — Search and Dashboards

```
Discover tab:
  Free-text and field-based search across all indexed logs
  KQL (Kibana Query Language): level:ERROR and service:myapp
  Lucene syntax also supported: level:ERROR AND service:"myapp"

Common searches:
  level:ERROR                              all error logs
  service:api AND status_code>=500          server errors from the API service
  request_id:"abc-123"                      trace one specific request across services
  message:*timeout*                         free-text search

Visualizations:
  Line/bar charts of log volume over time, broken down by service/level
  Pie charts of error types
  Data tables of top error messages

Dashboards:
  Combine multiple visualizations into one view
  Filter by time range, service, environment via dashboard-level controls

Index Lifecycle Management (ILM):
  Hot: recent, frequently searched, fast storage
  Warm: older, less frequently searched, cheaper storage
  Cold/Frozen: rarely accessed, cheapest storage
  Delete: after retention period expires (compliance/cost driven)
```

---

## EFK on Kubernetes (Fluent Bit)

```yaml
# Fluent Bit DaemonSet — one instance per node, tails container logs
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels: {app: fluent-bit}
  template:
    metadata: {labels: {app: fluent-bit}}
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath: {path: /var/log}
        - name: config
          configMap: {name: fluent-bit-config}
```

```ini
# fluent-bit.conf (as a ConfigMap)
[INPUT]
    Name             tail
    Path             /var/log/containers/*.log
    Parser           docker
    Tag              kube.*

[FILTER]
    Name             kubernetes
    Match            kube.*
    Merge_Log        On
    Keep_Log         Off

[OUTPUT]
    Name             es
    Match            *
    Host             elasticsearch
    Port             9200
    Logstash_Format  On
    Logstash_Prefix  k8s-logs
```

```
Why Fluent Bit over Logstash in Kubernetes:
  Much lighter (C, not JVM) — appropriate for a DaemonSet running on every node
  Kubernetes metadata filter automatically enriches logs with pod name,
  namespace, labels — no extra config needed for basic Kubernetes context
```

---

## Alternatives Worth Knowing

```
Loki (Grafana's log aggregation system):
  Indexes only METADATA (labels), not full log content — much cheaper to run
  Pairs naturally with Grafana and Prometheus (same label philosophy as PromQL)
  Query language: LogQL, similar syntax to PromQL
  Good default choice for teams already using Prometheus + Grafana

Datadog / Splunk / New Relic (commercial SaaS):
  Fully managed — no infrastructure to run
  Significant cost at scale but far less operational overhead
  Often chosen when the team doesn't want to operate Elasticsearch themselves

CloudWatch Logs (AWS-native):
  Simple, integrated with all AWS services automatically
  Less powerful querying than Elasticsearch/Kibana, but zero setup
  Good default within AWS if you don't need advanced log analytics
```

---

## How Elasticsearch Actually Indexes and Searches Logs

```
Understanding WHY Elasticsearch can search millions of log lines in
milliseconds explains its behavior, its resource appetite, and most
of its common operational problems:

1. INVERTED INDEX — the core data structure
   A traditional database finds "logs containing 'timeout'" by
   scanning rows. Elasticsearch instead builds, AT INDEX TIME, a
   reverse mapping: for every unique WORD/TOKEN, a list of every
   document (log line) containing it.
     "timeout" → [doc_42, doc_891, doc_1053, ...]
   Searching for "timeout" then means looking up ONE key in this
   index — O(1)-ish, not scanning every document. This is the SAME
   fundamental idea as a book's index at the back, applied to every
   word in every log line.

2. ANALYSIS (tokenization) — what happens to text BEFORE indexing
   A log line like "Connection timeout after 30s" gets broken into
   tokens: ["connection", "timeout", "after", "30s"] (lowercased,
   split on whitespace/punctuation by default) — THIS is why searches
   are typically case-insensitive and match individual words, not
   exact substrings, unless you specifically configure a `keyword`
   field (indexed as one exact, unanalyzed string) instead of `text`
   (analyzed/tokenized) — a source of much confusion when a field
   that looks identical in Kibana behaves differently in aggregations
   vs full-text search, because it's mapped as one type or the other.

3. SHARDS — how Elasticsearch scales beyond one machine
   Each index is split into multiple SHARDS (independent Lucene
   indices under the hood), distributed across the cluster's nodes.
   A search query is broadcast to EVERY shard of the target index(es)
   in parallel, and results are merged — this is how Elasticsearch
   searches TERABYTES of logs quickly: the work is genuinely
   parallelized across many machines, each searching only its own
   (much smaller) slice of the data.
   Each shard is also REPLICATED (by default) to another node, for
   both redundancy AND read-throughput (replica shards can also
   serve search queries).

4. WHY DAILY INDICES (myapp-logs-2024.01.15) ARE THE STANDARD PATTERN
   Instead of one giant ever-growing index, logs are typically indexed
   into a NEW index per day (or per some other rotation period). This
   makes retention trivial (just delete old daily indices — far
   cheaper than deleting individual documents from a huge index) and
   is exactly what Index Lifecycle Management (ILM) automates: moving
   indices through hot → warm → cold → delete tiers as they age.
```

---

## Troubleshooting Guide

```
"Logs aren't showing up in Kibana at all"
  Check the shipping agent's OWN logs first (Filebeat/Fluent Bit),
  not Kibana — a shipping failure never reaches Elasticsearch in the
  first place, so Kibana has nothing to be wrong about
  Check Kibana's configured INDEX PATTERN actually matches the real
  index name being written to (a common typo/mismatch, especially
  after changing an index naming pattern in Logstash/Fluent Bit config)

"Search for an exact phrase doesn't match, even though I can see it
 in a log line"
  Almost always a `text` vs `keyword` field mapping issue (see the
  Analysis explanation above) — a `text` field is tokenized, so
  searching for the exact multi-word phrase may not behave as a
  literal substring match unless you use a phrase query (quoted in
  KQL/Lucene syntax) or the field is actually mapped as `keyword`

"Cluster status is YELLOW"
  Not necessarily an emergency — YELLOW means all PRIMARY shards are
  healthy but some REPLICA shards aren't allocated (common on a
  single-node dev cluster, where there's nowhere to put a replica)
  GET _cluster/health                — check via the API for specifics

"Cluster status is RED"
  This IS an emergency — some PRIMARY shard is unavailable, meaning
  actual data loss risk or current unavailability for that index
  GET _cluster/allocation/explain    — Elasticsearch's own diagnostic
  for WHY a shard won't allocate (disk watermark exceeded is a very
  common cause — Elasticsearch stops allocating new shards to a node
  once its disk usage crosses a configured threshold, to avoid
  actually filling the disk)

"Elasticsearch using huge amounts of memory / getting OOM killed"
  Check JVM heap size configuration — Elasticsearch runs on the JVM
  and has its own heap separate from the container's overall memory
  limit; heap set too close to (or exceeding) the container's memory
  limit is a classic misconfiguration leading to OOM kills
  General guidance: heap should be roughly half of available memory,
  and never exceed ~32GB regardless of how much RAM is available
  (a JVM-specific pointer-compression optimization that stops working
  past that threshold)
```

---

## Tips

- Log in structured JSON from day one — retrofitting grok patterns onto free-text logs later is significantly more work than starting correctly.
- Always include a `request_id`/`trace_id` field and propagate it across service boundaries — this is what makes distributed debugging tractable.
- Set up Index Lifecycle Management (ILM) policies early — unmanaged Elasticsearch indices grow indefinitely and become both slow and expensive.
- Consider Loki instead of the full ELK stack if you're already using Grafana + Prometheus — the operational overhead is dramatically lower.
- Drop noisy, low-value logs (health checks, readiness probes) at the shipping/parsing stage — they add cost and noise without adding debugging value.

---

## Summary

- ELK: Elasticsearch (storage/search) + Logstash (processing) + Kibana (visualization); EFK swaps in Fluentd/Fluent Bit for lighter-weight log shipping.
- Beats/Filebeat/Fluent Bit run on hosts/pods to ship logs to the pipeline.
- Structured (JSON) logging eliminates fragile grok parsing and makes every field instantly searchable/filterable.
- Kibana's Discover tab + KQL for ad-hoc search; dashboards for recurring views; ILM for cost-effective retention.
- Fluent Bit DaemonSet is the standard pattern for Kubernetes log collection — lightweight and auto-enriches with pod metadata.
- Loki is a lighter-weight alternative worth considering if already using Grafana + Prometheus.
