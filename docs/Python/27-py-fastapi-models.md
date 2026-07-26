---
title: "FastAPI — Pydantic Models and Settings"
sidebar_label: "Pydantic & Settings"
sidebar_position: 27
---

# FastAPI — Pydantic Models and Settings

Pydantic v2 is FastAPI's validation engine. This page covers schema design, validators, and application settings.

---

## Basic Pydantic Models

```python
from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

class Status(str, Enum):
    active   = "active"
    inactive = "inactive"
    banned   = "banned"

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str | None = None
    website: HttpUrl | None = None
    age: int = Field(default=18, ge=0, le=150)
    status: Status = Status.active

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    # All fields optional for PATCH
    username: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None

class UserOut(UserBase):
    id: UUID
    created_at: datetime

    # Pydantic v2 config — allows creating from ORM objects
    model_config = ConfigDict(from_attributes=True)

# Usage
user = UserCreate(
    username="alice",
    email="alice@example.com",
    password="supersecret",
)
print(user.model_dump())        # dict
print(user.model_dump_json())   # JSON string
print(user.model_dump(exclude={"password"}))   # exclude fields
print(user.model_dump(include={"username", "email"}))  # only these

# Parse from dict/JSON
data = {"username": "bob", "email": "bob@example.com", "password": "12345678"}
user = UserCreate.model_validate(data)
user = UserCreate.model_validate_json('{"username": "bob", ...}')
```

---

## Field Configuration

```python
from pydantic import BaseModel, Field
from typing import Annotated

class Product(BaseModel):
    name: str = Field(
        ...,                          # ... means required
        min_length=1,
        max_length=200,
        description="Product name",
        examples=["Wireless Mouse"],
    )
    price: float = Field(..., gt=0, description="Price in USD")
    quantity: int = Field(default=0, ge=0)
    sku: str = Field(..., pattern=r"^[A-Z]{3}-\d{4}$")   # regex validation
    tags: list[str] = Field(default_factory=list)         # mutable default
    metadata: dict[str, str] = Field(default_factory=dict)

    # Field with alias (for different JSON key name)
    internal_id: int = Field(alias="id")

    model_config = ConfigDict(populate_by_name=True)   # allow both name and alias

# Annotated style (Pydantic v2 preferred for reusable constraints)
PositiveInt = Annotated[int, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1)]

class Order(BaseModel):
    quantity: PositiveInt
    note: NonEmptyStr | None = None
```

---

## Validators

```python
from pydantic import BaseModel, field_validator, model_validator, ValidationInfo

class SignupForm(BaseModel):
    username: str
    password: str
    confirm_password: str
    email: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("username must be alphanumeric")
        return v.lower()   # transform is allowed — returned value replaces input

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("password must contain an uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("password must contain a digit")
        return v

    # Cross-field validation
    @model_validator(mode="after")
    def passwords_match(self) -> "SignupForm":
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self

    # Validator with access to other already-validated fields
    @field_validator("confirm_password")
    @classmethod
    def check_matches(cls, v: str, info: ValidationInfo) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("passwords do not match")
        return v

# Usage — raises ValidationError with details on failure
try:
    form = SignupForm(
        username="Alice123",
        password="weakpw",
        confirm_password="weakpw",
        email="ALICE@EXAMPLE.COM",
    )
except ValidationError as e:
    print(e.errors())
    # [{"type": "value_error", "loc": ("password",), "msg": "...", ...}]
```

---

## Nested Models and Relationships

```python
class Address(BaseModel):
    street: str
    city: str
    zip_code: str
    country: str = "US"

class Company(BaseModel):
    name: str
    address: Address

class Employee(BaseModel):
    name: str
    email: EmailStr
    company: Company
    addresses: list[Address] = []

# Nested creation
emp = Employee(
    name="Alice",
    email="alice@company.com",
    company={
        "name": "TechCorp",
        "address": {"street": "123 Main St", "city": "NYC", "zip_code": "10001"}
    },
    addresses=[
        {"street": "456 Home Ave", "city": "Brooklyn", "zip_code": "11201"}
    ]
)
print(emp.company.address.city)   # NYC

# Recursive models (e.g. tree structures)
class Category(BaseModel):
    name: str
    subcategories: list["Category"] = []

Category.model_rebuild()   # needed for forward references

tree = Category(
    name="Electronics",
    subcategories=[
        Category(name="Phones"),
        Category(name="Laptops", subcategories=[Category(name="Gaming Laptops")]),
    ]
)
```

---

## Generic Models and Reusable Schemas

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool

class ItemOut(BaseModel):
    id: int
    name: str

@app.get("/items/", response_model=PaginatedResponse[ItemOut])
def list_items(page: int = 1, page_size: int = 20):
    items = get_items(page, page_size)
    return PaginatedResponse(
        items=items, total=100, page=page,
        page_size=page_size, has_next=page * page_size < 100
    )

# Generic error response
class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None

# Base schema pattern for reusability
class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: datetime

class PostOut(TimestampMixin):
    id: int
    title: str
    content: str
```

---

## Settings — Environment Configuration

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # Automatically reads from environment variables (case-insensitive)
    app_name: str = "My API"
    debug: bool = False
    database_url: str
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: list[str] = ["http://localhost:3000"]

    # Nested settings
    redis_host: str = "localhost"
    redis_port: int = 6379

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

@lru_cache   # cache settings so .env is only read once
def get_settings() -> Settings:
    return Settings()

# .env file
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost/mydb
# SECRET_KEY=your-secret-key-here
# DEBUG=True
# CORS_ORIGINS=["http://localhost:3000","https://myapp.com"]

# Usage with dependency injection
from fastapi import Depends

@app.get("/info")
def get_info(settings: Settings = Depends(get_settings)):
    return {"app_name": settings.app_name, "debug": settings.debug}

# Or import directly (simpler for small apps)
settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)
```

---

## Serialization Customisation

```python
from pydantic import BaseModel, field_serializer
from datetime import datetime

class Event(BaseModel):
    name: str
    timestamp: datetime
    price: float

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        return dt.strftime("%Y-%m-%d %H:%M")

    @field_serializer("price")
    def serialize_price(self, p: float) -> str:
        return f"${p:.2f}"

event = Event(name="Concert", timestamp=datetime.now(), price=49.99)
print(event.model_dump())
# {"name": "Concert", "timestamp": "2024-01-15 14:30", "price": "$49.99"}

# Computed fields
from pydantic import computed_field

class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height

r = Rectangle(width=4, height=5)
print(r.model_dump())   # {"width": 4, "height": 5, "area": 20}
```

---

## Working with ORM Objects

```python
# Converting SQLAlchemy models to Pydantic schemas

class PostOut(BaseModel):
    id: int
    title: str
    content: str
    author_name: str

    model_config = ConfigDict(from_attributes=True)  # was orm_mode in v1

# In an endpoint
@app.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    return post   # FastAPI converts SQLAlchemy object → PostOut automatically

# Manual conversion
post_out = PostOut.model_validate(post)  # from_attributes must be True
```

---

## Tips

- Use `Annotated[type, Field(...)]` for reusable field constraints — cleaner than repeating `Field(...)` everywhere.
- `model_config = ConfigDict(from_attributes=True)` is required whenever a schema is built directly from an ORM object.
- Split schemas by purpose: `UserCreate` (input, has password), `UserOut` (output, no password), `UserUpdate` (all fields optional).
- Use `@lru_cache` on your settings getter — reads `.env` once, not on every request.
- `field_validator` transforms are applied — the return value replaces the input, useful for normalising data (lowercase emails, etc.).

---

## Summary

- `BaseModel` — the core of every FastAPI schema; type hints define validation automatically.
- `Field(...)` for constraints (`min_length`, `gt`, `pattern`); `...` means required.
- `@field_validator` for single-field validation; `@model_validator(mode="after")` for cross-field checks.
- `PaginatedResponse[T]` — generic models for reusable response shapes.
- `BaseSettings` (from `pydantic-settings`) — type-safe environment configuration, reads `.env` automatically.
- `model_config = ConfigDict(from_attributes=True)` — required to build schemas from ORM objects.
