---
title: "Concurrency — Goroutines and Channels"
sidebar_label: "Concurrency"
sidebar_position: 11
---

# Concurrency — Goroutines and Channels

Go's built-in concurrency model is its most distinctive feature. Goroutines are lightweight threads managed by the Go runtime; channels are the idiomatic way for them to communicate safely. "Don't communicate by sharing memory; share memory by communicating."

---

## Goroutines

```go
import (
    "fmt"
    "time"
)

func sayHello() {
    fmt.Println("Hello from goroutine!")
}

func main() {
    go sayHello()                           // 'go' keyword launches a goroutine — runs concurrently

    fmt.Println("Hello from main!")
    time.Sleep(100 * time.Millisecond)      // crude way to wait — NOT idiomatic,
}                                           // used here only to illustrate timing;
                                            // real code uses sync.WaitGroup (below)

// Anonymous function as a goroutine
go func() {
    fmt.Println("running in a goroutine")
}()

// Goroutines with arguments
go func(name string) {
    fmt.Println("Hello,", name)
}("Alice")

// Goroutines are EXTREMELY cheap — you can launch thousands/millions
// (starting stack: ~2KB, grows dynamically, vs OS threads at ~1-8MB fixed)
// This is why Go servers routinely spawn a goroutine PER incoming request
// without a second thought
```

---

## WaitGroup — Waiting for Goroutines to Finish

```go
import "sync"

func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)                           // increment the counter BEFORE launching
        go func(id int) {
            defer wg.Done()                 // decrement when this goroutine finishes
            fmt.Println("worker", id, "done")
        }(i)                                // pass i explicitly (Go 1.22+ loop
    }                                       // variable semantics make this less
                                            // critical than pre-1.22, but still clear)

    wg.Wait()                               // blocks until the counter reaches 0
    fmt.Println("all workers finished")
}
```

---

## Channels — Communication Between Goroutines

```go
// Unbuffered channel — send blocks until a receiver is ready (synchronous handoff)
ch := make(chan int)

go func() {
    ch <- 42                // send — blocks until someone receives
}()
value := <-ch               // receive — blocks until someone sends
fmt.Println(value)          // 42

// Buffered channel — send doesn't block until the buffer is full
ch2 := make(chan int, 3)    // capacity 3
ch2 <- 1
ch2 <- 2
ch2 <- 3                    // fine — buffer not full yet
// ch2 <- 4                 // would BLOCK — buffer is full

// Closing a channel — signals "no more values will be sent"
ch3 := make(chan int, 3)
ch3 <- 1
ch3 <- 2
close(ch3)

// Receiving from a closed channel returns remaining buffered values,
// then the zero value with ok=false
v, ok := <-ch3      // 1, true
v, ok = <-ch3       // 2, true
v, ok = <-ch3       // 0, false — channel closed and drained

// range over a channel — receives until the channel is closed
ch4 := make(chan int, 3)
go func() {
    for i := 0; i < 3; i++ {
        ch4 <- i
    }
    close(ch4)             // MUST close, or range blocks forever waiting for more
}()
for v := range ch4 {
    fmt.Println(v)
}

// Directional channels — restrict a channel to send-only or receive-only
// in a function signature (compiler-enforced, prevents misuse)
func send(ch chan<- int, v int) { ch <- v }        // send-only
func receive(ch <-chan int) int { return <-ch }    // receive-only
```

---

## select — Waiting on Multiple Channels

```go
// select is like switch, but for channel operations — blocks until
// ONE of its cases can proceed, chooses RANDOMLY if multiple are ready

ch1 := make(chan string)
ch2 := make(chan string)

go func() { ch1 <- "from ch1" }()
go func() { ch2 <- "from ch2" }()

select {
case msg1 := <-ch1:
    fmt.Println(msg1)
case msg2 := <-ch2:
    fmt.Println(msg2)
}

// select with a default case — makes the whole select NON-BLOCKING
select {
case msg := <-ch1:
    fmt.Println("got:", msg)
default:
    fmt.Println("no message ready, moving on")    // executes immediately if nothing ready
}

// select with a timeout — extremely common real-world pattern
import "time"

select {
case msg := <-ch1:
    fmt.Println("got:", msg)
case <-time.After(2 * time.Second):
    fmt.Println("timed out waiting for a message")
}

// select in a loop — common pattern for a worker that handles multiple
// event sources plus a shutdown signal
func worker(jobs <-chan int, done <-chan struct{}) {
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return    // jobs channel closed
            }
            fmt.Println("processing job", job)
        case <-done:
            fmt.Println("shutting down")
            return
        }
    }
}
```

---

## Worker Pool Pattern

The single most common real-world Go concurrency pattern — a fixed number of goroutines pulling work from a shared channel.

```go
func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {                       // exits automatically when jobs channel closes
        fmt.Printf("worker %d processing job %d\n", id, j)
        time.Sleep(time.Millisecond * 100)      // simulate work
        results <- j * 2
    }
}

func main() {
    const numWorkers = 3
    const numJobs = 10

    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)
    var wg sync.WaitGroup

    // Start the worker pool
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs)             // signal no more jobs — workers finish their current
                            // job then exit their range loop

    wg.Wait()               // wait for all workers to finish
    close(results)          // safe to close now — all sends are done

    for r := range results {
        fmt.Println("result:", r)
    }
}
```

---

## sync Package — Mutexes and Other Primitives

```go
import "sync"

// Mutex — mutual exclusion lock, protects shared state accessed by
// multiple goroutines
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}

counter := SafeCounter{}
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        counter.Increment()
    }()
}
wg.Wait()
fmt.Println(counter.Value())    // 1000 — correct, thanks to the mutex

// RWMutex — allows multiple concurrent READERS, but exclusive WRITER access
type SafeMap struct {
    mu   sync.RWMutex
    data map[string]int
}

func (m *SafeMap) Get(key string) int {
    m.mu.RLock()             // read lock — multiple goroutines can hold this simultaneously
    defer m.mu.RUnlock()
    return m.data[key]
}

func (m *SafeMap) Set(key string, value int) {
    m.mu.Lock()               // write lock — exclusive, blocks all readers and writers
    defer m.mu.Unlock()
    m.data[key] = value
}

// sync.Once — ensures a function runs EXACTLY once, even across many goroutines
var once sync.Once
func initConfig() {
    once.Do(func() {
        fmt.Println("initializing config (only happens once)")
    })
}

// sync.Map — a concurrent-safe map for specific high-contention/append-mostly
// use cases (usually a regular map + Mutex is simpler and preferable for
// general-purpose use — sync.Map is optimized for narrower access patterns)
var sm sync.Map
sm.Store("key", "value")
value, ok := sm.Load("key")
```

---

## The Race Detector

```bash
# Go's built-in tool for catching data races — genuinely essential
go run -race main.go
go test -race ./...

# A data race: two goroutines accessing the same memory concurrently,
# at least one of them writing, with no synchronization — this is
# UNDEFINED BEHAVIOR even if it "seems to work" in testing
```

```go
// Example of a data race (BUGGY — DO NOT write code like this)
count := 0
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        count++             // RACE: concurrent read-modify-write with no synchronization
    }()
}
wg.Wait()
fmt.Println(count)          // unpredictable result — often less than 1000

// Fix: use a Mutex (see SafeCounter above) or an atomic operation:
import "sync/atomic"
var count int64
// ... in goroutines:
atomic.AddInt64(&count, 1)  // atomic — safe without an explicit lock
```

---

## Context — Cancellation and Deadlines

```go
import "context"

// context.Context propagates cancellation signals, deadlines, and
// request-scoped values across API boundaries and goroutines — the
// standard way to control goroutine lifetimes in real applications

func doWork(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()      // context canceled or deadline exceeded
        default:
            // do a chunk of work
            time.Sleep(100 * time.Millisecond)
        }
    }
}

// Cancellation
ctx, cancel := context.WithCancel(context.Background())
go doWork(ctx)
time.Sleep(500 * time.Millisecond)
cancel()                        // signals doWork to stop via ctx.Done()

// Timeout / deadline
ctx2, cancel2 := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel2()        // ALWAYS call cancel, even on timeout paths — releases resources
result, err := doWorkWithResult(ctx2)

// Passing values (sparingly — for request-scoped data like trace IDs,
// NOT as a general parameter-passing mechanism)
ctx3 := context.WithValue(context.Background(), "requestID", "abc-123")
requestID := ctx3.Value("requestID")

// context is pervasive in Go HTTP servers, database drivers, and gRPC —
// nearly every I/O function in modern Go libraries accepts a ctx as its
// first parameter specifically to support cancellation/timeouts
```

---

## Tips

- Goroutines are cheap — don't hesitate to launch one per request/task; the Go runtime schedules them efficiently across available OS threads automatically.
- Always run tests with `-race` during development — data races are a common source of "works on my machine, fails randomly in production" bugs, and the race detector catches most of them reliably.
- `sync.WaitGroup` for "wait until N goroutines finish"; channels for passing data between goroutines; `context.Context` for cancellation/timeouts — know when to reach for each.
- Close a channel from the SENDER side, never the receiver — closing a channel you're not sure has stopped being written to causes a panic ("send on closed channel").
- Prefer channels for communication and Mutex for protecting simple shared state — don't force everything through channels if a Mutex is simpler and clearer for the specific case.

---

## Summary

- `go func()` launches a goroutine — extremely lightweight, thousands can run concurrently.
- Channels (`make(chan T)`) are the idiomatic way for goroutines to communicate; unbuffered channels synchronize, buffered channels decouple sender/receiver up to capacity.
- `select` waits on multiple channel operations simultaneously — add a `default` for non-blocking, or `time.After()` for a timeout.
- The worker pool pattern (fixed goroutines pulling from a shared jobs channel) is the most common real-world concurrency pattern in Go.
- `sync.Mutex`/`sync.RWMutex` protect shared state; `sync.WaitGroup` waits for goroutines to finish; `sync.Once` runs initialization exactly once.
- Always test with `-race` — data races are undefined behavior even when they "seem to work."
- `context.Context` is the standard mechanism for cancellation, timeouts, and request-scoped values across goroutines and API boundaries.
