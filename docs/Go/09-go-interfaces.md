---
title: "Interfaces"
sidebar_label: "Interfaces"
sidebar_position: 9
---

# Interfaces

Interfaces in Go are implicitly satisfied — there's no `implements` keyword. If a type has the right methods, it automatically satisfies the interface. This is Go's core mechanism for polymorphism.

---

## Defining and Implementing Interfaces

```go
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Rectangle struct{ Width, Height float64 }

func (r Rectangle) Area() float64      { return r.Width * r.Height }
func (r Rectangle) Perimeter() float64 { return 2 * (r.Width + r.Height) }

type Circle struct{ Radius float64 }

func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }

// Rectangle and Circle both satisfy Shape AUTOMATICALLY — no "implements"
// declaration anywhere. This is called STRUCTURAL TYPING or "duck typing
// with compile-time checks."

func printShapeInfo(s Shape) {
    fmt.Printf("Area: %.2f, Perimeter: %.2f\n", s.Area(), s.Perimeter())
}

printShapeInfo(Rectangle{Width: 4, Height: 5})
printShapeInfo(Circle{Radius: 3})

// A slice of the interface type can hold ANY concrete type satisfying it
shapes := []Shape{
    Rectangle{Width: 4, Height: 5},
    Circle{Radius: 3},
}
for _, s := range shapes {
    printShapeInfo(s)
}
```

---

## Why Implicit Satisfaction Matters

```go
// Because satisfaction is implicit, you can define an interface AFTER
// the type already exists — even for types you don't own (standard
// library types, third-party packages)

// Example: you can define your OWN interface that matches methods
// ALREADY on os.File, without os.File knowing anything about your interface
type Reader interface {
    Read(p []byte) (n int, err error)
}
// os.File already has a Read method with this exact signature —
// it satisfies your Reader interface automatically, retroactively,
// with zero changes to the os package

// This is fundamentally different from Java/C#'s explicit "implements"
// model, where a type must declare upfront which interfaces it implements.
// Go's model enables writing small, focused interfaces that existing
// types satisfy without any coordination.
```

---

## The Empty Interface — interface{} / any

```go
// interface{} (or 'any', the Go 1.18+ alias) has ZERO required methods —
// EVERY type satisfies it. This is Go's "accept anything" escape hatch.

func describe(v interface{}) {
    fmt.Printf("Value: %v, Type: %T\n", v, v)
}

describe(42)
describe("hello")
describe(3.14)
describe([]int{1, 2, 3})

// 'any' is a type alias for interface{}, added in Go 1.18 for readability
func describe2(v any) { }    // identical to interface{} version

// Common uses:
//   fmt.Println(a ...any)                  — accepts anything to print
//   map[string]any                         — arbitrary/dynamic JSON-like data
//   Generic pre-Go-1.18 container types (largely replaced by real generics now)

// The empty interface loses type safety    — you must type-assert to use
// the underlying value meaningfully (see below). Prefer specific
// interfaces or generics (go-generics.md) where possible instead of
// interface{}/any as a default choice.
```

---

## Type Assertions

```go
var i interface{} = "hello"

// Type assertion — "I assert this interface holds a string"
s := i.(string)                 // panics if i does NOT hold a string
fmt.Println(s)

// Safe form — "comma ok" idiom (does NOT panic)
s, ok := i.(string)
if !ok {
    fmt.Println("not a string")
}

f, ok := i.(float64)            // ok is false; f is float64's zero value (0)

// Type switch — assert against MULTIPLE possible types cleanly
func process(i interface{}) {
    switch v := i.(type) {
    case int:
        fmt.Println("int:", v*2)
    case string:
        fmt.Println("string:", v+v)
    case []int:
        fmt.Println("slice, sum:", sum(v))
    case nil:
        fmt.Println("nil value")
    default:
        fmt.Printf("unhandled type: %T\n", v)
    }
}
```

---

## Interface Composition

```go
// Interfaces can embed other interfaces — building larger interfaces
// from smaller ones (the same "small, focused pieces" philosophy)

type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader      // embeds Reader's method set
    Writer      // embeds Writer's method set
}
// ReadWriter requires BOTH Read() and Write() — any type implementing
// both methods automatically satisfies ReadWriter

// This is EXACTLY how the standard library's io package is designed —
// io.Reader, io.Writer, io.Closer are tiny (one method each), and
// io.ReadWriteCloser composes all three. This composability is a core
// reason Go's standard library interfaces are so reusable.
```

---

## The Standard Library's Small-Interface Philosophy

```go
// Go's most famous interface design principle: "the bigger the
// interface, the weaker the abstraction" — Rob Pike

// io.Reader — arguably the most important interface in Go, ONE method:
type Reader interface {
    Read(p []byte) (n int, err error)
}
// Anything that can produce a stream of bytes satisfies this: files,
// network connections, in-memory buffers, HTTP request bodies,
// gzip decompressors, string readers — ALL of them work anywhere
// an io.Reader is expected, because the interface asks for almost nothing

// Similarly:
type Stringer interface {
    String() string         // used by fmt package automatically for %v/%s
}
type Error interface {
    Error() string          // the built-in 'error' type IS this interface
}

// Idiomatic Go interface design: define the SMALLEST interface that
// captures what you actually need, right where you USE it (often in
// the consuming package, not the implementing package) — this is the
// opposite instinct from languages where you define a big interface
// upfront and implement it explicitly
```

---

## Implementing fmt.Stringer

```go
type Point struct{ X, Y int }

// Without Stringer: fmt.Println(p) prints "{1 2}"
// With Stringer: fmt.Println(p) uses your custom formatting

func (p Point) String() string {
    return fmt.Sprintf("(%d, %d)", p.X, p.Y)
}

p := Point{1, 2}
fmt.Println(p)              // (1, 2) — automatically uses String()
fmt.Printf("%v\n", p)       // (1, 2) — %v also uses String() if available
fmt.Printf("%s\n", p)       // (1, 2)
```

---

## Implementing the error Interface

```go
// The built-in 'error' type is itself just an interface:
// type error interface {
//     Error() string
// }

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

func validate(age int) error {
    if age < 0 {
        return &ValidationError{Field: "age", Message: "must be non-negative"}
    }
    return nil
}

err := validate(-5)
if err != nil {
    fmt.Println(err)    // uses Error() automatically — prints the formatted message
}

// See go-error-handling.md for the full depth on error handling patterns,
// including errors.Is/As and wrapping
```

---

## Interface Values Internally — Type + Value Pair

```go
// An interface value is internally a PAIR: (concrete type, concrete value)
// This explains a lot of interface behavior that otherwise seems magical

var s Shape                     // (nil, nil) — no type, no value
s = Circle{Radius: 5}           // (Circle, {Radius:5})

// This dual nature is WHY the nil-pointer-wrapped-in-interface gotcha
// exists (covered in depth in go-pointers.md) — an interface holding a
// nil POINTER still has a non-nil TYPE, so the interface itself isn't nil

// Checking if an interface is genuinely empty:
if s == nil {
    fmt.Println("truly nil — no type, no value")
}
```

---

## Tips

- Design interfaces from the CONSUMER'S side (what does the calling code actually need?), not the implementer's side — this keeps interfaces small and focused, which is the idiomatic Go style.
- Prefer accepting interfaces as function parameters, but returning concrete types from functions — "accept interfaces, return structs" is a widely-cited Go guideline.
- Use the "comma ok" form of type assertion (`v, ok := i.(Type)`) instead of the panicking form (`v := i.(Type)`) unless you're certain the assertion will always succeed.
- The empty interface (`any`) is a last resort, not a default — reach for specific interfaces or generics first; `any` loses compile-time type safety.
- Implement `fmt.Stringer` on any type you'll frequently print/log — it makes debug output dramatically more readable with zero extra call-site work.

---

## Summary

- Interfaces are satisfied IMPLICITLY — no `implements` keyword; if the methods match, the type satisfies the interface, even retroactively for types you don't own.
- `interface{}`/`any` accepts anything but loses type safety — use type assertions (`v, ok := i.(Type)`) or type switches (`switch v := i.(type)`) to recover the concrete type.
- Interfaces compose via embedding — `io.ReadWriter` = `io.Reader` + `io.Writer`; build small interfaces, compose them where needed.
- Go's standard library favors tiny, single-method interfaces (`io.Reader`, `fmt.Stringer`, `error`) — this is deliberate and worth emulating in your own code.
- An interface value is internally a (type, value) pair — this explains the nil-interface gotcha and why `%v`/`%s` automatically use a type's `String()` method if present.
