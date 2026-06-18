---
title: "Databases in Node.js"
sidebar_label: "Databases"
sidebar_position: 9
---

# Databases in Node.js

Node.js connects to databases through client libraries. Prisma is the modern ORM of choice — schema-first and fully type-safe. For raw SQL, `pg` (PostgreSQL) and `mysql2` are the standard clients. MongoDB uses Mongoose.

---

## Prisma ORM

Prisma gives you a type-safe query API generated from your schema. No raw SQL for common operations. Works with PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, and CockroachDB.

```bash
npm install prisma @prisma/client
npx prisma init    # creates prisma/schema.prisma and .env
```

### Schema in Full Detail

```prisma
// prisma/schema.prisma

generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

// ── Enums ────────────────────────────────────────────────────────────────
enum Role {
    USER
    ADMIN
    MODERATOR
}

enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
}

// ── Models ───────────────────────────────────────────────────────────────
model User {
    id            Int       @id @default(autoincrement())
    uuid          String    @default(uuid()) @unique
    email         String    @unique
    name          String
    passwordHash  String    @map("password_hash")
    role          Role      @default(USER)
    active        Boolean   @default(true)
    emailVerified Boolean   @default(false) @map("email_verified")
    createdAt     DateTime  @default(now()) @map("created_at")
    updatedAt     DateTime  @updatedAt @map("updated_at")
    deletedAt     DateTime? @map("deleted_at")  // soft delete

    // Relations
    profile       Profile?          // one-to-one (optional)
    posts         Post[]            // one-to-many
    orders        Order[]
    comments      Comment[]
    receivedOrders Order[]  @relation("OrderRecipient")
    sessions      Session[]

    @@map("users")        // table name in DB
    @@index([email])      // add index
    @@index([role, active])
}

model Profile {
    id       Int     @id @default(autoincrement())
    bio      String?
    avatar   String?
    website  String?
    location String?
    userId   Int     @unique @map("user_id")
    user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@map("profiles")
}

model Post {
    id          Int       @id @default(autoincrement())
    title       String
    slug        String    @unique
    content     String?   @db.Text     // TEXT type instead of VARCHAR
    excerpt     String?
    published   Boolean   @default(false)
    publishedAt DateTime? @map("published_at")
    viewCount   Int       @default(0) @map("view_count")
    createdAt   DateTime  @default(now()) @map("created_at")
    updatedAt   DateTime  @updatedAt @map("updated_at")

    authorId    Int       @map("author_id")
    author      User      @relation(fields: [authorId], references: [id])

    categoryId  Int?      @map("category_id")
    category    Category? @relation(fields: [categoryId], references: [id])

    tags        Tag[]     @relation("PostTags")   // many-to-many
    comments    Comment[]

    @@map("posts")
    @@index([authorId])
    @@index([published, publishedAt])
    @@fulltext([title, content])  // MySQL full-text search
}

model Category {
    id       Int     @id @default(autoincrement())
    name     String  @unique
    slug     String  @unique
    parentId Int?    @map("parent_id")
    parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
    children Category[] @relation("CategoryTree")
    posts    Post[]

    @@map("categories")
}

model Tag {
    id    Int    @id @default(autoincrement())
    name  String @unique
    posts Post[] @relation("PostTags")

    @@map("tags")
}

model Comment {
    id        Int       @id @default(autoincrement())
    content   String    @db.Text
    createdAt DateTime  @default(now()) @map("created_at")
    updatedAt DateTime  @updatedAt @map("updated_at")

    authorId  Int       @map("author_id")
    author    User      @relation(fields: [authorId], references: [id])

    postId    Int       @map("post_id")
    post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)

    parentId  Int?      @map("parent_id")    // threaded comments
    parent    Comment?  @relation("CommentThread", fields: [parentId], references: [id])
    replies   Comment[] @relation("CommentThread")

    @@map("comments")
}

model Order {
    id          Int         @id @default(autoincrement())
    status      OrderStatus @default(PENDING)
    totalAmount Decimal     @map("total_amount") @db.Decimal(10, 2)
    notes       String?
    createdAt   DateTime    @default(now()) @map("created_at")
    updatedAt   DateTime    @updatedAt @map("updated_at")

    customerId  Int         @map("customer_id")
    customer    User        @relation(fields: [customerId], references: [id])

    recipientId Int?        @map("recipient_id")
    recipient   User?       @relation("OrderRecipient", fields: [recipientId], references: [id])

    items       OrderItem[]

    @@map("orders")
}

model OrderItem {
    id        Int     @id @default(autoincrement())
    quantity  Int
    unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)

    orderId   Int     @map("order_id")
    order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

    productId Int     @map("product_id")
    product   Product @relation(fields: [productId], references: [id])

    @@map("order_items")
}

model Product {
    id          Int        @id @default(autoincrement())
    name        String
    description String?    @db.Text
    price       Decimal    @db.Decimal(10, 2)
    stock       Int        @default(0)
    sku         String?    @unique
    active      Boolean    @default(true)
    createdAt   DateTime   @default(now()) @map("created_at")

    orderItems  OrderItem[]

    @@map("products")
}

model Session {
    id        String   @id @default(uuid())
    token     String   @unique
    expiresAt DateTime @map("expires_at")
    createdAt DateTime @default(now()) @map("created_at")
    userId    Int      @map("user_id")
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@map("sessions")
    @@index([token])
    @@index([userId])
}
```

### Prisma CLI Commands

```bash
# Migrations
npx prisma migrate dev                    # create migration + apply + regenerate client
npx prisma migrate dev --name add_users   # with a custom name
npx prisma migrate deploy                 # apply pending migrations (production)
npx prisma migrate reset                  # drop DB, run all migrations, run seed
npx prisma migrate status                 # show migration status
npx prisma migrate diff --from-schema-datasource --to-schema-datamodel prisma/schema.prisma

# DB push (no migration files — for prototyping)
npx prisma db push                        # sync schema to DB without migration
npx prisma db pull                        # introspect DB and update schema

# Client
npx prisma generate                       # regenerate client (after schema changes)

# Seed
npx prisma db seed                        # run prisma.seed in package.json

# Studio
npx prisma studio                         # open browser-based DB GUI

# Format
npx prisma format                         # format schema.prisma
```

```json
// package.json — seed configuration
{
    "prisma": {
        "seed": "tsx prisma/seed.ts"
    }
}
```

### Prisma Client Setup

```typescript
// src/lib/db.ts — ONE shared instance for the whole app
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty"
});

// Prevent multiple instances in development (Next.js / hot reload issue)
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
```

### CRUD Operations — Every Method

```typescript
import db from "./lib/db.js";

// ── CREATE ────────────────────────────────────────────────────────────────

// Create single record
const user = await db.user.create({
    data: {
        name: "Alice",
        email: "alice@example.com",
        passwordHash: hashedPassword,
        role: "ADMIN"
    }
});

// Create with nested relations (create related records in one call)
const userWithProfile = await db.user.create({
    data: {
        name: "Bob",
        email: "bob@example.com",
        passwordHash: hash,
        profile: {
            create: { bio: "Hello world", location: "Paris" }
        },
        posts: {
            create: [
                { title: "First Post", slug: "first-post" },
                { title: "Second Post", slug: "second-post" }
            ]
        }
    },
    include: {
        profile: true,
        posts: true
    }
});

// Create many (no return by default — faster)
await db.user.createMany({
    data: [
        { name: "Alice", email: "alice@example.com", passwordHash: hash },
        { name: "Bob",   email: "bob@example.com",   passwordHash: hash },
        { name: "Carol", email: "carol@example.com", passwordHash: hash }
    ],
    skipDuplicates: true   // ignore duplicate unique constraint violations
});

// ── READ ──────────────────────────────────────────────────────────────────

// Find by unique field
const user = await db.user.findUnique({
    where: { id: 1 }
});
// Returns null if not found

const user = await db.user.findUnique({
    where: { email: "alice@example.com" }
});

// Find or throw (throws PrismaClientKnownRequestError if not found)
const user = await db.user.findUniqueOrThrow({
    where: { id: 1 }
});

// Find first matching
const admin = await db.user.findFirst({
    where: { role: "ADMIN", active: true },
    orderBy: { createdAt: "desc" }
});

// Find many
const users = await db.user.findMany();

const users = await db.user.findMany({
    where: {
        active: true,
        role: { in: ["ADMIN", "MODERATOR"] },
        createdAt: { gte: new Date("2024-01-01") }
    },
    orderBy: [
        { role: "asc" },
        { name: "asc" }
    ],
    skip: 0,
    take: 20,
    include: {
        profile: true,
        posts: {
            where: { published: true },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, title: true, slug: true }
        },
        _count: {
            select: { posts: true, orders: true }
        }
    }
});

// Select only specific fields
const names = await db.user.findMany({
    select: {
        id: true,
        name: true,
        email: true
        // passwordHash is NOT selected — secure by default
    }
});

// ── UPDATE ────────────────────────────────────────────────────────────────

// Update single record
const updated = await db.user.update({
    where: { id: 1 },
    data: { name: "Alice Updated", role: "ADMIN" }
});

// Atomic numeric operations
await db.product.update({
    where: { id: 1 },
    data: {
        stock:     { increment: 10 },  // stock += 10
        viewCount: { decrement: 1 },   // viewCount -= 1
        price:     { multiply: 1.1 },  // price *= 1.1
        score:     { divide: 2 }       // score /= 2
    }
});

// Update many
const { count } = await db.user.updateMany({
    where: { role: "USER", active: false },
    data: { deletedAt: new Date() }
});
console.log(`Soft-deleted ${count} users`);

// Upsert — update if exists, create if not
const user = await db.user.upsert({
    where: { email: "alice@example.com" },
    update: { name: "Alice" },
    create: {
        name: "Alice",
        email: "alice@example.com",
        passwordHash: hash
    }
});

// ── DELETE ────────────────────────────────────────────────────────────────

await db.user.delete({ where: { id: 1 } });

const { count } = await db.user.deleteMany({
    where: { deletedAt: { not: null } }  // hard delete soft-deleted records
});

// ── AGGREGATE ─────────────────────────────────────────────────────────────

const count = await db.user.count();
const count = await db.user.count({ where: { active: true } });

const stats = await db.order.aggregate({
    _count: { id: true },
    _sum:   { totalAmount: true },
    _avg:   { totalAmount: true },
    _min:   { totalAmount: true },
    _max:   { totalAmount: true },
    where:  { status: "DELIVERED" }
});

// Group by
const byRole = await db.user.groupBy({
    by: ["role"],
    _count: { id: true },
    _avg:   { },
    where: { active: true },
    having: { role: { in: ["ADMIN", "MODERATOR"] } },
    orderBy: { role: "asc" }
});
// [{ role: "ADMIN", _count: { id: 5 } }, { role: "MODERATOR", _count: { id: 2 } }]
```

### Filtering — Every Operator

```typescript
await db.user.findMany({
    where: {
        // Equality
        role: "ADMIN",
        active: true,

        // Null check
        deletedAt: null,
        deletedAt: { not: null },

        // String
        name: { contains: "alice" },
        name: { contains: "alice", mode: "insensitive" },  // case-insensitive
        name: { startsWith: "Al" },
        name: { endsWith: "ce" },
        name: { not: "Bob" },
        name: { in: ["Alice", "Bob"] },
        name: { notIn: ["Admin", "System"] },

        // Number / Date comparison
        id:         { gt: 10 },          // greater than
        id:         { gte: 10 },         // greater than or equal
        id:         { lt: 100 },         // less than
        id:         { lte: 100 },        // less than or equal
        createdAt:  { gt: new Date("2024-01-01") },
        createdAt:  { gte: startDate, lte: endDate },  // between

        // Boolean
        active: true,

        // List membership
        role: { in: ["ADMIN", "MODERATOR"] },
        id:   { notIn: [1, 2, 3] },

        // Relation filters
        posts: { some: { published: true } },        // has at least one published post
        posts: { none: { published: false } },       // no unpublished posts
        posts: { every: { published: true } },       // all posts are published
        profile: { isNot: null },                    // has a profile
        profile: { is: null },                       // has no profile
        profile: { is: { location: "Paris" } },      // profile matches condition

        // Logical
        AND: [
            { active: true },
            { role: { not: "BANNED" } }
        ],
        OR: [
            { name: { contains: "alice" } },
            { email: { contains: "alice" } }
        ],
        NOT: { role: "BANNED" },
        NOT: [
            { role: "BANNED" },
            { active: false }
        ]
    }
});
```

### Include vs Select

```typescript
// include — fetch the whole related record
const user = await db.user.findUnique({
    where: { id: 1 },
    include: {
        profile: true,                  // full profile object
        posts: true,                    // all posts
        posts: {
            where: { published: true }, // filtered posts
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { comments: true } // nested include
        }
    }
});

// select — choose exact fields (can't use include AND select at top level together)
const user = await db.user.findUnique({
    where: { id: 1 },
    select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // passwordHash NOT selected
        profile: {
            select: { bio: true, avatar: true }  // select on related too
        },
        _count: {
            select: { posts: true }  // count of related records
        }
    }
});
```

### Transactions

```typescript
// Sequential transactions — array of operations
const [user, post] = await db.$transaction([
    db.user.create({ data: { name: "Alice", email: "a@b.com", passwordHash: hash } }),
    db.post.create({ data: { title: "Hello", slug: "hello", authorId: 1 } })
]);

// Interactive transaction — for complex logic with conditions
const result = await db.$transaction(async (tx) => {
    // Check inventory
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    if (product.stock < quantity) throw new Error("Insufficient stock");

    // Deduct stock
    await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
    });

    // Create order
    const order = await tx.order.create({
        data: {
            customerId,
            totalAmount: product.price.mul(quantity),
            items: {
                create: [{ productId, quantity, unitPrice: product.price }]
            }
        }
    });

    return order;
});
// If anything throws → everything rolls back

// Transaction with timeout and isolation level
await db.$transaction(async (tx) => {
    // ...
}, {
    maxWait: 5000,                       // max time to wait for a slot (ms)
    timeout: 10000,                      // max time the transaction can run (ms)
    isolationLevel: "Serializable"       // ReadUncommitted | ReadCommitted | RepeatableRead | Serializable
});
```

### Raw SQL

```typescript
// $queryRaw — SELECT, returns typed array
const users = await db.$queryRaw<User[]>`
    SELECT u.*, p.bio
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.created_at > ${new Date("2024-01-01")}
    AND u.role = ${role}
    ORDER BY u.name
    LIMIT ${limit} OFFSET ${offset}
`;

// $executeRaw — UPDATE/DELETE, returns affected row count
const count = await db.$executeRaw`
    UPDATE users
    SET active = false, deleted_at = now()
    WHERE last_login < ${cutoffDate}
    AND role = 'USER'
`;

// Unsafe (no parameterization — only use for dynamic queries you fully control)
const tableName = "users";
const users = await db.$queryRawUnsafe(`SELECT * FROM ${tableName} LIMIT 10`);
```

---

## Raw PostgreSQL with `pg`

```bash
npm install pg
npm install -D @types/pg
```

```typescript
import pg from "pg";
const { Pool, Client } = pg;

// Connection pool (use this for web apps)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Or individual options:
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT ?? "5432"),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl:      process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
    // Pool config
    max:                  10,       // max connections
    min:                  2,        // min idle connections
    idleTimeoutMillis:    30000,    // close idle connections after 30s
    connectionTimeoutMillis: 2000,  // throw if can't get connection in 2s
    allowExitOnIdle:      true
});

// Events
pool.on("connect",  (client) => console.log("New client connected"));
pool.on("error",    (err)    => console.error("Unexpected error on idle client", err));
pool.on("remove",   (client) => console.log("Client removed from pool"));

// Simple query — pool manages connection automatically
const result = await pool.query("SELECT NOW() as time");
result.rows;         // array of row objects
result.rowCount;     // number of rows returned
result.fields;       // column metadata

// Parameterized query — ALWAYS use $1, $2 syntax for user input
const { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND active = $2",
    ["alice@example.com", true]
);

// INSERT with RETURNING
const { rows: [user] } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    ["Alice", "alice@example.com", hash]
);

// UPDATE
const { rowCount } = await pool.query(
    "UPDATE users SET name = $1, updated_at = now() WHERE id = $2",
    ["Alice Smith", 1]
);

// DELETE
await pool.query("DELETE FROM users WHERE id = $1", [1]);

// Named query object (reusable)
const getUserQuery = {
    name: "get-user-by-email",   // cache the query plan
    text: "SELECT * FROM users WHERE email = $1",
    values: ["alice@example.com"]
};
const { rows } = await pool.query(getUserQuery);
```

### Manual Client and Transactions

```typescript
// Get a client from the pool for transactions
const client = await pool.connect();

try {
    await client.query("BEGIN");

    const { rows: [fromUser] } = await client.query(
        "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",  // lock the row
        [fromId]
    );
    if (fromUser.balance < amount) throw new Error("Insufficient balance");

    await client.query(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        [amount, fromId]
    );
    await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        [amount, toId]
    );

    await client.query(
        "INSERT INTO transactions (from_id, to_id, amount) VALUES ($1, $2, $3)",
        [fromId, toId, amount]
    );

    await client.query("COMMIT");
} catch (err) {
    await client.query("ROLLBACK");
    throw err;
} finally {
    client.release();  // ALWAYS release back to pool
}
```

### Query Builder Pattern

```typescript
// Simple query builder for dynamic WHERE clauses
class QueryBuilder {
    private conditions: string[] = [];
    private params: any[] = [];
    private paramIndex = 1;

    where(condition: string, value: any): this {
        this.conditions.push(condition.replace("?", `$${this.paramIndex++}`));
        this.params.push(value);
        return this;
    }

    build(base: string): { text: string; values: any[] } {
        const where = this.conditions.length
            ? `WHERE ${this.conditions.join(" AND ")}`
            : "";
        return { text: `${base} ${where}`, values: this.params };
    }
}

// Usage
function buildUserQuery(filters: { role?: string; active?: boolean; search?: string }) {
    const qb = new QueryBuilder();
    if (filters.role)   qb.where("role = ?", filters.role);
    if (filters.active !== undefined) qb.where("active = ?", filters.active);
    if (filters.search) qb.where("name ILIKE ?", `%${filters.search}%`);
    return qb.build("SELECT * FROM users");
}

const { text, values } = buildUserQuery({ role: "admin", active: true });
const { rows } = await pool.query(text, values);
```

---

## MySQL with mysql2

```bash
npm install mysql2
```

```typescript
import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host:            process.env.DB_HOST,
    user:            process.env.DB_USER,
    password:        process.env.DB_PASSWORD,
    database:        process.env.DB_NAME,
    port:            parseInt(process.env.DB_PORT ?? "3306"),
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined
});

// Query — uses ? placeholders (not $1 like PostgreSQL)
const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? AND active = ?",
    ["alice@example.com", true]
);

// Insert
const [result] = await pool.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    ["Alice", "alice@example.com"]
);
result.insertId;      // last inserted ID
result.affectedRows;  // rows affected

// Transaction
const conn = await pool.getConnection();
try {
    await conn.beginTransaction();
    await conn.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [100, 1]);
    await conn.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [100, 2]);
    await conn.commit();
} catch (err) {
    await conn.rollback();
    throw err;
} finally {
    conn.release();
}
```

---

## MongoDB with Mongoose

```bash
npm install mongoose
```

```typescript
import mongoose, { Schema, model, Document, Types } from "mongoose";

// Connect
await mongoose.connect(process.env.MONGODB_URL!, {
    dbName: "myapp"
});
mongoose.connection.on("error", console.error);
mongoose.connection.on("disconnected", () => console.log("MongoDB disconnected"));

// ── Schema Definition ─────────────────────────────────────────────────────
interface IUser extends Document {
    name:      string;
    email:     string;
    password:  string;
    role:      "user" | "admin";
    active:    boolean;
    age?:      number;
    tags:      string[];
    address?:  { city: string; country: string };
    createdAt: Date;
    updatedAt: Date;
    fullName:  string;    // virtual
    isAdmin(): boolean;  // method
}

const userSchema = new Schema<IUser>({
    name:     { type: String,  required: [true, "Name is required"], trim: true, minlength: 2, maxlength: 100 },
    email:    { type: String,  required: true, unique: true, lowercase: true, match: [/\S+@\S+\.\S+/, "Invalid email"] },
    password: { type: String,  required: true, minlength: 8, select: false },  // select:false = excluded by default
    role:     { type: String,  enum: ["user", "admin"], default: "user" },
    active:   { type: Boolean, default: true },
    age:      { type: Number,  min: 0, max: 150 },
    tags:     [String],
    address:  {
        city:    String,
        country: String
    }
}, {
    timestamps: true,          // auto adds createdAt, updatedAt
    toJSON:    { virtuals: true },  // include virtuals in JSON output
    toObject:  { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, active: 1 });
userSchema.index({ name: "text", email: "text" });  // text search

// Virtual — computed property, not stored in DB
userSchema.virtual("fullName").get(function() {
    return `${this.name} <${this.email}>`;
});

// Instance method
userSchema.methods.isAdmin = function(): boolean {
    return this.role === "admin";
};

// Static method
userSchema.statics.findByEmail = function(email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

// Pre/post hooks (middleware)
userSchema.pre("save", async function(next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

userSchema.post("save", function(doc) {
    console.log(`User ${doc.id} saved`);
});

const User = model<IUser>("User", userSchema);

// ── CRUD ──────────────────────────────────────────────────────────────────

// Create
const user = await User.create({ name: "Alice", email: "alice@example.com", password: "pass" });
const users = await User.insertMany([
    { name: "Bob",   email: "bob@example.com",   password: "pass" },
    { name: "Carol", email: "carol@example.com", password: "pass" }
]);

// Read
const all   = await User.find();
const user  = await User.findById(id);
const alice = await User.findOne({ email: "alice@example.com" });
const admin = await User.findOne({ role: "admin" }).sort({ createdAt: -1 });

// Chaining query methods
const results = await User
    .find({ active: true, role: "admin" })
    .select("name email role")       // only these fields
    .select("-password")             // exclude password
    .sort({ name: 1 })              // 1 = ascending, -1 = descending
    .skip(20)
    .limit(10)
    .populate("posts")               // join referenced documents
    .lean();                         // plain JS object (faster, no Mongoose methods)

// Update
await User.findByIdAndUpdate(id, { name: "Updated" }, { new: true });  // new:true = return updated doc
await User.findOneAndUpdate({ email: "a@b.com" }, { $set: { role: "admin" } }, { new: true });
await User.updateMany({ active: false }, { $set: { deletedAt: new Date() } });

// MongoDB update operators
await User.findByIdAndUpdate(id, {
    $set:    { name: "Alice",  role: "admin" },    // set fields
    $unset:  { age: "" },                          // remove field
    $inc:    { loginCount: 1 },                    // increment
    $push:   { tags: "new-tag" },                  // add to array
    $pull:   { tags: "old-tag" },                  // remove from array
    $addToSet: { tags: "unique-tag" }              // add to array if not present
});

// Delete
await User.findByIdAndDelete(id);
await User.deleteMany({ active: false });

// Count
const total  = await User.countDocuments();
const admins = await User.countDocuments({ role: "admin" });

// Aggregation pipeline
const stats = await User.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$role", count: { $sum: 1 }, avgAge: { $avg: "$age" } } },
    { $sort: { count: -1 } },
    { $project: { role: "$_id", count: 1, avgAge: 1, _id: 0 } }
]);
```

---

## Redis with ioredis

```bash
npm install ioredis
```

```typescript
import Redis from "ioredis";

const redis = new Redis({
    host:         process.env.REDIS_HOST ?? "localhost",
    port:         parseInt(process.env.REDIS_PORT ?? "6379"),
    password:     process.env.REDIS_PASSWORD,
    db:           0,
    retryStrategy: (times) => Math.min(times * 50, 2000),  // reconnect with backoff
    enableAutoPipelining: true  // batch commands automatically
});

redis.on("error",   (err) => console.error("Redis error:", err));
redis.on("connect", ()    => console.log("Redis connected"));

// ── String operations ──────────────────────────────────────────────────
await redis.set("key", "value");
await redis.set("key", "value", "EX", 3600);      // expire in 1 hour
await redis.set("key", "value", "PX", 60000);     // expire in 60 seconds
await redis.set("key", "value", "NX");            // only set if NOT exists
await redis.set("key", "value", "XX");            // only set if EXISTS

const val = await redis.get("key");               // "value" or null
await redis.del("key", "key2", "key3");           // delete one or more
await redis.exists("key");                        // 1 (exists) or 0
await redis.expire("key", 3600);                  // set TTL in seconds
await redis.ttl("key");                           // remaining TTL (-1 = no expiry, -2 = gone)
await redis.incr("counter");                      // atomic increment
await redis.incrby("counter", 5);
await redis.decr("counter");

// ── Hash (object storage) ──────────────────────────────────────────────
await redis.hset("user:1", { name: "Alice", email: "alice@example.com", role: "admin" });
await redis.hget("user:1", "name");               // "Alice"
await redis.hmget("user:1", "name", "email");     // ["Alice", "alice@example.com"]
const user = await redis.hgetall("user:1");       // { name: "Alice", email: "...", role: "admin" }
await redis.hdel("user:1", "role");
await redis.hexists("user:1", "name");            // 1 or 0
await redis.hkeys("user:1");                      // ["name", "email"]
await redis.hvals("user:1");                      // ["Alice", "alice@example.com"]
await redis.hlen("user:1");                       // 2

// ── List ────────────────────────────────────────────────────────────────
await redis.rpush("queue", "item1", "item2");     // push to right (end)
await redis.lpush("queue", "item0");              // push to left (start)
await redis.rpop("queue");                        // pop from right
await redis.lpop("queue");                        // pop from left
const item = await redis.blpop("queue", 5);       // blocking pop (wait 5s)
await redis.lrange("queue", 0, -1);              // get all items
await redis.llen("queue");                        // length

// ── Set ─────────────────────────────────────────────────────────────────
await redis.sadd("tags", "js", "typescript", "node");
await redis.srem("tags", "js");
await redis.smembers("tags");                     // all members
await redis.sismember("tags", "node");            // 1 or 0
await redis.scard("tags");                        // count
await redis.sunion("tags:a", "tags:b");          // union
await redis.sinter("tags:a", "tags:b");          // intersection
await redis.sdiff("tags:a", "tags:b");           // difference

// ── Sorted Set ──────────────────────────────────────────────────────────
await redis.zadd("leaderboard", 100, "alice", 200, "bob", 150, "carol");
await redis.zrange("leaderboard", 0, -1);                     // ascending
await redis.zrange("leaderboard", 0, -1, "WITHSCORES");       // with scores
await redis.zrevrange("leaderboard", 0, 9);                   // top 10 descending
await redis.zscore("leaderboard", "alice");                   // "100"
await redis.zrank("leaderboard", "alice");                    // position (0-indexed)
await redis.zrevrank("leaderboard", "bob");                   // rank from top

// ── Caching patterns ────────────────────────────────────────────────────
async function getCached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const data = await fn();
    await redis.set(key, JSON.stringify(data), "EX", ttl);
    return data;
}

// Usage
const users = await getCached(
    "users:all",
    300,   // 5 minutes
    () => db.user.findMany({ where: { active: true } })
);

// Cache invalidation
async function invalidateUserCache(userId: number) {
    const keys = await redis.keys(`user:${userId}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.del("users:all");
}
```

---

## Summary

- **Prisma**: schema-first ORM, type-safe client, excellent migrations. Best choice for new projects.
- Run `npx prisma migrate dev` every time you change the schema.
- Never select `passwordHash` in your queries by default — use `select: { passwordHash: false }` or set up a default select.
- **pg**: use the Pool for web apps; always use parameterized queries (`$1`, `$2`).
- **mysql2**: same pattern as pg but with `?` placeholders.
- **Mongoose**: schema-based ODM for MongoDB; use `lean()` for read-only queries to improve performance.
- **Redis**: use for caching, session storage, rate limiting, pub/sub, and job queues.
- Always release database connections (`.release()` in pg, `conn.release()` in mysql2) in a `finally` block.
