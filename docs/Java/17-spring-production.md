---
title: "Spring in Production"
sidebar_label: "Production & Deployment"
sidebar_position: 17
---

# Spring in Production

Writing a working application is one thing; running it reliably at scale is another. Production Spring Boot applications need proper logging, metrics, health checks, containerization, and thoughtful performance tuning. This section covers what you need to go from a working JAR to a production-grade service.

---

## Logging

Spring Boot uses **Logback** by default (configured via `application.yml` or `logback-spring.xml`). SLF4J is the logging facade — use it so you can swap the implementation without changing code.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    // Or with Lombok @Slf4j annotation:
    // @Slf4j
    // public class UserService { ...  }

    public User createUser(CreateUserRequest request) {
        log.debug("Creating user with email: {}", request.email()); // param substitution — no string concat
        log.info("Creating new user: {}", request.email());

        try {
            User user = userRepository.save(new User(request));
            log.info("User created successfully: id={}, email={}", user.getId(), user.getEmail());
            return user;
        } catch (Exception e) {
            log.error("Failed to create user with email {}: {}", request.email(), e.getMessage(), e);
            throw e;
        }
    }
}
```

### Log Level Configuration

```yaml
logging:
  level:
    root: INFO                           # default level
    com.example.myapp: DEBUG            # your application — verbose
    org.springframework.web: WARN       # Spring MVC — less noise
    org.hibernate.SQL: DEBUG            # show all SQL
    org.hibernate.type.descriptor.sql: TRACE  # show SQL bind parameters

  # Log format
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"

  # File output
  file:
    name: logs/app.log
    max-size: 100MB
    max-history: 30
```

### Structured Logging (JSON for log aggregators)

```xml
<!-- Add to pom.xml for JSON log output -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>

    <springProfile name="production">
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>

    <springProfile name="!production">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} %-5level %logger{30} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

**Tips:**
- Use parameterized logging: `log.debug("User: {}", user)` not `log.debug("User: " + user)` — the string concatenation runs even when debug is disabled.
- Log at DEBUG for development diagnostics, INFO for business events, WARN for recoverable issues, ERROR for failures.
- In production, output JSON logs — aggregators (ELK stack, Datadog, Grafana Loki) parse them automatically.
- Include a correlation/trace ID in logs for tracing requests across services.

---

## Metrics with Micrometer

Micrometer is included in `spring-boot-starter-actuator`. It's a vendor-neutral metrics facade — export to Prometheus, Datadog, CloudWatch, etc.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
```

### Custom Metrics

```java
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;
    private final Timer orderProcessingTimer;

    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("service", "orders")
            .register(meterRegistry);
        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time to process an order")
            .register(meterRegistry);
    }

    public Order placeOrder(PlaceOrderRequest request) {
        return orderProcessingTimer.record(() -> {
            Order order = processOrder(request);
            orderCounter.increment();
            meterRegistry.gauge("orders.active", getActiveOrderCount());
            return order;
        });
    }

    // Or use annotations
    @Timed(value = "orders.processing.time", description = "Order processing time")
    @Counted(value = "orders.created", description = "Orders created")
    public Order placeOrderAnnotated(PlaceOrderRequest request) {
        return processOrder(request);
    }
}
```

### Prometheus Scrape Config (kubernetes/docker)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['myapp:8080']
```

---

## Health Checks

Actuator's `/actuator/health` aggregates all health indicators. Load balancers and Kubernetes use this to route traffic.

```yaml
management:
  endpoint:
    health:
      show-details: always            # or 'when-authorized'
      show-components: always
  health:
    db:
      enabled: true                   # checks datasource connectivity
    diskspace:
      enabled: true
      threshold: 10485760             # 10MB free minimum
    redis:
      enabled: true
```

```java
@Component
public class ExternalServiceHealthIndicator extends AbstractHealthIndicator {

    private final RestClient externalClient;

    @Override
    protected void doHealthCheck(Health.Builder builder) throws Exception {
        try {
            ResponseEntity<Void> resp = externalClient.get()
                .uri("/health")
                .retrieve()
                .toBodilessEntity();

            if (resp.getStatusCode().is2xxSuccessful()) {
                builder.up()
                    .withDetail("service", "external-api")
                    .withDetail("status", "reachable");
            } else {
                builder.down().withDetail("reason", "non-2xx response: " + resp.getStatusCode());
            }
        } catch (Exception e) {
            builder.down(e);
        }
    }
}
```

### Kubernetes Liveness and Readiness

Spring Boot 2.3+ exposes dedicated probes:

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

```yaml
# kubernetes deployment.yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 20
  periodSeconds: 5
```

---

## Containerization with Docker

### Dockerfile (simple)

```dockerfile
FROM eclipse-temurin:21-jre-alpine

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY target/my-app-1.0.0.jar app.jar

USER appuser

EXPOSE 8080

# JVM options for containers: limit heap, enable container awareness
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseContainerSupport", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
```

### Dockerfile (layered — faster rebuilds)

Spring Boot creates layered JARs by default. Dependencies change less often than your code, so putting them in an earlier Docker layer means faster rebuilds.

```dockerfile
FROM eclipse-temurin:21-jre-alpine AS builder
WORKDIR /app
COPY target/my-app-1.0.0.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

### Docker Compose (local development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres-data:
```

---

## Performance Tuning

### JVM Options for Production

```bash
java \
  -server \
  -XX:+UseG1GC \                        # G1 GC (default Java 9+)
  -XX:MaxRAMPercentage=75.0 \           # use 75% of container memory for heap
  -XX:+UseContainerSupport \            # respect container CPU/memory limits
  -XX:+HeapDumpOnOutOfMemoryError \     # dump heap on OOM for diagnosis
  -XX:HeapDumpPath=/tmp/heapdump.hprof \
  -Xss512k \                            # reduce thread stack size
  -jar app.jar
```

### HikariCP Connection Pool Tuning

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10         # rule of thumb: (cpu_cores * 2) + disk_spindles
      minimum-idle: 5
      connection-timeout: 30000     # 30s — max wait for connection from pool
      idle-timeout: 600000          # 10min — remove idle connections
      max-lifetime: 1800000         # 30min — recycle connections (before DB closes them)
      validation-timeout: 5000
      connection-test-query: SELECT 1
```

### JPA Query Optimization

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50             # batch INSERT/UPDATE
          fetch_size: 50             # fetch rows in batches from DB cursor
        order_inserts: true          # group inserts for better batching
        order_updates: true
        generate_statistics: false   # enable temporarily for diagnosis
```

```java
// Detect N+1 queries with Hibernate statistics
// Or use the datasource-proxy library to log individual SQL with counts
```

---

## Graceful Shutdown

Spring Boot 2.3+ supports graceful shutdown — in-flight requests finish before the server stops.

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s  # wait up to 30s for active requests
```

```java
// Hook into shutdown for cleanup
@Component
public class ShutdownHook {

    @PreDestroy
    public void onShutdown() {
        log.info("Application shutting down — cleaning up resources");
        // close connections, flush queues, etc.
    }
}
```

---

## Environment-Specific Configuration Best Practices

```yaml
# application.yml — shared defaults
spring:
  application:
    name: my-service

---
# application-dev.yml
spring:
  datasource:
    url: jdbc:h2:mem:devdb
  jpa:
    show-sql: true
logging:
  level:
    com.example: DEBUG

---
# application-prod.yml
spring:
  datasource:
    url: ${DATABASE_URL}          # from env var
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
  jpa:
    show-sql: false
logging:
  level:
    root: WARN
    com.example: INFO
management:
  endpoint:
    health:
      show-details: when-authorized
```

**Never commit secrets.** Use:
- Environment variables (simplest)
- Kubernetes Secrets
- HashiCorp Vault (`spring-cloud-vault`)
- AWS Secrets Manager (`spring-cloud-aws`)

---

## Summary

Production-ready Spring Boot applications require more than working code:

- **Logging** — structured JSON logs, correlated by request ID, at the right levels.
- **Metrics** — Micrometer + Prometheus + Grafana for operational visibility.
- **Health checks** — Actuator endpoints consumed by load balancers and Kubernetes.
- **Docker** — layered images for fast builds; non-root users for security.
- **JVM tuning** — container-aware heap sizing, G1GC, connection pool sizing.
- **Graceful shutdown** — finish in-flight requests before stopping.

**Key Takeaways:**
- Set `MaxRAMPercentage` and `UseContainerSupport` JVM flags — without them, the JVM ignores container memory limits.
- Use layered Docker builds — they cut rebuild time from minutes to seconds when only your code changes.
- Never log secrets or PII, even at DEBUG level.
- Size the HikariCP pool based on your database server's capacity, not your application's demand.
- Use graceful shutdown in production — abrupt termination drops in-flight requests.
