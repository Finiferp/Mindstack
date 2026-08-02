---
title: "Go Tooling"
sidebar_label: "Tooling"
sidebar_position: 16
---

# Go Tooling

Go ships with a comprehensive, batteries-included toolchain — one binary (`go`) handles building, testing, formatting, dependency management, and more. No separate build system needed.

---

## Core Commands

```bash
go run main.go                  # compile and run immediately (no binary left behind)
go build                        # compile to a binary in the current directory
go build -o myapp               # compile to a specifically named binary
go build ./...                  # build all packages in the module
go install                      # build and install into $GOBIN

go test                         # run tests in current package
go test ./...                   # run tests in all packages
go vet                          # static analysis — catches suspicious constructs
go fmt ./...                    # format all files (alias for gofmt -w)
go doc <package>                # view documentation for a package
go doc <package>.<Function>     # view documentation for a specific function
go env                          # show Go environment variables
go version                      # show installed Go version
go clean                        # remove build artifacts/cache
```

---

## gofmt / goimports — Formatting

```bash
gofmt -l .                      # list files that need formatting (doesn't change them)
gofmt -w .                      # format and WRITE changes to files
gofmt -d file.go                # show a diff without applying

# goimports — superset of gofmt, ALSO manages imports (adds missing,
# removes unused, sorts/groups them) — most editors run this on save
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .

# There is deliberately ONE canonical Go formatting style — gofmt's
# output is not configurable (no style debates, no .prettierrc-equivalent)
```

---

## go vet — Static Analysis

```bash
go vet ./...

# Catches real bugs that COMPILE fine but are almost certainly wrong:
#   Printf format string mismatches: fmt.Printf("%d", "hello")
#   Unreachable code
#   Struct tags with syntax errors: `json:"name"extra`
#   Copying a sync.Mutex by value (breaks its locking guarantee)
#   Shadowed variables in some contexts
#   Suspicious comparisons

# go vet is run automatically as part of 'go test' by default — you don't
# need to remember to call it separately in most workflows, but it's
# useful standalone during development too
```

---

## golangci-lint — Aggregated Linting

```bash
# The de facto standard linter aggregator for Go — runs dozens of
# individual linters (staticcheck, errcheck, gosimple, unused, etc.)
# through one fast, parallelized tool

brew install golangci-lint
golangci-lint run
golangci-lint run --fix         # auto-fix what can be auto-fixed

# .golangci.yml — project configuration
linters:
  enable:
    - errcheck          # ensure errors aren't silently ignored
    - gosimple          # suggest simpler code
    - staticcheck       # advanced static analysis
    - unused            # find unused code
    - gofmt             # formatting check
    - goimports         # import formatting check
```

---

## Debugging with delve

```bash
go install github.com/go-delve/delve/cmd/dlv@latest

dlv debug main.go               # compile with debug info, start debugging
dlv test                        # debug a test

# Inside the delve REPL:
(dlv) break main.go:15          # set a breakpoint at line 15
(dlv) break myPackage.MyFunc    # breakpoint at a function
(dlv) continue                  # run until next breakpoint
(dlv) next                      # step over
(dlv) step                      # step into
(dlv) print variableName        # inspect a variable
(dlv) locals                    # show all local variables
(dlv) stack                     # show the call stack

# Most editors (VS Code with the Go extension, GoLand) integrate delve
# directly — you rarely need the CLI REPL day-to-day, but it's essential
# for remote debugging or CI debugging scenarios
```

---

## Profiling with pprof

```go
// Import for HTTP-served profiling endpoints (common in production services)
import _ "net/http/pprof"

func main() {
    go func() {
        http.ListenAndServe("localhost:6060", nil)   // exposes /debug/pprof/
    }()
    // ... rest of your application
}
```

```bash
# CPU profile — capture 30 seconds of CPU activity
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Memory profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Inside the pprof REPL:
(pprof) top                 # top functions by resource usage
(pprof) top -cum            # top functions by CUMULATIVE usage (including callees)
(pprof) list functionName   # source-line-level breakdown for a specific function
(pprof) web                 # open a visual graph (requires Graphviz)

# Profiling in tests/benchmarks directly
go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out
go tool pprof cpu.out
```

---

## Build Constraints and Tags

```go
//go:build linux
// +build linux    (older syntax, still supported, gofmt keeps both in sync)

package mypackage
// This entire file only compiles on Linux — useful for OS-specific code

// Combining constraints
//go:build linux && amd64

//go:build !windows      // NOT windows — compiles everywhere except Windows

// Custom build tags — for feature flags at compile time
//go:build integration

// go test -tags=integration ./...     # only runs files tagged 'integration'
```

---

## Embedding Files (Go 1.16+)

```go
import "embed"

//go:embed templates/*.html
var templateFS embed.FS

//go:embed config.json
var configData []byte

//go:embed static/*
var staticFiles embed.FS

// This compiles the referenced files DIRECTLY into the binary — no
// separate deployment of static assets/templates needed; extremely
// useful for single-binary deployment of web apps (see the Echo pages)
func main() {
    tmpl, _ := template.ParseFS(templateFS, "templates/*.html")
    http.Handle("/static/", http.FileServer(http.FS(staticFiles)))
}
```

---

## Environment Variables That Matter

```bash
go env GOOS GOARCH              # current target OS/architecture
go env GOPATH                   # workspace location (legacy, less relevant with modules)
go env GOMODCACHE               # where downloaded modules are cached
go env GOPROXY                  # module proxy URL (default: proxy.golang.org)
go env GOFLAGS                  # default flags applied to every go command
go env GOPRIVATE                # module path patterns treated as private
                                # (bypasses the public proxy/checksum DB —
                                # essential for internal/company modules)

# Common .zshrc/.bashrc additions
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin:/usr/local/go/bin

# Private module configuration (for internal company repos)
export GOPRIVATE=github.com/mycompany/*
export GONOSUMCHECK=1
```

---

## Common Third-Party Tooling

```bash
air                         # live-reload for Go apps during development
                            # (github.com/cosmtrek/air) — watches files, rebuilds/restarts automatically
go install github.com/cosmtrek/air@latest
air                         # run in project root, auto-restarts on file changes
                            # (essential for Echo/web development — no manual
                             restart-after-every-change cycle)

mockgen                     # generate mocks from interfaces (go.uber.org/mock)
go install go.uber.org/mock/mockgen@latest
mockgen -source=repository.go -destination=mocks/repository_mock.go

sqlc                        # generate type-safe Go code from SQL queries
protoc-gen-go               # generate Go code from Protocol Buffer definitions
                            # (for gRPC services)

goreleaser                  # automate building/releasing binaries for
                            # multiple platforms, changelogs, Docker images
```

---

## Module Proxy and GOPROXY

```
By default, 'go get'/'go mod download' fetch dependencies through
Google's public module proxy (proxy.golang.org) rather than directly
from source repositories — this provides:
  Availability — cached even if the original repo goes offline
  Immutability — a specific version, once fetched, is guaranteed
  identical forever (paired with go.sum's hash verification)
  Speed — often faster than hitting many individual VCS hosts directly

GOPROXY=https://proxy.golang.org,direct         (the default)
GOPROXY=off                                     (disable — only use local cache/vendor)
GOPROXY=direct                                  (bypass the proxy entirely, fetch
                                                   directly from VCS — needed for
                                                   private repos not on the public proxy)
GONOSUMCHECK / GOPRIVATE / GONOSUMDB            (control checksum verification for
                                                   private/internal modules)
```

---

## Tips

- `go vet` runs automatically with `go test` — you get basic static analysis for free on every test run, no extra step needed.
- Install `golangci-lint` on every real project — it aggregates dozens of individual linters and catches issues `go vet` alone misses.
- Use `air` for local development of any HTTP service (especially Echo apps, covered next) — manually stopping/rebuilding/restarting after every code change gets old fast.
- `//go:embed` (Go 1.16+) eliminates the need for separate static asset deployment — templates, config files, and frontend build output can all be compiled directly into your binary.
- Set `GOPRIVATE` explicitly for any internal/company module paths — otherwise `go get` will try (and fail) to verify them against the public checksum database.

---

## Summary

- One `go` binary handles building, running, testing, formatting, and dependency management — no separate build system needed.
- `gofmt`/`goimports` enforce Go's single canonical code style automatically — no formatting debates, no configuration.
- `go vet` (runs automatically with `go test`) and `golangci-lint` (install separately, aggregates many linters) catch real bugs beyond what the compiler alone checks.
- `dlv` (delve) for debugging, `go tool pprof` for CPU/memory profiling — both integrate with most editors directly.
- `//go:embed` compiles static files directly into the binary — enables true single-binary deployment for web apps.
- `air` provides live-reload during development — essential quality-of-life tool for iterating on HTTP services.
