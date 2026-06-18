---
title: "Node.js Fundamentals"
sidebar_label: "Node.js"
sidebar_position: 6
---

# Node.js Fundamentals

Node.js is a JavaScript runtime built on Chrome's V8 engine. It runs JavaScript outside the browser — on servers, in CLIs, in build tools. It uses an event-driven, non-blocking I/O model that makes it excellent for networked applications.

---

## Architecture

Node.js is single-threaded but handles concurrency through the event loop and asynchronous I/O. When you read a file or make a network request, Node hands off the work to the OS and continues processing other events. When the OS finishes, it puts the callback in the event queue.

```
Your Code (JS, single thread)
         ↓
   Event Loop (libuv)
         ↓
   Thread Pool (libuv — 4 threads by default)
   ├── File I/O
   ├── DNS lookups
   ├── Crypto operations
   └── Custom C++ addons
```

---

## Running JavaScript

```bash
# Check installed version
node --version
node -v

# Run a file
node app.js
node src/index.js

# Run with ES modules
node --input-type=module < script.mjs
# Or set "type": "module" in package.json and use node script.js

# Run TypeScript directly (with tsx or ts-node)
npx tsx src/index.ts
npx ts-node src/index.ts

# Interactive REPL
node
> const x = 42
> x * 2
84
> .help       # REPL commands
> .editor     # multi-line editor mode
> .exit       # quit (or Ctrl+D)

# Evaluate expression directly
node -e "console.log(2 + 2)"
node -e "console.log(JSON.stringify(process.env, null, 2))"

# Pass arguments — available in process.argv
node app.js arg1 arg2 --flag=value
# process.argv: ['node', '/path/to/app.js', 'arg1', 'arg2', '--flag=value']
```

---

## npm — Package Manager

```bash
# Initialize project (creates package.json)
npm init -y         # -y = yes to all defaults

# Install packages
npm install express                     # production dependency
npm install -D nodemon typescript       # dev dependency (not shipped)
npm install -g @angular/cli            # global (command available anywhere)
npm install express@4.18.2             # specific version
npm install express@latest             # latest version

# Shorthand
npm i express
npm i -D nodemon
npm i -g typescript

# Uninstall
npm uninstall express
npm uninstall -g typescript

# Install from package.json (e.g. after cloning a repo)
npm install
npm ci              # faster, stricter — for CI/CD (uses package-lock.json exactly)

# Update packages
npm update              # update all within semver ranges
npm update express      # update specific package
npm outdated            # see what's out of date
npm audit               # check for security vulnerabilities
npm audit fix           # auto-fix vulnerabilities

# Run scripts
npm run dev
npm start       # shorthand for npm run start
npm test        # shorthand for npm run test

# Inspect
npm list                # all installed packages
npm list --depth=0      # only top-level
npm info express        # info about a package
npm root -g             # global install location
```

### package.json in Depth

```json
{
    "name": "my-api",
    "version": "1.0.0",
    "description": "A REST API",
    "type": "module",
    "main": "dist/index.js",
    "bin": {
        "my-cli": "./dist/cli.js"
    },
    "scripts": {
        "start":         "node dist/index.js",
        "dev":           "tsx watch src/index.ts",
        "build":         "tsc",
        "typecheck":     "tsc --noEmit",
        "lint":          "eslint src/",
        "lint:fix":      "eslint src/ --fix",
        "format":        "prettier --write src/",
        "test":          "vitest",
        "test:run":      "vitest run",
        "test:coverage": "vitest run --coverage",
        "db:migrate":    "prisma migrate dev",
        "db:seed":       "tsx src/seed.ts",
        "clean":         "rm -rf dist",
        "prebuild":      "npm run clean",
        "postbuild":     "echo Build complete"
    },
    "dependencies": {
        "express": "^4.18.2",
        "prisma":  "^5.0.0"
    },
    "devDependencies": {
        "typescript": "^5.0.0",
        "tsx":        "^4.0.0",
        "vitest":     "^1.0.0"
    },
    "engines": {
        "node": ">=18.0.0",
        "npm":  ">=9.0.0"
    },
    "license": "MIT"
}
```

**Version specifiers:**
- `"4.18.2"` — exact version
- `"^4.18.2"` — compatible: `>=4.18.2 <5.0.0` (same major)
- `"~4.18.2"` — patch only: `>=4.18.2 <4.19.0`
- `"*"` — any version (dangerous)
- `">=4.0.0"` — at least this version

**Script hooks:** `pre<name>` runs before `<name>`, `post<name>` runs after.

---

## Built-in Modules

### `fs` — File System (Promises API)

```js
import {
    readFile, writeFile, appendFile,
    readdir, mkdir, rmdir, rm,
    stat, access, rename, copyFile, unlink,
    watch
} from "fs/promises";
import { constants } from "fs";

// Read
const text = await readFile("data.txt", "utf8");
const buffer = await readFile("image.png");          // Buffer (no encoding)
const json = JSON.parse(await readFile("data.json", "utf8"));

// Write (creates or replaces)
await writeFile("output.txt", "Hello, World!\n", "utf8");
await writeFile("data.json", JSON.stringify(data, null, 2));

// Append
await appendFile("log.txt", `${new Date().toISOString()} — Event\n`);

// Using flags
await writeFile("file.txt", "data", { flag: "a" });  // append
await writeFile("file.txt", "data", { flag: "wx" }); // fail if exists

// Directory listing
const entries = await readdir("./src");                    // names only
const withTypes = await readdir("./src", { withFileTypes: true });
withTypes.filter(e => e.isDirectory()).map(e => e.name);  // only dirs
withTypes.filter(e => e.isFile()).map(e => e.name);       // only files

// Recursive directory listing
import { readdir } from "fs/promises";
async function listAllFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async entry => {
        const fullPath = `${dir}/${entry.name}`;
        return entry.isDirectory() ? listAllFiles(fullPath) : fullPath;
    }));
    return files.flat();
}

// Create directories
await mkdir("new-dir");
await mkdir("a/b/c/d", { recursive: true });  // create all parents

// Delete
await unlink("file.txt");                      // delete a file
await rm("dir", { recursive: true, force: true }); // delete dir recursively
await rmdir("empty-dir");                      // delete empty dir only

// File info
const stats = await stat("file.txt");
stats.isFile();              // true
stats.isDirectory();         // false
stats.size;                  // bytes
stats.mtime;                 // Date — last modified time
stats.birthtime;             // Date — creation time

// Check existence / permissions
try {
    await access("file.txt", constants.F_OK); // exists?
    await access("file.txt", constants.R_OK); // readable?
    await access("file.txt", constants.W_OK); // writable?
    console.log("All checks passed");
} catch {
    console.log("Access denied or doesn't exist");
}

// Copy and move
await copyFile("source.txt", "dest.txt");
await copyFile("source.txt", "dest.txt", constants.COPYFILE_EXCL); // fail if dest exists
await rename("old.txt", "new.txt");   // move/rename

// Watch for changes
const watcher = watch("./src", { recursive: true });
for await (const { eventType, filename } of watcher) {
    console.log(`${eventType}: ${filename}`);
}
```

### `fs` — Streams (for large files)

```js
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { createGzip, createGunzip } from "zlib";
import { Transform } from "stream";

// Read large file line by line without loading all into memory
import { createInterface } from "readline";

const rl = createInterface({
    input: createReadStream("huge.csv"),
    crlfDelay: Infinity
});

for await (const line of rl) {
    const [name, email] = line.split(",");
    await processUser({ name, email });
}

// Compress a file
await pipeline(
    createReadStream("large.txt"),
    createGzip(),
    createWriteStream("large.txt.gz")
);

// Decompress
await pipeline(
    createReadStream("large.txt.gz"),
    createGunzip(),
    createWriteStream("large.txt")
);

// Transform stream — process data chunk by chunk
const upperCaseTransform = new Transform({
    transform(chunk, encoding, callback) {
        callback(null, chunk.toString().toUpperCase());
    }
});

await pipeline(
    createReadStream("input.txt"),
    upperCaseTransform,
    createWriteStream("output.txt")
);
```

### `path` — Cross-Platform Path Manipulation

```js
import path from "path";
import { fileURLToPath } from "url";

// __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Join — builds path, handles separators correctly for the OS
path.join("/users", "alice", "docs", "file.txt")
// "/users/alice/docs/file.txt" on Unix
// "\\users\\alice\\docs\\file.txt" on Windows

path.join(__dirname, "..", "config", "db.json")  // go up one level

// Resolve — creates absolute path from the cwd
path.resolve("config", "db.json")               // "/cwd/config/db.json"
path.resolve("/root", "config", "db.json")      // "/root/config/db.json" — absolute wins

// Parse and inspect
path.basename("/foo/bar/file.txt")       // "file.txt"
path.basename("/foo/bar/file.txt", ".txt") // "file" — strip extension
path.dirname("/foo/bar/file.txt")        // "/foo/bar"
path.extname("file.txt")                 // ".txt"
path.extname("file")                     // "" — no extension

const parsed = path.parse("/home/alice/file.txt");
// { root: "/", dir: "/home/alice", base: "file.txt", ext: ".txt", name: "file" }

path.format({ dir: "/home/alice", name: "file", ext: ".txt" })
// "/home/alice/file.txt"

// Is absolute?
path.isAbsolute("/home/alice")   // true
path.isAbsolute("relative/path") // false

// Relative path between two paths
path.relative("/app/src", "/app/tests/unit")  // "../../tests/unit"

// Normalize — resolve . and ..
path.normalize("/foo/../bar/./baz")  // "/bar/baz"

// Platform specifics
path.sep      // "/" on Unix, "\\" on Windows
path.delimiter// ":" on Unix, ";" on Windows (for PATH env var)
path.posix    // always Unix-style
path.win32    // always Windows-style
```

### `os` — Operating System

```js
import os from "os";

os.platform()          // "linux", "darwin", "win32", "freebsd"
os.arch()              // "x64", "arm64", "ia32"
os.release()           // kernel version string
os.version()           // OS version string

os.cpus()              // array of CPU info objects
os.cpus().length       // number of logical cores

os.totalmem()          // total RAM in bytes
os.freemem()           // available RAM in bytes
(os.freemem() / os.totalmem() * 100).toFixed(1) + "% free"

os.loadavg()           // [1min, 5min, 15min] load averages (Unix only)

os.hostname()          // machine hostname
os.userInfo()          // { username, uid, gid, shell, homedir }
os.homedir()           // "/home/alice" or "C:\Users\alice"
os.tmpdir()            // "/tmp" or "C:\Temp"

os.networkInterfaces() // network interface details { eth0: [...], lo: [...] }

os.EOL                 // "\n" on Unix, "\r\n" on Windows
```

### `crypto` — Cryptography

```js
import {
    createHash, createHmac,
    randomBytes, randomInt, randomUUID,
    createCipheriv, createDecipheriv,
    scrypt, pbkdf2, timingSafeEqual
} from "crypto";

// Hashing (one-way)
createHash("sha256").update("hello").digest("hex")
createHash("sha256").update("hello").digest("base64")
createHash("md5").update("hello").digest("hex")     // don't use md5 for security

// HMAC — hash with a secret key
createHmac("sha256", "secret-key").update("message").digest("hex")

// Random values
randomBytes(16).toString("hex")     // 32-char hex string — for tokens
randomBytes(32).toString("base64")  // 44-char base64 string
randomUUID()                        // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
randomInt(1, 101)                   // random int from 1 to 100

// Password hashing (use bcrypt in practice, but here's the built-in way)
import { promisify } from "util";
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = await scryptAsync(password, salt, 64);
    return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(stored, input) {
    const [salt, hash] = stored.split(":");
    const inputHash = await scryptAsync(input, salt, 64);
    // timingSafeEqual prevents timing attacks
    return timingSafeEqual(Buffer.from(hash, "hex"), inputHash);
}

// Symmetric encryption (AES-256-GCM)
function encrypt(text, key) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encrypted: encrypted.toString("hex"), iv: iv.toString("hex"), tag: tag.toString("hex") };
}

function decrypt({ encrypted, iv, tag }, key) {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}
```

### `http` and `https` — Raw HTTP

```js
import http from "http";
import https from "https";

// Simple server
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method;

    // Read request body
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
        // Body is now complete
        if (method === "POST" && url.pathname === "/users") {
            const data = JSON.parse(body);
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ id: 1, ...data }));
        } else {
            res.writeHead(404);
            res.end("Not found");
        }
    });
});

server.listen(3000, () => console.log("Running on port 3000"));

// Make an HTTP request (use fetch or axios in practice)
https.get("https://api.github.com/users/torvalds", { headers: { "User-Agent": "Node.js" } }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => console.log(JSON.parse(data)));
});
```

### `events` — EventEmitter

```js
import { EventEmitter } from "events";

class Database extends EventEmitter {
    #connected = false;

    async connect(url) {
        try {
            await performConnection(url);
            this.#connected = true;
            this.emit("connect", { url });
        } catch (err) {
            this.emit("error", err);
        }
    }

    query(sql) {
        if (!this.#connected) {
            this.emit("error", new Error("Not connected"));
            return;
        }
        // ...
        this.emit("query", { sql });
    }

    disconnect() {
        this.#connected = false;
        this.emit("disconnect");
    }
}

const db = new Database();

db.on("connect", ({ url }) => console.log("Connected to:", url));
db.on("error", (err) => console.error("DB error:", err.message));
db.on("query", ({ sql }) => console.log("Query:", sql));
db.once("disconnect", () => console.log("Disconnected")); // runs only once

db.connect("postgres://localhost/mydb");
db.removeListener("error", handler);   // remove specific listener
db.removeAllListeners("error");         // remove all listeners for event
db.listenerCount("connect");            // how many listeners

// Max listeners warning (default: 10)
db.setMaxListeners(20);
```

### `child_process` — Run External Commands

```js
import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// exec — runs in shell, returns stdout/stderr as strings
const { stdout, stderr } = await execAsync("ls -la");
console.log(stdout);

const { stdout: gitLog } = await execAsync("git log --oneline -10");

// execFile — more secure, no shell (no injection risk)
const { stdout: result } = await execAsync("node", ["--version"]);

// spawn — streaming, good for long-running processes
const child = spawn("npm", ["install"], { stdio: "inherit" }); // inherit = show output
child.on("close", (code) => console.log(`Exited with code ${code}`));

// Run a script
const { stdout: output } = await execAsync("node scripts/generate.js");
```

### `worker_threads` — True Parallelism

```js
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

if (isMainThread) {
    // Main thread
    const worker = new Worker(new URL("./worker.js", import.meta.url), {
        workerData: { numbers: [1, 2, 3, 4, 5] }
    });

    worker.on("message", (result) => console.log("Sum:", result));
    worker.on("error", (err) => console.error("Worker error:", err));
    worker.on("exit", (code) => console.log("Worker exited:", code));
} else {
    // Worker thread
    const { numbers } = workerData;
    const sum = numbers.reduce((a, b) => a + b, 0);
    parentPort.postMessage(sum);
}
```

---

## Environment Variables

```bash
# .env file (never commit to git)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
JWT_SECRET=super-secret-minimum-32-chars-long-key
LOG_LEVEL=debug
```

```js
// Load .env file
import "dotenv/config";   // npm install dotenv

// Access
process.env.NODE_ENV    // "development"
process.env.PORT        // "3000" — always a string!
+process.env.PORT       // 3000 — convert to number

// Safe access with defaults
const port    = parseInt(process.env.PORT ?? "3000", 10);
const isDev   = process.env.NODE_ENV === "development";
const isProd  = process.env.NODE_ENV === "production";
const isTest  = process.env.NODE_ENV === "test";

// Validate required variables at startup
const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

// Better: use Zod for full validation (see tooling page)
```

---

## The `process` Object

```js
// Argv
process.argv              // ['node', '/path/app.js', 'arg1', '--flag']
process.argv.slice(2)     // ['arg1', '--flag'] — just the user's args

// Environment
process.env               // all environment variables
process.cwd()             // current working directory
process.chdir("../")      // change working directory
process.execPath          // path to the node executable
process.version           // "v20.11.0"
process.versions          // { node: "20.11.0", v8: "11.3.244.8", ... }
process.platform          // "linux", "darwin", "win32"
process.arch              // "x64", "arm64"
process.pid               // process ID
process.ppid              // parent process ID
process.uptime()          // seconds since process started
process.memoryUsage()     // { rss, heapTotal, heapUsed, external, arrayBuffers }
process.cpuUsage()        // { user, system } in microseconds

// Exit
process.exit(0)           // success
process.exit(1)           // failure
process.exitCode = 1      // set exit code without exiting immediately

// Streams
process.stdin             // readable stream
process.stdout            // writable stream
process.stderr            // writable stream (use for errors)

process.stdout.write("no newline");
process.stderr.write("error message\n");

// Signals and events
process.on("exit", (code) => {
    // Synchronous cleanup only — can't do async here
    console.log(`Exiting with code ${code}`);
});

process.on("SIGTERM", () => {
    // Kubernetes, Docker stop signal — graceful shutdown
    server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
    // Ctrl+C — graceful shutdown
    console.log("\nShutting down gracefully...");
    server.close(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    process.exit(1);  // must exit — process is in unknown state
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
});

// Next tick — runs before I/O events, after current operation
process.nextTick(() => console.log("runs very soon"));
```

---

## Debugging

```bash
# Built-in debugger
node --inspect app.js        # open Chrome devtools: chrome://inspect
node --inspect-brk app.js    # pause on first line

# Debug with VS Code — launch.json
{
    "type": "node",
    "request": "launch",
    "name": "Debug",
    "skipFiles": ["<node_internals>/**"],
    "program": "${workspaceFolder}/src/index.js",
    "runtimeArgs": ["--loader", "tsx/esm"]
}
```

---

## Summary

- Node.js is event-driven and non-blocking — never block the event loop with synchronous heavy work.
- Use the `fs/promises` API for all file operations — callback-based `fs` is legacy.
- `path.join` and `path.resolve` handle cross-platform paths — never concatenate paths with strings.
- `process.env` values are always strings — parse numbers explicitly.
- Handle `SIGTERM` and `SIGINT` for graceful shutdown in production.
- Use `worker_threads` for CPU-intensive work — the event loop is for I/O, not computation.
- Always set up `uncaughtException` and `unhandledRejection` handlers to prevent silent crashes.
