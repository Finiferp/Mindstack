---
title: "Arrays, Slices, and Maps"
sidebar_label: "Arrays, Slices & Maps"
sidebar_position: 3
---

# Arrays, Slices, and Maps

Go's core collection types. Slices (not arrays) are what you'll use 95% of the time — understanding the distinction and how slices work internally is essential.

---

## Arrays — Fixed Size

```go
// Arrays have a FIXED size that's part of the type itself
var arr [5]int                      // [0 0 0 0 0] — zero-valued
arr2 := [5]int{1, 2, 3, 4, 5}
arr3 := [...]int{1, 2, 3}           // size inferred from literal — [3]int

// Access and modify
arr2[0] = 99
fmt.Println(arr2[0])                // 99
fmt.Println(len(arr2))              // 5

// Arrays are VALUE types — copying an array copies ALL its elements
a := [3]int{1, 2, 3}
b := a                              // full copy — b is independent of a
b[0] = 99
fmt.Println(a[0])                   // still 1 — a is unaffected

// Multi-dimensional arrays
var grid [3][3]int
grid[1][1] = 5

// [5]int and [10]int are DIFFERENT TYPES — cannot be assigned to each other,
// cannot be compared unless same size
// This rigidity is exactly WHY slices exist and are used almost everywhere instead
```

---

## Slices — Dynamic, the Type You'll Actually Use

```go
// Slice literal
s := []int{1, 2, 3, 4, 5}           // note: no size in brackets — this is a slice, not array

// make() — create a slice with a given length (and optional capacity)
s2 := make([]int, 5)                // length 5, all zero-valued
s3 := make([]int, 5, 10)            // length 5, capacity 10 (pre-allocated room to grow)

// nil slice — valid, has length 0, can still be appended to
var s4 []int                        // nil, len 0, cap 0
fmt.Println(s4 == nil)              // true
s4 = append(s4, 1)                  // works fine — append handles nil slices

// Length and capacity
fmt.Println(len(s3), cap(s3))       // 5 10

// Append — the primary way to grow a slice
s = append(s, 6)                    // [1 2 3 4 5 6]
s = append(s, 7, 8, 9)              // append multiple values
other := []int{10, 11}
s = append(s, other...)             // spread/unpack another slice (...)

// Slicing — s[low:high] — creates a VIEW into the underlying array, NOT a copy
arr := []int{0, 1, 2, 3, 4, 5}
sub := arr[1:4]                     // [1 2 3] — elements at index 1,2,3 (high is EXCLUSIVE)
sub2 := arr[:3]                     // [0 1 2] — from start
sub3 := arr[3:]                     // [3 4 5] — to end
sub4 := arr[:]                      // [0 1 2 3 4 5] — entire slice

// Full slice expression — controls capacity explicitly
sub5 := arr[1:3:4]                  // low:high:max — len=2, cap=3 (max-low)
```

### The Critical Concept — Slices Share Underlying Arrays

```go
original := []int{1, 2, 3, 4, 5}
view := original[1:4]           // [2 3 4] — shares the SAME underlying array

view[0] = 99                    // modifies the shared array!
fmt.Println(original)           // [1 99 3 4 5] — original is affected!

// This is THE most common source of confusing bugs for Go beginners.
// A slice is really a struct with THREE fields:
//   pointer to underlying array, length, capacity
// Slicing an existing slice does NOT copy data — it creates a new "view"
// (new pointer+length+cap) into the SAME backing array.

// append() can break this sharing IF it needs to grow beyond capacity:
s := make([]int, 3, 3)              // len 3, cap 3 — exactly full
s2 := append(s, 4)                  // capacity exceeded → Go allocates a NEW
                                    // underlying array, copies data — s2 is
                                    // now INDEPENDENT of s
// But if cap allowed room to grow, append modifies the SAME underlying array:
s3 := make([]int, 3, 10)            // len 3, cap 10 — room to grow
s4 := append(s3, 4)                 // fits within capacity — SAME array, s3 and s4 share data!

// This dual behavior (sometimes shares, sometimes doesn't, depending on
// capacity) is why relying on append() NOT affecting the original is
// fragile — always copy explicitly if you need independence:
independent := make([]int, len(original))
copy(independent, original)
```

### Common Slice Operations

```go
s := []int{5, 3, 1, 4, 2}

// Remove an element at index i (order not preserved — fast)
i := 2
s = append(s[:i], s[i+1:]...)

// Remove an element at index i (order preserved — slower, shifts elements)
s = append(s[:i], s[i+1:]...)       // same operation, order IS preserved actually
                                    // (append shifts remaining elements left)

// Insert at index i
s = append(s[:i], append([]int{99}, s[i:]...)...)

// Reverse in place
for l, r := 0, len(s)-1; l < r; l, r = l+1, r-1 {
    s[l], s[r] = s[r], s[l]
}

// Copy
dst := make([]int, len(s))
n := copy(dst, s)               // returns number of elements copied

// Sorting (see go-stdlib.md for the full sort package)
import "sort"
sort.Ints(s)                    // ascending, in place
sort.Sort(sort.Reverse(sort.IntSlice(s)))  // descending

// 2D slices (slice of slices) — common for grids/matrices
grid := make([][]int, 3)
for i := range grid {
    grid[i] = make([]int, 3)
}
```

---

## Maps

```go
// Map literal
m := map[string]int{
    "alice": 30,
    "bob":   25,
}

// make() — create an empty map
m2 := make(map[string]int)

// nil map — READS are safe, WRITES panic
var m3 map[string]int
val := m3["key"]            // 0 — reading a missing key from nil map is fine (zero value)
// m3["key"] = 1            // PANIC: assignment to entry in nil map

// Insert / update
m["carol"] = 35
m["alice"] = 31             // overwrites

// Read
age := m["alice"]           // 31
missing := m["dave"]        // 0 — zero value if key doesn't exist (NOT an error)

// Check existence — the "comma ok" idiom
age, ok := m["dave"]
if !ok {
    fmt.Println("dave not found")
}

// Delete
delete(m, "bob")

// Length
fmt.Println(len(m))

// Iterate — ORDER IS NOT GUARANTEED (deliberately randomized by Go's runtime
// to prevent code from accidentally depending on iteration order)
for key, value := range m {
    fmt.Println(key, value)
}

// Iterate in sorted order (common pattern — sort the keys first)
import "sort"
keys := make([]string, 0, len(m))
for k := range m {
    keys = append(keys, k)
}
sort.Strings(keys)
for _, k := range keys {
    fmt.Println(k, m[k])
}

// Maps with struct values
type Person struct {
    Name string
    Age  int
}
people := map[string]Person{
    "alice": {Name: "Alice", Age: 30},
}
// people["alice"].Age = 31     // COMPILE ERROR — struct fields in a map
                                // are not addressable; must reassign the whole struct
p := people["alice"]
p.Age = 31
people["alice"] = p

// Maps with slice values — common pattern (grouping)
groups := make(map[string][]int)
groups["evens"] = append(groups["evens"], 2, 4, 6)
// works even on first call because append() handles the nil slice
// returned by a missing map key gracefully

// Struct as map key (structs are comparable if all their fields are)
type Coord struct{ X, Y int }
visited := make(map[Coord]bool)
visited[Coord{1, 2}] = true
```

---

## Arrays vs Slices — When to Use Which

```
Array [N]T:
  Fixed size, part of the type — [5]int and [10]int are different types
  Value semantics — copying copies all data
  Rarely used directly in idiomatic Go — mostly for fixed-size buffers,
  or as the backing store slices are built on top of

Slice []T:
  Dynamic size, reference semantics (points to underlying array)
  What you use for almost everything — function parameters, return
  values, general-purpose collections
  Passing a slice to a function is cheap (just copies the 3-field
  struct: pointer+len+cap), NOT the underlying data

Rule of thumb: use slices unless you have a specific reason for a
fixed-size array (rare — e.g. a cryptographic hash's fixed byte length).
```

---

## Tips

- Slices sharing an underlying array is the single biggest "gotcha" for Go beginners — when in doubt about whether a function might mutate your data unexpectedly, use `copy()` to make an explicit independent copy.
- Always check `ok` from the comma-ok idiom (`v, ok := m[key]`) when a missing key should be handled differently from a zero-valued present key.
- Reading from a nil map is always safe (returns zero value); writing to a nil map panics — always `make()` a map before writing to it.
- Map iteration order is intentionally randomized by Go — never write code that depends on it; sort keys explicitly if deterministic order matters.
- `make([]T, len, cap)` with a pre-sized capacity avoids repeated reallocation when you know roughly how many elements you'll append — a meaningful performance win in hot paths.

---

## Summary

- Arrays `[N]T` have a fixed size baked into the type, value semantics (full copy on assignment) — rarely used directly.
- Slices `[]T` are dynamic views (pointer + length + capacity) into an underlying array — the default collection type in Go.
- Slicing (`s[low:high]`) shares the underlying array; `append()` may or may not, depending on whether capacity is exceeded — copy explicitly when independence matters.
- Maps `map[K]V`: `make()` before writing; comma-ok idiom (`v, ok := m[k]`) to check existence; iteration order is randomized by design.
- Struct field values in a map aren't addressable directly — read the struct, modify it, write it back.
