---
title: "Rust Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# Rust — Overview

Rust is a systems programming language focused on three goals: **performance**, **reliability**, and **productivity**. It achieves memory safety without a garbage collector through a compile-time ownership system.

This site is a **condensed reference** — the most important syntax, patterns, and idioms on one page per topic. When you need depth, use the official resources below.

---

## Official Resources — Go Here for Depth

| Resource | What it covers | Link |
|---|---|---|
| **The Rust Book** | The canonical learning resource — read this end to end at least once | [doc.rust-lang.org/book](https://doc.rust-lang.org/book) |
| **Rust by Example** | Same concepts shown as runnable code examples | [doc.rust-lang.org/rust-by-example](https://doc.rust-lang.org/rust-by-example) |
| **The Rust Reference** | Precise language specification — search with `S` key | [doc.rust-lang.org/reference](https://doc.rust-lang.org/reference) |
| **std docs** | Full standard library API docs | [doc.rust-lang.org/std](https://doc.rust-lang.org/std) |
| **Rustonomicon** | Unsafe Rust — the dark arts | [doc.rust-lang.org/nomicon](https://doc.rust-lang.org/nomicon) |
| **Async Book** | Async/await in depth | [rust-lang.github.io/async-book](https://rust-lang.github.io/async-book) |
| **Rustlings** | Interactive exercises — best way to practice | [github.com/rust-lang/rustlings](https://github.com/rust-lang/rustlings) |
| **crates.io** | Package registry | [crates.io](https://crates.io) |
| **docs.rs** | Auto-generated docs for every crate | [docs.rs](https://docs.rs) |

**How to look something up fast:**
- Rust Book: `Ctrl+F` on [doc.rust-lang.org/book](https://doc.rust-lang.org/book) or use the left sidebar
- Reference: press `S` to search on [doc.rust-lang.org/reference](https://doc.rust-lang.org/reference)
- `rustup doc --book` — opens the book offline in your browser
- `rustup doc --std` — opens std docs offline

---

## The Book Chapter Map (what to read for each topic)

| Topic | Book Chapter |
|---|---|
| Installation, Hello World, Cargo | Ch 1 |
| Variables, types, functions, control flow | Ch 3 |
| Ownership, borrowing, slices | Ch 4 |
| Structs, methods | Ch 5 |
| Enums, Option, match | Ch 6 |
| Modules, packages, crates | Ch 7 |
| Vec, String, HashMap | Ch 8 |
| Error handling, Result, ? | Ch 9 |
| Generics, traits, lifetimes | Ch 10 |
| Testing | Ch 11 |
| CLI project (grep clone) | Ch 12 |
| Closures, iterators | Ch 13 |
| Cargo, crates.io | Ch 14 |
| Smart pointers (Box, Rc, RefCell) | Ch 15 |
| Concurrency, threads, channels | Ch 16 |
| Async/await | Ch 17 |
| OOP patterns, trait objects | Ch 18 |
| Pattern matching deep dive | Ch 19 |
| Unsafe, macros, advanced traits | Ch 20 |

---

## Why Rust

```
No GC — memory freed deterministically when the owner goes out of scope
No data races — the borrow checker prevents them at compile time
No null — Option<T> forces you to handle the missing case
No exceptions — Result<T, E> forces you to handle errors
Zero-cost abstractions — high-level code compiles to the same machine code as C
```

---

## Where Rust Is Used

```
Linux kernel (drivers since 6.1)       Cloudflare (networking stack)
Android (low-level components)         AWS Firecracker (Lambda/Fargate VMM)
Windows kernel components              Discord (backend, replacing Go)
ripgrep, fd, bat, eza (CLI tools)      Deno, SWC (Next.js compiler)
Figma rendering engine                 WebAssembly (fastest language for WASM)
```
---
## Tips

- Read compiler errors fully — Rust's errors are exceptional; they often include the exact fix.
- `cargo clippy` before every commit — catches hundreds of issues the compiler doesn't.
- `rustup doc --book` anytime you need depth on a topic — the book is offline and always current.
- Don't add `clone()` everywhere to silence borrow checker errors — restructure instead; clone hides the real problem.
