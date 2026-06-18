---
title: "Authentication & JWT"
sidebar_label: "Auth & JWT"
sidebar_position: 10
---

# Authentication & JWT

Authentication proves who the user is. Authorization proves what they can do. JWT (JSON Web Token) is the standard mechanism for stateless REST API authentication — the server issues a signed token, the client sends it on every request, and the server verifies it without touching the database.

---

## How JWT Works

```
1. Client  →  POST /auth/login  { email, password }
2. Server  →  checks credentials, signs a JWT, returns it
3. Client  →  stores the token (memory, localStorage, or httpOnly cookie)
4. Client  →  GET /api/profile  Authorization: Bearer <token>
5. Server  →  verifies signature, extracts payload, processes request
```

### JWT Structure

A JWT is three base64url-encoded parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header
.eyJ1c2VySWQiOjEsImVtYWlsIjoiYUBiLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDg2NDAwfQ==
                                          ← Payload (your data + iat + exp)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
                                          ← Signature (HMAC-SHA256 of header.payload with your secret)
```

The payload is **base64 encoded, not encrypted** — anyone can decode it. The signature only proves it wasn't tampered with. Never put secrets, passwords, or sensitive data in a JWT payload.

---

## Setup

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

---

## Password Hashing with bcryptjs

```typescript
import bcrypt from "bcryptjs";

// Hashing — do this on registration and password change
const SALT_ROUNDS = 12;  // 10–14 is the range: higher = slower = more secure

const hash = await bcrypt.hash("myPlainPassword", SALT_ROUNDS);
// "$2a$12$..." — the salt is embedded in the hash

// Verify — do this on login
const isMatch  = await bcrypt.compare("myPlainPassword", hash);  // true
const isWrong  = await bcrypt.compare("wrongPassword",   hash);  // false
const isWrong2 = await bcrypt.compare("",                hash);  // false

// How salt rounds affect speed (approximate on modern hardware):
// rounds=10 → ~100ms
// rounds=12 → ~400ms  ← good balance
// rounds=14 → ~1600ms ← for very high-security systems

// Never use a cost below 10 in production
// Sync version (blocks event loop — only use in scripts, not servers)
const hashSync = bcrypt.hashSync("password", 12);
const match    = bcrypt.compareSync("password", hashSync);

// Generate salt separately (rarely needed)
const salt = await bcrypt.genSalt(12);
const hash2 = await bcrypt.hash("password", salt);
```

---

## JWT Utility

```typescript
// src/utils/jwt.ts
import jwt, { SignOptions, JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

const SECRET         = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!SECRET || SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
}

export interface TokenPayload {
    userId:  number;
    email:   string;
    role:    string;
    tokenId?: string;  // jti — for token revocation
}

// ── Access Token (short-lived) ────────────────────────────────────────────
export function signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, SECRET, {
        expiresIn:  "15m",              // 15 minutes
        issuer:     "myapp",
        audience:   "myapp-client",
        algorithm:  "HS256"
    });
}

// ── Refresh Token (long-lived) ────────────────────────────────────────────
export function signRefreshToken(payload: Pick<TokenPayload, "userId">, jti: string): string {
    return jwt.sign({ userId: payload.userId, jti }, REFRESH_SECRET, {
        expiresIn: "30d",
        issuer:    "myapp",
        algorithm: "HS256"
    });
}

// ── Verify ────────────────────────────────────────────────────────────────
export function verifyAccessToken(token: string): TokenPayload & JwtPayload {
    return jwt.verify(token, SECRET, {
        issuer:   "myapp",
        audience: "myapp-client"
    }) as TokenPayload & JwtPayload;
}

export function verifyRefreshToken(token: string): { userId: number; jti: string } & JwtPayload {
    return jwt.verify(token, REFRESH_SECRET, {
        issuer: "myapp"
    }) as any;
}

// ── Decode (no verification — for debugging only) ─────────────────────────
export function decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
}

// ── Type guards for errors ────────────────────────────────────────────────
export function isTokenExpiredError(err: unknown): err is TokenExpiredError {
    return err instanceof TokenExpiredError;
}
export function isJwtError(err: unknown): err is JsonWebTokenError {
    return err instanceof JsonWebTokenError;
}

// ── Sign options reference ────────────────────────────────────────────────
// expiresIn:  "1h", "30m", "7d", "30d", 3600 (seconds)
// notBefore:  "10m" — token not valid before 10 minutes from now
// issuer:     string — who issued the token
// audience:   string | string[] — who the token is for
// subject:    string — who the token is about
// jwtid:      string — unique token ID (for revocation)
// algorithm:  "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512"
```

---

## Auth Routes — Full Implementation

```typescript
// src/routes/authRoutes.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../lib/db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, isTokenExpiredError } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email().toLowerCase(),
    password: z.string().min(8).max(100)
        .regex(/[A-Z]/, "Must contain uppercase letter")
        .regex(/[0-9]/, "Must contain a number"),
    role:     z.enum(["user", "admin"]).optional().default("user")
});

const LoginSchema = z.object({
    email:    z.string().email().toLowerCase(),
    password: z.string().min(1)
});

const RefreshSchema = z.object({
    refreshToken: z.string().min(1)
});

const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8)
        .regex(/[A-Z]/, "Must contain uppercase letter")
        .regex(/[0-9]/, "Must contain a number")
});

const ForgotPasswordSchema = z.object({
    email: z.string().email().toLowerCase()
});

const ResetPasswordSchema = z.object({
    token:       z.string().min(1),
    newPassword: z.string().min(8)
});

// ── POST /auth/register ────────────────────────────────────────────────────
router.post("/register", validate("body", RegisterSchema), asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({
            error: { code: "EMAIL_TAKEN", message: "An account with that email already exists" }
        });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
        data: { name, email, passwordHash, role: role.toUpperCase() },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    // Issue tokens
    const jti          = randomUUID();
    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id }, jti);

    // Store refresh token
    await db.session.create({
        data: {
            token:     refreshToken,
            userId:    user.id,
            jti,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });

    res.status(201).json({ user, accessToken, refreshToken });
}));

// ── POST /auth/login ───────────────────────────────────────────────────────
router.post("/login", validate("body", LoginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user (include password for verification)
    const user = await db.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true, active: true, passwordHash: true }
    });

    // IMPORTANT: same error for "not found" AND "wrong password"
    // Never reveal which emails are registered
    const INVALID_CREDENTIALS_MSG = "Invalid email or password";

    if (!user) {
        await bcrypt.hash(password, 12); // dummy hash to prevent timing attacks
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: INVALID_CREDENTIALS_MSG } });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: INVALID_CREDENTIALS_MSG } });
    }

    if (!user.active) {
        return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "Your account has been disabled" } });
    }

    // Issue tokens
    const jti          = randomUUID();
    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id }, jti);

    await db.session.create({
        data: {
            token: refreshToken, userId: user.id, jti,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
}));

// ── POST /auth/refresh ─────────────────────────────────────────────────────
router.post("/refresh", validate("body", RefreshSchema), asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    let payload: any;
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch (err) {
        const message = isTokenExpiredError(err) ? "Refresh token expired" : "Invalid refresh token";
        return res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message } });
    }

    // Check token is in DB and not revoked
    const session = await db.session.findFirst({
        where: { token: refreshToken, userId: payload.userId },
        include: { user: { select: { id: true, email: true, role: true, active: true } } }
    });

    if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: { code: "SESSION_EXPIRED", message: "Please log in again" } });
    }

    if (!session.user.active) {
        return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "Account disabled" } });
    }

    // Issue new access token (optionally rotate refresh token too)
    const newAccessToken = signAccessToken({
        userId: session.user.id,
        email:  session.user.email,
        role:   session.user.role
    });

    // Optionally rotate refresh token (sliding session)
    const newJti          = randomUUID();
    const newRefreshToken = signRefreshToken({ userId: session.user.id }, newJti);
    await db.session.update({
        where: { id: session.id },
        data:  { token: newRefreshToken, jti: newJti, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}));

// ── POST /auth/logout ──────────────────────────────────────────────────────
router.post("/logout", authenticate, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        // Revoke specific session
        await db.session.deleteMany({ where: { token: refreshToken, userId: req.user!.userId } });
    } else {
        // Revoke ALL sessions (logout everywhere)
        await db.session.deleteMany({ where: { userId: req.user!.userId } });
    }

    res.status(204).end();
}));

// ── POST /auth/change-password ─────────────────────────────────────────────
router.post("/change-password", authenticate, validate("body", ChangePasswordSchema), asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await db.user.findUniqueOrThrow({
        where: { id: req.user!.userId },
        select: { id: true, passwordHash: true }
    });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        return res.status(401).json({ error: { code: "WRONG_PASSWORD", message: "Current password is incorrect" } });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ error: { code: "SAME_PASSWORD", message: "New password must be different" } });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    // Revoke all sessions so user must log in with new password on other devices
    await db.session.deleteMany({ where: { userId: user.id } });

    res.json({ message: "Password changed successfully. Please log in again." });
}));

// ── POST /auth/forgot-password ─────────────────────────────────────────────
router.post("/forgot-password", validate("body", ForgotPasswordSchema), asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Always return 200 — don't reveal if email exists
    const GENERIC_RESPONSE = { message: "If that email is registered, you will receive a reset link" };

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return res.json(GENERIC_RESPONSE);  // don't reveal email existence

    // Generate reset token (short-lived, one-time use)
    const resetToken = randomUUID();
    const expiresAt  = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour

    await db.passwordResetToken.upsert({
        where:  { userId: user.id },
        update: { token: resetToken, expiresAt, used: false },
        create: { token: resetToken, expiresAt, userId: user.id }
    });

    // Send email (implement your email service)
    await emailService.sendPasswordReset(user.email, resetToken);

    res.json(GENERIC_RESPONSE);
}));

// ── POST /auth/reset-password ──────────────────────────────────────────────
router.post("/reset-password", validate("body", ResetPasswordSchema), asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const resetRecord = await db.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Reset token is invalid or expired" } });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await db.$transaction([
        db.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: newHash } }),
        db.passwordResetToken.update({ where: { token }, data: { used: true } }),
        db.session.deleteMany({ where: { userId: resetRecord.userId } }) // revoke all sessions
    ]);

    res.json({ message: "Password reset successfully. Please log in." });
}));

// ── GET /auth/me ───────────────────────────────────────────────────────────
router.get("/me", authenticate, asyncHandler(async (req, res) => {
    const user = await db.user.findUniqueOrThrow({
        where: { id: req.user!.userId },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
    });
    res.json(user);
}));

export default router;
```

---

## Auth Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, isTokenExpiredError, isJwtError } from "../utils/jwt.js";
import db from "../lib/db.js";

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId:  number;
                email:   string;
                role:    string;
                tokenId?: string;
            };
        }
    }
}

// ── authenticate — verify JWT, attach user to req ─────────────────────────
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ error: { code: "NO_TOKEN", message: "Authentication required" } });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: { code: "INVALID_TOKEN_FORMAT", message: "Use Bearer token format" } });
    }

    const token = authHeader.substring(7);  // strip "Bearer "

    if (!token) {
        return res.status(401).json({ error: { code: "NO_TOKEN", message: "Token is empty" } });
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            userId:  payload.userId,
            email:   payload.email,
            role:    payload.role,
            tokenId: payload.jti
        };
        next();
    } catch (err) {
        if (isTokenExpiredError(err)) {
            return res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Access token expired. Please refresh." } });
        }
        if (isJwtError(err)) {
            return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Invalid token" } });
        }
        next(err);
    }
}

// ── authenticateOptional — attach user if token present, continue if not ──
export async function authenticateOptional(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) return next();

    try {
        const token   = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        req.user = { userId: payload.userId, email: payload.email, role: payload.role };
    } catch {
        // Ignore token errors for optional auth
    }
    next();
}

// ── requireRole — check user has required role ────────────────────────────
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: { code: "NOT_AUTHENTICATED", message: "Authentication required" } });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: {
                    code: "FORBIDDEN",
                    message: `Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`
                }
            });
        }
        next();
    };
}

// ── requireOwnerOrAdmin — only resource owner or admin can access ──────────
export function requireOwnerOrAdmin(getResourceUserId: (req: Request) => number | Promise<number>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: { code: "NOT_AUTHENTICATED" } });
        }
        if (req.user.role === "ADMIN") return next();  // admins can access anything

        try {
            const resourceUserId = await getResourceUserId(req);
            if (req.user.userId !== resourceUserId) {
                return res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only access your own resources" } });
            }
            next();
        } catch (err) {
            next(err);
        }
    };
}

// ── loadUser — fetch full user from DB (when token payload isn't enough) ──
export async function loadUser(req: Request, res: Response, next: NextFunction) {
    if (!req.user) return next(new Error("authenticate must run before loadUser"));

    try {
        const user = await db.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, role: true, active: true }
        });

        if (!user || !user.active) {
            return res.status(401).json({ error: { code: "USER_NOT_FOUND", message: "User not found or inactive" } });
        }

        req.user = { ...req.user, role: user.role };
        next();
    } catch (err) {
        next(err);
    }
}
```

### Using Auth Middleware in Routes

```typescript
import { authenticate, requireRole, requireOwnerOrAdmin } from "../middleware/auth.js";

// Must be logged in
router.get("/profile", authenticate, handler);

// Must be admin
router.get("/admin/users", authenticate, requireRole("ADMIN"), handler);

// Admin or moderator
router.delete("/posts/:id", authenticate, requireRole("ADMIN", "MODERATOR"), handler);

// Only own resource or admin
router.put("/users/:id",
    authenticate,
    requireOwnerOrAdmin((req) => parseInt(req.params.id)),
    handler
);

// Full user from DB (when you need fresh data)
router.get("/settings",
    authenticate,
    loadUser,   // req.currentUser is fully populated
    handler
);
```

---

## Cookie-Based Auth (httpOnly)

Storing tokens in httpOnly cookies is more secure than localStorage (immune to XSS).

```typescript
// src/middleware/cookieAuth.ts
import { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";

// Setup cookie parser in app.js
// app.use(cookieParser(process.env.COOKIE_SECRET));

const COOKIE_OPTIONS = {
    httpOnly: true,         // no JS access — prevents XSS token theft
    secure:   process.env.NODE_ENV === "production",  // HTTPS only in prod
    sameSite: "lax" as const,  // CSRF protection
    path:     "/"
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000           // 15 minutes
    });
    res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        path:   "/api/auth/refresh",      // only sent to refresh endpoint
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie("access_token",  { ...COOKIE_OPTIONS });
    res.clearCookie("refresh_token", { ...COOKIE_OPTIONS, path: "/api/auth/refresh" });
}

// Auth middleware that reads from cookies instead of Authorization header
export function authenticateFromCookie(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.access_token || req.headers["authorization"]?.substring(7);
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        req.user = verifyAccessToken(token);
        next();
    } catch (err) {
        if (isTokenExpiredError(err)) {
            return res.status(401).json({ error: { code: "TOKEN_EXPIRED" } });
        }
        res.status(401).json({ error: "Invalid token" });
    }
}
```

---

## Rate Limiting Auth Endpoints

```typescript
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../lib/redis.js";

// Strict rate limiting on login — prevent brute force
export const loginLimiter = rateLimit({
    windowMs:    15 * 60 * 1000,  // 15 minutes
    max:         10,               // 10 attempts per 15 min per IP
    skipSuccessfulRequests: true,  // only count failures
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Try again in 15 minutes." } },
    store: new RedisStore({
        sendCommand: (...args: string[]) => (redis as any).call(...args),
        prefix: "rate:login:"
    })
});

// Per-account lockout (after N failed attempts for the same email)
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION  = 15 * 60;  // 15 minutes in seconds

export async function checkAccountLockout(email: string): Promise<void> {
    const key = `lockout:${email}`;
    const attempts = await redis.get(key);

    if (attempts && parseInt(attempts) >= LOCKOUT_THRESHOLD) {
        const ttl = await redis.ttl(key);
        throw Object.assign(
            new Error(`Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`),
            { status: 429, code: "ACCOUNT_LOCKED" }
        );
    }
}

export async function recordFailedLogin(email: string): Promise<void> {
    const key      = `lockout:${email}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
        await redis.expire(key, LOCKOUT_DURATION);
    }
}

export async function clearFailedLogins(email: string): Promise<void> {
    await redis.del(`lockout:${email}`);
}
```

---

## Email Verification

```typescript
// src/services/emailVerification.ts
import { randomBytes } from "crypto";
import db from "../lib/db.js";

export async function sendVerificationEmail(userId: number, email: string): Promise<void> {
    const token     = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24h

    await db.emailVerificationToken.upsert({
        where:  { userId },
        update: { token, expiresAt },
        create: { token, expiresAt, userId }
    });

    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    await emailService.send({
        to:      email,
        subject: "Verify your email",
        html:    `<a href="${verifyUrl}">Click here to verify your email</a>`
    });
}

export async function verifyEmailToken(token: string): Promise<void> {
    const record = await db.emailVerificationToken.findUnique({ where: { token } });

    if (!record || record.expiresAt < new Date()) {
        throw Object.assign(new Error("Invalid or expired verification link"), { status: 400 });
    }

    await db.$transaction([
        db.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
        db.emailVerificationToken.delete({ where: { token } })
    ]);
}
```

---

## Security Checklist

```
✅ Hash passwords with bcrypt (cost ≥ 12)
✅ Use the same error message for "user not found" and "wrong password"
✅ Perform a dummy bcrypt.compare() when user is not found (timing attack prevention)
✅ Short-lived access tokens (15m) + long-lived refresh tokens (30d)
✅ Store refresh tokens in the DB so they can be revoked
✅ Rotate refresh tokens on use (sliding sessions)
✅ Revoke all sessions on password change
✅ Rate limit login, register, and forgot-password endpoints
✅ Validate JWT issuer and audience
✅ Never log tokens, passwords, or password hashes
✅ Use HTTPS in production — tokens are plaintext in transit without it
✅ httpOnly cookies for token storage when possible (prevents XSS theft)
✅ SameSite=Lax or Strict cookie flag (CSRF protection)
✅ Generate password reset tokens with randomBytes(32) — not Math.random()
✅ Reset tokens are one-time use only
✅ Email verification for new accounts
✅ JWT_SECRET must be at least 32 characters, ideally 64+ random bytes
```

---

## Summary

- Hash passwords with bcrypt at cost ≥ 12. Never store plaintext.
- JWTs are signed, not encrypted — never put sensitive data in the payload.
- Short access tokens (15m) reduce exposure window. Long refresh tokens (30d) keep users logged in.
- Store refresh tokens in the database — it's the only way to revoke them.
- Return identical error messages for "user not found" vs "wrong password".
- Perform a dummy `bcrypt.compare()` when no user is found to prevent timing attacks.
- Rate limit auth endpoints to prevent brute force.
- httpOnly cookies are safer than localStorage for token storage.
