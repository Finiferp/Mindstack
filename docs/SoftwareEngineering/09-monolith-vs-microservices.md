---
title: "Monolith vs Microservices"
sidebar_label: "Monolith vs Microservices"
sidebar_position: 9
---

# Monolith vs Microservices

The single most consequential architecture decision most teams make — and one of the most commonly made for the wrong reasons. This page is a decision framework, not a recommendation for either side.

---

## What Each Actually Is

```
MONOLITH
  One deployable unit. All business logic lives in a single codebase,
  runs as a single process (or a small number of identical replicas
  behind a load balancer), typically backed by one database.

        ┌───────────────────────────────────────┐
        │                MONOLITH               │
        │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
        │  │  Users  │ │  Orders │ │ Billing │  │
        │  │  Module │ │  Module │ │  Module │  │
        │  └─────────┘ └─────────┘ └─────────┘  │
        │                                       │
        │              ┌──────────┐             │
        │              │ Database │             │
        │              └──────────┘             │
        └───────────────────────────────────────┘

MICROSERVICES
  Many independently deployable services, each owning a specific
  business capability and typically its own database, communicating
  over the network (HTTP, gRPC, message queues).

   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │  Users    │   │  Orders   │   │ Billing   │
   │  Service  │   │  Service  │   │ Service   │
   │ ┌──────┐  │   │ ┌──────┐  │   │ ┌──────┐  │
   │ │  DB  │  │   │ │  DB  │  │   │ │  DB  │  │
   │ └──────┘  │   │ └──────┘  │   │ └──────┘  │
   └─────┬─────┘   └─────┬─────┘   └──────┬────┘
         │  network calls (HTTP/gRPC/queue)
         └───────────────┴────────────────┘
```

---

## The Trade-offs, Honestly

```
                         MONOLITH                  MICROSERVICES
────────────────────────────────────────────────────────────────────────────
Initial complexity       Low                       High

Development speed
  Small team / early     Fast — little            Slower — infrastructure
                         infrastructure           and service setup adds
                         overhead                 overhead

  Large team / mature    Can degrade as the       Can stay fast — teams
                         codebase and team        can work independently
                         grow                     

                         • Merge conflicts
                         • Slow test suites
                         • Unclear ownership

Scaling                  Scale the WHOLE          Scale EACH service
                         application, even if     independently based
                         only one part is         on actual need
                         under load

Technology choice        One stack for the        Each service can use
                         entire application       its own stack

Failure isolation        One bug can potentially  A failing service does
                         take down the entire     not necessarily take
                         application              down the others

Testing                  Simpler — one process    Harder — network calls,
                         and in-process calls     more moving parts, and
                                                  distributed testing

Data consistency         Easy — one database      Hard — data is spread
                         and real transactions    across services
                                                 
                                                  See: Saga pattern
                                                  (File 10)

Operational overhead     Low — one thing to       High — many services
                         monitor, deploy,         to monitor, deploy,
                         and debug                and debug

                                                  See: DevOps course

Deployment               Simple — deploy one      More complex — many
                         unit                     services require
                                                  orchestration

                                                  See: DevOps course
```

**The uncomfortable truth: microservices trade development-time complexity for organizational scalability — and that trade is only worth making once you actually have the organizational complexity to justify it.**

---

## When a Monolith Is the Right Choice

```
Small team (roughly under 10-15 engineers)
  Communication overhead of coordinating across service boundaries
  exceeds any benefit — a small team can coordinate a monolith's
  internal module boundaries through simple conversation and code review.

Early-stage product, requirements still shifting significantly
  Microservice boundaries encode assumptions about where the natural
  seams in your domain are. Getting those boundaries wrong EARLY, before
  you understand the domain well, is expensive to fix — a wrong module
  boundary inside a monolith is a much cheaper mistake to correct
  (see file 11, Modular Monolith).

Simple, well-understood domain
  If the business logic genuinely doesn't have many independent moving
  parts, splitting it into services adds real operational cost
  (deployment pipelines, service discovery, distributed tracing — see
  the DevOps course) without a matching benefit.

Limited operational maturity/tooling
  Running microservices well requires container orchestration,
  centralized logging, distributed tracing, service mesh or API
  gateway, and a mature CI/CD pipeline (all covered in the DevOps
  course). Adopting microservices before this tooling and expertise
  exists trades one set of problems for a worse set.
```

---

## When Microservices Are the Right Choice

```
Large engineering organization (many independent teams)
  Team boundaries and service boundaries want to align (this maps
  directly onto Bounded Contexts from file 07, Domain-Driven Design).
  Independent deployability means Team A can ship without coordinating
  a release with Team B.

Genuinely different scaling needs across parts of the system
  If your image-processing pipeline needs 50 replicas under load but
  your admin dashboard needs 2, a monolith forces you to scale BOTH
  together. Microservices let you scale exactly the part that needs it.

Need for technology diversity
  A team doing heavy numerical/ML work might genuinely benefit from
  Python; a latency-critical service might genuinely benefit from Go
  or Rust. A monolith locks the whole system into one stack.

Genuine need for independent fault isolation
  If a non-critical feature (say, a recommendation engine) failing
  should NOT take down checkout, that isolation is much easier to
  guarantee with separate services than with careful internal monolith
  discipline alone.

Regulatory/compliance boundaries
  Sometimes data or processing genuinely needs to be isolated (PCI
  compliance scope, data residency requirements) — a separate service
  with its own clear boundary can make compliance auditing far simpler
  than proving isolation within a shared codebase.
```

---

## The Most Common Mistake: Premature Microservices

```
The industry has a well-documented pattern: a small team, excited by
what Netflix/Amazon/Uber do at their scale, adopts microservices for
a product with a handful of users and three engineers.

The result, almost every time:
  Massively increased operational burden (each service needs its own
  deployment pipeline, monitoring, logging — see the DevOps course)
  for a system simple enough to run as one process
  Network calls introduce latency and failure modes (see file 17,
  CAP theorem) that didn't exist when it was just in-process function calls
  Debugging a request that flows through 6 services requires
  distributed tracing infrastructure the team hasn't built yet
  The TEAM is 3 people — there's no organizational boundary problem
  microservices were meant to solve in the first place

The pattern that actually reflects how most successful microservice
systems came to be: START as a well-organized monolith (see file 11),
and extract services LATER, specifically at the seams that turn out
to have genuine independent scaling, team ownership, or failure
isolation needs — informed by real operational experience, not guessed
upfront.
```

---

## A Decision Framework

```
Ask these questions, in this order:

1. How many engineers will work on this system?
   Under ~10-15: strong default toward a (well-organized) monolith.
   Many independent teams: microservices become more attractive.

2. Do different parts of the system have genuinely different scaling
   or reliability needs?
   No: a monolith can scale as a whole; simpler.
   Yes, significantly: a specific factor favoring splitting THOSE parts out.

3. Does your team have the operational maturity to run distributed
   systems well RIGHT NOW?
   (Container orchestration, centralized logging, distributed tracing,
   CI/CD maturity — see the DevOps course for what this actually requires.)
   No: build that maturity, or stay monolithic until you have it.
   Yes: microservices become operationally viable.

4. Do you understand the domain well enough to draw good service
   boundaries?
   Early-stage/unclear: wrong boundaries are expensive to fix across
   service boundaries; stay monolithic until boundaries stabilize.
   Well-understood, stable domain: boundaries are more likely to be
   drawn correctly from the start.

If the honest answers mostly point toward "not yet" — build a modular
monolith (file 11) with clean internal boundaries. You retain the
OPTION to extract services later, at the seams that turn out to
actually need it, informed by real usage instead of a guess made on
day one.
```

---

## Tips

- If you're unsure, default to a monolith — a well-organized monolith is a genuinely good architecture for most systems, not just a stepping stone; plenty of successful, large-scale products run as monoliths indefinitely.
- The organizational question ("how many independent teams need to ship independently?") is usually more decisive than the technical question ("could this scale better as services?") — Conway's Law (systems mirror the communication structure of the organizations that build them) is empirically well-supported.
- If you do go with microservices, invest in the DevOps foundations FIRST — container orchestration, centralized logging, distributed tracing — rather than bolting them on after services are already in production and painful to debug.
- Reversibility matters: starting monolithic and extracting services later (file 11) is a well-trodden, low-risk path; starting with microservices and merging back into a monolith is rare and painful. When uncertain, prefer the more reversible choice.

---

## Summary

- A monolith is one deployable unit with typically one database; microservices are many independently deployable services, each usually owning its own data.
- Microservices trade development-time simplicity for organizational scalability — that trade is only worth making once you have real organizational complexity (many independent teams) to justify it.
- Monoliths fit small teams, early-stage/shifting requirements, simple domains, and teams without mature distributed-systems operational tooling.
- Microservices fit large organizations needing independent deployability, genuinely different per-component scaling needs, technology diversity, or strict fault/compliance isolation.
- The most common real-world mistake is adopting microservices prematurely, before the organizational or operational need actually exists — paying real complexity cost for a benefit not yet needed.
- When uncertain, default to a well-organized (modular) monolith — see file 11 — and extract services later, at seams informed by real operational experience.
