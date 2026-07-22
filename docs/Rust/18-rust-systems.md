---
title: "Systems Programming — Unsafe, FFI, no_std"
sidebar_label: "Systems / Unsafe"
sidebar_position: 18
---

# Systems Programming — Unsafe, FFI, no\_std

Rust's safe subset handles most use cases. This page covers when and how to use `unsafe`, calling C from Rust (FFI), and writing code without the standard library for embedded targets.

**Book:** Chapter 20 — [doc.rust-lang.org/book/ch20-01-unsafe-rust.html](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html)
**Rustonomicon** (unsafe deep dive): [doc.rust-lang.org/nomicon](https://doc.rust-lang.org/nomicon)

---

## When to Use unsafe

```
'unsafe' does NOT turn off the borrow checker or type system.
It unlocks five specific capabilities that the compiler cannot verify:

1. Dereference a raw pointer
2. Call an unsafe function or method
3. Implement an unsafe trait
4. Access or modify a mutable static variable
5. Access fields of unions

Use unsafe when:
  - Calling C libraries (FFI)
  - Building safe abstractions over low-level primitives (e.g. Vec, Arc)
  - Performance-critical inner loops where bounds checking is proven unnecessary
  - Embedded/OS programming with direct hardware access

Golden rule: minimise the unsafe surface; wrap it in a safe API immediately.
```

---

## Raw Pointers

```rust
fn main() {
    let mut x = 5;

    // Creating raw pointers (safe — just creating a pointer, not dereferencing)
    let r1 = &x as *const i32;      // *const T — immutable raw pointer
    let r2 = &mut x as *mut i32;    // *mut T — mutable raw pointer

    // Dereferencing raw pointers requires unsafe
    unsafe {
        println!("r1: {}", *r1);
        *r2 = 10;
        println!("r2: {}", *r2);
    }

    // Raw pointer from a Box (common for FFI)
    let boxed = Box::new(42i32);
    let raw: *mut i32 = Box::into_raw(boxed);  // leak the box, get raw pointer
    unsafe {
        println!("{}", *raw);
        drop(Box::from_raw(raw));  // must reclaim to free — or you'll leak memory
    }

    // Offset a raw pointer (like pointer arithmetic in C)
    let arr = [1i32, 2, 3, 4, 5];
    let ptr = arr.as_ptr();
    unsafe {
        println!("{}", *ptr.add(2));  // arr[2] = 3
    }

    // Null check before dereferencing
    let maybe_null: *const i32 = std::ptr::null();
    if !maybe_null.is_null() {
        unsafe { println!("{}", *maybe_null); }
    }
}
```

---

## Unsafe Functions

```rust
// Declare a function as unsafe — callers must use 'unsafe' block
unsafe fn dangerous_operation(ptr: *mut i32, len: usize) {
    for i in 0..len {
        *ptr.add(i) = i as i32;
    }
}

fn main() {
    let mut data = vec![0i32; 5];
    unsafe {
        dangerous_operation(data.as_mut_ptr(), data.len());
    }
    println!("{:?}", data);  // [0, 1, 2, 3, 4]
}

// Safe wrapper — unsafe inside, safe outside
fn fill_slice(slice: &mut [i32]) {
    // We know the pointer + length come from a valid slice — safe to use unsafe here
    unsafe {
        dangerous_operation(slice.as_mut_ptr(), slice.len());
    }
}

// std::slice::from_raw_parts — create a slice from a pointer (common pattern)
fn read_c_array(ptr: *const i32, len: usize) -> &'static [i32] {
    unsafe {
        std::slice::from_raw_parts(ptr, len)
        // SAFETY: caller must ensure ptr is valid, len is correct, data lives long enough
    }
}
```

---

## FFI — Calling C from Rust

```rust
// Link to a C library and call its functions
use std::ffi::{CStr, CString, c_char, c_int, c_double};

// Declare external C functions
extern "C" {
    fn abs(x: c_int) -> c_int;
    fn sqrt(x: c_double) -> c_double;
    fn strlen(s: *const c_char) -> usize;
    fn printf(format: *const c_char, ...) -> c_int;
}

fn main() {
    unsafe {
        println!("abs(-5) = {}", abs(-5));
        println!("sqrt(4.0) = {}", sqrt(4.0));
    }
}

// String conversion between Rust and C
fn rust_to_c_string() {
    let rust_str = "Hello from Rust";

    // Rust String → C string (null-terminated)
    let c_str = CString::new(rust_str).unwrap();
    let ptr: *const c_char = c_str.as_ptr();

    // Pointer is valid as long as c_str is alive
    unsafe {
        let len = strlen(ptr);
        println!("C strlen: {len}");
    }
    // c_str dropped here — ptr becomes dangling! Don't store ptr past this point.
}

fn c_to_rust_string(ptr: *const c_char) -> &'static str {
    unsafe {
        CStr::from_ptr(ptr)
            .to_str()
            .expect("invalid UTF-8 from C")
    }
}

// Linking to a specific C library
// In build.rs or:
// #[link(name = "m")]          // links libm (math library)
// extern "C" { fn sin(x: f64) -> f64; }

// Or use the cc crate in build.rs to compile C code alongside Rust:
// (build.rs)
// fn main() {
//     cc::Build::new().file("src/helper.c").compile("helper");
// }
```

---

## Exposing Rust to C (C-compatible API)

```rust
// Mark functions with extern "C" and #[no_mangle] to export them

#[no_mangle]                   // prevent name mangling — keep the exact function name
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[no_mangle]
pub extern "C" fn create_string() -> *mut std::ffi::c_char {
    let s = std::ffi::CString::new("Hello from Rust!").unwrap();
    s.into_raw()   // caller owns the pointer — must call free_string() to free it
}

#[no_mangle]
pub extern "C" fn free_string(ptr: *mut std::ffi::c_char) {
    if !ptr.is_null() {
        unsafe { drop(std::ffi::CString::from_raw(ptr)); }
    }
}

// Cargo.toml: build as a C-compatible shared/static library
// [lib]
// crate-type = ["cdylib"]    # dynamic library (.so / .dll)
// crate-type = ["staticlib"] # static library (.a)
```

---

## Unsafe Traits

```rust
// Some traits are 'unsafe' to implement because the compiler cannot verify correctness
// Send and Sync are the most important:

struct MyType {
    ptr: *mut u8,   // raw pointer — compiler won't auto-impl Send/Sync
}

// We manually assert it's safe to send across threads
// SAFETY: MyType owns the pointer exclusively; no aliasing
unsafe impl Send for MyType {}
unsafe impl Sync for MyType {}

// GlobalAlloc — implementing a custom memory allocator
use std::alloc::{GlobalAlloc, Layout, System};

struct LoggingAllocator;

unsafe impl GlobalAlloc for LoggingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = System.alloc(layout);
        eprintln!("alloc: {} bytes at {:?}", layout.size(), ptr);
        ptr
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        eprintln!("dealloc: {} bytes at {:?}", layout.size(), ptr);
        System.dealloc(ptr, layout);
    }
}

#[global_allocator]
static ALLOCATOR: LoggingAllocator = LoggingAllocator;
```

---

## no\_std — Embedded and Bare Metal

```rust
// no_std: don't link the standard library
// Use for: microcontrollers, OS kernels, WASM, bootloaders

#![no_std]          // don't use std
#![no_main]         // don't use the default main

// You lose: Vec, String, HashMap, File, threads, println! with full formatting
// You keep: core library — Option, Result, Iterator, primitive types, unsafe

// Panic handler is required (std provides one; now you must)
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}   // hang forever; or reset the microcontroller
}

// Entry point for embedded (using cortex-m-rt for ARM)
use cortex_m_rt::entry;

#[entry]
fn main() -> ! {
    // Hardware initialisation
    loop {
        // Main loop
    }
}

// alloc crate — provides Vec, String, Box etc. without std (needs a custom allocator)
extern crate alloc;
use alloc::vec::Vec;
use alloc::string::String;
use alloc::boxed::Box;

// With embassy (async embedded framework):
#[embassy_executor::task]
async fn blink_led() {
    loop {
        // toggle LED
        embassy_time::Timer::after_millis(500).await;
    }
}
```

---

## Mutable Statics

```rust
// Mutable global state — requires unsafe to read/write
static mut COUNTER: u32 = 0;

fn increment() {
    unsafe {
        COUNTER += 1;   // data race if called from multiple threads!
    }
}

// Better: use atomic types — no unsafe needed
use std::sync::atomic::{AtomicU32, Ordering};
static COUNTER: AtomicU32 = AtomicU32::new(0);

fn safe_increment() {
    COUNTER.fetch_add(1, Ordering::SeqCst);  // thread-safe, no unsafe
}

// Or once_cell for lazy initialisation of complex statics:
use std::sync::OnceLock;
static CONFIG: OnceLock<String> = OnceLock::new();

fn get_config() -> &'static str {
    CONFIG.get_or_init(|| std::env::var("CONFIG").unwrap_or_default())
}
```

---

## Tips

- Always add a `// SAFETY:` comment above every `unsafe` block explaining why it's sound — this is both documentation and a forcing function to think it through.
- The `# Safety` section in doc comments for unsafe functions is convention — document the invariants callers must uphold.
- `bindgen` auto-generates Rust FFI bindings from C headers — don't write them by hand for large C APIs.
- For embedded, `embassy` is the modern async embedded framework; `RTIC` is the interrupt-based alternative — both are production-quality.
- `miri` (run with `cargo +nightly miri test`) is an interpreter that detects undefined behaviour in unsafe code — run it on your unsafe blocks.

---

## Summary — Book Ch 20, Rustonomicon

- `unsafe` unlocks five capabilities: raw pointer deref, unsafe function calls, unsafe trait impls, mutable statics, union field access.
- Wrap every `unsafe` block in a safe API as quickly as possible — keep unsafe surfaces minimal and well-documented.
- FFI: `extern "C"` to declare C functions; `CString`/`CStr` for string conversion; `#[no_mangle] pub extern "C" fn` to export Rust to C.
- Unsafe traits: `Send`/`Sync` can be manually implemented when the compiler won't auto-derive them (e.g. structs with raw pointers).
- `no_std`: remove the standard library for embedded/bare-metal; keep `core`; add `alloc` if you need heap allocation with a custom allocator.
- Use `AtomicU32`/`OnceLock` instead of `static mut` — they're safe and thread-correct.
