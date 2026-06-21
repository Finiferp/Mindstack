---
title: "Spring Boot"
sidebar_label: "Spring Boot"
sidebar_position: 10
---

# Spring Boot

Spring Boot eliminates the configuration overhead of plain Spring. Auto-configuration, embedded servers, and starter dependencies let you build a production-ready application with minimal boilerplate.

---

## Project Setup

```xml
<!-- pom.xml — Maven -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

```bash
# Maven commands
mvn spring-boot:run             # run the app
mvn clean package               # build JAR
mvn clean package -DskipTests  # skip tests
java -jar target/app-0.0.1.jar  # run the built JAR
mvn test                        # run tests
mvn dependency:tree             # view dependency tree
```

---

## Application Entry Point

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication   // = @Configuration + @EnableAutoConfiguration + @ComponentScan
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Customizing startup
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(Application.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setAdditionalProfiles("dev");
        app.addListeners(event -> System.out.println("Event: " + event));
        ApplicationContext ctx = app.run(args);
    }

    // ApplicationRunner — runs once at startup, after context is fully loaded
    @Bean
    public ApplicationRunner runner(UserRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.save(new User("admin", "admin@example.com"));
            }
        };
    }

    // CommandLineRunner — alternative, raw String[] args
    @Bean
    public CommandLineRunner cliRunner() {
        return args -> System.out.println("App started with args: " + Arrays.toString(args));
    }
}

// @SpringBootApplication customization
@SpringBootApplication(
    scanBasePackages = "com.example",
    exclude = {DataSourceAutoConfiguration.class}   // disable specific auto-config
)
public class Application { }
```

---

## Auto-Configuration

```java
// Spring Boot auto-configures beans based on classpath presence and properties
// Example: if spring-boot-starter-data-jpa is on classpath AND a DataSource is configured,
// Spring Boot auto-creates EntityManagerFactory, TransactionManager, etc.

// View what got auto-configured
// java -jar app.jar --debug
// Or: management.endpoint.conditions.enabled=true + GET /actuator/conditions

// Writing your own auto-configuration (for libraries)
@AutoConfiguration
@ConditionalOnClass(SomeLibraryClass.class)
@ConditionalOnProperty(prefix = "myfeature", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(MyFeatureProperties.class)
public class MyFeatureAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean   // only create if user hasn't defined their own
    public MyFeatureService myFeatureService(MyFeatureProperties props) {
        return new MyFeatureService(props.getApiKey());
    }
}

// Common @Conditional annotations:
// @ConditionalOnClass(Foo.class)        — Foo is on classpath
// @ConditionalOnMissingClass            — class NOT on classpath
// @ConditionalOnBean(Foo.class)         — bean of type Foo exists
// @ConditionalOnMissingBean              — no bean of this type exists yet
// @ConditionalOnProperty(...)            — property has specific value
// @ConditionalOnExpression("...")        — SpEL expression
// @ConditionalOnWebApplication           — running as web app
// @ConditionalOnNotWebApplication
// @Profile("...")
```

---

## application.properties / application.yml

```properties
# application.properties
spring.application.name=my-app
server.port=8080
server.servlet.context-path=/api

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.open-in-view=false

# Connection pool (HikariCP)
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.connection-timeout=30000

# Logging
logging.level.root=INFO
logging.level.com.example=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.pattern.console=%d{HH:mm:ss} %-5level %logger{36} - %msg%n
logging.file.name=logs/app.log

# Jackson
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.default-property-inclusion=non_null

# Custom properties
app.jwt.secret=${JWT_SECRET}
app.jwt.expiration=900000
app.upload.max-size=10MB
```

```yaml
# application.yml — equivalent, often preferred
spring:
  application:
    name: my-app
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    open-in-view: false

server:
  port: 8080
  servlet:
    context-path: /api

logging:
  level:
    root: INFO
    com.example: DEBUG

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration: 900000

---
# Profile-specific section (YAML multi-document)
spring:
  config:
    activate:
      on-profile: dev
  jpa:
    show-sql: true
```

```properties
# Profile-specific files (alternative to multi-document YAML)
# application-dev.properties
# application-prod.properties
# application-test.properties
# Activated with: spring.profiles.active=dev
```

---

## @ConfigurationProperties

Type-safe configuration binding — better than scattered `@Value` annotations.

```java
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    private String secret;
    private long   expiration;
    private String issuer = "myapp";   // default value

    // getters/setters required for binding
}

// Register
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class AppConfig { }

// Or with @Component directly
@Component
@ConfigurationProperties(prefix = "app.upload")
public class UploadProperties {
    private String maxSize = "10MB";
    private List<String> allowedTypes = new ArrayList<>();
    private Nested nested = new Nested();

    public static class Nested {
        private boolean enabled;
        private int retries;
    }
}

// Usage — fully typed, validated, IDE auto-complete works
@Service
public class TokenService {
    private final JwtProperties jwtProperties;

    public TokenService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public String generateToken() {
        return Jwts.builder()
            .setIssuer(jwtProperties.getIssuer())
            .setExpiration(new Date(System.currentTimeMillis() + jwtProperties.getExpiration()))
            .signWith(getKey(jwtProperties.getSecret()))
            .compact();
    }
}

// With validation
@ConfigurationProperties(prefix = "app.mail")
@Validated
public class MailProperties {
    @NotBlank
    private String host;

    @Min(1) @Max(65535)
    private int port;

    @Email
    private String fromAddress;
}

// Record-based (immutable, Java 16+)
@ConfigurationProperties(prefix = "app.feature")
public record FeatureProperties(boolean enabled, int maxRetries, List<String> allowedOrigins) {}
```

---

## Starters

| Starter | Provides |
|---|---|
| `spring-boot-starter-web` | Spring MVC, embedded Tomcat, Jackson |
| `spring-boot-starter-webflux` | Reactive web stack (Netty) |
| `spring-boot-starter-data-jpa` | Spring Data JPA, Hibernate |
| `spring-boot-starter-data-mongodb` | MongoDB support |
| `spring-boot-starter-data-redis` | Redis support |
| `spring-boot-starter-security` | Spring Security |
| `spring-boot-starter-validation` | Bean Validation (Hibernate Validator) |
| `spring-boot-starter-actuator` | Production monitoring endpoints |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-mail` | JavaMail support |
| `spring-boot-starter-cache` | Caching abstraction |
| `spring-boot-starter-thymeleaf` | Thymeleaf templating |
| `spring-boot-starter-batch` | Spring Batch |
| `spring-boot-starter-amqp` | RabbitMQ |
| `spring-boot-starter-kafka` | Apache Kafka |

---

## Actuator

```properties
# Enable endpoints
management.endpoints.web.exposure.include=health,info,metrics,env,loggers
management.endpoint.health.show-details=when-authorized
management.info.env.enabled=true

# Custom info
info.app.name=My App
info.app.version=1.0.0
```

```java
// Custom health indicator
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(1)) {
                return Health.up().withDetail("database", "available").build();
            }
            return Health.down().withDetail("database", "not responding").build();
        } catch (SQLException e) {
            return Health.down(e).build();
        }
    }
}

// Custom info contributor
@Component
public class BuildInfoContributor implements InfoContributor {
    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("build", Map.of(
            "version", "1.0.0",
            "timestamp", Instant.now().toString()
        ));
    }
}

// Custom metrics with Micrometer
@Service
public class OrderService {
    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;

    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.orderCounter = Counter.builder("orders.placed")
            .description("Total orders placed")
            .register(meterRegistry);
    }

    public void placeOrder(Order order) {
        // ... business logic
        orderCounter.increment();
        meterRegistry.gauge("orders.value", order.getTotal());
    }
}
```

```bash
# Default actuator endpoints
GET /actuator/health      # application health status
GET /actuator/info        # application info
GET /actuator/metrics     # available metrics
GET /actuator/metrics/jvm.memory.used   # specific metric
GET /actuator/env         # environment properties
GET /actuator/loggers     # logger configuration
POST /actuator/loggers/com.example  # change log level at runtime
GET /actuator/beans       # all Spring beans
GET /actuator/mappings    # all request mappings
GET /actuator/threaddump  # thread dump
GET /actuator/heapdump    # heap dump (binary)
GET /actuator/shutdown    # graceful shutdown (must be explicitly enabled)
```

---

## Profiles in Practice

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .addScript("schema.sql")
            .addScript("data.sql")
            .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource(
            @Value("${DB_URL}") String url,
            @Value("${DB_USER}") String user,
            @Value("${DB_PASSWORD}") String password) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(user);
        config.setPassword(password);
        config.setMaximumPoolSize(20);
        return new HikariDataSource(config);
    }
}
```

```bash
# Activate profile
java -jar app.jar --spring.profiles.active=prod
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## Docker

```dockerfile
# Multi-stage build with layered JAR (Spring Boot 2.3+)
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw dependency:go-offline
COPY src src
RUN ./mvnw clean package -DskipTests
RUN java -Djarmode=layertools -jar target/*.jar extract

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy layers separately for better Docker layer caching
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_URL=jdbc:postgresql://db:5432/mydb
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

volumes:
  pgdata:
```

---

## Summary

- `@SpringBootApplication` combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`.
- Auto-configuration activates based on classpath + properties — use `@ConditionalOnMissingBean` to allow overrides.
- Prefer `@ConfigurationProperties` over scattered `@Value` for related settings — type-safe and testable.
- `application.yml` profile sections (`---` separated) keep all environment config in one file.
- Actuator's `/actuator/health` and `/actuator/metrics` are essential for production monitoring — always enable them.
- Use layered Docker builds (`-Djarmode=layertools`) for efficient image caching — dependencies rarely change, app code does.
- Set `spring.jpa.open-in-view=false` in production — the default `true` hides N+1 query issues and ties DB connections to view rendering.
