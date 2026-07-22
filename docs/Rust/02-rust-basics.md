---
title: "Rust Basics — Syntax, Output, Operators, Scope"
sidebar_label: "Basics"
sidebar_position: 2
---

# Rust Basics — Syntax, Output, Operators, Scope

The ground-level syntax details: how Rust code is structured, how output works, all operators, and how variable scope works. These are the building blocks before ownership makes sense.

**W3Schools reference:** [w3schools.com/rust](https://www.w3schools.com/rust/)
**Book Ch 3:** [doc.rust-lang.org/book/ch03-00-common-programming-concepts.html](https://doc.rust-lang.org/book/ch03-00-common-programming-concepts.html)

---

## Syntax Rules

```rust
fn main() {
    // Every executable Rust program needs fn main() — the entry point
    // Statements end with a semicolon ;
    // Expressions do NOT end with a semicolon (they return a value)
    // Code blocks are delimited by { }
    // Rust is case-sensitive: 'name' and 'Name' are different

    let x = 5;           // statement — binds a value, returns nothing
    let y = {
        let a = 3;
        a + 1            // expression — no semicolon; evaluates to 4
    };                   // y = 4

    // Snake_case for variables and functions (enforced by compiler warning)
    let my_variable = 10;
    fn my_function() {}

    // PascalCase for types, structs, enums, traits
    struct MyStruct {}
    enum MyEnum {}

    // SCREAMING_SNAKE_CASE for constants
    const MAX_SIZE: usize = 100;
}
```

---

## Output

```rust
fn main() {
    // println! — print with newline (most common)
    println!("Hello, World!");

    // print! — print WITHOUT newline
    print!("Hello, ");
    print!("World!");
    println!();  // just a newline

    // eprintln! — print to stderr (for errors and diagnostics)
    eprintln!("Error: something went wrong");

    // Placeholders
    let name = "Alice";
    let age = 30;
    let score = 98.6_f64;

    println!("Name: {}", name);            // positional
    println!("Name: {name}");             // inline variable (Rust 1.58+)
    println!("{0} is {1}. {0} likes Rust.", name, age);  // indexed

    // Format specifiers
    println!("{:.2}", score);             // 98.60  (2 decimal places)
    println!("{:10}", name);             // "Alice     " (pad right to 10)
    println!("{:>10}", name);            // "     Alice" (right-align)
    println!("{:^10}", name);            // "  Alice   " (center)
    println!("{:0>5}", 42);             // "00042"    (zero-pad)
    println!("{:b}", 42);               // "101010"   (binary)
    println!("{:o}", 42);               // "52"       (octal)
    println!("{:x}", 255);              // "ff"       (hex lowercase)
    println!("{:X}", 255);              // "FF"       (hex uppercase)
    println!("{:e}", 1_000_000.0_f64);  // "1e6"     (scientific)
    println!("{:?}", (1, "hi", true));   // "(1, \"hi\", true)" debug
    println!("{:#?}", vec![1,2,3]);      // pretty debug

    // format! — build a String instead of printing
    let s = format!("Hello, {name}! You are {age}.");

    // dbg! — print value + file/line to stderr, returns the value
    let val = dbg!(2 + 2);  // [src/main.rs:35] 2 + 2 = 4
    // val == 4 — dbg! returns the value so you can wrap any expression
}
```

---

## Comments

```rust
fn main() {
    // Single-line comment — everything after // is ignored

    /* Multi-line comment
       spans multiple lines
       not commonly used in Rust (prefer //)  */

    let x = 5; // inline comment — after code on the same line

    // Nested block comments work in Rust (unlike C):
    /* outer /* inner */ still outer */
}

/// Doc comment — generates documentation (use for public API items)
/// Supports Markdown formatting.
///
/// # Examples
///
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

//! Module-level doc comment (inner doc comment)
//! Use at the top of a file to document the whole module.
```

---

## Variables and Constants

```rust
fn main() {
    // let — immutable by default
    let x = 5;
    // x = 6;  // ERROR: cannot assign twice to immutable variable

    // let mut — mutable
    let mut count = 0;
    count += 1;
    count += 1;
    println!("{count}");  // 2

    // Shadowing — redeclare with same name (creates a new variable)
    let spaces = "   ";        // &str
    let spaces = spaces.len(); // usize — different type is fine!
    println!("{spaces}");      // 3

    // const — compile-time constant; MUST have a type annotation
    const MAX_SCORE: u32 = 100_000;
    const PI: f64 = 3.14159265358979;
    // const values cannot be computed at runtime
    // const MAX: usize = some_fn();  // ERROR if some_fn() isn't const

    // static — global variable; lives for the entire program
    static GREETING: &str = "Hello";
    static mut COUNTER: u32 = 0;  // mutable static requires unsafe to access

    // Type inference — Rust infers the type from the value
    let x = 42;        // inferred: i32
    let y = 3.14;      // inferred: f64
    let z = true;      // inferred: bool
    let s = "hello";   // inferred: &str

    // Explicit type annotation
    let x: i64 = 42;
    let y: f32 = 3.14;
}
```

---

## Data Types Reference

```rust
fn main() {
    // ── Integers ─────────────────────────────────────────────────────────────
    // Signed:   i8  i16  i32(default)  i64  i128  isize
    // Unsigned: u8  u16  u32           u64  u128  usize
    let a: i32 = -2_147_483_648;   // min i32
    let b: u8  = 255;              // max u8
    let c: usize = 42;             // pointer-sized; used for indices

    // Integer literals
    let dec = 1_000_000;           // decimal with _ separator
    let hex = 0xFF;                // hexadecimal
    let oct = 0o77;                // octal
    let bin = 0b1010_1010;        // binary
    let byt = b'A';                // byte literal (u8 only) = 65

    // ── Floats ───────────────────────────────────────────────────────────────
    let f64_val: f64 = 3.14;       // default float
    let f32_val: f32 = 3.14;
    let inf = f64::INFINITY;
    let nan = f64::NAN;
    println!("{}", f64::MAX);      // 1.7976931348623157e308

    // ── Boolean ──────────────────────────────────────────────────────────────
    let t: bool = true;
    let f: bool = false;
    // if condition must be a bool — Rust never coerces integers to bool
    if t { println!("true"); }
    // if 1 { }  // ERROR: expected bool, found integer

    // ── Character ─────────────────────────────────────────────────────────────
    let c: char = 'z';
    let emoji: char = '🦀';      // Rust char = Unicode scalar value (4 bytes)
    println!("Is alphabetic: {}", c.is_alphabetic());
    println!("Uppercase: {}", 'a'.to_uppercase().next().unwrap());

    // Type casting with 'as'
    let x: i32 = 42;
    let y: f64 = x as f64;        // i32 → f64
    let z: u8  = 300i32 as u8;    // 300 % 256 = 44 (truncates — be careful)
    let b: bool = false;
    // let n = b as i32;           // ERROR: cannot cast bool to i32
    let n = if b { 1i32 } else { 0 };  // idiomatic instead
}
```

---

## Operators

```rust
fn main() {
    // ── Arithmetic ────────────────────────────────────────────────────────────
    let a = 10;
    let b = 3;
    println!("{}", a + b);   // 13  addition
    println!("{}", a - b);   // 7   subtraction
    println!("{}", a * b);   // 30  multiplication
    println!("{}", a / b);   // 3   integer division (truncates)
    println!("{}", a % b);   // 1   remainder
    // No ++ or -- in Rust; use += 1 and -= 1
    let mut x = 5;
    x += 1;   // 6
    x -= 1;   // 5
    x *= 2;   // 10
    x /= 3;   // 3
    x %= 2;   // 1

    // Float division
    let c = 10.0_f64 / 3.0;  // 3.3333...
    let d = 10.0_f64 % 3.0;  // 1.0

    // Power — no ** operator; use .pow() or .powi() / .powf()
    let p = 2_i32.pow(10);         // 1024 (integer power)
    let q = 2.0_f64.powf(0.5);    // 1.414... (square root via power)
    let r = 2.0_f64.sqrt();        // 1.414... (dedicated sqrt)

    // ── Comparison ───────────────────────────────────────────────────────────
    println!("{}", 5 == 5);   // true   equal
    println!("{}", 5 != 4);   // true   not equal
    println!("{}", 5 > 3);    // true   greater than
    println!("{}", 5 < 3);    // false  less than
    println!("{}", 5 >= 5);   // true   greater than or equal
    println!("{}", 5 <= 4);   // false  less than or equal
    // Returns bool; always use == for equality (no single = comparisons)

    // ── Logical ──────────────────────────────────────────────────────────────
    println!("{}", true && false);  // false  logical AND (short-circuits)
    println!("{}", true || false);  // true   logical OR  (short-circuits)
    println!("{}", !true);          // false  logical NOT

    // ── Bitwise ──────────────────────────────────────────────────────────────
    let x: u8 = 0b1010_1010;
    let y: u8 = 0b1100_1100;
    println!("{:08b}", x & y);   // 10001000  AND
    println!("{:08b}", x | y);   // 11101110  OR
    println!("{:08b}", x ^ y);   // 01100110  XOR
    println!("{:08b}", !x);      // 01010101  NOT
    println!("{:08b}", x << 1);  // 01010100  left shift
    println!("{:08b}", x >> 1);  // 01010101  right shift

    // ── Range operators ──────────────────────────────────────────────────────
    let r1 = 0..5;      // 0,1,2,3,4    (exclusive end)
    let r2 = 0..=5;     // 0,1,2,3,4,5  (inclusive end)
    for i in 0..5 { print!("{i} "); }
    println!();
    // Ranges implement Iterator — all iterator methods work
    let sum: i32 = (1..=100).sum();  // 5050

    // ── Reference operators ──────────────────────────────────────────────────
    let x = 5;
    let r = &x;      // & = borrow (create a reference)
    let v = *r;      // * = dereference (get the value)
    println!("{r} {v}");   // Rust auto-derefs in most contexts

    // ── Operator precedence (high to low) ────────────────────────────────────
    // Method calls, field access: a.b()
    // Unary: -x, !x, *x, &x
    // as (casting)
    // * / %
    // + -
    // << >>
    // &
    // ^
    // |
    // == != < > <= >=
    // &&
    // ||
    // .. ..=
    // = += -= etc.
    // Use parentheses when in doubt
    let result = 2 + 3 * 4;   // 14 (not 20) — * before +
}
```

---

## Booleans

```rust
fn main() {
    let is_active = true;
    let is_admin = false;

    // Boolean operations
    let can_edit = is_active && is_admin;   // both must be true
    let can_view = is_active || is_admin;   // at least one true
    let is_inactive = !is_active;           // flip

    // if / else if / else
    let score = 75;
    let grade = if score >= 90 {
        'A'
    } else if score >= 80 {
        'B'
    } else if score >= 70 {
        'C'
    } else {
        'F'
    };
    println!("Grade: {grade}");

    // Booleans in match
    let age = 20;
    let can_vote = age >= 18;
    match can_vote {
        true  => println!("You can vote"),
        false => println!("Too young to vote"),
    }

    // Short-circuit evaluation
    fn expensive() -> bool { println!("evaluated!"); true }

    false && expensive();  // "evaluated!" NOT printed — short-circuits
    true  || expensive();  // "evaluated!" NOT printed — short-circuits
    true  && expensive();  // "evaluated!" IS printed
}
```

---

## Scope and Shadowing

```rust
fn main() {
    // Scope: a variable lives from where it's declared to the end of its block {}
    let x = 5;
    {
        let y = 10;
        println!("{x} {y}");  // both accessible here
    }
    // println!("{y}");  // ERROR: y is out of scope

    // Each { } creates a new scope
    // When a value goes out of scope, Rust calls drop() — memory freed

    // Shadowing — re-declare with same name in same or inner scope
    let x = 5;
    let x = x + 1;       // shadows previous x; x is now 6
    {
        let x = x * 2;   // shadows outer x inside this block; x is 12
        println!("inner x: {x}");  // 12
    }
    println!("outer x: {x}");      // 6 — inner shadow gone

    // Shadowing vs mut:
    // mut: same variable, same type, value changes
    // shadow: new variable, CAN change type

    let spaces = "   ";        // &str
    let spaces = spaces.len(); // usize — type change via shadow (impossible with mut)

    // Function scope
    fn greet(name: &str) {
        // 'name' lives only inside this function
        println!("Hello, {name}!");
    }  // name dropped here

    greet("Alice");

    // Block as expression — useful for limiting scope of temporaries
    let message = {
        let part1 = "Hello";
        let part2 = "World";
        format!("{part1}, {part2}!")  // no semicolon — this is the value
    };
    // part1 and part2 are no longer accessible here
    println!("{message}");
}
```

---

## Strings — &str vs String

```rust
fn main() {
    // Two string types in Rust:

    // &str — string slice; borrowed; immutable; usually from a literal
    let s1: &str = "Hello, World!";  // stored in program binary; 'static lifetime
    let s2 = "also a &str";

    // String — owned; heap-allocated; growable; mutable
    let s3 = String::from("Hello");
    let s4 = "World".to_string();
    let s5 = "data".to_owned();
    let mut s6 = String::new();        // empty String

    // String → &str (cheap — just a slice of the heap data)
    let slice: &str = &s3;
    let slice: &str = &s3[0..3];      // "Hel"
    let slice: &str = s3.as_str();

    // &str → String (allocates a copy on the heap)
    let owned: String = s1.to_string();
    let owned: String = String::from(s1);

    // Mutating a String
    let mut s = String::from("Hello");
    s.push(' ');                    // push a char
    s.push_str("World");           // push a &str
    s += "!";                       // += with &str
    println!("{s}");               // "Hello World!"

    // Concatenation with format! (most readable for multiple strings)
    let s1 = String::from("Hello, ");
    let s2 = String::from("World!");
    let s3 = format!("{s1}{s2}");  // s1 and s2 still valid
    let s4 = s1 + &s2;            // s1 is MOVED; s2 is borrowed

    // String length — bytes, not characters!
    let hello_en = "Hello";
    let hello_ru = "Привет";
    println!("{}", hello_en.len()); // 5 (5 bytes = 5 ASCII chars)
    println!("{}", hello_ru.len()); // 12 (12 bytes; 6 Cyrillic chars × 2 bytes each)
    println!("{}", hello_ru.chars().count()); // 6 — correct character count

    // Indexing — NEVER index a String by integer (could split a multi-byte char)
    // let c = hello_ru[0];  // ERROR: can't index String directly
    let c = &hello_ru[0..2];       // first 2 bytes — "П" in UTF-8
    let c = hello_ru.chars().nth(0); // Option<char> — safe way to get char

    // Common String methods
    let s = String::from("  Hello, World!  ");
    s.len()
    s.is_empty()
    s.contains("World")
    s.starts_with("  H")
    s.ends_with("!  ")
    s.trim()                       // "Hello, World!" — remove whitespace
    s.to_lowercase()               // "  hello, world!  "
    s.to_uppercase()               // "  HELLO, WORLD!  "
    s.replace("World", "Rust")    // "  Hello, Rust!  "
    s.split(", ").collect::<Vec<_>>()  // ["  Hello", "World!  "]
    s.chars().count()              // char count
    s.bytes().count()              // byte count (same as .len())
    s.is_ascii()                   // true if all chars are ASCII
    "42".parse::<i32>().unwrap()  // parse string to number

    // Raw strings — no escape processing
    let raw = r"No \n escape here";
    let raw_with_quotes = r#"Can include "quotes" freely"#;
    let multiline = r#"
        line one
        line two
    "#;
}
```

---

## Tips

- Use `&str` for function parameters almost always — it accepts both `&String` and `&str` (Rust auto-derefs). Only take `String` when you need to store or own it.
- Use `format!()` to build strings from multiple pieces — cleaner than repeated `push_str` or `+`.
- Remember `len()` returns **bytes**, not characters — always use `.chars().count()` for Unicode-correct character counting.
- Operator `%` is remainder, not modulo — for negative numbers: `-7 % 3 == -1` in Rust (not `2`). Use `.rem_euclid()` for true modulo.
- Shadowing is idiomatic for type transformations (`let x = x.parse::<i32>()`) — cleaner than inventing a new name.

---

## Summary

- `fn main()` is the entry point; statements end with `;`; expressions don't.
- `println!("{var}")` inline interpolation; `{:?}` debug; `{:.2}` decimal places; `{:>10}` alignment.
- Variables are immutable by default (`let`); mutable with `let mut`; compile-time with `const`.
- Shadowing re-declares a variable with the same name — can change type; different from `mut`.
- Operators: arithmetic (`+ - * / %`), comparison (`== != < > <= >=`), logical (`&& || !`), bitwise (`& | ^ ! << >>`), range (`..` and `..=`).
- `&str` = borrowed string slice (cheap, immutable); `String` = owned heap string (mutable, growable). Use `&str` in function parameters.
