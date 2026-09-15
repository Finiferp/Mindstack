---
title: "Consistency and the CAP Theorem"
sidebar_label: "Consistency & CAP Theorem"
sidebar_position: 17
---

# Consistency and the CAP Theorem

Distributed systems face a fundamental trade-off that a single-machine system never has to think about. Understanding it explains why some systems return slightly stale data by design, and why "just make it consistent" isn't always a free choice.

---

## The CAP Theorem

**In a distributed system, when a network partition occurs, you must choose between Consistency and Availability — you cannot have both at that moment.**

```
C — Consistency
  Every read receives the most recent write, or an error. All nodes
  see the same data at the same time.

A — Availability
  Every request receives a (non-error) response, even if it might
  not reflect the most recent write.

P — Partition Tolerance
  The system continues operating despite network failures between nodes.

              ┌───────────────────┐
              │                   │
        ┌─────┤   Pick 2 of 3     ├──────┐
        │     │                   │      │
        ▼     └───────────────────┘      ▼
   CA (Consistency +              CP (Consistency +
   Availability)                   Partition Tolerance)
   Only possible WITHOUT           Sacrifice Availability
   a partition — not realistic     during a partition —
   for any real distributed        refuse requests rather
   system, since networks DO       than risk inconsistent data
   partition eventually

                    AP (Availability +
                    Partition Tolerance)
                    Sacrifice Consistency
                    during a partition —
                    keep responding, but
                    some responses may be stale
```

**The practical takeaway: partition tolerance isn't optional for any real distributed system — networks fail, packets drop, links go down. So the REAL choice every distributed system architect actually makes is between C and A, specifically during the (hopefully brief, hopefully rare) window when a partition is actually happening.**

```
A concrete scenario:
  Two data centers, connection between them briefly severed.
  A write arrives at Data Center 1.

  CP choice: Data Center 2 refuses to serve reads/writes for that
  data until it can confirm consistency with Data Center 1 again —
  users hitting Data Center 2 see an error rather than risk stale data.

  AP choice: Data Center 2 keeps serving requests using its
  last-known data — users hitting Data Center 2 get a fast response,
  but it might not reflect the write that just landed on Data Center 1.

Neither choice is universally "correct" — it depends entirely on
what the specific data actually needs.
```

---

## Choosing CP or AP Based on the Data

```
CP is usually right for:
  Financial transactions — an incorrect balance shown due to a
  partition is a genuinely serious problem; refusing to serve stale
  financial data is usually the safer choice than serving it
  Inventory counts for the LAST unit of a product — overselling due
  to stale data has real business/legal consequences
  Anything where acting on stale data could cause an irreversible,
  costly mistake

AP is usually right for:
  Social media feeds — seeing a slightly-stale feed for a few seconds
  during a rare network partition is a minor inconvenience, not a
  real problem, and a broken/error page is a WORSE user experience
  than a mildly stale one
  Product catalog browsing — a price update that takes a few extra
  seconds to propagate during a partition is far less costly than
  showing users an error page and losing the sale entirely
  Most read-heavy, user-facing content where staleness is a minor
  inconvenience rather than a correctness problem

This is a genuine judgment call about the SPECIFIC DATA, not a
system-wide, one-time architectural decision — many real systems make
different CP/AP choices for different pieces of data within the same
overall application (your payment processing is CP; your product
recommendations feed is AP — both coexisting in the same product).
```

---

## Eventual Consistency

The practical, everyday form the AP choice takes: the system guarantees that IF no new updates occur, all replicas will EVENTUALLY converge to the same value — but at any given instant, different nodes might briefly disagree.

```
   Write "balance = 100" to Node A
        │
        ▼
   Node A: balance = 100    (immediately)
   Node B: balance = 90     (hasn't received the update yet)
   Node C: balance = 90     (hasn't received the update yet)

        │  (a brief propagation delay — milliseconds, typically)
        ▼

   Node A: balance = 100
   Node B: balance = 100    (now converged)
   Node C: balance = 100    (now converged)
```

This is exactly the mechanism behind read replica lag (file 16), Redis pub/sub delivery, and most NoSQL databases' default consistency model (file 14) — it's not a bug or a corner case, it's the deliberate, documented trade-off those systems make in exchange for availability and performance.

```
Different flavors of eventual consistency, roughly ordered from
weakest to strongest guarantee:

  Eventual consistency (weakest) — will converge EVENTUALLY, no
    bound on how long
  Read-your-writes consistency — a client is guaranteed to see ITS
    OWN writes immediately, even if other clients might briefly see
    stale data (commonly implemented by routing a client's reads to
    the primary for a brief window right after that client's own write)
  Monotonic reads — once a client has seen a value, it will never
    see an OLDER value on a subsequent read (prevents the confusing
    experience of data appearing to "go backward in time")
  Strong consistency (the CP choice) — every read reflects the most
    recent write, globally, immediately
```

---

## Consistency Patterns in Practice

```
Financial ledger:                     Strong consistency (CP) —
                                      correctness matters more than
                                      availability during a rare partition

Shopping cart:                        Often eventual consistency (AP)
                                      is acceptable — briefly seeing a
                                      slightly stale cart is a minor
                                      inconvenience, not a correctness
                                      problem, and losing availability
                                      during checkout is worse for
                                      the business

Inventory count during checkout:      Often needs strong consistency
                                      specifically at the moment of
                                      SALE (to avoid overselling the
                                      last unit), even if the general
                                      "items in stock" DISPLAY
                                      elsewhere in the app can be
                                      eventually consistent

Social media likes/comments count:    Eventual consistency (AP) —
                                      an exact real-time count
                                      rarely matters; availability
                                      and speed matter far more
```

Notice the inventory example: even within ONE feature (an e-commerce product), different parts of the SAME data can reasonably use different consistency models — the number shown on a browsing page can be eventually consistent, while the actual decrement at the moment of purchase needs strong consistency to prevent overselling. This granular, per-operation thinking is more realistic than a single system-wide "we are a CP system" or "we are an AP system" declaration.

---

## Tips

- Treat CAP as a per-piece-of-data decision, not a single system-wide architectural stance — most real systems mix CP and AP choices across different data, based on what each specific piece of data actually needs.
- When evaluating a new database or messaging technology, explicitly check which consistency model it defaults to and whether that matches your data's actual needs — this is a common source of surprising production bugs when the default doesn't match expectations.
- "Read-your-writes" consistency is often what users actually expect and need, even in an otherwise eventually-consistent system — a user who just submitted a form generally expects to immediately see their own change reflected, even if OTHER users seeing it a moment later is perfectly fine.
- Don't default to strong consistency everywhere "to be safe" — it has a real availability and performance cost, and applying it to data that doesn't need it (a social media like count) is an unnecessary trade-off.

---

## Summary

- CAP theorem: during a network partition (which will eventually happen in any real distributed system), you must choose between Consistency (refuse stale reads) and Availability (keep serving, possibly-stale reads) — partition tolerance itself isn't optional.
- Choose CP for data where acting on stale information causes real harm (financial transactions, inventory at the moment of sale); choose AP for data where brief staleness is a minor inconvenience (feeds, browsing views, counts).
- Eventual consistency is the everyday, practical form of the AP choice — replicas converge over time, not instantly; this underlies read replica lag, most NoSQL defaults, and pub/sub delivery.
- Stronger consistency variants (read-your-writes, monotonic reads) sit between full eventual consistency and full strong consistency, and often match what users actually expect better than either extreme.
- Treat CAP/consistency choices per data type, not as one system-wide declaration — the same application can and often should mix CP and AP for different pieces of data based on their actual correctness requirements.
