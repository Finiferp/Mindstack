---
title: "Concurrency"
sidebar_label: "Concurrency"
sidebar_position: 19
---

# Concurrency

threading, multiprocessing, asyncio, and concurrent.futures — when to use each.

---

## The GIL — Why It Matters

```
CPython has a Global Interpreter Lock (GIL):
  Only ONE thread executes Python bytecode at a time.

This means:
  Threads are good for I/O-bound work (network, disk, sleep)
    — thread releases GIL while waiting for I/O
  Threads are NOT good for CPU-bound work (math, parsing, compression)
    — GIL prevents true parallel execution

For CPU-bound work: use multiprocessing (separate processes, no GIL)
For I/O-bound work: use threading or asyncio
For massive concurrency: use asyncio (thousands of connections, low overhead)

Python 3.13+ has experimental "free-threaded" mode (no GIL) — not yet default
```

---

## threading

```python
import threading
import time

# Basic thread
def worker(n):
    print(f"Thread {n} starting")
    time.sleep(1)
    print(f"Thread {n} done")

thread = threading.Thread(target=worker, args=(1,), daemon=True)
thread.start()
thread.join()    # wait for thread to finish

# Multiple threads
threads = []
for i in range(5):
    t = threading.Thread(target=worker, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

# Thread with return value — use a list or queue
results = []

def compute(n, results):
    results.append(n * n)

threads = [threading.Thread(target=compute, args=(i, results)) for i in range(5)]
for t in threads: t.start()
for t in threads: t.join()
print(sorted(results))   # [0, 1, 4, 9, 16]

# Thread class subclass
class MyThread(threading.Thread):
    def __init__(self, n):
        super().__init__()
        self.n = n
        self.result = None

    def run(self):
        self.result = self.n ** 2

threads = [MyThread(i) for i in range(5)]
for t in threads: t.start()
for t in threads: t.join()
print([t.result for t in threads])

# Thread-local storage — each thread has its own copy
local = threading.local()

def set_name(name):
    local.name = name
    time.sleep(0.1)
    print(local.name)   # each thread sees its own value

# Daemon threads — automatically killed when main thread exits
t = threading.Thread(target=long_running_task, daemon=True)
t.start()
# main thread exits → daemon thread killed automatically
```

---

## Synchronisation Primitives

```python
import threading

# Lock — mutual exclusion
lock = threading.Lock()
counter = 0

def increment():
    global counter
    with lock:
        value = counter
        time.sleep(0.001)   # simulate work
        counter = value + 1

threads = [threading.Thread(target=increment) for _ in range(100)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)   # 100 (without lock: could be much less)

# RLock — reentrant lock (same thread can acquire multiple times)
rlock = threading.RLock()

def recursive_fn(n):
    with rlock:      # safe — same thread can re-acquire
        if n > 0:
            recursive_fn(n - 1)

# Event — signal between threads
event = threading.Event()

def waiter():
    print("waiting for event...")
    event.wait()           # blocks until event.set()
    print("event received!")

def setter():
    time.sleep(1)
    event.set()            # wake up all waiters

threading.Thread(target=waiter).start()
threading.Thread(target=setter).start()

event.clear()              # reset (waiters block again)
event.is_set()             # check state

# Semaphore — limit concurrent access
semaphore = threading.Semaphore(3)   # max 3 concurrent

def limited_worker(n):
    with semaphore:       # blocks if 3 already running
        print(f"worker {n} running")
        time.sleep(1)

# Condition — wait for a specific condition
condition = threading.Condition()
items = []

def producer():
    for i in range(5):
        with condition:
            items.append(i)
            condition.notify()   # wake up consumer

def consumer():
    while True:
        with condition:
            condition.wait_for(lambda: len(items) > 0)
            item = items.pop(0)
            print(f"consumed: {item}")

# Barrier — all threads wait until all have reached this point
barrier = threading.Barrier(3)

def task(n):
    print(f"Thread {n} doing phase 1")
    barrier.wait()   # all 3 threads must reach here
    print(f"Thread {n} doing phase 2")
```

---

## multiprocessing

```python
from multiprocessing import Process, Pool, Queue, Pipe, Value, Array
import multiprocessing as mp

# Basic Process (like Thread but separate process)
def worker(n):
    print(f"Process {n}, PID: {os.getpid()}")
    return n * n

if __name__ == "__main__":   # REQUIRED on Windows
    p = Process(target=worker, args=(5,))
    p.start()
    p.join()

# Process Pool — easiest way to parallelise CPU-bound work
def cpu_heavy(n):
    return sum(i*i for i in range(n))

if __name__ == "__main__":
    with Pool(processes=4) as pool:
        # map — apply function to each item in list
        results = pool.map(cpu_heavy, [10000, 20000, 30000, 40000])
        print(results)

        # starmap — multiple arguments
        results = pool.starmap(pow, [(2,3),(3,2),(4,2)])
        print(results)  # [8, 9, 16]

        # imap — lazy iterator version
        for result in pool.imap(cpu_heavy, range(10)):
            print(result)

        # apply_async — non-blocking
        future = pool.apply_async(cpu_heavy, (50000,))
        print(future.get(timeout=10))  # wait for result

# Shared memory — for sharing state between processes
if __name__ == "__main__":
    # Value — single shared value
    counter = Value("i", 0)   # "i" = integer

    def increment(counter):
        for _ in range(1000):
            with counter.get_lock():
                counter.value += 1

    procs = [Process(target=increment, args=(counter,)) for _ in range(4)]
    for p in procs: p.start()
    for p in procs: p.join()
    print(counter.value)   # 4000

    # Array — shared array
    arr = Array("d", [1.0, 2.0, 3.0])   # "d" = double

# Queue — communicate between processes
if __name__ == "__main__":
    q = Queue()

    def producer(q):
        for i in range(5):
            q.put(i)
        q.put(None)   # sentinel

    def consumer(q):
        while True:
            item = q.get()
            if item is None:
                break
            print(f"consumed: {item}")

    p1 = Process(target=producer, args=(q,))
    p2 = Process(target=consumer, args=(q,))
    p1.start(); p2.start()
    p1.join(); p2.join()

# Pipe — bidirectional communication
if __name__ == "__main__":
    parent_conn, child_conn = Pipe()

    def child_fn(conn):
        msg = conn.recv()
        conn.send(f"got: {msg}")
        conn.close()

    p = Process(target=child_fn, args=(child_conn,))
    p.start()
    parent_conn.send("hello")
    print(parent_conn.recv())   # "got: hello"
    p.join()
```

---

## concurrent.futures — High-Level API

The cleanest way to use threads or processes.

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import concurrent.futures

# ThreadPoolExecutor — for I/O-bound tasks
urls = ["https://httpbin.org/get"] * 5

def fetch(url):
    import requests
    return requests.get(url, timeout=5).status_code

with ThreadPoolExecutor(max_workers=5) as executor:
    # map — blocks until all done; preserves order
    results = list(executor.map(fetch, urls))
    print(results)

    # submit — returns a Future; non-blocking
    futures = {executor.submit(fetch, url): url for url in urls}

    # as_completed — process results as they finish
    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result(timeout=10)
            print(f"{url}: {result}")
        except Exception as e:
            print(f"{url} failed: {e}")

# ProcessPoolExecutor — for CPU-bound tasks
def cpu_task(n):
    return sum(i*i for i in range(n))

if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(cpu_task, [10000]*8))
        print(results)

# Exception handling
def risky(n):
    if n == 3:
        raise ValueError("bad value!")
    return n * 2

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(risky, i) for i in range(5)]
    for f in as_completed(futures):
        try:
            print(f.result())
        except ValueError as e:
            print(f"Error: {e}")
```

---

## asyncio — Async I/O

```python
import asyncio
import aiohttp   # pip install aiohttp

# Basic async/await
async def hello():
    print("before")
    await asyncio.sleep(1)    # non-blocking sleep
    print("after")
    return "done"

result = asyncio.run(hello())    # run the event loop

# Multiple coroutines concurrently
async def fetch(session, url):
    async with session.get(url) as response:
        return await response.json()

async def main():
    urls = [
        "https://jsonplaceholder.typicode.com/posts/1",
        "https://jsonplaceholder.typicode.com/posts/2",
        "https://jsonplaceholder.typicode.com/posts/3",
    ]

    async with aiohttp.ClientSession() as session:
        # gather — run concurrently, wait for all
        results = await asyncio.gather(
            *[fetch(session, url) for url in urls]
        )
        for r in results:
            print(r["title"])

asyncio.run(main())

# Tasks — fire and forget or manage independently
async def background_task(n):
    await asyncio.sleep(n)
    return f"done after {n}s"

async def main():
    task1 = asyncio.create_task(background_task(1))
    task2 = asyncio.create_task(background_task(2))

    # Do other work while tasks run
    print("working...")

    # Wait for tasks
    result1 = await task1
    result2 = await task2
    print(result1, result2)

# asyncio.gather vs asyncio.wait
async def main():
    # gather — return results in order; any exception propagates immediately
    results = await asyncio.gather(coro1(), coro2(), return_exceptions=True)

    # wait — more control; get done/pending sets
    done, pending = await asyncio.wait(
        [asyncio.create_task(coro1()), asyncio.create_task(coro2())],
        timeout=5.0,
        return_when=asyncio.FIRST_COMPLETED
    )

# Semaphore — limit concurrent async operations
async def limited_fetch(semaphore, session, url):
    async with semaphore:
        async with session.get(url) as r:
            return await r.json()

async def main():
    semaphore = asyncio.Semaphore(10)   # max 10 concurrent
    async with aiohttp.ClientSession() as session:
        tasks = [limited_fetch(semaphore, session, url) for url in urls]
        results = await asyncio.gather(*tasks)

# Queue in asyncio
async def producer(queue):
    for i in range(5):
        await queue.put(i)
        await asyncio.sleep(0.1)

async def consumer(queue):
    while True:
        item = await queue.get()
        print(f"consumed: {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=3)
    await asyncio.gather(producer(queue), consumer(queue))

# Run sync code in thread pool (don't block the event loop!)
async def main():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, sync_blocking_function, arg1)
    # or:
    result = await asyncio.to_thread(sync_blocking_function, arg1)  # Python 3.9+
```

---

## Choosing the Right Tool

```
Task type          | Best tool
─────────────────────────────────────────────────────────
I/O-bound, few     | threading.Thread or ThreadPoolExecutor
I/O-bound, many    | asyncio (handles thousands of connections)
CPU-bound          | ProcessPoolExecutor or multiprocessing.Pool
Mix of both        | asyncio + run_in_executor for CPU work
Simple parallelism | concurrent.futures (cleanest API)
Background workers | threading with Queue
```

---

## Tips

- Never use `time.sleep()` inside an async function — use `await asyncio.sleep()` instead.
- The `if __name__ == "__main__":` guard is **required** for `multiprocessing` on Windows — always include it.
- Use `ThreadPoolExecutor` instead of managing threads manually — cleaner, handles exceptions better.
- `asyncio.gather(*coroutines, return_exceptions=True)` prevents one failure from cancelling all others.
- `await asyncio.to_thread(blocking_fn)` (Python 3.9+) is the cleanest way to run sync code without blocking the event loop.

---

## Summary

- GIL: threads can't run Python code in parallel — use `multiprocessing` for CPU-bound tasks.
- `threading`: good for I/O-bound tasks; use `Lock`/`Event`/`Semaphore` for synchronisation.
- `multiprocessing.Pool.map()`: simplest way to parallelise CPU-bound work across cores.
- `concurrent.futures`: high-level API — `ThreadPoolExecutor` for I/O, `ProcessPoolExecutor` for CPU.
- `asyncio`: cooperative multitasking — thousands of concurrent I/O operations on one thread.
- `asyncio.gather()` runs coroutines concurrently; `asyncio.create_task()` fires and forgets.
