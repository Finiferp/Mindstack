---
title: "Echo — Routing"
sidebar_label: "Echo Routing"
sidebar_position: 18
---

# Echo — Routing

Path parameters, route groups, static file serving, and Echo's routing internals.

---

## Basic Routes

```go
e := echo.New()

e.GET("/", homeHandler)
e.POST("/users", createUserHandler)
e.PUT("/users/:id", updateUserHandler)
e.PATCH("/users/:id", patchUserHandler)
e.DELETE("/users/:id", deleteUserHandler)
e.HEAD("/health", healthHandler)
e.OPTIONS("/users", optionsHandler)

// Match any HTTP method
e.Any("/webhook", webhookHandler)

// Match specific methods only
e.Match([]string{http.MethodGet, http.MethodPost}, "/flexible", flexibleHandler)
```

---

## Path Parameters

```go
e.GET("/users/:id", func(c echo.Context) error {
    id := c.Param("id")
    return c.String(http.StatusOK, "User ID: "+id)
})
// GET /users/42 → "User ID: 42"

// Multiple parameters
e.GET("/users/:userID/posts/:postID", func(c echo.Context) error {
    userID := c.Param("userID")
    postID := c.Param("postID")
    return c.JSON(http.StatusOK, map[string]string{
        "userID": userID,
        "postID": postID,
    })
})

// Wildcard — matches everything after the prefix
e.GET("/files/*", func(c echo.Context) error {
    path := c.Param("*")
    return c.String(http.StatusOK, "File path: "+path)
})
// GET /files/docs/report.pdf → "File path: docs/report.pdf"

// Parameter type conversion — Echo gives you the raw string, convert yourself
e.GET("/products/:id", func(c echo.Context) error {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid id"})
    }
    return c.JSON(http.StatusOK, map[string]int{"id": id})
})
```

---

## Query Parameters

```go
e.GET("/search", func(c echo.Context) error {
    query := c.QueryParam("q")
    page := c.QueryParam("page")                    // "" if not provided
    pageDefault := c.QueryParams().Get("page")      // same thing, alternate access

    // With a default value pattern
    limit := c.QueryParam("limit")
    if limit == "" {
        limit = "20"
    }

    // All query params as a map
    allParams := c.QueryParams()      // url.Values (map[string][]string)

    return c.JSON(http.StatusOK, map[string]string{
        "query": query,
        "page":  page,
        "limit": limit,
    })
})
// GET /search?q=golang&page=2&limit=10
```

---

## Route Groups

Groups let you apply shared prefixes and middleware to a set of routes cleanly.

```go
e := echo.New()

// API versioning via groups
api := e.Group("/api/v1")
api.GET("/status", statusHandler)

users := api.Group("/users")
users.GET("", listUsersHandler)             // GET /api/v1/users
users.GET("/:id", getUserHandler)           // GET /api/v1/users/:id
users.POST("", createUserHandler)           // POST /api/v1/users

// Group-level middleware — applies to ALL routes in this group only
admin := api.Group("/admin", authMiddleware, adminOnlyMiddleware)
admin.GET("/dashboard", dashboardHandler)
admin.GET("/reports", reportsHandler)

// Nested groups
v1 := e.Group("/api/v1")
v1Users := v1.Group("/users")
v1UserPosts := v1Users.Group("/:userID/posts")
v1UserPosts.GET("", listUserPostsHandler)   // GET /api/v1/users/:userID/posts
```

---

## Static File Serving

```go
e := echo.New()

// Serve an entire directory
e.Static("/static", "assets")
// GET /static/css/style.css → serves ./assets/css/style.css

// Serve a single file
e.File("/favicon.ico", "assets/favicon.ico")

// Custom static file handling (e.g. with embed.FS — see go-tooling.md)
import "embed"

//go:embed assets/*
var assetsFS embed.FS

e.StaticFS("/static", echo.MustSubFS(assetsFS, "assets"))

// Serving a Single Page Application (SPA) — fallback to index.html for
// any unmatched route (common pattern for React/Vue apps served by Go)
e.GET("/*", func(c echo.Context) error {
    return c.File("public/index.html")
})
```

---

## Route Priority and Matching Rules

```
Echo's router uses a radix tree internally, giving fast lookups
regardless of how many routes are registered. Matching priority
(most specific wins):

  1. Static routes              users/profile
  2. Parameterized routes       /users/:id
  3. Wildcard/catch-all routes  /users/*

Example — with all three registered for the same prefix:
  e.GET("/users/profile", profileHandler)       // wins for exactly /users/profile
  e.GET("/users/:id", getUserHandler)           // wins for /users/42, /users/anything
  e.GET("/users/*", catchAllHandler)            // only reached if nothing more specific matched

This priority is automatic — you don't need to register routes in a
specific order for this to work correctly, unlike some simpler routers.
```

---

## Named Routes and URL Generation

```go
e.GET("/users/:id", getUserHandler).Name = "user-detail"

// Generate a URL from a named route (avoids hardcoding paths in multiple places)
url := e.Reverse("user-detail", 42)    // "/users/42"
```

---

## Custom 404 and Error Routes

```go
e.HTTPErrorHandler = func(err error, c echo.Context) {
    code := http.StatusInternalServerError
    message := "Internal Server Error"

    if he, ok := err.(*echo.HTTPError); ok {
        code = he.Code
        message = fmt.Sprintf("%v", he.Message)
    }

    if code == http.StatusNotFound {
        c.JSON(http.StatusNotFound, map[string]string{
            "error": "resource not found",
            "path":  c.Request().URL.Path,
        })
        return
    }

    c.JSON(code, map[string]string{"error": message})
}
```

---

## Route Listing / Debugging

```go
// See all registered routes — useful for debugging route conflicts
for _, route := range e.Routes() {
    fmt.Printf("%s %s\n", route.Method, route.Path)
}
```

---

## Tips

- Use route groups for anything with a shared prefix or shared middleware requirement — it keeps route registration organized and avoids repeating middleware attachment on every individual route.
- Echo's radix-tree router means you don't need to worry about registration order for correctness — static routes automatically win over parameterized ones, which win over wildcards.
- Named routes (`e.Reverse()`) prevent hardcoded path strings scattered across your codebase — especially valuable once you have many cross-referencing links/redirects.
- For SPA frontends served by Go, the `e.GET("/*", ...)` fallback-to-index.html pattern is standard — put it LAST among your registered routes so more specific API routes take priority.
- Use `e.Routes()` to print all registered routes during development — a quick sanity check when debugging unexpected 404s.

---

## Summary

- `e.GET/POST/PUT/PATCH/DELETE(path, handler)` register routes; `:param` for path parameters, `*` for wildcards.
- `c.Param("id")`, `c.QueryParam("q")` read path and query parameters respectively — both return strings, convert manually as needed.
- `e.Group(prefix, middleware...)` creates a route group with shared prefix and optional shared middleware — supports nesting.
- `e.Static(urlPrefix, dir)` serves a directory; `e.File()` serves a single file; `embed.FS` enables serving files compiled directly into the binary.
- Route matching priority is automatic: static &gt; parameterized &gt; wildcard — no manual ordering required.
- Custom `e.HTTPErrorHandler` centralizes error response formatting, including custom 404 handling.
