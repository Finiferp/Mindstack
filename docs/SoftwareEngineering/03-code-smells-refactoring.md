---
title: "Code Smells and Refactoring"
sidebar_label: "Code Smells & Refactoring"
sidebar_position: 3
---

# Code Smells and Refactoring

A code smell is a surface-level indicator that something deeper might be wrong — not a bug, but a sign the design could be resisting change. Refactoring is the disciplined process of improving structure without changing behavior.

---

## What Refactoring Is (and Isn't)

```
Refactoring IS:
  Changing the internal structure of code without changing what
  it does from the outside — same inputs, same outputs, same behavior,
  every step verified by tests.

Refactoring IS NOT:
  Rewriting a feature from scratch.
  Fixing a bug (that's a bug fix, a different activity with different risk).
  Adding new functionality (that's feature work — keep it in a separate
  commit/PR from a refactor, so each can be reviewed and reverted independently).

The golden rule: refactor in small, safe steps, running tests after
each one. If a step breaks a test, you know exactly which tiny change
caused it — because you only changed one thing.
```

---

## Common Code Smells

### Long Function

A function that's grown to do too much, usually accumulated one small addition at a time.

```python
# Smell — dozens of lines mixing validation, calculation, formatting, and I/O
def generate_report(orders):
    valid_orders = []
    for o in orders:
        if o.total > 0 and o.customer_id is not None:
            valid_orders.append(o)
    total_revenue = 0
    for o in valid_orders:
        total_revenue += o.total
    average = total_revenue / len(valid_orders) if valid_orders else 0
    lines = []
    lines.append(f"Total Revenue: ${total_revenue:.2f}")
    lines.append(f"Average Order: ${average:.2f}")
    lines.append(f"Order Count: {len(valid_orders)}")
    report_text = "\n".join(lines)
    with open("report.txt", "w") as f:
        f.write(report_text)
    return report_text

# Refactored — Extract Function applied repeatedly; each piece is
# independently readable, testable, and reusable
def filter_valid_orders(orders):
    return [o for o in orders if o.total > 0 and o.customer_id is not None]

def calculate_statistics(orders):
    total = sum(o.total for o in orders)
    average = total / len(orders) if orders else 0
    return {"total": total, "average": average, "count": len(orders)}

def format_report(stats):
    return (
        f"Total Revenue: ${stats['total']:.2f}\n"
        f"Average Order: ${stats['average']:.2f}\n"
        f"Order Count: {stats['count']}"
    )

def generate_report(orders):
    valid_orders = filter_valid_orders(orders)
    stats = calculate_statistics(valid_orders)
    report_text = format_report(stats)
    write_report_to_file(report_text)
    return report_text
```

**Refactoring technique: Extract Function.** Pull a cohesive chunk of logic into its own well-named function. This is the single most common and highest-value refactoring — it improves readability, testability, and reuse in one move.

### Duplicated Code

```python
# Smell — the same validation logic copy-pasted in two places, now two
# places to remember to update if the rule ever changes
def create_user(email, age):
    if "@" not in email:
        raise ValueError("invalid email")
    if age < 0 or age > 150:
        raise ValueError("invalid age")
    ...

def update_user(user_id, email, age):
    if "@" not in email:
        raise ValueError("invalid email")
    if age < 0 or age > 150:
        raise ValueError("invalid age")
    ...

# Refactored — Extract Function, single source of truth for the rule
def validate_user_input(email, age):
    if "@" not in email:
        raise ValueError("invalid email")
    if age < 0 or age > 150:
        raise ValueError("invalid age")

def create_user(email, age):
    validate_user_input(email, age)
    ...

def update_user(user_id, email, age):
    validate_user_input(email, age)
    ...
```

### Large Class / God Object

A class that has grown to know about or do far too much — often a sign multiple Single Responsibilities (see file 02) got merged into one class over time.

```python
# Smell — one class handling user data, authentication, email sending,
# and report generation
class UserManager:
    def create_user(self): ...
    def delete_user(self): ...
    def authenticate(self): ...
    def hash_password(self): ...
    def send_welcome_email(self): ...
    def send_password_reset_email(self): ...
    def generate_activity_report(self): ...
    def export_users_to_csv(self): ...

# Refactored — Extract Class, one responsibility per class
class UserRepository:
    def create_user(self): ...
    def delete_user(self): ...

class AuthService:
    def authenticate(self): ...
    def hash_password(self): ...

class EmailService:
    def send_welcome_email(self): ...
    def send_password_reset_email(self): ...

class UserReportGenerator:
    def generate_activity_report(self): ...
    def export_users_to_csv(self): ...
```

**Refactoring technique: Extract Class.** When a class has clusters of methods and fields that only interact with each other (not the rest of the class), that cluster wants to be its own class.

### Long Parameter List

```python
# Smell — five positional parameters; easy to pass them in the wrong
# order without any error, and hard to call without checking the signature
def create_shipment(street, city, state, zip_code, country, weight, express):
    ...

# Refactored — Introduce Parameter Object; groups related data,
# self-documents at the call site, and makes adding a field non-breaking
@dataclass
class Address:
    street: str
    city: str
    state: str
    zip_code: str
    country: str

def create_shipment(address: Address, weight: float, express: bool = False):
    ...
```

### Feature Envy

A method that's more interested in another object's data than its own — a sign it's living in the wrong class.

```python
# Smell — OrderPrinter reaches into Order's internals repeatedly;
# it "envies" Order's data more than it uses its own
class OrderPrinter:
    def print_summary(self, order):
        total = order.subtotal + order.tax - order.discount
        print(f"{order.customer_name}: ${total:.2f} ({order.item_count} items)")

# Refactored — Move Method; the logic belongs where the data lives
class Order:
    def total(self):
        return self.subtotal + self.tax - self.discount

    def summary(self):
        return f"{self.customer_name}: ${self.total():.2f} ({self.item_count} items)"

class OrderPrinter:
    def print_summary(self, order):
        print(order.summary())
```

### Primitive Obsession

Using primitive types (strings, numbers) to represent concepts that deserve their own type, losing validation and meaning along the way.

```python
# Smell — email is "just a string"; nothing stops garbage from being
# passed everywhere an email is expected
def send_email(to: str, subject: str, body: str):
    ...

send_email("not an email at all", "Hi", "...")   # no error until it actually fails to send

# Refactored — Introduce a small value type that validates itself
class Email:
    def __init__(self, address: str):
        if "@" not in address:
            raise ValueError(f"invalid email: {address}")
        self.address = address

    def __str__(self):
        return self.address

def send_email(to: Email, subject: str, body: str):
    ...

send_email(Email("not an email at all"), "Hi", "...")   # fails immediately, at construction
```

### Shotgun Surgery

The opposite problem from Duplicated Code: making one conceptual change requires editing many different files/classes, because related logic is scattered instead of grouped.

```
Smell: adding a new payment method requires editing:
  - PaymentValidator (add validation rule)
  - PaymentProcessor (add processing logic)
  - InvoiceGenerator (add display formatting)
  - AnalyticsTracker (add tracking event)
  - AdminDashboard (add filter option)

Five files for one conceptual change is a sign responsibilities that
belong together (everything about "how do we handle payment method X")
are scattered across the codebase instead of co-located.

Refactoring approach: consolidate related logic — often by introducing
a PaymentMethod class/interface (see file 06, Design Patterns — Strategy)
so that adding a new payment method means implementing ONE new class
that owns all its own behavior, not touching five unrelated files.
```

---

## The Refactoring Process

```
1. Ensure you have tests covering the behavior you're about to touch.
   No tests? Write characterization tests first (tests that document
   CURRENT behavior, even if that behavior is itself questionable) —
   see file 22, Legacy Code, for this in depth.

2. Make ONE small structural change.
   Extract a function, rename a variable, move a method — one step.

3. Run the tests.
   Green: commit (or at least checkpoint) this safe step.
   Red: you know exactly what caused it — undo or fix immediately.

4. Repeat.
   Large refactorings are a sequence of small, verified, reversible
   steps — not one enormous, risky rewrite.
```

---

## Tips

- Refactor in a separate commit (or even separate PR) from feature work — mixing "I restructured this" with "I also added a new feature" makes both harder to review and harder to revert independently if something goes wrong.
- If code has no tests, resist the urge to refactor freely — write a safety net of characterization tests first, or you're refactoring blind.
- Most refactorings are small, well-known, named operations (Extract Function, Extract Class, Move Method, Introduce Parameter Object) — learning their names makes it much easier to recognize the right one to apply and to discuss them with teammates.
- A smell is a symptom, not a verdict — sometimes a "long function" is genuinely one cohesive sequential process and splitting it would hurt readability more than help. Use judgment, not a checklist.

---

## Summary

- Refactoring changes structure without changing behavior, verified by tests at every small step — never mix it with feature work in the same change.
- Long Function → Extract Function; Duplicated Code → Extract Function (shared); Large Class → Extract Class; Long Parameter List → Introduce Parameter Object.
- Feature Envy signals logic living in the wrong class — Move Method relocates it to where the data actually lives.
- Primitive Obsession replaces "just a string/number" with a small type that validates and carries meaning.
- Shotgun Surgery (one change touching many files) signals scattered responsibilities that want consolidating into one place.
- Refactor in small, reversible, test-verified steps — that discipline is what makes large-scale refactoring safe instead of risky.
