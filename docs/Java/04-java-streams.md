---
title: "Streams, Lambdas & Functional Java"
sidebar_label: "Streams & Lambdas"
sidebar_position: 4
---

# Streams, Lambdas & Functional Java

Lambda expressions and the Stream API make data processing concise and composable. Streams don't modify the source — they produce results through a pipeline of operations.

---

## Lambda Expressions

A lambda is a short block of code that takes parameters and returns a value — an anonymous function.

```java
// Syntax: (parameters) -> expression
//         (parameters) -> { statements; return value; }

// Runnable — no params, no return
Runnable r = () -> System.out.println("Hello!");
r.run();

// Single parameter (parens optional)
Consumer<String> print = s -> System.out.println(s);
Consumer<String> print2= (String s) -> System.out.println(s);  // explicit type
print.accept("Hello");

// Multiple parameters
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
add.apply(3, 5);  // 8

// Block body — multiple statements
Comparator<String> comp = (a, b) -> {
    int lenDiff = a.length() - b.length();
    return lenDiff != 0 ? lenDiff : a.compareTo(b);
};

// Capturing variables — must be effectively final
String prefix = "Hello";   // effectively final — not modified after assignment
Consumer<String> greet = name -> System.out.println(prefix + ", " + name);
// prefix = "Hi";  // would break the lambda
```

---

## Functional Interfaces

A functional interface has exactly one abstract method. `@FunctionalInterface` enforces this.

```java
// Built-in functional interfaces (java.util.function package)

// ── Supplier<T> — no input, produces T ────────────────────────────────────
Supplier<String>    hello = () -> "Hello!";
Supplier<List<String>> newList = ArrayList::new;  // method reference
hello.get();       // "Hello!"
newList.get();     // new empty ArrayList

// ── Consumer<T> — takes T, returns nothing ────────────────────────────────
Consumer<String>   print   = System.out::println;
Consumer<String>   logAndPrint = s -> { log(s); System.out.println(s); };
BiConsumer<String, Integer> showEntry = (name, age) -> System.out.println(name + ": " + age);
// Chaining consumers
Consumer<String> upper = s -> System.out.println(s.toUpperCase());
Consumer<String> both  = print.andThen(upper);
both.accept("hello");  // "hello" then "HELLO"

// ── Function<T, R> — takes T, returns R ───────────────────────────────────
Function<String, Integer>   length    = String::length;
Function<Integer, Integer>  square    = n -> n * n;
Function<String, String>    upperCase = String::toUpperCase;

// Compose functions
Function<String, Integer>  lengthOfUpper = upperCase.andThen(length);  // upper, then length
Function<String, Integer>  sameThing     = length.compose(upperCase);   // upper first, then length
// f.andThen(g) = g(f(x))
// f.compose(g) = f(g(x))

// BiFunction<T, U, R> — two inputs
BiFunction<String, String, String> concat = (a, b) -> a + b;
concat.apply("Hello, ", "World!");  // "Hello, World!"

// UnaryOperator<T> — same type in and out
UnaryOperator<String>  trim      = String::trim;
UnaryOperator<Integer> increment = n -> n + 1;
// Extends Function<T,T>

// BinaryOperator<T> — same type, two inputs, same type out
BinaryOperator<Integer> sum = Integer::sum;
BinaryOperator<String>  longer = (a, b) -> a.length() >= b.length() ? a : b;
// Extends BiFunction<T,T,T>

// ── Predicate<T> — takes T, returns boolean ────────────────────────────────
Predicate<String>  isEmpty  = String::isEmpty;
Predicate<String>  notEmpty = isEmpty.negate();
Predicate<Integer> positive = n -> n > 0;
Predicate<Integer> even     = n -> n % 2 == 0;
Predicate<Integer> posEven  = positive.and(even);   // positive AND even
Predicate<Integer> posOrEven= positive.or(even);    // positive OR even

BiPredicate<String, Integer> longerThan = (s, n) -> s.length() > n;

// ── Specialized for primitives (avoid boxing) ──────────────────────────────
IntSupplier     intSupplier     = () -> 42;
IntConsumer     intConsumer     = System.out::println;
IntFunction<String> intToString = Integer::toString;
ToIntFunction<String> strLen   = String::length;
IntUnaryOperator doubleIt       = n -> n * 2;
IntBinaryOperator add           = Integer::sum;
IntPredicate     isEven         = n -> n % 2 == 0;
// Also: Long*, Double* variants
```

### Method References

```java
// Type 1: Static method reference
Function<String, Integer> parseInt = Integer::parseInt;   // Integer.parseInt(s)
BiFunction<Integer, Integer, Integer> max = Integer::max; // Integer.max(a, b)

// Type 2: Instance method reference on a specific instance
String prefix = "Hello";
Predicate<String> startsWith = prefix::startsWith;    // "Hello".startsWith(s)

// Type 3: Instance method reference on type (instance passed as first argument)
Function<String, String> trim    = String::trim;       // s.trim()
Function<String, Integer> len    = String::length;     // s.length()
BiFunction<String, String, Boolean> contains = String::contains;  // s1.contains(s2)

// Type 4: Constructor reference
Supplier<ArrayList<String>> newList = ArrayList::new;  // new ArrayList<String>()
Function<String, StringBuilder> newSB = StringBuilder::new;  // new StringBuilder(s)
BiFunction<String, Integer, String> substr = String::substring;

// Examples in context
List<String> names = List.of("Alice", "Bob", "Carol");
names.forEach(System.out::println);                    // Type 2
names.stream().map(String::toUpperCase).toList();      // Type 3
names.stream().map(Integer::parseInt);                 // won't work on "Alice" but shows syntax
```

---

## Streams

A stream is a sequence of elements that can be processed with a pipeline of operations. Streams are:
- **Lazy**: intermediate operations build the pipeline but don't execute until a terminal operation runs
- **Non-reusable**: a stream can only be consumed once

```
Source → [Intermediate ops...] → Terminal op
                                    ↓
                                   Result
```

### Creating Streams

```java
// From collection
List<String> list = List.of("a","b","c");
Stream<String> s1 = list.stream();
Stream<String> s2 = list.parallelStream();   // parallel processing

// From array
Stream<String> s3 = Arrays.stream(new String[]{"a","b"});
IntStream nums = Arrays.stream(new int[]{1,2,3});

// Directly
Stream<String>  s4 = Stream.of("a","b","c");
Stream<Object>  s5 = Stream.empty();
Stream<String>  s6 = Stream.ofNullable(maybeNull);   // empty if null

// Infinite streams (must be limited)
Stream<Integer> naturals = Stream.iterate(0, n -> n + 1);  // 0,1,2,3,...
Stream<Integer> nats2    = Stream.iterate(0, n -> n < 100, n -> n + 1);  // with predicate (Java 9+)
Stream<Double>  randoms  = Stream.generate(Math::random);

// Range streams (primitive, efficient)
IntStream range  = IntStream.range(0, 10);        // 0,1,2,...,9
IntStream rangeCl= IntStream.rangeClosed(1, 10);  // 1,2,...,10
IntStream chars  = "hello".chars();                // IntStream of char values
LongStream longs = LongStream.rangeClosed(1L, 1_000_000L);
DoubleStream dbl = DoubleStream.of(1.1, 2.2, 3.3);

// From files
Stream<String> lines = Files.lines(Path.of("file.txt"));   // must close!
try (Stream<String> lines = Files.lines(path)) {
    lines.forEach(System.out::println);
}

// Stream builder
Stream.Builder<String> builder = Stream.builder();
builder.accept("a");
builder.add("b");   // same as accept, returns builder for chaining
Stream<String> built = builder.build();
```

### Intermediate Operations (return Stream)

```java
List<String> words = List.of("hello","world","java","streams","filter","map");

// filter — keep elements matching predicate
words.stream()
     .filter(w -> w.length() > 4)
     // "hello","world","streams","filter"

// map — transform each element
words.stream()
     .map(String::toUpperCase)
     // "HELLO","WORLD","JAVA","STREAMS","FILTER","MAP"

words.stream()
     .map(String::length)
     // 5,5,4,7,6,3 — Stream<Integer>

// mapToInt, mapToLong, mapToDouble — map to primitive stream
words.stream()
     .mapToInt(String::length)   // IntStream — avoids boxing overhead

// flatMap — flatten: each element maps to a stream, all streams combined
List<List<Integer>> nested = List.of(List.of(1,2), List.of(3,4), List.of(5));
Stream<Integer> flat = nested.stream().flatMap(Collection::stream);
// 1,2,3,4,5

// Split each word into characters
words.stream()
     .flatMap(w -> w.chars().mapToObj(c -> String.valueOf((char)c)))
     // "h","e","l","l","o","w","o","r","l","d",...

// flatMapToInt
words.stream().flatMapToInt(String::chars)  // IntStream of all chars

// distinct — remove duplicates (uses equals/hashCode)
Stream.of(1,2,2,3,3,3).distinct()   // 1,2,3

// sorted — natural order
words.stream().sorted()              // lexicographic

// sorted with Comparator
words.stream().sorted(Comparator.comparing(String::length).reversed())

// peek — side-effect without changing stream (for debugging)
words.stream()
     .peek(w -> System.out.println("Before: " + w))
     .filter(w -> w.length() > 4)
     .peek(w -> System.out.println("After:  " + w))
     .toList();

// limit — take first N elements
Stream.iterate(0, n -> n+1).limit(10)  // 0..9

// skip — skip first N elements
words.stream().skip(2)  // skip "hello","world"

// takeWhile — take while predicate true (stops at first false) Java 9+
Stream.of(1,2,3,4,5,1,2).takeWhile(n -> n < 4)  // 1,2,3

// dropWhile — skip while predicate true, then take rest  Java 9+
Stream.of(1,2,3,4,5,1,2).dropWhile(n -> n < 4)  // 4,5,1,2

// mapMulti — replace one element with multiple  Java 16+
words.stream()
     .<String>mapMulti((word, consumer) -> {
         consumer.accept(word);
         consumer.accept(word.toUpperCase());
     })
     // "hello","HELLO","world","WORLD",...
```

### Terminal Operations (consume Stream, produce result)

```java
List<String> words = List.of("hello","world","java","streams");

// forEach — consume each element
words.stream().forEach(System.out::println);
words.stream().forEachOrdered(System.out::println);  // order guaranteed (for parallel)

// count
long count = words.stream().filter(w -> w.length() > 4).count();  // 2

// findFirst, findAny
Optional<String> first = words.stream().filter(w -> w.startsWith("j")).findFirst();
Optional<String> any   = words.parallelStream().filter(w -> w.startsWith("j")).findAny();

// anyMatch, allMatch, noneMatch — short-circuit
boolean any    = words.stream().anyMatch(w -> w.length() > 6);   // true (streams)
boolean all    = words.stream().allMatch(w -> w.length() >= 4);   // true
boolean none   = words.stream().noneMatch(w -> w.contains("z")); // true

// min, max
Optional<String> shortest = words.stream().min(Comparator.comparing(String::length));
Optional<String> longest  = words.stream().max(Comparator.comparing(String::length));
Optional<Integer> minLen  = words.stream().mapToInt(String::length).boxed().min(Comparator.naturalOrder());

// reduce — fold to a single value
int sumOfLengths = words.stream()
    .mapToInt(String::length)
    .reduce(0, Integer::sum);   // identity + accumulator

Optional<String> longest2 = words.stream()
    .reduce((a, b) -> a.length() >= b.length() ? a : b);

// collect — accumulate into a container (most powerful terminal op)
// See Collectors section below

// toList (Java 16+) — shorthand for collect(Collectors.toList())
List<String> long = words.stream().filter(w -> w.length() > 4).toList();

// toArray
Object[] arr   = words.stream().toArray();
String[] arr2  = words.stream().toArray(String[]::new);

// IntStream specific
IntStream nums = IntStream.rangeClosed(1, 10);
nums.sum()          // 55
nums.count()        // 10 — streams can't be reused! use new stream each time
IntStream.rangeClosed(1,10).min()  // OptionalInt(1)
IntStream.rangeClosed(1,10).max()  // OptionalInt(10)
IntStream.rangeClosed(1,10).average()  // OptionalDouble(5.5)

IntSummaryStatistics stats = IntStream.of(1,2,3,4,5).summaryStatistics();
stats.getCount()   // 5
stats.getSum()     // 15
stats.getMin()     // 1
stats.getMax()     // 5
stats.getAverage() // 3.0
```

---

## Collectors

```java
import java.util.stream.Collectors;

List<String> words = List.of("hello","world","java","streams","filter","map","java");

// Collect to List
List<String> list   = words.stream().collect(Collectors.toList());     // mutable
List<String> list2  = words.stream().collect(Collectors.toUnmodifiableList());
List<String> list3  = words.stream().toList();                         // Java 16+

// Collect to Set
Set<String>  set    = words.stream().collect(Collectors.toSet());
Set<String>  set2   = words.stream().collect(Collectors.toUnmodifiableSet());
LinkedHashSet<String> lhs = words.stream().collect(Collectors.toCollection(LinkedHashSet::new));
TreeSet<String> ts  = words.stream().collect(Collectors.toCollection(TreeSet::new));

// Collect to Map
Map<String, Integer> map = words.stream()
    .distinct()
    .collect(Collectors.toMap(
        w -> w,          // key mapper
        String::length   // value mapper
    ));
// {hello=5, world=5, java=4, streams=7, filter=6, map=3}

// Handle duplicate keys
Map<String, Long> freq = words.stream()
    .collect(Collectors.toMap(
        w -> w,
        w -> 1L,
        Long::sum        // merge function for duplicate keys
    ));

// Specific map type
Map<String, Integer> treeMap = words.stream().distinct()
    .collect(Collectors.toMap(w -> w, String::length, (a,b)->a, TreeMap::new));

// Joining
String joined   = words.stream().collect(Collectors.joining());            // "helloworldjava..."
String joined2  = words.stream().collect(Collectors.joining(", "));        // "hello, world, java..."
String joined3  = words.stream().collect(Collectors.joining(", ", "[", "]")); // "[hello, world, ...]"

// Counting
long count = words.stream().collect(Collectors.counting());   // same as .count()

// Summing, Averaging
int totalLen = words.stream().collect(Collectors.summingInt(String::length));
double avgLen= words.stream().collect(Collectors.averagingInt(String::length));

// Statistics
IntSummaryStatistics stats = words.stream()
    .collect(Collectors.summarizingInt(String::length));

// Min, Max
Optional<String> longest = words.stream()
    .collect(Collectors.minBy(Comparator.comparing(String::length)));

// Grouping By
Map<Integer, List<String>> byLength = words.stream()
    .collect(Collectors.groupingBy(String::length));
// {3=[map], 4=[java, java], 5=[hello, world], 6=[filter], 7=[streams]}

Map<Integer, Long> countByLength = words.stream()
    .collect(Collectors.groupingBy(String::length, Collectors.counting()));
// {3=1, 4=2, 5=2, 6=1, 7=1}

Map<Integer, Set<String>> setByLength = words.stream()
    .collect(Collectors.groupingBy(String::length, Collectors.toSet()));

Map<Integer, String> joinedByLength = words.stream()
    .collect(Collectors.groupingBy(String::length, Collectors.joining(", ")));

// Nested grouping
Map<Integer, Map<Boolean, List<String>>> nested = words.stream()
    .collect(Collectors.groupingBy(
        String::length,
        Collectors.partitioningBy(w -> w.contains("a"))
    ));

// Partitioning By — special grouping into true/false
Map<Boolean, List<String>> partitioned = words.stream()
    .collect(Collectors.partitioningBy(w -> w.length() > 4));
// {true=[hello, world, streams, filter], false=[java, map, java]}

Map<Boolean, Long> countPartitioned = words.stream()
    .collect(Collectors.partitioningBy(w -> w.length() > 4, Collectors.counting()));
// {true=4, false=3}

// Teeing — collect to two collectors and merge results (Java 12+)
record MinMax(String min, String max) {}
MinMax result = words.stream()
    .collect(Collectors.teeing(
        Collectors.minBy(Comparator.naturalOrder()),
        Collectors.maxBy(Comparator.naturalOrder()),
        (min, max) -> new MinMax(min.orElse(""), max.orElse(""))
    ));

// Custom Collector
Collector<String, StringBuilder, String> toReverseString =
    Collector.of(
        StringBuilder::new,          // supplier
        (sb, s) -> sb.insert(0, s),  // accumulator (insert at beginning)
        StringBuilder::append,        // combiner (for parallel)
        StringBuilder::toString       // finisher
    );
words.stream().collect(toReverseString);
```

---

## Optional

`Optional<T>` is a container that may or may not hold a value. It makes null-handling explicit.

```java
// Creating
Optional<String> present = Optional.of("hello");          // throws if null
Optional<String> empty   = Optional.empty();
Optional<String> maybe   = Optional.ofNullable(maybeNull); // ok with null

// Checking
present.isPresent()   // true
present.isEmpty()     // false (Java 11+)
empty.isPresent()     // false

// Getting (unsafe)
present.get()         // "hello" — NoSuchElementException if empty!
present.orElse("default")           // "hello" (returns value or default)
empty.orElse("default")             // "default"
empty.orElseGet(() -> computeDefault())  // lazy — only called if empty
empty.orElseThrow()                      // throws NoSuchElementException if empty
empty.orElseThrow(() -> new IllegalStateException("No value"))

// Transforming
present.map(String::toUpperCase)           // Optional<"HELLO">
present.map(String::length)                // Optional<5>
empty.map(String::toUpperCase)             // Optional.empty()

// flatMap — when the mapper also returns Optional
Optional<String> chained = Optional.ofNullable(user)
    .flatMap(u -> Optional.ofNullable(u.getAddress()))
    .flatMap(a -> Optional.ofNullable(a.getCity()));

// filter
present.filter(s -> s.length() > 3)       // Optional<"hello">
present.filter(s -> s.length() > 10)      // Optional.empty()

// ifPresent, ifPresentOrElse
present.ifPresent(System.out::println);    // prints "hello"
present.ifPresentOrElse(
    System.out::println,                   // if present
    () -> System.out.println("empty")      // if empty
);

// or — provide alternative Optional (Java 9+)
Optional<String> fallback = empty.or(() -> Optional.of("fallback"));

// stream — Optional as a Stream (Java 9+)
present.stream()  // Stream<String> with one element
empty.stream()    // empty Stream<String>
// Useful: flatMap Optional in a stream pipeline
List<Optional<String>> optionals = ...;
optionals.stream().flatMap(Optional::stream).toList();  // only present values

// Primitive optionals
OptionalInt    optInt    = OptionalInt.of(42);
OptionalLong   optLong   = OptionalLong.empty();
OptionalDouble optDouble = OptionalDouble.of(3.14);

optInt.getAsInt()
optInt.orElse(0)
optInt.isPresent()
```

---

## Parallel Streams

```java
// parallel() or parallelStream()
long count = list.parallelStream()
    .filter(s -> s.length() > 5)
    .count();

// Use when:
// - Large data (thousands+ elements)
// - Each operation is computationally expensive and stateless
// - No shared mutable state

// AVOID parallel for:
// - Small collections (overhead exceeds benefit)
// - Operations with side effects (DB calls, file I/O)
// - Ordered operations where order matters

// forEachOrdered maintains encounter order even in parallel
list.parallelStream().forEachOrdered(System.out::println);

// Collectors that work with parallel streams
Map<Integer, List<String>> grouped = list.parallelStream()
    .collect(Collectors.groupingByConcurrent(String::length));  // concurrent version

// Benchmark: sequential vs parallel
long start = System.currentTimeMillis();
long sequential = LongStream.rangeClosed(1, 10_000_000).sum();
System.out.println("Sequential: " + (System.currentTimeMillis() - start) + "ms");

start = System.currentTimeMillis();
long parallel = LongStream.rangeClosed(1, 10_000_000).parallel().sum();
System.out.println("Parallel:   " + (System.currentTimeMillis() - start) + "ms");
```

---

## Summary

- Lambdas are anonymous functions — `(params) -> expression` or `(params) -> { statements; }`.
- Method references `Class::method` are cleaner lambdas when the function just calls an existing method.
- Stream pipelines are lazy — they only execute when a terminal operation is called.
- `filter`, `map`, `flatMap`, `sorted`, `distinct`, `limit`, `skip` are intermediate — return a Stream.
- `collect`, `forEach`, `reduce`, `count`, `findFirst`, `anyMatch` are terminal — consume the Stream.
- Use `Collectors.groupingBy` for grouping, `partitioningBy` for boolean split, `joining` for strings.
- `Optional` makes null-handling explicit — prefer `map`/`flatMap`/`orElse` over `.get()`.
- Parallel streams benefit large datasets with CPU-heavy stateless operations — test before assuming speedup.
