---
title: "Concurrency"
sidebar_label: "Concurrency"
sidebar_position: 6
---

# Concurrency

Java has had built-in concurrency support since version 1.0. This covers threads, synchronization primitives, the Executor framework, CompletableFuture, concurrent collections, and modern virtual threads.

---

## Threads — The Basics

```java
// ── Creating threads ────────────────────────────────────────────────────────

// 1. Extend Thread (rarely used — limits you to single inheritance)
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Running in: " + Thread.currentThread().getName());
    }
}
new MyThread().start();   // start() launches a new thread; run() executes synchronously

// 2. Implement Runnable (preferred — more flexible)
class MyTask implements Runnable {
    @Override
    public void run() {
        System.out.println("Task running");
    }
}
Thread t = new Thread(new MyTask());
t.start();

// 3. Lambda (most common for simple tasks)
Thread t2 = new Thread(() -> System.out.println("Lambda thread"));
t2.start();

// ── Thread lifecycle methods ────────────────────────────────────────────────
Thread thread = new Thread(() -> { /* work */ });
thread.setName("worker-1");
thread.setDaemon(true);          // daemon threads don't prevent JVM exit
thread.setPriority(Thread.MAX_PRIORITY);  // 1 (MIN) to 10 (MAX), default 5
thread.start();
thread.join();                   // wait for thread to finish
thread.join(5000);               // wait max 5 seconds
thread.isAlive();                // true if started and not yet terminated
thread.interrupt();              // request interruption
thread.isInterrupted();          // check interrupt status

Thread.currentThread()           // get the currently executing thread
Thread.currentThread().getName()
Thread.sleep(1000);              // pause current thread for 1000ms (throws InterruptedException)
Thread.yield();                  // hint to scheduler to let other threads run

// ── Handling InterruptedException ───────────────────────────────────────────
Thread worker = new Thread(() -> {
    try {
        while (!Thread.currentThread().isInterrupted()) {
            doWork();
            Thread.sleep(100);
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();  // restore interrupt status
        System.out.println("Worker interrupted, shutting down");
    }
});
worker.start();
// Later:
worker.interrupt();
```

---

## The Problem: Race Conditions

```java
// UNSAFE — multiple threads incrementing without synchronization
class Counter {
    private int count = 0;
    public void increment() { count++; }  // NOT atomic! read-modify-write
    public int get() { return count; }
}

Counter counter = new Counter();
ExecutorService executor = Executors.newFixedThreadPool(10);
for (int i = 0; i < 1000; i++) {
    executor.submit(counter::increment);
}
executor.shutdown();
executor.awaitTermination(1, TimeUnit.SECONDS);
System.out.println(counter.get());  // likely NOT 1000! race condition
```

---

## synchronized

```java
// Synchronized method — locks on 'this'
class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int get() {
        return count;
    }
}

// Synchronized block — finer-grained locking
class BankAccount {
    private double balance;
    private final Object lock = new Object();

    public void deposit(double amount) {
        synchronized (lock) {
            balance += amount;
        }
    }

    public void withdraw(double amount) {
        synchronized (lock) {
            if (balance < amount) throw new IllegalStateException("Insufficient funds");
            balance -= amount;
        }
    }
}

// Static synchronization — locks on the Class object
class IdGenerator {
    private static int nextId = 0;
    public static synchronized int next() { return nextId++; }
}

// Synchronized on a specific object (avoid synchronizing on String literals or boxed types)
private final Object lockA = new Object();
private final Object lockB = new Object();

void methodA() { synchronized (lockA) { /* ... */ } }
void methodB() { synchronized (lockB) { /* ... */ } }
```

---

## volatile

```java
// volatile guarantees visibility across threads — but NOT atomicity
class Flag {
    private volatile boolean running = true;

    public void stop() { running = false; }   // visible to all threads immediately

    public void run() {
        while (running) {
            doWork();
        }
    }
}

// volatile is NOT enough for compound operations
class Counter {
    private volatile int count = 0;
    public void increment() { count++; }  // STILL not atomic! read-modify-write race
    // Use AtomicInteger instead for counters
}
```

---

## Atomic Classes

```java
import java.util.concurrent.atomic.*;

// AtomicInteger — lock-free, thread-safe integer
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet()      // ++counter, returns new value
counter.getAndIncrement()      // counter++, returns old value
counter.decrementAndGet()
counter.getAndDecrement()
counter.addAndGet(5)           // counter += 5, returns new value
counter.getAndAdd(5)           // counter += 5, returns old value
counter.get()                  // current value
counter.set(10)                // set value
counter.compareAndSet(10, 20)  // CAS: if current==10, set to 20, returns boolean
counter.updateAndGet(n -> n * 2)
counter.getAndUpdate(n -> n * 2)
counter.accumulateAndGet(5, Integer::sum)

// AtomicLong, AtomicBoolean, AtomicReference — same pattern
AtomicLong    al = new AtomicLong(0L);
AtomicBoolean ab = new AtomicBoolean(false);
AtomicReference<String> ar = new AtomicReference<>("initial");
ar.compareAndSet("initial", "updated");
ar.updateAndGet(s -> s.toUpperCase());

// AtomicIntegerArray, AtomicLongArray, AtomicReferenceArray
AtomicIntegerArray arr = new AtomicIntegerArray(10);
arr.incrementAndGet(0);   // atomic on index 0

// LongAdder — better than AtomicLong for high-contention counting
LongAdder adder = new LongAdder();
adder.increment();
adder.add(5);
adder.sum();    // get total
adder.reset();
```

---

## Locks (java.util.concurrent.locks)

```java
import java.util.concurrent.locks.*;

// ReentrantLock — more flexible than synchronized
class BankAccount {
    private double balance;
    private final ReentrantLock lock = new ReentrantLock();

    public void withdraw(double amount) {
        lock.lock();
        try {
            if (balance < amount) throw new IllegalStateException("Insufficient funds");
            balance -= amount;
        } finally {
            lock.unlock();  // ALWAYS unlock in finally
        }
    }

    public boolean tryWithdraw(double amount) {
        if (lock.tryLock()) {  // non-blocking attempt
            try {
                if (balance < amount) return false;
                balance -= amount;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;  // couldn't acquire lock
    }

    public boolean tryWithdrawTimeout(double amount) throws InterruptedException {
        if (lock.tryLock(5, TimeUnit.SECONDS)) {  // wait up to 5s
            try {
                // ...
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;
    }
}

// ReadWriteLock — multiple readers OR one writer
class Cache {
    private final Map<String, String> data = new HashMap<>();
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock  = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();

    public String get(String key) {
        readLock.lock();
        try { return data.get(key); }
        finally { readLock.unlock(); }
    }

    public void put(String key, String value) {
        writeLock.lock();
        try { data.put(key, value); }
        finally { writeLock.unlock(); }
    }
}

// Condition — like wait/notify but more flexible
class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public BoundedBuffer(int capacity) { this.capacity = capacity; }

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) notFull.await();
            queue.offer(item);
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }

    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) notEmpty.await();
            T item = queue.poll();
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
}
```

---

## Executor Framework

```java
import java.util.concurrent.*;

// ── Creating executors ───────────────────────────────────────────────────────
ExecutorService fixed     = Executors.newFixedThreadPool(4);          // exactly 4 threads
ExecutorService cached    = Executors.newCachedThreadPool();          // grows/shrinks as needed
ExecutorService single    = Executors.newSingleThreadExecutor();      // sequential execution
ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(2);

// Virtual thread executor (Java 21+) — see virtual threads section
ExecutorService virtual = Executors.newVirtualThreadPerTaskExecutor();

// Custom ThreadPoolExecutor — full control
ExecutorService custom = new ThreadPoolExecutor(
    4,                              // corePoolSize
    10,                             // maximumPoolSize
    60L, TimeUnit.SECONDS,          // keepAliveTime for idle threads beyond core
    new LinkedBlockingQueue<>(100), // work queue
    new ThreadPoolExecutor.CallerRunsPolicy()  // rejection policy
);

// ── Submitting tasks ─────────────────────────────────────────────────────────
// execute — fire and forget (Runnable, no result)
fixed.execute(() -> System.out.println("Task running"));

// submit — returns a Future (Runnable or Callable)
Future<?> future1 = fixed.submit(() -> System.out.println("Task"));     // Runnable
Future<Integer> future2 = fixed.submit(() -> {                          // Callable
    Thread.sleep(100);
    return 42;
});

// Get the result (blocks until done)
Integer result = future2.get();                       // blocks indefinitely
Integer result2 = future2.get(5, TimeUnit.SECONDS);    // blocks max 5s, throws TimeoutException
future2.isDone()
future2.isCancelled()
future2.cancel(true)   // attempt to cancel (true = interrupt if running)

// invokeAll — submit multiple tasks, wait for all
List<Callable<Integer>> tasks = List.of(
    () -> 1 + 1,
    () -> 2 + 2,
    () -> 3 + 3
);
List<Future<Integer>> results = fixed.invokeAll(tasks);
for (Future<Integer> f : results) {
    System.out.println(f.get());
}

// invokeAny — returns result of first to complete, cancels others
Integer firstResult = fixed.invokeAny(tasks);

// ── Shutdown ──────────────────────────────────────────────────────────────
fixed.shutdown();                              // graceful — finish queued tasks, reject new
fixed.shutdownNow();                           // forceful — interrupt running tasks
boolean terminated = fixed.awaitTermination(10, TimeUnit.SECONDS);  // wait for shutdown
fixed.isShutdown()
fixed.isTerminated()

// Proper shutdown pattern
ExecutorService executor = Executors.newFixedThreadPool(4);
try {
    // submit tasks
} finally {
    executor.shutdown();
    try {
        if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
            executor.shutdownNow();
        }
    } catch (InterruptedException e) {
        executor.shutdownNow();
        Thread.currentThread().interrupt();
    }
}

// ── ScheduledExecutorService ──────────────────────────────────────────────
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

// Run once after delay
scheduler.schedule(() -> System.out.println("Delayed task"), 5, TimeUnit.SECONDS);

// Run repeatedly with fixed delay between END of one and START of next
scheduler.scheduleWithFixedDelay(() -> System.out.println("Tick"), 0, 1, TimeUnit.SECONDS);

// Run repeatedly at fixed rate (regardless of how long the task takes)
scheduler.scheduleAtFixedRate(() -> System.out.println("Tick"), 0, 1, TimeUnit.SECONDS);

scheduler.shutdown();
```

---

## CompletableFuture

`CompletableFuture` represents an asynchronous computation pipeline — similar in spirit to JavaScript Promises.

```java
import java.util.concurrent.CompletableFuture;

// ── Creating ──────────────────────────────────────────────────────────────
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // runs on ForkJoinPool.commonPool() by default
    return fetchUserName();
});

CompletableFuture<Void> futureVoid = CompletableFuture.runAsync(() -> {
    doSomethingWithNoReturn();
});

// With custom executor
ExecutorService executor = Executors.newFixedThreadPool(4);
CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> fetch(), executor);

// Already-completed futures
CompletableFuture<String> done = CompletableFuture.completedFuture("immediate value");

// ── Transforming ─────────────────────────────────────────────────────────
CompletableFuture<Integer> length = future
    .thenApply(String::length);              // transform value (sync, same thread)

CompletableFuture<Integer> lengthAsync = future
    .thenApplyAsync(String::length);         // transform value (different thread)

// thenAccept — consume value, no return
future.thenAccept(name -> System.out.println("Got: " + name));

// thenRun — run after completion, ignore value
future.thenRun(() -> System.out.println("Done!"));

// thenCompose — chain another async operation (flatMap equivalent)
CompletableFuture<User> userFuture = CompletableFuture
    .supplyAsync(() -> fetchUserId())
    .thenCompose(id -> fetchUserById(id));   // returns CompletableFuture<User>

// ── Combining ─────────────────────────────────────────────────────────────
CompletableFuture<User>    userF  = fetchUserAsync();
CompletableFuture<Orders>  orderF = fetchOrdersAsync();

// thenCombine — combine two independent results
CompletableFuture<Profile> combined = userF.thenCombine(orderF, (user, orders) ->
    new Profile(user, orders)
);

// allOf — wait for all (returns Void, must get values individually)
CompletableFuture<Void> all = CompletableFuture.allOf(userF, orderF);
all.thenRun(() -> {
    User u   = userF.join();   // already complete, no blocking
    Orders o = orderF.join();
});

// anyOf — first to complete
CompletableFuture<Object> any = CompletableFuture.anyOf(userF, orderF);

// ── Error handling ────────────────────────────────────────────────────────
CompletableFuture<String> withFallback = future
    .exceptionally(ex -> {
        System.err.println("Failed: " + ex.getMessage());
        return "default value";          // fallback value
    });

CompletableFuture<String> handled = future
    .handle((result, ex) -> {
        if (ex != null) return "error: " + ex.getMessage();
        return result.toUpperCase();
    });

CompletableFuture<String> peeked = future
    .whenComplete((result, ex) -> {
        // always runs, doesn't change the result
        if (ex != null) log.error("Failed", ex);
        else log.info("Succeeded: " + result);
    });

// ── Getting results ────────────────────────────────────────────────────────
String result = future.get();                            // blocks, throws checked exceptions
String result2 = future.join();                          // blocks, throws unchecked CompletionException
String result3 = future.getNow("default");                // non-blocking, default if not done
String result4 = future.get(5, TimeUnit.SECONDS);         // blocks max 5s

// ── Timeout (Java 9+) ─────────────────────────────────────────────────────
CompletableFuture<String> withTimeout = future
    .orTimeout(5, TimeUnit.SECONDS)               // throws TimeoutException if not done in 5s
    .exceptionally(ex -> "timed out");

CompletableFuture<String> withDefault = future
    .completeOnTimeout("default", 5, TimeUnit.SECONDS);  // complete with default after 5s

// ── Full pipeline example ────────────────────────────────────────────────────
CompletableFuture<OrderConfirmation> pipeline = CompletableFuture
    .supplyAsync(() -> fetchUser(userId))
    .thenCompose(user -> fetchCart(user.getId())
        .thenApply(cart -> new UserCart(user, cart)))
    .thenCompose(uc -> validateAndCheckout(uc))
    .thenApply(order -> new OrderConfirmation(order))
    .exceptionally(ex -> OrderConfirmation.failed(ex.getMessage()));

OrderConfirmation confirmation = pipeline.join();
```

---

## Concurrent Collections

```java
import java.util.concurrent.*;

// ConcurrentHashMap — thread-safe, high-performance map
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("a", 1);
map.computeIfAbsent("b", k -> 2);
map.merge("a", 1, Integer::sum);   // atomic merge
map.forEach((k, v) -> System.out.println(k + "=" + v));

// Atomic compound operations
map.compute("counter", (k, v) -> v == null ? 1 : v + 1);

// CopyOnWriteArrayList — thread-safe, good for read-heavy, rarely-modified lists
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("item");   // copies the whole array on each write — expensive for writes!

// BlockingQueue — producer/consumer pattern
BlockingQueue<String> queue = new LinkedBlockingQueue<>(100);  // bounded
queue.put("item");           // blocks if full
String item = queue.take();  // blocks if empty
queue.offer("item", 1, TimeUnit.SECONDS);  // bounded wait
queue.poll(1, TimeUnit.SECONDS);            // bounded wait

ArrayBlockingQueue<String>      abq  = new ArrayBlockingQueue<>(100);
PriorityBlockingQueue<Task>     pbq  = new PriorityBlockingQueue<>();
SynchronousQueue<String>        sq   = new SynchronousQueue<>();  // zero capacity, direct handoff
DelayQueue<DelayedTask>         dq   = new DelayQueue<>();

// Producer/Consumer example
BlockingQueue<Integer> queue = new LinkedBlockingQueue<>(10);

Runnable producer = () -> {
    try {
        for (int i = 0; i < 100; i++) queue.put(i);
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
};

Runnable consumer = () -> {
    try {
        while (true) {
            Integer item = queue.take();
            process(item);
        }
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
};

// ConcurrentLinkedQueue — non-blocking, lock-free queue
ConcurrentLinkedQueue<String> clq = new ConcurrentLinkedQueue<>();
clq.offer("item");
clq.poll();
```

---

## CountDownLatch, CyclicBarrier, Semaphore

```java
// CountDownLatch — wait for N events to occur (one-time use)
CountDownLatch latch = new CountDownLatch(3);

for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doWork();
        latch.countDown();   // signal completion
    }).start();
}
latch.await();   // blocks until count reaches 0
System.out.println("All workers finished");

// CyclicBarrier — wait for N threads to reach a point, then all proceed together (reusable)
CyclicBarrier barrier = new CyclicBarrier(3, () -> System.out.println("All arrived!"));

for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doPhase1();
        try {
            barrier.await();  // wait for all 3 threads
        } catch (Exception e) {}
        doPhase2();  // all threads start phase2 together
    }).start();
}

// Semaphore — limit concurrent access to a resource
Semaphore semaphore = new Semaphore(3);  // max 3 concurrent

void accessResource() throws InterruptedException {
    semaphore.acquire();  // blocks if 3 already in use
    try {
        useResource();
    } finally {
        semaphore.release();
    }
}

semaphore.tryAcquire()                          // non-blocking attempt
semaphore.tryAcquire(5, TimeUnit.SECONDS)       // bounded wait
semaphore.availablePermits()                    // how many free
```

---

## Virtual Threads (Java 21+)

Virtual threads are lightweight threads managed by the JVM, not the OS — you can create millions of them.

```java
// Create a single virtual thread
Thread vt = Thread.ofVirtual().start(() -> {
    System.out.println("Running in virtual thread: " + Thread.currentThread());
});
vt.join();

// Virtual thread executor — one virtual thread per task
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = new ArrayList<>();
    for (int i = 0; i < 10_000; i++) {       // 10,000 concurrent tasks — no problem!
        int taskId = i;
        futures.add(executor.submit(() -> {
            Thread.sleep(100);  // simulates blocking I/O — cheap for virtual threads
            return "Task " + taskId + " done";
        }));
    }
    for (Future<String> f : futures) {
        System.out.println(f.get());
    }
}  // executor auto-closed (AutoCloseable)

// Named virtual threads
Thread.Builder builder = Thread.ofVirtual().name("worker-", 0);
Thread t1 = builder.start(() -> doWork());

// Virtual threads are ideal for I/O-bound work (HTTP calls, DB queries)
// NOT ideal for CPU-bound work — use platform threads / ForkJoinPool for that

// Structured concurrency (preview, Java 21+)
try (var scope = StructuredTaskScope.ShutdownOnFailure.create()) {
    Subtask<User>   userTask  = scope.fork(() -> fetchUser(id));
    Subtask<Orders> orderTask = scope.fork(() -> fetchOrders(id));

    scope.join();           // wait for both
    scope.throwIfFailed();  // propagate any failure

    Profile profile = new Profile(userTask.get(), orderTask.get());
}
```

---

## Summary

- `synchronized` provides mutual exclusion but can lead to contention — use `ReentrantLock` for more control (tryLock, timed lock, fairness).
- `volatile` guarantees visibility but NOT atomicity — use `AtomicInteger`/`AtomicLong` for atomic counters.
- The Executor framework abstracts thread management — never manually manage `Thread` objects for task execution.
- `CompletableFuture` is the modern way to compose async operations — `thenApply`, `thenCompose`, `thenCombine`, `exceptionally`.
- `ConcurrentHashMap` and `BlockingQueue` implementations handle thread-safety for you — prefer them over manual synchronization.
- `CountDownLatch` for one-time coordination, `CyclicBarrier` for repeated rendezvous points, `Semaphore` for limiting concurrent access.
- Virtual threads (Java 21+) make thread-per-request models cheap again — use for I/O-bound workloads with high concurrency.
- Always shut down `ExecutorService` explicitly — leaked thread pools prevent JVM shutdown.
