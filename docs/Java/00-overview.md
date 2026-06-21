---
title: "Java, Jakarta EE & Spring — Reference"
sidebar_label: "Overview"
sidebar_position: 0
---

# Java, Jakarta EE & Spring

Personal reference for Java backend development — language fundamentals, object-oriented design, the standard library, Jakarta EE web APIs, the Spring ecosystem, and production deployment.

---

## Java Language

| Page | Covers |
|---|---|
| [Java Fundamentals](./01-java-fundamentals.md) | Types, operators, control flow, arrays, methods, strings, autoboxing, varargs |
| [Object-Oriented Programming](./02-java-oop.md) | Classes, constructors, encapsulation, inheritance, polymorphism, interfaces, enums, records |
| [Collections Framework](./03-java-collections.md) | List, Set, Map, Queue, Deque, Comparator, generics, iteration |
| [Streams & Lambdas](./04-java-streams.md) | Lambdas, functional interfaces, Stream API, Optional, parallel streams, collectors |
| [Exceptions & I/O](./05-java-exceptions-io.md) | Checked/unchecked exceptions, try-with-resources, NIO.2, serialization |
| [Concurrency](./06-java-concurrency.md) | Threads, synchronization, Executor framework, CompletableFuture, virtual threads |
| [Modern Java](./18-modern-java.md) | Records, sealed classes, pattern matching, text blocks, var, switch expressions |
| [Design Patterns](./19-design-patterns.md) | Creational, structural, and behavioral patterns with Java examples |

---

## Jakarta EE

| Page | Covers |
|---|---|
| [Jakarta EE Fundamentals](./07-jakartaee-fundamentals.md) | Servlets, Filters, CDI, JAX-RS, Bean Validation, JTA |
| [JPA & Persistence](./08-jpa-persistence.md) | Entities, relationships, JPQL, Criteria API, transactions, caching |

---

## Spring

| Page | Covers |
|---|---|
| [Spring Core](./09-spring-core.md) | IoC/DI, beans, scopes, AOP, events, SpEL, environment |
| [Spring Boot](./10-spring-boot.md) | Auto-configuration, starters, properties, Actuator, profiles, Docker |
| [Spring MVC & REST](./11-spring-mvc-rest.md) | Controllers, request mapping, DTOs, validation, exception handling, CORS |
| [Spring Data JPA](./12-spring-data-jpa.md) | Repositories, derived queries, JPQL, projections, paging, Specifications |
| [Spring Security](./13-spring-security.md) | Filter chain, authentication, JWT, method security, OAuth2 |
| [Spring Testing](./14-spring-testing.md) | JUnit 5, Mockito, MockMvc, DataJpaTest, Testcontainers |
| [Caching, Events & Transactions](./15-spring-caching-events-transactions.md) | @Cacheable, application events, @Transactional deep dive |
| [REST Clients](./16-spring-rest-clients.md) | RestClient, WebClient, @HttpExchange, resilience patterns |
| [Spring Production](./17-spring-production.md) | Logging, Micrometer, Actuator, Docker layered builds, JVM tuning |
