---
title: "Spring Testing"
sidebar_label: "Spring Testing"
sidebar_position: 14
---

# Spring Testing

Spring Boot Test combines JUnit 5, Mockito, AssertJ, and Spring's test context framework. This covers unit tests, slice tests, full integration tests, and Testcontainers.

---

## Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<!-- Includes: JUnit 5, Mockito, AssertJ, Hamcrest, JSONassert, Spring Test -->

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

---

## Plain Unit Tests (JUnit 5 + Mockito)

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;     // Mockito injects the @Mock fields via constructor

    @Test
    @DisplayName("Should create user with hashed password")
    void shouldCreateUser() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "password123");
        when(passwordEncoder.encode("password123")).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });

        // Act
        UserDto result = userService.create(request);

        // Assert
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Alice");
        verify(userRepository).save(argThat(u -> u.getPasswordHash().equals("hashed_password")));
    }

    @Test
    void shouldThrowWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "pass");

        assertThatThrownBy(() -> userService.create(request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldReturnEmptyWhenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<UserDto> result = userService.findById(99L);

        assertThat(result).isEmpty();
    }

    @Nested
    @DisplayName("Password validation")
    class PasswordValidation {
        @Test
        void shouldRejectShortPassword() {
            CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "short");
            assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ValidationException.class);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "a@", "@b.com", "invalid"})
    void shouldRejectInvalidEmails(String email) {
        CreateUserRequest request = new CreateUserRequest("Alice", email, "password123");
        assertThatThrownBy(() -> userService.create(request)).isInstanceOf(ValidationException.class);
    }
}
```

### Mockito Reference

```java
// Stubbing
when(mock.method()).thenReturn(value);
when(mock.method(anyString())).thenReturn(value);
when(mock.method(eq("specific"))).thenReturn(value);
when(mock.method()).thenThrow(new RuntimeException("error"));
when(mock.method()).thenAnswer(invocation -> computeValue(invocation.getArgument(0)));
when(mock.method()).thenReturn(value1).thenReturn(value2);  // different on successive calls

// void methods
doNothing().when(mock).voidMethod();
doThrow(new RuntimeException()).when(mock).voidMethod();
doAnswer(invocation -> { /* side effect */ return null; }).when(mock).voidMethod();

// Verification
verify(mock).method();                          // called exactly once
verify(mock, times(2)).method();                 // called exactly twice
verify(mock, never()).method();                  // never called
verify(mock, atLeastOnce()).method();
verify(mock, atLeast(2)).method();
verify(mock, atMost(3)).method();
verifyNoInteractions(mock);                       // mock never used at all
verifyNoMoreInteractions(mock);                   // no OTHER interactions beyond verified ones

// Argument matchers
any()                  // anything (including null)
anyString()
anyInt(), anyLong(), anyDouble(), anyBoolean()
anyList(), anyMap(), anySet()
eq(value)               // exact match
isNull(), isNotNull()
argThat(arg -> arg.getName().equals("Alice"))    // custom predicate

// Argument capture
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
verify(userRepository).save(captor.capture());
User captured = captor.getValue();
assertThat(captured.getEmail()).isEqualTo("alice@example.com");

// Spy — partial mock, real methods called unless stubbed
List<String> spyList = spy(new ArrayList<>());
doReturn(100).when(spyList).size();   // stub one method, others work normally
spyList.add("real call");             // this actually executes
```

---

## Spring Boot Test Slices

Slice tests load only the relevant part of the application context — much faster than full `@SpringBootTest`.

### @WebMvcTest — Controller Layer

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean                          // mock replaces real bean in the Spring context
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnUser() throws Exception {
        UserDto user = new UserDto(1L, "Alice", "alice@example.com", "USER", Instant.now());
        when(userService.findById(1L)).thenReturn(user);

        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        when(userService.findById(99L)).thenThrow(new EntityNotFoundException("User", 99L));

        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void shouldCreateUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "password123");
        UserDto created = new UserDto(1L, "Alice", "alice@example.com", "USER", Instant.now());
        when(userService.create(any())).thenReturn(created);

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void shouldReturn400ForInvalidInput() throws Exception {
        CreateUserRequest invalid = new CreateUserRequest("", "not-an-email", "x");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalid)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")    // simulate an authenticated admin user
    void shouldAllowAdminToDelete() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isNoContent());
        verify(userService).delete(1L);
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldForbidNonAdminFromDeleting() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized());
    }
}
```

### @DataJpaTest — Repository Layer

```java
@DataJpaTest   // configures in-memory DB, only loads JPA components
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;   // helper for setting up test data

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindByEmail() {
        User user = new User("Alice", "alice@example.com", "hash");
        entityManager.persistAndFlush(user);

        Optional<User> found = userRepository.findByEmail("alice@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Alice");
    }

    @Test
    void shouldReturnEmptyForUnknownEmail() {
        Optional<User> found = userRepository.findByEmail("nobody@example.com");
        assertThat(found).isEmpty();
    }

    @Test
    void shouldEnforceUniqueEmailConstraint() {
        entityManager.persistAndFlush(new User("Alice", "alice@example.com", "hash"));

        assertThatThrownBy(() ->
            entityManager.persistAndFlush(new User("Bob", "alice@example.com", "hash2"))
        ).isInstanceOf(PersistenceException.class);
    }

    @Test
    void shouldFindActiveUsersOrderedByName() {
        entityManager.persist(new User("Carol", "carol@example.com", "h", true));
        entityManager.persist(new User("Alice", "alice@example.com", "h", true));
        entityManager.persist(new User("Bob",   "bob@example.com",   "h", false));  // inactive
        entityManager.flush();

        List<User> active = userRepository.findByActiveTrueOrderByNameAsc();

        assertThat(active).extracting(User::getName).containsExactly("Alice", "Carol");
    }
}
```

### @JsonTest — Serialization

```java
@JsonTest
class UserDtoJsonTest {

    @Autowired
    private JacksonTester<UserDto> json;

    @Test
    void shouldSerialize() throws Exception {
        UserDto dto = new UserDto(1L, "Alice", "alice@example.com", "USER", Instant.parse("2024-01-01T00:00:00Z"));

        JsonContent<UserDto> result = json.write(dto);

        assertThat(result).hasJsonPathNumberValue("$.id");
        assertThat(result).extractingJsonPathStringValue("$.name").isEqualTo("Alice");
    }

    @Test
    void shouldDeserialize() throws Exception {
        String content = """
            {"id":1,"name":"Alice","email":"alice@example.com","role":"USER"}
            """;
        UserDto dto = json.parseObject(content);
        assertThat(dto.name()).isEqualTo("Alice");
    }
}
```

---

## @SpringBootTest — Full Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Transactional   // rolls back DB changes after each test
class UserIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void fullUserLifecycle() throws Exception {
        // Create
        String createBody = """
            {"name":"Alice","email":"alice@example.com","password":"password123"}
            """;
        String response = mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        Long id = JsonPath.read(response, "$.id");

        // Verify in DB
        User saved = userRepository.findById(id).orElseThrow();
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(passwordEncoder.matches("password123", saved.getPasswordHash())).isTrue();

        // Read
        mockMvc.perform(get("/api/users/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"));

        // Update
        mockMvc.perform(put("/api/users/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Alice Smith\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice Smith"));

        // Delete
        mockMvc.perform(delete("/api/users/" + id))
            .andExpect(status().isNoContent());

        assertThat(userRepository.findById(id)).isEmpty();
    }
}

// Using TestRestTemplate for full HTTP-level testing
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldCreateAndRetrieveUser() {
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@example.com", "password123");

        ResponseEntity<UserDto> createResponse = restTemplate.postForEntity("/api/users", request, UserDto.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        Long id = createResponse.getBody().id();

        ResponseEntity<UserDto> getResponse = restTemplate.getForEntity("/api/users/" + id, UserDto.class);
        assertThat(getResponse.getBody().name()).isEqualTo("Alice");
    }
}
```

---

## Testcontainers

Run real databases in Docker containers for integration tests — much more reliable than H2 mocking production behavior.

```java
@SpringBootTest
@Testcontainers
class UserRepositoryContainerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
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
    void shouldPersistToRealPostgres() {
        User user = userRepository.save(new User("Alice", "alice@example.com", "hash"));
        assertThat(user.getId()).isNotNull();
    }
}

// Shared container across test classes (faster test suite)
public abstract class AbstractIntegrationTest {
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        postgres.start();    // starts once, shared by all subclasses
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}

class UserServiceIntegrationTest extends AbstractIntegrationTest {
    // inherits the shared container setup
}

// Other common containers
@Container
static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

@Container
static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

@Container
static RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:3.13-management");
```

---

## Testing Async and Scheduled Code

```java
@SpringBootTest
class AsyncServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Test
    void shouldSendNotificationAsync() {
        notificationService.sendAsync("test message");

        // Await async completion
        await().atMost(5, TimeUnit.SECONDS)
            .untilAsserted(() -> verify(emailSender).send(any()));
    }
}
// Requires: implementation 'org.awaitility:awaitility'
```

---

## Test Configuration

```java
// Test-specific properties
@SpringBootTest
@TestPropertySource(properties = {
    "app.feature.enabled=true",
    "spring.datasource.url=jdbc:h2:mem:testdb"
})
class FeatureTest { }

// application-test.properties activated automatically with @ActiveProfiles
@SpringBootTest
@ActiveProfiles("test")
class ProfileBasedTest { }

// Test-only bean configuration
@TestConfiguration
public class TestConfig {
    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneOffset.UTC);
    }
}

@SpringBootTest
@Import(TestConfig.class)
class TimeBasedServiceTest { }
```

---

## Summary

- `@ExtendWith(MockitoExtension.class)` + `@Mock`/`@InjectMocks` for fast, isolated unit tests — no Spring context needed.
- `@WebMvcTest` loads only the web layer — use `@MockBean` to stub services, test with `MockMvc`.
- `@DataJpaTest` loads only JPA components with an in-memory DB — fast repository tests.
- `@SpringBootTest` loads the full application context — use sparingly, reserve for true integration tests.
- `@Transactional` on test classes rolls back DB changes after each test — keeps tests isolated.
- Testcontainers spins up real Docker containers (Postgres, Redis, Kafka) — far more reliable than in-memory substitutes for catching real bugs.
- `MockMvc` lets you test the full request/response cycle including JSON serialization, validation, and status codes — without starting a real server.
- Use `@WithMockUser` to simulate authenticated users in `@WebMvcTest` without a real login flow.
