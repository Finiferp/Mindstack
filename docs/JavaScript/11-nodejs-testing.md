---
title: "Testing Node.js Apps"
sidebar_label: "Testing"
sidebar_position: 11
---

# Testing Node.js Apps

Tests catch bugs before users do. A well-tested Node.js app has three types: fast unit tests that test logic in isolation, integration tests that test layers working together, and HTTP tests that verify routes end-to-end. Vitest is the modern test runner; Supertest fires real HTTP requests at your app.

---

## Testing Pyramid

```
         ┌──────────────┐
         │  E2E / HTTP  │  few, slow — test full request/response cycle
         ├──────────────┤
         │ Integration  │  moderate — multiple real layers, test DB
         ├──────────────┤
         │     Unit     │  many, fast — isolated logic, mocked dependencies
         └──────────────┘
```

Write more unit tests than integration, more integration than E2E. Unit tests run in milliseconds; E2E tests run in seconds.

---

## Setup

```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals:     true,          // no need to import describe/test/expect
        environment: "node",
        setupFiles:  ["./src/test/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            exclude:  ["**/node_modules/**", "**/dist/**", "**/*.d.ts"]
        },
        // Run tests sequentially (useful if they share state)
        // pool: "forks",
        // poolOptions: { forks: { singleFork: true } }
    }
});
```

```typescript
// src/test/setup.ts — runs before all tests
import { beforeAll, afterAll } from "vitest";

// Global setup/teardown
beforeAll(async () => {
    // Start test DB, seed data, etc.
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
});

afterAll(async () => {
    // Clean up
});
```

```json
// package.json
{
    "scripts": {
        "test":          "vitest",
        "test:run":      "vitest run",
        "test:watch":    "vitest --watch",
        "test:coverage": "vitest run --coverage",
        "test:ui":       "vitest --ui"
    }
}
```

---

## Unit Testing

Unit tests test one piece of logic in complete isolation. All dependencies are mocked.

### Testing Pure Functions

```typescript
// src/utils/validation.ts
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

export function paginateArray<T>(arr: T[], page: number, limit: number): { data: T[]; total: number; totalPages: number } {
    const total = arr.length;
    const start = page * limit;
    return {
        data:       arr.slice(start, start + limit),
        total,
        totalPages: Math.ceil(total / limit)
    };
}
```

```typescript
// src/utils/validation.test.ts
import { describe, test, it, expect } from "vitest";
import { isValidEmail, sanitizeHtml, paginateArray } from "./validation.js";

describe("isValidEmail", () => {
    test("accepts valid email addresses", () => {
        expect(isValidEmail("alice@example.com")).toBe(true);
        expect(isValidEmail("user+tag@domain.co.uk")).toBe(true);
        expect(isValidEmail("user123@sub.domain.org")).toBe(true);
    });

    test("rejects invalid email addresses", () => {
        expect(isValidEmail("notanemail")).toBe(false);
        expect(isValidEmail("@nodomain")).toBe(false);
        expect(isValidEmail("noatsign.com")).toBe(false);
        expect(isValidEmail("")).toBe(false);
        expect(isValidEmail("spaces in@email.com")).toBe(false);
    });
});

describe("sanitizeHtml", () => {
    test("escapes HTML special characters", () => {
        expect(sanitizeHtml("<script>alert('xss')</script>"))
            .toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
    });

    test("escapes ampersands", () => {
        expect(sanitizeHtml("Bread & Butter")).toBe("Bread &amp; Butter");
    });

    test("returns empty string unchanged", () => {
        expect(sanitizeHtml("")).toBe("");
    });

    test("does not modify safe text", () => {
        expect(sanitizeHtml("Hello World")).toBe("Hello World");
    });
});

describe("paginateArray", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);

    test("returns first page correctly", () => {
        const result = paginateArray(items, 0, 10);
        expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(result.total).toBe(25);
        expect(result.totalPages).toBe(3);
    });

    test("returns last page correctly", () => {
        const result = paginateArray(items, 2, 10);
        expect(result.data).toEqual([21, 22, 23, 24, 25]);
    });

    test("returns empty data for out-of-range page", () => {
        const result = paginateArray(items, 10, 10);
        expect(result.data).toEqual([]);
        expect(result.total).toBe(25);
    });
});
```

### Testing with Mocks

```typescript
// src/services/userService.ts
import db from "../lib/db.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "./emailService.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";

export async function createUser(data: { name: string; email: string; password: string }) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await db.user.create({
        data: { name: data.name, email: data.email, passwordHash },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    await sendWelcomeEmail(user.email, user.name);
    return user;
}

export async function getUserById(id: number) {
    const user = await db.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true }
    });
    if (!user) throw new NotFoundError("User", id);
    return user;
}
```

```typescript
// src/services/userService.test.ts
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock entire modules BEFORE importing the module under test
vi.mock("../lib/db.js", () => ({
    default: {
        user: {
            findUnique: vi.fn(),
            create:     vi.fn(),
            update:     vi.fn(),
            delete:     vi.fn(),
            findMany:   vi.fn()
        }
    }
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash:    vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
        compare: vi.fn()
    }
}));

vi.mock("../services/emailService.js", () => ({
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined)
}));

import db from "../lib/db.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "./emailService.js";
import { createUser, getUserById } from "./userService.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";

describe("createUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();  // reset call history and return values between tests
    });

    test("creates user successfully with hashed password", async () => {
        const input    = { name: "Alice", email: "alice@example.com", password: "Password1" };
        const dbResult = { id: 1, name: "Alice", email: "alice@example.com", role: "USER", createdAt: new Date() };

        vi.mocked(db.user.findUnique).mockResolvedValue(null);      // email not taken
        vi.mocked(db.user.create).mockResolvedValue(dbResult as any);

        const result = await createUser(input);

        // Assert result
        expect(result).toEqual(dbResult);

        // Assert password was hashed
        expect(bcrypt.hash).toHaveBeenCalledWith("Password1", 12);
        expect(bcrypt.hash).toHaveBeenCalledTimes(1);

        // Assert DB create was called with hashed password
        expect(db.user.create).toHaveBeenCalledWith({
            data: {
                name:         "Alice",
                email:        "alice@example.com",
                passwordHash: "$2a$12$hashedpassword"
            },
            select: expect.any(Object)
        });

        // Assert welcome email was sent
        expect(sendWelcomeEmail).toHaveBeenCalledWith("alice@example.com", "Alice");
    });

    test("throws ConflictError when email is already taken", async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ id: 1 } as any);

        await expect(createUser({ name: "Bob", email: "alice@example.com", password: "Password1" }))
            .rejects.toThrow(ConflictError);

        // DB create should NOT have been called
        expect(db.user.create).not.toHaveBeenCalled();
        expect(sendWelcomeEmail).not.toHaveBeenCalled();
    });

    test("does not send welcome email if DB create fails", async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(null);
        vi.mocked(db.user.create).mockRejectedValue(new Error("DB connection lost"));

        await expect(createUser({ name: "Carol", email: "carol@example.com", password: "Password1" }))
            .rejects.toThrow("DB connection lost");

        expect(sendWelcomeEmail).not.toHaveBeenCalled();
    });
});

describe("getUserById", () => {
    beforeEach(() => vi.clearAllMocks());

    test("returns user when found", async () => {
        const mockUser = { id: 1, name: "Alice", email: "alice@example.com", role: "USER" };
        vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

        const result = await getUserById(1);
        expect(result).toEqual(mockUser);
        expect(db.user.findUnique).toHaveBeenCalledWith({
            where:  { id: 1 },
            select: expect.objectContaining({ id: true, name: true })
        });
    });

    test("throws NotFoundError when user does not exist", async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(null);

        await expect(getUserById(999)).rejects.toThrow(NotFoundError);
        await expect(getUserById(999)).rejects.toMatchObject({
            status: 404,
            code:   "NOT_FOUND"
        });
    });
});
```

---

## All Vitest Matchers

```typescript
// Equality
expect(value).toBe(expected)                // === (strict)
expect(value).toEqual(expected)             // deep equality
expect(value).toStrictEqual(expected)       // deep + checks object type
expect(value).not.toBe(expected)

// Truthiness
expect(value).toBeTruthy()                  // any truthy value
expect(value).toBeFalsy()                   // any falsy value
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()                 // anything that is not undefined
expect(value).toBeNaN()

// Numbers
expect(value).toBeGreaterThan(n)
expect(value).toBeGreaterThanOrEqual(n)
expect(value).toBeLessThan(n)
expect(value).toBeLessThanOrEqual(n)
expect(value).toBeCloseTo(n, precision)     // floating point: toBeCloseTo(0.3, 1)

// Strings
expect(str).toContain("substring")
expect(str).toMatch(/regex/)
expect(str).toMatch("exact-string")
expect(str).toHaveLength(5)
expect(str).toStartWith("Hello")
expect(str).toEndWith("World")

// Arrays
expect(arr).toContain(item)                 // contains the value
expect(arr).toContainEqual({ id: 1 })      // deep equality check for items
expect(arr).toHaveLength(3)
expect(arr).toEqual(expect.arrayContaining(["a", "b"])) // contains at least these

// Objects
expect(obj).toHaveProperty("name")
expect(obj).toHaveProperty("address.city")  // nested property
expect(obj).toHaveProperty("name", "Alice")
expect(obj).toMatchObject({ name: "Alice" }) // partial match — obj can have extra fields
expect(obj).toMatchObject(expect.objectContaining({ id: expect.any(Number) }))

// Async — promises
await expect(promise).resolves.toBe(42)
await expect(promise).resolves.toEqual({ id: 1 })
await expect(promise).rejects.toThrow()
await expect(promise).rejects.toThrow("message")
await expect(promise).rejects.toBeInstanceOf(NotFoundError)
await expect(promise).rejects.toMatchObject({ status: 404 })

// Errors — sync
expect(() => fn()).toThrow()
expect(() => fn()).toThrow("message")
expect(() => fn()).toThrow(/regex/)
expect(() => fn()).toThrow(ErrorClass)

// Snapshots
expect(value).toMatchSnapshot()             // creates/compares snapshot file
expect(value).toMatchInlineSnapshot(`"hello"`)

// Type checking
expect(value).toBeInstanceOf(Date)
expect(value).toBeInstanceOf(Error)
expect(typeof value).toBe("string")

// expect.any() and expect.objectContaining()
expect(result).toEqual({
    id:        expect.any(Number),
    name:      expect.any(String),
    createdAt: expect.any(Date),
    email:     expect.stringContaining("@")
});
```

---

## Mocking — Every Pattern

```typescript
import { vi, describe, test, expect, beforeEach } from "vitest";

// ── Mock a module ──────────────────────────────────────────────────────────
vi.mock("../lib/db.js");                   // auto-mock (all fns return undefined)
vi.mock("../lib/db.js", () => ({           // manual mock
    default: { user: { findUnique: vi.fn() } }
}));

// ── vi.fn() — create a mock function ──────────────────────────────────────
const mockFn = vi.fn();
const mockFn = vi.fn(() => 42);            // with default implementation
const mockFn = vi.fn().mockReturnValue(42);
const mockFn = vi.fn().mockResolvedValue({ id: 1 });  // async
const mockFn = vi.fn().mockRejectedValue(new Error("fail")); // async reject

// Return different values on consecutive calls
const mockFn = vi.fn()
    .mockReturnValueOnce("first call")
    .mockReturnValueOnce("second call")
    .mockReturnValue("subsequent calls");  // fallback

// Return based on arguments
const mockFn = vi.fn().mockImplementation((id: number) => {
    if (id === 1) return { id: 1, name: "Alice" };
    if (id === 2) return { id: 2, name: "Bob" };
    return null;
});

// ── Inspecting calls ───────────────────────────────────────────────────────
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).not.toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)
expect(mockFn).toHaveBeenLastCalledWith(arg1)
expect(mockFn).toHaveBeenNthCalledWith(1, arg1)  // first call

mockFn.mock.calls              // [[arg1], [arg1, arg2], ...]
mockFn.mock.calls[0]           // first call's args
mockFn.mock.results            // [{ type: "return", value: 42 }, ...]
mockFn.mock.results[0].value   // 42
mockFn.mock.instances          // all `this` contexts

// ── vi.spyOn — spy on existing object method ───────────────────────────────
import * as emailService from "./emailService.js";
const spy = vi.spyOn(emailService, "sendWelcomeEmail");
spy.mockResolvedValue(undefined);  // override implementation
spy.mockImplementation(async (email) => { console.log("Sent to:", email); });
spy.mockRestore();                 // restore original implementation

// Spy without overriding (just observe)
const consoleSpy = vi.spyOn(console, "log");
doSomething();
expect(consoleSpy).toHaveBeenCalledWith("expected log");
consoleSpy.mockRestore();

// ── Resetting mocks ────────────────────────────────────────────────────────
vi.clearAllMocks()   // clear call history — keeps implementation
vi.resetAllMocks()   // clear call history + reset implementation to vi.fn()
vi.restoreAllMocks() // restore all spies to original

// In beforeEach — most common pattern
beforeEach(() => {
    vi.clearAllMocks();
});

// ── vi.useFakeTimers — control time ───────────────────────────────────────
vi.useFakeTimers();
vi.setSystemTime(new Date("2024-01-15"));
vi.advanceTimersByTime(5000);  // advance by 5 seconds
vi.runAllTimers();             // run all pending timers immediately
vi.useRealTimers();            // restore real timers

test("debounce waits before calling", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();  // not yet

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1); // called once after delay

    vi.useRealTimers();
});

// ── vi.mock with factory ───────────────────────────────────────────────────
vi.mock("../utils/jwt.js", () => ({
    signAccessToken:  vi.fn().mockReturnValue("mock-access-token"),
    signRefreshToken: vi.fn().mockReturnValue("mock-refresh-token"),
    verifyAccessToken: vi.fn().mockReturnValue({
        userId: 1, email: "alice@example.com", role: "USER"
    })
}));
```

---

## HTTP Testing with Supertest

```typescript
// src/routes/userRoutes.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app.js";

// Mock the database for HTTP tests too
vi.mock("../lib/db.js", () => ({
    default: {
        user: {
            findMany:   vi.fn(),
            findUnique: vi.fn(),
            create:     vi.fn(),
            update:     vi.fn(),
            delete:     vi.fn(),
            count:      vi.fn()
        },
        session: {
            create: vi.fn(),
            findFirst: vi.fn(),
            deleteMany: vi.fn()
        }
    }
}));

import db from "../lib/db.js";

// Helper to create auth headers
function authHeader(token = "valid-token") {
    return { Authorization: `Bearer ${token}` };
}

// Helper to create a real JWT for testing
import jwt from "jsonwebtoken";
function makeTestToken(payload = { userId: 1, email: "alice@example.com", role: "USER" }) {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

describe("GET /api/users", () => {
    beforeEach(() => vi.clearAllMocks());

    test("returns 401 when no token provided", async () => {
        const res = await request(app).get("/api/users");
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("NO_TOKEN");
    });

    test("returns 403 when authenticated as non-admin", async () => {
        const token = makeTestToken({ userId: 1, email: "user@example.com", role: "USER" });
        const res   = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test("returns paginated users for admin", async () => {
        const token = makeTestToken({ userId: 1, email: "admin@example.com", role: "ADMIN" });
        vi.mocked(db.user.findMany).mockResolvedValue([
            { id: 1, name: "Alice", email: "alice@example.com" } as any
        ]);
        vi.mocked(db.user.count).mockResolvedValue(1);

        const res = await request(app)
            .get("/api/users?page=0&limit=20")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Alice");
        expect(res.body.total).toBe(1);
    });
});

describe("POST /api/users", () => {
    const adminToken = () => makeTestToken({ userId: 1, email: "admin@example.com", role: "ADMIN" });

    test("creates user with valid data", async () => {
        const payload    = { name: "Bob", email: "bob@example.com", password: "Password1!" };
        const dbResponse = { id: 2, name: "Bob", email: "bob@example.com", role: "USER", createdAt: new Date() };

        vi.mocked(db.user.findUnique).mockResolvedValue(null);
        vi.mocked(db.user.create).mockResolvedValue(dbResponse as any);

        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send(payload)
            .set("Content-Type", "application/json");

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Bob");
        expect(res.body.email).toBe("bob@example.com");
        expect(res.body.passwordHash).toBeUndefined();  // never returned
    });

    test("returns 400 when email is invalid", async () => {
        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ name: "Bob", email: "not-an-email", password: "Password1!" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("returns 409 when email is already taken", async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue({ id: 1 } as any);

        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ name: "Bob", email: "existing@example.com", password: "Password1!" });

        expect(res.status).toBe(409);
    });
});

describe("DELETE /api/users/:id", () => {
    test("returns 204 on successful delete", async () => {
        const adminToken = makeTestToken({ userId: 1, email: "a@b.com", role: "ADMIN" });
        vi.mocked(db.user.findUnique).mockResolvedValue({ id: 2 } as any);
        vi.mocked(db.user.delete).mockResolvedValue({} as any);

        const res = await request(app)
            .delete("/api/users/2")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(204);
        expect(res.body).toEqual({});
    });

    test("returns 400 for invalid ID format", async () => {
        const adminToken = makeTestToken({ userId: 1, email: "a@b.com", role: "ADMIN" });
        const res = await request(app)
            .delete("/api/users/not-a-number")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
    });
});
```

---

## Integration Tests with Real DB (Testcontainers)

```bash
npm install -D @testcontainers/postgresql testcontainers
```

```typescript
// src/test/integration/users.integration.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import request from "supertest";
import app from "../../app.js";

let prisma: PrismaClient;

beforeAll(async () => {
    const container = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("testdb")
        .withUsername("test")
        .withPassword("test")
        .start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;

    // Run migrations against test DB
    execSync("npx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: connectionString }
    });

    prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });
}, 60_000);  // 60s timeout for container startup

afterAll(async () => {
    await prisma.$disconnect();
});

beforeEach(async () => {
    // Clean DB between tests
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
});

describe("Registration and login flow", () => {
    test("can register then login", async () => {
        // Register
        const registerRes = await request(app)
            .post("/api/auth/register")
            .send({ name: "Alice", email: "alice@example.com", password: "Password1!" });

        expect(registerRes.status).toBe(201);
        expect(registerRes.body.accessToken).toBeDefined();
        expect(registerRes.body.user.email).toBe("alice@example.com");

        // Login
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "alice@example.com", password: "Password1!" });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.accessToken).toBeDefined();

        // Access protected route
        const profileRes = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

        expect(profileRes.status).toBe(200);
        expect(profileRes.body.email).toBe("alice@example.com");
    });
});
```

---

## Test Organization Best Practices

```typescript
// File naming conventions
user.service.test.ts      // unit test for service
user.routes.test.ts       // HTTP test for routes
user.integration.test.ts  // integration test

// One describe block per function or feature
describe("UserService.createUser", () => {
    // Group related scenarios
    describe("when email is already taken", () => {
        test("throws ConflictError", async () => { });
        test("does not hash password", async () => { });
    });

    describe("when email is available", () => {
        test("creates user in DB", async () => { });
        test("returns user without passwordHash", async () => { });
        test("sends welcome email", async () => { });
    });
});

// Test naming: what + when + expected result
test("returns 404 when user does not exist");
test("throws ConflictError when email is already registered");
test("sends welcome email after successful registration");
test("does not create user if email service throws");
```

---

## Running Tests

```bash
# Watch mode (re-run on changes)
vitest

# Run once and exit
vitest run

# Run specific file
vitest run src/services/userService.test.ts

# Run tests matching a name
vitest run -t "creates user"
vitest run -t "auth"

# Coverage report
vitest run --coverage

# UI (browser-based test explorer)
vitest --ui

# Run with verbose output
vitest run --reporter=verbose

# Bail on first failure
vitest run --bail=1

# Update snapshots
vitest run -u

# Show heap usage (for memory leak debugging)
vitest run --reporter=verbose --logHeapUsage
```

---

## Summary

- Separate `app.js` from `index.js` so Supertest can import the app without starting the server.
- Mock modules at the top of the test file with `vi.mock()` — before imports.
- Use `vi.clearAllMocks()` in `beforeEach` — stale mock state causes flaky tests.
- Test behavior, not implementation — assert on outputs and side effects, not internal function calls unless they matter.
- Use `expect.any(Number)` and `expect.objectContaining()` for partial matching.
- Integration tests with Testcontainers give you real database behavior without a shared test DB.
- Every test should be independent — running them in any order should give the same result.
