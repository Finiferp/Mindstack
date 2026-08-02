---
title: "Operators"
sidebar_label: "Operators"
sidebar_position: 4
---

# Operators

All Go operators — arithmetic, assignment, comparison, logical, and bitwise. Go has no ternary operator and no operator overloading (deliberately).

---

## Arithmetic Operators

```go
a, b := 10, 3

fmt.Println(a + b)   // 13
fmt.Println(a - b)   // 7
fmt.Println(a * b)   // 30
fmt.Println(a / b)   // 3   — integer division truncates toward zero
fmt.Println(a % b)   // 1   — remainder

// Float division
x, y := 10.0, 3.0
fmt.Println(x / y)   // 3.3333333333333335

// No ** operator for exponentiation — use math.Pow (returns float64)
import "math"
result := math.Pow(2, 10)   // 1024

// Integer division truncation (toward zero, unlike Python's floor division)
fmt.Println(-7 / 2)         // -3 (not -4)
fmt.Println(-7 % 2)         // -1 (sign follows dividend)

// No ++ / -- as EXPRESSIONS (they're statements only in Go — can't do x = i++)
i := 0
i++                         // valid statement
i--                         // valid statement
// j := i++                 // COMPILE ERROR — ++ is not an expression in Go
```

---

## Assignment Operators

```go
x := 10
x += 5    // 15
x -= 3    // 12
x *= 2    // 24
x /= 4    // 6
x %= 4    // 2
x <<= 1   // 4   (bit shift left)
x >>= 1   // 2   (bit shift right)
x &= 3    // bitwise AND assign
x |= 4    // bitwise OR assign
x ^= 1    // bitwise XOR assign

// Multiple assignment
a, b := 1, 2
a, b = b, a       // swap — no temp variable needed
```

---

## Comparison Operators

```go
a, b := 5, 10

fmt.Println(a == b)   // false
fmt.Println(a != b)   // true
fmt.Println(a < b)    // true
fmt.Println(a > b)    // false
fmt.Println(a <= b)   // true
fmt.Println(a >= b)   // false

// Comparable types: numbers, strings, booleans, pointers, channels,
// interfaces, arrays (if element type comparable), structs (if all
// fields comparable)
// NOT comparable with ==: slices, maps, functions
// (use reflect.DeepEqual, or manual comparison, or the slices/maps
//  packages' Equal functions in Go 1.21+)

s1 := []int{1, 2, 3}
s2 := []int{1, 2, 3}
// s1 == s2                                 // COMPILE ERROR — slices are not comparable
import "reflect"
fmt.Println(reflect.DeepEqual(s1, s2))      // true

import "slices"                             // Go 1.21+
fmt.Println(slices.Equal(s1, s2))           // true — preferred, faster than reflect
```

---

## Logical Operators

```go
a, b := true, false

fmt.Println(a && b)   // false
fmt.Println(a || b)   // true
fmt.Println(!a)       // false

// Short-circuit evaluation
func expensiveCheck() bool {
    fmt.Println("called!")
    return true
}

false && expensiveCheck()   // expensiveCheck NOT called
true || expensiveCheck()    // expensiveCheck NOT called
true && expensiveCheck()    // expensiveCheck IS called

// No implicit truthiness — must be an actual bool
// if 1 { }        // COMPILE ERROR
// if "hello" { }  // COMPILE ERROR
```

---

## Bitwise Operators

```go
a, b := 0b1010, 0b1100   // 10, 12

fmt.Println(a & b)    // 8  = 0b1000   AND
fmt.Println(a | b)    // 14 = 0b1110   OR
fmt.Println(a ^ b)    // 6  = 0b0110   XOR
fmt.Println(^a)       // bitwise NOT (unary; complements all bits)
fmt.Println(a &^ b)   // AND NOT (bit clear) — unique to Go: a AND (NOT b)
fmt.Println(a << 2)   // 40  left shift (multiply by 4)
fmt.Println(a >> 1)   // 5   right shift (divide by 2)

// AND NOT (&^) — Go-specific, "clear bits in a that are set in b"
// Useful for clearing specific flags:
flags := 0b1111
mask  := 0b0010
cleared := flags &^ mask   // 0b1101 — clears bit 1

// Common use: bitmask flags
const (
    Read    = 1 << iota                 // 1
    Write                               // 2
    Execute                             // 4
)
permissions := Read | Write             // 3
hasWrite := permissions&Write != 0      // true
permissions &^= Write                   // remove write permission
```

---

## No Ternary Operator

```go
// Go deliberately has NO ternary operator (a ? b : c)
// Use if/else, or (in simple cases) a small helper function

// Verbose but explicit:
var status string
if age >= 18 {
    status = "adult"
} else {
    status = "minor"
}

// Or a generic helper (Go 1.18+ generics)
func Ternary[T any](cond bool, a, b T) T {
    if cond {
        return a
    }
    return b
}
status := Ternary(age >= 18, "adult", "minor")
// Note: BOTH a and b are evaluated eagerly here (no short-circuit like a
// real ternary) — fine for simple values, be careful with side effects
```

---

## Operator Precedence

```go
// From highest to lowest precedence:
// 5:  *  /  %  <<  >>  &  &^
// 4:  +  -  |  ^
// 3:  ==  !=  <  <=  >  >=
// 2:  &&
// 1:  ||

fmt.Println(2 + 3*4)            // 14 — * before +
fmt.Println((2 + 3) * 4)        // 20 — parentheses override
fmt.Println(1 < 2 && 3 < 4)     // true — comparisons before &&
```

---

## No Operator Overloading

```go
// Go deliberately does NOT support operator overloading — you cannot
// define custom behavior for +, ==, etc. on your own types

type Vector struct{ X, Y float64 }

// v1 + v2          // COMPILE ERROR — no such thing for custom types

// Instead, define an explicit method:
func (v Vector) Add(other Vector) Vector {
    return Vector{v.X + other.X, v.Y + other.Y}
}

v3 := v1.Add(v2)   // explicit, no magic — this is the idiomatic Go way

// Why: Go's designers deliberately traded expressiveness for readability —
// a '+' between two custom types could mean anything; an explicit .Add()
// method is unambiguous and greppable
```

---

## Tips

- There's no ternary operator in Go — this is deliberate; use a full `if/else` or accept the verbosity, don't fight it with hacky one-liners.
- `&^` (AND NOT / bit clear) is unique to Go — useful for clearing specific bits/flags without needing a separate NOT + AND combination.
- `++`/`--` are statements, not expressions — you cannot use them inline in an expression (`x = i++` is illegal).
- Slices and maps aren't comparable with `==` — use `slices.Equal`/`maps.Equal` (Go 1.21+) or `reflect.DeepEqual` for older code.
- No operator overloading means every custom type's behavior is explicit via named methods — embrace this, it makes code more greppable and predictable.

---

## Summary

- Arithmetic: `+ - * / %` — integer division truncates toward zero; no `**` (use `math.Pow`).
- Assignment: `+= -= *= /= %=` plus bitwise variants; multiple assignment (`a, b = b, a`) enables swapping without a temp variable.
- Comparison: `== != < > <= >=` — slices/maps are NOT comparable with `==`.
- Logical: `&& || !` — short-circuit evaluation; no implicit truthiness, must be an actual `bool`.
- Bitwise: `& | ^ << >> &^` — `&^` (AND NOT) is Go-specific, used for clearing bits/flags.
- No ternary operator, no operator overloading — both deliberate design choices favoring explicitness over brevity.
