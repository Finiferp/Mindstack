---
title: "Go Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# Go — Overview

Go (Golang) is a statically typed, compiled language designed at Google for simplicity, fast compilation, and built-in concurrency. It powers a huge share of modern cloud infrastructure — Docker, Kubernetes, Terraform, and Prometheus are all written in Go.

This is a condensed but complete reference — every page covers its topic in full depth, not just the basics.

---

## Official Resources

| Resource | Link |
|---|---|
| Go Docs | [go.dev/doc](https://go.dev/doc/) |
| Go Tour (interactive) | [go.dev/tour](https://go.dev/tour/) |
| Go by Example | [gobyexample.com](https://gobyexample.com) |
| Standard Library Docs | [pkg.go.dev/std](https://pkg.go.dev/std) |
| Effective Go | [go.dev/doc/effective_go](https://go.dev/doc/effective_go) |
| Echo Framework Docs | [echo.labstack.com](https://echo.labstack.com) |
| Echo GitHub | [github.com/labstack/echo](https://github.com/labstack/echo) |

---

## Why Go

```
Fast compilation                — entire projects compile in seconds
Fast execution                  — compiles to native machine code, no VM/interpreter
Static typing                   — errors caught at compile time
Built-in concurrency            — goroutines and channels, not bolted-on libraries
Simple language                 — small spec, few keywords, easy to read others' code
Garbage collected               — no manual memory management
Single binary output            — no runtime/dependencies to install on target
Excellent standard library      — HTTP servers, JSON, crypto all built in
```

---

## Where Go Is Used

```
Cloud infrastructure:         Docker, Kubernetes, containerd, etcd
Infrastructure as Code:       Terraform, Consul, Vault, Nomad (all HashiCorp)
Observability:                Prometheus, Grafana Loki, Jaeger
Networking:                   Caddy web server, gRPC
Backend APIs:                 huge share of modern Go usage — REST/gRPC services
CLI tools:                    Hugo (static site generator), GitHub CLI, Cobra-based tools
Databases:                    CockroachDB, InfluxDB, TiDB
```

---

## Installation

```bash
# Download from go.dev/dl, or via package manager
brew install go                 # macOS
sudo apt install golang-go      # Ubuntu/Debian (often outdated — prefer go.dev/dl)

go version                      # verify installation

# Environment
go env GOPATH                   # workspace location (legacy, less relevant with modules)
go env GOROOT                   # Go installation location
```

---

## Hello, World

```go
// main.go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

```bash
go run main.go         # compile and run immediately
go build main.go       # compile to a binary
./main                 # run the binary
```

## The Go Philosophy

```
"Less is more" — Go deliberately omits features other languages have:
  No inheritance (composition via embedding instead)
  No generics until 1.18 (deliberately delayed until the design was right)
  No exceptions (explicit error return values instead)
  No implicit type conversions (must be explicit, always)
  Only one way to format code (gofmt — no style debates)
  No unused variables or imports allowed (compiler error, not a warning)

This isn't limitation for its own sake — it's a deliberate bet that a
smaller, more explicit language produces more maintainable code at
scale, especially across large teams and long-lived codebases.
```

---

## Tips

- Always run `gofmt` (or let your editor do it on save) — Go has exactly one blessed code style, and the tooling enforces it automatically.
- Unused imports and unused local variables are compile errors in Go, not warnings — this is deliberate and keeps codebases clean.
- `go doc <package>` gives you documentation for any standard library or installed package directly in the terminal.
- Go's error handling (explicit `if err != nil` checks) feels verbose coming from exception-based languages — it becomes natural quickly and makes control flow fully explicit.
