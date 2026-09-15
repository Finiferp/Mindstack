---
title: "Caching Strategies"
sidebar_label: "Caching Strategies"
sidebar_position: 15
---

# Caching Strategies

Caching stores a copy of expensive-to-compute or expensive-to-fetch data somewhere faster to access. It's one of the highest-leverage performance techniques available — and one of the easiest to get subtly wrong.

---

## Why Caching Works

```
Every layer of a real system has a different speed:

  CPU cache           ~1 nanosecond
  RAM                 ~100 nanoseconds
  In-memory cache
  (Redis, same        ~1 millisecond      (network round trip)
   datacenter)
  Database query      ~10-100 milliseconds  (disk I/O, query planning)
  External API call   ~100-1000+ milliseconds  (network + third-party
                                                      processing time)

Caching moves data CLOSER to where it's needed, in a faster-to-access
form, trading a small amount of staleness risk for a large speed gain.
"There are only two hard things in Computer Science: cache invalidation
and naming things" (Phil Karlton) — the joke exists because cache
invalidation genuinely is the hard part, covered in depth below.
```

---

## Cache-Aside (Lazy Loading)

The application checks the cache first; on a miss, it fetches from the source of truth and populates the cache for next time.

```
   Request                Cache                 Database
      │                     │                        │
      │ ── check ─────────> │                        │
      │ <── MISS ────────── │                        │
      │                                              │
      │ ── fetch ───────────────────────────────────>│
      │ <── data ────────────────────────────────────│
      │                     │                        │
      │ ── store ─────────> │                        │
      │                     │                        │
      │ (next request for the same key: cache HIT, database untouched)
```

```python
def get_user(user_id):
    cached = cache.get(f"user:{user_id}")
    if cached is not None:
        return cached                          # cache HIT — fast path

    user = database.query_user(user_id)          # cache MISS — slow path
    cache.set(f"user:{user_id}", user, ttl=300)    # populate for next time
    return user
```

**Strength:** simple, and only caches data that's actually requested (no wasted cache space on unused data). **Weakness:** the first request for any given key always pays the full cost (a "cold" cache) — under a sudden traffic spike for a NEW popular key, many simultaneous requests can all miss at once and hammer the database together (the "thundering herd" problem, addressed below).

---

## Write-Through

The cache is updated as part of every write, kept in sync with the database at write time rather than lazily on the next read.

```
   Write Request              Cache                 Database
        │                       │                       │
        │ ── write ───────────> │                       │
        │                       │ ── write ───────────> │
        │                       │ <── ack ───────────── │
        │ <── ack ───────────── │                       │

Cache and database are updated together, synchronously, on every write.
```

**Strength:** the cache is never stale — every read after a write reflects the latest data. **Weakness:** every write pays the cost of updating both the cache and the database, and data that's written but never subsequently read still consumes cache space unnecessarily.

---

## Write-Behind (Write-Back)

The cache is updated immediately; the database update is deferred and batched, applied asynchronously.

```
   Write Request              Cache                 Database
        │                       │                       │
        │ ── write ───────────> │                       │
        │ <── ack ───────────── │                       │
                                │  (later, batched)     │
                                │ ── write ───────────> │
```

**Strength:** very fast writes (the caller doesn't wait for the database at all). **Weakness:** genuine risk of data loss if the cache fails before the deferred write reaches the database — appropriate only when the specific data can tolerate that risk (e.g. non-critical analytics counters), never for data requiring durability guarantees (see ACID, file 14).

---

## Cache Invalidation Strategies

Keeping cached data from going stale is the genuinely hard part of caching.

### Time-based Expiration (TTL)

```python
cache.set("user:42", user_data, ttl=300)   # expires automatically after 5 minutes
```

Simple and self-healing (staleness is bounded by the TTL), but a poor fit for data where even brief staleness has real consequences, and it doesn't help if the underlying data changes more often than the TTL — you're serving stale data for up to the full TTL window regardless of when the actual change happened.

### Explicit Invalidation on Write

```python
def update_user(user_id, new_data):
    database.update_user(user_id, new_data)
    cache.delete(f"user:{user_id}")     # explicitly evict — next read
                                            # will miss and refetch fresh data
```

More precise than TTL alone — the cache is invalidated exactly when the underlying data actually changes, not on an arbitrary timer. Requires discipline: every code path that writes to the underlying data must remember to invalidate the corresponding cache entries, which becomes genuinely hard to guarantee once multiple services or code paths can write to the same data (this is one of the practical arguments for the "each service owns its data exclusively" rule in file 10 — it also narrows down how many places need to remember to invalidate a given cache entry).

### Event-Based Invalidation

```python
# In an event-driven system (file 12), invalidate reactively in
# response to a published event, rather than requiring every writer
# to remember to invalidate directly
def handle_user_updated_event(event):
    cache.delete(f"user:{event.user_id}")
```

Decouples the invalidation logic from every individual write path — any service that changes user data just needs to publish `UserUpdated`; the cache invalidation logic lives in exactly one place, listening for that event, rather than being duplicated across every writer.

---

## The Thundering Herd Problem

```
Scenario: a popular cache key expires. In the next instant, 10,000
simultaneous requests for that same key all MISS at once, and all
10,000 hit the database simultaneously trying to regenerate it —
potentially overwhelming the database with duplicate, redundant work,
right when it's already under the load that made caching valuable
in the first place.
```

```python
# Mitigation: a lock ensures only ONE request regenerates the value;
# the other 9,999 wait briefly for that one to finish, then read the
# now-fresh cache entry, instead of ALL hitting the database
def get_user_with_lock(user_id):
    cached = cache.get(f"user:{user_id}")
    if cached is not None:
        return cached

    lock_key = f"lock:user:{user_id}"
    if cache.acquire_lock(lock_key, ttl=5):
        try:
            user = database.query_user(user_id)
            cache.set(f"user:{user_id}", user, ttl=300)
            return user
        finally:
            cache.release_lock(lock_key)
    else:
        time.sleep(0.05)                    # brief wait, then retry the cache
        return get_user_with_lock(user_id)    # (the winning request should have
                                                  # populated it by now)
```

```
Other mitigations:
  Stagger TTLs slightly (add small random jitter to each entry's TTL)
  so many keys don't all expire at EXACTLY the same instant
  Serve stale data briefly while regenerating in the background
  ("stale-while-revalidate") — the requester gets an immediately
  fast (if slightly stale) response, while one background process
  refreshes the cache for subsequent requests
```

---

## CDNs — Caching at the Network Edge

A Content Delivery Network caches content (often static assets — images, CSS, JS — but increasingly API responses too) at servers geographically distributed close to end users, reducing both latency and origin server load.

```
   User in Tokyo                            User in London
        │                                        │
        ▼                                        ▼
  ┌───────────┐                            ┌───────────┐
  │ CDN Edge  │                            │ CDN Edge  │
  │ (Tokyo)   │                            │ (London)  │
  └─────┬─────┘                            └─────┬─────┘
        │  (cache miss, fetches once,            │
        │   caches for subsequent Tokyo          │
        │   requests)                            │
        ▼                                        ▼
              ┌────────────────────────────┐
              │        Origin Server       │
              └────────────────────────────┘
```

**Use for:** static assets (images, CSS, JavaScript bundles, videos), and increasingly for cacheable API responses (public, rarely-changing data) via HTTP caching headers (`Cache-Control`, `ETag` — see file 08, API Design). This ties directly into the DevOps course's Nginx page, which covers reverse-proxy-level caching that operates on the same underlying principles at a smaller scale.

---

## What NOT to Cache

```
Highly volatile data (changes faster than any reasonable TTL/
  invalidation strategy could keep up with) — the cache would spend
  more effort staying in sync than it saves in read speed.

Data requiring strict consistency for correctness — e.g. an account
  balance immediately before authorizing a withdrawal; caching this
  and serving a stale value could authorize a withdrawal that
  shouldn't be allowed. Cache the DISPLAY of a balance; never cache
  the value used for an authorization DECISION.

Rarely-accessed data — the cost of maintaining a cache entry
  (memory, invalidation logic) isn't repaid if that entry is barely
  ever read; caching is only valuable for genuinely hot data.

Personally sensitive data in a SHARED cache — caching one user's
  data in a way that could accidentally be served to another user is
  a serious security bug, not just a performance concern; be careful
  that cache keys always properly scope data to the correct user/tenant.
```

---

## Tips

- Cache-aside is the right default for most applications — simple, and only caches what's actually requested; reach for write-through/write-behind only when their specific trade-offs genuinely fit your access pattern.
- Prefer explicit or event-based invalidation over TTL alone whenever brief staleness has real consequences — TTL alone is simpler but leaves a window of guaranteed staleness up to the full TTL duration.
- Add small random jitter to TTLs and consider a regeneration lock for any high-traffic cache key — the thundering herd problem is a real, common production incident, not a theoretical concern.
- Never cache data used for a security or financial authorization decision — cache the display of information freely; never cache the value a critical decision is actually based on.
- Always scope cache keys correctly by user/tenant when caching anything personal or sensitive — a cache key collision across users is a serious data leak, not just a performance bug.

---

## Summary

- Caching trades a small staleness risk for large speed gains by keeping data closer to where it's used, in a faster-to-access form.
- Cache-aside (check cache, fetch-and-populate on miss) is the common default; write-through keeps the cache always fresh at write-time cost; write-behind is fastest but risks data loss — use only for data that can tolerate it.
- Invalidation is the genuinely hard part: TTL-based is simple but leaves a staleness window; explicit invalidation on write is precise but requires discipline across every writer; event-based invalidation centralizes that logic.
- The thundering herd problem (many simultaneous misses on a popular expired key) is mitigated with regeneration locks, TTL jitter, or stale-while-revalidate serving.
- CDNs apply the same caching principles at the network edge, close to end users — essential for static assets and increasingly useful for cacheable API responses.
- Never cache data a security or financial decision directly depends on, and always scope cached data correctly to avoid leaking one user's data to another.
