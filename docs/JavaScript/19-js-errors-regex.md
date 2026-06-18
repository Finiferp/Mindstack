---
title: "Errors & Regular Expressions"
sidebar_label: "Errors & Regex"
sidebar_position: 19
---

# Errors & Regular Expressions

Error handling keeps programs from crashing silently. Regular expressions match, search, and transform text patterns. Both are core JavaScript skills.

---

## Error Handling

### try / catch / finally

```js
try {
    // Code that might throw
    const data = JSON.parse(invalidJson);
    const result = riskyOperation();
} catch (error) {
    // Runs if anything in try throws
    console.error(error.message);
    console.error(error.stack);      // full stack trace
} finally {
    // ALWAYS runs — whether try succeeded or catch ran
    // Good for cleanup: close files, hide spinners, release locks
    hideLoadingSpinner();
}
```

### What Can Be Thrown

```js
// JavaScript lets you throw anything, but always throw an Error object
throw "string error";            // legal but bad — no stack trace
throw 42;                        // also bad
throw { message: "bad" };        // also bad

throw new Error("Something failed");          // correct
throw new TypeError("Expected a string");     // correct
throw new RangeError("Value out of range");   // correct
```

### Error Types

```js
// Built-in error types
new Error("generic error")                 // base type
new TypeError("wrong type")               // type mismatch
new RangeError("out of range")            // number outside valid range
new ReferenceError("undefined variable")  // accessing undefined var
new SyntaxError("invalid syntax")         // parser error (from eval)
new URIError("bad URI")                   // malformed URI
new EvalError("eval error")               // error in eval()
new AggregateError([e1, e2], "multiple")  // multiple errors (Promise.any)

// Error properties
const err = new Error("Something went wrong");
err.name        // "Error"
err.message     // "Something went wrong"
err.stack       // "Error: Something went wrong\n    at ..."
err.cause       // ES2022 — original error that caused this one

// Wrap errors with cause
function loadConfig() {
    try {
        return JSON.parse(readFileSync("config.json", "utf8"));
    } catch (cause) {
        throw new Error("Failed to load config", { cause });
        // err.cause is the original JSON parse / file read error
    }
}
```

### Custom Error Classes

```js
class AppError extends Error {
    constructor(message, code, statusCode = 500) {
        super(message);
        this.name       = "AppError";
        this.code       = code;
        this.statusCode = statusCode;
        // Fix prototype chain in older targets
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

class NotFoundError extends AppError {
    constructor(resource, id) {
        super(`${resource} with id ${id} not found`, "NOT_FOUND", 404);
        this.name = "NotFoundError";
    }
}

class ValidationError extends AppError {
    constructor(message, fields = {}) {
        super(message, "VALIDATION_ERROR", 400);
        this.name   = "ValidationError";
        this.fields = fields;
    }
}

// Usage
try {
    throw new NotFoundError("User", 42);
} catch (err) {
    if (err instanceof NotFoundError) {
        console.log(err.statusCode);  // 404
        console.log(err.code);        // "NOT_FOUND"
    }
}
```

### Catching Specific Error Types

```js
async function loadUser(id) {
    try {
        const res = await fetch(`/api/users/${id}`);
        if (!res.ok) throw new AppError(`HTTP ${res.status}`, "HTTP_ERROR", res.status);
        return await res.json();
    } catch (err) {
        if (err instanceof NotFoundError) {
            return null;                         // handle specifically
        }
        if (err instanceof ValidationError) {
            console.warn("Validation:", err.fields);
            return null;
        }
        if (err instanceof TypeError) {
            console.error("Network error:", err.message);
            return null;
        }
        throw err;                               // re-throw unknown errors
    }
}
```

### Error Handling Patterns

```js
// 1. Guard clause — validate first, fail fast
function divide(a, b) {
    if (typeof a !== "number" || typeof b !== "number") {
        throw new TypeError("Arguments must be numbers");
    }
    if (b === 0) {
        throw new RangeError("Divisor cannot be zero");
    }
    return a / b;
}

// 2. Result pattern — avoid try/catch at call sites
async function safeFetch(url) {
    try {
        const res  = await fetch(url);
        const data = await res.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err };
    }
}

const { data: user, error } = await safeFetch("/api/user/1");
if (error) {
    console.error("Failed:", error.message);
} else {
    console.log("Got:", user.name);
}

// 3. Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Uncaught:", message, "at", source, lineno);
    return true;  // suppress default browser error
};

window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();  // suppress console error
});

// Node.js
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
});
```

---

## Regular Expressions

A regular expression (regex) is a pattern for matching text.

### Creating a Regex

```js
// Literal syntax — preferred
const re1 = /hello/;
const re2 = /hello/gi;    // with flags

// Constructor — when pattern is dynamic
const word = "hello";
const re3  = new RegExp(word, "gi");
const re4  = new RegExp(`\\b${word}\\b`, "gi");  // double escape backslashes
```

### Flags

```js
/pattern/i    // i — case-insensitive: /abc/i matches "ABC", "abc", "Abc"
/pattern/g    // g — global: find ALL matches (not just first)
/pattern/m    // m — multiline: ^ and $ match start/end of each LINE
/pattern/s    // s — dotAll: . matches newline characters too
/pattern/u    // u — unicode: proper Unicode support
/pattern/y    // y — sticky: match only from lastIndex
/pattern/d    // d — indices: include match indices in result
/pattern/gi   // combine flags
```

### Characters and Character Classes

```js
// Exact characters
/abc/         // matches "abc" literally

// . — any single character except newline
/a.c/         // matches "abc", "axc", "a1c" but not "ac" or "a\nc"
/a.c/s        // with s flag: also matches "a\nc"

// Character classes
/[abc]/       // a, b, or c
/[a-z]/       // any lowercase letter
/[A-Z]/       // any uppercase letter
/[0-9]/       // any digit
/[a-zA-Z0-9]/ // any letter or digit
/[^abc]/      // NOT a, b, or c (negated class)
/[^a-z]/      // NOT a lowercase letter

// Shorthand classes
/\d/          // digit: [0-9]
/\D/          // non-digit: [^0-9]
/\w/          // word character: [a-zA-Z0-9_]
/\W/          // non-word: [^a-zA-Z0-9_]
/\s/          // whitespace: space, tab, newline, etc.
/\S/          // non-whitespace
/\b/          // word boundary (between \w and \W)
/\B/          // non-word boundary
/\n/          // newline
/\t/          // tab
/\r/          // carriage return
```

### Anchors and Boundaries

```js
/^hello/      // ^ — start of string (or line with m flag)
/hello$/      // $ — end of string (or line with m flag)
/^hello$/     // exact match: only "hello"
/\bhello\b/   // word boundary: "hello" but not "helloworld"
/\bcat\b/g    // finds "cat" in "the cat sat on the caterpillar" — only "cat"

// With m flag
/^name/m      // matches "name" at start of any line in a multiline string
```

### Quantifiers

```js
/a?/          // 0 or 1 — "a" is optional
/a*/          // 0 or more
/a+/          // 1 or more
/a{3}/        // exactly 3
/a{3,}/       // 3 or more
/a{3,5}/      // 3 to 5

// Greedy (default) — match as much as possible
/<.+>/        // matches "<b>text</b>" as ONE match (greedy)

// Lazy — match as little as possible (add ?)
/<.+?>/       // matches "<b>" and "</b>" as TWO matches (lazy)
/a*?/         // lazy 0 or more
/a+?/         // lazy 1 or more
/a{3,5}?/     // lazy 3 to 5 — prefers 3
```

### Groups and Alternation

```js
/(abc)/       // capturing group — captures "abc"
/(?:abc)/     // non-capturing group — groups but doesn't capture
/(?<name>abc)/ // named capturing group

// Alternation
/cat|dog/     // "cat" OR "dog"
/(cat|dog)s/  // captures "cat" or "dog" before "s"

// Backreferences
/(\w+)\s\1/   // matches repeated word: "hello hello"
/(?<word>\w+)\s\k<word>/  // named backreference

// Lookahead and lookbehind (zero-width assertions)
/\d+(?=px)/   // positive lookahead: digits followed by "px" (doesn't include "px")
/\d+(?!px)/   // negative lookahead: digits NOT followed by "px"
/(?<=\$)\d+/  // positive lookbehind: digits preceded by "$"
/(?<!\$)\d+/  // negative lookbehind: digits NOT preceded by "$"

"100px 200em".match(/\d+(?=px)/g)   // ["100"]
"$100 200".match(/(?<=\$)\d+/g)     // ["100"]
```

### String Methods with Regex

```js
const str = "Hello, World! Hello, JavaScript!";

// test() — does pattern exist? Returns boolean
/hello/i.test(str)                    // true
/python/i.test(str)                   // false

// match() — find matches
str.match(/hello/i)
// ["Hello", index: 0, input: "Hello...", groups: undefined]
// Returns null if no match

str.match(/hello/gi)
// ["Hello", "Hello"] — with g flag: array of all matches (no index info)

// matchAll() — iterator of all matches with full detail (requires g flag)
const matches = [...str.matchAll(/hello/gi)];
matches[0]   // ["Hello", index: 0, input: "...", groups: undefined]
matches[1]   // ["Hello", index: 14, ...]

// search() — index of first match, or -1
str.search(/world/i)                  // 7

// replace() — replace first match (or all with g)
str.replace(/hello/i, "Hi")           // "Hi, World! Hello, JavaScript!"
str.replace(/hello/gi, "Hi")          // "Hi, World! Hi, JavaScript!"

// Replace with function
str.replace(/hello/gi, (match) => match.toUpperCase())  // "HELLO, World! HELLO, JavaScript!"
str.replace(/(\w+)/g, (match, p1) => p1.toUpperCase()) // uppercase every word

// replaceAll() — replace all without needing g flag
str.replaceAll("Hello", "Hi")         // same as /hello/gi replace

// split() — split by regex
"one1two2three3".split(/\d/)          // ["one", "two", "three"]
"  spaces   between   words  ".split(/\s+/).filter(Boolean) // ["spaces","between","words"]

// exec() — returns one match at a time, advances lastIndex
const re = /\d+/g;
let m;
while ((m = re.exec("12 items and 34 boxes")) !== null) {
    console.log(`Found ${m[0]} at index ${m.index}`);
}
// Found 12 at index 0
// Found 34 at index 15
```

### Capturing Groups

```js
// Numbered groups
const date    = "2024-04-15";
const match   = date.match(/(\d{4})-(\d{2})-(\d{2})/);
// match[0] = "2024-04-15" (full match)
// match[1] = "2024"       (group 1)
// match[2] = "04"         (group 2)
// match[3] = "15"         (group 3)

// Named groups
const namedMatch = date.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
namedMatch.groups.year   // "2024"
namedMatch.groups.month  // "04"
namedMatch.groups.day    // "15"

// Replace with named groups
"2024-04-15".replace(
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
    "$<day>/$<month>/$<year>"   // "15/04/2024"
);
```

### Practical Regex Patterns

```js
// Validation
const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex      = /^https?:\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;
const phoneRegex    = /^\+?[\d\s\-().]{7,20}$/;
const zipCodeRegex  = /^\d{5}(-\d{4})?$/;
const ipv4Regex     = /^(\d{1,3}\.){3}\d{1,3}$/;
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const dateRegex     = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const timeRegex     = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const slugRegex     = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const creditCard    = /^[\d]{4}([ -]?[\d]{4}){3}$/;

// Extraction
const extractEmails = (text) => text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) ?? [];
const extractUrls   = (text) => text.match(/https?:\/\/[^\s]+/g) ?? [];
const extractNumbers= (text) => text.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
const extractHashtags=(text) => text.match(/#\w+/g) ?? [];
const extractMentions=(text) => text.match(/@\w+/g) ?? [];

// Transformation
const slugify       = (str) => str.toLowerCase()
    .replace(/[^\w\s-]/g, "")    // remove non-word chars
    .replace(/\s+/g, "-")        // spaces to hyphens
    .replace(/-+/g, "-")         // collapse multiple hyphens
    .trim();

const camelToSnake  = (str) => str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
const snakeToCamel  = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const escapeHtml    = (str) => str.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stripHtml     = (html) => html.replace(/<[^>]*>/g, "");
const truncate      = (str, n) => str.replace(new RegExp(`^(.{${n}}\\w*).*`), "$1...");
const removeExtraSpaces = (str) => str.replace(/\s+/g, " ").trim();
```

### RegExp Object Methods

```js
const re = /hello/gi;

// Properties
re.source      // "hello" — the pattern text
re.flags       // "gi"
re.global      // true
re.ignoreCase  // true
re.multiline   // false
re.sticky      // false
re.unicode     // false
re.dotAll      // false
re.lastIndex   // 0 — updated by exec() with g flag

// Methods
re.test("Hello World")   // true — faster than match when you just need boolean
re.exec("Hello World")   // full match result like match()
```

---

## Summary

- Always throw `Error` objects (or subclasses) — strings and plain objects have no stack trace.
- Use `instanceof` to handle specific error types differently in catch blocks.
- The `cause` option (`new Error("msg", { cause: originalErr })`) lets you wrap errors while preserving the original.
- Regex literal `/pattern/flags` is preferred over `new RegExp()` — use constructor only for dynamic patterns.
- `test()` for checking existence (fastest), `match()` for getting matches, `replace()` for transforming.
- Use named capture groups `(?<name>...)` for readable extraction — access via `match.groups.name`.
- Flags: `i` = case-insensitive, `g` = all matches, `m` = multiline, `s` = dotAll, `u` = unicode.
- `?` after a quantifier makes it lazy — `+?` matches as little as possible instead of as much.
