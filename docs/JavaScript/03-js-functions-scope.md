---
title: "Functions, Scope & Closures"
sidebar_label: "Functions & Scope"
sidebar_position: 3
---

# Functions, Scope & Closures

Functions are first-class values in JavaScript — they can be stored, passed, and returned like any other value. Scope determines what variables a function can see. Closures are what give JavaScript its expressive power.

---

## Function Types

### Function Declaration

Hoisted — can be called before the line where it's written.

```js
greet("Alice");  // works even before the definition

function greet(name) {
    return `Hello, ${name}!`;
}
```

### Function Expression

Not hoisted — must be defined before use.

```js
// Anonymous
const greet = function(name) {
    return `Hello, ${name}!`;
};

// Named — name is only accessible INSIDE the function
const factorial = function fact(n) {
    return n <= 1 ? 1 : n * fact(n - 1);  // can call itself
};
factorial(5);  // 120
// fact(5);    // ReferenceError — name not in outer scope
```

### Arrow Functions

Shorter syntax. No own `this`, `arguments`, or `super`. Can't be used as constructors.

```js
// Full arrow
const add = (a, b) => {
    return a + b;
};

// Concise body — single expression, implicit return
const add = (a, b) => a + b;

// Single parameter — parens optional
const double = n => n * 2;

// No parameters — parens required
const greet = () => "Hello!";

// Returning an object — must wrap in parens
const makeUser = name => ({ name, active: true });
// Without parens: name => { name } — JS reads {} as function body

// Arrow functions in practice
const numbers = [1, 2, 3, 4, 5];
numbers.map(n => n * 2)            // [2, 4, 6, 8, 10]
numbers.filter(n => n % 2 === 0)   // [2, 4]
numbers.reduce((sum, n) => sum + n, 0)  // 15
```

### Generator Functions

Functions that can pause execution and yield multiple values.

```js
function* range(start, end, step = 1) {
    for (let i = start; i <= end; i += step) {
        yield i;       // pause and produce a value
    }
}

const gen = range(1, 5);
gen.next()  // { value: 1, done: false }
gen.next()  // { value: 2, done: false }
gen.next()  // { value: 3, done: false }
// ...
gen.next()  // { value: 5, done: false }
gen.next()  // { value: undefined, done: true }

// Generators are iterable
for (const n of range(1, 5)) console.log(n);
[...range(0, 10, 2)]  // [0, 2, 4, 6, 8, 10]

// Infinite generator
function* infiniteId() {
    let id = 1;
    while (true) {
        yield id++;
    }
}
const getId = infiniteId();
getId.next().value  // 1
getId.next().value  // 2
// never exhausts

// Generator as lazy data processor
function* mapGenerator(iterable, fn) {
    for (const item of iterable) {
        yield fn(item);
    }
}
```

---

## Parameters In Depth

### Default Parameters

```js
// Defaults are evaluated each time the function is called
function createUser(name, role = "user", createdAt = new Date()) {
    return { name, role, createdAt };
}
// If you call this 2 seconds apart, createdAt will differ — not a single Date

// Defaults can reference earlier parameters
function repeat(str, times = str.length) {
    return str.repeat(times);
}
repeat("abc")    // "abcabcabc" — times defaults to 3
repeat("abc", 2) // "abcabc"

// Defaults can call functions
function log(message, timestamp = Date.now()) { }

// Passing undefined triggers the default; null does NOT
function test(x = "default") { return x; }
test(undefined)  // "default"
test(null)       // null — null doesn't trigger default
test("")         // "" — empty string doesn't trigger default
```

### Destructuring Parameters

```js
// Object destructuring with defaults
function createPost({
    title,
    content = "",
    tags = [],
    published = false,
    author: { name, email } = {}
} = {}) {
    return { title, content, tags, published, author: { name, email } };
}

createPost({ title: "Hello" });
createPost({ title: "Hello", author: { name: "Alice", email: "a@b.com" } });
createPost();  // uses all defaults because of = {} at the end

// Array destructuring in parameters
function sum([a, b, c = 0]) {
    return a + b + c;
}
sum([1, 2, 3])   // 6
sum([1, 2])      // 3
```

### Rest Parameters

```js
// Collects all remaining arguments into a real array
function log(level, timestamp, ...messages) {
    console.log(`[${level}] ${timestamp}:`, ...messages);
}
log("INFO", "12:00", "Server", "started", "successfully");

// Rest must be last
// function bad(...a, b) {}  // SyntaxError

// Rest vs arguments object
function oldStyle() {
    // arguments is array-like but NOT a real array
    console.log(arguments[0]);
    // arguments.map(...)  // TypeError — no map method!
    Array.from(arguments).map(...)  // have to convert first
}

function newStyle(...args) {
    args.map(...)  // works — args is a real array
}

// Arrow functions don't have arguments
const fn = () => {
    console.log(arguments);  // ReferenceError (or outer scope's arguments)
};
```

---

## Scope

### Global Scope

```js
// Browser: properties of window
var globalVar = "I'm on window";
window.globalVar;  // "I'm on window"

let blockLet = "I'm NOT on window";
window.blockLet;   // undefined

// Node.js: properties of global (or globalThis)
globalThis.setTimeout === setTimeout  // true — works in browser AND node
```

### Function Scope

```js
function outer() {
    const x = 1;

    function inner() {
        const y = 2;
        console.log(x);  // 1 — inner can see outer's variables
        console.log(y);  // 2
    }

    inner();
    // console.log(y);  // ReferenceError — outer can't see inner's variables
}

// Function scope with var
function example() {
    if (true) {
        var insideIf = "I escape the block";  // hoisted to function scope
        let blockScoped = "I don't";
    }
    console.log(insideIf);    // "I escape the block"
    // console.log(blockScoped); // ReferenceError
}
```

### Block Scope

`let` and `const` are block-scoped — `{ }` creates a new scope.

```js
{
    let a = 1;
    const b = 2;
    var c = 3;  // leaks out
}
// a and b are not accessible here
// c is accessible here

// Each iteration of a for loop with let is a separate scope
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// 0, 1, 2 — each closure captures its own i

// Try/catch blocks
try {
    let result = riskyOperation();
} catch (err) {
    // result is not accessible here — different block
}
```

### Lexical Scope

Functions are scoped where they are DEFINED, not where they are called.

```js
const x = "global";

function outer() {
    const x = "outer";

    function inner() {
        // x resolves to "outer" — where inner was defined
        console.log(x);
    }

    return inner;
}

const fn = outer();
fn();  // "outer" — not "global"

// Even when called in a completely different context
const obj = { x: "obj" };
obj.method = fn;
obj.method();  // "outer" — still resolves from where inner was defined
```

---

## Hoisting

JavaScript moves declarations to the top of their scope before running.

```js
// var declarations are hoisted (but not their values)
console.log(x);  // undefined — not ReferenceError
var x = 5;
console.log(x);  // 5

// Equivalent to:
var x;
console.log(x);  // undefined
x = 5;
console.log(x);  // 5

// let and const are hoisted but NOT initialized (Temporal Dead Zone)
console.log(y);  // ReferenceError: Cannot access 'y' before initialization
let y = 5;

// Function declarations are fully hoisted
sayHi();  // "Hi!" — works
function sayHi() { console.log("Hi!"); }

// Function expressions are NOT hoisted
greet();  // TypeError: greet is not a function
var greet = function() { console.log("Hello!"); };
// The var is hoisted (undefined), but calling undefined as function throws

// Class declarations: hoisted but not initialized (like let)
new MyClass();  // ReferenceError
class MyClass {}
```

---

## Closures

A closure is the combination of a function and the scope (environment) where it was defined. The function "closes over" variables from its outer scope and keeps them alive.

```js
function makeCounter(initial = 0) {
    let count = initial;  // this variable is "closed over"

    return {
        increment() { return ++count; },
        decrement() { return --count; },
        reset()     { count = initial; return count; },
        value()     { return count; }
    };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.decrement(); // 11
counter.value();     // 11

// Each call to makeCounter creates a new independent closure
const c1 = makeCounter(0);
const c2 = makeCounter(100);
c1.increment(); // 1
c2.increment(); // 101
// They don't interfere
```

### Practical Closures

```js
// 1. Function factories
function multiplier(factor) {
    return n => n * factor;
}
const double = multiplier(2);
const triple = multiplier(3);
double(5)  // 10
triple(5)  // 15

// 2. Memoization — cache results
function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

const expensiveCalc = memoize((n) => {
    console.log("Computing...");
    return n * n;
});
expensiveCalc(5);  // "Computing..." → 25
expensiveCalc(5);  // 25 — from cache, no log

// 3. Partial application
function partial(fn, ...presetArgs) {
    return (...laterArgs) => fn(...presetArgs, ...laterArgs);
}
const add = (a, b, c) => a + b + c;
const add5 = partial(add, 5);     // preset a=5
const add5and10 = partial(add, 5, 10);  // preset a=5, b=10

add5(3, 2)    // 10
add5and10(7)  // 22

// 4. Once — execute only once
function once(fn) {
    let called = false;
    let result;
    return function(...args) {
        if (!called) {
            called = true;
            result = fn.apply(this, args);
        }
        return result;
    };
}

const initDB = once(connectToDatabase);
initDB();  // connects
initDB();  // returns same result, no reconnect

// 5. Debounce — delay execution, reset on new calls
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const handleSearch = debounce((term) => {
    fetchResults(term);
}, 300);

// 6. Throttle — limit how often a function can run
function throttle(fn, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return fn.apply(this, args);
        }
    };
}

const handleScroll = throttle(updateUI, 100); // max once per 100ms
```

---

## `this` in Depth

`this` refers to the execution context — the object that "owns" the current function call.

```js
// Rule 1: Method call — this = the object before the dot
const obj = {
    name: "Alice",
    greet() {
        return `Hello, I'm ${this.name}`;
    }
};
obj.greet();  // "Hello, I'm Alice"

// Rule 2: Plain function call — this = undefined (strict mode) or global
function greet() {
    return this;   // undefined in strict mode, window in browsers
}
greet();

// Rule 3: Arrow function — no own this, inherits from enclosing scope
const obj = {
    name: "Alice",
    greet() {
        const inner = () => `Hello, ${this.name}`;  // this is obj
        return inner();
    }
};
obj.greet();  // "Hello, Alice"

// Rule 4: Constructor — this = new object being created
function User(name) {
    this.name = name;
    this.greet = function() { return `Hi, ${this.name}`; };
}
const u = new User("Alice");
u.greet();  // "Hi, Alice"

// Rule 5: Explicit binding
function greet() { return `Hello, ${this.name}`; }
greet.call({ name: "Alice" });   // "Hello, Alice" — args: fn.call(this, a, b)
greet.apply({ name: "Bob" });    // "Hello, Bob"   — args: fn.apply(this, [a,b])
const greetAlice = greet.bind({ name: "Charlie" });
greetAlice();                    // "Hello, Charlie"

// Common this bug — losing context
const obj = {
    name: "Alice",
    greet() { console.log(this.name); }
};
const fn = obj.greet;
fn();         // undefined — this is no longer obj

// Fix 1: bind
const fn = obj.greet.bind(obj);
fn();         // "Alice"

// Fix 2: arrow in class/object (if appropriate)
class Timer {
    constructor() {
        this.seconds = 0;
    }
    start() {
        // Arrow: this is the Timer instance
        setInterval(() => this.seconds++, 1000);
        // Regular function would lose this context
    }
}
```

---

## Higher-Order Functions

A function that takes a function as argument or returns a function.

```js
// Takes a function — you do this every time you use map/filter/forEach
function applyToAll(arr, fn) {
    return arr.map(fn);
}
applyToAll([1,2,3], n => n * 2);  // [2,4,6]

// Returns a function
function withErrorHandling(fn) {
    return async function(...args) {
        try {
            return await fn(...args);
        } catch (err) {
            console.error(`Error in ${fn.name}:`, err.message);
            return null;
        }
    };
}

const safeGetUser = withErrorHandling(getUserFromDB);
const user = await safeGetUser(1);  // null if error, no uncaught rejection

// Composing functions — run one after another
const compose = (...fns) => (value) =>
    fns.reduceRight((acc, fn) => fn(acc), value);

const pipe = (...fns) => (value) =>
    fns.reduce((acc, fn) => fn(acc), value);

const process = pipe(
    str => str.trim(),
    str => str.toLowerCase(),
    str => str.replace(/\s+/g, "-"),
    str => `slug:${str}`
);
process("  Hello World  ");  // "slug:hello-world"
```

---

## The `arguments` Object

Available in regular functions (not arrows). Array-like but not an array.

```js
function example() {
    console.log(arguments);        // Arguments [1, 2, 3]
    console.log(arguments[0]);     // 1
    console.log(arguments.length); // 3
    // arguments.map(...)          // TypeError — no array methods

    // Convert to real array
    const arr = Array.from(arguments);
    const arr2 = [...arguments];
}
example(1, 2, 3);

// Arrow functions inherit arguments from their enclosing regular function
function outer() {
    const inner = () => {
        console.log(arguments);  // outer's arguments
    };
    inner();
}
```

---

## Summary

- Function declarations are hoisted; expressions and arrows are not.
- Arrow functions have no `this`, `arguments`, or `prototype` — use them for callbacks.
- Use regular functions (or class methods) when you need `this` to be dynamic.
- Closures keep variables alive and private — the foundation of factories, memoization, debounce, and module patterns.
- `call(thisArg, ...args)`, `apply(thisArg, argsArray)`, `bind(thisArg)` — explicitly set `this`.
- Generators (`function*` + `yield`) produce sequences lazily — good for infinite or large data.
- `this` in a method call is the object before the dot. In an arrow function, it's the enclosing scope's `this`.
