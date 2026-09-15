---
title: "Case Studies"
sidebar_label: "Case Studies"
sidebar_position: 25
---

# Case Studies

Worked examples applying the decision framework (file 23) and the concepts from across this course to realistic scenarios. Each one shows the reasoning process, not just the conclusion — the goal is to make the THINKING transferable to your own situations.

---

## Case Study 1 — "Should This Be a Microservice?"

**Scenario:** A team of 6 engineers runs an e-commerce monolith. Product wants to add a recommendation engine ("customers who bought this also bought..."). An engineer proposes building it as a separate microservice from day one.

```
Step 1 — Define the actual problem:
  Need: show relevant product recommendations on product pages.
  Real constraints: team of 6, recommendation logic will likely use
  a different tech stack (some ML/data processing), existing
  monolith is otherwise healthy and well-organized (a modular
  monolith, file 11 — not a Big Ball of Mud, file 24).

Step 2 — Genuinely viable options:
  A. New module WITHIN the existing modular monolith
  B. A separate microservice from day one

Step 3 — Evaluate against criteria:
  A (module in monolith):
    Complexity: low — reuses existing deployment pipeline, existing
    monitoring, existing patterns the team already knows
    Team familiarity: high — same stack as everything else
    Tech fit: recommendation logic MIGHT benefit from Python's ML
    ecosystem, which the existing stack (say, this is a Go monolith
    per the Go course) doesn't naturally offer — a genuine partial
    mismatch
    Operational cost: none — no new service to deploy/monitor

  B (separate microservice):
    Complexity: higher — new deployment pipeline, new service to
    monitor (see the DevOps course for what this actually requires)
    Team familiarity: lower — new operational surface for a 6-person
    team already running one production system
    Tech fit: better — could use Python specifically for this piece
    Operational cost: real, ongoing — this is a permanent new piece
    of infrastructure to maintain

Step 4 — Reversibility:
  This is mostly a TWO-WAY DOOR: recommendation logic is naturally
  self-contained (it takes a product ID, returns related product
  IDs) — a clean internal module today extracts cleanly into a
  service LATER if it ever needs to (same reasoning as file 11's
  "modules that extract cleanly" argument), informed by real
  operational experience instead of a guess made now.

Decision: build it as a module within the existing monolith first
(Option A). The tech-stack mismatch is real but not severe enough
to justify the operational cost for a 6-person team, especially
given this is a two-way door — extract it into its own service
later if it genuinely needs independent scaling or a different tech
stack, once real usage data justifies that cost (file 9's decision
framework, applied here).

This directly illustrates file 9's central guidance: default to a
monolith unless there's a concrete, current reason to split — "we
might want Python someday" is not yet a concrete reason for a
6-person team.
```

---

## Case Study 2 — "Should We Use This Design Pattern?"

**Scenario:** An engineer is building a notification system (email, SMS, push notifications) and proposes a full Strategy + Factory + Observer pattern combination, citing "flexibility for future notification types."

```
Step 1 — Define the actual problem:
  Need: send a notification to a user via email, SMS, or push,
  triggered by various events (order placed, password reset, etc.).
  Real constraint: currently exactly 3 notification types exist,
  and there's no concrete plan for a 4th.

Step 2 — Genuinely viable options:
  A. Simple approach: one function per notification type, called
  directly where needed
  B. Full pattern combination: Strategy for notification channels +
  Factory for creating the right strategy + Observer for triggering
  from events

Step 3 — Evaluate:
  A: simple, easy to read, easy to trace ("this event calls this
  specific function") — but if a 4th channel is added, requires
  finding and updating every call site
  B: more upfront structure, genuinely easier to add a 4th channel
  LATER — but three extra layers of indirection for a problem that,
  right now, only has 3 known variants and no evidence of more
  coming soon

Applying file 4 (YAGNI) and file 6 (Design Patterns) directly: the
Strategy pattern's actual justification (file 6) is having several
INTERCHANGEABLE ways to do something and needing to swap between
them — that part fits (email/SMS/push ARE interchangeable
notification strategies). But Factory and Observer, layered on top,
are solving problems ("flexible creation," "decoupled event
triggering") that don't have a CURRENT, concrete need behind them yet.

Step 4 — Reversibility: this is a two-way door — even the "simple"
Option A can be refactored into Option B later, informed by an
ACTUAL third or fourth notification type appearing (the Rule of
Three from file 4), rather than guessed in advance.

Decision: use Strategy alone (interchangeable notification channels,
a genuine current need with exactly 3 concrete implementations) —
skip Factory and Observer until a concrete need for dynamic
creation or event-driven decoupling actually appears. This is file
6's core guidance in action: "reach for a pattern when you recognize
its problem shape already appearing — not preemptively."
```

---

## Case Study 3 — "Our Checkout Is Slow — What Do We Fix?"

**Scenario:** Checkout page load time has grown from 200ms to 1.8 seconds over six months as the product catalog and order volume have grown. An engineer immediately proposes migrating to a sharded NoSQL database (file 14, file 16).

```
Step 1 — Define the actual problem:
  Symptom: checkout is slow. NOT yet established: WHY it's slow.

This case study exists specifically to illustrate file 24's
Premature Optimization anti-pattern — jumping to a significant
architectural change (sharding, a new database technology) BEFORE
identifying the actual bottleneck.

Correct first step (not in the original framework's numbered steps,
but a prerequisite to Step 1 being answerable at all): PROFILE.
Use real production metrics (see the DevOps course's Prometheus/
Grafana page) to find out where the 1.8 seconds actually goes.

Suppose profiling reveals: 1.6 of the 1.8 seconds is one specific,
unindexed database query joining orders and products on every
checkout page load (file 14's indexing guidance directly applicable) —
NOT a fundamental database technology or sharding problem at all.

Step 1 (now properly informed) — Define the actual problem:
  Need: a specific, identified query needs to be faster.
  Real constraint: this is a single missing index, not a
  fundamental architecture problem.

Step 2 — Genuinely viable options:
  A. Add the missing index (file 14)
  B. Add caching for this specific query's common results (file 15)
  C. Migrate to a sharded NoSQL database (the original proposal)

Step 3 — Evaluate:
  A: minutes of work, addresses the ROOT cause directly, no new
  infrastructure
  B: reasonable complementary step, but treats a symptom rather than
  the root cause if the underlying query is still fundamentally slow
  C: weeks of migration work, new infrastructure and operational
  complexity (file 16, file 24), and doesn't even address the ACTUAL
  problem (a missing index would still be "missing" in a new
  database technology too)

Decision: add the index (Option A), measure the impact, add caching
only if profiling STILL shows this as a bottleneck afterward. Option
C is rejected — not because sharding is never appropriate, but
because it was proposed without evidence it addresses the actual,
measured problem, which is exactly file 24's Premature Optimization
and file 16's "identify the actual bottleneck before scaling
anything" guidance in action.

This case study is deliberately about the PROCESS as much as the
outcome: the instinct to reach for a large architectural change
before measuring is common and understandable, but the discipline of
profiling first — established in file 16 and file 24 — would have
saved weeks of unnecessary migration work here.
```

---

## Case Study 4 — "Handling a Multi-Step Order Process Across Services"

**Scenario:** A system already using microservices (Order, Payment, Inventory — each with its own database, per file 10's data ownership guidance) needs to handle order placement, which involves all three. A junior engineer proposes a single database transaction spanning all three services' databases.

```
This case study is more direct — it's less about weighing options
and more about recognizing a fundamental constraint from file 10 and
file 17: there is no such thing as a single ACID transaction spanning
multiple independently-owned databases in a microservices architecture.

Step 1 — Define the actual problem:
  Need: order placement must either fully succeed (order created,
  payment charged, stock reserved) or fully NOT happen — no
  partial states like "payment charged but no stock reserved."
  Real constraint: Order, Payment, and Inventory are separate
  services with separate databases (an already-established
  architectural decision, file 10) — this constraint isn't up for
  debate in THIS decision.

Step 2 — Genuinely viable options (given the real constraint above):
  A. Saga pattern (file 12) — a sequence of local transactions with
  compensating actions
  B. The junior engineer's original proposal (cross-database ACID
  transaction) — NOT actually viable, given the real constraint;
  ruled out at Step 2, not weighed against Option A

This is worth pausing on: Step 2 explicitly says "identify GENUINELY
VIABLE options" — a proposal that violates an already-established
real constraint isn't a competing option to evaluate, it's simply
not available, and recognizing that early avoids wasted analysis
time on Option B.

Step 3 (only genuinely viable option remains, but still worth
being explicit about which SAGA style):
  Choreography (each service reacts to events independently, no
  central coordinator) vs Orchestration (a central Saga Orchestrator
  explicitly sequences the steps)

  Given three services and straightforward sequential logic (create
  order → charge payment → reserve stock, with compensating actions
  on failure), file 12's guidance ("orchestration once a saga has
  several steps or complex conditional branching") suggests this is
  right at the boundary — three steps, but with real compensating
  logic on failure. Orchestration is chosen for the clearer,
  centralized view of the whole flow, given that debugging a
  three-service compensating-transaction flow via choreography's
  scattered event handlers is exactly the kind of complexity file 12
  warns becomes hard to trace.

Decision: implement an orchestrated Saga (file 12), with the Order
Service acting as the orchestrator (it's the natural "owner" of the
overall order lifecycle), explicitly sequencing calls to Payment and
Inventory, with defined compensating actions if any step fails.

This case study illustrates that not every step in the framework
involves genuine deliberation — sometimes Step 2 (identifying
genuinely viable options) does most of the real work, by correctly
ruling out an option that violates an already-established
architectural constraint, before Step 3's weighing even begins.
```

---

## The Common Thread

```
Across all four case studies, the same underlying discipline shows
up repeatedly, applied to very different questions:

  Define the ACTUAL problem and REAL constraints before comparing
  options — not the imagined problem, not the impressive-sounding
  solution looking for a problem to solve.

  Rule out options that don't fit the real constraints EARLY (Case
  Study 4), rather than weighing them seriously.

  Weigh reversibility explicitly (Case Studies 1 and 2) — both
  landed on "start simple, it's a two-way door" specifically because
  that reasoning was made explicit, not assumed.

  Measure before making a significant change (Case Study 3) — the
  most expensive mistake in this set of case studies would have been
  skipping this step entirely.

  Recognize when a pattern (Saga, Case Study 4) or an architecture
  (microservice extraction, Case Study 1) is being applied because
  its problem shape is GENUINELY present — not preemptively, and not
  because it's unavailable to avoid (Case Study 4's constraint).

None of this requires exotic knowledge — it requires the discipline
to slow down at the start of a decision long enough to make the
reasoning explicit, which is precisely what file 23's framework
exists to force, and what this entire course has been building
toward, one concept at a time.
```

---

## Closing Note

This is the final page of the course. If there's one idea worth carrying forward above all the individual principles, patterns, and frameworks covered across these 25 pages, it's this: **every technique in this course exists to serve the people who will read, run, and change this code after you — including future you.** Clean naming, SOLID boundaries, a well-chosen architecture, a documented decision — all of it is, at its core, empathy for a future reader, expressed through engineering discipline.
