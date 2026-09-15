---
title: "Architecture Decision Framework"
sidebar_label: "Architecture Decisions"
sidebar_position: 23
---

# Architecture Decision Framework

Every page in this course so far has presented trade-offs — monolith vs microservices, SQL vs NoSQL, strong vs eventual consistency. This page is the repeatable process for actually making these decisions, instead of relying on gut feeling or defaulting to whatever's trendy.

---

## Why a Framework Matters

```
Without a deliberate process, architecture decisions tend to default to:

  Resume-driven development — choosing a technology because it looks
  good on a resume or is exciting to learn, not because it fits the
  problem

  Cargo culting — "Netflix does microservices, so we should too"
  without examining whether Netflix's actual constraints (massive
  scale, hundreds of independent teams) apply to your situation at all

  Whoever argues loudest — the most senior or most persistent voice
  in the room wins, regardless of whether their reasoning is actually sound

A deliberate framework doesn't guarantee the "right" answer — there
often isn't one single right answer — but it ensures the decision is
made for REASONS that can be examined, questioned, and revisited
later, rather than vibes.
```

---

## The Framework

### Step 1 — Define the Actual Problem

```
Before comparing options, write down, specifically:
  What are we actually trying to solve?
  What does success look like, concretely?
  What are the REAL constraints (team size, timeline, budget,
  existing infrastructure, team's existing expertise)?

A surprising amount of architecture debate happens because people are
implicitly solving DIFFERENT problems without realizing it — one
person is optimizing for "ship fast this quarter," another is
optimizing for "this needs to handle 100x our current scale in two
years." Neither is wrong, but they'll advocate for different
architectures until the actual problem and its real constraints are
made explicit and shared.
```

### Step 2 — Identify Genuinely Viable Options

```
List the real candidates — not every theoretically possible option,
just the ones that could plausibly work given the REAL constraints
from Step 1.

If the team has zero Kubernetes experience and a six-week deadline,
"build a Kubernetes-orchestrated microservices platform" is not a
genuinely viable option for THIS decision, however good an idea it
might be in the abstract — it fails the real constraints already
established.
```

### Step 3 — Evaluate Against Explicit Criteria

```
Common criteria, weighted by what actually matters for THIS decision
(not every criterion matters equally every time):

  Complexity                — how hard to build, understand, and reason about
  Team familiarity          — does the team already know this well, or is
                            there a real learning curve/ramp-up cost
  Operational cost          — ongoing maintenance, monitoring, on-call burden
  Performance               — does it meet the actual (not imagined)
                            performance requirement
  Cost                      — infrastructure, licensing, engineering time
  Time to implement         — does it fit the real timeline
  Reversibility             — how expensive is it to change this
                            decision later if it turns out wrong
                            (see Step 4)
  Scalability               — does it accommodate realistic
                            future growth, not speculative growth
                            (echoing YAGNI, file 04)

A simple weighted scoring exercise (even informally, in a document)
makes the trade-offs VISIBLE and forces an explicit conversation about
which criteria matter most for this specific decision — rather than
each person silently weighting things differently in their head and
talking past each other.
```

### Step 4 — Weigh Reversibility Explicitly

This is the criterion most decision frameworks skip, and it's often the single most important one.

```
Amazon's "one-way door vs two-way door" framing is genuinely useful here:

Two-way door decisions:
  Easy/cheap to reverse if they turn out wrong. Move fast, decide
  with imperfect information, learn from the outcome, adjust.
  Example: choosing a specific caching library — swapping it later,
  if needed, is a contained, moderate effort.

One-way door decisions:
  Expensive or impossible to reverse. Choosing a primary database
  technology for a system that will hold years of production data;
  a foundational API contract that many external customers will
  build against; a core domain model that many other parts of the
  system will come to depend on.
  These deserve substantially more upfront analysis, prototyping,
  and deliberate discussion — because getting it wrong is expensive
  to fix later, unlike a two-way door decision.

Practical value: explicitly asking "is this a one-way or two-way
door?" tells you how much decision-making effort is actually
justified. Spending two weeks deliberating a two-way door decision is
wasted effort; spending two days on a genuine one-way door decision
is under-investing in a decision that will be expensive to undo.
```

### Step 5 — Make the Decision and Document It

```
Once a decision is made:
  Record it (an ADR — see file 21, Documentation) — what was decided,
  what alternatives were considered, and WHY this option won, including
  the specific trade-offs accepted.
  Make explicit what would cause you to REVISIT this decision — a
  specific scale threshold, a specific new requirement, a specific
  timeline. This turns "we should reconsider this sometime" (vague,
  never actually happens) into a concrete trigger that prompts a
  genuine future review.
```

### Step 6 — Revisit When Genuinely Warranted

```
A good architecture decision made with 2024's information can become
a bad decision by 2026, as constraints change — this isn't a sign the
original decision was wrong, it's a sign that circumstances evolved
(this connects directly to file 20's point that prudent, deliberate
technical debt is often reasonable, provided it's revisited when its
underlying assumptions change).

The explicit revisit triggers from Step 5 are what prevent two
opposite failure modes:
  Never revisiting a decision, even once the reasons it was made
  no longer apply (dogmatic attachment to an old decision)
  Constantly re-litigating settled decisions without a real,
  new reason to (decision fatigue, wasted debate on already-decided
  questions)
```

---

## A Worked Mini-Example

```
Problem (Step 1): our new feature needs a place to store user
session data. Team: 4 engineers. Timeline: ship in 2 weeks. Existing
infra: a PostgreSQL database already in production; no existing
Redis or caching infrastructure.

Viable options (Step 2): store sessions in PostgreSQL (existing
infra); introduce Redis (new infra, but a more natural technical fit
for ephemeral session data — see file 14, Database Design).

Evaluation (Step 3):
  PostgreSQL: zero new infrastructure, team already knows it well,
  slightly less natural fit (a relational database storing
  ephemeral key-value data), but proven and simple for THIS scale.
  Redis: better technical fit for the specific access pattern, but
  new infrastructure to provision, monitor, and operate (see the
  DevOps course) — real ongoing operational cost for a 4-person team
  with a 2-week deadline.

Reversibility (Step 4): this is a TWO-WAY DOOR — session storage is
an internal implementation detail, not exposed externally; switching
from PostgreSQL to Redis later, if session volume genuinely grows to
justify it, is a contained, moderate-effort change that doesn't
touch any external contract.

Decision (Step 5): use PostgreSQL for now — simpler, fits the real
timeline and team size, and the switch to Redis later (if session
volume genuinely grows enough to warrant it) is cheap because this
was correctly identified as a two-way door. Documented in a short
ADR, with an explicit revisit trigger: "reconsider if session table
read/write load becomes a measured bottleneck, or exceeds ~X req/sec."

This is a small example, but the SAME six steps apply, just with more
analysis and more stakeholders, for a genuinely large one-way-door
decision like choosing a primary database technology or committing
to a microservices migration (file 09).
```

---

## Common Decision-Making Pitfalls

```
Analysis paralysis:
  Endless research and comparison without ever deciding — usually a
  sign the reversibility (Step 4) hasn't been assessed; a two-way
  door decision doesn't deserve unlimited analysis time.

Sunk cost fallacy:
  Continuing to defend or build on a past decision because of the
  effort already invested, rather than re-evaluating based on
  CURRENT information — a documented ADR with explicit revisit
  triggers (Step 5-6) helps counter this by making "should we
  reconsider?" a scheduled, expected question rather than an
  uncomfortable confrontation.

False dichotomy:
  Presenting a decision as only two options when a third (often a
  hybrid, or a smaller first step) genuinely exists — Step 2 should
  genuinely search for viable options, not just validate a decision
  someone already wanted to make.

Ignoring team expertise:
  Choosing the "objectively best" technology on paper while ignoring
  that the team has zero experience with it — this is a real Step 1
  constraint, not a minor detail; the "best" architecture the team
  can't execute well is often worse in practice than a "good enough"
  one they can.
```

---

## Tips

- Make the actual problem and real constraints explicit before comparing options — a surprising amount of architecture disagreement is really disagreement about the underlying problem, not the proposed solution.
- Explicitly classify a decision as a one-way or two-way door before deciding how much analysis time it deserves — this single step prevents both under-analyzing consequential decisions and over-analyzing easily-reversible ones.
- Document decisions with an ADR, including explicit triggers for when to revisit — this turns "we should reconsider this sometime" from a vague intention into an actionable, scheduled check.
- Treat team familiarity and real timeline constraints as first-class decision criteria, not afterthoughts — the theoretically best architecture the team can't execute well within real constraints is often the practically worse choice.

---

## Summary

- A deliberate decision framework replaces resume-driven development, cargo-culting, and "whoever argues loudest" with reasoning that can be examined and revisited.
- The six steps: define the actual problem and real constraints, identify genuinely viable options, evaluate against explicit weighted criteria, weigh reversibility explicitly (one-way vs two-way door), document the decision (ADR) with revisit triggers, and actually revisit when those triggers occur.
- Reversibility is the most commonly-skipped, highest-value criterion — it directly determines how much analysis effort a decision actually deserves.
- Common pitfalls: analysis paralysis (usually from skipping the reversibility assessment), sunk cost fallacy (mitigated by scheduled revisit triggers), false dichotomies, and ignoring real team expertise/timeline constraints in favor of a theoretically "best" choice.
