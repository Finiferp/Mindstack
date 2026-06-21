---
title: "Caching, Events & Transactions"
sidebar_label: "Caching & Transactions"
sidebar_position: 15
---

# Caching, Events & Transactions

Deep dive into Spring's caching abstraction, the application event system, and the nuances of `@Transactional` that trip up most developers.

---

## Caching Abstraction

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<!-- Plus a cache provider: caffeine, redis, ehcache, or the default ConcurrentHashMap -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("users", "products", "orders");
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return manager;
    }
}
```

### Cache Annotations

```java
@Service
public class UserService {

    // @Cacheable — cache the return value, key by arguments
    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        System.out.println("Fetching from DB...");   // only prints on cache miss
        return userRepository.findById(id).orElseThrow();
    }

    // Conditional caching
    @Cacheable(value = "users", key = "#id", condition = "#id > 0", unless = "#result == null")
    public User findByIdConditional(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    // Composite key from multiple parameters
    @Cacheable(value = "userSearch", key = "#name + '-' + #role")
    public List<User> search(String name, Role role) {
        return userRepository.findByNameAndRole(name, role);
    }

    // Custom key generator
    @Cacheable(value = "users", keyGenerator = "customKeyGenerator")
    public User findByIdCustomKey(Long id) { return null; }

    // @CachePut — ALWAYS execute method, update cache with result (for writes)
    @CachePut(value = "users", key = "#user.id")
    public User update(User user) {
        return userRepository.save(user);
    }

    // @CacheEvict — remove from cache
    @CacheEvict(value = "users", key = "#id")
    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    // Evict all entries
    @CacheEvict(value = "users", allEntries = true)
    public void clearAllUserCache() { }

    // Evict before method execution (vs after, the default)
    @CacheEvict(value = "users", key = "#id", beforeInvocation = true)
    public void deleteEvictFirst(Long id) {
        userRepository.deleteById(id);
    }

    // Combine multiple cache operations
    @Caching(
        put   = { @CachePut(value = "users", key = "#user.id") },
        evict = { @CacheEvict(value = "userSearch", allEntries = true) }
    )
    public User updateAndClearSearchCache(User user) {
        return userRepository.save(user);
    }
}

@Component
public class CustomKeyGenerator implements KeyGenerator {
    @Override
    public Object generate(Object target, Method method, Object... params) {
        return target.getClass().getSimpleName() + "_" + method.getName() + "_" +
               Arrays.stream(params).map(String::valueOf).collect(Collectors.joining("_"));
    }
}
```

### Redis Cache Configuration

```java
@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
            "users", config.entryTtl(Duration.ofMinutes(30)),
            "products", config.entryTtl(Duration.ofHours(1))
        );

        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

### Manual Cache Access

```java
@Service
public class ManualCacheService {
    private final CacheManager cacheManager;

    public ManualCacheService(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    public void manualOps() {
        Cache cache = cacheManager.getCache("users");
        cache.put("key", value);
        Cache.ValueWrapper wrapper = cache.get("key");
        User user = cache.get("key", User.class);
        cache.evict("key");
        cache.clear();
    }
}
```

---

## Application Events Deep Dive

```java
// Domain event
public record OrderPlacedEvent(Long orderId, Long userId, BigDecimal total, Instant occurredAt) {
    public OrderPlacedEvent(Long orderId, Long userId, BigDecimal total) {
        this(orderId, userId, total, Instant.now());
    }
}

@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;
    private final OrderRepository orderRepository;

    @Transactional
    public Order placeOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(buildOrder(request));
        publisher.publishEvent(new OrderPlacedEvent(order.getId(), order.getUserId(), order.getTotal()));
        return order;
        // If an exception is thrown AFTER publishEvent but the transaction rolls back,
        // a regular @EventListener would have ALREADY fired — even though the order was never saved!
    }
}

// PROBLEM: regular @EventListener fires synchronously, even if transaction later rolls back
@Component
public class InventoryListener {
    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        // This runs even if the surrounding transaction eventually rolls back!
        inventoryService.reserve(event.orderId());
    }
}

// SOLUTION: @TransactionalEventListener — only fires after commit
@Component
public class InventoryListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        // Only runs if the transaction actually committed successfully
        inventoryService.reserve(event.orderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onOrderFailed(OrderPlacedEvent event) {
        // Compensating action if the order transaction rolled back
        log.warn("Order {} failed, releasing any holds", event.orderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void beforeCommit(OrderPlacedEvent event) {
        // Last chance to do something (and still roll back if this throws)
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION)
    public void afterCompletion(OrderPlacedEvent event) {
        // Runs after commit OR rollback — good for cleanup/logging
    }
}

// If there's NO active transaction when the event is published,
// @TransactionalEventListener does NOT fire by default. Use fallbackExecution = true to change this:
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
public void onEventEvenWithoutTransaction(OrderPlacedEvent event) { }

// Async event listener — runs on a separate thread
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-event-");
        executor.initialize();
        return executor;
    }
}

@Component
public class EmailListener {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendConfirmationEmail(OrderPlacedEvent event) {
        // Runs asynchronously AFTER the order transaction commits
        emailService.sendOrderConfirmation(event.orderId());
    }
}
```

---

## @Transactional Deep Dive

```java
@Service
public class TransferService {

    // Basic usage — default propagation REQUIRED, default isolation from DB
    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepo.findById(fromId).orElseThrow();
        Account to   = accountRepo.findById(toId).orElseThrow();

        from.withdraw(amount);
        to.deposit(amount);
        // accountRepo.save() not even needed — managed entities flush automatically
        // Exception anywhere here → entire transaction rolls back
    }

    // Read-only optimization — hint to DB driver, prevents accidental writes, can improve performance
    @Transactional(readOnly = true)
    public List<Account> findAll() {
        return accountRepo.findAll();
    }

    // Custom rollback rules
    @Transactional(rollbackFor = Exception.class)               // rollback on checked exceptions too (default: only unchecked)
    public void riskyOperation() throws IOException { }

    @Transactional(noRollbackFor = ValidationException.class)   // don't rollback for this specific exception
    public void operationWithSoftFailure() { }

    // Timeout
    @Transactional(timeout = 10)   // seconds
    public void longRunningOperation() { }

    // Isolation levels
    @Transactional(isolation = Isolation.READ_COMMITTED)    // default for most DBs
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Transactional(isolation = Isolation.SERIALIZABLE)       // strictest, lowest concurrency
    @Transactional(isolation = Isolation.READ_UNCOMMITTED)   // dirty reads possible
    public void isolatedOperation() { }
}
```

### Propagation Types

```java
@Service
public class AuditService {

    // REQUIRED (default) — join existing transaction, or create new one if none exists
    @Transactional(propagation = Propagation.REQUIRED)
    public void normalOperation() { }

    // REQUIRES_NEW — ALWAYS starts a new transaction, suspends any existing one
    // Use for: audit logs that should persist even if the calling transaction rolls back
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void auditLog(String message) {
        auditRepository.save(new AuditEntry(message));
        // This commits independently — even if the caller's transaction later fails
    }

    // SUPPORTS — join if a transaction exists, otherwise run non-transactionally
    @Transactional(propagation = Propagation.SUPPORTS)
    public void flexibleOperation() { }

    // NOT_SUPPORTED — suspend any existing transaction, run without one
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void nonTransactionalOperation() { }

    // MANDATORY — must be called within an existing transaction, throws if none
    @Transactional(propagation = Propagation.MANDATORY)
    public void mustHaveTransaction() { }

    // NEVER — throws if called within a transaction
    @Transactional(propagation = Propagation.NEVER)
    public void mustNotHaveTransaction() { }

    // NESTED — creates a savepoint; rollback only undoes work since the savepoint
    @Transactional(propagation = Propagation.NESTED)
    public void nestedOperation() { }
}
```

### Common @Transactional Pitfalls

```java
// PITFALL 1: Self-invocation bypasses the proxy — @Transactional doesn't apply!
@Service
public class OrderService {
    public void placeOrder() {
        this.saveOrder();   // WRONG — calling through 'this' skips the Spring proxy
    }

    @Transactional
    public void saveOrder() { /* transaction NOT actually applied when called above */ }
}
// FIX: move saveOrder() to a different bean, or inject self via ApplicationContext

// PITFALL 2: @Transactional on private methods doesn't work — proxies can't intercept private methods
@Transactional
private void thisWontWork() { }   // annotation silently ignored

// PITFALL 3: Catching exceptions inside the method prevents rollback
@Transactional
public void brokenErrorHandling() {
    try {
        riskyOperation();
    } catch (Exception e) {
        log.error("failed", e);   // exception swallowed — transaction commits anyway!
    }
}
// FIX: either don't catch, or call setRollbackOnly()
@Transactional
public void fixedErrorHandling() {
    try {
        riskyOperation();
    } catch (Exception e) {
        log.error("failed", e);
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}

// PITFALL 4: Checked exceptions don't trigger rollback by default
@Transactional   // by default only RuntimeException/Error trigger rollback
public void checkedExceptionPitfall() throws IOException {
    throw new IOException("this will NOT rollback the transaction by default!");
}
// FIX:
@Transactional(rollbackFor = Exception.class)
public void fixedCheckedException() throws IOException {
    throw new IOException("now this WILL rollback");
}

// PITFALL 5: Long-running transactions holding DB connections
@Transactional
public void badPractice() {
    List<User> users = userRepository.findAll();
    for (User user : users) {
        callExternalApi(user);   // slow! holds the DB transaction/connection open the whole time
    }
}
// FIX: separate the DB work from external calls
public void betterPractice() {
    List<User> users = userRepository.findAll();   // short transaction
    for (User user : users) {
        callExternalApi(user);    // outside any transaction
    }
}
```

---

## Summary

- `@Cacheable` caches a method's return value; `@CachePut` always runs the method AND updates the cache; `@CacheEvict` removes entries.
- Use SpEL in the `key` attribute to build composite cache keys from multiple parameters.
- `@TransactionalEventListener(phase = AFTER_COMMIT)` is essential for events that should only fire after successful persistence — regular `@EventListener` fires even if the transaction later rolls back.
- `REQUIRES_NEW` propagation is the standard pattern for audit logs that must survive a parent transaction's rollback.
- Self-invocation (`this.method()`) bypasses Spring's proxy — `@Transactional` silently does nothing when called this way.
- By default, only unchecked exceptions trigger rollback — add `rollbackFor = Exception.class` if you need checked exceptions to roll back too.
- Keep transactions short — never make slow external calls (HTTP, email) inside a `@Transactional` method.
