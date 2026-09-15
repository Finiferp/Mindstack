---
title: "Readable and Maintainable Code"
sidebar_label: "Readable & Maintainable Code"
sidebar_position: 5
---

# Readable and Maintainable Code

This page covers the specific, concrete techniques for keeping cognitive load low — the mental effort required to hold a piece of code in your head while reading it. Lower cognitive load means fewer bugs, faster onboarding, and safer changes.

---

## Cognitive Load — The Core Concept

```
Working memory can hold roughly 4-7 items at once.

Every one of these adds an item you must track while reading code:
  - a nested conditional (if inside if inside if)
  - a variable whose value changes across many lines
  - a function call whose behavior you must remember to understand
    the calling code
  - an abbreviation whose meaning you have to keep re-deriving
  - a boolean flag parameter (true/false — true for WHAT, exactly?)

Code with low cognitive load lets a reader understand a piece of
logic without holding many of these in their head simultaneously.
This is the unifying goal behind nearly every guideline on this page.
```

---

## Cyclomatic Complexity

A concrete, measurable proxy for cognitive load: the number of independent paths through a function. Every `if`, `for`, `while`, `and`, `or`, and `case` adds one.

```python
# Cyclomatic complexity: 5
# (base path + if + elif + elif + and)
def get_shipping_cost(weight, country, is_express):
    if country == "US":
        if is_express:
            return weight * 2.5
        return weight * 1.5
    elif country == "CA":
        return weight * 2.0
    elif weight > 50 and is_express:
        return weight * 4.0
    return weight * 3.0

# This function has 5 different paths a test suite would need to
# cover to reach full branch coverage, and a reader must mentally
# simulate to trust it's correct for a given input.
```

```
General guidance (not a hard rule, but a useful trigger to look closer):
  1-4:   simple, low risk
  5-10:  moderate — still generally fine
  11-20: complex — worth considering a refactor
  20+:   high risk of hidden bugs, hard to test exhaustively, strong
         refactor candidate

Most linters (e.g. golangci-lint's gocyclo, ESLint's complexity rule,
radon for Python) can report this automatically per function — treat
a rising trend as an early warning, not just a one-time check.
```

**Reducing complexity — common techniques:**

```python
# Before — nested conditionals, complexity 5
def get_shipping_cost(weight, country, is_express):
    if country == "US":
        if is_express:
            return weight * 2.5
        return weight * 1.5
    elif country == "CA":
        return weight * 2.0
    elif weight > 50 and is_express:
        return weight * 4.0
    return weight * 3.0

# After — guard clauses (early returns) flatten the nesting,
# and a lookup table replaces the conditional chain entirely
RATES = {
    ("US", True):  2.5,
    ("US", False): 1.5,
    ("CA", True):  2.0,
    ("CA", False): 2.0,
}

def get_shipping_cost(weight, country, is_express):
    if weight > 50 and is_express:
        return weight * 4.0

    rate = RATES.get((country, is_express), 3.0)
    return weight * rate
```

---

## Guard Clauses vs Nested Conditionals

```python
# Nested — reader must hold the outer condition in mind while
# reading everything inside it, several lines deep
def process_payment(user, amount):
    if user is not None:
        if user.is_active:
            if amount > 0:
                if user.balance >= amount:
                    user.balance -= amount
                    return True
                else:
                    return False
            else:
                return False
        else:
            return False
    else:
        return False

# Guard clauses — handle the invalid/edge cases first and exit
# immediately; the "main path" is left unindented and easy to follow
def process_payment(user, amount):
    if user is None:
        return False
    if not user.is_active:
        return False
    if amount <= 0:
        return False
    if user.balance < amount:
        return False

    user.balance -= amount
    return True
```

Guard clauses trade "one exit point" (a rule from some older style guides) for dramatically lower nesting — in most modern style guides, early returns for invalid/edge cases are considered clearer, not a violation of good practice.

---

## Avoid Boolean Flag Parameters

```python
# Unclear at the call site — what does 'true' mean here without
# looking up the function signature?
def create_report(data, True)

# The signature itself doesn't help much more:
def create_report(data, detailed):
    if detailed:
        ...
    else:
        ...

# Better — split into two clearly-named functions
def create_summary_report(data):
    ...

def create_detailed_report(data):
    ...

# Or, if the flag genuinely represents one coherent concept with more
# than two states eventually, use an enum instead of a bare bool —
# it documents itself at every call site
class ReportType(Enum):
    SUMMARY = "summary"
    DETAILED = "detailed"

def create_report(data, report_type: ReportType):
    ...

create_report(data, ReportType.DETAILED)   # self-documenting at the call site
```

---

## Consistent Abstraction Levels

A function reads most easily when every line operates at roughly the same level of detail — mixing "what" (high-level business steps) with "how" (low-level implementation detail) forces constant mental gear-shifting.

```python
# Mixed levels — business steps interleaved with low-level string
# manipulation and raw SQL
def process_signup(email, password):
    if "@" not in email or "." not in email.split("@")[1]:
        raise ValueError("invalid email")
    hashed = hashlib.sha256((password + SALT).encode()).hexdigest()
    cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, hashed)
    )
    conn.commit()
    msg = EmailMessage()
    msg["Subject"] = "Welcome!"
    msg["From"] = "noreply@example.com"
    msg["To"] = email
    smtp.send_message(msg)

# Consistent levels — the top function reads like a table of contents;
# each low-level detail lives in its own well-named function
def process_signup(email, password):
    validate_email(email)
    password_hash = hash_password(password)
    save_user(email, password_hash)
    send_welcome_email(email)

def validate_email(email):
    if "@" not in email or "." not in email.split("@")[1]:
        raise ValueError("invalid email")

def hash_password(password):
    return hashlib.sha256((password + SALT).encode()).hexdigest()

def save_user(email, password_hash):
    cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, password_hash)
    )
    conn.commit()

def send_welcome_email(email):
    msg = EmailMessage()
    msg["Subject"] = "Welcome!"
    msg["From"] = "noreply@example.com"
    msg["To"] = email
    smtp.send_message(msg)
```

Notice the top-level `process_signup` function now reads almost like documentation of the business process — a new team member can understand *what* signup does without needing to understand *how* password hashing or email sending work internally.

---

## Self-Documenting Code vs Comments

The best way to communicate intent is usually through the code's own structure, not a comment layered on top of unclear code (see file 01, Clean Code, for the deeper treatment of comments specifically).

```python
# Requires a comment to explain what the magic numbers mean
def calculate(x):
    return x * 0.0283495   # convert ounces to kilograms

# Self-documenting — no comment needed, the names carry the meaning
OUNCES_TO_KILOGRAMS = 0.0283495

def convert_ounces_to_kilograms(ounces):
    return ounces * OUNCES_TO_KILOGRAMS
```

```python
# Requires mental translation of what this condition actually means
if user.age >= 18 and user.verified and not user.suspended:
    ...

# Self-documenting — the condition's MEANING is named, not just its logic
def is_eligible_to_purchase(user):
    return user.age >= 18 and user.verified and not user.suspended

if is_eligible_to_purchase(user):
    ...
```

---

## The Principle of Least Astonishment

Code should behave the way a reasonable reader would expect, based on its name and the conventions of the language/codebase it lives in. Violating this forces every reader to learn a special case just for your code.

```python
# Astonishing — a function named get_user() shouldn't have the side
# effect of creating a new user if one doesn't exist; "get" implies
# a read-only lookup in virtually every codebase's conventions
def get_user(user_id):
    user = db.find(user_id)
    if user is None:
        user = db.create_default_user(user_id)   # surprising side effect!
    return user

# Matches expectations — the name accurately describes the behavior
def get_or_create_user(user_id):
    user = db.find(user_id)
    if user is None:
        user = db.create_default_user(user_id)
    return user
```

```python
# Astonishing — a sort() method that doesn't sort in place, contrary
# to the convention most languages establish for a method named "sort"
def sort(items):
    return sorted(items)   # returns a NEW list; original 'items' unchanged

items = [3, 1, 2]
sort(items)
print(items)   # still [3, 1, 2] — surprising if the name implied in-place sorting
```

---

## Tips

- Track cyclomatic complexity with a linter and treat a rising trend as an early signal — it's a cheap, objective proxy for "this function is getting hard to hold in your head."
- Guard clauses (early returns for invalid/edge cases) are almost always clearer than deeply nested conditionals — don't hesitate to return early.
- Replace boolean flag parameters with either two separate functions or an enum — a bare `true`/`false` at a call site carries no meaning without looking up the signature.
- Keep each function at one consistent level of abstraction — if a function mixes high-level business steps with low-level implementation details, extract the details into their own well-named functions.
- When you catch yourself writing a comment to explain a magic number or a confusing condition, try naming it instead — a named constant or a well-named boolean function often makes the comment unnecessary.

---

## Summary

- Cognitive load — how much a reader must hold in their head at once — is the unifying concern behind nearly every readability guideline.
- Cyclomatic complexity gives a concrete, linter-trackable proxy for cognitive load; guard clauses and lookup tables are common ways to reduce it.
- Prefer guard clauses (early returns) over deeply nested conditionals for handling edge cases.
- Avoid bare boolean flag parameters — they're meaningless at the call site; use two functions or an enum instead.
- Keep each function at one consistent level of abstraction — high-level orchestration separate from low-level implementation detail.
- Favor self-documenting code (well-named variables, functions, and constants) over comments layered on top of unclear code.
- The Principle of Least Astonishment: code should behave the way its name and your language's conventions lead a reader to expect.
