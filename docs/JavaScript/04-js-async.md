---
title: "Async JavaScript"
sidebar_label: "Async & Promises"
sidebar_position: 4
---

# Async JavaScript

JavaScript is single-threaded — only one thing runs at a time. But it can start slow operations (network, disk, timers) and continue doing other things while waiting. That's asynchronous programming. Mastering it is non-negotiable for any serious JavaScript work.

---

## The Event Loop

Understanding the event loop explains why async code behaves the way it does.

```
Call Stack          — where currently executing code lives
Web APIs / Node APIs — where async operations run (timers, fetch, fs)
Microtask Queue     — Promise callbacks (.then, .catch, queueMicrotask)
Macrotask Queue     — setTimeout, setInterval, I/O callbacks, setImmediate
```

**Order of execution:**
1. All synchronous code (call stack) runs first.
2. Microtasks (Promise callbacks) run — drain the entire queue.
3. One macrotask runs (setTimeout callback, I/O callback, etc.).
4. Microtasks again.
5. Next macrotask. Repeat.

```js
console.log("1 — sync");

setTimeout(() => console.log("5 — macrotask 1"), 0);
setTimeout(() => console.log("6 — macrotask 2"), 0);

Promise.resolve()
    .then(() => console.log("3 — microtask 1"))
    .then(() => console.log("4 — microtask 2"));

queueMicrotask(() => console.log("3.5 — microtask via queueMicrotask"));

console.log("2 — sync");

// Output:
// 1 — sync
// 2 — sync
// 3 — microtask 1
// 3.5 — microtask via queueMicrotask
// 4 — microtask 2   (chained off microtask 1)
// 5 — macrotask 1
// 6 — macrotask 2
```

**Key insight:** All microtasks (Promise `.then`) run before the next macrotask, even if the macrotask was queued first.

---

## Callbacks

The original async pattern. A function you pass to be called later.

```js
// Node.js-style: callback(error, result)
function readFile(path, callback) {
    fs.readFile(path, "utf8", (err, data) => {
        if (err) return callback(err);   // error-first convention
        callback(null, data);
    });
}

readFile("./data.txt", (err, data) => {
    if (err) {
        console.error("Failed:", err.message);
        return;
    }
    console.log("Got:", data);
});

// The problem — callback hell (pyramid of doom)
getUser(userId, (err, user) => {
    if (err) return handleError(err);
    getOrders(user.id, (err, orders) => {
        if (err) return handleError(err);
        getOrderDetails(orders[0].id, (err, details) => {
            if (err) return handleError(err);
            sendInvoice(details, user.email, (err, result) => {
                if (err) return handleError(err);
                console.log("Done:", result);
                // 4 levels deep and still going...
            });
        });
    });
});
```

Callbacks are fine for simple cases but break down quickly with sequential async operations.

---

## Promises

A Promise is an object representing the eventual result (or failure) of an async operation.

```js
// States:
// pending   — initial state, not settled yet
// fulfilled — operation succeeded, has a value
// rejected  — operation failed, has a reason (error)
// settled   — either fulfilled or rejected (final, can't change again)

// Creating a Promise
const p = new Promise((resolve, reject) => {
    // Do async work here
    setTimeout(() => {
        const success = Math.random() > 0.5;
        if (success) {
            resolve({ id: 1, name: "Alice" });  // fulfill with a value
        } else {
            reject(new Error("Something went wrong"));  // reject with error
        }
    }, 1000);
});
```

### Consuming Promises

```js
p
    .then(user => {
        // Runs if fulfilled
        console.log("User:", user.name);
        return user.id;          // returned value passes to next .then
    })
    .then(id => {
        console.log("ID:", id);  // 1
        return fetchOrders(id);  // can return another Promise — chaining!
    })
    .then(orders => {
        console.log("Orders:", orders);
    })
    .catch(err => {
        // Runs if ANY step throws or rejects
        console.error("Error:", err.message);
        return [];  // you can recover — next .then gets this
    })
    .finally(() => {
        // Always runs — success or failure
        hideLoadingSpinner();
    });
```

### Promise Chain vs Nested (common mistake)

```js
// WRONG — nested, errors don't propagate correctly
fetch("/users/1").then(res => {
    res.json().then(user => {         // nested — don't do this
        console.log(user);
    });
});

// CORRECT — flat chain, return the Promise
fetch("/users/1")
    .then(res => res.json())          // return the Promise
    .then(user => console.log(user))  // gets the resolved value
    .catch(err => console.error(err));
```

### Creating Pre-Resolved Promises

```js
Promise.resolve(42)          // immediately fulfilled with 42
Promise.reject(new Error())  // immediately rejected

// Useful for making synchronous values work in async chains
function getUser(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));  // sync but looks async
    return fetchFromDB(id);
}
```

### Promise.all — Wait for All

```js
// All succeed → array of results (in same order as input)
// Any fails → immediately rejects with that error
const [user, posts, comments] = await Promise.all([
    fetchUser(1),
    fetchPosts(1),
    fetchComments(1)
]);
// All three run in parallel — takes as long as the slowest one

// Error handling with Promise.all
try {
    const results = await Promise.all([task1(), task2(), task3()]);
} catch (err) {
    // One of them failed — results of others are lost
    console.error("At least one failed:", err.message);
}
```

### Promise.allSettled — Wait for All, Get All Results

```js
// Never rejects — waits for all, gives you each result
const results = await Promise.allSettled([
    fetchUser(1),
    fetchUser(2),
    Promise.reject(new Error("User 3 not found"))
]);

results.forEach(result => {
    if (result.status === "fulfilled") {
        console.log("Got:", result.value);
    } else {
        console.log("Failed:", result.reason.message);
    }
});
// Use when you need all attempts to complete and want to handle each individually
```

### Promise.race — First to Settle Wins

```js
// First to fulfill OR reject wins — others are ignored (still run, just ignored)
const result = await Promise.race([
    fetch("https://server1.com/data"),
    fetch("https://server2.com/data")
]);
// Whichever server responds first wins

// Timeout pattern with race
function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

const user = await withTimeout(fetchUser(1), 5000);
// Rejects if fetchUser takes more than 5 seconds
```

### Promise.any — First to Succeed

```js
// First FULFILLED wins — rejects only if ALL fail
const fastest = await Promise.any([
    fetch("https://cdn1.example.com/data"),
    fetch("https://cdn2.example.com/data"),
    fetch("https://cdn3.example.com/data")
]);
// Gets data from whichever CDN responds first

// If ALL fail:
try {
    await Promise.any([
        Promise.reject(new Error("A")),
        Promise.reject(new Error("B"))
    ]);
} catch (err) {
    err instanceof AggregateError  // true
    err.errors                     // [Error("A"), Error("B")]
}
```

---

## async / await

Syntactic sugar over Promises. Makes async code look and read like synchronous code.

```js
// async — declares that a function returns a Promise
async function fetchUser(id) {
    return { id, name: "Alice" };  // auto-wrapped in Promise.resolve()
}

// Same as:
function fetchUser(id) {
    return Promise.resolve({ id, name: "Alice" });
}

// await — pauses execution until the Promise resolves
// ONLY valid inside async functions (or at top level of ES modules)
async function loadProfile(userId) {
    const user = await fetchUser(userId);       // waits for this
    const posts = await fetchPosts(user.id);    // then waits for this
    const avatar = await fetchAvatar(user.id);  // then this
    return { user, posts, avatar };
}
```

### Error Handling

```js
// try/catch — catches both sync errors and rejected Promises
async function loadData(id) {
    try {
        const user = await fetchUser(id);

        if (!user) {
            throw new Error("User not found");  // sync throw — caught by catch
        }

        const posts = await fetchPosts(user.id); // rejected Promise — also caught
        return { user, posts };
    } catch (err) {
        console.error("Failed:", err.message);
        return null;  // recover with a fallback value
    } finally {
        hideSpinner();  // always runs
    }
}

// Handling individual steps differently
async function loadProfile(id) {
    const user = await fetchUser(id);  // let this throw if it fails

    // Handle this one separately
    let avatar = null;
    try {
        avatar = await fetchAvatar(id);  // optional — don't fail if missing
    } catch {
        // ignore avatar failure, continue with null
    }

    return { user, avatar };
}

// .catch() on individual awaits (less common but useful)
const user = await fetchUser(id).catch(() => null);
if (!user) return res.status(404).json({ error: "Not found" });
```

### Sequential vs Parallel

```js
// SEQUENTIAL — waits for each before starting next — total: sum of all times
async function sequential() {
    const a = await fetchA();  // 1s
    const b = await fetchB();  // 1s — starts AFTER a finishes
    const c = await fetchC();  // 1s — starts AFTER b finishes
    // Total: ~3s
    return [a, b, c];
}

// PARALLEL — all start at the same time — total: longest one
async function parallel() {
    const [a, b, c] = await Promise.all([
        fetchA(),  // all three start immediately
        fetchB(),
        fetchC()
    ]);
    // Total: ~1s
    return [a, b, c];
}

// PARALLEL with individual error handling
async function parallelSafe() {
    const [a, b, c] = await Promise.all([
        fetchA().catch(e => ({ error: e.message })),
        fetchB().catch(e => ({ error: e.message })),
        fetchC().catch(e => ({ error: e.message }))
    ]);
    // Returns even if some fail — failures have { error } instead of data
    return [a, b, c];
}

// PARALLEL — start all, await each result separately (rare but useful)
async function parallelDetailed() {
    // All start immediately
    const promiseA = fetchA();
    const promiseB = fetchB();
    const promiseC = fetchC();

    // Await each result
    const a = await promiseA;
    const b = await promiseB;
    const c = await promiseC;
    return [a, b, c];
}
```

### Async Iteration

```js
// Async generator — yields values asynchronously
async function* streamUsers() {
    let page = 0;
    while (true) {
        const users = await fetchPage(page++);
        if (users.length === 0) break;
        for (const user of users) {
            yield user;
        }
    }
}

// Consume with for await...of
for await (const user of streamUsers()) {
    console.log(user.name);
    // Processes each user as it comes in, without loading all into memory
}

// Collect all (careful with large datasets)
const allUsers = [];
for await (const user of streamUsers()) {
    allUsers.push(user);
}
```

### Top-Level Await (ES2022)

```js
// In .mjs files or files with "type": "module" in package.json
// Can use await directly at the top level — no async wrapper needed

const config = await fetch("/api/config").then(r => r.json());
const db = await connectToDatabase(config.dbUrl);

export { db };
// Other modules that import db will wait for this to resolve
```

---

## Error Handling Patterns

### Wrapping Async Functions

```js
// Utility to avoid try/catch everywhere
async function tryCatch(promise) {
    try {
        const data = await promise;
        return [data, null];
    } catch (err) {
        return [null, err];
    }
}

// Usage — Go-style error handling
const [user, err] = await tryCatch(fetchUser(1));
if (err) {
    console.error("Failed:", err.message);
    return;
}
console.log(user.name);

// Or with a callback approach
async function safe(fn) {
    try {
        return { data: await fn(), error: null };
    } catch (error) {
        return { data: null, error };
    }
}
const { data: user, error } = await safe(() => fetchUser(1));
```

### Retrying Failed Operations

```js
async function withRetry(fn, { retries = 3, delay = 1000, backoff = 2 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < retries) {
                const waitTime = delay * Math.pow(backoff, attempt);
                console.log(`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
}

// Usage
const user = await withRetry(() => fetchUser(1), { retries: 3, delay: 500, backoff: 2 });
// Tries: immediately, 500ms, 1000ms, 2000ms — then throws
```

---

## Timers

```js
// setTimeout — run once after delay
const timerId = setTimeout(() => {
    console.log("Runs after 2 seconds");
}, 2000);

clearTimeout(timerId);  // cancel before it fires

// setInterval — run repeatedly
const intervalId = setInterval(() => {
    console.log("Runs every second");
}, 1000);

clearInterval(intervalId);  // stop it

// setImmediate (Node.js only) — runs after I/O callbacks, before setTimeout
setImmediate(() => console.log("after I/O"));

// process.nextTick (Node.js only) — runs before any I/O, before Promises
process.nextTick(() => console.log("before everything else"));

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function example() {
    console.log("start");
    await sleep(1000);
    console.log("after 1 second");
}

// Repeat with async/await
async function pollForResult() {
    while (true) {
        const result = await checkStatus();
        if (result.done) return result;
        await sleep(2000);  // wait 2s before checking again
    }
}
```

---

## fetch API

The browser (and Node.js 18+) built-in for HTTP requests.

```js
// Basic GET
const res = await fetch("https://api.example.com/users");
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
const users = await res.json();

// Reading response body (can only read ONCE — it's a stream)
res.json()        // parse as JSON
res.text()        // parse as string
res.blob()        // parse as Blob (images, files)
res.arrayBuffer() // parse as binary
res.formData()    // parse as FormData

// POST with JSON body
const res = await fetch("/api/users", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name: "Alice", email: "alice@example.com" })
});
const created = await res.json();

// With AbortController — cancel requests
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);  // cancel after 5s

try {
    const res = await fetch("/api/slow-endpoint", {
        signal: controller.signal
    });
    const data = await res.json();
    clearTimeout(timeout);
    return data;
} catch (err) {
    if (err.name === "AbortError") {
        console.log("Request was cancelled");
    } else {
        throw err;
    }
}

// Fetch wrapper with common config
async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`,
            ...options.headers
        },
        ...options
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return null;  // No Content
    return res.json();
}

// Usage
const users = await api("/users");
const user = await api("/users/1");
const created = await api("/users", {
    method: "POST",
    body: JSON.stringify({ name: "Alice" })
});
```

---

## Summary

- The event loop: sync code → microtasks (Promises) → macrotasks (setTimeout).
- Callbacks work but lead to callback hell for sequential async operations.
- Promises chain with `.then()` / `.catch()` — always return the Promise from `.then()`.
- `async/await` is syntactic sugar over Promises — use `try/catch` for error handling.
- Use `Promise.all` for parallel tasks; `Promise.allSettled` when you need all results even on failure.
- `Promise.race` for timeouts; `Promise.any` for first-success patterns.
- Always handle rejected Promises — unhandled rejections crash Node.js processes.
- Never `await` inside a loop unless the operations truly need to be sequential — use `Promise.all` for parallel.
