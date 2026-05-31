---
title: "Java, Jakarta EE & Spring — Course Overview"
sidebar_label: "Course Overview"
sidebar_position: 0
---

# Java, Jakarta EE & Spring

This course covers the full Java backend ecosystem — from the language fundamentals to enterprise APIs and the Spring ecosystem. It's structured as a reference you grow into, not a tutorial you follow top-to-bottom once and discard.

---

## How This Course Is Structured

The course is divided into three progressively deeper tracks:

### Track 1 — Java Language

The language itself. Everything here applies regardless of framework.

| Section | What You'll Learn |
|---|---|
| [Java Fundamentals](./01-java-fundamentals) | Types, operators, control flow, arrays, methods, strings |
| [Object-Oriented Programming](./02-java-oop) | Classes, inheritance, polymorphism, interfaces, enums, records |
| [Collections & Generics](./03-java-collections) | List, Set, Map, Queue, type-safe generics |
| [Streams & Lambdas](./04-java-streams) | Functional pipelines, Optional, parallel streams |
| [Exceptions & I/O](./05-java-exceptions-io) | Error handling, file reading/writing, try-with-resources |
| [Concurrency](./06-java-concurrency) | Threads, ExecutorService, CompletableFuture, virtual threads |
| [Modern Java](./18-modern-java) | Records, sealed classes, text blocks, pattern matching, var |

### Track 2 — Jakarta EE

The enterprise Java standard, implemented by application servers (WildFly, Payara, Open Liberty).

| Section | What You'll Learn |
|---|---|
| [Jakarta EE Fundamentals](./07-jakartaee-fundamentals) | Servlets, Filters, CDI, JAX-RS, Bean Validation |
| [JPA & Persistence](./08-jpa-persistence) | Entities, relationships, JPQL, transactions, inheritance |

### Track 3 — Spring Ecosystem

The most widely used Java application framework. Spring Boot is the standard for modern Java backends.

| Section | What You'll Learn |
|---|---|
| [Spring Core](./09-spring-core) | IoC container, dependency injection, AOP, profiles |
| [Spring Boot](./10-spring-boot) | Auto-configuration, starters, Actuator, DevTools |
| [Spring MVC / REST](./11-spring-mvc-rest) | Controllers, DTOs, exception handling, validation, CORS |
| [Spring Data JPA](./12-spring-data-jpa) | Repositories, derived queries, @Query, pagination, auditing |
| [Spring Security](./13-spring-security) | JWT authentication, authorization, method security, BCrypt |
| [Testing](./14-spring-testing) | Unit tests, @WebMvcTest, @DataJpaTest, Testcontainers |
| [Caching, Events & Transactions](./15-spring-caching-events-transactions) | @Cacheable, ApplicationEvents, @Transactional |
| [REST Clients](./16-spring-rest-clients) | RestClient, WebClient, @HttpExchange |
| [Production](./17-spring-production) | Logging, metrics, health checks, Docker, performance |

### Cross-Cutting

| Section | What You'll Learn |
|---|---|
| [Design Patterns](./19-design-patterns) | Singleton, Factory, Builder, Decorator, Strategy, Observer |

---

## Suggested Learning Path

### If you're new to Java
Start with the Java Language track in order (sections 1–6), then jump to Spring Core and Spring Boot. Jakarta EE is useful context but not required for Spring-based development.

### If you know Java but not Spring
Start at Spring Core (section 9). Read Spring Boot, Spring MVC, and Spring Data JPA in order. Add Security and Testing once you have something working.

### If you're building a production service
The full path matters. Make sure you've covered Testing, Caching/Transactions, and the Production section before deploying anything.

### Quick references
Each section is designed to stand alone. If you need to remember how `@Transactional` propagation works, or which `Collectors` method does grouping, jump directly to that section.

---

## Technology Versions

This course targets:

| Technology | Version |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 3.3+ |
| Spring Framework | 6.1+ |
| Jakarta EE | 10 |
| JPA / Hibernate | Jakarta Persistence 3 / Hibernate 6 |

Java 21 is the current LTS release and the recommended target for new projects. All code examples use modern Java idioms (records, text blocks, pattern matching, virtual threads).

---

## Tools You'll Need

- **JDK 21** — [Eclipse Temurin](https://adoptium.net/) (free, open source)
- **IDE** — IntelliJ IDEA (recommended) or Eclipse or VS Code with Java extensions
- **Build tool** — Maven or Gradle (examples use Maven)
- **Docker** — for running databases and containers locally
- **Spring Initializr** — [start.spring.io](https://start.spring.io) to bootstrap new projects

---

## Key Concepts to Internalize

A few ideas that run through this entire course:

**Inversion of Control** — Instead of objects creating their dependencies, a container creates them and injects them. You declare *what* you need; Spring provides it.

**Convention over Configuration** — Spring Boot assumes sensible defaults. You only configure what differs from the convention.

**Separation of Concerns** — Controllers handle HTTP. Services handle business logic. Repositories handle data access. Each layer does one thing.

**Fail fast** — Validate input early (at the controller/API boundary), throw meaningful exceptions, never let bad state propagate deep into your system.

**Testability** — Code that's easy to test is code that's well-designed. If a class is hard to unit test, it's probably doing too much or has hidden dependencies.
