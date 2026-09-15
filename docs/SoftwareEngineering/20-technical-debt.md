---
title: "Technical Debt"
sidebar_label: "Technical Debt"
sidebar_position: 20
---

# Technical Debt

Technical debt is the implied cost of future rework caused by choosing an easier, faster solution now instead of a better, more thorough approach. Like financial debt, it's not inherently bad — it's a tool, used well or poorly depending on whether it's taken on deliberately and paid down intentionally.

---

## The Debt Metaphor, Taken Seriously

```
Financial debt:
  You borrow money now, get something you need immediately, and pay
  it back later WITH INTEREST. Reasonable when the immediate need is
  real and you have a genuine plan to repay it. Dangerous when it
  accumulates without a repayment plan, or when the interest rate
  (the ongoing cost) is higher than you realized when you took it on.

Technical debt:
  You ship a quick, imperfect solution now, get a real business
  benefit (shipped feature, met deadline, validated an idea) sooner,
  and accept that the imperfect solution will cost MORE to properly
  fix or extend later than if you'd done it right the first time.
  Reasonable when the immediate need is real and there's a genuine
  plan to address it. Dangerous when it accumulates silently, with
  no tracking and no repayment plan, until the codebase becomes
  something the team actively dreads working in.
```

---

## Types of Technical Debt

### Deliberate Debt

Taken on knowingly, usually under a real deadline or to validate an idea before investing more heavily.

```
Example: "We're hardcoding this configuration value instead of
building a proper admin UI for it, because we need to ship this
feature by Friday, and we don't yet know if this feature will even
be kept after the initial user feedback."

This is a REASONABLE trade-off if:
  - It's made consciously, not accidentally
  - The team is aware of the trade-off (not hidden from teammates
    or from whoever owns the roadmap)
  - There's at least a rough plan for revisiting it if the feature
    proves out and needs to become more robust
```

### Accidental / Reckless Debt

Taken on without realizing it, or knowingly without any plan to address it.

```
Example: a team ships code without tests, "just this once," under
deadline pressure — and this becomes the unstated norm for the next
two years, because there was never a deliberate decision to revisit it.

This is the dangerous kind: it compounds silently, because nobody
consciously decided to accept the trade-off — it just happened, and
kept happening, until the codebase's overall quality degraded far
more than anyone individually intended.
```

### Bit Rot / Unavoidable Debt

Debt that accumulates not from a poor decision, but simply from the world changing around otherwise-fine code.

```
Example: a dependency you correctly chose two years ago is now
deprecated, or a design that was appropriate for the traffic/scale
you had a year ago no longer fits your current traffic/scale (see
file 16, Scalability Patterns).

This isn't a mistake anyone made — it's the natural cost of a system
existing and its environment changing around it. Still needs to be
tracked and paid down like any other form of debt.
```

---

## Making Debt Visible

The single most important practice: technical debt that isn't tracked doesn't get paid down — it just accumulates until it becomes a crisis.

```
Concrete ways to make debt visible:

  A dedicated backlog/ticket for each known piece of debt, with
  enough context that someone OTHER than the person who wrote it
  could understand and address it later

  A TODO comment WITH a ticket reference and owner, not a vague
  floating note:
    # TODO(alice, JIRA-4521): this uses a naive O(n²) algorithm;
    # fine for current data volume (~1000 items), revisit if it
    # grows significantly — see ticket for the specific threshold
    # where this becomes a real problem

  Explicitly calling it out in the PR description that introduces it:
    "Note: this hardcodes the tax rate rather than making it
    configurable, since we're not yet sure this feature will be
    kept post-launch. If it sticks around, JIRA-4521 tracks making
    this configurable properly."

  A recurring team ritual (even quarterly) to review the accumulated
  debt backlog and deliberately decide what to pay down next,
  alongside regular feature work — not waiting for debt to become
  painful enough to force an emergency response
```

---

## Communicating Debt to Non-Engineers

This is often the hardest part — technical debt is invisible to anyone who can't read the code, which makes it easy for it to lose out to visible, demonstrable feature work when priorities are set.

```
What doesn't work well:
  "We need to refactor the payment module" — abstract, no clear
  connection to anything a product manager or business stakeholder
  can weigh against other priorities.

What works better — translate debt into business terms:
  "The current payment code makes adding a new payment provider take
  roughly 3 weeks; a focused 1-week investment now would bring that
  down to about 3 days for every FUTURE payment provider we add" —
  concrete, comparable against other roadmap priorities, and framed
  in terms of future velocity, which is something a non-engineer
  stakeholder can genuinely reason about and prioritize against.

  "This part of the system has caused 4 production incidents in the
  last quarter, each taking an average of 6 engineer-hours to
  resolve — addressing the underlying design issue would cost
  roughly 2 weeks of focused work" — grounds the debt in a concrete,
  already-experienced cost, not a hypothetical future one.

Framing debt in terms of velocity, risk, or already-incurred cost
(rather than abstract code quality) is what makes it possible to
genuinely weigh against feature work in prioritization conversations.
```

---

## The Cost of NOT Paying Down Debt

```
Debt compounds — code with existing debt tends to accumulate MORE
debt faster than clean code does, for a few concrete reasons:

  New features built on top of a messy foundation inherit and often
  amplify that mess, because there's no clean structure to extend
  cleanly

  Engineers become reluctant to refactor code they don't fully
  understand or trust — so problems get worked AROUND instead of
  fixed, adding yet another layer of workaround on top of the
  original problem

  Onboarding new team members to a debt-heavy codebase takes
  longer, and they're more likely to unknowingly introduce MORE
  debt, because the "right way to do things here" isn't evident
  from the existing code

This compounding effect is why "we'll deal with it later" often
becomes progressively more expensive to actually act on the longer
it's deferred — not because the original debt itself grew, but
because more and more code came to depend on and inherit its problems.
```

---

## Practical Debt Management

```
1. Make debt visible (tracked, not just remembered) — see above.

2. Allocate DEDICATED time for paying it down, don't rely on
   "whenever there's spare time" (spare time in most teams tends
   toward zero, indefinitely, without deliberate allocation).
   Common patterns: a fixed percentage of each sprint/cycle reserved
   for debt work, or periodic dedicated "focus" time blocks.

3. Prioritize debt like any other work, using its actual, demonstrated
   impact — the debt costing the team 6 hours of production incident
   response every month deserves priority over the debt that's
   theoretically imperfect but has never actually caused a problem.

4. Prevent NEW reckless debt through code review (file 19) and
   team standards (file 01, file 02) — the highest-leverage moment
   to address debt is before it's merged, not after it's compounded
   for months.

5. Distinguish "this code is imperfect" from "this code is actively
   costing us" — not all imperfection is debt worth actively paying
   down; focus effort on debt with a REAL, demonstrated cost (this
   connects to YAGNI, file 04 — perfecting code with no real ongoing
   cost is its own form of wasted effort).
```

---

## Tips

- Track technical debt the same way you'd track a feature request — a ticket, with context, not just a mental note or a vague comment that will lose all context within weeks.
- Translate debt into business terms (velocity impact, incident cost) when communicating it to non-engineering stakeholders — abstract "code quality" arguments rarely win against visible, demonstrable feature work in prioritization conversations.
- Distinguish deliberate debt (a conscious, reasonable trade-off with a plan) from reckless debt (unconscious, no plan) — the goal isn't zero debt, it's debt that's taken on and managed deliberately.
- Allocate dedicated time for debt repayment rather than hoping for leftover time — "whenever there's spare time" reliably becomes "never" in most real teams.
- Focus debt-paydown effort on debt with a demonstrated, real cost (recurring incidents, measurably slower feature development) rather than theoretical imperfection with no actual observed impact.

---

## Summary

- Technical debt is the implied future cost of a faster, imperfect solution chosen now — like financial debt, it's a tool, not inherently bad, as long as it's taken on deliberately and tracked.
- Deliberate debt (conscious trade-off, known, with a plan) is manageable; accidental/reckless debt (unconscious, unplanned) is what actually causes codebases to degrade badly over time.
- Make debt visible through tracked tickets, contextual TODO comments, and explicit callouts in PR descriptions — untracked debt doesn't get paid down, it just silently accumulates.
- Communicate debt to non-engineers in terms of velocity, risk, and already-incurred cost, not abstract code quality — this is what makes it possible to prioritize against visible feature work.
- Debt compounds: messy foundations produce more debt faster, and reluctance to touch untrusted code leads to workarounds stacked on workarounds — deferring paydown tends to make it progressively more expensive to eventually address.
- Manage debt deliberately: track it, allocate dedicated time for it, prioritize by demonstrated real-world impact, and prevent new reckless debt through code review and team standards.
