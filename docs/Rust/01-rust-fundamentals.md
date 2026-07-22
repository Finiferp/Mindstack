---
title: "Rust Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 1
---

# Rust Fundamentals

Installation, toolchain, your first program, variables, types, and control flow — everything needed before ownership makes sense.

---

## Installation

```bash
# Install rustup (the Rust toolchain manager) — the only correct way
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# After install, restart your shell or run:
source ~/.cargo/env

# Verify
rustc --version     # rustc 1.xx.0 (...)
cargo --version     # cargo 1.xx.0 (...)
rustup --version    # rustup x.xx.x

# Update Rust (do this regularly)
rustup update

# Install useful components
rustup component add clippy       # linter (use this always)
rustup component add rustfmt      # formatter
rustup component add rust-analyzer # LSP for your editor (VS Code, Neovim, etc.)

# VS Code: install the "rust-analyzer" extension
# Neovim: use nvim-lspconfig with rust-analyzer
```

---

## Hello, World

```bash
# Create a new project
cargo new hello-world
cd hello-world

# Project structure:
# hello-world/
# ├── Cargo.toml   ← project manifest (like package.json)
# └── src/
#     └── main.rs  ← your code
```

```rust
// src/main.rs
fn main() {
    println!("Hello, world!");   // println! is a macro (! = macro, not function)
}
```

```bash
cargo run       # compile + run
cargo build     # compile only (debug build)
cargo build --release  # optimised release build (much faster binary)
```

---

## Cargo.toml

```toml
[package]
name = "hello-world"
version = "0.1.0"
edition = "2021"        # Rust edition: 2015, 2018, 2021, 2024

[dependencies]
serde = { version = "1", features = ["derive"] }   # external crate with features
reqwest = "0.11"
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
# dependencies only for tests
criterion = "0.5"

[profile.release]
opt-level = 3       # maximum optimisation
lto = true          # link-time optimisation (smaller + faster binary)
strip = true        # strip debug symbols (smaller binary)
```

---

## Variables and Mutability

```rust
fn main() {
    // Variables are IMMUTABLE by default
    let x = 5;
    // x = 6;  // ERROR: cannot assign twice to immutable variable

    // Mutable variable
    let mut y = 5;
    y = 6;    // fine

    // Constants — always immutable; must have type; evaluated at compile time
    const MAX_POINTS: u32 = 100_000;  // underscore as visual separator

    // Shadowing — re-declare a variable with the same name
    // (different from mutation — creates a new variable)
    let z = 5;
    let z = z + 1;       // z is now 6
    let z = z * 2;       // z is now 12
    let z = "hello";     // can even change type! (new variable each time)

    println!("x={x} y={y} z={z}");  // string interpolation: {variable}
}
```

---

## Scalar Types

```rust
fn main() {
    // ── Integers ──────────────────────────────────────────────────────────────
    let a: i8   = -128;           // signed 8-bit  (-128 to 127)
    let b: u8   = 255;            // unsigned 8-bit (0 to 255)
    let c: i16  = -32_768;
    let d: u16  = 65_535;
    let e: i32  = -2_147_483_648; // default integer type
    let f: u32  = 4_294_967_295;
    let g: i64  = -9_223_372_036_854_775_808;
    let h: u64  = 18_446_744_073_709_551_615;
    let i: i128 = 0;
    let j: u128 = 0;
    let k: isize = 0;  // pointer-sized signed (64-bit on 64-bit OS)
    let l: usize = 0;  // pointer-sized unsigned — used for indexing/lengths

    // Integer literals
    let decimal     = 98_222;
    let hex         = 0xff;
    let octal       = 0o77;
    let binary      = 0b1111_0000;
    let byte        = b'A';   // u8 only

    // Integer overflow in debug mode: PANIC (crash)
    // Integer overflow in release mode: wraps (use checked_add if you care)
    let checked = 255u8.checked_add(1);   // returns Option<u8> → None if overflow
    let wrapping = 255u8.wrapping_add(1); // returns 0 (wraps)
    let saturating = 255u8.saturating_add(1); // returns 255 (clamps)

    // ── Floating point ────────────────────────────────────────────────────────
    let x: f64 = 3.14;   // default float type (64-bit)
    let y: f32 = 3.14;   // 32-bit float

    // ── Boolean ───────────────────────────────────────────────────────────────
    let t: bool = true;
    let f: bool = false;

    // ── Character ─────────────────────────────────────────────────────────────
    let c: char = 'z';
    let z: char = 'ℤ';      // Unicode scalar value (4 bytes, not 1!)
    let heart: char = '❤';
}
```

---

## Compound Types

```rust
fn main() {
    // ── Tuple — fixed-length, mixed types ─────────────────────────────────────
    let tup: (i32, f64, bool) = (500, 6.4, true);

    // Destructure
    let (x, y, z) = tup;

    // Index with dot notation
    let five_hundred = tup.0;
    let six_point_four = tup.1;

    // Unit type: () — an empty tuple; means "no value" (like void)
    let unit: () = ();

    // ── Array — fixed-length, same type, stack-allocated ──────────────────────
    let arr: [i32; 5] = [1, 2, 3, 4, 5];
    let zeros: [i32; 5] = [0; 5];   // [0, 0, 0, 0, 0]

    let first = arr[0];   // index — panics at runtime if out of bounds in debug
    let len = arr.len();  // 5

    // ── Slice — view into a sequence (no ownership) ───────────────────────────
    let slice: &[i32] = &arr[1..3];   // [2, 3]
    let all: &[i32] = &arr[..];       // entire array as slice
}
```

---

## Functions

```rust
// Function syntax: fn name(param: Type, ...) -> ReturnType
fn add(a: i32, b: i32) -> i32 {
    a + b   // last expression WITHOUT semicolon = implicit return
    // equivalent to: return a + b;
}

// No return value (returns unit type ())
fn print_sum(a: i32, b: i32) {
    println!("{} + {} = {}", a, b, a + b);
}

// Multiple return values (via tuple)
fn min_max(numbers: &[i32]) -> (i32, i32) {
    let mut min = numbers[0];
    let mut max = numbers[0];
    for &n in numbers {
        if n < min { min = n; }
        if n > max { max = n; }
    }
    (min, max)
}

fn main() {
    let sum = add(3, 4);
    let (min, max) = min_max(&[3, 1, 4, 1, 5, 9, 2, 6]);
    println!("sum={sum}, min={min}, max={max}");
}

// Diverging functions — never return (return type is !)
fn crash(msg: &str) -> ! {
    panic!("{}", msg);   // panic! aborts the thread
}
```

---

## Control Flow

```rust
fn main() {
    // ── if / else if / else ───────────────────────────────────────────────────
    let n = 7;

    // if is an expression — can return a value
    let description = if n < 0 {
        "negative"
    } else if n == 0 {
        "zero"
    } else {
        "positive"
    };

    // ── loop ──────────────────────────────────────────────────────────────────
    let mut count = 0;
    let result = loop {
        count += 1;
        if count == 10 {
            break count * 2;  // loop returns a value via break
        }
    };

    // Loop labels (for nested loops)
    'outer: loop {
        loop {
            break 'outer;   // break the outer loop
        }
    }

    // ── while ─────────────────────────────────────────────────────────────────
    let mut n = 3;
    while n != 0 {
        println!("{n}");
        n -= 1;
    }

    // ── for ───────────────────────────────────────────────────────────────────
    let arr = [10, 20, 30, 40, 50];

    for element in arr {
        println!("{element}");
    }

    for i in 0..5 {       // 0, 1, 2, 3, 4  (exclusive end)
        print!("{i} ");
    }

    for i in 0..=5 {      // 0, 1, 2, 3, 4, 5  (inclusive end)
        print!("{i} ");
    }

    for (i, val) in arr.iter().enumerate() {
        println!("arr[{i}] = {val}");
    }

    // ── match ─────────────────────────────────────────────────────────────────
    // match is exhaustive — you MUST handle all cases
    let n = 3;
    match n {
        1 => println!("one"),
        2 | 3 => println!("two or three"),   // | = or
        4..=9 => println!("four through nine"),
        _ => println!("something else"),     // _ = catch-all (like default)
    }

    // match is an expression
    let msg = match n {
        1 => "one",
        2 => "two",
        _ => "other",
    };

    // match on multiple values
    let pair = (true, 42);
    match pair {
        (true, x) if x > 0 => println!("true and positive: {x}"),
        (true, _) => println!("true"),
        (false, _) => println!("false"),
    }
}
```

---

## Printing and Formatting

```rust
fn main() {
    // println! — print with newline
    // print!   — print without newline
    // eprintln! — print to stderr

    let name = "Alice";
    let age = 30;
    let pi = 3.14159;

    println!("Hello, {name}!");          // variable interpolation (Rust 1.58+)
    println!("Hello, {}!", name);        // positional
    println!("{0} is {1}, {0}!", name, age);  // indexed
    println!("{name:>10}");              // right-align in 10 chars
    println!("{name:<10}");              // left-align
    println!("{name:^10}");              // center
    println!("{name:*^10}");             // center with * padding: ***Alice***
    println!("{pi:.2}");                 // 2 decimal places: 3.14
    println!("{age:05}");                // zero-pad: 00030
    println!("{age:b}");                 // binary
    println!("{age:x}");                 // hex lowercase
    println!("{age:X}");                 // hex uppercase
    println!("{age:o}");                 // octal
    println!("{:?}", (1, "hello", true)); // debug format
    println!("{:#?}", vec![1, 2, 3]);    // pretty debug format

    // format! — returns a String instead of printing
    let s = format!("Hello, {name}! You are {age}.");

    // dbg! — debug macro; prints file/line/value to stderr; returns the value
    let x = dbg!(5 + 3);   // [src/main.rs:25] 5 + 3 = 8
}
```

---

## Tips

- Use `cargo clippy` constantly — it catches hundreds of common mistakes and suggests more idiomatic code. It's much stricter than the compiler.
- Use `cargo fmt` before every commit — Rust has one official code style; there's no debate about formatting.
- Prefer `usize` for collection indices and lengths; `i32` as the general default for integers.
- The `_` prefix suppresses unused variable warnings: `let _unused = compute();` — useful during development.
- `dbg!()` is your best friend during debugging — it prints the expression, file, and line, then returns the value so you can wrap any expression with it.

---

## Summary

- Install via `rustup`; manage projects with `cargo new`, `cargo run`, `cargo build --release`.
- Variables are immutable by default; `mut` makes them mutable; `const` is a compile-time constant.
- Integer types: `i32` default, `u8`/`usize` common; overflow panics in debug, wraps in release.
- Functions return the last expression without a semicolon; `-> !` means the function never returns.
- `match` is exhaustive and an expression — must handle all cases; the compiler enforces this.
- `println!("Hello {name}")` — variable interpolation; `{:?}` for debug, `{:#?}` for pretty debug.
