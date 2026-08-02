---
title: "Packages and Modules"
sidebar_label: "Packages & Modules"
sidebar_position: 12
---

# Packages and Modules

How Go organizes code across files and manages dependencies. Modules (introduced in Go 1.11) replaced the old GOPATH-based dependency system entirely.

---

## Packages

```go
// Every .go file starts with a package declaration
// All files in the same DIRECTORY must declare the SAME package name

// mathutil/add.go
package mathutil

func Add(a, b int) int {
    return a + b
}

// mathutil/subtract.go — same directory, same package
package mathutil

func Subtract(a, b int) int {
    return a - b
}

// main.go — a different package, importing mathutil
package main

import (
    "fmt"
    "myproject/mathutil"    // import path — matches module path + directory
)

func main() {
    fmt.Println(mathutil.Add(3, 4))         // package.ExportedFunction()
    fmt.Println(mathutil.Subtract(10, 3))
}
```

```
Rules:
  One package per directory — Go enforces this (you cannot mix package
  names within the same folder)
  Package name is usually the same as the directory name (convention,
  not enforced — but strongly recommended)
  package main is special — ONLY package main can produce an executable
  (func main() is the entry point, required in package main)
  Everything else is a LIBRARY package — imported, never run directly
```

---

## Import Statements

```go
import "fmt"                        // single import

import (                            // grouped imports (preferred style)
    "fmt"
    "os"
    "strings"
)

import (                            // grouped with third-party/local packages,
    "fmt"                           // conventionally separated by a blank line
    "net/http"

    "github.com/labstack/echo/v4"

    "myproject/internal/handlers"
)

import f "fmt"                      // aliased import — f.Println(...)
import . "fmt"                      // dot import — Println(...) directly,
                                    // no package prefix (rare, discouraged —
                                    // pollutes the namespace, hurts readability)
import _ "github.com/lib/pq"        // blank import — runs the package's init()
                                    // for side effects only (e.g. registering
                                    // a database driver), doesn't use any
                                    // of its exported names directly

// gofmt / goimports automatically sorts and groups imports —
// always run 'goimports' (a superset of gofmt) to auto-manage this
```

---

## init() Functions

```go
package config

var settings map[string]string

// init() runs automatically when the package is imported, BEFORE main()
// A package can have multiple init() functions (even across files) —
// they run in the order the files are compiled (alphabetical by filename)
func init() {
    settings = make(map[string]string)
    settings["env"] = "production"
    fmt.Println("config package initialized")
}

// Common legitimate uses:
//   Registering things (database drivers, in the pattern used by database/sql)
//   Validating required environment variables exist before the program proceeds
//   One-time setup that MUST happen before any other code in the package runs

// Overuse of init() is considered a code smell in modern Go — implicit,
// hard-to-trace execution order. Prefer explicit initialization functions
// called from main() where practical.
```

---

## Go Modules — go.mod and go.sum

```bash
# Initialize a new module (creates go.mod)
go mod init github.com/yourname/myproject

# go.mod contents:
# module github.com/yourname/myproject
#
# go 1.22
#
# require (
#     github.com/labstack/echo/v4 v4.11.4
#     gorm.io/gorm v1.25.5
# )

# Add a dependency (also updates go.mod automatically)
go get github.com/labstack/echo/v4
go get github.com/labstack/echo/v4@v4.11.4      # specific version
go get github.com/labstack/echo/v4@latest       # latest version

# Remove unused dependencies, add missing ones (based on actual imports in code)
go mod tidy

# Download dependencies into the local module cache
go mod download

# View the full dependency graph
go mod graph

# Verify dependencies haven't been tampered with (checks go.sum)
go mod verify

# vendor/ directory — optional, bundles dependencies INTO your repo
# (useful for fully reproducible/offline builds)
go mod vendor
go build -mod=vendor
```

```
go.sum:
  Records the exact cryptographic hash of every dependency (and its
  dependencies, transitively) — ensures builds are reproducible and
  that a dependency hasn't been tampered with since it was first added
  ALWAYS commit go.sum to version control alongside go.mod
  Never hand-edit go.sum — it's maintained automatically by go commands

Semantic Import Versioning:
  Go modules encode MAJOR version in the import path itself, for v2+:
    github.com/labstack/echo/v4    ← the "/v4" IS part of the import path
  This lets a project depend on BOTH v1 and v2 of the same library
  simultaneously if truly needed (a deliberate, unusual Go design choice
  that avoids "dependency hell" for major version conflicts)
```

---

## Module Path and Directory Structure

```
A typical real-world Go project structure:

myproject/
├── go.mod                    ← module github.com/yourname/myproject
├── go.sum
├── main.go                    ← package main, func main()
├── internal/                    ← code ONLY importable from within this module
│   ├── handlers/
│   │   └── user_handler.go
│   ├── models/
│   │   └── user.go
│   └── repository/
│       └── user_repository.go
├── pkg/                            ← code intended for external reuse
│   └── validator/
│       └── validator.go
└── cmd/                                ← multiple entry points (if the project
    ├── server/                            has more than one binary)
    │   └── main.go
    └── migrate/
        └── main.go

internal/ is SPECIAL — enforced by the Go compiler itself:
  Any package under a directory named 'internal/' can ONLY be imported
  by code within the same module tree rooted at internal/'s parent
  This is Go's built-in mechanism for "this is a private implementation
  detail, not part of our public API" — genuinely compiler-enforced,
  not just a naming convention

pkg/ is a WIDELY-USED CONVENTION (not compiler-enforced) signaling
"this code is intended to be imported by other projects"
```

---

## Go Workspaces (Go 1.18+)

For working across MULTIPLE modules simultaneously (e.g. a local library you're actively developing alongside the app using it).

```bash
go work init ./myapp ./mylib

# go.work file:
# go 1.22
# use (
#     ./myapp
#     ./mylib
# )

go work use ./another-module        # add another module to the workspace

# With a workspace active, 'go build'/'go run' in myapp will use the
# LOCAL version of mylib from ./mylib, instead of the version pinned
# in myapp's go.mod — extremely useful for local multi-module development
# without needing 'replace' directives in go.mod (which you'd otherwise
# have to remember to remove before committing)
```

---

## replace Directive (Alternative to Workspaces)

```
# go.mod
module github.com/yourname/myapp

require github.com/yourname/mylib v1.0.0

replace github.com/yourname/mylib => ../mylib     # use local path instead
                                                      # of the versioned dependency

# or replace with a fork:
replace github.com/original/repo => github.com/yourfork/repo v1.2.3

# 'replace' directives are committed to go.mod, unlike go.work (which is
# typically local-only and gitignored) — useful for permanently pointing
# at a fork, but easy to accidentally commit a LOCAL path replace and
# break the build for everyone else; go.work avoids that specific risk
```

---

## Exported vs Unexported Across Packages

```go
package mathutil

func Add(a, b int) int { return a + b }         // exported — usable as mathutil.Add()
func multiply(a, b int) int { return a * b }    // unexported — ONLY usable within
                                                // the mathutil package itself

type Calculator struct {
    Result  float64         // exported field
    history []float64       // unexported field — hidden from other packages
}

// Other packages CAN use exported fields/methods on an exported type,
// even if the type itself has unexported fields:
calc := mathutil.Calculator{Result: 42}     // Result is settable
// calc.history                             // COMPILE ERROR from outside mathutil
```

---

## Tips

- Always run `go mod tidy` before committing — it removes unused dependencies and adds any missing ones based on your actual imports, keeping `go.mod`/`go.sum` accurate.
- Use `internal/` for anything that's genuinely private implementation detail — it's the one place Go's compiler actually enforces encapsulation across package boundaries.
- Prefer Go workspaces (`go work`) over `replace` directives for local multi-module development — workspaces are typically gitignored and don't risk accidentally breaking the build for teammates.
- Group imports into three sections (standard library, third-party, local) separated by blank lines — `goimports` does this automatically and it's the near-universal convention.
- Avoid dot imports (`import . "fmt"`) except in very specific, narrow test-helper scenarios — they hurt readability by hiding where identifiers come from.

---

## Summary

- A package is a directory of `.go` files sharing the same `package` declaration; `package main` + `func main()` produces an executable, everything else is a library.
- `go mod init`, `go get`, `go mod tidy` are the core dependency management commands; `go.sum` records cryptographic hashes for reproducible, tamper-evident builds.
- `internal/` is compiler-enforced private code — only importable from within the same module tree; `pkg/` is a convention (not enforced) for intentionally reusable code.
- Go Workspaces (`go work`) let you develop across multiple local modules simultaneously without modifying `go.mod`'s dependency versions.
- Exported (capitalized) vs unexported (lowercase) identifiers control visibility at the package level — the same rule applies to struct fields as to top-level functions/types.
