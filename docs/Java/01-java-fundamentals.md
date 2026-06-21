---
title: "Java Fundamentals"
sidebar_label: "Fundamentals"
sidebar_position: 1
---

# Java Fundamentals

Java is a statically typed, object-oriented, compiled-to-bytecode language. Every value has a fixed type known at compile time. Programs compile to `.class` bytecode files and run on the JVM, making Java platform-independent.

---

## Running Java

```bash
# Compile and run
javac Hello.java          # produces Hello.class
java Hello                # run

# Single-file shortcut (Java 11+)
java Hello.java

# With classpath
javac -cp lib/*.jar src/**/*.java -d out/
java -cp out:lib/*.jar com.example.Main

# Check version
java --version
javac --version
```

---

## Data Types

### Primitive Types

Java has 8 built-in primitive types. They are stored by value, not by reference.

```java
// Integer types
byte    b = 127;                // 8-bit  signed: -128 to 127
short   s = 32767;              // 16-bit signed: -32,768 to 32,767
int     i = 2147483647;         // 32-bit signed: -2^31 to 2^31-1
long    l = 9223372036854775807L; // 64-bit signed: -2^63 to 2^63-1 — note L suffix

// Floating point
float   f = 3.14f;              // 32-bit IEEE 754 — note f suffix
double  d = 3.14159265358979;   // 64-bit IEEE 754 (default for decimals)

// Other
char    c = 'A';                // 16-bit Unicode character: 0 to 65,535
boolean flag = true;            // true or false — NOT 1/0

// Default values (for class fields, not local variables)
// int → 0, double → 0.0, boolean → false, char → '\u0000', references → null
```

### Literals

```java
// Integer literals
int decimal     = 42;
int hex         = 0xFF;          // 255
int octal       = 017;           // 15
int binary      = 0b1010;        // 10  (Java 7+)
long big        = 100_000_000L;  // underscore separators for readability (Java 7+)

// Floating point literals
double d        = 3.14;
double sci      = 1.5e10;        // 1.5 × 10^10
float  f        = 3.14f;

// Character literals
char a          = 'A';
char newline    = '\n';
char tab        = '\t';
char backslash  = '\\';
char unicode    = '\u0041';      // 'A'

// String literals
String s        = "Hello";
String multi    = """
                  Line 1
                  Line 2
                  """;           // text block (Java 15+)
```

### Wrapper Classes

Every primitive has a corresponding wrapper class in `java.lang`. They're needed for generics, collections, and null-able values.

```java
Integer  i = Integer.valueOf(42);    // preferred — may cache
Integer  j = 42;                     // autoboxing — auto-wraps
int      k = j;                      // unboxing — auto-unwraps

// Integer methods
Integer.MAX_VALUE             // 2147483647
Integer.MIN_VALUE             // -2147483648
Integer.parseInt("42")        // 42 (String → int)
Integer.parseInt("FF", 16)    // 255 (hex)
Integer.toBinaryString(10)    // "1010"
Integer.toHexString(255)      // "ff"
Integer.toOctalString(8)      // "10"
Integer.compare(3, 5)         // -1 (like Comparator)
Integer.max(3, 5)             // 5
Integer.min(3, 5)             // 3
Integer.sum(3, 5)             // 8
Integer.bitCount(7)           // 3 (number of 1-bits)
Integer.reverse(1)            // reverses bit order
Integer.highestOneBit(10)     // 8
Integer.numberOfLeadingZeros(1) // 31
Integer.signum(-5)            // -1

// Double methods
Double.parseDouble("3.14")
Double.isNaN(Double.NaN)      // true
Double.isInfinite(1.0 / 0)    // true
Double.MAX_VALUE
Double.MIN_VALUE

// Long methods
Long.parseLong("100000000000")
Long.MAX_VALUE                 // 9223372036854775807

// Character methods
Character.isLetter('A')       // true
Character.isDigit('5')        // true
Character.isLetterOrDigit('a')// true
Character.isWhitespace(' ')   // true
Character.isUpperCase('A')    // true
Character.isLowerCase('a')    // true
Character.toUpperCase('a')    // 'A'
Character.toLowerCase('A')    // 'a'
Character.isAlphabetic('A')   // true
Character.getNumericValue('9')// 9
Character.getType('A')        // Character.UPPERCASE_LETTER

// Boolean methods
Boolean.parseBoolean("true")  // true
Boolean.parseBoolean("TRUE")  // true
Boolean.parseBoolean("yes")   // false (only "true" works)
Boolean.toString(true)        // "true"

// Autoboxing caching caveat
Integer a = 127;
Integer b = 127;
System.out.println(a == b);   // true  (cached: -128 to 127)
Integer c = 128;
Integer d = 128;
System.out.println(c == d);   // false (new objects outside cache range)
System.out.println(c.equals(d)); // true — always use .equals() for wrapper comparison
```

---

## Variables and Scope

```java
public class Example {
    // Class field (instance variable) — has default value
    private int instanceVar = 0;

    // Static field — shared across all instances
    private static int staticVar = 0;

    // Constants
    private static final int MAX = 100;
    public  static final String VERSION = "1.0";

    public void method() {
        // Local variable — must initialize before use, no default
        int localVar = 42;

        // var — type inferred (Java 10+)
        var list = new ArrayList<String>();   // inferred as ArrayList<String>
        var name = "Alice";                   // inferred as String
        // var cannot be used for fields, method parameters, or return types

        // Block scope
        {
            int blockVar = 5;
            System.out.println(blockVar);  // ok
        }
        // blockVar — not accessible here

        for (int i = 0; i < 10; i++) {
            // i is scoped to the for loop
        }
        // i — not accessible here
    }
}
```

---

## Operators

### Arithmetic

```java
int a = 10, b = 3;

a + b     // 13 — addition
a - b     // 7  — subtraction
a * b     // 30 — multiplication
a / b     // 3  — integer division (truncates towards zero)
a % b     // 1  — remainder (sign follows dividend: -10 % 3 = -1)

// Division with doubles
10.0 / 3    // 3.3333...
10 / 3.0    // 3.3333...
(double) 10 / 3  // cast to double first

// Integer overflow wraps around (no exception)
Integer.MAX_VALUE + 1  // -2147483648 (wraps)
// Use Math.addExact(a, b) to throw on overflow

// Increment / Decrement
a++   // post-increment: use a then increment
++a   // pre-increment: increment then use a
a--   // post-decrement
--a   // pre-decrement

// Compound assignment
a += 5;   // a = a + 5
a -= 3;   // a = a - 3
a *= 2;   // a = a * 2
a /= 4;   // a = a / 4
a %= 3;   // a = a % 3
```

### Comparison

```java
a == b      // equal (primitives: value, references: same object)
a != b      // not equal
a > b       // greater than
a < b       // less than
a >= b      // greater than or equal
a <= b      // less than or equal

// For objects: NEVER use == for equality comparison
String s1 = new String("hello");
String s2 = new String("hello");
s1 == s2           // false — different objects
s1.equals(s2)      // true  — same content

// String literals are interned
String s3 = "hello";
String s4 = "hello";
s3 == s4           // true  — same interned object (implementation detail, don't rely on it)
```

### Logical

```java
boolean x = true, y = false;

x && y      // false — AND (short-circuit: if x is false, y not evaluated)
x || y      // true  — OR  (short-circuit: if x is true,  y not evaluated)
!x          // false — NOT

// Non-short-circuit (always evaluates both sides — rare use case)
x & y       // AND
x | y       // OR
x ^ y       // XOR (exclusive OR)

// Ternary operator
int max = (a > b) ? a : b;
String label = (age >= 18) ? "Adult" : "Minor";
```

### Bitwise

```java
// Work on individual bits of integer types
int a = 0b1010;  // 10
int b = 0b1100;  // 12

a & b     // 0b1000 = 8  — AND: bits set in both
a | b     // 0b1110 = 14 — OR:  bits set in either
a ^ b     // 0b0110 = 6  — XOR: bits set in one but not both
~a        // -11          — NOT: flips all bits

a << 2    // 0b101000 = 40 — left shift (multiply by 2^n)
a >> 1    // 0b0101  = 5  — right shift, sign-extends (divide by 2^n)
a >>> 1   // 0b0101  = 5  — unsigned right shift, fills with 0s

// Common bit tricks
(n & 1) == 0        // is n even?
(n & (n-1)) == 0    // is n a power of 2?
n | 0x20            // convert uppercase ASCII to lowercase
n & ~0x20           // convert lowercase ASCII to uppercase
```

### instanceof

```java
Object obj = "hello";
if (obj instanceof String) {
    String s = (String) obj;   // old style: separate cast
    System.out.println(s.length());
}

// Pattern matching instanceof (Java 16+)
if (obj instanceof String s) {
    System.out.println(s.length());  // s is already cast
}
if (obj instanceof String s && s.length() > 3) {
    System.out.println(s.toUpperCase());
}

// Negation pattern
if (!(obj instanceof String s)) {
    throw new IllegalArgumentException("Expected String");
}
System.out.println(s.length());  // s in scope here too
```

---

## Strings

Strings in Java are immutable objects. Every modification creates a new String.

```java
// Creation
String s1 = "Hello";             // string literal (interned)
String s2 = new String("Hello"); // new object (avoid unless needed)
String s3 = String.valueOf(42);  // "42"
String s4 = String.valueOf(3.14);// "3.14"
String s5 = String.valueOf(true);// "true"
String s6 = String.valueOf('A'); // "A"
char[] chars = {'H','i'};
String s7 = new String(chars);   // "Hi"

// String.format
String formatted = String.format("Hello, %s! You are %d years old.", name, age);
String formatted2 = "Pi is %.2f".formatted(Math.PI);  // Java 15+ instance method

// Formatted specifiers
// %s  — String (calls toString())
// %d  — decimal integer
// %f  — floating point (default 6 decimal places)
// %.2f— floating point with 2 decimal places
// %e  — scientific notation
// %n  — newline (platform-independent)
// %b  — boolean
// %c  — char
// %x  — hexadecimal (lowercase)
// %X  — hexadecimal (uppercase)
// %o  — octal
// %10s — right-aligned in width 10
// %-10s— left-aligned in width 10
// %010d— zero-padded to width 10

// Length and access
s1.length()           // 5
s1.charAt(0)          // 'H'
s1.charAt(4)          // 'o'
s1.isEmpty()          // false (length == 0)
s1.isBlank()          // false (Java 11+: true if empty or whitespace only)
```

### String Methods

```java
String s = "Hello, World!";

// Searching
s.indexOf("o")              // 4   — first occurrence, -1 if not found
s.indexOf("o", 5)           // 8   — start from index 5
s.lastIndexOf("o")          // 8   — last occurrence
s.contains("World")         // true
s.startsWith("Hello")       // true
s.startsWith("World", 7)    // true — with offset
s.endsWith("!")             // true

// Extracting
s.substring(7)              // "World!"
s.substring(7, 12)          // "World" — (start, endExclusive)

// Case
s.toUpperCase()             // "HELLO, WORLD!"
s.toLowerCase()             // "hello, world!"
s.toUpperCase(Locale.ROOT)  // locale-safe uppercase

// Trimming
"  hello  ".trim()          // "hello" — removes leading/trailing whitespace
"  hello  ".strip()         // "hello" — Java 11+, Unicode-aware
"  hello  ".stripLeading()  // "hello  "
"  hello  ".stripTrailing() // "  hello"

// Replacing
s.replace('l', 'r')         // "Herro, Worrd!" — char replacement
s.replace("World", "Java")  // "Hello, Java!" — substring replacement
s.replaceAll("[aeiou]", "*")// "H*ll*, W*rld!" — regex replacement
s.replaceFirst("[A-Z]", "#")// "#ello, World!" — first regex match

// Splitting
"a,b,c".split(",")          // ["a","b","c"]
"a,b,c".split(",", 2)       // ["a","b,c"] — limit 2 parts
"one  two  three".split("\\s+") // ["one","two","three"]

// Joining (static)
String.join(", ", "a", "b", "c")      // "a, b, c"
String.join("-", List.of("x","y","z")) // "x-y-z"

// Comparing
s.equals("Hello, World!")      // true — case-sensitive
s.equalsIgnoreCase("hello, world!") // true
s.compareTo("Hello")           // positive (s comes after)
s.compareToIgnoreCase("HELLO, WORLD!") // 0

// Checking
s.matches("[A-Za-z ,!]+")    // true — full string regex match
s.chars()                     // IntStream of char values

// Other
s.intern()                   // return canonical interned instance
s.concat(" More")            // "Hello, World! More"
s.repeat(2)                  // Java 11+: "Hello, World!Hello, World!"
s.chars().filter(Character::isUpperCase).count() // count uppercase chars
String.valueOf(42)           // "42"
s.toCharArray()              // ['H','e','l','l','o',',','W','o','r','l','d','!']
```

### StringBuilder and StringBuffer

Use `StringBuilder` for building strings in loops — it's mutable and avoids creating many intermediate String objects. `StringBuffer` is the same but thread-safe (and slower).

```java
// StringBuilder — mutable, not thread-safe (use in single-threaded context)
StringBuilder sb = new StringBuilder();
sb.append("Hello");
sb.append(", ");
sb.append("World");
sb.append("!");
String result = sb.toString();   // "Hello, World!"

// Chaining
String s = new StringBuilder()
    .append("Hello")
    .append(", ")
    .append("World")
    .toString();

// Other methods
StringBuilder sb = new StringBuilder("Hello, World!");
sb.length()                     // 13
sb.charAt(0)                    // 'H'
sb.setCharAt(0, 'h');           // "hello, World!"
sb.insert(5, "!!!")             // "hello!!!, World!"
sb.delete(5, 8)                 // "hello, World!"  (start, endExclusive)
sb.deleteCharAt(5)              // "hello World!"
sb.replace(6, 11, "Java")       // "hello Java!"
sb.reverse()                    // "!avaJ olleh"
sb.indexOf("Java")              // 6
sb.lastIndexOf("l")             // find from end
sb.capacity()                   // underlying char array size (default 16)
sb.ensureCapacity(100)          // pre-allocate
sb.trimToSize()                 // minimize capacity

// StringBuilder vs + operator
// String s = "a" + "b" + "c";  — compiler may optimize small cases
// In loops, always use StringBuilder:
StringBuilder sb = new StringBuilder();
for (String word : words) {
    sb.append(word).append(" ");
}
// NOT: String result = ""; for (...) result += word;  — creates N strings
```

---

## Control Flow

### if / else

```java
if (score >= 90) {
    grade = "A";
} else if (score >= 80) {
    grade = "B";
} else if (score >= 70) {
    grade = "C";
} else {
    grade = "F";
}

// Ternary
String label = active ? "Active" : "Inactive";

// Null check pattern
if (user != null && user.getEmail() != null) {
    sendEmail(user.getEmail());
}
```

### switch Statement

```java
// Classic switch (falls through unless break)
switch (day) {
    case "MONDAY":
    case "TUESDAY":
        System.out.println("Early week");
        break;
    case "FRIDAY":
        System.out.println("End of week");
        break;
    default:
        System.out.println("Middle of week");
}

// switch Expression (Java 14+) — exhaustive, no fall-through
String result = switch (day) {
    case "MONDAY", "TUESDAY" -> "Early week";
    case "WEDNESDAY"          -> "Midweek";
    case "THURSDAY", "FRIDAY"-> "Late week";
    default                   -> "Weekend";
};

// switch with yield (for multi-line cases)
int val = switch (status) {
    case "active"   -> 1;
    case "inactive" -> 0;
    case "pending"  -> {
        logWarning("Pending status found");
        yield -1;   // yield returns a value from the block
    }
    default -> throw new IllegalArgumentException("Unknown: " + status);
};

// Pattern matching switch (Java 21)
Object obj = ...;
String description = switch (obj) {
    case Integer i -> "Integer: " + i;
    case String s  -> "String: " + s;
    case null      -> "null value";
    default        -> "Other: " + obj;
};

// Guarded patterns
String result2 = switch (obj) {
    case Integer i when i > 0  -> "Positive: " + i;
    case Integer i when i < 0  -> "Negative: " + i;
    case Integer i              -> "Zero";
    default                     -> "Not integer";
};
```

### Loops

```java
// for loop
for (int i = 0; i < 10; i++) {
    if (i == 5) continue;  // skip to next iteration
    if (i == 8) break;     // exit loop
    System.out.println(i);  // 0,1,2,3,4,6,7
}

// Nested loops with labels
outer:
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        if (i == 1 && j == 1) break outer;   // break outer loop
        if (j == 2) continue outer;           // continue outer loop
        System.out.println(i + "," + j);
    }
}

// while loop
int i = 0;
while (i < 10) {
    System.out.println(i);
    i++;
}

// do-while — runs at least once
int n;
do {
    n = scanner.nextInt();
} while (n < 0);  // repeat until positive

// Enhanced for (for-each)
int[] numbers = {1, 2, 3, 4, 5};
for (int num : numbers) {
    System.out.println(num);
}

List<String> names = List.of("Alice", "Bob", "Carol");
for (String name : names) {
    System.out.println(name);
}
```

---

## Arrays

```java
// Declaration and initialization
int[] nums = new int[5];              // [0, 0, 0, 0, 0] — default values
int[] nums = {1, 2, 3, 4, 5};        // array literal
int[] nums = new int[]{1, 2, 3};     // explicit new

String[] names = new String[3];       // [null, null, null]
String[] names = {"Alice", "Bob", "Carol"};

// Access
nums[0]              // 1 — first element
nums[nums.length - 1]// 5 — last element
nums.length          // 5 — field (not method!)

// Multidimensional
int[][] matrix = new int[3][4];       // 3 rows, 4 columns
int[][] matrix = {{1,2,3},{4,5,6}};  // initialized
int[][][] cube = new int[2][3][4];

matrix[0][1] = 42;   // row 0, column 1
matrix.length        // 3 — number of rows
matrix[0].length     // 4 — number of columns

// Jagged arrays (rows can have different lengths)
int[][] jagged = new int[3][];
jagged[0] = new int[2];
jagged[1] = new int[4];
jagged[2] = new int[1];

// java.util.Arrays utility
import java.util.Arrays;

Arrays.sort(nums)                    // sort in-place (ascending)
Arrays.sort(nums, 2, 5)             // sort range [2,5)
Arrays.sort(names, String::compareToIgnoreCase) // sort with comparator
Arrays.binarySearch(nums, 3)        // binary search (must be sorted!) → index or negative
Arrays.fill(nums, 0)                // fill all with 0
Arrays.fill(nums, 1, 4, 99)        // fill range [1,4) with 99
Arrays.copyOf(nums, 3)             // copy first 3 elements → new array
Arrays.copyOfRange(nums, 1, 4)    // copy range [1,4) → [2,3,4]
Arrays.equals(nums, other)         // deep equality check
Arrays.deepEquals(matrix, other)   // for multidimensional
Arrays.toString(nums)              // "[1, 2, 3, 4, 5]"
Arrays.deepToString(matrix)        // "[[1,2,3],[4,5,6]]"
Arrays.stream(nums)                // IntStream from array
Arrays.asList("a","b","c")         // List<String> (fixed size)

// Copy arrays
int[] copy = Arrays.copyOf(nums, nums.length);
int[] copy2 = nums.clone();  // also works
System.arraycopy(source, srcPos, dest, destPos, length); // fastest for bulk copy
```

---

## Methods

```java
public class Calculator {

    // Instance method
    public int add(int a, int b) {
        return a + b;
    }

    // Static method — called on class, not instance
    public static double square(double n) {
        return n * n;
    }

    // Method overloading — same name, different parameter list
    public int multiply(int a, int b)         { return a * b; }
    public double multiply(double a, double b){ return a * b; }
    public int multiply(int a, int b, int c)  { return a * b * c; }

    // Varargs — variable number of arguments (must be last parameter)
    public int sum(int... numbers) {
        int total = 0;
        for (int n : numbers) total += n;
        return total;
    }
    // sum()           → 0
    // sum(1, 2, 3)    → 6
    // sum(new int[]{1,2,3}) — can also pass an array

    // Return multiple values — use array, List, or a record/class
    public int[] minMax(int[] arr) {
        int min = arr[0], max = arr[0];
        for (int n : arr) { if (n < min) min = n; if (n > max) max = n; }
        return new int[]{min, max};
    }
}

// Calling methods
Calculator calc = new Calculator();
calc.add(3, 5);               // instance method
Calculator.square(4.0);        // static method
calc.sum(1, 2, 3, 4, 5);      // varargs
int[] result = calc.minMax(new int[]{3,1,4,1,5});
```

### Pass by Value

```java
// Java is ALWAYS pass by value — primitives copy the value, objects copy the reference
void modifyPrimitive(int x) {
    x = 99;  // only changes local copy
}

void modifyObject(int[] arr) {
    arr[0] = 99;  // modifies the actual array (same reference)
}

void replaceObject(int[] arr) {
    arr = new int[]{1,2,3};  // only changes local copy of reference
}

int n = 5;
modifyPrimitive(n);   // n is still 5

int[] a = {1,2,3};
modifyObject(a);      // a[0] is now 99
replaceObject(a);     // a is still the same array
```

---

## Math Class

```java
import java.lang.Math;  // auto-imported

Math.abs(-5)            // 5     — absolute value
Math.max(3, 7)          // 7
Math.min(3, 7)          // 3
Math.pow(2, 10)         // 1024.0
Math.sqrt(16)           // 4.0
Math.cbrt(27)           // 3.0   — cube root
Math.ceil(4.3)          // 5.0   — round up
Math.floor(4.7)         // 4.0   — round down
Math.round(4.5)         // 5L    — round to nearest (returns long)
Math.round(4.4)         // 4L
Math.rint(4.5)          // 4.0   — round to nearest even (banker's rounding)
Math.signum(-5.0)       // -1.0
Math.log(Math.E)        // 1.0   — natural log
Math.log10(1000)        // 3.0
Math.log1p(0)           // 0.0   — log(1+x), accurate for small x
Math.exp(1)             // 2.718...
Math.expm1(0)           // 0.0   — e^x - 1, accurate for small x

// Trig (radians)
Math.sin(Math.PI / 2)   // 1.0
Math.cos(0)             // 1.0
Math.tan(Math.PI / 4)   // ~1.0
Math.asin(1)            // π/2
Math.acos(1)            // 0
Math.atan(1)            // π/4
Math.atan2(1, 1)        // π/4 — handles quadrants

Math.toDegrees(Math.PI)   // 180.0
Math.toRadians(180)       // π

Math.random()           // 0.0 ≤ x < 1.0 — use Random class instead
Math.PI                 // 3.141592653589793
Math.E                  // 2.718281828459045
Math.TAU                // Java 21: 2*PI = 6.283185307...

// Exact arithmetic (throws ArithmeticException on overflow)
Math.addExact(Integer.MAX_VALUE, 1)   // throws!
Math.subtractExact(a, b)
Math.multiplyExact(a, b)
Math.incrementExact(n)
Math.decrementExact(n)
Math.negateExact(n)
Math.toIntExact(longValue)            // throws if doesn't fit in int

// Hypotenuse without overflow
Math.hypot(3, 4)        // 5.0
Math.hypot(a, b)        // sqrt(a²+b²) computed with better precision
```

---

## Type Casting

```java
// Widening conversion — automatic (safe, no data loss)
int i = 42;
long l = i;       // int → long
float f = i;      // int → float
double d = i;     // int → double
double d2 = l;    // long → double

// Widening order: byte → short → int → long → float → double
// char → int (separately)

// Narrowing conversion — explicit cast (may lose data)
double d = 9.99;
int i = (int) d;         // 9  — decimal truncated, no rounding
long l = 1234567890123L;
int i2 = (int) l;        // truncates upper 32 bits — unpredictable value!
int i3 = 256;
byte b = (byte) i3;      // 0  — 256 overflows byte (-128 to 127)

// char ↔ int
char c = 'A';
int code = c;            // 65
char back = (char) 66;   // 'B'

// Casting objects (requires instanceof check first)
Object obj = "hello";
String s = (String) obj;  // ClassCastException if obj is not String at runtime

// Safe: check first
if (obj instanceof String s2) {
    s2.toUpperCase();  // pattern matching — already cast
}

// Numeric promotions in expressions
byte b1 = 10, b2 = 20;
// byte result = b1 + b2;  // compile error! b1+b2 is int
byte result = (byte)(b1 + b2);  // explicit cast required

short s1 = 1;
short s2 = (short)(s1 + 1);    // same — arithmetic promotes to int
```

---

## Summary

- Use `int` for whole numbers, `double` for decimals, `boolean` for true/false, `String` for text.
- Always use `.equals()` to compare objects — `==` compares references.
- `String` is immutable; use `StringBuilder` for repeated concatenation in loops.
- `Arrays.sort()`, `Arrays.copyOf()`, and `Arrays.toString()` are the essential array utilities.
- Java is always pass-by-value — for objects, the reference is copied.
- `Math.addExact()` and friends throw `ArithmeticException` on overflow — safer than silent wraparound.
- Widening conversions are automatic; narrowing requires explicit cast and may lose data.
