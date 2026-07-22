---
title: "Async Rust"
sidebar_label: "Async / Await"
sidebar_position: 14
---

# Async Rust

Async Rust enables high-performance I/O-bound concurrency — handle thousands of connections concurrently without thousands of OS threads. Built on futures and a runtime (Tokio).

---

## Why Async

```
Thread-per-connection model:
  Each connection gets an OS thread
  OS thread: ~2MB stack + scheduling overhead
  10,000 connections = 20GB RAM just for stacks — impractical

Async model:
  Thousands of "tasks" run on a small thread pool (usually CPU-count threads)
  When a task waits for I/O (network, disk), it yields — another task runs
  OS threads are never blocked waiting
  10,000 connections = much less memory, same throughput

Rust async vs Go goroutines vs Node.js:
  All three use the same idea (cooperative multitasking / event loop)
  Rust: zero-cost; no runtime shipped with the language; you choose the runtime
  Go: goroutines built in; GC handles memory
  Node.js: single-threaded event loop; Rust is multi-threaded by default
```

---

## Futures and the async/await Syntax

```rust
// A Future is a value that represents a computation that may not be done yet
// async fn returns a Future; await drives it to completion

// Without runtime — just to understand the types:
use std::future::Future;

async fn hello() -> String {
    String::from("hello")   // async fn returns impl Future<Output = String>
}

// async blocks
let fut = async {
    42   // impl Future<Output = i32>
};

// Calling an async fn does NOT run it — it returns a Future
// You must .await it (or pass it to a runtime)
async fn add(a: i32, b: i32) -> i32 {
    a + b
}

async fn example() {
    let result = add(3, 4).await;   // .await suspends until add() completes
    println!("{result}");
}
```

---

## Tokio — The Async Runtime

Tokio is the dominant async runtime for Rust — used by AWS, Discord, Cloudflare, and most production Rust services.

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
// The #[tokio::main] macro sets up the runtime and runs the async main
#[tokio::main]
async fn main() {
    println!("Hello from async main!");

    // Await an async operation
    let result = async_computation().await;
    println!("{result}");
}

async fn async_computation() -> i32 {
    // Simulate async work (like network I/O)
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    42
}
```

---

## Async I/O — Files and Network

```rust
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

// Async file I/O
async fn read_file(path: &str) -> std::io::Result<String> {
    fs::read_to_string(path).await   // async version of std::fs::read_to_string
}

async fn write_file(path: &str, content: &str) -> std::io::Result<()> {
    fs::write(path, content).await
}

// TCP echo server
async fn handle_client(mut stream: TcpStream) {
    let mut buf = vec![0u8; 1024];
    loop {
        match stream.read(&mut buf).await {
            Ok(0) => break,           // connection closed
            Ok(n) => {
                if stream.write_all(&buf[..n]).await.is_err() {
                    break;
                }
            }
            Err(_) => break,
        }
    }
}

async fn tcp_server() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Listening on :8080");

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("new connection from {addr}");
        tokio::spawn(handle_client(stream));   // spawn a task per connection
    }
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    tcp_server().await
}
```

---

## Spawning Tasks

```rust
use tokio::task;

#[tokio::main]
async fn main() {
    // Spawn a concurrent task (like thread::spawn but async)
    let handle = tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        42
    });

    // Do other work while the task runs concurrently...
    println!("doing other things");

    // Wait for the task
    let result = handle.await.unwrap();  // JoinHandle<i32>
    println!("task returned: {result}");

    // Spawn multiple tasks and wait for all
    let handles: Vec<_> = (0..5)
        .map(|i| tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(i * 10)).await;
            i * i
        }))
        .collect();

    let results: Vec<u64> = futures::future::join_all(handles)
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();

    println!("{:?}", results);  // [0, 1, 4, 9, 16]

    // tokio::join! — run multiple futures concurrently and wait for all
    let (a, b, c) = tokio::join!(
        async { 1u32 },
        async { 2u32 },
        async { 3u32 },
    );
    println!("{a} {b} {c}");

    // tokio::select! — race futures, use the first to complete
    tokio::select! {
        result = async { slow_operation().await } => {
            println!("slow finished: {result}");
        }
        _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {
            println!("timed out!");
        }
    }
}

async fn slow_operation() -> i32 { 42 }
```

---

## Channels in Async Code

```rust
use tokio::sync::{mpsc, oneshot, broadcast, watch};

#[tokio::main]
async fn main() {
    // mpsc — multi-producer single-consumer (async version)
    let (tx, mut rx) = mpsc::channel::<String>(32);  // buffer of 32

    tokio::spawn(async move {
        tx.send("hello".to_string()).await.unwrap();
        tx.send("world".to_string()).await.unwrap();
    });

    while let Some(msg) = rx.recv().await {
        println!("{msg}");
    }

    // oneshot — single use; send exactly one value
    let (tx, rx) = oneshot::channel::<i32>();
    tokio::spawn(async move { tx.send(42).unwrap(); });
    let result = rx.await.unwrap();
    println!("oneshot: {result}");

    // broadcast — multiple consumers, each gets every message
    let (tx, mut rx1) = broadcast::channel::<String>(16);
    let mut rx2 = tx.subscribe();
    tx.send("broadcast!".to_string()).unwrap();
    println!("{}", rx1.recv().await.unwrap());
    println!("{}", rx2.recv().await.unwrap());

    // watch — single producer, multiple consumers; only latest value
    let (tx, mut rx) = watch::channel(0i32);
    tx.send(42).unwrap();
    println!("watch: {}", *rx.borrow_and_update());
}
```

---

## Timeouts and Retries

```rust
use tokio::time::{timeout, sleep, Duration};

async fn fetch_data() -> Result<String, std::io::Error> {
    sleep(Duration::from_secs(2)).await;
    Ok("data".to_string())
}

#[tokio::main]
async fn main() {
    // Timeout — fail if operation takes too long
    match timeout(Duration::from_secs(1), fetch_data()).await {
        Ok(Ok(data)) => println!("got: {data}"),
        Ok(Err(e)) => println!("error: {e}"),
        Err(_) => println!("timed out!"),
    }

    // Retry with backoff (using the 'backoff' crate)
    // Or manually:
    async fn with_retry<F, Fut, T, E>(mut f: F, attempts: u32) -> Result<T, E>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
    {
        for attempt in 0..attempts {
            match f().await {
                Ok(val) => return Ok(val),
                Err(e) if attempt + 1 == attempts => return Err(e),
                Err(_) => {
                    sleep(Duration::from_millis(100 * 2u64.pow(attempt))).await;
                }
            }
        }
        unreachable!()
    }
}
```

---

## Async Traits

```rust
// Async methods in traits require the 'async-trait' crate (stable Rust ≥ 1.75 has native support)
// Native async traits (Rust 1.75+):
trait DataStore {
    async fn get(&self, key: &str) -> Option<String>;
    async fn set(&mut self, key: String, value: String);
}

// Or with async-trait crate for older Rust:
use async_trait::async_trait;

#[async_trait]
trait Storage {
    async fn read(&self, path: &str) -> Result<Vec<u8>, std::io::Error>;
    async fn write(&self, path: &str, data: &[u8]) -> Result<(), std::io::Error>;
}

struct FileStorage;

#[async_trait]
impl Storage for FileStorage {
    async fn read(&self, path: &str) -> Result<Vec<u8>, std::io::Error> {
        tokio::fs::read(path).await
    }

    async fn write(&self, path: &str, data: &[u8]) -> Result<(), std::io::Error> {
        tokio::fs::write(path, data).await
    }
}
```

---

## Common Async Patterns

```rust
use tokio::sync::Semaphore;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Rate limiting with Semaphore (max N concurrent tasks)
    let semaphore = Arc::new(Semaphore::new(10));  // max 10 concurrent
    let mut handles = vec![];

    for i in 0..100 {
        let sem = Arc::clone(&semaphore);
        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            // only 10 of these run at a time
            process_item(i).await;
            // permit dropped = slot freed
        }));
    }

    for h in handles { h.await.unwrap(); }

    // Process items from a stream with bounded concurrency
    use futures::StreamExt;
    let results: Vec<i32> = futures::stream::iter(0..100)
        .map(|i| async move { process_item(i).await; i })
        .buffer_unordered(10)  // up to 10 concurrent
        .collect()
        .await;
}

async fn process_item(i: i32) -> i32 {
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    i * i
}
```

---

## Tips

- `async fn` is lazy — calling it does nothing until you `.await` it. If you forget `.await`, the future is created but never executed (Rust warns about this).
- Use `tokio::spawn` to run tasks concurrently; without spawn, tasks run sequentially (`.await` pauses the current task, not a separate one).
- Don't block inside async code — `std::thread::sleep`, `std::fs::read_to_string`, CPU-intensive loops all block the async thread. Use `tokio::time::sleep`, `tokio::fs`, and `tokio::task::spawn_blocking` for CPU work.
- `tokio::select!` is your timeout and cancellation tool — race a future against a sleep timer to add a deadline.
- `Arc<Mutex<T>>` works in async code but blocks the thread; prefer `tokio::sync::Mutex` which yields while waiting for the lock.

---

## Summary

- Async Rust enables thousands of concurrent I/O-bound tasks on a small thread pool — no thread-per-connection overhead.
- `async fn` returns a `Future`; `.await` suspends the current task until the future completes; `tokio::spawn` runs a future as an independent concurrent task.
- Tokio is the standard runtime — `#[tokio::main]` sets it up; provides async I/O, timers, channels, and synchronization primitives.
- Async channels: `mpsc` (queue), `oneshot` (single value), `broadcast` (all subscribers get every message), `watch` (latest value only).
- `tokio::join!` — run futures concurrently, wait for all. `tokio::select!` — race futures, use the first to finish.
- Never block inside async functions — use async equivalents of all blocking operations (`tokio::fs`, `tokio::time::sleep`, `spawn_blocking`).
