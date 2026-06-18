---
title: "Tooling & Best Practices"
sidebar_label: "Tooling & Best Practices"
sidebar_position: 18
---

# Tooling & Best Practices

The JavaScript ecosystem has a standard set of tools for linting, formatting, bundling, testing, and deploying. Getting these right at project start saves significant pain later.

---

## ESLint — Linting

ESLint statically analyses your code to find problems — bugs, style violations, unused variables, dangerous patterns.

```bash
npm install -D eslint @eslint/js
npm install -D typescript-eslint         # TypeScript support
npm install -D eslint-plugin-vue         # Vue support
npm install -D eslint-plugin-react       # React support
npm install -D eslint-plugin-import      # import ordering
```

### Configuration (Flat Config — ESLint 9+)

```javascript
// eslint.config.js
import js            from "@eslint/js";
import ts            from "typescript-eslint";
import pluginVue     from "eslint-plugin-vue";
import vueParser     from "vue-eslint-parser";

export default [
    // Global ignores
    {
        ignores: ["dist/**", "node_modules/**", "**/*.d.ts", "coverage/**"]
    },

    // JavaScript rules
    js.configs.recommended,

    // TypeScript rules
    ...ts.configs.recommended,
    ...ts.configs.stylistic,

    // Your custom rules
    {
        rules: {
            // Errors — things that will break
            "no-console":                ["warn", { allow: ["warn", "error"] }],
            "no-unused-vars":             "off",          // use TS version instead
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "no-var":                    "error",
            "prefer-const":              "error",
            "no-duplicate-imports":      "error",
            "no-shadow":                 "error",
            "eqeqeq":                   ["error", "always"],

            // Style
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
            "sort-imports":              "off",

            // Best practices
            "no-throw-literal":          "error",
            "prefer-promise-reject-errors": "error",
            "no-return-await":           "error",
            "require-await":             "error",
            "no-await-in-loop":          "warn",
            "no-floating-decimal":       "error"
        }
    },

    // Vue files
    {
        files:     ["**/*.vue"],
        plugins:   { vue: pluginVue },
        languageOptions: { parser: vueParser, parserOptions: { parser: ts.parser } },
        rules: {
            ...pluginVue.configs["vue3-recommended"].rules,
            "vue/multi-word-component-names": "off",
            "vue/no-v-html":               "warn",
            "vue/component-api-style":     ["error", ["script-setup"]],
            "vue/define-macros-order":     ["error", { order: ["defineProps", "defineEmits"] }],
            "vue/no-unused-vars":           "error"
        }
    }
];
```

### Running ESLint

```bash
npx eslint src/                          # check all files in src/
npx eslint src/ --fix                    # auto-fix fixable issues
npx eslint src/index.ts                  # single file
npx eslint src/ --ext .ts,.vue           # specific extensions
npx eslint src/ --format=stylish         # different output format
npx eslint src/ --max-warnings 0         # fail on any warning
```

### Inline Directives

```typescript
/* eslint-disable */                                // disable all rules for file
/* eslint-enable */

// eslint-disable-next-line no-console
console.log("This is ok");

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
function legacyCode(data: any) {
    console.log(data);
}
/* eslint-enable no-console, @typescript-eslint/no-explicit-any */
```

---

## Prettier — Formatting

Prettier formats your code automatically. No more debates about tabs vs spaces, semicolons, quotes.

```bash
npm install -D prettier
npm install -D eslint-config-prettier   # disable ESLint rules that conflict with Prettier
```

```json
// .prettierrc
{
    "semi":           true,
    "singleQuote":    false,
    "quoteProps":     "as-needed",
    "trailingComma":  "es5",
    "tabWidth":       4,
    "useTabs":        false,
    "printWidth":     100,
    "arrowParens":    "always",
    "bracketSpacing": true,
    "endOfLine":      "lf",
    "htmlWhitespaceSensitivity": "css",
    "vueIndentScriptAndStyle":   false,
    "embeddedLanguageFormatting": "auto",
    "overrides": [
        {
            "files": "*.json",
            "options": { "tabWidth": 2 }
        },
        {
            "files": ["*.yml", "*.yaml"],
            "options": { "tabWidth": 2, "singleQuote": true }
        }
    ]
}
```

```text
# .prettierignore
dist/
node_modules/
*.min.js
*.min.css
coverage/
public/
```

```bash
npx prettier --write src/                # format all files in src/
npx prettier --write "src/**/*.{ts,vue,json}"
npx prettier --check src/               # check without changing (CI)
npx prettier --write src/index.ts       # single file
npx prettier --write .                  # format everything
```

---

## Vite — Build Tool

Vite is the standard build tool for Vue, React, and vanilla JS projects. Uses ESBuild for dev (extremely fast) and Rollup for production.

```bash
npm create vite@latest my-app -- --template vue-ts
npm create vite@latest my-app -- --template vanilla-ts
```

### vite.config.ts — Complete Reference

```typescript
import { defineConfig, loadEnv } from "vite";
import vue          from "@vitejs/plugin-vue";
import vueJsx       from "@vitejs/plugin-vue-jsx";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command, mode }) => {
    // Load env variables for the current mode
    const env = loadEnv(mode, process.cwd(), "");

    return {
        // ── Plugins ──────────────────────────────────────────────────────
        plugins: [
            vue({
                script: {
                    propsDestructure: true  // enable props destructure
                }
            }),
            vueJsx()
        ],

        // ── Path Aliases ──────────────────────────────────────────────────
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
                "@assets": fileURLToPath(new URL("./src/assets", import.meta.url))
            },
            extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".vue"]
        },

        // ── Dev Server ────────────────────────────────────────────────────
        server: {
            port:        5173,
            host:        "0.0.0.0",           // listen on all interfaces
            strictPort:  false,               // try next port if taken
            open:        true,                // auto-open browser
            cors:        true,
            hmr: {
                overlay: true                 // show errors as overlay
            },
            proxy: {
                "/api": {
                    target:      "http://localhost:3000",
                    changeOrigin: true,
                    rewrite:     (path) => path.replace(/^\/api/, ""),
                    secure:      false
                },
                "/ws": {
                    target:    "ws://localhost:3000",
                    ws:        true
                }
            }
        },

        // ── Build ────────────────────────────────────────────────────────
        build: {
            outDir:       "dist",
            emptyOutDir:  true,
            sourcemap:    mode === "development",
            minify:       "esbuild",          // "esbuild" | "terser" | false
            target:       "es2022",
            chunkSizeWarningLimit: 500,      // KB

            rollupOptions: {
                output: {
                    // Manual code splitting
                    manualChunks: {
                        vendor:   ["vue", "vue-router", "pinia"],
                        utils:    ["lodash", "date-fns"],
                        ui:       ["element-plus"]
                    }
                }
            },

            // Generate .gz files for static serving
            // reportCompressedSize: true
        },

        // ── CSS ───────────────────────────────────────────────────────────
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@import "@/styles/variables.scss";`
                }
            },
            modules: {
                localsConvention: "camelCase"
            }
        },

        // ── Define ───────────────────────────────────────────────────────
        define: {
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
            __DEV__:         mode === "development"
        },

        // ── Test ──────────────────────────────────────────────────────────
        test: {
            globals:     true,
            environment: "jsdom",
            setupFiles:  ["./src/test/setup.ts"],
            coverage: {
                provider:  "v8",
                reporter:  ["text", "html", "lcov"],
                exclude:   ["**/*.d.ts", "**/*.test.ts", "**/node_modules/**"]
            }
        }
    };
});
```

### Environment Variables in Vite

```bash
# .env — loaded in all environments
VITE_APP_TITLE=My App
VITE_API_URL=http://localhost:3000

# .env.local — overrides .env, not committed (personal overrides)
VITE_API_URL=http://localhost:4000

# .env.development — loaded in dev only
VITE_DEBUG=true
VITE_LOG_LEVEL=debug

# .env.production — loaded in prod build only
VITE_API_URL=https://api.myapp.com
VITE_DEBUG=false
```

```typescript
// Access — ONLY VITE_ prefixed vars are exposed to browser code
const apiUrl  = import.meta.env.VITE_API_URL;
const title   = import.meta.env.VITE_APP_TITLE;
const mode    = import.meta.env.MODE;         // "development" | "production" | "test"
const isDev   = import.meta.env.DEV;          // true in dev
const isProd  = import.meta.env.PROD;         // true in prod build
const baseUrl = import.meta.env.BASE_URL;     // the base URL (from --base flag)

// TypeScript types for env vars
// src/env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_API_URL:    string;
    readonly VITE_APP_TITLE:  string;
    readonly VITE_DEBUG?:     string;
}
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
```

---

## Git Hooks with Husky + lint-staged

Automatically lint and format staged files before each commit.

```bash
npm install -D husky lint-staged
npx husky init          # creates .husky/ folder and package.json script
```

```json
// package.json
{
    "scripts": {
        "prepare": "husky"
    },
    "lint-staged": {
        "*.{ts,tsx,vue,js,jsx}": [
            "eslint --fix",
            "prettier --write"
        ],
        "*.{json,md,css,scss,html}": [
            "prettier --write"
        ],
        "*.{ts,tsx,vue}": [
            "bash -c 'tsc --noEmit'"
        ]
    }
}
```

```bash
# .husky/pre-commit
npx lint-staged

# .husky/commit-msg — enforce commit message format
npx --no -- commitlint --edit "$1"
```

```javascript
// commitlint.config.js — conventional commits
export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [2, "always", [
            "feat", "fix", "docs", "style", "refactor",
            "perf", "test", "build", "ci", "chore", "revert"
        ]],
        "subject-max-length": [2, "always", 72]
    }
};
// Valid: "feat: add user authentication"
// Valid: "fix(auth): resolve token refresh race condition"
// Invalid: "added some stuff"
```

---

## Docker — Node.js Production Images

```dockerfile
# Dockerfile — multi-stage build
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init  # proper signal handling

# ── Dependencies stage ───────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Build stage ──────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build    # tsc or vite build

# ── Production stage ─────────────────────────────────────────────────────────
FROM base AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001 -G nodejs
USER nodeapp

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts
COPY --from=deps    --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/dist         ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./

EXPOSE 3000

# dumb-init handles signals correctly (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
```

### docker-compose.yml — Full Development Setup

```yaml
version: "3.9"

services:
    api:
        build:
            context: .
            target: production
        ports:
            - "3000:3000"
        environment:
            - NODE_ENV=production
            - DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb
            - REDIS_URL=redis://redis:6379
            - JWT_SECRET=${JWT_SECRET}
        depends_on:
            db:
                condition: service_healthy
            redis:
                condition: service_healthy
        restart: unless-stopped
        networks:
            - app-network

    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_DB:       mydb
            POSTGRES_USER:     postgres
            POSTGRES_PASSWORD: postgres
        ports:
            - "5432:5432"
        volumes:
            - postgres-data:/var/lib/postgresql/data
            - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
        healthcheck:
            test:     ["CMD-SHELL", "pg_isready -U postgres -d mydb"]
            interval: 5s
            timeout:  5s
            retries:  10
        networks:
            - app-network

    redis:
        image: redis:7-alpine
        command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
        ports:
            - "6379:6379"
        volumes:
            - redis-data:/data
        healthcheck:
            test:     ["CMD", "redis-cli", "ping"]
            interval: 5s
            timeout:  3s
            retries:  5
        networks:
            - app-network

    # pgAdmin for DB browsing (dev only)
    pgadmin:
        image: dpage/pgadmin4:latest
        profiles: ["dev"]    # only start with: docker compose --profile dev up
        environment:
            PGADMIN_DEFAULT_EMAIL:    admin@example.com
            PGADMIN_DEFAULT_PASSWORD: admin
        ports:
            - "5050:80"
        networks:
            - app-network

networks:
    app-network:
        driver: bridge

volumes:
    postgres-data:
    redis-data:
```

```bash
# Common docker compose commands
docker compose up -d                      # start all services in background
docker compose up -d --build              # rebuild and start
docker compose down                       # stop and remove containers
docker compose down -v                    # also remove volumes (data)
docker compose logs -f api                # follow logs for api service
docker compose exec api sh                # shell into running container
docker compose exec db psql -U postgres   # PostgreSQL shell
docker compose ps                         # list running services
docker compose restart api                # restart a service
docker compose --profile dev up -d        # start with dev profile
```

---

## Environment Variable Validation with Zod

Always validate env vars at startup. Fail fast with a clear error.

```typescript
// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
    // App
    NODE_ENV:  z.enum(["development", "production", "test"]).default("development"),
    PORT:      z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    // Database
    DATABASE_URL:     z.string().url(),
    DB_POOL_MIN:      z.coerce.number().int().min(1).default(2),
    DB_POOL_MAX:      z.coerce.number().int().min(2).default(10),

    // Redis
    REDIS_URL:        z.string().url().optional(),

    // Auth
    JWT_SECRET:       z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN:   z.string().default("15m"),
    REFRESH_SECRET:   z.string().min(32),
    REFRESH_EXPIRES:  z.string().default("30d"),

    // Email
    SMTP_HOST:        z.string().optional(),
    SMTP_PORT:        z.coerce.number().default(587),
    SMTP_USER:        z.string().optional(),
    SMTP_PASS:        z.string().optional(),
    EMAIL_FROM:       z.string().email().optional(),

    // CORS
    ALLOWED_ORIGINS:  z.string().default("http://localhost:5173"),

    // Feature flags
    ENABLE_REGISTRATION: z.coerce.boolean().default(true),
    RATE_LIMIT_MAX:      z.coerce.number().default(100)
});

// Validate and exit with clear errors if invalid
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error("\n❌ Invalid environment variables:\n");
    const errors = result.error.flatten().fieldErrors;
    Object.entries(errors).forEach(([field, messages]) => {
        console.error(`  ${field}: ${messages?.join(", ")}`);
    });
    console.error("\n");
    process.exit(1);
}

export const env = result.data;
export type Env = typeof env;

// Usage — fully typed, validated
env.PORT          // number
env.DATABASE_URL  // string (validated as URL)
env.NODE_ENV      // "development" | "production" | "test"
```

---

## Logging

```bash
npm install pino pino-pretty
```

```typescript
// src/lib/logger.ts
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
        : undefined,       // production: raw JSON for log aggregators
    serializers: {
        err:   pino.stdSerializers.err,
        req:   pino.stdSerializers.req,
        res:   pino.stdSerializers.res
    },
    base: {
        pid:     process.pid,
        service: "my-api",
        version: process.env.npm_package_version
    },
    redact: {
        paths:  ["req.headers.authorization", "*.password", "*.token"],
        censor: "[REDACTED]"  // replace sensitive fields instead of removing
    }
});

// Child logger with context
export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}

// Usage
logger.info("Server started");
logger.info({ userId: 1 }, "User logged in");
logger.warn({ attempts: 3 }, "Rate limit approaching");
logger.error({ err: error }, "Database connection failed");
logger.debug({ query, params }, "SQL query executed");
```

---

## Package.json Scripts — Production Defaults

```json
{
    "scripts": {
        "start":           "node dist/index.js",
        "start:prod":      "NODE_ENV=production node dist/index.js",
        "dev":             "tsx watch src/index.ts",
        "dev:debug":       "tsx watch --inspect src/index.ts",
        "build":           "tsc",
        "build:check":     "tsc --noEmit",
        "clean":           "rm -rf dist",
        "prebuild":        "npm run clean && npm run lint",

        "type-check":      "tsc --noEmit",
        "lint":            "eslint src/ --max-warnings 0",
        "lint:fix":        "eslint src/ --fix",
        "format":          "prettier --write src/",
        "format:check":    "prettier --check src/",

        "test":            "vitest",
        "test:run":        "vitest run",
        "test:watch":      "vitest --watch",
        "test:coverage":   "vitest run --coverage",
        "test:ui":         "vitest --ui",

        "db:migrate":      "prisma migrate dev",
        "db:migrate:prod": "prisma migrate deploy",
        "db:seed":         "tsx prisma/seed.ts",
        "db:reset":        "prisma migrate reset",
        "db:studio":       "prisma studio",
        "db:push":         "prisma db push",
        "db:pull":         "prisma db pull",

        "docker:build":    "docker build -t my-api .",
        "docker:up":       "docker compose up -d",
        "docker:down":     "docker compose down",
        "docker:logs":     "docker compose logs -f api",
        "docker:shell":    "docker compose exec api sh"
    }
}
```

---

## .gitignore — Complete

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/
.output/
.nuxt/
.next/

# Environment files
.env
.env.local
.env.*.local

# Editor
.vscode/
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage/
.nyc_output/

# Prisma
prisma/migrations/dev/

# OS
.DS_Store
Desktop.ini
```

---

## Summary

- `eslint` catches code problems; `prettier` formats — use both, integrate with your editor.
- Husky + lint-staged auto-run checks on commit — enforces quality without thinking about it.
- Vite's proxy config eliminates CORS issues in development — all API calls go through `/api`.
- Multi-stage Docker builds keep the production image small — only runtime code, no build tools.
- Validate env variables at startup with Zod — fail immediately with a clear error rather than cryptic runtime failures.
- Use `pino` for structured JSON logging in production — log aggregators (Datadog, Loki, CloudWatch) parse it natively.
- Always add `.env` to `.gitignore` — never commit secrets.
- Use `npm ci` instead of `npm install` in CI/CD — faster, stricter, reproducible.
