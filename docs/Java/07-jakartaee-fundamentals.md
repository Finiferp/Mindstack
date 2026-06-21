---
title: "Jakarta EE Fundamentals"
sidebar_label: "Jakarta EE"
sidebar_position: 7
---

# Jakarta EE Fundamentals

Jakarta EE (formerly Java EE) is a set of specifications for enterprise Java. Spring Boot uses many of these standards under the hood (Servlets, Bean Validation, JTA). Understanding the raw specs helps you understand what Spring abstracts away.

---

## Servlets

A Servlet handles HTTP requests at the lowest level.

```java
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {

    @Override
    public void init() throws ServletException {
        // Called once when servlet is loaded
        System.out.println("Servlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setContentType("text/html");
        resp.setCharacterEncoding("UTF-8");

        String name = req.getParameter("name");  // query param or form field
        if (name == null) name = "World";

        PrintWriter out = resp.getWriter();
        out.println("<h1>Hello, " + name + "!</h1>");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        // Read request body
        BufferedReader reader = req.getReader();
        StringBuilder body = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) body.append(line);

        resp.setStatus(HttpServletResponse.SC_CREATED);  // 201
        resp.setContentType("application/json");
        resp.getWriter().write("{\"received\":\"" + body + "\"}");
    }

    @Override
    public void destroy() {
        // Called once when servlet is unloaded
        System.out.println("Servlet destroyed");
    }
}
```

### HttpServletRequest — Reading the Request

```java
req.getMethod()              // "GET", "POST", etc.
req.getRequestURI()          // "/app/hello"
req.getRequestURL()          // full URL as StringBuffer
req.getQueryString()         // "name=Alice&age=30"
req.getParameter("name")     // "Alice" — query param or form field
req.getParameterValues("tag")// String[] — multiple values
req.getParameterMap()        // Map<String, String[]>
req.getHeader("Authorization") // header value
req.getHeaderNames()          // Enumeration<String>
req.getContentType()          // "application/json"
req.getContentLength()        // body size in bytes
req.getRemoteAddr()           // client IP
req.getSession()              // get or create HttpSession
req.getSession(false)         // get existing session, null if none
req.getCookies()              // Cookie[]
req.getInputStream()          // ServletInputStream — raw body bytes
req.getReader()               // BufferedReader — body as text
req.setAttribute("key", val)  // store data for this request (e.g. for forwarding)
req.getAttribute("key")
req.getContextPath()          // "/app"
req.getServletPath()          // "/hello"
req.getPathInfo()             // extra path after servlet path
```

### HttpServletResponse — Writing the Response

```java
resp.setStatus(200);                        // or HttpServletResponse.SC_OK
resp.setContentType("application/json");
resp.setCharacterEncoding("UTF-8");
resp.setHeader("X-Custom", "value");
resp.addHeader("Set-Cookie", "theme=dark"); // add (vs set which replaces)
resp.getWriter().write("text response");
resp.getOutputStream().write(bytes);         // binary response
resp.sendRedirect("/login");                 // 302 redirect
resp.sendError(404, "Not Found");           // error response
resp.addCookie(new Cookie("session", "abc123"));
resp.setContentLength(1024);
```

### Servlet Lifecycle and Configuration

```java
// Annotation-based config (modern)
@WebServlet(
    name = "UserServlet",
    urlPatterns = {"/users", "/users/*"},
    loadOnStartup = 1
)
public class UserServlet extends HttpServlet { }

// web.xml config (legacy, still supported)
// <servlet>
//     <servlet-name>UserServlet</servlet-name>
//     <servlet-class>com.example.UserServlet</servlet-class>
// </servlet>
// <servlet-mapping>
//     <servlet-name>UserServlet</servlet-name>
//     <url-pattern>/users/*</url-pattern>
// </servlet-mapping>

// Servlet lifecycle:
// 1. Container loads class
// 2. init() called once
// 3. service() called for EACH request (dispatches to doGet/doPost/etc.)
// 4. destroy() called once when undeployed
```

---

## Filters

Filters intercept requests/responses before/after the servlet — for logging, auth, compression.

```java
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.WebFilter;

@WebFilter(urlPatterns = "/*")
public class LoggingFilter implements Filter {

    @Override
    public void init(FilterConfig config) throws ServletException {
        System.out.println("Filter initialized");
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  req  = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        long start = System.currentTimeMillis();
        System.out.printf("→ %s %s%n", req.getMethod(), req.getRequestURI());

        chain.doFilter(request, response);   // continue to next filter or servlet

        long duration = System.currentTimeMillis() - start;
        System.out.printf("← %s %s (%dms)%n", req.getMethod(), req.getRequestURI(), duration);
    }

    @Override
    public void destroy() { }
}

// Auth filter example
@WebFilter("/api/*")
public class AuthFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  req  = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        String token = req.getHeader("Authorization");
        if (token == null || !isValid(token)) {
            resp.sendError(401, "Unauthorized");
            return;  // don't call chain.doFilter — stops processing
        }

        chain.doFilter(request, response);
    }
}

// Filter chain order is determined by @WebFilter order or web.xml ordering
// Multiple filters: request flows through each filter's "before" logic in order,
// then servlet, then each filter's "after" logic in REVERSE order
```

---

## CDI (Contexts and Dependency Injection)

CDI is Jakarta's dependency injection standard — the ancestor of Spring's DI model.

```java
import jakarta.enterprise.context.*;
import jakarta.inject.*;

// ── Bean scopes ──────────────────────────────────────────────────────────
@ApplicationScoped   // one instance per application (like Spring singleton)
public class UserService {
    public User findById(Long id) { /* ... */ return null; }
}

@RequestScoped        // one instance per HTTP request
public class RequestContext {
    private String requestId = UUID.randomUUID().toString();
    public String getRequestId() { return requestId; }
}

@SessionScoped         // one instance per HTTP session (must be Serializable)
public class ShoppingCart implements Serializable {
    private List<Item> items = new ArrayList<>();
}

@Dependent             // new instance every time it's injected (default scope)
public class Helper { }

// ── Injection ────────────────────────────────────────────────────────────
@ApplicationScoped
public class OrderService {

    @Inject
    private UserService userService;     // field injection

    private final PaymentService paymentService;

    @Inject
    public OrderService(PaymentService paymentService) {   // constructor injection (preferred)
        this.paymentService = paymentService;
    }

    public void placeOrder(Long userId) {
        User user = userService.findById(userId);
        paymentService.charge(user);
    }
}

// ── Qualifiers — distinguish between multiple implementations ─────────────
@Qualifier
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.METHOD})
public @interface CreditCard { }

@Qualifier
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.METHOD})
public @interface PayPal { }

public interface PaymentProcessor { void process(double amount); }

@CreditCard
@ApplicationScoped
public class CreditCardProcessor implements PaymentProcessor {
    @Override public void process(double amount) { /* ... */ }
}

@PayPal
@ApplicationScoped
public class PayPalProcessor implements PaymentProcessor {
    @Override public void process(double amount) { /* ... */ }
}

public class CheckoutService {
    @Inject @CreditCard
    private PaymentProcessor creditCardProcessor;

    @Inject @PayPal
    private PaymentProcessor payPalProcessor;
}

// ── Producers — for objects you don't control ──────────────────────────────
@ApplicationScoped
public class DatabaseProducer {
    @Produces
    @ApplicationScoped
    public DataSource createDataSource() {
        // configure and return a DataSource
        return new HikariDataSource();
    }

    public void closeDataSource(@Disposes DataSource ds) {
        ds.close();  // cleanup hook
    }
}

// ── Events ────────────────────────────────────────────────────────────────
public class UserRegisteredEvent {
    private final String email;
    public UserRegisteredEvent(String email) { this.email = email; }
    public String getEmail() { return email; }
}

@ApplicationScoped
public class RegistrationService {
    @Inject
    Event<UserRegisteredEvent> userRegisteredEvent;

    public void register(String email) {
        // ... save user
        userRegisteredEvent.fire(new UserRegisteredEvent(email));
    }
}

@ApplicationScoped
public class EmailService {
    public void onUserRegistered(@Observes UserRegisteredEvent event) {
        sendWelcomeEmail(event.getEmail());
    }
}
```

---

## JAX-RS — REST APIs

```java
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;

@Path("/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    private UserService userService;

    @GET
    public List<User> getAll(@QueryParam("page") @DefaultValue("0") int page,
                              @QueryParam("limit") @DefaultValue("20") int limit) {
        return userService.findAll(page, limit);
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        User user = userService.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(user).build();
    }

    @POST
    public Response create(User user, @Context UriInfo uriInfo) {
        User created = userService.create(user);
        URI location = uriInfo.getAbsolutePathBuilder().path(created.getId().toString()).build();
        return Response.created(location).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, User user) {
        User updated = userService.update(id, user);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        userService.delete(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/search")
    public List<User> search(@QueryParam("name") String name,
                              @HeaderParam("Accept-Language") String lang,
                              @CookieParam("session") String session) {
        return userService.search(name);
    }
}

// Application configuration
@ApplicationPath("/api")
public class RestApplication extends Application {
    // Optionally override getClasses() / getSingletons() for manual registration
}

// Exception mapping
@Provider
public class NotFoundExceptionMapper implements ExceptionMapper<EntityNotFoundException> {
    @Override
    public Response toResponse(EntityNotFoundException ex) {
        return Response.status(404)
            .entity(Map.of("error", ex.getMessage()))
            .build();
    }
}
```

---

## Bean Validation (Jakarta Validation)

```java
import jakarta.validation.constraints.*;
import jakarta.validation.*;

public class CreateUserRequest {
    @NotNull(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @NotBlank
    @Email(message = "Invalid email format")
    private String email;

    @NotNull
    @Min(value = 18, message = "Must be at least 18")
    @Max(value = 150)
    private Integer age;

    @Pattern(regexp = "^[a-zA-Z0-9_]{3,20}$", message = "Invalid username format")
    private String username;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @Positive
    private double salary;

    @PositiveOrZero
    private int score;

    @Negative
    private int debt;

    @Past
    private LocalDate birthDate;

    @Future
    private LocalDate expiryDate;

    @AssertTrue(message = "Must accept terms")
    private boolean termsAccepted;

    @NotEmpty
    private List<String> roles;

    @Valid                       // cascade validation into nested object
    private Address address;

    // getters/setters
}

public class Address {
    @NotBlank
    private String street;
    @NotBlank
    private String city;
    @Pattern(regexp = "\\d{5}")
    private String zipCode;
}

// Manual validation
ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
Validator validator = factory.getValidator();

CreateUserRequest request = new CreateUserRequest();
Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(request);

for (ConstraintViolation<CreateUserRequest> violation : violations) {
    System.out.println(violation.getPropertyPath() + ": " + violation.getMessage());
}

// Common annotations summary:
// @NotNull, @NotEmpty (for collections/strings), @NotBlank (strings, trims whitespace)
// @Size(min, max), @Min, @Max, @Positive, @PositiveOrZero, @Negative, @NegativeOrZero
// @Email, @Pattern(regexp), @Past, @PastOrPresent, @Future, @FutureOrPresent
// @AssertTrue, @AssertFalse, @Digits(integer, fraction), @DecimalMin, @DecimalMax
// @Valid — cascades validation into nested objects/collections
```

---

## JTA — Transactions

```java
import jakarta.transaction.*;

@ApplicationScoped
public class TransferService {

    @Inject
    private AccountRepository accountRepo;

    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepo.findById(fromId);
        Account to   = accountRepo.findById(toId);

        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepo.save(from);
        accountRepo.save(to);
        // If any exception is thrown, the whole transaction rolls back
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void auditLog(String message) {
        // Runs in its own transaction — commits even if calling transaction rolls back
    }

    @Transactional(rollbackOn = CustomException.class, dontRollbackOn = ValidationException.class)
    public void customRollbackBehavior() { }
}

// TxType options:
// REQUIRED      — join existing transaction, or create new (default)
// REQUIRES_NEW  — always start a new transaction (suspend current)
// MANDATORY     — must run within existing transaction, throws if none
// SUPPORTS      — join if exists, else run without transaction
// NOT_SUPPORTED — suspend any existing transaction
// NEVER         — throws if called within a transaction
```

---

## Summary

- Servlets handle raw HTTP requests/responses — Spring MVC builds on top of this model.
- Filters intercept the request/response chain — good for cross-cutting concerns like logging and auth.
- CDI's `@Inject`, `@ApplicationScoped`, and `@Produces` map conceptually to Spring's `@Autowired`, `@Component`/`@Scope`, and `@Bean`.
- JAX-RS provides annotation-driven REST endpoints (`@Path`, `@GET`, `@PathParam`) — the inspiration for Spring's `@RequestMapping` family.
- Bean Validation (`@NotNull`, `@Size`, `@Email`, etc.) is the standard validation API used by both Jakarta EE and Spring.
- `@Transactional` works the same conceptually in JTA and Spring — propagation types control how transactions nest.
