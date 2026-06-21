---
title: "Spring Data JPA"
sidebar_label: "Spring Data JPA"
sidebar_position: 12
---

# Spring Data JPA

Spring Data JPA eliminates boilerplate data access code. Define a repository interface, and Spring generates the implementation at runtime.

---

## Repository Basics

```java
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // Inherits: save, findById, findAll, deleteById, count, existsById, etc.
}

// Built-in methods from JpaRepository<T, ID>
userRepository.save(user)                    // insert or update
userRepository.saveAll(users)                 // batch save
userRepository.saveAndFlush(user)            // save + immediate flush to DB
userRepository.findById(1L)                   // Optional<User>
userRepository.findAll()                      // List<User>
userRepository.findAllById(List.of(1L,2L,3L)) // List<User>
userRepository.existsById(1L)                 // boolean
userRepository.count()                        // long
userRepository.deleteById(1L)
userRepository.delete(user)
userRepository.deleteAll()
userRepository.deleteAllById(List.of(1L,2L))
userRepository.flush()                        // force pending changes to DB

// Sorting and Paging (from PagingAndSortingRepository, included in JpaRepository)
userRepository.findAll(Sort.by("name").ascending())
userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
userRepository.findAll(PageRequest.of(0, 20))                    // page 0, size 20
userRepository.findAll(PageRequest.of(0, 20, Sort.by("name")))   // with sort
```

---

## Derived Query Methods

Spring Data generates queries from method names following a convention.

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // ── Find by single field ────────────────────────────────────────────
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByActiveTrue();
    List<User> findByActiveFalse();

    // ── Find by multiple fields (AND / OR) ──────────────────────────────
    List<User> findByRoleAndActive(Role role, boolean active);
    List<User> findByNameOrEmail(String name, String email);

    // ── Comparison operators ────────────────────────────────────────────
    List<User> findByAgeGreaterThan(int age);
    List<User> findByAgeGreaterThanEqual(int age);
    List<User> findByAgeLessThan(int age);
    List<User> findByAgeBetween(int min, int max);
    List<User> findByCreatedAtAfter(Instant date);
    List<User> findByCreatedAtBefore(Instant date);

    // ── String matching ─────────────────────────────────────────────────
    List<User> findByNameContaining(String substring);          // LIKE %substring%
    List<User> findByNameStartingWith(String prefix);            // LIKE prefix%
    List<User> findByNameEndingWith(String suffix);               // LIKE %suffix
    List<User> findByNameContainingIgnoreCase(String substring);
    List<User> findByNameIgnoreCase(String name);                 // case-insensitive equals

    // ── Null checks ──────────────────────────────────────────────────────
    List<User> findByDeletedAtIsNull();
    List<User> findByDeletedAtIsNotNull();

    // ── Collections (IN clause) ─────────────────────────────────────────
    List<User> findByRoleIn(Collection<Role> roles);
    List<User> findByIdNotIn(Collection<Long> ids);

    // ── Ordering ─────────────────────────────────────────────────────────
    List<User> findByRoleOrderByNameAsc(Role role);
    List<User> findByRoleOrderByCreatedAtDesc(Role role);
    List<User> findByActiveOrderByNameAscCreatedAtDesc(boolean active);  // multi-field sort

    // ── Limiting results ─────────────────────────────────────────────────
    User findFirstByOrderByCreatedAtDesc();                      // most recent
    List<User> findTop10ByOrderByScoreDesc();                    // leaderboard
    List<User> findFirst5ByRole(Role role);

    // ── Counting and existence ──────────────────────────────────────────
    long countByRole(Role role);
    boolean existsByEmail(String email);

    // ── Deleting ─────────────────────────────────────────────────────────
    void deleteByRole(Role role);
    long deleteByActiveFalseAndCreatedAtBefore(Instant cutoff);

    // ── Nested property access (dot notation in method name) ───────────
    List<Order> findByUserEmail(String email);                   // order.user.email
    List<Order> findByUser_Email(String email);                  // same, underscore disambiguates

    // ── With Pageable / Sort parameter ──────────────────────────────────
    Page<User> findByRole(Role role, Pageable pageable);
    List<User> findByActive(boolean active, Sort sort);

    // ── Distinct ─────────────────────────────────────────────────────────
    List<String> findDistinctRoleBy();
}
```

---

## @Query — Custom JPQL/SQL

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // JPQL with named parameters (preferred — clearer than positional)
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.active = true")
    Optional<User> findActiveByEmail(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.createdAt BETWEEN :start AND :end")
    List<User> findByDateRange(@Param("start") Instant start, @Param("end") Instant end);

    // JOIN FETCH — avoid N+1 by eagerly loading association in one query
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.orders WHERE u.id = :id")
    Optional<User> findByIdWithOrders(@Param("id") Long id);

    // Aggregate queries
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRoleCustom(@Param("role") Role role);

    @Query("SELECT u.role, COUNT(u) FROM User u GROUP BY u.role")
    List<Object[]> countUsersByRole();

    // Constructor expression — project directly into a DTO
    @Query("SELECT new com.example.dto.UserSummary(u.id, u.name, u.email) FROM User u WHERE u.active = true")
    List<UserSummary> findActiveSummaries();

    // Native SQL — when JPQL isn't enough (DB-specific functions, complex queries)
    @Query(value = "SELECT * FROM users WHERE email ILIKE %:term%", nativeQuery = true)
    List<User> searchByEmailNative(@Param("term") String term);

    @Query(value = """
        SELECT u.* FROM users u
        JOIN orders o ON o.user_id = u.id
        WHERE o.total > :minTotal
        GROUP BY u.id
        HAVING COUNT(o.id) >= :minOrders
        """, nativeQuery = true)
    List<User> findHighValueCustomers(@Param("minTotal") BigDecimal minTotal, @Param("minOrders") int minOrders);

    // Modifying queries — UPDATE/DELETE (need @Modifying + @Transactional)
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.active = false WHERE u.lastLoginAt < :cutoff")
    int deactivateInactiveUsers(@Param("cutoff") Instant cutoff);

    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.active = false AND u.createdAt < :cutoff")
    int purgeInactiveUsers(@Param("cutoff") Instant cutoff);

    @Modifying
    @Query(value = "UPDATE users SET last_login_at = NOW() WHERE id = :id", nativeQuery = true)
    void updateLastLogin(@Param("id") Long id);

    // Sorting and paging with @Query
    @Query("SELECT u FROM User u WHERE u.role = :role")
    Page<User> findByRolePaged(@Param("role") Role role, Pageable pageable);

    // Optional clearAutomatically/flushAutomatically for @Modifying
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE User u SET u.name = :name WHERE u.id = :id")
    void updateName(@Param("id") Long id, @Param("name") String name);
}
```

---

## Projections

Project query results into interfaces or DTOs to fetch only the needed columns.

```java
// Interface-based projection (closed — only declared methods)
public interface UserSummaryProjection {
    Long getId();
    String getName();
    String getEmail();
}

public interface UserRepository extends JpaRepository<User, Long> {
    List<UserSummaryProjection> findByRole(Role role);

    // Nested projection
    interface OrderSummary {
        Long getId();
        BigDecimal getTotal();
        UserSummaryProjection getUser();
    }
    List<OrderSummary> findAllProjectedBy();
}

// Open projection (SpEL expression — can combine fields)
public interface UserNameProjection {
    @Value("#{target.firstName + ' ' + target.lastName}")
    String getFullName();
}

// Class-based projection (DTO) — works with constructor
public class UserDto {
    private final Long id;
    private final String name;
    public UserDto(Long id, String name) { this.id = id; this.name = name; }
    // getters
}

public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT new com.example.UserDto(u.id, u.name) FROM User u")
    List<UserDto> findAllAsDto();
}

// Dynamic projections — same query, different projection types
public interface UserRepository extends JpaRepository<User, Long> {
    <T> List<T> findByRole(Role role, Class<T> type);
}
// Usage:
List<User> full = repo.findByRole(Role.ADMIN, User.class);
List<UserSummaryProjection> summary = repo.findByRole(Role.ADMIN, UserSummaryProjection.class);
```

---

## Paging and Sorting

```java
@Service
public class UserService {
    private final UserRepository repository;

    public Page<User> getUsers(int page, int size, String sortBy, String direction) {
        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return repository.findAll(pageable);
    }
}

// Page<T> contents
Page<User> page = repository.findAll(pageable);
page.getContent()           // List<User> — the actual data
page.getTotalElements()     // total count across all pages
page.getTotalPages()        // total number of pages
page.getNumber()            // current page number (0-indexed)
page.getSize()              // page size
page.isFirst()              // true if first page
page.isLast()                // true if last page
page.hasNext()
page.hasPrevious()
page.getSort()              // Sort applied
page.map(User::toDto)       // transform content (returns Page<UserDto>)

// Slice<T> — like Page but without total count (more efficient — no COUNT query)
Slice<User> slice = repository.findByActiveTrue(pageable);
slice.hasNext()
slice.getContent()

// Controller integration — Pageable auto-binds from request params
@GetMapping
public Page<UserDto> list(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
        Pageable pageable) {
    return repository.findAll(pageable).map(UserDto::from);
}
// Request: GET /users?page=0&size=10&sort=name,asc&sort=createdAt,desc
```

---

## Specifications — Dynamic Queries

```java
// Enable Specification support
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
}

// Define reusable specifications
public class UserSpecifications {

    public static Specification<User> hasRole(Role role) {
        return (root, query, cb) -> role == null ? null : cb.equal(root.get("role"), role);
    }

    public static Specification<User> nameContains(String name) {
        return (root, query, cb) -> name == null ? null :
            cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<User> isActive(Boolean active) {
        return (root, query, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    }

    public static Specification<User> createdAfter(Instant date) {
        return (root, query, cb) -> date == null ? null : cb.greaterThan(root.get("createdAt"), date);
    }
}

// Combine specifications dynamically
@Service
public class UserService {
    private final UserRepository repository;

    public List<User> search(String name, Role role, Boolean active) {
        Specification<User> spec = Specification
            .where(UserSpecifications.nameContains(name))
            .and(UserSpecifications.hasRole(role))
            .and(UserSpecifications.isActive(active));

        return repository.findAll(spec);
    }

    public Page<User> searchPaged(String name, Role role, Pageable pageable) {
        Specification<User> spec = Specification
            .where(UserSpecifications.nameContains(name))
            .and(UserSpecifications.hasRole(role));
        return repository.findAll(spec, pageable);
    }
}

// Inline specification with complex joins
public static Specification<Order> hasUserEmail(String email) {
    return (root, query, cb) -> {
        Join<Order, User> userJoin = root.join("user");
        return cb.equal(userJoin.get("email"), email);
    };
}
```

---

## Auditing

```java
// Enable JPA auditing
@Configuration
@EnableJpaAuditing
public class JpaConfig {
    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.of("system");
            return Optional.of(auth.getName());
        };
    }
}

// Base entity with audit fields
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Auditable {

    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;

    // getters
}

@Entity
public class Order extends Auditable {
    @Id @GeneratedValue
    private Long id;
    // Automatically gets createdAt, updatedAt, createdBy, updatedBy populated
}
```

---

## Custom Repository Methods

```java
// When derived methods and @Query aren't enough — full custom implementation

// 1. Define custom interface
public interface UserRepositoryCustom {
    List<User> findUsersWithComplexLogic(SearchCriteria criteria);
}

// 2. Implement it
@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<User> findUsersWithComplexLogic(SearchCriteria criteria) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<User> query = cb.createQuery(User.class);
        Root<User> root = query.from(User.class);

        // build complex predicate logic
        List<Predicate> predicates = buildPredicates(cb, root, criteria);
        query.where(predicates.toArray(new Predicate[0]));

        return em.createQuery(query).getResultList();
    }

    private List<Predicate> buildPredicates(CriteriaBuilder cb, Root<User> root, SearchCriteria c) {
        List<Predicate> predicates = new ArrayList<>();
        // ... build based on criteria
        return predicates;
    }
}

// 3. Extend both interfaces — Spring combines them automatically
public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom {
    // Has derived methods, @Query methods, AND custom implementation methods
}
// Naming convention: UserRepository + Impl suffix → UserRepositoryImpl (must match!)
```

---

## Entity Graphs (Avoiding N+1)

```java
// Define named entity graph on entity
@Entity
@NamedEntityGraph(
    name = "User.withOrders",
    attributeNodes = @NamedAttributeNode("orders")
)
public class User {
    @OneToMany(mappedBy = "user")
    private List<Order> orders;
}

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(value = "User.withOrders", type = EntityGraph.EntityGraphType.LOAD)
    Optional<User> findById(Long id);   // overrides default findById — eagerly loads orders

    // Ad-hoc entity graph (no need to define on entity)
    @EntityGraph(attributePaths = {"orders", "orders.items"})
    List<User> findByActive(boolean active);
}
```

---

## Summary

- Derived query methods (`findByEmailAndActive`) cover most simple queries — no SQL needed.
- Use `@Query` with named parameters for anything more complex than a derived method can express.
- Always use `JOIN FETCH` or `@EntityGraph` when you know you'll access a lazy association — avoids N+1 query problems.
- `Specification` enables composable, dynamic queries — ideal for search/filter endpoints with optional criteria.
- `Page<T>` includes total count (extra COUNT query); `Slice<T>` doesn't — use `Slice` for infinite-scroll UIs where you don't need totals.
- `@Modifying` + `@Transactional` is required for `UPDATE`/`DELETE` queries via `@Query`.
- `@EnableJpaAuditing` + `@CreatedDate`/`@LastModifiedDate`/`@CreatedBy`/`@LastModifiedBy` automates audit columns.
- Use projections (interface-based or DTO) to fetch only needed columns — reduces data transfer for read-heavy endpoints.
