---
title: "Concurrency"
sidebar_label: "Concurrency"
sidebar_position: 13
---

# Concurrency

Rust's ownership system makes concurrent programming safer than in any other systems language. Data races are impossible at compile time. Rust's motto: "fearless concurrency."

---

## Threads

```rust
use std::thread;
use std::time::Duration;

fn main() {
    // Spawn a thread
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("thread: {i}");
            thread::sleep(Duration::from_millis(1));
        }
    });

    // Main thread continues
    for i in 1..=3 {
        println!("main: {i}");
        thread::sleep(Duration::from_millis(1));
    }

    // Wait for the spawned thread to finish
    handle.join().unwrap();   // blocks until thread completes

    // Move data into a thread (must use 'move')
    let data = vec![1, 2, 3];
    let handle = thread::spawn(move || {
        println!("data: {:?}", data);   // data moved into thread
    });
    handle.join().unwrap();
    // println!("{:?}", data);  // ERROR: data was moved

    // Thread with return value
    let handle = thread::spawn(|| {
        42   // last expression = thread's return value
    });
    let result = handle.join().unwrap();  // Result<i32, Box<dyn Any>>
    println!("thread returned: {result}");

    // Scoped threads — can borrow from the outer scope
    // (guaranteed to finish before the scope exits)
    let numbers = vec![1, 2, 3, 4, 5];
    thread::scope(|s| {
        s.spawn(|| println!("first half: {:?}", &numbers[..2]));
        s.spawn(|| println!("second half: {:?}", &numbers[2..]));
    });
    // Both threads done here; numbers still valid
    println!("numbers: {:?}", numbers);
}
```

---

## Message Passing — Channels

```rust
use std::sync::mpsc;   // multi-producer, single-consumer
use std::thread;

fn main() {
    // Single producer, single consumer
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        tx.send(42).unwrap();
        tx.send(100).unwrap();
    });

    let val = rx.recv().unwrap();       // blocking receive
    println!("received: {val}");

    let val2 = rx.recv().unwrap();
    println!("received: {val2}");

    // Non-blocking receive
    match rx.try_recv() {
        Ok(v) => println!("got: {v}"),
        Err(mpsc::TryRecvError::Empty) => println!("nothing yet"),
        Err(mpsc::TryRecvError::Disconnected) => println!("sender gone"),
    }

    // Receive all until sender disconnects
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        for i in 0..5 {
            tx.send(i).unwrap();
        }
        // tx dropped here → channel closes
    });

    for val in rx {   // rx acts as an iterator — stops when channel closes
        println!("{val}");
    }

    // Multiple producers — clone the sender
    let (tx, rx) = mpsc::channel::<String>();

    let tx1 = tx.clone();
    let tx2 = tx.clone();
    drop(tx);   // drop the original so channel closes when tx1 and tx2 drop

    thread::spawn(move || tx1.send("from thread 1".to_string()).unwrap());
    thread::spawn(move || tx2.send("from thread 2".to_string()).unwrap());

    for msg in rx {
        println!("{msg}");
    }

    // Synchronous channel — bounded; blocks sender when buffer full
    let (tx, rx) = mpsc::sync_channel::<i32>(10);  // buffer of 10
    thread::spawn(move || {
        tx.send(1).unwrap();   // blocks if buffer full
    });
    println!("{}", rx.recv().unwrap());
}
```

---

## Shared State — Arc and Mutex

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Arc = Atomically Reference Counted — thread-safe Rc
    // Mutex = Mutual Exclusion — only one thread accesses data at a time

    let counter = Arc::new(Mutex::new(0));   // Arc<Mutex<i32>>

    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);   // increment reference count
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();  // acquire lock
            *num += 1;
            // lock released when 'num' goes out of scope (RAII)
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("counter: {}", *counter.lock().unwrap());  // 10

    // Mutex prevents data races:
    // If two threads both call counter.lock():
    //   Thread 1 gets the lock — Thread 2 BLOCKS until Thread 1 releases
    //   No concurrent access → no data race

    // RwLock — multiple readers OR one writer
    use std::sync::RwLock;
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));

    // Multiple readers at once
    let d = Arc::clone(&data);
    thread::spawn(move || {
        let r = d.read().unwrap();
        println!("reading: {:?}", *r);
    });

    // Exclusive writer
    {
        let mut w = data.write().unwrap();
        w.push(4);
    }
}
```

---

## Send and Sync Traits

```rust
// The type system enforces thread safety via two marker traits:

// Send: this type can be MOVED to another thread
//   - i32, String, Vec<T>, Arc<T> are Send
//   - Rc<T> is NOT Send (non-atomic reference count — can't share across threads)
//   - raw pointers (*const T, *mut T) are NOT Send

// Sync: this type can be SHARED (by reference) across threads
//   - T is Sync if &T is Send
//   - Mutex<T>, Arc<T>, i32, String are Sync
//   - Cell<T>, RefCell<T> are NOT Sync (no thread-safety guarantees)

// These are automatically implemented by the compiler for types composed of Send/Sync types
// You rarely implement them manually (it requires unsafe)

// The compiler enforces this:
use std::rc::Rc;
let rc = Rc::new(5);
// thread::spawn(move || println!("{}", rc));
// ERROR: Rc<i32> cannot be sent between threads safely (Rc is not Send)

// Fix: use Arc instead
use std::sync::Arc;
let arc = Arc::new(5);
thread::spawn(move || println!("{}", arc)).join().unwrap();  // fine
```

---

## Atomic Types

For simple shared counters/flags, atomic operations are faster than Mutex.

```rust
use std::sync::atomic::{AtomicUsize, AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    // AtomicUsize — lock-free counter
    let counter = Arc::new(AtomicUsize::new(0));

    let mut handles = vec![];
    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            c.fetch_add(1, Ordering::SeqCst);  // atomic increment
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("count: {}", counter.load(Ordering::SeqCst));  // 10

    // AtomicBool — flag
    let shutdown = Arc::new(AtomicBool::new(false));
    let s = Arc::clone(&shutdown);
    thread::spawn(move || {
        while !s.load(Ordering::Relaxed) {
            thread::sleep(std::time::Duration::from_millis(10));
        }
        println!("shutting down");
    });
    thread::sleep(std::time::Duration::from_millis(50));
    shutdown.store(true, Ordering::Relaxed);

    // Memory orderings (from weakest to strongest):
    // Relaxed  — no synchronization guarantee; just atomicity (use for counters)
    // Acquire  — subsequent reads see all writes before the Acquire
    // Release  — prior writes become visible to threads doing Acquire
    // AcqRel   — both Acquire and Release
    // SeqCst   — total global order (strongest; use when in doubt)
}
```

---

## Deadlocks and How to Avoid Them

```rust
use std::sync::{Arc, Mutex};

// Classic deadlock:
let lock_a = Arc::new(Mutex::new(1));
let lock_b = Arc::new(Mutex::new(2));

// Thread 1: locks A then B
// Thread 2: locks B then A
// Both threads block waiting for the other's lock — deadlock!

// Prevention rules:
// 1. Always acquire locks in the same order across all threads
// 2. Keep lock scope as small as possible (drop quickly)
// 3. Use try_lock() if you need non-blocking acquisition
// 4. Consider using channels instead of shared mutexes (simpler)

// Avoid holding a lock while doing I/O or calling unknown functions
let lock = Mutex::new(data);
{
    let guard = lock.lock().unwrap();
    let processed = process(*guard);
    // guard dropped here — lock released before doing I/O
}
// now do I/O or other work without holding the lock
expensive_io_operation(processed);
```

---

## Rayon — Data Parallelism

Rayon adds a parallel iterator that distributes work across CPU cores automatically.

```toml
[dependencies]
rayon = "1"
```

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i32> = (0..1_000_000).collect();

    // Sequential
    let sum: i32 = numbers.iter().map(|&x| x * x).sum();

    // Parallel — just change .iter() to .par_iter()
    let parallel_sum: i32 = numbers.par_iter().map(|&x| x * x).sum();

    println!("sum: {sum}, parallel: {parallel_sum}");

    // Parallel sorting
    let mut data: Vec<i32> = (0..1_000_000).rev().collect();
    data.par_sort();

    // Parallel map and collect
    let doubled: Vec<i32> = numbers.par_iter().map(|&x| x * 2).collect();

    // Parallel filter_map
    let processed: Vec<String> = numbers
        .par_iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x.to_string())
        .collect();
}
```

---

## Tips

- Prefer channels over shared state — channels are easier to reason about and compose. Use `Arc<Mutex<T>>` only when mutation needs to be shared in place.
- `thread::scope` is your best friend for short-lived threads that borrow local data — no need for `Arc` or `move` when the scope guarantees the threads finish before the scope exits.
- `Mutex::lock()` returns a `LockResult` — always `.unwrap()` in simple code; handle the `PoisonError` in production (a thread panicked while holding the lock).
- Atomics are faster than Mutex for simple counters and flags but only correct with the right `Ordering` — when in doubt, use `SeqCst`; optimise to `Relaxed` only after you understand the memory model.
- Rayon is almost always the right choice for CPU-bound parallel work — it uses a work-stealing thread pool tuned to the number of CPU cores.

---

## Summary

- Rust prevents data races at compile time via the `Send` and `Sync` marker traits — the compiler rejects code that shares non-thread-safe types across threads.
- `thread::spawn(move || {...})` — always `move`; `thread::scope` borrows without `move` when threads are short-lived.
- Channels (`mpsc`) are the "Go-style" approach: pass data by moving it between threads. Clone `tx` for multiple producers.
- `Arc<Mutex<T>>` is the "share + lock" approach: reference-counted pointer to a lock-protected value.
- `RwLock<T>` allows many concurrent readers OR one exclusive writer — better than Mutex when reads dominate.
- Rayon's `par_iter()` is a drop-in parallel replacement for `.iter()` — distributes work across cores automatically.
