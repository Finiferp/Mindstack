---
title: "Express.js — REST APIs"
sidebar_label: "Express.js"
sidebar_position: 7
---

# Express.js

Express is the most popular Node.js web framework. It layers routing, middleware, and helpers on top of Node's raw `http` module. Every serious Node.js REST API you'll encounter either uses Express or something that works like it.

```bash
npm install express
npm install -D @types/express  # if using TypeScript
```

---

## Application Setup

```js
// src/app.js — separate app from server start so tests can import just the app
import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

// ── Middleware (order matters!) ────────────────────────────────────────────

// Parse JSON bodies — required for POST/PUT/PATCH with JSON
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded form data (HTML forms)
app.use(express.urlencoded({ extended: true }));

// CORS — allow requests from other origins
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// HTTP request logging
app.use(morgan("dev")); // "dev" format: GET /users 200 5ms

// Trust proxy headers (important if behind nginx/load balancer)
app.set("trust proxy", 1);

// ── Routes ─────────────────────────────────────────────────────────────────
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";

app.use("/api/v1/auth",  authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ── Error Handling (must be last) ──────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || "Internal server error",
            code: err.code || "INTERNAL_ERROR",
            ...(process.env.NODE_ENV === "development" && { stack: err.stack })
        }
    });
});

export default app;
```

```js
// src/index.js — server start
import app from "./app.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received — closing server");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    server.close(() => process.exit(0));
});

export default server;
```

---

## Routing

### Basic Routes

```js
// HTTP method + path → handler
app.get("/",    handler);   // GET    /
app.post("/",   handler);   // POST   /
app.put("/",    handler);   // PUT    /
app.patch("/",  handler);   // PATCH  /
app.delete("/", handler);   // DELETE /
app.all("/",    handler);   // any method

// Multiple paths for same handler
app.get(["/home", "/index", "/"], handler);

// Handler signature: (req, res, next) => void
app.get("/users", (req, res, next) => {
    res.json([]);
});
```

### Route Parameters

```js
// Single param
app.get("/users/:id", (req, res) => {
    const { id } = req.params;  // string — "42" not 42
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return res.status(400).json({ error: "Invalid ID" });
    res.json({ id: numId });
});

// Multiple params
app.get("/orgs/:orgId/repos/:repoId/issues/:issueId", (req, res) => {
    const { orgId, repoId, issueId } = req.params;
    res.json({ orgId, repoId, issueId });
});

// Optional param
app.get("/posts/:year/:month?", (req, res) => {
    const { year, month } = req.params;  // month may be undefined
    res.json({ year, month: month ?? "all" });
});

// Wildcard param
app.get("/files/*", (req, res) => {
    const filePath = req.params[0];  // everything after /files/
    res.json({ path: filePath });
});

// Regex in param
app.get("/users/:id(\\d+)", (req, res) => {
    // Only matches if id is all digits
});
```

### Query String

```js
// GET /search?q=alice&role=admin&page=2&limit=20&active=true
app.get("/search", (req, res) => {
    const {
        q,
        role,
        page = "0",        // defaults as strings
        limit = "20",
        active,
        sort = "createdAt",
        order = "desc"
    } = req.query;

    const options = {
        query: q,
        role,
        page:   parseInt(page, 10),
        limit:  Math.min(parseInt(limit, 10), 100),  // cap at 100
        active: active === "true" ? true : active === "false" ? false : undefined,
        sort,
        order
    };

    res.json(options);
});

// Array params: ?ids=1&ids=2&ids=3
app.get("/bulk", (req, res) => {
    const ids = [req.query.ids].flat();  // always an array
    res.json({ ids });
});
```

### Request Object — Everything You Can Read

```js
app.use((req, res, next) => {
    // URL and routing
    req.path           // "/users/42" — without query string
    req.url            // "/users/42?active=true" — with query string
    req.originalUrl    // same as url but preserved through sub-routers
    req.baseUrl        // the path prefix of the router
    req.hostname       // "example.com"
    req.protocol       // "http" or "https"
    req.secure         // shorthand for req.protocol === "https"
    req.ip             // client IP (respects trust proxy)
    req.ips            // array of IPs in X-Forwarded-For
    req.subdomains     // ["www"] for "www.example.com"

    // HTTP
    req.method         // "GET", "POST", etc.
    req.headers        // all request headers (lowercase keys)
    req.headers["authorization"]
    req.header("Authorization")  // case-insensitive helper
    req.get("Authorization")     // same
    req.cookies        // requires cookie-parser middleware
    req.signedCookies  // requires cookie-parser with secret

    // Body (requires middleware)
    req.body           // parsed JSON or form data
    req.params         // route params { id: "42" }
    req.query          // query string { page: "1" }

    // Custom (set by middleware)
    req.user           // set by auth middleware

    // Type checking
    req.is("application/json")  // true if Content-Type matches
    req.accepts("json")         // content negotiation

    next();
});
```

### Response Object — Everything You Can Send

```js
app.get("/demo", (req, res) => {
    // Status
    res.status(200)        // set status code (chainable)
    res.sendStatus(404)    // set status AND send status text as body

    // JSON
    res.json({ key: "value" })             // sets Content-Type automatically
    res.status(201).json({ created: true })

    // Text / HTML
    res.send("Hello!")                  // Content-Type based on content
    res.send("<h1>Hello!</h1>")         // text/html if content has tags
    res.type("text/plain").send("plain")

    // No body
    res.status(204).end()  // 204 No Content — use .end() not .json()

    // Headers
    res.set("X-Custom", "value")
    res.set({ "X-A": "1", "X-B": "2" })
    res.append("Set-Cookie", "theme=dark")
    res.get("Content-Type")             // read a response header

    // Redirect
    res.redirect("/new-location")
    res.redirect(301, "/permanent")
    res.redirect("back")               // redirect to Referer header

    // Files
    res.sendFile("/absolute/path/to/file.pdf")
    res.download("/path/to/file.pdf", "download-name.pdf")

    // Cookies
    res.cookie("session", "abc123", {
        httpOnly: true,    // no JS access
        secure: true,      // HTTPS only
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000  // 1 day in ms
    });
    res.clearCookie("session");

    // Locals — available in templates
    res.locals.user = req.user;

    // Check if response already sent
    res.headersSent    // true if headers already sent — can't modify
});
```

---

## Middleware in Depth

Middleware is a function with `(req, res, next)` signature. It can read/modify req/res, end the request, or call `next()` to continue.

```js
// Middleware types:
// 1. Application-level: app.use(fn)
// 2. Router-level: router.use(fn)
// 3. Error-handling: 4 params (err, req, res, next)
// 4. Built-in: express.json(), express.static()
// 5. Third-party: cors, morgan, helmet

// Application-level — runs on every request
app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    req.startTime = Date.now();
    next();
});

// Path prefix — only runs on matching paths
app.use("/api", (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: "No token" });
    }
    next();
});

// Multiple middleware in one call (runs in order)
app.get("/admin",
    authenticate,
    requireAdmin,
    rateLimiter,
    (req, res) => res.json({ admin: true })
);

// Middleware that calls next(error) → skips to error handler
app.use(async (req, res, next) => {
    try {
        await doSomethingAsync();
        next();
    } catch (err) {
        next(err);  // jumps to error-handling middleware
    }
});

// Error-handling middleware — 4 params EXACTLY
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }
    res.status(err.status || 500).json({ error: err.message });
});
```

### Useful Middleware to Know

```bash
npm install cors helmet morgan express-rate-limit cookie-parser compression
```

```js
import helmet from "helmet";          // security headers
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";

// Helmet — sets security HTTP headers automatically
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "https://cdn.example.com"]
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // max requests per windowMs per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" }
});
app.use("/api/", limiter);

// Stricter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts" }
});
app.use("/api/auth/login", authLimiter);

// Cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Gzip compression
app.use(compression({ threshold: 1024 }));  // only compress responses > 1KB

// Static files
app.use("/static", express.static("public", {
    maxAge: "1d",
    etag: true,
    index: "index.html"
}));
```

---

## Router — Full CRUD Example

```js
// src/routes/userRoutes.js
import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CreateUserSchema, UpdateUserSchema, UserQuerySchema } from "../schemas/userSchema.js";
import * as userService from "../services/userService.js";

const router = Router();

// GET /api/users
router.get("/",
    authenticate,
    requireRole("admin"),
    validate("query", UserQuerySchema),
    asyncHandler(async (req, res) => {
        const { page, limit, sort, role, search } = req.query;
        const result = await userService.findAll({ page: +page, limit: +limit, sort, role, search });
        res.json(result);
    })
);

// GET /api/users/:id
router.get("/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw Object.assign(new Error("Invalid ID"), { status: 400 });

        const user = await userService.findById(id);
        if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

        // Non-admins can only view their own profile
        if (req.user.role !== "admin" && req.user.id !== id) {
            throw Object.assign(new Error("Forbidden"), { status: 403 });
        }

        res.json(user);
    })
);

// POST /api/users
router.post("/",
    authenticate,
    requireRole("admin"),
    validate("body", CreateUserSchema),
    asyncHandler(async (req, res) => {
        const user = await userService.create(req.body);
        res.status(201).json(user);
    })
);

// PUT /api/users/:id — full update
router.put("/:id",
    authenticate,
    validate("body", UpdateUserSchema),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const user = await userService.update(id, req.body);
        res.json(user);
    })
);

// PATCH /api/users/:id — partial update
router.patch("/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const user = await userService.partialUpdate(id, req.body);
        res.json(user);
    })
);

// DELETE /api/users/:id
router.delete("/:id",
    authenticate,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        await userService.remove(id);
        res.status(204).end();
    })
);

export default router;
```

---

## Custom Error Classes

```js
// src/utils/errors.js
export class AppError extends Error {
    constructor(message, status = 500, code = "INTERNAL_ERROR") {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = "Resource", id = null) {
        super(
            id ? `${resource} with id ${id} not found` : `${resource} not found`,
            404,
            "NOT_FOUND"
        );
    }
}

export class ValidationError extends AppError {
    constructor(message, fields = {}) {
        super(message, 400, "VALIDATION_ERROR");
        this.fields = fields;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401, "UNAUTHORIZED");
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403, "FORBIDDEN");
    }
}

export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, "CONFLICT");
    }
}
```

```js
// src/middleware/errorHandler.js
import { AppError, ValidationError } from "../utils/errors.js";
import { ZodError } from "zod";

export function errorHandler(err, req, res, next) {
    // Log all errors (use a real logger in production)
    console.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        requestId: req.requestId
    });

    // Zod validation error
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request data",
                fields: err.flatten().fieldErrors
            }
        });
    }

    // Our custom errors
    if (err instanceof ValidationError) {
        return res.status(err.status).json({
            error: { code: err.code, message: err.message, fields: err.fields }
        });
    }

    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: { code: err.code, message: err.message }
        });
    }

    // Prisma errors
    if (err.code === "P2002") {
        return res.status(409).json({
            error: { code: "CONFLICT", message: "A record with that value already exists" }
        });
    }
    if (err.code === "P2025") {
        return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Record not found" }
        });
    }

    // Express body parser errors
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: { code: "INVALID_JSON", message: "Request body is not valid JSON" }
        });
    }

    // Unknown error
    res.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: process.env.NODE_ENV === "production"
                ? "An unexpected error occurred"
                : err.message
        }
    });
}
```

---

## Validation Middleware with Zod

```js
// src/middleware/validate.js
import { ZodError } from "zod";

export function validate(source, schema) {
    return (req, res, next) => {
        try {
            const data = source === "body"   ? req.body
                       : source === "query"  ? req.query
                       : source === "params" ? req.params
                       : req[source];

            const parsed = schema.parse(data);

            // Replace with parsed/coerced values
            if (source === "body")   req.body   = parsed;
            if (source === "query")  req.query  = parsed;
            if (source === "params") req.params = parsed;

            next();
        } catch (err) {
            next(err);  // passes ZodError to error handler
        }
    };
}
```

```js
// src/schemas/userSchema.js
import { z } from "zod";

export const CreateUserSchema = z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email().toLowerCase(),
    password: z.string().min(8).max(100),
    role:     z.enum(["user", "admin", "moderator"]).default("user"),
    age:      z.number().int().min(0).max(150).optional()
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const UserQuerySchema = z.object({
    page:   z.coerce.number().int().min(0).default(0),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    sort:   z.enum(["name", "email", "createdAt"]).default("createdAt"),
    order:  z.enum(["asc", "desc"]).default("desc"),
    role:   z.enum(["user", "admin", "moderator"]).optional(),
    search: z.string().optional()
});
```

---

## asyncHandler Utility

```js
// src/utils/asyncHandler.js
// Wraps async route handlers — any thrown error goes to the error handler
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Or with TypeScript:
import { Request, Response, NextFunction } from "express";
type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<any>;
export const asyncHandler = (fn: AsyncFn) =>
    (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);
```

---

## Summary

- Separate `app.js` (Express setup) from `index.js` (server start) — required for testing.
- Middleware order matters — body parsers before routes, error handler last.
- Use `express.Router()` to split routes into files.
- `asyncHandler` wrapper eliminates try/catch on every async route.
- Custom error classes with `.status` and `.code` give the error handler everything it needs.
- Always validate input with Zod or similar — never trust req.body, req.params, or req.query.
- Use `helmet()` and `express-rate-limit` in every production app.
- 404 handler before error handler, error handler has exactly 4 params.
