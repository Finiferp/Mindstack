---
title: "Traits and Generics"
sidebar_label: "Traits & Generics"
sidebar_position: 6
---

# Traits and Generics

Traits define shared behaviour across types — Rust's answer to interfaces and abstract classes. Generics let you write code that works for any type that satisfies a trait bound.

---

## Traits

```rust
// Define a trait — a set of method signatures a type must implement
trait Greet {
    fn hello(&self) -> String;

    // Default implementation — types can override or use as-is
    fn goodbye(&self) -> String {
        format!("Goodbye from {}", self.hello())
    }
}

struct English;
struct Spanish;

impl Greet for English {
    fn hello(&self) -> String {
        String::from("Hello!")
    }
}

impl Greet for Spanish {
    fn hello(&self) -> String {
        String::from("¡Hola!")
    }
    // goodbye() uses the default implementation
}

fn main() {
    let e = English;
    let s = Spanish;
    println!("{}", e.hello());    // Hello!
    println!("{}", s.hello());    // ¡Hola!
    println!("{}", e.goodbye());  // Goodbye from Hello!
}
```

---

## Standard Library Traits

```rust
use std::fmt;

#[derive(Clone, PartialEq)]
struct Point {
    x: f64,
    y: f64,
}

// Display — for {} formatting (for end users)
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// Debug is derivable; Display must be implemented manually

// PartialOrd — for <, >, <=, >=
impl PartialOrd for Point {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        let d1 = self.x * self.x + self.y * self.y;
        let d2 = other.x * other.x + other.y * other.y;
        d1.partial_cmp(&d2)
    }
}

// From/Into — type conversions
struct Celsius(f64);
struct Fahrenheit(f64);

impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}

fn main() {
    let p = Point { x: 3.0, y: 4.0 };
    println!("{p}");         // (3, 4) — uses Display

    let boiling = Celsius(100.0);
    let f = Fahrenheit::from(boiling);      // explicit From
    // let f: Fahrenheit = boiling.into();  // implicit Into (auto-implemented)
    println!("{:.1}°F", f.0);  // 212.0°F
}

// Other important standard traits:
// Iterator  — for ..in loops and iterator adapters
// Default   — zero values (.default())
// Drop      — custom cleanup when value goes out of scope
// Deref     — override * dereference operator
// Index     — override [] indexing
// Add, Sub, Mul, etc. — operator overloading
// Hash      — for HashMap/HashSet keys
// AsRef, AsMut, Borrow — flexible reference conversions
```

---

## The Iterator Trait

```rust
// Iterator is one of the most important traits in Rust
// You only need to implement next() — everything else comes for free

struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Self {
        Counter { count: 0, max }
    }
}

impl Iterator for Counter {
    type Item = u32;  // associated type — what this iterator yields

    fn next(&mut self) -> Option<u32> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    // Use our custom iterator
    let counter = Counter::new(5);
    let sum: u32 = counter.sum();   // 1+2+3+4+5 = 15

    // All iterator adapters work automatically
    let doubled: Vec<u32> = Counter::new(5)
        .map(|x| x * 2)
        .filter(|x| x % 3 != 0)
        .collect();
    println!("{:?}", doubled);  // [2, 4, 8, 10]

    // Common iterator methods (lazy — only computed on demand)
    let v = vec![1, 2, 3, 4, 5];

    v.iter()          // immutable references &T
    v.iter_mut()      // mutable references &mut T
    v.into_iter()     // consumes v, yields owned T

    // Adapters (return new iterators — lazy)
    .map(|x| x * 2)            // transform each element
    .filter(|x| x % 2 == 0)    // keep elements matching predicate
    .filter_map(|x| ...)        // map + filter in one (return Option)
    .flat_map(|x| ...)          // map then flatten
    .enumerate()                 // yields (index, element)
    .zip(other_iter)            // pairs elements from two iterators
    .take(n)                    // first n elements
    .skip(n)                    // skip first n elements
    .chain(other_iter)          // concatenate two iterators
    .peekable()                  // lets you peek at next without consuming
    .cloned()                    // clone each &T to T
    .copied()                    // copy each &T to T (for Copy types)

    // Consumers (trigger computation)
    .collect::<Vec<_>>()        // collect into a collection
    .sum::<i32>()               // sum all elements
    .product::<i32>()           // multiply all elements
    .count()                    // number of elements
    .max()                      // maximum (Option)
    .min()                      // minimum (Option)
    .any(|x| x > 3)            // true if any element matches
    .all(|x| x > 0)            // true if all elements match
    .find(|x| *x == 3)         // first matching element (Option)
    .position(|x| *x == 3)     // index of first match (Option)
    .fold(0, |acc, x| acc + x) // reduce to a single value
    .for_each(|x| println!("{x}")); // consume with side effects
}
```

---

## Generics

```rust
// Generic function — works for any type T
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("largest number: {}", largest(&numbers));

    let chars = vec!['y', 'm', 'a', 'q'];
    println!("largest char: {}", largest(&chars));
}

// Generic struct
#[derive(Debug)]
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn new(first: T, second: T) -> Self {
        Pair { first, second }
    }
}

// Implement methods only when T satisfies certain bounds
impl<T: PartialOrd + std::fmt::Display> Pair<T> {
    fn larger(&self) -> &T {
        if self.first >= self.second {
            &self.first
        } else {
            &self.second
        }
    }
}

fn main() {
    let p = Pair::new(5, 10);
    println!("larger: {}", p.larger());

    let p2 = Pair::new(String::from("hello"), String::from("world"));
    println!("larger: {}", p2.larger());
}
```

---

## Trait Bounds

```rust
use std::fmt::{Display, Debug};

// Trait bound syntax — T must implement Display
fn print_it<T: Display>(value: T) {
    println!("{value}");
}

// Multiple bounds with +
fn print_debug<T: Display + Debug + Clone>(value: T) {
    println!("display: {value}");
    println!("debug: {value:?}");
    let _copy = value.clone();
}

// where clause — cleaner for complex bounds
fn compare_and_display<T, U>(t: &T, u: &U) -> String
where
    T: Display + PartialOrd,
    U: Display + Clone,
{
    format!("{t} vs {u}")
}

// impl Trait syntax — shorthand in function signatures
fn make_greeting(name: impl Display) -> impl Display {
    format!("Hello, {name}!")
}

// impl Trait in return position: "returns some type that implements Display"
// (the concrete type is fixed — you can't return different types based on conditions)

fn main() {
    print_it(42);
    print_it("hello");
    print_it(3.14);

    println!("{}", make_greeting("Alice"));
}
```

---

## Trait Objects — Dynamic Dispatch

```rust
// When you need a collection of different types that share a trait,
// use trait objects: &dyn Trait or Box<dyn Trait>

trait Animal {
    fn name(&self) -> &str;
    fn sound(&self) -> &str;
    fn describe(&self) -> String {
        format!("{} says {}", self.name(), self.sound())
    }
}

struct Dog;
struct Cat;
struct Duck;

impl Animal for Dog {
    fn name(&self) -> &str { "Dog" }
    fn sound(&self) -> &str { "Woof" }
}
impl Animal for Cat {
    fn name(&self) -> &str { "Cat" }
    fn sound(&self) -> &str { "Meow" }
}
impl Animal for Duck {
    fn name(&self) -> &str { "Duck" }
    fn sound(&self) -> &str { "Quack" }
}

fn main() {
    // Vec of trait objects — different concrete types in one collection
    let animals: Vec<Box<dyn Animal>> = vec![
        Box::new(Dog),
        Box::new(Cat),
        Box::new(Duck),
    ];

    for animal in &animals {
        println!("{}", animal.describe());
    }
}

// Generics (static dispatch) vs trait objects (dynamic dispatch):
// Generics: compiler generates separate code per type → faster, but larger binary
// Trait objects: single code path, type resolved at runtime → flexible, small overhead

// Use generics when: the type is known at compile time (most cases)
// Use trait objects when: you need heterogeneous collections or plugin systems

// Object-safe traits: to be used as dyn Trait, the trait cannot have
// methods that return Self or use generic type parameters
```

---

## Associated Types

```rust
// Associated types — a cleaner way to bind a type to a trait

trait Converter {
    type Output;   // associated type
    fn convert(&self) -> Self::Output;
}

struct Kilometers(f64);

impl Converter for Kilometers {
    type Output = f64;
    fn convert(&self) -> f64 {
        self.0 * 0.621371   // km to miles
    }
}

struct Inches(f64);

impl Converter for Inches {
    type Output = f64;
    fn convert(&self) -> f64 {
        self.0 * 2.54   // inches to cm
    }
}

// Why associated types instead of generic parameter?
// Converter<f64> vs type Output = f64
// With generic: you could impl Converter<f64> AND Converter<String> for the same type
// With associated type: one implementation per type — more constrained, cleaner

fn print_converted(item: &impl Converter<Output = f64>) {
    println!("{}", item.convert());
}
```

---

## Tips

- Prefer generics over `dyn Trait` when possible — generics are zero-cost (monomorphised at compile time); `dyn Trait` has a small runtime cost (vtable lookup).
- When the trait bound list grows long, use a `where` clause — `where T: Display + Debug + Clone + PartialOrd` is much more readable than inline bounds.
- `impl Trait` in argument position = syntax sugar for a generic bound; `impl Trait` in return position = opaque type (the concrete type is hidden from the caller).
- Iterator chains are completely lazy — nothing runs until you call a consumer like `.collect()`, `.sum()`, or `.for_each()`. This is why they're zero-cost.
- `#[derive(Debug, Clone, PartialEq, Hash, Default)]` — put this on almost every struct you define.

---

## Summary

- Traits define shared behaviour — `impl Trait for Type` provides the implementation; default methods are provided in the trait definition.
- `<T: Display + Debug>` = trait bounds — constrain which types a generic function accepts.
- The `Iterator` trait provides 30+ adapters (`map`, `filter`, `fold`, `zip`, `take`...) free once you implement `next()`.
- `Box<dyn Trait>` = trait object = dynamic dispatch — use when you need heterogeneous collections or runtime polymorphism.
- Associated types (`type Item`) bind a type to a trait implementation — cleaner than extra generic parameters when there's only one natural choice.
- Generics are zero-cost (monomorphised by the compiler); trait objects have a small vtable lookup cost.
