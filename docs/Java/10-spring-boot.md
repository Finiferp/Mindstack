---
title: "Spring Boot"
sidebar_label: "Spring Boot"
sidebar_position: 10
---

# Spring Boot

Spring Boot removes the configuration ceremony from Spring. It provides **auto-configuration** (sensible defaults based on classpath), an **embedded server** (no separate Tomcat install), and **production-ready features** (metrics, health checks, externalized config). You focus on writing business logic; Spring Boot wires the infrastructure.

---

## Project Structure

```
my-app/
├── src/
│   ├── main/
│   │   ├── java/com/example/myapp/
│   │   │   ├── MyAppApplication.java      ← entry point
│   │   │   ├── controller/
│   │   │   │   └── UserController.java
│   │   │   ├── service/
│   │   │   │   └── UserService.java
│   │   │   ├── repository/
│   │   │   │   └── UserRepository.java
│   │   │   ├── model/
│   │   │   │   └── User.java
│   │   │   └── config/
│   │   │       └── SecurityConfig.java
│   │   └── resources/
│   │       ├── application.yml            ← main config
│   │       ├── application-dev.yml        ← dev profile
│   │       └── application-prod.yml       ← prod profile
│   └── test/
│       └── java/com/example/myapp/
│           └── UserServiceTest.java
├── pom.xml (Maven) or build.gradle (Gradle)
```

---

## Entry Point

```java
package com.example.myapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication   // = @Configuration + @EnableAutoConfiguration + @ComponentScan
public class MyAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyAppApplication.class, args);
    }
}
```

`@SpringBootApplication` triggers:
- **@ComponentScan** — scans the package and subpackages for Spring beans.
- **@EnableAutoConfiguration** — configures beans based on the classpath (finds JDBC on classpath → configures a DataSource).
- **@Configuration** — marks this class as a bean configuration source.

---

## Maven Starter Dependencies

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
</parent>

<dependencies>
    <!-- Web (REST API) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- JPA + Hibernate -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- PostgreSQL Driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Actuator (health checks, metrics) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## Auto-Configuration

Spring Boot's auto-configuration detects libraries on the classpath and configures beans automatically.

- Add `spring-boot-starter-data-jpa` + a DB driver → Spring Boot creates a `DataSource`, `EntityManagerFactory`, and `TransactionManager`.
- Add `spring-boot-starter-web` → Spring Boot creates a Tomcat server, `DispatcherServlet`, and Jackson `ObjectMapper`.
- Add `spring-boot-starter-security` → Spring Boot protects all endpoints with basic auth.

You can override any auto-configured bean by declaring your own:

```java
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
    // Your @Bean overrides the auto-configured one
}
```

### Seeing What's Auto-Configured
Run with `--debug` flag to get the auto-configuration report:
```bash
java -jar app.jar --debug
```

---

## application.yml — Core Configuration

```yaml
server:
  port: 8080
  servlet:
    context-path: /api   # all endpoints prefixed with /api

spring:
  application:
    name: my-app

  # Database
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      connection-timeout: 30000

  # JPA
  jpa:
    hibernate:
      ddl-auto: validate       # validate|update|create|create-drop|none
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  # Jackson (JSON)
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false

# Actuator
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized

# Custom properties
app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
```

---

## Spring Boot Actuator

Actuator exposes production-ready HTTP endpoints for monitoring:

```
GET /actuator/health     → {"status": "UP", "components": {...}}
GET /actuator/info       → application info
GET /actuator/metrics    → available metric names
GET /actuator/metrics/jvm.memory.used → specific metric
GET /actuator/env        → environment properties
GET /actuator/beans      → all Spring beans
GET /actuator/mappings   → all @RequestMapping endpoints
```

### Custom Health Indicator
```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        try {
            // Check connectivity to external service
            boolean up = checkExternalService();
            return up ? Health.up().withDetail("service", "external-api").build()
                      : Health.down().withDetail("reason", "unreachable").build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

### Custom Info Contributor
```java
@Component
public class AppInfoContributor implements InfoContributor {

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("app", Map.of(
            "version", "1.0.0",
            "environment", "production"
        ));
    }
}
```

---

## CommandLineRunner and ApplicationRunner

Run code once at startup, after the application context is fully initialized:

```java
@Component
@Order(1)  // when multiple runners, lower = runs first
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    public DataSeeder(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            userRepository.save(new User("admin", "admin@example.com"));
            System.out.println("Database seeded.");
        }
    }
}

// ApplicationRunner receives typed ApplicationArguments instead of String[]
@Component
public class ConfigValidator implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (args.containsOption("dry-run")) {
            System.out.println("Running in dry-run mode");
        }
    }
}
```

---

## Profiles in Depth

```yaml
# application.yml — base config for all environments
spring:
  profiles:
    active: dev  # default profile (override in prod via env var)

---
# Inline profile in same file (Spring Boot 2.4+)
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:testdb
  jpa:
    hibernate:
      ddl-auto: create-drop

---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:postgresql://prod-server:5432/mydb
```

Set profile at runtime:
```bash
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
# or
java -Dspring.profiles.active=prod -jar app.jar
```

---

## Building and Running

### Maven
```bash
# Run in development
./mvnw spring-boot:run

# Build executable JAR
./mvnw clean package -DskipTests

# Run JAR
java -jar target/my-app-1.0.0.jar

# With profile
java -Dspring.profiles.active=production -jar target/my-app-1.0.0.jar
```

### Gradle
```bash
./gradlew bootRun
./gradlew bootJar
java -jar build/libs/my-app-1.0.0.jar
```

### Docker
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/my-app-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Developer Tools (DevTools)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

DevTools provides:
- **Automatic restart** when classpath changes.
- **LiveReload** for browser auto-refresh.
- **Relaxed bindings** for property names.
- **H2 console** enabled by default in dev.

---

## Summary

Spring Boot is the standard way to build Java applications today:

- **@SpringBootApplication** — one annotation bootstraps everything.
- **Auto-configuration** — opinionated defaults, zero XML.
- **Starters** — curated dependency bundles (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`).
- **Embedded server** — ship a runnable JAR, no application server needed.
- **Actuator** — production monitoring out of the box.

**Key Takeaways:**
- Use `spring-boot-starter-parent` to get dependency version management for free.
- Externalize all environment-specific config to `application.yml` and environment variables.
- Use `ddl-auto: validate` in production — never `create` or `create-drop`.
- Actuator's `/health` endpoint is essential for load balancer health checks in production.
- DevTools should be `<optional>true</optional>` — it's never included in the packaged JAR.
