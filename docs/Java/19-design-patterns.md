---
title: "Design Patterns in Java"
sidebar_label: "Design Patterns"
sidebar_position: 19
---

# Design Patterns in Java

Classic Gang of Four design patterns, implemented in modern Java. Patterns are tools — apply them when they solve a real problem, not for their own sake.

---

## Creational Patterns

### Singleton

Ensures a class has only one instance, with global access.

```java
// Enum singleton — simplest, thread-safe, serialization-safe (RECOMMENDED)
public enum ConfigManager {
    INSTANCE;

    private final Map<String, String> settings = new ConcurrentHashMap<>();

    public String get(String key) { return settings.get(key); }
    public void set(String key, String value) { settings.put(key, value); }
}
ConfigManager.INSTANCE.set("env", "production");

// Lazy initialization holder — thread-safe without synchronization overhead
public class DatabaseConnection {
    private DatabaseConnection() { }

    private static class Holder {
        private static final DatabaseConnection INSTANCE = new DatabaseConnection();
    }

    public static DatabaseConnection getInstance() {
        return Holder.INSTANCE;   // class loading is thread-safe by JVM spec
    }
}

// In Spring — singletons are just default-scoped @Component beans
@Component  // Spring manages the singleton lifecycle for you — no manual pattern needed
public class CacheService { }
```

### Factory Method

Defines an interface for creating an object, letting subclasses decide which class to instantiate.

```java
public interface Notification {
    void send(String message);
}

public class EmailNotification implements Notification {
    public void send(String message) { System.out.println("Email: " + message); }
}
public class SmsNotification implements Notification {
    public void send(String message) { System.out.println("SMS: " + message); }
}

public abstract class NotificationFactory {
    public abstract Notification createNotification();

    public void notify(String message) {
        Notification notification = createNotification();
        notification.send(message);
    }
}

public class EmailNotificationFactory extends NotificationFactory {
    public Notification createNotification() { return new EmailNotification(); }
}

// Simple factory (not GoF-strict but very common in practice)
public class NotificationFactorySimple {
    public static Notification create(String type) {
        return switch (type) {
            case "email" -> new EmailNotification();
            case "sms"   -> new SmsNotification();
            default      -> throw new IllegalArgumentException("Unknown type: " + type);
        };
    }
}
```

### Abstract Factory

Creates families of related objects without specifying concrete classes.

```java
public interface Button { void render(); }
public interface Checkbox { void render(); }

public class MacButton implements Button { public void render() { System.out.println("Mac button"); } }
public class MacCheckbox implements Checkbox { public void render() { System.out.println("Mac checkbox"); } }
public class WindowsButton implements Button { public void render() { System.out.println("Windows button"); } }
public class WindowsCheckbox implements Checkbox { public void render() { System.out.println("Windows checkbox"); } }

public interface UIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

public class MacUIFactory implements UIFactory {
    public Button createButton()     { return new MacButton(); }
    public Checkbox createCheckbox() { return new MacCheckbox(); }
}
public class WindowsUIFactory implements UIFactory {
    public Button createButton()     { return new WindowsButton(); }
    public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

UIFactory factory = System.getProperty("os.name").contains("Mac")
    ? new MacUIFactory() : new WindowsUIFactory();
Button button = factory.createButton();   // correct family, consistent look
```

### Builder

Constructs complex objects step by step — avoids telescoping constructors.

```java
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeout;

    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = builder.headers;
        this.body = builder.body;
        this.timeout = builder.timeout;
    }

    public static class Builder {
        private final String url;             // required
        private String method = "GET";        // defaults
        private Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeout = 30000;

        public Builder(String url) { this.url = url; }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String key, String value) { headers.put(key, value); return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder timeout(int timeout) { this.timeout = timeout; return this; }

        public HttpRequest build() {
            if (url == null || url.isBlank()) throw new IllegalStateException("URL required");
            return new HttpRequest(this);
        }
    }
}

HttpRequest request = new HttpRequest.Builder("https://api.example.com")
    .method("POST")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token")
    .body("{\"key\":\"value\"}")
    .timeout(5000)
    .build();

// Records partially replace Builder for simple immutable data — but Builder still wins
// for objects with many OPTIONAL fields and complex validation
```

### Prototype

Creates new objects by copying an existing instance.

```java
public class Document implements Cloneable {
    private String title;
    private List<String> paragraphs;

    @Override
    public Document clone() {
        try {
            Document copy = (Document) super.clone();
            copy.paragraphs = new ArrayList<>(this.paragraphs);  // deep copy mutable fields
            return copy;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);  // can't happen — we implement Cloneable
        }
    }
}

// Records provide a similar capability via "with"-style copying (manual, since no native withers yet)
public record Config(String env, int timeout, boolean debug) {
    public Config withTimeout(int newTimeout) {
        return new Config(env, newTimeout, debug);
    }
}
Config base = new Config("prod", 5000, false);
Config debugConfig = base.withTimeout(10000);
```

---

## Structural Patterns

### Adapter

Converts one interface into another that clients expect.

```java
// Existing legacy interface
public interface LegacyPrinter {
    void printDocument(String content);
}

// Target interface your app uses
public interface ModernPrinter {
    void print(Document doc);
}

// Adapter bridges them
public class PrinterAdapter implements ModernPrinter {
    private final LegacyPrinter legacyPrinter;

    public PrinterAdapter(LegacyPrinter legacyPrinter) {
        this.legacyPrinter = legacyPrinter;
    }

    @Override
    public void print(Document doc) {
        legacyPrinter.printDocument(doc.getContent());   // adapts the call
    }
}

// Real-world example: Spring's JdbcTemplate adapts raw JDBC to a cleaner API
// Another: java.util.Arrays.asList() adapts an array to the List interface
```

### Decorator

Adds behavior to objects dynamically without modifying their class.

```java
public interface Coffee {
    double cost();
    String description();
}

public class SimpleCoffee implements Coffee {
    public double cost() { return 2.0; }
    public String description() { return "Coffee"; }
}

public abstract class CoffeeDecorator implements Coffee {
    protected final Coffee decorated;
    protected CoffeeDecorator(Coffee decorated) { this.decorated = decorated; }
}

public class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee decorated) { super(decorated); }
    public double cost() { return decorated.cost() + 0.5; }
    public String description() { return decorated.description() + ", Milk"; }
}

public class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee decorated) { super(decorated); }
    public double cost() { return decorated.cost() + 0.2; }
    public String description() { return decorated.description() + ", Sugar"; }
}

Coffee order = new SugarDecorator(new MilkDecorator(new SimpleCoffee()));
order.description()  // "Coffee, Milk, Sugar"
order.cost()           // 2.7

// Java's I/O streams are a classic Decorator example:
InputStream is = new BufferedInputStream(new GZIPInputStream(new FileInputStream("file.gz")));
```

### Proxy

Controls access to another object — for lazy loading, access control, logging, caching.

```java
public interface Image {
    void display();
}

public class RealImage implements Image {
    private final String filename;
    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk();   // expensive
    }
    private void loadFromDisk() { System.out.println("Loading " + filename); }
    public void display() { System.out.println("Displaying " + filename); }
}

// Virtual proxy — defers expensive creation until actually needed
public class ImageProxy implements Image {
    private final String filename;
    private RealImage realImage;

    public ImageProxy(String filename) { this.filename = filename; }

    @Override
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename);   // lazy load
        }
        realImage.display();
    }
}

// Java dynamic proxies (used heavily by Spring AOP, Hibernate lazy loading)
public class LoggingInvocationHandler implements InvocationHandler {
    private final Object target;
    public LoggingInvocationHandler(Object target) { this.target = target; }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("Calling: " + method.getName());
        Object result = method.invoke(target, args);
        System.out.println("Returned: " + result);
        return result;
    }
}

UserService realService = new UserServiceImpl();
UserService proxy = (UserService) Proxy.newProxyInstance(
    UserService.class.getClassLoader(),
    new Class<?>[]{UserService.class},
    new LoggingInvocationHandler(realService)
);
```

### Facade

Provides a simplified interface to a complex subsystem.

```java
// Complex subsystem
public class CPU { void freeze() {} void jump(long pos) {} void execute() {} }
public class Memory { void load(long pos, byte[] data) {} }
public class HardDrive { byte[] read(long lba, int size) { return new byte[0]; } }

// Facade — hides the complexity
public class ComputerFacade {
    private final CPU cpu = new CPU();
    private final Memory memory = new Memory();
    private final HardDrive hardDrive = new HardDrive();

    public void start() {
        cpu.freeze();
        memory.load(0, hardDrive.read(0, 1024));
        cpu.jump(0);
        cpu.execute();
    }
}

new ComputerFacade().start();   // simple call, hides all internal complexity

// Real-world: Spring's JdbcTemplate is a facade over raw JDBC's complexity
// (connection handling, statement preparation, resource cleanup, exception translation)
```

---

## Behavioral Patterns

### Strategy

Defines a family of interchangeable algorithms.

```java
public interface DiscountStrategy {
    BigDecimal apply(BigDecimal price);
}

public class NoDiscount implements DiscountStrategy {
    public BigDecimal apply(BigDecimal price) { return price; }
}
public class PercentageDiscount implements DiscountStrategy {
    private final BigDecimal percentage;
    public PercentageDiscount(BigDecimal percentage) { this.percentage = percentage; }
    public BigDecimal apply(BigDecimal price) {
        return price.multiply(BigDecimal.ONE.subtract(percentage));
    }
}
public class FixedDiscount implements DiscountStrategy {
    private final BigDecimal amount;
    public FixedDiscount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal apply(BigDecimal price) { return price.subtract(amount).max(BigDecimal.ZERO); }
}

public class PriceCalculator {
    private DiscountStrategy strategy;
    public void setStrategy(DiscountStrategy strategy) { this.strategy = strategy; }
    public BigDecimal calculate(BigDecimal price) { return strategy.apply(price); }
}

PriceCalculator calc = new PriceCalculator();
calc.setStrategy(new PercentageDiscount(new BigDecimal("0.20")));
calc.calculate(new BigDecimal("100"));   // 80.00

// Modern Java — lambdas ARE strategies for functional interfaces
DiscountStrategy lambdaDiscount = price -> price.multiply(new BigDecimal("0.9"));
```

### Observer

Defines a one-to-many dependency — when one object changes state, all dependents are notified.

```java
public interface Observer {
    void update(String event);
}

public class EventPublisher {
    private final List<Observer> observers = new ArrayList<>();
    public void subscribe(Observer observer) { observers.add(observer); }
    public void unsubscribe(Observer observer) { observers.remove(observer); }
    public void publish(String event) {
        observers.forEach(o -> o.update(event));
    }
}

EventPublisher publisher = new EventPublisher();
publisher.subscribe(event -> System.out.println("Logger: " + event));
publisher.subscribe(event -> System.out.println("Analytics: " + event));
publisher.publish("UserRegistered");

// Java's built-in support: java.beans.PropertyChangeListener (legacy)
// Modern equivalent: Spring's ApplicationEventPublisher / @EventListener (see Spring Core page)
```

### Template Method

Defines the skeleton of an algorithm, deferring specific steps to subclasses.

```java
public abstract class DataProcessor {

    // Template method — defines the algorithm structure, marked final to prevent override
    public final void process() {
        readData();
        validateData();
        transformData();
        saveData();
    }

    protected abstract void readData();
    protected abstract void transformData();

    // Default implementations subclasses MAY override
    protected void validateData() { System.out.println("Default validation"); }
    protected void saveData()     { System.out.println("Default save"); }
}

public class CsvProcessor extends DataProcessor {
    protected void readData()      { System.out.println("Reading CSV"); }
    protected void transformData() { System.out.println("Transforming CSV data"); }
}

public class JsonProcessor extends DataProcessor {
    protected void readData()      { System.out.println("Reading JSON"); }
    protected void transformData() { System.out.println("Transforming JSON data"); }
    @Override
    protected void validateData()  { System.out.println("Strict JSON schema validation"); }
}

new CsvProcessor().process();    // uses default validate/save, custom read/transform
```

### Command

Encapsulates a request as an object — enables undo, queuing, logging.

```java
public interface Command {
    void execute();
    void undo();
}

public class Light {
    public void on()  { System.out.println("Light ON"); }
    public void off() { System.out.println("Light OFF"); }
}

public class LightOnCommand implements Command {
    private final Light light;
    public LightOnCommand(Light light) { this.light = light; }
    public void execute() { light.on(); }
    public void undo()    { light.off(); }
}

public class CommandHistory {
    private final Deque<Command> history = new ArrayDeque<>();

    public void execute(Command command) {
        command.execute();
        history.push(command);
    }

    public void undoLast() {
        if (!history.isEmpty()) history.pop().undo();
    }
}

CommandHistory invoker = new CommandHistory();
invoker.execute(new LightOnCommand(new Light()));
invoker.undoLast();   // turns the light back off

// Real-world: Runnable IS essentially the Command pattern in Java
Runnable command = () -> System.out.println("Executing task");
executorService.submit(command);
```

### Chain of Responsibility

Passes a request along a chain of handlers until one handles it.

```java
public abstract class Handler {
    protected Handler next;
    public Handler setNext(Handler next) { this.next = next; return next; }

    public void handle(Request request) {
        if (canHandle(request)) {
            process(request);
        } else if (next != null) {
            next.handle(request);
        } else {
            System.out.println("No handler for request");
        }
    }

    protected abstract boolean canHandle(Request request);
    protected abstract void process(Request request);
}

public class AuthHandler extends Handler {
    protected boolean canHandle(Request r) { return !r.isAuthenticated(); }
    protected void process(Request r) { System.out.println("Authenticating..."); }
}
public class ValidationHandler extends Handler {
    protected boolean canHandle(Request r) { return !r.isValid(); }
    protected void process(Request r) { System.out.println("Validating..."); }
}
public class BusinessLogicHandler extends Handler {
    protected boolean canHandle(Request r) { return true; }
    protected void process(Request r) { System.out.println("Processing business logic..."); }
}

Handler chain = new AuthHandler();
chain.setNext(new ValidationHandler()).setNext(new BusinessLogicHandler());
chain.handle(new Request());

// Real-world: Servlet Filters and Spring Security's filter chain ARE this pattern
```

---

## When to Use Which Pattern

| Problem | Pattern |
|---|---|
| Need exactly one instance, globally accessible | Singleton (or just a Spring `@Component`) |
| Object creation logic varies by subtype | Factory Method / Abstract Factory |
| Complex object with many optional parameters | Builder |
| Need to wrap/adapt an incompatible interface | Adapter |
| Add behavior dynamically without subclassing | Decorator |
| Control or defer access to an expensive object | Proxy |
| Simplify a complex subsystem's interface | Facade |
| Swap algorithms at runtime | Strategy |
| Notify multiple parts of the system on change | Observer |
| Fixed algorithm steps, variable implementation | Template Method |
| Need undo/redo or request queuing | Command |
| Multiple potential handlers for a request | Chain of Responsibility |

---

## Summary

- Most "GoF patterns" in modern Java are partially or fully replaced by language features: lambdas (Strategy/Command), Spring DI (Singleton/Factory), records (immutable value objects).
- Don't force patterns where they're not needed — a simple method is often better than a full pattern implementation.
- Builder remains valuable for objects with many optional constructor parameters — records don't solve this well yet.
- Decorator and Proxy both "wrap" an object, but Decorator ADDS behavior while Proxy CONTROLS access — know the distinction.
- Spring's core architecture is itself a showcase of patterns: DI container (Factory), AOP (Proxy/Decorator), `ApplicationEventPublisher` (Observer), filter chains (Chain of Responsibility).
- Recognizing patterns in frameworks you already use (Servlet Filters, I/O streams, JDBC templates) builds intuition faster than memorizing UML diagrams.
