---
title: "Generics"
sidebar_label: "Generics"
sidebar_position: 13
---

# Generics

Generics arrived in Go 1.18 (2022) — deliberately delayed for years until the Go team found a design fitting Go's philosophy of simplicity. They let you write functions and types that work across multiple types while maintaining type safety.

---

## Why Generics — The Problem They Solve

```go
// Before generics: either write one function PER type (duplication)...
func SumInts(nums []int) int {
    total := 0
    for _, n := range nums { total += n }
    return total
}
func SumFloats(nums []float64) float64 {
    total := 0.0
    for _, n := range nums { total += n }
    return total
}

// ...or use interface{}/any and lose type safety + need runtime type assertions
func SumAny(nums []interface{}) interface{} {
    // messy, error-prone, no compile-time type checking
}

// With generics: ONE function, works for any numeric type, fully type-safe
func Sum[T int | float64](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(Sum([]int{1, 2, 3}))        // 6  — T inferred as int
fmt.Println(Sum([]float64{1.5, 2.5}))   // 4.0 — T inferred as float64
```

---

## Generic Functions — Syntax

```go
// [T any] — declares a TYPE PARAMETER T, constrained to 'any' (no restriction)
func Print[T any](value T) {
    fmt.Println(value)
}

Print(42)
Print("hello")
Print([]int{1, 2, 3})

// Multiple type parameters
func Pair[K comparable, V any](key K, value V) map[K]V {
    return map[K]V{key: value}
}

// Explicit type argument (usually inferred, but can be spelled out)
result := Print[int](42)      // explicit — rarely needed, inference usually works

// Generic function operating on slices — extremely common real-world use
func Map[T, U any](items []T, fn func(T) U) []U {
    result := make([]U, len(items))
    for i, item := range items {
        result[i] = fn(item)
    }
    return result
}

nums := []int{1, 2, 3, 4}
doubled := Map(nums, func(n int) int { return n * 2 })
strs := Map(nums, func(n int) string { return fmt.Sprintf("n=%d", n) })

func Filter[T any](items []T, predicate func(T) bool) []T {
    var result []T
    for _, item := range items {
        if predicate(item) {
            result = append(result, item)
        }
    }
    return result
}

evens := Filter(nums, func(n int) bool { return n%2 == 0 })

func Reduce[T, U any](items []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, item := range items {
        acc = fn(acc, item)
    }
    return acc
}

sum := Reduce(nums, 0, func(acc, n int) int { return acc + n })
```

---

## Type Constraints

```go
// 'any' — no constraint (equivalent to interface{})
func Identity[T any](v T) T { return v }

// comparable — built-in constraint, requires == and != to work
// (needed for map keys, and any use of == inside the generic function)
func Contains[T comparable](items []T, target T) bool {
    for _, item := range items {
        if item == target {
            return true
        }
    }
    return false
}

// Union constraints — type must be ONE of the listed types
type Number interface {
    int | int64 | float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// ~T — the tilde means "any type whose UNDERLYING type is T" (includes
// custom named types based on T, not just T itself)
type Celsius float64                        // a named type based on float64

type Numeric interface {
    ~int | ~int64 | ~float32 | ~float64    // without ~, Celsius wouldn't satisfy this
}

func Average[T Numeric](nums []T) float64 {
    var total T
    for _, n := range nums {
        total += n
    }
    return float64(total) / float64(len(nums))
}

var temps []Celsius = []Celsius{20.5, 21.0, 19.5}
avg := Average(temps)         // works because Celsius's underlying type (float64)
                              // matches ~float64 in the Numeric constraint
```

---

## The constraints and slices/maps Standard Packages

```go
// golang.org/x/exp/constraints (or increasingly, standard library
// 'cmp' package in Go 1.21+) provides common reusable constraints
import "cmp"

func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

fmt.Println(Max(3, 7))              // 7
fmt.Println(Max(3.5, 2.1))          // 3.5
fmt.Println(Max("apple", "banana")) // "banana" (Ordered includes strings)

// Standard library 'slices' package (Go 1.21+) — generic slice utilities,
// no longer need to write these yourself
import "slices"

nums := []int{3, 1, 4, 1, 5}
slices.Sort(nums)                           // [1 1 3 4 5]
fmt.Println(slices.Contains(nums, 4))       // true
fmt.Println(slices.Index(nums, 4))          // index of first 4
fmt.Println(slices.Max(nums))               // 5
fmt.Println(slices.Min(nums))               // 1
reversed := slices.Clone(nums)
slices.Reverse(reversed)
fmt.Println(slices.Equal(nums, reversed))    // false

// Standard library 'maps' package (Go 1.21+) — generic map utilities
import "maps"

m := map[string]int{"a": 1, "b": 2}
m2 := maps.Clone(m)
keys := slices.Collect(maps.Keys(m))    // Go 1.23+ for Collect
```

---

## Generic Types (Structs)

```go
// Generic struct — a type parameterized over T
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

intStack := &Stack[int]{}
intStack.Push(1)
intStack.Push(2)
intStack.Push(3)
val, ok := intStack.Pop()    // 3, true

stringStack := &Stack[string]{}
stringStack.Push("hello")

// Generic linked list node
type Node[T any] struct {
    Value T
    Next  *Node[T]
}

type LinkedList[T any] struct {
    Head *Node[T]
}

func (l *LinkedList[T]) Prepend(value T) {
    l.Head = &Node[T]{Value: value, Next: l.Head}
}

// Generic key-value pair — commonly used in generic map-like utilities
type Pair[K comparable, V any] struct {
    Key   K
    Value V
}

func NewPair[K comparable, V any](key K, value V) Pair[K, V] {
    return Pair[K, V]{Key: key, Value: value}
}
```

---

## When to Use Generics (and When Not To)

```
Good use cases:
  Container types (Stack, Queue, LinkedList, Set) that work with any element type
  General-purpose utility functions (Map, Filter, Reduce, Max, Min)
  Type-safe wrappers around code that would otherwise use interface{}

When NOT to reach for generics:
  If a plain interface already solves the problem cleanly (Go's small-
  interface philosophy — see go-interfaces.md — often suffices without
  needing type parameters at all)
  Premature abstraction — don't generic-ize a function used with only
  ONE concrete type "just in case"; wait until you genuinely need the
  same logic across multiple types
  When it meaningfully hurts readability for marginal benefit — Go
  values clarity; heavily-nested generic constraints can become as
  hard to read as the interface{}-based code they replaced

Go's generics are intentionally more restrained than, say, C++ templates
or Rust's trait system — no specialization, no generic methods on
non-generic types with additional type parameters, simpler type inference.
This is consistent with Go's overall design philosophy: fewer, more
predictable features over maximal expressive power.
```

---

## Tips

- Reach for the standard library's `slices` and `maps` packages (Go 1.21+) before writing your own generic collection utilities — `Sort`, `Contains`, `Index`, `Max`, `Min`, `Equal` are all provided.
- `comparable` is required whenever your generic code uses `==`/`!=` or the type parameter as a map key — the compiler will tell you if you forgot it.
- Use `~T` in a constraint when you want to allow not just `T` itself but any named type whose underlying type is `T` (e.g. a `type Celsius float64` should satisfy a `~float64` constraint).
- Don't retrofit generics onto code that only ever handles one concrete type — wait until you have a genuine second use case before generalizing.
- `cmp.Ordered` (standard library, Go 1.21+) is the constraint you want for anything needing `<`/`>` comparisons across numeric types and strings.

---

## Summary

- `func Name[T Constraint](param T) T` — type parameters in square brackets, constrained by an interface (or `any`/`comparable` for the common built-in cases).
- Union constraints (`int | float64`) restrict a type parameter to a specific set of types; `~T` extends this to include named types based on `T`.
- Generic structs (`type Stack[T any] struct { items []T }`) enable type-safe reusable containers without `interface{}` and runtime type assertions.
- Standard library `slices`, `maps`, and `cmp` packages (Go 1.21+) provide ready-made generic utilities — check there before writing your own.
- Use generics for genuinely type-agnostic containers and utilities; don't reach for them prematurely when a concrete type or a simple interface already solves the problem.
