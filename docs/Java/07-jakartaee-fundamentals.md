---
title: "Jakarta EE Fundamentals"
sidebar_label: "Jakarta EE Basics"
sidebar_position: 7
---

# Jakarta EE Fundamentals

Jakarta EE (formerly Java EE) is a set of specifications for building enterprise-grade applications — web services, transactional systems, and scalable backends. It defines standard APIs implemented by application servers like WildFly, Payara, and Open Liberty. You write to the spec; the server provides the runtime.

---

## What Jakarta EE Provides

Jakarta EE is a collection of coordinated specifications:

| Specification        | Purpose                                         |
|----------------------|-------------------------------------------------|
| **Servlets**         | HTTP request/response handling                  |
| **JSP / Faces**      | Server-side view rendering                      |
| **JAX-RS**           | RESTful web services                            |
| **EJB**              | Managed beans with transactions, scheduling     |
| **JPA**              | Object-relational mapping                       |
| **CDI**              | Dependency injection and lifecycle              |
| **JMS**              | Messaging between components                    |
| **Bean Validation**  | Declarative constraint validation               |
| **JSON-P / JSON-B**  | JSON processing and binding                     |
| **Security**         | Authentication and authorization                |

Applications are packaged as **WAR** (web archive) or **EAR** (enterprise archive) files and deployed to an application server.

---

## Servlets

A Servlet is the foundational HTTP handler. Every request to a Java web application goes through a Servlet (or through a framework built on top of Servlets).

```java
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.*;

@WebServlet("/hello")          // maps this servlet to /hello
public class HelloServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        String name = req.getParameter("name"); // ?name=Alice
        if (name == null) name = "World";

        resp.setContentType("text/html;charset=UTF-8");
        PrintWriter out = resp.getWriter();
        out.println("<html><body>");
        out.println("<h1>Hello, " + name + "!</h1>");
        out.println("</body></html>");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        String body = req.getReader().lines()
            .collect(java.util.stream.Collectors.joining());

        resp.setContentType("application/json");
        resp.getWriter().write("{\"received\": \"" + body + "\"}");
    }
}
```

### HttpServletRequest — Reading Data
```java
req.getParameter("username")          // single query/form param
req.getParameterMap()                 // all params as Map
req.getHeader("Authorization")        // request header
req.getMethod()                       // "GET", "POST", etc.
req.getRequestURI()                   // /app/hello
req.getSession()                      // get/create HTTP session
req.getSession(false)                 // get only if exists
req.getAttribute("user")             // request-scoped attribute
req.setAttribute("user", userObj)    // set request attribute
```

### HttpServletResponse — Writing Data
```java
resp.setStatus(HttpServletResponse.SC_OK);        // 200
resp.setStatus(HttpServletResponse.SC_NOT_FOUND); // 404
resp.setStatus(HttpServletResponse.SC_CREATED);   // 201
resp.setContentType("application/json");
resp.setHeader("X-Custom-Header", "value");
resp.sendRedirect("/other-page");
```

**Tips:**
- Override `doGet` and `doPost` separately for clean HTTP semantics.
- Use `@WebServlet` annotation instead of XML configuration in `web.xml`.
- Always set `Content-Type` before calling `getWriter()`.
- Prefer frameworks (JAX-RS, Spring MVC) over raw Servlets for REST APIs.

---

## Filters

Filters intercept requests/responses before they reach servlets — ideal for authentication, logging, and CORS.

```java
@WebFilter("/*")                  // apply to all paths
public class LoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        System.out.println(req.getMethod() + " " + req.getRequestURI());

        long start = System.currentTimeMillis();
        chain.doFilter(request, response); // continue to next filter / servlet
        long duration = System.currentTimeMillis() - start;

        System.out.println("Completed in " + duration + "ms");
    }
}
```

```java
@WebFilter("/api/*")
public class AuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) resp;

        String token = request.getHeader("Authorization");
        if (token == null || !isValid(token)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return; // do NOT call chain.doFilter — request is rejected
        }

        chain.doFilter(req, resp);
    }

    private boolean isValid(String token) {
        return token.startsWith("Bearer ");
    }
}
```

**Tips:**
- Filters form a chain. The order they execute depends on the order declared (or alphabetically for `@WebFilter`).
- Always call `chain.doFilter()` unless you're intentionally stopping the request (e.g., auth failure).
- Use `@WebFilter` with `urlPatterns` for fine-grained path control.

---

## CDI — Contexts and Dependency Injection

CDI is Jakarta EE's dependency injection system. Instead of manually creating objects, the container injects them.

```java
import jakarta.enterprise.context.*;
import jakarta.inject.*;

// A CDI managed bean — one instance per HTTP request
@RequestScoped
public class UserService {

    @Inject
    private UserRepository repository;

    public User findUser(Long id) {
        return repository.findById(id);
    }
}

// A singleton — one instance for the whole application
@ApplicationScoped
public class ConfigService {
    private final String dbUrl = System.getenv("DB_URL");
    public String getDbUrl() { return dbUrl; }
}
```

### CDI Scopes

| Scope                 | Lifetime                         |
|-----------------------|----------------------------------|
| `@RequestScoped`      | One HTTP request                 |
| `@SessionScoped`      | One HTTP session                 |
| `@ApplicationScoped`  | Entire application lifetime      |
| `@Dependent`          | Tied to the injecting bean       |
| `@ConversationScoped` | Developer-controlled multi-step  |

### Qualifiers — choosing which implementation
```java
@Qualifier
@Target({FIELD, METHOD, PARAMETER, TYPE})
@Retention(RUNTIME)
public @interface Premium {}

@Premium
@ApplicationScoped
public class PremiumEmailService implements EmailService { ... }

@ApplicationScoped
public class BasicEmailService implements EmailService { ... }

// Inject a specific implementation
@Inject @Premium
private EmailService emailService;
```

### Producers
```java
@ApplicationScoped
public class DataSourceProducer {

    @Produces
    @ApplicationScoped
    public DataSource produceDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        return new HikariDataSource(config);
    }
}

// Now you can inject DataSource anywhere
@Inject
private DataSource dataSource;
```

**Tips:**
- CDI requires a `beans.xml` file in `WEB-INF/` (can be empty) to activate bean discovery.
- Prefer constructor injection for testability — `@Inject` on constructor works too.
- `@ApplicationScoped` is effectively a singleton inside the container.
- CDI interceptors (`@Interceptor`) are the place to add cross-cutting concerns (logging, transactions) without spreading that logic everywhere.

---

## JAX-RS — RESTful Web Services

JAX-RS is the standard Jakarta EE API for building REST endpoints with annotations.

```java
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import jakarta.inject.Inject;

@Path("/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    private UserService userService;

    @GET
    public Response getAllUsers() {
        List<User> users = userService.findAll();
        return Response.ok(users).build();
    }

    @GET
    @Path("/{id}")
    public Response getUser(@PathParam("id") Long id) {
        User user = userService.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(user).build();
    }

    @POST
    public Response createUser(CreateUserRequest request) {
        User created = userService.create(request);
        URI location = UriBuilder.fromResource(UserResource.class)
            .path(String.valueOf(created.getId()))
            .build();
        return Response.created(location).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    public Response updateUser(@PathParam("id") Long id, UpdateUserRequest request) {
        User updated = userService.update(id, request);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteUser(@PathParam("id") Long id) {
        userService.delete(id);
        return Response.noContent().build(); // 204
    }

    @GET
    @Path("/search")
    public Response search(
            @QueryParam("name") String name,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        List<User> results = userService.search(name, page, size);
        return Response.ok(results).build();
    }
}
```

### Application Config
```java
@ApplicationPath("/api")   // base path for all REST endpoints
public class RestApplication extends Application { }
```

### Exception Mapping
```java
@Provider
public class NotFoundExceptionMapper implements ExceptionMapper<NotFoundException> {

    @Override
    public Response toResponse(NotFoundException e) {
        return Response.status(Response.Status.NOT_FOUND)
            .entity(Map.of("error", e.getMessage()))
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
}
```

**Tips:**
- Use `Response` as the return type for full control over status codes and headers.
- `@Provider` marks classes that extend JAX-RS behavior (exception mappers, filters, interceptors).
- JAX-RS automatically serializes/deserializes JSON if JSON-B or Jackson is on the classpath.
- Use `@BeanParam` to group multiple `@QueryParam`/`@PathParam` into a single object.

---

## Bean Validation

Declare constraints with annotations; validate objects consistently across layers.

```java
import jakarta.validation.constraints.*;

public class CreateUserRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    private String name;

    @Email(message = "Invalid email address")
    @NotNull
    private String email;

    @Min(value = 0, message = "Age cannot be negative")
    @Max(value = 150)
    private int age;

    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number")
    private String phone;
}
```

```java
// Automatic validation in JAX-RS
@POST
public Response create(@Valid CreateUserRequest request) {
    // If validation fails, JAX-RS returns 400 automatically
    User user = service.create(request);
    return Response.ok(user).build();
}

// Manual validation
@Inject
private Validator validator;

Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(request);
if (!violations.isEmpty()) {
    // handle violations
}
```

**Tips:**
- `@Valid` on a JAX-RS method parameter triggers automatic cascade validation.
- Create custom constraints by implementing `ConstraintValidator<YourAnnotation, YourType>`.
- Use `@Valid` on nested objects to cascade validation into them.

---

## Summary

Jakarta EE provides enterprise-grade building blocks for server-side Java:

- **Servlets** — the foundation of every Java web application.
- **Filters** — cross-cutting request/response processing.
- **CDI** — type-safe dependency injection with scoped lifecycles.
- **JAX-RS** — declarative REST API building with annotations.
- **Bean Validation** — constraint annotations with automatic enforcement.

**Key Takeaways:**
- Jakarta EE runs on application servers that implement the specs (WildFly, Payara, Open Liberty).
- CDI wires your beans together; JAX-RS exposes them as REST endpoints.
- Use `@Valid` to automatically validate incoming request bodies.
- Exception mappers give you centralized error response formatting.
- Modern Jakarta EE (10+) is leaner and closer to microservices than the old Java EE monolith model.
