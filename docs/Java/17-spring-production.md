---
title: "Spring Production"
sidebar_label: "Production"
sidebar_position: 17
---

# Spring Production

Running Spring Boot in production requires structured logging, metrics, health checks, proper JVM tuning, and graceful shutdown handling.

---

## Logging with Logback

Spring Boot uses Logback by default.

```xml
<!-- src/main/resources/logback-spring.xml -->
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <springProfile name="dev">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} %highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <!-- JSON structured logging for log aggregators (ELK, Datadog, CloudWatch) -->
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <customFields>{"service":"my-app","env":"production"}</customFields>
            </encoder>
        </appender>

        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/app.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/app.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
                <maxFileSize>100MB</maxFileSize>
                <maxHistory>30</maxHistory>
                <totalSizeCap>3GB</totalSizeCap>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        </appender>

        <root level="INFO">
            <appender-ref ref="JSON"/>
            <appender-ref ref="FILE"/>
        </root>

        <logger name="org.hibernate.SQL" level="WARN"/>
        <logger name="com.example" level="INFO"/>
    </springProfile>
</configuration>
```

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    // Or with Lombok: @Slf4j on the class, then just use `log`

    public void placeOrder(Order order) {
        log.info("Placing order for user {}", order.getUserId());

        try {
            process(order);
            log.info("Order {} placed successfully, total={}", order.getId(), order.getTotal());
        } catch (Exception e) {
            log.error("Failed to place order for user {}", order.getUserId(), e);  // pass exception last
            throw e;
        }

        // Structured logging with MDC (Mapped Diagnostic Context) — adds context to every log line
        MDC.put("orderId", order.getId().toString());
        MDC.put("userId", order.getUserId().toString());
        try {
            log.info("Processing payment");   // includes orderId and userId automatically
            processPayment(order);
        } finally {
            MDC.clear();
        }
    }
}

// Log levels (most to least severe)
log.error("Something failed", exception);   // errors requiring attention
log.warn("Unusual condition");               // potential issues, degraded behavior
log.info("Order placed: {}", orderId);       // significant business events
log.debug("Cache hit for key: {}", key);     // detailed diagnostic info
log.trace("Entering method with args: {}", args);  // very fine-grained
```

```properties
# application.properties — runtime logging config
logging.level.root=INFO
logging.level.com.example=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.orm.jdbc.bind=TRACE   # log SQL parameter values
```

---

## Micrometer Metrics

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.metrics.tags.application=${spring.application.name}
management.metrics.distribution.percentiles-histogram.http.server.requests=true
```

```java
@Service
public class OrderMetrics {
    private final Counter ordersPlaced;
    private final Timer orderProcessingTime;
    private final DistributionSummary orderValueSummary;

    public OrderMetrics(MeterRegistry registry) {
        this.ordersPlaced = Counter.builder("orders.placed")
            .description("Total number of orders placed")
            .tag("type", "online")
            .register(registry);

        this.orderProcessingTime = Timer.builder("orders.processing.time")
            .description("Time to process an order")
            .register(registry);

        this.orderValueSummary = DistributionSummary.builder("orders.value")
            .description("Distribution of order values")
            .baseUnit("dollars")
            .register(registry);

        // Gauge — current value of something (e.g. queue size)
        Gauge.builder("orders.queue.size", this, OrderMetrics::getQueueSize)
            .register(registry);
    }

    public void recordOrder(Order order) {
        ordersPlaced.increment();
        orderValueSummary.record(order.getTotal().doubleValue());
    }

    public void recordProcessingTime(Runnable task) {
        orderProcessingTime.record(task);
    }

    private double getQueueSize() { return 0; }   // implement actual gauge logic
}

// Auto-instrumented metrics already provided:
// http.server.requests — request count, latency by endpoint/status
// jvm.memory.used, jvm.memory.max — heap/non-heap memory
// jvm.gc.pause — garbage collection pauses
// process.cpu.usage — CPU usage
// hikaricp.connections — connection pool stats (if using HikariCP)
// jdbc.connections.active — active DB connections
```

```bash
GET /actuator/prometheus    # Prometheus-format metrics scrape endpoint
GET /actuator/metrics/http.server.requests
GET /actuator/metrics/jvm.memory.used?tag=area:heap
```

---

## Health Checks

```java
@Component
public class ExternalServiceHealthIndicator implements HealthIndicator {
    private final RestClient restClient;

    @Override
    public Health health() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            return Health.up().build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .withDetail("service", "payment-gateway")
                .build();
        }
    }
}

@Component
public class DiskSpaceHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        File path = new File("/");
        long freeSpace = path.getFreeSpace();
        long threshold = 1_000_000_000L; // 1GB

        if (freeSpace < threshold) {
            return Health.down()
                .withDetail("free", freeSpace)
                .withDetail("threshold", threshold)
                .build();
        }
        return Health.up().withDetail("free", freeSpace).build();
    }
}
```

```properties
management.endpoint.health.show-details=when-authorized
management.endpoint.health.probes.enabled=true
management.health.livenessstate.enabled=true
management.health.readinessstate.enabled=true
```

```bash
GET /actuator/health           # overall health (UP/DOWN)
GET /actuator/health/liveness  # is the JVM running? (k8s liveness probe)
GET /actuator/health/readiness # ready to accept traffic? (k8s readiness probe)
```

---

## JVM Tuning

```bash
# Memory settings
java -Xms512m -Xmx2g \                    # initial/max heap size
     -XX:MaxMetaspaceSize=256m \          # metaspace (class metadata)
     -XX:+UseG1GC \                       # G1 garbage collector (good default for most apps)
     -XX:MaxGCPauseMillis=200 \           # target max GC pause
     -jar app.jar

# Container-aware settings (important in Docker/Kubernetes)
java -XX:+UseContainerSupport \           # respect container memory limits (default since Java 10)
     -XX:MaxRAMPercentage=75.0 \          # use 75% of container memory for heap
     -jar app.jar

# GC logging (for diagnosing pause times)
java -Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=10M \
     -jar app.jar

# Heap dump on OOM (for post-mortem analysis)
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/var/dumps/ \
     -jar app.jar

# Common production flags
java -server \
     -Xms1g -Xmx1g \                      # same min/max avoids resize pauses
     -XX:+UseG1GC \
     -XX:+UseContainerSupport \
     -XX:MaxRAMPercentage=75.0 \
     -XX:+HeapDumpOnOutOfMemoryError \
     -Djava.security.egd=file:/dev/./urandom \  # faster startup (avoid blocking entropy)
     -jar app.jar
```

---

## Graceful Shutdown

```properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s
```

```java
@Component
public class ShutdownHook {

    @PreDestroy
    public void onShutdown() {
        log.info("Application shutting down, finishing in-flight requests...");
        // Spring Boot's graceful shutdown automatically:
        // 1. Stops accepting new requests
        // 2. Waits for in-flight requests to complete (up to timeout)
        // 3. Then shuts down the application context
    }
}

// Custom shutdown logic for resources Spring doesn't manage automatically
@Component
public class CustomResourceCleanup implements DisposableBean {
    private final ExecutorService executorService;

    @Override
    public void destroy() throws Exception {
        executorService.shutdown();
        if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
            executorService.shutdownNow();
        }
    }
}
```

```yaml
# Kubernetes — give the app time to drain before SIGKILL
spec:
  terminationGracePeriodSeconds: 45
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 10"]  # allow load balancer to deregister pod first
```

---

## Connection Pool Tuning (HikariCP)

```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.leak-detection-threshold=60000
spring.datasource.hikari.pool-name=MyAppPool
```

```
Sizing formula (rule of thumb):
connections = ((core_count * 2) + effective_spindle_count)

For typical cloud DBs (SSD-backed): pool size of 10-20 is usually sufficient
even under high load — more connections often makes things WORSE due to
context switching and lock contention on the database side.
```

---

## Configuration Management

```java
// Externalize ALL environment-specific config — never hardcode
@ConfigurationProperties(prefix = "app")
@Validated
public record AppProperties(
    @NotBlank String name,
    @NotNull DatabaseProperties database,
    @NotNull SecurityProperties security
) {
    public record DatabaseProperties(@NotBlank String url, int poolSize) {}
    public record SecurityProperties(@NotBlank String jwtSecret, Duration tokenExpiry) {}
}
```

```bash
# Secrets — NEVER in application.properties committed to git
# Use environment variables, Vault, AWS Secrets Manager, or Kubernetes Secrets

export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/db --query SecretString --output text)
java -jar app.jar
```

```yaml
# Kubernetes ConfigMap + Secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DB_PASSWORD: "..."
  JWT_SECRET: "..."
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - secretRef:
                name: app-secrets
          resources:
            requests: { cpu: "500m", memory: "768Mi" }
            limits:   { cpu: "1",    memory: "1Gi" }
```

---

## Production Checklist

```
✅ spring.jpa.open-in-view=false
✅ spring.jpa.hibernate.ddl-auto=validate (never auto/update/create in prod — use Flyway/Liquibase)
✅ Structured JSON logging with correlation IDs
✅ Actuator health/readiness/liveness endpoints enabled and secured
✅ Graceful shutdown configured (server.shutdown=graceful)
✅ Connection pool sized appropriately (not too large!)
✅ Timeouts set on all outbound HTTP calls
✅ Resilience patterns (circuit breaker, retry) on external dependencies
✅ Secrets externalized — never in version control
✅ JVM heap sized for container memory limits (-XX:MaxRAMPercentage)
✅ Metrics exported to Prometheus/Datadog/CloudWatch
✅ Rate limiting on public endpoints
✅ CORS configured explicitly — no wildcard origins with credentials
```

---

## Summary

- Use structured JSON logging in production — log aggregators need parseable, queryable fields, not plain text.
- MDC adds request-scoped context (correlation ID, user ID) to every log line automatically.
- Micrometer + `/actuator/prometheus` is the standard metrics pipeline for Spring Boot apps.
- Implement custom `HealthIndicator`s for every critical external dependency (DB, cache, downstream APIs).
- Set `-XX:MaxRAMPercentage` instead of fixed `-Xmx` in containers — it adapts to the container's memory limit.
- Enable `server.shutdown=graceful` so in-flight requests complete before the JVM exits during deploys.
- Never use `ddl-auto=update` in production — use a migration tool (Flyway/Liquibase) for schema changes.
- Size your connection pool conservatively — bigger isn't always better; database-side contention can make large pools counterproductive.
