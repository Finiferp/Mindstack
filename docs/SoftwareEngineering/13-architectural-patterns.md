---
title: "Architectural Patterns"
sidebar_label: "Architectural Patterns"
sidebar_position: 13
---

# Architectural Patterns

How code is organized WITHIN a single application (monolith or individual microservice) — layered architecture, hexagonal/clean architecture, and MVC. These patterns answer "where does this piece of logic live?"

---

## Layered Architecture

The most common, traditional way to organize an application — code is grouped into horizontal layers, each depending only on the layer directly below it.

```
   ┌─────────────────────────────────┐
   │      Presentation Layer         │   HTTP handlers, CLI commands,
   │      (controllers, views)       │   API endpoints
   └────────────────┬────────────────┘
                     │ depends on
                     ▼
   ┌─────────────────────────────────┐
   │      Business Logic Layer       │   core rules, calculations,
   │      (services, domain logic)   │   validation
   └────────────────┬────────────────┘
                     │ depends on
                     ▼
   ┌─────────────────────────────────┐
   │      Data Access Layer          │   repositories, database
   │      (repositories, ORM)        │   queries
   └────────────────┬────────────────┘
                     │ depends on
                     ▼
   ┌─────────────────────────────────┐
   │      Database                   │
   └─────────────────────────────────┘
```

```python
# Presentation layer — knows about HTTP, delegates immediately
@app.post("/orders")
def create_order_endpoint(request):
    order = order_service.create_order(request.customer_id, request.items)
    return {"id": order.id}, 201

# Business logic layer — knows about business rules, nothing about HTTP
class OrderService:
    def __init__(self, order_repository):
        self.repo = order_repository

    def create_order(self, customer_id, items):
        if not items:
            raise ValueError("order must have at least one item")
        order = Order(customer_id=customer_id, items=items)
        self.repo.save(order)
        return order

# Data access layer — knows about the database, nothing about business rules
class OrderRepository:
    def save(self, order):
        db.execute("INSERT INTO orders ...", order.to_row())
```

**Strength:** simple, familiar, easy to explain to a new team member — "presentation calls business logic, business logic calls data access" is intuitive.

**Weakness:** the business logic layer often ends up depending on the data access layer directly (as in the example above — `OrderService` takes an `OrderRepository`), which subtly couples core business rules to a specific persistence technology. Testing business logic in isolation requires either a real database or a mock of the repository — workable, but it's the seed of the problem hexagonal architecture addresses more deliberately.

---

## Hexagonal Architecture (Ports and Adapters)

Also called Clean Architecture or Onion Architecture in various forms — the core idea is the same: **business logic sits at the center, depending on nothing external; everything external depends on it, never the other way around.**

```
                  ┌────────────────────────────┐
                  │                            │
      HTTP    ───>│                            │<───    Database
   Adapter        │                            │         Adapter
                  │        Business Logic      │
      CLI     ───>│           (Domain)         │<───    Message Queue
   Adapter        │                            │         Adapter
                  │                            │
      Tests   ───>│                            │<───    External API
   (as adapter)    │                           │         Adapter
                  └────────────────────────────┘
                     ▲                     ▲
                     │                     │
                  Port (interface)    Port (interface)
                  defined BY the      defined BY the
                  business logic      business logic

The business logic defines PORTS (interfaces) describing what it
needs — "something that can save an order," "something that can send
a notification" — WITHOUT knowing or caring what actually implements
them. ADAPTERS (concrete implementations: a PostgreSQL adapter, an
email adapter, a mock-for-testing adapter) plug into those ports from
the outside.
```

```python
# The business logic (domain) layer defines the PORT (interface) it
# needs — this file has ZERO knowledge of PostgreSQL, HTTP, or anything
# external. This is Dependency Inversion (file 02) applied at the
# architecture level.

class OrderRepositoryPort(ABC):
    @abstractmethod
    def save(self, order: Order) -> None: ...
    @abstractmethod
    def find_by_id(self, order_id: str) -> Order: ...

class OrderService:                       # pure business logic — no
    def __init__(self, repo: OrderRepositoryPort):  # framework, no database,
        self.repo = repo                              # no HTTP knowledge at all

    def create_order(self, customer_id, items):
        if not items:
            raise ValueError("order must have at least one item")
        order = Order(customer_id=customer_id, items=items)
        self.repo.save(order)
        return order


# An ADAPTER — a concrete implementation of the port, living OUTSIDE
# the business logic, depending ON it (not the other way around)
class PostgresOrderRepository(OrderRepositoryPort):
    def save(self, order: Order) -> None:
        db.execute("INSERT INTO orders ...", order.to_row())
    def find_by_id(self, order_id: str) -> Order:
        row = db.query("SELECT * FROM orders WHERE id = ?", order_id)
        return Order.from_row(row)


# A DIFFERENT adapter — for testing, with zero database needed at all
class InMemoryOrderRepository(OrderRepositoryPort):
    def __init__(self):
        self._orders = {}
    def save(self, order: Order) -> None:
        self._orders[order.id] = order
    def find_by_id(self, order_id: str) -> Order:
        return self._orders[order_id]


# Wiring — decided at the application's entry point, not inside the
# business logic itself
service = OrderService(repo=PostgresOrderRepository())      # production
test_service = OrderService(repo=InMemoryOrderRepository())   # tests, instant, no DB
```

**Strength:** business logic can be tested completely in isolation, with zero real infrastructure (no database, no HTTP server) — tests run fast and don't need complex setup/teardown. Swapping infrastructure (PostgreSQL to MongoDB, REST to gRPC) touches only adapters, never the business logic itself.

**Weakness:** genuinely more upfront structure and more files (interfaces plus implementations) than a straightforward layered approach — worth it for complex business logic with a long expected lifetime; can feel like overhead for a simple CRUD service with little real business logic to protect.

---

## MVC (Model-View-Controller)

Primarily an organizing pattern for applications with a user interface — separates data (Model), presentation (View), and the logic connecting them (Controller).

```
        User Input
             │
             ▼
      ┌──────────────┐
      │  Controller  │   receives input, decides what should happen,
      └──────┬───────┘   updates the Model, selects a View
             │
      ┌──────┴────────┐
      ▼               ▼
 ┌─────────┐    ┌──────────┐
 │  Model  │    │  View    │
 │ (data,  │    │(renders  │
 │  state) │    │  output) │
 └─────────┘    └──────────┘
```

```python
# Model — data and business rules, no knowledge of HTTP or rendering
class Order:
    def __init__(self, items):
        self.items = items
    def total(self):
        return sum(item.price for item in self.items)

# Controller — handles the request, coordinates Model and View
def order_detail_controller(request, order_id):
    order = Order.find(order_id)          # talks to the Model
    return render_template("order_detail.html", order=order)   # picks a View

# View — presentation only (a template file, in most frameworks)
# order_detail.html:
#   <h1>Order Total: {{ order.total() }}</h1>
```

**Where MVC fits today:** classic MVC (as originally described) referred to desktop GUI applications, and most modern web frameworks (Django, Rails, Laravel, Spring MVC) use variations that don't map perfectly onto the original three roles — but the core separation (data / presentation / coordinating logic) remains genuinely useful, and the vocabulary is still the industry-standard shorthand for this kind of separation. For pure backend APIs with no rendered UI, MVC's "View" concept often just becomes "serialize this data as JSON" — the Model and Controller roles still apply meaningfully.

---

## Choosing an Architectural Pattern

```
Layered architecture:
  Default choice for most applications — simple to understand,
  works well when business logic is straightforward, and the team
  is comfortable with the minor coupling between business logic and
  data access it implies.

Hexagonal/Clean Architecture:
  Worth the extra structure when business logic is GENUINELY complex
  and long-lived (echoing the DDD guidance from file 07 — this pattern
  and DDD are frequently used together), or when you know infrastructure
  choices (which database, which message queue) may change over the
  system's life and you want that change to be cheap and localized.

MVC:
  The natural fit for anything with a user-facing view layer to
  render — web applications with server-rendered templates, desktop/
  mobile GUI applications. Less directly applicable to a pure JSON API
  with no rendering step, though the underlying separation of concerns
  still has value there too.

These patterns are not mutually exclusive within one system — a web
application might use MVC for its presentation layer, WHILE the
Controller delegates to business logic organized using hexagonal
principles underneath. Patterns compose at different levels of the
same system.
```

---

## Tips

- Default to a simple layered architecture unless you have a specific reason (genuinely complex business logic, expected infrastructure changes, a strong testing requirement) to invest in hexagonal architecture's extra structure.
- The core test for whether your business logic is properly isolated: can you write a unit test for it WITHOUT starting a real database or web server? If not, infrastructure concerns have leaked into the business logic layer.
- MVC's "Controller should be thin" is the same idea as "keep handlers thin" from the Echo framework course — a controller/handler should coordinate, not contain business logic itself.
- These patterns can and do compose — don't treat choosing one as mutually exclusive with using ideas from another at a different level of the same application.

---

## Summary

- Layered architecture organizes code into horizontal layers (presentation, business logic, data access), each depending on the one below — simple and familiar, with some coupling between business logic and data access.
- Hexagonal/Clean Architecture inverts that dependency: business logic defines interfaces (ports) it needs, and external infrastructure (databases, APIs) provides adapters that implement them — enabling fully isolated testing and cheap infrastructure swaps.
- MVC separates data (Model), presentation (View), and coordinating logic (Controller) — the natural fit for applications with a rendered UI, and the vocabulary remains standard shorthand even in API-only backends.
- Choose based on the actual complexity and expected lifetime of the business logic involved — layered architecture as the default, hexagonal architecture when isolation and infrastructure flexibility genuinely matter.
- These patterns compose — a real system often applies more than one, at different levels, simultaneously.
