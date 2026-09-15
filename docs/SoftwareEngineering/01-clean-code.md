---
title: "Clean Code"
sidebar_label: "Clean Code"
sidebar_position: 1
---

# Clean Code

Clean code is code that is easy to read, easy to change, and does what it appears to do. This page covers the practical habits that produce it — naming, function design, comments, and formatting.

---

## The Core Idea

Code is read far more often than it is written. A function you write once might be read fifty times by other developers (and by you, months later, having forgotten why you wrote it that way). Every decision in this page optimizes for that reader.

```
Ratio of reading to writing code: roughly 10:1

This means: a few extra seconds spent picking a clear name,
or splitting a long function into two, pays for itself many
times over across the life of that code.
```

---

## Naming

Names are the primary way code communicates intent. A good name means a reader doesn't need to open the function body to understand what something does.

```python
# Bad — requires reading the body to understand
def calc(x, y, f):
    if f == 1:
        return x + y
    return x - y

# Good — intent is clear from the signature alone
def apply_operation(first, second, operation):
    if operation == Operation.ADD:
        return first + second
    return first - second
```

**Guidelines:**

- **Use intention-revealing names.** `elapsed_time_in_days` beats `d`. The extra characters cost nothing; the ambiguity of `d` costs a reader real time every single read.
- **Avoid disinformation.** Don't call something `accountList` if it's actually a `Set`. Don't use names that differ by one character (`user1`, `user2`) for genuinely different concepts.
- **Make distinctions meaningful.** `getUser()` and `getUserData()` sound like the same thing — a reader can't tell them apart without reading both bodies. Name them for what actually differs.
- **Use pronounceable, searchable names.** `genymdhms` is neither. A single-letter name like `e` is impossible to search for in a large codebase.
- **Avoid encodings.** Hungarian notation (`strName`, `iCount`) and type prefixes add noise a modern IDE already shows you. Let the type system do that job.
- **Classes get nouns, functions get verbs.** `Customer`, `WikiPage` — not `Manager` or `Processor` (these names say nothing about what the class actually does). `deletePage()`, `calculateTotal()` — not `page()` or `total()`.
- **One word per concept.** Pick `fetch`, `retrieve`, or `get` — and use that one word consistently across the codebase for the same kind of operation. Mixing all three for equivalent operations forces readers to wonder if there's a meaningful difference.

---

## Functions

```python
# Bad — does three different things, hard to name accurately,
# hard to test in isolation
def process_order(order):
    # validate
    if not order.items:
        raise ValueError("empty order")
    if order.total < 0:
        raise ValueError("invalid total")
    # calculate
    tax = order.total * 0.08
    final_total = order.total + tax
    # save
    db.orders.insert(order.id, final_total)
    send_email(order.customer_email, final_total)
    return final_total


# Good — each function does one thing, named for exactly that thing
def validate_order(order):
    if not order.items:
        raise ValueError("empty order")
    if order.total < 0:
        raise ValueError("invalid total")

def calculate_total_with_tax(order, tax_rate=0.08):
    return order.total + (order.total * tax_rate)

def save_order(order, total):
    db.orders.insert(order.id, total)

def notify_customer(order, total):
    send_email(order.customer_email, total)

def process_order(order):
    validate_order(order)
    total = calculate_total_with_tax(order)
    save_order(order, total)
    notify_customer(order, total)
    return total
```

**Guidelines:**

- **Small.** If a function needs a scroll to read in full, it's a candidate for splitting. Short functions are easier to name accurately, test, and reuse.
- **Do one thing.** A function that validates, calculates, and saves is doing three things wearing a single-function costume. If you can extract another function with a genuinely different name, the original was doing more than one thing.
- **One level of abstraction per function.** Don't mix `order.total * 0.08` (a low-level detail) with `send_email(...)` (a high-level operation) in the same function — it forces the reader to context-switch between levels constantly.
- **Few arguments.** Zero is ideal, one or two is fine, three should raise an eyebrow, four or more usually means the arguments want to be a single object.
- **No side effects hidden in an innocent-sounding name.** A function called `checkPassword()` that also logs the user in is lying about what it does.
- **Prefer exceptions to error codes.** Returning `-1` or `null` to signal failure pushes error-checking onto every caller and is easy to forget; raising an exception (see the Error Handling sections in the language courses) makes failure impossible to silently ignore.

---

## Comments

The best comment is the one you didn't need to write because the code explained itself. Comments are a last resort for information the code truly cannot express.

```python
# Bad — the comment is just restating the code
# increment i by one
i += 1

# Bad — comment compensates for a bad name instead of fixing it
# d is the elapsed time in days
d = 0

# Good — the name makes the comment unnecessary
elapsed_time_in_days = 0

# Good — this comment explains WHY, which the code can't express on its own
# We retry three times because the upstream payment API has a documented
# 2% transient failure rate under normal load (see incident INC-4021).
for attempt in range(3):
    result = call_payment_api()
```

**When comments genuinely help:**

- **Explaining why, not what.** The code already shows what it does; a comment earns its place by explaining a non-obvious reason.
- **Warning of consequences.** `# Do not remove: downstream service X depends on this exact response shape`.
- **Public API documentation.** Docstrings describing parameters, return values, and exceptions for a function other teams will call, without reading its internals.
- **TODO markers with context.** `# TODO(alice): remove once the v1 API is fully deprecated (tracked in JIRA-1234)` — vague TODOs with no owner or context tend to live forever.

**When comments are a smell:**

- Comments that explain confusing code — fix the code instead.
- Comments repeating what a well-named variable or function already says.
- Commented-out code — delete it; version control remembers it if you ever need it back.
- Comments that go stale — a comment describing behavior that has since changed is worse than no comment, because it actively misleads.

---

## Formatting

Consistent formatting reduces the cognitive overhead of reading code — a reader's eyes learn the rhythm of a codebase and don't have to re-parse structure every time.

```
Vertical formatting:
  Related lines close together, unrelated concepts separated by
  blank lines — like paragraphs in prose.
  Keep files reasonably short; a file doing many unrelated things
  is a sign it should be split.

Horizontal formatting:
  Keep lines short enough to read without scrolling sideways
  (most style guides land on 80-120 characters).
  Use whitespace to show relationships:
    total = price + (price * tax_rate)   # spaces around low-precedence ops
    total = price+price*tax_rate          # harder to scan at a glance
```

The specific rules matter far less than **consistency** — pick a formatter (Prettier, gofmt, Black, rustfmt) and let it settle every argument automatically. Time spent debating tabs vs spaces in code review is time not spent on anything that matters.

---

## The Boy Scout Rule

&gt; "Leave the campground cleaner than you found it."

Applied to code: every time you touch a file, leave it slightly better than you found it. Rename one unclear variable, extract one tangled function, delete one stale comment. This is how codebases improve incrementally instead of requiring a dedicated (and hard to justify) "cleanup sprint."

```
This does NOT mean: rewrite every file you touch.
It means: small, safe, in-scope improvements alongside your actual change.

If you notice a bigger problem, note it (a ticket, a TODO with context)
rather than expanding your current change into an unrelated refactor —
large, mixed-purpose pull requests are hard to review and risky to merge.
```

---

## Tips

- Rename things the moment you find a better name — don't wait for a dedicated pass; renaming is nearly free with modern IDE tooling and pays for itself immediately.
- If you're struggling to name a function well, that's often a signal it's doing more than one thing — try splitting it first, then naming each half.
- Run a formatter automatically on save or as a pre-commit hook — never let formatting be a manual, debatable step.
- Before writing a comment, ask "could I make this unnecessary by renaming or restructuring the code instead?" — reach for a comment only after that answer is genuinely no.
- Delete commented-out code on sight. It has zero value and real cost: it clutters the file and makes readers wonder if it's important.

---

## Summary

- Code is read far more than it's written — every clean code practice optimizes for the reader, including future you.
- Names should reveal intent, avoid disinformation, and be searchable — spend the extra few seconds to get them right.
- Functions should be small, do one thing, operate at one level of abstraction, and take few arguments.
- Comments explain *why*, not *what* — the best comment is often the one you avoided by writing clearer code instead.
- Formatting consistency matters more than the specific rules chosen — automate it with a formatter and stop debating it.
- The boy scout rule: leave every file slightly better than you found it, as a natural side effect of your actual work.
