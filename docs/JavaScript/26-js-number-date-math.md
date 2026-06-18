---
title: "Numbers, Dates & Math"
sidebar_label: "Numbers, Dates & Math"
sidebar_position: 26
---

# Numbers, Dates & Math

A complete reference for JavaScript number formatting, date manipulation, and the Math object — everything W3Schools covers and more.

---

## Numbers — Complete Reference

### Number Object and Methods

```js
// Number() constructor / conversion
Number("42")            // 42
Number("3.14")          // 3.14
Number("  42  ")        // 42 — trims whitespace
Number("")              // 0
Number("abc")           // NaN
Number(true)            // 1
Number(false)           // 0
Number(null)            // 0
Number(undefined)       // NaN
Number([])              // 0
Number([42])            // 42
Number([1,2])           // NaN

// Number properties (static)
Number.MAX_VALUE              // 1.7976931348623157e+308
Number.MIN_VALUE              // 5e-324 (smallest positive)
Number.MAX_SAFE_INTEGER       // 9007199254740991 (2^53 - 1)
Number.MIN_SAFE_INTEGER       // -9007199254740991
Number.POSITIVE_INFINITY      // Infinity
Number.NEGATIVE_INFINITY      // -Infinity
Number.NaN                    // NaN
Number.EPSILON                // 2.220446049250313e-16 (smallest difference between floats)

// Number static methods
Number.isInteger(42)          // true
Number.isInteger(42.0)        // true
Number.isInteger(42.5)        // false
Number.isInteger("42")        // false (strict — no coercion)

Number.isFinite(42)           // true
Number.isFinite(Infinity)     // false
Number.isFinite(NaN)          // false
Number.isFinite("42")         // false (strict)
isFinite("42")                // true (global — coerces)

Number.isNaN(NaN)             // true
Number.isNaN("hello")         // false (strict — no coercion)
isNaN("hello")                // true (global — coerces)

Number.isSafeInteger(9007199254740991)  // true
Number.isSafeInteger(9007199254740992)  // false

Number.parseInt("42px")       // 42
Number.parseFloat("3.14abc")  // 3.14

// Instance methods
(3.14159).toFixed(2)          // "3.14" — fixed decimal places (returns string)
(3.14159).toFixed(0)          // "3"
(1234.5678).toPrecision(6)    // "1234.57" — total significant digits
(0.000123).toExponential(2)   // "1.23e-4"
(255).toString(16)            // "ff" — hexadecimal
(255).toString(2)             // "11111111" — binary
(8).toString(8)               // "10" — octal
(42).toString()               // "42" — decimal (default)

// Formatting with locale
(1234567.89).toLocaleString()                  // "1,234,567.89" (locale-dependent)
(1234567.89).toLocaleString("de-DE")           // "1.234.567,89"
(1234567.89).toLocaleString("en-US", {
    style:    "currency",
    currency: "USD"
})                                              // "$1,234,567.89"
(0.75).toLocaleString("en-US", {
    style:   "percent",
    maximumFractionDigits: 1
})                                              // "75.0%"
```

### parseInt and parseFloat

```js
// parseInt(string, radix)
parseInt("42")            // 42
parseInt("42.7")          // 42 — truncates decimal
parseInt("42px")          // 42 — stops at non-digit
parseInt("px42")          // NaN — no leading digit
parseInt("  42  ")        // 42 — trims whitespace
parseInt("0xFF")          // 255 — detects hex prefix
parseInt("FF", 16)        // 255 — explicit hex base
parseInt("11", 2)         // 3  — binary
parseInt("17", 8)         // 15 — octal
parseInt("077", 10)       // 77 — always specify radix to avoid ambiguity!

// parseFloat(string)
parseFloat("3.14")        // 3.14
parseFloat("3.14abc")     // 3.14
parseFloat("3.14.15")     // 3.14 — stops at second dot
parseFloat(".5")          // 0.5
parseFloat("abc")         // NaN

// Safer integer parsing
function safeInt(value, fallback = 0) {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
}
```

### Floating Point Issues and Solutions

```js
// The problem
0.1 + 0.2                              // 0.30000000000000004
0.1 + 0.2 === 0.3                      // false!

// Solutions
// 1. Round for display
(0.1 + 0.2).toFixed(1)                // "0.3"

// 2. Use epsilon for comparison
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON  // true

// 3. Multiply to work with integers
(0.1 * 10 + 0.2 * 10) / 10           // 0.3

// 4. Use a library (decimal.js, big.js) for financial math

// More gotchas
0.1 + 0.7                              // 0.7999999999999999
1.0 - 0.9                              // 0.09999999999999998
0.3 / 0.1                              // 2.9999999999999996
```

### BigInt

```js
// For integers larger than Number.MAX_SAFE_INTEGER
const big = 9007199254740992n;         // n suffix
const big2 = BigInt("9007199254740992");
const big3 = BigInt(9007199254740991);

big + 1n                               // 9007199254740993n
big * 2n                               // 18014398509481984n
big / 3n                               // 3002399502580330n (integer division, truncates)
big % 7n                               // 1n
big ** 2n                              // very large number

// Can't mix BigInt and Number
// big + 1       // TypeError!
big + BigInt(1)  // fine
Number(big)      // 9007199254740992 (may lose precision for very large)

// Comparison
1n === 1         // false (different types)
1n == 1          // true  (loose equality)
1n < 2           // true  (comparison coerces)

BigInt.asIntN(32, big)    // treat as 32-bit signed integer
BigInt.asUintN(32, big)   // treat as 32-bit unsigned integer
```

---

## The Math Object — Complete Reference

```js
// ── Constants ─────────────────────────────────────────────────────────────
Math.PI          // 3.141592653589793
Math.E           // 2.718281828459045  (Euler's number)
Math.LN2         // 0.6931471805599453 (natural log of 2)
Math.LN10        // 2.302585092994046  (natural log of 10)
Math.LOG2E       // 1.4426950408889634 (log base 2 of E)
Math.LOG10E      // 0.4342944819032518 (log base 10 of E)
Math.SQRT2       // 1.4142135623730951 (square root of 2)
Math.SQRT1_2     // 0.7071067811865476 (square root of 1/2)

// ── Rounding ──────────────────────────────────────────────────────────────
Math.round(4.5)     // 5  — round to nearest (0.5 rounds UP)
Math.round(4.4)     // 4
Math.round(-4.5)    // -4 — round towards positive infinity
Math.floor(4.9)     // 4  — round down (towards -Infinity)
Math.floor(-4.1)    // -5
Math.ceil(4.1)      // 5  — round up (towards +Infinity)
Math.ceil(-4.9)     // -4
Math.trunc(4.9)     // 4  — remove decimal (towards 0)
Math.trunc(-4.9)    // -4

// ── Absolute value and sign ────────────────────────────────────────────────
Math.abs(-5)        // 5
Math.abs(5)         // 5
Math.sign(-5)       // -1
Math.sign(0)        // 0
Math.sign(5)        // 1

// ── Minimum and Maximum ───────────────────────────────────────────────────
Math.max(1, 5, 3)         // 5
Math.min(1, 5, 3)         // 1
Math.max(...[1, 5, 3])    // 5  — spread array
Math.max()                // -Infinity (no args)
Math.min()                // Infinity  (no args)

// ── Powers and roots ──────────────────────────────────────────────────────
Math.pow(2, 10)     // 1024
2 ** 10             // 1024 — same, using ** operator
Math.sqrt(16)       // 4
Math.cbrt(27)       // 3   — cube root
Math.hypot(3, 4)    // 5   — sqrt(3² + 4²) — Pythagorean theorem
Math.hypot(1, 1, 1) // √3  — supports multiple args

// ── Logarithms ────────────────────────────────────────────────────────────
Math.log(Math.E)    // 1   — natural logarithm (base e)
Math.log(1)         // 0
Math.log(0)         // -Infinity
Math.log2(8)        // 3   — log base 2
Math.log10(1000)    // 3   — log base 10
Math.log1p(0)       // 0   — more accurate log(1 + x) for small x
Math.expm1(0)       // 0   — more accurate e^x - 1 for small x

// ── Exponential ───────────────────────────────────────────────────────────
Math.exp(1)         // 2.718... (e^1)
Math.exp(2)         // 7.389... (e^2)

// ── Trigonometry (all angles in RADIANS) ──────────────────────────────────
const deg2rad = (d) => d * Math.PI / 180;
const rad2deg = (r) => r * 180 / Math.PI;

Math.sin(0)                  // 0
Math.sin(Math.PI / 2)        // 1
Math.sin(deg2rad(90))        // 1
Math.cos(0)                  // 1
Math.cos(Math.PI)            // -1
Math.tan(Math.PI / 4)        // 1 (approximately)
Math.asin(1)                 // π/2 — arcsine (returns radians)
Math.acos(1)                 // 0   — arccosine
Math.atan(1)                 // π/4 — arctangent
Math.atan2(1, 1)             // π/4 — atan of y/x, handles quadrants correctly
Math.sinh(0)                 // 0   — hyperbolic sine
Math.cosh(0)                 // 1   — hyperbolic cosine
Math.tanh(0)                 // 0   — hyperbolic tangent
Math.asinh(0)                // 0   — inverse hyperbolic sine
Math.acosh(1)                // 0
Math.atanh(0)                // 0

// ── Random ────────────────────────────────────────────────────────────────
Math.random()                         // 0 ≤ x < 1

// Random integer 0 to max-1
Math.floor(Math.random() * max)

// Random integer min to max (inclusive)
Math.floor(Math.random() * (max - min + 1)) + min

// Random float between min and max
Math.random() * (max - min) + min

// Random item from array
arr[Math.floor(Math.random() * arr.length)]

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Cryptographically secure random
const buffer = new Uint32Array(1);
crypto.getRandomValues(buffer);
buffer[0] / (2**32 - 1)  // secure random 0 to 1

// ── Bitwise operations in Math ─────────────────────────────────────────────
Math.clz32(1)        // 31 — count leading zeros in 32-bit representation
Math.fround(1.337)   // 1.3370000123977661 — nearest 32-bit float representation
Math.imul(3, 4)      // 12 — 32-bit integer multiplication
```

---

## Date Object — Complete Reference

```js
// ── Creating Dates ────────────────────────────────────────────────────────
new Date()                            // current date and time
new Date(0)                           // Unix epoch: Jan 1, 1970 UTC
new Date(1000)                        // 1 second after epoch (milliseconds)
new Date("2024-04-15")                // ISO string (parsed as UTC midnight)
new Date("2024-04-15T10:30:00")       // ISO with time (local timezone)
new Date("2024-04-15T10:30:00Z")      // ISO UTC
new Date("2024-04-15T10:30:00+02:00") // ISO with offset
new Date("April 15, 2024")            // non-standard string (avoid — browser-dependent)
new Date(2024, 3, 15)                 // year, month(0-indexed!), day  → April 15, 2024
new Date(2024, 3, 15, 10, 30, 0, 0)  // + hours, minutes, seconds, ms

// Month is 0-indexed: 0=January, 1=February, ..., 11=December!

// ── Current time ───────────────────────────────────────────────────────────
Date.now()                            // current timestamp in ms (number, not Date)
new Date().getTime()                  // same
performance.now()                     // high-resolution time in ms (for benchmarks)

// ── Parsing dates ─────────────────────────────────────────────────────────
Date.parse("2024-04-15")              // timestamp in ms or NaN
Date.parse("invalid")                 // NaN

// ── Getting date parts ────────────────────────────────────────────────────
const d = new Date("2024-04-15T10:30:45.123Z");

// Local time getters
d.getFullYear()        // 2024
d.getMonth()           // 3  (April — 0-indexed!)
d.getDate()            // 15 (day of month 1-31)
d.getDay()             // 1  (Monday — 0=Sun, 1=Mon, ..., 6=Sat)
d.getHours()           // local hour 0-23
d.getMinutes()         // 30
d.getSeconds()         // 45
d.getMilliseconds()    // 123
d.getTime()            // ms since epoch
d.getTimezoneOffset()  // minutes offset from UTC (positive = behind UTC)

// UTC getters (always in UTC regardless of local timezone)
d.getUTCFullYear()     // 2024
d.getUTCMonth()        // 3
d.getUTCDate()         // 15
d.getUTCDay()          // 1
d.getUTCHours()        // 10
d.getUTCMinutes()      // 30
d.getUTCSeconds()      // 45
d.getUTCMilliseconds() // 123

// ── Setting date parts ────────────────────────────────────────────────────
const d2 = new Date();
d2.setFullYear(2025)
d2.setFullYear(2025, 11, 31)       // year, month, day in one call
d2.setMonth(11)                    // December (0-indexed)
d2.setDate(31)
d2.setDate(0)                      // last day of previous month!
d2.setDate(d2.getDate() + 7)       // add 7 days
d2.setHours(10)
d2.setHours(10, 30, 0, 0)         // hours, minutes, seconds, ms
d2.setMinutes(30)
d2.setSeconds(0)
d2.setMilliseconds(0)
d2.setTime(Date.now() + 3600000)  // set by timestamp

// UTC setters
d2.setUTCFullYear(2025)
d2.setUTCMonth(0)
d2.setUTCDate(1)
d2.setUTCHours(0, 0, 0, 0)

// ── Converting to strings ─────────────────────────────────────────────────
const d3 = new Date("2024-04-15T10:30:00");

d3.toString()              // "Mon Apr 15 2024 10:30:00 GMT+0200 (Central European Summer Time)"
d3.toDateString()          // "Mon Apr 15 2024"
d3.toTimeString()          // "10:30:00 GMT+0200 (Central European Summer Time)"
d3.toISOString()           // "2024-04-15T08:30:00.000Z" (always UTC)
d3.toJSON()                // same as toISOString()
d3.toUTCString()           // "Mon, 15 Apr 2024 08:30:00 GMT"
d3.toLocaleDateString()    // "4/15/2024" (locale-dependent)
d3.toLocaleTimeString()    // "10:30:00 AM"
d3.toLocaleString()        // "4/15/2024, 10:30:00 AM"

// With locale and options
d3.toLocaleDateString("en-GB")                  // "15/04/2024"
d3.toLocaleDateString("de-DE")                  // "15.4.2024"
d3.toLocaleString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
    second:  "2-digit",
    timeZone: "America/New_York"
})  // "Monday, April 15, 2024 at 04:30:00 AM EDT"

// ── Intl.DateTimeFormat (more powerful formatting) ────────────────────────
const fmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",        // "full"|"long"|"medium"|"short"
    timeStyle: "short",
    timeZone:  "UTC"
});
fmt.format(new Date())        // "Monday, April 15, 2024 at 8:30 AM"
fmt.formatRange(d1, d2)       // "Apr 15 – May 1, 2024"

// ── Date arithmetic ───────────────────────────────────────────────────────
// Add days
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Difference in days
function diffDays(date1, date2) {
    const ms = Math.abs(date2 - date1);   // dates subtract to give ms
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Start/end of day
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

// Start/end of month
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);  // day 0 = last day of prev month
}

// Add months (handles edge cases like Jan 31 + 1 month)
function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

// Is before / after / same
const isBefore = (d1, d2) => d1.getTime() < d2.getTime();
const isAfter  = (d1, d2) => d1.getTime() > d2.getTime();
const isSame   = (d1, d2) => d1.getTime() === d2.getTime();
const isBetween= (d, start, end) => d >= start && d <= end;

// Comparison (dates can be compared directly — they coerce to timestamps)
new Date("2024-01-01") < new Date("2024-12-31")  // true
new Date("2024-01-01") - new Date("2023-01-01")   // ms in one year

// ── Date.UTC — create UTC timestamp ───────────────────────────────────────
Date.UTC(2024, 3, 15)         // timestamp for April 15, 2024 UTC midnight
Date.UTC(2024, 3, 15, 10, 30) // + time
```

### Intl — Internationalization

```js
// ── Intl.NumberFormat ─────────────────────────────────────────────────────
new Intl.NumberFormat("en-US").format(1234567.89)    // "1,234,567.89"
new Intl.NumberFormat("de-DE").format(1234567.89)    // "1.234.567,89"

new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency: "USD"
}).format(19.99)                                      // "$19.99"

new Intl.NumberFormat("de-DE", {
    style:    "currency",
    currency: "EUR"
}).format(19.99)                                      // "19,99 €"

new Intl.NumberFormat("en-US", {
    style:                "percent",
    minimumFractionDigits: 1
}).format(0.7567)                                     // "75.7%"

new Intl.NumberFormat("en", {
    notation: "compact"
}).format(1234567)                                    // "1.2M"

new Intl.NumberFormat("en", {
    notation:             "engineering",
    maximumFractionDigits: 2
}).format(1234567)                                    // "1.23E6"

// ── Intl.RelativeTimeFormat ────────────────────────────────────────────────
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
rtf.format(-1,    "day")     // "yesterday"
rtf.format(1,     "day")     // "tomorrow"
rtf.format(-3,    "day")     // "3 days ago"
rtf.format(5,     "week")    // "in 5 weeks"
rtf.format(-1,    "month")   // "last month"
rtf.format(-1000, "year")    // "1,000 years ago"

// Time ago helper
function timeAgo(date) {
    const rtf     = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const units   = [
        { unit: "year",   seconds: 31536000 },
        { unit: "month",  seconds: 2592000 },
        { unit: "week",   seconds: 604800 },
        { unit: "day",    seconds: 86400 },
        { unit: "hour",   seconds: 3600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 }
    ];
    for (const { unit, seconds: s } of units) {
        const delta = Math.round(seconds / s);
        if (Math.abs(delta) >= 1) return rtf.format(-delta, unit);
    }
    return "just now";
}
timeAgo(new Date(Date.now() - 3600000 * 25))  // "yesterday"
timeAgo(new Date(Date.now() - 60000 * 5))     // "5 minutes ago"

// ── Intl.Collator — locale-aware string comparison ────────────────────────
const coll = new Intl.Collator("de");
["ä","a","z","ö","u","ü"].sort(coll.compare)  // ["a","ä","ö","u","ü","z"] (German order)

// Case-insensitive sort
const collCI = new Intl.Collator("en", { sensitivity: "base" });
["Banana","apple","Cherry"].sort(collCI.compare)  // ["apple","Banana","Cherry"]

// ── Intl.ListFormat ────────────────────────────────────────────────────────
new Intl.ListFormat("en", { type: "conjunction" }).format(["Alice","Bob","Carol"])
// "Alice, Bob, and Carol"
new Intl.ListFormat("en", { type: "disjunction" }).format(["cat","dog"])
// "cat or dog"

// ── Intl.PluralRules ──────────────────────────────────────────────────────
const pr = new Intl.PluralRules("en");
pr.select(0)  // "other"
pr.select(1)  // "one"
pr.select(2)  // "other"

// Use for proper pluralization
function pluralize(count, one, other) {
    const pr = new Intl.PluralRules("en");
    return `${count} ${pr.select(count) === "one" ? one : other}`;
}
pluralize(1, "item", "items")  // "1 item"
pluralize(5, "item", "items")  // "5 items"
```

---

## Summary

- JavaScript has only ONE number type — 64-bit floating point. Use `BigInt` for integers larger than `Number.MAX_SAFE_INTEGER`.
- `Number.isNaN()` and `Number.isFinite()` are strict (no coercion); global `isNaN()` and `isFinite()` coerce the argument — prefer the `Number.` versions.
- Month in `Date` is 0-indexed (January = 0). Always specify radix in `parseInt(str, 10)`.
- Use `Date.prototype.toISOString()` for consistent, timezone-independent string representation.
- `Intl.DateTimeFormat`, `Intl.NumberFormat`, and `Intl.RelativeTimeFormat` handle locale-aware formatting — prefer them over manual formatting.
- `Math.floor(Math.random() * (max - min + 1)) + min` generates random integers inclusive of both ends.
- Floating point comparison: never use `===`, use `Math.abs(a - b) < Number.EPSILON`.
