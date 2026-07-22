---
title: "Modules, Crates, and Packages"
sidebar_label: "Modules & Crates"
sidebar_position: 12
---

# Modules, Crates, and Packages

Rust's module system controls code organisation and visibility. Understanding it is essential for writing anything beyond a single file.

**Book:** Chapter 7 — [doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html)

---

## Key Terms

```
Package   — a Cargo project; contains one or more crates
Crate     — a compilation unit; either a binary (has main) or a library (has lib.rs)
Module    — a namespace inside a crate; defined with 'mod'
Path      — how you refer to an item: crate::module::item
```

---

## Modules in a Single File

```rust
// src/main.rs
mod garden {            // define a module
    pub mod vegetables {   // pub = visible outside the module
        pub struct Carrot {
            pub name: String,   // pub fields must be explicit
            weight: f32,        // private field
        }

        impl Carrot {
            pub fn new(name: &str) -> Self {
                Carrot { name: name.to_string(), weight: 0.1 }
            }
            pub fn weight(&self) -> f32 { self.weight }  // getter for private field
        }

        pub fn harvest() -> String {
            String::from("harvested!")
        }
    }
}

// Paths to access items
use garden::vegetables::Carrot;        // bring into scope
use garden::vegetables::harvest;

fn main() {
    let c = Carrot::new("Nantes");
    println!("{}: {}kg", c.name, c.weight());

    // or use full path:
    let _ = garden::vegetables::harvest();
}
```

---

## Modules in Separate Files

```
src/
├── main.rs          ← declares 'mod garden;'
├── garden.rs        ← defines the garden module
└── garden/
    └── vegetables.rs ← defines garden::vegetables
```

```rust
// src/main.rs
mod garden;                        // tells compiler to load src/garden.rs
use garden::vegetables::Carrot;

fn main() {
    let c = Carrot::new("Nantes");
    println!("{}", c.name);
}

// src/garden.rs
pub mod vegetables;                // tells compiler to load src/garden/vegetables.rs

// src/garden/vegetables.rs
pub struct Carrot {
    pub name: String,
}
impl Carrot {
    pub fn new(name: &str) -> Self { Carrot { name: name.to_string() } }
}
```

---

## Visibility Rules

```rust
mod outer {
    // private by default — only visible within 'outer' and its children
    fn private_fn() {}

    // pub — visible anywhere
    pub fn public_fn() {}

    // pub(crate) — visible anywhere in this crate, not external crates
    pub(crate) fn crate_fn() {}

    // pub(super) — visible to parent module only
    pub(super) fn super_fn() {}

    mod inner {
        pub fn inner_fn() {
            super::private_fn();   // 'super' = parent module
            super::public_fn();
        }
    }
}

// Struct fields are private by default even if the struct is pub
pub struct Config {
    pub host: String,    // accessible from outside
    port: u16,           // NOT accessible from outside; use a getter
}

// Enum variants are all public if the enum is pub
pub enum Status { Active, Inactive }  // both variants are pub
```

---

## use — Bringing Items into Scope

```rust
// Standard library imports
use std::collections::HashMap;
use std::io::{self, Read, Write};   // multiple from same module
use std::fmt::{self, Display, Formatter};

// External crate (declared in Cargo.toml)
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

// Wildcard (use sparingly — pollutes namespace)
use std::collections::*;

// Nested paths
use std::{
    collections::HashMap,
    io::{self, BufRead},
    fmt::Display,
};

// Aliasing
use std::collections::HashMap as Map;
use std::io::Result as IoResult;

// Re-export — make an item part of your public API
pub use crate::utils::format_date;  // callers can use your_crate::format_date

// Idiomatic use patterns:
// Functions: bring in the parent module, call as module::function()
use std::io;
io::stdin().read_line(&mut buf)?;

// Types/structs/enums: bring in directly
use std::collections::HashMap;
let mut map = HashMap::new();
```

---

## Crate Structure — Library vs Binary

```
# Library crate (for others to use as a dependency)
src/lib.rs       ← crate root; everything pub here is the public API

# Binary crate (produces an executable)
src/main.rs      ← crate root; calls library code

# Both in one package (most common for applications)
src/
├── lib.rs       ← library crate
└── main.rs      ← binary crate (uses the library with 'use my_crate::...')

# Multiple binaries
src/
├── lib.rs
└── bin/
    ├── server.rs    ← 'cargo run --bin server'
    └── client.rs    ← 'cargo run --bin client'
```

```rust
// src/lib.rs — your library's public API
pub mod config;
pub mod db;
pub mod handlers;

pub use config::Config;      // re-export for convenience

// src/main.rs — binary that uses the library
use my_app::Config;          // my_app = package name in Cargo.toml
```

---

## Workspaces — Multiple Crates in One Repo

```toml
# Root Cargo.toml (workspace root — no [package] section)
[workspace]
members = [
    "crates/core",
    "crates/server",
    "crates/cli",
]

# crates/core/Cargo.toml
[package]
name = "my-core"
version = "0.1.0"
edition = "2021"

# crates/server/Cargo.toml
[package]
name = "my-server"
version = "0.1.0"

[dependencies]
my-core = { path = "../core" }
```

```bash
# Run from workspace root
cargo build --workspace      # build all
cargo test --workspace       # test all
cargo run -p my-server       # run specific package
```

---

## Cargo.toml — Dependency Specification

```toml
[dependencies]
# From crates.io
serde = "1"                              # any 1.x.y (^1.0.0)
serde = "1.0"                           # any 1.0.x
serde = "=1.0.100"                      # exact version
serde = ">=1, <2"                       # range

# With features
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

# Optional dependency (for optional feature of your crate)
csv = { version = "1", optional = true }

# From git
my-lib = { git = "https://github.com/user/my-lib" }
my-lib = { git = "https://github.com/user/my-lib", branch = "main" }
my-lib = { git = "https://github.com/user/my-lib", tag = "v1.0.0" }

# Local path
my-lib = { path = "../my-lib" }

[dev-dependencies]
# Only for tests and benchmarks
mockall = "0.12"
criterion = "0.5"

[build-dependencies]
# Only for build.rs
cc = "1"

[features]
default = ["json"]
json = ["serde/derive", "serde_json"]
csv = ["dep:csv"]

# Compile with: cargo build --features "csv"
# In code: #[cfg(feature = "csv")] fn ...
```

---

## Common Cargo Commands

```bash
cargo new my-app              # new binary project
cargo new my-lib --lib        # new library project
cargo build                   # debug build
cargo build --release         # optimised build
cargo run                     # build and run
cargo run -- arg1 arg2        # pass arguments
cargo test                    # run all tests
cargo test test_name          # run specific test
cargo check                   # type-check without building (fast)
cargo clippy                  # linter
cargo fmt                     # auto-format
cargo doc --open              # generate and open docs
cargo add serde               # add dependency (cargo-edit)
cargo add serde --features derive
cargo update                  # update dependencies to latest compatible
cargo tree                    # dependency tree
cargo publish                 # publish to crates.io
cargo install cargo-edit      # install cargo tools
cargo bench                   # run benchmarks
```

---

## Tips

- `pub(crate)` is under-used — most internal APIs should use it instead of `pub` to avoid accidentally exposing implementation details.
- Re-export with `pub use` in `lib.rs` to flatten your API — callers write `my_crate::Config` instead of `my_crate::config::Config`.
- Use workspaces for any project with multiple related crates — shared `Cargo.lock`, unified build, easy local cross-references.
- `cargo check` is much faster than `cargo build` for catching type errors during development — run it constantly.

---

## Summary — Book Ch 7, 14

- **Package**: one Cargo project; **Crate**: one compilation unit (binary or library); **Module**: namespace via `mod`.
- Module tree mirrors the file system: `mod foo;` loads `src/foo.rs` or `src/foo/mod.rs`.
- Everything is private by default; `pub` makes it visible outside; `pub(crate)` restricts to the current crate.
- `use` brings items into scope; `pub use` re-exports them as part of your API.
- `Cargo.toml` specifies dependencies with semver; features control optional compilation.
- Workspaces group multiple crates with a shared `Cargo.lock` — use for monorepos.
