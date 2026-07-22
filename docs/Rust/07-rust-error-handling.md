---
title: "Error Handling"
sidebar_label: "Error Handling"
sidebar_position: 7
---

# Error Handling

Rust has no exceptions. Errors are values — `Result<T, E>` for recoverable errors, `panic!` for unrecoverable ones. This forces you to think about failure at every step.

---

## Unrecoverable Errors — panic!

```rust
fn main() {
    // panic! aborts the current thread with a message
    panic!("something went terribly wrong");

    // Common sources of panics:
    let v = vec![1, 2, 3];
    v[99];             // index out of bounds → panic

    let s = "hello";
    s.parse::<i32>().unwrap();  // parse fails → unwrap panics

    // None.unwrap();           // unwrap on None → panic

    // In production: avoid panics in library code
    // Panics are fine in: tests, prototypes, situations that "should never happen"

    // RUST_BACKTRACE=1 cargo run — shows the stack trace on panic
}

// Custom panic hook (for logging before crash)
fn main() {
    std::panic::set_hook(Box::new(|info| {
        eprintln!("Panic: {info}");
        // log to your monitoring system here
    }));

    panic!("test panic");
}
```

---

## The ? Operator — Error Propagation

The `?` operator is the idiomatic way to propagate errors up the call stack.

```rust
use std::fs;
use std::io;

// Without ?: manual match on every error
fn read_username_verbose(path: &str) -> Result<String, io::Error> {
    let content = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => return Err(e),
    };
    match content.lines().next() {
        Some(line) => Ok(line.to_string()),
        None => Err(io::Error::new(io::ErrorKind::Other, "file is empty")),
    }
}

// With ?: clean and readable
fn read_username(path: &str) -> Result<String, io::Error> {
    let content = fs::read_to_string(path)?;  // return Err early if this fails
    let first_line = content.lines().next()
        .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "file is empty"))?;
    Ok(first_line.to_string())
}

// ? works on Option too
fn first_word(s: &str) -> Option<&str> {
    let line = s.lines().next()?;   // return None if no lines
    line.split_whitespace().next()  // return first word or None
}

// ? can only be used in functions that return Result or Option
// In main(), use Result as return type:
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let username = read_username("user.txt")?;
    println!("User: {username}");
    Ok(())
}
```

---

## Custom Error Types

```rust
use std::fmt;
use std::num::ParseIntError;

// Simple custom error with enum variants
#[derive(Debug)]
enum AppError {
    NotFound(String),
    ParseError(ParseIntError),
    InvalidInput { field: String, message: String },
    Io(std::io::Error),
}

// Display for user-facing messages
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::NotFound(item) => write!(f, "Not found: {item}"),
            AppError::ParseError(e) => write!(f, "Parse error: {e}"),
            AppError::InvalidInput { field, message } => {
                write!(f, "Invalid {field}: {message}")
            }
            AppError::Io(e) => write!(f, "I/O error: {e}"),
        }
    }
}

// Implement std::error::Error (required to use with ? and Box<dyn Error>)
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::ParseError(e) => Some(e),
            AppError::Io(e) => Some(e),
            _ => None,
        }
    }
}

// From implementations — enable ? to auto-convert error types
impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self {
        AppError::ParseError(e)
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}

fn parse_age(s: &str) -> Result<u32, AppError> {
    let age: i32 = s.parse()?;   // ParseIntError auto-converted to AppError via From
    if age < 0 {
        return Err(AppError::InvalidInput {
            field: "age".into(),
            message: "must be non-negative".into(),
        });
    }
    Ok(age as u32)
}

fn load_user(id: &str) -> Result<String, AppError> {
    let age = parse_age("25")?;
    let content = std::fs::read_to_string("users.txt")?;  // io::Error → AppError via From
    Ok(format!("User {id}, age {age}"))
}
```

---

## thiserror — Ergonomic Custom Errors

```toml
# Cargo.toml
[dependencies]
thiserror = "1"
```

```rust
use thiserror::Error;

// thiserror generates the boilerplate automatically
#[derive(Debug, Error)]
enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Parse error: {0}")]
    Parse(#[from] std::num::ParseIntError),  // #[from] generates From impl

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid {field}: {message}")]
    InvalidInput {
        field: String,
        message: String,
    },

    #[error("Database error: {0}")]
    Database(String),
}

fn parse_age(s: &str) -> Result<u32, AppError> {
    let n: i32 = s.parse()?;   // ParseIntError → AppError::Parse via #[from]
    if n < 0 {
        return Err(AppError::InvalidInput {
            field: "age".to_string(),
            message: "must be non-negative".to_string(),
        });
    }
    Ok(n as u32)
}
```

---

## anyhow — Flexible Error Handling for Applications

For application code (not libraries), `anyhow` removes the need to define custom error types.

```toml
[dependencies]
anyhow = "1"
```

```rust
use anyhow::{anyhow, bail, Context, Result};

// anyhow::Result<T> = Result<T, anyhow::Error>
// anyhow::Error wraps any error type

fn load_config(path: &str) -> Result<String> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {path}"))?;
    //  ^^^^^^^^^^^^ adds context message to the error chain

    if content.is_empty() {
        bail!("Config file is empty: {path}");
        // bail! = return Err(anyhow!(...))
    }

    Ok(content)
}

fn validate_port(port: u16) -> Result<()> {
    if port < 1024 {
        return Err(anyhow!("Port {port} requires root privileges"));
    }
    Ok(())
}

fn main() -> Result<()> {
    let config = load_config("config.toml")?;
    validate_port(8080)?;
    println!("Config loaded: {} bytes", config.len());
    Ok(())
}

// anyhow::Error chains — print full error context:
// Error: Failed to read config file: config.toml
// Caused by: No such file or directory (os error 2)
```

---

## Error Handling in Libraries vs Applications

```
Library code:
  Define custom error types (thiserror)
  Return specific, structured errors that callers can match on
  Never use anyhow (callers need to inspect the error type)

Application code:
  Use anyhow for convenience — just propagate errors with context
  Or define an AppError enum for places where you recover differently per error

Rule of thumb:
  Building a crate others will use? → thiserror
  Building a binary/service? → anyhow in main paths, thiserror for domain errors
```

---

## Result Combinators — Chaining Without match

```rust
fn main() {
    let result: Result<i32, &str> = Ok(42);

    // Transform Ok value
    result.map(|n| n * 2);             // Ok(84)
    result.map(|n| n.to_string());     // Ok("42")

    // Transform Err value
    result.map_err(|e| format!("Error: {e}"));

    // Chain Results
    result.and_then(|n| {
        if n > 0 { Ok(n * 2) } else { Err("negative") }
    });

    // Default on error
    result.unwrap_or(0);
    result.unwrap_or_else(|_| compute_default());
    result.unwrap_or_default();   // uses T::default()

    // Convert to Option
    result.ok();    // Some(42) or None (loses the error)
    result.err();   // None or Some(error)

    // Flatten Result<Result<T, E>, E> → Result<T, E>
    let nested: Result<Result<i32, &str>, &str> = Ok(Ok(42));
    let flat: Result<i32, &str> = nested.flatten();

    // Collect a Vec<Result<T, E>> into a Result<Vec<T>, E>
    // (fails on first error)
    let strings = vec!["1", "2", "3", "4"];
    let numbers: Result<Vec<i32>, _> = strings.iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("{:?}", numbers);  // Ok([1, 2, 3, 4])

    let strings_with_error = vec!["1", "oops", "3"];
    let result: Result<Vec<i32>, _> = strings_with_error.iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("{:?}", result);   // Err(ParseIntError)
}
```

---

## Tips

- Use `?` everywhere you'd write `match ... Err(e) => return Err(e)` — it's the same thing but readable.
- Add context to errors with `.with_context(|| ...)` from anyhow — "Failed to open file" is much more useful than "No such file or directory" alone.
- `unwrap()` in tests is fine — tests should panic loudly on unexpected None/Err. In production code, handle errors explicitly.
- Choose `thiserror` for library crates and `anyhow` for application binaries — this is the community consensus.
- Collecting an iterator of `Result<T, E>` into `Result<Vec<T>, E>` is idiomatic Rust — it returns the first error or a Vec of all successes.

---

## Summary

- Rust has no exceptions — errors are values: `Result<T, E>` for recoverable, `panic!` for unrecoverable.
- `?` propagates errors up the call stack — desugars to `match { Ok(v) => v, Err(e) => return Err(e.into()) }`.
- `From<E>` implementations enable `?` to auto-convert between error types.
- `thiserror` eliminates error boilerplate for library crates; `anyhow` provides easy error handling for application binaries.
- `.with_context()` adds explanatory messages to errors — always use it when the error alone won't explain what happened.
- Collecting `Iterator<Item = Result<T, E>>` into `Result<Vec<T>, E>` short-circuits on the first error — very useful pattern.
