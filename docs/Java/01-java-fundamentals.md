---
title: "Java Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 1
---

# Java Fundamentals

Java is a statically-typed, object-oriented language designed around the principle of **write once, run anywhere**. Code compiles to bytecode that runs on the Java Virtual Machine (JVM), making it platform-independent. Java powers everything from Android apps to large-scale enterprise backends.

---

## How Java Works

Understanding the compilation and execution pipeline helps you debug issues and understand performance characteristics.

1. You write `.java` source files.
2. The Java compiler (`javac`) compiles them into `.class` bytecode files.
3. The JVM interprets (and JIT-compiles) that bytecode at runtime.

```
MyApp.java  →  javac  →  MyApp.class  →  JVM  →  Running program
```

- **Compile:** `javac MyApp.java`
- **Run:** `java MyApp`
- **JAR (packaged app):** `jar cf app.jar *.class` then `java -jar app.jar`

**Tips:**
- The JVM does garbage collection automatically — you rarely manage memory manually.
- The JIT (Just-In-Time) compiler optimizes hot code paths at runtime, so long-running Java apps get faster over time.
- Use `java -version` to check your installed JDK version.

---

## Data Types and Variables

Java has two categories of types: **primitives** and **reference types**.

### Primitive Types

| Type      | Size    | Example value     |
|-----------|---------|-------------------|
| `byte`    | 8-bit   | `127`             |
| `short`   | 16-bit  | `32000`           |
| `int`     | 32-bit  | `2_000_000`       |
| `long`    | 64-bit  | `9_000_000_000L`  |
| `float`   | 32-bit  | `3.14f`           |
| `double`  | 64-bit  | `3.14159265`      |
| `boolean` | 1-bit   | `true` / `false`  |
| `char`    | 16-bit  | `'A'`             |

```java
int age = 30;
double price = 19.99;
boolean active = true;
char grade = 'A';
long population = 8_000_000_000L;
```

### Reference Types

Everything else is a reference type — objects allocated on the heap. Variables hold a *reference* (pointer) to the object, not the object itself.

```java
String name = "Alice";      // String is a class, not a primitive
int[] scores = {90, 85, 92};
List<String> items = new ArrayList<>();
```

**Tips:**
- Use `int` by default for integers, `double` for decimals.
- Use underscores in numeric literals for readability: `1_000_000`.
- `String` is immutable — every "modification" creates a new object. Use `StringBuilder` for heavy string building.
- Reference type variables can be `null`. Primitive variables cannot.

---

## Operators

### Arithmetic
```java
int a = 10, b = 3;
int sum  = a + b;   // 13
int diff = a - b;   // 7
int prod = a * b;   // 30
int quot = a / b;   // 3  (integer division, truncates)
int rem  = a % b;   // 1  (remainder / modulo)
```

### Comparison
```java
a == b   // false — equality
a != b   // true  — not equal
a > b    // true
a < b    // false
a >= b   // true
a <= b   // false
```

### Logical
```java
true && false   // false — AND
true || false   // true  — OR
!true           // false — NOT
```

### Shorthand Assignment
```java
a += 5;    // a = a + 5
a -= 5;
a *= 2;
a /= 2;
a++;       // increment by 1
a--;       // decrement by 1
```

### Ternary Operator
```java
String result = (score >= 50) ? "Pass" : "Fail";
```

**Tips:**
- Integer division truncates toward zero: `7 / 2 == 3`, not `3.5`. Cast to `double` if you need decimals: `(double) 7 / 2`.
- `==` on objects compares *references*, not content. Use `.equals()` to compare content.
- Short-circuit evaluation: `&&` and `||` stop evaluating as soon as the result is determined.

---

## Control Flow

### if / else if / else
```java
int score = 75;

if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else if (score >= 70) {
    System.out.println("C");
} else {
    System.out.println("F");
}
```

### switch (classic)
```java
String day = "Monday";

switch (day) {
    case "Monday":
    case "Tuesday":
        System.out.println("Early week");
        break;
    case "Friday":
        System.out.println("Almost weekend");
        break;
    default:
        System.out.println("Midweek");
}
```

### switch Expression (Java 14+)
```java
String label = switch (day) {
    case "Monday", "Tuesday" -> "Early week";
    case "Friday"            -> "Almost weekend";
    default                  -> "Midweek";
};
```

**Tips:**
- Always include `break` in classic switch cases to avoid fall-through bugs.
- Prefer the arrow-style switch expression — it's safer and more concise.
- Use `switch` over long `if-else` chains when comparing the same variable against many values.

---

## Loops

### for Loop
```java
for (int i = 0; i < 5; i++) {
    System.out.println("i = " + i);
}
```

### Enhanced for Loop (for-each)
```java
int[] numbers = {1, 2, 3, 4, 5};

for (int n : numbers) {
    System.out.println(n);
}
```

### while Loop
```java
int count = 0;
while (count < 5) {
    System.out.println(count);
    count++;
}
```

### do-while Loop
```java
int n = 0;
do {
    System.out.println(n);
    n++;
} while (n < 5);
// Always executes the body at least once
```

### Loop Control
```java
for (int i = 0; i < 10; i++) {
    if (i == 3) continue;  // skip 3
    if (i == 7) break;     // stop at 7
    System.out.println(i);
}
```

**Tips:**
- Use the enhanced for-each when you don't need the index.
- `do-while` is rare but useful for input validation loops (run once, then repeat if invalid).
- Label outer loops with `outerLoop:` and use `break outerLoop` to break out of nested loops cleanly.

---

## Arrays

Arrays have a fixed size set at creation.

```java
// Declaration and initialization
int[] scores = new int[5];         // [0, 0, 0, 0, 0]
String[] names = {"Alice", "Bob"}; // shorthand

// Access and modify
scores[0] = 95;
scores[1] = 82;

// Length
System.out.println(scores.length); // 5

// Iterate
for (int i = 0; i < scores.length; i++) {
    System.out.println(scores[i]);
}

// 2D Array
int[][] matrix = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};
System.out.println(matrix[1][2]); // 6
```

**Useful `Arrays` utility methods:**
```java
import java.util.Arrays;

Arrays.sort(scores);                    // sort in-place
Arrays.fill(scores, 0);                // fill with value
int[] copy = Arrays.copyOf(scores, 3); // copy first 3 elements
System.out.println(Arrays.toString(scores)); // print nicely
```

**Tips:**
- Arrays are zero-indexed: first element is `[0]`, last is `[length - 1]`.
- Accessing out-of-bounds throws `ArrayIndexOutOfBoundsException`.
- For dynamic-size collections, use `ArrayList` instead.

---

## Methods

Methods are reusable blocks of logic defined inside a class.

```java
public class Calculator {

    // Static method — called on the class, not an instance
    public static int add(int a, int b) {
        return a + b;
    }

    // Method with no return value
    public static void printGreeting(String name) {
        System.out.println("Hello, " + name + "!");
    }

    // Overloaded method (same name, different parameters)
    public static double add(double a, double b) {
        return a + b;
    }

    public static void main(String[] args) {
        int result = add(3, 4);         // 7
        double result2 = add(1.5, 2.5); // 4.0
        printGreeting("Alice");
    }
}
```

### Varargs
```java
public static int sum(int... numbers) {
    int total = 0;
    for (int n : numbers) total += n;
    return total;
}

// Call with any number of args
sum(1, 2, 3);
sum(10, 20);
```

**Tips:**
- Java is *pass-by-value*: primitives are copied; for objects, the *reference* is copied (so you can mutate the object but not reassign the variable in the caller).
- Overloading is resolved at compile time based on argument types.
- Use meaningful names: `calculateTax(double income)` not `calc(double x)`.

---

## Strings

`String` is one of the most-used classes in Java.

```java
String s = "Hello, World!";

s.length()                  // 13
s.charAt(0)                 // 'H'
s.indexOf("World")          // 7
s.substring(7)              // "World!"
s.substring(7, 12)          // "World"
s.toUpperCase()             // "HELLO, WORLD!"
s.toLowerCase()             // "hello, world!"
s.trim()                    // removes leading/trailing whitespace
s.replace("World", "Java")  // "Hello, Java!"
s.contains("Hello")         // true
s.startsWith("Hello")       // true
s.endsWith("!")             // true
s.split(", ")               // ["Hello", "World!"]
s.isEmpty()                 // false
s.isBlank()                 // false (Java 11+, also checks whitespace)
```

### String Formatting
```java
String msg = String.format("Hello, %s! You are %d years old.", "Alice", 30);
// Java 15+: text blocks
String json = """
    {
        "name": "Alice",
        "age": 30
    }
    """;
```

### StringBuilder (mutable, efficient)
```java
StringBuilder sb = new StringBuilder();
sb.append("Hello");
sb.append(", ");
sb.append("World");
String result = sb.toString(); // "Hello, World"
```

**Tips:**
- Never compare strings with `==`; always use `.equals()` or `.equalsIgnoreCase()`.
- `String` concatenation in a loop creates many objects — use `StringBuilder`.
- `String.format()` and `printf`-style formatting are cleaner than manual concatenation for complex messages.

---

## Summary

Java fundamentals give you the building blocks for everything else:

- **Types** — primitives for performance, reference types for everything else.
- **Control flow** — `if/else`, `switch`, loops for decision-making and iteration.
- **Arrays** — fixed-size indexed collections.
- **Methods** — reusable logic units that form the core of any program.
- **Strings** — immutable text with a rich API; use `StringBuilder` when building dynamically.

**Key Takeaways:**
- Java is strongly typed — every variable has a declared type at compile time.
- `==` compares references for objects; `.equals()` compares content.
- Primitive types cannot be `null`; reference types can — always check before dereferencing.
- The JVM handles memory for you, but understanding how objects live on the heap helps you write efficient code.
