---
title: "The Modular Monolith"
sidebar_label: "Modular Monolith"
sidebar_position: 11
---

# The Modular Monolith

A monolith doesn't have to mean tangled, unstructured code. A modular monolith applies the same boundary discipline as microservices — clear module boundaries, single-responsibility ownership — while staying a single deployable unit. For most teams, most of the time, this is the right starting point.

---

## What Makes a Monolith "Modular"

```
UNSTRUCTURED MONOLITH ("Big Ball of Mud" — see file 24)
  ┌───────────────────────────────────────────────┐
  │                                               │
  │   Everything can call everything.             │
  │   No enforced boundaries.                     │
  │   Order code reaches directly into Billing's  │
  │   internals; Billing reaches into User's.     │
  │                                               │
  └───────────────────────────────────────────────┘

MODULAR MONOLITH
  ┌───────────────────────────────────────────────┐
  │  ┌──────────┐   ┌───────────┐   ┌─────────┐   │
  │  │  Users   │   │  Orders   │   │Billing  │   │
  │  │  Module  │   │  Module   │   │Module   │   │
  │  │          │   │           │   │         │   │
  │  │ public───┼──>│ public────┼──>│public   │   │
  │  │ API      │   │ API       │   │API      │   │
  │  │          │   │           │   │         │   │
  │  │ internals│   │ internals │   │internals│   │
  │  │ (private)│   │ (private) │   │(private)│   │
  │  └──────────┘   └───────────┘   └─────────┘   │
  │                                               │
  │         ONE deployable process                │
  └───────────────────────────────────────────────┘

Modules communicate ONLY through explicit public interfaces —
never by reaching into another module's internals directly. This is
enforced the same way it would be inside a single microservice's
codebase — the difference is everything still runs in one process,
so calls are simple function calls, not network requests.
```

---

## Enforcing Module Boundaries

The boundaries only provide value if something actually enforces them — "please don't import from another module's internals" as a purely social convention tends to erode over time under deadline pressure.

```go
// Go's package system enforces this at compile time (see the Go course's
// packages-modules page) — this is one of Go's most useful features
// for exactly this purpose

// internal/orders/           <- Orders module
//   order.go                    (contains exported, public API)
//   internal_calculator.go      (package-private helpers)
// internal/billing/          <- Billing module
//   invoice.go

// billing package CANNOT import unexported identifiers from orders —
// the compiler enforces this. Only orders' explicitly exported
// (capitalized) functions/types are reachable from outside the package.
```

```python
# Python has no compiler-enforced privacy, so boundaries are typically
# enforced through:
#   1. Clear directory structure + naming convention (leading underscore
#      signals "internal, do not import from outside this module")
#   2. Linting rules (e.g. import-linter) that FAIL CI if a forbidden
#      cross-module import is detected

# .importlinter config (enforced in CI)
# [importlinter:contract:1]
# name = Orders module must not import Billing internals
# type = forbidden
# source_modules = myapp.orders
# forbidden_modules = myapp.billing.internal
```

```
Whatever the language, the goal is the same: make a boundary violation
either impossible (compiler-enforced, as in Go) or immediately visible
and blocked (linter-enforced in CI, common in Python/JavaScript/Java).
Relying purely on code review discipline to catch every violation,
forever, across a growing team, does not scale.
```

---

## Designing Module Boundaries

The exact same thinking from file 07 (Bounded Contexts) and file 10 (drawing microservice boundaries) applies here — a modular monolith's modules are, in effect, microservice boundaries that haven't been split into separate deployments yet.

```
Each module should:
  Own a specific business capability (Orders, Billing, Inventory —
  not "Utils" or "Helpers," which aren't real capabilities)
  Own its own data — even within one shared physical database, each
  module's tables are conceptually "owned" by that module; other
  modules access that data through the owning module's public API,
  not via a direct query against its tables
  Expose a small, intentional public API — everything else is
  private, hidden implementation detail

A module boundary drawn well here is a module boundary that will
extract cleanly into a real microservice later, if that ever becomes
necessary (see the next section).
```

```python
# orders/api.py — the module's PUBLIC, intentional interface
def create_order(customer_id: str, items: list) -> Order:
    ...

def get_order(order_id: str) -> Order:
    ...

def cancel_order(order_id: str) -> None:
    ...

# orders/_internal/calculator.py — private; not part of the public API,
# not meant to be imported from outside the orders module
def _calculate_tax(subtotal, region):
    ...

def _apply_discount_rules(order, customer):
    ...
```

```python
# billing/service.py — another module, consuming Orders THROUGH its
# public API, never reaching into orders' internals
from orders.api import get_order    # OK — public API
# from orders._internal.calculator import _calculate_tax   # FORBIDDEN —
                                                                # linter blocks this

def generate_invoice(order_id: str):
    order = get_order(order_id)     # goes through Orders' public interface
    ...
```

---

## The Path to Microservices, If You Ever Need It

This is the practical payoff of doing a modular monolith well: extracting a module into a separate service later becomes a mechanical, low-risk operation instead of an archaeological excavation through tangled code.

```
1. Identify a module with a genuine, demonstrated reason to split out
   (see file 09's decision framework — real scaling needs, a team
   that needs independent deployability, etc.) — informed by actual
   operational experience, not a guess made on day one.

2. Because the module already has:
     - a well-defined public API (no other module reaches into its internals)
     - its own conceptually-owned data
   ...the extraction work is largely mechanical:
     - Stand up a new service exposing the SAME public API, now over
       the network (HTTP/gRPC) instead of an in-process function call
     - Migrate the module's data into its own physical database
     - Replace in-process calls to the module's public API with
       network calls to the new service (often behind the SAME
       function signatures, using an adapter — see the Adapter
       pattern, file 06 — so calling code barely changes)

3. The REST of the monolith is unaffected — you're extracting one
   well-bounded piece at a time, not doing a risky big-bang rewrite.

This is precisely why "start with a modular monolith, extract services
later, informed by real needs" is widely considered lower-risk than
starting with microservices from day one (see file 09) — poor module
boundaries are cheap to fix within one codebase; poor SERVICE
boundaries require coordinated cross-team, cross-deployment changes
plus a live data migration to fix.
```

---

## Modular Monolith vs "Just a Monolith"

```
It's worth being explicit that these are not the same thing:

Unstructured monolith:
  Fast to start, but accumulates tangled dependencies over time —
  the "Big Ball of Mud" anti-pattern (file 24) is the natural
  end-state without deliberate boundary discipline.

Modular monolith:
  Requires the SAME upfront design thinking as microservices —
  identifying business capabilities, defining clean public APIs,
  deciding data ownership — WITHOUT paying the operational cost of
  distributed systems (network calls, service discovery, distributed
  transactions) while that cost isn't yet justified.

The "modular" part is not free — it requires real discipline and
design effort. The payoff is a system that's both easier to work in
TODAY (clear boundaries, easier to reason about than an unstructured
monolith) and cheaper to evolve into microservices LATER, if and when
that becomes genuinely necessary.
```

---

## Tips

- Enforce module boundaries with tooling (compiler features in Go/Java, linters in Python/JavaScript) — a boundary that relies purely on developer discipline will erode under deadline pressure, almost without exception.
- Design each module's public API deliberately and keep it small — the smaller and more intentional the public surface, the easier both to reason about the module and to extract it into a service later if needed.
- Give each module conceptual ownership of its own data, even inside one shared physical database — other modules access that data only through the owning module's public functions, never via a direct query against its tables.
- Treat "start with a modular monolith" as a genuinely good default for most teams, most of the time — not merely a stepping stone you're obligated to outgrow.

---

## Summary

- A modular monolith applies microservice-style boundary discipline (single-responsibility modules, explicit public APIs, owned data) while remaining one deployable unit.
- Boundaries must be enforced by tooling (compiler privacy in Go, linters in Python/JS) — social convention alone doesn't hold up over time.
- Module boundaries should follow business capabilities, the same thinking as Bounded Contexts (file 07) and microservice boundaries (file 10).
- A well-bounded module extracts into a real microservice later with mostly mechanical, low-risk work — because it already has a clean public API and conceptually-owned data.
- This is why "modular monolith first, extract services later if genuinely needed" (file 09) is widely considered the lower-risk path compared to starting with microservices before the organizational need is demonstrated.
