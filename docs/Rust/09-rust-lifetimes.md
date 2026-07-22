---
title: "Lifetimes"
sidebar_label: "Lifetimes"
sidebar_position: 9
---

# Lifetimes

Lifetimes are annotations that tell the borrow checker how long references are valid. They prevent dangling references at compile time. Most of the time the compiler infers them — you only write them when it can't.

---

## Why Lifetimes Exist

```rust
// This is the problem lifetimes solve:
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
// ERROR: missing lifetime specifier
// The compiler asks: how long is the returned reference valid?
// It could be as long as x, or as long as y — the compiler can't know which.

// Fix: lifetime annotations tell the compiler they're all tied together
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
// 'a means: the returned reference lives at least as long as
// the shorter of x and y's lifetimes.
```

---

## Lifetime Annotation Syntax

```rust
// 'a is a lifetime parameter — by convention, single lowercase letters
// &i32        — a reference (no explicit lifetime)
// &'a i32     — a reference with lifetime 'a
// &'a mut i32 — a mutable reference with lifetime 'a
// &'static str — lives for the entire program duration

fn main() {
    let s1 = String::from("long string");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(s1.as_str(), s2.as_str());
        println!("The longest string is: {result}");
        // result can only be used here — s2 goes out of scope at the end of this block
    }
    // println!("{result}");  // ERROR: s2 (which result might point to) is dropped
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

---

## Lifetimes in Structs

When a struct holds a reference, it needs a lifetime annotation.

```rust
// This struct holds a reference — it cannot outlive the data it references
#[derive(Debug)]
struct Excerpt<'a> {
    part: &'a str,    // 'a = the struct lives no longer than this reference
}

impl<'a> Excerpt<'a> {
    fn level(&self) -> i32 { 3 }

    fn announce(&self, announcement: &str) -> &str {
        println!("Attention: {announcement}");
        self.part   // returns a reference with lifetime 'a
    }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence;
    {
        let i = novel.find('.').unwrap_or(novel.len());
        first_sentence = &novel[..i];
    }
    let excerpt = Excerpt { part: first_sentence };
    println!("{:?}", excerpt);
    // excerpt.part borrows from novel, which lives long enough — fine
}
```

---

## Lifetime Elision Rules

The compiler applies three rules to infer lifetimes. If all references can be resolved, no annotations needed.

```rust
// Rule 1: Each reference parameter gets its own lifetime
fn foo(x: &str) -> &str { x }
// Compiler sees: fn foo<'a>(x: &'a str) -> &'a str

// Rule 2: If there's exactly one input lifetime, it's assigned to all outputs
fn first_word(s: &str) -> &str {
    &s[..s.find(' ').unwrap_or(s.len())]
}
// Compiler infers: fn first_word<'a>(s: &'a str) -> &'a str — no annotation needed

// Rule 3: If one of the inputs is &self or &mut self,
// the self lifetime is assigned to all output references
impl<'a> Excerpt<'a> {
    fn announce_and_return(&self, announcement: &str) -> &str {
        println!("{announcement}");
        self.part   // compiler assigns self's lifetime to return — no annotation needed
    }
}

// When elision fails — you MUST annotate:
fn longest(x: &str, y: &str) -> &str { ... }
// Two input lifetimes → can't apply rule 2 → must annotate
```

---

## 'static — Forever References

```rust
// 'static means the reference is valid for the entire program duration
// String literals are 'static (stored in the binary)
let s: &'static str = "I live forever";

// Common in error messages and type bounds
fn create_error() -> &'static str {
    "something went wrong"
}

// 'static bound on a generic type — the type itself must own all its data
// (it contains no references, or only 'static references)
fn spawn_thread<T: Send + 'static>(value: T) {
    std::thread::spawn(move || {
        println!("{:?}", value);
    });
}
// This ensures the thread can safely own T independently of any other scope
```

---

## Multiple Lifetimes

```rust
// Different lifetimes for different inputs
fn first_or_default<'a, 'b>(
    items: &'a [String],
    default: &'b str,
) -> &'a str    // return lives as long as 'a (items), not 'b
{
    items.first().map(String::as_str).unwrap_or(default)
}
// Note: this wouldn't compile as written because we're returning &'b str sometimes
// This illustrates that lifetimes can get complex — restructuring is often cleaner

// A common pattern: returning either self or a parameter
struct Parser<'input> {
    input: &'input str,
    pos: usize,
}

impl<'input> Parser<'input> {
    fn new(input: &'input str) -> Self {
        Parser { input, pos: 0 }
    }

    fn next_token(&mut self) -> Option<&'input str> {
        // Returns a slice of the original input — lives as long as the input
        let start = self.pos;
        while self.pos < self.input.len()
            && !self.input.as_bytes()[self.pos].is_ascii_whitespace()
        {
            self.pos += 1;
        }
        if start == self.pos {
            None
        } else {
            let token = &self.input[start..self.pos];
            self.pos += 1; // skip whitespace
            Some(token)
        }
    }
}

fn main() {
    let input = String::from("hello world foo bar");
    let mut parser = Parser::new(&input);
    while let Some(token) = parser.next_token() {
        println!("{token}");
    }
}
```

---

## Lifetime Bounds on Generics

```rust
// T: 'a means T must live at least as long as 'a
// (T is valid for the duration 'a)
struct Important<'a, T: 'a> {
    data: &'a T,
}

// T: 'static means T owns all its data (no borrowed references inside)
fn print_forever<T: std::fmt::Debug + 'static>(value: T) {
    std::thread::spawn(move || println!("{value:?}"));
}

// In practice, you need T: 'static when:
//   - Storing T in a thread
//   - Returning T from an async function
//   - Storing T in something with a 'static lifetime

fn main() {
    print_forever(42i32);           // i32 is 'static — fine
    print_forever(String::from("hello"));  // String owns its data — fine
    // print_forever(&s);           // &s is NOT 'static — lifetime of s
}
```

---

## Practical Patterns — When You See Lifetime Errors

```rust
// Common error: returning reference to local variable
fn bad() -> &str {           // ERROR
    let s = String::from("hello");
    &s   // s is dropped at end of function — dangling reference!
}
// Fix: return owned String instead of reference
fn good() -> String {
    String::from("hello")
}

// Common error: reference outlives the data
fn main() {
    let result;
    {
        let s = String::from("hello");
        result = &s;   // ERROR: s doesn't live long enough
    }
    println!("{result}");   // s is already dropped here
}
// Fix: move s out of the inner block, or don't use a reference at all

// Common error: struct holding reference to data that could be dropped
struct Config<'a> {
    name: &'a str,
}
fn make_config() -> Config<'_> {  // ERROR: borrows from local
    let s = String::from("my-app");
    Config { name: &s }            // s dropped here!
}
// Fix: use owned String
struct Config {
    name: String,
}

// When lifetimes get complicated — clone or restructure
// "When in doubt, clone" is fine for correctness, then optimise later
```

---

## Tips

- If the compiler asks for a lifetime annotation, first ask whether the function should return an owned type instead of a reference — often that's the cleaner solution.
- Most lifetime annotations are on struct definitions (when the struct holds references) — function lifetimes are usually inferred.
- When you see `T: 'static` in a type bound, it means "T must own all its data" — not literally that T lives forever.
- `&'static str` (string literals) is the most common `'static` reference you'll work with day-to-day.
- Ownership issues and lifetime issues often have the same root cause — restructuring data ownership usually resolves both.

---

## Summary

- Lifetimes annotate how long references are valid — the compiler uses them to prevent dangling references.
- Syntax: `'a` — a single lowercase lifetime parameter; `&'a T` — a reference with lifetime `'a`.
- Lifetime elision: the compiler infers lifetimes in most function signatures (one input = propagate to output; `&self` = propagate to output).
- Structs holding references need lifetime parameters: `struct Foo<'a> { x: &'a str }`.
- `'static` means valid for the entire program — string literals are `'static`; `T: 'static` means T owns all its data.
- When lifetimes get complex, consider returning owned values instead of references — simpler design, no annotation needed.
