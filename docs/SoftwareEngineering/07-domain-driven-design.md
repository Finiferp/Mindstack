---
title: "Domain-Driven Design"
sidebar_label: "Domain-Driven Design"
sidebar_position: 7
---

# Domain-Driven Design

Domain-Driven Design (DDD) is an approach to building software that models the actual business domain closely, using the language domain experts already use. It's especially valuable for complex business logic — less so for simple CRUD applications.

---

## The Core Idea

```
Most software failures aren't caused by bad code — they're caused by
a MISMATCH between what the business actually needs and what the
software models. DDD's central goal is closing that gap by building
the software's structure directly around the business domain, using
the business's own vocabulary.

Traditional approach:
  Business talks in terms of "orders," "fulfillment," "backorders"
  Code talks in terms of "records," "rows," "status flags"
  Every conversation between business and engineering requires translation,
  and every translation is a chance to introduce a misunderstanding.

DDD approach:
  Code uses the SAME words the business uses, structured the way the
  business actually thinks about the problem — reducing translation
  loss to nearly zero.
```

---

## Ubiquitous Language

A shared vocabulary, used consistently by domain experts AND in the code itself — variable names, class names, and function names all use these exact terms.

```python
# Without ubiquitous language — generic, technical terms that require
# a domain expert to "translate" every time they read the code
class Record:
    def update_status(self, new_status):
        ...

class Manager:
    def process(self, record):
        ...

# With ubiquitous language — if the business calls it a "Shipment"
# that gets "Dispatched," the code says exactly that
class Shipment:
    def dispatch(self):
        ...

class FulfillmentService:
    def process_shipment(self, shipment: Shipment):
        ...
```

**In practice:** the ubiquitous language is built collaboratively, in conversation with domain experts (not decided unilaterally by engineers) — and it's expected to evolve as understanding of the domain deepens. When the business's own terminology changes, the code's naming should follow.

---

## Bounded Contexts

A large domain is rarely uniform — the same word can mean genuinely different things in different parts of the business. A Bounded Context is an explicit boundary within which a specific model and its ubiquitous language apply consistently.

```
Example: an e-commerce company has an "Order" that means different
things in different parts of the system:

  Sales Context:
    Order = a customer's intent to purchase — has pricing, discounts,
    promotions applied

  Warehouse/Fulfillment Context:
    Order = a set of physical items to pick, pack, and ship — has
    bin locations, packing instructions, no concept of "discount"

  Billing Context:
    Order = a set of line items to invoice — has tax jurisdictions,
    payment terms, no concept of "bin location"

Trying to build ONE "Order" class that serves all three contexts
either bloats into a God Object (see file 03) trying to hold every
concern, or forces contexts to share fields that don't actually mean
the same thing to each of them.

DDD's answer: each Bounded Context gets its OWN model of "Order,"
tailored to what that context actually needs. They're connected via
explicit translation at the boundaries (an integration/anti-corruption
layer), not by sharing one class across contexts.
```

```python
# Sales context — its own Order model
@dataclass
class SalesOrder:
    customer_id: str
    line_items: list
    discount_applied: float
    promotion_code: str | None

# Fulfillment context — a DIFFERENT Order model, same real-world
# concept, different concerns
@dataclass
class FulfillmentOrder:
    order_reference: str          # links back to the Sales context
    items_to_pick: list
    warehouse_bin_locations: dict
    packing_instructions: str

# Explicit translation at the boundary — an anti-corruption layer,
# so a change in one context's model doesn't ripple uncontrolled
# into the other
def sales_order_to_fulfillment_order(sales_order: SalesOrder) -> FulfillmentOrder:
    return FulfillmentOrder(
        order_reference=sales_order.customer_id,
        items_to_pick=[item.sku for item in sales_order.line_items],
        warehouse_bin_locations={},
        packing_instructions="",
    )
```

This is the DDD concept that most directly informs microservice boundaries (see file 09 and file 10) — a well-chosen Bounded Context often becomes a natural boundary for a separate service, because it already has its own model and its own language.

---

## Entities vs Value Objects

Two fundamentally different kinds of domain objects, distinguished by whether identity matters.

### Entities — Defined by Identity

An Entity is defined by a persistent identity that continues even as its attributes change over time.

```python
class Customer:
    def __init__(self, customer_id: str, name: str, email: str):
        self.customer_id = customer_id   # identity — this is what makes
        self.name = name                    # two Customers "the same" or not
        self.email = email

    def __eq__(self, other):
        # Equality is based on IDENTITY, not on matching attribute values
        return isinstance(other, Customer) and self.customer_id == other.customer_id

# Even if name and email both change, this is still "the same customer"
# because customer_id — the identity — hasn't changed
customer = Customer("CUST-001", "Alice", "alice@old-email.com")
customer.email = "alice@new-email.com"
# Still the same Customer, by identity, despite the attribute change
```

### Value Objects — Defined by Value

A Value Object has no identity of its own — two Value Objects with the same attributes ARE the same, interchangeably. Value Objects should generally be immutable.

```python
class Money:
    def __init__(self, amount: float, currency: str):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        # Equality is based on VALUE, not identity
        return (
            isinstance(other, Money)
            and self.amount == other.amount
            and self.currency == other.currency
        )

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("currency mismatch")
        return Money(self.amount + other.amount, self.currency)   # returns a NEW
                                                                       # instance — immutable

price1 = Money(19.99, "USD")
price2 = Money(19.99, "USD")
print(price1 == price2)   # True — same value, fully interchangeable,
                             # even though they're different Python objects
```

```
Quick test: "if I have two of these with identical attributes, are
they the same thing, or two DIFFERENT things that happen to look alike?"

  Two Customer records with identical name/email → still TWO different
  customers (maybe a father and son with the same name) → Entity

  Two $19.99 USD amounts → completely interchangeable, no meaningful
  difference → Value Object

Common Value Objects in real domains: Money, Address, DateRange,
Email, PhoneNumber, Coordinates — anything defined entirely by its
attributes, with no independent identity or lifecycle of its own.
```

---

## Aggregates

An Aggregate is a cluster of related Entities and Value Objects treated as a single unit for the purpose of data changes, with one designated **Aggregate Root** controlling access to everything inside.

```python
# The Order is the Aggregate Root — external code interacts with the
# Order, never directly with OrderLine objects inside it
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self._lines: list[OrderLine] = []      # internal — not exposed directly
        self._status = "draft"

    def add_line(self, product_id: str, quantity: int, unit_price: Money):
        if self._status != "draft":
            raise ValueError("cannot modify a submitted order")
        self._lines.append(OrderLine(product_id, quantity, unit_price))

    def submit(self):
        if not self._lines:
            raise ValueError("cannot submit an empty order")
        self._status = "submitted"

    def total(self) -> Money:
        total = Money(0, "USD")
        for line in self._lines:
            total = total.add(line.subtotal())
        return total

class OrderLine:                                  # NOT an Aggregate Root —
    def __init__(self, product_id, quantity, unit_price: Money):   # only reachable
        self.product_id = product_id                                 # through Order
        self.quantity = quantity
        self.unit_price = unit_price

    def subtotal(self) -> Money:
        return Money(self.unit_price.amount * self.quantity, self.unit_price.currency)

# External code NEVER does this:
#   order._lines.append(OrderLine(...))     # bypasses Order's business rules!
# It always goes through the Aggregate Root:
order.add_line("SKU-123", 2, Money(9.99, "USD"))
```

Why this matters: the Aggregate Root is the single place business rules and invariants are enforced (like "cannot modify a submitted order" above). If external code could reach into `_lines` directly, that invariant could be silently violated from anywhere in the codebase. This is also the natural transaction boundary — in most systems, one Aggregate is saved/loaded as a single atomic unit.

---

## Domain Services

Some operations don't naturally belong to a single Entity or Value Object — they involve coordination across multiple domain objects. These live in a Domain Service.

```python
# This operation doesn't naturally belong to Order OR Inventory alone —
# it coordinates between them
class OrderFulfillmentService:
    def __init__(self, inventory_repository, order_repository):
        self.inventory_repo = inventory_repository
        self.order_repo = order_repository

    def fulfill(self, order: Order):
        for line in order.lines:
            available = self.inventory_repo.check_stock(line.product_id)
            if available < line.quantity:
                raise InsufficientStockError(line.product_id)

        for line in order.lines:
            self.inventory_repo.reserve_stock(line.product_id, line.quantity)

        order.mark_fulfilled()
        self.order_repo.save(order)
```

A Domain Service is different from the Application/Infrastructure Services covered elsewhere in this course (like `UserService` in the Echo course's database page) — a Domain Service specifically encapsulates *business logic* that spans multiple domain objects, not application orchestration or infrastructure plumbing.

---

## When DDD Is (and Isn't) Worth It

```
DDD's tactical patterns (Entities, Value Objects, Aggregates) add real
structural overhead — more classes, more explicit boundaries, more
upfront design conversation with domain experts.

Worth it when:
  The business domain has genuinely complex rules and behavior
  (insurance underwriting, financial trading, supply chain logistics,
  healthcare — anywhere "the business logic IS the hard part")
  Multiple teams need to work in the same domain without constantly
  colliding over an ambiguous shared model
  The domain is expected to evolve significantly over the project's
  life, and getting the model right matters for long-term maintainability

Overkill when:
  The application is largely CRUD — create, read, update, delete a
  record, with little genuine business logic beyond simple validation
  A small team, well-understood problem, short expected lifetime
  You'd spend more time designing Bounded Contexts than the entire
  business logic actually contains

This is the same YAGNI/KISS judgment call from file 04, applied
specifically to domain modeling — DDD's ceremony should be justified
by genuine domain complexity, not applied as a default starting point
for every project.
```

---

## Tips

- Build the ubiquitous language WITH domain experts, in conversation — don't invent terminology unilaterally as an engineer and hope it matches how the business actually thinks.
- The Entity vs Value Object test is simple and reliable: "if two of these have identical attributes, are they the same thing or two different things?" — identity means Entity, pure value means Value Object.
- Keep Value Objects immutable — operations return a new instance rather than mutating in place, which eliminates a whole class of subtle bugs from shared mutable state.
- External code should only ever modify an Aggregate through its Root — if you find yourself reaching into an Aggregate's internals directly, that's a sign an invariant is at risk of being silently violated somewhere.
- Don't reach for full DDD ceremony on a simple CRUD app — match the investment in domain modeling to the actual complexity of the business rules involved.

---

## Summary

- DDD closes the gap between business understanding and code structure by modeling the domain directly, using the business's own vocabulary (the ubiquitous language).
- Bounded Contexts acknowledge that the same term can mean different things in different parts of a large system — each context gets its own tailored model, connected via explicit translation at the boundaries.
- Entities are defined by identity (persists through attribute changes); Value Objects are defined by value (interchangeable if attributes match) and should be immutable.
- Aggregates cluster related Entities/Value Objects under a single Aggregate Root, which enforces business invariants and serves as the natural transaction boundary.
- Domain Services hold business logic that spans multiple domain objects and doesn't naturally belong to any single one.
- DDD's structural ceremony is worth its cost for genuinely complex business domains — it's overkill for simple CRUD applications; match the investment to actual domain complexity.
