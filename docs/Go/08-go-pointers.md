---
title: "Pointers"
sidebar_label: "Pointers"
sidebar_position: 8
---

# Pointers

Go has pointers but no pointer arithmetic (unlike C) — they're a safer, more limited tool used for sharing/mutating data without copying, and for representing "no value" for value types.

---

## Basics

```go
x := 42
p := &x                 // & — "address of" — p is now a *int (pointer to int)

fmt.Println(p)          // 0xc0000140a0 (a memory address)
fmt.Println(*p)         // 42 — * — "dereference" — get the value at that address

*p = 100                // modify the value THROUGH the pointer
fmt.Println(x)           // 100 — x itself changed!

// Pointer type declaration
var pp *int              // nil pointer — no address yet
fmt.Println(pp == nil)   // true
// fmt.Println(*pp)      // PANIC: nil pointer dereference — never deref a nil pointer

pp = &x
fmt.Println(*pp)         // 100 — now valid
```

---

## Why Pointers Exist in Go

```
1. Mutation across function boundaries
   Go is pass-by-value — a function normally can't modify the caller's
   variable. Passing a POINTER lets it do so deliberately, explicitly.

func increment(n *int) {
    *n++
}
x := 5
increment(&x)
fmt.Println(x)   // 6

2. Avoiding expensive copies
   Passing a large struct by value copies ALL its fields every call.
   Passing a pointer copies just the (small, fixed-size) address.

type BigStruct struct {
    Data [1000]int
}
func processCopy(b BigStruct) { }        // copies 1000 ints every call
func processPointer(b *BigStruct) { }    // copies one pointer (8 bytes) every call

3. Representing "no value" for value types
   int, bool, struct, etc. always have a value (their zero value) —
   they cannot be nil. A *int CAN be nil, representing "no value provided"
   distinctly from "value provided, and it happens to be 0."

func FindUser(id int) *User {
    // returns nil if not found — distinguishable from "found, empty User"
    if !exists(id) {
        return nil
    }
    return &User{ID: id}
}
```

---

## No Pointer Arithmetic

```go
// Unlike C, Go does NOT allow arithmetic on pointers
x := 42
p := &x
// p = p + 1        // COMPILE ERROR — cannot do arithmetic on pointers

// This is a deliberate safety feature — eliminates an entire class of
// memory-corruption bugs common in C. If you need array-like traversal,
// use slices and indices instead — slices ARE built using pointers
// internally (see go-arrays-slices-maps.md) but expose a safe interface

// The only "unsafe" pointer arithmetic escape hatch is the unsafe
// package (unsafe.Pointer) — used rarely, mostly for low-level interop
// (cgo, certain performance-critical serialization code) and explicitly
// named 'unsafe' to signal you're opting out of Go's normal safety guarantees
```

---

## Pointers to Structs

```go
type Point struct{ X, Y int }

p := Point{1, 2}
ptr := &p

// Go automatically dereferences for field access — no need for (*ptr).X
ptr.X = 100           // shorthand for (*ptr).X = 100
fmt.Println(p.X)      // 100 — original modified through the pointer

// Struct methods with pointer receivers (see go-structs.md) work the same way
type Counter struct{ count int }
func (c *Counter) Increment() { c.count++ }

c := Counter{}
c.Increment()            // Go auto-takes &c since Increment has a pointer receiver
fmt.Println(c.count)     // 1
```

---

## new() vs &Type{}

```go
// new(T) allocates zeroed memory for T, returns *T
p1 := new(int)                  // *int, points to 0
p2 := new(Point)                // *Point, points to Point{X:0, Y:0}

// &Type{} — the more common, idiomatic way to get a pointer to a struct
p3 := &Point{X: 1, Y: 2}        // *Point, initialized with values

// Both are equivalent for the zero-value case:
p4 := new(Point)                // *Point{0, 0}
p5 := &Point{}                  // *Point{0, 0} — same result, more common style

// new() is rarely used in idiomatic Go except for primitive types where
// there's no {} literal shorthand advantage
```

---

## Pointers and Interfaces — The Nil Interface Gotcha

```go
// A famous Go gotcha: a nil POINTER wrapped in an interface is NOT
// itself a nil INTERFACE — this trips up even experienced Go developers

type MyError struct{ msg string }
func (e *MyError) Error() string { return e.msg }

func doSomething() error {
    var err *MyError = nil      // nil pointer
    if false {                  // some condition that's false
        err = &MyError{msg: "failed"}
    }
    return err                  // returns a NON-nil error interface!
}                               // (it wraps a nil *MyError, but the
                                // interface itself has a concrete type)

result := doSomething()
fmt.Println(result == nil)      // false! — surprising but correct
// The interface has TWO parts internally: (type, value)
// Here: (type=*MyError, value=nil) — NOT the same as (type=nil, value=nil)

// Correct pattern — return the nil interface explicitly, not a nil pointer:
func doSomethingCorrect() error {
    var err *MyError = nil
    if false {
        err = &MyError{msg: "failed"}
        return err
    }
    return nil                  // explicit nil interface, not a nil-valued typed pointer
}
```

---

## Pointer Receivers vs Value Receivers Recap

```go
// (Full coverage in go-structs.md — this is the pointer-specific angle)

type Wallet struct{ balance int }

// Value receiver — receives a COPY, changes don't affect the original
func (w Wallet) AddValue(amount int) {
    w.balance += amount         // modifies the COPY only
}

// Pointer receiver — receives the ADDRESS, changes DO affect the original
func (w *Wallet) AddPointer(amount int) {
    w.balance += amount         // modifies the ORIGINAL through the pointer
}

wallet := Wallet{balance: 100}
wallet.AddValue(50)
fmt.Println(wallet.balance)     // still 100 — value receiver had no effect

wallet.AddPointer(50)
fmt.Println(wallet.balance)     // 150 — pointer receiver worked
```

---

## Tips

- Go has no pointer arithmetic — this is a deliberate safety feature, not a missing capability; use slices for array-like traversal instead.
- Nil pointer dereference is Go's most common runtime panic — always check `if p == nil` before dereferencing a pointer that might not have been set.
- The nil-pointer-wrapped-in-interface gotcha is subtle but important — when a function returns an `error` (or any interface type), return a literal `nil`, not a nil-valued typed variable, if you want the caller's `== nil` check to work as expected.
- Prefer `&Type{}` over `new(Type)` for structs — it's more idiomatic and lets you initialize fields in the same expression.
- Struct field access through a pointer doesn't need explicit dereferencing (`ptr.Field`, not `(*ptr).Field`) — Go handles this automatically.

---

## Summary

- `&x` takes the address of a variable; `*p` dereferences a pointer to get/set its value.
- Pointers exist for three reasons: mutation across function boundaries, avoiding expensive struct copies, and representing "no value" for value types.
- No pointer arithmetic — Go deliberately omits it for memory safety; use slices instead.
- Struct field access and method calls through a pointer are automatically dereferenced by the compiler — no explicit `(*p).field` needed.
- The nil-pointer-in-a-non-nil-interface gotcha: a typed nil pointer returned as an interface is NOT `== nil` — return literal `nil` explicitly when appropriate.
- `&Type{}` is the idiomatic way to get a pointer to a newly-created struct; `new(T)` is rarely used except for primitives.
