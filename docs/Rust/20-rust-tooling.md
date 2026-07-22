---
title: "Rust Tooling and Ecosystem"
sidebar_label: "Tooling"
sidebar_position: 20
---

# Rust Tooling and Ecosystem

Rust's tooling is one of its biggest strengths. `cargo`, `rustup`, `clippy`, `rustfmt`, and the wider ecosystem of tools are first-class and well-integrated.

**Book:** Chapter 14 — [doc.rust-lang.org/book/ch14-00-more-about-cargo.html](https://doc.rust-lang.org/book/ch14-00-more-about-cargo.html)

---

## rustup — Toolchain Manager

```bash
# Install / update
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update               # update all installed toolchains

# Toolchains
rustup toolchain list       # installed toolchains
rustup toolchain install nightly   # install nightly
rustup default stable       # set default toolchain
rustup default nightly      # switch default to nightly

# Run a specific toolchain without switching default
cargo +nightly build
rustup run nightly cargo build

# Components
rustup component add clippy        # linter
rustup component add rustfmt       # formatter
rustup component add rust-src      # source (for IDEs and tools)
rustup component add llvm-tools    # LLVM tools (for profiling)
rustup component add miri          # undefined behaviour interpreter (nightly)

# Targets (cross-compilation)
rustup target list                 # all available targets
rustup target add wasm32-unknown-unknown
rustup target add x86_64-unknown-linux-musl    # static Linux binary
rustup target add aarch64-apple-darwin         # Apple Silicon
rustup target add thumbv7em-none-eabihf        # ARM Cortex-M4 (embedded)

# Show installed
rustup show
```

---

## Cargo — The Build Tool

```bash
# Project management
cargo new my-app              # binary project (has main.rs)
cargo new my-lib --lib        # library project (has lib.rs)
cargo init                    # init in existing directory
cargo build                   # debug build (fast; no optimisation)
cargo build --release         # release build (slow build; fast binary)
cargo run                     # build + run
cargo run --bin my-bin        # run a specific binary
cargo run -- arg1 arg2        # pass arguments to the binary
cargo check                   # type-check only (no codegen — fastest feedback)
cargo clean                   # delete target/ directory

# Testing
cargo test                    # run all tests
cargo test my_fn              # run tests matching name
cargo test -- --nocapture     # show println! output
cargo test -- --test-threads=1  # sequential (no parallelism)
cargo test --doc              # run doc tests only
cargo bench                   # run benchmarks

# Dependencies
cargo add serde               # add latest serde
cargo add serde --features derive
cargo add tokio@1.35          # specific version
cargo remove serde            # remove a dependency
cargo update                  # update all deps to latest compatible
cargo update serde            # update only serde
cargo tree                    # print dependency tree
cargo tree -d                 # show duplicated packages

# Documentation
cargo doc                     # build docs for your crate
cargo doc --open              # build + open in browser
cargo doc --no-deps           # skip deps docs (faster)

# Publishing
cargo login                   # authenticate with crates.io
cargo package                 # create .crate file (preview publish)
cargo publish                 # publish to crates.io
cargo publish --dry-run       # validate without publishing
cargo yank --version 1.0.0   # yank a bad release (soft deprecate)

# Cross-compilation
cargo build --target wasm32-unknown-unknown
cargo build --target x86_64-unknown-linux-musl
```

---

## Cargo.toml — Full Reference

```toml
[package]
name = "my-app"
version = "1.2.3"
edition = "2021"          # 2015, 2018, 2021, 2024
authors = ["Alice <alice@example.com>"]
description = "A useful tool"
license = "MIT OR Apache-2.0"  # SPDX expression
repository = "https://github.com/alice/my-app"
homepage = "https://my-app.io"
documentation = "https://docs.rs/my-app"
readme = "README.md"
keywords = ["cli", "tool"]   # max 5, used for crates.io search
categories = ["command-line-utilities"]  # crates.io categories
exclude = ["tests/fixtures/"]
include = ["src/", "README.md", "LICENSE"]
rust-version = "1.70"        # minimum supported Rust version (MSRV)

[features]
default = ["json"]
json = ["serde_json"]
async = ["tokio"]

[dependencies]
# Semver: "1" = "^1" = >=1.0.0, <2.0.0
serde = { version = "1", features = ["derive"], optional = false }
tokio = { version = "1", features = ["full"], optional = true }
my-lib = { path = "../my-lib" }
my-git-lib = { git = "https://github.com/user/lib", tag = "v1.0" }

[dev-dependencies]
criterion = "0.5"
mockall = "0.12"

[build-dependencies]
cc = "1"

[profile.dev]
opt-level = 0              # no optimisation
debug = true               # include debug info
overflow-checks = true     # panic on integer overflow

[profile.release]
opt-level = 3              # maximum optimisation
lto = true                 # link-time optimisation (slower build, faster binary)
codegen-units = 1          # fewer units = better optimisation
panic = "abort"            # smaller binary; no stack unwinding
strip = true               # strip debug symbols

[profile.dev.package."*"]  # optimise all deps even in dev mode
opt-level = 2              # useful when deps (regex, serde) are slow in debug

[[bin]]                    # additional binary targets
name = "my-server"
path = "src/bin/server.rs"

[[example]]
name = "basic"
path = "examples/basic.rs"

[[bench]]
name = "my-bench"
harness = false            # needed for criterion

[[test]]
name = "integration"
path = "tests/integration.rs"
```

---

## Clippy — The Linter

```bash
cargo clippy                         # run clippy on the project
cargo clippy --all-targets           # include tests, examples, benches
cargo clippy --fix                   # auto-fix fixable lints
cargo clippy -- -W clippy::pedantic  # enable pedantic lints (strict)
cargo clippy -- -D warnings          # treat warnings as errors (use in CI)
```

```rust
// Allow specific lints per item
#[allow(clippy::needless_return)]
fn example() -> i32 {
    return 42;
}

// Deny specific lints project-wide (top of main.rs or lib.rs)
#![deny(clippy::unwrap_used)]          // forbid .unwrap() in production
#![deny(clippy::expect_used)]          // forbid .expect() in production
#![warn(clippy::pedantic)]
#![warn(clippy::nursery)]

// Useful clippy lint groups:
// clippy::all       — most lints (default)
// clippy::pedantic  — stricter; opinionated (adds ~150 more lints)
// clippy::nursery   — experimental, unstable
// clippy::cargo     — Cargo.toml checks
```

Common clippy catches:
- `.unwrap()` in non-test code
- Using `clone()` unnecessarily
- `if let Some(x) = ... { ... }` where `?` would work
- Shadowing outer variables confusingly
- Inefficient string building with repeated `+`
- Using `vec![].into_iter()` instead of array iterator
- Needless `return` at end of function

---

## rustfmt — Auto-Formatter

```bash
cargo fmt                    # format all source files
cargo fmt --check            # check without modifying (for CI)
rustfmt src/main.rs          # format a specific file
```

```toml
# rustfmt.toml (in project root) — configuration
edition = "2021"
max_width = 100              # line length (default 100)
tab_spaces = 4               # indentation (default 4)
use_small_heuristics = "Default"
imports_granularity = "Crate"  # merge use statements by crate
group_imports = "StdExternalCrate"  # std, then external, then local
```

---

## Benchmarking with Criterion

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fibonacci(c: &mut Criterion) {
    // Simple benchmark
    c.bench_function("fibonacci 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
        //              ^^^^^^^^^ prevents compiler from optimising away the call
    });

    // Parametric benchmark
    let mut group = c.benchmark_group("fibonacci");
    for i in [10, 15, 20, 25].iter() {
        group.bench_with_input(BenchmarkId::from_parameter(i), i, |b, i| {
            b.iter(|| fibonacci(black_box(*i)));
        });
    }
    group.finish();
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

```bash
cargo bench                  # run benchmarks; saves results
cargo bench -- fibonacci     # run only matching benchmarks
# Results saved to target/criterion/
# Open target/criterion/report/index.html for HTML report
```

---

## Profiling

```bash
# cargo-flamegraph — generate a flamegraph of CPU usage
cargo install flamegraph
cargo flamegraph --bin my-app -- --args

# perf (Linux)
cargo build --release
perf record --call-graph dwarf target/release/my-app
perf report

# Instruments (macOS)
cargo build --release
xcrun xctrace record --template "CPU Profiler" --launch -- target/release/my-app

# DHAT — heap profiling
cargo install dhat
# Add to main.rs:
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;
fn main() {
    let _profiler = dhat::Profiler::new_heap();
    // your code
}
cargo run --release --features dhat-heap
```

---

## cargo-expand — Macro Expansion

```bash
cargo install cargo-expand
cargo expand                  # expand all macros in the crate
cargo expand main             # expand just the main module
cargo expand --bin my-bin
```

Useful for debugging `#[derive(...)], proc macros, and `vec!` to see what Rust actually generates.

---

## Key Third-Party Cargo Tools

```bash
cargo install cargo-edit       # cargo add / cargo remove / cargo upgrade
cargo install cargo-watch      # cargo watch -x run (auto-rebuild on save)
cargo install cargo-audit      # audit dependencies for security vulnerabilities
cargo install cargo-outdated   # show outdated dependencies
cargo install cargo-expand     # show macro expansion
cargo install cargo-flamegraph # CPU flamegraphs
cargo install cargo-bloat      # what's taking up space in the binary
cargo install cargo-deny       # policy checks (licences, bans, advisories)
cargo install tokio-console    # real-time async task debugger
cargo install sqlx-cli         # SQLx database migrations CLI
cargo install wasm-pack        # build WASM + npm packages
cargo install cross            # cross-compilation made easy
```

---

## Essential Crate Reference

| Category | Crate | What it does |
|---|---|---|
| **Async runtime** | tokio | The standard async runtime |
| **HTTP client** | reqwest | Ergonomic async HTTP client |
| **HTTP server** | axum | Tokio-native web framework |
| **Serialisation** | serde + serde_json | JSON/YAML/TOML/binary |
| **Error handling** | anyhow, thiserror | App errors, library errors |
| **CLI parsing** | clap | Argument parsing with derive |
| **Logging** | tracing, tracing-subscriber | Structured async-aware logging |
| **Database** | sqlx | Async SQL with compile-time checks |
| **ORM** | diesel, sea-orm | Full ORMs (diesel = sync, sea-orm = async) |
| **Config** | config, dotenv | Config files + .env |
| **Regex** | regex | Regular expressions |
| **Date/time** | chrono, time | Date and time handling |
| **UUID** | uuid | UUID generation and parsing |
| **Crypto** | ring, rustls | Cryptography, TLS |
| **Compression** | flate2, zstd | gzip, zstd compression |
| **Parallel** | rayon | Data parallelism |
| **Random** | rand | Random number generation |
| **Itertools** | itertools | Extra iterator adapters |
| **Mocking** | mockall | Mock objects for testing |
| **Benchmark** | criterion | Statistical benchmarking |
| **WASM** | wasm-bindgen, web-sys | Rust ↔ JS interop |
| **Embedded** | embassy, rtic | Async embedded framework |
| **gRPC** | tonic | gRPC client and server |
| **GraphQL** | async-graphql | GraphQL server |
| **WebSocket** | tokio-tungstenite | WebSocket client/server |
| **Cache** | moka | Async concurrent cache |
| **JSON Schema** | schemars | Generate JSON Schema from types |

---

---

## Tips

- `cargo watch -x check` during development — instant feedback on every file save without a full build.
- `cargo audit` in CI — checks all dependencies against the RustSec advisory database for known vulnerabilities.
- `[profile.dev.package."*"] opt-level = 2` in Cargo.toml — compile your deps optimised even in dev mode. Dramatically speeds up serde, regex, and similar CPU-heavy deps.
- `cargo doc --open` is your offline reference — the standard library docs are excellent and available without internet.
- Pin your Rust toolchain version in CI with a `rust-toolchain.toml` file — ensures reproducible builds.

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.75.0"          # or "stable", "nightly"
components = ["rustfmt", "clippy"]
targets = ["wasm32-unknown-unknown"]
```

---

## Summary — Book Ch 14

- `rustup` manages toolchains, components, and targets — always install Rust via `rustup`, never a system package manager.
- `cargo` is the build tool, test runner, doc generator, and package manager — one tool for everything.
- `cargo clippy` catches hundreds of bugs and style issues beyond what the compiler reports — always run it.
- `cargo fmt` enforces a single consistent code style — no debates, just run it.
- `criterion` for benchmarks, `flamegraph` for profiling, `cargo-audit` for security — each is one `cargo install` away.
- Essential crates: `tokio` (async), `serde` (serialisation), `axum` (web), `clap` (CLI), `anyhow`/`thiserror` (errors), `sqlx` (database), `tracing` (logging).
