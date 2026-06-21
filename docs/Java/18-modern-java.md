---
title: "Modern Java Features"
sidebar_label: "Modern Java"
sidebar_position: 18
---

# Modern Java Features

Java has evolved significantly since version 8. This covers the key language features added from Java 9 through 21+ that make modern Java code more concise and expressive.

---

## var — Local Variable Type Inference (Java 10)

```java
var name    = "Alice";              // inferred: String
var age     = 30;                   // inferred: int
var list    = new ArrayList<String>(); // inferred: ArrayList<String>
var map     = new HashMap<String, List<Integer>>(); // inferred: HashMap<String, List<Integer>>

// In for loops
for (var i = 0; i < 10; i++) { }
for (var entry : map.entrySet()) { }

// var CANNOT be used for:
// - fields
// - method parameters
// - method return types
// - uninitialized variables: var x;  // error
// - null: var x = null;              // error — can't infer type
// - lambda without explicit target type

// Best practice: use var when the type is obvious from the right side
var users = userRepository.findAll();   // good — clear from method name
var x = compute();                       // bad — unclear what x is, prefer explicit type
```

---

## Text Blocks (Java 15)

```java
// Old way — error-prone, hard to read
String json = "{\n" +
    "  \"name\": \"Alice\",\n" +
    "  \"age\": 30\n" +
    "}";

// Text block — clean, preserves formatting
String json = """
    {
      "name": "Alice",
      "age": 30
    }
    """;

// Indentation is determined by the closing """ position
String html = """
        <html>
            <body>
                <p>Hello, World!</p>
            </body>
        </html>
        """;

// Interpolation via formatted() (Java 15+)
String name = "Alice";
int age = 30;
String message = """
    Name: %s
    Age: %d
    """.formatted(name, age);

// Escape sequences still work
String withQuotes = """
    She said "hello" to me.
    """;

// \ at end of line suppresses the newline
String noNewline = """
    This is one \
    continuous line.
    """;

// Useful for SQL, JSON, HTML in code
String query = """
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.active = true
    ORDER BY u.name
    """;
```

---

## Records (Java 16)

```java
// Immutable data carrier — auto-generates constructor, accessors, equals, hashCode, toString
public record Point(int x, int y) {}

Point p = new Point(3, 4);
p.x()        // 3 — note: x(), not getX()
p.y()        // 4
p.toString() // "Point[x=3, y=4]"
p.equals(new Point(3, 4))  // true

// Compact constructor — validation/normalization
public record Range(int min, int max) {
    public Range {   // no parameter list — implicit
        if (min > max) throw new IllegalArgumentException("min > max");
    }
}

// Custom methods
public record Money(BigDecimal amount, String currency) {
    public Money add(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("Currency mismatch");
        return new Money(amount.add(other.amount), currency);
    }
}

// Static factory methods
public record Email(String value) {
    public static Email of(String value) {
        if (!value.contains("@")) throw new IllegalArgumentException("Invalid email");
        return new Email(value);
    }
}

// Records implementing interfaces
public record Circle(double radius) implements Shape {
    public double area() { return Math.PI * radius * radius; }
}

// Generic records
public record Pair<A, B>(A first, B second) {}

// Records as DTOs (very common pattern)
public record CreateUserRequest(String name, String email) {}
public record UserResponse(Long id, String name, String email, Instant createdAt) {}
```

---

## Sealed Classes (Java 17)

Sealed classes restrict which classes can extend/implement them — enables exhaustive pattern matching.

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {}

public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}

// Exhaustive switch — compiler ENFORCES all cases are handled, no default needed!
double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t  -> 0.5 * t.base() * t.height();
        // No default needed — compiler knows these are ALL possible subtypes
    };
}

// Sealed classes (not just interfaces)
public abstract sealed class Vehicle permits Car, Truck, Motorcycle {
    protected String make;
}
public final class Car extends Vehicle { }            // final — no further extension
public non-sealed class Truck extends Vehicle { }      // non-sealed — open for extension
public sealed class Motorcycle extends Vehicle permits SportBike {}
public final class SportBike extends Motorcycle {}

// Permitted subclasses must be: final, sealed, or non-sealed (explicit choice required)

// Sealed + records = great for representing algebraic data types / Result types
public sealed interface Result<T> permits Success, Failure {}
public record Success<T>(T value) implements Result<T> {}
public record Failure<T>(String error) implements Result<T> {}

<T> String describe(Result<T> result) {
    return switch (result) {
        case Success<T> s -> "Got: " + s.value();
        case Failure<T> f -> "Error: " + f.error();
    };
}
```

---

## Pattern Matching

### instanceof Pattern Matching (Java 16)

```java
Object obj = "hello";

// Old way
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// Pattern matching — combines check and cast
if (obj instanceof String s) {
    System.out.println(s.length());   // s is already typed as String
}

// Combine with conditions
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());
}

// Negated pattern with early return
if (!(obj instanceof String s)) {
    return;
}
System.out.println(s.length());   // s is in scope here too (flow typing)
```

### switch Pattern Matching (Java 21)

```java
Object obj = 42;

String description = switch (obj) {
    case Integer i when i > 0  -> "Positive integer: " + i;
    case Integer i when i < 0  -> "Negative integer: " + i;
    case Integer i              -> "Zero";
    case String s when s.isBlank() -> "Blank string";
    case String s                   -> "String: " + s;
    case null                       -> "It's null";
    default                          -> "Something else: " + obj;
};

// Record patterns (Java 21) — destructure records directly in switch
public record Point(int x, int y) {}
public record Line(Point start, Point end) {}

String describe(Object obj) {
    return switch (obj) {
        case Point(int x, int y) when x == y -> "Diagonal point";
        case Point(int x, int y)              -> "Point at " + x + "," + y;
        case Line(Point(var x1, var y1), Point(var x2, var y2)) ->
            "Line from (" + x1 + "," + y1 + ") to (" + x2 + "," + y2 + ")";
        default -> "Unknown";
    };
}

// Nested record patterns
sealed interface Shape permits Circle, Square {}
record Circle(Point center, double radius) implements Shape {}
record Square(Point topLeft, double side) implements Shape {}

String position(Shape shape) {
    return switch (shape) {
        case Circle(Point(var x, var y), var r) -> "Circle at (%d,%d) r=%.1f".formatted(x, y, r);
        case Square(Point(var x, var y), var s)  -> "Square at (%d,%d) side=%.1f".formatted(x, y, s);
    };
}
```

---

## Switch Expressions (Java 14)

```java
// Old switch statement — verbose, fall-through prone
int numLetters;
switch (day) {
    case MONDAY:
    case FRIDAY:
    case SUNDAY:
        numLetters = 6;
        break;
    case TUESDAY:
        numLetters = 7;
        break;
    default:
        numLetters = 0;
}

// Switch expression — concise, exhaustive, no fall-through
int numLetters = switch (day) {
    case MONDAY, FRIDAY, SUNDAY -> 6;
    case TUESDAY                 -> 7;
    default                       -> 0;
};

// With yield for multi-statement blocks
int result = switch (status) {
    case ACTIVE -> 1;
    case PENDING -> {
        logPending();
        yield 0;
    }
    default -> -1;
};
```

---

## Local Classes, Lambdas, and var in Generics (Java 9-11)

```java
// Private interface methods (Java 9)
public interface Calculator {
    default int addAndDouble(int a, int b) {
        return doubleIt(add(a, b));   // calling private method
    }
    private int doubleIt(int n) { return n * 2; }  // private interface method
    int add(int a, int b);
}

// Collection factory methods (Java 9)
List<String> list = List.of("a", "b", "c");      // immutable
Set<Integer> set = Set.of(1, 2, 3);
Map<String, Integer> map = Map.of("a", 1, "b", 2);
Map<String, Integer> map2 = Map.ofEntries(
    Map.entry("a", 1),
    Map.entry("b", 2)
);

// String methods (Java 11)
" hello ".strip()           // "hello" — Unicode-aware trim
" hello ".stripLeading()    // "hello "
" hello ".stripTrailing()   // " hello"
"".isBlank()                 // true
"  ".isBlank()                // true
"hi".repeat(3)                // "hihihi"
"a\nb\nc".lines().toList()  // ["a","b","c"]

// Optional.isEmpty (Java 11)
Optional<String> opt = Optional.empty();
opt.isEmpty()    // true (cleaner than !opt.isPresent())

// Files.readString / writeString (Java 11)
String content = Files.readString(Path.of("file.txt"));
Files.writeString(Path.of("out.txt"), "content");

// var in lambda parameters (Java 11) — allows annotations on inferred types
list.stream().map((@NonNull var s) -> s.toUpperCase());
```

---

## Sequenced Collections (Java 21)

```java
// New interfaces: SequencedCollection, SequencedSet, SequencedMap
// Provide uniform first/last access across List, LinkedHashSet, etc.

List<String> list = new ArrayList<>(List.of("a", "b", "c"));
list.getFirst()         // "a"
list.getLast()          // "c"
list.addFirst("z")      // [z, a, b, c]
list.addLast("d")       // [z, a, b, c, d]
list.removeFirst()      // removes "z"
list.removeLast()       // removes "d"
list.reversed()          // view: [c, b, a] (or current order reversed)

LinkedHashSet<String> set = new LinkedHashSet<>(List.of("a", "b", "c"));
set.getFirst()           // "a"
set.getLast()            // "c"
set.reversed()            // reversed view

LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.put("a", 1);
map.put("b", 2);
map.firstEntry()         // a=1
map.lastEntry()          // b=2
map.sequencedKeySet()
map.sequencedValues()
map.sequencedEntrySet()
map.reversed()
```

---

## Virtual Threads (Java 21)

Covered in depth in the Concurrency page — summary here:

```java
// Lightweight threads managed by the JVM — millions possible
Thread.ofVirtual().start(() -> doWork());

try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 100_000).forEach(i ->
        executor.submit(() -> {
            Thread.sleep(Duration.ofMillis(100));  // cheap for virtual threads
            return fetchData(i);
        })
    );
}
// Ideal for I/O-bound workloads (HTTP calls, DB queries) with high concurrency
```

---

## Other Notable Additions

```java
// Helpful NullPointerExceptions (Java 14+) — enabled by default
// Old: Exception in thread "main" java.lang.NullPointerException
// New: Cannot invoke "String.length()" because "user.getName()" is null

// Records with generics + pattern matching combo (Java 21)
sealed interface Tree<T> permits Leaf, Node {}
record Leaf<T>() implements Tree<T> {}
record Node<T>(T value, Tree<T> left, Tree<T> right) implements Tree<T> {}

<T> int countNodes(Tree<T> tree) {
    return switch (tree) {
        case Leaf<T> l -> 0;
        case Node<T>(var v, var l, var r) -> 1 + countNodes(l) + countNodes(r);
    };
}

// Unnamed variables and patterns (Java 21 preview, finalized later)
// for (var _ : list) { count++; }   // ignore loop variable
// if (obj instanceof Point(var x, var _)) { }  // ignore part of a destructured pattern

// String Templates (preview, Java 21+, may change before finalization)
// String name = "Alice";
// String greeting = STR."Hello, \{name}!";   // preview feature syntax
```

---

## Summary

- `var` infers local variable types — use when the type is obvious, avoid when it obscures meaning.
- Text blocks (`"""`) make embedded JSON/SQL/HTML readable without escape character soup.
- Records eliminate boilerplate for immutable data classes — auto-generated equals/hashCode/toString/accessors.
- Sealed classes/interfaces + exhaustive `switch` give you compiler-checked algebraic data types.
- Record patterns in `switch` let you destructure nested data in a single expression.
- Sequenced collections (`getFirst()`, `getLast()`, `reversed()`) unify first/last-element access across `List`, `Set`, and `Map`.
- Virtual threads (Java 21+) make the thread-per-request model viable again for high-concurrency I/O-bound services.
