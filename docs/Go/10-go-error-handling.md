---
title: "Error Handling"
sidebar_label: "Error Handling"
sidebar_position: 10
---

# Error Handling

Go has no exceptions. Errors are ordinary values, returned explicitly alongside a function's normal return value — `panic`/`recover` exist only for truly exceptional, unrecoverable situations.

---

## The error Type and Basic Handling

```go
// error is a built-in interface:
// type error interface {
//     Error() string
// }

import "errors"

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 0)
if err != nil {
    fmt.Println("error:", err)
    return              // or handle appropriately
}
fmt.Println("result:", result)

// The idiomatic Go pattern — check errors IMMEDIATELY after the call
// that might produce one, before doing anything else with the result
val, err := someFunc()
if err != nil {
    return err          // propagate up, often with added context (see below)
}
// use val safely here — err is nil past this point
```

---

## Creating Errors

```go
import (
    "errors"
    "fmt"
)

// errors.New — simple, static error message
err1 := errors.New("something went wrong")

// fmt.Errorf — formatted error message (like Sprintf, but returns an error)
err2 := fmt.Errorf("failed to process item %d: %s", 42, "invalid format")

// fmt.Errorf with %w — WRAPS another error, preserving it for later inspection
baseErr := errors.New("connection refused")
wrappedErr := fmt.Errorf("failed to connect to database: %w", baseErr)
fmt.Println(wrappedErr)     // "failed to connect to database: connection refused"
```

---

## Custom Error Types

```go
// Simple custom error — implement the Error() method
type NotFoundError struct {
    Resource string
    ID       int
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with ID %d not found", e.Resource, e.ID)
}

func findUser(id int) (*User, error) {
    user, exists := db[id]
    if !exists {
        return nil, &NotFoundError{Resource: "user", ID: id}
    }
    return user, nil
}

// Error with additional structured data — useful for programmatic handling
type ValidationError struct {
    Field   string
    Value   interface{}
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for field %q (value: %v): %s",
        e.Field, e.Value, e.Message)
}

// Sentinel errors — package-level error VALUES for exact-match comparison
var (
    ErrNotFound      = errors.New("not found")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrInvalidInput  = errors.New("invalid input")
)

func fetchResource(id int) error {
    if id < 0 {
        return ErrInvalidInput
    }
    // ...
    return ErrNotFound
}
```

---

## errors.Is and errors.As — Inspecting Wrapped Errors

```go
// errors.Is — checks if an error IS (or wraps) a specific sentinel error
if err := fetchResource(5); errors.Is(err, ErrNotFound) {
    fmt.Println("resource doesn't exist")
}

// This works even through multiple layers of wrapping:
baseErr := ErrNotFound
wrapped := fmt.Errorf("failed in service layer: %w", baseErr)
doubleWrapped := fmt.Errorf("failed in handler: %w", wrapped)
fmt.Println(errors.Is(doubleWrapped, ErrNotFound))    // true — unwraps through both layers

// errors.As — extracts a specific ERROR TYPE from a (possibly wrapped) error chain
func handleError(err error) {
    var notFoundErr *NotFoundError
    if errors.As(err, &notFoundErr) {
        fmt.Printf("resource %s (id=%d) missing\n", notFoundErr.Resource, notFoundErr.ID)
        return
    }

    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        fmt.Printf("bad field: %s\n", validationErr.Field)
        return
    }

    fmt.Println("unknown error:", err)
}

// errors.Unwrap — manually get the next error in the chain (rarely needed
// directly — errors.Is/As already unwrap internally)
inner := errors.Unwrap(wrapped)    // returns baseErr
```

---

## panic and recover

`panic` stops normal execution immediately; `recover` can catch a panic and resume — used sparingly, for truly unexpected/unrecoverable situations, NOT as a general error-handling mechanism.

```go
func riskyOperation() {
    panic("something catastrophic happened")
}

// Recover — must be called INSIDE a deferred function to have any effect
func safeCall() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("recovered from panic:", r)
        }
    }()
    riskyOperation()
    fmt.Println("this line never executes")     // panic skips remaining code
}
safeCall()
fmt.Println("program continues normally")       // execution resumes here

// Common legitimate uses of panic:
//   Programmer errors that should never happen in correct code
//   (index out of bounds, nil pointer deref — these ARE panics automatically)
//   Truly unrecoverable startup failures (can't read required config — panic
//   immediately rather than limping along in a broken state)

// panic is triggered automatically by several runtime conditions:
arr := []int{1, 2, 3}
// arr[10]                      // panics: index out of range
var p *int
// *p                           // panics: nil pointer dereference
var m map[string]int
// m["key"] = 1                 // panics: assignment to entry in nil map
x, y := 10, 0
// x / y                        // panics: integer divide by zero

// Converting a panic into a returned error at an API boundary — the
// standard pattern for library code that must never crash its caller:
func SafeDivide(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r)
        }
    }()
    result = a / b              // panics if b == 0, recovered above, converted to error
    return
}
```

---

## Error Handling Patterns in Practice

```go
// Pattern 1: propagate with added context
func processOrder(orderID int) error {
    order, err := fetchOrder(orderID)
    if err != nil {
        return fmt.Errorf("processOrder: fetching order %d: %w", orderID, err)
    }
    if err := validateOrder(order); err != nil {
        return fmt.Errorf("processOrder: validating order %d: %w", orderID, err)
    }
    return nil
}
// Each layer adds context; errors.Is/As still work through all the wrapping

// Pattern 2: collect multiple errors (Go 1.20+)
import "errors"

func validateAll(fields map[string]string) error {
    var errs []error
    if fields["email"] == "" {
        errs = append(errs, errors.New("email is required"))
    }
    if fields["name"] == "" {
        errs = append(errs, errors.New("name is required"))
    }
    return errors.Join(errs...)         // combines multiple errors into one;
}                                       // nil if errs is empty

// Pattern 3: retry with backoff
func fetchWithRetry(url string, maxAttempts int) (*http.Response, error) {
    var lastErr error
    for attempt := 1; attempt <= maxAttempts; attempt++ {
        resp, err := http.Get(url)
        if err == nil {
            return resp, nil
        }
        lastErr = err
        time.Sleep(time.Duration(attempt) * time.Second)
    }
    return nil, fmt.Errorf("failed after %d attempts: %w", maxAttempts, lastErr)
}

// Pattern 4: sentinel error checking at the top-level handler (e.g. HTTP)
func handleRequest(w http.ResponseWriter, r *http.Request) {
    err := processOrder(42)
    switch {
    case err == nil:
        w.WriteHeader(http.StatusOK)
    case errors.Is(err, ErrNotFound):
        w.WriteHeader(http.StatusNotFound)
    case errors.Is(err, ErrInvalidInput):
        w.WriteHeader(http.StatusBadRequest)
    default:
        w.WriteHeader(http.StatusInternalServerError)
    }
}
```

---

## defer — Guaranteed Cleanup

```go
// defer schedules a function call to run when the surrounding function
// returns — regardless of HOW it returns (normal return, panic, or error)

func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()         // GUARANTEED to run when readFile returns, any path

    // ... use f ...
    return nil              // f.Close() runs automatically here
}

// Multiple defers run in LIFO order (last deferred, first executed)
func example() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
}
// prints: 3, 2, 1

// defer arguments are evaluated IMMEDIATELY, but the call happens LATER
func example2() {
    x := 1
    defer fmt.Println("deferred x:", x)    // captures x=1 NOW
    x = 2
    fmt.Println("current x:", x)           // prints 2
}
// output: "current x: 2" then "deferred x: 1"

// Common pattern: acquire/release resources (locks, files, connections)
func withLock(mu *sync.Mutex, fn func()) {
    mu.Lock()
    defer mu.Unlock()    // guaranteed unlock even if fn panics
    fn()
}
```

---

## Tips

- Check errors immediately after the call that might produce them — resist the temptation to "check later" or ignore with `_`.
- Use `fmt.Errorf("...: %w", err)` to wrap errors with context as they propagate up through layers — this preserves the original error for `errors.Is`/`errors.As` while adding a human-readable trail.
- Reserve `panic` for programmer errors and truly unrecoverable situations — using it for expected/recoverable error conditions (like "file not found") is not idiomatic Go.
- `recover()` only works when called directly inside a deferred function — calling it anywhere else has no effect.
- `defer` is your go-to tool for guaranteed cleanup (closing files, unlocking mutexes, closing DB connections) — it runs regardless of how the function exits, including via panic.

---

## Summary

- Errors are ordinary values (`error` interface) returned alongside results — check with `if err != nil` immediately after every fallible call.
- `errors.New`/`fmt.Errorf` create errors; `%w` in `fmt.Errorf` wraps an existing error, preserving it for later inspection.
- `errors.Is` checks for a specific sentinel error anywhere in a wrapped chain; `errors.As` extracts a specific custom error type from the chain.
- `panic`/`recover` are for truly exceptional situations, not general error handling — `recover()` only works inside a deferred function.
- `defer` guarantees cleanup code runs when a function returns, regardless of the exit path — the standard pattern for closing files, unlocking mutexes, and similar resource management.
- `errors.Join` (Go 1.20+) combines multiple errors into one when validating several things at once.
