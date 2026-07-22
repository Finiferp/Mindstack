---
title: "WebAssembly with Rust"
sidebar_label: "WebAssembly"
sidebar_position: 19
---

# WebAssembly with Rust

Rust is the premier language for WebAssembly — it produces small, fast WASM modules with no garbage collector overhead. Used by Figma, Cloudflare Workers, and many high-performance web apps.

**Docs:** [rustwasm.github.io/docs/book](https://rustwasm.github.io/docs/book) | [wasm-bindgen docs](https://rustwasm.github.io/docs/wasm-bindgen)

---

## How Rust + WASM Works

```
Rust source
    │
    ▼ rustc (target: wasm32-unknown-unknown)
.wasm binary     ← compact bytecode; runs in browser sandbox
    │
    ▼ wasm-bindgen
JavaScript glue  ← auto-generated JS that bridges Rust types ↔ JS types
    │
    ▼ wasm-pack
npm package      ← publishable; importable in any JS project
```

---

## Setup

```bash
# Install the WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack (builds + packages)
cargo install wasm-pack

# Create a new WASM library
wasm-pack new my-wasm-lib
# or manually:
cargo new --lib my-wasm-lib
cd my-wasm-lib
```

```toml
# Cargo.toml
[package]
name = "my-wasm-lib"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]   # C dynamic library — required for WASM

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"            # JS standard library bindings
web-sys = { version = "0.3", features = ["Window", "Document", "Element", "HtmlElement", "console"] }
getrandom = { version = "0.2", features = ["js"] }  # if you need random numbers in WASM
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"  # convert Rust types to/from JS values

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

---

## Basic WASM Bindings

```rust
use wasm_bindgen::prelude::*;

// Export a Rust function to JavaScript
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// Export a struct with methods
#[wasm_bindgen]
pub struct Counter {
    value: i32,
}

#[wasm_bindgen]
impl Counter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Counter {
        Counter { value: 0 }
    }

    pub fn increment(&mut self) {
        self.value += 1;
    }

    pub fn decrement(&mut self) {
        self.value -= 1;
    }

    pub fn value(&self) -> i32 {
        self.value
    }

    pub fn reset(&mut self) {
        self.value = 0;
    }
}

// Import JavaScript functions into Rust
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);

    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(n: u32);

    #[wasm_bindgen(js_namespace = Math)]
    fn random() -> f64;
}

// Convenience macro for console.log
macro_rules! console_log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

#[wasm_bindgen]
pub fn do_something() {
    console_log!("Hello from Rust in the browser!");
    alert("Hello from Rust!");
    let r = unsafe { random() };
    console_log!("Random: {}", r);
}
```

---

## Working with the DOM (web-sys)

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{window, Document, HtmlElement, HtmlButtonElement, MouseEvent};

#[wasm_bindgen]
pub fn setup_counter_ui() -> Result<(), JsValue> {
    let window = window().ok_or("no window")?;
    let document = window.document().ok_or("no document")?;

    // Get DOM element
    let count_display = document
        .get_element_by_id("count")
        .ok_or("no #count element")?
        .dyn_into::<HtmlElement>()?;   // cast to specific type

    // Create a button
    let button = document
        .create_element("button")?
        .dyn_into::<HtmlButtonElement>()?;
    button.set_inner_text("Click me!");

    // Add event listener using a Closure
    let count_display_clone = count_display.clone();
    let mut count = 0i32;

    let closure = Closure::<dyn FnMut(MouseEvent)>::new(move |_event: MouseEvent| {
        count += 1;
        count_display_clone.set_inner_text(&count.to_string());
    });

    button.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;

    // Leak the closure — it must live as long as the button
    // (manage this carefully in production; use Rc<RefCell<>> patterns)
    closure.forget();

    document.body().ok_or("no body")?.append_child(&button)?;

    Ok(())
}

#[wasm_bindgen(start)]   // runs automatically when WASM module loads
pub fn main() {
    // Set up panic hook for better error messages in browser console
    console_error_panic_hook::set_once();

    web_sys::console::log_1(&"WASM loaded!".into());
    setup_counter_ui().unwrap_or_else(|e| {
        web_sys::console::error_1(&e);
    });
}
```

---

## Passing Complex Types Between Rust and JS

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};

// Serde types can cross the boundary as JS objects
#[derive(Serialize, Deserialize, Debug)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BoundingBox {
    pub min: Point,
    pub max: Point,
    pub area: f64,
}

#[wasm_bindgen]
pub fn compute_bounding_box(points: JsValue) -> Result<JsValue, JsValue> {
    let points: Vec<Point> = from_value(points)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    if points.is_empty() {
        return Err(JsValue::from_str("no points provided"));
    }

    let min_x = points.iter().map(|p| p.x).fold(f64::INFINITY, f64::min);
    let min_y = points.iter().map(|p| p.y).fold(f64::INFINITY, f64::min);
    let max_x = points.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
    let max_y = points.iter().map(|p| p.y).fold(f64::NEG_INFINITY, f64::max);

    let bbox = BoundingBox {
        min: Point { x: min_x, y: min_y },
        max: Point { x: max_x, y: max_y },
        area: (max_x - min_x) * (max_y - min_y),
    };

    to_value(&bbox).map_err(|e| JsValue::from_str(&e.to_string()))
}
```

```javascript
// JavaScript usage:
import init, { add, Counter, compute_bounding_box } from './pkg/my_wasm_lib.js';

await init();   // load and instantiate the WASM module

console.log(add(3, 4));  // 7

const counter = new Counter();
counter.increment();
counter.increment();
console.log(counter.value());  // 2

const points = [{ x: 1.0, y: 2.0 }, { x: 4.0, y: 6.0 }, { x: -1.0, y: 0.0 }];
const bbox = compute_bounding_box(points);
console.log(bbox);  // { min: {x: -1, y: 0}, max: {x: 4, y: 6}, area: 30 }
```

---

## Building and Packaging

```bash
# Build for the browser (ES modules)
wasm-pack build --target web

# Build for bundlers (webpack, vite, etc.)
wasm-pack build --target bundler

# Build for Node.js
wasm-pack build --target nodejs

# Output: pkg/
# ├── my_wasm_lib.js         ← JS glue code
# ├── my_wasm_lib.d.ts       ← TypeScript types
# ├── my_wasm_lib_bg.wasm    ← the actual WASM binary
# └── package.json

# Optimise WASM binary size
cargo install wasm-opt
wasm-opt -Oz pkg/my_wasm_lib_bg.wasm -o pkg/my_wasm_lib_bg.wasm

# Typical sizes:
# Debug build:   1-5 MB
# Release build: 100-500 KB
# After wasm-opt: 50-300 KB
```

---

## Using in a Web Project (Vite + React example)

```bash
# In your web project
npm install ../my-wasm-lib/pkg   # local package
# or after publishing: npm install my-wasm-lib
```

```typescript
// src/App.tsx
import { useState, useEffect } from 'react';

// Lazy-load the WASM module
const wasmPromise = import('my-wasm-lib');

function App() {
    const [result, setResult] = useState<number>(0);

    useEffect(() => {
        wasmPromise.then(({ add }) => {
            setResult(add(21, 21));
        });
    }, []);

    return <div>Rust says: {result}</div>;
}
```

```javascript
// vite.config.js — enable WASM support
import { defineConfig } from 'vite';
export default defineConfig({
    server: { fs: { strict: false } },   // allow loading from pkg/
});
// Note: Vite supports WASM natively via ?init query parameter or @vitejs/plugin-wasm
```

---

## Cloudflare Workers with Rust

```bash
cargo install worker-build
cargo generate cloudflare/workers-rs --name my-worker
```

```rust
use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let router = Router::new();

    router
        .get("/", |_, _| Response::ok("Hello from Rust on Cloudflare!"))
        .get_async("/api/data", |_req, ctx| async move {
            let kv = ctx.kv("MY_KV")?;
            let value = kv.get("my-key").text().await?.unwrap_or_default();
            Response::ok(value)
        })
        .run(req, env)
        .await
}
```

---

## Testing WASM

```rust
use wasm_bindgen_test::*;

// Run in browser: wasm-pack test --headless --chrome
// Run in Node.js: wasm-pack test --node
wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_add() {
    assert_eq!(add(2, 3), 5);
}

#[wasm_bindgen_test]
async fn test_async() {
    let result = fetch_something().await;
    assert!(result.is_ok());
}
```

---

## Tips

- Set up `console_error_panic_hook` on startup — without it, Rust panics in WASM show as "unreachable" in the browser with no context.
- Use `wasm-opt -Oz` after every release build — it typically shrinks the binary by 30-50% with no code changes.
- For hot module reload during development, use `wasm-pack build --dev` and serve from a bundler (Vite, webpack) that understands WASM.
- The `Closure::forget()` pattern leaks memory intentionally for event handlers — use `Rc<RefCell<Option<Closure<...>>>>` for properly managed closures.
- `serde-wasm-bindgen` is cleaner than `JsValue` for passing structured data — define Rust structs with `#[derive(Serialize, Deserialize)]` and let serde handle the conversion.

---

## Summary

- Rust compiles to WASM via `wasm32-unknown-unknown` target; `wasm-pack` packages the output as an npm module.
- `#[wasm_bindgen]` exports Rust functions/structs to JS; `extern "C" {}` with `#[wasm_bindgen]` imports JS functions into Rust.
- `web-sys` provides Rust bindings to all browser APIs (DOM, fetch, WebGL, WebRTC...); enable only the features you need.
- `serde-wasm-bindgen` converts Rust structs to/from JS objects — the cleanest way to pass complex data across the boundary.
- Build targets: `--target web` (ES modules), `--target bundler` (webpack/Vite), `--target nodejs`.
- After release build: run `wasm-opt -Oz` for significant binary size reduction; use `console_error_panic_hook` for debuggable panics.
