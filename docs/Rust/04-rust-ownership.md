---
title: "Ownership and Borrowing"
sidebar_label: "Ownership & Borrowing"
sidebar_position: 4
---

# Ownership and Borrowing

Ownership is Rust's central innovation — a set of compile-time rules that make memory safety possible without a garbage collector. Everything else in Rust flows from this.

---

## The Problem Ownership Solves

```
Memory must be:
  1. Allocated  when you need it
  2. Freed      when you're done

Languages solve this three ways:
  GC (Java, Go, Python): runtime tracks references; frees when no more refs
    Downside: GC pauses, memory overhead, non-deterministic timing

  Manual (C, C++): programmer calls malloc/free
    Downside: use-after-free, double-free, leaks, buffer overflows

  Ownership (Rust): compiler tracks who owns each value; frees it when owner goes out of scope
    Downside: steeper learning curve
    Upside: no GC, no manual management, no memory bugs
```

---

## Ownership Rules

Three rules, memorise them:

```
1. Every value has exactly one owner.
2. When the owner goes out of scope, the value is dropped (freed).
3. There can only be one owner at a time.
```

---

## Move Semantics

```rust
fn main() {
    // Stack types (known size at compile time) → COPY
    let x = 5;
    let y = x;    // x is copied — both x and y are valid
    println!("{x} {y}");  // works fine

    // Heap types (unknown size or large) → MOVE
    let s1 = String::from("hello");
    let s2 = s1;   // s1 is MOVED into s2 — s1 is no longer valid

    // println!("{s1}");  // ERROR: value borrowed after move
    println!("{s2}");     // fine

    // Why? String is stored on the heap:
    //   Stack: pointer + length + capacity
    //   Heap:  "hello"
    // If both s1 and s2 were valid, Rust would free the heap data twice (double-free)
    // So ownership transfers: after move, s1 is invalid
}

// When a function takes ownership, the value is moved in
fn takes_ownership(s: String) {
    println!("{s}");
}   // s is dropped here — heap memory freed

// When a function returns a value, ownership is moved out
fn gives_ownership() -> String {
    String::from("hello")   // moved to caller
}

fn main() {
    let s = String::from("hello");
    takes_ownership(s);        // s moved into function
    // println!("{s}");        // ERROR: s was moved

    let s2 = gives_ownership();  // ownership returned to s2
    println!("{s2}");
}
```

---

## Clone — Explicit Deep Copy

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();   // explicit deep copy of heap data

    println!("{s1} {s2}"); // both valid — s1 was not moved

    // clone() is expensive — copies heap data
    // Use references instead of clone() wherever possible
}
```

---

## Copy Types

Types that implement the `Copy` trait are automatically copied (not moved).

```rust
// Copy types (all stored entirely on the stack):
// i8, i16, i32, i64, i128, isize
// u8, u16, u32, u64, u128, usize
// f32, f64
// bool
// char
// Tuples of Copy types: (i32, f64) is Copy

fn main() {
    let x: i32 = 5;
    let y = x;         // copied, not moved
    println!("{x} {y}");  // both valid

    // String is NOT Copy (heap-allocated, variable size)
    // Vec<T> is NOT Copy
    // Box<T> is NOT Copy
}
```

---

## References and Borrowing

References let you use a value without taking ownership — the most common pattern in Rust.

```rust
fn main() {
    let s = String::from("hello");

    let len = calculate_length(&s);  // pass a reference — borrow s
    println!("'{s}' has length {len}");  // s still valid here

    // s is still owned by this scope; we only lent it to the function
}

// &String = immutable reference to a String
fn calculate_length(s: &String) -> usize {
    s.len()
}   // s goes out of scope, but since it's a reference (not the owner), nothing is freed
```

### Reference Rules

```
At any given time, you can have EITHER:
  - Any number of immutable references (&T)
  - Exactly ONE mutable reference (&mut T)

Not both at the same time.
References must always be valid (no dangling references).

This rule prevents:
  - Data races: two threads writing simultaneously
  - Use-after-free: reference to freed memory
  - Iterator invalidation: mutating a collection while iterating it
```

```rust
fn main() {
    let mut s = String::from("hello");

    // Multiple immutable references — allowed
    let r1 = &s;
    let r2 = &s;
    println!("{r1} and {r2}");
    // r1 and r2 are no longer used after this point

    // One mutable reference — allowed (no other refs in scope)
    let r3 = &mut s;
    r3.push_str(", world");
    println!("{r3}");

    // These would be compile errors:
    // let r1 = &s;
    // let r2 = &mut s;   // ERROR: cannot borrow as mutable while immutable borrow exists
    // println!("{r1} {r2}");
}

// Mutable reference — function can modify the value
fn append_world(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{s}");   // "hello, world"
}
```

---

## The Slice Type

Slices are references to a contiguous sequence — they borrow part of a collection.

```rust
fn main() {
    let s = String::from("hello world");

    // String slices — &str
    let hello = &s[0..5];   // "hello"
    let world = &s[6..11];  // "world"
    let hello2 = &s[..5];   // same as [0..5]
    let world2 = &s[6..];   // same as [6..11]
    let whole = &s[..];     // entire string

    // String literals are string slices
    let literal: &str = "hello";  // stored in binary; type is &str

    // Array slices
    let a = [1, 2, 3, 4, 5];
    let slice: &[i32] = &a[1..3];  // [2, 3]
    println!("{:?}", slice);

    // Prefer &str over &String in function parameters — more flexible
    // &String can be coerced to &str automatically
}

fn first_word(s: &str) -> &str {  // works with both &String and &str
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[..i];
        }
    }
    &s[..]
}
```

---

## Dangling References — Prevented at Compile Time

```rust
// This would be a dangling pointer in C — Rust prevents it:
fn dangle() -> &String {  // ERROR: missing lifetime specifier
    let s = String::from("hello");
    &s   // s is dropped when function returns — reference would point to freed memory
}        // Rust catches this at compile time!

// Fix: return the String itself (transfer ownership)
fn no_dangle() -> String {
    let s = String::from("hello");
    s   // ownership moved to caller — valid
}
```

---

## Ownership in Practice — Common Patterns

```rust
// Pattern 1: Pass by reference to read
fn print_len(v: &Vec<i32>) {
    println!("length: {}", v.len());
}

// Pattern 2: Pass by mutable reference to modify
fn double_values(v: &mut Vec<i32>) {
    for x in v.iter_mut() {
        *x *= 2;   // dereference to modify
    }
}

// Pattern 3: Take ownership to store
struct Config {
    name: String,   // owns the String
}

impl Config {
    fn new(name: String) -> Self {   // takes ownership of name
        Config { name }
    }
}

// Pattern 4: Return ownership
fn create_greeting(name: &str) -> String {  // borrows name, returns new String
    format!("Hello, {name}!")
}

fn main() {
    let mut nums = vec![1, 2, 3];
    print_len(&nums);              // borrow immutably
    double_values(&mut nums);      // borrow mutably
    println!("{:?}", nums);        // [2, 4, 6]

    let cfg = Config::new(String::from("my-app")); // move String into Config
    let greeting = create_greeting(&cfg.name);     // borrow cfg.name
    println!("{greeting}");
}
```

---

## Tips

- When you get a "value moved" error, ask yourself: does the function really need to own the value? If not, pass `&T` instead.
- Compiler error "cannot borrow as mutable because it is also borrowed as immutable" — the fix is usually to end the immutable borrow before the mutable one starts (move the `println!` before `&mut`).
- `*` (dereference) is needed to modify through a mutable reference: `*x = 5`. For method calls, Rust auto-dereferences so you rarely need explicit `*`.
- Cloning is fine for prototyping — don't prematurely optimise. Get it working first with `clone()`, then remove clones where profiling shows it matters.

---

## Summary

- Every value has one owner; when the owner goes out of scope, the value is freed — no GC needed.
- Assignment moves non-Copy types; after a move, the original is invalid.
- Copy types (i32, bool, char, tuples of Copy types) are automatically copied on assignment.
- `&T` = immutable reference (borrow); `&mut T` = mutable reference — you can have many `&T` OR one `&mut T`, never both.
- Slices (`&[T]`, `&str`) are references to a contiguous sequence — they borrow without taking ownership.
- Rust prevents dangling references at compile time — you cannot return a reference to a local variable.
