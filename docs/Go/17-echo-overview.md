---
title: "Echo — Overview and Setup"
sidebar_label: "Echo Overview"
sidebar_position: 17
---

# Echo — Overview and Setup

Echo is a fast, minimalist, extensible HTTP web framework for Go — one of the most popular choices alongside Gin and Fiber for building REST APIs and web services.

**Docs:** [echo.labstack.com](https://echo.labstack.com)

---

## Why Echo

```
Performance:            one of the fastest Go web frameworks, minimal overhead
                        over net/http itself
Minimalist core:        small, focused API surface — easy to learn fully
Highly extensible:      rich middleware ecosystem, easy custom middleware
Data binding:           built-in request binding for JSON/XML/form/query params
Built-in validation:    integrates cleanly with validator libraries
Auto TLS:               automatic HTTPS via Let's Encrypt integration
HTTP/2 support:         out of the box
Great routing:          supports path params, wildcards, groups cleanly

Echo vs Gin vs Fiber vs plain net/http:
  net/http:             standard library, zero dependencies, most verbose for large apps
  Echo:                 middle ground — lightweight but with real conveniences
  Gin:                  similar performance/philosophy to Echo, larger community,
                        slightly different API style (very similar overall)
  Fiber:                built on fasthttp (NOT net/http) — fastest, but less
                        compatible with the broader Go HTTP ecosystem (some
                        net/http-based middleware won't work directly with Fiber)
```

---

## Installation and First Server

```bash
go mod init myapp
go get github.com/labstack/echo/v4
```

```go
// main.go
package main

import (
    "net/http"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

func main() {
    e := echo.New()

    e.Use(middleware.Logger())
    e.Use(middleware.Recover())

    e.GET("/", func(c echo.Context) error {
        return c.String(http.StatusOK, "Hello, Echo!")
    })

    e.Logger.Fatal(e.Start(":8080"))
}
```

```bash
go run main.go
curl http://localhost:8080/
```

---

## The echo.Echo Instance

```go
e := echo.New()

// Configuration
e.Debug = true                              // verbose error output (dev only!)
e.HideBanner = true                         // suppress Echo's startup banner
e.HidePort = true                           // suppress the "listening on" message

// Server timeouts (important for production — prevent slow clients
// from holding connections open indefinitely)
e.Server.ReadTimeout = 10 * time.Second
e.Server.WriteTimeout = 10 * time.Second

// Custom HTTP error handler
e.HTTPErrorHandler = func(err error, c echo.Context) {
    code := http.StatusInternalServerError
    if he, ok := err.(*echo.HTTPError); ok {
        code = he.Code
    }
    c.JSON(code, map[string]string{"error": err.Error()})
}

// Starting the server
e.Logger.Fatal(e.Start(":8080"))                            // basic HTTP
e.Logger.Fatal(e.StartTLS(":443", "cert.pem", "key.pem"))   // HTTPS
e.Logger.Fatal(e.StartAutoTLS(":443"))                      // automatic Let's Encrypt
```

---

## echo.Context — The Core Abstraction

Every handler receives an `echo.Context`, which wraps the request/response and provides all the convenience methods you'll use constantly.

```go
func handler(c echo.Context) error {
    // Request info
    c.Request()                             // the underlying *http.Request
    c.QueryParam("name")                    // query string parameter
    c.Param("id")                           // path parameter
    c.FormValue("email")                    // form field
    c.Cookie("session")                     // cookie

    // Response writing
    c.String(http.StatusOK, "text")         // plain text response
    c.JSON(http.StatusOK, someStruct)       // JSON response
    c.HTML(http.StatusOK, "<h1>Hi</h1>")    // raw HTML response
    c.Redirect(http.StatusFound, "/login")  // redirect
    c.NoContent(http.StatusNoContent)       // empty response
    c.File("path/to/file.pdf")              // serve a file

    // Context values (set by middleware, read by later handlers)
    c.Set("userID", 42)
    userID := c.Get("userID")

    // Standard context.Context, for passing to functions needing cancellation
    ctx := c.Request().Context()

    return nil
}
```

---

## Graceful Shutdown

```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/labstack/echo/v4"
)

func main() {
    e := echo.New()
    e.GET("/", func(c echo.Context) error {
        return c.String(http.StatusOK, "Hello!")
    })

    // Start server in a goroutine so it doesn't block
    go func() {
        if err := e.Start(":8080"); err != nil && err != http.ErrServerClosed {
            e.Logger.Fatal("shutting down the server:", err)
        }
    }()

    // Wait for interrupt signal (Ctrl+C, or SIGTERM from an orchestrator)
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    // Give in-flight requests up to 10 seconds to complete before forcing shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}

// This pattern is IMPORTANT in production — without it, a Kubernetes
// rolling deploy or any process manager sending SIGTERM will kill
// in-flight requests abruptly instead of letting them finish gracefully
```

---

## Project Structure (Recommended for Real Apps)

```
myapp/
├── go.mod
├── main.go                         ← wires everything together, starts the server
├── internal/
│   ├── config/
│   │   └── config.go               ← environment/config loading
│   ├── handlers/
│   │   ├── user_handler.go         ← HTTP handlers (thin — delegate to services)
│   │   └── post_handler.go
│   ├── middleware/
│   │   └── auth_middleware.go      ← custom middleware
│   ├── models/
│   │   └── user.go                 ← domain structs
│   ├── repository/
│   │   └── user_repository.go      ← database access layer
│   ├── service/
│   │   └── user_service.go         ← business logic
│   └── router/
│       └── router.go               ← route registration, grouped by feature
└── migrations/
    └── 0001_create_users.sql
```

```go
// internal/router/router.go — centralize route registration
package router

import (
    "github.com/labstack/echo/v4"
    "myapp/internal/handlers"
)

func Register(e *echo.Echo, userHandler *handlers.UserHandler) {
    api := e.Group("/api/v1")

    users := api.Group("/users")
    users.GET("", userHandler.List)
    users.GET("/:id", userHandler.Get)
    users.POST("", userHandler.Create)
    users.PUT("/:id", userHandler.Update)
    users.DELETE("/:id", userHandler.Delete)
}
```

---

## Tips

- Always add `middleware.Recover()` — without it, a panic in any handler crashes the entire server process instead of returning a 500 to that one request.
- Implement graceful shutdown from day one for any production service — abrupt termination during a deploy drops in-flight requests.
- Keep handlers thin — delegate to a service/repository layer (see the recommended project structure) rather than putting business logic directly in HTTP handler functions.
- Use `e.Debug = true` only in local development — it can leak sensitive stack trace details in error responses if left on in production.
- `air` (covered in go-tooling.md) makes Echo development dramatically more pleasant — auto-restart on file save instead of manual `go run` every change.

---

## Summary

- `echo.New()` creates the app instance; `e.GET/POST/PUT/DELETE(path, handler)` register routes; `e.Start(":8080")` runs the server.
- Every handler receives `echo.Context` — the unified API for reading requests (`QueryParam`, `Param`, `Bind`) and writing responses (`JSON`, `String`, `HTML`).
- `e.Use(middleware...)` registers global middleware; `middleware.Logger()` and `middleware.Recover()` are the two you should add to virtually every app.
- Graceful shutdown (`e.Shutdown(ctx)` on SIGTERM) is essential for production deployments, especially under Kubernetes rolling updates.
- Structure real applications with handlers → services → repositories, keeping HTTP concerns separate from business logic and data access.
