---
title: "Closures and Iterators"
sidebar_label: "Closures & Iterators"
sidebar_position: 10
---

# Closures and Iterators

Closures are anonymous functions that capture their environment. Combined with iterators they form Rust's most expressive and zero-cost abstraction layer.

---

## Closures

```rust
fn main() {
    // Basic closure syntax
    let add = |a, b| a + b;           // types inferred
    let add = |a: i32, b: i32| -> i32 { a + b };  // explicit types
    let square = |x: i32| x * x;     // single expression, no braces needed
    let greet = |name| {              // multi-line closure
        let msg = format!("Hello, {name}!");
        println!("{msg}");
        msg
    };

    println!("{}", add(3, 4));      // 7
    println!("{}", square(5));      // 25
    let msg = greet("Alice");

    // Closures capture their environment (unlike functions)
    let threshold = 10;
    let is_large = |n| n > threshold;  // captures 'threshold' from scope

    println!("{}", is_large(15));   // true
    println!("{}", is_large(5));    // false
}
```

---

## Capture Modes

```rust
fn main() {
    let mut count = 0;

    // Immutable capture (borrows the value)
    let print_count = || println!("count: {count}");
    print_count();
    print_count();
    // count can still be used here — only borrowed immutably

    // Mutable capture (mutably borrows)
    let mut increment = || { count += 1; };
    increment();
    increment();
    // count can be used after the closure is no longer in use

    // Move capture — closure OWNS the captured value
    let name = String::from("Alice");
    let greet = move || println!("Hello, {name}!");  // name moved into closure
    greet();
    // println!("{name}");  // ERROR: name was moved into the closure

    // move is required when sending closures to threads
    let data = vec![1, 2, 3];
    let handle = std::thread::spawn(move || {
        println!("{:?}", data);   // data moved into thread
    });
    handle.join().unwrap();
}
```

---

## Closure Traits: Fn, FnMut, FnOnce

```rust
// Rust has three closure traits depending on how the closure uses captured values:

// FnOnce — can be called once (consumes captured values)
fn call_once<F: FnOnce()>(f: F) { f(); }

// FnMut — can be called multiple times; may mutate captured values
fn call_many<F: FnMut()>(mut f: F) { f(); f(); f(); }

// Fn — can be called multiple times; only immutably accesses captured values
fn call_with_ref<F: Fn()>(f: F) { f(); f(); }

// Every closure implements FnOnce.
// Closures that don't consume captured values also implement FnMut.
// Closures that don't mutate captured values also implement Fn.

fn apply<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(f(x))
}

fn main() {
    let double = |x| x * 2;
    println!("{}", apply(double, 5));        // 10
    println!("{}", apply_twice(double, 3));  // 12  (3 * 2 * 2)

    // Returning closures from functions — must be boxed (size unknown at compile time)
    fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
        move |x| x + n   // 'n' captured by move
    }

    let add5 = make_adder(5);
    let add10 = make_adder(10);
    println!("{}", add5(3));   // 8
    println!("{}", add10(3));  // 13

    // When the return type needs to be dynamic (different closure types):
    fn make_op(add: bool) -> Box<dyn Fn(i32) -> i32> {
        if add {
            Box::new(|x| x + 1)
        } else {
            Box::new(|x| x - 1)
        }
    }
}
```

---

## Iterators In Depth

```rust
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // ── Transforming ──────────────────────────────────────────────────────────
    let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();

    let strings: Vec<String> = v.iter().map(|x| x.to_string()).collect();

    // flat_map — map then flatten (one level)
    let words = vec!["hello world", "foo bar"];
    let chars: Vec<&str> = words.iter()
        .flat_map(|s| s.split_whitespace())
        .collect();
    // ["hello", "world", "foo", "bar"]

    // flatten — flatten one level of nesting
    let nested = vec![vec![1, 2], vec![3, 4], vec![5]];
    let flat: Vec<i32> = nested.into_iter().flatten().collect();
    // [1, 2, 3, 4, 5]

    // ── Filtering ─────────────────────────────────────────────────────────────
    let evens: Vec<&i32> = v.iter().filter(|&&x| x % 2 == 0).collect();

    // filter_map — filter and transform in one step (return Option)
    let strings = vec!["1", "two", "3", "four", "5"];
    let numbers: Vec<i32> = strings.iter()
        .filter_map(|s| s.parse().ok())
        .collect();
    // [1, 3, 5]

    // ── Taking and skipping ───────────────────────────────────────────────────
    let first_three: Vec<&i32> = v.iter().take(3).collect();       // [1, 2, 3]
    let after_three: Vec<&i32> = v.iter().skip(3).collect();       // [4, 5, 6, 7, 8, 9, 10]
    let middle: Vec<&i32> = v.iter().skip(2).take(3).collect();    // [3, 4, 5]

    // take_while / skip_while
    let until_five: Vec<&i32> = v.iter().take_while(|&&x| x < 5).collect(); // [1,2,3,4]
    let from_five: Vec<&i32> = v.iter().skip_while(|&&x| x < 5).collect();  // [5,6,7,8,9,10]

    // ── Combining ─────────────────────────────────────────────────────────────
    let a = vec![1, 2, 3];
    let b = vec![4, 5, 6];
    let combined: Vec<i32> = a.iter().chain(b.iter()).copied().collect(); // [1,2,3,4,5,6]

    // zip — pairs elements from two iterators
    let names = vec!["Alice", "Bob", "Carol"];
    let scores = vec![100, 85, 92];
    let paired: Vec<(&&str, &i32)> = names.iter().zip(scores.iter()).collect();
    // [("Alice", 100), ("Bob", 85), ("Carol", 92)]

    // unzip — split an iterator of pairs into two collections
    let (names2, scores2): (Vec<&&str>, Vec<&i32>) = paired.into_iter().unzip();

    // ── Inspecting ────────────────────────────────────────────────────────────
    // inspect — peek at elements without consuming (great for debugging)
    let sum: i32 = v.iter()
        .inspect(|&&x| print!("{x} "))    // print each element as it passes through
        .filter(|&&x| x % 2 == 0)
        .inspect(|&&x| print!("→{x} "))   // print filtered elements
        .sum();
    println!("\nsum of evens: {sum}");

    // enumerate — add index
    for (i, val) in v.iter().enumerate() {
        println!("[{i}] = {val}");
    }

    // ── Consuming ─────────────────────────────────────────────────────────────
    let sum: i32 = v.iter().sum();
    let product: i32 = v.iter().product();
    let count = v.iter().count();
    let max = v.iter().max();          // Option<&i32>
    let min = v.iter().min();
    let max_by_key = v.iter().max_by_key(|&&x| x % 3);

    let any_over_five = v.iter().any(|&x| x > 5);
    let all_positive = v.iter().all(|&x| x > 0);
    let first_even = v.iter().find(|&&x| x % 2 == 0);   // Option<&i32>
    let pos_of_five = v.iter().position(|&x| x == 5);   // Option<usize>

    // fold — reduce to a single value with explicit accumulator
    let sum = v.iter().fold(0, |acc, &x| acc + x);
    let factorial = (1..=5).fold(1u64, |acc, x| acc * x as u64);  // 120

    // reduce — like fold but uses first element as initial accumulator
    let sum = v.iter().copied().reduce(|acc, x| acc + x);  // Option<i32>
}
```

---

## Collecting Into Different Types

```rust
use std::collections::{HashMap, HashSet};

fn main() {
    let v = vec![1, 2, 3, 2, 1, 4];

    // Vec — most common
    let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();

    // HashSet — deduplicate
    let unique: HashSet<i32> = v.iter().copied().collect();  // {1, 2, 3, 4}

    // HashMap — from (key, value) pairs
    let words = vec!["hello", "world", "rust"];
    let word_lengths: HashMap<&str, usize> = words.iter()
        .map(|&w| (w, w.len()))
        .collect();

    // String — joining chars or strings
    let chars: String = "hello".chars().filter(|c| c != &'l').collect();
    // "heo"
    let joined: String = vec!["a", "b", "c"].join(", ");
    // "a, b, c"

    // Partition — split into two Vec based on predicate
    let (evens, odds): (Vec<i32>, Vec<i32>) = (1..=10).partition(|&x| x % 2 == 0);

    // Result collection — all-or-nothing
    let results: Result<Vec<i32>, _> = vec!["1", "2", "3"]
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();
    // Ok([1, 2, 3]) or Err on first failure
}
```

---

## Writing Custom Iterators

```rust
// A range iterator that yields Fibonacci numbers
struct Fibonacci {
    a: u64,
    b: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Fibonacci { a: 0, b: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        let next = self.a + self.b;
        self.a = self.b;
        self.b = next;
        Some(self.a)   // infinite iterator — never returns None
    }
}

fn main() {
    // Take first 10 Fibonacci numbers
    let fibs: Vec<u64> = Fibonacci::new().take(10).collect();
    println!("{:?}", fibs);
    // [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]

    // First Fibonacci number over 1000
    let first_big = Fibonacci::new().find(|&n| n > 1000);
    println!("{:?}", first_big);  // Some(1597)

    // Sum of even Fibonacci numbers under 100
    let sum: u64 = Fibonacci::new()
        .take_while(|&n| n < 100)
        .filter(|n| n % 2 == 0)
        .sum();
    println!("Sum: {sum}");  // 44
}
```

---

## Iterator Performance — Zero Cost

```rust
// Iterator chains compile to the same assembly as hand-written loops
// No overhead — fully inlined and optimised by the compiler

// This iterator chain:
let sum: i32 = (0..1_000_000)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();

// Compiles to essentially the same code as:
let mut sum: i32 = 0;
let mut x = 0;
while x < 1_000_000 {
    if x % 2 == 0 {
        sum += x * x;
    }
    x += 1;
}

// The abstraction costs nothing at runtime.
// This is what "zero-cost abstractions" means in Rust.
```

---

## Tips

- Prefer iterator chains over manual `for` loops when transforming data — they're more readable and the compiler optimises them identically.
- `filter_map` is more efficient than `.filter(..).map(..)` when the filter and map are related — one closure, one pass.
- Collect into `Result<Vec<T>, E>` to handle a sequence of fallible operations — it short-circuits on the first error, exactly like chained `?`.
- Use `inspect` for debugging iterator chains without breaking the chain — insert `.inspect(|x| dbg!(x))` anywhere.
- `move` closures are required for `thread::spawn` — always captures ownership of any values used in the closure body.

---

## Summary

- Closures are anonymous functions with three syntactic parts: `|params| body`. Types are inferred.
- Capture modes: immutable borrow by default; `mut` closure for mutable borrow; `move` keyword to take ownership.
- Three closure traits: `Fn` (shared borrow), `FnMut` (mutable borrow), `FnOnce` (takes ownership) — from most to least restrictive.
- Iterator adaptors are lazy — they build a pipeline; consumers (`collect`, `sum`, `for_each`) trigger execution.
- Essential adaptors: `map`, `filter`, `filter_map`, `flat_map`, `enumerate`, `zip`, `take`, `skip`, `chain`.
- Essential consumers: `collect`, `sum`, `fold`, `any`, `all`, `find`, `position`, `count`.
- Iterator chains are zero-cost — they compile to the same code as hand-written loops.
