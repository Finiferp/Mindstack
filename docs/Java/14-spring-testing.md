---
title: "Testing Spring Applications"
sidebar_label: "Testing"
sidebar_position: 14
---

# Testing Spring Applications

A well-tested Spring application has multiple layers of tests — fast unit tests that test logic in isolation, integration tests that verify layers work together, and end-to-end tests that exercise the full HTTP stack. Spring Boot provides excellent test support with minimal setup.

---

## Testing Pyramid

```
        ┌─────────────┐
        │   E2E / API │  few, slow, full stack
        ├─────────────┤
        │ Integration │  moderate, Spring context
        ├─────────────┤
        │    Unit     │  many, fast, no context
        └─────────────┘
```

- **Unit tests** — test one class in isolation. No Spring context, no database. Fast.
- **Integration tests** — test multiple layers together (e.g., service + repository + database).
- **Web layer tests** — test controller HTTP behavior without starting a full server.
- **End-to-end** — start the whole application and send real HTTP requests.

---

## Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<!-- spring-boot-starter-test includes:
     JUnit 5, Mockito, AssertJ, Hamcrest,
     Spring Test, Spring Boot Test, JsonPath -->
```

---

## Unit Tests with JUnit 5 and Mockito

Unit tests isolate the class under test. Dependencies are replaced with **mocks** — fake objects that return canned responses.

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;  // mocks injected into this

    @Test
    void shouldCreateUserSuccessfully() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "password123");
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        // Act
        UserResponse result = userService.create(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo("Alice");
        assertThat(result.email()).isEqualTo("alice@example.com");

        // Verify interactions
        verify(userRepository).existsByEmail("alice@example.com");
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
        verify(emailService).sendWelcomeEmail("alice@example.com");
    }

    @Test
    void shouldThrowWhenEmailAlreadyTaken() {
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "pass");
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Email already registered");

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldReturnEmptyWhenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<UserResponse> result = userService.findById(99L);

        assertThat(result).isEmpty();
    }
}
```

### Mockito Essentials

```java
// Stubbing
when(repo.findById(1L)).thenReturn(Optional.of(user));
when(repo.save(any(User.class))).thenReturn(user);
when(repo.findAll()).thenThrow(new RuntimeException("DB down"));
doNothing().when(emailService).send(anyString());
doAnswer(inv -> { /* custom logic */ return null; }).when(service).call(any());

// Argument matchers
any()                    // any object
any(User.class)          // any User instance
anyString()              // any String
anyLong()                // any long
eq("exact")              // exact value
argThat(u -> u.getId() == 1) // custom predicate

// Verification
verify(repo).save(any(User.class));         // called once
verify(repo, times(2)).findById(anyLong()); // called exactly twice
verify(repo, never()).delete(any());        // never called
verify(repo, atLeastOnce()).findAll();
verify(repo, atMost(3)).save(any());

// Capture arguments
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
verify(repo).save(captor.capture());
User saved = captor.getValue();
assertThat(saved.getEmail()).isEqualTo("test@example.com");
```

---

## AssertJ — Fluent Assertions

```java
// Basic
assertThat(result).isNotNull();
assertThat(result).isEqualTo(expected);
assertThat(result).isInstanceOf(UserResponse.class);

// Strings
assertThat(name).isEqualTo("Alice");
assertThat(name).contains("Ali");
assertThat(name).startsWith("Al");
assertThat(name).isNotBlank();

// Numbers
assertThat(count).isEqualTo(5);
assertThat(price).isGreaterThan(0.0);
assertThat(price).isBetween(1.0, 100.0);

// Collections
assertThat(list).hasSize(3);
assertThat(list).contains("Alice", "Bob");
assertThat(list).containsExactlyInAnyOrder("Bob", "Alice", "Charlie");
assertThat(list).doesNotContain("Dave");
assertThat(list).isEmpty();
assertThat(list).allMatch(u -> u.getAge() >= 18);
assertThat(list).anyMatch(u -> u.getRole() == Role.ADMIN);
assertThat(list).noneMatch(u -> u.getName().isBlank());

// Extracting fields from object list
assertThat(users)
    .extracting(User::getName)
    .containsExactly("Alice", "Bob", "Charlie");

assertThat(users)
    .extracting("name", "email")
    .contains(tuple("Alice", "alice@example.com"));

// Exceptions
assertThatThrownBy(() -> service.doSomething())
    .isInstanceOf(BusinessException.class)
    .hasMessage("Something went wrong")
    .hasFieldOrPropertyWithValue("code", "ERR_001");

assertThatNoException().isThrownBy(() -> service.safeOperation());

// Optional
assertThat(optional).isPresent();
assertThat(optional).hasValue(expected);
assertThat(optional).isEmpty();
```

---

## @SpringBootTest — Full Integration Tests

Loads the entire Spring context and all beans. Slow but comprehensive.

```java
@SpringBootTest
@Transactional                      // roll back DB changes after each test
@ActiveProfiles("test")            // use application-test.yml
class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldPersistUserToDatabase() {
        CreateUserRequest request = new CreateUserRequest("Bob", "bob@example.com", "pass123!");

        UserResponse result = userService.create(request);

        assertThat(result.id()).isNotNull();
        assertThat(userRepository.existsByEmail("bob@example.com")).isTrue();
    }

    @Test
    void shouldFindUserByEmail() {
        // Given — seed data
        userRepository.save(new User("Test", "test@example.com", "hash"));

        // When
        Optional<UserResponse> found = userService.findByEmail("test@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().email()).isEqualTo("test@example.com");
    }
}
```

### Test Database with H2

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
```

### Test Database with Testcontainers (real PostgreSQL in Docker)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndFindUser() {
        User user = new User("Alice", "alice@example.com", "hash");
        userRepository.save(user);

        Optional<User> found = userRepository.findByEmail("alice@example.com");
        assertThat(found).isPresent();
    }
}
```

---

## @WebMvcTest — Controller Layer Tests

Tests only the web layer (controllers, filters, exception handlers). Much faster than `@SpringBootTest`.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean                       // mock the service — not loaded by @WebMvcTest
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnUserWhenFound() throws Exception {
        UserResponse user = new UserResponse(1L, "Alice", "alice@example.com", LocalDateTime.now());
        when(userService.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/users/1")
                .header("Authorization", "Bearer valid-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userService.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateUserAndReturn201() throws Exception {
        CreateUserRequest request = new CreateUserRequest("Bob", "bob@example.com", "pass123!");
        UserResponse created = new UserResponse(2L, "Bob", "bob@example.com", LocalDateTime.now());
        when(userService.create(any())).thenReturn(created);

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(2))
            .andExpect(header().exists("Location"));
    }

    @Test
    void shouldReturn400WhenEmailIsInvalid() throws Exception {
        CreateUserRequest badRequest = new CreateUserRequest("Bob", "not-an-email", "pass123!");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturnPagedResults() throws Exception {
        Page<UserResponse> page = new PageImpl<>(List.of(
            new UserResponse(1L, "Alice", "alice@example.com", LocalDateTime.now())
        ));
        when(userService.findAll(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/users").param("page", "0").param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.totalElements").value(1));
    }
}
```

---

## @DataJpaTest — Repository Tests

Tests only the JPA layer — loads only repositories, entities, and the datasource. No service or web layer.

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // use real DB via Testcontainers
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindByEmail() {
        // Use TestEntityManager to persist test data bypassing the repository
        User user = new User("Alice", "alice@example.com", "hash");
        entityManager.persistAndFlush(user);

        Optional<User> found = userRepository.findByEmail("alice@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Alice");
    }

    @Test
    void shouldReturnEmptyWhenEmailNotFound() {
        Optional<User> found = userRepository.findByEmail("unknown@example.com");
        assertThat(found).isEmpty();
    }

    @Test
    void shouldFindActiveUsersOnly() {
        entityManager.persist(new User("Active", "active@example.com", "hash", true));
        entityManager.persist(new User("Inactive", "inactive@example.com", "hash", false));
        entityManager.flush();

        List<User> actives = userRepository.findByActiveTrue();
        assertThat(actives).hasSize(1);
        assertThat(actives.get(0).getEmail()).isEqualTo("active@example.com");
    }
}
```

---

## Testing with Security

```java
@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtil jwtUtil;

    @Test
    void shouldReturn401WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")           // fake authenticated user
    void shouldAllowAdminAccess() throws Exception {
        when(userService.findAll(any())).thenReturn(Page.empty());

        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldDenyUserFromAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
            .andExpect(status().isForbidden());
    }

    // Custom @WithMockUser for your principal type
    @WithSecurityContext(factory = WithMockCustomUserFactory.class)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface WithMockCustomUser {
        long id() default 1L;
        String email() default "test@example.com";
        String role() default "USER";
    }
}
```

---

## Parameterized Tests

```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "  "})
void shouldFailWhenNameIsBlank(String name) {
    assertThatThrownBy(() -> userService.create(new CreateUserRequest(name, "a@b.com", "pass")))
        .isInstanceOf(ValidationException.class);
}

@ParameterizedTest
@CsvSource({
    "alice@example.com, true",
    "not-an-email, false",
    "@nodomain, false",
    "user@domain.co.uk, true"
})
void shouldValidateEmails(String email, boolean valid) {
    assertThat(EmailValidator.isValid(email)).isEqualTo(valid);
}

@ParameterizedTest
@MethodSource("rolePermissionProvider")
void shouldEnforceRolePermissions(Role role, String endpoint, int expectedStatus) throws Exception {
    // Test role-based access
}

static Stream<Arguments> rolePermissionProvider() {
    return Stream.of(
        Arguments.of(Role.ADMIN, "/api/admin/users", 200),
        Arguments.of(Role.USER, "/api/admin/users", 403),
        Arguments.of(Role.USER, "/api/profile", 200)
    );
}
```

---

## Test Slices Summary

| Annotation         | Loads                              | Use For                        |
|--------------------|------------------------------------|--------------------------------|
| `@SpringBootTest`  | Full context                       | Integration, end-to-end        |
| `@WebMvcTest`      | Controllers, filters, MVC config   | Controller / HTTP layer        |
| `@DataJpaTest`     | Repositories, JPA, datasource      | Repository queries             |
| `@DataRedisTest`   | Redis repositories                 | Redis repositories             |
| `@RestClientTest`  | RestClient/RestTemplate + mocking  | HTTP client code               |
| No annotation      | Nothing (JUnit 5 only)             | Pure unit tests                |

---

## Summary

Spring Boot's test ecosystem supports every layer of the pyramid:

- **Unit tests** — JUnit 5 + Mockito, no Spring context, fast feedback.
- **@WebMvcTest** — test controllers and HTTP behavior with MockMvc.
- **@DataJpaTest** — test repository queries against an in-memory or real DB.
- **@SpringBootTest** — full integration tests with the entire application context.
- **Testcontainers** — real databases in Docker for reliable integration tests.

**Key Takeaways:**
- Write more unit tests than integration tests — they're faster and cheaper.
- Use `@MockBean` in `@WebMvcTest` to replace service beans with mocks.
- Use `@WithMockUser` to test security constraints without a real JWT.
- Use Testcontainers for integration tests that require a real database — H2 behaves differently from PostgreSQL.
- Follow the Arrange/Act/Assert pattern for clear, readable tests.
