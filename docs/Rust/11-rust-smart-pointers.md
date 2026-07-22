---
title: "Smart Pointers"
sidebar_label: "Smart Pointers"
sidebar_position: 11
---

# Smart Pointers

Smart pointers are data structures that act like pointers but carry extra metadata and capabilities. The most important: `Box<T>`, `Rc<T>`, `RefCell<T>`, and `Arc<T>`.

**Book:** Chapter 15 — [doc.rust-lang.org/book/ch15-00-smart-pointers.html](https://doc.rust-lang.org/book/ch15-00-smart-pointers.html)

---

## Box&lt;T&gt; — Heap Allocation

```rust
// Box<T> allocates T on the heap and holds a pointer to it.
// Stack: 8-byte pointer. Heap: the actual T.

// Use when:
// 1. Type size unknown at compile time (recursive types)
// 2. Large value you want to move without copying
// 3. Trait objects (dyn Trait)

// Recursive type — size is infinite without Box
#[derive(Debug)]
enum List {
    Cons(i32, Box<List>),  // Box breaks the infinite size
    Nil,
}

fn main() {
    let list = List::Cons(1,
        Box::new(List::Cons(2,
            Box::new(List::Cons(3,
                Box::new(List::Nil))))));

    println!("{:?}", list);

    // Basic Box usage
    let b = Box::new(5);
    println!("{}", *b);   // dereference with *
    // b is dropped here — heap memory freed automatically

    // Large value — move cheaply (pointer copy, not data copy)
    let large = Box::new([0u8; 1_000_000]);  // 1MB on heap
    let moved = large;  // just copies the pointer (8 bytes)

    // Trait objects — Box<dyn Trait>
    trait Draw { fn draw(&self); }
    struct Circle;
    impl Draw for Circle { fn draw(&self) { println!("circle"); } }
    struct Square;
    impl Draw for Square { fn draw(&self) { println!("square"); } }

    let shapes: Vec<Box<dyn Draw>> = vec![
        Box::new(Circle),
        Box::new(Square),
    ];
    for shape in &shapes { shape.draw(); }
}
```

---

## Rc&lt;T&gt; — Reference Counted (Single Thread)

```rust
use std::rc::Rc;

// Rc<T>: multiple owners of the same data — reference counted.
// When the last owner is dropped, the data is freed.
// NOT thread-safe (use Arc for threads).

fn main() {
    let a = Rc::new(String::from("shared data"));
    let b = Rc::clone(&a);  // increment reference count — same data, not a copy
    let c = Rc::clone(&a);

    println!("ref count: {}", Rc::strong_count(&a));  // 3

    println!("{}", a);  // "shared data"
    println!("{}", b);  // "shared data"

    drop(b);
    println!("after drop b: {}", Rc::strong_count(&a));  // 2

    // Rc<T> is immutable — can't mutate through it
    // For interior mutability: combine with RefCell<T>
}
```

---

## RefCell&lt;T&gt; — Interior Mutability

```rust
use std::cell::RefCell;

// RefCell<T> enforces borrow rules at RUNTIME instead of compile time.
// Use when you know the borrows are safe but the compiler can't prove it.
// Panics at runtime if you violate borrow rules (instead of compile error).

fn main() {
    let data = RefCell::new(vec![1, 2, 3]);

    // Immutable borrow
    let r = data.borrow();         // Ref<Vec<i32>>
    println!("{:?}", *r);

    drop(r);  // must release before mutable borrow

    // Mutable borrow
    let mut w = data.borrow_mut();  // RefMut<Vec<i32>>
    w.push(4);
    drop(w);

    println!("{:?}", data.borrow());  // [1, 2, 3, 4]

    // borrow() panics if a mutable borrow is active
    // borrow_mut() panics if any borrow (mutable or immutable) is active

    // try_borrow / try_borrow_mut — non-panicking versions
    match data.try_borrow_mut() {
        Ok(mut v) => v.push(5),
        Err(_) => println!("already borrowed"),
    }
}
```

---

## Rc&lt;RefCell&lt;T&gt;&gt; — Shared Mutable Data (Single Thread)

```rust
use std::rc::Rc;
use std::cell::RefCell;

// Classic pattern: multiple owners that can all mutate the data

#[derive(Debug)]
struct Node {
    value: i32,
    children: Vec<Rc<RefCell<Node>>>,
}

fn main() {
    let leaf = Rc::new(RefCell::new(Node {
        value: 3,
        children: vec![],
    }));

    let branch = Rc::new(RefCell::new(Node {
        value: 5,
        children: vec![Rc::clone(&leaf)],
    }));

    // Mutate through Rc<RefCell<_>>
    leaf.borrow_mut().value = 42;

    println!("branch: {:?}", branch.borrow());
}
```

---

## Arc&lt;T&gt; — Atomic Reference Counted (Multi-Thread)

```rust
use std::sync::Arc;
use std::thread;

// Arc<T>: like Rc<T> but safe to share across threads (atomic reference count).
// Higher cost than Rc — use Arc only when you need multiple threads.

fn main() {
    let data = Arc::new(vec![1, 2, 3]);

    let mut handles = vec![];
    for _ in 0..3 {
        let d = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            println!("{:?}", d);
        }));
    }
    for h in handles { h.join().unwrap(); }

    // Arc + Mutex for shared mutable state across threads
    use std::sync::Mutex;
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            *c.lock().unwrap() += 1;
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("count: {}", *counter.lock().unwrap());  // 10
}
```

---

## Deref and Drop

```rust
use std::ops::Deref;

// Deref lets you customize * dereference behaviour
struct MyBox<T>(T);

impl<T> Deref for MyBox<T> {
    type Target = T;
    fn deref(&self) -> &T { &self.0 }
}

fn hello(name: &str) { println!("Hello, {name}!"); }

fn main() {
    let x = MyBox(String::from("Alice"));
    hello(&x);  // Deref coercion: &MyBox<String> → &String → &str (auto)

    // Deref coercions happen automatically:
    // &Box<String> → &String → &str
    // &Rc<String> → &String → &str
    // This is why you can pass &Box<String> where &str is expected
}

// Drop — custom cleanup when a value goes out of scope
struct DatabaseConnection;

impl Drop for DatabaseConnection {
    fn drop(&mut self) {
        println!("connection closed");  // auto-called when value dropped
    }
}

fn main() {
    let _conn = DatabaseConnection;
    println!("using connection");
}
// "using connection"
// "connection closed"  ← Drop called automatically
```

---

## Weak&lt;T&gt; — Breaking Reference Cycles

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

// Rc<T> can cause memory leaks via reference cycles.
// Weak<T>: a non-owning reference — doesn't prevent dropping.

#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,   // Weak — doesn't prevent parent from being dropped
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    let branch = Rc::new(Node {
        value: 5,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });

    // Set leaf's parent to a Weak pointer to branch
    *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

    // Upgrade Weak to Rc to access the data (returns Option)
    if let Some(parent) = leaf.parent.borrow().upgrade() {
        println!("leaf's parent value: {}", parent.value);
    }
    // When branch is dropped, Weak::upgrade() returns None
}
```

---

## Quick Reference

| Type | Ownership | Thread-safe | Mutable | Use when |
|---|---|---|---|---|
| `T` | Single | — | `mut` binding | Default |
| `Box<T>` | Single | — | `mut` binding | Heap alloc, trait objects, recursive types |
| `Rc<T>` | Multiple | ✗ | No (use with RefCell) | Multiple owners, single thread |
| `Arc<T>` | Multiple | ✓ | No (use with Mutex) | Multiple owners, multiple threads |
| `RefCell<T>` | Single | ✗ | Runtime-checked | Interior mutability, single thread |
| `Mutex<T>` | Single (locked) | ✓ | Lock-guarded | Shared mutation across threads |
| `Cell<T>` | Single | ✗ | Copy-in/copy-out | Simple Copy types, avoid RefCell overhead |

---

## Tips

- `Box<dyn Trait>` is how you store trait objects in a Vec or return them from functions — it's the most common use of `Box`.
- Prefer `Arc<Mutex<T>>` over `Rc<RefCell<T>>` if there's any chance you'll add threads later — easier to migrate early.
- `RefCell::borrow_mut()` panics if already borrowed — use `try_borrow_mut()` in production code where you can't be certain.
- `Weak<T>` is the fix for reference cycles — if two `Rc`s point to each other, neither is ever freed. Make one `Weak`.

---

## Summary — Book Ch 15

- `Box<T>`: single owner, heap-allocated, known size — used for recursive types, large values, trait objects.
- `Rc<T>`: multiple owners via reference counting — single-threaded only; freed when count reaches zero.
- `RefCell<T>`: borrow rules enforced at runtime — allows mutation through a shared reference; panics on violation.
- `Rc<RefCell<T>>`: the pattern for shared mutable data in single-threaded code.
- `Arc<T>` + `Mutex<T>`: the thread-safe equivalents of `Rc` + `RefCell`.
- `Weak<T>`: non-owning reference to break reference cycles; `upgrade()` returns `Option<Rc<T>>`.
