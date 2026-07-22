---
title: "Web APIs with Axum"
sidebar_label: "Web APIs (Axum)"
sidebar_position: 17
---

# Web APIs with Axum

Axum is the dominant Rust web framework — ergonomic, async-first, built on Tokio and Tower. Used by major companies for high-throughput services.

**Docs:** [docs.rs/axum](https://docs.rs/axum) | [github.com/tokio-rs/axum](https://github.com/tokio-rs/axum)

---

## Project Setup

```bash
cargo new my-api
cd my-api
cargo add axum
cargo add tokio --features full
cargo add serde --features derive
cargo add serde_json
cargo add tower
cargo add tower-http --features cors,trace
cargo add tracing
cargo add tracing-subscriber --features env-filter
cargo add anyhow thiserror
cargo add sqlx --features postgres,runtime-tokio,tls-rustls,macros  # or sqlite
cargo add dotenv
```

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
anyhow = "1"
thiserror = "1"
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio", "tls-rustls", "macros", "uuid"] }
uuid = { version = "1", features = ["v4", "serde"] }
dotenv = "0.15"
validator = { version = "0.17", features = ["derive"] }
```

---

## Basic Server

```rust
use axum::{
    routing::{get, post, put, delete},
    Router,
};

#[tokio::main]
async fn main() {
    // Initialise tracing (structured logging)
    tracing_subscriber::fmt()
        .with_env_filter("my_api=debug,tower_http=debug")
        .init();

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/health", get(health_check))
        .route("/api/v1/users", get(list_users).post(create_user))
        .route("/api/v1/users/:id", get(get_user).put(update_user).delete(delete_user));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn root_handler() -> &'static str {
    "Hello from Axum!"
}

async fn health_check() -> axum::http::StatusCode {
    axum::http::StatusCode::OK
}
```

---

## Extractors — Getting Data from Requests

```rust
use axum::{
    extract::{Path, Query, State, Json},
    http::{HeaderMap, StatusCode},
};
use serde::{Deserialize, Serialize};

// Path parameters
async fn get_user(Path(id): Path<u64>) -> String {
    format!("user {id}")
}

// Multiple path params
async fn get_post(Path((user_id, post_id)): Path<(u64, u64)>) -> String {
    format!("user {user_id}, post {post_id}")
}

// Query string: GET /users?page=2&limit=20&search=alice
#[derive(Deserialize, Debug)]
struct ListParams {
    #[serde(default = "default_page")]
    page: u32,
    #[serde(default = "default_limit")]
    limit: u32,
    search: Option<String>,
}
fn default_page() -> u32 { 1 }
fn default_limit() -> u32 { 20 }

async fn list_users(Query(params): Query<ListParams>) -> String {
    format!("page={}, limit={}, search={:?}", params.page, params.limit, params.search)
}

// JSON body
#[derive(Deserialize, Serialize)]
struct CreateUserRequest {
    name: String,
    email: String,
    age: Option<u8>,
}

#[derive(Serialize)]
struct UserResponse {
    id: u64,
    name: String,
    email: String,
}

async fn create_user(
    Json(payload): Json<CreateUserRequest>,
) -> (StatusCode, Json<UserResponse>) {
    let user = UserResponse {
        id: 1,
        name: payload.name,
        email: payload.email,
    };
    (StatusCode::CREATED, Json(user))
}

// Headers
async fn with_headers(headers: HeaderMap) -> String {
    let ua = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    format!("User-Agent: {ua}")
}
```

---

## Shared State with AppState

```rust
use axum::extract::State;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
    config: Arc<Config>,
}

#[derive(Debug)]
struct Config {
    jwt_secret: String,
    base_url: String,
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = sqlx::PgPool::connect(&database_url).await.unwrap();

    let state = AppState {
        db,
        config: Arc::new(Config {
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_default(),
            base_url: std::env::var("BASE_URL").unwrap_or("http://localhost:3000".into()),
        }),
    };

    let app = Router::new()
        .route("/users", get(list_users))
        .with_state(state);   // ← inject state

    axum::serve(tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap(), app)
        .await.unwrap();
}

// Access state in handlers
async fn list_users(State(state): State<AppState>) -> Json<Vec<UserResponse>> {
    let users = sqlx::query_as!(
        UserRow,
        "SELECT id, name, email FROM users ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap();

    Json(users.into_iter().map(Into::into).collect())
}
```

---

## Error Handling

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

// Define your error type
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error")]
    Internal(#[from] anyhow::Error),

    #[error("Database error")]
    Database(#[from] sqlx::Error),
}

// Convert ApiError into an HTTP response
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ApiError::Internal(e) => {
                tracing::error!("Internal error: {e:?}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
            }
            ApiError::Database(e) => {
                tracing::error!("DB error: {e:?}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

// Use in handlers — return Result<impl IntoResponse, ApiError>
async fn get_user(
    Path(id): Path<i64>,
    State(state): State<AppState>,
) -> Result<Json<UserResponse>, ApiError> {
    let user = sqlx::query_as!(
        UserRow,
        "SELECT id, name, email FROM users WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?  // sqlx::Error → ApiError::Database via From
    .ok_or_else(|| ApiError::NotFound(format!("user {id}")))?;

    Ok(Json(user.into()))
}
```

---

## Database with SQLx

```rust
use sqlx::{PgPool, FromRow};
use uuid::Uuid;

#[derive(Debug, FromRow, Serialize)]
struct User {
    id: Uuid,
    name: String,
    email: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

// Migration file: migrations/0001_create_users.sql
// CREATE TABLE users (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     name TEXT NOT NULL,
//     email TEXT NOT NULL UNIQUE,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );

// Run migrations on startup
async fn setup_db(database_url: &str) -> PgPool {
    let pool = PgPool::connect(database_url).await.expect("Cannot connect to DB");
    sqlx::migrate!("./migrations").run(&pool).await.expect("Migration failed");
    pool
}

// CRUD operations
async fn db_get_user(pool: &PgPool, id: Uuid) -> sqlx::Result<Option<User>> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        id
    )
    .fetch_optional(pool)
    .await
}

async fn db_create_user(pool: &PgPool, name: &str, email: &str) -> sqlx::Result<User> {
    sqlx::query_as!(
        User,
        "INSERT INTO users (name, email) VALUES ($1, $2)
         RETURNING id, name, email, created_at",
        name, email
    )
    .fetch_one(pool)
    .await
}

async fn db_update_user(pool: &PgPool, id: Uuid, name: &str) -> sqlx::Result<Option<User>> {
    sqlx::query_as!(
        User,
        "UPDATE users SET name = $1 WHERE id = $2
         RETURNING id, name, email, created_at",
        name, id
    )
    .fetch_optional(pool)
    .await
}

async fn db_delete_user(pool: &PgPool, id: Uuid) -> sqlx::Result<bool> {
    let result = sqlx::query!("DELETE FROM users WHERE id = $1", id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

async fn db_list_users(pool: &PgPool, limit: i64, offset: i64) -> sqlx::Result<Vec<User>> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email, created_at FROM users
         ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        limit, offset
    )
    .fetch_all(pool)
    .await
}
```

---

## Middleware — Logging, CORS, Auth

```rust
use axum::{
    middleware::{self, Next},
    extract::Request,
    response::Response,
    http::{HeaderName, HeaderValue},
};
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
    compression::CompressionLayer,
};
use std::time::Instant;

// Custom middleware — request timing
async fn timing_middleware(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = request.method().clone();
    let uri = request.uri().clone();

    let mut response = next.run(request).await;

    let duration = start.elapsed();
    tracing::info!("{} {} → {} in {:?}",
        method, uri, response.status(), duration);

    response.headers_mut().insert(
        HeaderName::from_static("x-response-time"),
        HeaderValue::from_str(&format!("{}ms", duration.as_millis())).unwrap(),
    );
    response
}

// JWT auth middleware
async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let token = request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(ApiError::Unauthorized)?;

    let claims = validate_jwt(token, &state.config.jwt_secret)
        .map_err(|_| ApiError::Unauthorized)?;

    request.extensions_mut().insert(claims);  // pass claims to handlers
    Ok(next.run(request).await)
}

fn build_router(state: AppState) -> Router {
    let public = Router::new()
        .route("/auth/login", post(login))
        .route("/health", get(health_check));

    let protected = Router::new()
        .route("/users", get(list_users))
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    Router::new()
        .merge(public)
        .merge(protected)
        .layer(
            tower::ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods(Any)
                        .allow_headers(Any),
                )
                .layer(middleware::from_fn(timing_middleware)),
        )
        .with_state(state)
}

fn validate_jwt(token: &str, secret: &str) -> anyhow::Result<Claims> {
    // use the 'jsonwebtoken' crate in real code
    todo!()
}
```

---

## Request Validation

```rust
use validator::{Validate, ValidationError};
use axum::{extract::rejection::JsonRejection, Json};

#[derive(Deserialize, Validate)]
struct CreateUserRequest {
    #[validate(length(min = 1, max = 100, message = "Name must be 1-100 chars"))]
    name: String,

    #[validate(email(message = "Invalid email address"))]
    email: String,

    #[validate(range(min = 18, max = 120, message = "Age must be 18-120"))]
    age: Option<u8>,
}

// Custom validated extractor
struct ValidJson<T>(T);

#[axum::async_trait]
impl<T, S> axum::extract::FromRequest<S> for ValidJson<T>
where
    T: serde::de::DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| ApiError::BadRequest(e.to_string()))?;

        value.validate()
            .map_err(|e| ApiError::BadRequest(e.to_string()))?;

        Ok(ValidJson(value))
    }
}

// Use in handler
async fn create_user(ValidJson(payload): ValidJson<CreateUserRequest>) -> impl IntoResponse {
    // payload is already validated
}
```

---

## Testing Axum Handlers

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::{Request, StatusCode}};
    use tower::ServiceExt;  // for .oneshot()
    use serde_json::json;

    fn test_app() -> Router {
        Router::new()
            .route("/users", get(list_users).post(create_user))
    }

    #[tokio::test]
    async fn test_health_check() {
        let app = Router::new().route("/health", get(health_check));

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_create_user() {
        let app = test_app();

        let body = json!({ "name": "Alice", "email": "alice@example.com" });
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/users")
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let user: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(user["name"], "Alice");
    }
}
```

---

## Tips

- `State` must implement `Clone` — wrap expensive resources in `Arc` inside the state struct.
- Always return `Result<impl IntoResponse, ApiError>` from handlers — lets you use `?` throughout and centralises error formatting.
- Use `sqlx::query_as!` macros — they verify SQL at compile time against a live database (`DATABASE_URL` env var during build).
- `TraceLayer` from `tower-http` gives you structured request logs with almost no configuration — always add it.
- Keep handlers thin: extract, validate, call a service/repository function, return. Business logic goes in separate modules.

---

## Summary

- Axum: `Router::new().route(path, method(handler)).with_state(state)` — the core pattern.
- Extractors get data from requests: `Path`, `Query`, `Json`, `State`, `HeaderMap` — compose them as function parameters.
- `impl IntoResponse for ApiError` is the error handling pattern — one impl, consistent JSON errors across all handlers.
- SQLx: compile-time verified SQL with `query_as!` macro; `PgPool` shared via `AppState`.
- Middleware via `tower::ServiceBuilder` — `TraceLayer`, `CorsLayer`, `CompressionLayer`, custom `from_fn` middleware.
- Test with `.oneshot(request)` from `tower::ServiceExt` — no need to bind a port for unit tests.
