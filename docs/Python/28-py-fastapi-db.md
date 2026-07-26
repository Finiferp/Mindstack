---
title: "FastAPI — Database with SQLAlchemy"
sidebar_label: "Database"
sidebar_position: 28
---

# FastAPI — Database with SQLAlchemy

Async SQLAlchemy 2.0, dependency-injected sessions, and Alembic migrations for FastAPI.

---

## Setup

```bash
pip install sqlalchemy asyncpg alembic
# or for sync: pip install sqlalchemy psycopg2-binary
```

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# postgresql+asyncpg://user:pass@localhost/dbname
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,        # log SQL in debug mode
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # verify connections before use
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

# Dependency for injecting DB session into routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## Models

```python
# app/models/user.py
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    posts: Mapped[list["Post"]] = relationship(back_populates="author",
                                                cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int]      = mapped_column(primary_key=True)
    title: Mapped[str]   = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    author: Mapped["User"] = relationship(back_populates="posts")
```

---

## CRUD Operations (Async)

```python
# app/services/user_service.py
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password

async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def list_users(db: AsyncSession, skip: int = 0, limit: int = 20) -> list[User]:
    result = await db.execute(
        select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
    )
    return list(result.scalars().all())

async def update_user(db: AsyncSession, user_id: int, **fields) -> User | None:
    await db.execute(update(User).where(User.id == user_id).values(**fields))
    await db.commit()
    return await get_user(db, user_id)

async def delete_user(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return result.rowcount > 0

async def count_users(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one()

# Eager loading relationships (avoid N+1)
from sqlalchemy.orm import selectinload

async def get_user_with_posts(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.posts))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

---

## Using in Routes

```python
# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await user_service.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    return await user_service.create_user(db, user)

@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user

@router.get("/", response_model=list[UserOut])
async def list_users(
    skip: int = 0, limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    return await user_service.list_users(db, skip, limit)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await user_service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(404, "User not found")
```

---

## Alembic Migrations

```bash
pip install alembic
alembic init alembic

# Configure alembic/env.py to use your async engine and Base.metadata
```

```python
# alembic/env.py — key modifications
from app.database import Base
from app.models import user, post   # import all models so they're registered
target_metadata = Base.metadata

# For async engine support:
import asyncio
from sqlalchemy.ext.asyncio import async_engine_from_config

def run_migrations_online():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
    )

    async def run_async_migrations():
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()

    asyncio.run(run_async_migrations())

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
```

```bash
# alembic.ini — set your database URL
# sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/mydb

# Workflow
alembic revision --autogenerate -m "create users table"
alembic upgrade head              # apply all pending migrations
alembic downgrade -1              # rollback one migration
alembic current                   # show current revision
alembic history                   # show all migrations
alembic upgrade +1                # apply next migration only
```

---

## SQLModel — Alternative (Pydantic + SQLAlchemy in One)

SQLModel (by the FastAPI author) combines Pydantic and SQLAlchemy — one class for both DB model and API schema.

```bash
pip install sqlmodel
```

```python
from sqlmodel import SQLModel, Field, Relationship, create_engine, Session, select
from typing import Optional

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    username: str

class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    posts: list["Post"] = Relationship(back_populates="author")

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

class Post(SQLModel, table=True):
    __tablename__ = "posts"
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    author_id: int = Field(foreign_key="users.id")
    author: User = Relationship(back_populates="posts")

# Engine and session
engine = create_engine("sqlite:///./app.db")
SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# Usage in a route
@app.post("/users/", response_model=UserOut)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    db_user = User(email=user.email, username=user.username,
                   hashed_password=hash_password(user.password))
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user

@app.get("/users/", response_model=list[UserOut])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
```

---

## Testing with a Test Database

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from httpx import AsyncClient, ASGITransport

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

# tests/test_users.py
@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/users/", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "secretpassword",
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
```

---

## Tips

- Always use `selectinload()` for relationships you'll access — avoids the N+1 query problem in async code (lazy loading doesn't work well with async).
- `expire_on_commit=False` on the session factory prevents "DetachedInstanceError" when accessing objects after commit.
- SQLModel is excellent for smaller projects — one model definition serves as both DB table and Pydantic schema. For complex apps, separate SQLAlchemy models from Pydantic schemas for more control.
- Use `pool_pre_ping=True` in production — detects and recovers from stale database connections.
- Run `alembic revision --autogenerate` after every model change, then review the generated migration before applying.

---

## Summary

- Async SQLAlchemy: `create_async_engine()` + `AsyncSession` + `async def` service functions with `await db.execute(select(...))`.
- Dependency injection: `db: AsyncSession = Depends(get_db)` in every route that needs database access.
- Alembic manages migrations: `alembic revision --autogenerate -m "..."` then `alembic upgrade head`.
- SQLModel combines Pydantic + SQLAlchemy into one class — simpler for smaller projects.
- Always eager-load relationships with `selectinload()` in async code — lazy loading causes errors outside the session context.
