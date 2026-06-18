---
title: "Bun.js"
sidebar_label: "Bun.js"
sidebar_position: 8
---

# Bun.js

Bun is an all-in-one JavaScript runtime, package manager, bundler, and test runner. It is built in Zig and uses JavaScriptCore (Safari's engine) instead of V8. It runs TypeScript natively, starts faster than Node.js, and ships a rich set of built-in APIs that replace common npm packages.

---

## Installation and Basics

```bash
# Install
curl -fsSL https://bun.sh/install | bash   # Unix/macOS
powershell -c "irm bun.sh/install.ps1|iex" # Windows

bun --version       # check version
bun upgrade         # upgrade to latest

# Run files
bun run index.ts    # TypeScript natively — no compile step
bun run index.js
bun index.ts        # shorthand (no "run" for files)
bun run dev         # run package.json script

# REPL
bun repl
```

---

## Package Management

Bun is a drop-in npm replacement with the same `package.json` format — just faster.

```bash
# Init new project
bun init             # interactive
bun init -y          # skip prompts

# Install all dependencies (from package.json)
bun install
bun i               # shorthand

# Add packages
bun add express
bun add zod hono
bun add -d typescript vitest   # dev dependency
bun add -g @angular/cli        # global

# Remove
bun remove express
bun rm express       # shorthand

# Update
bun update           # update all
bun update express   # update one

# Run scripts
bun run start
bun run dev
bun run build
bun run test

# Execute a one-off package without installing
bunx cowsay "hello"
```

**Lock file:** Bun creates `bun.lockb` (binary) instead of `package-lock.json`. Commit it to version control.

**Compatibility:** Most npm packages work in Bun. The `node_modules` folder is still created and structured the same way.

---

## Built-in HTTP Server

No framework needed for basic servers. The API follows the web standard `Request` / `Response` model.

```js
const server = Bun.serve({
    port: 3000,
    hostname: "0.0.0.0",  // listen on all interfaces (default: localhost)

    // fetch handles every request
    async fetch(request: Request, server): Promise<Response> {
        const url = new URL(request.url);
        const method = request.method;

        // ── Router ──────────────────────────────────────────────────────
        if (method === "GET" && url.pathname === "/") {
            return new Response("Hello, World!", {
                headers: { "Content-Type": "text/plain" }
            });
        }

        if (method === "GET" && url.pathname === "/health") {
            return Response.json({ status: "ok", time: new Date().toISOString() });
        }

        // Path params — manual parsing
        const userMatch = url.pathname.match(/^\/users\/(\d+)$/);
        if (method === "GET" && userMatch) {
            const id = parseInt(userMatch[1], 10);
            const user = await db.user.findUnique({ where: { id } });
            if (!user) return Response.json({ error: "Not found" }, { status: 404 });
            return Response.json(user);
        }

        if (method === "POST" && url.pathname === "/users") {
            const body = await request.json();
            const user = await db.user.create({ data: body });
            return Response.json(user, { status: 201 });
        }

        // Query params
        if (url.pathname === "/search") {
            const q     = url.searchParams.get("q") ?? "";
            const page  = parseInt(url.searchParams.get("page") ?? "0", 10);
            const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
            return Response.json({ q, page, limit });
        }

        return new Response("Not Found", { status: 404 });
    },

    error(error: Error): Response {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

console.log(`Listening on http://localhost:${server.port}`);
```

### Reading the Request

```js
async fetch(req: Request) {
    // URL and path
    const url      = new URL(req.url);
    url.pathname;                          // "/users/42"
    url.search;                            // "?page=1&limit=20"
    url.searchParams.get("page");          // "1"
    url.searchParams.getAll("ids");        // ["1","2","3"] for ?ids=1&ids=2&ids=3
    url.searchParams.has("sort");          // true/false

    // Method and headers
    req.method;                            // "GET", "POST", ...
    req.headers.get("Authorization");      // "Bearer abc..."
    req.headers.get("Content-Type");
    req.headers.has("X-Custom");
    Object.fromEntries(req.headers);       // all headers as plain object

    // Body (consume once — pick ONE)
    const text       = await req.text();
    const json       = await req.json();
    const buffer     = await req.arrayBuffer();
    const formData   = await req.formData();
    const blob       = await req.blob();

    // Body type checks
    req.bodyUsed;    // true after body has been consumed

    // Clone to read body multiple times (e.g. in middleware)
    const clone = req.clone();
    const body1 = await req.json();
    const body2 = await clone.json();
}
```

### Building Responses

```js
// Plain text
new Response("Hello!")
new Response("Hello!", { status: 200 })

// JSON — most common
Response.json({ key: "value" })
Response.json({ error: "Not found" }, { status: 404 })
Response.json(data, {
    status: 201,
    headers: { "X-Request-Id": requestId }
})

// HTML
new Response("<h1>Hello</h1>", {
    headers: { "Content-Type": "text/html" }
})

// Binary/file
const file = Bun.file("image.png");
new Response(file)

// Stream
const stream = new ReadableStream({
    start(controller) {
        controller.enqueue("chunk1");
        controller.enqueue("chunk2");
        controller.close();
    }
});
new Response(stream, { headers: { "Content-Type": "text/event-stream" } })

// Redirect
Response.redirect("/new-path", 302)
Response.redirect("https://example.com", 301)

// No body
new Response(null, { status: 204 })

// Custom headers
new Response(body, {
    status: 200,
    headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "X-Custom-Header": "value"
    }
})
```

### CORS Handling

```js
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
};

Bun.serve({
    port: 3000,
    fetch(req) {
        // Handle CORS preflight
        if (req.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // Handle actual request
        const response = handleRequest(req);

        // Add CORS headers to every response
        const headers = new Headers(response.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
        return new Response(response.body, { status: response.status, headers });
    }
});
```

---

## Hono Framework

Hono is the recommended framework for Bun. Lightweight, fast, and works across runtimes (Bun, Node, Deno, Cloudflare Workers).

```bash
bun add hono @hono/zod-validator zod
```

### Basic Setup

```typescript
// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { compress } from "hono/compress";
import { timing } from "hono/timing";
import { rateLimiter } from "hono/rate-limiter";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

// ── Global Middleware ────────────────────────────────────────────────────
app.use("*", logger());           // request logging
app.use("*", timing());           // Server-Timing header
app.use("*", secureHeaders());    // security headers
app.use("*", compress());         // gzip
app.use("*", prettyJSON());       // ?pretty query param for JSON

app.use("*", cors({
    origin: ["http://localhost:5173", "https://myapp.com"],
    allowMethods: ["GET","POST","PUT","PATCH","DELETE"],
    allowHeaders: ["Content-Type","Authorization"],
    credentials: true
}));

// Rate limiting
app.use("/api/", rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: (c) => c.req.header("CF-Connecting-IP") ?? "unknown"
}));

export default {
    port: parseInt(Bun.env.PORT ?? "3000"),
    fetch: app.fetch
};
```

### Routing

```typescript
import { Hono } from "hono";

const app = new Hono();

// Basic routes
app.get("/",         (c) => c.text("Hello!"));
app.get("/json",     (c) => c.json({ message: "Hello!" }));
app.post("/users",   (c) => c.json({ created: true }, 201));
app.put("/users/:id",(c) => c.json({ updated: true }));
app.patch("/users/:id", (c) => c.json({ patched: true }));
app.delete("/users/:id",(c) => c.json(null, 204));
app.all("/any",      (c) => c.json({ method: c.req.method }));

// Path parameters
app.get("/users/:id", (c) => {
    const id = c.req.param("id");         // single param
    return c.json({ id });
});

app.get("/orgs/:org/repos/:repo", (c) => {
    const { org, repo } = c.req.param();  // all params as object
    return c.json({ org, repo });
});

// Query parameters
app.get("/search", (c) => {
    const q     = c.req.query("q") ?? "";
    const page  = parseInt(c.req.query("page") ?? "0", 10);
    const tags  = c.req.queries("tags");  // ?tags=a&tags=b → ["a","b"]
    return c.json({ q, page, tags });
});

// Headers
app.get("/headers", (c) => {
    const token = c.req.header("Authorization");
    return c.json({ token });
});

// Request body
app.post("/echo", async (c) => {
    const body = await c.req.json();
    return c.json(body);
});

// Form data
app.post("/upload", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    return c.json({ name: file.name, size: file.size });
});
```

### Validation with Zod

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const CreateUserSchema = z.object({
    name:     z.string().min(2).max(100),
    email:    z.string().email(),
    password: z.string().min(8),
    role:     z.enum(["user", "admin"]).default("user"),
    age:      z.number().int().min(0).optional()
});

const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

const UserQuerySchema = z.object({
    page:   z.coerce.number().int().min(0).default(0),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role:   z.enum(["user", "admin"]).optional()
});

app.post(
    "/users",
    zValidator("json", CreateUserSchema, (result, c) => {
        if (!result.success) {
            return c.json({
                error: "Validation failed",
                issues: result.error.flatten().fieldErrors
            }, 400);
        }
    }),
    async (c) => {
        const data = c.req.valid("json");  // typed, already validated
        const user = await userService.create(data);
        return c.json(user, 201);
    }
);

app.get(
    "/users",
    zValidator("query", UserQuerySchema),
    async (c) => {
        const { page, limit, search, role } = c.req.valid("query");
        const users = await userService.findAll({ page, limit, search, role });
        return c.json(users);
    }
);
```

### Middleware

```typescript
// Custom middleware — logging
app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.path} — ${c.res.status} — ${ms}ms`);
});

// Auth middleware
const authMiddleware = async (c: Context, next: Next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ error: "No token" }, 401);
    try {
        const payload = verifyToken(token);
        c.set("user", payload);   // store in context
        await next();
    } catch {
        return c.json({ error: "Invalid token" }, 401);
    }
};

// Role guard factory
const requireRole = (...roles: string[]) => async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!roles.includes(user?.role)) return c.json({ error: "Forbidden" }, 403);
    await next();
};

// Protected routes
app.get("/profile",    authMiddleware, (c) => c.json(c.get("user")));
app.get("/admin",      authMiddleware, requireRole("admin"), (c) => c.json({ admin: true }));
app.get("/mod-admin",  authMiddleware, requireRole("admin", "moderator"), handler);
```

### Route Groups

```typescript
import { Hono } from "hono";

// Create sub-applications for each resource
const users = new Hono();
const posts = new Hono();
const auth  = new Hono();

// Users routes
users.get("/",      authMiddleware, async (c) => c.json(await userService.findAll()));
users.get("/:id",   authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const user = await userService.findById(id);
    return user ? c.json(user) : c.json({ error: "Not found" }, 404);
});
users.post("/",     authMiddleware, requireRole("admin"), zValidator("json", CreateUserSchema), async (c) => {
    const user = await userService.create(c.req.valid("json"));
    return c.json(user, 201);
});
users.put("/:id",   authMiddleware, zValidator("json", UpdateUserSchema), async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const user = await userService.update(id, c.req.valid("json"));
    return c.json(user);
});
users.delete("/:id",authMiddleware, requireRole("admin"), async (c) => {
    await userService.delete(parseInt(c.req.param("id"), 10));
    return new Response(null, { status: 204 });
});

// Mount sub-apps
const app = new Hono();
app.route("/api/auth",  auth);
app.route("/api/users", users);
app.route("/api/posts", posts);

// Error handling
app.onError((err, c) => {
    console.error(err);
    return c.json({
        error: { message: err.message, code: err instanceof AppError ? err.code : "INTERNAL_ERROR" }
    }, err instanceof AppError ? err.status : 500);
});

app.notFound((c) => c.json({ error: `${c.req.method} ${c.req.path} not found` }, 404));
```

### Context and Variables

```typescript
// c = Context object — everything you need
c.req                          // Request object
c.res                          // Response object (after next())
c.env                          // environment (Cloudflare bindings, etc.)

c.req.url                      // full URL string
c.req.method                   // HTTP method
c.req.path                     // path only
c.req.param("id")              // route param
c.req.query("page")            // query param
c.req.header("Auth")           // header

await c.req.json()             // parse JSON body
await c.req.text()             // parse text body
await c.req.parseBody()        // parse form data

c.json(data, status?)          // send JSON
c.text(text, status?)          // send text
c.html(html, status?)          // send HTML
c.redirect(url, status?)       // redirect
c.notFound()                   // 404

c.set("key", value)            // store value in context (for middleware)
c.get("key")                   // retrieve value
c.var.key                      // shorthand for c.get("key")

c.executionCtx.waitUntil(promise)  // Cloudflare: run after response sent
```

---

## Bun Built-in APIs

### File System

```js
// Read
const text      = await Bun.file("data.txt").text();
const json      = await Bun.file("data.json").json();
const bytes     = await Bun.file("image.png").arrayBuffer();
const stream    = Bun.file("video.mp4").stream();

// File info
const file      = Bun.file("image.png");
file.name;       // "image.png"
file.size;       // bytes
file.type;       // "image/png" — MIME type
await file.exists(); // true/false — check existence

// Write
await Bun.write("output.txt", "Hello, World!");
await Bun.write("data.json", JSON.stringify(data, null, 2));
await Bun.write("copy.png", Bun.file("original.png"));  // copy a file
await Bun.write("image.png", response);                  // save an HTTP response body

// Stdin/stdout/stderr
await Bun.write(Bun.stdout, "Hello!\n");
await Bun.write(Bun.stderr, "Error!\n");
const input = await Bun.stdin.text();
```

### Password Hashing

```js
// Bun has bcrypt-compatible hashing built in
const hash   = await Bun.password.hash("mypassword");
const hash2  = await Bun.password.hash("mypassword", {
    algorithm: "bcrypt",  // or "argon2id", "argon2d", "argon2i"
    cost: 12              // bcrypt: work factor (default 10)
});

const valid  = await Bun.password.verify("mypassword", hash);  // true
const wrong  = await Bun.password.verify("wrongpass", hash);   // false
```

### Hashing

```js
// CryptoHasher — fast, non-password hashing
const hasher = new Bun.CryptoHasher("sha256");  // md5, sha1, sha256, sha512, etc.
hasher.update("hello");
hasher.update(" world");                         // can call multiple times
const hex    = hasher.digest("hex");             // "b94d27b9..."
const base64 = hasher.digest("base64");
const buffer = hasher.digest();                  // Uint8Array

// One-liner
Bun.hash("hello");                      // numeric hash (fast, non-crypto)
Bun.CryptoHasher.hash("sha256", "hello").toString("hex");
```

### SQLite (Built-in — Zero Dependencies)

```js
import { Database } from "bun:sqlite";

// Open (creates if doesn't exist)
const db = new Database("app.db");
const db = new Database(":memory:");  // in-memory, faster for tests

// Create tables
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        name  TEXT    NOT NULL,
        email TEXT    UNIQUE NOT NULL,
        role  TEXT    DEFAULT 'user',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )
`);

// Prepared statements — reusable, parameterized, safe
const insertUser   = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
const getUserById  = db.prepare("SELECT * FROM users WHERE id = ?");
const getAllUsers   = db.prepare("SELECT * FROM users WHERE active = 1 ORDER BY name");
const updateUser   = db.prepare("UPDATE users SET name = ?, role = ? WHERE id = ?");
const deleteUser   = db.prepare("DELETE FROM users WHERE id = ?");

// Insert
insertUser.run("Alice", "alice@example.com");

// Query single row
const user = getUserById.get(1);
// { id: 1, name: "Alice", email: "alice@example.com", ... }

// Query all rows
const users = getAllUsers.all();
// Array of row objects

// Query with named params
const findByEmail = db.prepare("SELECT * FROM users WHERE email = $email");
const found = findByEmail.get({ $email: "alice@example.com" });

// Update / delete (returns changes info)
const info = updateUser.run("Alice Smith", "admin", 1);
info.changes;    // rows affected
info.lastInsertRowid; // id of last inserted row

// Transactions
const transferRole = db.transaction((fromId, toId, role) => {
    updateUser.run("user", null, fromId);   // remove role
    updateUser.run(role, null, toId);       // assign role
});
transferRole(1, 2, "admin");
// if anything throws, both operations are rolled back

// Immediate query (no prepare)
db.query("SELECT COUNT(*) as count FROM users").get();
// { count: 3 }

// Close when done
db.close();
```

### WebSockets

```js
Bun.serve({
    port: 3000,

    fetch(req, server) {
        const url = new URL(req.url);

        if (url.pathname === "/ws") {
            // Upgrade to WebSocket — pass data to the handlers
            const success = server.upgrade(req, {
                data: {
                    userId: url.searchParams.get("userId"),
                    connectedAt: Date.now()
                }
            });
            if (success) return;  // Response is handled by websocket handlers
        }

        return new Response("Not a WebSocket endpoint", { status: 400 });
    },

    websocket: {
        open(ws) {
            console.log(`Client connected: ${ws.data.userId}`);
            ws.subscribe("broadcast");      // join a topic for pub/sub
            ws.send(JSON.stringify({ type: "connected", id: ws.data.userId }));
        },

        message(ws, message) {
            console.log(`Message from ${ws.data.userId}:`, message);

            // Echo back to sender
            ws.send(message);

            // Broadcast to all subscribers of a topic
            ws.publish("broadcast", message);

            // Parse JSON messages
            try {
                const data = JSON.parse(message as string);
                if (data.type === "chat") {
                    ws.publish("broadcast", JSON.stringify({
                        type: "chat",
                        from: ws.data.userId,
                        text: data.text,
                        time: Date.now()
                    }));
                }
            } catch { }
        },

        close(ws, code, reason) {
            console.log(`Client disconnected: ${ws.data.userId} (${code})`);
            ws.unsubscribe("broadcast");
        },

        drain(ws) {
            // Backpressure — called when socket is ready to receive more data
        },

        // Options
        idleTimeout: 60,            // disconnect after 60s idle
        maxPayloadLength: 64 * 1024 // max 64KB messages
    }
});
```

### TCP and UDP Sockets

```js
// TCP server
const server = Bun.listen({
    hostname: "localhost",
    port: 8080,
    socket: {
        open(socket) {
            console.log("Connection opened");
            socket.write("Hello!\n");
        },
        data(socket, data) {
            console.log("Received:", data.toString());
            socket.write(`Echo: ${data}`);
        },
        close(socket) {
            console.log("Connection closed");
        },
        error(socket, err) {
            console.error("Socket error:", err);
        }
    }
});

// TCP client
const client = await Bun.connect({
    hostname: "localhost",
    port: 8080,
    socket: {
        data(socket, data) {
            console.log("Server said:", data.toString());
        },
        open(socket) {
            socket.write("Hello from client!");
        }
    }
});
```

### Subprocess

```js
// Run a command and get output
const result = await Bun.$`ls -la`.text();
const { stdout, stderr } = await Bun.$`git log --oneline -5`;

// Pipe commands
const output = await Bun.$`cat package.json | grep name`.text();

// With error handling
try {
    await Bun.$`npm run build`;
} catch (err) {
    console.error("Build failed:", err.stderr.toString());
}

// Spawn a long-running process
const proc = Bun.spawn(["node", "server.js"], {
    stdout: "pipe",
    stderr: "inherit",
    env: { ...process.env, PORT: "4000" }
});

const output = await new Response(proc.stdout).text();
await proc.exited;        // wait for it to finish
proc.exitCode;            // exit code
proc.kill();              // terminate
```

---

## Bun Test Runner

```typescript
// src/math.test.ts
import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, mock, spyOn } from "bun:test";

describe("Calculator", () => {
    let calc: Calculator;

    beforeAll(() => {
        // Runs once before all tests in this block
        console.log("Starting calculator tests");
    });

    afterAll(() => {
        // Runs once after all tests
    });

    beforeEach(() => {
        calc = new Calculator();  // fresh instance per test
    });

    afterEach(() => {
        // cleanup
    });

    test("adds two numbers", () => {
        expect(calc.add(2, 3)).toBe(5);
    });

    it("throws on divide by zero", () => {
        expect(() => calc.divide(10, 0)).toThrow("Cannot divide by zero");
    });

    test("async operations", async () => {
        const result = await calc.asyncAdd(2, 3);
        expect(result).toBe(5);
    });

    test("promise resolves", async () => {
        await expect(calc.asyncAdd(1, 1)).resolves.toBe(2);
    });

    test("promise rejects", async () => {
        await expect(calc.asyncDivide(1, 0)).rejects.toThrow();
    });
});

// All matchers
expect(value).toBe(expected);               // ===
expect(value).toEqual(expected);            // deep equality
expect(value).toStrictEqual(expected);      // strict deep equality
expect(value).not.toBe(expected);           // negation
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();
expect(value).toBeNaN();
expect(value).toBeGreaterThan(n);
expect(value).toBeGreaterThanOrEqual(n);
expect(value).toBeLessThan(n);
expect(value).toBeLessThanOrEqual(n);
expect(value).toBeCloseTo(n, decimals);
expect(str).toContain(substr);
expect(str).toMatch(/regex/);
expect(str).toStartWith(prefix);
expect(str).toEndWith(suffix);
expect(str).toHaveLength(n);
expect(arr).toContain(item);
expect(arr).toHaveLength(n);
expect(obj).toHaveProperty("key");
expect(obj).toHaveProperty("key", value);
expect(obj).toMatchObject({ key: value });
expect(fn).toThrow();
expect(fn).toThrow("message");
expect(fn).toThrow(ErrorClass);

// Mocking
const mockFn = mock(() => 42);
mockFn();                    // 42
mockFn.mock.calls;           // [[]] — array of call argument arrays
mockFn.mock.results;         // [{ type: "return", value: 42 }]
mockFn.mock.callCount();     // 1

const obj = { method: () => "real" };
const spy = spyOn(obj, "method").mockImplementation(() => "mocked");
obj.method();                // "mocked"
spy.restore();               // back to "real"
```

```bash
# Run tests
bun test                    # all *.test.ts / *.spec.ts files
bun test src/utils          # specific folder
bun test --watch            # re-run on change
bun test --timeout 10000    # custom timeout (ms)
bun test --bail             # stop on first failure
bun test -t "adds two"      # run matching test name
bun test --coverage         # code coverage report
```

---

## Bun vs Node.js Comparison

| Feature            | Node.js               | Bun                         |
|--------------------|-----------------------|-----------------------------|
| Engine             | V8 (Chrome)           | JavaScriptCore (Safari)     |
| TypeScript         | Needs ts-node/tsx     | Native, no config           |
| Package manager    | npm / yarn / pnpm     | Built-in (fast)             |
| Test runner        | Jest / Vitest         | Built-in                    |
| HTTP server        | Need express/fastify  | Built-in + Hono             |
| SQLite             | Need better-sqlite3   | Built-in (`bun:sqlite`)     |
| Password hashing   | Need bcrypt           | Built-in                    |
| File I/O           | `fs/promises`         | `Bun.file()` + `Bun.write()`|
| Environment        | `process.env`         | `process.env` or `Bun.env` |
| Startup speed      | ~50ms                 | ~5ms                        |
| npm compatibility  | Full                  | ~95% (most packages work)  |

### Migrating from Node.js to Bun

```bash
# Most Node.js projects just work
bun install   # instead of npm install
bun run dev   # instead of npm run dev

# Replace in package.json scripts:
# "dev": "ts-node src/index.ts"     → "dev": "bun src/index.ts"
# "dev": "nodemon src/index.js"     → "dev": "bun --watch src/index.js"
# "test": "jest"                    → "test": "bun test"
```

---

## Summary

- Bun is a runtime + package manager + bundler + test runner — one tool replaces several.
- Run TypeScript directly with `bun run file.ts` — no `tsc` or `ts-node` needed.
- Built-in HTTP server uses the web-standard `Request`/`Response` API.
- Use Hono for routing, middleware, and validation — it's fast, lightweight, and ergonomic.
- `Bun.file()` / `Bun.write()` replace `fs/promises` with a cleaner API.
- Built-in SQLite (`bun:sqlite`) eliminates the `better-sqlite3` dependency.
- Built-in password hashing eliminates the `bcrypt` dependency.
- `bun test` is a Jest-compatible test runner built in — no separate install needed.
