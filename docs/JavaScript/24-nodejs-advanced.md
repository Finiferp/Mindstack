---
title: "Node.js — Advanced"
sidebar_label: "Node.js Advanced"
sidebar_position: 24
---

# Node.js — Advanced

Production Node.js goes beyond basic routing. This covers WebSockets, queues, caching, rate limiting, file uploads, email, scheduled tasks, and deployment patterns.

---

## WebSockets with ws

```bash
npm install ws
npm install -D @types/ws
```

```typescript
// src/websocket/wsServer.ts
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage }            from "http";
import { verifyAccessToken }          from "../utils/jwt.js";
import server                         from "../index.js";   // your http.Server

interface ExtendedWebSocket extends WebSocket {
    userId?:   number;
    isAlive?:  boolean;
    roomId?:   string;
}

const wss = new WebSocketServer({ server });

// Track connections per room
const rooms = new Map<string, Set<ExtendedWebSocket>>();

function getRoomClients(roomId: string): Set<ExtendedWebSocket> {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    return rooms.get(roomId)!;
}

function broadcast(roomId: string, message: object, exclude?: ExtendedWebSocket) {
    const clients = getRoomClients(roomId);
    const data    = JSON.stringify(message);
    clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// ── Connection handler ─────────────────────────────────────────────────────
wss.on("connection", (ws: ExtendedWebSocket, req: IncomingMessage) => {
    // Authenticate via token in query string
    const url    = new URL(req.url!, `http://${req.headers.host}`);
    const token  = url.searchParams.get("token");

    if (!token) {
        ws.close(1008, "Authentication required");
        return;
    }

    try {
        const payload = verifyAccessToken(token);
        ws.userId     = payload.userId;
        ws.isAlive    = true;
    } catch {
        ws.close(1008, "Invalid token");
        return;
    }

    console.log(`Client connected: userId=${ws.userId}`);

    ws.on("pong", () => { ws.isAlive = true; });  // heartbeat response

    ws.on("message", (rawData) => {
        try {
            const message = JSON.parse(rawData.toString());
            handleMessage(ws, message);
        } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        }
    });

    ws.on("close", (code, reason) => {
        console.log(`Client disconnected: userId=${ws.userId}, code=${code}`);
        if (ws.roomId) {
            getRoomClients(ws.roomId).delete(ws);
            broadcast(ws.roomId, {
                type:   "user_left",
                userId: ws.userId,
                count:  getRoomClients(ws.roomId).size
            });
        }
    });

    ws.on("error", (err) => {
        console.error(`WebSocket error for userId=${ws.userId}:`, err.message);
    });

    ws.send(JSON.stringify({ type: "connected", userId: ws.userId }));
});

// ── Message handler ────────────────────────────────────────────────────────
function handleMessage(ws: ExtendedWebSocket, message: any) {
    switch (message.type) {
        case "join_room": {
            const { roomId } = message;
            if (ws.roomId) getRoomClients(ws.roomId).delete(ws);
            ws.roomId = roomId;
            getRoomClients(roomId).add(ws);
            broadcast(roomId, { type: "user_joined", userId: ws.userId, count: getRoomClients(roomId).size }, ws);
            ws.send(JSON.stringify({ type: "joined", roomId, members: getRoomClients(roomId).size }));
            break;
        }

        case "message": {
            if (!ws.roomId) {
                ws.send(JSON.stringify({ type: "error", message: "Join a room first" }));
                return;
            }
            broadcast(ws.roomId, {
                type:      "message",
                userId:    ws.userId,
                text:      String(message.text).slice(0, 2000),  // limit length
                timestamp: Date.now()
            }, ws);
            break;
        }

        case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

        default:
            ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${message.type}` }));
    }
}

// ── Heartbeat — detect dead connections ────────────────────────────────────
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (!ws.isAlive) {
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);  // every 30s

wss.on("close", () => clearInterval(heartbeatInterval));

export default wss;
```

---

## Job Queues with BullMQ

```bash
npm install bullmq ioredis
```

```typescript
// src/queues/emailQueue.ts
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

// ── Define the queue ───────────────────────────────────────────────────────
export const emailQueue = new Queue("email", {
    connection,
    defaultJobOptions: {
        attempts:    3,
        backoff:     { type: "exponential", delay: 5000 },  // 5s, 10s, 20s
        removeOnComplete: { count: 100 },                    // keep last 100 completed
        removeOnFail:     { count: 50 }                      // keep last 50 failed
    }
});

// ── Add jobs ───────────────────────────────────────────────────────────────
export async function queueWelcomeEmail(userId: number, email: string, name: string) {
    return emailQueue.add(
        "welcome",
        { userId, email, name },
        {
            delay: 5000,          // wait 5 seconds before processing
            priority: 1           // 1 = highest priority
        }
    );
}

export async function queuePasswordReset(email: string, token: string) {
    return emailQueue.add("password-reset", { email, token });
}

export async function scheduleDigest(userId: number) {
    return emailQueue.add(
        "weekly-digest",
        { userId },
        { repeat: { pattern: "0 9 * * MON" } }  // every Monday at 9am
    );
}

// ── Define the worker ──────────────────────────────────────────────────────
export const emailWorker = new Worker(
    "email",
    async (job: Job) => {
        console.log(`Processing job ${job.id}: ${job.name}`);

        switch (job.name) {
            case "welcome":
                await sendWelcomeEmail(job.data.email, job.data.name);
                break;

            case "password-reset":
                await sendPasswordResetEmail(job.data.email, job.data.token);
                break;

            case "weekly-digest":
                const digest = await buildDigest(job.data.userId);
                await sendDigestEmail(digest);
                break;

            default:
                throw new Error(`Unknown job type: ${job.name}`);
        }

        return { success: true, processedAt: new Date().toISOString() };
    },
    {
        connection,
        concurrency: 5,        // process 5 jobs simultaneously
        limiter: {
            max:      10,      // max 10 jobs
            duration: 1000     // per second (rate limiting)
        }
    }
);

// ── Worker events ──────────────────────────────────────────────────────────
emailWorker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
});

emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
    if (job?.attemptsMade === job?.opts.attempts) {
        // All retries exhausted — notify monitoring
        alertMonitoring(`Email job permanently failed: ${err.message}`);
    }
});

emailWorker.on("progress", (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
});

// ── Queue events ───────────────────────────────────────────────────────────
const queueEvents = new QueueEvents("email", { connection });
queueEvents.on("waiting", ({ jobId }) => console.log(`Job ${jobId} waiting`));
queueEvents.on("active",  ({ jobId }) => console.log(`Job ${jobId} active`));

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
    await emailWorker.close();
    await emailQueue.close();
    await connection.quit();
});
```

---

## Caching with Redis

```typescript
// src/lib/cache.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

type CacheOptions = {
    ttl?:   number;      // seconds (default: 300 = 5 minutes)
    prefix?: string;
};

// ── Core cache operations ──────────────────────────────────────────────────
export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    },

    async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    },

    async del(...keys: string[]): Promise<void> {
        if (keys.length > 0) await redis.del(...keys);
    },

    async delPattern(pattern: string): Promise<void> {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
    },

    async exists(key: string): Promise<boolean> {
        return (await redis.exists(key)) === 1;
    },

    async ttl(key: string): Promise<number> {
        return redis.ttl(key);
    },

    async increment(key: string, by = 1): Promise<number> {
        return redis.incrby(key, by);
    },

    // Remember — get from cache or fetch and cache
    async remember<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;

        const value = await fn();
        await this.set(key, value, ttl);
        return value;
    },

    // Memoize — remember with key derived from args
    memoize<TArgs extends any[], TReturn>(
        fn: (...args: TArgs) => Promise<TReturn>,
        { ttl = 300, prefix = fn.name }: CacheOptions = {}
    ) {
        return async (...args: TArgs): Promise<TReturn> => {
            const key = `${prefix}:${JSON.stringify(args)}`;
            return this.remember(key, ttl, () => fn(...args));
        };
    }
};

// ── Cache middleware for Express ───────────────────────────────────────────
export function cacheMiddleware(ttl = 60) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== "GET") return next();

        const key  = `http:${req.originalUrl}`;
        const hit  = await cache.get<any>(key);

        if (hit) {
            res.set("X-Cache", "HIT");
            return res.json(hit);
        }

        // Intercept the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            if (res.statusCode < 400) {
                cache.set(key, data, ttl).catch(console.error);
            }
            res.set("X-Cache", "MISS");
            return originalJson(data);
        };

        next();
    };
}

// ── Usage ──────────────────────────────────────────────────────────────────
// Memoize a service method
const getUser = cache.memoize(
    (id: number) => userRepository.findById(id),
    { ttl: 300, prefix: "user" }
);

// Cache a route response for 60 seconds
router.get("/stats", cacheMiddleware(60), async (req, res) => {
    const stats = await computeExpensiveStats();
    res.json(stats);
});

// Invalidate on write
async function updateUser(id: number, data: any) {
    const user = await db.user.update({ where: { id }, data });
    await cache.del(`user:[${id}]`);
    await cache.delPattern(`user-list:*`);
    return user;
}
```

---

## Rate Limiting

```typescript
// src/middleware/rateLimiter.ts
import rateLimit  from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// ── Factory for rate limiters ──────────────────────────────────────────────
function createLimiter(options: {
    windowMs:   number;
    max:        number;
    message?:   string;
    keyPrefix?: string;
    skipSuccessfulRequests?: boolean;
}) {
    return rateLimit({
        windowMs: options.windowMs,
        max:      options.max,
        standardHeaders: "draft-7",
        legacyHeaders:   false,
        skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
        keyGenerator: (req) => {
            // Use forwarded IP if behind proxy (configure trust proxy)
            return req.ip ?? "unknown";
        },
        handler: (req, res) => {
            res.status(429).json({
                error: {
                    code:    "RATE_LIMIT_EXCEEDED",
                    message: options.message ?? "Too many requests. Please try again later.",
                    retryAfter: Math.ceil(options.windowMs / 1000)
                }
            });
        },
        store: new RedisStore({
            sendCommand: (...args: string[]) => (redis as any).call(...args),
            prefix:      `rl:${options.keyPrefix ?? "default"}:`
        })
    });
}

// ── Specific rate limiters ─────────────────────────────────────────────────
export const globalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,     // 15 minutes
    max:      500,                  // 500 requests per 15 min
    keyPrefix: "global"
});

export const apiLimiter = createLimiter({
    windowMs: 1 * 60 * 1000,      // 1 minute
    max:      60,                   // 60 requests per minute
    keyPrefix: "api"
});

export const loginLimiter = createLimiter({
    windowMs:              15 * 60 * 1000,
    max:                   10,
    skipSuccessfulRequests: true,   // only count failures
    message:               "Too many failed login attempts. Try again in 15 minutes.",
    keyPrefix:             "login"
});

export const createAccountLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,     // 1 hour
    max:      5,                    // 5 accounts per hour per IP
    message:  "Too many accounts created. Try again in an hour.",
    keyPrefix: "register"
});

// ── Per-user rate limiter (requires auth) ──────────────────────────────────
export const userLimiter = rateLimit({
    windowMs: 60 * 1000,
    max:      100,
    keyGenerator: (req: any) => `user:${req.user?.userId ?? req.ip}`,
    store: new RedisStore({
        sendCommand: (...args: string[]) => (redis as any).call(...args),
        prefix: "rl:user:"
    })
});

// Apply in app
app.use(globalLimiter);
app.use("/api/", apiLimiter);
app.post("/api/auth/login",    loginLimiter);
app.post("/api/auth/register", createAccountLimiter);
app.use("/api/",               authenticate, userLimiter);
```

---

## File Uploads with Multer

```bash
npm install multer sharp
npm install -D @types/multer
```

```typescript
// src/middleware/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// ── Memory storage (for processing before saving) ──────────────────────────
export const uploadToMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB
        files:    5                   // max 5 files at once
    },
    fileFilter(req, file, cb: FileFilterCallback) {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});

// ── Disk storage (save directly to disk) ──────────────────────────────────
export const uploadToDisk = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, "uploads/temp/");
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = crypto.randomBytes(16).toString("hex");
            const ext          = path.extname(file.originalname);
            cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
        }
    }),
    limits: { fileSize: 50 * 1024 * 1024 }  // 50MB
});

// ── Image processing route ─────────────────────────────────────────────────
router.post(
    "/users/:id/avatar",
    authenticate,
    uploadToMemory.single("avatar"),  // field name
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const userId   = parseInt(req.params.id, 10);
        const filename = `${userId}-${Date.now()}.webp`;
        const filepath = path.join("uploads", "avatars", filename);

        // Process image with sharp
        await sharp(req.file.buffer)
            .resize(256, 256, { fit: "cover", position: "center" })
            .webp({ quality: 85 })
            .toFile(filepath);

        // Also create thumbnail
        await sharp(req.file.buffer)
            .resize(64, 64, { fit: "cover" })
            .webp({ quality: 70 })
            .toFile(filepath.replace(".webp", "-thumb.webp"));

        const avatarUrl = `/uploads/avatars/${filename}`;
        await userService.updateAvatar(userId, avatarUrl);
        res.json({ avatarUrl });
    })
);

// ── CSV upload ─────────────────────────────────────────────────────────────
const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files allowed"));
        }
    }
});

router.post("/users/import", authenticate, requireRole("ADMIN"), csvUpload.single("csv"), asyncHandler(async (req, res) => {
    const csv    = req.file!.buffer.toString("utf8");
    const lines  = csv.split("\n").filter(Boolean);
    const header = lines[0].split(",");
    const data   = lines.slice(1).map(line => {
        const values = line.split(",");
        return Object.fromEntries(header.map((h, i) => [h.trim(), values[i]?.trim()]));
    });

    const result = await userService.bulkCreate(data);
    res.json({ imported: result.count, errors: result.errors });
}));
```

---

## Sending Email with Nodemailer

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

```typescript
// src/services/emailService.ts
import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter;

function getTransporter(): Transporter {
    if (transporter) return transporter;

    if (env.NODE_ENV === "test") {
        // In tests — capture emails without sending
        transporter = nodemailer.createTransport({ jsonTransport: true });
        return transporter;
    }

    if (env.NODE_ENV === "development" && !env.SMTP_HOST) {
        // Use Ethereal (fake SMTP) in development
        nodemailer.createTestAccount().then(account => {
            transporter = nodemailer.createTransport({
                host:   "smtp.ethereal.email",
                port:    587,
                auth:   { user: account.user, pass: account.pass }
            });
        });
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host:   env.SMTP_HOST,
        port:   env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
        pool:   true,            // reuse connections
        maxConnections: 5,
        maxMessages:    100
    });

    return transporter;
}

// ── Base send function ─────────────────────────────────────────────────────
async function sendEmail(options: {
    to:      string | string[];
    subject: string;
    html:    string;
    text?:   string;
    from?:   string;
    replyTo?: string;
    attachments?: any[];
}): Promise<SentMessageInfo> {
    const info = await getTransporter().sendMail({
        from:        options.from ?? env.EMAIL_FROM ?? "noreply@example.com",
        to:          Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject:     options.subject,
        html:        options.html,
        text:        options.text ?? stripHtml(options.html),
        replyTo:     options.replyTo,
        attachments: options.attachments
    });

    if (env.NODE_ENV === "development") {
        console.log("Email preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return info;
}

// ── Specific email functions ───────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
    await sendEmail({
        to,
        subject: `Welcome to MyApp, ${name}!`,
        html: `
            <h1>Welcome, ${name}!</h1>
            <p>We're glad you joined us.</p>
            <a href="${env.APP_URL}/dashboard" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">
                Get Started
            </a>
        `
    });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
        to,
        subject: "Reset your password",
        html: `
            <h1>Password Reset Request</h1>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>If you didn't request this, ignore this email.</p>
        `
    });
}

export async function sendOrderConfirmation(to: string, order: any): Promise<void> {
    await sendEmail({
        to,
        subject: `Order #${order.id} Confirmed`,
        html: buildOrderEmailTemplate(order)
    });
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
```

---

## Scheduled Tasks with node-cron

```bash
npm install node-cron
npm install -D @types/node-cron
```

```typescript
// src/tasks/scheduler.ts
import cron from "node-cron";

// Cron syntax: second(optional) minute hour day-of-month month day-of-week
// * = any value
// , = list separator  (1,3,5 = 1 and 3 and 5)
// - = range           (1-5 = 1 through 5)
// / = step values     (*/5 = every 5)

export function startScheduler() {

    // Every day at midnight — clean up expired sessions
    cron.schedule("0 0 * * *", async () => {
        console.log("Running: cleanup expired sessions");
        const deleted = await db.session.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        });
        console.log(`Deleted ${deleted.count} expired sessions`);
    }, { timezone: "UTC" });

    // Every Monday at 9am — send weekly digest
    cron.schedule("0 9 * * MON", async () => {
        const users = await db.user.findMany({
            where: { active: true, newsletter: true }
        });
        await Promise.allSettled(
            users.map(user => emailQueue.add("weekly-digest", { userId: user.id }))
        );
        console.log(`Queued ${users.length} digest emails`);
    }, { timezone: "America/New_York" });

    // Every 5 minutes — health metrics
    cron.schedule("*/5 * * * *", async () => {
        const metrics = await collectMetrics();
        await metricsService.record(metrics);
    });

    // Every hour — generate reports
    cron.schedule("0 * * * *", async () => {
        await reportService.generateHourlyReport();
    });

    // Every 30 seconds (for testing — remove in prod)
    if (process.env.NODE_ENV === "development") {
        cron.schedule("*/30 * * * * *", () => {
            console.log("Dev heartbeat:", new Date().toISOString());
        });
    }

    console.log("Scheduler started");
}

// ── Programmatic task with retry ───────────────────────────────────────────
async function runWithRetry(name: string, fn: () => Promise<void>, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await fn();
            return;
        } catch (err) {
            console.error(`Task ${name} attempt ${attempt} failed:`, err);
            if (attempt === maxAttempts) {
                alertOncall(`Scheduled task ${name} failed after ${maxAttempts} attempts`);
            } else {
                await new Promise(r => setTimeout(r, 5000 * attempt));
            }
        }
    }
}
```

---

## Logging with Pino

```bash
npm install pino pino-http
npm install -D pino-pretty
```

```typescript
// src/lib/logger.ts
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
    level: env.LOG_LEVEL ?? "info",

    // Development: pretty colored output
    // Production: JSON for log aggregators (Datadog, Grafana Loki, CloudWatch)
    transport: env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize:      true,
                translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
                ignore:        "pid,hostname"
            }
          }
        : undefined,

    // Redact sensitive fields
    redact: {
        paths:  ["*.password", "*.token", "*.secret", "req.headers.authorization"],
        censor: "[REDACTED]"
    },

    // Base fields on every log entry
    base: {
        service: "my-api",
        version: process.env.npm_package_version ?? "unknown",
        env:     env.NODE_ENV
    },

    // Custom serializers
    serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
    }
});

// Request logger for Express
import pinoHttp from "pino-http";
export const httpLogger = pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => req.url === "/health"   // don't log health checks
    },
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400)        return "warn";
        return "info";
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage:   (req, res, err) => `${req.method} ${req.url} — ${err.message}`
});

// app.use(httpLogger);  // add to Express

// Child logger with request context
export function createReqLogger(requestId: string, userId?: number) {
    return logger.child({ requestId, userId });
}
```

---

## Graceful Shutdown

```typescript
// src/utils/gracefulShutdown.ts
import { Server } from "http";

export async function gracefulShutdown(server: Server, signal: string) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(async () => {
        console.log("HTTP server closed");

        try {
            // 2. Close database connections
            await prisma.$disconnect();
            console.log("Database disconnected");

            // 3. Close Redis
            await redis.quit();
            console.log("Redis disconnected");

            // 4. Stop workers
            await emailWorker.close();
            console.log("Job workers stopped");

            // 5. Stop schedulers
            // cron.destroy(); — stop all cron jobs

            console.log("Graceful shutdown complete");
            process.exit(0);
        } catch (err) {
            console.error("Error during shutdown:", err);
            process.exit(1);
        }
    });

    // Force exit after timeout (if something hangs)
    setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
    }, 30000);
}

// Register handlers
process.on("SIGTERM", () => gracefulShutdown(server, "SIGTERM")); // Docker/K8s stop
process.on("SIGINT",  () => gracefulShutdown(server, "SIGINT"));  // Ctrl+C
```

---

## Summary

- WebSockets with `ws`: authenticate at connection time, use heartbeats to detect dead connections, track rooms with a `Map<roomId, Set<WebSocket>>`.
- BullMQ provides reliable job queues backed by Redis — use it for emails, notifications, heavy processing.
- Cache with Redis using `remember(key, ttl, fn)` — always pair cache writes with cache invalidation on updates.
- Rate limiting with Redis store prevents limit bypassing when running multiple app instances.
- Multer handles file uploads; use `memoryStorage()` when you need to process the file (resize, validate) before saving.
- Pino is the fastest Node.js logger — always log JSON in production, pretty-print in development.
- Always implement graceful shutdown — stop accepting connections, finish in-flight requests, close DB/Redis connections.
