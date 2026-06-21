---
title: "Collections Framework"
sidebar_label: "Collections"
sidebar_position: 3
---

# Collections Framework

The Java Collections Framework provides ready-to-use implementations of common data structures. Choosing the right collection type is crucial for performance and correctness.

---

## Generics

Generics make code type-safe and reusable without casting.

```java
// Without generics — runtime ClassCastException risk
List raw = new ArrayList();
raw.add("hello");
String s = (String) raw.get(0);  // explicit cast required

// With generics — compile-time safety
List<String> strings = new ArrayList<>();
strings.add("hello");
String s = strings.get(0);  // no cast needed
// strings.add(42);  // compile error — type-safe

// Generic class
public class Box<T> {
    private T value;
    public Box(T value) { this.value = value; }
    public T get()      { return value; }
    public <R> Box<R> map(java.util.function.Function<T, R> fn) {
        return new Box<>(fn.apply(value));
    }
}
Box<String> box = new Box<>("hello");
Box<Integer> len = box.map(String::length);

// Generic method
public static <T extends Comparable<T>> T max(T a, T b) {
    return a.compareTo(b) >= 0 ? a : b;
}
String bigger = max("apple", "banana");   // "banana"
int   largest = max(42, 17);              // 42

// Wildcards
// ? — unknown type
// ? extends T — upper bounded: T or any subtype
// ? super T   — lower bounded: T or any supertype

void printList(List<?> list) {
    for (Object e : list) System.out.println(e);  // read only
}

double sumList(List<? extends Number> list) {
    return list.stream().mapToDouble(Number::doubleValue).sum();
}
// sumList accepts List<Integer>, List<Double>, List<Number>

void addNumbers(List<? super Integer> list) {
    list.add(1);   // can add Integer (or subtypes)
    list.add(2);
}
// addNumbers accepts List<Integer>, List<Number>, List<Object>

// Generic interface
public interface Repository<T, ID> {
    T findById(ID id);
    List<T> findAll();
    T save(T entity);
    void delete(ID id);
}
```

---

## Collection Hierarchy

```
Iterable
└── Collection
    ├── List         — ordered, duplicates allowed
    │   ├── ArrayList
    │   ├── LinkedList
    │   └── Vector (legacy)
    ├── Set          — no duplicates
    │   ├── HashSet
    │   ├── LinkedHashSet
    │   └── TreeSet
    └── Queue        — FIFO ordering
        ├── LinkedList
        ├── PriorityQueue
        └── Deque (double-ended)
            ├── ArrayDeque
            └── LinkedList

Map (not a Collection, but part of the framework)
├── HashMap
├── LinkedHashMap
├── TreeMap
├── Hashtable (legacy)
└── ConcurrentHashMap
```

---

## List

### ArrayList — The Default List

```java
import java.util.*;

// Create
List<String> list = new ArrayList<>();                     // empty, initial capacity 10
List<String> list = new ArrayList<>(100);                  // pre-size to avoid resizing
List<String> list = new ArrayList<>(anotherList);          // copy constructor
List<String> list = new ArrayList<>(List.of("a","b","c")); // from other collection

// Unmodifiable (fixed)
List<String> fixed = List.of("a", "b", "c");           // Java 9+ — throws on modification
List<String> fixed2 = Collections.unmodifiableList(list); // view on modifiable list
List<String> copy = List.copyOf(list);                  // Java 10+ — unmodifiable copy

// Add
list.add("Alice");                   // append to end → true
list.add(0, "Bob");                  // insert at index 0
list.addAll(List.of("Carol","Dave")); // append all
list.addAll(1, anotherList);          // insert all at index

// Get
list.get(0)                // "Bob"
list.get(list.size() - 1) // last element
list.getFirst()            // Java 21+: first element
list.getLast()             // Java 21+: last element

// Set
list.set(0, "Charles");    // replace at index, returns old value

// Remove
list.remove(0)             // remove by index, returns removed element
list.remove("Alice")       // remove first occurrence by value, returns boolean
list.removeAll(otherList)  // remove all elements present in otherList
list.retainAll(otherList)  // keep only elements in otherList
list.clear()               // remove everything
list.removeIf(s -> s.startsWith("A"));  // remove by predicate

// Search
list.contains("Alice")         // true/false
list.indexOf("Alice")          // first index or -1
list.lastIndexOf("Alice")      // last index or -1
list.isEmpty()                 // true if size == 0
list.size()                    // number of elements

// Sort
list.sort(null)                    // natural order (Comparable)
list.sort(Comparator.naturalOrder())
list.sort(Comparator.reverseOrder())
list.sort(Comparator.comparing(String::length))
list.sort(Comparator.comparing(String::length).thenComparing(Comparator.naturalOrder()))
Collections.sort(list)            // same — modifies list

// Sublist — a view (backed by original list)
list.subList(1, 4)            // elements at index 1,2,3

// Convert
String[] array = list.toArray(new String[0]);  // to array
List<String> fromArray = Arrays.asList(array); // fixed-size List from array
List<String> mutable   = new ArrayList<>(Arrays.asList(array)); // mutable copy

// Iteration
for (String s : list) { }                              // for-each
list.forEach(System.out::println);                      // Consumer lambda
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    if (s.isEmpty()) it.remove();                       // safe removal during iteration
}
ListIterator<String> lit = list.listIterator();        // bidirectional
while (lit.hasPrevious()) {
    String s = lit.previous();
    lit.set(s.toUpperCase());                           // replace
}

// Replaces
list.replaceAll(String::toUpperCase);  // replace all elements
Collections.fill(list, "default");     // fill all with same value
Collections.reverse(list);            // reverse in place
Collections.shuffle(list);            // random shuffle
Collections.shuffle(list, new Random(42));  // with seed

// Searching and min/max
Collections.binarySearch(list, "Alice")  // sorted list required!
Collections.min(list)                    // minimum element
Collections.max(list)
Collections.min(list, comparator)
Collections.frequency(list, "Alice")     // how many times "Alice" appears
Collections.disjoint(list1, list2)       // true if no common elements
Collections.nCopies(5, "hi")            // List["hi","hi","hi","hi","hi"]
Collections.singletonList("only")       // immutable single-element list
Collections.emptyList()                 // immutable empty list
```

### LinkedList — Doubly-Linked List

```java
LinkedList<String> ll = new LinkedList<>();
ll.addFirst("first")   // add to front
ll.addLast("last")     // add to end (same as add)
ll.getFirst()          // peek front
ll.getLast()           // peek end
ll.removeFirst()       // remove and return front
ll.removeLast()        // remove and return end
ll.peekFirst()         // null if empty (vs getFirst which throws)
ll.peekLast()
ll.pollFirst()         // remove and return, null if empty
ll.pollLast()

// Also implements Deque — use as queue or stack
ll.offer("item")       // add to tail (Queue)
ll.poll()              // remove from head (Queue)
ll.peek()              // peek head without removing
ll.push("item")        // add to head (Stack)
ll.pop()               // remove from head (Stack)
```

---

## Set

### HashSet — Fast Unordered Set

```java
Set<String> set = new HashSet<>();
set.add("Alice")        // true (added)
set.add("Alice")        // false (already exists — duplicate ignored)
set.add("Bob")

set.contains("Alice")   // true  — O(1)
set.remove("Alice")     // true
set.size()              // 1
set.isEmpty()           // false
set.clear()

// Iteration (order is NOT guaranteed)
for (String s : set) { }
set.forEach(System.out::println);

// Set operations
Set<String> a = new HashSet<>(Set.of("a","b","c","d"));
Set<String> b = new HashSet<>(Set.of("c","d","e","f"));

// Union
Set<String> union = new HashSet<>(a);
union.addAll(b);   // {a,b,c,d,e,f}

// Intersection
Set<String> inter = new HashSet<>(a);
inter.retainAll(b); // {c,d}

// Difference (a - b)
Set<String> diff = new HashSet<>(a);
diff.removeAll(b);  // {a,b}

// Subset check
a.containsAll(b)    // false — is b a subset of a?

// Create from other collections (dedup)
List<String> withDups = List.of("a","b","a","c","b");
Set<String> deduped = new HashSet<>(withDups);  // {a,b,c}
```

### LinkedHashSet — Insertion-Order Set

```java
Set<String> set = new LinkedHashSet<>();
set.add("banana");
set.add("apple");
set.add("cherry");
// iteration order: banana, apple, cherry (insertion order)
```

### TreeSet — Sorted Set

```java
TreeSet<String> ts = new TreeSet<>();
ts.add("banana");
ts.add("apple");
ts.add("cherry");
// Natural sorted order: apple, banana, cherry

// Custom order
TreeSet<String> custom = new TreeSet<>(Comparator.comparing(String::length).thenComparing(Comparator.naturalOrder()));

// NavigableSet methods
ts.first()              // "apple" — smallest
ts.last()               // "cherry" — largest
ts.higher("banana")     // "cherry" — first element > "banana"
ts.lower("banana")      // "apple"  — first element < "banana"
ts.ceiling("b")         // "banana" — first element >= "b"
ts.floor("b")           // "banana" — last element <= "b" (wait, this would be "banana" too)
ts.headSet("cherry")    // {apple, banana} — strictly less than "cherry"
ts.tailSet("banana")    // {banana, cherry}
ts.subSet("apple", "cherry")  // {apple, banana} — [from, to)
ts.pollFirst()          // remove and return smallest
ts.pollLast()           // remove and return largest
ts.descendingSet()      // reverse-order view
```

---

## Map

### HashMap — Fast Unordered Map

```java
Map<String, Integer> map = new HashMap<>();

// Put
map.put("Alice", 30)              // add or replace, returns old value (or null)
map.put("Bob", 25)
map.putIfAbsent("Alice", 99)      // only add if key not present, returns existing value
map.putAll(otherMap)              // add all entries from another map

// Get
map.get("Alice")                  // 30, or null if not found
map.get("Unknown")                // null
map.getOrDefault("Unknown", 0)    // 0 — provide a fallback

// Check
map.containsKey("Alice")          // true
map.containsValue(30)             // true (O(n) scan)
map.isEmpty()                     // false
map.size()                        // 2

// Remove
map.remove("Alice")               // returns 30
map.remove("Bob", 25)             // conditional remove — only if value matches

// Iteration
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}
map.forEach((key, value) -> System.out.println(key + " = " + value));

for (String key : map.keySet()) { }
for (Integer value : map.values()) { }

// Compute patterns
// computeIfAbsent — add only if key absent, using factory
map.computeIfAbsent("Charlie", k -> 0);   // adds "Charlie"→0
// computeIfPresent — update only if key present
map.computeIfPresent("Alice", (k, v) -> v + 1);  // 31
// compute — always compute new value (null removes the key)
map.compute("Alice", (k, v) -> v == null ? 1 : v + 1);
// merge — merge new value with existing
map.merge("Alice", 1, Integer::sum);  // adds 1 to existing, or inserts 1 if absent

// Useful patterns
// Frequency count
Map<String, Long> freq = new HashMap<>();
for (String word : words) {
    freq.merge(word, 1L, Long::sum);
}
// OR: freq.compute(word, (k, v) -> v == null ? 1L : v + 1L);

// Group elements
Map<Integer, List<String>> byLength = new HashMap<>();
for (String s : list) {
    byLength.computeIfAbsent(s.length(), k -> new ArrayList<>()).add(s);
}

// Unmodifiable maps
Map<String, Integer> fixed  = Map.of("a", 1, "b", 2, "c", 3);  // up to 10 entries
Map<String, Integer> fixed2 = Map.ofEntries(
    Map.entry("key1", 1),
    Map.entry("key2", 2)
);
Map<String, Integer> copy = Map.copyOf(map);
```

### LinkedHashMap — Insertion-Order Map

```java
Map<String, Integer> ordered = new LinkedHashMap<>();
// iterates in insertion order

// LRU Cache using LinkedHashMap
Map<String, String> lru = new LinkedHashMap<>(16, 0.75f, true) {  // accessOrder=true
    private static final int MAX = 100;
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
        return size() > MAX;   // remove oldest when capacity exceeded
    }
};
```

### TreeMap — Sorted Map

```java
TreeMap<String, Integer> tm = new TreeMap<>();
tm.put("banana", 2);
tm.put("apple", 1);
tm.put("cherry", 3);
// Keys in natural sorted order: apple, banana, cherry

TreeMap<String, Integer> custom = new TreeMap<>(Comparator.reverseOrder());

// NavigableMap methods
tm.firstKey()           // "apple"
tm.lastKey()            // "cherry"
tm.higherKey("banana")  // "cherry"
tm.lowerKey("banana")   // "apple"
tm.ceilingKey("b")      // "banana"
tm.floorKey("b")        // "banana"
tm.firstEntry()         // Map.Entry<"apple", 1>
tm.lastEntry()          // Map.Entry<"cherry", 3>
tm.headMap("cherry")    // {apple=1, banana=2}
tm.tailMap("banana")    // {banana=2, cherry=3}
tm.subMap("apple", "cherry") // {apple=1, banana=2}
tm.descendingMap()      // reverse-order view
tm.navigableKeySet()    // NavigableSet of keys
tm.pollFirstEntry()     // remove and return smallest entry
tm.pollLastEntry()      // remove and return largest entry
```

---

## Queue and Deque

### PriorityQueue — Min-Heap

```java
// Natural ordering (min-heap by default)
PriorityQueue<Integer> pq = new PriorityQueue<>();
pq.offer(5);    // add (returns true/false)
pq.offer(1);
pq.offer(3);
pq.peek()      // 1 — smallest, doesn't remove
pq.poll()      // 1 — removes and returns smallest
pq.size()      // 2
pq.isEmpty()   // false

// Max-heap
PriorityQueue<Integer> maxPq = new PriorityQueue<>(Comparator.reverseOrder());

// Custom ordering
PriorityQueue<String> byLength = new PriorityQueue<>(Comparator.comparing(String::length));

// Task scheduling example
record Task(String name, int priority) {}
PriorityQueue<Task> tasks = new PriorityQueue<>(Comparator.comparingInt(Task::priority).reversed());
tasks.offer(new Task("Email", 2));
tasks.offer(new Task("Bug fix", 1));  // higher priority
tasks.offer(new Task("Meeting", 3));
while (!tasks.isEmpty()) {
    System.out.println(tasks.poll().name());  // Bug fix, Email, Meeting
}
```

### ArrayDeque — Double-Ended Queue

```java
// Best implementation for both stack and queue (faster than LinkedList)
Deque<String> deque = new ArrayDeque<>();

// Queue operations (FIFO)
deque.offer("a")      // add to tail — returns false if capacity exceeded
deque.offerLast("b")  // same as offer
deque.offerFirst("z") // add to head
deque.peek()          // peek head without removing (null if empty)
deque.poll()          // remove from head (null if empty)
deque.peekLast()      // peek tail
deque.pollLast()      // remove from tail

// Stack operations (LIFO)
deque.push("first")   // add to head
deque.push("second")
deque.pop()           // remove from head
deque.peek()          // peek head

// Throws on failure (vs returns null/false)
deque.add("a")        // like offer, throws on full (unbounded deque: never)
deque.addFirst("z")
deque.addLast("a")
deque.getFirst()      // NoSuchElementException if empty
deque.getLast()
deque.removeFirst()
deque.removeLast()
deque.remove()        // removeFirst

// Use as a stack (instead of java.util.Stack which is legacy)
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.push(3);
stack.pop()   // 3 (LIFO)
```

---

## Sorting with Comparator

```java
record Person(String name, int age, String city) {}

List<Person> people = new ArrayList<>(List.of(
    new Person("Alice", 30, "Paris"),
    new Person("Bob",   25, "London"),
    new Person("Carol", 30, "Paris"),
    new Person("Dave",  25, "Berlin")
));

// Sort by age ascending
people.sort(Comparator.comparingInt(Person::age));

// Sort by age descending
people.sort(Comparator.comparingInt(Person::age).reversed());

// Multi-key: age ascending, then name ascending
people.sort(Comparator.comparingInt(Person::age)
                       .thenComparing(Person::name));

// Multi-key: age ascending, then name descending
people.sort(Comparator.comparingInt(Person::age)
                       .thenComparing(Comparator.comparing(Person::name).reversed()));

// Null-safe — nulls first or last
List<String> withNulls = Arrays.asList("b", null, "a", null, "c");
withNulls.sort(Comparator.nullsFirst(Comparator.naturalOrder()));
// [null, null, a, b, c]
withNulls.sort(Comparator.nullsLast(Comparator.naturalOrder()));
// [a, b, c, null, null]

// Case-insensitive string sort
people.sort(Comparator.comparing(Person::name, String.CASE_INSENSITIVE_ORDER));

// Comparing with key extractor + custom comparator
people.sort(Comparator.comparing(Person::city, Comparator.reverseOrder())
                       .thenComparing(Person::name));

// Implement Comparable in a class
public class Product implements Comparable<Product> {
    private String name;
    private double price;

    @Override
    public int compareTo(Product other) {
        // negative: this < other, zero: equal, positive: this > other
        return Double.compare(this.price, other.price);
    }
}
// Then: Collections.sort(products) and TreeSet<Product> work automatically
```

---

## Collections Utility Methods

```java
List<Integer> nums = new ArrayList<>(List.of(5, 3, 8, 1, 9, 2));

// Sort
Collections.sort(nums)                   // natural order
Collections.sort(nums, Comparator.reverseOrder())

// Search (list must be sorted!)
Collections.binarySearch(nums, 5)        // index or -(insertion point) - 1

// Min/max
Collections.min(nums)                    // 1
Collections.max(nums)                    // 9
Collections.min(nums, Comparator.reverseOrder()) // 9

// Modification
Collections.reverse(nums)                // in-place reverse
Collections.shuffle(nums)               // random shuffle
Collections.shuffle(nums, new Random())
Collections.fill(nums, 0)              // fill all with 0
Collections.swap(nums, 0, 1)           // swap elements at two indexes

// Info
Collections.frequency(nums, 5)          // count of 5
Collections.disjoint(nums, otherList)   // true if no common elements

// Factory methods
Collections.emptyList()                 // immutable empty list
Collections.emptySet()                  // immutable empty set
Collections.emptyMap()
Collections.singletonList("only")       // immutable 1-element list
Collections.singleton("only")          // immutable 1-element set
Collections.singletonMap("k", "v")
Collections.nCopies(5, "hi")           // [hi, hi, hi, hi, hi] — immutable
Collections.unmodifiableList(list)     // unmodifiable view
Collections.unmodifiableSet(set)
Collections.unmodifiableMap(map)
Collections.synchronizedList(list)     // thread-safe wrapper
Collections.synchronizedSet(set)
Collections.synchronizedMap(map)
Collections.checkedList(list, String.class)  // runtime type check
```

---

## Choosing the Right Collection

| Need | Use |
|---|---|
| Ordered list, fast random access | `ArrayList` |
| Ordered list, fast insert/delete at ends | `ArrayDeque` |
| No duplicates, don't care about order | `HashSet` |
| No duplicates, insertion order | `LinkedHashSet` |
| No duplicates, sorted order | `TreeSet` |
| Key-value pairs, fast lookup | `HashMap` |
| Key-value pairs, insertion order | `LinkedHashMap` |
| Key-value pairs, sorted by key | `TreeMap` |
| Priority ordering | `PriorityQueue` |
| Thread-safe operations | `ConcurrentHashMap`, `CopyOnWriteArrayList` |
| Fixed, immutable collection | `List.of()`, `Set.of()`, `Map.of()` |

---

## Summary

- `ArrayList` is the default `List` — fast random access, slow middle insert/delete.
- `HashSet` and `HashMap` give O(1) average for add/remove/contains — order not guaranteed.
- `LinkedHashSet`/`LinkedHashMap` maintain insertion order with minimal overhead.
- `TreeSet`/`TreeMap` maintain sorted order — O(log n) for operations.
- Always specify initial capacity when you know the size: `new ArrayList<>(1000)` avoids resizing.
- Use `List.of()`, `Set.of()`, `Map.of()` for small, fixed collections — they're more efficient and safe.
- `ArrayDeque` is a better stack and queue than `Stack` or `LinkedList`.
- Override `equals()` and `hashCode()` consistently — objects used as `HashMap` keys or in `HashSet` depend on it.
