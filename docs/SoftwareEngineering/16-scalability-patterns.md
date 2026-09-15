---
title: "Scalability Patterns"
sidebar_label: "Scalability Patterns"
sidebar_position: 16
---

# Scalability Patterns

How systems grow to handle more load — more users, more data, more requests per second — without falling over. This page covers the core techniques and, just as importantly, when each one is actually needed.

---

## Vertical vs Horizontal Scaling

```
VERTICAL SCALING ("scale up")
  Make ONE machine more powerful — more CPU, more RAM, faster disk.

    ┌──────────┐         ┌────────────┐
    │  2 CPU   │   ──>   │   16 CPU   │
    │  4GB RAM │         │  64GB RAM  │
    └──────────┘         └────────────┘

  Simple — usually no code changes required. Has a hard ceiling —
  eventually you run out of bigger machines to buy, and cost grows
  faster than capacity at the high end.

HORIZONTAL SCALING ("scale out")
  Add MORE machines, and distribute load across all of them.

    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Server 1 │   │ Server 2 │   │ Server 3 │   │ Server 4 │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘

  No hard ceiling in principle — keep adding machines. Requires the
  application to actually SUPPORT running many instances at once
  (see Statelessness, below) — this is real engineering work, not free.
```

```
Practical guidance:
  Vertical scaling first, for as long as it's simple and cost-effective —
  don't build horizontal-scaling complexity before you need it (YAGNI,
  file 04). A single well-specified modern server handles a genuinely
  large amount of traffic for many real applications.

  Horizontal scaling once vertical scaling's ceiling or cost curve
  becomes a real, demonstrated problem — and once the application is
  actually designed to support it (stateless, as covered next).
```

---

## Statelessness — The Prerequisite for Horizontal Scaling

```
STATEFUL server (holds session data in local memory):

   User's first request  ──▶  Server A  (session stored in Server A's memory)
   User's second request ──▶  Server B  (Server B has NO idea who this user is!)

  Horizontal scaling breaks immediately unless every request from
  the same user is somehow always routed to the SAME server (called
  "sticky sessions" — a workaround with its own problems: uneven load
  distribution, and losing that server means losing every session it held).

STATELESS server (session data lives externally, not in server memory):

   User's first request  ──▶  Server A  ──▶  reads/writes session in Redis
   User's second request ──▶  Server B  ──▶  reads/writes the SAME session in Redis

  ANY server can handle ANY request, because no server holds
  request-specific state in its own local memory — it's all externalized
  to a shared store (Redis, a database) that every instance can reach.
```

```
Making an application stateless usually means:
  Session data → external store (Redis, database) instead of
  in-process memory
  File uploads → object storage (S3-equivalent) instead of the local
  filesystem of whichever server happened to handle that request
  Background job state → a shared job queue/database, not an
  in-memory queue local to one instance

This is a genuine, real design constraint you build FOR, not something
that happens automatically — an application built assuming a single
long-running process needs real changes to become horizontally scalable.
```

---

## Load Balancing

Distributes incoming requests across multiple server instances — the piece of infrastructure that actually makes horizontal scaling work in practice. Covered in full depth (algorithms, Layer 4 vs Layer 7, health checks) in the DevOps course's Nginx and Load Balancing page — the summary here is the application-design angle.

```
                    Load Balancer
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │ Server 1 │    │ Server 2 │    │ Server 3 │
     └──────────┘    └──────────┘    └──────────┘

The load balancer also provides FAILOVER — if Server 2 becomes
unhealthy, the load balancer stops routing to it and distributes
that traffic across the remaining healthy instances automatically.
```

---

## Database Scaling — Replication

Adding read replicas lets read traffic scale horizontally even when the underlying data model doesn't naturally shard.

```
                     Writes only
                          │
                          ▼
                  ┌────────────────┐
                  │  Primary (DB)  │
                  └───────┬────────┘
                          │  replicates changes
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐┌──────────┐┌──────────┐
        │ Replica 1││ Replica 2││ Replica 3│  ◀── reads distributed
        └──────────┘└──────────┘└──────────┘        across replicas
```

```
Writes go to the primary; the primary replicates its changes to
replicas, which serve read traffic.

Trade-off: replication is typically asynchronous, meaning replicas
lag slightly behind the primary — a write to the primary might not
be visible on a replica for a brief window (milliseconds, usually,
but not instant). This is a form of eventual consistency (see file 17)
— fine for most read traffic (a product listing page doesn't need
to reflect a write from 50 milliseconds ago), but a problem if code
immediately reads its own just-written data from a replica and
expects to see it (a common real bug — "read-after-write" needs to
either read from the primary, or use a replica confirmed to be caught up).
```

---

## Database Scaling — Sharding

Splits data across multiple databases, each holding a subset of the data — used when a single database's write capacity or total data size becomes the actual bottleneck (replication alone only scales READS, not writes).

```
        Shard by customer_id range

   customer_id 1-1000000        customer_id 1000001-2000000
          │                              │
          ▼                              ▼
    ┌───────────┐                  ┌───────────┐
    │  Shard A  │                  │  Shard B  │
    └───────────┘                  └───────────┘
```

```
Sharding strategies:
  Range-based (as above) — simple, but can create "hot shards" if
  data/traffic isn't evenly distributed across the ranges
  Hash-based — hash the shard key (e.g. customer_id) to distribute
  more evenly, at the cost of losing simple range queries across shards
  Directory-based — a lookup service maps each key to its shard,
  most flexible, but the lookup service itself becomes critical
  infrastructure needing its own reliability

Real cost of sharding: queries spanning multiple shards (e.g. "top 10
customers across the entire system") become genuinely hard — no
single database can answer that with a simple query anymore; it
requires querying every shard and combining results in application
code, or maintaining a separate aggregated read model (see CQRS, file 12).

Sharding is a significant architectural commitment — reach for it
only once replication and vertical scaling of the primary genuinely
can't keep up, not preemptively.
```

---

## Scaling Patterns Beyond the Database

### Queue-Based Load Leveling

Absorbs traffic spikes by decoupling the rate work arrives from the rate it's processed — directly connects to the message queue concepts in file 12.

```
   Traffic spike:           Without a queue:          With a queue:
   1000 req/sec instantly   All 1000 hit the           1000 queued;
                             database at once,           workers process
                             risking overload             at a sustainable,
                                                            steady rate
```

### Read-Through Cache

Reduces database load for hot data by serving repeated reads from a cache instead — covered in full depth in file 15, Caching Strategies.

### CDN for Static Content

Offloads static asset serving to edge servers geographically close to users, so the origin servers only handle dynamic requests — covered in file 15.

### Auto-Scaling

Automatically adjusts the NUMBER of running instances based on real-time load, rather than provisioning for peak capacity permanently (wasteful) or average capacity permanently (fails under spikes). Covered in depth in the DevOps course's Kubernetes storage-and-scaling page (Horizontal Pod Autoscaler) and AWS fundamentals page (Auto Scaling Groups).

---

## Scaling Anti-Patterns

```
Scaling prematurely (see file 24, Anti-Patterns):
  Building sharding, multi-region deployment, and complex caching
  layers for an application with a few hundred users. This is the
  data/infrastructure equivalent of premature abstraction — real
  cost paid today for a capacity need that may never actually arrive.

Ignoring the actual bottleneck:
  Adding more application servers (horizontal scaling) when the REAL
  bottleneck is the single database they all share — this doesn't
  help; the database was already the constraint, and now MORE
  application servers are hammering it harder. Profile and identify
  the actual bottleneck before scaling anything (see file 20,
  Technical Debt, and file 24 for the broader "measure before you
  optimize" principle).

Treating all data the same:
  Not every table/entity needs the same scaling treatment. A
  `product_catalog` table (read-heavy, changes rarely) benefits
  enormously from caching and read replicas. A `payment_transactions`
  table (needs strict consistency, moderate volume) may not want
  the same eventual-consistency trade-offs at all. Scale the specific
  parts of the system that actually need it, informed by real
  measurement — not uniformly across everything.
```

---

## Tips

- Scale vertically first, for as long as it remains simple and cost-effective — don't build horizontal-scaling complexity before a real, measured need arrives.
- Design for statelessness from the start, even before you need to scale horizontally — retrofitting statelessness onto an application built assuming a single process is real, disruptive work.
- Read replicas scale reads; sharding is required to scale writes and total data volume beyond one primary database's capacity — know which problem you actually have before reaching for either.
- Always identify the ACTUAL bottleneck (via real profiling/measurement) before scaling anything — adding more of the wrong resource doesn't help, and can even make things worse by increasing pressure on the true bottleneck.
- Different parts of your system likely have different scaling needs — apply caching, replication, sharding, and auto-scaling to the specific components that actually need them, not uniformly across the whole system.

---

## Summary

- Vertical scaling (bigger machine) is simpler and has a real, useful ceiling; horizontal scaling (more machines) has no inherent ceiling but requires the application to actually support running many instances — start vertical, move horizontal when genuinely needed.
- Statelessness (session data and file storage externalized, not held in server memory) is the prerequisite that makes horizontal scaling and load balancing actually work.
- Read replicas scale read capacity with some replication lag (eventual consistency); sharding scales write capacity and total data size, at real query-complexity cost for cross-shard operations.
- Queue-based load leveling, caching, CDNs, and auto-scaling each address a different specific bottleneck — apply the one that matches your actual, measured problem.
- Scaling prematurely, or scaling the wrong component instead of the actual bottleneck, are the two most common real-world scaling mistakes — measure first, then scale precisely what needs it.
