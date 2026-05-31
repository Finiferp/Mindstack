---
title: "Spring Framework Core"
sidebar_label: "Spring Core"
sidebar_position: 9
---

# Spring Framework Core

Spring is the most widely used Java application framework. Its foundation is the **IoC container** (Inversion of Control) and **dependency injection** — the framework creates and wires your objects together. On top of that, Spring provides AOP, data access, web MVC, security, and much more. Spring Boot makes all of it production-ready with minimal configuration.

---

## Inversion of Control and Dependency Injection

In traditional code, a class creates its own dependencies:
```java
// Without DI — tight coupling
public class OrderService {
    private PaymentGateway gateway = new StripeGateway(); // hardcoded
}
```

With Spring, the framework creates and injects dependencies:
```java
// With DI — loose coupling, testable
@Service
public class OrderService {

    private final PaymentGateway gateway;

    public OrderService(PaymentGateway gateway) {  // injected by Spring
        this.gateway = gateway;
    }
}
```

Spring's IoC container (the `ApplicationContext`) manages **beans** — objects it creates, configures, and wires together.

---

## Defining Beans

### Stereotype Annotations
```java
@Component   // generic Spring-managed bean
@Service     // service layer (business logic)
@Repository  // data access layer (also translates exceptions)
@Controller  // Spring MVC controller
@RestController // @Controller + @ResponseBody
```

```java
@Service
public class UserService {
    // Spring creates this bean and manages its lifecycle
}

@Repository
public class UserRepository {
    // Spring creates this bean
}
```

### @Configuration + @Bean
For beans you can't annotate directly (third-party classes) or that need construction logic:

```java
@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            .registerModule(new JavaTimeModule());
    }

    @Bean
    @Profile("production")  // only active in production profile
    public EmailService emailService() {
        return new SmtpEmailService(smtpHost(), smtpPort());
    }

    @Bean
    @Profile("development")
    public EmailService emailService() {
        return new MockEmailService();
    }

    @Value("${smtp.host}")
    private String smtpHost;

    @Value("${smtp.port:587}")
    private int smtpPort;
}
```

---

## Dependency Injection

### Constructor Injection (preferred)
```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final NotificationService notificationService;

    // @Autowired is optional when there's only one constructor (Spring 4.3+)
    public OrderService(OrderRepository orderRepository,
                        PaymentGateway paymentGateway,
                        NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.notificationService = notificationService;
    }
}
```

### Field Injection (not recommended for production)
```java
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository; // harder to test, hides dependencies
}
```

### Setter Injection (for optional dependencies)
```java
@Service
public class ReportService {

    private EmailService emailService;

    @Autowired(required = false)
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }
}
```

**Tips:**
- Use constructor injection — it makes dependencies explicit, supports immutability (`final`), and is easy to test.
- When there are multiple beans of the same type, use `@Qualifier("beanName")` or `@Primary` to disambiguate.
- `@Autowired` without qualification fails if there are zero or multiple matching beans.

---

## @Qualifier and @Primary

```java
public interface MessageSender {
    void send(String message);
}

@Component("sms")
public class SmsSender implements MessageSender { ... }

@Component("email")
@Primary  // default when no @Qualifier specified
public class EmailSender implements MessageSender { ... }

@Service
public class AlertService {

    @Autowired
    private MessageSender sender;  // gets EmailSender (it's @Primary)

    @Autowired
    @Qualifier("sms")
    private MessageSender smsSender; // explicitly gets SmsSender
}
```

---

## Bean Scopes

| Scope         | Lifecycle                                         |
|---------------|---------------------------------------------------|
| `singleton`   | One instance per container (default)              |
| `prototype`   | New instance on every injection/`getBean()` call  |
| `request`     | One instance per HTTP request (web apps)          |
| `session`     | One instance per HTTP session (web apps)          |
| `application` | One instance per `ServletContext`                 |

```java
@Component
@Scope("prototype")
public class ShoppingCart {
    // New instance for every user that needs one
}

@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext {
    // One per HTTP request; proxyMode needed when injecting into singletons
}
```

---

## Spring AOP — Aspect-Oriented Programming

AOP lets you add cross-cutting behavior (logging, security, transactions, metrics) without scattering that logic across every class.

### Concepts
- **Aspect** — the cross-cutting concern (e.g., logging aspect)
- **Advice** — the code that runs (before, after, around)
- **Pointcut** — where advice applies (which methods/classes)
- **Join Point** — a specific execution point (method call)

```java
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.ProceedingJoinPoint;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class LoggingAspect {

    // Pointcut: any method in any class under com.example.service
    @Pointcut("execution(* com.example.service.*.*(..))")
    private void serviceLayer() {}

    // Before advice — runs before the method
    @Before("serviceLayer()")
    public void logBefore(JoinPoint jp) {
        System.out.println("Calling: " + jp.getSignature().getName());
    }

    // After returning — runs after method returns successfully
    @AfterReturning(pointcut = "serviceLayer()", returning = "result")
    public void logAfterReturn(JoinPoint jp, Object result) {
        System.out.println("Returned from " + jp.getSignature().getName() + ": " + result);
    }

    // After throwing — runs if method throws
    @AfterThrowing(pointcut = "serviceLayer()", throwing = "ex")
    public void logException(JoinPoint jp, Exception ex) {
        System.err.println("Exception in " + jp.getSignature().getName() + ": " + ex.getMessage());
    }

    // Around — wraps the method, you control execution and return value
    @Around("serviceLayer()")
    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed(); // execute the actual method
            return result;
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.println(pjp.getSignature().getName() + " took " + duration + "ms");
        }
    }
}
```

### Custom Annotation Pointcut
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String action() default "";
}

@Aspect
@Component
public class AuditAspect {

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        System.out.println("Audit: " + audited.action());
        return pjp.proceed();
    }
}

// Usage
@Service
public class UserService {

    @Audited(action = "CREATE_USER")
    public User createUser(CreateUserRequest request) { ... }
}
```

**Tips:**
- AOP only works on Spring-managed beans (proxied by Spring). Calling `this.method()` within the same class bypasses AOP.
- Use `@Around` when you need to control execution, measure time, or handle exceptions.
- Use `@Before`/`@After` for simpler logging or auditing.
- Spring AOP uses JDK dynamic proxies for interfaces and CGLIB for classes.

---

## Configuration Properties

### application.properties / application.yml
```properties
# application.properties
server.port=8080
app.name=My Application
app.max-retries=3
app.database.url=jdbc:postgresql://localhost:5432/mydb
app.database.username=postgres
app.database.password=${DB_PASSWORD}  # from environment variable
```

```yaml
# application.yml
server:
  port: 8080
app:
  name: My Application
  max-retries: 3
  database:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: ${DB_PASSWORD}
```

### Injecting Properties
```java
// Single value injection
@Value("${app.name}")
private String appName;

@Value("${app.max-retries:3}")   // 3 is the default
private int maxRetries;

// Type-safe configuration class
@ConfigurationProperties(prefix = "app.database")
@Component
public class DatabaseProperties {
    private String url;
    private String username;
    private String password;
    // getters/setters or use @ConstructorBinding with record
}
```

### Profiles
Profiles activate different configurations per environment:

```java
@Profile("production")
@Component
public class ProductionDataSource implements DataSource { ... }

@Profile("!production")
@Component
public class H2DataSource implements DataSource { ... }
```

Activate with: `spring.profiles.active=production` in properties, or `-Dspring.profiles.active=production` as JVM arg.

---

## ApplicationContext and the Container

```java
// Bootstrap an ApplicationContext manually (rarely needed — Spring Boot handles it)
ApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class);

UserService service = ctx.getBean(UserService.class);
UserService byName = (UserService) ctx.getBean("userService");

// Access in a bean (rarely needed — prefer injection)
@Component
public class SomeBean implements ApplicationContextAware {

    private ApplicationContext ctx;

    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        this.ctx = ctx;
    }
}
```

### Lifecycle Events
```java
@Component
public class StartupRunner implements ApplicationListener<ContextRefreshedEvent> {
    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        System.out.println("Application started!");
    }
}

// Or with annotation
@Component
public class DataLoader {

    @PostConstruct
    public void init() {
        // Runs after the bean is fully initialized and all dependencies injected
        System.out.println("Bean ready!");
    }

    @PreDestroy
    public void cleanup() {
        // Runs when the application shuts down
        System.out.println("Cleaning up...");
    }
}
```

---

## Summary

Spring Core is built on a few powerful ideas:

- **IoC Container** — Spring creates and wires your objects; you don't `new` your dependencies.
- **Dependency Injection** — beans declare what they need; Spring provides it.
- **AOP** — cross-cutting concerns declared separately from business logic.
- **Configuration** — externalize properties, switch behavior by profile.

**Key Takeaways:**
- Always use constructor injection — it's explicit, testable, and supports immutability.
- Annotate with the most specific stereotype: `@Service`, `@Repository`, `@Controller` over plain `@Component`.
- AOP proxies break on self-invocation — don't call `this.advisedMethod()` expecting the aspect to fire.
- Use `@ConfigurationProperties` for complex, grouped configuration — far better than scattering `@Value` everywhere.
- `@PostConstruct` and `@PreDestroy` are the clean way to hook into bean lifecycle events.
