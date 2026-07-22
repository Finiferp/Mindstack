---
title: "Collections"
sidebar_label: "Collections"
sidebar_position: 8
---

# Collections

Rust's standard library provides heap-allocated collections. The most used are `Vec<T>`, `HashMap<K,V>`, `HashSet<T>`, and `String`. Each has strict ownership semantics.

---

## Vec&lt;T&gt; — Growable Array

```rust
fn main() {
    // Creating vectors
    let mut v: Vec<i32> = Vec::new();
    let v = vec![1, 2, 3, 4, 5];        // macro shorthand
    let zeros = vec![0; 10];             // [0, 0, 0, ..., 0] — 10 zeros
    let v: Vec<i32> = (1..=5).collect(); // from iterator

    // Adding elements
    let mut v = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);
    v.extend([4, 5, 6]);                 // add multiple
    v.insert(0, 99);                     // insert at index (shifts elements right)

    // Removing elements
    let last = v.pop();                  // Option<T> — removes last
    let item = v.remove(1);             // removes at index (shifts elements left)
    v.retain(|&x| x % 2 == 0);         // keep only even numbers
    v.dedup();                           // remove consecutive duplicates
    v.clear();                           // remove all elements

    // Accessing elements
    let v = vec![10, 20, 30, 40, 50];
    let third = v[2];                    // panics if out of bounds
    let third = v.get(2);               // Option<&i32> — safe
    let first = v.first();              // Option<&i32>
    let last = v.last();                // Option<&i32>
    let len = v.len();
    let is_empty = v.is_empty();

    // Slices
    let slice = &v[1..3];              // [20, 30]
    let all = v.as_slice();

    // Iterating
    for x in &v {           // immutable references
        println!("{x}");
    }
    for x in &mut v {       // mutable references
        *x *= 2;
    }
    for x in v {            // consumes v — takes ownership of each element
        println!("{x}");
    }

    // Sorting
    let mut v = vec![3, 1, 4, 1, 5, 9, 2, 6];
    v.sort();                            // in-place sort
    v.sort_unstable();                   // faster, non-stable
    v.sort_by(|a, b| b.cmp(a));        // custom comparator (descending)
    v.sort_by_key(|x| std::cmp::Reverse(*x));  // sort by derived key

    // Searching
    v.contains(&5);
    v.iter().position(|&x| x == 5);    // Option<usize>
    v.binary_search(&5);                // Result<usize, usize> (must be sorted)

    // Transforming (returns new Vec via iterator)
    let doubled: Vec<i32> = v.iter().map(|&x| x * 2).collect();
    let evens: Vec<i32> = v.iter().filter(|&&x| x % 2 == 0).map(|&x| x).collect();
    let sum: i32 = v.iter().sum();
    let max = v.iter().max();           // Option<&i32>

    // Splitting and combining
    let (left, right) = v.split_at(3);  // (&[i32], &[i32])
    let chunks: Vec<&[i32]> = v.chunks(2).collect();  // [[1,2], [3,4], [5]]
    let windows: Vec<&[i32]> = v.windows(3).collect(); // sliding window

    // Deduplication
    let mut v = vec![1, 1, 2, 3, 3, 3, 4];
    v.dedup();   // [1, 2, 3, 4] — removes consecutive duplicates (sort first for all)
    v.sort();
    v.dedup();

    // Capacity (performance optimisation)
    let mut v: Vec<i32> = Vec::with_capacity(1000);  // pre-allocate
    println!("capacity: {}", v.capacity());  // 1000
    println!("length: {}", v.len());         // 0
    v.shrink_to_fit();                       // release excess capacity
}
```

---

## String — UTF-8 Text

```rust
fn main() {
    // String (heap-allocated, mutable) vs &str (borrowed string slice)
    let mut s = String::new();
    let s = String::from("hello");
    let s = "hello".to_string();
    let s = "hello".to_owned();

    // Building strings
    let mut s = String::from("hello");
    s.push(' ');              // push a char
    s.push_str("world");     // push a &str
    s += " again";           // += with &str (uses Add trait)

    let s = format!("{} {}", "hello", "world");  // preferred for complex strings

    // Concatenation
    let s1 = String::from("hello, ");
    let s2 = String::from("world!");
    let s3 = s1 + &s2;  // s1 is MOVED here; s2 is borrowed
    // s1 is no longer valid

    // Slicing (careful — must be on char boundaries)
    let s = String::from("hello world");
    let hello = &s[0..5];    // &str — fine (ASCII)
    // Unicode: "café" — 'é' is 2 bytes, so &s[0..4] is "caf" not "café"

    // Iterating over characters (correct for Unicode)
    let s = String::from("héllo");
    for c in s.chars() {      // iterate Unicode scalar values
        print!("{c} ");
    }
    for b in s.bytes() {      // iterate raw bytes
        print!("{b} ");
    }

    // Common methods
    let s = String::from("  Hello, World!  ");
    s.len()                           // byte length (not char count!)
    s.is_empty()
    s.contains("World")
    s.starts_with("  H")
    s.ends_with("!  ")
    s.trim()                          // "Hello, World!"
    s.trim_start()                    // "Hello, World!  "
    s.trim_end()                      // "  Hello, World!"
    s.to_lowercase()
    s.to_uppercase()
    s.replace("World", "Rust")
    s.replacen("l", "L", 2)          // replace first 2 occurrences
    s.split(", ").collect::<Vec<_>>() // ["  Hello", "World!  "]
    s.split_whitespace().collect::<Vec<_>>() // ["Hello,", "World!"]
    s.lines().collect::<Vec<_>>()    // split by newlines

    // Parsing from string
    let n: i32 = "42".parse().unwrap();
    let n: i32 = "42".parse::<i32>().unwrap();
    let result: Result<i32, _> = "abc".parse();

    // Checking content
    let s = "Hello123";
    s.chars().all(|c| c.is_alphanumeric());
    s.chars().any(|c| c.is_uppercase());
    s.chars().filter(|c| c.is_numeric()).count();  // count digits
}
```

---

## HashMap&lt;K, V&gt;

```rust
use std::collections::HashMap;

fn main() {
    // Creating
    let mut map: HashMap<String, i32> = HashMap::new();
    let map = HashMap::from([           // from array of pairs
        ("one", 1),
        ("two", 2),
        ("three", 3),
    ]);

    // Inserting
    let mut scores: HashMap<String, u32> = HashMap::new();
    scores.insert(String::from("Alice"), 100);
    scores.insert(String::from("Bob"), 85);
    scores.insert(String::from("Alice"), 95);  // overwrites previous value

    // entry API — insert only if not present
    scores.entry(String::from("Carol")).or_insert(70);
    scores.entry(String::from("Alice")).or_insert(0);  // Alice already exists; ignored
    
    // Modify in place via entry
    let text = "hello world hello rust hello";
    let mut word_count: HashMap<&str, u32> = HashMap::new();
    for word in text.split_whitespace() {
        let count = word_count.entry(word).or_insert(0);
        *count += 1;  // dereference to modify
    }
    // {"hello": 3, "world": 1, "rust": 1}

    // Reading
    let alice_score = scores.get("Alice");          // Option<&u32>
    let alice_score = scores["Alice"];               // panics if not found
    let score = scores.get("Dave").unwrap_or(&0);   // default

    // Removing
    scores.remove("Bob");                            // Option<u32>

    // Checking
    scores.contains_key("Alice");
    scores.len();
    scores.is_empty();

    // Iterating
    for (key, value) in &scores {
        println!("{key}: {value}");
    }
    for key in scores.keys() { }
    for value in scores.values() { }
    for value in scores.values_mut() {
        *value += 10;   // give everyone 10 bonus points
    }

    // Collecting into HashMap from iterator
    let pairs = vec![("a", 1), ("b", 2), ("c", 3)];
    let map: HashMap<&str, i32> = pairs.into_iter().collect();

    // Merging two HashMaps
    let extra = HashMap::from([("d", 4), ("e", 5)]);
    scores.extend(extra);
}
```

---

## HashSet&lt;T&gt;

```rust
use std::collections::HashSet;

fn main() {
    let mut set: HashSet<i32> = HashSet::new();
    set.insert(1);
    set.insert(2);
    set.insert(3);
    set.insert(2);  // duplicate — ignored

    let a: HashSet<i32> = [1, 2, 3, 4].into_iter().collect();
    let b: HashSet<i32> = [3, 4, 5, 6].into_iter().collect();

    // Set operations
    let union: HashSet<&i32> = a.union(&b).collect();            // {1,2,3,4,5,6}
    let intersection: HashSet<&i32> = a.intersection(&b).collect(); // {3,4}
    let difference: HashSet<&i32> = a.difference(&b).collect();  // {1,2}
    let sym_diff: HashSet<&i32> = a.symmetric_difference(&b).collect(); // {1,2,5,6}

    a.is_subset(&b);      // false
    a.is_superset(&b);    // false
    a.is_disjoint(&b);    // false (they share 3 and 4)

    set.contains(&2);
    set.remove(&2);
    set.len();
}
```

---

## Other Collections

```rust
use std::collections::{VecDeque, BTreeMap, BTreeSet, BinaryHeap, LinkedList};

// VecDeque — double-ended queue (efficient push/pop from both ends)
let mut deque: VecDeque<i32> = VecDeque::new();
deque.push_back(1);
deque.push_front(0);
deque.pop_back();
deque.pop_front();
// Use for: queues, sliding windows, FIFO/LIFO

// BTreeMap — sorted HashMap (by key)
let mut map: BTreeMap<String, i32> = BTreeMap::new();
// Iterates in key order — use when you need sorted output
// Slightly slower than HashMap (O(log n) vs O(1) amortised)

// BinaryHeap — max-heap (priority queue)
let mut heap: BinaryHeap<i32> = BinaryHeap::new();
heap.push(3);
heap.push(1);
heap.push(4);
heap.peek();  // Some(&4) — largest element
heap.pop();   // Some(4) — removes and returns largest
// Use for: Dijkstra's algorithm, scheduling, "top N" problems

// LinkedList — doubly linked list (rarely needed in Rust; Vec usually better)
// BTreeSet — sorted HashSet

// When to use each:
// Vec<T>:        most things; random access, sequential processing
// VecDeque<T>:   queue/deque; push/pop both ends
// HashMap<K,V>:  key-value lookup; unordered
// BTreeMap<K,V>: key-value lookup; sorted iteration needed
// HashSet<T>:    membership testing, deduplication
// BinaryHeap<T>: priority queue (always want the max/min)
```

---

## Tips

- Use `Vec::with_capacity(n)` when you know the approximate size — avoids repeated reallocations.
- `HashMap::entry().or_insert()` is the idiomatic pattern for "insert if missing, then modify" — avoids double lookup.
- String indexing by byte offset (`&s[0..5]`) panics if it splits a multi-byte character — use `.chars()` for Unicode-safe iteration.
- `collect::<Vec<_>>()` with `_` lets the compiler infer the element type — cleaner than specifying it fully.
- `HashSet` is your go-to for O(1) membership testing — faster than `Vec::contains()` which is O(n).

---

## Summary

- `Vec<T>`: the default collection — growable, indexed, heap-allocated. Use `vec![]` macro or `collect()`.
- `String`: owned UTF-8 text; `&str` is a borrowed string slice. Iterate with `.chars()` for Unicode correctness.
- `HashMap<K, V>`: O(1) average key-value lookup. `entry().or_insert()` for conditional insertion.
- `HashSet<T>`: unique elements; O(1) membership test; set operations (union, intersection, difference).
- `BTreeMap`/`BTreeSet`: sorted versions of HashMap/HashSet — use when iteration order matters.
- `BinaryHeap<T>`: max-heap priority queue — `peek()` sees the largest; `pop()` removes it.
