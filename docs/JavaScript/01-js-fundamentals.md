---
title: "JavaScript Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 1
---

# JavaScript Fundamentals

JavaScript is a dynamically-typed, interpreted language that runs in browsers and on servers. Variables have no fixed type — they can hold any value and that value can change. It's single-threaded but handles asynchronous work through an event loop.

---

## Variables

Three keywords. One rule: use `const` by default, `let` only when you need to reassign, never `var`.

```js
var x = 1;    // function-scoped, hoisted, avoid
let y = 2;    // block-scoped, can reassign
const z = 3;  // block-scoped, cannot reassign
```

### Why not var

```js
// var leaks out of blocks
if (true) {
    var leaked = "I escape";
    let safe = "I don't";
}
console.log(leaked); // "I escape" — bug waiting to happen
console.log(safe);   // ReferenceError

// var is hoisted AND can be re-declared
var name = "Alice";
var name = "Bob";    // no error — silent overwrite
let name = "Bob";    // SyntaxError — caught at parse time

// var in loops causes classic bugs
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// prints: 3, 3, 3 — all share the same i

for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// prints: 0, 1, 2 — each iteration has its own i
```

### const does not mean immutable

```js
const user = { name: "Alice" };
user.name = "Bob";     // fine — the object's content can change
user = {};             // TypeError — can't reassign the variable itself

const nums = [1, 2, 3];
nums.push(4);          // fine
nums = [];             // TypeError
```

### Naming conventions

```js
const myVariable     = "camelCase for variables and functions";
const MAX_RETRIES    = 3;          // SCREAMING_SNAKE for constants
class MyClass {}                   // PascalCase for classes
const _private = "convention only, not enforced";
```

---

## Data Types

JavaScript has 8 types. 7 primitives and 1 reference type (Object).

### Primitives

Primitives are immutable and compared by value.

```js
// string
"hello"
'hello'
`hello`     // template literal

// number — there is only ONE number type (no int/float distinction)
42
3.14
-7
Infinity
-Infinity
NaN         // Not a Number — result of invalid math

// bigint — for integers larger than Number.MAX_SAFE_INTEGER
9007199254740991n
BigInt(9007199254740991)

// boolean
true
false

// null — intentional absence of a value (you set this)
null

// undefined — value not yet assigned (JavaScript sets this)
undefined

// symbol — unique, used as object keys
Symbol("id")
Symbol("id") === Symbol("id")  // false — every Symbol is unique
```

### The Object Type

Everything that isn't a primitive is an object — objects, arrays, functions, dates, maps, etc.

```js
typeof {}           // "object"
typeof []           // "object"
typeof null         // "object" — historical bug, null is NOT an object
typeof function(){} // "function" — functions are objects but typeof is special-cased
typeof class{}      // "function" — classes are functions

// Check for null specifically:
value === null

// Check for array specifically:
Array.isArray([])   // true
Array.isArray({})   // false
```

### Type Coercion — The Source of Many Bugs

JavaScript silently converts types when operators are used:

```js
// Addition — string wins, concatenates
"5" + 3         // "53" — number 3 becomes "3"
"5" + 3 + 2     // "532" — left to right
5 + 3 + "2"     // "82" — 5+3=8 first, then "8"+"2"

// Other math operators — string becomes number
"5" - 3         // 2
"5" * 2         // 10
"5" / 2         // 2.5
"five" - 3      // NaN

// Comparison coercion
"5" == 5        // true  — == converts types
"5" === 5       // false — === does not
null == undefined  // true  — special case
null === undefined // false
NaN == NaN         // false — NaN is never equal to anything, including itself

// Always use ===
```

### Checking Types Safely

```js
typeof value === "string"
typeof value === "number"
typeof value === "boolean"
typeof value === "undefined"
typeof value === "function"
typeof value === "bigint"
typeof value === "symbol"

value === null
Array.isArray(value)
value instanceof Date
value instanceof Map
value instanceof Set

// Safe check for any object type
Object.prototype.toString.call([])      // "[object Array]"
Object.prototype.toString.call(new Date()) // "[object Date]"
Object.prototype.toString.call(null)    // "[object Null]"
```

---

## Strings

Strings are immutable sequences of UTF-16 characters.

```js
const s = "Hello, World!";

// Length and access
s.length                  // 13
s[0]                      // "H"
s.charAt(0)               // "H"
s.charCodeAt(0)           // 72 — Unicode code point
String.fromCharCode(72)   // "H"

// Searching
s.indexOf("l")            // 2  — first match, -1 if not found
s.lastIndexOf("l")        // 10 — last match
s.includes("World")       // true
s.startsWith("Hello")     // true
s.endsWith("!")           // true
s.search(/World/)         // 7  — like indexOf but with regex
s.match(/[A-Z]/g)         // ["H", "W"] — all regex matches

// Extracting
s.slice(7, 12)            // "World" — (start, end) — negative ok
s.slice(-6)               // "orld!" — from end
s.substring(7, 12)        // "World" — like slice but no negatives
s.at(-1)                  // "!" — last character (ES2022)

// Transforming
s.toUpperCase()           // "HELLO, WORLD!"
s.toLowerCase()           // "hello, world!"
s.trim()                  // removes whitespace from both ends
s.trimStart()             // removes only from start
s.trimEnd()               // removes only from end
s.replace("World", "JS") // "Hello, JS!" — first match only
s.replaceAll("l", "r")   // "Herro, Worrd!" — all matches
s.split(", ")             // ["Hello", "World!"]
s.split("")               // ["H","e","l","l","o",","," ",...] — each char
"hi".repeat(3)            // "hihihi"
"5".padStart(3, "0")     // "005" — pad to length 3
"5".padEnd(3, "0")       // "500"

// Checking content
"  ".trim().length === 0  // is whitespace-only
s.includes("")            // always true — empty string is in everything
```

### Template Literals

```js
const name = "Alice";
const age = 30;

// Multi-line — literal newlines included
const message = `
  Hello, ${name}!
  You are ${age} years old.
  Next year: ${age + 1}
`;

// Any expression works inside ${}
const price = 19.99;
`Total: $${(price * 1.2).toFixed(2)}`  // "Total: $23.99"
`${isActive ? "Active" : "Inactive"}`

// Tagged templates — function processes the template
function highlight(strings, ...values) {
    return strings.reduce((result, str, i) =>
        result + str + (values[i] !== undefined ? `<b>${values[i]}</b>` : ""), "");
}
highlight`Hello, ${name}! Age: ${age}`
// "Hello, <b>Alice</b>! Age: <b>30</b>"
```

### String Conversion

```js
String(42)          // "42"
String(true)        // "true"
String(null)        // "null"
String(undefined)   // "undefined"
String([1,2,3])     // "1,2,3"

(42).toString()     // "42"
(255).toString(16)  // "ff" — hex
(255).toString(2)   // "11111111" — binary

// JSON for objects
JSON.stringify({ a: 1 })  // '{"a":1}'
```

---

## Numbers

All numbers are 64-bit floating point (IEEE 754). There is no separate integer type.

```js
// Integer limits
Number.MAX_SAFE_INTEGER    // 9007199254740991 (2^53 - 1)
Number.MIN_SAFE_INTEGER    // -9007199254740991
Number.isSafeInteger(9007199254740991)   // true
Number.isSafeInteger(9007199254740992)   // false — precision lost

// For larger integers, use BigInt
9007199254740992n + 1n  // 9007199254740993n — exact

// Floating point gotcha
0.1 + 0.2               // 0.30000000000000004 — not 0.3!
(0.1 + 0.2).toFixed(1)  // "0.3" — fix for display
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON  // true — fix for comparison

// Special values
Infinity            // 1/0, Math.log(0) * -1, etc.
-Infinity           // -1/0
NaN                 // 0/0, parseInt("abc"), Math.sqrt(-1)
isNaN("hello")      // true — coerces to number first
Number.isNaN("hello") // false — stricter, no coercion
isNaN(NaN)          // true
Number.isNaN(NaN)   // true
isFinite(Infinity)  // false
isFinite(42)        // true
```

### Math Methods

```js
Math.round(4.5)      // 5 — round to nearest
Math.floor(4.9)      // 4 — round down
Math.ceil(4.1)       // 5 — round up
Math.trunc(4.9)      // 4 — remove decimals (no rounding)
Math.trunc(-4.9)     // -4 — (floor would give -5)
Math.abs(-5)         // 5 — absolute value
Math.sqrt(16)        // 4
Math.cbrt(27)        // 3 — cube root
Math.pow(2, 10)      // 1024
2 ** 10              // 1024 — same with ** operator
Math.max(1, 5, 3)    // 5
Math.min(1, 5, 3)    // 1
Math.max(...[1,5,3]) // 5 — spread to use with arrays
Math.sign(-5)        // -1
Math.sign(0)         // 0
Math.sign(5)         // 1
Math.log(Math.E)     // 1
Math.log2(8)         // 3
Math.log10(1000)     // 3

// Random
Math.random()                           // 0 to <1
Math.floor(Math.random() * 6) + 1      // dice 1-6
Math.floor(Math.random() * (max - min + 1)) + min  // min to max inclusive
```

### Number Parsing and Conversion

```js
Number("42")          // 42
Number("3.14")        // 3.14
Number("")            // 0   — empty string becomes 0!
Number(" ")           // 0   — whitespace too
Number(null)          // 0
Number(undefined)     // NaN
Number(true)          // 1
Number(false)         // 0
Number("abc")         // NaN

parseInt("42px")      // 42   — stops at non-digit
parseInt("0xff", 16)  // 255  — hex
parseInt("11", 2)     // 3    — binary
parseInt("3.14")      // 3    — ignores decimals
parseFloat("3.14px")  // 3.14

// Display formatting
(1234567.89).toLocaleString()            // "1,234,567.89" (locale-dependent)
(0.000123).toExponential(2)              // "1.23e-4"
(3.14159).toFixed(2)                     // "3.14"
(123.456).toPrecision(5)                 // "123.46"
```

---

## Booleans and Truthiness

```js
// Falsy values — all 8 of them
false
0
-0
0n          // BigInt zero
""          // empty string
null
undefined
NaN

// Everything else is truthy, including:
"0"         // non-empty string — truthy!
"false"     // non-empty string — truthy!
[]          // empty array — truthy!
{}          // empty object — truthy!
-1          // non-zero number — truthy!

// Practical consequences
if ([]) console.log("truthy");    // runs!
if ({}) console.log("truthy");    // runs!
Boolean([]) // true
Boolean({}) // true

// Check for empty array or object explicitly:
arr.length === 0
Object.keys(obj).length === 0
```

### Logical Operators — Short-Circuit

```js
// && returns the first falsy value, or the last value if all truthy
"hello" && "world"    // "world"
null && "world"       // null  — short-circuits
0 && doSomething()    // 0 — doSomething never called

// || returns the first truthy value, or the last value if all falsy
null || "default"     // "default"
"value" || "default"  // "value" — short-circuits
0 || false || "last"  // "last"

// ?? (nullish coalescing) — only null/undefined trigger fallback
null ?? "default"     // "default"
undefined ?? "default"// "default"
0 ?? "default"        // 0     — 0 is NOT null/undefined
"" ?? "default"       // ""    — empty string is NOT null/undefined
false ?? "default"    // false — false is NOT null/undefined

// ||= and &&= and ??= assignment shorthand
let a = null;
a ??= "default";    // a = "default" (assigned because a was null)
let b = "existing";
b ??= "default";    // b stays "existing"

let c = 0;
c ||= 42;           // c = 42 (assigned because 0 is falsy)

let d = 1;
d &&= d * 2;        // d = 2 (multiplied because d was truthy)
```

---

## Comparisons

```js
// Strict equality — always use these
===    // strict equal: same type AND same value
!==    // strict not equal

// Loose equality — avoid
==     // converts types before comparing
!=     // converts types before comparing

// Loose equality coercion table (the crazy ones):
null == undefined   // true
null == 0           // false
null == ""          // false
false == 0          // true
false == ""         // true
false == "0"        // true
"" == 0             // true
" " == 0            // true
[] == false         // true
[] == ![]           // true (!!)

// Object comparison — compares references, not content
{} === {}           // false — different objects in memory
[] === []           // false
const a = {}; a === a  // true — same reference

// Deep equality — no built-in, use a library or JSON trick (limited):
JSON.stringify(obj1) === JSON.stringify(obj2)  // works for simple objects
```

---

## Control Flow

### if / else

```js
// Single line — only for very simple cases
if (active) enable();

// Blocks — always use for anything more complex
if (score >= 90) {
    grade = "A";
} else if (score >= 80) {
    grade = "B";
} else if (score >= 70) {
    grade = "C";
} else {
    grade = "F";
}
```

### switch

```js
switch (status) {
    case "active":
        handleActive();
        break;                // MUST break or execution falls through
    case "pending":
    case "review":            // multiple cases, same handler
        handlePending();
        break;
    case "cancelled":
        handleCancelled();
        break;
    default:
        handleUnknown();
}

// switch uses === internally — strict comparison
switch (1) {
    case "1": console.log("loose"); break;   // doesn't match
    case 1:   console.log("strict"); break;  // matches
}
```

### Ternary

```js
const label = isActive ? "Active" : "Inactive";

// Nested ternary — readable only for very simple cases
const grade = score >= 90 ? "A"
            : score >= 80 ? "B"
            : score >= 70 ? "C"
            : "F";
```

### Optional Chaining `?.`

```js
const user = null;

// Without optional chaining — throws TypeError
user.address.city   // Cannot read properties of null

// With optional chaining — returns undefined safely
user?.address?.city              // undefined
user?.address?.city ?? "Unknown" // "Unknown"

// Works on methods too
user?.greet()        // undefined (not an error)
arr?.[0]             // safe array access
fn?.()               // safe function call

// Useful in real code
const city = order?.customer?.address?.city;
const firstName = users?.[0]?.name?.split(" ")?.[0];
```

---

## Loops

### for

```js
for (let i = 0; i < 5; i++) {
    if (i === 2) continue;   // skip to next iteration
    if (i === 4) break;      // exit loop entirely
    console.log(i);           // 0, 1, 3
}

// Countdown
for (let i = 10; i >= 0; i--) { }

// Multiple variables
for (let i = 0, j = 10; i < j; i++, j--) { }
```

### while and do-while

```js
// while — may never run if condition is false from start
let attempts = 0;
while (attempts < 3) {
    const result = tryOperation();
    if (result.success) break;
    attempts++;
}

// do-while — always runs at least once
let input;
do {
    input = prompt("Enter a number:");
} while (isNaN(Number(input)));
```

### for...of — Iterating Values

```js
// Arrays
for (const item of ["a", "b", "c"]) {
    console.log(item);   // "a", "b", "c"
}

// With index using entries()
for (const [index, value] of ["a", "b", "c"].entries()) {
    console.log(index, value);  // 0 "a", 1 "b", 2 "c"
}

// Strings
for (const char of "hello") {
    console.log(char);  // "h", "e", "l", "l", "o"
}

// Maps
const map = new Map([["a", 1], ["b", 2]]);
for (const [key, value] of map) {
    console.log(key, value);
}

// Sets
for (const item of new Set([1, 2, 3])) { }

// NodeLists (browser)
for (const el of document.querySelectorAll("p")) { }
```

### for...in — Iterating Keys

```js
const obj = { a: 1, b: 2, c: 3 };
for (const key in obj) {
    console.log(key, obj[key]);   // "a" 1, "b" 2, "c" 3
}

// Warning: for...in also iterates inherited properties
// Use hasOwnProperty or Object.keys() to be safe:
for (const key in obj) {
    if (Object.hasOwn(obj, key)) {  // ES2022
        console.log(key);
    }
}
// Better: just use Object.keys(obj).forEach(...)
```

### Labeled Loops

```js
// Break out of nested loops
outer: for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) break outer;
        console.log(i, j);
    }
}
```

---

## Functions

```js
// Function declaration — hoisted (usable before declaration)
function add(a, b) { return a + b; }

// Function expression — NOT hoisted
const add = function(a, b) { return a + b; };

// Named function expression — name only accessible inside
const factorial = function fact(n) {
    return n <= 1 ? 1 : n * fact(n - 1);  // can call fact() inside
};

// Arrow function — implicit return for single expression
const add = (a, b) => a + b;
const double = n => n * 2;       // single param: no parens
const greet = () => "Hello!";    // no params: empty parens required

// Arrow with block — needs explicit return
const process = (n) => {
    const result = n * 2;
    return result;
};

// Returning an object literal — wrap in parentheses!
const makeUser = name => ({ name, active: true });
// Without parens: name => { name, active: true }  ← this is a block, not an object
```

### Parameters

```js
// Default parameters — evaluated at call time, not definition time
function createUser(name, role = "user", createdAt = new Date()) { }
// Note: new Date() is called each time — not once at definition

// Destructuring in parameters
function display({ name, age = 0, address: { city } = {} }) {
    console.log(name, age, city);
}
display({ name: "Alice", age: 30, address: { city: "Paris" } });

// Rest — must be last parameter
function sum(first, second = 0, ...rest) {
    return [first, second, ...rest].reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4, 5);  // 15

// Spread when calling
Math.max(...[1, 5, 3, 7, 2]);  // 7
```

### Return Values

```js
// Functions without return — return undefined
function noReturn() { console.log("hi"); }
noReturn() === undefined  // true

// Early return
function findUser(id) {
    if (!id) return null;       // early exit
    if (!db) return null;       // early exit
    return db.findById(id);     // main logic
}

// Return multiple values — use destructuring
function minMax(arr) {
    return { min: Math.min(...arr), max: Math.max(...arr) };
}
const { min, max } = minMax([3, 1, 4, 1, 5]);
```

---

## Symbols and Well-Known Symbols

```js
// Unique identifiers — useful as object keys to avoid collisions
const id = Symbol("id");
const user = {
    name: "Alice",
    [id]: 12345     // symbol as key — not accessible as user.id
};
user[id];           // 12345
Object.keys(user);  // ["name"] — symbols excluded
JSON.stringify(user) // '{"name":"Alice"}' — symbols excluded

// Well-known symbols customize behavior
const obj = {
    [Symbol.toPrimitive](hint) {
        if (hint === "number") return 42;
        if (hint === "string") return "forty-two";
        return true;
    }
};
+obj        // 42
`${obj}`    // "forty-two"

// Symbol.iterator — make any object iterable
class Range {
    constructor(start, end) { this.start = start; this.end = end; }
    [Symbol.iterator]() {
        let current = this.start;
        const end = this.end;
        return {
            next() {
                return current <= end
                    ? { value: current++, done: false }
                    : { value: undefined, done: true };
            }
        };
    }
}
for (const n of new Range(1, 5)) console.log(n);  // 1 2 3 4 5
[...new Range(1, 5)]  // [1, 2, 3, 4, 5]
```

---

## Nullish and Falsy Patterns

```js
// Default value patterns
const port = process.env.PORT ?? 3000;          // only if PORT is null/undefined
const name = inputName || "Anonymous";           // if inputName is falsy (incl. "")
const count = givenCount !== undefined ? givenCount : 0;  // only if undefined

// Guard clauses (early return pattern)
function processUser(user) {
    if (!user) return null;
    if (!user.active) return null;
    if (!user.email) throw new Error("Email required");
    // now safely work with user
    return transform(user);
}

// Nullish assignment
let config = null;
config ??= { timeout: 5000 };  // assigns because config is null

// Chained optional access with fallback
const city = user?.profile?.address?.city ?? "Unknown city";
```

---

## Summary

- Use `const` by default, `let` when you need to reassign, never `var`.
- `===` always — loose `==` coercion is unpredictable.
- `null` is intentional absence; `undefined` is "not yet set". Both are falsy.
- Template literals `` `${}` `` are cleaner than string concatenation for everything.
- Falsy values: `false`, `0`, `""`, `null`, `undefined`, `NaN`, `0n`. Everything else is truthy.
- `??` checks only for `null`/`undefined`; `||` checks for any falsy value.
- `?.` prevents crashes on null/undefined property access.
- All numbers are 64-bit floats — floating point math is imprecise, use `.toFixed()` for display.
