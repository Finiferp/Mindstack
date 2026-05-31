---
title: "Spring MVC — REST APIs"
sidebar_label: "Spring MVC / REST"
sidebar_position: 11
---

# Spring MVC — Building REST APIs

Spring MVC is the web layer of Spring. In the context of REST APIs, it maps HTTP requests to Java methods, handles serialization/deserialization, validates input, and lets you structure clean layered applications. Combined with Spring Boot, it's the industry standard for building Java REST services.

---

## The Layered Architecture

A well-structured Spring Boot REST application has distinct layers:

```
HTTP Request
    ↓
Controller (handles HTTP, delegates to service)
    ↓
Service (business logic, orchestration)
    ↓
Repository (data access)
    ↓
Database
```

Each layer has one responsibility. Controllers know about HTTP; services know about business rules; repositories know about data storage.

---

## @RestController

`@RestController` = `@Controller` + `@ResponseBody`. Every method's return value is serialized directly to the response body (as JSON by default).

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(@PathVariable Long id,
                                   @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }

    @GetMapping("/search")
    public Page<UserResponse> searchUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy) {

        return userService.search(name, email, PageRequest.of(page, size, Sort.by(sortBy)));
    }
}
```

### Request Mapping Annotations

| Annotation        | HTTP Method | Typical Use               |
|-------------------|-------------|---------------------------|
| `@GetMapping`     | GET         | Retrieve resource(s)      |
| `@PostMapping`    | POST        | Create a resource         |
| `@PutMapping`     | PUT         | Full update               |
| `@PatchMapping`   | PATCH       | Partial update            |
| `@DeleteMapping`  | DELETE      | Delete a resource         |

---

## Request Data Extraction

```java
@GetMapping("/{id}/orders")
public List<OrderResponse> getOrders(
        @PathVariable Long id,                         // /users/42/orders
        @RequestParam(defaultValue = "0") int page,    // ?page=2
        @RequestParam(required = false) String status, // ?status=active
        @RequestHeader("Authorization") String token,  // header
        @CookieValue(value = "session", required = false) String session) {

    return orderService.findForUser(id, status, page);
}

@PostMapping
public UserResponse create(
        @Valid @RequestBody CreateUserRequest body) {   // JSON body
    return userService.create(body);
}

// Multiple query params — group into a record or class with @ModelAttribute
@GetMapping("/filter")
public List<UserResponse> filter(@ModelAttribute UserFilter filter) {
    return userService.filter(filter);
}

public record UserFilter(String name, String role, Boolean active) {}
```

---

## ResponseEntity

`ResponseEntity` gives full control over the HTTP response — status, headers, and body.

```java
@GetMapping("/{id}")
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
    return userService.findById(id)
        .map(user -> ResponseEntity.ok()
            .header("X-User-Id", String.valueOf(id))
            .body(user))
        .orElse(ResponseEntity.notFound().build());
}

@PostMapping
public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
    UserResponse created = userService.create(req);
    URI location = ServletUriComponentsBuilder
        .fromCurrentRequest()
        .path("/{id}")
        .buildAndExpand(created.id())
        .toUri();
    return ResponseEntity.created(location).body(created);
}

// Custom error response
@GetMapping("/missing")
public ResponseEntity<ErrorResponse> notFound() {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse("NOT_FOUND", "Resource not found"));
}
```

---

## DTOs — Data Transfer Objects

Never expose your JPA entities directly. Use DTOs (plain records or classes) as the API contract.

```java
// Request DTOs — incoming data
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email,
    @Size(min = 8) String password
) {}

public record UpdateUserRequest(
    @Size(min = 2, max = 100) String name,
    String bio
) {}

// Response DTOs — outgoing data
public record UserResponse(
    Long id,
    String name,
    String email,
    LocalDateTime createdAt
) {}

// Page response wrapper
public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isLast()
        );
    }
}
```

---

## Exception Handling — @ControllerAdvice

Centralize error handling with `@ControllerAdvice` + `@ExceptionHandler`. Never let exceptions bubble up as 500 errors.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handle not found
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ValidationErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
        return new ValidationErrorResponse("VALIDATION_ERROR", errors);
    }

    // Handle business rule violations
    @ExceptionHandler(BusinessException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleBusiness(BusinessException ex) {
        return new ErrorResponse(ex.getCode(), ex.getMessage());
    }

    // Catch-all
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred");
    }
}

// Response records
public record ErrorResponse(String code, String message) {}
public record ValidationErrorResponse(String code, List<FieldError> errors) {}
public record FieldError(String field, String message) {}
```

---

## Validation

Spring Boot integrates Bean Validation automatically.

```java
public record CreateProductRequest(
    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Name must be at most 200 characters")
    String name,

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    BigDecimal price,

    @Min(value = 0, message = "Stock cannot be negative")
    int stock,

    @Valid  // cascade validation into nested object
    @NotNull
    CategoryRequest category
) {}
```

```java
@PostMapping
public ProductResponse create(@Valid @RequestBody CreateProductRequest request) {
    // Spring automatically validates and returns 400 if invalid
    return productService.create(request);
}
```

### Custom Validators
```java
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
@Constraint(validatedBy = UniqueEmailValidator.class)
public @interface UniqueEmail {
    String message() default "Email is already registered";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {

    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        return email == null || !userRepository.existsByEmail(email);
    }
}
```

---

## CORS Configuration

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://myapp.com", "http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}

// Or per-controller
@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class UserController { ... }
```

---

## Content Negotiation and Jackson

Spring Boot uses Jackson to serialize/deserialize JSON. Configure it globally:

```java
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }
}
```

```java
// Control serialization on individual fields
public class UserResponse {

    @JsonProperty("user_id")           // custom field name in JSON
    private Long id;

    @JsonIgnore                        // never include in JSON
    private String password;

    @JsonFormat(pattern = "yyyy-MM-dd") // date format
    private LocalDate birthDate;

    @JsonInclude(JsonInclude.Include.NON_NULL) // only include if not null
    private String bio;
}
```

---

## Summary

Spring MVC + Spring Boot is a powerful, expressive REST API stack:

- **@RestController** — maps Java methods to HTTP endpoints.
- **@RequestBody / @PathVariable / @RequestParam** — extract request data cleanly.
- **ResponseEntity** — full control over status codes and headers.
- **DTOs** — clean API contract, decoupled from the domain model.
- **@ControllerAdvice** — centralized, consistent error handling.
- **@Valid** — declarative input validation with automatic 400 responses.

**Key Takeaways:**
- Never expose JPA entities directly from your REST controllers — always map to DTOs.
- Use `ResponseEntity` when you need to control status codes or headers; use `@ResponseStatus` for simple fixed codes.
- One `@RestControllerAdvice` class handles all exception types — keep it focused and exhaustive.
- Set CORS explicitly in a config bean, not with `@CrossOrigin` scattered across controllers.
- Configure Jackson in one place — consistent date formats and null handling across the entire API.
