---
title: "Spring Security"
sidebar_label: "Spring Security"
sidebar_position: 13
---

# Spring Security

Spring Security handles authentication (who are you?) and authorization (what can you do?) through a chain of filters that intercept every request.

---

## The Filter Chain

```
Request → SecurityFilterChain
            ├── CorsFilter
            ├── CsrfFilter
            ├── UsernamePasswordAuthenticationFilter (form login)
            ├── BasicAuthenticationFilter (HTTP basic)
            ├── BearerTokenAuthenticationFilter (JWT/OAuth2, if configured)
            ├── ExceptionTranslationFilter
            └── FilterSecurityInterceptor (authorization check)
          → Your Controller
```

---

## Basic Configuration

```java
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // disable for stateless APIs (re-enable for session-based with forms)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // no sessions for JWT-based auth
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "MODERATOR")
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) -> res.sendError(401, "Unauthorized"))
                .accessDeniedHandler((req, res, e) -> res.sendError(403, "Forbidden"))
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // strength factor 12
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## Password Hashing

```java
@Service
public class UserService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public User register(String email, String rawPassword) {
        String hash = passwordEncoder.encode(rawPassword);   // bcrypt hash, includes salt
        User user = new User(email, hash);
        return userRepository.save(user);
    }

    public boolean checkPassword(String rawPassword, String storedHash) {
        return passwordEncoder.matches(rawPassword, storedHash);  // constant-time comparison
    }
}

// NEVER store plain-text passwords
// NEVER use MD5/SHA1/SHA256 alone for passwords — they're too fast, vulnerable to brute force
// BCrypt/Argon2/SCrypt are designed to be slow — resistant to brute force

@Bean
public PasswordEncoder passwordEncoder() {
    // BCryptPasswordEncoder strength: 10 (default) to 31 — higher = slower but more secure
    return new BCryptPasswordEncoder(12);
}

// Argon2 (more modern, recommended for new projects)
@Bean
public PasswordEncoder argon2Encoder() {
    return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
}

// Delegating encoder — supports multiple algorithms, migrates gradually
@Bean
public PasswordEncoder delegatingEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    // Stored hash format: {bcrypt}$2a$10$... — prefix identifies algorithm used
}
```

---

## UserDetailsService

```java
import org.springframework.security.core.userdetails.*;

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
            .password(user.getPasswordHash())
            .authorities(user.getRole().name().startsWith("ROLE_")
                ? user.getRole().name()
                : "ROLE_" + user.getRole().name())
            .accountExpired(false)
            .accountLocked(!user.isActive())
            .credentialsExpired(false)
            .disabled(!user.isEnabled())
            .build();
    }
}

// Custom UserDetails implementation (more control — carry extra fields)
public class AppUserPrincipal implements UserDetails {
    private final User user;

    public AppUserPrincipal(User user) { this.user = user; }

    public Long getId() { return user.getId(); }
    public String getEmail() { return user.getEmail(); }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()));
    }

    @Override public String getPassword() { return user.getPasswordHash(); }
    @Override public String getUsername() { return user.getEmail(); }
    @Override public boolean isAccountNonExpired()  { return true; }
    @Override public boolean isAccountNonLocked()   { return user.isActive(); }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()            { return user.isEnabled(); }
}
```

---

## JWT Authentication

```java
// ── JWT utility class ────────────────────────────────────────────────────
@Component
public class JwtService {
    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .subject(userDetails.getUsername())
            .claim("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}

// ── JWT authentication filter ────────────────────────────────────────────
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            String username = jwtService.extractUsername(token);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            // Invalid token — leave context unauthenticated, will result in 401 downstream
        }

        filterChain.doFilter(request, response);
    }
}

// ── Login controller ──────────────────────────────────────────────────────
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        UserDetails userDetails = (UserDetails) auth.getPrincipal();

        String accessToken  = jwtService.generateToken(userDetails);
        String refreshToken = refreshTokenService.create(userDetails.getUsername());

        return ResponseEntity.ok(new AuthResponse(accessToken, refreshToken, "Bearer"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshRequest request) {
        String username = refreshTokenService.validateAndGetUsername(request.refreshToken());
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        String newAccessToken = jwtService.generateToken(userDetails);
        return ResponseEntity.ok(new AuthResponse(newAccessToken, request.refreshToken(), "Bearer"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
        return ResponseEntity.noContent().build();
    }
}

public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
public record AuthResponse(String accessToken, String refreshToken, String tokenType) {}
public record RefreshRequest(@NotBlank String refreshToken) {}
```

---

## Method-Level Security

```java
@Configuration
@EnableMethodSecurity   // enables @PreAuthorize, @PostAuthorize, @Secured
public class MethodSecurityConfig { }

@Service
public class DocumentService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAllDocuments() { }

    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
    public Document update(Long id, DocumentDto dto) { return null; }

    // Access the method's own parameters
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public List<Document> getUserDocuments(Long userId) { return null; }

    // Check on the return value (runs AFTER method executes)
    @PostAuthorize("returnObject.ownerId == authentication.principal.id")
    public Document getDocument(Long id) { return null; }

    // Filter a collection before returning
    @PostFilter("filterObject.ownerId == authentication.principal.id")
    public List<Document> getAllAccessible() { return null; }

    // Filter collection arguments before the method runs
    @PreFilter("filterObject.ownerId == authentication.principal.id")
    public void deleteDocuments(List<Document> documents) { }

    @Secured("ROLE_ADMIN")    // simpler, older alternative to @PreAuthorize
    public void legacySecuredMethod() { }
}

// Custom security expressions
@Component("documentSecurity")
public class DocumentSecurityService {
    public boolean canEdit(Authentication auth, Long documentId) {
        // custom authorization logic
        return true;
    }
}

@PreAuthorize("@documentSecurity.canEdit(authentication, #id)")
public void edit(Long id) { }
```

---

## CSRF Protection

```java
// For stateless JWT APIs — CSRF is typically disabled (no cookies, no session)
http.csrf(csrf -> csrf.disable());

// For session/cookie-based auth — CSRF protection is essential
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf
        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())  // SPA-friendly
        .ignoringRequestMatchers("/api/webhooks/**")  // exempt webhook endpoints
    );
    return http.build();
}
// Frontend reads XSRF-TOKEN cookie, sends back as X-XSRF-TOKEN header
```

---

## OAuth2 / Social Login

```java
@Configuration
@EnableWebSecurity
public class OAuth2SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login**").permitAll()
                .anyRequest().authenticated())
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard", true)
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService()))
            );
        return http.build();
    }

    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> customOAuth2UserService() {
        DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
        return request -> {
            OAuth2User oauth2User = delegate.loadUser(request);
            // Map to your User entity, save if first login, etc.
            return oauth2User;
        };
    }
}
```

```properties
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.scope=email,profile

spring.security.oauth2.client.registration.github.client-id=${GITHUB_CLIENT_ID}
spring.security.oauth2.client.registration.github.client-secret=${GITHUB_CLIENT_SECRET}
```

---

## Resource Server (Validating JWTs from External Issuer)

```java
// For microservices validating tokens issued by an auth server (Auth0, Keycloak, Okta)
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter())));
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("roles");
        authoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return converter;
    }
}
```

```properties
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://your-domain.auth0.com/
```

---

## Getting the Current User

```java
@RestController
public class ProfileController {

    @GetMapping("/api/me")
    public UserDto getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return userService.findByEmail(email);
    }

    // Using @AuthenticationPrincipal — cleaner
    @GetMapping("/api/profile")
    public UserDto getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return userService.findByEmail(userDetails.getUsername());
    }

    // With custom principal type
    @GetMapping("/api/account")
    public AccountDto getAccount(@AuthenticationPrincipal AppUserPrincipal principal) {
        return accountService.findByUserId(principal.getId());
    }

    // Programmatic access (anywhere, not just controllers)
    public void someMethod() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String username = auth.getName();
            Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        }
    }
}
```

---

## Security Best Practices Checklist

```
✅ Always hash passwords with bcrypt/argon2 — never plain text, never fast hashes alone
✅ Use HTTPS in production — set HSTS headers
✅ Short-lived access tokens (15min) + longer refresh tokens (7-30 days)
✅ Store refresh tokens server-side for revocation capability
✅ Rate limit login endpoints to prevent brute force
✅ Validate ALL input — never trust client data
✅ Use parameterized queries — never concatenate SQL
✅ CSRF protection for session/cookie-based auth (not needed for stateless JWT APIs)
✅ Set secure, httpOnly, sameSite flags on auth cookies
✅ Principle of least privilege — default deny, explicit allow
✅ Log authentication failures and suspicious activity
✅ Don't leak whether an email exists in "forgot password" flows
```

---

## Summary

- Spring Security is filter-based — a chain of filters processes every request before reaching your controller.
- Always hash passwords with `BCryptPasswordEncoder` (or Argon2) — never store plain text.
- `UserDetailsService.loadUserByUsername()` is the bridge between Spring Security and your user storage.
- For stateless APIs, disable CSRF and sessions, use JWT with a custom `OncePerRequestFilter`.
- `@PreAuthorize`/`@PostAuthorize` with SpEL expressions give fine-grained, method-level authorization.
- `@AuthenticationPrincipal` injects the current authenticated user directly into controller methods.
- For external token issuers (Auth0, Keycloak), use `oauth2ResourceServer().jwt()` instead of writing your own JWT filter.
- Always set `requestMatchers().permitAll()` explicitly for public endpoints — default behavior should be deny-all.
