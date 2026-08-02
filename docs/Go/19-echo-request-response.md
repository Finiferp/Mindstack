---
title: "Echo — Request Binding, Validation, and Responses"
sidebar_label: "Request & Response"
sidebar_position: 19
---

# Echo — Request Binding, Validation, and Responses

Parsing incoming request data into Go structs, validating it, and building responses — the core of any real API handler.

---

## Binding Request Data

Echo's `Bind()` automatically parses JSON body, form data, or query parameters into a Go struct, based on the request's `Content-Type`.

```go
type CreateUserRequest struct {
    Name  string `json:"name" form:"name" query:"name"`
    Email string `json:"email" form:"email" query:"email"`
    Age   int    `json:"age" form:"age" query:"age"`
}

func createUser(c echo.Context) error {
    var req CreateUserRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }

    // req.Name, req.Email, req.Age now populated from JSON body
    // (or form data, or query params — Bind() picks the right source
    // automatically based on Content-Type and HTTP method)

    return c.JSON(http.StatusCreated, req)
}

// Struct tags for each binding source:
// json:"..."   for application/json body
// form:"..."   for multipart/form-data or application/x-www-form-urlencoded
// query:"..."  for URL query parameters
// param:"..."  for path parameters (less common — usually use c.Param() directly)
```

---

## Manual Binding for More Control

```go
func createUserManual(c echo.Context) error {
    // Bind body specifically, ignoring query/form
    var req CreateUserRequest
    if err := (&echo.DefaultBinder{}).BindBody(c, &req); err != nil {
        return err
    }

    // Or read the raw body yourself
    body, err := io.ReadAll(c.Request().Body)
    if err != nil {
        return err
    }
    var req2 CreateUserRequest
    if err := json.Unmarshal(body, &req2); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
    }

    return c.JSON(http.StatusCreated, req2)
}
```

---

## Validation with go-playground/validator

```bash
go get github.com/go-playground/validator/v10
```

```go
package main

import (
    "net/http"

    "github.com/go-playground/validator/v10"
    "github.com/labstack/echo/v4"
)

// Custom validator wrapper implementing echo.Validator
type CustomValidator struct {
    validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    if err := cv.validator.Struct(i); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    return nil
}

func main() {
    e := echo.New()
    e.Validator = &CustomValidator{validator: validator.New()}

    e.POST("/users", createUser)
    e.Logger.Fatal(e.Start(":8080"))
}

type CreateUserRequest struct {
    Name  string `json:"name" validate:"required,min=2,max=100"`
    Email string `json:"email" validate:"required,email"`
    Age   int    `json:"age" validate:"gte=0,lte=150"`
    Role  string `json:"role" validate:"oneof=admin user guest"`
}

func createUser(c echo.Context) error {
    var req CreateUserRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }
    if err := c.Validate(&req); err != nil {
        return err     // echo.HTTPError, automatically formatted by Echo's error handler
    }

    return c.JSON(http.StatusCreated, req)
}
```

```go
// Common validation tags
// required                         — must not be zero value
// min=N / max=N                    — string length or numeric value bounds
// gte=N / lte=N / gt=N / lt=N      — numeric comparisons
// email                            — valid email format
// url                              — valid URL format
// oneof=a b c                      — value must be one of the listed options
// len=N                            — exact length
// alphanum                         — letters and numbers only
// uuid                             — valid UUID format
// dive                             — validate each element of a slice/map

type Order struct {
    Items []OrderItem `json:"items" validate:"required,min=1,dive"`
}
type OrderItem struct {
    ProductID int `json:"product_id" validate:"required"`
    Quantity  int `json:"quantity" validate:"required,gt=0"`
}

// Custom validation function
validate := validator.New()
validate.RegisterValidation("no_spaces", func(fl validator.FieldLevel) bool {
    return !strings.Contains(fl.Field().String(), " ")
})

type Username struct {
    Value string `validate:"required,no_spaces"`
}
```

---

## Building Responses

```go
func handler(c echo.Context) error {
    // JSON — the most common response type for APIs
    return c.JSON(http.StatusOK, map[string]interface{}{
        "id":   1,
        "name": "Alice",
    })

    // JSON from a struct
    user := User{ID: 1, Name: "Alice"}
    return c.JSON(http.StatusOK, user)

    // Pretty-printed JSON (useful for debugging, not typically for production APIs)
    return c.JSONPretty(http.StatusOK, user, "  ")

    // Plain text
    return c.String(http.StatusOK, "OK")

    // HTML
    return c.HTML(http.StatusOK, "<h1>Welcome</h1>")

    // No content
    return c.NoContent(http.StatusNoContent)

    // Redirect
    return c.Redirect(http.StatusFound, "/login")

    // File download
    return c.Attachment("report.pdf", "monthly-report.pdf")

    // Streaming (chunked) response — for large or generated-on-the-fly content
    return c.Stream(http.StatusOK, "text/plain", someReader)

    // XML
    return c.XML(http.StatusOK, user)

    // Blob (raw bytes with a specific content type)
    return c.Blob(http.StatusOK, "image/png", imageBytes)
}
```

---

## Standardized API Response Envelope

A common pattern for consistent API responses across all endpoints.

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Page       int `json:"page"`
    PerPage    int `json:"per_page"`
    TotalCount int `json:"total_count"`
}

func respondSuccess(c echo.Context, status int, data interface{}) error {
    return c.JSON(status, APIResponse{Success: true, Data: data})
}

func respondError(c echo.Context, status int, message string) error {
    return c.JSON(status, APIResponse{Success: false, Error: message})
}

func respondPaginated(c echo.Context, data interface{}, page, perPage, total int) error {
    return c.JSON(http.StatusOK, APIResponse{
        Success: true,
        Data:    data,
        Meta:    &Meta{Page: page, PerPage: perPage, TotalCount: total},
    })
}

// Usage in handlers
func listUsers(c echo.Context) error {
    users, total, err := userService.List(c.Request().Context(), page, perPage)
    if err != nil {
        return respondError(c, http.StatusInternalServerError, "failed to fetch users")
    }
    return respondPaginated(c, users, page, perPage, total)
}
```

---

## File Uploads

```go
func uploadFile(c echo.Context) error {
    file, err := c.FormFile("file")
    if err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "file is required"})
    }

    src, err := file.Open()
    if err != nil {
        return err
    }
    defer src.Close()

    dst, err := os.Create("uploads/" + file.Filename)
    if err != nil {
        return err
    }
    defer dst.Close()

    if _, err = io.Copy(dst, src); err != nil {
        return err
    }

    return c.JSON(http.StatusOK, map[string]string{
        "filename": file.Filename,
        "size":     fmt.Sprintf("%d bytes", file.Size),
    })
}

// Multiple file uploads
func uploadMultiple(c echo.Context) error {
    form, err := c.MultipartForm()
    if err != nil {
        return err
    }
    files := form.File["files"]

    for _, file := range files {
        src, _ := file.Open()
        defer src.Close()
        dst, _ := os.Create("uploads/" + file.Filename)
        defer dst.Close()
        io.Copy(dst, src)
    }

    return c.JSON(http.StatusOK, map[string]int{"uploaded": len(files)})
}
```

---

## Content Negotiation

```go
func handler(c echo.Context) error {
    data := map[string]string{"message": "hello"}

    accept := c.Request().Header.Get("Accept")
    switch {
    case strings.Contains(accept, "application/xml"):
        return c.XML(http.StatusOK, data)
    default:
        return c.JSON(http.StatusOK, data)
    }
}
```

---

## Tips

- Always call `c.Bind()` AND `c.Validate()` together — binding alone doesn't validate the data's correctness, just its shape/type.
- Struct tags for binding (`json`, `form`, `query`) can all be on the SAME struct field simultaneously — Echo picks the appropriate one based on the actual request.
- Use a standardized response envelope (`{success, data, error, meta}`) across your entire API — it makes client-side error handling and pagination consistent and predictable.
- For file uploads, always defer `Close()` on both the source (`file.Open()`) and destination (`os.Create()`) — forgetting either leaks file handles.
- `validate:"dive"` is essential when validating slices of structs — without it, only the slice itself is checked, not each individual element.

---

## Summary

- `c.Bind(&req)` parses JSON body, form data, or query params into a struct automatically, based on struct tags and request Content-Type.
- Pair binding with `go-playground/validator` (wired in as `e.Validator`) for declarative validation via struct tags (`validate:"required,email"`).
- `c.JSON/String/HTML/XML/Blob/Stream/Attachment` cover every common response type; use a consistent response envelope for predictable API shape.
- File uploads: `c.FormFile("field")` for single files, `c.MultipartForm()` for multiple — always defer closing both source and destination.
- Content negotiation based on the `Accept` header lets one handler serve multiple response formats when needed.
