---
title: "Spring MVC & REST"
sidebar_label: "Spring MVC & REST"
sidebar_position: 11
---

# Spring MVC & REST

Spring MVC handles HTTP request routing, request/response binding, validation, and content negotiation. `@RestController` is the standard way to build JSON APIs.

---

## Controllers

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ── GET ──────────────────────────────────────────────────────────────
    @GetMapping
    public List<UserDto> getAll() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserDto getById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @GetMapping("/search")
    public List<UserDto> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.search(query, page, size);
    }

    // Multiple path variables
    @GetMapping("/{userId}/orders/{orderId}")
    public OrderDto getOrder(@PathVariable Long userId, @PathVariable Long orderId) {
        return orderService.findByUserAndId(userId, orderId);
    }

    // ── POST ─────────────────────────────────────────────────────────────
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    // ── PUT ──────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    // ── PATCH ────────────────────────────────────────────────────────────
    @PatchMapping("/{id}")
    public UserDto partialUpdate(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return userService.partialUpdate(id, updates);
    }

    // ── DELETE ───────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }

    // ── ResponseEntity — full control over status, headers, body ──────────
    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable Long id) {
        byte[] image = userService.getAvatar(id);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_JPEG)
            .header("Cache-Control", "max-age=3600")
            .body(image);
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<UserDto> activate(@PathVariable Long id) {
        UserDto user = userService.activate(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/import")
    public ResponseEntity<Void> importUsers(@RequestBody List<CreateUserRequest> requests) {
        userService.bulkCreate(requests);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().build().toUri();
        return ResponseEntity.created(location).build();
    }
}
```

### Request Parameter Binding

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // Path variables
    @GetMapping("/{id}")
    public OrderDto get(@PathVariable Long id) { return null; }
    @GetMapping("/{id}")
    public OrderDto get(@PathVariable("id") Long orderId) { return null; }  // explicit name

    // Query parameters
    @GetMapping
    public List<OrderDto> list(
            @RequestParam(required = false) String status,        // optional, null if absent
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(name = "per_page", defaultValue = "20") int pageSize,
            @RequestParam List<String> tags                        // ?tags=a&tags=b → [a, b]
    ) { return null; }

    // Bind query params to an object
    public record OrderFilter(String status, Integer minAmount, LocalDate fromDate) {}
    @GetMapping("/filter")
    public List<OrderDto> filter(OrderFilter filter) { return null; }  // auto-bound from query params

    // Headers
    @GetMapping("/secure")
    public String secure(@RequestHeader("Authorization") String token,
                          @RequestHeader(value = "X-Request-Id", required = false) String requestId) {
        return null;
    }
    @GetMapping("/headers")
    public Map<String, String> allHeaders(@RequestHeader Map<String, String> headers) { return headers; }

    // Cookies
    @GetMapping("/cookie-test")
    public String readCookie(@CookieValue(value = "session", defaultValue = "none") String session) {
        return session;
    }

    // Request body
    @PostMapping
    public OrderDto create(@Valid @RequestBody CreateOrderRequest request) { return null; }

    // Matrix variables (rare)
    @GetMapping("/{id}/items;color={color}")
    public List<ItemDto> getItems(@PathVariable Long id, @MatrixVariable String color) { return null; }

    // Multipart file upload
    @PostMapping("/{id}/attachment")
    public void uploadAttachment(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        file.getOriginalFilename();
        file.getContentType();
        file.getSize();
        file.getBytes();
        file.transferTo(new File("/uploads/" + file.getOriginalFilename()));
    }

    @PostMapping("/{id}/attachments")
    public void uploadMultiple(@PathVariable Long id, @RequestParam("files") List<MultipartFile> files) { }

    // Full request/response objects (rarely needed directly)
    @GetMapping("/raw")
    public void rawAccess(HttpServletRequest request, HttpServletResponse response) {
        String ip = request.getRemoteAddr();
    }

    // Pageable (Spring Data) — auto-binds page, size, sort query params
    @GetMapping("/paged")
    public Page<OrderDto> paged(Pageable pageable) {
        // ?page=0&size=20&sort=createdAt,desc
        return orderService.findAll(pageable).map(OrderDto::from);
    }
}
```

---

## DTOs and Mapping

```java
// Request DTOs — what the client sends
public record CreateUserRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8) String password
) {}

public record UpdateUserRequest(
    @Size(min = 2, max = 100) String name,
    @Email String email
) {}

// Response DTOs — what the API returns (never expose entities directly!)
public record UserDto(
    Long id,
    String name,
    String email,
    String role,
    Instant createdAt
) {
    public static UserDto from(User user) {
        return new UserDto(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            user.getCreatedAt()
        );
    }
}

// Service layer maps entity → DTO
@Service
public class UserService {
    private final UserRepository repository;

    public List<UserDto> findAll() {
        return repository.findAll().stream()
            .map(UserDto::from)
            .toList();
    }

    public UserDto create(CreateUserRequest request) {
        User user = new User(request.name(), request.email(), encode(request.password()));
        return UserDto.from(repository.save(user));
    }
}

// MapStruct — auto-generated mapping (avoid hand-writing for large DTOs)
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
    User toEntity(CreateUserRequest request);
    List<UserDto> toDtoList(List<User> users);

    @Mapping(target = "id", ignore = true)
    void updateEntityFromDto(UpdateUserRequest request, @MappingTarget User user);
}
```

---

## Exception Handling

```java
// Global exception handler — catches exceptions across ALL controllers
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        ErrorResponse error = new ErrorResponse("NOT_FOUND", ex.getMessage(), Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.badRequest().body(new ValidationErrorResponse("VALIDATION_ERROR", fieldErrors));
    }

    @ExceptionHandler(ConstraintViolationException.class)   // for @RequestParam/@PathVariable validation
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
            .map(v -> v.getPropertyPath() + ": " + v.getMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", message, Instant.now()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)  // DB constraint violations
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("CONFLICT", "Resource already exists or violates constraints", Instant.now()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("FORBIDDEN", "Access denied", Instant.now()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)  // malformed JSON
    public ResponseEntity<ErrorResponse> handleMalformedJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("BAD_REQUEST", "Malformed request body", Instant.now()));
    }

    @ExceptionHandler(Exception.class)   // catch-all — always have one
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", Instant.now()));
    }
}

public record ErrorResponse(String code, String message, Instant timestamp) {}
public record ValidationErrorResponse(String code, Map<String, String> fieldErrors) {}

// Controller-local exception handler (scoped to one controller)
@RestController
public class UserController {
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}

// ResponseStatusException — quick inline exceptions without custom classes
@GetMapping("/{id}")
public UserDto getById(@PathVariable Long id) {
    return userService.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
}

// ProblemDetail (Spring 6+, RFC 7807)
@ExceptionHandler(EntityNotFoundException.class)
public ProblemDetail handleNotFound(EntityNotFoundException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setTitle("Resource Not Found");
    problem.setProperty("timestamp", Instant.now());
    return problem;
}
```

---

## CORS Configuration

```java
// Per-controller
@RestController
@CrossOrigin(origins = "https://myapp.com", maxAge = 3600)
public class UserController { }

// Per-method
@GetMapping("/public-data")
@CrossOrigin(origins = "*")
public List<Data> getPublicData() { return null; }

// Global CORS config (preferred — central control)
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://myapp.com", "http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}

// CORS bean (alternative — works with Spring Security too)
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://myapp.com"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

---

## Jackson Configuration

```java
@Configuration
public class JacksonConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            .build();
    }
}
```

```java
// Common Jackson annotations on DTOs/entities
public class UserDto {
    @JsonProperty("user_id")          // rename field in JSON output
    private Long id;

    @JsonIgnore                        // exclude from JSON entirely
    private String internalNotes;

    @JsonInclude(JsonInclude.Include.NON_NULL)  // omit if null
    private String middleName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    @JsonAlias({"username", "login"})  // accept multiple input names
    private String name;
}

// Constructor-based deserialization (records work automatically)
public record CreateUserRequest(
    @JsonProperty("full_name") String name,
    String email
) {}

// Custom serializer
public class MoneySerializer extends JsonSerializer<BigDecimal> {
    @Override
    public void serialize(BigDecimal value, JsonGenerator gen, SerializerProvider sp) throws IOException {
        gen.writeString("$" + value.setScale(2, RoundingMode.HALF_UP));
    }
}

public class Product {
    @JsonSerialize(using = MoneySerializer.class)
    private BigDecimal price;
}

// @JsonView — different views for different endpoints
public class Views {
    public interface Public {}
    public interface Internal extends Public {}
}

public class UserDto {
    @JsonView(Views.Public.class)
    private String name;

    @JsonView(Views.Internal.class)
    private String email;
}

@GetMapping("/public/{id}")
@JsonView(Views.Public.class)
public UserDto getPublic(@PathVariable Long id) { return null; }
```

---

## Content Negotiation

```java
// Returning different formats based on Accept header
@GetMapping(value = "/{id}", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
public UserDto get(@PathVariable Long id) { return null; }

// Accepting different content types
@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
public UserDto createJson(@RequestBody CreateUserRequest request) { return null; }

@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public UserDto createMultipart(@ModelAttribute CreateUserRequest request) { return null; }

// Custom media type version negotiation
@GetMapping(value = "/{id}", produces = "application/vnd.myapp.v2+json")
public UserDtoV2 getV2(@PathVariable Long id) { return null; }
```

---

## Request/Response Interceptors

```java
// HandlerInterceptor — runs before/after controller methods
@Component
public class RequestTimingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;   // false = stop processing, no controller call
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                  Object handler, Exception ex) {
        long start = (long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - start;
        log.info("{} {} took {}ms", request.getMethod(), request.getRequestURI(), duration);
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final RequestTimingInterceptor timingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(timingInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/health");
    }
}

// Filter — lower-level, runs for ALL requests (not just MVC-handled ones)
@Component
@Order(1)
public class CorrelationIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) req;
        String correlationId = httpReq.getHeader("X-Correlation-Id");
        if (correlationId == null) correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove("correlationId");
        }
    }
}
```

---

## Summary

- `@RestController` = `@Controller` + `@ResponseBody` — return values are serialized directly to the response body.
- Use `record`s for request/response DTOs — immutable, concise, validation annotations work directly on components.
- Never expose JPA entities directly from controllers — always map to DTOs to control the API contract.
- `@RestControllerAdvice` + `@ExceptionHandler` centralizes error handling across all controllers.
- `ResponseEntity<T>` gives full control over status code, headers, and body when you need it.
- Configure CORS globally via `WebMvcConfigurer.addCorsMappings()` rather than scattering `@CrossOrigin` annotations.
- `@Valid @RequestBody` triggers Bean Validation automatically — catch `MethodArgumentNotValidException` for field-level errors.
- Use `Pageable` parameters with Spring Data for automatic pagination/sorting query param binding.
