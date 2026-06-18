---
title: "Advanced JavaScript Patterns"
sidebar_label: "Advanced Patterns"
sidebar_position: 21
---

# Advanced JavaScript Patterns

These patterns appear throughout real-world JavaScript codebases. Understanding them makes you able to read and write idiomatic, professional JavaScript.

---

## Iterators and Iterables

An **iterable** is any object with a `[Symbol.iterator]()` method that returns an **iterator**. An iterator has a `next()` method that returns `{ value, done }`.

```js
// Built-in iterables: Arrays, Strings, Maps, Sets, NodeLists, arguments
const arr = [1, 2, 3];
const iter = arr[Symbol.iterator]();
iter.next()  // { value: 1, done: false }
iter.next()  // { value: 2, done: false }
iter.next()  // { value: 3, done: false }
iter.next()  // { value: undefined, done: true }

// Anything iterable works with:
for (const item of iterable) { }
const arr   = [...iterable];
const [a,b] = iterable;        // destructuring
Array.from(iterable);
new Set(iterable);
new Map(iterable);
Promise.all(iterable);

// Custom iterable object
const range = {
    from: 1,
    to:   5,
    [Symbol.iterator]() {
        let current = this.from;
        const last  = this.to;
        return {
            next() {
                return current <= last
                    ? { value: current++, done: false }
                    : { value: undefined, done: true };
            }
        };
    }
};
for (const n of range) console.log(n);   // 1 2 3 4 5
[...range]                                // [1, 2, 3, 4, 5]
const [first, second] = range;           // 1, 2

// Custom iterator class — cleaner
class Range {
    constructor(start, end, step = 1) {
        this.start = start;
        this.end   = end;
        this.step  = step;
    }

    [Symbol.iterator]() {
        let current = this.start;
        return {
            next: () => {
                if (current <= this.end) {
                    const value = current;
                    current += this.step;
                    return { value, done: false };
                }
                return { value: undefined, done: true };
            },
            [Symbol.iterator]() { return this; }  // iterator is also iterable
        };
    }
}

[...new Range(0, 10, 2)]   // [0, 2, 4, 6, 8, 10]
```

### Generator Functions as Iterators

```js
// Generator functions are the easiest way to create iterators
function* range(start, end, step = 1) {
    for (let i = start; i <= end; i += step) {
        yield i;
    }
}
[...range(1, 5)]              // [1, 2, 3, 4, 5]
[...range(0, 10, 2)]          // [0, 2, 4, 6, 8, 10]

// Infinite generator
function* naturals() {
    let n = 1;
    while (true) yield n++;
}

function* take(n, iterable) {
    let count = 0;
    for (const item of iterable) {
        if (count++ >= n) return;
        yield item;
    }
}

[...take(5, naturals())]     // [1, 2, 3, 4, 5]

// Generator as async iterator
async function* streamLines(url) {
    const response = await fetch(url);
    const reader   = response.body.getReader();
    const decoder  = new TextDecoder();
    let buffer     = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();         // incomplete last line back to buffer
        for (const line of lines) yield line;
    }
    if (buffer) yield buffer;
}

// Consume with for await...of
for await (const line of streamLines("/large-file.txt")) {
    console.log(line);
}

// yield* — delegate to another iterable/generator
function* concat(...iterables) {
    for (const iter of iterables) {
        yield* iter;
    }
}
[...concat([1,2], [3,4], [5,6])]  // [1, 2, 3, 4, 5, 6]

// Two-way communication with generators (send values in)
function* adder() {
    let total = 0;
    while (true) {
        const value = yield total;   // yield sends total out, receives value in
        total += value;
    }
}
const gen = adder();
gen.next();       // { value: 0, done: false } — start the generator
gen.next(10);     // { value: 10, done: false } — send 10 in
gen.next(5);      // { value: 15, done: false }
gen.next(3);      // { value: 18, done: false }

// Generator return and throw
gen.return("done");   // { value: "done", done: true } — terminate
gen.throw(new Error("oops")); // throws inside generator at the yield point
```

---

## Proxy and Reflect

`Proxy` wraps an object and intercepts operations on it.

```js
// Proxy(target, handler)
const handler = {
    get(target, prop, receiver) {
        // Called when you READ a property
        if (prop in target) return Reflect.get(target, prop, receiver);
        return `Property '${prop}' not found`;
    },

    set(target, prop, value, receiver) {
        // Called when you SET a property
        if (prop === "age" && typeof value !== "number") {
            throw new TypeError("Age must be a number");
        }
        return Reflect.set(target, prop, value, receiver);
    },

    has(target, prop) {
        // Called by the 'in' operator
        return prop in target;
    },

    deleteProperty(target, prop) {
        // Called by delete operator
        if (prop === "id") throw new Error("Cannot delete id");
        return Reflect.deleteProperty(target, prop);
    },

    apply(target, thisArg, args) {
        // Called when proxy is invoked as a function
        console.log("Function called with:", args);
        return Reflect.apply(target, thisArg, args);
    },

    construct(target, args) {
        // Called when proxy is used with new
        console.log("Constructed with:", args);
        return Reflect.construct(target, args);
    },

    ownKeys(target) {
        // Called by Object.keys(), for...in, etc.
        return Reflect.ownKeys(target).filter(k => !k.startsWith("_"));
    },

    getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    defineProperty(target, prop, descriptor) {
        return Reflect.defineProperty(target, prop, descriptor);
    },

    getPrototypeOf(target) {
        return Reflect.getPrototypeOf(target);
    }
};

const user = new Proxy({ id: 1, name: "Alice", age: 30 }, handler);
user.name             // "Alice"
user.email            // "Property 'email' not found"
user.age = "thirty"   // TypeError: Age must be a number
user.age = 31         // ok

// ── Practical Proxy Patterns ───────────────────────────────────────────────

// 1. Validation proxy
function createValidated(target, validators) {
    return new Proxy(target, {
        set(obj, prop, value) {
            if (validators[prop]) {
                const error = validators[prop](value);
                if (error) throw new TypeError(`${prop}: ${error}`);
            }
            return Reflect.set(obj, prop, value);
        }
    });
}

const user2 = createValidated({}, {
    age:   (v) => typeof v !== "number" ? "Must be number" : v < 0 ? "Must be positive" : null,
    email: (v) => !/\S+@\S+\.\S+/.test(v) ? "Must be valid email" : null
});

// 2. Observable (track changes)
function observable(target, onChange) {
    return new Proxy(target, {
        set(obj, prop, value) {
            const old = obj[prop];
            const result = Reflect.set(obj, prop, value);
            if (old !== value) onChange(prop, value, old);
            return result;
        }
    });
}
const state = observable({ count: 0 }, (prop, newVal, oldVal) => {
    console.log(`${prop}: ${oldVal} → ${newVal}`);
});
state.count = 1;  // "count: 0 → 1"

// 3. Default values proxy
function withDefaults(target, defaults) {
    return new Proxy(target, {
        get(obj, prop) {
            return prop in obj ? obj[prop] : defaults[prop];
        }
    });
}
const config = withDefaults({ port: 8080 }, { host: "localhost", port: 3000, debug: false });
config.host   // "localhost" (from defaults)
config.port   // 8080 (from target)

// 4. Readonly proxy
function readonly(target) {
    return new Proxy(target, {
        set() { throw new Error("Object is readonly"); },
        deleteProperty() { throw new Error("Object is readonly"); }
    });
}
```

### Reflect API

```js
// Reflect provides the default behaviors for every Proxy trap
// Always use Reflect inside Proxy handlers to forward operations correctly

Reflect.get(target, prop, receiver)        // get property
Reflect.set(target, prop, value, receiver) // set property — returns boolean
Reflect.has(target, prop)                  // 'in' operator
Reflect.deleteProperty(target, prop)       // delete — returns boolean
Reflect.ownKeys(target)                    // all own keys (string + symbol)
Reflect.apply(fn, thisArg, args)           // fn.apply(thisArg, args)
Reflect.construct(Class, args)             // new Class(...args)
Reflect.defineProperty(target, prop, desc) // Object.defineProperty
Reflect.getOwnPropertyDescriptor(target, prop)
Reflect.getPrototypeOf(target)
Reflect.setPrototypeOf(target, proto)
Reflect.isExtensible(target)
Reflect.preventExtensions(target)
```

---

## WeakMap and WeakSet

`WeakMap` and `WeakSet` hold **weak references** — the garbage collector can reclaim the key objects even if they're in a WeakMap/WeakSet. Good for metadata attached to objects.

```js
// WeakMap — keys must be objects (not primitives)
const metadata = new WeakMap();

class Widget {
    constructor(element) {
        // Store private data associated with the object
        metadata.set(this, {
            element,
            listeners: [],
            initialized: false
        });
    }

    init() {
        const meta = metadata.get(this);
        meta.initialized = true;
    }
}

// When widget is garbage collected, metadata entry is automatically removed
// (no memory leak)

// WeakSet — store objects, check membership
const seen = new WeakSet();

function processOnce(obj) {
    if (seen.has(obj)) return "Already processed";
    seen.add(obj);
    return doProcess(obj);
}

// WeakRef — hold a weak reference to an object
const ref = new WeakRef(heavyObject);
const obj = ref.deref();   // undefined if garbage collected, otherwise the object
if (obj) {
    obj.doSomething();
}

// FinalizationRegistry — called when object is garbage collected
const registry = new FinalizationRegistry((name) => {
    console.log(`${name} was garbage collected`);
});
registry.register(someObject, "myObject");
```

---

## Property Descriptors

Every object property has a descriptor that controls its behavior.

```js
// Property descriptor attributes:
// value       — the value
// writable    — can the value be changed?
// enumerable  — does it show in for...in / Object.keys?
// configurable— can the descriptor be changed / property deleted?
// get / set   — accessor property (mutually exclusive with value/writable)

// Define a property with full control
Object.defineProperty(obj, "id", {
    value:        42,
    writable:     false,    // can't reassign
    enumerable:   true,     // shows in for...in
    configurable: false     // can't delete or redefine
});

// Define multiple properties at once
Object.defineProperties(obj, {
    firstName: { value: "Alice", writable: true, enumerable: true, configurable: true },
    lastName:  { value: "Smith", writable: true, enumerable: true, configurable: true },
    fullName:  {
        get() { return `${this.firstName} ${this.lastName}`; },
        enumerable: true,
        configurable: true
    }
});

// Read descriptors
Object.getOwnPropertyDescriptor(obj, "id")
// { value: 42, writable: false, enumerable: true, configurable: false }

Object.getOwnPropertyDescriptors(obj)  // all properties' descriptors

// Control extensibility
Object.preventExtensions(obj)   // no new properties can be added
Object.seal(obj)                // no add/delete + configurable=false on all
Object.freeze(obj)              // no add/delete/modify + writable=false on all
Object.isExtensible(obj)
Object.isSealed(obj)
Object.isFrozen(obj)

// Deep freeze
function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(name => {
        const value = obj[name];
        if (value && typeof value === "object") deepFreeze(value);
    });
    return Object.freeze(obj);
}
```

---

## Symbols — Advanced

```js
// Well-known symbols — customize built-in behaviors
const obj = {
    // Customize string conversion
    [Symbol.toPrimitive](hint) {
        if (hint === "number") return 42;
        if (hint === "string") return "forty-two";
        return true;
    },

    // Customize Object.prototype.toString.call()
    get [Symbol.toStringTag]() { return "MyObject"; },

    // Customize instanceof behavior (static)
    static [Symbol.hasInstance](instance) {
        return instance.isSpecial === true;
    },

    // Customize iteration
    [Symbol.iterator]() {
        // ...
    },

    // Customize async iteration
    async [Symbol.asyncIterator]() {
        // ...
    },

    // Customize spread / destructuring
    [Symbol.isConcatSpreadable]: true,

    // Customize regex behavior
    [Symbol.match](string) { /* ... */ },
    [Symbol.replace](string, replacement) { /* ... */ },
    [Symbol.search](string) { /* ... */ },
    [Symbol.split](string) { /* ... */ }
};

// Symbol.for — global registry (shared across realms)
const s1 = Symbol.for("shared");
const s2 = Symbol.for("shared");
s1 === s2  // true — same symbol from registry

Symbol.keyFor(s1)  // "shared" — reverse lookup
```

---

## Object.create and Prototype Patterns

```js
// Object.create(proto, propertiesObject)
const animal = {
    breathe() { return `${this.name} breathes`; },
    eat()     { return `${this.name} eats`; }
};

const dog = Object.create(animal);
dog.name  = "Rex";
dog.bark  = function() { return `${this.name} barks`; };
dog.breathe()   // "Rex breathes" — inherited
dog.bark()      // "Rex barks" — own

// Object.create(null) — object with NO prototype
const pureMap = Object.create(null);
// No toString, hasOwnProperty, etc.
// Useful for pure dictionary/lookup tables

// Prototype chain inspection
Object.getPrototypeOf(dog) === animal  // true
animal.isPrototypeOf(dog)              // true
dog.hasOwnProperty("name")            // true
dog.hasOwnProperty("breathe")         // false — on prototype
Object.hasOwn(dog, "name")            // true (ES2022 — preferred)

// Setting prototype
Object.setPrototypeOf(dog, newProto)   // expensive — avoid in hot paths

// Prototype chain
const grandchild = Object.create(dog);
Object.getPrototypeOf(grandchild) === dog    // true
animal.isPrototypeOf(grandchild)             // true (ancestor check)
```

---

## Mixin Pattern

```js
// Functional mixins — add capabilities to any class
const Serializable = (Base) => class extends Base {
    toJSON()           { return JSON.stringify(Object.assign({}, this)); }
    toQueryString()    { return new URLSearchParams(Object.assign({}, this)).toString(); }
    clone()            { return Object.assign(Object.create(Object.getPrototypeOf(this)), this); }

    static fromJSON(json) {
        return Object.assign(new this(), JSON.parse(json));
    }
};

const Eventable = (Base) => class extends Base {
    #handlers = new Map();

    on(event, handler) {
        if (!this.#handlers.has(event)) this.#handlers.set(event, []);
        this.#handlers.get(event).push(handler);
        return this;
    }
    off(event, handler) {
        const handlers = this.#handlers.get(event);
        if (handlers) this.#handlers.set(event, handlers.filter(h => h !== handler));
        return this;
    }
    emit(event, ...args) {
        this.#handlers.get(event)?.forEach(h => h(...args));
        return this;
    }
};

const Validatable = (Base) => class extends Base {
    validate() {
        const errors = [];
        for (const [field, rules] of Object.entries(this.constructor.validations ?? {})) {
            for (const rule of rules) {
                const error = rule(this[field], field);
                if (error) errors.push(error);
            }
        }
        return errors;
    }

    isValid() { return this.validate().length === 0; }
};

// Combine mixins
class User extends Serializable(Eventable(Validatable(class {}))) {
    static validations = {
        name:  [(v) => !v ? "Name required" : null],
        email: [(v) => !/\S+@\S+/.test(v) ? "Invalid email" : null]
    };

    constructor(name, email) {
        super();
        this.name  = name;
        this.email = email;
    }
}

const user = new User("Alice", "alice@example.com");
user.isValid()       // true
user.toJSON()        // '{"name":"Alice","email":"alice@example.com"}'
user.on("change", (field, val) => console.log(`${field} = ${val}`));
user.emit("change", "name", "Bob");
```

---

## Module Patterns

```js
// IIFE module pattern (pre-ES modules)
const Counter = (function() {
    let count = 0;  // private

    return {
        increment() { count++; },
        decrement() { count--; },
        value()     { return count; }
    };
})();

Counter.increment();
Counter.value();  // 1
// Counter.count   // undefined — private

// Revealing module pattern
const UserManager = (function() {
    const users = [];

    function add(user) { users.push(user); }
    function remove(id) {
        const idx = users.findIndex(u => u.id === id);
        if (idx !== -1) users.splice(idx, 1);
    }
    function getAll() { return [...users]; }
    function findById(id) { return users.find(u => u.id === id); }

    return { add, remove, getAll, findById };  // reveal only what's public
})();
```

---

## Promise Patterns

```js
// ── Promisify — convert callback-based to Promise ──────────────────────────
function promisify(fn) {
    return function(...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };
}

const readFileAsync = promisify(require("fs").readFile);
const data = await readFileAsync("file.txt", "utf8");

// ── Deferred — expose resolve/reject outside the Promise ──────────────────
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

const { promise, resolve } = deferred();
setTimeout(() => resolve("done"), 1000);
const result = await promise;  // "done" after 1 second

// ── Queue with concurrency limit ───────────────────────────────────────────
async function mapConcurrent(items, fn, concurrency = 5) {
    const results = [];
    const iterator = items.entries();

    async function worker() {
        for (const [index, item] of iterator) {
            results[index] = await fn(item);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, worker)
    );
    return results;
}

// Process 100 items but max 5 at a time
const results = await mapConcurrent(urls, fetchUrl, 5);

// ── Timeout wrapper ────────────────────────────────────────────────────────
function withTimeout(promise, ms, message = `Timed out after ${ms}ms`) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms)
    );
    return Promise.race([promise, timeout]);
}

// ── Retry with exponential backoff ─────────────────────────────────────────
async function retry(fn, { attempts = 3, delay = 1000, factor = 2 } = {}) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) {
                await new Promise(r => setTimeout(r, delay * Math.pow(factor, i)));
            }
        }
    }
    throw lastError;
}

// ── Cache async results ────────────────────────────────────────────────────
function memoizeAsync(fn) {
    const cache = new Map();
    return async function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const promise = fn(...args);
        cache.set(key, promise);
        try {
            return await promise;
        } catch (err) {
            cache.delete(key);  // don't cache failures
            throw err;
        }
    };
}

const cachedFetch = memoizeAsync(fetch);
```

---

## Functional Programming Patterns

```js
// ── Currying — transform multi-arg function into chain of single-arg ───────
function curry(fn) {
    return function curried(...args) {
        if (args.length >= fn.length) return fn(...args);
        return (...more) => curried(...args, ...more);
    };
}

const add    = curry((a, b, c) => a + b + c);
const add5   = add(5);
const add5and3 = add5(3);
add5and3(2)  // 10
add(5)(3)(2) // 10
add(5, 3)(2) // 10
add(5, 3, 2) // 10 — works normally too

// ── Compose and Pipe ────────────────────────────────────────────────────────
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);
const pipe    = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

const transform = pipe(
    (s) => s.trim(),
    (s) => s.toLowerCase(),
    (s) => s.replace(/\s+/g, "-"),
    (s) => `slug-${s}`
);
transform("  Hello World  ")  // "slug-hello-world"

// ── Partial Application ────────────────────────────────────────────────────
function partial(fn, ...presetArgs) {
    return (...laterArgs) => fn(...presetArgs, ...laterArgs);
}

const multiply = (a, b) => a * b;
const double   = partial(multiply, 2);
const triple   = partial(multiply, 3);
double(5)  // 10
triple(5)  // 15

// ── Functor pattern — map over wrapped values ──────────────────────────────
class Maybe {
    static of(value) { return new Maybe(value); }

    constructor(value) { this._value = value; }

    isNothing() { return this._value === null || this._value === undefined; }

    map(fn) {
        return this.isNothing() ? Maybe.of(null) : Maybe.of(fn(this._value));
    }

    getOrElse(defaultValue) {
        return this.isNothing() ? defaultValue : this._value;
    }

    chain(fn) {
        return this.isNothing() ? this : fn(this._value);
    }
}

// Safe property access without null checks
const city = Maybe.of(user)
    .map(u => u.address)
    .map(a => a.city)
    .getOrElse("Unknown");

// ── Monad-like async pattern ────────────────────────────────────────────────
class AsyncResult {
    constructor(promise) { this.promise = promise; }
    static of(value)  { return new AsyncResult(Promise.resolve(value)); }
    static fail(err)  { return new AsyncResult(Promise.reject(err)); }
    map(fn)           { return new AsyncResult(this.promise.then(fn)); }
    chain(fn)         { return new AsyncResult(this.promise.then(v => fn(v).promise)); }
    catch(fn)         { return new AsyncResult(this.promise.catch(fn)); }
    run()             { return this.promise; }
}
```

---

## Lazy Evaluation

```js
// Lazy value — compute only when first accessed
function lazy(fn) {
    let computed = false;
    let value;
    return () => {
        if (!computed) { value = fn(); computed = true; }
        return value;
    };
}

const expensiveValue = lazy(() => {
    console.log("Computing...");
    return heavyCalculation();
});

expensiveValue()  // "Computing..." then result
expensiveValue()  // result (cached, no recompute)

// Lazy sequence — infinite, computed on demand
function* lazyMap(iterable, fn) {
    for (const item of iterable) yield fn(item);
}
function* lazyFilter(iterable, pred) {
    for (const item of iterable) if (pred(item)) yield item;
}
function* lazytake(n, iterable) {
    let count = 0;
    for (const item of iterable) {
        if (count++ >= n) return;
        yield item;
    }
}

// First 5 even squares from infinite naturals
function* naturals() { let n = 1; while (true) yield n++; }

const result = [
    ...lazytake(5,
        lazyFilter(
            lazyMap(naturals(), n => n * n),
            n => n % 2 === 0
        )
    )
];
// [4, 16, 36, 64, 100]
```

---

## Structural Patterns

```js
// ── Observer Pattern ────────────────────────────────────────────────────────
class EventEmitter {
    #handlers = new Map();

    on(event, handler) {
        if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
        this.#handlers.get(event).add(handler);
        return () => this.off(event, handler);  // return unsubscribe function
    }

    off(event, handler) {
        this.#handlers.get(event)?.delete(handler);
    }

    emit(event, ...args) {
        this.#handlers.get(event)?.forEach(h => {
            try { h(...args); } catch (err) { console.error("Handler error:", err); }
        });
    }

    once(event, handler) {
        const wrapper = (...args) => { handler(...args); this.off(event, wrapper); };
        return this.on(event, wrapper);
    }
}

// ── Command Pattern ─────────────────────────────────────────────────────────
class CommandHistory {
    #done = [];
    #undone = [];

    execute(command) {
        command.execute();
        this.#done.push(command);
        this.#undone = [];     // clear redo stack
    }

    undo() {
        const cmd = this.#done.pop();
        if (cmd) { cmd.undo(); this.#undone.push(cmd); }
    }

    redo() {
        const cmd = this.#undone.pop();
        if (cmd) { cmd.execute(); this.#done.push(cmd); }
    }

    canUndo() { return this.#done.length > 0; }
    canRedo() { return this.#undone.length > 0; }
}

// ── Builder Pattern ─────────────────────────────────────────────────────────
class QueryBuilder {
    #table;
    #conditions = [];
    #columns    = ["*"];
    #orderBy    = [];
    #limitVal;
    #offsetVal;

    from(table)         { this.#table = table; return this; }
    select(...cols)     { this.#columns = cols; return this; }
    where(cond)         { this.#conditions.push(cond); return this; }
    orderBy(col, dir="ASC") { this.#orderBy.push(`${col} ${dir}`); return this; }
    limit(n)            { this.#limitVal = n; return this; }
    offset(n)           { this.#offsetVal = n; return this; }

    build() {
        let sql = `SELECT ${this.#columns.join(", ")} FROM ${this.#table}`;
        if (this.#conditions.length) sql += ` WHERE ${this.#conditions.join(" AND ")}`;
        if (this.#orderBy.length)    sql += ` ORDER BY ${this.#orderBy.join(", ")}`;
        if (this.#limitVal)          sql += ` LIMIT ${this.#limitVal}`;
        if (this.#offsetVal)         sql += ` OFFSET ${this.#offsetVal}`;
        return sql;
    }
}

const query = new QueryBuilder()
    .from("users")
    .select("id", "name", "email")
    .where("active = true")
    .where("age >= 18")
    .orderBy("name")
    .limit(20)
    .offset(40)
    .build();
// SELECT id, name, email FROM users WHERE active = true AND age >= 18 ORDER BY name LIMIT 20 OFFSET 40
```

---

## Performance Patterns

```js
// ── Debounce ────────────────────────────────────────────────────────────────
function debounce(fn, delay, { leading = false, trailing = true } = {}) {
    let timer, lastResult;

    return function(...args) {
        const shouldCallNow = leading && !timer;

        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            if (trailing && !shouldCallNow) lastResult = fn.apply(this, args);
        }, delay);

        if (shouldCallNow) lastResult = fn.apply(this, args);
        return lastResult;
    };
}

// ── Throttle ────────────────────────────────────────────────────────────────
function throttle(fn, limit) {
    let lastCall   = 0;
    let lastResult;

    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall   = now;
            lastResult = fn.apply(this, args);
        }
        return lastResult;
    };
}

// ── Object Pool — reuse objects instead of creating/destroying ─────────────
class ObjectPool {
    #pool    = [];
    #factory;
    #reset;
    #maxSize;

    constructor(factory, reset = () => {}, maxSize = 100) {
        this.#factory = factory;
        this.#reset   = reset;
        this.#maxSize = maxSize;
    }

    acquire() {
        return this.#pool.length > 0 ? this.#pool.pop() : this.#factory();
    }

    release(obj) {
        if (this.#pool.length < this.#maxSize) {
            this.#reset(obj);
            this.#pool.push(obj);
        }
    }
}

const vectorPool = new ObjectPool(
    () => ({ x: 0, y: 0, z: 0 }),
    (v) => { v.x = 0; v.y = 0; v.z = 0; }
);

const v = vectorPool.acquire();
v.x = 10; v.y = 20;
// ... use v ...
vectorPool.release(v);   // return to pool for reuse
```

---

## Summary

- Iterators and generators provide lazy, memory-efficient sequence processing.
- `Proxy` intercepts object operations — use for validation, observability, default values, logging.
- `WeakMap`/`WeakSet` store object-keyed data without preventing garbage collection.
- Property descriptors control writability, enumerability, and configurability of properties.
- Functional patterns (curry, compose, pipe, Maybe) make data transformations composable and testable.
- Debounce delays execution until activity stops; throttle limits execution rate.
- Object pools reduce GC pressure in performance-critical code.
- The Command pattern enables undo/redo — store executed commands with their inverse operations.
