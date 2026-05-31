---
title: "JPA — Java Persistence API"
sidebar_label: "JPA & Persistence"
sidebar_position: 8
---

# JPA — Java Persistence API

JPA is the standard Jakarta EE specification for mapping Java objects to relational database tables (ORM — Object-Relational Mapping). You define your domain model with annotations; JPA handles SQL generation, result mapping, and transaction management. Hibernate is the most widely-used JPA implementation.

---

## Core Concepts

- **Entity** — a Java class mapped to a database table.
- **EntityManager** — the main interface for CRUD operations and queries.
- **Persistence Context** — a cache/unit of work managed by the EntityManager. Entities inside are "managed" — changes are tracked and flushed to the DB automatically.
- **Transaction** — a unit of work that either fully succeeds or fully rolls back.

---

## Defining Entities

```java
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // auto-increment
    private Long id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String email;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors, getters, setters, equals, hashCode
}
```

### ID Generation Strategies

| Strategy        | Description                                      |
|-----------------|--------------------------------------------------|
| `IDENTITY`      | DB auto-increment (MySQL, PostgreSQL SERIAL)     |
| `SEQUENCE`      | DB sequence (PostgreSQL, Oracle)                 |
| `TABLE`         | Portable, uses a dedicated ID table (slow)       |
| `AUTO`          | JPA picks based on the database                  |
| `UUID`          | Auto-generates UUID (Jakarta EE 10+)             |

```java
// Sequence strategy (PostgreSQL)
@Id
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
@SequenceGenerator(name = "user_seq", sequenceName = "user_id_seq", allocationSize = 1)
private Long id;

// UUID primary key
@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;
```

---

## Relationships

### One-to-Many / Many-to-One

```java
@Entity
public class Author {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Book> books = new ArrayList<>();

    public void addBook(Book book) {
        books.add(book);
        book.setAuthor(this);
    }

    public void removeBook(Book book) {
        books.remove(book);
        book.setAuthor(null);
    }
}

@Entity
public class Book {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private Author author;
}
```

### Many-to-Many

```java
@Entity
public class Student {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();
}

@Entity
public class Course {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();
}
```

### One-to-One

```java
@Entity
public class Employee {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", referencedColumnName = "id")
    private Address address;
}
```

**Tips:**
- Always use `FetchType.LAZY` on `@ManyToOne` and `@OneToOne` — eager fetching causes N+1 problems.
- `@OneToMany` is `LAZY` by default — leave it that way.
- `orphanRemoval = true` deletes child entities when removed from the parent collection.
- Use bidirectional relationships carefully — always synchronize both sides with helper methods.

---

## EntityManager Operations

```java
@PersistenceContext
private EntityManager em;

// CREATE
User user = new User();
user.setUsername("alice");
user.setEmail("alice@example.com");
em.persist(user); // entity is now managed; id is set after flush

// READ
User found = em.find(User.class, 1L); // returns null if not found

// UPDATE — just modify a managed entity; JPA detects and flushes changes
found.setEmail("newemail@example.com");
// No explicit call needed — dirty checking handles it

// Merge a detached entity (e.g., received from external system)
User detachedUser = ...; // not managed by current context
User managedUser = em.merge(detachedUser);

// DELETE
User toDelete = em.find(User.class, id);
em.remove(toDelete);

// Force flush to DB within transaction (normally automatic at transaction end)
em.flush();

// Refresh entity from DB (discard pending changes)
em.refresh(found);

// Detach — stop tracking changes
em.detach(found);

// Clear entire persistence context
em.clear();
```

---

## JPQL — Jakarta Persistence Query Language

JPQL is SQL-like but operates on entity classes and fields, not tables and columns.

```java
// Named query — defined on entity, reusable
@Entity
@NamedQuery(name = "User.findByEmail",
            query = "SELECT u FROM User u WHERE u.email = :email")
public class User { ... }

// Execute named query
List<User> users = em.createNamedQuery("User.findByEmail", User.class)
    .setParameter("email", "alice@example.com")
    .getResultList();

// Inline JPQL
List<User> admins = em.createQuery(
    "SELECT u FROM User u WHERE u.role = :role ORDER BY u.username", User.class)
    .setParameter("role", Role.ADMIN)
    .getResultList();

// Single result
User user = em.createQuery(
    "SELECT u FROM User u WHERE u.username = :name", User.class)
    .setParameter("name", "alice")
    .getSingleResult(); // throws NoResultException if not found

// Pagination
List<User> page = em.createQuery("SELECT u FROM User u ORDER BY u.id", User.class)
    .setFirstResult(20)   // skip first 20
    .setMaxResults(10)    // return next 10
    .getResultList();

// Update / Delete queries
int updated = em.createQuery(
    "UPDATE User u SET u.active = false WHERE u.lastLogin < :cutoff")
    .setParameter("cutoff", LocalDateTime.now().minusDays(90))
    .executeUpdate();

// Joins
List<Book> books = em.createQuery(
    "SELECT b FROM Book b JOIN b.author a WHERE a.name = :name", Book.class)
    .setParameter("name", "Tolkien")
    .getResultList();

// Aggregate
Long count = em.createQuery("SELECT COUNT(u) FROM User u", Long.class)
    .getSingleResult();
```

---

## Criteria API

The Criteria API builds queries programmatically — type-safe and refactoring-proof (column renames caught at compile time).

```java
CriteriaBuilder cb = em.getCriteriaBuilder();
CriteriaQuery<User> cq = cb.createQuery(User.class);
Root<User> user = cq.from(User.class);

cq.select(user)
  .where(
      cb.and(
          cb.equal(user.get("role"), Role.ADMIN),
          cb.greaterThan(user.get("age"), 18)
      )
  )
  .orderBy(cb.asc(user.get("username")));

List<User> result = em.createQuery(cq).getResultList();
```

**Tips:**
- JPQL is simpler and more readable — use it by default.
- Use Criteria API for dynamically-constructed queries (optional filters, variable predicates).
- Use Metamodel (`User_.role`) for fully type-safe Criteria queries (requires annotation processing).

---

## Transactions

In Jakarta EE, transactions are typically managed by the container.

```java
import jakarta.transaction.*;

@Stateless  // EJB bean — gets container-managed transactions automatically
public class UserService {

    @PersistenceContext
    private EntityManager em;

    // Default: @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public User createUser(String username, String email) {
        User user = new User(username, email);
        em.persist(user);
        return user; // committed when method returns
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void auditLog(String action) {
        // Runs in its own transaction — committed independently
        em.persist(new AuditEntry(action));
    }

    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public List<User> getAllUsers() {
        // Read-only, no transaction overhead
        return em.createQuery("SELECT u FROM User u", User.class).getResultList();
    }
}
```

### Transaction Attributes

| Attribute         | No active transaction | Active transaction           |
|-------------------|-----------------------|------------------------------|
| `REQUIRED`        | Creates new one       | Uses existing (default)      |
| `REQUIRES_NEW`    | Creates new one       | Suspends existing, new one   |
| `MANDATORY`       | Throws exception      | Uses existing                |
| `NOT_SUPPORTED`   | Runs without          | Suspends existing            |
| `NEVER`           | Runs without          | Throws exception             |
| `SUPPORTS`        | Runs without          | Uses existing                |

---

## Embeddables and Value Objects

```java
@Embeddable
public class Address {
    private String street;
    private String city;
    private String country;
    private String zipCode;
}

@Entity
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "street", column = @Column(name = "billing_street")),
        @AttributeOverride(name = "city", column = @Column(name = "billing_city"))
    })
    private Address billingAddress;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "street", column = @Column(name = "shipping_street")),
        @AttributeOverride(name = "city", column = @Column(name = "shipping_city"))
    })
    private Address shippingAddress;
}
```

---

## Inheritance Mapping

```java
// Strategy 1: Single Table (all subclasses in one table — fastest)
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
public abstract class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private double amount;
}

@Entity
@DiscriminatorValue("CARD")
public class CardPayment extends Payment {
    private String cardNumber;
}

@Entity
@DiscriminatorValue("BANK")
public class BankTransfer extends Payment {
    private String iban;
}

// Strategy 2: Joined (normalized, separate tables joined on query)
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Vehicle { ... }

// Strategy 3: Table Per Class (completely separate tables per subclass)
@Entity
@Inheritance(strategy = InheritanceType.TABLE_PER_CLASS)
public abstract class Shape { ... }
```

**Tips:**
- `SINGLE_TABLE` is the fastest (one SELECT, no joins) but wastes columns for fields that don't apply to all subtypes.
- `JOINED` is normalized and clean but requires joins on every query.
- `TABLE_PER_CLASS` avoids joins for single types but makes polymorphic queries across subtypes expensive.

---

## Summary

JPA abstracts the relational database behind a clean object model:

- **Entities** — annotated classes that map to tables.
- **Relationships** — `@OneToMany`, `@ManyToOne`, `@ManyToMany` with fetch type control.
- **EntityManager** — your gateway to CRUD and queries.
- **JPQL** — SQL-like language on entities, not tables.
- **Transactions** — managed by the container or explicitly via `UserTransaction`.

**Key Takeaways:**
- Use `LAZY` fetching by default — avoid unintended data loading.
- Never use `FetchType.EAGER` on collections — it causes N+1 query problems.
- Always define helper methods to keep bidirectional relationships in sync.
- Prefer named queries or a query repository pattern — avoid scattering JPQL strings everywhere.
- Transactions should wrap entire business operations, not individual DB calls.
