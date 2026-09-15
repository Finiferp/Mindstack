---
title: "Microservices Deep Dive"
sidebar_label: "Microservices Deep Dive"
sidebar_position: 10
---

# Microservices Deep Dive

Once you've decided microservices genuinely fit your situation (see file 09), this page covers the practical questions: how to draw service boundaries, how services should communicate, who owns what data, and how to handle transactions that span multiple services.

---

## Drawing Service Boundaries

The single hardest and most consequential decision in a microservices architecture — a wrong boundary is expensive to fix later, because it requires coordinated changes across teams and services, plus a data migration.

```
Bad boundary: technical layers
  A "Database Service," a "Business Logic Service," a "API Service"
  This creates a distributed monolith — every request still has to
  touch all three services in sequence, but now over the network
  instead of in-process. You get all the cost of microservices with
  none of the independent-deployability benefit.

Good boundary: business capabilities (this maps directly onto
Bounded Contexts from file 07, Domain-Driven Design)
  A "User Service" (owns identity, authentication, profile)
  An "Order Service" (owns order lifecycle, line items)
  A "Billing Service" (owns invoicing, payment processing)

  Each service can be deployed, scaled, and understood independently,
  because each owns a complete, coherent slice of business capability —
  not a horizontal slice of technical layers.
```

```
A useful heuristic: "does this service's team need to talk to
another team to ship a typical change?"

  If shipping a change to the Order Service usually requires the
  Billing team's involvement too, the boundary is probably drawn
  in the wrong place — Order and Billing might need to be one
  service, or the specific piece causing the coupling needs to move.
```

---

## Service Communication Patterns

### Synchronous — Request/Response

```
   Order Service                    Inventory Service
        │                                    │
        │  ── POST /reserve-stock ────────>  │
        │                                    │  (processes request)
        │  <── 200 OK { reserved: true } ──  │
        │                                    │

The caller waits for a response before continuing.
```

**Use when:** the caller genuinely needs an immediate answer before it can proceed (e.g. "is this item in stock?" must be answered before checkout can continue).

**Cost:** the caller is now coupled to the callee's availability — if the Inventory Service is down or slow, the Order Service's request is blocked too. This chains failure: a slow downstream service makes every upstream caller slow (or failing) as well.

### Asynchronous — Messaging / Events

```
   Order Service              Message Queue           Inventory Service
        │                          │                           │
        │ ── publish ────────────> │                           │
        │   "OrderPlaced"          │                           │
        │                          │ ── deliver ─────────────> │
        │                          │    "OrderPlaced"          │  (processes,
        │                          │                           │   eventually)
        │  (continues immediately, doesn't wait for Inventory)

The publisher doesn't wait for the consumer to process the message.
```

**Use when:** the caller doesn't need an immediate response, and can tolerate the downstream effect happening slightly later ("eventually consistent" — see file 17). Order placement doesn't need to wait for the warehouse notification email to actually be sent.

**Benefit:** decouples the services' availability — if the Inventory Service is temporarily down, messages queue up and get processed once it's back, rather than the Order Service's request failing outright.

**Cost:** genuine added complexity — you now need message infrastructure (a queue/broker, see file 12), and reasoning about system behavior requires thinking in terms of eventual consistency rather than immediate consistency.

```
Practical guideline: use synchronous calls for "I need this answer
right now to proceed" (checking stock before confirming an order).
Use asynchronous messaging for "this needs to happen, but not
necessarily before I respond to the user" (sending a confirmation
email, updating analytics, notifying a downstream reporting system).
```

---

## Data Ownership

**Each service should own its own data exclusively — no other service should read from or write to it directly.**

```
Anti-pattern: shared database
  ┌────────────┐   ┌────────────┐   ┌────────────┐
  │  Order     │   │ Inventory  │   │ Billing    │
  │  Service   │   │  Service   │   │ Service    │
  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
        │                │                │
        └────────────────┴────────────────┘
                          │
                    ┌────────────┐
                    │  Shared    │
                    │ Database   │
                    └────────────┘

  This looks like microservices but behaves like a monolith with
  extra network hops — a schema change for Billing can silently break
  Order Service if it happens to read the same table. Services are
  NOT actually independently deployable, because they share a data
  contract none of them fully controls alone.

Correct pattern: database per service
  ┌──────────┐   ┌────────────┐   ┌────────────┐
  │  Order   │   │ Inventory  │   │ Billing    │
  │  Service │   │  Service   │   │ Service    │
  │ ┌──────┐ │   │ ┌──────┐   │   │ ┌──────┐   │
  │ │  DB  │ │   │ │  DB  │   │   │ │  DB  │   │
  │ └──────┘ │   │ └──────┘   │   │ └──────┘   │
  └──────────┘   └────────────┘   └────────────┘

  If Order Service needs Inventory data, it asks the Inventory Service
  (via its API), never queries Inventory's database directly. Each
  service's internal schema is a private implementation detail it can
  change freely, as long as its public API contract stays stable.
```

---

## Distributed Transactions — The Saga Pattern

In a monolith with one database, a multi-step operation is a single ACID transaction — it either fully succeeds or fully rolls back. Across microservices with separate databases, there is no single transaction spanning all of them. The Saga pattern is the standard answer.

```
A Saga is a sequence of local transactions, each in a different
service, where each step publishes an event that triggers the next
step — and each step has a defined COMPENSATING action to undo it
if a LATER step fails.

Example: placing an order involves three services

  Step 1: Order Service creates an order (status: pending)
  Step 2: Payment Service charges the customer
  Step 3: Inventory Service reserves stock

  If Step 3 fails (out of stock):
    Compensating action for Step 2: refund the payment
    Compensating action for Step 1: cancel the order

  ┌─────────┐  succeeds  ┌───────────┐  succeeds  ┌─────────────┐
  │ Create  │ ─────────> │  Charge   │ ─────────> │  Reserve    │
  │ Order   │            │ Payment   │            │  Stock      │
  └─────────┘            └───────────┘            └───────┬─────┘
                                                       │ FAILS
                                                       ▼
                              ┌────────────┐      ┌───────────────┐
                              │  Refund    │<─────│  (trigger     │ 
                              │  Payment   │      │ compensation) │
                              └────┬───────┘      └───────────────┘
                                   ▼
                            ┌─────────────┐
                            │  Cancel     │
                            │  Order      │
                            └─────────────┘
```

```
Two coordination styles for a Saga:

Choreography — each service listens for events and decides its own
next action, with no central coordinator
  Order Service publishes "OrderCreated"
  Payment Service listens, charges, publishes "PaymentCharged"
  Inventory Service listens, reserves stock, publishes "StockReserved"
  Simple for a small number of steps; becomes hard to trace ("what's
  the overall flow?") as the number of participating services grows —
  the logic is scattered across every service's event handlers.

Orchestration — a central Saga Orchestrator explicitly calls each
service in sequence and handles compensation logic
  Clear, centralized view of the entire multi-step flow.
  The orchestrator itself becomes a new component to build and
  operate, and a potential single point of coordination failure
  (though not necessarily a single point of DATA failure, since each
  step's data still lives in its owning service).

Rule of thumb: choreography for 2-3 simple steps; orchestration once
a saga has several steps or complex conditional branching — the
explicit, centralized flow becomes worth its added component.
```

---

## API Gateway

A single entry point that sits in front of all microservices, handling cross-cutting concerns so individual services don't each need to reimplement them.

```
       Clients (web, mobile, third-party)
                    │
                    ▼
            ┌───────────────┐
            │  API Gateway  │   handles: auth, rate limiting,
            └───────┬───────┘   request routing, response
                    │            aggregation, TLS termination
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 ┌──────────┐    ┌──────────┐    ┌──────────┐
 │  User    │    │  Order   │    │ Billing  │
 │ Service  │    │ Service  │    │ Service  │
 └──────────┘    └──────────┘    └──────────┘
```

**Benefits:** clients talk to one stable endpoint instead of needing to know about every service's location; authentication/rate-limiting logic lives in one place instead of being duplicated across every service; can aggregate multiple service calls into one client-facing response, reducing round trips for the client.

**Risk:** the gateway itself becomes a critical piece of infrastructure — if it goes down, everything behind it is unreachable, so it needs its own redundancy and careful operational attention (this connects to the load balancing and Nginx concepts in the DevOps course).

---

## Service Discovery

In a system where services are scaled up/down dynamically (especially under container orchestration — see the DevOps course's Kubernetes pages), a service can't simply hardcode "call Inventory Service at 10.0.1.15" — that IP changes as instances come and go.

```
Client-side discovery:
  The caller queries a service registry directly, then picks an
  instance and calls it.

Server-side discovery (the more common pattern today, especially
under Kubernetes):
  The caller calls a stable name (e.g. a Kubernetes Service — see
  the DevOps course's Kubernetes workloads page); the platform's own
  networking layer resolves that name to a currently-healthy instance
  automatically, transparently to the caller.
```

This is a solved problem in modern container orchestration platforms — Kubernetes Services provide this out of the box, which is one of the strongest practical arguments for running microservices on Kubernetes rather than building this infrastructure by hand.

---

## Handling Partial Failure

In a monolith, if the process is running, all its internal function calls work. In microservices, ANY of the services you depend on can be down, slow, or partially degraded — and your service needs to handle that without cascading into a total system failure.

```
Circuit Breaker pattern:
  After a downstream service fails repeatedly, STOP calling it for a
  cooldown period, failing fast instead of waiting for each call to
  time out — protects both the caller (fast failure instead of
  hanging) and the struggling downstream service (stops piling more
  load onto something already failing).

  CLOSED (normal) → too many failures → OPEN (fail fast, don't call)
       ▲                                           │
       │                cooldown expires           │
       └──────────── HALF-OPEN (try one test call) ┘

Timeouts:
  Every network call to another service needs an explicit timeout —
  without one, a hung downstream service can hang your service
  indefinitely, and that can cascade upstream through every caller
  in the chain.

Retries with backoff:
  Transient failures (a brief network blip) are common and often
  worth retrying — but always with exponential backoff and a retry
  limit, never an unbounded retry loop that can amplify load onto an
  already-struggling service.

Bulkheads:
  Isolate resources (e.g. connection pools) per downstream dependency,
  so one slow/failing dependency can't exhaust resources needed to
  call OTHER, healthy dependencies — named after ship compartments
  that contain flooding to one section instead of sinking the whole vessel.
```

---

## Tips

- Draw service boundaries around business capabilities (aligned with Bounded Contexts, file 07), never around technical layers — a "database service" or "business logic service" is a distributed monolith, not real microservices.
- If two services frequently need to be deployed together to ship a single feature, that's a strong signal the boundary between them is drawn in the wrong place.
- Never let two services share a database directly — even if it seems convenient short-term, it silently re-couples services that were supposed to be independent.
- Use synchronous calls only when the caller genuinely can't proceed without an immediate answer; reach for asynchronous messaging for anything that can tolerate happening slightly later.
- Add circuit breakers, timeouts, and bounded retries to every inter-service call from the start — partial failure isn't an edge case in a distributed system, it's a routine occurrence you must design for.

---

## Summary

- Draw service boundaries around business capabilities, informed by Bounded Contexts (file 07) — not around technical layers, which produces a distributed monolith.
- Synchronous (request/response) calls fit "I need this answer now"; asynchronous messaging fits "this should happen, but not necessarily before I respond" — each has real trade-offs in coupling and complexity.
- Each service must own its data exclusively — no shared databases between services, or independent deployability is an illusion.
- The Saga pattern replaces cross-service ACID transactions with a sequence of local transactions plus compensating actions for rollback; choreography suits simple sagas, orchestration suits complex ones.
- An API Gateway centralizes cross-cutting concerns (auth, rate limiting, routing) for clients, at the cost of becoming critical shared infrastructure.
- Service discovery, circuit breakers, timeouts, and bounded retries are not optional extras — they're required for handling the partial failure that's routine in any distributed system.
