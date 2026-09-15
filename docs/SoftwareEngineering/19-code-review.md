---
title: "Code Review"
sidebar_label: "Code Review"
sidebar_position: 19
---

# Code Review

Code review is where most of a team's shared standards actually get enforced and taught — more than any style guide document. This page covers how to do it well, both as the person submitting code and the person reviewing it.

---

## Why Code Review Matters

```
Catches bugs before they reach production — a second pair of eyes
  sees things the author, deep in their own context, easily misses.

Spreads knowledge across the team — reviewing someone else's work
  (and having your own work reviewed) is one of the fastest ways
  engineers learn a codebase and each other's areas of expertise.

Maintains consistency — a shared understanding of "how we do things
  here" is reinforced every single review, far more effectively than
  a document nobody rereads after onboarding.

Creates a natural checkpoint — a moment where design decisions get
  a second opinion before they're locked in, rather than discovered
  as a problem much later.

None of this works if code review becomes purely adversarial,
purely rubber-stamped, or so slow it becomes a bottleneck the team
routes around. The rest of this page is about avoiding those failure modes.
```

---

## As the Author — Preparing Code for Review

```
Keep changes SMALL and FOCUSED
  A 50-line PR gets a careful, thoughtful review in minutes.
  A 2,000-line PR gets skimmed, rubber-stamped, or avoided entirely —
  genuinely, thoroughly reviewing that much code in one sitting is
  close to impossible, and everyone reviewing it knows it.
  If a change is naturally large, look for a way to split it into a
  sequence of smaller, independently reviewable, independently mergeable
  pieces (see the Strangler Fig pattern, file 22, for how this works
  even for large-scale changes).

Write a clear description
  What changed, WHY (the motivation/problem being solved, not just a
  restatement of the diff), and how to verify it manually if that's
  relevant. A reviewer without context has to reverse-engineer intent
  from the diff alone — expensive and error-prone.

Self-review FIRST
  Read your own diff, as if you were the reviewer, before requesting
  review from anyone else. This catches an embarrassing number of
  issues (leftover debug prints, an accidentally-reverted change, an
  unclear variable name) before another person's time is spent on them.

Keep unrelated changes OUT
  A PR fixing a bug should not also reformat an unrelated file, rename
  an unrelated variable, or refactor an unrelated function — even if
  those changes are individually good ideas. Mixed-purpose PRs are
  harder to review, harder to revert cleanly if something goes wrong,
  and obscure the actual, intended change inside unrelated noise.
```

---

## As the Reviewer — Giving Useful Feedback

```
Distinguish blocking issues from suggestions
  A bug, a security issue, a genuine design problem → blocking,
  clearly say so.
  A style preference, a "you could also do it this way" → non-blocking,
  say so explicitly, so the author isn't left guessing whether they
  need to address it before merging.

  # Common convention — prefix non-blocking comments clearly:
  "nit: consider renaming this to `userCount` for clarity"
  "question: is there a reason this uses a list instead of a set here?"
  (vs an unprefixed comment, which the author should assume IS blocking)

Ask questions instead of issuing commands, where genuinely uncertain
  "What happens if `items` is empty here?" invites the author to
  either explain something the reviewer missed, or notice a real gap —
  either way, it's a conversation, not a unilateral demand.
  "Change this to handle empty lists" assumes the reviewer is already
  certain there's a real problem — fine when they genuinely are, but
  worth defaulting to questions when there's real uncertainty.

Review the LOGIC first, let tooling handle style
  Formatting, import ordering, line length — a linter/formatter (see
  the Clean Code page, file 01) should catch these automatically,
  freeing actual human review time for things a machine can't judge:
  is this the right approach, does this handle the edge cases, is
  this the right level of abstraction.

Be specific and actionable
  "This is confusing" gives the author nothing to act on.
  "This function does three different things — consider splitting
  validation from calculation (see Extract Function, file 03)" gives
  them a concrete, specific path forward.

Approve when it's GOOD ENOUGH, not when it's PERFECT
  Endless rounds of nitpicking over subjective preferences, past the
  point of any genuine correctness or design concern, blocks progress
  for marginal benefit. Save truly significant "let's do this
  differently" pushback for things that actually matter — the review
  process itself has a real cost in time and momentum.
```

---

## Handling Disagreement

```
When author and reviewer genuinely disagree on a non-trivial design
question, a comment thread going back and forth for days is rarely
the most efficient way to resolve it.

Escalation paths, roughly in order of increasing cost:
  1. A quick synchronous conversation (call, or in-person) — most
     disagreements resolve in five minutes of live discussion that
     would take days over async comments
  2. Bring in a third opinion (a tech lead, another senior engineer)
     if the two of you genuinely can't agree
  3. For a decision significant enough to matter beyond this one PR,
     consider writing it up as an ADR (Architecture Decision Record —
     see file 21, Documentation) so the reasoning is captured and
     future disagreements on the same question have something to
     refer back to

The goal is resolving disagreement efficiently, not "winning" — both
the author's and the reviewer's time are real costs, and a design
disagreement that drags on for a week has a real cost to the team's
overall velocity, independent of which side turns out to be right.
```

---

## What to Actually Look For

```
Correctness
  Does this code do what it's supposed to do? Are edge cases
  (empty input, null/None, boundary values, concurrent access)
  handled? Does the change introduce a REGRESSION in existing behavior?

Design
  Is this the right level of abstraction? Does it fit the existing
  architecture, or does it introduce an inconsistent pattern? Would
  a simpler approach work just as well (KISS, file 04)?

Tests
  Does this change have adequate test coverage for the new/changed
  behavior? Do the tests actually verify the RIGHT thing, or just
  exercise the code without meaningfully asserting correctness?

Security
  Does this handle user input safely? Are secrets/credentials kept
  out of the code? Does a new endpoint have appropriate
  authentication/authorization?

Readability
  Will another engineer (or the author, six months from now)
  understand this without needing to ask the author directly?
  (See file 01 and file 05 for the specific techniques this checks
  against — naming, function size, cognitive load.)

Performance (when relevant)
  Does this introduce an obvious inefficiency — an N+1 query (see
  the Echo course's database page), an unbounded loop over
  potentially large data, a synchronous call that should be
  asynchronous (file 10)? Not every PR needs a deep performance
  audit, but obvious issues are worth catching here rather than
  after they cause a real production incident.
```

---

## Review Speed and Team Velocity

```
A slow review process has real, compounding costs:
  Authors context-switch away from a PR waiting for review, then
  pay a real cost re-loading context when feedback finally arrives
  Branches sit unmerged longer, increasing the chance of a painful
  merge conflict with other work landing in the meantime
  A slow review culture pushes engineers toward larger, less
  frequent PRs (since each review is a costly, slow event) —
  which then take EVEN LONGER to review, a genuinely vicious cycle

Practical team norms that keep review fast:
  A target turnaround time (e.g. "reviews within one business day"),
  known and expected across the team
  Reviewing small PRs quickly, even if not exhaustively — small PRs
  deserve, and get, fast reviews; that speed is part of what makes
  small PRs worth the discipline of writing them
  Async review as the default, but a quick synchronous conversation
  when a thread starts going back and forth more than two or three times
```

---

## Tips

- Keep PRs small — this single habit does more for review quality and speed than almost any other practice on this page, on both the author's and the reviewer's side.
- Self-review your own diff before requesting review from someone else — it catches an embarrassing number of issues for free, before spending a teammate's time.
- Distinguish blocking feedback from suggestions explicitly (a "nit:" prefix or equivalent convention) — don't leave the author guessing whether a comment needs to be addressed before merging.
- Let a linter/formatter handle style so human review time goes toward logic, design, and correctness — the things a machine genuinely can't judge.
- When a disagreement starts taking more than two or three back-and-forth comments, switch to a quick synchronous conversation — it's almost always faster than continuing async.

---

## Summary

- Code review catches bugs, spreads knowledge, and maintains consistency — but only if it stays fast, focused, and constructive rather than becoming adversarial or a rubber-stamp formality.
- As author: keep changes small and focused, write a clear description of what and why, self-review before requesting review, and keep unrelated changes out of the PR.
- As reviewer: distinguish blocking issues from suggestions explicitly, ask questions rather than issue commands when uncertain, let tooling handle style so you can focus on logic and design, and approve at "good enough," not "perfect."
- Escalate genuine disagreements to a quick synchronous conversation rather than a long async back-and-forth, and consider an ADR (file 21) for decisions significant enough to need a lasting record.
- Review speed has real, compounding effects on team velocity — small PRs and a known, fast turnaround norm keep the whole cycle healthy.
