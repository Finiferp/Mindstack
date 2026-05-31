---
title: "Java Exception Handling & I/O"
sidebar_label: "Exceptions & I/O"
sidebar_position: 5
---

# Exception Handling & I/O

Robust programs don't just work in the happy path — they handle failure gracefully. Java's exception handling system gives you structured, enforced error management. Java's I/O libraries let you read and write files, parse data, and work with the filesystem.

---

## Exception Hierarchy

All throwable objects inherit from `Throwable`:

```
Throwable
├── Error          — serious JVM failures (OutOfMemoryError, StackOverflowError)
│                    — do NOT catch these normally
└── Exception
    ├── RuntimeException (unchecked) — programmer errors, no forced handling
    │   ├── NullPointerException
    │   ├── IllegalArgumentException
    │   ├── IndexOutOfBoundsException
    │   ├── ClassCastException
    │   └── ArithmeticException
    └── Checked Exceptions — must be declared or caught
        ├── IOException
        ├── SQLException
        └── ...
```

- **Checked exceptions** — the compiler forces you to handle or declare them with `throws`.
- **Unchecked exceptions** (RuntimeException subclasses) — optional to handle; usually indicate bugs.
- **Errors** — unrecoverable JVM-level problems; don't catch them.

---

## try / catch / finally

```java
try {
    // Code that might throw
    int result = 10 / 0;
    String s = null;
    s.length(); // NullPointerException
} catch (ArithmeticException e) {
    System.out.println("Math error: " + e.getMessage());
} catch (NullPointerException e) {
    System.out.println("Null reference: " + e.getMessage());
} catch (Exception e) {
    // Catch-all — catches any remaining exception types
    System.out.println("Unexpected: " + e.getMessage());
} finally {
    // Always runs — even if exception was thrown or caught
    System.out.println("Cleanup here");
}
```

### Multi-catch (Java 7+)
```java
try {
    riskyOperation();
} catch (IOException | SQLException e) {
    // Handle both the same way
    System.err.println("Data error: " + e.getMessage());
}
```

**Tips:**
- Catch the most specific exception first — order matters.
- `finally` runs even if there's a `return` inside `try` or `catch`.
- Never swallow exceptions silently (`catch (Exception e) {}`). At minimum, log them.
- Prefer specific exception types over `Exception` in catch — catching too broadly hides bugs.

---

## try-with-resources

Automatically closes `AutoCloseable` resources (files, streams, connections) even when exceptions occur. No `finally` needed.

```java
try (FileReader fr = new FileReader("data.txt");
     BufferedReader br = new BufferedReader(fr)) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    System.err.println("File error: " + e.getMessage());
}
// fr and br are automatically closed here
```

**Tips:**
- Always use try-with-resources for anything that implements `AutoCloseable` — files, DB connections, HTTP clients.
- Multiple resources are closed in reverse declaration order.
- Suppressed exceptions (thrown during close) are attached to the primary exception via `getSuppressed()`.

---

## Throwing Exceptions

```java
public double divide(double a, double b) {
    if (b == 0) {
        throw new IllegalArgumentException("Divisor cannot be zero");
    }
    return a / b;
}

// Propagating checked exceptions — declare with throws
public String readFile(String path) throws IOException {
    return Files.readString(Path.of(path));
}
```

### Custom Exceptions
```java
// Unchecked custom exception
public class InsufficientFundsException extends RuntimeException {
    private final double amount;

    public InsufficientFundsException(double amount) {
        super("Insufficient funds: needed " + amount);
        this.amount = amount;
    }

    public double getAmount() {
        return amount;
    }
}

// Checked custom exception
public class PaymentException extends Exception {
    public PaymentException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

**Tips:**
- Include context in exception messages — "File not found" is worse than "File not found: /data/config.json".
- Wrap low-level exceptions in higher-level ones to preserve abstraction: catch `SQLException`, throw `DataAccessException`.
- Pass the original exception as the `cause` so the full stack trace is preserved.
- Prefer unchecked exceptions in modern Java — checked exceptions create boilerplate and can leak implementation details.

---

## Reading and Writing Files (Modern Java NIO.2)

The `java.nio.file` package (NIO.2, Java 7+) is the modern, recommended file API.

### Reading Files
```java
import java.nio.file.Files;
import java.nio.file.Path;

Path path = Path.of("data.txt");

// Read entire file as String (small files)
String content = Files.readString(path);

// Read all lines into a List
List<String> lines = Files.readAllLines(path);

// Stream lines lazily (large files)
try (Stream<String> lineStream = Files.lines(path)) {
    lineStream
        .filter(line -> !line.isBlank())
        .forEach(System.out::println);
}

// Read as bytes
byte[] bytes = Files.readAllBytes(path);
```

### Writing Files
```java
// Write a string
Files.writeString(Path.of("output.txt"), "Hello, World!\n");

// Write lines
Files.write(Path.of("output.txt"), List.of("line 1", "line 2"));

// Append
Files.writeString(Path.of("log.txt"), "New entry\n",
    StandardOpenOption.APPEND, StandardOpenOption.CREATE);
```

### Filesystem Operations
```java
Path p = Path.of("/home/user/docs/report.txt");

// Info
Files.exists(p);
Files.isDirectory(p);
Files.isReadable(p);
Files.size(p);           // bytes
Files.getLastModifiedTime(p);

// Create
Files.createDirectory(Path.of("newdir"));
Files.createDirectories(Path.of("a/b/c")); // create parents too

// Copy / Move / Delete
Files.copy(source, target);
Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
Files.delete(path);
Files.deleteIfExists(path);

// Walk directory tree
try (Stream<Path> walk = Files.walk(Path.of("."))) {
    walk.filter(Files::isRegularFile)
        .filter(f -> f.toString().endsWith(".java"))
        .forEach(System.out::println);
}
```

**Tips:**
- Prefer NIO.2 (`java.nio.file`) over the old `java.io.File` API.
- `Files.readString()` and `Files.writeString()` (Java 11+) are the simplest for text.
- Always use try-with-resources with `Files.lines()` to close the stream and release the file handle.
- Use `Path.of("...")` (Java 11+) instead of `Paths.get("...")`.

---

## BufferedReader / BufferedWriter (Classic I/O)

For older codebases or when you need more control:

```java
// Reading
try (BufferedReader reader = new BufferedReader(new FileReader("input.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
}

// Writing
try (BufferedWriter writer = new BufferedWriter(new FileWriter("output.txt"))) {
    writer.write("Hello, World!");
    writer.newLine();
    writer.write("Second line");
}
```

**Tips:**
- Always wrap `FileReader`/`FileWriter` in `BufferedReader`/`BufferedWriter` — buffering dramatically improves performance.
- `PrintWriter` wraps `BufferedWriter` and adds `println()`, `printf()` for convenience.

---

## Serialization

Java can serialize objects to bytes and deserialize them back — useful for saving state or sending over a network.

```java
import java.io.*;

public class Config implements Serializable {
    private static final long serialVersionUID = 1L;

    private String host;
    private int port;
    private transient String password; // transient = not serialized

    // constructor, getters...
}

// Serialize
try (ObjectOutputStream oos = new ObjectOutputStream(
        new FileOutputStream("config.ser"))) {
    oos.writeObject(new Config("localhost", 8080, "secret"));
}

// Deserialize
try (ObjectInputStream ois = new ObjectInputStream(
        new FileInputStream("config.ser"))) {
    Config config = (Config) ois.readObject();
}
```

**Tips:**
- Always declare `serialVersionUID` explicitly to control version compatibility.
- Mark sensitive fields `transient` so they're not persisted.
- Java serialization is fragile for long-term storage — prefer JSON (Jackson, Gson) or Protocol Buffers for production data persistence.

---

## Summary

Exception handling and I/O are foundational for any real application:

- **try/catch/finally** — structured error handling with guaranteed cleanup.
- **try-with-resources** — automatic resource closing, the modern way.
- **Custom exceptions** — carry domain context; wrap low-level causes.
- **NIO.2 Files API** — clean, expressive file operations for the modern Java ecosystem.

**Key Takeaways:**
- Use `try-with-resources` for any `AutoCloseable` — never manage `finally {resource.close()}` manually.
- Prefer `Files.readString()` and `Files.writeString()` for simple file operations.
- Never catch exceptions silently. Always log or rethrow.
- Wrap exceptions with context: `throw new ServiceException("Failed to load config", e)`.
- Custom exception classes should extend `RuntimeException` unless callers absolutely must handle them.
