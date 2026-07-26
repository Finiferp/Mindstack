---
title: "Databases"
sidebar_label: "Databases"
sidebar_position: 16
---

# Databases

SQLite (built-in), MySQL, PostgreSQL, MongoDB, and SQLAlchemy ORM.

---

## SQLite — Built-in

```python
import sqlite3
from contextlib import closing

# Connect (creates file if not exists; ":memory:" for in-memory)
conn = sqlite3.connect("app.db")
conn.row_factory = sqlite3.Row    # rows behave like dicts

# Always use context manager or explicit close
with sqlite3.connect("app.db") as conn:
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            name    TEXT NOT NULL,
            email   TEXT NOT NULL UNIQUE,
            age     INTEGER,
            created TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()

    # Insert — use ? placeholders (NEVER format strings — SQL injection!)
    cursor.execute(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        ("Alice", "alice@example.com", 30)
    )
    conn.commit()
    print(cursor.lastrowid)   # auto-generated id

    # Insert many
    users = [
        ("Bob",   "bob@example.com",   25),
        ("Carol", "carol@example.com", 35),
    ]
    cursor.executemany(
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        users
    )
    conn.commit()

    # SELECT
    cursor.execute("SELECT * FROM users ORDER BY name")
    rows = cursor.fetchall()         # all rows
    for row in rows:
        print(row["name"], row["email"])   # dict-like access via Row

    cursor.execute("SELECT * FROM users WHERE age > ?", (25,))
    row = cursor.fetchone()          # first row or None
    rows = cursor.fetchmany(5)       # next 5 rows

    # UPDATE
    cursor.execute(
        "UPDATE users SET age = ? WHERE email = ?",
        (31, "alice@example.com")
    )
    print(cursor.rowcount)   # rows affected
    conn.commit()

    # DELETE
    cursor.execute("DELETE FROM users WHERE id = ?", (3,))
    conn.commit()

    # Parameterised query with dict params (use :name style)
    cursor.execute(
        "SELECT * FROM users WHERE name = :name AND age > :min_age",
        {"name": "Alice", "min_age": 20}
    )

    # Transaction — use connection as context manager
    try:
        with conn:   # commits on success, rolls back on exception
            conn.execute("INSERT INTO users (name, email) VALUES (?, ?)",
                         ("Dave", "dave@example.com"))
            conn.execute("UPDATE users SET age = 40 WHERE name = ?", ("Dave",))
    except sqlite3.IntegrityError as e:
        print(f"Transaction failed: {e}")

    # Schema inspection
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
```

---

## PostgreSQL with psycopg2

```python
# pip install psycopg2-binary
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="mydb",
    user="postgres",
    password="secret",
    # or: dsn="postgresql://postgres:secret@localhost:5432/mydb"
)

with conn:   # transaction context
    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        # Create table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id      SERIAL PRIMARY KEY,
                name    TEXT NOT NULL,
                price   NUMERIC(10,2) NOT NULL,
                stock   INTEGER DEFAULT 0,
                tags    TEXT[]
            )
        """)

        # Insert with %s placeholders (psycopg2 style)
        cur.execute(
            "INSERT INTO products (name, price, tags) VALUES (%s, %s, %s) RETURNING id",
            ("Widget", 9.99, ["hardware", "tool"])
        )
        new_id = cur.fetchone()["id"]

        # Bulk insert (fast)
        products = [("Gadget", 19.99), ("Doohickey", 4.99)]
        execute_values(cur,
            "INSERT INTO products (name, price) VALUES %s",
            products)

        # Query
        cur.execute("SELECT * FROM products WHERE price < %s", (15.00,))
        rows = cur.fetchall()
        for row in rows:
            print(dict(row))

        # UPDATE / DELETE returning affected rows
        cur.execute("UPDATE products SET stock = stock + %s WHERE id = %s",
                    (10, new_id))
        print(cur.rowcount)

# Connection pool (production — use psycopg2.pool or psycopg3)
from psycopg2 import pool

connection_pool = pool.ThreadedConnectionPool(
    minconn=1, maxconn=10,
    dsn="postgresql://postgres:secret@localhost/mydb"
)

conn = connection_pool.getconn()
try:
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
finally:
    connection_pool.putconn(conn)
```

---

## MySQL with mysql-connector-python

```python
# pip install mysql-connector-python
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    port=3306,
    database="mydb",
    user="root",
    password="secret"
)

cursor = conn.cursor(dictionary=True)

# Create table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        customer   VARCHAR(100) NOT NULL,
        total      DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.commit()

# Insert — use %s placeholders
cursor.execute(
    "INSERT INTO orders (customer, total) VALUES (%s, %s)",
    ("Alice", 99.99)
)
conn.commit()
print(cursor.lastrowid)

# Bulk insert
orders = [("Bob", 49.99), ("Carol", 149.99)]
cursor.executemany(
    "INSERT INTO orders (customer, total) VALUES (%s, %s)",
    orders
)
conn.commit()

# Query
cursor.execute("SELECT * FROM orders WHERE total > %s", (50.00,))
for row in cursor.fetchall():
    print(row)   # dict

cursor.close()
conn.close()
```

---

## MongoDB with pymongo

```python
# pip install pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from datetime import datetime

client = MongoClient("mongodb://localhost:27017/")
# or: MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")

db = client["mydb"]
collection = db["users"]

# Insert
result = collection.insert_one({
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30,
    "tags": ["python", "developer"],
    "created_at": datetime.utcnow()
})
print(result.inserted_id)   # ObjectId("...")

# Insert many
result = collection.insert_many([
    {"name": "Bob",   "age": 25, "city": "NYC"},
    {"name": "Carol", "age": 35, "city": "LA"},
])
print(result.inserted_ids)

# Find
user = collection.find_one({"email": "alice@example.com"})
user = collection.find_one({"_id": ObjectId("...")})

users = list(collection.find({"age": {"$gt": 25}}))

# Query operators
collection.find({"age": {"$gte": 18, "$lt": 65}})
collection.find({"city": {"$in": ["NYC", "LA"]}})
collection.find({"tags": "python"})   # array contains
collection.find({"name": {"$regex": "^Al", "$options": "i"}})

# Projection — include/exclude fields
users = list(collection.find(
    {"age": {"$gt": 20}},
    {"name": 1, "email": 1, "_id": 0}   # 1=include, 0=exclude
))

# Sort, skip, limit
users = list(collection.find().sort("age", ASCENDING).skip(10).limit(5))

# Update
collection.update_one(
    {"email": "alice@example.com"},
    {"$set": {"age": 31}, "$push": {"tags": "mentor"}}
)
collection.update_many(
    {"city": "NYC"},
    {"$inc": {"visits": 1}}
)

# Update operators: $set, $unset, $inc, $push, $pull, $addToSet, $rename

# Delete
collection.delete_one({"email": "alice@example.com"})
collection.delete_many({"age": {"$lt": 18}})

# Aggregation pipeline
pipeline = [
    {"$match": {"age": {"$gte": 18}}},
    {"$group": {
        "_id": "$city",
        "count": {"$sum": 1},
        "avg_age": {"$avg": "$age"}
    }},
    {"$sort": {"count": -1}},
    {"$limit": 5}
]
results = list(collection.aggregate(pipeline))

# Indexes
collection.create_index([("email", ASCENDING)], unique=True)
collection.create_index([("name", ASCENDING), ("age", DESCENDING)])
collection.create_index([("name", "text")])   # text search index

# Count
collection.count_documents({"age": {"$gt": 25}})

client.close()
```

---

## SQLAlchemy — Python ORM

```python
# pip install sqlalchemy
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    ForeignKey, DateTime, Boolean, Text,
    select, update, delete, func
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker
from datetime import datetime

# Database URL formats:
# SQLite:     "sqlite:///app.db"  or  "sqlite:///:memory:"
# PostgreSQL: "postgresql+psycopg2://user:pass@localhost/dbname"
# MySQL:      "mysql+mysqlconnector://user:pass@localhost/dbname"

engine = create_engine("sqlite:///app.db", echo=True)  # echo=True logs SQL

# Model definitions
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    name     = Column(String(100), nullable=False)
    email    = Column(String(200), nullable=False, unique=True)
    age      = Column(Integer)
    active   = Column(Boolean, default=True)
    created  = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="author",
                         cascade="all, delete-orphan")

    def __repr__(self):
        return f"User(id={self.id}, name={self.name!r})"

class Post(Base):
    __tablename__ = "posts"

    id        = Column(Integer, primary_key=True)
    title     = Column(String(200), nullable=False)
    content   = Column(Text)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)

    author = relationship("User", back_populates="posts")

# Create all tables
Base.metadata.create_all(engine)

# Session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# CRUD operations
with SessionLocal() as session:
    # Create
    alice = User(name="Alice", email="alice@example.com", age=30)
    session.add(alice)
    session.add_all([
        User(name="Bob",   email="bob@example.com",   age=25),
        User(name="Carol", email="carol@example.com", age=35),
    ])
    session.commit()
    session.refresh(alice)   # reload from DB (gets generated id)
    print(alice.id)

    # Read
    user = session.get(User, 1)                      # by primary key
    user = session.scalar(select(User).where(User.email == "alice@example.com"))

    users = session.scalars(
        select(User).where(User.age > 25).order_by(User.name)
    ).all()

    # Relationship loading
    user_with_posts = session.scalar(
        select(User).where(User.id == 1)
    )
    for post in user_with_posts.posts:   # lazy loaded by default
        print(post.title)

    # Update
    user.age = 31
    session.commit()

    # Bulk update
    session.execute(
        update(User).where(User.active == True).values(age=User.age + 1)
    )
    session.commit()

    # Delete
    session.delete(user)
    session.commit()

    # Queries with joins and aggregation
    from sqlalchemy.orm import selectinload

    # Eager loading (avoids N+1 problem)
    users = session.scalars(
        select(User).options(selectinload(User.posts))
    ).all()

    # Aggregate
    avg_age = session.scalar(select(func.avg(User.age)))
    count   = session.scalar(select(func.count()).select_from(User))

    # Raw SQL when needed
    result = session.execute(
        "SELECT name, COUNT(*) as post_count FROM users JOIN posts "
        "ON users.id = posts.user_id GROUP BY users.id"
    )

# Async SQLAlchemy (for FastAPI, etc.)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

async_engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/mydb"
)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

async def get_user(user_id: int):
    async with AsyncSessionLocal() as session:
        return await session.get(User, user_id)
```

---

## Tips

- Always use parameterised queries (`?` for SQLite, `%s` for psycopg2/MySQL) — never f-strings or `.format()` in SQL.
- SQLAlchemy's `session.execute(select(Model))` is the modern SQLAlchemy 2.0 style — prefer it over the older `session.query(Model)`.
- Use `selectinload()` or `joinedload()` to eagerly load relationships and avoid the N+1 query problem.
- Create indexes on columns used in `WHERE`, `ORDER BY`, and `JOIN` conditions — the single biggest query performance lever.
- Connection pools are essential in production — never create a new connection per request.

---

## Summary

- SQLite: built-in, zero-config, great for dev/small apps. Use `?` placeholders; `conn.row_factory = sqlite3.Row` for dict-like rows.
- psycopg2: PostgreSQL driver. Use `%s` placeholders; `RealDictCursor` for dict rows; connection pool for production.
- pymongo: MongoDB driver. Documents are dicts; `find()`, `insert_one()`, `update_one()`, `aggregate()` pipeline.
- SQLAlchemy: full ORM for any SQL database. Define models as classes; use `Session` for all operations; use `select()` for queries.
- Always parameterise queries — SQL injection is the most common database vulnerability.
