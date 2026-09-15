---
title: "Database Design Principles"
sidebar_label: "Database Design"
sidebar_position: 14
---

# Database Design Principles

How data is structured has a lasting impact on an application's correctness and performance — schema mistakes are often the hardest kind of technical debt to fix later, because they require a live data migration, not just a code change.

---

## Normalization

Organizing relational data to minimize redundancy and avoid update anomalies — the same fact should live in exactly one place.

```
UNNORMALIZED — customer info repeated on every order row

orders table:
  order_id | customer_name  | customer_email       | item
  1        | Alice Smith    | alice@example.com    | Widget
  2        | Alice Smith    | alice@example.com    | Gadget
  3        | Bob Jones      | bob@example.com      | Widget

Problem: if Alice updates her email, EVERY row mentioning her needs
updating — miss one, and you now have inconsistent data with no way
to tell which value is "correct."


NORMALIZED — customer info lives in exactly one place

customers table:
  customer_id | name          | email
  1           | Alice Smith   | alice@example.com
  2           | Bob Jones     | bob@example.com

orders table:
  order_id | customer_id | item
  1        | 1            | Widget
  2        | 1            | Gadget
  3        | 2            | Widget

Alice's email now lives in exactly one row. Updating it once updates
the single source of truth; every order referencing customer_id=1
reflects the change automatically via the relationship, with no risk
of inconsistency.
```

```
The normal forms, briefly (most real schemas aim for 3NF in practice):

1NF — each column holds a single, atomic value (no comma-separated
      lists crammed into one field)
2NF — every non-key column depends on the WHOLE primary key (matters
      most for composite keys)
3NF — every non-key column depends ONLY on the key, not on another
      non-key column (the customer_name/email example above — they
      depended on customer_id, not on order_id, so they didn't belong
      in the orders table at all)

In practice: most engineers don't consciously reason through 1NF/2NF/
3NF definitions on every table — the practical habit that gets you
there is simply "does this fact belong to THIS entity, or does it
actually belong to a related entity I should reference instead?"
```

---

## When to Denormalize

Normalization optimizes for data integrity and update simplicity — but it requires JOINs to reassemble related data, which cost real query performance at scale. Denormalization deliberately reintroduces some redundancy to trade write-time complexity for read-time speed.

```
Normalized (requires a JOIN on every read):

  SELECT orders.id, orders.item, customers.name
  FROM orders
  JOIN customers ON orders.customer_id = customers.id
  WHERE orders.id = 123

Denormalized (customer_name copied directly onto the order,
usually at write/order-creation time):

  orders table:
    order_id | customer_id  | customer_name  | item
    123      | 1            | Alice Smith    | Widget

  SELECT id, item, customer_name FROM orders WHERE id = 123
  -- no JOIN needed; faster, especially at high read volume
```

```
Denormalize when:
  A specific query is measurably slow due to expensive JOINs, and
  you've confirmed this with real profiling (not a guess)
  Read volume vastly exceeds write volume for this data (an order's
  customer_name rarely changes after the order is placed — copying
  it at order time captures a meaningful historical fact: "who this
  order actually belonged to AT THE TIME," which is often what you
  actually want for orders anyway, since a later name change
  shouldn't rewrite history)
  You're building a dedicated read model (see CQRS, file 12) specifically
  optimized for a known, common query pattern

Stay normalized when:
  You haven't yet demonstrated a real performance problem (premature
  denormalization is premature optimization — see file 24, Anti-Patterns)
  The data changes frequently and consistency matters more than raw
  read speed for that specific case

This is the same YAGNI/KISS judgment call (file 04) applied to schema
design — don't denormalize speculatively; do it in response to a
demonstrated, measured need.
```

---

## Choosing SQL vs NoSQL

```
                        SQL (Relational)            NoSQL (varies by type)
──────────────────────────────────────────────────────────────────────
Schema                  Fixed, enforced             Flexible/schemaless
                        upfront                     (or schema-on-read)
Relationships           Native (JOINs,              Often denormalized;
                        foreign keys)               relationships
                                                    modeled in application
                                                    code or embedded
Consistency             Strong (ACID                Often eventual
                        transactions)               consistency by default
                                                    (see file 17)
Scaling                 Vertical primarily,         Horizontal scaling
                        horizontal read             often a first-class
                        replicas common,            design goal
                        horizontal WRITE
                        scaling (sharding)
                        is harder
Best fit                Data with genuine           Very high write
                        relationships,              throughput, flexible/
                        strong consistency          evolving schemas,
                        needs (financial            massive horizontal
                        transactions,               scale needs, simple
                        inventory counts)           key-value or document
                                                    access patterns
```

```
NoSQL is not one thing — it's several genuinely different models,
each suited to different problems:

Document stores (MongoDB, Couchbase):
  JSON-like documents, flexible schema, good fit when your data
  naturally nests (a blog post with embedded comments) and you
  usually fetch the whole document together

Key-value stores (Redis, DynamoDB in simple mode):
  Extremely fast, simple lookups by key — session storage, caching,
  feature flags, anything accessed by a known ID with no complex querying

Wide-column stores (Cassandra, HBase):
  Designed for massive write throughput and horizontal scale across
  many machines — time-series data, event logging, IoT sensor data

Graph databases (Neo4j):
  Optimized specifically for traversing RELATIONSHIPS — social
  networks, recommendation engines, fraud detection networks where
  the connections between data ARE the primary thing you're querying
```

```
A practical decision test:

  "Does this data have clear entities with meaningful RELATIONSHIPS
  between them, and do I need strong consistency guarantees?"
    → SQL is very likely the right default

  "Is this data naturally document-shaped, or do I need extreme
  write throughput / horizontal scale beyond what a single SQL
  database (even with read replicas) can handle?"
    → A specific NoSQL model, chosen for the SPECIFIC access pattern,
      not "NoSQL in general"

Many real systems use BOTH — SQL for the core transactional data
(orders, users, payments) and a specific NoSQL store for a specific
need (Redis for caching/sessions, Elasticsearch for full-text search) —
polyglot persistence, choosing the right tool per access pattern
rather than forcing one database technology to serve every need.
```

---

## Indexing

An index lets the database find rows without scanning the entire table — the single highest-leverage performance tool in most relational databases, and one of the most commonly under-used.

```sql
-- Without an index, this query scans EVERY row in the table
SELECT * FROM orders WHERE customer_id = 42;

-- An index on customer_id lets the database jump directly to
-- matching rows instead of scanning the whole table
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

```
Index the columns you actually:
  Filter by (WHERE clauses)
  Join on (foreign key columns used in JOIN conditions)
  Sort by (ORDER BY, if done frequently on the same column)

Composite indexes (covering multiple columns) help when you
frequently filter on the SAME combination of columns together:
  CREATE INDEX idx_orders_customer_status
    ON orders(customer_id, status);
  -- helps: WHERE customer_id = 42 AND status = 'pending'
  -- helps (leftmost prefix): WHERE customer_id = 42
  -- does NOT help: WHERE status = 'pending'  (alone, without customer_id)

The cost of indexes: every index speeds up READS but slows down
WRITES (the index itself must be updated on every insert/update/
delete) and consumes additional storage. Index the columns your
actual query patterns need — indexing every column "just in case"
trades write performance for a benefit most of those indexes will
never actually provide.
```

---

## Transactions and ACID

```
Atomicity   — a transaction either fully completes or fully rolls
              back; no partial changes are ever left visible
Consistency  — a transaction takes the database from one valid state
              to another, never violating defined constraints
Isolation     — concurrent transactions don't interfere with each
              other's intermediate states
Durability     — once committed, a transaction's changes survive even
              a subsequent crash

Example: transferring money between two accounts MUST be atomic —
debiting one account and crediting the other must both succeed, or
both roll back. A crash between the two steps must never leave money
debited from one account without being credited to the other.
```

```python
# Wrapping a multi-step operation in a transaction — see the Echo
# course's database page for the GORM-specific version of this pattern
def transfer_money(from_account, to_account, amount):
    with db.transaction():
        debit(from_account, amount)
        credit(to_account, amount)
        # if EITHER step raises an exception, the transaction rolls
        # back entirely — the database is never left in a half-done state
```

---

## Migrations

Schema changes need to be applied consistently and safely across every environment (local dev, staging, production) — hand-editing a production schema is a serious operational risk.

```
Migration tools (Flyway, Alembic, golang-migrate, Django migrations,
Rails ActiveRecord migrations) let you:
  Define schema changes as versioned, ordered files
  Apply them consistently, in order, to any environment
  Track which migrations have already run, so re-running is safe
  Roll back a specific change if something goes wrong
```

```sql
-- migrations/0004_add_orders_status_index.sql
CREATE INDEX idx_orders_status ON orders(status);

-- migrations/0004_add_orders_status_index_rollback.sql
DROP INDEX idx_orders_status;
```

```
Safe migration practices for production systems with real traffic:
  Additive changes first (add a new column as NULLABLE, deploy code
  that writes to it, THEN make it required in a later migration) —
  avoids a window where old code and new schema are incompatible
  Avoid long-running locks on large tables during business hours —
  some schema changes (adding an index on a huge table) can lock
  writes for an extended period; many databases offer online/
  concurrent index creation specifically to avoid this
  Always have a tested rollback path before running a migration
  against production
```

---

## Tips

- Normalize by default; denormalize only in response to a measured, real performance problem — premature denormalization is premature optimization applied to schema design.
- Index the columns your actual queries filter, join, and sort on — not every column speculatively; every index has a real write-performance and storage cost.
- Choose SQL vs NoSQL (and which flavor of NoSQL) based on the actual access pattern and consistency needs of that specific data — most real systems use more than one database technology, each for what it's genuinely best at.
- Wrap any multi-step operation that must succeed or fail as a unit in a database transaction — never leave room for a crash to result in a half-completed, inconsistent state.
- Use a migration tool from day one, even on a small project — hand-editing schemas across environments is a reliable source of "works on my machine, breaks in production" incidents.

---

## Summary

- Normalization eliminates redundancy by ensuring each fact lives in one place — the practical test is "does this column depend on THIS table's key, or on a related entity?"
- Denormalization trades write-time complexity for read-time speed — apply it in response to a measured performance need, not speculatively.
- SQL fits data with genuine relationships and strong consistency needs; NoSQL is several distinct models (document, key-value, wide-column, graph), each suited to a specific access pattern — many real systems combine both.
- Indexes are the highest-leverage performance tool for reads, at a real cost to writes and storage — index based on actual query patterns.
- ACID transactions guarantee multi-step operations complete fully or not at all, even across a crash — wrap any operation requiring this guarantee explicitly.
- Use a migration tool to apply schema changes consistently and safely across environments, with additive-first changes and tested rollback paths for production systems.
