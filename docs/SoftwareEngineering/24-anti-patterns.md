---
title: "Common Anti-Patterns"
sidebar_label: "Anti-Patterns"
sidebar_position: 24
---

# Common Anti-Patterns

Recurring mistakes, well-known enough across the industry to have earned their own names. Recognizing the pattern early is often the difference between a small correction and a painful, expensive fix later.

---

## Big Ball of Mud

```
A system with no discernible architecture — components reach into
each other's internals freely, there's no clear boundary between
layers or modules, and understanding any one piece requires
understanding almost everything else too.

   ┌───────────────────────────────────────────┐
   │   Everything ─── calls ─── everything     │
   │       ▲             ▲            ▲        │
   │       └─────────────┴────────────┘        │
   │              tangled, no clear direction  │
   └───────────────────────────────────────────┘

How it happens: not usually one bad decision, but the ABSENCE of
deliberate boundary discipline over time — each individual change
seemed locally reasonable, but without enforced module boundaries
(file 11) or architectural review, the system gradually loses any
coherent structure.

Why it's costly: every change carries unpredictable risk, because
you can't be confident about the full blast radius of touching any
one piece — "I changed this billing function and it somehow broke
the login page" is the recognizable symptom.

The fix is rarely a rewrite (see The Rewrite Trap, below) — it's
usually incremental: introduce module boundaries (file 11), add
characterization tests around the areas you're changing (file 22),
and apply the Boy Scout Rule (file 01) consistently over time.
```

---

## God Object

```
A single class or module that knows about or does far too much —
often the natural end-state of consistently violating Single
Responsibility (file 02) over time, one small addition at a time.

  class ApplicationManager:
      def create_user(self): ...
      def send_email(self): ...
      def process_payment(self): ...
      def generate_report(self): ...
      def validate_input(self): ...
      def log_event(self): ...
      def cache_data(self): ...
      # ... 40 more methods, touching every part of the system

Why it happens: it's often the path of least resistance in the
moment — "I need this new bit of logic somewhere, and this class is
already imported everywhere, so I'll just add it here" — each
individual addition seems reasonable in isolation.

The fix: Extract Class (file 03), repeatedly, splitting by actual
responsibility, guided by Single Responsibility Principle (file 02).
```

---

## Spaghetti Code

```
Code with tangled, hard-to-follow control flow — deeply nested
conditionals, gotos or their equivalent (excessive early returns
scattered unpredictably, deeply chained callbacks), and logic that
jumps around in ways that resist being traced linearly.

Distinct from a God Object (which is about a class/module knowing
too much) — spaghetti code is specifically about CONTROL FLOW being
tangled, even within a single, reasonably-scoped function.

The fix: the readability techniques from file 05 directly — guard
clauses instead of deep nesting, extracting cohesive chunks into
well-named functions (file 03), keeping each function at one
consistent level of abstraction.
```

---

## Premature Optimization

```
"Premature optimization is the root of all evil" — Donald Knuth
(the full quote is more nuanced than the popular one-liner, but the
core point holds: optimizing code before you KNOW it's actually a
bottleneck wastes effort and often makes the code harder to
understand, for a performance gain that may not even matter)

Example: obsessively micro-optimizing a function that runs once per
user session, while a genuinely slow database query — called on
every single page load — goes unnoticed and unmeasured.

The fix: PROFILE before optimizing. Identify the ACTUAL bottleneck
with real measurement (a profiler, real production metrics — see
the DevOps course's Prometheus/Grafana page) rather than guessing
based on intuition about what "feels" slow. Optimize the specific
thing the data says matters, not the thing that's most interesting
or satisfying to optimize.

This doesn't mean ignore performance entirely upfront — obviously
poor choices (an O(n²) algorithm where an O(n log n) one is just as
easy to write) are worth avoiding from the start. The anti-pattern
specifically is spending SIGNIFICANT effort optimizing something
without first confirming it's actually a meaningful bottleneck.
```

---

## Over-Engineering

```
Building far more flexibility, abstraction, or generality than the
actual problem requires — the same territory covered in file 04
(YAGNI) and file 06 (forcing a design pattern where it isn't needed),
worth naming explicitly here as a recognizable anti-pattern.

Example: a configurable plugin architecture, with five layers of
abstraction, for a business rule that has been stable and unchanged
for three years and shows no sign of needing to vary.

Why it happens: often well-intentioned — an engineer genuinely
trying to build something "properly," anticipating future needs.
The problem is the anticipated needs are frequently WRONG, and the
complexity is paid for regardless, by every future reader, whether
or not the flexibility is ever actually used.

The fix: build the simplest thing that solves the actual, current
requirement (echoing KISS, file 04). Add abstraction when a SECOND
or THIRD genuine, concrete need for it actually appears — not
speculatively, on the first occurrence.
```

---

## The Rewrite Trap ("Second System Effect")

```
A team, frustrated with a messy legacy system, decides to rewrite it
from scratch — and the rewrite takes far longer than planned, often
never actually ships, or ships with a wave of NEW bugs the old,
battle-tested system had long since had fixed.

Why this happens, reliably enough to have a name (coined by Fred
Brooks as "the second system effect"):
  The old system's messiness often encodes YEARS of accumulated
  fixes for real-world edge cases — special-cased handling for a
  weird customer scenario, a fix for a bug that only appears under
  a specific rare condition. A rewrite frequently and silently loses
  this accumulated, hard-won correctness, because it isn't
  documented anywhere except in the old code itself.
  The team, freed from the old system's constraints, tends to add
  scope — "while we're rewriting this, let's also fix X and
  redesign Y" — inflating the rewrite far beyond its original goal.
  The business still needs the OLD system maintained in the
  meantime (bugs still need fixing, new small features still need
  shipping) — splitting focus between maintaining the old system
  and building the new one slows the rewrite even further.
  There's no incremental value delivered until the ENTIRE rewrite is
  done — a high-risk, all-or-nothing bet, unlike incremental
  approaches.

The fix: prefer the Strangler Fig pattern (file 22) — incremental
replacement, piece by piece, each validated in real production use —
over a big-bang rewrite, in nearly all cases. A full rewrite is
occasionally genuinely justified, but it deserves serious scrutiny
given how often it fails to deliver on its promise.
```

---

## Golden Hammer

```
"When you have a hammer, everything looks like a nail" — reaching
for the same familiar tool/pattern/technology for every problem,
regardless of fit.

Examples:
  A team that knows microservices well proposes microservices for
  every new project, including a small internal tool that would be
  simpler and faster to build as a monolith (file 09).
  An engineer who just learned the Observer pattern (file 06)
  starts applying it everywhere, including places a simple direct
  function call would be clearer.

Why it happens: familiarity genuinely reduces risk and effort FOR
THE PERSON using the familiar tool — but that local optimization
doesn't necessarily produce the best outcome for the actual problem,
or for the team maintaining the result long-term.

The fix: the architecture decision framework (file 23) — evaluate
against the ACTUAL problem's needs and constraints, not against
"what am I already comfortable with." Familiarity is a genuinely
legitimate factor to weigh (Step 3 in that framework explicitly
includes team familiarity) — the anti-pattern is when it's the ONLY
factor, silently overriding everything else.
```

---

## Vendor Lock-In (Unmanaged)

```
Building so deeply and unconditionally on a specific vendor's
proprietary features that switching away later becomes prohibitively
expensive — not inherently wrong (using a vendor's specific features
is often the RIGHT call, for real productivity gains), but dangerous
when it happens WITHOUT a conscious decision.

The distinction that matters: this is really the reversibility
question from file 23 (Step 4) — is choosing this vendor's
proprietary feature a one-way or two-way door for your system?

Conscious, evaluated lock-in: "we're deliberately using this cloud
  provider's proprietary managed database because it saves real
  engineering time, and we've accepted that switching later would
  be expensive — that's a reasonable, informed trade-off for our
  situation."

Unmanaged lock-in: proprietary features adopted without ever
  considering the switching cost, discovered only when a business
  reason to switch vendors arises and turns out to be far more
  expensive and disruptive than anyone had realized.

The fix isn't "avoid all vendor-specific features" (often
impractical, and sometimes leaves real value on the table) — it's
applying the Step 4 reversibility question deliberately, so lock-in
is a conscious trade-off, not an accidental one discovered too late.
```

---

## Analysis Paralysis

```
Endless deliberation over a decision without ever actually deciding —
already covered in file 23's pitfalls section, included here because
it's common enough to be worth its own explicit name and recognition.

The fix: explicitly classify the decision as a one-way or two-way
door (file 23, Step 4) — most decisions suffering from analysis
paralysis are actually two-way doors that don't warrant the amount
of deliberation being spent on them.
```

---

## Tips

- Most anti-patterns on this page share a root cause: a decision (or an absence of decision-making) made without considering the actual, specific trade-offs involved — which is exactly what the architecture decision framework (file 23) is designed to prevent.
- Recognizing an anti-pattern EARLY is far cheaper than fixing it after it's compounded — a Big Ball of Mud caught after 6 months of unstructured growth is a much smaller fix than the same pattern caught after 3 years.
- Prefer incremental fixes (Strangler Fig, file 22; Extract Class/Function, file 03; introducing module boundaries, file 11) over a full rewrite for nearly every anti-pattern on this page — the Rewrite Trap is a real, well-documented risk, not a hypothetical one.
- Premature optimization and over-engineering are both, at their core, effort spent on a problem you don't yet KNOW you have — profiling (for performance) and waiting for a second/third real use case (for abstraction) are the antidotes to both.

---

## Summary

- Big Ball of Mud: no discernible architecture, from an absence of enforced boundaries over time — fixed incrementally with module boundaries and characterization tests, not a rewrite.
- God Object: one class/module doing far too much, usually from repeatedly violating Single Responsibility — fixed with Extract Class, guided by SOLID (file 02).
- Spaghetti Code: tangled control flow specifically — fixed with the readability techniques from file 05 (guard clauses, consistent abstraction levels).
- Premature optimization and over-engineering both spend real effort on a problem not yet confirmed to exist — profile before optimizing performance; wait for a real second/third use case before abstracting.
- The Rewrite Trap: big-bang rewrites reliably underdeliver, often losing years of accumulated edge-case fixes silently — prefer the Strangler Fig pattern's incremental, validated-in-production approach instead.
- Golden Hammer (reaching for a familiar tool regardless of fit) and unmanaged vendor lock-in are both fixed by applying the architecture decision framework (file 23) deliberately, rather than defaulting to familiarity or convenience unconsciously.
