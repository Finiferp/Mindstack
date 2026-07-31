---
title: "Observability and SRE Practices"
sidebar_label: "Observability & SRE"
sidebar_position: 22
---

# Observability and SRE Practices

Ties together metrics, logs, and traces into a coherent observability strategy, plus the SRE practices (SLIs/SLOs, incident response, distributed tracing) that turn monitoring data into reliability.

**Docs:** [sre.google/books](https://sre.google/books/) — the free SRE books from Google

---

## The Three Pillars of Observability

```
Metrics:  numeric measurements over time (see Prometheus/Grafana page)
          Good for: trends, alerting thresholds, aggregated system health
          Weak for: understanding WHY a specific request failed

Logs:      discrete, timestamped events (see ELK/Logging page)
           Good for: detailed context about a specific event
           Weak for: seeing trends/patterns across thousands of events without aggregation

Traces:     the path of a single request across multiple services
            Good for: understanding latency and failures in distributed systems
            Weak for: aggregate system health (that's what metrics are for)

Observability = having enough of all three, correlated together
(usually via a shared request_id/trace_id), to answer questions you
didn't know you'd need to ask when you set up the monitoring.

Monitoring (asking questions you anticipated) vs Observability
(being able to answer questions you didn't anticipate) — the distinction
matters for how much context/cardinality you build into your telemetry.
```

---

## Distributed Tracing

```
In a microservices architecture, one user request might touch:
  API Gateway → Auth Service → Order Service → Payment Service → Database

Without tracing: five separate sets of logs, no way to see the full picture
With tracing: one trace_id follows the request through all five services,
              visualized as a timeline (a "flame graph" / waterfall view)

  Request ─┬─ API Gateway (2ms)
           ├─ Auth Service (15ms)
           ├─ Order Service (45ms)
           │  └─ Database query (30ms)   ← this is where the time went
           └─ Payment Service (120ms)
              └─ External payment API call (110ms)  ← and here

Total request time: 182ms — tracing shows EXACTLY where it was spent
```

```
Standard: OpenTelemetry (OTel) — vendor-neutral instrumentation standard
  Replaces older vendor-specific SDKs (Jaeger client, Zipkin client, etc.)
  Auto-instrumentation available for most popular frameworks
  Exports to: Jaeger, Zipkin, Tempo, Datadog, New Relic, etc.

Key concepts:
  Trace:  the full journey of one request across all services
  Span:    one unit of work within a trace (e.g. one service call, one DB query)
  Context propagation: passing the trace_id via headers between services
                       (e.g. the 'traceparent' HTTP header, W3C standard)
```

```python
# OpenTelemetry Python example
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order"):
    with tracer.start_as_current_span("charge_payment"):
        charge_customer(order)
    with tracer.start_as_current_span("update_inventory"):
        update_stock(order)
```

```
Backends for storing/viewing traces:
  Jaeger:   popular open-source, CNCF project
  Tempo:     Grafana's tracing backend, integrates naturally with Grafana/Loki/Prometheus
  Zipkin:     older, still used, similar concept to Jaeger
  Cloud-native: AWS X-Ray, GCP Cloud Trace, Azure Application Insights
```

---

## SLI, SLO, SLA

```
SLI (Service Level Indicator):
  A specific, quantifiable measurement of some aspect of your service
  Example: "the proportion of successful HTTP requests"
  Example: "the 95th percentile request latency"

SLO (Service Level Objective):
  A target value/range for an SLI over a period of time
  Example: "99.9% of requests succeed, measured over a rolling 30 days"
  This is your INTERNAL target — what you're actually aiming for

SLA (Service Level Agreement):
  A CONTRACT with consequences (often financial) if the SLO isn't met
  Example: "99.9% uptime, or customer receives a service credit"
  SLAs are typically set LOOSER than internal SLOs — you want margin
  before a missed internal target becomes a contractual/financial breach

Relationship: SLA ⊆ SLO ⊆ SLI
  SLA (loosest, contractual) uses an SLO (internal target) which is
  measured by an SLI (the actual metric)
```

```
Choosing good SLIs — the most common categories:

Availability:  proportion of successful requests
                (sum(rate(requests{status!~"5.."}[30d])) / sum(rate(requests[30d])))

Latency:        proportion of requests faster than a threshold
                (histogram_quantile(0.95, ...) < 200ms)

Throughput:      requests processed per second (less commonly an SLO target,
                 more often a capacity planning input)

Freshness:       for data pipelines — how current is the data
                 (e.g. "95% of events processed within 5 minutes of occurring")

Correctness:      proportion of requests returning correct data
                 (harder to measure automatically; often requires synthetic checks)
```

---

## Error Budgets in Practice

```
SLO: 99.9% success rate over 30 days
Error budget: 0.1% of requests can fail = the "budget" for unreliability

If you serve 10,000,000 requests/month:
  Error budget = 10,000 failed requests allowed per month

Tracking burn rate:
  If failures are happening at a rate that would exhaust the 30-day budget
  in less than a few hours, that's a FAST BURN — page immediately
  If failures are happening slowly, that might only need a ticket, not a page

Multi-window, multi-burn-rate alerting (Google's recommended pattern):
  Alert if error rate over the last 1 hour would burn 2% of the 30-day
  budget AND error rate over the last 5 minutes confirms it's still happening
  (reduces false positives from brief blips while still catching real issues fast)
```

---

## Incident Response

```
Incident Severity Levels (typical scale):
  SEV1 (Critical): complete outage, revenue-impacting, all hands on deck
  SEV2 (High):      significant degradation, some users affected
  SEV3 (Medium):     minor issue, workaround available
  SEV4 (Low):         cosmetic/non-urgent, handled during business hours

Incident Commander (IC) role:
  NOT necessarily the person fixing the issue — coordinates the response
  Keeps a timeline, manages communication, makes call on escalation
  Frees up subject-matter experts to focus purely on resolving the issue

Standard incident flow:
  1. Detect       — alert fires (ideally before a customer reports it)
  2. Triage        — assess severity, assign an Incident Commander
  3. Mitigate       — stop the bleeding (rollback, failover, feature flag off)
                      NOT necessarily "fully fix" — mitigate first, root-cause later
  4. Resolve        — the actual underlying issue is fixed
  5. Postmortem      — blameless review (see the DevOps Culture page)

Communication during an incident:
  Status page updates for external users
  Internal incident channel (Slack/Teams) with regular timestamped updates
  A single source of truth to avoid duplicate/conflicting information
```

---

## Runbooks

```
A runbook is a documented, step-by-step procedure for handling a
specific, recurring operational scenario — written BEFORE the incident,
not improvised during it.

Good runbook structure:
  Title:        "High memory usage on payment-service"
  Trigger:       which alert fires that points here
  Impact:         what happens if this isn't addressed
  Diagnosis steps: specific commands/dashboards to check
  Mitigation steps: specific actions to take, in order
  Escalation:      who to page if the above doesn't resolve it

Link runbooks directly from alert definitions/annotations:
  annotations:
    runbook_url: "https://wiki.example.com/runbooks/high-memory-payment-service"

This turns a 2 AM page into "follow these steps" rather than
"figure this out from scratch while half asleep."
```

---

## Chaos Engineering

```
Deliberately inject failure into a system to verify it degrades gracefully
and recovers automatically — testing resilience BEFORE a real incident does.

Common experiments:
  Kill a random pod/instance — does the system self-heal? (Chaos Monkey)
  Inject network latency between services — does the timeout/retry logic work?
  Simulate an entire Availability Zone outage — does failover actually work?
  Exhaust a resource (CPU, memory, disk) — does the system degrade gracefully
  or fall over completely?

Tools:
  Chaos Monkey (Netflix, original) — randomly terminates instances
  Gremlin — commercial chaos engineering platform
  Litmus Chaos — Kubernetes-native, open source (CNCF)
  Chaos Mesh — another Kubernetes-native option

Principle: run experiments in a controlled way, with a clear hypothesis,
starting in staging before ever running in production, and always with
a way to immediately abort the experiment.
```

---

## On-Call Practices

```
Rotation:
  Typically weekly rotations across a team (avoid too-frequent handoffs
  which lose context, and too-long rotations which cause burnout)
  Primary + secondary on-call — secondary backs up if primary doesn't respond

Alert quality matters more than alert quantity:
  Every page should be actionable — if an alert fires and nobody needs to
  DO anything, it shouldn't have paged (downgrade to a ticket/log instead)
  Track "pages per week" per person — trending up is an early warning of
  either system instability or alert fatigue from noisy thresholds

Tools:
  PagerDuty, Opsgenie, VictorOps — alert routing, escalation policies,
  on-call schedules, integrate with Alertmanager/monitoring stack

Post-incident:
  Every SEV1/SEV2 gets a blameless postmortem (see DevOps Culture page)
  Action items tracked to completion, not just documented and forgotten
```

---

## Tips

- Instrument for traces from the start in any microservices architecture — retrofitting distributed tracing after the fact, once you actually need it during an incident, is much harder than the small upfront cost of adding it early.
- Pick 2-4 SLOs per service maximum, focused on what users actually experience (availability, latency) — a service with 20 SLOs has no real priorities.
- Every alert should link to a runbook — an alert without a documented response plan just creates panic at 2 AM instead of a clear action plan.
- Multi-window, multi-burn-rate alerting dramatically reduces both false positives and slow detection compared to a single static threshold — worth the extra initial setup complexity.
- Run your first chaos engineering experiment in staging with a clear hypothesis and an abort button — the goal is confidence, not chaos for its own sake.

---

## Summary

- Three pillars: metrics (trends/alerting), logs (event detail), traces (cross-service request flow) — correlated via a shared trace/request ID.
- OpenTelemetry is the vendor-neutral standard for instrumentation; export traces to Jaeger, Tempo, or a cloud-native backend.
- SLI (measurement) → SLO (internal target) → SLA (contractual commitment, usually looser than the SLO).
- Error budgets quantify acceptable unreliability and drive the "ship fast vs stay stable" tradeoff with data, not opinion.
- Incident response: detect → triage → mitigate → resolve → blameless postmortem; an Incident Commander coordinates, doesn't necessarily fix.
- Runbooks turn 2 AM improvisation into documented procedure; link them directly from alert definitions.
- Chaos engineering deliberately injects failure to verify resilience before a real incident tests it for you.
