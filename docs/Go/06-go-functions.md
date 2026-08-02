---
title: "Functions"
sidebar_label: "Functions"
sidebar_position: 6
---

# Functions

Functions are first-class values in Go — they can be assigned to variables, passed as arguments, returned from other functions, and support multiple return values (used pervasively for error handling).

---

## Basic Function Syntax

```go
func add(a int, b int) int {
    return a + b
}

// Shared type shorthand — when consecutive params share a type
func add2(a, b int) int {
    return a + b
}

// No parameters, no return value
func greet() {
    fmt.Println("Hello!")
}

// Calling
result := add(3, 4)
greet()
```

---

## Multiple Return Values

The signature feature that makes Go's error handling work — used everywhere in the standard library and idiomatic Go code.

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
    fmt.Println("error:", err)
} else {
    fmt.Println("result:", result)
}

// Ignoring a return value with the blank identifier
result, _ := divide(10, 2)   // discard the error (not recommended in real code!)

// Multiple non-error returns are also common
func minMax(nums []int) (int, int) {
    min, max := nums[0], nums[0]
    for _, n := range nums {
        if n < min { min = n }
        if n > max { max = n }
    }
    return min, max
}

lo, hi := minMax([]int{3, 1, 4, 1, 5, 9})
```

---

## Named Return Values

```go
// Named returns are declared in the signature and initialized to their
// zero values; a bare 'return' returns their current values

func divide(a, b float64) (result float64, err error) {
    if b == 0 {
        err = errors.New("division by zero")
        return              // "naked return" — returns (result, err) as currently set
    }
    result = a / b
    return                  // returns (result, nil)
}

// Named returns are especially useful with defer for modifying the
// return value on the way out (common in error-wrapping patterns):
func doWork() (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered from panic: %v", r)
        }
    }()
    // ... code that might panic ...
    return nil
}

// Style note: named returns are useful for documentation and the defer
// pattern above, but naked 'return' in long functions hurts readability —
// prefer explicit 'return result, err' in most cases
```

---

## Variadic Functions

```go
// ...type — accepts any number of arguments, collected into a slice
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

sum(1, 2, 3)                // 6
sum(1, 2, 3, 4, 5)          // 15
sum()                       // 0 — zero arguments is fine

// Spreading a slice into a variadic call with ...
nums := []int{1, 2, 3, 4}
sum(nums...)              // unpack the slice as individual arguments

// fmt.Println itself is variadic — this is why it accepts any number of args
func Println(a ...interface{}) (n int, err error)

// Variadic must be the LAST parameter
func labeled(label string, nums ...int) {
    fmt.Println(label, nums)
}
```

---

## Functions as Values — First-Class Functions

```go
// Assign a function to a variable
add := func(a, b int) int {
    return a + b
}
result := add(3, 4)

// Function type as a parameter — higher-order functions
func apply(fn func(int, int) int, a, b int) int {
    return fn(a, b)
}
apply(add, 3, 4)
apply(func(a, b int) int { return a * b }, 3, 4)   // inline anonymous function

// Function type declaration — for readability
type MathOp func(int, int) int

func compute(op MathOp, a, b int) int {
    return op(a, b)
}

// Returning a function from a function
func multiplier(factor int) func(int) int {
    return func(n int) int {
        return n * factor
    }
}
double := multiplier(2)
triple := multiplier(3)
fmt.Println(double(5))   // 10
fmt.Println(triple(5))   // 15

// map of functions — dispatch table pattern
operations := map[string]func(int, int) int{
    "add": func(a, b int) int { return a + b },
    "sub": func(a, b int) int { return a - b },
    "mul": func(a, b int) int { return a * b },
}
result := operations["add"](3, 4)
```

---

## Closures

```go
// A closure captures variables from its enclosing scope BY REFERENCE

func makeCounter() func() int {
    count := 0
    return func() int {
        count++          // captures and mutates 'count' from the enclosing scope
        return count
    }
}

counter := makeCounter()
fmt.Println(counter())      // 1
fmt.Println(counter())      // 2
fmt.Println(counter())      // 3

counter2 := makeCounter()   // independent closure, its own 'count'
fmt.Println(counter2())     // 1

// Classic Go gotcha (pre-1.22): loop variable capture
funcs := []func(){}
for i := 0; i < 3; i++ {
    funcs = append(funcs, func() {
        fmt.Println(i)     // pre-Go-1.22: ALL closures print 3 (shared 'i')
    })                     // Go 1.22+: each closure gets its OWN 'i' — prints 0,1,2
}
for _, f := range funcs {
    f()
}
// Pre-1.22 fix (still common in older code / for clarity):
for i := 0; i < 3; i++ {
    i := i                // shadow — create a new variable per iteration
    funcs = append(funcs, func() { fmt.Println(i) })
}
```

---

## Recursion

```go
func factorial(n int) int {
    if n <= 1 {
        return 1
    }
    return n * factorial(n-1)
}

func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}

// Go has no built-in memoization — implement manually with a map
func memoFib() func(int) int {
    cache := make(map[int]int)
    var fib func(int) int
    fib = func(n int) int {
        if n <= 1 {
            return n
        }
        if v, ok := cache[n]; ok {
            return v
        }
        result := fib(n-1) + fib(n-2)
        cache[n] = result
        return result
    }
    return fib
}

// Go does NOT guarantee tail-call optimization — deep recursion can
// overflow the stack (though Go's stacks grow dynamically, starting
// small and expanding, so the limit is much higher than fixed-stack
// languages, but not infinite)
```

---

## Passing by Value vs Reference

```go
// Go is ALWAYS pass-by-value — but some types "act like" references
// because the value being copied is itself a reference/pointer internally

func modifySlice(s []int) {
    s[0] = 99               // MODIFIES the caller's data — slice header contains
}                           // a pointer to the same underlying array

func appendSlice(s []int) {
    s = append(s, 100)      // may or may not affect caller (see go-arrays-slices-maps.md
}                           // — depends on whether capacity was exceeded)

func modifyMap(m map[string]int) {
    m["key"] = 99           // MODIFIES the caller's data — maps are reference types
}

func modifyStruct(p Point) {
    p.X = 99                // does NOT modify caller — struct is copied entirely
}

func modifyStructPointer(p *Point) {
    p.X = 99                // DOES modify caller — dereferences the pointer
}

// Types that behave like references when passed (because they internally
// contain a pointer): slices, maps, channels, functions
// Types that are always fully copied: structs, arrays, all primitive types
// (see go-pointers.md for the full explanation of this distinction)
```

---

## Tips

- Multiple return values with `(value, error)` is THE idiomatic Go pattern — get comfortable with `if err != nil` immediately after almost every function call.
- Named returns + `defer` + `recover()` is the standard pattern for converting a panic into a returned error at a function boundary — see go-error-handling.md.
- Be deliberate about closures capturing loop variables — Go 1.22 changed the semantics (each iteration gets its own variable), so code relying on the old shared-variable behavior will behave differently on newer Go versions.
- Remember slices/maps "act like" references (they internally hold a pointer) while structs and arrays are always fully copied on assignment/parameter passing — this explains most "why did my function not modify my data" confusion.
- Variadic parameters must be last in the parameter list, and you can spread an existing slice into one with `slice...`.

---

## Summary

- `func name(params) returnType { }` — Go supports multiple return values, used pervasively for `(result, error)` pairs.
- Named return values + naked `return` are useful for documentation and the defer/recover error-wrapping pattern — avoid overusing naked returns in long functions.
- Variadic functions (`...int`) accept any number of arguments as a slice; spread an existing slice into a variadic call with `slice...`.
- Functions are first-class values — assignable to variables, passable as arguments, returnable from other functions.
- Closures capture enclosing variables by reference — be aware of loop variable capture semantics (changed in Go 1.22).
- Go is always pass-by-value; slices/maps/channels "feel" like reference types because they internally hold a pointer, while structs and arrays are always fully copied.
