---
title: "FastAPI — Overview and Routing"
sidebar_label: "FastAPI Overview"
sidebar_position: 26
---

# FastAPI — Overview and Routing

FastAPI is a modern, async-first Python web framework built on Starlette and Pydantic — extremely fast, with automatic OpenAPI docs and type-hint-driven validation.

---

## Why FastAPI

```
Performance: one of the fastest Python frameworks (on par with Node.js/Go via async)
Type hints:  request/response validation comes free from Python type annotations
Auto docs:   Swagger UI (/docs) and ReDoc (/redoc) generated automatically
Async-first: native async/await support throughout
Pydantic:    data validation and serialisation via Pydantic models
Standards:   built on OpenAPI and JSON Schema — auto-generates client SDKs

FastAPI vs Django vs Flask:
  FastAPI: APIs, microservices, async-heavy workloads, auto-docs matter
  Django:  full-featured web apps, admin panel, ORM, batteries-included
  Flask:   minimal, flexible, you choose every piece
```

---

## Installation and First App

```bash
pip install fastapi uvicorn[standard]

# main.py
```

```python
from fastapi import FastAPI

app = FastAPI(
    title="My API",
    description="A sample API built with FastAPI",
    version="1.0.0",
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

```bash
uvicorn main:app --reload              # dev server with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000
uvicorn main:app --workers 4           # production (multiple workers)

# Visit:
# http://127.0.0.1:8000/docs   → Swagger UI (interactive)
# http://127.0.0.1:8000/redoc  → ReDoc
# http://127.0.0.1:8000/openapi.json → raw OpenAPI schema
```

---

## Project Structure (Recommended)

```
myapi/
├── app/
│   ├── __init__.py
│   ├── main.py              ← FastAPI app instance, mount routers
│   ├── config.py             ← settings (Pydantic BaseSettings)
│   ├── database.py           ← DB engine/session setup
│   ├── dependencies.py       ← shared dependencies (auth, db session)
│   ├── models/                ← SQLAlchemy models
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/                ← Pydantic schemas
│   │   ├── __init__.py
│   │   └── user.py
│   ├── routers/                ← API route modules
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── posts.py
│   ├── services/               ← business logic
│   │   └── user_service.py
│   └── core/
│       ├── security.py       ← JWT, password hashing
│       └── exceptions.py     ← custom exception handlers
├── tests/
├── alembic/                    ← migrations
├── requirements.txt
└── .env
```

---

## Path Parameters

```python
from fastapi import FastAPI, Path
from enum import Enum

app = FastAPI()

# Basic path parameter — type hint enforces validation
@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id}
# GET /users/abc → 422 Validation Error automatically

# Multiple path parameters
@app.get("/users/{user_id}/posts/{post_id}")
def get_user_post(user_id: int, post_id: int):
    return {"user_id": user_id, "post_id": post_id}

# Path parameter with validation
@app.get("/items/{item_id}")
def get_item(item_id: int = Path(..., gt=0, le=1000, description="The item ID")):
    return {"item_id": item_id}

# Enum path parameter — restricts to specific values
class ModelName(str, Enum):
    resnet = "resnet"
    lenet  = "lenet"
    alexnet = "alexnet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    return {"model_name": model_name, "message": f"Using {model_name.value}"}

# Path that includes slashes
@app.get("/files/{file_path:path}")
def read_file(file_path: str):
    return {"file_path": file_path}
# GET /files/home/user/doc.txt → file_path = "home/user/doc.txt"
```

---

## Query Parameters

```python
from typing import Optional
from fastapi import Query

# Basic query params (declared as function params NOT in path)
@app.get("/items/")
def list_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}
# GET /items/?skip=5&limit=20

# Optional query param
@app.get("/search/")
def search(q: str | None = None):
    if q:
        return {"query": q}
    return {"message": "no query provided"}

# Required query param (no default = required)
@app.get("/required/")
def required_param(name: str):   # 422 if not provided
    return {"name": name}

# Query with validation
@app.get("/items/")
def list_items(
    q: str | None = Query(None, min_length=3, max_length=50, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, alias="page_size"),
):
    return {"q": q, "page": page, "limit": limit}

# List query parameters
@app.get("/items/")
def filter_items(tags: list[str] = Query([])):
    return {"tags": tags}
# GET /items/?tags=a&tags=b&tags=c → tags = ["a","b","c"]

# Bool query param
@app.get("/items/")
def list_active(active: bool = True):
    return {"active": active}
# GET /items/?active=false → active = False
```

---

## Request Body — Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    price: float = Field(..., gt=0)
    tax: float | None = None
    tags: list[str] = []

@app.post("/items/")
def create_item(item: ItemCreate):
    # item is already validated by the time we get here
    total = item.price + (item.tax or 0)
    return {"item": item, "total": total}

# Combine body + path + query
@app.put("/items/{item_id}")
def update_item(item_id: int, item: ItemCreate, q: str | None = None):
    result = {"item_id": item_id, **item.model_dump()}
    if q:
        result["q"] = q
    return result

# Multiple body parameters
class User(BaseModel):
    username: str
    email: str

@app.post("/orders/")
def create_order(item: ItemCreate, user: User):
    # Body: {"item": {...}, "user": {...}}
    return {"item": item, "user": user}

# Embed a single model under its name
@app.post("/orders/")
def create_order(item: ItemCreate = Body(..., embed=True)):
    # Body: {"item": {...}}  instead of just {...}
    return item
```

---

## Response Models and Status Codes

```python
from fastapi import status, HTTPException

class ItemOut(BaseModel):
    id: int
    name: str
    price: float
    # exclude sensitive fields by not including them here

@app.post("/items/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate):
    new_item = {"id": 1, **item.model_dump()}
    return new_item   # FastAPI filters output to match ItemOut

# Response model with exclusions
class UserOut(BaseModel):
    id: int
    username: str
    # password NOT included — automatically excluded from response

@app.get("/items/", response_model=list[ItemOut])
def list_items():
    return [...]  # list of items, filtered to ItemOut fields

# Error responses
@app.get("/items/{item_id}")
def get_item(item_id: int):
    if item_id not in fake_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found",
        )
    return fake_db[item_id]

# Custom exception handler
from fastapi.responses import JSONResponse
from fastapi import Request

class ItemNotFoundError(Exception):
    def __init__(self, item_id: int):
        self.item_id = item_id

@app.exception_handler(ItemNotFoundError)
def item_not_found_handler(request: Request, exc: ItemNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"message": f"Item {exc.item_id} not found"},
    )
```

---

## Routers — Organising Larger Apps

```python
# app/routers/users.py
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def list_users():
    return [...]

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id}

@router.post("/", status_code=201)
def create_user(user: UserCreate):
    return user

# app/main.py
from fastapi import FastAPI
from app.routers import users, posts

app = FastAPI()

app.include_router(users.router)
app.include_router(posts.router, prefix="/api/v1")

# Nested routers
from app.routers import admin
admin_router = APIRouter(prefix="/admin")
admin_router.include_router(admin.users_router)
admin_router.include_router(admin.settings_router)
app.include_router(admin_router)
```

---

## Async vs Sync Endpoints

```python
# Async endpoint — for I/O-bound work (DB calls, HTTP requests)
@app.get("/async-items/")
async def get_items_async():
    items = await fetch_from_database()
    return items

# Sync endpoint — FastAPI runs it in a thread pool automatically
@app.get("/sync-items/")
def get_items_sync():
    items = blocking_database_call()   # OK — runs in thread pool
    return items

# Rule of thumb:
# Use 'async def' if everything inside uses 'await' (async DB driver, httpx, etc.)
# Use regular 'def' if you're calling blocking/sync libraries (requests, sync SQLAlchemy)
# Never call blocking code inside an 'async def' without awaiting or offloading it
```

---

## Middleware and CORS

```python
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://myapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Startup / shutdown events (lifespan — modern approach)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    db_pool = await create_db_pool()
    app.state.db_pool = db_pool
    yield
    # Shutdown
    print("Shutting down...")
    await db_pool.close()

app = FastAPI(lifespan=lifespan)
```

---

## Tips

- Use type hints for everything — they drive validation, serialisation, and the auto-generated docs simultaneously.
- Use `APIRouter` from the start, even for small apps — makes it trivial to split into modules as the app grows.
- `response_model=` filters output fields — use it to prevent leaking sensitive fields like password hashes.
- Prefer `async def` throughout if using an async database driver (`asyncpg`, `motor`) — mixing sync calls inside async endpoints blocks the event loop.
- Visit `/docs` constantly during development — the interactive Swagger UI lets you test endpoints without Postman/curl.

---

## Summary

- `@app.get/post/put/patch/delete(path)` decorators define routes; type hints define validation.
- Path params: `{name}` in the URL + typed function parameter. Query params: extra typed function parameters.
- Request body: a Pydantic `BaseModel` as a function parameter — validated automatically.
- `response_model=` filters and validates the response shape; `status_code=` sets the HTTP status.
- `APIRouter` + `app.include_router()` organises larger apps into modules.
- `/docs` (Swagger) and `/redoc` are generated automatically from your type hints — no extra work needed.
