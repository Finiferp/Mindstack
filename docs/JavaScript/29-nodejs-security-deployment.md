---
title: "Node.js — Security & Deployment"
sidebar_label: "Security & Deployment"
sidebar_position: 29
---

# Node.js — Security & Deployment

Security is not an afterthought. This covers the OWASP Top 10 as they apply to Node.js APIs, input sanitization, secure headers, SQL injection prevention, CSRF, and production deployment patterns.

---

## Security Headers with Helmet

```bash
npm install helmet
```

```typescript
import helmet from "helmet";

app.use(helmet());   // enables all defaults

// Or configure individually:
app.use(helmet({
    // Content-Security-Policy — prevent XSS
    contentSecurityPolicy: {
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'", "https://cdn.jsdelivr.net"],
            styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:     ["'self'", "https://fonts.gstatic.com"],
            imgSrc:      ["'self'", "data:", "https:"],
            connectSrc:  ["'self'", "https://api.example.com"],
            frameSrc:    ["'none'"],
            objectSrc:   ["'none'"],
            upgradeInsecureRequests: []
        }
    },

    // HTTP Strict Transport Security — force HTTPS
    hsts: {
        maxAge:            31536000,   // 1 year
        includeSubDomains: true,
        preload:           true
    },

    // X-Frame-Options — prevent clickjacking
    frameguard: { action: "deny" },

    // X-Content-Type-Options — prevent MIME sniffing
    noSniff: true,

    // X-XSS-Protection — enable browser XSS filter (legacy)
    xssFilter: true,

    // Referrer-Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },

    // Permissions-Policy (formerly Feature-Policy)
    permittedCrossDomainPolicies: false,

    // Hide X-Powered-By header
    hidePoweredBy: true
}));
```

---

## Input Validation and Sanitization

**Never trust user input.** Validate structure, sanitize content.

```bash
npm install zod dompurify jsdom
```

```typescript
import { z } from "zod";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Set up DOMPurify for Node.js
const window  = new JSDOM("").window;
const purify  = DOMPurify(window);

// ── Validation (what shape is allowed) ────────────────────────────────────
const CreatePostSchema = z.object({
    title:   z.string()
                .min(1, "Title required")
                .max(200, "Title too long")
                .trim(),
    content: z.string()
                .min(1, "Content required")
                .max(50000)
                .trim(),
    tags:    z.array(z.string().trim().toLowerCase())
                .max(10, "Max 10 tags")
                .optional()
                .default([]),
    slug:    z.string()
                .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens")
                .optional()
});

// ── Sanitization (remove dangerous content) ────────────────────────────────

// Strip ALL HTML (for plain text fields)
function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, "").trim();
}

// Allow safe HTML (for rich text fields)
function sanitizeHtml(input: string): string {
    return purify.sanitize(input, {
        ALLOWED_TAGS:  ["b","i","em","strong","a","p","ul","ol","li","br","h1","h2","h3","blockquote","code","pre"],
        ALLOWED_ATTR:  ["href","title","rel"],
        FORCE_BODY:    true
    });
}

// Prevent path traversal
function safePath(userInput: string, allowedBase: string): string {
    const path = require("path");
    const resolved = path.resolve(allowedBase, userInput);
    if (!resolved.startsWith(allowedBase)) {
        throw new Error("Path traversal attempt detected");
    }
    return resolved;
}

// ── Combined middleware ────────────────────────────────────────────────────
router.post("/posts", authenticate, async (req, res, next) => {
    try {
        // 1. Validate structure
        const parsed = CreatePostSchema.parse(req.body);

        // 2. Sanitize content
        const post = {
            title:   stripHtml(parsed.title),
            content: sanitizeHtml(parsed.content),
            tags:    parsed.tags.map(stripHtml),
            authorId: req.user!.userId
        };

        const created = await postService.create(post);
        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});
```

---

## SQL Injection Prevention

```typescript
// ── NEVER do this ──────────────────────────────────────────────────────────
// SQL injection via string concatenation
const name = req.query.name;
const users = await pool.query(`SELECT * FROM users WHERE name = '${name}'`);
// Input: ' OR '1'='1 → returns ALL users!
// Input: '; DROP TABLE users; -- → destroys the database!

// ── ALWAYS use parameterized queries ──────────────────────────────────────
// PostgreSQL — $1, $2
const { rows } = await pool.query(
    "SELECT * FROM users WHERE name = $1 AND active = $2",
    [req.query.name, true]   // values are always passed separately
);

// MySQL — ?
const [rows] = await pool.execute(
    "SELECT * FROM users WHERE name = ? AND active = ?",
    [req.query.name, true]
);

// Prisma — always safe, never raw string interpolation
const users = await prisma.user.findMany({
    where: {
        name:   req.query.name as string,
        active: true
    }
});

// If you must use raw SQL in Prisma
const users = await prisma.$queryRaw`
    SELECT * FROM users
    WHERE name = ${req.query.name}   -- template literal tags are parameterized
    AND active = true
`;
// NEVER: prisma.$queryRawUnsafe(`...${userInput}...`)

// ── Dynamic WHERE clauses — safe pattern ──────────────────────────────────
function buildQuery(filters: { name?: string; role?: string; active?: boolean }) {
    const conditions: string[] = ["1=1"];
    const params: any[]        = [];
    let   paramIndex           = 1;

    if (filters.name !== undefined) {
        conditions.push(`name ILIKE $${paramIndex++}`);
        params.push(`%${filters.name}%`);
    }
    if (filters.role !== undefined) {
        conditions.push(`role = $${paramIndex++}`);
        params.push(filters.role);
    }
    if (filters.active !== undefined) {
        conditions.push(`active = $${paramIndex++}`);
        params.push(filters.active);
    }

    return {
        text:   `SELECT * FROM users WHERE ${conditions.join(" AND ")}`,
        values: params
    };
}
```

---

## CSRF Protection

```bash
npm install csrf-csrf cookie-parser
```

```typescript
import { doubleCsrf } from "csrf-csrf";
import cookieParser   from "cookie-parser";

app.use(cookieParser(process.env.COOKIE_SECRET));

const { generateToken, validateRequest, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET!,
    cookieName: "x-csrf-token",
    cookieOptions: {
        secure:   process.env.NODE_ENV === "production",
        sameSite: "strict",
        httpOnly: true
    },
    size: 64
});

// Provide CSRF token to frontend
app.get("/api/csrf-token", (req, res) => {
    const token = generateToken(req, res);
    res.json({ token });
});

// Protect state-changing routes
app.use("/api", doubleCsrfProtection);

// Frontend sends token in header:
// X-CSRF-Token: <token from /api/csrf-token>
```

---

## NoSQL Injection Prevention

```typescript
// MongoDB / Mongoose injection prevention

// ── UNSAFE — user can inject operators ────────────────────────────────────
const user = await User.findOne({ email: req.body.email });
// If req.body.email = { $gt: "" }, this returns ANY user!

// ── SAFE — validate type strictly ────────────────────────────────────────
import { z } from "zod";

const schema = z.object({ email: z.string().email() });
const { email } = schema.parse(req.body);
const user = await User.findOne({ email });  // now email is definitely a string

// ── Mongoose schema-level protection ──────────────────────────────────────
// Cast ensures MongoDB operators can't be injected
// because the schema expects String, not an object
const schema = new mongoose.Schema({
    email: { type: String, required: true }  // coerces objects to "[object Object]"
});

// For raw MongoDB driver — sanitize keys
function sanitizeMongoQuery(obj: any): any {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeMongoQuery);
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([key]) => !key.startsWith("$"))  // strip operators
            .map(([key, val]) => [key, sanitizeMongoQuery(val)])
    );
}
```

---

## Authentication Security

```typescript
// ── Timing-safe comparison ────────────────────────────────────────────────
import { timingSafeEqual } from "crypto";

// UNSAFE — short-circuit comparison leaks timing info
if (providedToken === storedToken) { }

// SAFE — always takes the same time
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // Still do the comparison to prevent length leaks
        timingSafeEqual(bufA, bufA);
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

// ── Secure token generation ───────────────────────────────────────────────
import { randomBytes } from "crypto";

// For session tokens, API keys, reset tokens
const token    = randomBytes(32).toString("hex");      // 64-char hex
const token2   = randomBytes(32).toString("base64url"); // URL-safe base64

// ── Account lockout ───────────────────────────────────────────────────────
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION  = 15 * 60;  // 15 minutes in seconds

async function checkLockout(identifier: string): Promise<void> {
    const key      = `failed_logins:${identifier}`;
    const attempts = await redis.get(key);

    if (attempts && parseInt(attempts) >= LOCKOUT_THRESHOLD) {
        const ttl = await redis.ttl(key);
        throw Object.assign(
            new Error(`Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`),
            { status: 429, code: "ACCOUNT_LOCKED" }
        );
    }
}

async function recordFailedLogin(identifier: string): Promise<void> {
    const key  = `failed_logins:${identifier}`;
    const pipe = redis.pipeline();
    pipe.incr(key);
    pipe.expire(key, LOCKOUT_DURATION);
    await pipe.exec();
}

async function clearLoginAttempts(identifier: string): Promise<void> {
    await redis.del(`failed_logins:${identifier}`);
}

// ── Password history ──────────────────────────────────────────────────────
async function preventPasswordReuse(userId: number, newPassword: string, historyCount = 5) {
    const history = await db.passwordHistory.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        take:    historyCount,
        select:  { hash: true }
    });

    for (const { hash } of history) {
        if (await bcrypt.compare(newPassword, hash)) {
            throw new Error(`Cannot reuse your last ${historyCount} passwords`);
        }
    }
}
```

---

## Environment and Secrets Management

```typescript
// ── Never hardcode secrets ─────────────────────────────────────────────────
// BAD:
const secret = "supersecret123";
const dbUrl  = "postgresql://admin:password@localhost/db";

// GOOD: always from environment
const secret = process.env.JWT_SECRET;
const dbUrl  = process.env.DATABASE_URL;

// ── Validate all required env vars at startup ─────────────────────────────
import { z } from "zod";

const EnvSchema = z.object({
    NODE_ENV:           z.enum(["development", "production", "test"]),
    PORT:               z.coerce.number().default(3000),
    DATABASE_URL:       z.string().url(),
    JWT_SECRET:         z.string().min(32, "JWT_SECRET must be at least 32 chars"),
    JWT_REFRESH_SECRET: z.string().min(32),
    REDIS_URL:          z.string().url().optional(),
    SMTP_HOST:          z.string().optional(),
    SESSION_SECRET:     z.string().min(32)
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
    console.error("❌ Missing or invalid env vars:");
    result.error.issues.forEach(i => console.error(`  ${i.path.join(".")}: ${i.message}`));
    process.exit(1);
}
export const env = result.data;

// ── .env files ────────────────────────────────────────────────────────────
// .env                — shared dev defaults (can commit without secrets)
// .env.local          — personal overrides (gitignored)
// .env.production     — never commit! Use your deployment platform
// .env.test           — test-specific values

// .gitignore always includes:
// .env
// .env.local
// .env*.local
```

---

## HTTPS and TLS

```typescript
import https from "https";
import fs    from "fs";

// Self-signed cert for development
// openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

const server = https.createServer({
    key:  fs.readFileSync("./certs/key.pem"),
    cert: fs.readFileSync("./certs/cert.pem"),
    // Production: use certs from Let's Encrypt or your CA
    minVersion: "TLSv1.2",      // disable old TLS versions
    ciphers: [                   // strong ciphers only
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-CHACHA20-POLY1305"
    ].join(":")
}, app);

// In production — use a reverse proxy (nginx) for TLS termination
// nginx handles HTTPS, forwards HTTP to your Node.js app

// Force HTTPS redirect
app.use((req, res, next) => {
    if (!req.secure && process.env.NODE_ENV === "production") {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});
```

---

## Docker Security

```dockerfile
# Dockerfile — security best practices

# 1. Use specific version (not latest)
FROM node:22.11-alpine3.20

# 2. Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# 3. Copy only necessary files (use .dockerignore)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --chown=nodeapp:nodejs . .

# 4. Switch to non-root user
USER nodeapp

# 5. Don't expose unnecessary ports
EXPOSE 3000

# 6. Read-only filesystem where possible
# docker run --read-only --tmpfs /tmp ...

# 7. Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

```text
# .dockerignore
.git
.gitignore
node_modules
npm-debug.log
.env
.env.*
*.md
tests/
coverage/
.nyc_output/
```

---

## Production Deployment

### Health Checks

```typescript
// GET /health — used by load balancers and k8s
router.get("/health", async (req, res) => {
    const checks = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping()
    ]);

    const [db, cache] = checks.map(r => ({
        status: r.status === "fulfilled" ? "ok" : "error",
        error:  r.status === "rejected" ? r.reason.message : undefined
    }));

    const healthy = db.status === "ok";  // DB is critical, cache may not be

    res.status(healthy ? 200 : 503).json({
        status:    healthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        version:   process.env.npm_package_version,
        checks:    { database: db, cache }
    });
});

// GET /ready — is the app ready to serve traffic?
router.get("/ready", async (req, res) => {
    // Check if migrations ran, etc.
    res.status(200).json({ ready: true });
});

// GET /live — is the app alive? (liveness probe)
router.get("/live", (req, res) => {
    res.status(200).json({ alive: true });
});
```

### Kubernetes Config

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: my-api
spec:
    replicas: 3
    selector:
        matchLabels: { app: my-api }
    template:
        metadata:
            labels: { app: my-api }
        spec:
            containers:
                - name: my-api
                  image: my-registry/my-api:latest
                  ports:
                      - containerPort: 3000
                  env:
                      - name:  NODE_ENV
                        value: production
                      - name:  DATABASE_URL
                        valueFrom:
                            secretKeyRef: { name: app-secrets, key: database-url }
                      - name:  JWT_SECRET
                        valueFrom:
                            secretKeyRef: { name: app-secrets, key: jwt-secret }
                  resources:
                      requests: { cpu: 100m,  memory: 128Mi }
                      limits:   { cpu: 500m,  memory: 512Mi }
                  livenessProbe:
                      httpGet: { path: /live,  port: 3000 }
                      initialDelaySeconds: 15
                      periodSeconds:       10
                  readinessProbe:
                      httpGet: { path: /ready, port: 3000 }
                      initialDelaySeconds: 5
                      periodSeconds:       5
                  securityContext:
                      runAsNonRoot:             true
                      runAsUser:                1001
                      readOnlyRootFilesystem:   true
                      allowPrivilegeEscalation: false
```

### PM2 — Process Manager

```bash
npm install -g pm2

pm2 start dist/index.js --name my-api
pm2 start ecosystem.config.js

pm2 list          # show running processes
pm2 logs my-api   # view logs
pm2 restart my-api
pm2 stop my-api
pm2 delete my-api
pm2 monit         # real-time monitoring
pm2 save          # save process list
pm2 startup       # generate startup script
```

```js
// ecosystem.config.js
module.exports = {
    apps: [{
        name:          "my-api",
        script:        "dist/index.js",
        instances:     "max",        // use all CPU cores
        exec_mode:     "cluster",    // cluster mode for load balancing
        max_memory_restart: "500M",  // restart if memory exceeds 500MB
        env: {
            NODE_ENV: "production",
            PORT:     3000
        },
        error_file:    "./logs/error.log",
        out_file:      "./logs/out.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        merge_logs:    true,
        watch:         false,        // never use watch in production
        autorestart:   true,
        restart_delay: 4000,
        exp_backoff_restart_delay: 100
    }]
};
```

---

## Security Checklist

```
Authentication & Authorization
✅ Passwords hashed with bcrypt (cost ≥ 12)
✅ JWT with short expiry (15m access, 30d refresh)
✅ Refresh tokens stored in DB for revocation
✅ Rate limiting on auth endpoints
✅ Account lockout after N failed attempts
✅ Timing-safe token comparison
✅ Secure random token generation

Input Validation
✅ Validate all input with Zod or similar
✅ Sanitize HTML content with DOMPurify
✅ Parameterized queries everywhere — no string concatenation
✅ Path traversal prevention for file operations
✅ File upload: validate type, size, and scan content

HTTP Security
✅ helmet() — security headers
✅ CORS configured explicitly
✅ HTTPS only in production
✅ HSTS header enabled
✅ CSP configured
✅ No sensitive data in URLs (use POST body or headers)

Infrastructure
✅ Secrets in environment variables, never code
✅ .env in .gitignore
✅ Validate all env vars at startup
✅ Non-root Docker user
✅ Minimal Docker image
✅ Dependency audit: npm audit

Monitoring
✅ Structured logging (no secrets in logs)
✅ Error tracking (Sentry, Datadog)
✅ Health check endpoints
✅ Rate limit monitoring
✅ Failed auth attempt monitoring
```

---

## Summary

- Use `helmet()` — it sets 10+ security headers with one line.
- Always validate with Zod or similar before touching any user-provided data.
- Parameterized queries are non-negotiable — never interpolate user input into SQL strings.
- Use `timingSafeEqual` for token comparison — timing attacks are real.
- Generate tokens with `crypto.randomBytes(32)` — not `Math.random()`.
- Validate all environment variables at startup — fail fast with clear error messages.
- Run Docker containers as non-root users — add `USER nodeapp` in your Dockerfile.
- Health check endpoints at `/health`, `/ready`, `/live` — required for Kubernetes and load balancers.
