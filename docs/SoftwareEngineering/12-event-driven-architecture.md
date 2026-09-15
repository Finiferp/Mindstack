---
title: "Event-Driven Architecture"
sidebar_label: "Event-Driven Architecture"
sidebar_position: 12
---

# Event-Driven Architecture

Instead of components calling each other directly and waiting for a response, event-driven systems communicate by publishing facts ("this happened") that interested parties can react to independently. This page covers message queues, pub/sub, event sourcing, and CQRS.

---

## The Core Shift in Thinking

```
Request/response thinking:
  "Call the Shipping Service and tell it to schedule a delivery."
  The caller knows exactly who needs to act, and calls them directly.

Event-driven thinking:
  "Announce that an order was placed. Whoever cares can react."
  The caller doesn't know or care who's listening — today it might be
  Shipping and Analytics; next month a new Fraud Detection service
  can start listening too, with ZERO change to the code that publishes
  the event.

This is the Observer pattern (file 06) applied at the scale of an
entire system rather than within a single process.
```

---

## Message Queues — Point-to-Point

A queue holds messages until exactly one consumer processes each one. Useful for distributing work across a pool of workers.

```
   Producer                  Queue                  Workers
      │                        │                        │
      │ ── send(job) ────────> │                        │
      │ ── send(job) ────────> │──── job#1 ────────────>│ Worker A
      │ ── send(job) ────────> │──── job#2 ────────────>│ Worker B
      │                        │──── job#3 ────────────>│ Worker A (free again)

Each message is delivered to and processed by exactly ONE worker —
this is the classic pattern for distributing a workload (see the
worker pool pattern in the Go course's concurrency page — this is the
same idea at the system level, across multiple processes/machines
instead of goroutines within one process).
```

**Common technologies:** RabbitMQ, Amazon SQS, Google Cloud Pub/Sub (in queue mode).

**Use for:** background job processing (image resizing, PDF generation, sending emails), work that can be processed asynchronously and load-balanced across a pool of workers.

---

## Publish/Subscribe — One-to-Many

A publisher broadcasts an event; every subscriber that's registered interest receives its own copy.

```
                            Topic: "OrderPlaced"
                                   │
   Publisher                       │
      │                            │
      │ ── publish(event) ───────> │
      │                            ├────────────────> Shipping Service
      │                            ├────────────────> Analytics Service
      │                            └────────────────> Fraud Detection Service

Every subscriber gets EVERY message — unlike a queue, where each
message goes to exactly one consumer.
```

**Common technologies:** Apache Kafka, Google Cloud Pub/Sub (in pub/sub mode), AWS SNS, Redis Pub/Sub.

**Use for:** broadcasting a fact that multiple, independent, decoupled parts of the system need to react to — the publisher doesn't need to know who's listening, or how many listeners there are.

---

## Choosing Between Queue and Pub/Sub

```
Ask: "should each message be handled by exactly ONE consumer, or
should EVERY interested consumer get their own copy?"

Distribute work across a pool (each job done once, by whichever
  worker picks it up)                              → Queue

Broadcast a fact that multiple independent systems
  each need to react to in their own way             → Pub/Sub

Some real systems (Kafka especially) support both patterns at once,
via CONSUMER GROUPS: within one group, messages are load-balanced
across the group's members like a queue; across DIFFERENT groups,
each group gets its own full copy of every message, like pub/sub.
```

---

## Delivery Guarantees

A critical, easy-to-overlook design decision — different messaging systems (and different configurations of the same system) offer different guarantees, and the difference has real consequences.

```
At-most-once:
  A message might be lost, but is never delivered twice.
  Fastest, simplest — acceptable for data where an occasional loss
  is tolerable (some metrics/analytics events, perhaps).

At-least-once:
  A message is never lost, but might be delivered more than once
  (e.g. if a consumer crashes after processing but before
  acknowledging receipt, the message is redelivered).
  The most common guarantee in practice — but it means every consumer
  MUST be written to handle duplicate delivery safely.

Exactly-once:
  Genuinely difficult to guarantee across a distributed system in the
  general case; most systems that claim it actually provide
  at-least-once delivery PLUS deduplication (tracking which message
  IDs have already been processed) to achieve the same practical effect.
```

```python
# Because at-least-once delivery is the common case, consumers should
# be IDEMPOTENT — processing the same message twice should have the
# same effect as processing it once (the same idea as the idempotency
# key pattern in file 08, API Design, applied to message consumers)

def handle_order_placed_event(event):
    if already_processed(event.id):     # deduplication check
        return
    process_order(event)
    mark_as_processed(event.id)
```

---

## Event Sourcing

Instead of storing only the CURRENT state of an entity, event sourcing stores the full sequence of events that led to that state — the current state is derived by replaying them.

```
Traditional approach — store current state only:
  accounts table:
    account_id | balance
    ACC-001    | 150

  You know the balance is 150. You don't know HOW it got there,
  unless you separately logged that history somewhere else.

Event sourcing — store the sequence of events, derive state from them:
  events table:
    account_id | event              | amount
    ACC-001    | AccountOpened      | 0
    ACC-001    | MoneyDeposited     | 100
    ACC-001    | MoneyDeposited     | 75
    ACC-001    | MoneyWithdrawn     | 25

  Current balance is DERIVED: 0 + 100 + 75 - 25 = 150

  The events themselves are the source of truth — immutable, append-only.
```

```python
class Account:
    def __init__(self):
        self.balance = 0
        self._uncommitted_events = []

    def deposit(self, amount):
        event = MoneyDeposited(amount)
        self._apply(event)
        self._uncommitted_events.append(event)

    def _apply(self, event):
        if isinstance(event, MoneyDeposited):
            self.balance += event.amount
        elif isinstance(event, MoneyWithdrawn):
            self.balance -= event.amount

    @classmethod
    def from_events(cls, events):
        account = cls()
        for event in events:
            account._apply(event)          # replay history to rebuild current state
        return account
```

**Benefits:** a complete, genuine audit trail (valuable for finance, healthcare, compliance-heavy domains); the ability to answer "what was the state at any point in the past" by replaying events up to that point; new ways of deriving insight from history that weren't anticipated when the events were originally recorded.

**Costs:** genuinely more complex than simply storing current state; querying "current state" requires either replaying events (slow for a long history) or maintaining a separate, continuously-updated read model (see CQRS, below); the event schema itself becomes something you need to version carefully over the system's lifetime, since old events must remain replayable.

**Use when:** the audit trail itself has real business value (financial ledgers, healthcare records, anything where "how did we get to this state" matters, not just "what is the state now"). Overkill for most simple CRUD needs.

---

## CQRS — Command Query Responsibility Segregation

Separates the model used to WRITE data (commands) from the model used to READ data (queries) — they don't have to be the same shape, or even the same database.

```
Traditional (one model for both read and write):

   Client                    Application               Database
      │                          │                          │
      │ ── write request ──────> │ ── write ───────────────>│
      │ ── read request ───────> │ ── read ────────────────>│
                                   (same model, same DB, both directions)

CQRS (separate models):

   Client              Command Side              Write Database
      │                     │                          │
      │ ── command ────────>│ ── write ───────────────>│
                                                          │
                                                    (sync via events)
                                                          │
   Client               Query Side               Read Database
      │                     │                          │  (denormalized,
      │ ── query ──────────>│ ── read ────────────────>│   optimized for
                                                             fast reads)
```

**Why split them:** write operations often care about strict validation and business rules (a "command" like `PlaceOrder` needs to enforce invariants); read operations often care about fast, flexible querying across denormalized, pre-joined data (a dashboard showing orders-with-customer-names-and-shipping-status benefits from a read model that's already shaped exactly like the UI needs, instead of joining five tables on every request).

**Cost:** genuine added complexity — two models to maintain, and the read model is only as fresh as the last sync from the write side (eventual consistency, see file 17) — a write might not be immediately visible in the read model.

**CQRS and Event Sourcing often pair together:** events from the write side are exactly what naturally populates and updates the read side's denormalized views, keeping the two in sync as events occur.

```
Use CQRS when: read and write patterns are GENUINELY different enough
to benefit from separate models — high-read, reporting-heavy systems
with complex write-side business rules are the classic fit.

Skip CQRS when: a simple CRUD application where reads and writes
naturally share the same shape — the added complexity isn't repaid,
same judgment call as DDD's tactical patterns (file 07) and the
YAGNI principle (file 04).
```

---

## Tips

- Choose queue vs pub/sub based on one question: does each message need exactly one handler (queue), or does every interested party need its own copy (pub/sub)?
- Design every event consumer to be idempotent — at-least-once delivery is the realistic default for most messaging systems, and a consumer that can't safely handle duplicate delivery will eventually cause a real bug.
- Event sourcing and CQRS are powerful but genuinely add complexity — reach for them when the audit trail or the read/write split has real, demonstrated business value, not as a default architecture choice.
- Event-driven systems trade immediate consistency for loose coupling and resilience — make sure the parts of your system that genuinely need immediate consistency (like checking current stock before confirming a sale) use synchronous calls instead (see file 10).

---

## Summary

- Event-driven architecture replaces direct calls with published facts that interested parties react to independently — the system-level version of the Observer pattern (file 06).
- Queues deliver each message to exactly one consumer (work distribution); pub/sub delivers each message to every subscriber (broadcasting a fact).
- At-least-once delivery is the common real-world guarantee — design consumers to be idempotent to handle occasional duplicate delivery safely.
- Event sourcing stores the full history of events (not just current state) as the source of truth — valuable for audit-heavy domains, genuine added complexity for simple ones.
- CQRS separates write models (enforcing business rules) from read models (optimized for fast, flexible querying) — often paired with event sourcing, at the cost of eventual consistency between the two sides.
- Both event sourcing and CQRS are judgment calls, not defaults — apply them where their specific benefits are actually needed, echoing the YAGNI principle from file 04.
