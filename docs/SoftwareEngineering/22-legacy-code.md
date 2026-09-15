---
title: "Working with Legacy Code"
sidebar_label: "Legacy Code"
sidebar_position: 22
---

# Working with Legacy Code

Most professional software engineering is done on existing systems, not greenfield projects. This page covers how to safely understand, change, and gradually improve code you didn't write and don't fully trust yet.

---

## What "Legacy Code" Actually Means

```
The common definition, from Michael Feathers' "Working Effectively
with Legacy Code": legacy code is simply CODE WITHOUT TESTS.

This is a deliberately narrow, practical definition — it's not about
how old the code is, or how "ugly" it looks. Code written yesterday
with no tests is, by this definition, already legacy code: you have
no automated way to know whether a change breaks something, so every
change carries real, unmeasured risk.

Why this framing is useful: it turns "this is scary legacy code"
(a vague feeling) into "this code has no tests" (a concrete,
addressable problem) — and it tells you exactly what the FIRST step
toward safely working in it actually is.
```

---

## The Legacy Code Dilemma

```
To safely CHANGE code, you want tests around it.
To ADD tests, you often need to change the code (to make it
  testable — e.g. breaking a hard dependency on a real database
  so a test can substitute a fake one, echoing the hexagonal
  architecture ideas in file 13).
But changing UNTESTED code is exactly the risky thing you were
  trying to avoid in the first place.

This is the central catch-22 of legacy code work, and most of this
page's techniques exist specifically to break out of it safely.
```

---

## Characterization Tests

Before changing anything, write tests that document the code's CURRENT, actual behavior — not what it should do, not what you think it does, but precisely what it actually does right now, bugs and all.

```python
# You don't yet understand this function's exact behavior in every case.
# Rather than guessing, RUN it with various inputs and record what
# actually happens — this becomes your test.

def calculate_discount(customer_type, order_total, is_holiday):
    # ... 40 lines of tangled, undocumented conditional logic ...
    pass

# Characterization tests — not asserting what SHOULD happen, but
# locking in what CURRENTLY happens, discovered by actually running it
def test_characterize_regular_customer_no_holiday():
    assert calculate_discount("regular", 100, False) == 95.0   # discovered
                                                                    # by running it,
                                                                    # not by reading
                                                                    # the logic

def test_characterize_vip_customer_on_holiday():
    assert calculate_discount("vip", 100, True) == 70.0   # also discovered
                                                              # empirically

# Even if 70.0 looks like it might be a BUG (an unusually large
# discount), the characterization test's job right now is only to
# document current behavior — not to judge or fix it. That comes later,
# as a DELIBERATE, separate, reviewed change — see below.
```

```
Once you have characterization tests covering the areas you're about
to touch, you have a genuine safety net: if a later refactor changes
behavior unintentionally, a characterization test fails immediately,
and you know EXACTLY what changed and where.

If you discover a characterization test is documenting a genuine
BUG (not just unfamiliar-but-intentional behavior), that's valuable
information — but fixing it is a separate, deliberate decision, made
consciously and reviewed as its own change, not something to silently
alter while you're just trying to add test coverage.
```

---

## Seams — Where You Can Safely Insert Tests

A "seam," per Feathers' terminology, is a place in the code where you can alter behavior WITHOUT editing the code in that exact place — the entry point that makes characterization testing and eventual refactoring possible without a chicken-and-egg problem.

```python
# No seam — a hard-coded dependency created INSIDE the function;
# there's no way to substitute a fake database for testing without
# editing this exact line
def get_user_report(user_id):
    db = PostgresDatabase("prod-connection-string")   # hard-wired, no seam
    user = db.query(f"SELECT * FROM users WHERE id = {user_id}")
    return format_report(user)

# A seam — the dependency is passed IN, not created inside; this is
# the SAME dependency injection principle as Dependency Inversion
# (file 02) and hexagonal architecture (file 13), applied here
# specifically as a tool for making legacy code testable
def get_user_report(user_id, db):
    user = db.query(f"SELECT * FROM users WHERE id = {user_id}")
    return format_report(user)

# Now a test can substitute a fake, with zero real database needed
def test_get_user_report():
    fake_db = FakeDatabase(users={1: {"name": "Alice"}})
    report = get_user_report(1, db=fake_db)
    assert "Alice" in report
```

```
Introducing a seam is usually a small, LOW-RISK, mechanical change
(like extracting a parameter) — this is often the safe FIRST step
into otherwise untested code: not a full refactor, just enough of a
structural change to make characterization testing possible at all.
```

---

## The Strangler Fig Pattern

Named after a vine that gradually grows around a host tree, eventually replacing it entirely — the standard pattern for incrementally replacing a legacy system without a risky, all-at-once rewrite.

```
   Phase 1: Legacy system handles everything

      Requests ──> [ Legacy System ]

   Phase 2: New system handles ONE piece; a router
   directs traffic to whichever system currently owns that piece

      Requests ──> [ Router ] ──┬──> [ Legacy System ]  (most traffic)
                                └──> [ New System ]      (one migrated piece)

   Phase 3: More pieces migrated over time, incrementally,
   each one validated in production before moving to the next

      Requests ──> [ Router ] ──┬──> [ Legacy System ]  (shrinking)
                                └──> [ New System ]      (growing)

   Phase 4: Legacy system fully replaced; router (or the routing
   logic) can eventually be removed

      Requests ──> [ New System ]
```

```
Why this beats a big-bang rewrite:
  Each migrated piece is validated in REAL production use before
  the next piece is attempted — problems are caught early, on a
  small piece, not discovered on launch day of an entire rewritten
  system.
  The legacy system keeps running and serving value throughout the
  entire migration — there's no risky "flip the switch" moment where
  everything must work perfectly at once.
  If a specific piece's migration goes wrong, only THAT piece needs
  to be rolled back — not the entire effort.
  The team retains the ability to reprioritize or pause the
  migration at any point without having a half-finished rewrite that
  can neither ship nor be safely abandoned (the classic failure mode
  of big-bang rewrites — see file 24, Anti-Patterns, "The Rewrite Trap").
```

---

## Safe Refactoring Techniques for Untested Code

```
1. Start with the smallest, most mechanical, lowest-risk changes:
   Extract Function, rename a variable, introduce a seam (see above)
   — changes where it's easy to visually confirm nothing behavioral
   actually changed, even without a test suite yet in place.

2. Add characterization tests around the specific area you're about
   to change MORE substantially — not the whole codebase at once,
   just the immediate blast radius of your actual change.

3. Make the substantive change, with the new characterization tests
   now providing a real safety net.

4. Expand test coverage opportunistically as you touch more of the
   codebase over time (the Boy Scout Rule from file 01, applied
   specifically to test coverage) — legacy code becomes progressively
   less "legacy," by Feathers' definition, as this accumulates.
```

---

## When NOT to Refactor Legacy Code

```
Not every messy, untested piece of legacy code needs to be improved.

Skip refactoring when:
  The code works, is stable, and is rarely touched — the "interest"
  being paid (file 20, Technical Debt) is genuinely low; refactoring
  it has real cost and delivers little practical benefit.
  You don't yet understand WHY it does what it does — refactoring
  code you don't fully understand risks removing behavior that
  looks wrong but is actually handling a real, non-obvious edge
  case (sometimes discovered only when a customer complains after
  the "obviously dead" code path is removed).
  There's no concrete, current need driving the change — echoing
  YAGNI (file 04), refactoring "because it's ugly" without a real
  driving need competes poorly against work with clearer value.

Refactor when:
  You're already changing this code for a real feature/bug-fix
  reason, and the current structure is actively making that change
  harder or riskier than it should be
  It's a genuine, measured source of bugs or slow development (file 20)
  You've built characterization tests and now have the safety net to
  do it responsibly
```

---

## Tips

- Treat "legacy code" as simply "code without tests," per Feathers' definition — this reframes a vague, intimidating problem into a concrete, addressable one: add tests first, safely, before attempting bigger changes.
- Write characterization tests to lock in CURRENT behavior before changing anything — discovered empirically by running the code, not assumed from reading it or from what you think it should do.
- Introduce seams (parameters instead of hard-coded internal dependencies) as a small, low-risk first step that makes testing possible at all — this is the same dependency injection idea from file 02 and file 13, applied as a legacy-code-specific tool.
- Use the Strangler Fig pattern for large-scale legacy replacement — incremental, validated-in-production migration beats a risky big-bang rewrite almost every time.
- Don't refactor code you don't yet understand, or code with no real, current need driving the change — not all legacy code needs fixing, and refactoring without understanding risks silently removing behavior that was actually load-bearing.

---

## Summary

- Legacy code, practically defined, is simply code without tests — this reframes the problem from vague and intimidating to concrete and addressable.
- Characterization tests document a system's CURRENT actual behavior (discovered by running it, not assumed) before any change is attempted, providing a genuine safety net for subsequent refactoring.
- Seams are places where a hard-coded dependency can be replaced with an injected one, making previously untestable code testable — often the necessary first, low-risk step into otherwise legacy code.
- The Strangler Fig pattern replaces a legacy system incrementally, piece by piece, each validated in real production use, rather than attempting a risky all-at-once rewrite.
- Not all legacy code needs refactoring — reserve the effort for code you're already changing for a real reason, code causing measured problems, or code you've built genuine understanding and test coverage around first.
