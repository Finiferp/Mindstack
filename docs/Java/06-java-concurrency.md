---
title: "Java Concurrency"
sidebar_label: "Concurrency"
sidebar_position: 6
---

# Concurrency in Java

Concurrency lets multiple tasks run simultaneously, making programs faster and more responsive. Java has supported threads since version 1.0, and has grown a rich set of higher-level abstractions. Understanding concurrency is essential for backend services, responsive UIs, and high-throughput systems.

---

## Threads

A **Thread** is the basic unit of concurrent execution. The JVM runs your `main` method on the main thread; you create additional threads for parallel work.

```java
// Method 1: extend Thread
class PrintTask extends Thread {
    private String message;

    public PrintTask(String message) {
        this.message = message;
    }

    @Override
    public void run() {
        for (int i = 0; i < 5; i++) {
            System.out.println(message + " - " + i);
        }
    }
}

PrintTask t1 = new PrintTask("Thread A");
PrintTask t2 = new PrintTask("Thread B");
t1.start();
t2.start();

// Method 2: implement Runnable (preferred — separates task from thread)
Runnable task = () -> System.out.println("Running in: " + Thread.currentThread().getName());
Thread t = new Thread(task, "my-thread");
t.start();

// Wait for a thread to finish
t.join(); // blocks caller until t completes
```

**Thread lifecycle:** `NEW → RUNNABLE → (BLOCKED/WAITING/TIMED_WAITING) → TERMINATED`

**Tips:**
- Always prefer `Runnable` or `Callable` over extending `Thread`.
- Use `Thread.currentThread().getName()` for debugging.
- `start()` creates a new OS thread and calls `run()` asynchronously. Calling `run()` directly is just a normal method call — no new thread.

---

## Synchronization and Race Conditions

When multiple threads share mutable state without coordination, you get **race conditions** — the result depends on which thread runs first.

```java
public class Counter {
    private int count = 0;

    // Synchronized method — only one thread can execute at a time
    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

### Synchronized Block
```java
private final Object lock = new Object();

public void doWork() {
    // Code before the lock runs concurrently
    synchronized (lock) {
        // Only one thread at a time here
        sharedData++;
    }
    // Code after the lock runs concurrently
}
```

**Tips:**
- Synchronize on the smallest possible block, not the entire method, for better throughput.
- Deadlock occurs when thread A holds lock X and waits for lock Y, while thread B holds Y and waits for X. Avoid by always acquiring locks in the same order.
- `synchronized` methods use `this` as the lock — two synchronized methods on the same object share the lock.

---

## Volatile

`volatile` guarantees visibility — changes made by one thread are immediately visible to others. It does NOT guarantee atomicity.

```java
public class FlagExample {
    private volatile boolean running = true;

    public void run() {
        while (running) {
            // do work
        }
    }

    public void stop() {
        running = false; // guaranteed to be seen by the run() thread
    }
}
```

**Tips:**
- Use `volatile` for simple flags read by one thread and written by another.
- `volatile` is not enough for compound operations like `count++` (read-modify-write). Use `synchronized` or `AtomicInteger`.

---

## Atomic Classes

`java.util.concurrent.atomic` provides lock-free thread-safe operations.

```java
import java.util.concurrent.atomic.*;

AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();          // thread-safe ++
count.addAndGet(5);               // thread-safe += 5
count.compareAndSet(5, 10);       // CAS: set to 10 only if current value is 5
int current = count.get();

AtomicLong longCount = new AtomicLong(0);
AtomicBoolean flag = new AtomicBoolean(false);
AtomicReference<String> ref = new AtomicReference<>("initial");
```

**Tips:**
- Atomic classes are faster than `synchronized` for simple numeric operations.
- Use `AtomicReference` for atomic swapping of object references.
- For complex compound operations, you still need `synchronized` or locks.

---

## ExecutorService and Thread Pools

Creating raw threads is expensive. `ExecutorService` manages a pool of reusable threads.

```java
import java.util.concurrent.*;

// Fixed pool: always exactly N threads
ExecutorService pool = Executors.newFixedThreadPool(4);

// Single thread: tasks run one at a time, in order
ExecutorService single = Executors.newSingleThreadExecutor();

// Cached pool: creates threads as needed, reuses idle ones
ExecutorService cached = Executors.newCachedThreadPool();

// Submit tasks
pool.submit(() -> System.out.println("Task 1"));
pool.submit(() -> System.out.println("Task 2"));

// Always shut down when done
pool.shutdown();                    // stop accepting new tasks
pool.awaitTermination(10, TimeUnit.SECONDS); // wait for completion
```

### Future — getting results back
```java
ExecutorService pool = Executors.newFixedThreadPool(4);

Future<Integer> future = pool.submit(() -> {
    Thread.sleep(1000);
    return 42;
});

// Do other work while the task runs...
System.out.println("Doing other work...");

// Block until result is ready
Integer result = future.get(); // may throw ExecutionException, InterruptedException
System.out.println("Result: " + result);
```

**Tips:**
- Choose pool size based on task type: CPU-bound → `Runtime.getRuntime().availableProcessors()`; I/O-bound → more threads (they block waiting for I/O).
- Always call `shutdown()` — thread pools are not garbage collected while threads are running.
- `future.get()` blocks the calling thread. Consider `future.get(timeout, unit)` to avoid hanging forever.

---

## CompletableFuture (Java 8+)

`CompletableFuture` is a powerful asynchronous programming model — chain async operations without blocking.

```java
import java.util.concurrent.CompletableFuture;

// Basic async task
CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> {
    // runs in ForkJoinPool.commonPool()
    return "Hello from async";
});

// Chain transformations (non-blocking)
cf.thenApply(String::toUpperCase)
  .thenApply(s -> "Result: " + s)
  .thenAccept(System.out::println); // prints: "Result: HELLO FROM ASYNC"

// Compose dependent async operations
CompletableFuture<String> result = CompletableFuture
    .supplyAsync(() -> fetchUserId())        // async step 1
    .thenCompose(id -> fetchUser(id))        // async step 2, depends on step 1
    .thenApply(user -> "Hello, " + user.name()); // sync transform

// Combine two independent operations
CompletableFuture<String> nameTask = CompletableFuture.supplyAsync(() -> fetchName());
CompletableFuture<Integer> ageTask = CompletableFuture.supplyAsync(() -> fetchAge());

CompletableFuture<String> combined = nameTask.thenCombine(ageTask,
    (name, age) -> name + " is " + age + " years old");

// Wait for all
CompletableFuture.allOf(nameTask, ageTask).join();

// Error handling
cf.exceptionally(ex -> {
    System.err.println("Error: " + ex.getMessage());
    return "default";
}).thenAccept(System.out::println);

// Block and get the result (use sparingly)
String value = cf.join(); // like get() but throws unchecked exception
```

**Tips:**
- `thenApply` transforms synchronously. `thenCompose` chains to another async operation.
- `thenApplyAsync`, `thenComposeAsync` etc. run the callback on a different thread pool thread.
- Avoid `join()` or `get()` deep inside async chains — defeats the purpose of non-blocking design.
- `CompletableFuture.allOf(...)` waits for all; `CompletableFuture.anyOf(...)` waits for the first to complete.

---

## Concurrent Collections

Thread-safe collections from `java.util.concurrent`:

```java
import java.util.concurrent.*;

// Thread-safe map — reads don't block
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("key", 1);
map.computeIfAbsent("key2", k -> 0);
map.merge("key", 1, Integer::sum); // atomic increment

// Thread-safe queue (FIFO)
BlockingQueue<String> queue = new LinkedBlockingQueue<>(100);
queue.put("item");    // blocks if full
queue.take();         // blocks if empty
queue.offer("item", 5, TimeUnit.SECONDS); // timeout variant

// Thread-safe list
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
// reads are lock-free; writes make a full copy — good for rare writes
```

**Tips:**
- Never use `Collections.synchronizedMap(new HashMap<>())` in performance-sensitive code — use `ConcurrentHashMap`.
- `BlockingQueue` is the backbone of the producer-consumer pattern.
- `CopyOnWriteArrayList` is efficient when reads vastly outnumber writes (e.g., listener lists).

---

## Virtual Threads (Java 21+)

Virtual threads are lightweight threads managed by the JVM, not the OS. They let you write simple blocking code and get scalability comparable to reactive/async code.

```java
// Create a virtual thread
Thread vt = Thread.ofVirtual().start(() -> {
    System.out.println("Running in virtual thread");
});

// Executor with virtual threads — perfect for I/O-heavy workloads
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

executor.submit(() -> {
    // This can block on I/O without wasting an OS thread
    String response = httpClient.send(request, ...);
    return response;
});
```

**Tips:**
- Virtual threads are ideal for high-concurrency I/O workloads (HTTP servers, database queries).
- Don't pool virtual threads — create one per task, that's the design intent.
- Virtual threads don't help CPU-bound work — use platform threads (ForkJoinPool) there.
- Synchronized blocks can pin virtual threads to carrier threads — prefer `ReentrantLock` instead.

---

## Summary

Java provides a full concurrency toolkit from low-level to high-level:

- **Threads** — raw concurrent execution units.
- **synchronized / volatile** — basic visibility and mutual exclusion.
- **AtomicInteger/Reference** — lock-free operations for simple counters and references.
- **ExecutorService** — managed thread pools; never create raw threads in production.
- **CompletableFuture** — composable, non-blocking async pipelines.
- **Concurrent collections** — `ConcurrentHashMap`, `BlockingQueue` for thread-safe data sharing.
- **Virtual threads** — JVM-managed lightweight concurrency for high-throughput I/O.

**Key Takeaways:**
- Shared mutable state is the root of all concurrency bugs. Minimize it.
- Prefer higher-level abstractions (`CompletableFuture`, `ExecutorService`) over raw threads.
- Always shut down `ExecutorService` when done.
- Use `ConcurrentHashMap` instead of `HashMap` in concurrent contexts.
- Virtual threads (Java 21+) dramatically simplify high-concurrency I/O-bound service code.
