---
title: "Documentation"
sidebar_label: "Documentation"
sidebar_position: 21
---

# Documentation

Documentation is what lets knowledge outlive the person who had it in their head. This page covers READMEs, Architecture Decision Records (ADRs), and inline documentation — what each is for, and how to keep them from going stale.

---

## The Documentation Hierarchy

Different kinds of documentation answer different questions, for different audiences, at different points in a project's life. Using the wrong kind for the job — or writing everything as one giant wiki page — is a common source of documentation nobody actually reads or trusts.

```
README                     → "What is this, and how do I get started?"
                            First thing a new engineer or user reads.
  
Architecture Decision      → "Why did we choose THIS approach, and what
Records (ADRs)               else did we consider?"
                            Historical record of significant decisions.
  
Inline code comments       → "Why does this specific, non-obvious piece
                            of code work this way?"
                            Right next to the code it explains.
  
API documentation          → "What does this function/endpoint do,
                            what does it take, what does it return?"
                            Reference material for callers.

Runbooks/operational docs  → "What do I do when THIS specific thing
                            goes wrong?"
                            (Covered in depth in the DevOps course's
                            observability page — the same document
                            type, same purpose.)
```

---

## Writing a Good README

The README is almost always the first thing anyone — a new team member, an external contributor, your own future self after months away — reads. It sets the tone for the whole project.

```markdown
# Project Name

One or two sentences: what does this actually do, and why does it exist?

## Quick Start

The FASTEST path from "I just cloned this" to "I have it running
locally." Every unnecessary step here is friction that loses readers.

    git clone <repo>
    cd project
    npm install
    npm run dev

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- (anything else genuinely required before the Quick Start works)

## Project Structure

A brief orientation — not exhaustive, just enough for a newcomer to
know where to look for what:

    src/
      handlers/   HTTP request handlers
      services/   business logic
      models/     data structures

## Running Tests

    npm test

## Deployment

Link to more detailed deployment docs if this would otherwise make
the README too long — the README's job is orientation, not being
the single exhaustive source for everything.

## Contributing

Link to a CONTRIBUTING.md if the project has one, or brief inline
guidance (branch naming, PR process — see file 19, Code Review) if not.
```

```
What makes a README GOOD, specifically:
  A newcomer can get the project running locally within minutes,
  not hours — this is the single highest-value thing a README does
  Assumes minimal prior context — don't assume the reader already
  knows internal jargon, acronyms, or "how we do things here"
  Stays SHORT — link out to deeper documentation rather than trying
  to be the one exhaustive document; a README that's grown to 2,000
  lines has usually stopped being read carefully by anyone
```

---

## Architecture Decision Records (ADRs)

A short document capturing ONE significant architectural decision — the context that led to it, the decision itself, and the consequences/trade-offs accepted.

```markdown
# ADR-0012: Use PostgreSQL Instead of MongoDB for Order Data

## Status
Accepted

## Context
Our order data has clear, stable relationships (orders → line items →
products, orders → customer) and we need strong consistency guarantees
for inventory reservation during checkout (see file 17, CAP Theorem —
this specific data needs strong consistency, even though other parts
of our system are fine with eventual consistency).

We initially considered MongoDB for its flexible schema, anticipating
that order data structure might change frequently as the product evolves.

## Decision
We will use PostgreSQL for all order-related data.

## Consequences
Positive:
  - Strong consistency for inventory reservation, avoiding overselling
  - Mature tooling for migrations, backups, and read replicas
  - The team already has deep PostgreSQL operational experience

Negative:
  - Schema changes require migrations (see file 14, Database Design)
    rather than MongoDB's flexible document structure — a deliberate
    trade-off, since order data has proven stable in practice over
    the exploration we did before this decision

## Alternatives Considered
  - MongoDB: rejected due to weaker consistency guarantees for the
    inventory reservation use case specifically
  - DynamoDB: rejected due to team's limited operational experience
    with it, and our data's genuinely relational shape
```

```
Why ADRs matter — the specific problem they solve:

Without them: six months later, someone (possibly the same engineer
who made the original decision) asks "wait, why did we choose
PostgreSQL over MongoDB here?" — and the answer has to be
reconstructed from memory, old Slack messages, or isn't recoverable
at all. Worse, someone might "fix" this "obviously wrong" decision
without understanding the original, still-valid reasoning behind it.

With them: the reasoning is preserved permanently, in context, right
alongside the decision — anyone questioning the choice later can
read the original trade-off analysis before deciding whether
circumstances have genuinely changed enough to warrant revisiting it.

When to write one: for decisions that are genuinely hard to reverse,
affect multiple people/teams, or where the reasoning itself (not
just the decision) has lasting value. Not every decision needs an
ADR — a simple, easily-reversible choice doesn't warrant the overhead.
```

---

## Inline Documentation and Docstrings

Covered in depth, per-language, in the language courses on this site (see each course's error handling and functions pages) — the strategic guidance here is what makes inline documentation actually worth maintaining.

```python
def calculate_shipping_cost(weight_kg: float, distance_km: float, is_express: bool) -> float:
    """
    Calculate shipping cost based on weight, distance, and speed tier.

    Uses the 2024 carrier rate card (see docs/shipping-rates.md for
    the full rate table this implements).

    Args:
        weight_kg: package weight in kilograms, must be positive
        distance_km: shipping distance in kilometers
        is_express: whether express (2-day) shipping is requested

    Returns:
        Shipping cost in USD

    Raises:
        ValueError: if weight_kg is zero or negative
    """
    if weight_kg <= 0:
        raise ValueError("weight must be positive")
    base_rate = weight_kg * 0.5 + distance_km * 0.01
    return base_rate * 1.8 if is_express else base_rate
```

```
Good docstring content — things the CODE ITSELF cannot express:
  What the function does, from the CALLER's perspective (not a
  restatement of the implementation)
  Parameter constraints not obvious from the type signature alone
  (weight_kg must be positive — the type `float` alone doesn't say that)
  What exceptions can be raised, and under what conditions
  A link to further context (a spec, a related document) when the
  function implements something with real external documentation

Docstrings for EVERY function, including trivial private helpers
whose purpose is obvious from their name and one-line body, are
usually not worth the maintenance burden — reserve them for PUBLIC
APIs (functions other code/other teams will call without reading the
implementation) and anything with genuinely non-obvious behavior.
```

---

## Keeping Documentation From Going Stale

Stale documentation is often worse than no documentation — it actively misleads readers who reasonably trust it, and rebuilding trust in a team's documentation after it's been found wrong repeatedly is hard.

```
Practical strategies:

Put documentation NEXT TO the code it describes, in the same repo,
  reviewed in the same PRs — a README or docstring change that's
  part of the same PR as the code change it describes is far more
  likely to stay in sync than a wiki page living in a completely
  separate system, edited (or not) independently.

Prefer documentation that's HARD to let go stale:
  A docstring with an executable example (like Go's Example
  functions, covered in the Go course's testing page, or doctest
  in Python) is VERIFIED by the test suite — it literally cannot
  silently go stale without a test failing to alert you.
  Generated API documentation (from OpenAPI specs, from code
  annotations) stays in sync automatically because it's derived
  FROM the code, not maintained as a separate parallel document.

Delete documentation you know is stale rather than leaving it —
  wrong documentation actively misleads; no documentation at least
  doesn't actively lie to the reader.

Periodically review high-traffic docs (the README, key ADRs, onboarding
  guides) as part of a recurring team practice — not necessarily every
  sprint, but at some deliberate cadence, rather than never.
```

---

## Tips

- Match the documentation type to the actual question being answered — a README for "how do I get started," an ADR for "why did we choose this," inline comments for "why does this specific weird code exist."
- Keep READMEs short and link out to deeper docs — a README's job is fast orientation, not being the exhaustive source of truth for everything.
- Write an ADR for decisions that are hard to reverse or where the reasoning has lasting value — not every decision needs one, but the genuinely significant ones are worth the ten minutes it takes.
- Prefer documentation that's structurally hard to let go stale (executable examples, generated API docs) over documentation that relies purely on someone remembering to update it manually.
- Delete documentation you know is wrong rather than leaving it — stale docs that actively mislead are a worse outcome than the same information simply not existing yet.

---

## Summary

- Different documentation types answer different questions: README (getting started), ADRs (why a decision was made), inline docs (why specific code works the way it does), API docs (reference for callers).
- A good README gets a newcomer running the project in minutes, assumes minimal prior context, and stays short by linking to deeper documentation rather than trying to cover everything itself.
- ADRs capture the context, decision, and consequences of significant, hard-to-reverse architectural choices — preserving the reasoning, not just the outcome, for anyone questioning it later.
- Inline documentation (docstrings/comments) is most valuable on public APIs and genuinely non-obvious code — not every trivial function needs one.
- Keep documentation from going stale by co-locating it with the code it describes (reviewed in the same PRs), preferring structurally-verified formats (executable examples, generated docs), and deleting documentation known to be wrong rather than leaving it to mislead readers.
