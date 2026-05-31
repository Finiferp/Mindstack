---
title: "Spring Data JPA"
sidebar_label: "Spring Data JPA"
sidebar_position: 12
---

# Spring Data JPA

Spring Data JPA eliminates boilerplate repository code. You define an interface; Spring generates the implementation. Queries can be derived from method names, written in JPQL with `@Query`, or built dynamically with the Criteria API — all without writing any JDBC.

---

## Repository Hierarchy

Spring Data provides a hierarchy of repository interfaces:

```
Repository<T, ID>                 (marker, no methods)
└── CrudRepository<T, ID>         (save, findById, findAll, delete, count)
    └── PagingAndSortingRepository (+ paging and sorting)
        └── JpaRepository<T, ID>  (+ flush, saveAll, deleteInBatch, etc.)
```

Use `JpaRepository` — it gives you everything.

---

## Basic Repository

```java
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // All CRUD methods available immediately — no implementation needed
}
```

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User save(User user) {
        return userRepository.save(user);        // insert or update
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);      // returns Optional
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    public long count() {
        return userRepository.count();
    }

    public boolean exists(Long id) {
        return userRepository.existsById(id);
    }

    public List<User> saveAll(List<User> users) {
        return userRepository.saveAll(users);    // batch insert/update
    }
}
```

---

## Derived Query Methods

Spring Data generates SQL from method names by parsing the method signature.

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // Find by field
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);

    // Multiple conditions (And / Or)
    List<User> findByFirstNameAndLastName(String firstName, String lastName);
    List<User> findByRoleOrStatus(Role role, Status status);

    // Comparison
    List<User> findByAgeGreaterThan(int age);
    List<User> findByAgeBetween(int min, int max);
    List<User> findByCreatedAtAfter(LocalDateTime date);

    // String matching
    List<User> findByNameContainingIgnoreCase(String name);   // LIKE %name%
    List<User> findByEmailStartingWith(String prefix);         // LIKE prefix%
    List<User> findByNameEndingWith(String suffix);            // LIKE %suffix

    // Collections
    List<User> findByRoleIn(Collection<Role> roles);
    List<User> findByRoleNotIn(Collection<Role> roles);

    // Null checks
    List<User> findByDeletedAtIsNull();
    List<User> findByDeletedAtIsNotNull();

    // Boolean
    List<User> findByActiveTrue();
    List<User> findByActiveFalse();

    // Sorting
    List<User> findByRoleOrderByCreatedAtDesc(Role role);

    // Existence check
    boolean existsByEmail(String email);

    // Count
    long countByRole(Role role);

    // Delete
    void deleteByEmail(String email);
    long deleteByRoleAndActiveFalse(Role role);

    // Limiting results
    Optional<User> findFirstByRoleOrderByCreatedAtDesc(Role role);
    List<User> findTop10ByRoleOrderByCreatedAtDesc(Role role);
}
```

---

## @Query — Custom JPQL

When derived methods get complex, write JPQL explicitly:

```java
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.active = true")
    Optional<User> findActiveByEmail(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.createdAt BETWEEN :start AND :end")
    List<User> findCreatedBetween(@Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);

    // Projection — fetch only needed fields
    @Query("SELECT u.email FROM User u WHERE u.active = true")
    List<String> findAllActiveEmails();

    // Pagination with @Query
    @Query("SELECT u FROM User u WHERE u.role = :role")
    Page<User> findByRolePaged(@Param("role") Role role, Pageable pageable);

    // Update query
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.active = false WHERE u.lastLogin < :cutoff")
    int deactivateInactiveUsers(@Param("cutoff") LocalDateTime cutoff);

    // Delete query
    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.email = :email")
    void deleteByEmail(@Param("email") String email);

    // Native SQL (use sparingly)
    @Query(value = "SELECT * FROM users WHERE full_text_search(name) @@ :query",
           nativeQuery = true)
    List<User> fullTextSearch(@Param("query") String query);
}
```

---

## Projections

Fetch only the fields you need — faster queries, smaller objects.

```java
// Interface projection — Spring generates a proxy
public interface UserSummary {
    Long getId();
    String getName();
    String getEmail();
}

// DTO projection — constructor expression
public record UserSummaryDTO(Long id, String name, String email) {}

public interface UserRepository extends JpaRepository<User, Long> {

    // Interface projection
    List<UserSummary> findAllProjectedBy();
    Optional<UserSummary> findProjectedById(Long id);

    // DTO projection via JPQL constructor expression
    @Query("SELECT new com.example.dto.UserSummaryDTO(u.id, u.name, u.email) FROM User u")
    List<UserSummaryDTO> findAllSummaries();

    // Parameterized projection (dynamic)
    <T> List<T> findAllBy(Class<T> type); // caller decides projection type
}
```

---

## Paging and Sorting

```java
// Pageable-based queries
Page<User> page = userRepository.findAll(
    PageRequest.of(0, 20, Sort.by("createdAt").descending())
);

page.getContent();          // List<User> for this page
page.getTotalElements();    // total matching records
page.getTotalPages();       // total number of pages
page.getNumber();           // current page number (0-based)
page.getSize();             // page size
page.isFirst();             // true if first page
page.isLast();              // true if last page

// Slice (doesn't count total — faster for infinite scroll)
Slice<User> slice = userRepository.findAll(
    PageRequest.of(0, 20)
);
slice.hasNext(); // just tells you if there's a next page

// Sort-only
List<User> sorted = userRepository.findAll(Sort.by("name").ascending()
    .and(Sort.by("createdAt").descending()));
```

### Pageable from REST parameters
```java
@GetMapping
public Page<UserResponse> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "id") String sort,
        @RequestParam(defaultValue = "asc") String direction) {

    Sort.Direction dir = direction.equalsIgnoreCase("desc")
        ? Sort.Direction.DESC : Sort.Direction.ASC;

    Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sort));
    return userRepository.findAll(pageable).map(userMapper::toResponse);
}
```

---

## Specifications — Dynamic Queries

`JpaSpecificationExecutor` allows composing query predicates dynamically at runtime.

```java
public interface UserRepository extends JpaRepository<User, Long>,
                                          JpaSpecificationExecutor<User> {}
```

```java
public class UserSpecifications {

    public static Specification<User> hasRole(Role role) {
        return (root, query, cb) ->
            role == null ? null : cb.equal(root.get("role"), role);
    }

    public static Specification<User> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }

    public static Specification<User> nameContains(String name) {
        return (root, query, cb) ->
            name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<User> createdAfter(LocalDateTime date) {
        return (root, query, cb) ->
            date == null ? null : cb.greaterThan(root.get("createdAt"), date);
    }
}
```

```java
@Service
public class UserService {

    public List<User> search(Role role, String name, boolean onlyActive) {
        Specification<User> spec = Specification.where(null);

        if (role != null)     spec = spec.and(UserSpecifications.hasRole(role));
        if (name != null)     spec = spec.and(UserSpecifications.nameContains(name));
        if (onlyActive)       spec = spec.and(UserSpecifications.isActive());

        return userRepository.findAll(spec);
    }
}
```

---

## Auditing

Spring Data JPA can auto-fill audit fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

```java
// Enable in main class or config
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
@SpringBootApplication
public class MyApp {}

// Current user provider
@Component("auditorProvider")
public class AuditorProvider implements AuditorAware<String> {
    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext()
            .getAuthentication())
            .map(Authentication::getName);
    }
}

// Abstract base entity with audit fields
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}

// Entities extend it
@Entity
public class User extends AuditableEntity {
    // createdAt, updatedAt, createdBy, updatedBy are handled automatically
}
```

---

## Summary

Spring Data JPA turns data access into a declarative exercise:

- **JpaRepository** — CRUD, paging, and sorting for free.
- **Derived methods** — queries from method names, zero SQL for simple cases.
- **@Query** — JPQL or native SQL when you need full control.
- **Projections** — fetch only what you need.
- **Specifications** — compose dynamic, reusable query predicates.
- **Auditing** — automatic `createdAt`, `updatedAt`, `createdBy` fields.

**Key Takeaways:**
- Use `JpaRepository` — it gives you the most without any additional setup.
- Derived methods are great for up to 2-3 conditions. Beyond that, use `@Query` for clarity.
- Always add pagination to endpoints returning collections — never return unbounded lists.
- Use projections to avoid fetching entity fields you don't need in the response.
- `@Modifying` is required for `UPDATE` and `DELETE` queries — without it, an exception is thrown.
