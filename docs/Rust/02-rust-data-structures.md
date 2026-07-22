---
title: "Arrays, Vectors, and Tuples"
sidebar_label: "Arrays, Vectors & Tuples"
sidebar_position: 3
---

# Arrays, Vectors, and Tuples

The fundamental sequential data structures in Rust. Arrays are fixed-size and stack-allocated; vectors grow dynamically on the heap; tuples hold a fixed set of mixed types.

**W3Schools:** [w3schools.com/rust/rust_arrays.php](https://www.w3schools.com/rust/rust_arrays.php)
**Book Ch 3:** [doc.rust-lang.org/book/ch03-02-data-types.html](https://doc.rust-lang.org/book/ch03-02-data-types.html)
**Book Ch 8:** [doc.rust-lang.org/book/ch08-00-common-collections.html](https://doc.rust-lang.org/book/ch08-00-common-collections.html)

---

## Arrays

A fixed-length sequence of elements of the **same type**, stored on the **stack**.

```rust
fn main() {
    // Declaration: [Type; length]
    let arr: [i32; 5] = [1, 2, 3, 4, 5];

    // Type inferred from the values
    let arr = [1, 2, 3, 4, 5];          // [i32; 5]

    // Repeat expression: [value; count]
    let zeros = [0; 10];                 // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let flags = [false; 8];              // 8 false values

    // Accessing elements — zero-indexed
    println!("{}", arr[0]);              // 1
    println!("{}", arr[4]);              // 5
    // arr[5];                           // PANIC at runtime: index out of bounds

    // Safe access with .get() — returns Option<&T>
    match arr.get(10) {
        Some(val) => println!("{val}"),
        None      => println!("index out of bounds"),
    }

    // Length
    println!("{}", arr.len());           // 5

    // Mutating an array (must be mut)
    let mut scores = [10, 20, 30, 40, 50];
    scores[2] = 99;
    println!("{:?}", scores);            // [10, 20, 99, 40, 50]

    // Iterating
    for element in arr {
        print!("{element} ");
    }
    println!();

    for (i, val) in arr.iter().enumerate() {
        println!("[{i}] = {val}");
    }

    // Slices — a reference to part (or all) of an array
    let slice: &[i32] = &arr[1..4];     // [2, 3, 4]
    let full:  &[i32] = &arr[..];       // [1, 2, 3, 4, 5]
    println!("{:?}", slice);

    // Multi-dimensional arrays
    let matrix: [[i32; 3]; 2] = [
        [1, 2, 3],
        [4, 5, 6],
    ];
    println!("{}", matrix[1][2]);        // 6

    // Arrays implement common traits
    let a = [1, 2, 3];
    let b = [1, 2, 3];
    println!("{}", a == b);              // true  (PartialEq)
    let sorted = {
        let mut tmp = [3, 1, 4, 1, 5];
        tmp.sort();
        tmp
    };
    println!("{:?}", sorted);            // [1, 1, 3, 4, 5]

    // Useful array methods (same as slice methods)
    let arr = [3, 1, 4, 1, 5, 9, 2, 6];
    arr.contains(&5);                    // true
    arr.iter().sum::<i32>();             // 31
    arr.iter().min();                    // Some(&1)
    arr.iter().max();                    // Some(&9)
    arr.iter().position(|&x| x == 5);  // Some(4)
}
```

---

## When to Use Arrays vs Vec

```
Array [T; N]:
  Size known at compile time — N is part of the type
  Stack-allocated — no heap allocation; very fast
  Cannot grow or shrink
  Use for: fixed data (config flags, pixel buffer, lookup table, month names)

Vec<T>:
  Size known only at runtime
  Heap-allocated — can grow and shrink
  Use for: collections that change size, most "list of things" use cases
```

---

## Vectors

A growable, heap-allocated list of elements of the **same type**.

```rust
fn main() {
    // Creating vectors
    let v: Vec<i32> = Vec::new();           // empty; type must be specified
    let v = vec![1, 2, 3, 4, 5];           // with initial values (macro)
    let v = vec![0; 10];                    // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let v: Vec<i32> = (1..=5).collect();   // from a range

    // Adding elements
    let mut v = Vec::new();
    v.push(10);
    v.push(20);
    v.push(30);
    v.extend([40, 50, 60]);                 // add multiple at once
    v.insert(0, 99);                        // insert at index (shifts right)
    println!("{:?}", v);                    // [99, 10, 20, 30, 40, 50, 60]

    // Removing elements
    let last = v.pop();                     // removes and returns last: Some(60)
    let item = v.remove(0);               // removes at index: 99 (shifts left)
    v.retain(|&x| x > 15);               // keep only elements > 15
    v.clear();                              // remove all elements

    // Accessing elements
    let v = vec![10, 20, 30, 40, 50];
    let third = v[2];                       // 30 — panics if out of bounds
    let third = v.get(2);                  // Some(&30) — safe
    let first = v.first();                 // Some(&10)
    let last  = v.last();                  // Some(&50)

    // Length and capacity
    println!("{}", v.len());               // 5
    println!("{}", v.is_empty());          // false
    println!("{}", v.capacity());          // &gt;= 5 (allocated memory slots)

    // Pre-allocate for known size (avoids reallocations)
    let mut v: Vec<i32> = Vec::with_capacity(1000);
    for i in 0..1000 { v.push(i); }       // no reallocations needed

    // Iterating
    let v = vec![1, 2, 3, 4, 5];

    for x in &v {                          // borrow immutably
        print!("{x} ");
    }

    let mut v = vec![1, 2, 3];
    for x in &mut v {                      // borrow mutably
        *x *= 2;                           // dereference to modify
    }
    println!("{:?}", v);                   // [2, 4, 6]

    for x in v {                           // consume (v moved; can't use after)
        print!("{x} ");
    }

    // Sorting
    let mut v = vec![3, 1, 4, 1, 5, 9];
    v.sort();                              // ascending
    v.sort_by(|a, b| b.cmp(a));          // descending
    v.sort_by_key(|&x| std::cmp::Reverse(x)); // also descending

    let mut words = vec!["banana", "apple", "cherry"];
    words.sort();                          // alphabetical

    // Searching
    let v = vec![10, 20, 30, 40, 50];
    println!("{}", v.contains(&30));       // true
    println!("{:?}", v.iter().position(|&x| x == 30));  // Some(2)
    // Binary search (only works on sorted vec):
    println!("{:?}", v.binary_search(&30)); // Ok(2)
    println!("{:?}", v.binary_search(&25)); // Err(2) — where it would be

    // Transforming (iterator methods)
    let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();
    let evens: Vec<&i32>  = v.iter().filter(|&&x| x % 20 == 0).collect();
    let sum: i32           = v.iter().sum();

    // Deduplication
    let mut v = vec![1, 1, 2, 3, 3, 3, 4];
    v.dedup();                             // removes consecutive duplicates → [1, 2, 3, 4]

    // Splitting
    let (left, right) = v.split_at(2);    // (&[1, 2], &[3, 4])
    let chunks: Vec<&[i32]> = v.chunks(2).collect();  // [[1,2],[3,4]]

    // Joining/flattening
    let nested = vec![vec![1, 2], vec![3, 4], vec![5]];
    let flat: Vec<i32> = nested.into_iter().flatten().collect(); // [1,2,3,4,5]

    // Vec of strings — joining
    let words = vec!["Hello", "World"];
    let joined = words.join(", ");         // "Hello, World"
    let joined = words.join(" ");          // "Hello World"

    // Converting between Vec and array
    let arr = [1, 2, 3, 4, 5];
    let v: Vec<i32> = arr.to_vec();       // array → Vec (copies)
    let v: Vec<i32> = Vec::from(arr);     // same
    // Vec → array (if size known):
    let arr: [i32; 5] = v.try_into().unwrap();
}
```

---

## Tuples

A fixed-length collection of values of **different types**.

```rust
fn main() {
    // Creating tuples
    let tup: (i32, f64, bool, &str) = (42, 3.14, true, "hello");

    // Accessing with dot notation (zero-indexed)
    println!("{}", tup.0);    // 42
    println!("{}", tup.1);    // 3.14
    println!("{}", tup.2);    // true
    println!("{}", tup.3);    // hello

    // Destructuring — unpack a tuple into variables
    let (a, b, c, d) = tup;
    println!("{a} {b} {c} {d}");

    // Ignore parts with _
    let (x, _, _, text) = tup;
    println!("{x}: {text}");

    // Mutable tuple
    let mut point = (3.0_f64, 4.0_f64);
    point.0 = 0.0;
    point.1 = 0.0;

    // Unit type () — the empty tuple; means "nothing" (like void)
    let unit: () = ();
    fn returns_nothing() {}    // implicitly returns ()

    // Functions returning multiple values via tuples
    fn min_max(data: &[i32]) -> (i32, i32) {
        let mut min = data[0];
        let mut max = data[0];
        for &x in data {
            if x < min { min = x; }
            if x > max { max = x; }
        }
        (min, max)
    }

    let numbers = vec![3, 1, 4, 1, 5, 9, 2, 6];
    let (min, max) = min_max(&numbers);
    println!("min={min}, max={max}");    // min=1, max=9

    // Tuple structs — named tuples
    struct Color(u8, u8, u8);
    struct Point(f64, f64);

    let red   = Color(255, 0, 0);
    let origin = Point(0.0, 0.0);
    println!("red: {} {} {}", red.0, red.1, red.2);

    // Tuples as HashMap keys (if all elements are Hash + Eq)
    use std::collections::HashMap;
    let mut grid: HashMap<(i32, i32), char> = HashMap::new();
    grid.insert((0, 0), 'X');
    grid.insert((1, 2), 'O');
    println!("{:?}", grid.get(&(0, 0)));  // Some('X')

    // Nested tuples
    let nested = ((1, 2), (3, 4));
    println!("{}", (nested.0).1);         // 2

    // Comparing tuples (lexicographic if elements implement PartialOrd)
    let a = (1, 2, 3);
    let b = (1, 2, 4);
    println!("{}", a < b);                // true
    println!("{}", a == (1, 2, 3));       // true
}
```

---

## Slices — Borrowing Parts of Collections

Slices are references to a contiguous sequence — they work for both arrays and Vecs.

```rust
fn main() {
    // Array slice
    let arr = [1, 2, 3, 4, 5];
    let slice: &[i32] = &arr[1..4];     // [2, 3, 4]

    // Vec slice
    let v = vec![10, 20, 30, 40, 50];
    let slice: &[i32] = &v[1..3];       // [20, 30]

    // Full slice
    let full = &arr[..];                 // entire array as slice

    // Functions accepting slices work with both arrays and Vecs
    fn sum(data: &[i32]) -> i32 {
        data.iter().sum()
    }

    let arr = [1, 2, 3, 4, 5];
    let v   = vec![1, 2, 3, 4, 5];
    println!("{}", sum(&arr));           // 15
    println!("{}", sum(&v));             // 15 — same function!
    println!("{}", sum(&v[1..3]));       // 5 (2+3)

    // Slice methods
    let s = [3, 1, 4, 1, 5, 9, 2, 6];
    println!("{}", s.len());             // 8
    println!("{:?}", s.first());        // Some(3)
    println!("{:?}", s.last());         // Some(6)
    println!("{}", s.contains(&9));     // true
    println!("{:?}", s.iter().max());   // Some(9)
    println!("{:?}", s.iter().min());   // Some(1)

    let (left, right) = s.split_at(4);  // ([3,1,4,1], [5,9,2,6])

    // Mutable slice
    let mut arr = [5, 3, 1, 4, 2];
    let slice = &mut arr[1..4];
    slice.sort();                         // [3, 1, 4] → [1, 3, 4]
    println!("{:?}", arr);               // [5, 1, 3, 4, 2]

    // String slices — &str is a slice
    let s = String::from("hello world");
    let hello: &str = &s[0..5];
    let world: &str = &s[6..11];
    println!("{hello} {world}");
}
```

---

## Side-by-Side Comparison

| Feature | Array `[T; N]` | Vector `Vec<T>` | Tuple `(A, B, C)` |
|---|---|---|---|
| Size | Fixed (compile-time) | Dynamic | Fixed (compile-time) |
| Allocation | Stack | Heap | Stack |
| Element types | Same | Same | Mixed |
| Indexing | `arr[i]` | `v[i]` | `tup.0` |
| Growable | No | Yes | No |
| Use when | Fixed count, same type | Variable count | Multiple return values, mixed types |

---

## Tips

- Prefer `Vec<T>` over arrays for most collection needs — unless you specifically need stack allocation and a fixed size.
- Write functions that accept `&[T]` instead of `&Vec<T>` or `&[T; N]` — slice references work with both arrays and Vecs.
- Use tuples for functions that need to return 2–3 related values; for more values, define a named struct.
- `v.get(i)` returns `Option<&T>` — always safer than `v[i]` which panics on out-of-bounds.
- `Vec::with_capacity(n)` avoids repeated heap reallocations when you know the approximate size in advance.

---

## Summary

- Array `[T; N]`: fixed size, stack-allocated, all same type — use for fixed data.
- Vec `Vec<T>`: growable, heap-allocated — the go-to dynamic collection; `vec![]` macro for quick creation.
- Tuple `(A, B, C)`: fixed size, mixed types — great for multiple return values; destructure with `let (a, b, c) = tup`.
- Slices `&[T]`: borrowed reference to a contiguous sequence — works with both arrays and Vecs; write functions using slices for maximum flexibility.
- Safe access: `arr.get(i)` → `Option<&T>` vs `arr[i]` → panic on out of bounds.
