---
title: "Classes & Modules"
sidebar_label: "Classes & Modules"
sidebar_position: 5
---

# Classes & Modules

Classes bring structured object-oriented code to JavaScript. Modules let you split code across files and control exactly what's public. Both are essential for organizing anything beyond a small script.

---

## Classes

A class is syntactic sugar over JavaScript's prototype-based inheritance. Under the hood, classes ARE functions — `typeof MyClass === "function"`.

```js
class Animal {
    // Static field — belongs to the class, not instances
    static count = 0;

    // Private field (ES2022) — truly private, not accessible outside
    #health = 100;

    // Public field — equivalent to setting in constructor
    alive = true;

    constructor(name, sound) {
        this.name = name;         // public instance property
        this.sound = sound;
        Animal.count++;
    }

    // Instance method
    speak() {
        return `${this.name} says ${this.sound}!`;
    }

    // Getter — access like a property but runs a function
    get healthPercent() {
        return `${this.#health}%`;
    }

    // Setter — validate on assignment
    set health(value) {
        if (value < 0) this.#health = 0;
        else if (value > 100) this.#health = 100;
        else this.#health = value;
    }

    get health() {
        return this.#health;
    }

    // Static method — called on the class, not an instance
    static create(name, sound) {
        return new Animal(name, sound);
    }

    // Private method
    #checkAlive() {
        this.alive = this.#health > 0;
    }

    takeDamage(amount) {
        this.health = this.#health - amount;  // triggers setter
        this.#checkAlive();                   // calls private method
        return this;                           // fluent interface
    }

    // toString — called when object is used as a string
    toString() {
        return `Animal(${this.name}, health=${this.#health})`;
    }

    // Symbol.toPrimitive — full control over type coercion
    [Symbol.toPrimitive](hint) {
        if (hint === "number") return this.#health;
        return this.toString();
    }
}

const dog = new Animal("Rex", "Woof");
dog.speak();             // "Rex says Woof!"
dog.healthPercent;       // "100%"
dog.health = 150;        // setter: clamped to 100
dog.health;              // 100
dog.takeDamage(30).takeDamage(20);  // chainable — health is 50
Animal.count;            // 1 — static field
Animal.create("Cat", "Meow");  // static factory

// dog.#health           // SyntaxError — truly private
+dog                     // 50 — via Symbol.toPrimitive
`${dog}`                 // "Animal(Rex, health=50)"
```

### Inheritance

```js
class Dog extends Animal {
    #breed;

    constructor(name, breed) {
        super(name, "Woof");   // MUST call super() before using this
        this.#breed = breed;
    }

    // Override parent method
    speak() {
        return `${super.speak()} (${this.#breed})`;
        //        ^ calls parent's speak()
    }

    fetch(item) {
        return `${this.name} fetches the ${item}!`;
    }

    get breed() {
        return this.#breed;
    }
}

class GuideDog extends Dog {
    #owner;

    constructor(name, breed, owner) {
        super(name, breed);
        this.#owner = owner;
    }

    speak() {
        return super.speak() + " (guide dog)";
    }

    guide() {
        return `${this.name} guides ${this.#owner}`;
    }
}

const guide = new GuideDog("Buddy", "Retriever", "John");
guide.speak();           // "Buddy says Woof! (Retriever) (guide dog)"
guide.fetch("ball");     // inherited from Dog
guide.takeDamage(10);    // inherited from Animal
guide instanceof GuideDog  // true
guide instanceof Dog       // true
guide instanceof Animal    // true
```

### Checking Instances

```js
dog instanceof Dog      // true
dog instanceof Animal   // true
dog instanceof Cat      // false

// Check the class itself
dog.constructor === Dog   // true
dog.constructor.name      // "Dog"

// Works across iframes/realms (where instanceof can fail)
Object.prototype.toString.call(dog)  // "[object Object]" — not useful for custom classes

// Pattern: use instanceof, or a type property
class Shape {
    get [Symbol.toStringTag]() { return "Shape"; }
}
Object.prototype.toString.call(new Shape())  // "[object Shape]"
```

### Static Members in Detail

```js
class Config {
    static #instance = null;

    static getInstance() {
        if (!Config.#instance) {
            Config.#instance = new Config();
        }
        return Config.#instance;
    }

    static fromEnv() {
        return new Config({
            host: process.env.HOST,
            port: parseInt(process.env.PORT)
        });
    }

    // Static initialization block (ES2022) — runs once when class is defined
    static {
        // Complex static initialization
        Config.defaults = Object.freeze({
            host: "localhost",
            port: 3000,
            timeout: 5000
        });
    }

    #settings;

    constructor(settings = Config.defaults) {
        this.#settings = { ...Config.defaults, ...settings };
    }

    get(key) { return this.#settings[key]; }
}

Config.getInstance() === Config.getInstance()  // true — singleton
Config.defaults.host  // "localhost"
```

### Abstract-Style Classes

JavaScript has no abstract keyword, but you can simulate it:

```js
class AbstractShape {
    constructor() {
        if (new.target === AbstractShape) {
            throw new Error("AbstractShape cannot be instantiated directly");
        }
    }

    // "Abstract" methods — must be overridden
    area() {
        throw new Error(`${this.constructor.name} must implement area()`);
    }

    perimeter() {
        throw new Error(`${this.constructor.name} must implement perimeter()`);
    }

    // Concrete method — shared implementation
    describe() {
        return `${this.constructor.name}: area=${this.area().toFixed(2)}, ` +
               `perimeter=${this.perimeter().toFixed(2)}`;
    }
}

class Circle extends AbstractShape {
    #radius;
    constructor(radius) { super(); this.#radius = radius; }
    area()      { return Math.PI * this.#radius ** 2; }
    perimeter() { return 2 * Math.PI * this.#radius; }
}

class Rectangle extends AbstractShape {
    constructor(w, h) { super(); this.width = w; this.height = h; }
    area()      { return this.width * this.height; }
    perimeter() { return 2 * (this.width + this.height); }
}

// new AbstractShape()  // Error: cannot instantiate
const shapes = [new Circle(5), new Rectangle(4, 6)];
shapes.forEach(s => console.log(s.describe()));
```

### Mixins

JavaScript is single-inheritance. Mixins add behavior from multiple sources.

```js
// Mixin factory — returns a class that extends a given superclass
const Serializable = (Base) => class extends Base {
    serialize() {
        return JSON.stringify(this);
    }
    static deserialize(json) {
        return Object.assign(new this(), JSON.parse(json));
    }
};

const Validatable = (Base) => class extends Base {
    validate() {
        for (const [field, rule] of Object.entries(this.constructor.rules || {})) {
            if (!rule(this[field])) {
                throw new Error(`Validation failed for field: ${field}`);
            }
        }
        return true;
    }
};

const Timestamped = (Base) => class extends Base {
    constructor(...args) {
        super(...args);
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    touch() { this.updatedAt = new Date(); return this; }
};

// Combine multiple mixins
class User extends Timestamped(Validatable(Serializable(class {}))) {
    static rules = {
        name:  (v) => typeof v === "string" && v.length >= 2,
        email: (v) => /\S+@\S+\.\S+/.test(v)
    };

    constructor(name, email) {
        super();
        this.name = name;
        this.email = email;
    }
}

const user = new User("Alice", "alice@example.com");
user.validate();       // true
user.serialize();      // JSON string
user.createdAt;        // Date
user.touch();          // updates updatedAt
```

---

## Prototype System

Classes are built on top of prototypes. Understanding prototypes explains how JS inheritance actually works.

```js
function Animal(name) {
    this.name = name;
}
Animal.prototype.speak = function() {
    return `${this.name} speaks`;
};

const dog = new Animal("Rex");
dog.speak();     // "Rex speaks"

// This is what class does under the hood:
class Animal {
    constructor(name) { this.name = name; }
    speak() { return `${this.name} speaks`; }
}
// speak is on Animal.prototype, not on each instance

// Prototype chain
dog.__proto__ === Animal.prototype   // true
Animal.prototype.__proto__ === Object.prototype  // true
Object.prototype.__proto__ === null  // end of chain

// Property lookup: dog → Animal.prototype → Object.prototype → null
dog.toString()  // found on Object.prototype

// hasOwnProperty — is the property directly on the object?
dog.hasOwnProperty("name")   // true — own property
dog.hasOwnProperty("speak")  // false — on prototype
```

---

## ES Modules

The standard module system for modern JavaScript (browser and Node.js with `"type": "module"`).

### Exporting

```js
// math.js

// Named exports — export multiple things
export const PI = 3.14159265;
export const E  = 2.71828182;

export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }

export class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(other) { return new Vector(this.x + other.x, this.y + other.y); }
    toString() { return `Vector(${this.x}, ${this.y})`; }
}

// Default export — one per file
export default class Calculator {
    #history = [];
    add(a, b) {
        const result = a + b;
        this.#history.push({ op: "add", a, b, result });
        return result;
    }
    get history() { return [...this.#history]; }
}

// Export list — declare separately, then export
const secret = "internal";  // not exported
const version = "1.0.0";
function helper() { }
export { version, helper };  // named export of existing variables
export { version as libVersion };  // rename on export
```

### Importing

```js
// app.js

// Default import — name is yours to choose
import Calculator from "./math.js";
import Calc from "./math.js";       // same, different local name

// Named imports — names must match exports
import { PI, add, Vector } from "./math.js";

// Named imports with rename
import { add as sum, subtract as minus } from "./math.js";

// Both default and named in one statement
import Calculator, { PI, add } from "./math.js";

// Import everything as a namespace object
import * as Math from "./math.js";
Math.PI;
Math.add(2, 3);
Math.default;   // the default export

// Side-effect only — just runs the module
import "./setup.js";

// Dynamic import — lazy load on demand
async function loadHeavyModule() {
    const { default: HeavyThing } = await import("./heavy.js");
    return new HeavyThing();
}

// Conditional dynamic import
if (isDev) {
    const { devTools } = await import("./dev-tools.js");
    devTools.enable();
}
```

### Re-exporting

```js
// index.js — barrel file, re-exports everything from submodules

// Re-export named
export { add, subtract } from "./math.js";

// Re-export with rename
export { Vector as MathVector } from "./math.js";

// Re-export everything
export * from "./math.js";
export * from "./strings.js";

// Re-export default from another module as named
export { default as Calculator } from "./calculator.js";

// Re-export and also set a default
export { Calculator as default } from "./calculator.js";
```

### Module-Level Behavior

```js
// Modules are singletons — code runs once, then cached
// counter.js
let count = 0;
export function increment() { return ++count; }

// app1.js
import { increment } from "./counter.js";
increment();  // 1
increment();  // 2

// app2.js
import { increment } from "./counter.js";
increment();  // 3 — same module instance! count is shared
```

---

## CommonJS (Node.js legacy)

Still widely used in older Node.js code and npm packages.

```js
// math.cjs — CommonJS export
const PI = 3.14159;

function add(a, b) { return a + b; }

class Calculator {
    add(a, b) { return a + b; }
}

// module.exports — the object other modules receive
module.exports = { PI, add, Calculator };

// Or: individual property exports
module.exports.PI = PI;
module.exports.add = add;
module.exports.Calculator = Calculator;

// Default-style (most common in npm packages)
module.exports = Calculator;
```

```js
// app.cjs — CommonJS import
const { PI, add } = require("./math.cjs");
const Calculator = require("./calculator.cjs");
const fs = require("fs");         // built-in module
const express = require("express"); // npm package

// require is synchronous — blocking!
// Don't use require() inside functions/loops unless necessary
```

### Mixing ESM and CJS

```js
// ESM file importing CJS (works)
import Calculator from "./calculator.cjs";  // gets module.exports

// CJS file importing ESM — NOT directly supported
// Must use dynamic import() which is async
async function loadModule() {
    const { add } = await import("./math.mjs");
    return add;
}
```

### package.json — Controlling Module Type

```json
{
    "type": "module"       // .js files treated as ESM
}
{
    "type": "commonjs"     // .js files treated as CJS (default)
}
```

- `.mjs` extension → always ESM
- `.cjs` extension → always CJS
- `.js` extension → follows `"type"` in package.json

---

## Organizing Code with Modules

```
src/
├── index.js              ← entry point
├── config/
│   ├── index.js          ← re-exports config utilities
│   ├── env.js            ← environment variable validation
│   └── database.js       ← DB connection config
├── models/
│   ├── index.js          ← re-exports all models
│   ├── user.js           ← User class/schema
│   └── post.js
├── services/
│   ├── index.js
│   ├── userService.js    ← business logic
│   └── emailService.js
├── utils/
│   ├── index.js
│   ├── validation.js
│   ├── formatting.js
│   └── errors.js
└── middleware/
    ├── auth.js
    └── errorHandler.js
```

```js
// utils/index.js — barrel file
export { validateEmail, validatePassword } from "./validation.js";
export { formatDate, formatCurrency } from "./formatting.js";
export { AppError, NotFoundError, ValidationError } from "./errors.js";

// Usage — clean single import
import { validateEmail, formatDate, AppError } from "./utils/index.js";
// Instead of:
// import { validateEmail } from "./utils/validation.js";
// import { formatDate } from "./utils/formatting.js";
// import { AppError } from "./utils/errors.js";
```

---

## Summary

- Classes are syntactic sugar over prototypes — they compile to `function + prototype`.
- Private fields (`#field`) are enforced at the language level — not just convention.
- Getters and setters let you intercept property access and validate values.
- Static members belong to the class; `new.target` lets you detect how a class is being instantiated.
- Mixins solve the single-inheritance limitation — compose behavior from multiple sources.
- ES Modules are the standard: `export` / `import`. Use `"type": "module"` in package.json.
- Default exports are unnamed; named exports must match on import (or be aliased with `as`).
- Dynamic `import()` loads modules lazily — great for code splitting and optional features.
- CommonJS (`require`) is legacy but still common in npm packages and older Node.js code.
