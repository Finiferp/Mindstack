---
title: "Java Streams & Lambdas"
sidebar_label: "Streams & Lambdas"
sidebar_position: 4
---

# Streams & Lambdas

Java 8 introduced lambdas and the Stream API, transforming how Java developers write data-processing code. Instead of writing explicit loops with mutation, you describe *what* you want in a declarative pipeline. The result is more readable, more composable, and often parallelizable with a single keyword.

---

## Lambdas

A **lambda** is an anonymous function — a block of code that can be passed around as a value.

```java
// Before lambdas: anonymous class
Runnable r = new Runnable() {
    @Override
    public void run() {
        System.out.println("Running!");
    }
};

// With lambda
Runnable r = () -> System.out.println("Running!");

// Lambda with parameters
Comparator<String> comp = (a, b) -> a.compareTo(b);

// Lambda with a block body
Comparator<String> comp = (a, b) -> {
    System.out.println("Comparing: " + a + " vs " + b);
    return a.compareTo(b);
};
```

### Common Functional Interfaces (`java.util.function`)

| Interface              | Signature               | Use case                        |
|------------------------|-------------------------|---------------------------------|
| `Predicate<T>`         | `T → boolean`           | Filtering                       |
| `Function<T, R>`       | `T → R`                 | Transforming                    |
| `Consumer<T>`          | `T → void`              | Consuming/printing              |
| `Supplier<T>`          | `() → T`                | Providing/creating              |
| `BiFunction<T, U, R>`  | `T, U → R`              | Two-input transformation        |
| `UnaryOperator<T>`     | `T → T`                 | Transform same type             |
| `BinaryOperator<T>`    | `T, T → T`              | Reduce same type                |

```java
Predicate<String> isLong = s -> s.length() > 5;
Function<String, Integer> toLength = String::length;
Consumer<String> printer = System.out::println;
Supplier<List<String>> listFactory = ArrayList::new;

isLong.test("hello");        // false
toLength.apply("hello");     // 5

// Composing
Predicate<String> isShort = isLong.negate();
Function<String, String> trimThenUpper = 
    ((Function<String, String>) String::trim).andThen(String::toUpperCase);
```

### Method References

Shorthand for lambdas that just call a method.

```java
// Static method reference
Function<String, Integer> parser = Integer::parseInt;

// Instance method reference (unbound)
Function<String, String> upper = String::toUpperCase;

// Instance method reference (bound)
String prefix = "Hello, ";
Function<String, String> greet = prefix::concat;

// Constructor reference
Supplier<ArrayList<String>> factory = ArrayList::new;
```

**Tips:**
- Use method references whenever the lambda just delegates to a single method — it's cleaner.
- Compose functions with `.andThen()` and `.compose()` for reusable pipelines.
- Lambdas can capture local variables, but those variables must be effectively final.

---

## The Stream API

A **Stream** is a sequence of elements that supports sequential and parallel aggregate operations. Streams do NOT store data — they process it.

### Stream Pipeline Structure
```
source → [intermediate operations]* → terminal operation
```

Every pipeline has exactly one terminal operation. Intermediate operations are **lazy** — nothing executes until the terminal is invoked.

### Creating Streams
```java
// From a collection
List<String> names = List.of("Alice", "Bob", "Charlie");
Stream<String> stream = names.stream();

// From values
Stream<String> s = Stream.of("a", "b", "c");

// From array
int[] arr = {1, 2, 3};
IntStream is = Arrays.stream(arr);

// Infinite streams
Stream<Integer> nats = Stream.iterate(0, n -> n + 1);
Stream<Double> randoms = Stream.generate(Math::random);

// From a range
IntStream range = IntStream.range(1, 11);    // 1..10
IntStream rangeClosed = IntStream.rangeClosed(1, 10); // same
```

---

## Intermediate Operations

These transform the stream into another stream. They are lazy — stacked up until a terminal fires.

### filter
```java
List<String> longNames = names.stream()
    .filter(n -> n.length() > 3)
    .collect(Collectors.toList());
```

### map
```java
List<Integer> lengths = names.stream()
    .map(String::length)
    .collect(Collectors.toList());
```

### flatMap
```java
List<List<Integer>> nested = List.of(List.of(1,2), List.of(3,4), List.of(5));
List<Integer> flat = nested.stream()
    .flatMap(Collection::stream)
    .collect(Collectors.toList());
// [1, 2, 3, 4, 5]
```

### distinct, sorted, limit, skip
```java
List<Integer> result = Stream.of(3, 1, 4, 1, 5, 9, 2, 6, 5)
    .distinct()         // remove duplicates
    .sorted()           // natural order
    .skip(2)            // skip first 2
    .limit(4)           // take next 4
    .collect(Collectors.toList());
```

### peek (debug only)
```java
names.stream()
    .peek(n -> System.out.println("Before: " + n))
    .map(String::toUpperCase)
    .peek(n -> System.out.println("After: " + n))
    .collect(Collectors.toList());
```

---

## Terminal Operations

These trigger the pipeline and produce a result.

### collect
```java
import java.util.stream.Collectors;

// To List / Set / Map
List<String> list = stream.collect(Collectors.toList());
Set<String> set = stream.collect(Collectors.toSet());

Map<Integer, List<String>> byLength = names.stream()
    .collect(Collectors.groupingBy(String::length));

Map<Boolean, List<String>> partitioned = names.stream()
    .collect(Collectors.partitioningBy(n -> n.length() > 3));

String joined = names.stream()
    .collect(Collectors.joining(", ", "[", "]"));
// "[Alice, Bob, Charlie]"

// Counting
Map<Integer, Long> countByLength = names.stream()
    .collect(Collectors.groupingBy(String::length, Collectors.counting()));
```

### forEach
```java
names.stream().forEach(System.out::println);
// Or directly: names.forEach(System.out::println)
```

### reduce
```java
int sum = IntStream.rangeClosed(1, 10).reduce(0, Integer::sum); // 55

Optional<String> longest = names.stream()
    .reduce((a, b) -> a.length() >= b.length() ? a : b);
```

### count, min, max, sum, average
```java
long count = names.stream().count();

Optional<String> first = names.stream().min(Comparator.naturalOrder());
Optional<String> last  = names.stream().max(Comparator.naturalOrder());

int total = IntStream.of(1, 2, 3, 4, 5).sum();         // 15
double avg = IntStream.of(1, 2, 3, 4, 5).average().orElse(0); // 3.0
```

### findFirst, findAny, anyMatch, allMatch, noneMatch
```java
Optional<String> found = names.stream()
    .filter(n -> n.startsWith("A"))
    .findFirst();

boolean anyLong = names.stream().anyMatch(n -> n.length() > 5);
boolean allShort = names.stream().allMatch(n -> n.length() < 10);
boolean noneEmpty = names.stream().noneMatch(String::isBlank);
```

---

## Optional

`Optional<T>` is a container that may or may not hold a value — it's a better alternative to returning `null`.

```java
Optional<String> opt = Optional.of("Hello");
Optional<String> empty = Optional.empty();
Optional<String> nullable = Optional.ofNullable(null); // empty

// Safe access
opt.isPresent();            // true
opt.isEmpty();              // false (Java 11+)
opt.get();                  // "Hello" — throws if empty, avoid raw get()
opt.orElse("default");      // "Hello" if present, else "default"
opt.orElseGet(() -> "computed default"); // lazy evaluation
opt.orElseThrow(() -> new RuntimeException("Missing")); // throw if empty

// Transform
opt.map(String::toUpperCase);      // Optional["HELLO"]
opt.filter(s -> s.length() > 3);  // Optional["Hello"]
opt.flatMap(s -> Optional.of(s.trim())); // avoid Optional<Optional<T>>
```

**Tips:**
- Never call `opt.get()` without first checking `isPresent()` — or better, use `orElse`/`orElseThrow`.
- Don't use `Optional` as method parameter or field — it's designed for return types only.
- `Optional` adds a small overhead. Don't wrap primitives — use `OptionalInt`, `OptionalDouble`.

---

## Parallel Streams

Switch from sequential to parallel processing with one method call.

```java
long count = names.parallelStream()
    .filter(n -> n.length() > 3)
    .count();

// Or convert mid-stream
names.stream()
    .parallel()
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

**Tips:**
- Parallel streams use the common `ForkJoinPool`. They help on CPU-bound tasks with large datasets.
- Don't use parallel streams for I/O-bound tasks or small collections — the overhead outweighs the benefit.
- Ensure operations are stateless and avoid shared mutable state — parallel streams can process elements in any order.
- The `collect` terminal operation with `Collectors.toList()` is safe for parallel streams.

---

## Real-World Example

```java
record Employee(String name, String department, double salary) {}

List<Employee> employees = List.of(
    new Employee("Alice", "Engineering", 95_000),
    new Employee("Bob", "Marketing", 72_000),
    new Employee("Charlie", "Engineering", 105_000),
    new Employee("Diana", "Marketing", 68_000),
    new Employee("Eve", "Engineering", 88_000)
);

// Average salary per department
Map<String, Double> avgSalaryByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::department,
        Collectors.averagingDouble(Employee::salary)
    ));

// Top earner per department
Map<String, Optional<Employee>> topEarnerByDept = employees.stream()
    .collect(Collectors.groupingBy(
        Employee::department,
        Collectors.maxBy(Comparator.comparingDouble(Employee::salary))
    ));

// Names of Engineering employees sorted alphabetically
List<String> engNames = employees.stream()
    .filter(e -> e.department().equals("Engineering"))
    .sorted(Comparator.comparing(Employee::name))
    .map(Employee::name)
    .collect(Collectors.toList());
```

---

## Summary

Lambdas and Streams bring functional programming patterns into Java:

- **Lambdas** — pass behavior as values; replace anonymous classes.
- **Method references** — concise shorthand for lambdas that call a single method.
- **Streams** — declarative, lazy pipelines over data.
- **Optional** — explicit null handling without NPEs.

**Key Takeaways:**
- Streams are lazy — nothing runs until a terminal operation is called.
- Intermediate operations return a new stream; chain them freely.
- Prefer `collect(Collectors.toList())` for gathering results.
- Use `Optional` for return values that may be absent — never return `null` from a method that might fail.
- Parallel streams help only for CPU-bound work on large datasets with no shared state.
