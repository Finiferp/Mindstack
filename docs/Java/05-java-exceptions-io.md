---
title: "Exceptions & I/O"
sidebar_label: "Exceptions & I/O"
sidebar_position: 5
---

# Exceptions & I/O

Exceptions are Java's mechanism for handling errors. The NIO.2 API (`java.nio.file`) is the modern way to work with the filesystem.

---

## Exception Hierarchy

```
Throwable
├── Error — JVM errors, don't catch (OutOfMemoryError, StackOverflowError)
└── Exception
    ├── Checked exceptions — must be declared or caught
    │   ├── IOException
    │   │   ├── FileNotFoundException
    │   │   └── EOFException
    │   ├── SQLException
    │   ├── ClassNotFoundException
    │   └── ParseException
    └── RuntimeException — unchecked, don't need to declare
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        ├── ClassCastException
        ├── IllegalArgumentException
        ├── IllegalStateException
        ├── UnsupportedOperationException
        ├── NumberFormatException
        ├── ArithmeticException
        └── ConcurrentModificationException
```

**Checked** exceptions represent recoverable conditions the caller should handle.
**Unchecked** (RuntimeException) represent programming bugs — input validation failures, null pointers, etc.

---

## try / catch / finally

```java
// Basic
try {
    int result = Integer.parseInt("abc");  // throws NumberFormatException
} catch (NumberFormatException e) {
    System.out.println("Not a number: " + e.getMessage());
}

// Multiple catch blocks — specific before general
try {
    File file = new File("data.txt");
    BufferedReader reader = new BufferedReader(new FileReader(file));
    String line = reader.readLine();
    int number = Integer.parseInt(line);
} catch (FileNotFoundException e) {
    System.err.println("File not found: " + e.getMessage());
} catch (IOException e) {
    System.err.println("I/O error: " + e.getMessage());
} catch (NumberFormatException e) {
    System.err.println("Invalid number format: " + e.getMessage());
} catch (Exception e) {
    System.err.println("Unexpected error: " + e.getMessage());
    e.printStackTrace();  // print full stack trace
} finally {
    // Runs ALWAYS — whether exception occurred or not
    System.out.println("Cleanup done");
}

// Multi-catch — handle multiple exceptions the same way
try {
    riskyOperation();
} catch (IOException | SQLException | InterruptedException e) {
    handleError(e);  // e is effectively final
}

// Re-throw (preserve original exception)
try {
    doSomething();
} catch (IOException e) {
    throw new RuntimeException("Failed to do something", e);  // e is the cause
}

// Exception info
try {
    throw new RuntimeException("test");
} catch (Exception e) {
    e.getMessage()       // "test"
    e.getLocalizedMessage() // locale-specific message
    e.getCause()         // the cause (if wrapped)
    e.getClass().getName()  // "java.lang.RuntimeException"
    e.getClass().getSimpleName() // "RuntimeException"
    e.getStackTrace()    // StackTraceElement[]
    e.printStackTrace()  // print to stderr
    e.printStackTrace(System.out)  // print to stdout
    e.toString()         // "java.lang.RuntimeException: test"
}
```

### try-with-resources

```java
// Resources implementing AutoCloseable are automatically closed
// Even if an exception occurs — close() is called in reverse order

// Single resource
try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
}  // br.close() called automatically

// Multiple resources — closed in reverse order (br2 first, then br1)
try (
    BufferedReader br1 = new BufferedReader(new FileReader("input.txt"));
    BufferedWriter bw  = new BufferedWriter(new FileWriter("output.txt"))
) {
    String line;
    while ((line = br1.readLine()) != null) {
        bw.write(line.toUpperCase());
        bw.newLine();
    }
}

// Effectively final variables (Java 9+) — can use pre-declared resources
BufferedReader reader = new BufferedReader(new FileReader("file.txt"));
try (reader) {   // no re-declaration needed
    processLines(reader);
}

// Suppressed exceptions — if both try body and close() throw,
// the body exception is primary, close() exception is suppressed
try (MyResource r = new MyResource()) {
    throw new RuntimeException("Primary");
} catch (Exception e) {
    e.getMessage();                  // "Primary"
    e.getSuppressed()[0].getMessage(); // "Close failed"
}
```

---

## Custom Exceptions

```java
// Base custom exception
public class AppException extends RuntimeException {
    private final String errorCode;
    private final int    httpStatus;

    public AppException(String message, String errorCode, int httpStatus) {
        super(message);
        this.errorCode  = errorCode;
        this.httpStatus = httpStatus;
    }

    public AppException(String message, String errorCode, int httpStatus, Throwable cause) {
        super(message, cause);
        this.errorCode  = errorCode;
        this.httpStatus = httpStatus;
    }

    public String getErrorCode()  { return errorCode; }
    public int    getHttpStatus() { return httpStatus; }
}

// Specific exceptions
public class EntityNotFoundException extends AppException {
    public EntityNotFoundException(String entity, Object id) {
        super(entity + " with id " + id + " not found", "NOT_FOUND", 404);
    }
}

public class ValidationException extends AppException {
    private final Map<String, String> fieldErrors;

    public ValidationException(Map<String, String> fieldErrors) {
        super("Validation failed", "VALIDATION_ERROR", 400);
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() { return fieldErrors; }
}

public class ConflictException extends AppException {
    public ConflictException(String message) {
        super(message, "CONFLICT", 409);
    }
}

public class UnauthorizedException extends AppException {
    public UnauthorizedException() {
        super("Authentication required", "UNAUTHORIZED", 401);
    }
}

// Checked custom exception
public class DataProcessingException extends Exception {
    public DataProcessingException(String message)                { super(message); }
    public DataProcessingException(String message, Throwable cause) { super(message, cause); }
}

// Usage
try {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("User", id));
    // ...
} catch (EntityNotFoundException e) {
    return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
}
```

---

## Declaring Exceptions

```java
// throws — declare checked exceptions
public void readFile(String path) throws IOException {
    try (BufferedReader br = new BufferedReader(new FileReader(path))) {
        br.lines().forEach(System.out::println);
    }
}

// Multiple declared exceptions
public void processData(String file) throws IOException, DataProcessingException {
    // ...
}

// You can declare RuntimeExceptions too (optional, for documentation)
public User findUser(long id) throws EntityNotFoundException {
    return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("User", id));
}
```

---

## NIO.2 — Modern File API

```java
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.io.IOException;

// ── Path ──────────────────────────────────────────────────────────────────
Path p1 = Path.of("/home/alice/docs/file.txt");  // Java 11+
Path p2 = Paths.get("/home/alice/docs/file.txt"); // older way — same thing

// Path components
p1.getFileName()        // Path("file.txt")
p1.getParent()          // Path("/home/alice/docs")
p1.getRoot()            // Path("/")
p1.getNameCount()       // 4 (home/alice/docs/file.txt = 4 segments)
p1.getName(0)           // Path("home")
p1.getName(3)           // Path("file.txt")
p1.subpath(1, 3)        // Path("alice/docs")
p1.isAbsolute()         // true
p1.toAbsolutePath()     // make relative path absolute
p1.normalize()          // remove ./ and ../
p1.toRealPath()         // resolve symlinks (requires file to exist)

// Building paths
Path dir  = Path.of("/home/alice");
Path file = dir.resolve("docs/file.txt");  // /home/alice/docs/file.txt
Path rel  = dir.relativize(file);          // docs/file.txt
Path sib  = file.resolveSibling("other.txt"); // /home/alice/docs/other.txt

// Comparing
p1.startsWith("/home")      // true
p1.endsWith("file.txt")     // true
p1.equals(p2)               // true
p1.compareTo(p2)            // 0

// ── Files class ────────────────────────────────────────────────────────────

// Checking existence
Files.exists(p1)            // true/false
Files.notExists(p1)         // true if definitely doesn't exist
Files.isReadable(p1)
Files.isWritable(p1)
Files.isExecutable(p1)
Files.isRegularFile(p1)
Files.isDirectory(p1)
Files.isSymbolicLink(p1)
Files.isHidden(p1)

// Reading
String content  = Files.readString(p1);              // Java 11+ — reads whole file
String content2 = Files.readString(p1, StandardCharsets.UTF_8);
byte[] bytes    = Files.readAllBytes(p1);
List<String> lines = Files.readAllLines(p1);         // all lines into List

// Read efficiently as stream (auto-closes)
try (Stream<String> lines = Files.lines(p1)) {
    lines.filter(l -> !l.isBlank())
         .map(String::trim)
         .forEach(System.out::println);
}

// Writing
Files.writeString(p1, "Hello, World!");              // Java 11+ — overwrite
Files.writeString(p1, "Hello", StandardOpenOption.APPEND);  // append
Files.write(p1, "Hello".getBytes());
Files.write(p1, List.of("line1", "line2"), StandardCharsets.UTF_8);

// StandardOpenOption constants
StandardOpenOption.CREATE           // create if doesn't exist (default)
StandardOpenOption.CREATE_NEW       // fail if already exists
StandardOpenOption.APPEND           // append to existing
StandardOpenOption.TRUNCATE_EXISTING// truncate to 0 on open (default with WRITE)
StandardOpenOption.WRITE            // open for writing
StandardOpenOption.READ             // open for reading
StandardOpenOption.SYNC             // sync content+metadata on write
StandardOpenOption.DSYNC            // sync only content on write
StandardOpenOption.DELETE_ON_CLOSE  // delete when closed
StandardOpenOption.SPARSE           // sparse file hint
StandardOpenOption.NOFOLLOW_LINKS   // don't follow symlinks

// Copying and moving
Files.copy(source, dest);                                  // copy file
Files.copy(source, dest, StandardCopyOption.REPLACE_EXISTING); // overwrite
Files.copy(source, dest, StandardCopyOption.COPY_ATTRIBUTES);  // copy metadata too
Files.copy(inputStream, dest);                             // from stream
Files.copy(source, outputStream);                          // to stream
Files.move(source, dest);
Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
Files.move(source, dest, StandardCopyOption.ATOMIC_MOVE); // atomic if OS supports it

// Deleting
Files.delete(p1);              // throws if doesn't exist
Files.deleteIfExists(p1);      // no exception if absent
// Recursive delete (no built-in — use walk):
try (Stream<Path> walk = Files.walk(dir)) {
    walk.sorted(Comparator.reverseOrder())  // files before dirs
        .forEach(path -> { try { Files.delete(path); } catch (IOException e) {} });
}

// Creating
Files.createFile(p1)                          // creates empty file
Files.createDirectory(dir)                    // creates one directory
Files.createDirectories(dir)                  // creates all missing parents
Files.createTempFile("prefix", ".tmp")        // temp file in system tmpdir
Files.createTempFile(dir, "prefix", ".tmp")   // temp file in specific dir
Files.createTempDirectory("myApp")            // temp directory

// Metadata
BasicFileAttributes attrs = Files.readAttributes(p1, BasicFileAttributes.class);
attrs.creationTime()         // FileTime
attrs.lastModifiedTime()     // FileTime
attrs.lastAccessTime()       // FileTime
attrs.size()                 // bytes
attrs.isRegularFile()
attrs.isDirectory()
attrs.isSymbolicLink()

Files.size(p1)               // file size in bytes
Files.getLastModifiedTime(p1)// FileTime

// Links
Files.createSymbolicLink(link, target);
Files.createLink(link, target);   // hard link
Files.readSymbolicLink(link);     // returns target Path

// ── Directory listing and walking ──────────────────────────────────────────
// List direct children (not recursive)
try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir)) {
    for (Path child : ds) {
        System.out.println(child);
    }
}

// With glob filter
try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir, "*.java")) {
    ds.forEach(System.out::println);
}

// Stream-based listing (Java 8+)
try (Stream<Path> list = Files.list(dir)) {
    list.filter(Files::isRegularFile)
        .filter(p -> p.toString().endsWith(".java"))
        .sorted()
        .forEach(System.out::println);
}

// Walk entire tree
try (Stream<Path> walk = Files.walk(dir)) {
    walk.filter(Files::isRegularFile)
        .filter(p -> p.toString().endsWith(".java"))
        .forEach(System.out::println);
}

// Walk with depth limit
try (Stream<Path> walk = Files.walk(dir, 2)) {  // max 2 levels deep
    walk.forEach(System.out::println);
}

// Walk with options
try (Stream<Path> walk = Files.walk(dir, FileVisitOption.FOLLOW_LINKS)) {
    // follow symbolic links
}

// Find (walk + predicate)
try (Stream<Path> found = Files.find(dir, 10,
        (path, attrs) -> attrs.isRegularFile() && path.toString().endsWith(".log"))) {
    found.forEach(System.out::println);
}

// ── Buffered I/O ────────────────────────────────────────────────────────────
// Buffered reader/writer (for large files)
try (BufferedReader br = Files.newBufferedReader(p1)) {
    String line;
    while ((line = br.readLine()) != null) {
        process(line);
    }
}

try (BufferedWriter bw = Files.newBufferedWriter(p1, StandardOpenOption.APPEND)) {
    bw.write("New line");
    bw.newLine();
    bw.flush();  // explicit flush (close does this too)
}

// ── Watching file system changes ────────────────────────────────────────────
WatchService watchService = FileSystems.getDefault().newWatchService();
Path watchDir = Path.of("/tmp/watch");
watchDir.register(watchService,
    StandardWatchEventKinds.ENTRY_CREATE,
    StandardWatchEventKinds.ENTRY_MODIFY,
    StandardWatchEventKinds.ENTRY_DELETE);

// Poll for events
WatchKey key;
while ((key = watchService.take()) != null) {
    for (WatchEvent<?> event : key.pollEvents()) {
        System.out.println(event.kind() + ": " + event.context());
    }
    key.reset();  // must reset to receive further events
}
```

---

## Classic I/O (java.io)

```java
// Still widely used — especially in frameworks and older code

// Byte streams
FileInputStream  fis = new FileInputStream("file.txt");
FileOutputStream fos = new FileOutputStream("out.txt");

// Character streams (handle encoding)
FileReader  fr = new FileReader("file.txt", StandardCharsets.UTF_8);
FileWriter  fw = new FileWriter("out.txt", StandardCharsets.UTF_8, true); // append=true

// Buffered wrappers (always buffer for performance)
BufferedReader br = new BufferedReader(new FileReader("file.txt"));
BufferedWriter bw = new BufferedWriter(new FileWriter("out.txt"));
PrintWriter    pw = new PrintWriter(new BufferedWriter(new FileWriter("out.txt")));
pw.println("line");    // adds newline
pw.printf("Name: %s, Age: %d%n", name, age);

// Data streams
DataOutputStream dos = new DataOutputStream(new FileOutputStream("data.bin"));
dos.writeInt(42);
dos.writeDouble(3.14);
dos.writeUTF("hello");

DataInputStream dis = new DataInputStream(new FileInputStream("data.bin"));
int i = dis.readInt();
double d = dis.readDouble();
String s = dis.readUTF();

// Scanning (input parsing)
Scanner scanner = new Scanner(System.in);
System.out.print("Enter name: ");
String name = scanner.nextLine();
System.out.print("Enter age: ");
int age = scanner.nextInt();

Scanner fileScanner = new Scanner(new File("data.txt"));
while (fileScanner.hasNextLine()) {
    String line = fileScanner.nextLine();
    // process line
}
fileScanner.close();

Scanner csvScanner = new Scanner(new File("data.csv")).useDelimiter(",");
while (csvScanner.hasNext()) {
    System.out.println(csvScanner.next().trim());
}
```

---

## Serialization

```java
import java.io.*;

// Make a class serializable
public class User implements Serializable {
    private static final long serialVersionUID = 1L;  // version control

    private String name;
    private int    age;
    private transient String password;  // transient — excluded from serialization

    // ... constructor, getters, etc.

    // Customize serialization (optional)
    private void writeObject(ObjectOutputStream out) throws IOException {
        out.defaultWriteObject();
        out.writeObject(encrypt(password));  // custom handling
    }

    private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        in.defaultReadObject();
        this.password = decrypt((String) in.readObject());
    }
}

// Serialize to file
User user = new User("Alice", 30);
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("user.ser"))) {
    oos.writeObject(user);
}

// Deserialize from file
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user.ser"))) {
    User loaded = (User) ois.readObject();
    System.out.println(loaded.getName());
}

// Serialize to byte array (in-memory)
ByteArrayOutputStream baos = new ByteArrayOutputStream();
try (ObjectOutputStream oos = new ObjectOutputStream(baos)) {
    oos.writeObject(user);
}
byte[] bytes = baos.toByteArray();

// Deserialize from byte array
try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(bytes))) {
    User loaded = (User) ois.readObject();
}
```

---

## Summary

- Checked exceptions must be caught or declared with `throws` — they represent recoverable conditions.
- `RuntimeException` subclasses are unchecked — they represent programming errors, don't force callers to handle them.
- Always use `try-with-resources` for `Closeable` objects — it's safe and concise.
- Use `Files.readString()`, `Files.writeString()`, and `Files.lines()` for modern file I/O.
- `Path.of()` + `Files` is the modern way — prefer it over `File` and classic I/O.
- Always provide a `cause` when wrapping exceptions: `throw new RuntimeException("context", cause)`.
- The `serialVersionUID` prevents incompatible deserialization when the class changes.
