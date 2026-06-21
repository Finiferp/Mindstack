---
title: "JPA & Persistence"
sidebar_label: "JPA"
sidebar_position: 8
---

# JPA & Persistence

JPA (Jakarta Persistence API) maps Java objects to relational database tables. Hibernate is the most common implementation. Spring Data JPA (covered later) builds on top of this.

---

## Entities

```java
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_email", columnList = "email", unique = true)
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // auto-increment
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)   // store enum as string (recommended over ORDINAL)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String bio;

    @Transient                     // not persisted to DB
    private String temporaryToken;

    @Version                       // optimistic locking
    private Long version;

    // Required no-args constructor (JPA needs this)
    protected User() {}

    public User(String name, String email, String passwordHash) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    // getters/setters omitted for brevity

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();  // consistent across proxy/managed states
    }
}

public enum Role { USER, ADMIN, MODERATOR }
```

### Embeddable (Value Objects)

```java
@Embeddable
public class Address {
    private String street;
    private String city;
    private String country;
    private String zipCode;
    // getters/setters, equals/hashCode
}

@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @Embedded
    private Address address;     // becomes columns: street, city, country, zip_code on users table

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "street", column = @Column(name = "billing_street")),
        @AttributeOverride(name = "city",   column = @Column(name = "billing_city"))
    })
    private Address billingAddress;  // override column names to avoid collision
}
```

---

## Relationships

### One-to-Many / Many-to-One

```java
@Entity
public class Author {
    @Id @GeneratedValue
    private Long id;
    private String name;

    // One author has many books — "mappedBy" means Book.author owns the relationship
    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Book> books = new ArrayList<>();

    // Helper methods to keep both sides in sync
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
    @Id @GeneratedValue
    private Long id;
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)   // many books belong to one author
    @JoinColumn(name = "author_id", nullable = false)
    private Author author;
}
```

### One-to-One

```java
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Profile profile;
}

@Entity
public class Profile {
    @Id @GeneratedValue
    private Long id;

    private String bio;
    private String avatarUrl;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;        // owning side — has the foreign key
}
```

### Many-to-Many

```java
@Entity
public class Student {
    @Id @GeneratedValue
    private Long id;
    private String name;

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
    @Id @GeneratedValue
    private Long id;
    private String title;

    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();
}

// Many-to-many WITH extra columns — use a join entity instead
@Entity
public class Enrollment {
    @EmbeddedId
    private EnrollmentId id;

    @ManyToOne @MapsId("studentId")
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne @MapsId("courseId")
    @JoinColumn(name = "course_id")
    private Course course;

    private LocalDate enrolledDate;
    private Double    grade;
}

@Embeddable
public class EnrollmentId implements Serializable {
    private Long studentId;
    private Long courseId;
    // equals/hashCode required
}
```

### Fetch Types and Cascade

```java
// FetchType
FetchType.LAZY   // load on first access — default for @OneToMany, @ManyToMany
FetchType.EAGER  // load immediately with parent — default for @ManyToOne, @OneToOne

// ALWAYS use LAZY for collections — EAGER causes N+1 and performance issues
@OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
private List<Book> books;

// CascadeType — what happens to related entities when parent changes
CascadeType.PERSIST  // save children when parent is saved
CascadeType.MERGE    // update children when parent is updated
CascadeType.REMOVE   // delete children when parent is deleted
CascadeType.REFRESH  // refresh children when parent is refreshed
CascadeType.DETACH   // detach children when parent is detached
CascadeType.ALL      // all of the above

@OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
private List<Book> books;
// orphanRemoval = true: removing a book from the list deletes it from DB
```

---

## Inheritance Mapping

```java
// ── SINGLE_TABLE (default) — one table, discriminator column ───────────────
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "payment_type")
public abstract class Payment {
    @Id @GeneratedValue
    private Long id;
    private BigDecimal amount;
}

@Entity
@DiscriminatorValue("CREDIT_CARD")
public class CreditCardPayment extends Payment {
    private String cardNumber;
}

@Entity
@DiscriminatorValue("PAYPAL")
public class PayPalPayment extends Payment {
    private String payPalEmail;
}

// ── JOINED — separate table per subclass, joined by FK ──────────────────────
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Vehicle {
    @Id @GeneratedValue
    private Long id;
    private String make;
}

@Entity
public class Car extends Vehicle {
    private int doors;
}

// ── TABLE_PER_CLASS — separate complete table per concrete class ───────────
@Entity
@Inheritance(strategy = InheritanceType.TABLE_PER_CLASS)
public abstract class Shape {
    @Id @GeneratedValue
    private Long id;
}

// MappedSuperclass — fields shared but NOT an entity itself, no common table
@MappedSuperclass
public abstract class BaseEntity {
    @Id @GeneratedValue
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

@Entity
public class Product extends BaseEntity {
    private String name;  // inherits id, createdAt, updatedAt as columns on products table
}
```

---

## EntityManager

```java
import jakarta.persistence.*;

// Obtaining EntityManager (typically injected in CDI/Spring context)
@PersistenceContext
private EntityManager em;

// ── Persisting (Create) ─────────────────────────────────────────────────────
User user = new User("Alice", "alice@example.com", hash);
em.persist(user);   // INSERT — id is populated after flush

// ── Finding (Read) ──────────────────────────────────────────────────────────
User found = em.find(User.class, 1L);              // by primary key, null if not found
User ref   = em.getReference(User.class, 1L);       // lazy proxy — throws if accessed and not found

// ── Updating ─────────────────────────────────────────────────────────────
User user = em.find(User.class, 1L);
user.setName("Alice Smith");
// No explicit save needed — managed entity changes are tracked and flushed automatically

// merge — for detached entities
User detached = ...;  // came from outside persistence context
User managed = em.merge(detached);  // returns the managed copy

// ── Removing (Delete) ────────────────────────────────────────────────────
User toDelete = em.find(User.class, 1L);
em.remove(toDelete);

// ── Entity states ───────────────────────────────────────────────────────────
// Transient — new object, not associated with persistence context
// Managed   — associated, changes tracked automatically
// Detached  — was managed, but persistence context closed/cleared
// Removed   — scheduled for deletion

em.contains(entity)    // is it managed?
em.detach(entity)      // make it detached
em.refresh(entity)     // reload from DB, discard pending changes
em.clear()             // detach all managed entities
em.flush()             // force pending changes to be sent to DB now

// ── Transactions (typically managed by framework, shown for completeness) ──
EntityTransaction tx = em.getTransaction();
tx.begin();
try {
    em.persist(user);
    tx.commit();
} catch (Exception e) {
    tx.rollback();
    throw e;
}
```

---

## JPQL — Jakarta Persistence Query Language

JPQL queries operate on entities and their fields, not table/column names.

```java
// Basic query
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.active = true", User.class);
List<User> users = query.getResultList();

// With parameters (always use parameters — never string concatenation!)
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.email = :email", User.class);
query.setParameter("email", "alice@example.com");
User user = query.getSingleResult();   // throws if not exactly one result

// Positional parameters
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.age >= ?1 AND u.role = ?2", User.class);
query.setParameter(1, 18);
query.setParameter(2, Role.ADMIN);

// Pagination
TypedQuery<User> query = em.createQuery("SELECT u FROM User u ORDER BY u.name", User.class);
query.setFirstResult(20);    // offset
query.setMaxResults(10);     // limit
List<User> page = query.getResultList();

// Joins
TypedQuery<Book> query = em.createQuery(
    "SELECT b FROM Book b JOIN b.author a WHERE a.name = :authorName", Book.class);

// Fetch join — eagerly load association in ONE query (avoids N+1)
TypedQuery<Author> query = em.createQuery(
    "SELECT DISTINCT a FROM Author a LEFT JOIN FETCH a.books WHERE a.id = :id", Author.class);

// Aggregate functions
Long count = em.createQuery("SELECT COUNT(u) FROM User u WHERE u.active = true", Long.class)
    .getSingleResult();

Double avgAge = em.createQuery("SELECT AVG(u.age) FROM User u", Double.class).getSingleResult();

// Group by / Having
List<Object[]> results = em.createQuery(
    "SELECT u.role, COUNT(u) FROM User u GROUP BY u.role HAVING COUNT(u) > 5", Object[].class)
    .getResultList();

// Subqueries
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.id IN " +
    "(SELECT o.user.id FROM Order o WHERE o.total > 1000)", User.class);

// Constructor expressions — project into a DTO
record UserSummary(String name, String email) {}
TypedQuery<UserSummary> query = em.createQuery(
    "SELECT NEW com.example.UserSummary(u.name, u.email) FROM User u", UserSummary.class);

// Update / Delete (bulk operations — bypass entity lifecycle, no cascading)
int updated = em.createQuery("UPDATE User u SET u.active = false WHERE u.lastLogin < :date")
    .setParameter("date", cutoffDate)
    .executeUpdate();

int deleted = em.createQuery("DELETE FROM User u WHERE u.active = false")
    .executeUpdate();

// Named queries (defined on entity, reusable)
@Entity
@NamedQuery(name = "User.findActive", query = "SELECT u FROM User u WHERE u.active = true")
public class User { }

List<User> active = em.createNamedQuery("User.findActive", User.class).getResultList();

// Native SQL (when JPQL isn't enough)
List<User> users = em.createNativeQuery(
    "SELECT * FROM users WHERE created_at > ?1", User.class)
    .setParameter(1, someDate)
    .getResultList();
```

---

## Criteria API — Type-Safe Dynamic Queries

```java
CriteriaBuilder cb = em.getCriteriaBuilder();
CriteriaQuery<User> cq = cb.createQuery(User.class);
Root<User> root = cq.from(User.class);

// Simple WHERE
cq.select(root).where(cb.equal(root.get("active"), true));
List<User> users = em.createQuery(cq).getResultList();

// Dynamic conditions — build predicates based on what filters are provided
public List<User> search(String name, Role role, Boolean active) {
    CriteriaBuilder cb = em.getCriteriaBuilder();
    CriteriaQuery<User> cq = cb.createQuery(User.class);
    Root<User> root = cq.from(User.class);

    List<Predicate> predicates = new ArrayList<>();
    if (name != null)   predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
    if (role != null)   predicates.add(cb.equal(root.get("role"), role));
    if (active != null) predicates.add(cb.equal(root.get("active"), active));

    cq.select(root).where(predicates.toArray(new Predicate[0]));
    cq.orderBy(cb.asc(root.get("name")));

    return em.createQuery(cq).getResultList();
}

// Joins in Criteria API
Root<Book> book = cq.from(Book.class);
Join<Book, Author> author = book.join("author", JoinType.INNER);
cq.select(book).where(cb.equal(author.get("name"), "Tolkien"));

// Aggregate
CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
Root<User> countRoot = countQuery.from(User.class);
countQuery.select(cb.count(countRoot)).where(cb.equal(countRoot.get("active"), true));
Long count = em.createQuery(countQuery).getSingleResult();

// Subquery
CriteriaQuery<User> mainQuery = cb.createQuery(User.class);
Root<User> userRoot = mainQuery.from(User.class);

Subquery<Long> subquery = mainQuery.subquery(Long.class);
Root<Order> orderRoot = subquery.from(Order.class);
subquery.select(orderRoot.get("user").get("id"))
        .where(cb.gt(orderRoot.get("total"), 1000));

mainQuery.select(userRoot).where(userRoot.get("id").in(subquery));
```

---

## Transactions

```java
// Within JPA, transaction boundaries control when changes are flushed/committed

@ApplicationScoped
public class OrderService {

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public void placeOrder(Order order) {
        em.persist(order);
        // All changes committed together at method end (or rolled back on exception)
    }
}

// Isolation levels (set at connection/transaction manager level)
// READ_UNCOMMITTED — dirty reads possible
// READ_COMMITTED   — no dirty reads (most common default)
// REPEATABLE_READ  — no dirty/non-repeatable reads
// SERIALIZABLE     — full isolation, lowest concurrency

// Optimistic locking with @Version
@Entity
public class Product {
    @Id @GeneratedValue
    private Long id;

    @Version
    private Long version;   // incremented on each update; throws OptimisticLockException on conflict

    private int stock;
}

try {
    Product p = em.find(Product.class, id);
    p.setStock(p.getStock() - 1);
    em.flush();
} catch (OptimisticLockException e) {
    // another transaction modified this row first — retry or fail
}

// Pessimistic locking
Product p = em.find(Product.class, id, LockModeType.PESSIMISTIC_WRITE);
// SELECT ... FOR UPDATE — blocks other transactions from reading/writing this row
```

---

## Caching

```java
// First-level cache (persistence context) — automatic, per EntityManager
User u1 = em.find(User.class, 1L);
User u2 = em.find(User.class, 1L);
u1 == u2  // true — same managed instance, second find() didn't hit the DB

// Second-level cache (across EntityManagers, requires provider config like EhCache)
@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = org.hibernate.annotations.CacheConcurrencyStrategy.READ_WRITE)
public class Country {
    @Id
    private String code;
    private String name;
    // Rarely-changing reference data is a good candidate for 2nd-level cache
}

// Query cache (caches query RESULTS, not entities)
TypedQuery<User> query = em.createQuery("SELECT u FROM User u WHERE u.active = true", User.class);
query.setHint("org.hibernate.cacheable", true);
```

---

## Summary

- `@Entity` classes map to tables; `@Id` marks the primary key; `@GeneratedValue` handles auto-increment.
- Always use `FetchType.LAZY` for `@OneToMany` and `@ManyToMany` — `EAGER` causes performance problems (N+1 queries).
- `mappedBy` identifies the non-owning side of a bidirectional relationship — the owning side has the `@JoinColumn`.
- Use `JOIN FETCH` in JPQL to eagerly load associations in a single query when you know you'll need them.
- The Criteria API gives type-safe, composable queries — ideal for search endpoints with optional filters.
- `@Version` enables optimistic locking — prevents lost updates without database-level locks.
- JPQL operates on entity names and fields, NOT table/column names — `SELECT u FROM User u`, not `SELECT * FROM users`.
- Always use parameterized queries (`:paramName` or `?1`) — never concatenate user input into JPQL strings.
