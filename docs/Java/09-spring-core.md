---
title: "Spring Core"
sidebar_label: "Spring Core"
sidebar_position: 9
---

# Spring Core

Spring's foundation is the IoC (Inversion of Control) container managing beans through Dependency Injection. Everything else in the Spring ecosystem builds on this.

---

## IoC and Dependency Injection

Instead of objects creating their own dependencies, the Spring container creates and injects them.

```java
// Without DI — tightly coupled, hard to test
public class OrderService {
    private PaymentGateway gateway = new StripeGateway();  // hardcoded dependency
}

// With DI — loosely coupled, testable
public class OrderService {
    private final PaymentGateway gateway;
    public OrderService(PaymentGateway gateway) {  // injected
        this.gateway = gateway;
    }
}
```

---

## Component Scanning

```java
import org.springframework.stereotype.*;
import org.springframework.beans.factory.annotation.Autowired;

// ── Stereotype annotations — all are @Component under the hood ────────────
@Component         // generic Spring-managed bean
public class EmailValidator { }

@Service            // business logic layer
public class UserService { }

@Repository         // data access layer — also enables exception translation
public class UserRepository { }

@Controller          // web layer — returns view names
public class HomeController { }

@RestController       // web layer — returns response bodies directly (Controller + ResponseBody)
public class UserApiController { }

// ── Constructor injection (PREFERRED — immutable, testable, no reflection needed) ──
@Service
public class OrderService {
    private final UserService userService;
    private final PaymentService paymentService;

    // @Autowired is OPTIONAL on constructor if there's only one constructor (Spring 4.3+)
    public OrderService(UserService userService, PaymentService paymentService) {
        this.userService = userService;
        this.paymentService = paymentService;
    }
}

// ── Field injection (avoid — harder to test, hides dependencies) ──────────
@Service
public class LegacyService {
    @Autowired
    private UserService userService;   // can't be final, requires reflection
}

// ── Setter injection (rare — for optional dependencies) ───────────────────
@Service
public class NotificationService {
    private EmailService emailService;

    @Autowired(required = false)
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }
}

// Lombok shortcut for constructor injection
@Service
@RequiredArgsConstructor   // generates constructor for all final fields
public class OrderService {
    private final UserService userService;
    private final PaymentService paymentService;
}
```

---

## Java Configuration

```java
import org.springframework.context.annotation.*;

@Configuration
public class AppConfig {

    // @Bean — manually register a bean (for third-party classes you don't control)
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

    // Beans can depend on other beans via method parameters
    @Bean
    public UserService userService(UserRepository repo, PasswordEncoder encoder) {
        return new UserService(repo, encoder);
    }

    // Bean lifecycle hooks
    @Bean(initMethod = "connect", destroyMethod = "disconnect")
    public LegacyConnection legacyConnection() {
        return new LegacyConnection();
    }

    // Conditional beans
    @Bean
    @ConditionalOnProperty(name = "feature.cache.enabled", havingValue = "true")
    public CacheManager cacheManager() {
        return new CaffeineCacheManager();
    }

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(System.getenv("DATABASE_URL"));
        return ds;
    }
}

// Importing other configs
@Configuration
@Import({SecurityConfig.class, WebConfig.class})
@ComponentScan(basePackages = "com.example.app")
public class MainConfig { }

// PropertySource
@Configuration
@PropertySource("classpath:custom.properties")
public class CustomConfig { }
```

---

## Dependency Resolution

```java
// ── Multiple implementations — disambiguate with @Primary or @Qualifier ───
public interface PaymentProcessor {
    void process(BigDecimal amount);
}

@Component
@Primary   // default choice when multiple candidates exist
public class StripeProcessor implements PaymentProcessor {
    @Override public void process(BigDecimal amount) { }
}

@Component
public class PayPalProcessor implements PaymentProcessor {
    @Override public void process(BigDecimal amount) { }
}

@Service
public class CheckoutService {
    private final PaymentProcessor processor;   // injects StripeProcessor (it's @Primary)

    public CheckoutService(PaymentProcessor processor) {
        this.processor = processor;
    }
}

// @Qualifier — explicit selection
@Component("stripe")
public class StripeProcessor implements PaymentProcessor { }

@Component("paypal")
public class PayPalProcessor implements PaymentProcessor { }

@Service
public class CheckoutService {
    private final PaymentProcessor processor;

    public CheckoutService(@Qualifier("paypal") PaymentProcessor processor) {
        this.processor = processor;
    }
}

// ── Inject ALL implementations as a List or Map ────────────────────────────
@Service
public class PaymentRouter {
    private final List<PaymentProcessor> processors;        // all beans of this type
    private final Map<String, PaymentProcessor> processorsByName;  // bean name → bean

    public PaymentRouter(List<PaymentProcessor> processors,
                          Map<String, PaymentProcessor> processorsByName) {
        this.processors = processors;
        this.processorsByName = processorsByName;
    }

    public void route(String method, BigDecimal amount) {
        processorsByName.get(method).process(amount);
    }
}

// Order beans in the injected List
@Component
@Order(1)
public class FirstValidator implements Validator { }

@Component
@Order(2)
public class SecondValidator implements Validator { }

// ── Optional dependencies ───────────────────────────────────────────────
@Service
public class ReportService {
    private final Optional<CacheService> cacheService;  // may not exist

    public ReportService(Optional<CacheService> cacheService) {
        this.cacheService = cacheService;
    }

    public Report generate() {
        return cacheService
            .map(c -> c.get("report"))
            .orElseGet(this::computeReport);
    }
}

// ── @Value — inject configuration properties ───────────────────────────────
@Service
public class EmailService {
    @Value("${app.email.from}")
    private String fromAddress;

    @Value("${app.email.retry-count:3}")     // default value 3 if not set
    private int retryCount;

    @Value("#{systemProperties['user.home']}")  // SpEL
    private String userHome;

    @Value("${app.allowed-domains}")
    private List<String> allowedDomains;       // comma-separated → List
}
```

---

## Bean Scopes

```java
@Component
@Scope("singleton")    // DEFAULT — one instance per Spring container
public class UserService { }

@Component
@Scope("prototype")    // new instance every time it's requested
public class ShoppingCart { }

@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext { }   // one instance per HTTP request

@Component
@Scope(value = WebApplicationContext.SCOPE_SESSION, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserSession { }      // one instance per HTTP session

// Injecting a prototype bean into a singleton — gotcha!
@Service
public class OrderService {
    @Autowired
    private ShoppingCart cart;   // WRONG — injected ONCE at startup, never re-created

    // Correct: use ObjectProvider for fresh instance each call
    @Autowired
    private ObjectProvider<ShoppingCart> cartProvider;

    public void newOrder() {
        ShoppingCart freshCart = cartProvider.getObject();  // new prototype instance
    }
}
```

---

## Bean Lifecycle

```java
@Component
public class DatabaseConnectionPool {

    @PostConstruct   // called after dependency injection is complete
    public void init() {
        System.out.println("Connection pool initialized");
        // open connections, warm up cache, etc.
    }

    @PreDestroy       // called before bean is destroyed (container shutdown)
    public void cleanup() {
        System.out.println("Closing all connections");
    }
}

// Implementing interfaces (alternative to annotations)
public class MyBean implements InitializingBean, DisposableBean {
    @Override
    public void afterPropertiesSet() { /* init logic */ }

    @Override
    public void destroy() { /* cleanup logic */ }
}

// Bean lifecycle order:
// 1. Constructor called
// 2. Dependencies injected (@Autowired fields/setters)
// 3. @PostConstruct / afterPropertiesSet()
// 4. Bean ready to use
// ... application runs ...
// 5. @PreDestroy / destroy() (on container shutdown)
```

---

## Aspect-Oriented Programming (AOP)

AOP lets you add cross-cutting behavior (logging, security, transactions) without modifying the target code.

```java
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.ProceedingJoinPoint;

@Aspect
@Component
public class LoggingAspect {

    // Pointcut expression — defines WHERE the advice applies
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceLayer() {}

    // @Before — runs before the matched method
    @Before("serviceLayer()")
    public void logBefore(JoinPoint jp) {
        System.out.println("Calling: " + jp.getSignature().getName());
    }

    // @After — runs after (regardless of outcome)
    @After("serviceLayer()")
    public void logAfter(JoinPoint jp) {
        System.out.println("Finished: " + jp.getSignature().getName());
    }

    // @AfterReturning — runs after successful return, access to result
    @AfterReturning(pointcut = "serviceLayer()", returning = "result")
    public void logSuccess(JoinPoint jp, Object result) {
        System.out.println(jp.getSignature().getName() + " returned: " + result);
    }

    // @AfterThrowing — runs after exception
    @AfterThrowing(pointcut = "serviceLayer()", throwing = "ex")
    public void logError(JoinPoint jp, Exception ex) {
        System.err.println(jp.getSignature().getName() + " threw: " + ex.getMessage());
    }

    // @Around — full control: can modify args, skip execution, alter result
    @Around("serviceLayer()")
    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();    // call the actual method
            return result;
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.println(pjp.getSignature().getName() + " took " + duration + "ms");
        }
    }
}

// Custom annotation-based pointcuts
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogExecutionTime { }

@Aspect
@Component
public class TimingAspect {
    @Around("@annotation(LogExecutionTime)")
    public Object logTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        Object result = pjp.proceed();
        long elapsed = (System.nanoTime() - start) / 1_000_000;
        System.out.println(pjp.getSignature() + " took " + elapsed + "ms");
        return result;
    }
}

@Service
public class ReportService {
    @LogExecutionTime
    public Report generateMonthlyReport() {
        // automatically timed by the aspect
        return computeReport();
    }
}

// Pointcut expression syntax
// execution(modifiers? return-type declaring-type? method-name(params) throws?)
"execution(public * com.example..*Service.*(..))"   // any method in *Service classes
"execution(* com.example.service.UserService.find*(..))"  // find* methods in UserService
"within(com.example.service..*)"                     // all joinpoints within package
"@annotation(com.example.Loggable)"                  // methods with @Loggable
"@within(org.springframework.stereotype.Service)"    // all methods in @Service classes
"args(String, ..)"                                    // methods with first arg String
"this(com.example.SomeInterface)"                     // proxy implements interface
"target(com.example.SomeClass)"                       // target object is instance of class

// Combining pointcuts
@Pointcut("execution(* com.example.service.*.*(..))")
public void serviceLayer() {}

@Pointcut("@annotation(org.springframework.transaction.annotation.Transactional)")
public void transactional() {}

@Before("serviceLayer() && transactional()")
public void beforeTransactionalServiceMethod() { }
```

---

## Application Events

```java
import org.springframework.context.ApplicationEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;

// Event class (POJO — no need to extend ApplicationEvent since Spring 4.2)
public record UserRegisteredEvent(String userId, String email) {}

// Publishing
@Service
public class UserService {
    private final ApplicationEventPublisher publisher;

    public UserService(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void register(String email) {
        // ... save user
        publisher.publishEvent(new UserRegisteredEvent(userId, email));
    }
}

// Listening
@Component
public class EmailNotifier {
    @EventListener
    public void onUserRegistered(UserRegisteredEvent event) {
        sendWelcomeEmail(event.email());
    }

    // Multiple listeners can listen to the same event — all run synchronously by default
    @EventListener
    @Async                          // run asynchronously (requires @EnableAsync)
    public void sendAnalytics(UserRegisteredEvent event) {
        analyticsService.track("user_registered", event.userId());
    }

    // Conditional listener
    @EventListener(condition = "#event.email.endsWith('@company.com')")
    public void onInternalUserRegistered(UserRegisteredEvent event) {
        notifyTeam(event);
    }

    // Ordering multiple listeners for the same event
    @EventListener
    @Order(1)
    public void firstListener(UserRegisteredEvent event) { }

    // Transaction-bound events — only fire after commit
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterCommit(UserRegisteredEvent event) {
        // safe to assume the DB write succeeded
    }
}

// Built-in Spring events you can listen to
@EventListener
public void onContextRefreshed(ContextRefreshedEvent event) { }   // app fully started

@EventListener
public void onContextClosed(ContextClosedEvent event) { }         // app shutting down
```

---

## SpEL (Spring Expression Language)

```java
// In @Value
@Value("#{2 + 3}")
private int sum;   // 5

@Value("#{systemProperties['user.region']}")
private String region;

@Value("#{userService.defaultRole}")    // reference another bean's property
private String defaultRole;

@Value("#{userService.findAll().size()}")  // call methods
private int userCount;

// Conditional
@Value("#{systemProperties['env'] == 'prod' ? 'https://api.prod.com' : 'http://localhost:8080'}")
private String apiUrl;

// In @PreAuthorize (Spring Security)
@PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
public User getUser(Long userId) { ... }

// In @Cacheable
@Cacheable(value = "users", key = "#id", condition = "#id > 0")
public User findById(Long id) { ... }
```

---

## Environment and Profiles

```java
@Component
public class FeatureChecker {
    @Autowired
    private Environment env;

    public void check() {
        String dbUrl = env.getProperty("spring.datasource.url");
        boolean isProd = env.acceptsProfiles(Profiles.of("prod"));
        String[] activeProfiles = env.getActiveProfiles();
        boolean hasFeature = env.getProperty("feature.x.enabled", Boolean.class, false);
    }
}

// Profile-specific beans
@Profile("dev")
@Component
public class DevEmailService implements EmailService {
    @Override
    public void send(String to, String subject, String body) {
        System.out.println("DEV MODE — would send: " + subject);
    }
}

@Profile("prod")
@Component
public class SmtpEmailService implements EmailService {
    @Override
    public void send(String to, String subject, String body) {
        // actually send via SMTP
    }
}

// Activating profiles
// application.properties: spring.profiles.active=dev
// Command line: java -jar app.jar --spring.profiles.active=prod
// Environment variable: SPRING_PROFILES_ACTIVE=prod
// Programmatically: SpringApplication.setAdditionalProfiles("dev")

// Multiple profiles
@Profile({"dev", "test"})  // active if EITHER profile is active
@Component
public class NonProdOnlyBean { }

@Profile("!prod")  // active if prod is NOT active
@Component
public class NonProdBean { }
```

---

## Summary

- Constructor injection is the recommended DI style — immutable fields, explicit dependencies, easy to test.
- `@Component`/`@Service`/`@Repository`/`@Controller` are functionally identical but communicate intent and trigger framework-specific behavior (e.g. exception translation for `@Repository`).
- Use `@Primary` for a default implementation, `@Qualifier` to select a specific one explicitly.
- Bean scope is `singleton` by default — use `ObjectProvider` to get fresh `prototype` instances inside a singleton.
- `@PostConstruct`/`@PreDestroy` hook into the bean lifecycle for setup/cleanup.
- AOP with `@Aspect` and pointcut expressions adds cross-cutting concerns (logging, timing, security) without polluting business logic.
- Application events (`ApplicationEventPublisher` + `@EventListener`) decouple side effects from the triggering action.
- `@Profile` lets you swap implementations per environment (dev/test/prod) without code changes.
