---
title: "Testing"
sidebar_label: "Testing"
sidebar_position: 15
---

# Testing

Rust has first-class testing built into the language and Cargo. No external test runner needed.

**Book:** Chapter 11 — [doc.rust-lang.org/book/ch11-00-testing.html](https://doc.rust-lang.org/book/ch11-00-testing.html)

---

## Unit Tests

```rust
// Unit tests live in the same file as the code, inside a test module
// This gives them access to private functions — a deliberate design choice

pub fn add(a: i32, b: i32) -> i32 { a + b }
pub fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}
fn internal_helper(x: i32) -> i32 { x * 2 }

#[cfg(test)]         // only compiled when running tests
mod tests {
    use super::*;    // bring parent module's items into scope

    #[test]          // marks this function as a test
    fn test_add() {
        assert_eq!(add(2, 3), 5);       // panics with diff if not equal
        assert_ne!(add(2, 3), 99);      // panics if equal
        assert!(add(1, 1) == 2);        // panics if false
    }

    #[test]
    fn test_divide() {
        assert_eq!(divide(10.0, 2.0), Some(5.0));
        assert_eq!(divide(10.0, 0.0), None);
    }

    #[test]
    fn test_private_function() {
        // Can access private functions from within the module
        assert_eq!(internal_helper(3), 6);
    }

    // Custom failure messages
    #[test]
    fn test_with_message() {
        let result = add(2, 2);
        assert_eq!(result, 4, "add(2, 2) returned {result}, expected 4");
    }

    // Test that panics
    #[test]
    #[should_panic]
    fn test_panics() {
        let v: Vec<i32> = vec![];
        let _ = v[0];   // panics — test passes
    }

    #[test]
    #[should_panic(expected = "divide by zero")]
    fn test_panics_with_message() {
        panic!("attempt to divide by zero");
    }

    // Test that returns Result (no panics — use ? operator)
    #[test]
    fn test_with_result() -> Result<(), String> {
        let val = "42".parse::<i32>().map_err(|e| e.to_string())?;
        assert_eq!(val, 42);
        Ok(())
    }

    // Ignore a test (still compiled but skipped by default)
    #[test]
    #[ignore]
    fn expensive_test() {
        // run with: cargo test -- --include-ignored
        std::thread::sleep(std::time::Duration::from_secs(10));
    }
}
```

---

## Assertion Macros

```rust
// Standard
assert!(expr)                    // panics if false
assert_eq!(left, right)         // panics if not equal; shows diff
assert_ne!(left, right)         // panics if equal

// Floating point — use approximate equality
fn approx_eq(a: f64, b: f64) -> bool { (a - b).abs() < 1e-10 }
assert!(approx_eq(0.1 + 0.2, 0.3));

// With the 'approx' crate:
// use approx::assert_relative_eq;
// assert_relative_eq!(0.1 + 0.2, 0.3, epsilon = 1e-10);

// From 'pretty_assertions' crate — coloured diff output:
// use pretty_assertions::assert_eq;
```

---

## Integration Tests

```
src/
├── lib.rs
tests/          ← integration tests (only test public API)
├── api_test.rs
└── common/
    └── mod.rs  ← shared test helpers
```

```rust
// tests/api_test.rs
// Integration tests are separate crates — they only see the public API
use my_lib::add;     // must use the crate's public API

#[test]
fn integration_test_add() {
    assert_eq!(add(2, 3), 5);
}

// Shared helpers across integration test files
// tests/common/mod.rs
pub fn setup() -> Vec<i32> {
    vec![1, 2, 3]
}

// tests/api_test.rs — use shared setup
mod common;
#[test]
fn test_with_setup() {
    let data = common::setup();
    assert_eq!(data.len(), 3);
}
```

---

## Doc Tests

```rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use my_crate::add;
/// assert_eq!(add(2, 3), 5);
/// assert_eq!(add(-1, 1), 0);
/// ```
///
/// # Panics
/// Does not panic.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Returns None for division by zero.
///
/// ```
/// use my_crate::divide;
/// assert_eq!(divide(10.0, 2.0), Some(5.0));
/// assert_eq!(divide(10.0, 0.0), None);
/// ```
pub fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}

// Doc test that should panic:
/// ```should_panic
/// my_crate::always_panics();
/// ```

// Doc test that is not run (shown but ignored):
/// ```no_run
/// // This would connect to a real database
/// my_crate::connect("prod-db");
/// ```

// Doc test that doesn't compile (just for illustration):
/// ```compile_fail
/// let x: i32 = "not a number";  // won't compile
/// ```
```

```bash
cargo test              # runs unit tests + integration tests + doc tests
cargo test --doc        # doc tests only
cargo test --lib        # unit tests only
cargo test --test api_test  # specific integration test file
```

---

## Running Tests

```bash
cargo test                           # run all tests
cargo test test_add                  # run tests whose name contains "test_add"
cargo test -- --nocapture            # show println! output during tests
cargo test -- --test-threads=1       # run tests sequentially (not parallel)
cargo test -- --include-ignored      # include #[ignore]d tests
cargo test -- --ignored              # run ONLY ignored tests
cargo test --release                 # test with optimisations
RUST_BACKTRACE=1 cargo test          # show full backtrace on panic
```

---

## Mocking and Test Doubles

```rust
// Rust doesn't have built-in mocking — use the 'mockall' crate

// Cargo.toml:
// [dev-dependencies]
// mockall = "0.12"

use mockall::{automock, predicate::*};

#[automock]   // generates MockUserRepository
trait UserRepository {
    fn find_by_id(&self, id: u64) -> Option<String>;
    fn save(&mut self, name: String) -> u64;
}

struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    fn get_username(&self, id: u64) -> String {
        self.repo.find_by_id(id).unwrap_or_else(|| "Unknown".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::eq;

    #[test]
    fn test_get_username_found() {
        let mut mock = MockUserRepository::new();
        mock.expect_find_by_id()
            .with(eq(42u64))
            .times(1)
            .returning(|_| Some("Alice".to_string()));

        let service = UserService { repo: mock };
        assert_eq!(service.get_username(42), "Alice");
    }

    #[test]
    fn test_get_username_not_found() {
        let mut mock = MockUserRepository::new();
        mock.expect_find_by_id()
            .returning(|_| None);

        let service = UserService { repo: mock };
        assert_eq!(service.get_username(99), "Unknown");
    }
}
```

---

## Testing Async Code

```toml
[dev-dependencies]
tokio = { version = "1", features = ["test", "rt"] }
```

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Async unit test
    #[tokio::test]
    async fn test_async_fn() {
        let result = some_async_fn().await;
        assert_eq!(result, 42);
    }

    // Async test with timeout
    #[tokio::test]
    async fn test_with_timeout() {
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(1),
            some_async_fn(),
        ).await;
        assert!(result.is_ok());
    }
}
```

---

## Test Organisation Patterns

```rust
// Pattern 1: test module per function/struct in the same file
impl Calculator {
    pub fn add(&self, a: i32, b: i32) -> i32 { a + b }
    pub fn divide(&self, a: f64, b: f64) -> Option<f64> { ... }
}

#[cfg(test)]
mod tests {
    mod add_tests {
        use super::super::*;
        #[test] fn adds_positive() { ... }
        #[test] fn adds_negative() { ... }
    }
    mod divide_tests {
        use super::super::*;
        #[test] fn divides_correctly() { ... }
        #[test] fn handles_zero_divisor() { ... }
    }
}

// Pattern 2: builder / arrange-act-assert
#[test]
fn test_user_creation() {
    // Arrange
    let name = "Alice";
    let email = "alice@example.com";

    // Act
    let user = User::new(name, email);

    // Assert
    assert_eq!(user.name(), name);
    assert_eq!(user.email(), email);
    assert!(user.is_active());
}
```

---

## Tips

- Write doc tests for every public function — they double as documentation and are verified by `cargo test`.
- `cargo test -- --nocapture` is essential for debugging — by default, `println!` output is swallowed on passing tests.
- Use `#[should_panic(expected = "...")]` with a substring of the expected panic message — prevents accidentally passing for the wrong panic.
- For property-based testing (testing with random inputs), see the `proptest` or `quickcheck` crates.
- Integration tests in `tests/` can only access your public API — this is a feature, not a limitation; it tests your crate as users will see it.

---

## Summary — Book Ch 11

- `#[test]` marks a test function; `cargo test` runs them all in parallel.
- `assert_eq!`, `assert_ne!`, `assert!` are the main assertion macros — all show the values on failure.
- `#[should_panic]` tests that code panics; returning `Result<(), E>` lets you use `?` in tests.
- Unit tests (`#[cfg(test)] mod tests`) live in the same file and can access private items.
- Integration tests live in `tests/` and test only the public API.
- Doc tests (`///` with code blocks) are run by `cargo test --doc` — always write them for public APIs.
