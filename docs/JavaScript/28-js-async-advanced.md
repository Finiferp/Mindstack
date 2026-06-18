---
title: "Async — Advanced Patterns"
sidebar_label: "Async Advanced"
sidebar_position: 28
---

# Async — Advanced Patterns

Advanced async patterns beyond basic promises and async/await: structured concurrency, abort signals, streaming, web workers, and real-world API integration patterns.

---

## AbortController and AbortSignal

`AbortController` cancels async operations that support it — fetch requests, streams, and your own code.

```js
// Basic usage
const controller = new AbortController();
const signal     = controller.signal;

// Start an operation
const promise = fetch("/api/data", { signal });

// Cancel it
controller.abort();                              // signal.aborted → true
controller.abort(new Error("User cancelled"));  // abort with a reason

// Check abort state
signal.aborted          // true after abort()
signal.reason           // the abort reason (Error or undefined)
signal.throwIfAborted() // throws if already aborted

// Listen for abort
signal.addEventListener("abort", () => {
    console.log("Operation was aborted:", signal.reason);
});

// ── Abort with timeout ─────────────────────────────────────────────────────
const signal = AbortSignal.timeout(5000);        // auto-aborts after 5s

// ── Abort any (first abort wins) ──────────────────────────────────────────
const controller1 = new AbortController();
const controller2 = new AbortController();
const combined    = AbortSignal.any([controller1.signal, controller2.signal]);
// combined aborts when EITHER controller1 or controller2 aborts

// ── Combine timeout and manual abort ──────────────────────────────────────
const controller    = new AbortController();
const timeoutSignal = AbortSignal.timeout(5000);
const signal        = AbortSignal.any([controller.signal, timeoutSignal]);

try {
    const data = await fetch("/api/slow", { signal });
} catch (err) {
    if (err.name === "AbortError") {
        console.log("Cancelled (manual or timeout)");
    }
}

// ── Making your own cancellable functions ─────────────────────────────────
async function fetchWithRetry(url, options = {}) {
    const { signal, retries = 3, ...fetchOptions } = options;

    signal?.throwIfAborted();  // throw immediately if already aborted

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { ...fetchOptions, signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            if (err.name === "AbortError") throw err;  // don't retry on abort
            if (attempt === retries) throw err;
            await sleep(1000 * attempt);
        }
    }
}

// ── Cancellable delay ──────────────────────────────────────────────────────
function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason);
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        }, { once: true });
    });
}

// ── Cancellable async iteration ────────────────────────────────────────────
async function* paginatedFetch(baseUrl, signal) {
    let page = 0;
    while (true) {
        signal?.throwIfAborted();
        const data = await fetch(`${baseUrl}?page=${page}`, { signal }).then(r => r.json());
        if (!data.items.length) return;
        yield* data.items;
        if (!data.hasNextPage) return;
        page++;
    }
}
```

---

## Structured Concurrency

Managing groups of async tasks so they all succeed or all fail together.

```js
// ── TaskGroup — cancel all tasks if one fails ──────────────────────────────
class TaskGroup {
    #controller = new AbortController();
    #tasks      = [];

    get signal() { return this.#controller.signal; }

    add(fn) {
        const task = fn(this.#controller.signal).catch(err => {
            this.#controller.abort(err);  // abort others on failure
            throw err;
        });
        this.#tasks.push(task);
        return task;
    }

    async all() {
        try {
            return await Promise.all(this.#tasks);
        } finally {
            this.#controller.abort();  // cleanup
        }
    }

    abort(reason) { this.#controller.abort(reason); }
}

const group = new TaskGroup();
group.add(signal => fetchUser(1, { signal }));
group.add(signal => fetchPosts(1, { signal }));
group.add(signal => fetchComments(1, { signal }));
const [user, posts, comments] = await group.all();
// If any fails, the others are cancelled

// ── Semaphore — limit concurrency ──────────────────────────────────────────
class Semaphore {
    #slots;
    #queue = [];

    constructor(slots) { this.#slots = slots; }

    async acquire() {
        if (this.#slots > 0) { this.#slots--; return; }
        return new Promise(resolve => this.#queue.push(resolve));
    }

    release() {
        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift();
            resolve();
        } else {
            this.#slots++;
        }
    }

    async run(fn) {
        await this.acquire();
        try { return await fn(); }
        finally { this.release(); }
    }
}

// Process URLs but max 5 at a time
const sem = new Semaphore(5);
const results = await Promise.all(
    urls.map(url => sem.run(() => fetch(url).then(r => r.json())))
);

// ── Queue — process tasks one at a time ────────────────────────────────────
class AsyncQueue {
    #queue   = Promise.resolve();

    enqueue(fn) {
        const result = this.#queue.then(fn);
        this.#queue  = result.catch(() => {});  // don't let errors stop the queue
        return result;
    }
}

const queue = new AsyncQueue();
queue.enqueue(() => saveUser(user1));
queue.enqueue(() => saveUser(user2));   // waits for user1 to finish
queue.enqueue(() => sendEmail(user3));  // waits for user2 to finish
```

---

## Streams API

The Streams API processes data in chunks — essential for large files, video, and real-time data.

```js
// ── ReadableStream ─────────────────────────────────────────────────────────
const stream = new ReadableStream({
    start(controller) {
        // Called immediately
        controller.enqueue("chunk 1");
        controller.enqueue("chunk 2");
        controller.close();            // signal end of stream
    },
    pull(controller) {
        // Called when consumer wants more data
        // Fetch next chunk here
    },
    cancel(reason) {
        // Called when consumer cancels the stream
    }
});

// Read with async iterator
for await (const chunk of stream) {
    console.log(chunk);   // "chunk 1", "chunk 2"
}

// Read with reader
const reader = stream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log("Chunk:", value);
}
reader.releaseLock();

// ── Fetch as stream ────────────────────────────────────────────────────────
const response = await fetch("/api/large-file");
const reader   = response.body.getReader();
const total    = parseInt(response.headers.get("Content-Length") ?? "0");
let received   = 0;

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    const progress = total ? (received / total * 100).toFixed(1) : "?";
    console.log(`${progress}% downloaded`);
    processChunk(value);  // process immediately without buffering entire file
}

// ── WritableStream ─────────────────────────────────────────────────────────
const writable = new WritableStream({
    start()              { console.log("Stream opened"); },
    write(chunk, controller) { console.log("Writing:", chunk); },
    close()              { console.log("Stream closed"); },
    abort(reason)        { console.log("Aborted:", reason); }
});

const writer = writable.getWriter();
await writer.write("chunk 1");
await writer.write("chunk 2");
await writer.close();

// ── TransformStream — read, transform, write ──────────────────────────────
const upperCase = new TransformStream({
    transform(chunk, controller) {
        controller.enqueue(chunk.toUpperCase());
    }
});

// Pipe: readable → transform → writable
await readableStream
    .pipeThrough(upperCase)
    .pipeTo(writableStream);

// ── TextDecoder stream ─────────────────────────────────────────────────────
async function streamTextBody(url) {
    const response = await fetch(url);
    const reader   = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

    let result = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += value;        // value is now a string, not Uint8Array
    }
    return result;
}

// ── Server-Sent Events stream parsing ─────────────────────────────────────
async function* streamSSE(url) {
    const response = await fetch(url, {
        headers: { Accept: "text/event-stream" }
    });
    const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";  // incomplete last event back to buffer
        for (const event of events) {
            const lines    = event.split("\n");
            const dataLine = lines.find(l => l.startsWith("data:"));
            if (dataLine) yield JSON.parse(dataLine.slice(5));
        }
    }
}

for await (const event of streamSSE("/api/events")) {
    console.log("Event:", event);
}
```

---

## Web Workers

Workers run JavaScript on a separate thread — for CPU-intensive work that would block the UI.

```js
// ── Creating a worker ──────────────────────────────────────────────────────

// main.js
const worker = new Worker("/worker.js");                     // classic
const worker = new Worker(new URL("./worker.js", import.meta.url)); // ESM-friendly

// Send data TO worker
worker.postMessage({ type: "SORT", data: [3, 1, 4, 1, 5, 9] });
worker.postMessage({ type: "SORT", data: largeArray });

// Receive FROM worker
worker.onmessage = (event) => {
    console.log("Result:", event.data);
};
worker.addEventListener("message", (event) => { });

worker.onerror = (error) => {
    console.error("Worker error:", error.message, error.filename, error.lineno);
};

// Terminate worker
worker.terminate();

// ── worker.js (runs in separate thread) ────────────────────────────────────
// No DOM access, no window, but has:
// self, postMessage, setTimeout, fetch, crypto, WebSocket, importScripts

self.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === "SORT") {
        const sorted = [...data].sort((a, b) => a - b);
        self.postMessage({ type: "SORT_RESULT", data: sorted });
    }
};

// ── Transferable objects — zero-copy transfer ──────────────────────────────
// Instead of copying (slow for large data):
const buffer  = new ArrayBuffer(1024 * 1024 * 100);  // 100MB
worker.postMessage({ data: buffer }, [buffer]);        // transfer ownership
// buffer is now empty/detached in main thread — very fast

// ── SharedArrayBuffer — shared memory between threads ─────────────────────
// Requires cross-origin isolation headers:
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

const shared  = new SharedArrayBuffer(4);         // 4 bytes shared memory
const view    = new Int32Array(shared);

// Main thread
worker.postMessage({ shared });
view[0] = 42;

// Worker thread
self.onmessage = ({ data: { shared } }) => {
    const view = new Int32Array(shared);
    console.log(view[0]);  // 42 — sees main thread's value
    Atomics.store(view, 0, 100);   // atomic write
};

// Atomic operations (safe concurrent access)
Atomics.load(view, 0)               // atomic read
Atomics.store(view, 0, 42)          // atomic write
Atomics.add(view, 0, 1)             // atomic increment
Atomics.sub(view, 0, 1)             // atomic decrement
Atomics.and(view, 0, mask)          // bitwise AND
Atomics.or(view, 0, mask)           // bitwise OR
Atomics.xor(view, 0, mask)          // bitwise XOR
Atomics.compareExchange(view, 0, expected, replacement)  // CAS
Atomics.wait(view, 0, expected, timeout)  // block until value changes (workers only)
Atomics.notify(view, 0, count)      // wake up waiting workers

// ── Module workers ─────────────────────────────────────────────────────────
const worker = new Worker("/worker.js", { type: "module" });
// Now worker.js can use import/export

// ── Inline workers ─────────────────────────────────────────────────────────
const code = `
    self.onmessage = ({ data }) => {
        const result = data.map(n => n * 2);
        self.postMessage(result);
    };
`;
const blob   = new Blob([code], { type: "text/javascript" });
const url    = URL.createObjectURL(blob);
const worker = new Worker(url);
URL.revokeObjectURL(url);

// ── Promise-based worker wrapper ───────────────────────────────────────────
function createWorker(url) {
    const worker  = new Worker(url);
    let requestId = 0;
    const pending = new Map();

    worker.onmessage = ({ data: { id, result, error } }) => {
        const { resolve, reject } = pending.get(id) ?? {};
        pending.delete(id);
        if (error) reject(new Error(error));
        else       resolve(result);
    };

    return {
        run(type, data) {
            const id = ++requestId;
            return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
                worker.postMessage({ id, type, data });
            });
        },
        terminate() { worker.terminate(); }
    };
}

const worker = createWorker("/worker.js");
const sorted = await worker.run("SORT", [3, 1, 4, 1, 5, 9]);
```

---

## Service Workers

Service workers intercept network requests, enabling offline support and caching.

```js
// ── Registration ───────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/"   // URLs this SW controls
    });

    registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New version available! Refresh to update.");
            }
        });
    });
}

// ── sw.js — service worker ─────────────────────────────────────────────────
const CACHE_NAME = "v1";
const URLS_TO_CACHE = ["/", "/index.html", "/styles.css", "/app.js"];

// Install — cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
    );
    self.skipWaiting();  // activate immediately without waiting for old SW to die
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        )
    );
    self.clients.claim();  // take control of existing pages immediately
});

// Fetch — intercept requests
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Cache-first for static assets
    if (url.origin === self.location.origin && URLS_TO_CACHE.includes(url.pathname)) {
        event.respondWith(
            caches.match(request).then(cached => cached ?? fetch(request))
        );
        return;
    }

    // Network-first for API calls
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful GET responses
                    if (request.method === "GET" && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))  // fallback to cache if offline
        );
        return;
    }

    // Default: network only
    event.respondWith(fetch(request));
});

// ── Cache API directly ─────────────────────────────────────────────────────
const cache   = await caches.open("my-cache");
await cache.add("/data.json");                              // fetch and cache
await cache.addAll(["/a.js", "/b.js"]);
await cache.put(request, response);                          // cache a response
const cached  = await cache.match("/data.json");             // retrieve
const allKeys = await cache.keys();                          // list cached URLs
await cache.delete("/old-data.json");
const exists  = await caches.has("my-cache");
await caches.delete("my-cache");
```

---

## EventSource — Server-Sent Events

```js
// SSE: server pushes data to client over HTTP (one-way, auto-reconnect)
const es = new EventSource("/api/events");

// Default event
es.onmessage = (event) => {
    console.log("Data:", event.data);     // string
    console.log("ID:", event.lastEventId);
};

// Named events
es.addEventListener("user-joined", (event) => {
    const user = JSON.parse(event.data);
    console.log("User joined:", user.name);
});

es.addEventListener("heartbeat", (event) => {
    console.log("Heartbeat at:", event.data);
});

// Connection state
es.readyState  // 0=CONNECTING, 1=OPEN, 2=CLOSED
es.url         // "/api/events"

// Events
es.onopen  = () => console.log("Connected");
es.onerror = (err) => {
    if (es.readyState === EventSource.CLOSED) {
        console.log("Connection closed, not reconnecting");
    } else {
        console.log("Error, will reconnect automatically");
    }
};

// Close the connection
es.close();

// ── Server-side (Node.js/Express) ─────────────────────────────────────────
app.get("/api/events", (req, res) => {
    res.writeHead(200, {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no"      // disable nginx buffering
    });

    // Helper to send events
    function send(data, event, id) {
        if (id)    res.write(`id: ${id}\n`);
        if (event) res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Send initial state
    send({ connected: true, time: Date.now() });

    // Send updates
    const interval = setInterval(() => {
        send({ time: Date.now(), random: Math.random() }, "heartbeat");
    }, 5000);

    // Send retry instruction (ms before reconnect)
    res.write("retry: 3000\n\n");

    // Clean up on disconnect
    req.on("close", () => {
        clearInterval(interval);
        res.end();
    });
});
```

---

## Real-World Patterns

### Optimistic Updates

```js
async function deleteUser(userId) {
    // 1. Update UI immediately (optimistic)
    const previousUsers = users.value;
    users.value = users.value.filter(u => u.id !== userId);

    try {
        // 2. Try the actual operation
        await api.delete(`/users/${userId}`);
    } catch (err) {
        // 3. Rollback on failure
        users.value = previousUsers;
        toast.error("Failed to delete user");
        throw err;
    }
}
```

### Request Deduplication

```js
// Don't send the same request twice simultaneously
class RequestCache {
    #pending = new Map();

    async fetch(key, fn) {
        if (this.#pending.has(key)) {
            return this.#pending.get(key);  // return existing promise
        }
        const promise = fn().finally(() => this.#pending.delete(key));
        this.#pending.set(key, promise);
        return promise;
    }
}

const dedupe = new RequestCache();

// Two simultaneous calls to getUserById(1) only make ONE request
const [user1, user2] = await Promise.all([
    dedupe.fetch("user:1", () => api.get("/users/1")),
    dedupe.fetch("user:1", () => api.get("/users/1"))  // shares the first request
]);
```

### Polling with backoff

```js
async function pollUntilDone(jobId, { maxAttempts = 20, initialDelay = 1000 } = {}) {
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const job = await api.get(`/jobs/${jobId}`);

        if (job.status === "completed") return job.result;
        if (job.status === "failed")    throw new Error(job.error);

        if (attempt === maxAttempts) throw new Error("Job timed out");

        await sleep(delay);
        delay = Math.min(delay * 1.5, 30000);  // exponential backoff, cap at 30s
    }
}
```

---

## Summary

- `AbortController`/`AbortSignal` is the standard way to cancel async operations — always pass `signal` through to `fetch` and other cancellable APIs.
- `AbortSignal.timeout(ms)` creates a signal that auto-aborts after a timeout — no need for `Promise.race`.
- Use `Semaphore` to limit concurrency; use `AsyncQueue` to process tasks sequentially.
- Streams process data in chunks without loading everything into memory — use for large files, real-time data, and SSE.
- Workers run on a separate thread — essential for CPU-intensive tasks that would freeze the UI.
- Transfer `ArrayBuffer` to workers with the transfer array `postMessage(data, [buffer])` — zero-copy, very fast.
- Service workers intercept requests and enable offline support — always implement cache versioning.
- SSE is simpler than WebSockets for one-way server-to-client data push — it auto-reconnects built-in.
