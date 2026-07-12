---
title: "HTTP — HyperText Transfer Protocol"
sidebar_label: "HTTP"
sidebar_position: 43
---

# HTTP — HyperText Transfer Protocol

HTTP is the application-layer protocol that powers the web. Its evolution from a simple document-fetching protocol to a high-performance binary multiplexed protocol with server push mirrors the evolution of the web itself.

---

## History

| Year | Version | RFC | Key Change |
|---|---|---|---|
| 1991 | HTTP/0.9 | — | One-line request, HTML response only |
| 1996 | HTTP/1.0 | RFC 1945 | Headers, status codes, any content type; one request per connection |
| 1997 | HTTP/1.1 | RFC 2068 | Persistent connections, pipelining, Host header (virtual hosting) |
| 1999 | HTTP/1.1 | RFC 2616 | Major clarification; remained the dominant version for 15 years |
| 2014 | HTTP/1.1 | RFC 7230–7235 | Splits the spec into 6 focused RFCs |
| 2015 | HTTP/2 | RFC 7540 | Binary framing, multiplexing, server push, header compression (HPACK) |
| 2020 | HTTP/2 | RFC 9113 | Revised HTTP/2 spec |
| 2022 | HTTP/3 | RFC 9114 | HTTP semantics over QUIC |

Tim Berners-Lee invented HTTP and the World Wide Web at CERN in 1989–1991. The original HTTP/0.9 request was literally `GET /page.html` with no headers.

---

## HTTP/1.1 — The Foundation

### Request Format

```
GET /api/users/42 HTTP/1.1\r\n
Host: api.example.com\r\n
Accept: application/json\r\n
Authorization: Bearer eyJhbGc...\r\n
User-Agent: Mozilla/5.0\r\n
Connection: keep-alive\r\n
\r\n
(empty line terminates headers)
(request body here for POST/PUT)
```

### Response Format

```
HTTP/1.1 200 OK\r\n
Content-Type: application/json; charset=utf-8\r\n
Content-Length: 87\r\n
Cache-Control: max-age=3600\r\n
ETag: "abc123"\r\n
Date: Wed, 01 Jan 2025 12:00:00 GMT\r\n
\r\n
{"id":42,"name":"Alice","email":"alice@example.com","role":"admin","active":true}
```

### HTTP Methods

| Method | Safe | Idempotent | Has Body | Use |
|---|---|---|---|---|
| GET | Yes | Yes | No | Retrieve a resource |
| HEAD | Yes | Yes | No | Retrieve headers only (like GET) |
| POST | No | No | Yes | Create / non-idempotent action |
| PUT | No | Yes | Yes | Replace a resource entirely |
| PATCH | No | No | Yes | Partially update a resource |
| DELETE | No | Yes | No | Delete a resource |
| OPTIONS | Yes | Yes | No | Query allowed methods / CORS preflight |
| CONNECT | No | No | No | Establish tunnel (HTTP proxy for HTTPS) |
| TRACE | Yes | Yes | No | Echo request for debugging (often disabled) |

**Safe:** no side effects on server state.
**Idempotent:** calling N times has the same effect as calling once (PUT/DELETE of same resource).

### Status Codes

```
1xx — Informational
  100 Continue         — client may continue sending body (after Expect: 100-continue)
  101 Switching Protocols — upgrading to WebSocket or HTTP/2

2xx — Success
  200 OK               — standard success
  201 Created          — resource created (POST); include Location header
  204 No Content       — success with no body (DELETE, some PUT/PATCH)
  206 Partial Content  — range request (Content-Range header)

3xx — Redirection
  301 Moved Permanently  — resource moved; browser caches forever; use for domain changes
  302 Found             — temporary redirect; method may change to GET
  303 See Other         — redirect to GET (after POST-redirect-GET pattern)
  304 Not Modified      — conditional GET; use cached version (ETag/If-None-Match match)
  307 Temporary Redirect — temporary; method preserved (POST stays POST)
  308 Permanent Redirect — permanent; method preserved

4xx — Client Error
  400 Bad Request        — malformed request syntax
  401 Unauthorized       — not authenticated (misleadingly named)
  403 Forbidden          — authenticated but not authorized
  404 Not Found          — resource doesn't exist
  405 Method Not Allowed — wrong HTTP method
  409 Conflict           — state conflict (duplicate resource, edit conflict)
  410 Gone               — permanently deleted (vs 404 which may exist elsewhere)
  413 Content Too Large  — body exceeds server limit
  415 Unsupported Media Type — wrong Content-Type
  422 Unprocessable Entity — valid JSON/XML but semantic validation failed
  429 Too Many Requests  — rate limited

5xx — Server Error
  500 Internal Server Error — generic server error
  501 Not Implemented      — method not supported
  502 Bad Gateway          — upstream server returned invalid response
  503 Service Unavailable  — server overloaded or down for maintenance (include Retry-After)
  504 Gateway Timeout      — upstream server timed out
```

### Common Request Headers

```
Host: api.example.com                    — required in HTTP/1.1; enables virtual hosting
Accept: application/json, text/html      — preferred response media types
Accept-Encoding: gzip, br, deflate      — compression algorithms client understands
Accept-Language: en-US,en;q=0.9         — preferred languages
Authorization: Bearer <token>           — credentials for this request
Content-Type: application/json          — body format (required when body present)
Content-Length: 87                       — body length in bytes
Cookie: session=abc123; theme=dark       — client sends stored cookies
Cache-Control: no-cache                  — cache directives
Connection: keep-alive                   — maintain TCP connection after response
User-Agent: Mozilla/5.0 (...)           — client software identification
Referer: https://example.com/page       — page that linked to this request
Origin: https://example.com             — CORS: origin of request (no path)
X-Forwarded-For: 203.0.113.10           — real client IP behind a proxy
If-None-Match: "abc123"                 — conditional GET (ETag from previous response)
If-Modified-Since: Wed, 1 Jan 2025 ... — conditional GET (date from previous response)
Range: bytes=0-1023                      — partial content request
```

### Common Response Headers

```
Content-Type: application/json; charset=utf-8
Content-Length: 87
Content-Encoding: gzip                   — body is compressed
Transfer-Encoding: chunked               — body sent in chunks (no Content-Length needed)
Cache-Control: max-age=3600, public     — how long to cache
ETag: "abc123"                           — resource version fingerprint
Last-Modified: Wed, 01 Jan 2025 ...     — last modification time
Location: /api/users/42                  — redirect target or created resource URL
Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Strict
WWW-Authenticate: Bearer realm="api"    — auth challenge (accompanies 401)
Access-Control-Allow-Origin: *          — CORS: allowed origins
Strict-Transport-Security: max-age=31536000; includeSubDomains  — HSTS
X-Content-Type-Options: nosniff         — security header
X-Frame-Options: DENY                   — clickjacking protection
Content-Security-Policy: default-src 'self'  — XSS protection
Retry-After: 60                         — with 503/429: seconds until retry
Vary: Accept-Encoding                   — what factors affect the cached response
```

---

## HTTP/1.1 Performance Problems

```
Head-of-line (HOL) blocking:
  Pipelining: send multiple requests without waiting for responses
  But responses must come back IN ORDER
  If request 1 is slow, requests 2-10 are blocked — HOL blocking
  In practice: most browsers don't enable pipelining; use parallel connections instead

The 6-connection workaround:
  Browsers open up to 6 parallel TCP connections per domain to overcome HOL blocking
  → 6× connection overhead, 6× TLS handshakes, 6× slow start
  Domain sharding: put resources on static1.example.com, static2.example.com, etc.
  → Each domain gets 6 more connections (antipattern — don't do this with HTTP/2+)

Large header overhead:
  Every request sends full Cookie, User-Agent, Accept headers again
  No compression of headers in HTTP/1.1
  A 100-byte request can have 1,400 bytes of headers
```

---

## HTTP/2 (RFC 7540, 2015)

HTTP/2 is a binary framing protocol — same semantics (methods, headers, status codes) but completely different wire format.

### Binary Framing

```
HTTP/1.1: text-based (human-readable but hard to parse)
  GET /api/users HTTP/1.1\r\nHost: example.com\r\n\r\n

HTTP/2: binary frames (efficient but requires a parser)
  Each frame has: Length(24) | Type(8) | Flags(8) | Stream ID(31) | Payload(n)

Frame types:
  DATA         — carries request or response body
  HEADERS      — carries request/response headers (HPACK-compressed)
  PRIORITY     — stream priority
  RST_STREAM   — cancel a stream
  SETTINGS     — connection parameters
  PUSH_PROMISE — server push announcement
  PING         — keepalive and RTT measurement
  GOAWAY       — graceful connection close
  WINDOW_UPDATE — flow control
  CONTINUATION — continuation of HEADERS frame
```

### Multiplexing — No HOL Blocking

```
HTTP/1.1: One request/response per TCP connection at a time
  Request 1 → Response 1 → Request 2 → Response 2 ...

HTTP/2: All requests/responses interleaved on ONE TCP connection
  Stream 1 Frame → Stream 3 Frame → Stream 1 Frame → Stream 5 Frame ...
  Stream 1, 3, and 5 all in flight simultaneously
  Response frames from different streams are interleaved — no waiting

This eliminates the need for:
  Multiple parallel connections
  Domain sharding
  Resource concatenation (CSS/JS bundles)
  Image sprites (combining images to reduce requests)
```

### HPACK Header Compression (RFC 7541)

```
Static table: 61 pre-defined common headers (e.g., ":method GET" = index 2)
Dynamic table: headers seen in this connection, added over time

Example:
  First request: :method GET, :path /api/users, :scheme https, host: example.com
    → Headers encoded with references: method=index 2, path encoded, etc.
    → 50 bytes instead of 150 bytes
  Second request to same host:
    → Path + method only need to change — host is already in dynamic table
    → ~10 bytes vs full header repetition

Compression ratio: typically 70-90% reduction in header size
```

### Server Push

```
Server proactively sends resources the client will need before being asked:
  Client requests index.html
  Server responds with index.html AND pushes style.css and app.js
  Before client even parses index.html and discovers those resources

In practice:
  Server Push was widely deployed but rarely helped and often hurt
  Browser cache already had the resource → wasted bandwidth
  Link preload header (<link rel="preload">) is the preferred alternative now
  HTTP/2 Server Push deprecated in Chrome in 2022
  HTTP/3 / QUIC: Server Push still in spec but rarely used
```

### Still Has HOL Blocking!

```
HTTP/2 eliminates APPLICATION-level HOL blocking (multiple streams)
BUT: HTTP/2 runs over TCP
  A single lost TCP segment blocks ALL HTTP/2 streams until retransmitted
  Even though the streams are independent at the HTTP layer,
  TCP must deliver bytes in order — one loss blocks all

Example:
  10 HTTP/2 streams active
  Stream 3's data packet is lost
  TCP retransmits → all 10 streams wait for that one packet
  HTTP/3 / QUIC eliminates this by using independent UDP streams
```

---

## HTTP/3 (RFC 9114, 2022)

HTTP/3 is HTTP/2's semantics over QUIC instead of TCP.

```
HTTP/2 over TCP:          HTTP/3 over QUIC:
  TLS 1.3                    TLS 1.3 (integrated into QUIC)
  TCP (has HOL blocking)      QUIC (independent streams, no HOL blocking)
  One IP-bound connection     Connection ID (survives IP change)
  2+ RTT setup                1 RTT (0-RTT on resumption)

QPACK header compression:
  HTTP/2: HPACK on single ordered stream (encoder/decoder tightly coupled)
  HTTP/3: QPACK (RFC 9204) — adapts HPACK for QUIC's out-of-order delivery
  Two dedicated unidirectional streams for QPACK encoder/decoder instructions

Adoption (2024):
  ~30% of websites support HTTP/3
  Chrome, Firefox, Safari, Edge all support it
  Cloudflare, Google, Meta serve all traffic over HTTP/3
```

---

## Caching

```
Cache-Control directives:
  max-age=3600       — cache for 3600 seconds (used by browser and CDN)
  s-maxage=86400     — CDN-specific max age (overrides max-age for shared caches)
  public             — can be cached by any cache (CDN, proxy)
  private            — only the client browser (not CDN/proxy)
  no-cache           — must revalidate with server before use (not "don't cache")
  no-store           — don't cache at all (sensitive data)
  must-revalidate    — expired cached response must be revalidated before use
  immutable          — content will never change (e.g., fingerprinted assets: app.abc123.js)
  stale-while-revalidate=86400  — serve stale while revalidating in background

ETag-based validation:
  Server returns: ETag: "abc123"
  Browser caches resource with ETag
  Next request: If-None-Match: "abc123"
  Server: 304 Not Modified (no body) if unchanged → saves bandwidth
             200 OK + new body if changed

Date-based validation:
  Server returns: Last-Modified: Wed, 01 Jan 2025 12:00:00 GMT
  Next request: If-Modified-Since: Wed, 01 Jan 2025 12:00:00 GMT
  Server: 304 if unchanged, 200 if modified

Vary header:
  Vary: Accept-Encoding
  → Cache stores separate versions for gzip vs br vs uncompressed
  → CDN must cache per combination of Vary headers
```

---

## HTTPS and TLS

HTTP runs over TLS (Transport Layer Security) for encryption and authentication. This is covered in detail in the security section, but the basics:

```
HTTPS = HTTP + TLS (over TCP port 443)
HTTP/3 = HTTP + QUIC (which integrates TLS 1.3) over UDP port 443

TLS handshake (TLS 1.3, RFC 8446):
  1. Client: ClientHello (supported ciphers, TLS version, key_share)
  2. Server: ServerHello + Certificate + CertificateVerify + Finished
     (Server can send encrypted response in the SAME RTT as its Hello)
  3. Client: Finished + first HTTP request
  → 1 RTT total before first data (vs 2 RTT in TLS 1.2)

HSTS (HTTP Strict Transport Security):
  Server sends: Strict-Transport-Security: max-age=31536000; includeSubDomains
  Browser: never sends HTTP to this domain again — always HTTPS
  includeSubDomains: applies to all subdomains too
  Preload: browsers ship with a hardcoded HSTS list (no initial HTTP request ever)
```

---

## REST API Design Conventions

```
Resource naming:
  /users             — collection of users
  /users/42          — specific user
  /users/42/orders   — orders belonging to user 42
  /orders            — top-level orders collection
  Use nouns not verbs: /users not /getUsers

HTTP method usage:
  GET    /users         → 200 list of users
  POST   /users         → 201 created user; Location: /users/42
  GET    /users/42      → 200 user; 404 if not found
  PUT    /users/42      → 200 replaced user; 404 if not found
  PATCH  /users/42      → 200 partially updated user
  DELETE /users/42      → 204 no content; 404 if not found
  GET    /users?active=true&page=0&size=20 → filtered+paginated list

Response body:
  Always return consistent structure
  Errors: {"code":"NOT_FOUND","message":"User 42 not found","timestamp":"..."}
  Lists: {"data":[...], "total":100, "page":0, "size":20} (envelope with metadata)
  Or just the array for simple cases: [{"id":1,...},{"id":2,...}]

Versioning strategies:
  URL: /api/v1/users, /api/v2/users
  Header: Accept: application/vnd.myapp.v2+json
  Query param: /api/users?version=2 (least preferred)
```

---

## Tips

- Always include `Content-Type: application/json` when sending a request body — missing it causes many frameworks to ignore the body entirely.
- Use 422 (Unprocessable Entity) for validation failures, not 400 (Bad Request) — 400 means the request was structurally malformed; 422 means valid syntax but semantic validation failed.
- Avoid custom `X-` headers for new designs (RFC 6648 deprecated this convention in 2012) — just use a plain header name.
- HTTP/2's `max_concurrent_streams` setting controls how many concurrent streams a server handles per connection — tune it based on server capacity.
- `Cache-Control: no-cache` does NOT mean "don't cache" — it means "cache but always revalidate." `no-store` means "don't cache."

---

## Summary

- HTTP/0.9→1.1 transition added headers, status codes, methods, persistent connections, and virtual hosting (Host header).
- HTTP/1.1 HOL blocking workaround: browsers open 6 parallel connections per domain — replaced by HTTP/2 multiplexing.
- HTTP/2 introduces binary framing, multiplexed streams (no app-level HOL blocking), HPACK header compression, and optional server push — still runs over TCP (TCP-level HOL blocking remains).
- HTTP/3 runs over QUIC: independent streams (no HOL blocking at any layer), 0-RTT resumption, connection migration, always encrypted.
- Cache-Control: `max-age` sets TTL; `no-cache` means revalidate; `no-store` means never cache; `immutable` means never check again.
- REST conventions: nouns not verbs in URLs, HTTP method semantics (GET/safe/idempotent, POST/neither, PUT/idempotent, DELETE/idempotent).
