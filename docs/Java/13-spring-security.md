---
title: "Spring Security"
sidebar_label: "Spring Security"
sidebar_position: 13
---

# Spring Security

Spring Security is the standard security framework for Spring applications. It handles authentication (who are you?), authorization (what can you do?), CSRF protection, session management, and more. Adding the starter immediately secures all endpoints — you then configure exactly what's open and what requires specific roles.

---

## How Spring Security Works

Spring Security intercepts requests through a **filter chain** before they reach your controllers. Each filter handles one concern: parsing the token, checking credentials, enforcing authorization. The filters run in order; if any rejects the request, it's denied.

```
HTTP Request
    ↓
Security Filter Chain
    ├── SecurityContextPersistenceFilter  (load saved SecurityContext)
    ├── UsernamePasswordAuthenticationFilter (form login)
    ├── BearerTokenAuthenticationFilter   (JWT)
    ├── ExceptionTranslationFilter        (handle auth errors)
    └── AuthorizationFilter               (check permissions)
    ↓
DispatcherServlet → Controller
```

---

## Basic Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())           // disable for stateless REST APIs
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()         // public endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")   // admin only
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll() // public reads
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()                         // everything else needs auth
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## UserDetailsService — Loading Users

Spring Security delegates user loading to `UserDetailsService`. Implement it to connect to your database.

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPasswordHash())        // stored BCrypt hash
            .roles(user.getRole().name())            // "ADMIN" → ROLE_ADMIN
            .accountExpired(!user.isActive())
            .disabled(!user.isActive())
            .build();
    }
}
```

---

## JWT Authentication

JSON Web Tokens (JWT) are the standard for stateless REST API authentication.

### JWT Utility
```java
@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    public String generateToken(String username, Collection<? extends GrantedAuthority> roles) {
        return Jwts.builder()
            .subject(username)
            .claim("roles", roles.stream().map(GrantedAuthority::getAuthority).toList())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
```

### JWT Filter
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);

        if (jwtUtil.isTokenValid(token)) {
            String username = jwtUtil.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
```

### Auth Controller
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String token = jwtUtil.generateToken(userDetails.getUsername(), userDetails.getAuthorities());

        return ResponseEntity.ok(new TokenResponse(token, "Bearer", expirationMs / 1000));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return userService.register(request);
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestHeader("Authorization") String bearerToken) {
        // Validate, extract username, issue new token
        String token = bearerToken.substring(7);
        String username = jwtUtil.extractUsername(token);
        UserDetails user = userDetailsService.loadUserByUsername(username);
        String newToken = jwtUtil.generateToken(username, user.getAuthorities());
        return ResponseEntity.ok(new TokenResponse(newToken, "Bearer", expirationMs / 1000));
    }
}

public record LoginRequest(@Email String email, @NotBlank String password) {}
public record TokenResponse(String token, String type, long expiresIn) {}
```

### Wire It Together
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final CustomUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## Method-Level Security

Protect individual service methods with annotations:

```java
@Configuration
@EnableMethodSecurity   // enables @PreAuthorize, @PostAuthorize, @Secured
public class MethodSecurityConfig {}

@Service
public class UserService {

    @PreAuthorize("hasRole('ADMIN')")
    public List<User> findAll() { ... }

    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public User findById(Long id) { ... }

    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#id)")
    public void delete(Long id) { ... }

    @PostAuthorize("returnObject.email == authentication.name")
    public User findByEmail(String email) { ... }

    @Secured("ROLE_ADMIN")  // simpler, but less powerful
    public void adminAction() { ... }
}

// Custom security service for complex expressions
@Service("securityService")
public class SecurityService {

    public boolean isOwner(Long resourceId) {
        String currentUser = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        // Check if current user owns this resource
        return repository.isOwner(resourceId, currentUser);
    }
}
```

---

## Accessing the Current User

```java
// From SecurityContextHolder (any class)
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();
boolean isAdmin = auth.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

// In a controller — inject directly as parameter
@GetMapping("/me")
public UserResponse getCurrentUser(
        @AuthenticationPrincipal UserDetails userDetails) {
    return userService.findByEmail(userDetails.getUsername());
}

// Custom principal — store more user info
public class CustomUserPrincipal implements UserDetails {
    private final User user;  // your domain User

    @Override
    public String getUsername() { return user.getEmail(); }

    public Long getUserId() { return user.getId(); }
    // ...
}

@GetMapping("/me")
public UserResponse getMe(@AuthenticationPrincipal CustomUserPrincipal principal) {
    return userService.findById(principal.getUserId());
}
```

---

## Password Management

```java
@Service
public class UserService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public User register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("EMAIL_TAKEN", "Email already registered");
        }

        User user = new User();
        user.setEmail(req.email());
        user.setName(req.name());
        user.setPasswordHash(passwordEncoder.encode(req.password())); // BCrypt hash
        return userRepository.save(user);
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId).orElseThrow();

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException("WRONG_PASSWORD", "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
```

**Tips:**
- Always store BCrypt hashes — never plaintext, never MD5/SHA1.
- `BCryptPasswordEncoder`'s strength defaults to 10 (good balance of security and speed).
- Never log passwords or tokens, even at DEBUG level.

---

## Summary

Spring Security provides a comprehensive, layered security model:

- **Filter chain** — security applied before any controller code runs.
- **UserDetailsService** — connects Spring Security to your user store.
- **JWT** — stateless, scalable authentication for REST APIs.
- **Method security** — fine-grained `@PreAuthorize` expressions on service methods.
- **BCrypt** — the standard for password hashing.

**Key Takeaways:**
- Disable CSRF for stateless JWT APIs; enable it for session-based UIs.
- Use `SessionCreationPolicy.STATELESS` for REST APIs — no server-side session.
- Always use `@PreAuthorize` over `@Secured` — SpEL expressions are far more powerful.
- Use a custom `UserDetails` implementation to carry your domain user ID alongside the username.
- Never return different error messages for "wrong password" vs "user not found" — it reveals which emails are registered.
