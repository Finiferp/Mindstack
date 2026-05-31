---
title: "Java Object-Oriented Programming"
sidebar_label: "OOP"
sidebar_position: 2
---

# Object-Oriented Programming in Java

Object-Oriented Programming (OOP) is Java's core paradigm. Everything is organized around **objects** — bundles of state (fields) and behavior (methods). OOP makes large codebases manageable by modeling real-world concepts and enforcing clear boundaries between components.

---

## Classes and Objects

A **class** is a blueprint. An **object** is an instance of that blueprint, created with `new`.

```java
public class Car {

    // Fields (state)
    private String brand;
    private int year;
    private double fuelLevel;

    // Constructor — runs when you do `new Car(...)`
    public Car(String brand, int year) {
        this.brand = brand;
        this.year = year;
        this.fuelLevel = 1.0;
    }

    // Methods (behavior)
    public void drive(double distance) {
        fuelLevel -= distance * 0.05;
        System.out.println("Driving " + distance + "km in " + brand);
    }

    public void refuel() {
        fuelLevel = 1.0;
    }

    // Getters / Setters
    public String getBrand() { return brand; }
    public int getYear()     { return year; }
    public double getFuelLevel() { return fuelLevel; }
}
```

```java
// Creating objects
Car myCar = new Car("Toyota", 2022);
myCar.drive(50);
System.out.println(myCar.getFuelLevel());
```

**Tips:**
- Make fields `private` by default — expose them through methods so you control access.
- `this` refers to the current instance. It's required when a parameter name shadows a field name.
- One class per file is the convention (the file must match the public class name).

---

## Constructors

Constructors initialize an object. You can have multiple constructors (**constructor overloading**).

```java
public class Person {

    private String name;
    private int age;

    // No-arg constructor
    public Person() {
        this("Unknown", 0); // delegate to another constructor
    }

    // Parameterized constructor
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // Copy constructor
    public Person(Person other) {
        this.name = other.name;
        this.age = other.age;
    }
}
```

**Tips:**
- If you define any constructor, Java no longer generates a default no-arg constructor automatically.
- Use `this(...)` to call another constructor from within a constructor — keeps initialization logic in one place.
- Constructor chaining keeps code DRY and avoids duplicated validation logic.

---

## Encapsulation

Encapsulation means hiding internal state and requiring all interaction to go through defined methods. This protects integrity and allows you to change internals without breaking callers.

```java
public class BankAccount {

    private double balance;

    public BankAccount(double initialBalance) {
        if (initialBalance < 0) throw new IllegalArgumentException("Balance cannot be negative");
        this.balance = initialBalance;
    }

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Deposit must be positive");
        balance += amount;
    }

    public void withdraw(double amount) {
        if (amount > balance) throw new IllegalStateException("Insufficient funds");
        balance -= amount;
    }

    public double getBalance() {
        return balance;
    }
    // No setBalance() — balance changes only through controlled methods
}
```

**Tips:**
- Fields should almost always be `private`.
- Validate in setters/constructors, not scattered throughout calling code.
- Exposing fields directly with `public` makes refactoring very painful later.

---

## Inheritance

Inheritance lets one class (subclass) extend another (superclass), inheriting its fields and methods. Model **is-a** relationships.

```java
public class Animal {

    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(name + " is eating.");
    }

    public String sound() {
        return "...";
    }
}

public class Dog extends Animal {

    private String breed;

    public Dog(String name, String breed) {
        super(name); // call parent constructor
        this.breed = breed;
    }

    @Override
    public String sound() {
        return "Woof!";
    }

    public void fetch() {
        System.out.println(name + " is fetching!");
    }
}

public class Cat extends Animal {

    public Cat(String name) {
        super(name);
    }

    @Override
    public String sound() {
        return "Meow!";
    }
}
```

```java
Dog dog = new Dog("Rex", "Labrador");
dog.eat();         // inherited from Animal
dog.fetch();       // Dog-specific
System.out.println(dog.sound()); // "Woof!" — overridden
```

**Tips:**
- Use `super(...)` to call the parent constructor; use `super.method()` to call a parent method.
- `@Override` annotation is optional but highly recommended — it catches typos at compile time.
- Prefer **composition over inheritance** when the relationship isn't clearly is-a. Inheritance creates tight coupling.
- Java only supports **single inheritance** for classes (a class can extend only one class).

---

## Polymorphism

Polymorphism means one interface, many implementations. A reference of the parent type can hold any subtype, and method calls resolve to the actual object's type at runtime.

```java
Animal[] animals = {
    new Dog("Rex", "Lab"),
    new Cat("Whiskers"),
    new Dog("Buddy", "Poodle")
};

for (Animal a : animals) {
    System.out.println(a.name + " says: " + a.sound());
    // sound() dispatches to Dog or Cat implementation — runtime polymorphism
}
```

### instanceof and Casting
```java
Animal a = new Dog("Rex", "Lab");

if (a instanceof Dog dog) {         // pattern matching (Java 16+)
    dog.fetch();                    // safe, no explicit cast needed
}

// Classic style (pre Java 16):
if (a instanceof Dog) {
    Dog dog = (Dog) a;
    dog.fetch();
}
```

**Tips:**
- Design to the interface/supertype, not the concrete type — makes code extensible.
- Avoid deep inheritance hierarchies (more than 2-3 levels gets hard to reason about).
- Casting with `(Dog)` throws `ClassCastException` at runtime if the object is not actually a `Dog`. Always guard with `instanceof`.

---

## Abstract Classes

An **abstract class** cannot be instantiated. It can contain abstract methods (no body, subclass must implement) and concrete methods (with body).

```java
public abstract class Shape {

    private String color;

    public Shape(String color) {
        this.color = color;
    }

    // Abstract — subclasses must implement
    public abstract double area();
    public abstract double perimeter();

    // Concrete — shared behavior
    public void describe() {
        System.out.printf("%s shape: area=%.2f, perimeter=%.2f%n",
            color, area(), perimeter());
    }
}

public class Circle extends Shape {

    private double radius;

    public Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }

    @Override
    public double perimeter() {
        return 2 * Math.PI * radius;
    }
}

public class Rectangle extends Shape {

    private double width, height;

    public Rectangle(String color, double width, double height) {
        super(color);
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() { return width * height; }

    @Override
    public double perimeter() { return 2 * (width + height); }
}
```

**Tips:**
- Use abstract classes when subclasses share significant implementation (constructor logic, concrete methods).
- Use an interface when you only need to define a contract without shared implementation.
- Abstract classes can have constructors, fields, and state — interfaces (prior to Java 8 defaults) cannot.

---

## Interfaces

An **interface** defines a pure contract — a list of methods a class promises to implement. A class can implement multiple interfaces (solving the single-inheritance limitation).

```java
public interface Flyable {
    void fly();
    default String getDescription() {
        return "I can fly!";
    }
}

public interface Swimmable {
    void swim();
}

public class Duck extends Animal implements Flyable, Swimmable {

    public Duck(String name) {
        super(name);
    }

    @Override
    public void fly() {
        System.out.println(name + " is flying!");
    }

    @Override
    public void swim() {
        System.out.println(name + " is swimming!");
    }

    @Override
    public String sound() {
        return "Quack!";
    }
}
```

### Functional Interfaces (Java 8+)
An interface with exactly one abstract method is a **functional interface**. It can be implemented with a lambda.

```java
@FunctionalInterface
public interface Transformer {
    String transform(String input);
}

Transformer upper = s -> s.toUpperCase();
Transformer shout = s -> s + "!!!";

System.out.println(upper.transform("hello")); // "HELLO"
System.out.println(shout.transform("hello")); // "hello!!!"
```

**Tips:**
- Prefer interfaces over abstract classes for defining contracts.
- `default` methods (Java 8+) let you add new methods to an interface without breaking existing implementations.
- `static` methods in interfaces act as utility methods scoped to the interface.
- Use `@FunctionalInterface` to get a compile-time error if you accidentally add a second abstract method.

---

## Static Members

`static` members belong to the **class**, not to any instance.

```java
public class Counter {

    private static int count = 0;  // shared across all instances
    private int id;

    public Counter() {
        count++;
        this.id = count;
    }

    public static int getCount() {
        return count;
    }

    public int getId() {
        return id;
    }
}
```

```java
Counter a = new Counter(); // count = 1
Counter b = new Counter(); // count = 2
Counter c = new Counter(); // count = 3

System.out.println(Counter.getCount()); // 3
System.out.println(c.getId());          // 3
```

**Tips:**
- Static fields are initialized once when the class loads.
- Static methods cannot access instance fields or `this`.
- Use static for utility methods (`Math.sqrt()`), constants (`static final`), and factory methods.
- Overusing static state makes code hard to test (shared mutable state = hidden coupling).

---

## Enums

Enums are a special class type with a fixed set of named constants. They're much safer than using raw strings or ints.

```java
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY;

    public boolean isWeekend() {
        return this == SATURDAY || this == SUNDAY;
    }
}
```

```java
Day today = Day.FRIDAY;
System.out.println(today.isWeekend()); // false
System.out.println(today.name());      // "FRIDAY"
System.out.println(today.ordinal());   // 4

// Enums work great in switch
String type = switch (today) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
    case SATURDAY, SUNDAY -> "Weekend";
};
```

**Enums with Fields:**
```java
public enum Planet {
    MERCURY(3.303e+23, 2.4397e6),
    VENUS  (4.869e+24, 6.0518e6),
    EARTH  (5.976e+24, 6.37814e6);

    private final double mass;
    private final double radius;

    Planet(double mass, double radius) {
        this.mass = mass;
        this.radius = radius;
    }

    public double surfaceGravity() {
        final double G = 6.67300E-11;
        return G * mass / (radius * radius);
    }
}
```

**Tips:**
- Always use enums instead of `int` or `String` constants for a fixed set of values.
- Enums are implicitly `public static final` and are singletons by design.
- `Enum.values()` returns all constants as an array — useful for iteration.

---

## Records (Java 16+)

Records are concise immutable data carriers. They auto-generate constructor, getters, `equals`, `hashCode`, and `toString`.

```java
public record Point(int x, int y) {}

public record Person(String name, int age) {
    // Compact constructor for validation
    public Person {
        if (age < 0) throw new IllegalArgumentException("Age cannot be negative");
    }
}
```

```java
Point p = new Point(3, 4);
System.out.println(p.x());     // 3
System.out.println(p.y());     // 4
System.out.println(p);         // Point[x=3, y=4]

Person alice = new Person("Alice", 30);
Person aliceCopy = new Person("Alice", 30);
System.out.println(alice.equals(aliceCopy)); // true — value equality
```

**Tips:**
- Use records for DTOs, value objects, and any class whose purpose is purely to carry data.
- Records are implicitly `final` — they cannot be extended.
- You can add methods to records but you cannot add non-static fields.

---

## Summary

OOP in Java gives you powerful tools for structuring code:

- **Classes and objects** — blueprints and their instances.
- **Encapsulation** — hide state, expose behavior.
- **Inheritance** — share code up a type hierarchy with `extends`.
- **Polymorphism** — one reference type, many runtime behaviors.
- **Abstract classes** — partial implementations that enforce a contract.
- **Interfaces** — pure contracts enabling multiple type hierarchies.
- **Enums and records** — concise, safe types for constants and data.

**Key Takeaways:**
- Favor composition over deep inheritance trees.
- Program to interfaces, not concrete implementations.
- Keep classes focused: one clear responsibility per class (Single Responsibility Principle).
- Use `@Override` always, encapsulate fields as `private`, and validate in constructors.
