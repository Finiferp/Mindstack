---
title: "Object-Oriented Programming"
sidebar_label: "OOP"
sidebar_position: 2
---

# Object-Oriented Programming

Java is built around objects. Understanding encapsulation, inheritance, polymorphism, and abstraction — and when to apply each — is the foundation of every Java program.

---

## Classes and Objects

```java
// Class definition
public class Person {
    // ── Fields ─────────────────────────────────────────────────────────────
    private String name;       // instance field — each object gets its own
    private int    age;
    private String email;

    // Static field — shared across ALL instances
    private static int totalPersons = 0;

    // Constant
    public static final int MAX_AGE = 150;

    // ── Constructors ───────────────────────────────────────────────────────
    // Default constructor — only auto-generated if you define NO constructors
    public Person() {
        this.name  = "Unknown";
        this.age   = 0;
        totalPersons++;
    }

    // Parameterized constructor
    public Person(String name, int age) {
        this.name = name;   // 'this' distinguishes field from parameter
        this.age  = age;
        this.email = "";
        totalPersons++;
    }

    // Constructor chaining — call another constructor (must be first statement)
    public Person(String name, int age, String email) {
        this(name, age);    // call Person(String, int) above
        this.email = email;
    }

    // ── Getters and Setters ────────────────────────────────────────────────
    public String getName()  { return name; }
    public int    getAge()   { return age; }
    public String getEmail() { return email; }

    public void setName(String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Name cannot be blank");
        this.name = name;
    }
    public void setAge(int age) {
        if (age < 0 || age > MAX_AGE) throw new IllegalArgumentException("Invalid age: " + age);
        this.age = age;
    }
    public void setEmail(String email) { this.email = email; }

    // Static method
    public static int getTotalPersons() { return totalPersons; }

    // ── Object methods ─────────────────────────────────────────────────────
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + ", email='" + email + "'}";
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;                  // same reference
        if (obj == null) return false;
        if (getClass() != obj.getClass()) return false;
        Person other = (Person) obj;
        return age == other.age && Objects.equals(name, other.name) && Objects.equals(email, other.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, age, email);
        // Always override hashCode when overriding equals!
        // Objects with same equals() result must have same hashCode
    }
}

// Creating and using objects
Person alice = new Person("Alice", 30);
Person bob   = new Person("Bob", 25, "bob@example.com");

alice.getName()            // "Alice"
alice.setAge(31);
Person.getTotalPersons()   // 2

// Objects.equals — null-safe equality
Objects.equals(alice.getName(), null)    // false
Objects.equals(null, null)               // true

System.out.println(alice);  // Person{name='Alice', age=31, email=''}
```

---

## Access Modifiers

```java
public    // accessible everywhere
protected // accessible in same package + subclasses
(default) // package-private — accessible only in same package (no keyword)
private   // accessible only within the same class

// Applies to: classes, fields, constructors, methods

public class BankAccount {
    private double balance;          // private field — only BankAccount can touch this
    protected String accountNumber;  // subclasses can access
    double interestRate;             // package-private
    public String ownerName;         // public — anyone

    public void deposit(double amount) {
        validateAmount(amount);       // private method call — ok within class
        balance += amount;
    }

    private void validateAmount(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
    }

    public double getBalance() { return balance; }  // public getter for private field
}
```

---

## Encapsulation

Encapsulation hides implementation details and exposes only what's needed.

```java
public class Temperature {
    private double celsius;   // store only in celsius internally

    public Temperature(double celsius) {
        this.celsius = celsius;
    }

    // Multiple views — one underlying value
    public double getCelsius()    { return celsius; }
    public double getFahrenheit() { return celsius * 9.0 / 5.0 + 32; }
    public double getKelvin()     { return celsius + 273.15; }

    public void setCelsius(double celsius) {
        if (celsius < -273.15) throw new IllegalArgumentException("Below absolute zero");
        this.celsius = celsius;
    }
    public void setFahrenheit(double f) { setCelsius((f - 32) * 5.0 / 9.0); }
    public void setKelvin(double k)     { setCelsius(k - 273.15); }

    @Override public String toString() {
        return String.format("%.1f°C / %.1f°F / %.1f K", celsius, getFahrenheit(), getKelvin());
    }

    public static Temperature ofFahrenheit(double f) {
        return new Temperature((f - 32) * 5.0 / 9.0);
    }
    public static Temperature ofKelvin(double k) {
        return new Temperature(k - 273.15);
    }
}

Temperature t = Temperature.ofFahrenheit(212);
t.getCelsius()     // 100.0
t.getKelvin()      // 373.15
System.out.println(t); // "100.0°C / 212.0°F / 373.2 K"
```

---

## Inheritance

```java
// Superclass (parent)
public class Animal {
    protected String name;
    protected String sound;

    public Animal(String name, String sound) {
        this.name  = name;
        this.sound = sound;
    }

    public void speak() {
        System.out.println(name + " says " + sound + "!");
    }

    public void eat() {
        System.out.println(name + " is eating");
    }

    @Override
    public String toString() {
        return "Animal(" + name + ")";
    }
}

// Subclass (child) — inherits all non-private members
public class Dog extends Animal {
    private String breed;

    public Dog(String name, String breed) {
        super(name, "Woof");  // MUST call super constructor — FIRST statement
        this.breed = breed;
    }

    // Override parent method
    @Override
    public void speak() {
        System.out.print(breed + " dog: ");
        super.speak();         // optionally call parent version
    }

    // New method
    public void fetch(String item) {
        System.out.println(name + " fetches the " + item);
    }

    public String getBreed() { return breed; }

    @Override
    public String toString() {
        return "Dog(" + name + ", " + breed + ")";
    }
}

// Three levels
public class GuideDog extends Dog {
    private String owner;

    public GuideDog(String name, String breed, String owner) {
        super(name, breed);
        this.owner = owner;
    }

    @Override
    public void speak() {
        System.out.println("Guide dog for " + owner + ":");
        super.speak();
    }

    public void guide() {
        System.out.println(name + " guides " + owner);
    }
}

// Usage
Dog rex = new Dog("Rex", "Labrador");
rex.speak();        // "Labrador dog: Rex says Woof!"
rex.eat();          // inherited: "Rex is eating"
rex.fetch("ball");  // "Rex fetches the ball"

GuideDog buddy = new GuideDog("Buddy", "Retriever", "Alice");
buddy.speak();     // "Guide dog for Alice:\nRetriever dog: Buddy says Woof!"
buddy.guide();
buddy.fetch("stick");  // still inherits this

// instanceof checks
rex instanceof Dog      // true
rex instanceof Animal   // true
rex instanceof GuideDog // false

// Casting
Animal a = new Dog("Spot", "Beagle");   // upcast — implicit, safe
Dog d    = (Dog) a;                      // downcast — explicit, may throw ClassCastException
if (a instanceof Dog dd) {
    dd.fetch("ball");  // pattern matching — safe
}

// final prevents inheritance or overriding
public final class ImmutableValue { }  // can't extend
public class Parent {
    public final void lockedMethod() { }  // can't override
}
```

---

## Abstract Classes

```java
// Abstract class — cannot be instantiated, may have abstract methods
public abstract class Shape {
    protected String color;

    public Shape(String color) {
        this.color = color;
    }

    // Abstract method — must be overridden in non-abstract subclasses
    public abstract double area();
    public abstract double perimeter();

    // Concrete method — shared implementation
    public void describe() {
        System.out.printf("%s %s: area=%.2f, perimeter=%.2f%n",
            color, getClass().getSimpleName(), area(), perimeter());
    }

    // Concrete method calling abstract — Template Method pattern
    public boolean isLargerThan(Shape other) {
        return this.area() > other.area();
    }

    public String getColor() { return color; }
}

public class Circle extends Shape {
    private final double radius;

    public Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }

    @Override public double area()      { return Math.PI * radius * radius; }
    @Override public double perimeter() { return 2 * Math.PI * radius; }
}

public class Rectangle extends Shape {
    private final double width, height;

    public Rectangle(String color, double width, double height) {
        super(color);
        this.width  = width;
        this.height = height;
    }

    @Override public double area()      { return width * height; }
    @Override public double perimeter() { return 2 * (width + height); }
}

// Polymorphism — treat different types uniformly via common type
List<Shape> shapes = List.of(
    new Circle("red", 5),
    new Rectangle("blue", 4, 6)
);

for (Shape s : shapes) {
    s.describe();  // calls the correct override for each type
}

double totalArea = shapes.stream().mapToDouble(Shape::area).sum();
```

---

## Interfaces

An interface is a contract — it defines what a class can do, not how.

```java
// Interface — all methods are public by default
public interface Drawable {
    // Abstract method (implicitly public abstract)
    void draw();

    // Default method — has implementation, can be overridden
    default void drawWithBorder() {
        System.out.println("=== Border ===");
        draw();
        System.out.println("=============");
    }

    // Static method
    static Drawable noop() {
        return () -> {};  // lambda implementing the interface
    }

    // Constant (implicitly public static final)
    int DEFAULT_SIZE = 100;
}

// Multiple interface implementation
public interface Resizable {
    void resize(double factor);
    default void doubleSize() { resize(2.0); }
    default void halveSize()  { resize(0.5); }
}

public interface Serializable {
    String serialize();
    static Drawable deserialize(String data) { return null; }
}

// Implement multiple interfaces
public class Widget implements Drawable, Resizable, Serializable {
    private double size;
    private String label;

    public Widget(String label, double size) {
        this.label = label;
        this.size  = size;
    }

    @Override public void draw() {
        System.out.println("Drawing " + label + " (size=" + size + ")");
    }
    @Override public void resize(double factor) { this.size *= factor; }
    @Override public String serialize() { return label + ":" + size; }
}

// Extend interfaces
public interface AdvancedDrawable extends Drawable, Resizable {
    void drawAt(int x, int y);
}

// Functional interface — exactly ONE abstract method (can use with lambdas)
@FunctionalInterface
public interface Transformer<T, R> {
    R transform(T input);
    // Can have default and static methods
    default <V> Transformer<T, V> andThen(Transformer<R, V> after) {
        return input -> after.transform(this.transform(input));
    }
}

// Lambda implements functional interface
Transformer<String, Integer> length = String::length;
Transformer<String, String>  upper  = String::toUpperCase;
Transformer<String, String>  shout  = upper.andThen(s -> s + "!");

System.out.println(shout.transform("hello"));  // "HELLO!"
```

### Interface vs Abstract Class

| Feature | Interface | Abstract Class |
|---|---|---|
| Multiple inheritance | Yes (implement many) | No (extend one) |
| Fields | `public static final` only | Any |
| Constructor | No | Yes |
| Access modifiers | All public by default | Any modifier |
| Use when | Defining capabilities | Sharing implementation |

---

## Polymorphism

```java
// Runtime polymorphism — method resolved at runtime based on actual type
Animal animal = new Dog("Rex", "Labrador");
animal.speak();  // calls Dog.speak(), not Animal.speak()
// This is called dynamic dispatch / late binding

// Compile-time polymorphism — method overloading
class Printer {
    void print(int n)    { System.out.println("int: " + n); }
    void print(double d) { System.out.println("double: " + d); }
    void print(String s) { System.out.println("String: " + s); }
}
// Which print() is called is decided at compile time based on argument type

// Storing subclass in superclass variable
List<Animal> zoo = new ArrayList<>();
zoo.add(new Dog("Rex", "Labrador"));
zoo.add(new Cat("Whiskers"));
zoo.add(new Bird("Tweety"));

for (Animal a : zoo) {
    a.speak();  // each animal speaks in its own way
    if (a instanceof Dog d) {
        d.fetch("ball");  // specific behavior only for Dogs
    }
}
```

---

## Enums

```java
// Basic enum
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY;

    public boolean isWeekend() {
        return this == SATURDAY || this == SUNDAY;
    }
    public boolean isWeekday() { return !isWeekend(); }
}

Day today = Day.WEDNESDAY;
today.name()              // "WEDNESDAY" — string name
today.ordinal()           // 2 — zero-based position
Day.valueOf("FRIDAY")     // Day.FRIDAY
Day.values()              // Day[] — all values

// Rich enum — with fields and methods
public enum Planet {
    MERCURY(3.303e+23, 2.4397e6),
    VENUS  (4.869e+24, 6.0518e6),
    EARTH  (5.976e+24, 6.37814e6),
    MARS   (6.421e+23, 3.3972e6);

    private final double mass;    // kg
    private final double radius;  // m

    Planet(double mass, double radius) {
        this.mass   = mass;
        this.radius = radius;
    }

    static final double G = 6.67300E-11;

    double surfaceGravity() { return G * mass / (radius * radius); }
    double surfaceWeight(double otherMass) { return otherMass * surfaceGravity(); }
}

double earthWeight = 75.0;  // kg
double mass = earthWeight / Planet.EARTH.surfaceGravity();
for (Planet p : Planet.values()) {
    System.out.printf("Weight on %s: %.2f%n", p, p.surfaceWeight(mass));
}

// Enum in switch
Day day = Day.MONDAY;
String type = switch (day) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
    case SATURDAY, SUNDAY                              -> "Weekend";
};

// Enum with abstract method
public enum Operation {
    PLUS("+")   { @Override public double apply(double x, double y) { return x + y; } },
    MINUS("-")  { @Override public double apply(double x, double y) { return x - y; } },
    TIMES("*")  { @Override public double apply(double x, double y) { return x * y; } },
    DIVIDE("/") { @Override public double apply(double x, double y) { return x / y; } };

    private final String symbol;
    Operation(String symbol) { this.symbol = symbol; }
    public abstract double apply(double x, double y);
    @Override public String toString() { return symbol; }
}

for (Operation op : Operation.values()) {
    System.out.printf("%.0f %s %.0f = %.0f%n", 6.0, op, 2.0, op.apply(6, 2));
}

// EnumSet and EnumMap
EnumSet<Day> weekend = EnumSet.of(Day.SATURDAY, Day.SUNDAY);
EnumSet<Day> weekdays = EnumSet.complementOf(weekend);
EnumMap<Day, String> schedule = new EnumMap<>(Day.class);
schedule.put(Day.MONDAY, "Meeting");
```

---

## Records (Java 16+)

Records are immutable data carriers — no boilerplate.

```java
// Record — auto-generates: constructor, getters, equals, hashCode, toString
public record Point(double x, double y) {}

Point p = new Point(3.0, 4.0);
p.x()          // 3.0 — accessor (not getX())
p.y()          // 4.0
p.equals(new Point(3.0, 4.0))  // true
p.hashCode()                   // consistent with equals
System.out.println(p)          // "Point[x=3.0, y=4.0]"

// Record with custom methods
public record Person(String name, int age) {
    // Compact canonical constructor — validates
    public Person {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Name required");
        if (age < 0 || age > 150)           throw new IllegalArgumentException("Invalid age: " + age);
        name = name.trim();  // can modify before assignment
    }

    // Custom method
    public boolean isAdult() { return age >= 18; }

    // Static factory
    public static Person of(String name, int age) {
        return new Person(name, age);
    }

    // Override accessor
    public String name() {
        return name.toUpperCase();  // transform on access
    }
}

// Records can implement interfaces
public record Money(BigDecimal amount, Currency currency) implements Comparable<Money> {
    @Override
    public int compareTo(Money other) {
        if (!this.currency.equals(other.currency)) throw new IllegalArgumentException("Different currencies");
        return this.amount.compareTo(other.amount);
    }
}

// Generic record
public record Pair<A, B>(A first, B second) {
    public <C> Pair<A, C> mapSecond(java.util.function.Function<B, C> fn) {
        return new Pair<>(first, fn.apply(second));
    }
}
Pair<String, Integer> pair = new Pair<>("hello", 5);
```

---

## Nested Classes

```java
public class Outer {
    private int x = 10;

    // Inner class — has access to outer instance
    class Inner {
        void show() {
            System.out.println("x = " + x);   // accesses outer.x
            System.out.println(Outer.this.x);  // explicit outer reference
        }
    }

    // Static nested class — does NOT have access to outer instance
    static class StaticNested {
        void show() {
            // System.out.println(x);  // compile error — no outer instance
        }
    }

    void method() {
        // Local class — defined inside a method
        class Local {
            void show() { System.out.println("local"); }
        }
        new Local().show();

        // Anonymous class — one-time implementation
        Runnable r = new Runnable() {
            @Override
            public void run() { System.out.println("anonymous run"); }
        };
        r.run();
    }
}

// Usage
Outer outer = new Outer();
Outer.Inner inner = outer.new Inner();   // inner class needs outer instance
inner.show();

Outer.StaticNested sn = new Outer.StaticNested();  // no outer instance needed
```

---

## Object Class Methods

Every class in Java implicitly extends `Object`. These methods are available on everything.

```java
Object obj = new Object();

obj.toString()              // default: "ClassName@hexHashCode"
obj.equals(other)           // default: reference equality (==)
obj.hashCode()              // default: based on memory address
obj.getClass()              // returns Class<?>
obj.getClass().getName()    // "com.example.MyClass"
obj.getClass().getSimpleName() // "MyClass"
obj.clone()                 // shallow copy (must implement Cloneable)
obj.finalize()              // deprecated — called before GC (don't use)

// Thread-related (covered in concurrency)
obj.wait()
obj.wait(timeout)
obj.notify()
obj.notifyAll()

// Objects utility class
Objects.equals(a, b)         // null-safe equals
Objects.hash(a, b, c)        // combined hash code
Objects.toString(obj)        // null-safe toString
Objects.toString(obj, "default") // with null fallback
Objects.requireNonNull(obj)  // throws NullPointerException if null
Objects.requireNonNull(obj, "Message")
Objects.requireNonNullElse(obj, defaultValue)  // Java 9+
Objects.requireNonNullElseGet(obj, supplier)
Objects.isNull(obj)          // obj == null
Objects.nonNull(obj)         // obj != null
Objects.deepEquals(a, b)     // works for arrays too
```

---

## Summary

- Encapsulate: keep fields `private`, expose via controlled getters/setters.
- Inherit only when there is a true "is-a" relationship — prefer composition otherwise.
- Use interfaces to define capabilities and contracts; abstract classes for shared implementation.
- Always override `equals()` and `hashCode()` together — and follow the contract.
- Records are the right tool for immutable data holders — no boilerplate, no mutability bugs.
- `final` on a class prevents inheritance, on a method prevents overriding, on a field prevents reassignment.
- Enum fields are public constants by default; rich enums can carry data and behaviour.
