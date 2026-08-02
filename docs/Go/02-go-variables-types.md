---
title: "Variables, Constants, and Data Types"
sidebar_label: "Variables & Types"
sidebar_position: 2
---

# Variables, Constants, and Data Types

Go is statically typed — every variable has a fixed type, known at compile time. This page covers declaration, constants, and all built-in types.

---

## Declaring Variables

```go
package main

import "fmt"

func main() {
    // var keyword with explicit type
    var name string = "Alice"
    var age int = 30

    // Type inference — var without explicit type
    var city = "NYC"            // inferred as string

    // Short declaration — := (most common inside functions)
    country := "USA"            // inferred as string
    score := 95                 // inferred as int

    // Multiple variables at once
    var x, y int = 1, 2
    var a, b = "hello", 42      // mixed types, inferred individually
    c, d := 10, "world"         // short form, multiple

    // Declare without initializing — gets the zero value
    var count int               // 0
    var enabled bool            // false
    var message string          // "" (empty string)

    // Grouped declaration (var block)
    var (
        firstName string = "Jane"
        lastName  string = "Doe"
        yearsOld  int    = 25
    )

    fmt.Println(name, age, city, country, score, x, y, a, b, c, d, count, enabled, message, firstName, lastName, yearsOld)
}
```

```
Rules:
  := can ONLY be used inside functions (not at package level)
  var can be used both inside functions AND at package level
  := requires AT LEAST ONE new variable on the left side (can mix
     new and existing: x, err := f(); y, err := g() reuses 'err')
  Once declared with a type, a variable can NEVER change type
  (Go is statically, strongly typed — no implicit type coercion)
```

---

## Zero Values

Every type has a "zero value" — the default when a variable is declared without initialization. Go never has uninitialized/garbage memory.

```go
var i int                           // 0
var f float64                       // 0.0
var b bool                          // false
var s string                        // "" (empty string, NOT nil)
var p *int                          // nil (pointers)
var sl []int                        // nil (slices)
var m map[string]int                // nil (maps)
var ch chan int                     // nil (channels)
var fn func()                       // nil (functions)
var iface interface{}               // nil (interfaces)

type Point struct{ X, Y int }
var pt Point                        // Point{X: 0, Y: 0} — zero value of each field
```

---

## Constants

```go
const Pi = 3.14159
const AppName string = "MyApp"     // typed constant

// Multiple constants
const (
    StatusActive   = "active"
    StatusInactive = "inactive"
    StatusBanned   = "banned"
)

// iota — auto-incrementing constant generator, used for enums
const (
    Sunday = iota   // 0
    Monday          // 1 (implicitly repeats "= iota")
    Tuesday         // 2
    Wednesday       // 3
    Thursday        // 4
    Friday          // 5
    Saturday        // 6
)

// iota with expressions — common for byte-size constants
const (
    _  = iota                   // skip 0
    KB = 1 << (10 * iota)       // 1 << 10 = 1024
    MB                          // 1 << 20
    GB                          // 1 << 30
    TB                          // 1 << 40
)

// Typed enum pattern with a named type
type Weekday int

const (
    Mon Weekday = iota
    Tue
    Wed
    Thu
    Fri
    Sat
    Sun
)

func (d Weekday) String() string {
    names := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
    return names[d]
}

// Constants are evaluated at COMPILE TIME — cannot depend on runtime values
// const x = someFunction()   // ERROR unless someFunction() is itself const-evaluable
```

---

## Integer Types

```go
// Signed
var i8  int8   = -128                   // -128 to 127
var i16 int16  = -32768                 // -32768 to 32767
var i32 int32  = -2147483648            // -2147483648 to 2147483647
var i64 int64  = -9223372036854775808

// Unsigned
var u8  uint8  = 255                    // 0 to 255 (alias: byte)
var u16 uint16 = 65535
var u32 uint32 = 4294967295
var u64 uint64 = 18446744073709551615

// Platform-dependent (32 or 64 bit, matches the platform's native word size)
var i int = 42                          // int is the DEFAULT choice for integers in Go
var u uint = 42

// Aliases
var b byte = 255                        // alias for uint8 — used for raw bytes/binary data
var r rune = 'A'                        // alias for int32 — used for Unicode code points

// Literals
dec := 42
hex := 0x2A                             // 42 in hex
oct := 0o52                             // 42 in octal
bin := 0b101010                         // 42 in binary
underscore := 1_000_000                 // underscores for readability (Go 1.13+)

// Overflow wraps silently for unsigned; for signed it's implementation-defined
// (Go does NOT panic on integer overflow — be deliberate about bounds checking
//  where it matters, e.g. parsing untrusted input)
```

---

## Floating Point Types

```go
var f32 float32 = 3.14                  // ~7 decimal digits precision
var f64 float64 = 3.14159265358979      // ~15 decimal digits precision — DEFAULT choice

// float64 is the default for floating-point literals unless otherwise specified
pi := 3.14159                           // inferred as float64

// Scientific notation
large := 1.5e10                         // 15000000000
small := 1.5e-10

// Special values
import "math"
inf := math.Inf(1)                      // +Inf
ninf := math.Inf(-1)                    // -Inf
nan := math.NaN()                       // NaN
isNaN := math.IsNaN(nan)                // true

// Float comparison — never use == directly (same IEEE 754 issue as other languages)
a, b := 0.1+0.2, 0.3
fmt.Println(a == b)                     // false!
epsilon := 1e-9
equal := math.Abs(a-b) < epsilon        // correct comparison approach
```

---

## Boolean

```go
var isActive bool = true
var isDone bool                  // false (zero value)

// No truthy/falsy coercion in Go — MUST be an actual bool expression
if isActive {                   // fine
    // ...
}
// if 1 {}                      // COMPILE ERROR — 1 is not a bool
// if "hello" {}                // COMPILE ERROR

// Logical operators
a, b := true, false
fmt.Println(a && b)             // false
fmt.Println(a || b)             // true
fmt.Println(!a)                 // false
```

---

## Strings

```go
s := "Hello, World!"

// Strings are IMMUTABLE byte sequences (UTF-8 encoded by default)
// s[0] = 'h'                   // COMPILE ERROR — cannot assign to index of a string

// Raw strings — backticks, no escape processing, can span multiple lines
raw := `Line one
Line two
No \n escaping needed`

// Concatenation
greeting := "Hello, " + "World!"

// Length — returns BYTE length, not character count (matters for non-ASCII)
fmt.Println(len("hello"))     // 5
fmt.Println(len("héllo"))     // 6 — 'é' is 2 bytes in UTF-8!

// Iterate correctly over Unicode (by rune, not byte)
for i, r := range "héllo" {
    fmt.Printf("%d: %c\n", i, r)
}
// Indices will skip a byte for the 2-byte 'é' — this is CORRECT rune iteration

// Byte access vs rune access
s2 := "héllo"
fmt.Println(s2[0])              // 104 — byte value ('h')
runes := []rune(s2)             // convert to rune slice for character-based indexing
fmt.Println(string(runes[1]))   // "é" — the actual second character

// Common conversions
bytes := []byte("hello")       // string → []byte
str := string(bytes)           // []byte → string
runeSlice := []rune("hello")   // string → []rune
```

---

## Type Conversion

```go
// Go NEVER implicitly converts types — always explicit
var i int = 42
var f float64 = float64(i)     // explicit conversion required
var u uint = uint(f)

// var f float64 = i            // COMPILE ERROR — cannot use int as float64 directly

// Numeric conversions can lose precision/overflow — Go allows it silently
var big int64 = 300
var small int8 = int8(big)      // 44 (overflow — wraps, no error/panic)

// String ↔ number conversions require the strconv package (see go-stdlib.md)
import "strconv"
n, err := strconv.Atoi("42")                    // string → int
s := strconv.Itoa(42)                           // int → string
f, err := strconv.ParseFloat("3.14", 64)        // string → float64
```

---

## Type Inference Rules

```go
// The compiler infers the type from the value's default type

x := 42             // int
y := 3.14           // float64
z := "hello"        // string
b := true           // bool
r := 'A'            // rune (int32) — single quotes = rune literal!
c := 3 + 4i         // complex128

// Be careful: 'A' (rune/int32) vs "A" (string) are completely different types
```

---

## Tips

- Use `:=` inside functions for local variables — it's the idiomatic Go style; reserve `var` for package-level declarations or when you need the zero value explicitly.
- `int` (not `int32`/`int64`) is the right default choice for integers unless you specifically need a fixed size (binary protocols, memory-constrained contexts).
- Never compare floats with `==` — use an epsilon-based comparison via `math.Abs()`.
- Remember `len()` on a string returns BYTES, not characters — use `[]rune(s)` or `utf8.RuneCountInString(s)` for actual character count with non-ASCII text.
- `iota` is the idiomatic way to build enum-like constant groups — combine with a named type and a `String()` method for readable output.

---

## Summary

- `var name type = value` or `name := value` (short form, function-scope only) — Go is statically typed, no implicit conversions.
- Every type has a zero value; variables are never uninitialized garbage memory.
- `const` groups with `iota` build auto-incrementing enum-like constants; constants are evaluated at compile time.
- Integer types: `int`/`uint` (platform-sized, the default), plus fixed-size `int8`-`int64`/`uint8`-`uint64`; `byte` = `uint8`, `rune` = `int32`.
- `float64` is the default float type; never compare floats with `==`.
- Strings are immutable UTF-8 byte sequences; `len()` returns bytes — use `[]rune` for character-based indexing of non-ASCII text.
- All type conversions are explicit: `float64(i)`, `int(f)` — no implicit coercion anywhere in the language.
