---
title: "SOLID Principles"
sidebar_label: "SOLID Principles"
sidebar_position: 2
---

# SOLID Principles

Five design principles for object-oriented code, coined by Robert C. Martin. They aim at the same target from different angles: code that tolerates change without becoming fragile or tangled.

---

## S — Single Responsibility Principle

**A class (or module, or function) should have only one reason to change.**

```python
# Violates SRP — this class has THREE reasons to change:
# a change to invoicing rules, a change to the display format,
# and a change to how invoices are persisted
class Invoice:
    def calculate_total(self):
        ...

    def print_invoice(self):
        ...

    def save_to_database(self):
        ...


# Follows SRP — each class has exactly one reason to change
class Invoice:
    def calculate_total(self):
        ...

class InvoicePrinter:
    def print(self, invoice):
        ...

class InvoiceRepository:
    def save(self, invoice):
        ...
```

Why it matters: when calculation logic, formatting, and persistence are tangled together, a change to how invoices are displayed risks breaking how they're calculated. Splitting them means each class can change independently, and each is small enough to understand fully.

**The trap:** don't take this to the extreme of a class per method. "One reason to change" refers to one *business* responsibility, not one *technical* operation — `Invoice` having both `calculate_total()` and `apply_discount()` is fine, because both belong to the single responsibility of "invoice calculation."

---

## O — Open/Closed Principle

**Software entities should be open for extension, but closed for modification.**

You should be able to add new behavior without editing existing, working, tested code.

```python
# Violates OCP — every new discount type requires editing this function,
# risking existing discount logic every time
def calculate_discount(customer_type, amount):
    if customer_type == "regular":
        return amount * 0.95
    elif customer_type == "premium":
        return amount * 0.90
    elif customer_type == "vip":
        return amount * 0.80
    # adding "wholesale" means editing this function again


# Follows OCP — new discount types are added by creating a new class,
# without touching any existing, working code
from abc import ABC, abstractmethod

class DiscountStrategy(ABC):
    @abstractmethod
    def apply(self, amount):
        ...

class RegularDiscount(DiscountStrategy):
    def apply(self, amount):
        return amount * 0.95

class PremiumDiscount(DiscountStrategy):
    def apply(self, amount):
        return amount * 0.90

class WholesaleDiscount(DiscountStrategy):    # added later, nothing else changed
    def apply(self, amount):
        return amount * 0.70

def calculate_discount(strategy: DiscountStrategy, amount):
    return strategy.apply(amount)
```

Why it matters: existing, tested code is the safest code in your system. Every time you must edit it to add unrelated new behavior, you risk reintroducing a bug that was already fixed. Extension points (interfaces, strategy objects) let new behavior live in new files.

**The trap:** you cannot anticipate every future extension point in advance, and trying to guess leads to premature abstraction (see file 24, Anti-Patterns). Apply OCP where change is *actually* recurring — like discount types that get added every quarter — not speculatively everywhere.

---

## L — Liskov Substitution Principle

**Subtypes must be substitutable for their base types without altering the correctness of the program.**

If `Square` is a subtype of `Rectangle`, any code that works correctly with a `Rectangle` should also work correctly when given a `Square` — without knowing or caring which one it actually received.

```python
# Violates LSP — the classic example
class Rectangle:
    def set_width(self, width):
        self.width = width
    def set_height(self, height):
        self.height = height
    def area(self):
        return self.width * self.height

class Square(Rectangle):
    def set_width(self, width):
        self.width = width
        self.height = width      # forced to keep both sides equal
    def set_height(self, height):
        self.width = height
        self.height = height

def resize(rect: Rectangle):
    rect.set_width(5)
    rect.set_height(4)
    assert rect.area() == 20     # passes for Rectangle, FAILS for Square (area=16)
                                    # because Square secretly changed set_width's behavior
```

The fix here is usually to recognize `Square` and `Rectangle` do not actually have an is-a relationship in terms of *behavior*, only in terms of *shape* — and to model them as separate types, or as both implementing a shared, narrower interface (like `HasArea`) rather than one inheriting from the other.

Why it matters: inheritance implies a promise — "anywhere the parent works, I work the same way." Breaking that promise means callers can no longer trust polymorphism, and every subtype check (`if isinstance(x, Square)`) is a sign LSP has already been violated somewhere.

---

## I — Interface Segregation Principle

**Clients should not be forced to depend on methods they do not use.**

```python
# Violates ISP — a fat interface forces every implementer to support
# operations that may not make sense for them
class Worker(ABC):
    @abstractmethod
    def work(self): ...
    @abstractmethod
    def eat(self): ...
    @abstractmethod
    def sleep(self): ...

class RobotWorker(Worker):
    def work(self):
        ...
    def eat(self):
        raise NotImplementedError("robots don't eat")   # forced, awkward implementation
    def sleep(self):
        raise NotImplementedError("robots don't sleep")


# Follows ISP — small, focused interfaces; implement only what applies
class Workable(ABC):
    @abstractmethod
    def work(self): ...

class Eatable(ABC):
    @abstractmethod
    def eat(self): ...

class Sleepable(ABC):
    @abstractmethod
    def sleep(self): ...

class HumanWorker(Workable, Eatable, Sleepable):
    def work(self): ...
    def eat(self): ...
    def sleep(self): ...

class RobotWorker(Workable):     # only implements what actually applies
    def work(self): ...
```

Why it matters: a fat interface forces unrelated implementers into awkward stub methods (`raise NotImplementedError`) — a strong signal the interface is modeling multiple unrelated responsibilities as one. This is the same insight as the standard library's `io.Reader`/`io.Writer` design covered in the Go course — small, focused interfaces compose better than large ones.

---

## D — Dependency Inversion Principle

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

```python
# Violates DIP — the high-level OrderService is directly coupled to a
# specific low-level detail (MySQL); switching databases means editing
# OrderService itself
class MySQLDatabase:
    def save(self, data):
        ...

class OrderService:
    def __init__(self):
        self.db = MySQLDatabase()      # concrete dependency, hardcoded

    def place_order(self, order):
        self.db.save(order)


# Follows DIP — OrderService depends on an abstraction; the concrete
# implementation is provided from outside (dependency injection)
class Database(ABC):
    @abstractmethod
    def save(self, data): ...

class MySQLDatabase(Database):
    def save(self, data):
        ...

class PostgresDatabase(Database):     # swap databases with zero change to OrderService
    def save(self, data):
        ...

class OrderService:
    def __init__(self, db: Database):     # depends on the abstraction, not the detail
        self.db = db

    def place_order(self, order):
        self.db.save(order)

# Usage — the concrete choice is made at the top level, not buried inside
service = OrderService(db=PostgresDatabase())
```

Why it matters: without DIP, business logic (`OrderService`, the important part) is welded to infrastructure details (`MySQLDatabase`, a replaceable implementation detail). This also makes testing painful — you cannot test `OrderService` without a real database, unless it depends on an abstraction that a test can substitute a fake for.

**Note the naming:** "inversion" refers to inverting the *typical* dependency direction — normally you'd think the high-level `OrderService` depends on `MySQLDatabase`; DIP inverts this so both depend on the `Database` abstraction instead, and the concrete detail depends on (implements) that abstraction too.

---

## How SOLID Principles Work Together

```
SRP  → keeps each piece small and focused
OCP  → lets you add behavior without touching working code
LSP  → makes polymorphism trustworthy
ISP  → keeps interfaces from forcing irrelevant implementations
DIP  → decouples business logic from infrastructure details

In practice, applying one often naturally satisfies another:
  A class with a Single Responsibility (SRP) is easier to keep
  Open for extension (OCP) because it has one clear axis of change.
  Small interfaces from ISP make Liskov substitution (LSP) easier
  to guarantee, because there's less behavior to keep consistent
  across implementations.
```

---

## Tips

- Don't apply SOLID principles preemptively to every class in a small project — they earn their cost in codebases that are large, long-lived, or worked on by many people. A 200-line script doesn't need five abstraction layers.
- If you find yourself writing `raise NotImplementedError` in a subclass, that's often ISP or LSP being violated — the interface or base class is asking for more than this specific type can honestly provide.
- Dependency Inversion is what makes unit testing without a real database/network/filesystem possible — if a class is hard to test in isolation, check whether it's depending on concrete infrastructure instead of an abstraction.
- SOLID is about managing the *cost of change* over a system's lifetime — the upfront cost of an interface or abstraction should be weighed against how likely and how costly a future change actually is.

---

## Summary

- **S**ingle Responsibility: one reason to change per class — keeps classes focused and easy to reason about.
- **O**pen/Closed: add new behavior via extension (new classes), not by editing existing, working code.
- **L**iskov Substitution: subtypes must honor the behavioral contract of their base type — a subtype should never surprise code written against the parent.
- **I**nterface Segregation: many small, focused interfaces beat one large interface that forces irrelevant implementations.
- **D**ependency Inversion: depend on abstractions, not concrete implementations — this is what makes code testable and swappable.
- None of these are absolute rules — apply them where the cost of change is real, not as a checklist for every class you write.
