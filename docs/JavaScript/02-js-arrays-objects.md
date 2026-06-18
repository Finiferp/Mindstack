---
title: "Arrays & Objects"
sidebar_label: "Arrays & Objects"
sidebar_position: 2
---

# Arrays & Objects

Arrays are ordered lists. Objects are key-value maps. Together they're the backbone of every JavaScript program. Knowing all their methods cold is essential.

---

## Arrays

Arrays are zero-indexed, dynamic-size, and can hold any mix of types.

```js
const arr = [1, "hello", true, null, { name: "Alice" }, [1, 2]];

arr[0]               // 1
arr[arr.length - 1]  // [1, 2] — last element
arr.at(-1)           // [1, 2] — last element (ES2022, cleaner)
arr.at(-2)           // { name: "Alice" } — second to last
arr.length           // 6
arr[10]              // undefined — no bounds error in JS

// Sparse arrays — don't create these
const sparse = [1, , 3];  // hole at index 1
sparse[1]               // undefined
sparse.length           // 3
```

### Creating Arrays

```js
// Literal — use this
const arr = [1, 2, 3];

// Constructor — avoid (confusing)
new Array(3)        // [,,] — length 3, all holes (NOT [3])
new Array(1, 2, 3)  // [1, 2, 3]

// Array.from — most useful
Array.from("hello")                      // ["h","e","l","l","o"]
Array.from({ length: 5 }, (_, i) => i)  // [0, 1, 2, 3, 4]
Array.from({ length: 5 }, () => 0)      // [0, 0, 0, 0, 0]
Array.from(new Set([1,1,2,2,3]))         // [1, 2, 3] — dedup
Array.from(map.values())                 // from Map values

// Array.of — unlike new Array(), treats single arg as value
Array.of(3)           // [3]
Array.of(1, 2, 3)     // [1, 2, 3]

// Fill
new Array(5).fill(0)           // [0, 0, 0, 0, 0]
[1,2,3,4,5].fill(0, 2, 4)     // [1, 2, 0, 0, 5] — fill from index 2 to 3
```

### Adding and Removing

```js
const arr = [1, 2, 3];

// End
arr.push(4, 5)       // adds 4 and 5 to end — returns new length (5)
arr.pop()            // removes and returns last — 5

// Start
arr.unshift(0)       // adds 0 to start — returns new length
arr.shift()          // removes and returns first — 0

// Anywhere — splice(start, deleteCount, ...itemsToAdd)
arr.splice(1, 0, 99)      // insert 99 at index 1, delete nothing
arr.splice(1, 1)           // remove 1 element at index 1
arr.splice(1, 2, "a","b") // replace 2 elements with "a","b"
arr.splice(-1, 1)          // remove last element (negative index)
// splice returns the removed elements as an array
const removed = arr.splice(1, 2);

// Non-mutating alternatives (return new arrays)
const withNew = [...arr, 4, 5];        // add to end
const withStart = [0, ...arr];         // add to start
const without = arr.filter((_, i) => i !== 2);  // remove at index 2
arr.toSpliced(1, 1);          // ES2023 — non-mutating splice
arr.with(2, 99);              // ES2023 — replace at index, returns new array
```

### Searching and Testing

```js
const nums = [10, 20, 30, 20, 40];

// Finding values
nums.indexOf(20)              // 1  — first position, -1 if not found
nums.lastIndexOf(20)          // 3  — last position
nums.includes(30)             // true
nums.includes(99)             // false

// Finding with a condition
nums.find(n => n > 15)        // 20  — first matching value
nums.find(n => n > 100)       // undefined
nums.findIndex(n => n > 15)   // 1   — index of first match, -1 if none
nums.findIndex(n => n > 100)  // -1
nums.findLast(n => n < 30)    // 20  — ES2023 — search from end
nums.findLastIndex(n => n < 30) // 3

// Testing conditions
nums.some(n => n > 35)        // true  — at least one matches
nums.every(n => n > 5)        // true  — all match
nums.every(n => n > 15)       // false — 10 fails

// Binary search — only works on sorted arrays
// JavaScript doesn't have built-in binary search; use indexOf or find
```

### Transforming — The Core Methods

These are the most important. They all return a new array and do NOT modify the original.

```js
const users = [
    { id: 1, name: "Alice", age: 30, active: true,  role: "admin" },
    { id: 2, name: "Bob",   age: 17, active: false, role: "user" },
    { id: 3, name: "Carol", age: 25, active: true,  role: "user" },
    { id: 4, name: "Dave",  age: 22, active: true,  role: "user" },
];

// map — transform each element, same length
users.map(u => u.name)                  // ["Alice","Bob","Carol","Dave"]
users.map(u => ({ ...u, age: u.age + 1 }))  // age + 1 for all
[1,2,3].map(n => n ** 2)               // [1, 4, 9]

// filter — keep elements that pass the test
users.filter(u => u.active)             // [Alice, Carol, Dave]
users.filter(u => u.age >= 18)          // [Alice, Carol, Dave]
users.filter(u => u.role === "admin")   // [Alice]

// reduce — accumulate to single value
// reduce(callback, initialValue)
// callback: (accumulator, currentValue, index, array) => newAccumulator
users.reduce((sum, u) => sum + u.age, 0)  // 94 — total age

// Build an object from an array
users.reduce((map, u) => {
    map[u.id] = u;
    return map;
}, {})
// { 1: Alice, 2: Bob, 3: Carol, 4: Dave }

// Count occurrences
["a","b","a","c","b","a"].reduce((counts, letter) => {
    counts[letter] = (counts[letter] || 0) + 1;
    return counts;
}, {})
// { a: 3, b: 2, c: 1 }

// reduceRight — same but right to left
[1,2,3,4].reduceRight((acc, n) => acc - n, 0)  // 0-4-3-2-1 = -10

// flatMap — map then flatten one level
users.flatMap(u => [u.name, u.role])
// ["Alice","admin","Bob","user","Carol","user","Dave","user"]

[[1,2],[3,4]].flatMap(arr => arr)       // [1, 2, 3, 4]

// flat — flatten nested arrays
[1,[2,[3,[4]]]].flat()     // [1, 2, [3, [4]]] — one level
[1,[2,[3,[4]]]].flat(2)    // [1, 2, 3, [4]]   — two levels
[1,[2,[3,[4]]]].flat(Infinity)  // [1, 2, 3, 4] — all levels
```

### Sorting

```js
// Default sort — converts to strings (wrong for numbers!)
[10, 2, 30, 4].sort()     // [10, 2, 30, 4] — "10" < "2" in string order!

// Numeric sort — ALWAYS provide a comparator for numbers
[10, 2, 30, 4].sort((a, b) => a - b)   // [2, 4, 10, 30] — ascending
[10, 2, 30, 4].sort((a, b) => b - a)   // [30, 10, 4, 2]  — descending

// Sort strings
["banana","apple","cherry"].sort()              // ["apple","banana","cherry"] — works
["banana","Apple","cherry"].sort()              // ["Apple","banana","cherry"] — capital first
["banana","Apple","cherry"].sort((a,b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }))
// locale-aware, case-insensitive

// Sort objects by property
const people = [{ name: "Charlie", age: 25 }, { name: "Alice", age: 30 }];
people.sort((a, b) => a.age - b.age);                    // by age ascending
people.sort((a, b) => a.name.localeCompare(b.name));     // by name

// Multi-key sort
people.sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.name.localeCompare(b.name);
});

// sort() is IN-PLACE — it mutates the original array!
const original = [3, 1, 2];
const sorted = [...original].sort((a,b) => a - b);  // safe: copy first
// original is unchanged

// Non-mutating sort (ES2023)
const sorted2 = original.toSorted((a,b) => a - b);
```

### Copying and Combining

```js
const a = [1, 2, 3];
const b = [4, 5, 6];

// Spread — shallow copy
const copy = [...a];
const combined = [...a, ...b];          // [1, 2, 3, 4, 5, 6]
const withExtra = [...a, 10, ...b];     // [1, 2, 3, 10, 4, 5, 6]

// concat
a.concat(b)           // [1, 2, 3, 4, 5, 6] — new array
a.concat([7], [8,9])  // [1, 2, 3, 7, 8, 9]

// slice — copy a portion (non-mutating)
a.slice()             // [1, 2, 3] — full copy
a.slice(1)            // [2, 3]    — from index 1
a.slice(1, 3)         // [2, 3]    — index 1 to 2 (not including 3)
a.slice(-2)           // [2, 3]    — last 2 elements

// join — array to string
a.join("")            // "123"
a.join(", ")          // "1, 2, 3"
a.join(" - ")         // "1 - 2 - 3"
```

### Other Useful Methods

```js
// reverse — mutates!
[1,2,3].reverse()         // [3, 2, 1]
[1,2,3].toReversed()      // ES2023 — non-mutating

// forEach — like map but returns nothing (use for side effects)
arr.forEach((item, index, array) => {
    console.log(index, item);
});

// fill — fill with value (mutates)
[1,2,3,4,5].fill(0, 1, 3)  // [1, 0, 0, 4, 5]

// copyWithin — copy part of array to another position (mutates)
[1,2,3,4,5].copyWithin(0, 3)  // [4, 5, 3, 4, 5] — copy from 3 to position 0

// entries, keys, values — iterators
for (const [i, v] of [10,20,30].entries()) {
    console.log(i, v);  // 0 10, 1 20, 2 30
}

// Array.isArray
Array.isArray([])           // true
Array.isArray({})           // false
Array.isArray("string")     // false
```

### Chaining — Real World Example

```js
const orders = [
    { id: 1, userId: 1, amount: 250, status: "completed", items: ["A", "B"] },
    { id: 2, userId: 2, amount: 50,  status: "pending",   items: ["C"] },
    { id: 3, userId: 1, amount: 300, status: "completed", items: ["D", "E", "F"] },
    { id: 4, userId: 3, amount: 150, status: "cancelled", items: ["G"] },
    { id: 5, userId: 2, amount: 75,  status: "completed", items: ["H"] },
];

// Total revenue from completed orders
const revenue = orders
    .filter(o => o.status === "completed")
    .reduce((sum, o) => sum + o.amount, 0);  // 625

// All items from completed orders, sorted
const items = orders
    .filter(o => o.status === "completed")
    .flatMap(o => o.items)
    .sort();  // ["A","B","D","E","F","H"]

// Summary per user
const byUser = orders
    .filter(o => o.status === "completed")
    .reduce((acc, o) => {
        acc[o.userId] = (acc[o.userId] || 0) + o.amount;
        return acc;
    }, {});  // { 1: 550, 2: 75 }

// Top 3 completed orders by amount
const top3 = orders
    .filter(o => o.status === "completed")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map(o => ({ id: o.id, amount: o.amount }));
```

### Destructuring Arrays

```js
const [a, b, c] = [1, 2, 3];
// a=1, b=2, c=3

// Skip elements
const [first, , third] = [1, 2, 3];
// first=1, third=3

// Rest
const [head, ...tail] = [1, 2, 3, 4];
// head=1, tail=[2,3,4]

// Defaults
const [x = 10, y = 20] = [5];
// x=5, y=20

// Swap variables
let p = 1, q = 2;
[p, q] = [q, p];
// p=2, q=1

// From function return
const [min, max] = getRange(data);

// Nested
const [[a1, a2], [b1, b2]] = [[1,2],[3,4]];
```

---

## Objects

An object is a collection of named properties (key-value pairs). Keys are strings or Symbols.

```js
const user = {
    id: 1,
    name: "Alice",
    age: 30,
    "first name": "Alice",   // keys with spaces need quotes
    123: "numeric key",       // numeric keys are coerced to string "123"
    [Symbol("id")]: 9999,    // symbol key
    address: {                // nested object
        city: "Paris",
        country: "France"
    },
    greet() {                 // method shorthand
        return `Hi, I'm ${this.name}`;
    }
};

// Access
user.name               // "Alice" — dot notation
user["name"]            // "Alice" — bracket notation
user["first name"]      // "Alice" — required for keys with spaces
user[123]               // "numeric key"
const key = "name";
user[key]               // "Alice" — dynamic key access

// Nested
user.address.city       // "Paris"
user?.address?.city     // "Paris" — safe access

// Modify
user.email = "alice@example.com";  // add
user.age = 31;                      // update
delete user.age;                    // delete (avoid — use undefined instead)
user.age = undefined;               // preferred over delete

// Check existence
"name" in user                      // true — checks prototype chain too
Object.hasOwn(user, "name")        // true — only own properties (ES2022)
user.hasOwnProperty("name")        // true — older way
user.name !== undefined             // true — but fragile if value IS undefined
```

### Shorthand Properties

```js
const name = "Alice";
const age = 30;
const role = "admin";

// Old way
const user = { name: name, age: age, role: role };

// Shorthand — when variable name matches key
const user = { name, age, role };

// Mixed
const user = { name, age, role, active: true };
```

### Computed Property Names

```js
const field = "name";
const obj = {
    [field]: "Alice",              // { name: "Alice" }
    [`get${field}`]: () => "Alice" // { getName: [Function] }
};

// Dynamic keys from array
const keys = ["a", "b", "c"];
const obj = keys.reduce((acc, k, i) => ({ ...acc, [k]: i }), {});
// { a: 0, b: 1, c: 2 }
```

### Object Methods

```js
const obj = { a: 1, b: 2, c: 3 };

// Get keys, values, entries
Object.keys(obj)     // ["a", "b", "c"]
Object.values(obj)   // [1, 2, 3]
Object.entries(obj)  // [["a",1],["b",2],["c",3]]

// Iterate
Object.entries(obj).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
});

// Transform — entries → map → back to object
const doubled = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v * 2])
);
// { a: 2, b: 4, c: 6 }

// Build from entries
Object.fromEntries([["x", 1], ["y", 2]])  // { x: 1, y: 2 }
Object.fromEntries(new Map([["a", 1]]))   // { a: 1 }

// Copy and merge
Object.assign({}, obj)                  // shallow copy
Object.assign({}, obj, { d: 4 })        // copy + add
Object.assign(target, source1, source2) // merge into target — mutates!

// Spread (cleaner, non-mutating)
const copy = { ...obj };
const merged = { ...obj1, ...obj2 };    // obj2 wins on duplicates
const updated = { ...user, age: 31 };  // override specific property

// Freeze — no changes allowed (shallow)
const config = Object.freeze({ host: "localhost", port: 3000 });
config.port = 8080;  // silently ignored (or throws in strict mode)
config.host;         // "localhost" — unchanged

// Seal — no add/delete, but values can change
const sealed = Object.seal({ a: 1 });
sealed.a = 2;      // fine
sealed.b = 3;      // silently ignored
delete sealed.a;   // silently ignored

// Create with specific prototype
const base = { greet() { return "Hello!"; } };
const derived = Object.create(base);
derived.name = "Alice";
derived.greet();   // "Hello!" — inherited

// Get prototype
Object.getPrototypeOf(derived) === base   // true

// Property descriptors
Object.getOwnPropertyDescriptor(obj, "a")
// { value: 1, writable: true, enumerable: true, configurable: true }

Object.defineProperty(obj, "id", {
    value: 42,
    writable: false,    // can't change
    enumerable: false,  // won't show in for...in or Object.keys
    configurable: false // can't delete or redefine
});
```

### Destructuring Objects

```js
const user = { id: 1, name: "Alice", age: 30, role: "admin", city: "Paris" };

// Basic
const { name, age } = user;

// Rename
const { name: fullName, age: years } = user;

// Default values
const { name, country = "Unknown" } = user;
// country = "Unknown" because user.country is undefined

// Rename + default
const { name: displayName = "Anonymous" } = user;

// Rest — collect remaining properties
const { id, name, ...rest } = user;
// id=1, name="Alice", rest={ age:30, role:"admin", city:"Paris" }

// Nested
const { address: { city, country: countryCode } } = {
    address: { city: "Paris", country: "FR" }
};

// In function parameters — very common pattern
function createUser({ name, age = 18, role = "user", active = true } = {}) {
    return { name, age, role, active };
}
createUser({ name: "Alice" });
// The = {} at the end means the whole argument is optional

// Dynamic key destructuring
const key = "name";
const { [key]: value } = user;  // value = "Alice"
```

### Spread vs Object.assign

```js
// Both create shallow copies
const a = { x: 1, nested: { y: 2 } };

const b = { ...a };
const c = Object.assign({}, a);

// Shallow — nested objects are STILL shared
b.x = 99;             // doesn't affect a
b.nested.y = 99;      // DOES affect a — same reference!
a.nested.y;           // 99 — modified!

// Deep clone options:
structuredClone(a)    // ES2022 — best for most cases, handles nested
JSON.parse(JSON.stringify(a))  // Works but: loses functions, undefined, Date → string
```

---

## Maps and Sets

### Map — Object with Any Key Type

```js
const map = new Map();

// Set values
map.set("name", "Alice");
map.set(1, "one");
map.set({ key: true }, "object key");
map.set(null, "null key");

// Get values
map.get("name")    // "Alice"
map.get(1)         // "one"

// Check
map.has("name")    // true
map.has("age")     // false

// Delete
map.delete("name");
map.clear();       // remove all

// Size
map.size           // number of entries (NOT .length!)

// Iterate
for (const [key, value] of map) { }
map.forEach((value, key) => { });
[...map.keys()]
[...map.values()]
[...map.entries()]

// Build from object
const obj = { a: 1, b: 2 };
const map = new Map(Object.entries(obj));

// Convert back
Object.fromEntries(map);
```

### Set — Unique Values

```js
const set = new Set([1, 2, 3, 2, 1]);  // {1, 2, 3} — duplicates removed

set.add(4);
set.add(1);        // already there — ignored
set.has(3);        // true
set.delete(2);
set.size;          // 3

for (const value of set) { }

// Deduplication
const unique = [...new Set(array)];
const uniqueNames = [...new Set(users.map(u => u.name))];

// Set operations
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

// Union
const union = new Set([...a, ...b]);                // {1,2,3,4,5,6}

// Intersection
const intersection = new Set([...a].filter(x => b.has(x)));  // {3,4}

// Difference (a - b)
const difference = new Set([...a].filter(x => !b.has(x)));   // {1,2}
```

---

## JSON

```js
// Serialize — JavaScript value to JSON string
JSON.stringify({ name: "Alice", age: 30 })
// '{"name":"Alice","age":30}'

// Pretty print
JSON.stringify(obj, null, 2)

// Replacer — filter or transform
JSON.stringify(user, ["name", "email"])           // only include these keys
JSON.stringify(user, (key, value) => {
    if (key === "password") return undefined;    // exclude password
    return value;
})

// Parse — JSON string to JavaScript value
JSON.parse('{"name":"Alice","age":30}')
// { name: "Alice", age: 30 }

// Reviver — transform during parse
JSON.parse(jsonString, (key, value) => {
    if (key === "createdAt") return new Date(value);
    return value;
})

// toJSON — customize how an object serializes
class User {
    toJSON() {
        const { password, ...safe } = this;  // exclude password
        return safe;
    }
}

// What JSON can't handle
JSON.stringify(undefined)         // undefined — not included
JSON.stringify({ fn: () => {} }) // {} — functions excluded
JSON.stringify({ d: new Date() }) // date becomes string
JSON.stringify({ s: Symbol() })   // {} — symbols excluded
JSON.stringify(NaN)               // "null"
JSON.stringify(Infinity)          // "null"
```

---

## Summary

- Array methods that return new arrays: `map`, `filter`, `reduce`, `slice`, `concat`, `flat`, `flatMap`.
- Array methods that mutate: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`.
- ES2023 non-mutating alternatives: `toSorted`, `toReversed`, `toSpliced`, `with`.
- `find` returns the value; `findIndex` returns the index; `includes` returns boolean.
- Spread `{...obj}` creates a shallow copy — nested objects are still shared references.
- Use `Map` when keys aren't strings or when you need insertion-order iteration.
- Use `Set` for unique collections and fast membership testing.
- `structuredClone(obj)` is the modern way to deep-clone objects.
