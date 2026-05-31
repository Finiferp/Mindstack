---
title: "Spring — Caching, Events & Transactions"
sidebar_label: "Caching, Events & Transactions"
sidebar_position: 15
---

# Spring — Caching, Events & Transactions

Beyond CRUD, production Spring applications need caching to reduce database load, events to decouple components, and careful transaction management to ensure data consistency. These three cross-cutting capabilities are handled declaratively with annotations.

---

## Caching

Spring's caching abstraction sits on top of any cache provider (Caffeine, Redis, EhCache). You annotate methods; Spring handles storing and retrieving results.

### Setup

```xml
<!-- In-memory Caffeine cache -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>

<!-- Or Redis for distributed caching -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableCaching
public class MyApp {}
```

```yaml
# Caffeine (in-memory)
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=10m

# Redis (distributed)
spring:
  cache:
    type: redis
  redis:
    host: localhost
    port: 6379
  data:
    redis:
      time-to-live: 600000   # 10 minutes in ms
```

### @Cacheable

```java
@Service
public class ProductService {

    // Cache result — next call with same id returns cached value, skips DB
    @Cacheable(value = "products", key = "#id")
    public ProductResponse findById(Long id) {
        // This method body only executes on cache miss
        return productRepository.findById(id)
            .map(productMapper::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    // Conditional caching
    @Cacheable(value = "products", key = "#id", condition = "#id > 0")
    public ProductResponse findByIdConditional(Long id) { ... }

    // Cache unless the result is null
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public ProductResponse findByIdNullable(Long id) { ... }

    // Complex key using SpEL
    @Cacheable(value = "products", key = "#category + '_' + #page + '_' + #size")
    public Page<ProductResponse> findByCategory(String category, int page, int size) { ... }
}
```

### @CachePut and @CacheEvict

```java
@Service
public class ProductService {

    // Update cache after writing (always executes the method, then updates cache)
    @CachePut(value = "products", key = "#result.id")
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        productMapper.update(product, request);
        return productMapper.toResponse(productRepository.save(product));
    }

    // Remove from cache when deleted
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        productRepository.deleteById(id);
    }

    // Clear entire cache (e.g., after bulk update)
    @CacheEvict(value = "products", allEntries = true)
    public void clearCache() {}

    // Multiple cache operations
    @Caching(
        evict = {
            @CacheEvict(value = "products", key = "#id"),
            @CacheEvict(value = "product-lists", allEntries = true)
        }
    )
    public void deleteAndClearList(Long id) {
        productRepository.deleteById(id);
    }
}
```

### Custom Cache Configuration

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(500)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());   // enable hit/miss stats
        return manager;
    }

    // Different TTLs per cache (Redis)
    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory factory) {
        Map<String, RedisCacheConfiguration> configs = Map.of(
            "products", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)),
            "users", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5)),
            "categories", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(24))
        );

        return RedisCacheManager.builder(factory)
            .withInitialCacheConfigurations(configs)
            .build();
    }
}
```

**Tips:**
- Cache only read-heavy, computation-expensive, or slow data (DB queries, external API calls).
- Always evict or update the cache when the underlying data changes.
- Use Redis for distributed cache (multiple app instances sharing state); use Caffeine for single-instance in-memory cache.
- Self-invocation bypasses caching (same as AOP) — inject the service into itself or use `ApplicationContext.getBean()` as a workaround.

---

## Application Events

Spring's event system decouples components. A service publishes an event; listeners react independently. Neither knows about the other.

### Built-in Events

```java
@Component
public class AppStartupListener implements ApplicationListener<ApplicationReadyEvent> {
    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        System.out.println("Application fully started and ready to serve requests!");
    }
}

// Or with annotation style
@EventListener(ApplicationReadyEvent.class)
public void onReady() {
    System.out.println("Ready!");
}

@EventListener(ContextClosedEvent.class)
public void onShutdown() {
    System.out.println("Shutting down gracefully...");
}
```

### Custom Events

```java
// Define the event — extend ApplicationEvent or just use a POJO (Spring 4.2+)
public record UserCreatedEvent(Long userId, String email, LocalDateTime occurredAt) {}

public record OrderPlacedEvent(Long orderId, Long userId, BigDecimal total) {}
```

### Publishing Events

```java
@Service
public class UserService {

    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;

    public UserService(ApplicationEventPublisher eventPublisher, UserRepository userRepository) {
        this.eventPublisher = eventPublisher;
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        User user = userRepository.save(new User(request.name(), request.email()));

        // Publish event — listeners react asynchronously or synchronously
        eventPublisher.publishEvent(new UserCreatedEvent(
            user.getId(), user.getEmail(), LocalDateTime.now()
        ));

        return userMapper.toResponse(user);
    }
}
```

### Listening to Events

```java
@Component
public class UserEventListeners {

    private final EmailService emailService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    // Synchronous listener (same thread, same transaction if @Transactional)
    @EventListener
    public void onUserCreated(UserCreatedEvent event) {
        auditService.log("USER_CREATED", event.userId());
    }

    // Async listener — runs in a separate thread
    @EventListener
    @Async
    public void sendWelcomeEmail(UserCreatedEvent event) {
        emailService.sendWelcomeEmail(event.email());
    }

    // Transactional listener — runs AFTER the originating transaction commits
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyAfterCommit(UserCreatedEvent event) {
        // Safe: user is guaranteed to be in the DB at this point
        notificationService.notifyNewUser(event.userId());
    }

    // Conditional listener
    @EventListener(condition = "#event.total > 1000")
    public void onLargeOrder(OrderPlacedEvent event) {
        notificationService.alertSalesTeam(event.orderId());
    }
}
```

### Enabling Async Events

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public Executor asyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-event-");
        executor.initialize();
        return executor;
    }
}
```

**Tips:**
- Use `@TransactionalEventListener(phase = AFTER_COMMIT)` when the listener depends on committed data (sending email, calling external APIs).
- `@Async` event listeners never block the publisher — ideal for notifications, emails, analytics.
- Events decouple your domain (UserService has no reference to EmailService).
- Be careful with exceptions in async listeners — they don't propagate to the caller; use an `AsyncUncaughtExceptionHandler`.

---

## Transaction Management

Spring's `@Transactional` wraps method execution in a database transaction.

### Basics

```java
@Service
@Transactional   // default transaction on all methods
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    @Transactional   // can also annotate per method
    public Order placeOrder(PlaceOrderRequest request) {
        // All operations in one transaction — either all succeed or all roll back
        inventoryService.reserve(request.items());
        Order order = orderRepository.save(new Order(request));
        paymentService.charge(request.paymentDetails(), order.getTotal());
        return order;
    }

    @Transactional(readOnly = true)   // hint to DB: skip dirty checking, enable read replicas
    public List<Order> findByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }
}
```

### Propagation

What happens when a transactional method calls another transactional method:

```java
@Service
public class OrderService {

    @Transactional(propagation = Propagation.REQUIRED)  // default
    public void placeOrder(PlaceOrderRequest request) {
        // Uses existing transaction if one exists, creates new if none
        processPayment(request);   // joins this transaction
        saveOrder(request);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void auditLog(String action) {
        // Always creates a NEW transaction, suspending the current one
        // Committed independently — even if outer transaction rolls back
        auditRepository.save(new AuditEntry(action));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Report generateReport() {
        // Runs WITHOUT a transaction — for read-only operations where
        // transaction overhead isn't needed
        return reportBuilder.build();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void mustRunInsideTransaction() {
        // Throws if no existing transaction — caller MUST start one
    }

    @Transactional(propagation = Propagation.NEVER)
    public void mustNotRunInTransaction() {
        // Throws if there IS a transaction — for non-transactional operations
    }
}
```

### Isolation Levels

Control how concurrent transactions see each other's changes:

```java
@Transactional(isolation = Isolation.READ_COMMITTED)   // default for most DBs
public void readData() { ... }

@Transactional(isolation = Isolation.REPEATABLE_READ)
public void consistentRead() {
    // Same SELECT returns same rows even if another transaction commits between reads
}

@Transactional(isolation = Isolation.SERIALIZABLE)
public void fullyIsolated() {
    // Highest isolation — prevents all anomalies, but slowest
}
```

| Level              | Dirty Read | Non-Repeatable Read | Phantom Read |
|--------------------|------------|----------------------|--------------|
| READ_UNCOMMITTED   | Possible   | Possible             | Possible     |
| READ_COMMITTED     | Prevented  | Possible             | Possible     |
| REPEATABLE_READ    | Prevented  | Prevented            | Possible     |
| SERIALIZABLE       | Prevented  | Prevented            | Prevented    |

### Rollback Behavior

```java
// By default, Spring rolls back on RuntimeException and Error only
// Checked exceptions do NOT trigger rollback by default

@Transactional(rollbackFor = Exception.class)   // roll back on ANY exception
public void riskyOperation() throws IOException { ... }

@Transactional(noRollbackFor = BusinessWarningException.class)
public void operationWithWarnings() { ... }

// Programmatic rollback
@Transactional
public void conditionalRollback() {
    saveData();
    if (validationFails()) {
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        // Transaction will roll back when method returns
    }
}
```

### Common Transaction Pitfalls

```java
// PITFALL 1: Self-invocation bypasses @Transactional (same as AOP)
@Service
public class OrderService {

    public void outerMethod() {
        innerMethod();  // @Transactional on innerMethod has NO effect here!
    }

    @Transactional
    public void innerMethod() { ... }
}

// FIX: inject self or restructure
@Service
public class OrderService {

    @Autowired
    private OrderService self;

    public void outerMethod() {
        self.innerMethod();  // goes through the proxy — @Transactional fires
    }

    @Transactional
    public void innerMethod() { ... }
}

// PITFALL 2: @Transactional on private methods — Spring can't proxy them
// FIX: methods must be public (or at least package-protected with CGLIB)

// PITFALL 3: Catching exceptions silently
@Transactional
public void saveData() {
    try {
        repository.save(entity);
    } catch (Exception e) {
        log.error("Failed", e);
        // Transaction does NOT roll back — exception was swallowed
    }
}
// FIX: rethrow or use setRollbackOnly()
```

---

## Summary

Caching, events, and transactions are the backbone of a production-ready Spring application:

- **@Cacheable / @CacheEvict** — reduce database hits with declarative caching; keep cache consistent on writes.
- **ApplicationEvents** — publish-subscribe model for decoupled component communication.
- **@TransactionalEventListener** — react to events only after the transaction commits.
- **@Transactional** — wrap operations in DB transactions; control propagation, isolation, and rollback.

**Key Takeaways:**
- Use `@TransactionalEventListener(AFTER_COMMIT)` for side effects that depend on committed data.
- Use `readOnly = true` on read-only transactions — it skips dirty checking and can use read replicas.
- Never catch and swallow exceptions inside `@Transactional` — the transaction won't roll back.
- Cache data that is expensive to compute and changes infrequently; always evict on write.
- Self-invocation breaks both AOP caching and transactions — always call through the Spring proxy.
