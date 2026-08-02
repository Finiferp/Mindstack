---
title: "Echo — Database Integration"
sidebar_label: "Echo & Databases"
sidebar_position: 21
---

# Echo — Database Integration

Connecting Echo applications to a database using GORM (the most popular Go ORM), plus the repository pattern for clean separation between HTTP and data access concerns.

---

## GORM Setup

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres     # or mysql, sqlite
```

```go
package database

import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewConnection(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),   // log SQL in development
    })
    if err != nil {
        return nil, err
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }
    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(25)
    sqlDB.SetConnMaxLifetime(5 * time.Minute)

    return db, nil
}

// DSN format: "host=localhost user=postgres password=secret dbname=myapp port=5432 sslmode=disable"
```

---

## Models

```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type User struct {
    ID        uint           `json:"id" gorm:"primaryKey"`
    Name      string         `json:"name" gorm:"not null"`
    Email     string         `json:"email" gorm:"uniqueIndex;not null"`
    Password  string         `json:"-" gorm:"not null"`         // never expose in JSON
    Active    bool           `json:"active" gorm:"default:true"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`               // soft delete support

    Posts []Post `json:"posts,omitempty" gorm:"foreignKey:AuthorID"`
}

type Post struct {
    ID       uint   `json:"id" gorm:"primaryKey"`
    Title    string `json:"title" gorm:"not null"`
    Content  string `json:"content"`
    AuthorID uint   `json:"author_id"`
    Author   User   `json:"author,omitempty" gorm:"foreignKey:AuthorID"`

    Tags []Tag `json:"tags,omitempty" gorm:"many2many:post_tags;"`
}

type Tag struct {
    ID   uint   `json:"id" gorm:"primaryKey"`
    Name string `json:"name" gorm:"uniqueIndex"`
}

// Auto-migrate — creates/updates tables to match struct definitions
// (fine for development; use a real migration tool like golang-migrate
// or Atlas for production — auto-migrate never drops/renames columns safely)
func Migrate(db *gorm.DB) error {
    return db.AutoMigrate(&User{}, &Post{}, &Tag{})
}
```

---

## Repository Pattern

Separates data access from business logic — makes testing easy (mock the interface) and keeps GORM specifics out of handlers/services.

```go
package repository

import (
    "context"
    "gorm.io/gorm"
    "myapp/internal/models"
)

type UserRepository interface {
    Create(ctx context.Context, user *models.User) error
    FindByID(ctx context.Context, id uint) (*models.User, error)
    FindByEmail(ctx context.Context, email string) (*models.User, error)
    List(ctx context.Context, limit, offset int) ([]models.User, int64, error)
    Update(ctx context.Context, user *models.User) error
    Delete(ctx context.Context, id uint) error
}

type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) FindByID(ctx context.Context, id uint) (*models.User, error) {
    var user models.User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
    var user models.User
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) List(ctx context.Context, limit, offset int) ([]models.User, int64, error) {
    var users []models.User
    var total int64

    r.db.WithContext(ctx).Model(&models.User{}).Count(&total)
    err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&users).Error

    return users, total, err
}

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
    return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) Delete(ctx context.Context, id uint) error {
    return r.db.WithContext(ctx).Delete(&models.User{}, id).Error
}

var ErrUserNotFound = errors.New("user not found")
```

---

## Service Layer

```go
package service

import (
    "context"
    "myapp/internal/models"
    "myapp/internal/repository"
    "golang.org/x/crypto/bcrypt"
)

type UserService struct {
    repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) Register(ctx context.Context, name, email, password string) (*models.User, error) {
    existing, _ := s.repo.FindByEmail(ctx, email)
    if existing != nil {
        return nil, errors.New("email already registered")
    }

    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &models.User{
        Name:     name,
        Email:    email,
        Password: string(hashedPassword),
    }

    if err := s.repo.Create(ctx, user); err != nil {
        return nil, err
    }
    return user, nil
}

func (s *UserService) Authenticate(ctx context.Context, email, password string) (*models.User, error) {
    user, err := s.repo.FindByEmail(ctx, email)
    if err != nil {
        return nil, err
    }
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
        return nil, errors.New("invalid credentials")
    }
    return user, nil
}
```

---

## Wiring It Together in the Handler

```go
package handlers

import (
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
    "myapp/internal/repository"
    "myapp/internal/service"
)

type UserHandler struct {
    service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
    return &UserHandler{service: service}
}

func (h *UserHandler) Get(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "invalid id")
    }

    user, err := h.service.GetByID(c.Request().Context(), uint(id))
    if err != nil {
        if errors.Is(err, repository.ErrUserNotFound) {
            return echo.NewHTTPError(http.StatusNotFound, "user not found")
        }
        return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
    }

    return c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Register(c echo.Context) error {
    var req struct {
        Name     string `json:"name" validate:"required"`
        Email    string `json:"email" validate:"required,email"`
        Password string `json:"password" validate:"required,min=8"`
    }
    if err := c.Bind(&req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    if err := c.Validate(&req); err != nil {
        return err
    }

    user, err := h.service.Register(c.Request().Context(), req.Name, req.Email, req.Password)
    if err != nil {
        return echo.NewHTTPError(http.StatusConflict, err.Error())
    }

    return c.JSON(http.StatusCreated, user)
}
```

```go
// main.go — dependency wiring
func main() {
    db, err := database.NewConnection(os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    database.Migrate(db)

    userRepo := repository.NewUserRepository(db)
    userService := service.NewUserService(userRepo)
    userHandler := handlers.NewUserHandler(userService)

    e := echo.New()
    e.Use(middleware.Logger(), middleware.Recover())
    e.Validator = &CustomValidator{validator: validator.New()}

    e.POST("/register", userHandler.Register)
    e.GET("/users/:id", userHandler.Get)

    e.Logger.Fatal(e.Start(":8080"))
}
```

---

## GORM Query Patterns

```go
// Basic CRUD
db.Create(&user)
db.First(&user, 1)                              // by primary key
db.Where("email = ?", email).First(&user)
db.Save(&user)                                  // update all fields
db.Model(&user).Update("name", "New Name")      // update one field
db.Model(&user).Updates(map[string]interface{}{"name": "New Name", "active": false})
db.Delete(&user, 1)

// Querying
db.Where("age > ?", 18).Find(&users)
db.Where("name LIKE ?", "%alice%").Find(&users)
db.Order("created_at desc").Limit(10).Find(&users)
db.Where("active = ?", true).Or("role = ?", "admin").Find(&users)

// Preloading relationships (avoiding N+1)
db.Preload("Posts").Find(&users)
db.Preload("Posts.Tags").Find(&users)          // nested preload

// Transactions
err := db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&user).Error; err != nil {
        return err          // rolls back automatically on any returned error
    }
    if err := tx.Create(&profile).Error; err != nil {
        return err
    }
    return nil                // commits if nil returned
})

// Raw SQL (when GORM's query builder isn't enough)
db.Raw("SELECT * FROM users WHERE age > ?", 18).Scan(&users)
db.Exec("UPDATE users SET active = ? WHERE id = ?", false, userID)
```

---

## Tips

- Use the repository pattern (interface + implementation) even in smaller projects — it makes unit testing services trivial via mock repositories, without needing a real database in tests.
- Always call `.WithContext(ctx)` on GORM queries in handlers — propagates request cancellation/timeouts down to the database driver.
- Use GORM's `AutoMigrate` only in development — for production, use a dedicated migration tool (golang-migrate, Atlas, or GORM's own Gorm Migrator with explicit up/down scripts) for safe, reviewable schema changes.
- `Preload()` is essential for avoiding N+1 queries when loading related data — always check whether you need related records before writing a loop that queries per-item.
- Wrap multi-step database operations in `db.Transaction()` — GORM handles commit/rollback automatically based on whether your function returns an error.

---

## Summary

- GORM (`gorm.Open`) provides the ORM layer; struct tags (`gorm:"primaryKey"`, `gorm:"foreignKey:..."`) define schema and relationships.
- The repository pattern (interface + GORM-backed implementation) separates data access from business logic — essential for clean testing.
- Service layer sits between repositories and HTTP handlers, holding business logic (like password hashing, uniqueness checks) that doesn't belong in either layer.
- `Preload()` for eager-loading relationships avoids N+1 queries; `db.Transaction()` handles multi-step atomic operations with automatic rollback on error.
- Always pass request context through to GORM (`.WithContext(ctx)`) so database calls respect request cancellation and timeouts.
