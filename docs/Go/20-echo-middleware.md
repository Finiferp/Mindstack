---
title: "Echo — Middleware"
sidebar_label: "Echo Middleware"
sidebar_position: 20
---

# Echo — Middleware

Middleware wraps request handling to add cross-cutting behavior — logging, auth, CORS, rate limiting — without cluttering individual handlers.

---

## How Middleware Works

```go
// Middleware signature — wraps an echo.HandlerFunc, returns a new one
type MiddlewareFunc func(next echo.HandlerFunc) echo.HandlerFunc

// The general shape of any middleware
func MyMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // code here runs BEFORE the handler
        fmt.Println("before handler")

        err := next(c)     // call the next middleware/handler in the chain

        // code here runs AFTER the handler
        fmt.Println("after handler")

        return err
    }
}

// Registering middleware
e := echo.New()
e.Use(MyMiddleware)                     // applies to ALL routes
e.GET("/", handler, MyMiddleware)       // applies to just this one route
group := e.Group("/api", MyMiddleware)  // applies to all routes in this group

// Middleware execution order — registered in order, wraps like an onion:
// e.Use(A); e.Use(B); e.Use(C)
// Request flow: A → B → C → handler → C → B → A
```

---

## Built-in Middleware

```go
import "github.com/labstack/echo/v4/middleware"

e := echo.New()

// Logger — logs every request
e.Use(middleware.Logger())
e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
    Format: "${time_rfc3339} ${method} ${uri} ${status} ${latency_human}\n",
}))

// Recover — catches panics, converts to a 500 response instead of crashing
e.Use(middleware.Recover())

// CORS — Cross-Origin Resource Sharing
e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
    AllowOrigins: []string{"https://myapp.com", "http://localhost:3000"},
    AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
    AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
    AllowCredentials: true,
}))

// Rate limiting
e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(20)))  // 20 req/sec

// Gzip compression
e.Use(middleware.Gzip())

// Request ID — attaches a unique ID to each request (useful for tracing/logging)
e.Use(middleware.RequestID())

// Timeout — cancel requests that take too long
e.Use(middleware.TimeoutWithConfig(middleware.TimeoutConfig{
    Timeout: 30 * time.Second,
}))

// Secure headers — sets several security-related HTTP headers
e.Use(middleware.Secure())

// CSRF protection
e.Use(middleware.CSRF())

// Body size limit — prevent oversized request bodies
e.Use(middleware.BodyLimit("2M"))

// Basic auth
e.Use(middleware.BasicAuth(func(username, password string, c echo.Context) (bool, error) {
    return username == "admin" && password == "secret", nil
}))

// Static file serving with directory browsing option
e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
    Root:   "public",
    Browse: false,
}))
```

---

## JWT Authentication Middleware

```bash
go get github.com/golang-jwt/jwt/v5
go get github.com/labstack/echo-jwt/v4
```

```go
import (
    echojwt "github.com/labstack/echo-jwt/v4"
    "github.com/golang-jwt/jwt/v5"
)

type JwtCustomClaims struct {
    UserID int    `json:"user_id"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func main() {
    e := echo.New()

    // Login endpoint — issues a token
    e.POST("/login", login)

    // Protected group — requires a valid JWT
    api := e.Group("/api")
    api.Use(echojwt.WithConfig(echojwt.Config{
        NewClaimsFunc: func(c echo.Context) jwt.Claims {
            return new(JwtCustomClaims)
        },
        SigningKey: []byte("your-secret-key"),
    }))
    api.GET("/profile", getProfile)

    e.Logger.Fatal(e.Start(":8080"))
}

func login(c echo.Context) error {
    var req struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    if err := c.Bind(&req); err != nil {
        return err
    }

    // ... verify credentials against database ...

    claims := &JwtCustomClaims{
        UserID: 1,
        Role:   "admin",
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signedToken, err := token.SignedString([]byte("your-secret-key"))
    if err != nil {
        return err
    }

    return c.JSON(http.StatusOK, map[string]string{"token": signedToken})
}

func getProfile(c echo.Context) error {
    user := c.Get("user").(*jwt.Token)
    claims := user.Claims.(*JwtCustomClaims)
    return c.JSON(http.StatusOK, map[string]interface{}{
        "user_id": claims.UserID,
        "role":    claims.Role,
    })
}
```

---

## Custom Authentication Middleware (Session/API Key Based)

```go
func APIKeyAuth(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        apiKey := c.Request().Header.Get("X-API-Key")
        if apiKey == "" {
            return echo.NewHTTPError(http.StatusUnauthorized, "missing API key")
        }

        user, err := validateAPIKey(apiKey)
        if err != nil {
            return echo.NewHTTPError(http.StatusUnauthorized, "invalid API key")
        }

        c.Set("user", user)          // pass authenticated user to the handler
        return next(c)
    }
}

// Role-based authorization middleware — configurable, factory pattern
func RequireRole(role string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            user, ok := c.Get("user").(*User)
            if !ok || user.Role != role {
                return echo.NewHTTPError(http.StatusForbidden, "insufficient permissions")
            }
            return next(c)
        }
    }
}

// Usage
admin := e.Group("/admin", APIKeyAuth, RequireRole("admin"))
admin.GET("/dashboard", dashboardHandler)
```

---

## Custom Logging Middleware

```go
func RequestLogger(logger *zap.Logger) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            start := time.Now()

            err := next(c)

            logger.Info("request",
                zap.String("method", c.Request().Method),
                zap.String("path", c.Request().URL.Path),
                zap.Int("status", c.Response().Status),
                zap.Duration("latency", time.Since(start)),
                zap.String("ip", c.RealIP()),
            )

            return err
        }
    }
}
```

---

## Middleware Ordering — Why It Matters

```go
e := echo.New()

// Order matters! Middleware wraps in registration order.
e.Use(middleware.Recover())             // 1st: catches panics from EVERYTHING after it
e.Use(middleware.Logger())              // 2nd: logs every request (including errors)
e.Use(middleware.CORS())                // 3rd: CORS headers before auth (so preflight
                                        //      OPTIONS requests don't need auth)
e.Use(AuthMiddleware)                   // 4th: authentication
e.Use(RateLimitMiddleware)              // 5th: rate limit (after auth — can rate
                                        //      limit per-user, not just per-IP)

// Recover should almost always be FIRST, so it can catch panics from
// every other middleware and handler in the chain, not just from routes.
```

---

## Skipping Middleware Conditionally

```go
e.Use(middleware.JWTWithConfig(middleware.JWTConfig{
    Skipper: func(c echo.Context) bool {
        // Skip JWT check for these public paths
        return c.Path() == "/login" || c.Path() == "/health" || c.Path() == "/register"
    },
    SigningKey: []byte("secret"),
}))
```

---

## Tips

- `middleware.Recover()` should be registered first (or very early) — it can only catch panics from code that runs AFTER it in the chain.
- Register CORS middleware before authentication middleware — browsers send unauthenticated preflight `OPTIONS` requests that would otherwise be incorrectly rejected by an auth check.
- Use the `Skipper` function (available on most built-in middleware configs) to exclude specific paths (health checks, public login endpoints) rather than restructuring your route groups awkwardly.
- Prefer group-level middleware (`e.Group("/admin", AuthMiddleware)`) over per-route middleware when the same middleware applies to many related routes — less repetition, harder to forget on a new route.
- `echo-jwt` (the official JWT middleware package) handles token parsing/validation — you only need to implement issuing tokens at login and reading claims in protected handlers.

---

## Summary

- Middleware wraps `echo.HandlerFunc`, running code before and/or after the next handler in the chain — registered via `e.Use()` (global), on a group, or per-route.
- Built-in middleware covers the essentials: `Logger`, `Recover`, `CORS`, `RateLimiter`, `Gzip`, `RequestID`, `Secure`, `CSRF`, `BodyLimit`.
- JWT auth via `echo-jwt`: issue tokens at login, protect route groups with the middleware, read claims via `c.Get("user")` in handlers.
- Custom middleware follows the same `func(next echo.HandlerFunc) echo.HandlerFunc` pattern — used for API key auth, role-based authorization, and structured request logging.
- Middleware order matters: `Recover` first, `CORS` before auth, rate limiting often after auth (to rate-limit per-user).
- Use each middleware's `Skipper` function to exclude specific paths cleanly, rather than restructuring routes.
