---
title: "TypeScript"
sidebar_label: "TypeScript"
sidebar_position: 17
---

# TypeScript

TypeScript is JavaScript with static types. The TypeScript compiler catches type errors before your code runs — before users see them. Every valid JavaScript file is also a valid TypeScript file. Types are erased at compile time — the output is plain JavaScript.

---

## Setup and Configuration

```bash
npm install -D typescript
npx tsc --init          # create tsconfig.json

# Run TypeScript
npx tsc                 # compile all files
npx tsc --watch         # watch mode
npx tsc --noEmit        # type-check only, no output

# Run directly (no separate compile step)
npx tsx src/index.ts    # npm install -D tsx
npx ts-node src/index.ts
```

### tsconfig.json — Every Option Explained

```json
{
    "compilerOptions": {
        // ── Output ──────────────────────────────────────────────────────
        "target":           "ES2022",       // JS version to output: ES5|ES6|ES2017|ES2020|ES2022|ESNext
        "module":           "ESNext",       // module system: CommonJS|ESNext|NodeNext|AMD|UMD
        "moduleResolution": "bundler",      // how to resolve imports: node|bundler|node16|nodenext
        "outDir":           "./dist",       // output folder
        "rootDir":          "./src",        // source folder
        "declaration":      true,           // generate .d.ts files
        "declarationMap":   true,           // .d.ts.map files for navigation
        "sourceMap":        true,           // generate .map files for debugging
        "inlineSourceMap":  false,          // embed source maps in JS files

        // ── Strict Mode ─────────────────────────────────────────────────
        "strict":                      true,  // enable ALL strict checks below
        "noImplicitAny":               true,  // error on implicit any type
        "strictNullChecks":            true,  // null/undefined are separate types
        "strictFunctionTypes":         true,  // stricter function type checking
        "strictBindCallApply":         true,  // check bind/call/apply args
        "strictPropertyInitialization":true,  // class properties must be initialized
        "noImplicitThis":              true,  // error on implicit this: any
        "useUnknownInCatchVariables":  true,  // catch variable is unknown, not any

        // ── Additional Checks ────────────────────────────────────────────
        "noUnusedLocals":           true,   // error on unused local variables
        "noUnusedParameters":       true,   // error on unused function parameters
        "noImplicitReturns":        true,   // all code paths must return a value
        "noFallthroughCasesInSwitch":true,  // switch cases must break/return
        "noUncheckedIndexedAccess": true,   // array[i] returns T | undefined
        "exactOptionalPropertyTypes":true,  // optional props can't be set to undefined
        "noPropertyAccessFromIndexSignature": true,

        // ── Module Resolution ────────────────────────────────────────────
        "baseUrl":          ".",
        "paths": {
            "@/*": ["./src/*"],
            "@components/*": ["./src/components/*"]
        },
        "esModuleInterop":         true,    // allow default import from CommonJS
        "allowSyntheticDefaultImports": true,
        "resolveJsonModule":       true,    // import JSON files
        "allowJs":                 true,    // allow .js files in the project
        "checkJs":                 true,    // type-check .js files too

        // ── Experimental ────────────────────────────────────────────────
        "experimentalDecorators":  true,    // for Angular/NestJS decorators
        "emitDecoratorMetadata":   true,    // for dependency injection

        // ── Type Checking ────────────────────────────────────────────────
        "skipLibCheck":            true,    // skip type-checking in .d.ts files
        "forceConsistentCasingInFileNames": true,

        // ── Lib ─────────────────────────────────────────────────────────
        "lib": ["ES2022", "DOM", "DOM.Iterable"],  // type definitions to include
        "types": ["node", "jest"],  // only include these @types/* packages
        "typeRoots": ["./node_modules/@types", "./src/types"]
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

---

## Basic Types — Complete Reference

```typescript
// ── Primitive Types ────────────────────────────────────────────────────────
let name:    string  = "Alice";
let age:     number  = 30;
let active:  boolean = true;
let nothing: null    = null;
let missing: undefined = undefined;
let id:      bigint  = 9007199254740991n;
let sym:     symbol  = Symbol("id");

// ── Special Types ──────────────────────────────────────────────────────────
let anything: any;              // opt out of type checking — avoid
let something: unknown;         // type-safe alternative to any — must narrow before use
let noReturn: never;            // function that never returns (throws or infinite loop)
let nothing2: void;             // function that returns undefined (or nothing)

// ── Literal Types ──────────────────────────────────────────────────────────
let direction: "north" | "south" | "east" | "west" = "north";
let status:    "active" | "inactive" | "banned"     = "active";
let pin:       1234 | 5678                          = 1234;
let answer:    true                                  = true;

// ── Type Inference — let TypeScript figure it out ──────────────────────────
const name2 = "Alice";          // inferred as "Alice" (literal), not string
let name3    = "Alice";         // inferred as string (widened)
const count  = 42;              // inferred as 42 (literal)
const user   = { name: "Alice", age: 30 };  // inferred as { name: string; age: number }
const arr    = [1, 2, 3];       // inferred as number[]
const mixed  = [1, "two"];      // inferred as (string | number)[]

// ── Type Assertions ────────────────────────────────────────────────────────
const input = document.getElementById("name") as HTMLInputElement;
const value = (input).value;

// Non-null assertion operator — asserts value is not null/undefined
const el = document.getElementById("app")!;    // ! = "trust me, it's not null"
el.innerHTML = "Hello";

// Const assertion — infer narrowest possible type
const config = { host: "localhost", port: 3000 } as const;
// type: { readonly host: "localhost"; readonly port: 3000 }
config.host;     // "localhost" (literal type)
// config.port = 8080  // Error — readonly

const routes = ["home", "about", "contact"] as const;
// type: readonly ["home", "about", "contact"]
type Route = typeof routes[number];  // "home" | "about" | "contact"

// satisfies operator (TypeScript 4.9+) — check type without losing specificity
const palette = {
    red:   [255, 0, 0],
    green: "#00ff00",
    blue:  [0, 0, 255]
} satisfies Record<string, string | number[]>;
// palette.red is still number[], not string | number[]
// palette.green is still string, not string | number[]
```

---

## Arrays and Tuples

```typescript
// ── Arrays ─────────────────────────────────────────────────────────────────
let nums:    number[]       = [1, 2, 3];
let strs:    string[]       = ["a", "b"];
let mixed:   (string|number)[] = [1, "two", 3];
let users:   User[]          = [];
let matrix:  number[][]      = [[1,2],[3,4]];

// Generic array syntax (equivalent)
let nums2:   Array<number>   = [1, 2, 3];
let users2:  Array<User>     = [];

// Readonly arrays — can't be mutated
let frozen:  readonly number[]        = [1, 2, 3];
let frozen2: ReadonlyArray<number>    = [1, 2, 3];
// frozen.push(4)   // Error
// frozen[0] = 99   // Error

// ── Tuples — fixed length, specific types at each position ─────────────────
let pair:     [string, number]         = ["Alice", 30];
let triple:   [number, string, boolean]= [1, "two", true];
let point:    [x: number, y: number]  = [0, 0];   // labeled tuple (documentation only)

// Readonly tuple
let readonly: readonly [string, number] = ["Alice", 30];

// Optional tuple elements
let optional: [string, number?] = ["Alice"];        // second is optional
let optional2: [string, number?] = ["Alice", 30];   // also valid

// Rest in tuples
let rest: [string, ...number[]]  = ["sum", 1, 2, 3, 4];
let head: [first: string, ...rest: number[]] = ["head", 1, 2, 3];

// Destructuring tuples
const [name, age] = pair;
const [x, y]      = point;
```

---

## Interfaces

```typescript
// ── Basic Interface ────────────────────────────────────────────────────────
interface User {
    id:        number;
    name:      string;
    email:     string;
    age?:      number;           // optional — can be undefined
    readonly createdAt: Date;    // can't be changed after creation
    role:      "user" | "admin" | "moderator";
}

// ── Method Signatures ──────────────────────────────────────────────────────
interface Calculator {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
    // Method shorthand vs property function:
    multiply: (a: number, b: number) => number;  // property
    divide(a: number, b: number): number;         // method (allows overloading)
}

// ── Index Signatures ──────────────────────────────────────────────────────
interface StringMap {
    [key: string]: string;       // any string key → string value
}
interface NumberRecord {
    [key: string]: number;
    length: number;              // specific property alongside index sig
}

// ── Callable Interface ─────────────────────────────────────────────────────
interface Formatter {
    (value: string): string;     // can be called as a function
    separator: string;           // also has properties
}

// ── Constructor Interface ──────────────────────────────────────────────────
interface Constructable {
    new(name: string): User;
    new(name: string, age: number): User;
}

// ── Extending Interfaces ───────────────────────────────────────────────────
interface Animal {
    name: string;
    sound(): string;
}
interface Pet extends Animal {
    owner: string;
}
interface Dog extends Pet, Animal {  // multiple inheritance
    breed: string;
}

// ── Declaration Merging — add to existing interface ───────────────────────
interface Window {
    myCustomProperty: string;
}
interface Express {
    Request: {
        user?: User;
    };
}

// ── Hybrid Types ───────────────────────────────────────────────────────────
interface Counter {
    (start: number): string;   // callable
    interval: number;          // property
    reset(): void;             // method
}
```

---

## Type Aliases

```typescript
// ── Basic type alias ───────────────────────────────────────────────────────
type ID      = string | number;
type Name    = string;
type Point   = { x: number; y: number };
type Pair<T> = [T, T];
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T>    = T | null | undefined;

// ── Union Types ────────────────────────────────────────────────────────────
type StringOrNumber = string | number;
type Status = "pending" | "active" | "inactive" | "banned";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// ── Intersection Types ─────────────────────────────────────────────────────
type Named   = { name: string };
type Aged    = { age: number };
type Person  = Named & Aged;           // must have BOTH
type AdminUser = User & { permissions: string[] };
type WithTimestamps = { createdAt: Date; updatedAt: Date };
type AuditedUser = User & WithTimestamps;

// ── Discriminated Unions ───────────────────────────────────────────────────
type Shape =
    | { kind: "circle";    radius: number }
    | { kind: "rectangle"; width: number;  height: number }
    | { kind: "triangle";  base: number;   height: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":    return Math.PI * shape.radius ** 2;
        case "rectangle": return shape.width * shape.height;
        case "triangle":  return 0.5 * shape.base * shape.height;
        // TypeScript warns if a case is missing
    }
}

// ── Template Literal Types ─────────────────────────────────────────────────
type EventName = `on${Capitalize<string>}`;   // "onClick", "onFocus", etc.
type CssProperty = `${string}-${string}`;
type Endpoint = `/api/${string}`;

type Color = "red" | "blue" | "green";
type Size  = "sm" | "md" | "lg";
type Variant = `${Color}-${Size}`;  // "red-sm" | "red-md" | ... 9 combinations

// ── Mapped Types ───────────────────────────────────────────────────────────
type ReadOnly<T> = {
    readonly [K in keyof T]: T[K];
};
type Optional2<T> = {
    [K in keyof T]?: T[K];
};
type Nullable2<T> = {
    [K in keyof T]: T[K] | null;
};
type Stringify<T> = {
    [K in keyof T]: string;
};

// With key remapping (TypeScript 4.1+)
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<User> = { getId: () => number; getName: () => string; ... }
```

---

## Utility Types — Complete Reference

```typescript
interface User {
    id:           number;
    name:         string;
    email:        string;
    password:     string;
    role:         "user" | "admin";
    age?:         number;
    createdAt:    Date;
    address:      { city: string; country: string };
}

// ── Partial<T> — all properties optional ──────────────────────────────────
type UpdateUser = Partial<User>;
// { id?: number; name?: string; email?: string; ... }

// ── Required<T> — all properties required ─────────────────────────────────
type RequiredUser = Required<User>;
// age is no longer optional

// ── Readonly<T> — all properties readonly ─────────────────────────────────
type FrozenUser = Readonly<User>;
// can't modify any property

// ── Pick<T, K> — keep only specified properties ───────────────────────────
type PublicUser = Pick<User, "id" | "name" | "email" | "role">;
// password and other sensitive fields excluded

// ── Omit<T, K> — remove specified properties ─────────────────────────────
type SafeUser     = Omit<User, "password">;
type CreateUserDto= Omit<User, "id" | "createdAt">;
type UpdateUserDto= Omit<Partial<User>, "id" | "createdAt" | "password">;

// ── Record<K, V> — object type with specific key/value types ──────────────
type UserMap    = Record<number, User>;              // { [id: number]: User }
type Config     = Record<string, string>;            // { [key: string]: string }
type ByRole     = Record<"user" | "admin", User[]>;

// ── Exclude<T, U> — remove union members assignable to U ─────────────────
type NotNull    = Exclude<string | null | undefined, null | undefined>;  // string
type NotAdmin   = Exclude<"user" | "admin" | "guest", "admin">;  // "user" | "guest"
type NoNumbers  = Exclude<string | number | boolean, number>;    // string | boolean

// ── Extract<T, U> — keep only union members assignable to U ──────────────
type AdminOnly  = Extract<"user" | "admin" | "guest", "admin" | "superadmin">;  // "admin"
type Strings    = Extract<string | number | boolean, string>;    // string

// ── NonNullable<T> — remove null and undefined ────────────────────────────
type SafeString = NonNullable<string | null | undefined>;   // string
type SafeUser2  = NonNullable<User | null>;                 // User

// ── ReturnType<T> — get return type of a function ─────────────────────────
function getUser() { return { id: 1, name: "Alice" }; }
type GetUserReturn  = ReturnType<typeof getUser>;    // { id: number; name: string }
type PromiseReturn  = ReturnType<() => Promise<User>>;  // Promise<User>

// ── Parameters<T> — get parameter types of a function ────────────────────
type GetUserParams  = Parameters<typeof getUser>;   // []
function createUser(name: string, age: number): User { ... }
type CreateParams   = Parameters<typeof createUser>;  // [string, number]
type FirstParam     = Parameters<typeof createUser>[0]; // string

// ── ConstructorParameters<T> — get constructor params ────────────────────
class MyClass { constructor(x: number, y: string) {} }
type CtorParams = ConstructorParameters<typeof MyClass>;  // [number, string]

// ── InstanceType<T> — get instance type from constructor type ────────────
type MyInstance = InstanceType<typeof MyClass>;   // MyClass

// ── Awaited<T> — unwrap Promise type ─────────────────────────────────────
type Resolved  = Awaited<Promise<User>>;          // User
type Deep      = Awaited<Promise<Promise<string>>>;  // string

// ── ThisType<T> — set `this` type in object literal ──────────────────────
type MyObj = { x: number } & ThisType<{ x: number; double(): number }>;

// ── String Manipulation Types ─────────────────────────────────────────────
type Upper = Uppercase<"hello">;           // "HELLO"
type Lower = Lowercase<"HELLO">;           // "hello"
type Cap   = Capitalize<"hello">;          // "Hello"
type Uncap = Uncapitalize<"Hello">;        // "hello"

// ── Combining utility types ───────────────────────────────────────────────
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// ── keyof and typeof ──────────────────────────────────────────────────────
type UserKeys   = keyof User;      // "id" | "name" | "email" | "password" | ...
type UserValues = User[keyof User]; // number | string | "user" | "admin" | Date | ...

const config = { host: "localhost", port: 3000, debug: true };
type ConfigType = typeof config;   // { host: string; port: number; debug: boolean }
type ConfigKey  = keyof typeof config;  // "host" | "port" | "debug"
```

---

## Generics — Complete Reference

```typescript
// ── Generic Functions ──────────────────────────────────────────────────────
function identity<T>(value: T): T { return value; }
identity<string>("hello");    // explicit
identity("hello");            // inferred

function first<T>(arr: T[]): T | undefined { return arr[0]; }
function last<T>(arr: T[]): T | undefined  { return arr[arr.length - 1]; }
function pair<A, B>(a: A, b: B): [A, B]   { return [a, b]; }
function swap<T, U>(pair: [T, U]): [U, T]  { return [pair[1], pair[0]]; }

// ── Generic Constraints ────────────────────────────────────────────────────
function getLength<T extends { length: number }>(value: T): number {
    return value.length;
}
getLength("hello");      // 5
getLength([1, 2, 3]);   // 3
getLength({ length: 5 }); // 5

// keyof constraint — ensure K is a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
getProperty({ name: "Alice", age: 30 }, "name");  // string
getProperty({ name: "Alice", age: 30 }, "age");   // number
// getProperty({ name: "Alice" }, "xyz");  // Error!

// extends + conditional
function processValue<T extends string | number>(value: T): T extends string ? string[] : number[] {
    if (typeof value === "string") return value.split("") as any;
    return Array.from({ length: value }, (_, i) => i) as any;
}

// ── Generic Interfaces ─────────────────────────────────────────────────────
interface Repository<T, ID = number> {
    findById(id: ID): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
    create(data: Omit<T, "id" | "createdAt">): Promise<T>;
    update(id: ID, data: Partial<T>): Promise<T>;
    delete(id: ID): Promise<void>;
    count(filter?: Partial<T>): Promise<number>;
}

interface ApiResponse<T> {
    data:       T;
    status:     number;
    message:    string;
    timestamp:  string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
    hasNext:    boolean;
    hasPrev:    boolean;
}

// ── Generic Classes ────────────────────────────────────────────────────────
class Stack<T> {
    private items: T[] = [];

    push(...items: T[]): void         { this.items.push(...items); }
    pop(): T | undefined              { return this.items.pop(); }
    peek(): T | undefined             { return this.items[this.items.length - 1]; }
    isEmpty(): boolean                { return this.items.length === 0; }
    size(): number                    { return this.items.length; }
    toArray(): T[]                    { return [...this.items]; }
    clear(): void                     { this.items = []; }
}

class EventEmitter<Events extends Record<string, any>> {
    private handlers: Partial<{ [K in keyof Events]: ((data: Events[K]) => void)[] }> = {};

    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): this {
        (this.handlers[event] ??= []).push(handler);
        return this;
    }
    emit<K extends keyof Events>(event: K, data: Events[K]): void {
        this.handlers[event]?.forEach(h => h(data));
    }
    off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
        this.handlers[event] = this.handlers[event]?.filter(h => h !== handler);
    }
}

// Usage
const emitter = new EventEmitter<{ login: User; logout: void; error: Error }>();
emitter.on("login",  (user)  => console.log("Logged in:", user.name));
emitter.on("error",  (error) => console.error(error));
emitter.emit("login", { id: 1, name: "Alice" } as User);

// ── Conditional Types ──────────────────────────────────────────────────────
type IsArray<T> = T extends any[] ? true : false;
IsArray<string[]>   // true
IsArray<string>     // false

type UnwrapArray<T> = T extends (infer U)[] ? U : T;
UnwrapArray<string[]>  // string
UnwrapArray<number>    // number

type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;
UnwrapPromise<Promise<Promise<string>>>  // string

// infer — extract type from inside a type
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
type F = FirstArg<(name: string, age: number) => void>;  // string

// Distribute over union
type ToArray<T> = T extends any ? T[] : never;
type ArrayOfUnion = ToArray<string | number>;  // string[] | number[]
// NOT: (string | number)[]

// ── Default Type Parameters ────────────────────────────────────────────────
function createArray<T = string>(length: number, fill: T): T[] {
    return Array.from({ length }, () => fill);
}
createArray(3, "x");      // string[] — inferred
createArray<number>(3, 0); // number[] — explicit
```

---

## Type Narrowing — Complete

```typescript
// ── typeof ─────────────────────────────────────────────────────────────────
function process(value: string | number) {
    if (typeof value === "string") {
        return value.toUpperCase();    // string here
    }
    return value.toFixed(2);          // number here
}

// ── instanceof ─────────────────────────────────────────────────────────────
function handle(error: unknown) {
    if (error instanceof TypeError)   console.log("Type error:", error.message);
    else if (error instanceof Error)  console.log("Error:", error.message);
    else                              console.log("Unknown:", error);
}

// ── in operator ────────────────────────────────────────────────────────────
type Cat = { meow: () => void };
type Dog = { bark: () => void; fetch: () => void };

function makeSound(animal: Cat | Dog) {
    if ("meow" in animal) animal.meow();  // Cat
    else                  animal.bark();  // Dog
}

// ── Equality narrowing ─────────────────────────────────────────────────────
function check(x: string | number, y: string | boolean) {
    if (x === y) {
        // x and y are both string here (only type they share)
        x.toUpperCase();
    }
}

// ── Truthiness narrowing ───────────────────────────────────────────────────
function printName(name: string | null | undefined) {
    if (name) {
        console.log(name.toUpperCase());  // string (not null/undefined)
    } else {
        console.log("No name provided");  // string | null | undefined
    }
}

// ── Type Predicates — custom type guards ───────────────────────────────────
function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "name" in value &&
        "email" in value
    );
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isNonNull<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

// Usage
const data: unknown = fetchData();
if (isUser(data)) {
    console.log(data.name);  // TypeScript knows it's User here
}

const items: (string | null)[] = ["a", null, "b", null, "c"];
const strings = items.filter(isNonNull);  // string[]

// ── Discriminated union narrowing ──────────────────────────────────────────
type ApiResult<T> =
    | { status: "success"; data: T }
    | { status: "error"; error: string; code: number }
    | { status: "loading" };

function handleResult<T>(result: ApiResult<T>) {
    switch (result.status) {
        case "success": return result.data;      // { data: T }
        case "error":   throw new Error(result.error); // has .error and .code
        case "loading": return null;             // no extra props
    }
}

// ── never — exhaustiveness checking ───────────────────────────────────────
function assertNever(x: never): never {
    throw new Error("Unexpected value: " + x);
}

function handleStatus(status: "active" | "inactive" | "banned") {
    switch (status) {
        case "active":   return "green";
        case "inactive": return "gray";
        case "banned":   return "red";
        default:         return assertNever(status);  // TypeScript error if you add a new status
    }
}
```

---

## Classes with TypeScript

```typescript
// ── Access Modifiers ───────────────────────────────────────────────────────
class Person {
    public    name:   string;    // accessible everywhere (default)
    private   age:    number;    // only this class
    protected email:  string;    // this class + subclasses
    readonly  id:     number;    // can't be changed after initialization
    #secret:         string;     // truly private (ES2022 — not just TypeScript)

    // Parameter properties — shorthand for declaring + assigning
    constructor(
        public  username:  string,
        private password:  string,
        readonly createdAt:Date = new Date()
    ) {
        this.id = Math.random();
    }
}

// ── Abstract Classes ───────────────────────────────────────────────────────
abstract class Shape {
    abstract area(): number;
    abstract perimeter(): number;

    describe(): string {
        return `Area: ${this.area()}, Perimeter: ${this.perimeter()}`;
    }
}

class Circle extends Shape {
    constructor(private radius: number) { super(); }
    area()      { return Math.PI * this.radius ** 2; }
    perimeter() { return 2 * Math.PI * this.radius; }
}

// ── Interfaces implemented by classes ─────────────────────────────────────
interface Serializable {
    serialize(): string;
    deserialize(data: string): void;
}
interface Cloneable {
    clone(): this;
}

class Config implements Serializable, Cloneable {
    constructor(public data: Record<string, any> = {}) {}
    serialize(): string     { return JSON.stringify(this.data); }
    deserialize(s: string)  { this.data = JSON.parse(s); }
    clone(): this            { return new (this.constructor as any)(structuredClone(this.data)); }
}

// ── Static ────────────────────────────────────────────────────────────────
class Counter {
    static count = 0;
    static readonly MAX = 100;
    static {  // static initialization block
        Counter.count = parseInt(localStorage.getItem("count") ?? "0");
    }
    static increment() { Counter.count++; }
    static reset()     { Counter.count = 0; }
}

// ── Decorators (with experimentalDecorators: true) ────────────────────────
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = function(...args: any[]) {
        console.log(`Calling ${key} with`, args);
        return original.apply(this, args);
    };
    return descriptor;
}

class UserService {
    @log
    createUser(name: string): User { return { id: 1, name } as User; }
}
```

---

## Declaration Files

```typescript
// src/types/environment.d.ts — extend global types
declare global {
    interface Window {
        analytics: {
            track(event: string, data?: Record<string, any>): void;
        };
        __APP_VERSION__: string;
    }

    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV:     "development" | "production" | "test";
            PORT?:        string;
            DATABASE_URL: string;
            JWT_SECRET:   string;
            REDIS_URL?:   string;
        }
    }
}

// For a third-party JS module without types
declare module "some-library" {
    export function doSomething(value: string): number;
    export const version: string;
    export default class MyClass {
        constructor(options: { debug?: boolean });
        connect(): Promise<void>;
    }
}

// Augment an existing module
declare module "express" {
    interface Request {
        user?: {
            userId: number;
            email:  string;
            role:   string;
        };
        requestId: string;
    }
}

// Ambient declarations — for globals defined elsewhere (e.g. CDN script)
declare const __ENV__: "development" | "production";
declare function fetchData(url: string): Promise<unknown>;
declare class MyGlobalClass {
    static getInstance(): MyGlobalClass;
}
```

---

## Summary

- Enable `"strict": true` in tsconfig — catches the most bugs with the least configuration.
- Use `unknown` instead of `any` for values of unknown type — you must narrow before using.
- Use `interface` for object shapes that represent entities; `type` for unions, intersections, and complex types.
- Generics `<T>` make code reusable across types without sacrificing safety.
- Utility types (`Partial`, `Required`, `Pick`, `Omit`, `Record`, `Extract`, `Exclude`, `NonNullable`) transform existing types — use them extensively instead of rewriting.
- Type predicates (`value is User`) let you create custom type guards for narrowing.
- Discriminated unions with `switch` on a `kind`/`type` field give exhaustiveness checking.
- `as const` infers literal types and makes arrays/objects readonly.
- `satisfies` (TS 4.9+) validates type conformance without widening — best of both worlds.
