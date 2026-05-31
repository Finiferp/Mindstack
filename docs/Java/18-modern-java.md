---
title: "Modern Java Features"
sidebar_label: "Modern Java"
sidebar_position: 18
---

# Modern Java Features

Java has evolved rapidly since Java 8. Each LTS release (Java 11, 17, 21) added features that change how idiomatic Java looks — sealed classes, pattern matching, records, text blocks, and virtual threads. These aren't novelties; they actively reduce boilerplate and make code safer.

---

## Text Blocks (Java 15)

Text blocks are multi-line string literals that preserve formatting without escape sequences.

```java
// Before text blocks
String json = "{\n" +
              "    \"name\": \"Alice\",\n" +
              "    \"age\": 30\n" +
              "}";

String sql = "SELECT u.name, u.email\n" +
             "FROM users u\n" +
             "WHERE u.active = true\n" +
             "ORDER BY u.name";

// With text blocks (Java 15+)
String json = """
    {
        "name": "Alice",
        "age": 30
    }
    """;

String sql = """
    SELECT u.name, u.email
    FROM users u
    WHERE u.active = true
    ORDER BY u.name
    """;

String html = """
    <html>
        <body>
            <h1>Hello, %s!</h1>
        </body>
    </html>
    """.formatted("Alice");
```

**Tips:**
- Indentation is stripped up to the least-indented line. The closing `"""` controls the baseline indentation.
- Use `.formatted(args)` on text blocks for interpolation — cleaner than `String.format()`.
- Text blocks work perfectly for embedding SQL, JSON, HTML, and YAML in tests or configuration.

---

## Records (Java 16)

Records are immutable data carriers. The compiler auto-generates constructor, accessors, `equals()`, `hashCode()`, and `toString()`.

```java
// Replaces 30+ lines of boilerplate
public record Point(int x, int y) {}

// With validation (compact constructor)
public record Product(String name, BigDecimal price, int stock) {
    public Product {
        Objects.requireNonNull(name, "name cannot be null");
        if (price.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("price cannot be negative");
        if (stock < 0) throw new IllegalArgumentException("stock cannot be negative");
    }
}

// With custom methods
public record Money(BigDecimal amount, String currency) {

    // Static factory
    public static Money of(double amount, String currency) {
        return new Money(BigDecimal.valueOf(amount), currency);
    }

    // Derived value
    public Money add(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("Currency mismatch");
        return new Money(amount.add(other.amount), currency);
    }

    public boolean isPositive() {
        return amount.compareTo(BigDecimal.ZERO) > 0;
    }
}

// Records are great for API DTOs
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email,
    @Size(min = 8) String password
) {}

public record UserResponse(Long id, String name, String email, LocalDateTime createdAt) {}
```

```java
Point p1 = new Point(3, 4);
Point p2 = new Point(3, 4);

p1.x();          // 3 — accessor (not getX())
p1.equals(p2);   // true — value equality
p1.toString();   // "Point[x=3, y=4]"
```

---

## Sealed Classes (Java 17)

Sealed classes restrict which classes can extend or implement them. They're the foundation of algebraic data types in Java.

```java
// Only these three classes can implement Shape
public sealed interface Shape permits Circle, Rectangle, Triangle {}

public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}
```

```java
// Pattern matching switch knows it's exhaustive
double area = switch (shape) {
    case Circle c       -> Math.PI * c.radius() * c.radius();
    case Rectangle r    -> r.width() * r.height();
    case Triangle t     -> 0.5 * t.base() * t.height();
    // No default needed — compiler knows all cases are covered
};
```

```java
// Real-world: result type (like Rust's Result)
public sealed interface ApiResult<T> permits ApiResult.Success, ApiResult.Error {}

public record Success<T>(T data) implements ApiResult<T> {}
public record Error<T>(String code, String message) implements ApiResult<T> {}

// Caller handles all cases
ApiResult<User> result = userService.findUser(id);
String response = switch (result) {
    case Success<User> s -> "Found: " + s.data().getName();
    case Error<User> e   -> "Error " + e.code() + ": " + e.message();
};
```

---

## Pattern Matching (Java 16–21)

### instanceof Pattern Matching (Java 16)

```java
// Before
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.toUpperCase());
}

// With pattern matching
if (obj instanceof String s) {
    System.out.println(s.toUpperCase()); // s is already typed String
}

// With guard
if (obj instanceof String s && s.length() > 5) {
    System.out.println("Long string: " + s);
}
```

### Switch Pattern Matching (Java 21)

```java
// Pattern matching in switch — handles any type
Object obj = getValue();

String description = switch (obj) {
    case Integer i    -> "Integer: " + i;
    case Long l       -> "Long: " + l;
    case String s     -> "String: " + s;
    case int[] arr    -> "int array of length " + arr.length;
    case null         -> "null value";
    default           -> "Unknown: " + obj.getClass().getSimpleName();
};
```

```java
// Guard patterns
String classify = switch (number) {
    case Integer i when i < 0   -> "Negative";
    case Integer i when i == 0  -> "Zero";
    case Integer i when i > 0   -> "Positive";
    default                      -> "Not an integer";
};
```

---

## Virtual Threads (Java 21)

Virtual threads are JVM-managed, lightweight threads. You can create millions of them; each one takes only a few hundred bytes.

```java
// Create a virtual thread
Thread.ofVirtual().start(() -> {
    System.out.println("Virtual thread: " + Thread.currentThread().isVirtual());
});

// Executor backed by virtual threads
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = IntStream.range(0, 10_000)
        .mapToObj(i -> executor.submit(() -> fetchData(i)))
        .toList();

    futures.forEach(f -> {
        try { System.out.println(f.get()); }
        catch (Exception e) { e.printStackTrace(); }
    });
}
// try-with-resources calls shutdown() and awaitTermination() automatically
```

### In Spring Boot (3.2+)

```yaml
spring:
  threads:
    virtual:
      enabled: true    # Tomcat uses virtual threads for request handling
```

This single config line turns your Spring Boot app into a highly concurrent server — each HTTP request runs on a virtual thread instead of a platform thread. You get the scalability of reactive without rewriting your blocking code.

**Tips:**
- Don't pool virtual threads — they're designed to be created per task.
- Virtual threads shine for I/O-bound code (DB queries, HTTP calls, file reads).
- Use `ReentrantLock` instead of `synchronized` in virtual-thread-heavy code to avoid pinning.

---

## SequencedCollection (Java 21)

A new interface added to the collections hierarchy that provides consistent first/last access.

```java
// Works on List, Deque, LinkedHashSet, etc.
SequencedCollection<String> list = new ArrayList<>(List.of("a", "b", "c"));

list.getFirst();         // "a"
list.getLast();          // "c"
list.addFirst("z");      // ["z", "a", "b", "c"]
list.addLast("x");       // ["z", "a", "b", "c", "x"]
list.removeFirst();      // removes and returns "z"
list.removeLast();       // removes and returns "x"
list.reversed();         // reversed view — ["c", "b", "a"]
```

---

## String Methods (Java 11–15)

```java
String s = "  Hello, World!  ";

s.strip();            // trim() but Unicode-aware: "Hello, World!"
s.stripLeading();     // "Hello, World!  "
s.stripTrailing();    // "  Hello, World!"
s.isBlank();          // false (isEmpty() checks length, isBlank() checks whitespace too)
"   ".isBlank();      // true

"line1\nline2\nline3".lines()  // Stream<String> — ["line1", "line2", "line3"]
    .forEach(System.out::println);

"hello".repeat(3);    // "hellohellohello"

// String.formatted (Java 15) — instance method version of String.format
"Hello, %s! You are %d.".formatted("Alice", 30); // "Hello, Alice! You are 30."
```

---

## var — Local Variable Type Inference (Java 10)

`var` lets the compiler infer the type of local variables. It's just syntax sugar — the type is still static.

```java
// Instead of:
Map<String, List<Integer>> map = new HashMap<String, List<Integer>>();
// Use:
var map = new HashMap<String, List<Integer>>();

// Works in for-each
var names = List.of("Alice", "Bob", "Charlie");
for (var name : names) {
    System.out.println(name.toUpperCase());
}

// Works with try-with-resources
try (var reader = new BufferedReader(new FileReader("file.txt"))) {
    var line = reader.readLine();
}

// Don't use when it hurts readability
var x = compute();  // bad — what type is x?
User user = compute();  // better — type is obvious
```

**Tips:**
- Use `var` when the type is obvious from the right-hand side (`new ArrayList<>()`, `List.of(...)`).
- Avoid `var` for method return values where the type isn't immediately clear.
- `var` only works for local variables — not fields, method parameters, or return types.

---

## Helpful NullPointerExceptions (Java 14+)

Since Java 14, NPE messages tell you exactly which variable was null:

```
Cannot invoke "String.length()" because "user.address.city" is null
```

Instead of the old:
```
java.lang.NullPointerException
```

Enable with: `-XX:+ShowCodeDetailsInExceptionMessages` (default on from Java 17).

---

## Future: Project Loom, Valhalla, Panama

- **Project Loom** (delivered in Java 21) — virtual threads. Also bringing structured concurrency.
- **Project Valhalla** (in progress) — value types (inline classes) for better memory efficiency with small objects.
- **Project Panama** (Java 22+) — Foreign Function & Memory API to replace JNI for calling native code.

---

## Summary

Modern Java (17–21) is a significantly more expressive language than Java 8:

- **Text blocks** — readable multi-line strings without escape sequences.
- **Records** — concise immutable data classes with zero boilerplate.
- **Sealed classes** — controlled type hierarchies, exhaustive switch expressions.
- **Pattern matching** — cleaner `instanceof` checks and powerful `switch` expressions.
- **Virtual threads** — write simple blocking code, get reactive-scale concurrency.
- **var** — type inference for cleaner local variable declarations.

**Key Takeaways:**
- Use records for DTOs, value objects, and any data-only class — they replace 30+ lines of boilerplate.
- Sealed classes + pattern matching switches are the Java way to model sum types (like Rust's `Result<T, E>` or Haskell's `Either`).
- Enable virtual threads in Spring Boot 3.2+ with a single config line — massive concurrency improvement for free.
- Target Java 21 (LTS) for new projects — it has all modern features and long-term support.
