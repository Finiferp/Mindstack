---
title: "Strings — Advanced Reference"
sidebar_label: "Strings Advanced"
sidebar_position: 27
---

# Strings — Advanced Reference

Every string method, string formatting technique, and text processing pattern — the complete W3Schools coverage and beyond.

---

## String Basics

```js
// Creating strings
const s1 = "double quotes";
const s2 = 'single quotes';
const s3 = `template literal`;
const s4 = String(42);           // "42" — convert anything to string
const s5 = (42).toString();      // "42"
const s6 = new String("hello");  // String object (avoid — use primitives)

// String primitives vs String objects
typeof "hello"         // "string"
typeof new String("hello") // "object" — avoid
"hello" instanceof String  // false
new String("hello") instanceof String  // true

// All string methods work on primitives — JS auto-boxes temporarily

// String length
"hello".length     // 5
"".length          // 0
" ".length         // 1 — space counts
```

---

## Every String Method

### Access Characters

```js
const s = "Hello, World!";

// charAt — character at index
s.charAt(0)         // "H"
s.charAt(7)         // "W"
s.charAt(99)        // "" — out of bounds returns empty string

// Bracket notation
s[0]                // "H"
s[7]                // "W"
s[99]               // undefined — out of bounds returns undefined

// at() — supports negative indices (ES2022)
s.at(0)             // "H"   — first
s.at(-1)            // "!"   — last
s.at(-2)            // "d"   — second to last

// charCodeAt — UTF-16 code at index
s.charCodeAt(0)     // 72   — "H"
s.charCodeAt(7)     // 87   — "W"

// codePointAt — Unicode code point (handles emoji, > 0xFFFF)
"😀".codePointAt(0)  // 128512
"A".codePointAt(0)   // 65

// String.fromCharCode — character from code
String.fromCharCode(72)           // "H"
String.fromCharCode(72, 101, 108) // "Hel"

// String.fromCodePoint — from Unicode point (ES6)
String.fromCodePoint(128512)      // "😀"
String.fromCodePoint(65, 66, 67)  // "ABC"
```

### Searching

```js
const text = "The quick brown fox jumps over the lazy dog";

// indexOf — first occurrence, -1 if not found
text.indexOf("fox")          // 16
text.indexOf("cat")          // -1
text.indexOf("o")            // 12
text.indexOf("o", 13)        // 17 — start searching from index 13

// lastIndexOf — last occurrence
text.lastIndexOf("o")        // 41
text.lastIndexOf("o", 40)    // 41 is excluded, finds previous

// includes — boolean check
text.includes("fox")         // true
text.includes("cat")         // false
text.includes("fox", 17)     // false — starts searching from 17

// startsWith — begins with
text.startsWith("The")       // true
text.startsWith("quick")     // false
text.startsWith("quick", 4)  // true — starts from position 4

// endsWith — ends with
text.endsWith("dog")         // true
text.endsWith("fox")         // false
text.endsWith("fox", 19)     // true — treats string as if it ends at index 19

// search — with regex, returns index or -1
text.search(/fox/)           // 16
text.search(/FOX/i)          // 16 — case-insensitive
text.search(/cat/)           // -1

// match — regex match
text.match(/(\w+)\s(\w+)/)   // ["The quick", "The", "quick", ...] — first match
text.match(/\b\w{4}\b/g)     // ["quick", "brown", "jumps", "over", "lazy"] — all 4-letter words (g flag)

// matchAll — all matches with groups (requires g flag)
const matches = [...text.matchAll(/(\w+)/g)];
matches[0]    // ["The", "The", index: 0, ...]
matches.length // 9 (each word)

// localeCompare — compare strings for sorting
"a".localeCompare("b")          // -1 (a comes before b)
"b".localeCompare("a")          // 1  (b comes after a)
"a".localeCompare("a")          // 0  (equal)
"ä".localeCompare("a", "de")    // positive (German: ä after a)
"ä".localeCompare("a", "sv")    // positive (Swedish: ä near end of alphabet)
```

### Modifying / Transforming

```js
const s = "  Hello, World!  ";

// Case
s.toUpperCase()         // "  HELLO, WORLD!  "
s.toLowerCase()         // "  hello, world!  "
s.toLocaleUpperCase()   // locale-aware uppercase
s.toLocaleLowerCase()   // locale-aware lowercase

// Trim whitespace
s.trim()                // "Hello, World!"
s.trimStart()           // "Hello, World!  "  (trimLeft is deprecated alias)
s.trimEnd()             // "  Hello, World!"  (trimRight is deprecated alias)

// Pad
"5".padStart(3, "0")    // "005"  — pad to total length of 3
"5".padEnd(3, "0")      // "500"
"hi".padStart(5)        // "   hi" — default fill is space
"hi".padEnd(5, "-")     // "hi---"
"hello".padStart(3)     // "hello" — no change if already long enough

// Repeat
"ab".repeat(3)          // "ababab"
"ha".repeat(0)          // ""
"x".repeat(5)           // "xxxxx"

// Replace — first match by default, all with g flag or replaceAll
const str = "foo bar foo bar foo";
str.replace("foo", "baz")           // "baz bar foo bar foo" — first only
str.replaceAll("foo", "baz")        // "baz bar baz bar baz" — all
str.replace(/foo/g, "baz")          // "baz bar baz bar baz" — regex with g
str.replace(/foo/gi, "baz")         // case-insensitive
str.replace(/(\w+)\s(\w+)/, "$2 $1")// swap first two words: "bar foo foo bar foo"

// Replace with function
"hello world".replace(/\b\w/g, c => c.toUpperCase()) // "Hello World"
"foo123bar456".replace(/\d+/g, n => parseInt(n) * 2)  // "foo246bar912"

// Template literals with expressions
const price = 19.99;
const tax   = 0.08;
`Total: $${(price * (1 + tax)).toFixed(2)}`   // "Total: $21.59"
`${new Date().getFullYear()} © My Company`

// String.raw — raw template literal (no escape processing)
String.raw`Hello\nWorld`    // "Hello\nWorld" (literal \n, not newline)
String.raw`C:\Users\alice`  // "C:\Users\alice"

// normalize — Unicode normalization
"café".normalize("NFC")   // composed form
"café".normalize("NFD")   // decomposed form
"é".normalize("NFC") === "é".normalize("NFC")  // true even if stored differently
```

### Slicing and Splitting

```js
const s = "Hello, World!";

// slice(start, end) — end is exclusive, supports negative
s.slice(7)           // "World!"    — from 7 to end
s.slice(7, 12)       // "World"     — from 7 to 11
s.slice(-6)          // "orld!"     — last 6 characters
s.slice(-6, -1)      // "orld"      — negative to negative
s.slice(0, -1)       // "Hello, World"
s.slice(7, 3)        // "" — start > end returns empty

// substring(start, end) — no negatives, swaps if start > end
s.substring(7, 12)   // "World"
s.substring(12, 7)   // "World"  — swaps args!
s.substring(-3)      // "Hello, World!" — treats negative as 0

// substr(start, length) — DEPRECATED, avoid
// s.substr(7, 5)    // "World" — 5 chars from index 7

// split — string to array
"a,b,c".split(",")            // ["a", "b", "c"]
"hello".split("")             // ["h","e","l","l","o"]
"hello".split("", 3)          // ["h","e","l"]  — limit
"a  b  c".split(/\s+/)        // ["a","b","c"]  — split on whitespace
"hello world".split(" ", 1)   // ["hello"]       — limit of 1
"abc".split()                 // ["abc"]          — no separator = array of 1
```

### Combining

```js
// concat
"Hello".concat(", ", "World", "!")  // "Hello, World!"
// + operator is simpler:
"Hello" + ", " + "World" + "!"     // "Hello, World!"

// Template literal
const name = "World";
`Hello, ${name}!`                   // "Hello, World!"

// Array.join
["Hello", "World"].join(", ")       // "Hello, World"
["a", "b", "c"].join("")            // "abc"
["a", "b", "c"].join(" - ")         // "a - b - c"
```

---

## String Formatting Techniques

### Number Formatting in Strings

```js
// Fixed decimals
(3.14159).toFixed(2)              // "3.14"
(0.005).toFixed(2)                // "0.01" (rounds up, browser-dependent)

// Currency
const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
formatter.format(1234.56)         // "$1,234.56"

// Thousands separator
(1234567).toLocaleString()        // "1,234,567"

// Padding numbers
String(42).padStart(5, "0")       // "00042"
`${42}`.padStart(5, "0")          // "00042"

// Hex, octal, binary
(255).toString(16)                // "ff"
(255).toString(8)                 // "377"
(255).toString(2)                 // "11111111"
"0x" + (255).toString(16)         // "0xff"
parseInt("ff", 16)                // 255 — back to decimal
```

### Template Literal Patterns

```js
// Multi-line strings
const html = `
    <div class="card">
        <h2>${title}</h2>
        <p>${description}</p>
    </div>
`.trim();

// Tagged templates — custom processing
function highlight(strings, ...values) {
    return strings.reduce((result, str, i) => {
        const value = values[i - 1];
        return result + (value !== undefined ? `<mark>${value}</mark>` : "") + str;
    });
}
const name = "Alice";
highlight`Hello, ${name}! Welcome to ${city}.`
// "Hello, <mark>Alice</mark>! Welcome to <mark>Paris</mark>."

// sql tagged template
function sql(strings, ...values) {
    const query  = strings.join("?");
    return { query, params: values };
}
const { query, params } = sql`SELECT * FROM users WHERE id = ${userId} AND active = ${true}`;
// { query: "SELECT * FROM users WHERE id = ? AND active = ?", params: [42, true] }

// i18n tagged template
function i18n(strings, ...values) {
    const key = strings.join("{x}");
    return translate(key, values);
}
```

### String Interpolation vs Concatenation

```js
const user = { name: "Alice", age: 30, role: "admin" };

// Concatenation (avoid for complex strings)
const msg1 = "User " + user.name + " (age " + user.age + ") is " + user.role;

// Template literal (preferred)
const msg2 = `User ${user.name} (age ${user.age}) is ${user.role}`;

// For very complex strings, use an array and join
const parts = [
    `Name: ${user.name}`,
    `Age: ${user.age}`,
    `Role: ${user.role}`
];
const msg3 = parts.join("\n");

// String.prototype.format (custom helper)
function format(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        data.hasOwnProperty(key) ? data[key] : match
    );
}
format("Hello, {name}! You are {age}.", user)  // "Hello, Alice! You are 30."
```

---

## String Conversion Patterns

```js
// ── To/from base64 ────────────────────────────────────────────────────────
const encoded = btoa("Hello, World!");     // "SGVsbG8sIFdvcmxkIQ==" (browser only)
const decoded = atob("SGVsbG8sIFdvcmxkIQ==");  // "Hello, World!"

// With Unicode (btoa only handles latin1)
function toBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        (_, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
}
function fromBase64(str) {
    return decodeURIComponent(atob(str).split("").map(c =>
        "%" + c.charCodeAt(0).toString(16).padStart(2, "0")
    ).join(""));
}

// Node.js / modern browsers
Buffer.from("Hello").toString("base64")    // Node.js
Buffer.from("SGVsbG8=", "base64").toString("utf8") // Node.js

// ── URL encoding ──────────────────────────────────────────────────────────
encodeURIComponent("hello world")           // "hello%20world"
encodeURIComponent("a=1&b=2")              // "a%3D1%26b%3D2"
decodeURIComponent("hello%20world")         // "hello world"

encodeURI("https://example.com/path?q=hello world")
// "https://example.com/path?q=hello%20world" — keeps URL structure

decodeURI("https://example.com/path?q=hello%20world")
// "https://example.com/path?q=hello world"

// ── HTML escaping ──────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#39;");
}
function unescapeHtml(str) {
    return str
        .replace(/&amp;/g,  "&")
        .replace(/&lt;/g,   "<")
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g,  "'");
}

// ── Common transformations ─────────────────────────────────────────────────
const str = "hello-world_example fooBar";

// camelCase → snake_case
str.replace(/([A-Z])/g, "_$1").toLowerCase()       // "hello-world_example foo_bar"
str.replace(/[-\s](\w)/g, (_, c) => c.toUpperCase()) // camelCase from hyphen/space

// Title case
str.replace(/\b\w/g, c => c.toUpperCase())           // "Hello-World_Example FooBar"

// Slug
str.toLowerCase()
   .replace(/[^\w\s-]/g, "")
   .replace(/[\s_]+/g, "-")
   .replace(/^-+|-+$/g, "")                          // "hello-world-example-foobar"

// Truncate with ellipsis
function truncate(str, maxLength, ellipsis = "...") {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - ellipsis.length).trimEnd() + ellipsis;
}
truncate("Hello, World!", 8)   // "Hello..."

// Count occurrences
function countOccurrences(str, substring) {
    return str.split(substring).length - 1;
}
countOccurrences("banana", "a")    // 3

// Reverse string
function reverseString(str) {
    return [...str].reverse().join("");   // [...str] handles emoji correctly
}
reverseString("hello")     // "olleh"
reverseString("😀🎉")     // "🎉😀"

// Check palindrome
function isPalindrome(str) {
    const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean === [...clean].reverse().join("");
}
isPalindrome("racecar")        // true
isPalindrome("A man, a plan, a canal: Panama")  // true

// Count words
function wordCount(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
}
wordCount("  hello   world  ")   // 2

// Capitalize first letter
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
capitalize("hELLO")   // "Hello"

// Extract numbers from string
"abc123def456".match(/\d+/g)?.map(Number)   // [123, 456]
```

---

## String Performance

```js
// ── String building — use array join for many concatenations ─────────────
// SLOW — creates a new string every iteration
let result = "";
for (let i = 0; i < 10000; i++) result += i + ", ";

// FAST — single join at the end
const parts = [];
for (let i = 0; i < 10000; i++) parts.push(i);
const result = parts.join(", ");

// Template literals in loops are also fine for small cases

// ── String comparison ─────────────────────────────────────────────────────
// Use localeCompare for sorting (handles Unicode, locale rules)
const words = ["Banana", "apple", "cherry", "Äpfel"];
words.sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
// ["apple", "Äpfel", "Banana", "cherry"]

// Simple equality — always use ===
"hello" === "hello"    // true
"hello" === "Hello"    // false — case-sensitive

// Case-insensitive equality
"hello".toLowerCase() === "HELLO".toLowerCase()  // true
"hello".localeCompare("HELLO", undefined, { sensitivity: "accent" }) === 0  // true
```

---

## Unicode and Emoji

```js
// JavaScript strings are UTF-16 sequences
// Characters above U+FFFF (like emoji) are "surrogate pairs" — 2 code units

"😀".length           // 2  — emoji is 2 UTF-16 code units
[..."😀"].length       // 1  — spread handles emoji correctly
"😀".codePointAt(0)   // 128512 — correct code point
"😀".charCodeAt(0)    // 55357  — first surrogate (wrong)

// Iterate characters correctly
function countChars(str) { return [...str].length; }
countChars("hello 😀")   // 7 (not 8)

// Check if char is emoji
function isEmoji(char) {
    return char.codePointAt(0) > 0xFFFF;
}

// Unicode escape
"\u0041"        // "A"   — U+0041
"\u00E9"        // "é"   — U+00E9
"\uD83D\uDE00"  // "😀" — surrogate pair
"\u{1F600}"     // "😀" — ES6 code point escape (preferred)

// Normalize composed vs decomposed
const e1 = "é";          // composed: U+00E9
const e2 = "e\u0301";    // decomposed: e + combining accent
e1 === e2                 // false — different representations!
e1.normalize() === e2.normalize()  // true — both normalized to NFC
e1.length   // 1
e2.length   // 2
```

---

## Summary

- All string methods return NEW strings — strings are immutable.
- `slice(-n)` gets the last n characters; `slice(start, end)` — end is exclusive.
- `indexOf` returns -1 when not found; `includes` returns `true`/`false` — use `includes` for boolean checks.
- `split(regex)` is more powerful than `split(string)` — use `/\s+/` to split on any whitespace.
- `replaceAll` was added in ES2021; before that, use `replace(/pattern/g, replacement)`.
- `String.raw` template tag skips escape processing — use for regex patterns and Windows paths.
- Use `localeCompare` for sort functions — handles Unicode, language rules, and case correctly.
- Use spread `[...str]` to iterate characters — bracket notation and `length` count UTF-16 code units, not Unicode characters (emoji break).
- Use `at(-1)` instead of `[length - 1]` for the last character — cleaner and handles edge cases.
