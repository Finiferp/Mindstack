---
title: "DevOps Culture and Metrics"
sidebar_label: "DevOps Culture"
sidebar_position: 1
---

# DevOps Culture and Metrics

Before the tools, the ideas. This page covers the frameworks that explain *why* DevOps practices exist and how to measure whether they're working.

---

## CALMS Framework

The five pillars of DevOps culture (coined by Damon Edwards and John Willis):

```
C — Culture
  Shared ownership between Dev and Ops
  Blameless postmortems (focus on systems, not individuals)
  Psychological safety to report failures early

A — Automation
  Automate the repeatable: builds, tests, deployments, infrastructure
  Manual steps are a source of human error and a bottleneck

L — Lean
  Small batch sizes — ship small changes frequently, not big-bang releases
  Eliminate waste (waiting, handoffs, unnecessary process)

M — Measurement
  You can't improve what you don't measure
  Track deployment frequency, lead time, failure rate, recovery time (see DORA below)

S — Sharing
  Knowledge sharing across teams — no silos
  Shared tools, shared dashboards, shared on-call responsibilities
```

---

## The DevOps Lifecycle (Infinite Loop)

```
        ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
        │  PLAN   │────▶│  CODE   │────▶│  BUILD  │────▶│  TEST   │
        └─────────┘     └─────────┘     └─────────┘     └─────────┘
             ▲                                                │
             │                                                ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
        │ MONITOR │◀────│ OPERATE │◀────│ DEPLOY  │◀────│ RELEASE │
        └─────────┘     └─────────┘     └─────────┘     └─────────┘

Each stage has a "class" of tools (see the toolchain map in the overview page).
The loop never truly ends — monitoring feeds back into planning the next change.
```

---

## DORA Metrics — Measuring DevOps Performance

DORA (DevOps Research and Assessment, now part of Google Cloud) identified four key metrics that correlate with high-performing engineering teams.

```
1. Deployment Frequency
   How often do you deploy to production?
   Elite:  multiple times per day
   High:   once per day to once per week
   Medium: once per week to once per month
   Low:    less than once per month

2. Lead Time for Changes
   How long from code committed to code running in production?
   Elite:  less than one hour
   High:   one day to one week
   Medium: one week to one month
   Low:    more than one month

3. Change Failure Rate
   What percentage of deployments cause a failure in production?
   Elite:  0-15%
   High:   16-30%
   Medium/Low: higher

4. Time to Restore Service (MTTR)
   How long does it take to recover from a failure in production?
   Elite:  less than one hour
   High:   less than one day
   Medium: less than one week
   Low:    more than one week
```

```
Why these four:
  They balance SPEED (frequency, lead time) against STABILITY (failure rate, MTTR)
  High performers are fast AND stable — it's not a tradeoff, contrary to intuition
  Elite performers deploy more often AND have fewer failures than low performers

Tools to measure DORA metrics:
  GitHub: built-in insights + third-party (LinearB, Sleuth, Haystack)
  GitLab: built-in DevOps Score / Value Stream Analytics
  Custom: combine CI/CD data + incident tracking (PagerDuty, Opsgenie)
```

---

## DevOps vs SRE vs Platform Engineering

```
DevOps:
  A culture/philosophy — "Dev and Ops share responsibility"
  Not a specific job (though the title is common in practice)
  Focuses on: breaking down silos, automating the pipeline

SRE (Site Reliability Engineering):
  Google's specific implementation of DevOps principles
  Treats operations as a software engineering problem
  Introduces: SLIs/SLOs/SLAs, error budgets, blameless postmortems
  "Class of problems that DevOps describes, SRE solves with software engineering"

Platform Engineering:
  Building internal developer platforms (IDPs) — self-service infrastructure
  Goal: developers deploy without needing to know Kubernetes/Terraform details
  Tools: Backstage (Spotify), Crossplane, internal CLI tools
  Emerged because "everyone learns Kubernetes" doesn't scale organizationally

Relationship:
  DevOps = the philosophy
  SRE = one rigorous implementation (heavy on metrics and error budgets)
  Platform Engineering = productising DevOps/SRE practices as an internal product
```

---

## The Three Ways (from "The Phoenix Project")

```
First Way — Flow:
  Work flows left to right (Dev → Ops → Customer) as fast as possible
  Practices: CI/CD, small batch sizes, eliminate handoff delays,
             limit work in progress (WIP)

Second Way — Feedback:
  Fast feedback flows right to left (Ops → Dev)
  Practices: automated testing, monitoring/alerting, shift-left security,
             production telemetry visible to developers

Third Way — Continual Learning and Experimentation:
  A culture of experimentation, risk-taking, and learning from failure
  Practices: blameless postmortems, dedicated time for improvement,
             game days / chaos engineering
```

---

## Blameless Postmortems

```
When an incident happens, the goal is to understand WHAT happened
and WHY the system allowed it — never WHO caused it.

Postmortem document structure:
  1. Summary — what happened, in one paragraph
  2. Impact — who/what was affected, for how long
  3. Timeline — detailed sequence of events (detection, response, resolution)
  4. Root cause — the underlying systemic cause (5 Whys technique)
  5. Action items — specific, assigned, time-bound follow-ups
  6. Lessons learned — what worked, what didn't

5 Whys example:
  Problem: Production database ran out of disk space
  Why? Log files filled the disk
  Why? Log rotation wasn't configured
  Why? The deployment script for this service predates the log rotation standard
  Why? No process exists to audit old services against new standards
  Why? No automated compliance checking in the platform
  → Root cause: missing automated infrastructure compliance checking
  → Action item: add disk-usage alerting + audit all services for log rotation config

Why blameless matters:
  If people fear blame, they hide information → slower incident response
  If people are safe to be honest, you get the FULL story → real root cause found
  "Human error" is rarely the root cause — it's usually a symptom of a system
  that made the error easy to make
```

---

## Error Budgets (SRE Concept)

```
An error budget is the acceptable amount of unreliability, derived from your SLO.

Example:
  SLO: 99.9% uptime per month (this is your target)
  Error budget: 0.1% = ~43 minutes of downtime allowed per month

How it's used:
  Budget remaining → ship features fast, take more risks
  Budget exhausted → freeze feature releases, focus entirely on reliability

This turns reliability into a SHARED, QUANTIFIED goal between Dev and Ops:
  Dev wants to ship features (uses budget)
  Ops wants stability (protects budget)
  The error budget makes this a data-driven negotiation, not a political one
```

---

## Shift-Left

```
"Shifting left" means moving a practice EARLIER in the development lifecycle
(further left on the Plan→Code→Build→Test→Release→Deploy→Operate→Monitor timeline)

Shift-left testing:
  Old: QA tests after development is "done"
  New: automated tests run on every commit; developers write tests as they code

Shift-left security ("DevSecOps"):
  Old: security review happens right before release (or after an incident)
  New: static analysis (SAST), dependency scanning, and secret scanning run
        in CI on every pull request

Shift-left cost/FinOps:
  Old: finance discovers cloud costs at the end of the month
  New: cost estimates shown in pull requests before infrastructure is deployed
        (e.g. Infracost for Terraform)

Why it matters:
  A bug caught in code review costs minutes to fix
  The same bug caught in production costs hours (incident response) + reputation
  Shifting left doesn't eliminate problems — it catches them cheaper and earlier
```

---

## Tips

- DORA metrics are the industry-standard way to talk about DevOps maturity in interviews and performance reviews — know all four cold.
- Blameless postmortems only work if leadership genuinely doesn't punish people for honest incident reports — this has to be a real cultural commitment, not just a document template.
- "You build it, you run it" (Amazon's phrase) is the practical embodiment of DevOps culture — the team that writes the code also carries the pager for it.
- Error budgets resolve the eternal Dev-vs-Ops tension about "ship fast" vs "stay stable" by making it a shared, numeric, negotiated target.

---

## Summary

- CALMS: Culture, Automation, Lean, Measurement, Sharing — the five pillars of DevOps.
- DORA metrics: deployment frequency, lead time for changes, change failure rate, time to restore service.
- DevOps is a philosophy; SRE is Google's software-engineering implementation of it; Platform Engineering productises it internally.
- The Three Ways: Flow (fast left-to-right), Feedback (fast right-to-left), Continual Learning.
- Blameless postmortems focus on systemic root causes, not individual blame — use the 5 Whys technique.
- Error budgets quantify acceptable unreliability, turning "ship fast vs stay stable" into a data-driven tradeoff.
- Shift-left: move testing, security, and cost analysis earlier in the pipeline — cheaper to fix problems early.
