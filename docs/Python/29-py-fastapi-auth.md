---
title: "FastAPI — Authentication, Middleware, Testing"
sidebar_label: "Auth & Testing"
sidebar_position: 29
---

# FastAPI — Authentication, Middleware, Testing

JWT authentication, OAuth2, dependency injection patterns, CORS, and testing FastAPI applications.


---

## Password Hashing

```bash
pip install passlib[bcrypt] python-jose[cryptography] python-multipart
```

```python
# app/core/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## JWT Tokens

```python
# app/core/security.py (continued)
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise ValueError("Invalid or expired token")
```

---

## OAuth2 Password Flow (Login Endpoint)

```python
# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.services import user_service
from app.schemas.auth import Token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user_by_email(db, form_data.username)  # OAuth2 form uses "username"
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(400, "Inactive user")

    access_token  = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
    except ValueError:
        raise HTTPException(401, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")

    user_id = payload.get("sub")
    user = await user_service.get_user(db, int(user_id))
    if not user:
        raise HTTPException(401, "User not found")

    new_access = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": new_access, "refresh_token": refresh_token, "token_type": "bearer"}
```

```python
# app/schemas/auth.py
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int | None = None
```

---

## Protecting Routes — get_current_user Dependency

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import decode_token
from app.services import user_service
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except ValueError:
        raise credentials_exception

    user = await user_service.get_user(db, int(user_id))
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(400, "Inactive user")
    return current_user

async def get_current_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(403, "Not enough permissions")
    return current_user
```

```python
# Using the dependency in routes
from app.dependencies import get_current_active_user, get_current_superuser

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hello, {current_user.username}!"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_superuser),   # admin only
    db: AsyncSession = Depends(get_db),
):
    ...
```

---

## Dependency Injection Patterns

```python
from fastapi import Depends, Header, HTTPException
from typing import Annotated

# Simple dependency
def common_params(skip: int = 0, limit: int = 20):
    return {"skip": skip, "limit": limit}

@app.get("/items/")
def list_items(params: dict = Depends(common_params)):
    return params

# Class-based dependency
class Pagination:
    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size

@app.get("/items/")
def list_items(pagination: Pagination = Depends()):
    return {"offset": pagination.offset, "limit": pagination.page_size}

# Dependency with sub-dependencies
def get_db_session():
    ...

def get_current_user(db=Depends(get_db_session), token: str = Depends(oauth2_scheme)):
    ...

def get_current_active_admin(user=Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(403)
    return user

# Reusable header validation
def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(401, "Invalid API key")
    return x_api_key

@app.get("/admin/", dependencies=[Depends(verify_api_key)])
def admin_endpoint():
    return {"status": "ok"}   # verify_api_key runs but its return value isn't used here

# Modern Annotated style (Python 3.9+/FastAPI recommended)
CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.get("/me")
async def read_me(current_user: CurrentUser):
    return current_user

@router.get("/items/")
async def list_items(db: DbSession, current_user: CurrentUser):
    return await item_service.list_for_user(db, current_user.id)

# Global dependencies (run on every route in a router)
router = APIRouter(dependencies=[Depends(verify_api_key)])

# Yield dependencies (for cleanup — like DB sessions)
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## CORS and Middleware

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["myapp.com", "*.myapp.com"])

# Rate limiting (slowapi)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.get("/limited")
@limiter.limit("5/minute")
async def limited_endpoint(request: Request):
    return {"message": "ok"}
```

---

## Global Exception Handling

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

---

## Testing FastAPI

```python
# tests/test_main.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_signup_and_login(client):
    # Signup
    signup_response = await client.post("/users/", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
    })
    assert signup_response.status_code == 201

    # Login
    login_response = await client.post("/auth/login", data={
        "username": "test@example.com",  # OAuth2 form field is "username"
        "password": "testpass123",
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Protected route
    headers = {"Authorization": f"Bearer {token}"}
    me_response = await client.get("/users/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_unauthorized_access(client):
    response = await client.get("/users/me")
    assert response.status_code == 401

# Overriding dependencies for testing
from app.dependencies import get_current_user

def override_get_current_user():
    return User(id=1, email="test@test.com", username="test", is_active=True)

@pytest.fixture
def authenticated_client():
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_protected_route(authenticated_client):
    response = authenticated_client.get("/protected")
    assert response.status_code == 200
```

---

## Tips

- Use `Annotated[Type, Depends(func)]` for dependencies (FastAPI's recommended modern style) — cleaner and reusable across routes.
- `OAuth2PasswordRequestForm` expects fields named `username` and `password` even when your app uses email — this is the OAuth2 spec, not a bug.
- Always use `app.dependency_overrides` in tests instead of mocking internals — it's the FastAPI-native way to substitute dependencies.
- Store both access and refresh tokens — short-lived access tokens (15-60 min) limit damage from a leaked token; refresh tokens enable re-authentication without re-login.
- Use `httpx.AsyncClient` with `ASGITransport` for testing async FastAPI apps — it doesn't require a running server.

---

## Summary

- Password hashing: `passlib.CryptContext` with bcrypt — never store plaintext passwords.
- JWT: `python-jose` to encode/decode tokens; include `exp` (expiry) and a `type` claim (access vs refresh).
- `OAuth2PasswordBearer` + `get_current_user` dependency = the standard FastAPI auth pattern.
- `Annotated[Type, Depends(...)]` is the modern dependency injection syntax — chain dependencies freely.
- `app.add_middleware(CORSMiddleware, ...)` for cross-origin requests; global exception handlers for consistent error responses.
- Test with `httpx.AsyncClient` + `app.dependency_overrides` — no running server needed.
