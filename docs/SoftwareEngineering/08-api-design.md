---
title: "API Design"
sidebar_label: "API Design"
sidebar_position: 8
---

# API Design

Designing an API is designing a contract other developers (possibly on other teams, possibly external customers) will build against and depend on for years. This page covers REST conventions, versioning, pagination, and when to reach for GraphQL or gRPC instead.

---

## REST Fundamentals — Resources, Not Actions

The core REST idea: URLs identify **resources** (nouns), and HTTP methods express the **action** (verbs) performed on them.

```
Bad — actions baked into the URL, redundant with the HTTP method:
  POST /createUser
  POST /getUserById?id=42
  POST /deleteUser?id=42
  POST /updateUserEmail?id=42

Good — resources as nouns, HTTP methods carry the verb:
  POST   /users              create a user
  GET    /users/42            read a user
  PUT    /users/42             replace a user entirely
  PATCH  /users/42               partially update a user
  DELETE /users/42                 delete a user
  GET    /users                     list users
```

```
HTTP method semantics — worth knowing precisely, not just by habit:

GET     — read-only, safe (no side effects), cacheable
POST    — create a new resource, or trigger a non-idempotent action
PUT     — replace a resource entirely (idempotent — calling it N times
          has the same effect as calling it once)
PATCH   — partially update a resource (not necessarily idempotent,
          depending on the patch format used)
DELETE  — remove a resource (idempotent — deleting something already
          deleted is still "deleted," not an error, by convention)
```

**Idempotency matters for reliability.** If a client's request times out and it retries, an idempotent operation (PUT, DELETE) is safe to simply retry. A non-idempotent operation (POST creating a new order) retried blindly could create a duplicate — this is exactly why payment/order-creation APIs commonly require an explicit idempotency key (see the pattern below).

---

## Resource Naming Conventions

```
Use plural nouns for collections:
  GET /users              (not /user)
  GET /users/42/orders     (nested resource — orders belonging to user 42)

Use lowercase, hyphenated (not camelCase or snake_case) URL segments:
  GET /shipping-addresses     (preferred)
  GET /shippingAddresses      (avoid — inconsistent with URL conventions)
  GET /shipping_addresses     (avoid — underscores are visually ambiguous in URLs)

Avoid verbs in URLs — but for actions that genuinely aren't CRUD on a
resource, a verb-like sub-resource is an accepted pragmatic exception:
  POST /orders/42/cancel        (acceptable — "cancel" isn't a resource,
                                  it's an action with real side effects
                                  beyond a simple field update)
  POST /orders/42/refund

Nesting depth — keep it shallow (2 levels max is a reasonable guideline):
  GET /users/42/orders                    fine
  GET /users/42/orders/99/items                borderline — consider
                                                  GET /orders/99/items instead,
                                                  since an order's items don't
                                                  really need the user context
                                                  repeated in the URL
```

---

## Status Codes — Using Them Precisely

```
2xx — Success
  200 OK                    standard success (GET, PUT, PATCH)
  201 Created                successful POST that created a resource
                                (include a Location header pointing to it)
  204 No Content               successful request with no body to return
                                (common for DELETE)

3xx — Redirection
  301 Moved Permanently       resource has a new permanent URL
  304 Not Modified              cached version is still valid (conditional GET)

4xx — Client Error (the caller did something wrong)
  400 Bad Request              malformed request, failed validation
  401 Unauthorized               missing or invalid authentication
  403 Forbidden                    authenticated, but not allowed to do this
  404 Not Found                      resource doesn't exist
  405 Method Not Allowed               e.g. DELETE on a read-only resource
  409 Conflict                           request conflicts with current state
                                          (e.g. duplicate unique field)
  422 Unprocessable Entity                 syntactically valid but semantically
                                          invalid (e.g. end_date before start_date)
  429 Too Many Requests                      rate limit exceeded

5xx — Server Error (the server did something wrong)
  500 Internal Server Error                    generic, unexpected failure
  502 Bad Gateway                                upstream service failure
  503 Service Unavailable                          temporarily overloaded/down
```

**A common mistake:** returning `200 OK` with an error message in the response body. This forces every client to parse the body just to know if the request succeeded, defeating the purpose of status codes. Use the status code to signal success/failure category, and the body for details.

---

## Request and Response Design

```json
// Consistent response envelope — makes client-side handling predictable
// across every endpoint in the API

// Success
{
  "data": {
    "id": 42,
    "name": "Alice",
    "email": "alice@example.com"
  }
}

// Error — structured, machine-parseable, with enough detail to act on
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email address is invalid",
    "field": "email",
    "request_id": "req_a1b2c3"
  }
}
```

```
Field naming — pick ONE convention and use it everywhere:
  snake_case:  { "first_name": "Alice", "created_at": "..." }
  camelCase:    { "firstName": "Alice", "createdAt": "..." }

Both are common (snake_case is more typical for REST APIs written in
Python/Ruby; camelCase is more typical when JavaScript/TypeScript
clients are the primary consumer) — the important part is consistency
across the ENTIRE API, not which one you pick.

Dates — always use ISO 8601, always in UTC, unless there's a specific
reason not to:
  "created_at": "2024-01-15T10:30:00Z"
```

---

## Pagination

Never return an unbounded list from an endpoint — it will eventually be called against a table with a million rows and either time out or return a response too large to be useful.

### Offset-Based Pagination

```
GET /users?limit=20&offset=40

{
  "data": [ ... 20 users ... ],
  "meta": {
    "limit": 20,
    "offset": 40,
    "total_count": 5000
  }
}
```

Simple to implement and understand, but has a real weakness: if items are inserted/deleted between page requests, results can shift — a user might see the same item twice, or miss one entirely, across paginated requests.

### Cursor-Based Pagination

```
GET /users?limit=20&cursor=eyJpZCI6NDB9

{
  "data": [ ... 20 users ... ],
  "meta": {
    "next_cursor": "eyJpZCI6NjB9",
    "has_more": true
  }
}
```

The cursor encodes a position (often the last item's ID or a composite sort key), not a numeric offset — insertions/deletions elsewhere in the list don't shift what the cursor points to. This is the standard approach for any API with high write volume or infinite-scroll-style consumption (social media feeds, activity logs).

```
Offset-based: simpler, supports "jump to page 5" directly, but drifts
              under concurrent writes.
Cursor-based:  stable under concurrent writes, natural fit for infinite
              scroll, but can't jump to an arbitrary page number directly.

Use offset-based for: admin panels, small-to-medium stable datasets,
                       anywhere users expect page numbers.
Use cursor-based for: high-volume, frequently-changing data, feeds,
                       any API expecting heavy pagination traffic.
```

---

## Versioning

APIs change; consumers can't all upgrade instantly. Versioning lets you evolve the API without breaking existing clients.

```
URL versioning — simplest, most visible:
  GET /v1/users
  GET /v2/users

Header versioning — keeps URLs clean, less visible/discoverable:
  GET /users
  Accept: application/vnd.myapi.v2+json

Query parameter versioning — rarely recommended, easy to omit
accidentally, caching behaves oddly:
  GET /users?version=2
```

```
What actually requires a NEW version (a breaking change):
  Removing a field from a response
  Renaming a field
  Changing a field's type or meaning
  Adding a new REQUIRED request field
  Changing the URL structure

What does NOT require a new version (backward-compatible, additive):
  Adding a new optional field to a response (clients ignoring
  unknown fields — which they should — are unaffected)
  Adding a new optional request parameter
  Adding an entirely new endpoint

Most real APIs live far longer on v1 than expected because breaking
changes are avoided by DEFAULT — reach for a new version only when
a change is genuinely, unavoidably breaking.
```

---

## Idempotency Keys — Safe Retries for Non-Idempotent Operations

```
Problem: a client POSTs to create an order. The network times out
before the response arrives. Did the order get created or not? If
the client blindly retries, it risks creating a DUPLICATE order.

Solution: the client generates a unique idempotency key (often a UUID)
and sends it with the request. The server remembers keys it has
already processed and returns the SAME result for a repeated key,
instead of performing the action again.
```

```http
POST /orders
Idempotency-Key: 7b3e1f2a-8c4d-4a1e-9f6b-2d5c8e9a1b3f
Content-Type: application/json

{ "items": [...] }
```

```python
def create_order(request):
    idempotency_key = request.headers.get("Idempotency-Key")

    existing = idempotency_store.get(idempotency_key)
    if existing:
        return existing.cached_response       # already processed — return the
                                                  # SAME result, don't repeat the action

    order = actually_create_order(request.body)
    idempotency_store.save(idempotency_key, order)
    return order
```

This pattern is standard on payment APIs (Stripe requires it) and any endpoint where an accidental duplicate has real consequences.

---

## REST vs GraphQL vs gRPC

```
REST:
  Resource-oriented, uses standard HTTP semantics, cacheable by
  default (via HTTP caching), widely understood, easy to debug with
  just a browser or curl.
  Weakness: over-fetching (getting fields you don't need) and
  under-fetching (needing multiple round trips for related data)
  are common with a fixed resource shape.

GraphQL:
  Clients specify EXACTLY which fields they need, in a single request,
  even across what would be multiple REST resources.
  Strong fit for: complex UIs with varying data needs per screen,
  mobile clients wanting to minimize round trips and payload size,
  APIs serving many different frontend clients with different needs.
  Weakness: harder to cache with standard HTTP caching, more complex
  server-side implementation, easier to accidentally allow expensive
  queries without careful depth/complexity limiting.

gRPC:
  Binary protocol (Protocol Buffers) over HTTP/2, built for
  service-to-service communication with strict, code-generated contracts.
  Strong fit for: internal microservice-to-microservice communication
  (see file 10) where both ends are code you control, low-latency/
  high-throughput needs, streaming (bidirectional streams are built in).
  Weakness: not browser-native (needs gRPC-Web or a proxy), less
  human-readable/debuggable than JSON over REST, steeper initial setup.

Common real-world pattern: REST or GraphQL at the public-facing edge
(browsers, mobile apps, third-party integrations) + gRPC for internal
service-to-service calls behind that edge — using each where its
strengths actually apply.
```

---

## Tips

- Use HTTP status codes precisely, not just 200/400/500 — a client's error-handling logic should be able to branch on the status code alone, without parsing the body first.
- Never return an unbounded list — always paginate, and choose cursor-based pagination for anything with meaningful write volume or infinite-scroll consumption.
- Default to additive, backward-compatible API changes; reserve a new version number for genuinely breaking changes — most real-world API versions live far longer than planned.
- Add idempotency key support to any endpoint where a client-side retry could cause a costly duplicate (payments, order creation) — this is a small addition that prevents a real production incident class.
- Pick REST, GraphQL, or gRPC based on the actual consumer and use case, not familiarity alone — many production systems legitimately use more than one, each where it fits best.

---

## Summary

- REST models resources as nouns in URLs; HTTP methods (GET/POST/PUT/PATCH/DELETE) carry the verb — idempotent methods (PUT, DELETE) are safe to retry blindly, POST generally is not.
- Use status codes precisely (401 vs 403, 400 vs 422) rather than defaulting to 200 with an error in the body.
- Paginate every list endpoint — offset-based for simple/stable data, cursor-based for high-volume or frequently-changing data.
- Version only for genuinely breaking changes (removed/renamed/retyped fields); additive changes (new optional fields) don't need a new version.
- Idempotency keys let clients safely retry non-idempotent operations like payment/order creation without risking duplicates.
- Choose REST, GraphQL, or gRPC based on the actual consumer's needs — public-facing APIs often favor REST/GraphQL, internal service-to-service calls often favor gRPC.
