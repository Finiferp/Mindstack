---
title: "Design Patterns in Java"
sidebar_label: "Design Patterns"
sidebar_position: 19
---

# Design Patterns in Java

Design patterns are proven solutions to recurring software design problems. They're not libraries or frameworks — they're templates for structuring code. Knowing them helps you recognize common problems faster and communicate solutions clearly with other developers.

---

## Creational Patterns

Creational patterns deal with object creation.

### Singleton

Ensures only one instance of a class exists in the application.

```java
// Thread-safe singleton with lazy initialization
public class DatabaseConnection {

    private static volatile DatabaseConnection instance;

    private DatabaseConnection() {}

    public static DatabaseConnection getInstance() {
        if (instance == null) {
            synchronized (DatabaseConnection.class) {
                if (instance == null) {  // double-checked locking
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
}

// Simpler: enum singleton (thread-safe, serialization-safe)
public enum AppConfig {
    INSTANCE;

    private final String dbUrl = System.getenv("DATABASE_URL");

    public String getDbUrl() { return dbUrl; }
}
```

**In Spring:** `@Component` beans are singletons by default. Prefer Spring-managed singletons over hand-rolled ones.

---

### Factory Method

Defines an interface for creating objects, letting subclasses decide which class to instantiate.

```java
public interface Notification {
    void send(String message);
}

public class EmailNotification implements Notification {
    public void send(String message) { /* send email */ }
}

public class SmsNotification implements Notification {
    public void send(String message) { /* send SMS */ }
}

public class PushNotification implements Notification {
    public void send(String message) { /* push */ }
}

// Factory
public class NotificationFactory {
    public static Notification create(String type) {
        return switch (type) {
            case "EMAIL" -> new EmailNotification();
            case "SMS"   -> new SmsNotification();
            case "PUSH"  -> new PushNotification();
            default      -> throw new IllegalArgumentException("Unknown type: " + type);
        };
    }
}

// Usage
Notification n = NotificationFactory.create("EMAIL");
n.send("Hello!");
```

---

### Builder

Constructs complex objects step by step. Avoids telescoping constructors.

```java
public class HttpRequest {

    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeoutSeconds;

    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = Map.copyOf(builder.headers);
        this.body = builder.body;
        this.timeoutSeconds = builder.timeoutSeconds;
    }

    public static class Builder {
        private final String url;
        private String method = "GET";
        private final Map<String, String> headers = new LinkedHashMap<>();
        private String body;
        private int timeoutSeconds = 30;

        public Builder(String url) {
            this.url = Objects.requireNonNull(url);
        }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String name, String value) { headers.put(name, value); return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder timeout(int seconds) { this.timeoutSeconds = seconds; return this; }

        public HttpRequest build() {
            if (body != null && method.equals("GET")) {
                throw new IllegalStateException("GET requests cannot have a body");
            }
            return new HttpRequest(this);
        }
    }
}

// Usage
HttpRequest request = new HttpRequest.Builder("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token")
    .body("{\"name\": \"Alice\"}")
    .timeout(10)
    .build();
```

**Tip:** Lombok's `@Builder` generates all of this automatically.

---

## Structural Patterns

Structural patterns deal with how classes and objects are composed.

### Decorator

Adds behavior to an object dynamically without modifying its class.

```java
public interface TextFormatter {
    String format(String text);
}

public class PlainTextFormatter implements TextFormatter {
    public String format(String text) { return text; }
}

// Decorators wrap a formatter and add behavior
public class UpperCaseDecorator implements TextFormatter {
    private final TextFormatter wrapped;
    public UpperCaseDecorator(TextFormatter wrapped) { this.wrapped = wrapped; }
    public String format(String text) { return wrapped.format(text).toUpperCase(); }
}

public class TrimDecorator implements TextFormatter {
    private final TextFormatter wrapped;
    public TrimDecorator(TextFormatter wrapped) { this.wrapped = wrapped; }
    public String format(String text) { return wrapped.format(text.trim()); }
}

public class PrefixDecorator implements TextFormatter {
    private final TextFormatter wrapped;
    private final String prefix;
    public PrefixDecorator(TextFormatter wrapped, String prefix) {
        this.wrapped = wrapped;
        this.prefix = prefix;
    }
    public String format(String text) { return prefix + wrapped.format(text); }
}

// Compose decorators
TextFormatter formatter = new PrefixDecorator(
    new UpperCaseDecorator(
        new TrimDecorator(
            new PlainTextFormatter()
        )
    ),
    ">> "
);

formatter.format("  hello world  "); // ">> HELLO WORLD"
```

**In Spring:** Servlet Filters and Spring AOP are decorator/proxy patterns applied at the framework level.

---

### Proxy

Provides a surrogate or placeholder for another object to control access.

```java
public interface UserRepository {
    User findById(Long id);
    void save(User user);
}

public class RealUserRepository implements UserRepository {
    public User findById(Long id) { /* DB call */ return db.find(id); }
    public void save(User user) { /* DB call */ db.save(user); }
}

// Caching proxy
public class CachingUserRepository implements UserRepository {
    private final UserRepository real;
    private final Map<Long, User> cache = new ConcurrentHashMap<>();

    public CachingUserRepository(UserRepository real) { this.real = real; }

    public User findById(Long id) {
        return cache.computeIfAbsent(id, real::findById);
    }

    public void save(User user) {
        real.save(user);
        cache.put(user.getId(), user);  // update cache
    }
}

// Logging proxy
public class LoggingUserRepository implements UserRepository {
    private final UserRepository real;

    public User findById(Long id) {
        log.info("Finding user {}", id);
        User user = real.findById(id);
        log.info("Found user: {}", user.getName());
        return user;
    }
    // ...
}
```

**In Spring:** `@Transactional`, `@Cacheable`, `@Async` all work via Spring-generated proxies.

---

### Adapter

Converts one interface into another that clients expect — compatibility bridge.

```java
// Legacy payment gateway with old interface
public class LegacyPaymentGateway {
    public String processPaymentXml(String xmlPayload) { ... }
}

// Modern interface your application uses
public interface PaymentProcessor {
    PaymentResult charge(PaymentRequest request);
}

// Adapter bridges the gap
public class LegacyGatewayAdapter implements PaymentProcessor {
    private final LegacyPaymentGateway legacy;
    private final XmlConverter converter;

    @Override
    public PaymentResult charge(PaymentRequest request) {
        String xml = converter.toXml(request);
        String responseXml = legacy.processPaymentXml(xml);
        return converter.fromXml(responseXml, PaymentResult.class);
    }
}

// Client uses modern interface — unaware of legacy system
PaymentProcessor processor = new LegacyGatewayAdapter(new LegacyPaymentGateway(), converter);
PaymentResult result = processor.charge(request);
```

---

## Behavioral Patterns

Behavioral patterns deal with communication between objects.

### Strategy

Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

```java
public interface SortStrategy {
    void sort(int[] array);
}

public class BubbleSort implements SortStrategy {
    public void sort(int[] arr) { /* bubble sort implementation */ }
}

public class QuickSort implements SortStrategy {
    public void sort(int[] arr) { /* quicksort implementation */ }
}

public class MergeSort implements SortStrategy {
    public void sort(int[] arr) { /* merge sort implementation */ }
}

public class DataProcessor {
    private SortStrategy strategy;

    public void setStrategy(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public void process(int[] data) {
        strategy.sort(data);
        // ... further processing
    }
}

// Runtime switch
DataProcessor processor = new DataProcessor();
processor.setStrategy(new QuickSort());
processor.process(data);

// Modern Java: strategies as lambdas when they fit a functional interface
@FunctionalInterface
interface PricingStrategy {
    BigDecimal calculatePrice(Product product, int quantity);
}

PricingStrategy bulk    = (p, q) -> p.getPrice().multiply(BigDecimal.valueOf(q * 0.9));
PricingStrategy regular = (p, q) -> p.getPrice().multiply(BigDecimal.valueOf(q));
PricingStrategy premium = (p, q) -> p.getPrice().multiply(BigDecimal.valueOf(q * 1.2));
```

---

### Observer

Defines a one-to-many dependency so when one object changes, all dependents are notified.

```java
// Event (the state change)
public record PriceChangedEvent(String productId, BigDecimal oldPrice, BigDecimal newPrice) {}

// Observer interface
public interface PriceObserver {
    void onPriceChanged(PriceChangedEvent event);
}

// Subject (observable)
public class PriceService {
    private final List<PriceObserver> observers = new CopyOnWriteArrayList<>();

    public void addObserver(PriceObserver observer) { observers.add(observer); }
    public void removeObserver(PriceObserver observer) { observers.remove(observer); }

    public void updatePrice(String productId, BigDecimal newPrice) {
        BigDecimal oldPrice = getPrice(productId);
        savePrice(productId, newPrice);

        PriceChangedEvent event = new PriceChangedEvent(productId, oldPrice, newPrice);
        observers.forEach(o -> o.onPriceChanged(event));
    }
}

// Concrete observers
public class PriceAlertService implements PriceObserver {
    public void onPriceChanged(PriceChangedEvent event) {
        if (event.newPrice().compareTo(event.oldPrice()) < 0) {
            notifyWishlistUsers(event.productId(), event.newPrice());
        }
    }
}

public class PriceHistoryService implements PriceObserver {
    public void onPriceChanged(PriceChangedEvent event) {
        recordInHistory(event);
    }
}
```

**In Spring:** This is exactly what `ApplicationEvent` and `@EventListener` provide at the framework level.

---

### Template Method

Defines the skeleton of an algorithm in a base class, deferring specific steps to subclasses.

```java
public abstract class DataImporter {

    // Template method — the algorithm skeleton
    public final void importData(String source) {
        List<String> rawData = readData(source);        // step 1
        List<String> validated = validateData(rawData); // step 2
        List<?> parsed = parseData(validated);          // step 3
        saveData(parsed);                                // step 4
        logImport(source, parsed.size());               // step 5 (concrete)
    }

    // Subclass must implement
    protected abstract List<String> readData(String source);
    protected abstract List<?> parseData(List<String> data);

    // Subclass may override (has default behavior)
    protected List<String> validateData(List<String> data) {
        return data.stream().filter(line -> !line.isBlank()).toList();
    }

    protected abstract void saveData(List<?> data);

    // Final — subclasses cannot override this step
    private void logImport(String source, int count) {
        System.out.printf("Imported %d records from %s%n", count, source);
    }
}

public class CsvImporter extends DataImporter {
    protected List<String> readData(String path) { return Files.readAllLines(Path.of(path)); }
    protected List<Product> parseData(List<String> lines) { /* parse CSV */ }
    protected void saveData(List<?> data) { productRepository.saveAll((List<Product>) data); }
}

public class JsonImporter extends DataImporter {
    protected List<String> readData(String url) { return fetchFromUrl(url); }
    protected List<Product> parseData(List<String> lines) { /* parse JSON */ }
    protected void saveData(List<?> data) { productRepository.saveAll((List<Product>) data); }
}
```

---

### Command

Encapsulates a request as an object, enabling undo/redo, queuing, and logging.

```java
public interface Command {
    void execute();
    void undo();
}

public class TransferMoneyCommand implements Command {
    private final BankAccount from;
    private final BankAccount to;
    private final BigDecimal amount;
    private boolean executed = false;

    public void execute() {
        from.debit(amount);
        to.credit(amount);
        executed = true;
    }

    public void undo() {
        if (!executed) throw new IllegalStateException("Not yet executed");
        to.debit(amount);
        from.credit(amount);
        executed = false;
    }
}

// Command invoker with history
public class CommandProcessor {
    private final Deque<Command> history = new ArrayDeque<>();

    public void execute(Command command) {
        command.execute();
        history.push(command);
    }

    public void undo() {
        if (!history.isEmpty()) {
            history.pop().undo();
        }
    }
}
```

---

## Summary

Design patterns fall into three categories:

- **Creational** — how objects are made: Singleton, Factory, Builder.
- **Structural** — how objects are composed: Decorator, Proxy, Adapter.
- **Behavioral** — how objects communicate: Strategy, Observer, Template Method, Command.

**Key Takeaways:**
- Spring uses patterns internally — `@Transactional` = Proxy, `@EventListener` = Observer, `@Cacheable` = Proxy, Filter chain = Chain of Responsibility.
- Builder pattern is essential for creating complex, immutable objects (Lombok's `@Builder` generates it).
- Strategy pattern is the clean alternative to long `if/else` chains based on type or mode.
- Learn to recognize patterns in existing code — it's more valuable than memorizing definitions.
- Modern Java lambdas simplify many patterns (Strategy becomes a functional interface; Observer becomes an event handler lambda).
