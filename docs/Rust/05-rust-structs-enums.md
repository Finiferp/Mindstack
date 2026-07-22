---
title: "Structs, Enums, and Pattern Matching"
sidebar_label: "Structs & Enums"
sidebar_position: 5
---

# Structs, Enums, and Pattern Matching

Rust's type system is built around structs (product types) and enums (sum types). Combined with exhaustive pattern matching, they replace class hierarchies, null, and exceptions.

---

## Structs

```rust
// Define a struct
struct User {
    username: String,
    email: String,
    age: u32,
    active: bool,
}

fn main() {
    // Create an instance — all fields must be set
    let user1 = User {
        username: String::from("alice"),
        email: String::from("alice@example.com"),
        age: 30,
        active: true,
    };

    // Access fields with dot notation
    println!("{}", user1.username);

    // Mutable struct — entire struct must be mut (not individual fields)
    let mut user2 = User {
        username: String::from("bob"),
        email: String::from("bob@example.com"),
        age: 25,
        active: true,
    };
    user2.email = String::from("bob@newdomain.com");

    // Struct update syntax — copy remaining fields from another instance
    let user3 = User {
        email: String::from("carol@example.com"),
        ..user2    // remaining fields from user2 (moves user2.username!)
    };
}

// Field shorthand — when parameter name matches field name
fn build_user(email: String, username: String) -> User {
    User {
        email,        // shorthand for email: email
        username,     // shorthand for username: username
        age: 0,
        active: true,
    }
}
```

---

## Tuple Structs and Unit Structs

```rust
// Tuple struct — named tuple; fields have no names
struct Point(f64, f64, f64);
struct Color(u8, u8, u8);

let origin = Point(0.0, 0.0, 0.0);
let red = Color(255, 0, 0);
println!("{} {} {}", origin.0, origin.1, origin.2);

// Unit struct — no fields; useful as a marker type
struct AlwaysEqual;
let _subject = AlwaysEqual;
```

---

## Methods with impl

```rust
struct Rectangle {
    width: f64,
    height: f64,
}

impl Rectangle {
    // Associated function (like a static method) — no self
    // Called as: Rectangle::new(...)
    fn new(width: f64, height: f64) -> Self {
        Rectangle { width, height }
    }

    // Method — takes self (or &self or &mut self)
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }

    fn is_square(&self) -> bool {
        self.width == self.height
    }

    // Takes mutable reference — can modify self
    fn scale(&mut self, factor: f64) {
        self.width *= factor;
        self.height *= factor;
    }

    // Takes ownership of self (consumes the instance)
    fn into_square(self) -> Rectangle {
        let side = self.width.min(self.height);
        Rectangle::new(side, side)
    }

    // Method that takes another Rectangle
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

// Multiple impl blocks allowed (useful for traits)
impl Rectangle {
    fn describe(&self) -> String {
        format!("{}x{} rectangle", self.width, self.height)
    }
}

fn main() {
    let mut rect = Rectangle::new(10.0, 5.0);
    println!("Area: {}", rect.area());
    println!("Is square: {}", rect.is_square());
    rect.scale(2.0);
    println!("{}", rect.describe());
}
```

---

## Deriving Common Traits

```rust
// Derive macros auto-implement common traits
#[derive(Debug, Clone, PartialEq)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1.clone();            // Clone — deep copy

    println!("{:?}", p1);           // Debug — {x: 1.0, y: 2.0}
    println!("{:#?}", p1);          // pretty Debug

    println!("{}", p1 == p2);       // PartialEq — true

    // Common derivable traits:
    // Debug    — {:?} formatting
    // Clone    — .clone() method
    // Copy     — implicit copy on assignment (only for stack types)
    // PartialEq, Eq — == and !=
    // PartialOrd, Ord — <, >, <=, >=
    // Hash     — use in HashMap/HashSet
    // Default  — default values (0, false, "", etc.)
    // Serialize, Deserialize — from serde crate (JSON/etc.)
}
```

---

## Enums

Rust enums are sum types — a value is exactly one of several variants. Each variant can carry different data.

```rust
// Simple enum — like C enum
enum Direction {
    North,
    South,
    East,
    West,
}

// Enum with data — each variant can have different types
#[derive(Debug)]
enum Shape {
    Circle(f64),                    // radius
    Rectangle(f64, f64),            // width, height
    Triangle { base: f64, height: f64 },  // named fields
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(r) => std::f64::consts::PI * r * r,
            Shape::Rectangle(w, h) => w * h,
            Shape::Triangle { base, height } => 0.5 * base * height,
        }
    }
}

fn main() {
    let shapes = vec![
        Shape::Circle(5.0),
        Shape::Rectangle(4.0, 6.0),
        Shape::Triangle { base: 3.0, height: 8.0 },
    ];

    for shape in &shapes {
        println!("{:?} → area: {:.2}", shape, shape.area());
    }
}
```

---

## Option&lt;T&gt; — Replacing Null

```rust
// Option is a built-in enum:
// enum Option<T> {
//     Some(T),
//     None,
// }

fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None
    } else {
        Some(a / b)
    }
}

fn main() {
    // match to handle Option
    match divide(10.0, 2.0) {
        Some(result) => println!("Result: {result}"),
        None => println!("Cannot divide by zero"),
    }

    // if let — shorthand for matching one variant
    if let Some(result) = divide(10.0, 0.0) {
        println!("Result: {result}");
    } else {
        println!("Division failed");
    }

    // Common Option methods
    let x: Option<i32> = Some(42);

    x.unwrap()                     // get value or PANIC if None
    x.unwrap_or(0)                 // get value or default
    x.unwrap_or_else(|| compute()) // get value or call closure
    x.expect("should have value")  // like unwrap but with custom panic message

    x.is_some()                    // true
    x.is_none()                    // false

    x.map(|n| n * 2)               // Some(84) — transform the value inside
    x.and_then(|n| if n > 0 { Some(n) } else { None })  // chain Options
    x.filter(|n| *n > 0)          // Some(42) if condition true, else None

    // Option in structs
    struct Config {
        timeout: Option<u64>,   // timeout might not be set
    }

    let config = Config { timeout: None };
    let timeout = config.timeout.unwrap_or(30);  // default 30 seconds
}
```

---

## Result&lt;T, E&gt; — Replacing Exceptions

```rust
// Result is a built-in enum:
// enum Result<T, E> {
//     Ok(T),
//     Err(E),
// }

use std::num::ParseIntError;

fn parse_positive(s: &str) -> Result<u32, String> {
    let n: i32 = s.parse().map_err(|e: ParseIntError| e.to_string())?;
    if n < 0 {
        Err(format!("{n} is negative"))
    } else {
        Ok(n as u32)
    }
}

fn main() {
    match parse_positive("42") {
        Ok(n) => println!("Got: {n}"),
        Err(e) => println!("Error: {e}"),
    }

    // Common Result methods
    let r: Result<i32, String> = Ok(42);

    r.unwrap()                          // get value or PANIC
    r.unwrap_or(0)                      // get value or default
    r.expect("parsing failed")          // custom panic message
    r.is_ok()                           // true
    r.is_err()                          // false
    r.map(|n| n * 2)                    // Ok(84)
    r.map_err(|e| format!("err: {e}")) // transform the error
    r.ok()                              // convert to Option<T> (loses error)

    // The ? operator — propagate errors up the call stack
    // (covered in detail in the error handling page)
}
```

---

## Pattern Matching — Deep Dive

```rust
fn main() {
    // Match on literals
    let n = 5;
    match n {
        1 => println!("one"),
        2 | 3 => println!("two or three"),
        4..=9 => println!("four to nine"),
        _ => println!("other"),
    }

    // Destructure tuple
    let point = (3, -2);
    match point {
        (0, 0) => println!("origin"),
        (x, 0) | (0, x) => println!("on axis at {x}"),
        (x, y) if x == y => println!("on diagonal"),
        (x, y) => println!("at ({x}, {y})"),
    }

    // Destructure struct
    #[derive(Debug)]
    struct Point { x: i32, y: i32 }
    let p = Point { x: 3, y: 7 };
    let Point { x, y } = p;          // destructuring
    println!("x={x}, y={y}");

    match p {
        Point { x: 0, y } => println!("on y-axis at {y}"),
        Point { x, y: 0 } => println!("on x-axis at {x}"),
        Point { x, y } => println!("at ({x}, {y})"),
    }

    // Destructure enum
    enum Message {
        Quit,
        Move { x: i32, y: i32 },
        Write(String),
        ChangeColor(u8, u8, u8),
    }

    let msg = Message::Move { x: 10, y: 20 };
    match msg {
        Message::Quit => println!("quit"),
        Message::Move { x, y } => println!("move to ({x}, {y})"),
        Message::Write(text) => println!("write: {text}"),
        Message::ChangeColor(r, g, b) => println!("color: {r},{g},{b}"),
    }

    // @ bindings — bind a value while also testing it
    let n = 5;
    match n {
        x @ 1..=9 => println!("single digit: {x}"),
        x @ 10..=99 => println!("double digit: {x}"),
        x => println!("large: {x}"),
    }

    // while let — loop while pattern matches
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("{top}");
    }

    // let else — bind or return/break/continue
    let text = "42";
    let Ok(n) = text.parse::<i32>() else {
        println!("not a number");
        return;
    };
    println!("parsed: {n}");

    // Nested pattern matching
    let numbers = (2, 4, 8, 16, 32);
    match numbers {
        (first, .., last) => println!("first={first}, last={last}"),
    }

    // Ignore fields with ..
    struct Point3D { x: i32, y: i32, z: i32 }
    let p = Point3D { x: 1, y: 2, z: 3 };
    let Point3D { x, .. } = p;   // only care about x
}
```

---

## Tips

- Prefer enums over `bool` parameters in functions — `enum Direction { North, South }` is clearer than `fn go(forward: bool)`.
- `Option::unwrap()` and `Result::unwrap()` panic — use them in tests and prototyping, not production. Prefer `?`, `unwrap_or`, or `match`.
- `#[derive(Debug)]` on every struct and enum — you'll want `{:?}` for debugging immediately.
- `if let` is for when you care about one variant; `match` is for when you need to handle all variants.
- Struct update syntax (`..other`) moves remaining fields — if the struct contains non-Copy types, `other` is partially moved afterward.

---

## Summary

- Structs define named data with `impl` blocks for methods; `Self` refers to the struct type; `&self` for read, `&mut self` for write.
- Enums are sum types — a value is exactly one of several variants, each optionally carrying different data.
- `Option<T>` replaces null: `Some(value)` or `None` — always handle both with `match`, `if let`, or methods like `unwrap_or`.
- `Result<T, E>` replaces exceptions: `Ok(value)` or `Err(error)` — propagate errors with `?` operator.
- `match` is exhaustive — the compiler forces you to handle every variant. Use `_` as a catch-all.
- `#[derive(Debug, Clone, PartialEq)]` auto-implements the most common traits — always add these.
