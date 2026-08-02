---
title: "Echo — Testing, Configuration, and Deployment"
sidebar_label: "Testing & Deployment"
sidebar_position: 22
---

# Echo — Testing, Configuration, and Deployment

Testing Echo handlers, managing configuration across environments, and shipping to production — including Docker and Kubernetes deployment (see the DevOps course for the deeper infrastructure side).

---

## Testing Echo Handlers

Echo handlers are just functions taking `echo.Context` — you can test them directly with `httptest`, no running server required.

```go
package handlers

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/labstack/echo/v4"
    "github.com/stretchr/testify/assert"
)

func TestGetUser(t *testing.T) {
    e := echo.New()
    req := httptest.NewRequest(http.MethodGet, "/users/1", nil)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)
    c.SetParamNames("id")
    c.SetParamValues("1")

    h := &UserHandler{service: &mockUserService{}}

    if assert.NoError(t, h.Get(c)) {
        assert.Equal(t, http.StatusOK, rec.Code)
        assert.Contains(t, rec.Body.String(), "Alice")
    }
}

func TestCreateUser(t *testing.T) {
    e := echo.New()
    e.Validator = &CustomValidator{validator: validator.New()}

    body := `{"name":"Bob","email":"bob@example.com","password":"password123"}`
    req := httptest.NewRequest(http.MethodPost, "/register", strings.NewReader(body))
    req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)

    h := &UserHandler{service: &mockUserService{}}

    if assert.NoError(t, h.Register(c)) {
        assert.Equal(t, http.StatusCreated, rec.Code)
    }
}

func TestCreateUserValidationFailure(t *testing.T) {
    e := echo.New()
    e.Validator = &CustomValidator{validator: validator.New()}

    body := `{"name":"","email":"not-an-email","password":"short"}`
    req := httptest.NewRequest(http.MethodPost, "/register", strings.NewReader(body))
    req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)

    h := &UserHandler{service: &mockUserService{}}
    err := h.Register(c)

    var httpErr *echo.HTTPError
    assert.ErrorAs(t, err, &httpErr)
    assert.Equal(t, http.StatusBadRequest, httpErr.Code)
}
```

---

## Mocking the Service Layer

```go
type mockUserService struct{}

func (m *mockUserService) GetByID(ctx context.Context, id uint) (*models.User, error) {
    if id == 1 {
        return &models.User{ID: 1, Name: "Alice", Email: "alice@example.com"}, nil
    }
    return nil, repository.ErrUserNotFound
}

func (m *mockUserService) Register(ctx context.Context, name, email, password string) (*models.User, error) {
    return &models.User{ID: 2, Name: name, Email: email}, nil
}

// For larger projects, generate mocks automatically instead of hand-writing:
// go install go.uber.org/mock/mockgen@latest
// mockgen -source=service/user_service.go -destination=mocks/user_service_mock.go
```

---

## Integration Testing with a Real (Test) Database

```go
func TestUserRepositoryIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test in short mode")
    }

    db := setupTestDB(t)      // connects to a test database, runs migrations
    repo := repository.NewUserRepository(db)

    ctx := context.Background()
    user := &models.User{Name: "Test User", Email: "test@example.com"}

    err := repo.Create(ctx, user)
    assert.NoError(t, err)
    assert.NotZero(t, user.ID)

    found, err := repo.FindByID(ctx, user.ID)
    assert.NoError(t, err)
    assert.Equal(t, "Test User", found.Name)
}

func setupTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})    // in-memory SQLite for fast tests
    require.NoError(t, err)
    require.NoError(t, db.AutoMigrate(&models.User{}))
    return db
}
```

```bash
go test ./...                       # run all tests (includes integration if not skipped)
go test -short ./...                # skip integration tests marked with testing.Short()
```

---

## Configuration Management

```go
package config

import (
    "os"
    "strconv"
    "time"
)

type Config struct {
    Port         string
    DatabaseURL  string
    JWTSecret    string
    Environment  string
    ReadTimeout  time.Duration
    WriteTimeout time.Duration
}

func Load() (*Config, error) {
    cfg := &Config{
        Port:        getEnv("PORT", "8080"),
        DatabaseURL: getEnv("DATABASE_URL", ""),
        JWTSecret:   getEnv("JWT_SECRET", ""),
        Environment: getEnv("ENVIRONMENT", "development"),
    }

    if cfg.DatabaseURL == "" {
        return nil, errors.New("DATABASE_URL is required")
    }
    if cfg.JWTSecret == "" {
        return nil, errors.New("JWT_SECRET is required")
    }

    readTimeout, _ := strconv.Atoi(getEnv("READ_TIMEOUT_SECONDS", "10"))
    cfg.ReadTimeout = time.Duration(readTimeout) * time.Second

    return cfg, nil
}

func getEnv(key, fallback string) string {
    if value, ok := os.LookupEnv(key); ok {
        return value
    }
    return fallback
}

func (c *Config) IsProduction() bool {
    return c.Environment == "production"
}
```

```bash
# Using godotenv for local development (.env file support)
go get github.com/joho/godotenv
```

```go
import "github.com/joho/godotenv"

func main() {
    if os.Getenv("ENVIRONMENT") != "production" {
        godotenv.Load()         // loads .env into environment variables, dev only
    }
    cfg, err := config.Load()
    // ...
}
```

```env
# .env (never commit to git — add to .gitignore)
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
JWT_SECRET=dev-secret-change-in-production
ENVIRONMENT=development
PORT=8080
```

---

## Dockerizing an Echo Application

```dockerfile
# Multi-stage build — see the DevOps course's Docker pages for the full
# explanation of why this pattern matters
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]

# Go's static binaries make this an EXTREMELY small final image —
# often under 20MB total, since there's no runtime/interpreter needed,
# just the compiled binary and CA certificates for HTTPS calls
```

```yaml
# docker-compose.yml — local development with a real database
services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/myapp?sslmode=disable
      JWT_SECRET: dev-secret
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
```

---

## Health Check Endpoint

Essential for any deployment target that checks liveness/readiness (Kubernetes, load balancers).

```go
func healthCheck(db *gorm.DB) echo.HandlerFunc {
    return func(c echo.Context) error {
        sqlDB, err := db.DB()
        if err != nil {
            return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "error"})
        }
        if err := sqlDB.PingContext(c.Request().Context()); err != nil {
            return c.JSON(http.StatusServiceUnavailable, map[string]string{
                "status": "unhealthy",
                "error":  "database unreachable",
            })
        }
        return c.JSON(http.StatusOK, map[string]string{"status": "healthy"})
    }
}

e.GET("/health", healthCheck(db))       // liveness — is the process alive?
e.GET("/ready", readinessCheck(db))     // readiness — can it serve traffic right now?
```

```yaml
# Kubernetes probes referencing these endpoints (see the DevOps course's
# Kubernetes pages for the full explanation of liveness vs readiness)
livenessProbe:
  httpGet: {path: /health, port: 8080}
  initialDelaySeconds: 5
readinessProbe:
  httpGet: {path: /ready, port: 8080}
  initialDelaySeconds: 5
```

---

## Production Checklist

```
[ ] Graceful shutdown implemented (see echo-overview.md)
[ ] Health/readiness endpoints exposed
[ ] Structured logging (zap or zerolog, not just middleware.Logger's
    default text output) — needed for real log aggregation (see the
    DevOps course's logging/ELK page)
[ ] Request timeouts configured (Server.ReadTimeout/WriteTimeout, plus
    middleware.Timeout for handler-level limits)
[ ] Rate limiting on public endpoints
[ ] CORS configured with an explicit allow-list, not a wildcard, if
    credentials are involved
[ ] Secrets loaded from environment/secret manager, never hardcoded
[ ] Database connection pool sized appropriately (SetMaxOpenConns etc.)
[ ] Panic recovery (middleware.Recover()) registered
[ ] TLS termination configured (often at a load balancer/ingress level
    rather than in the Go app itself — see the DevOps course's Nginx
    and Kubernetes Ingress pages)
[ ] Prometheus metrics endpoint exposed (echo-contrib provides a
    ready-made middleware for this) — see the DevOps course's
    Prometheus/Grafana page for the monitoring side
```

```go
// Prometheus metrics via echo-contrib
import "github.com/labstack/echo-contrib/prometheus"

p := prometheus.NewPrometheus("echo", nil)
p.Use(e)     // exposes /metrics automatically
```

---

## Tips

- Test handlers directly with `httptest.NewRequest`/`httptest.NewRecorder` — no need to start a real server for unit tests, keeping the test suite fast.
- Use an in-memory SQLite database for fast repository-layer integration tests, reserving real Postgres/MySQL integration tests for CI (gated behind `testing.Short()`).
- Go's static binaries produce remarkably small Docker images — always use the multi-stage build pattern to get the full benefit.
- Implement both `/health` (liveness) and `/ready` (readiness) endpoints distinctly — they answer different questions and Kubernetes treats them differently (see the DevOps course's Kubernetes pages for the full distinction).
- Load configuration from environment variables (with a `.env` file for local dev only, via `godotenv`) — never commit secrets, and validate required config at startup rather than failing deep inside a request handler later.

---

## Summary

- Test Echo handlers directly via `httptest` — no running server needed; mock the service layer for fast, isolated unit tests.
- Configuration should be loaded from environment variables, validated at startup, with `.env` + `godotenv` for local development convenience only.
- Multi-stage Docker builds produce small, secure Go images — often under 20MB, thanks to static compilation and no runtime dependency.
- Expose distinct `/health` and `/ready` endpoints for liveness and readiness checks — essential for Kubernetes and load balancer integration.
- Before shipping to production: graceful shutdown, structured logging, timeouts, rate limiting, explicit CORS, panic recovery, and metrics exposure should all be in place.
- This Echo section connects directly to the DevOps course for the deployment side — Docker, Kubernetes, Nginx/Ingress, and Prometheus/Grafana pages cover the infrastructure this application will run on.
