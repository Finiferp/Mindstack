---
title: "Java Collections & Generics"
sidebar_label: "Collections & Generics"
sidebar_position: 3
---

# Collections & Generics

The Java Collections Framework provides ready-made data structures for storing, retrieving, and manipulating groups of objects. Generics make those structures type-safe — the compiler catches type mismatches at compile time rather than at runtime.

---

## Generics

Generics let you write classes and methods that work with any type while retaining full type safety.

```java
// Without generics — type unsafe, requires casting
List list = new ArrayList();
list.add("Hello");
String s = (String) list.get(0); // cast required, can fail at runtime

// With generics — type safe, no cast needed
List<String> list = new ArrayList<>();
list.add("Hello");
String s = list.get(0); // compiler knows it's a String
```

### Generic Classes
```java
public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T getValue() {
        return value;
    }
}

Box<Integer> intBox = new Box<>(42);
Box<String> strBox = new Box<>("Hello");
```

### Generic Methods
```java
public static <T> T getFirst(List<T> list) {
    if (list.isEmpty()) return null;
    return list.get(0);
}

String first = getFirst(List.of("a", "b", "c")); // "a"
```

### Bounded Type Parameters
```java
// T must be a Number or subclass
public static <T extends Number> double sum(List<T> list) {
    double total = 0;
    for (T item : list) total += item.doubleValue();
    return total;
}

// Wildcard: List<? extends Animal> — read-only, any Animal subtype
// Wildcard: List<? super Dog>      — write-allowed, Dog or supertypes
```

**Tips:**
- Use `<T>` when you need a type parameter you'll refer to multiple times.
- Use `<?>` (unbounded wildcard) when you only need to read from a collection and don't care about the specific type.
- The diamond operator `<>` (Java 7+) infers the type argument from context — always use it instead of repeating the type.
- Generics are erased at runtime (type erasure) — `List<String>` and `List<Integer>` are the same class at runtime.

---

## The Collections Hierarchy

The main interfaces and their most-used implementations:

```
Collection
├── List       → ArrayList, LinkedList
├── Set        → HashSet, LinkedHashSet, TreeSet
└── Queue      → ArrayDeque, PriorityQueue

Map (not a Collection)
├── HashMap
├── LinkedHashMap
└── TreeMap
```

---

## List

A **List** is an ordered, indexed collection that allows duplicates.

### ArrayList
Backed by a dynamic array. O(1) random access. O(n) insert/remove in the middle.

```java
import java.util.ArrayList;
import java.util.List;

List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.add("Charlie");
names.add(1, "Dave");   // insert at index 1

System.out.println(names.get(0));   // "Alice"
System.out.println(names.size());   // 4

names.remove("Bob");                // remove by value
names.remove(0);                    // remove by index

// Iterate
for (String name : names) {
    System.out.println(name);
}

// Sort
Collections.sort(names);
names.sort(Comparator.reverseOrder());

// Search
boolean has = names.contains("Charlie");
int idx = names.indexOf("Charlie");
```

### LinkedList
Backed by a doubly-linked list. O(1) insert/remove at head/tail. O(n) random access.

```java
import java.util.LinkedList;

LinkedList<String> queue = new LinkedList<>();
queue.addFirst("first");
queue.addLast("last");
queue.removeFirst();
queue.peekFirst();   // look without removing
```

**When to use which:**
- `ArrayList` — default choice. Fast reads, occasional writes.
- `LinkedList` — frequent insertions/deletions at both ends; also implements `Deque`.

---

## Set

A **Set** is a collection with no duplicates. Order depends on the implementation.

```java
import java.util.HashSet;
import java.util.Set;

Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("spring");
tags.add("java");   // duplicate — silently ignored

System.out.println(tags.size());         // 2
System.out.println(tags.contains("java")); // true

// Set operations
Set<String> a = new HashSet<>(Set.of("a", "b", "c"));
Set<String> b = new HashSet<>(Set.of("b", "c", "d"));

a.retainAll(b); // intersection: {b, c}
a.addAll(b);    // union
a.removeAll(b); // difference
```

| Implementation     | Order            | Performance       |
|--------------------|------------------|-------------------|
| `HashSet`          | None             | O(1) add/contains |
| `LinkedHashSet`    | Insertion order  | O(1) add/contains |
| `TreeSet`          | Sorted (natural) | O(log n) all ops  |

**Tips:**
- Use `HashSet` by default.
- Use `LinkedHashSet` when you need to preserve insertion order.
- Use `TreeSet` when you need items always sorted.
- Custom objects used in a Set must implement `equals()` and `hashCode()` correctly.

---

## Map

A **Map** stores key-value pairs. Keys are unique; values can repeat.

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> wordCount = new HashMap<>();
wordCount.put("hello", 1);
wordCount.put("world", 2);
wordCount.put("hello", 5);    // overwrites previous value

wordCount.get("hello");       // 5
wordCount.getOrDefault("xyz", 0); // 0
wordCount.containsKey("world");   // true
wordCount.remove("world");

// Compute helpers
wordCount.merge("hello", 1, Integer::sum);       // add 1 to existing
wordCount.computeIfAbsent("new", k -> 0);        // init if missing
wordCount.computeIfPresent("hello", (k, v) -> v + 1);

// Iterate
for (Map.Entry<String, Integer> entry : wordCount.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}

wordCount.forEach((key, value) -> System.out.println(key + ": " + value));
```

| Implementation     | Order              | Performance        |
|--------------------|--------------------|--------------------|
| `HashMap`          | None               | O(1) get/put       |
| `LinkedHashMap`    | Insertion order    | O(1) get/put       |
| `TreeMap`          | Sorted by key      | O(log n) all ops   |

**Tips:**
- `HashMap` is the default. `LinkedHashMap` for ordered iteration. `TreeMap` for sorted keys.
- Use `getOrDefault` and `computeIfAbsent` to avoid null checks.
- Keys must implement `equals()` and `hashCode()` — `String` and boxed primitives do this correctly.

---

## Queue and Deque

A **Queue** is a FIFO (first-in, first-out) structure. A **Deque** supports insertion and removal at both ends.

```java
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Queue;

// Queue (FIFO)
Queue<String> queue = new ArrayDeque<>();
queue.offer("first");   // add to tail
queue.offer("second");
queue.peek();           // look at head without removing: "first"
queue.poll();           // remove from head: "first"

// Deque as stack (LIFO)
Deque<String> stack = new ArrayDeque<>();
stack.push("a");    // addFirst
stack.push("b");
stack.pop();        // removeFirst: "b"
stack.peek();       // "a"

// PriorityQueue — min-heap, smallest element polled first
Queue<Integer> pq = new PriorityQueue<>();
pq.offer(10);
pq.offer(3);
pq.offer(7);
pq.poll(); // 3 (smallest)
```

**Tips:**
- Prefer `ArrayDeque` over `LinkedList` for both queue and stack use cases — it's faster.
- Prefer `ArrayDeque` over `Stack` — `Stack` is a legacy class with synchronization overhead.
- `PriorityQueue` uses natural ordering or a custom `Comparator`.

---

## Immutable Collections (Java 9+)

```java
List<String> names = List.of("Alice", "Bob", "Charlie");
Set<Integer> numbers = Set.of(1, 2, 3);
Map<String, Integer> scores = Map.of("Alice", 95, "Bob", 82);

// These throw UnsupportedOperationException if you try to add/remove
// names.add("Dave"); // throws!
```

**Tips:**
- Use immutable collections for constants, configuration, and defensive copies.
- `List.copyOf(existingList)` makes an immutable copy.
- These are far more compact and safe than `Collections.unmodifiableList(...)`.

---

## The Collections Utility Class

```java
import java.util.Collections;

List<Integer> nums = new ArrayList<>(List.of(5, 3, 1, 4, 2));

Collections.sort(nums);                          // [1, 2, 3, 4, 5]
Collections.reverse(nums);                       // [5, 4, 3, 2, 1]
Collections.shuffle(nums);                       // random order
Collections.min(nums);                           // smallest element
Collections.max(nums);                           // largest element
Collections.frequency(nums, 3);                  // count occurrences of 3
Collections.fill(nums, 0);                       // fill all with 0
Collections.unmodifiableList(nums);              // read-only view
Collections.synchronizedList(new ArrayList<>());  // thread-safe wrapper
```

---

## Comparable and Comparator

To sort custom objects, implement `Comparable` (natural ordering) or provide a `Comparator`.

```java
public class Student implements Comparable<Student> {

    private String name;
    private double gpa;

    public Student(String name, double gpa) {
        this.name = name;
        this.gpa = gpa;
    }

    @Override
    public int compareTo(Student other) {
        return Double.compare(other.gpa, this.gpa); // descending GPA
    }
}
```

```java
List<Student> students = new ArrayList<>();
students.add(new Student("Alice", 3.9));
students.add(new Student("Bob", 3.5));
students.add(new Student("Charlie", 3.7));

Collections.sort(students); // uses compareTo

// Or with Comparator (no need to modify the class)
students.sort(Comparator.comparing(s -> s.getName()));
students.sort(Comparator.comparingDouble(Student::getGpa).reversed());

// Chained comparator
students.sort(Comparator
    .comparingDouble(Student::getGpa).reversed()
    .thenComparing(Student::getName));
```

**Tips:**
- `compareTo` returns negative (this < other), zero (equal), positive (this > other).
- Use `Integer.compare(a, b)` and `Double.compare(a, b)` — avoid subtraction which can overflow.
- `Comparator.comparing(...)` is much more readable than anonymous classes.

---

## Summary

The Collections Framework gives you the right tool for every data structure need:

- **List** — ordered, indexed, allows duplicates → `ArrayList`.
- **Set** — unordered, no duplicates → `HashSet`.
- **Map** — key-value pairs, unique keys → `HashMap`.
- **Queue/Deque** — FIFO queues and LIFO stacks → `ArrayDeque`.

**Key Takeaways:**
- Start with `ArrayList`, `HashMap`, `HashSet` — switch only when you need ordering, priority, or tree-based behavior.
- Use `List.of()`, `Set.of()`, `Map.of()` for immutable constants.
- Implement `equals()` and `hashCode()` on objects you put into `Set` or `Map`.
- Use `Comparator.comparing(...)` chained methods for clean, readable sort logic.
