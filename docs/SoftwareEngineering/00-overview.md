---
title: "Software Engineering Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# Software Engineering — Overview

This course covers the layer above any specific programming language: how to write clean code, how to design systems, and how to decide between architectural approaches like monoliths and microservices. These skills transfer across every language in the other courses on this site.

---

## Why This Matters

```
Knowing a language teaches you HOW to write code that runs.
Software engineering teaches you HOW to write code that:
  - other people can read and change safely
  - survives requirement changes without a full rewrite
  - scales to the actual size of the problem, not more, not less
  - fails predictably instead of catastrophically

A brilliant algorithm in unmaintainable code is a liability.
A simple, well-organized system beats a clever, tangled one every time.
```

---

## Course Structure

### Part 1 — Code Quality Fundamentals
| File | Topic |
|---|---|
| 01-clean-code | Naming, functions, comments, formatting |
| 02-solid-principles | The five SOLID principles with examples |
| 03-code-smells-refactoring | Spotting and fixing bad code systematically |
| 04-dry-kiss-yagni | Core simplicity principles and their trade-offs |
| 05-readable-maintainable-code | Cognitive load, complexity, self-documenting code |

### Part 2 — Design Principles and Patterns
| File | Topic |
|---|---|
| 06-design-patterns | Gang of Four patterns, when to use and when to avoid |
| 07-domain-driven-design | Bounded contexts, entities, ubiquitous language |
| 08-api-design | REST, versioning, pagination, GraphQL vs REST vs gRPC |

### Part 3 — System Architecture
| File | Topic |
|---|---|
| 09-monolith-vs-microservices | The decision framework |
| 10-microservices-deep-dive | Boundaries, communication, distributed transactions |
| 11-modular-monolith | Doing monoliths right; when NOT to split too early |
| 12-event-driven-architecture | Queues, pub/sub, event sourcing, CQRS |
| 13-architectural-patterns | Layered, hexagonal/clean architecture, MVC |

### Part 4 — Data and Scalability
| File | Topic |
|---|---|
| 14-database-design | Normalization, SQL vs NoSQL |
| 15-caching-strategies | Cache invalidation, patterns, CDNs |
| 16-scalability-patterns | Horizontal/vertical scaling, sharding, replication |
| 17-consistency-cap-theorem | Distributed systems trade-offs |

### Part 5 — Engineering Practices
| File | Topic |
|---|---|
| 18-testing-strategy | Test pyramid, TDD, mocking |
| 19-code-review | Giving and receiving feedback well |
| 20-technical-debt | Identifying, communicating, paying it down |
| 21-documentation | READMEs, ADRs, inline docs |
| 22-legacy-code | Strangler fig pattern, safe refactoring |

### Part 6 — Decision-Making
| File | Topic |
|---|---|
| 23-architecture-decisions | A framework for trade-off analysis |
| 24-anti-patterns | Common mistakes and how to recognize them |
| 25-case-studies | Worked examples applying the whole course |

---

## How to Use This Course

```
If you're new to these ideas:
  Read Part 1 and Part 5 first — code quality and engineering practices
  apply to every project, regardless of size or architecture.

If you're making an architecture decision right now:
  Jump to Part 3 (System Architecture) and Part 6 (Decision-Making).
  File 23 gives you a repeatable framework; file 25 shows it applied.

If you're reviewing someone else's design or code:
  Part 2 (Design) and file 19 (Code Review) are your fastest references.
```

---

## A Note on Dogma

None of these principles are absolute laws. SOLID, DRY, microservices, TDD — every one of them has situations where following it strictly makes things worse, not better. This course explains the reasoning behind each principle so you can recognize when it applies and when it doesn't, rather than memorizing rules to follow blindly.

The recurring theme across all 25 pages: **optimize for the humans who will read and change this code later** — including future you.
