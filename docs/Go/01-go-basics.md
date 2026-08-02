---
title: "Go Basics — Syntax, Comments, Output"
sidebar_label: "Basics"
sidebar_position: 1
---

# Go Basics — Syntax, Comments, Output

The fundamentals: how Go source files are structured, comments, and every way to print output.

---

## Program Structure

```go
package main                    // every executable Go file starts with a package declaration

import "fmt"                    // import statement — brings in the fmt package

func main() {                   // main() is the entry point for executable programs
    fmt.Println("Hello, World!")
}
```

```
Rules:
  Every Go file belongs to a package (package main for executables)
  Only package main with a func main() produces a runnable binary
  Other packages are libraries — imported by other code, not run directly
  Braces { } are REQUIRED — cannot omit them even for single-statement blocks
  Opening brace MUST be on the same line as the statement (enforced by
  the compiler via automatic semicolon insertion — Go inserts semicolons
  based on newlines, so `func main()\n{` on separate lines is a syntax error)
  No semicolons needed at end of lines (Go's compiler inserts them
  automatically based on line breaks — you CAN write them, but gofmt
  removes them)
```

---

## Comments

```go
// Single-line comment

/* Multi-line
   comment */

// Doc comments — placed directly above a declaration, no blank line between
// Greet prints a greeting message to stdout.
func Greet(name string) {
    fmt.Printf("Hello, %s!\n", name)
}
// Convention: doc comment starts with the name of the thing it documents
// 'go doc' and pkg.go.dev display these as the function's documentation

// Package-level doc comment — goes in a file (often doc.go) before 'package'
// Package mathutil provides helper functions for common math operations.
package mathutil
```

---

## Output — Every Way to Print

```go
package main

import "fmt"

func main() {
    name := "Alice"
    age := 30

    // Println — adds spaces between args, newline at end
    fmt.Println("Hello,", name)              // Hello, Alice
    fmt.Println(name, age)                   // Alice 30

    // Print — no automatic spacing, no newline
    fmt.Print("Hello, ")
    fmt.Print(name)
    fmt.Print("\n")

    // Printf — formatted output (like C's printf), most commonly used
    fmt.Printf("Name: %s, Age: %d\n", name, age)

    // Sprintf — returns a formatted string instead of printing
    message := fmt.Sprintf("Hello, %s! You are %d.", name, age)
    fmt.Println(message)

    // Sprintln / Sprint — build strings without formatting verbs
    s := fmt.Sprintln("a", "b", "c")   // "a b c\n"
    s2 := fmt.Sprint("a", "b", "c")    // "abc" (no spaces between strings; spaces between non-strings)

    // Fprintf/Fprintln — write to any io.Writer (files, buffers, network)
    fmt.Fprintln(os.Stdout, "explicit stdout write")
    fmt.Fprintf(os.Stderr, "error: %s\n", "something failed")
}
```

---

## Formatting Verbs

```go
package main

import "fmt"

type Point struct{ X, Y int }

func main() {
    // General
    fmt.Printf("%v\n", 42)             // 42          — default format
    fmt.Printf("%+v\n", Point{1, 2})   // {X:1 Y:2}   — with field names
    fmt.Printf("%#v\n", Point{1, 2})   // main.Point{X:1, Y:2}  — Go-syntax representation
    fmt.Printf("%T\n", 42)             // int         — type of the value
    fmt.Printf("%%\n")                 // %           — literal percent sign

    // Boolean
    fmt.Printf("%t\n", true)           // true

    // Integer
    fmt.Printf("%d\n", 42)             // 42            decimal
    fmt.Printf("%b\n", 42)             // 101010        binary
    fmt.Printf("%o\n", 42)             // 52            octal
    fmt.Printf("%x\n", 255)            // ff            hex lowercase
    fmt.Printf("%X\n", 255)            // FF            hex uppercase
    fmt.Printf("%c\n", 65)             // A             character from code point
    fmt.Printf("%5d\n", 42)            // "   42"       width 5, right-aligned
    fmt.Printf("%-5d|\n", 42)          // "42   |"      left-aligned
    fmt.Printf("%05d\n", 42)           // 00042         zero-padded

    // Float
    fmt.Printf("%f\n", 3.14159)        // 3.141590      default 6 decimals
    fmt.Printf("%.2f\n", 3.14159)      // 3.14          2 decimal places
    fmt.Printf("%8.2f\n", 3.14159)     // "    3.14"    width 8, 2 decimals
    fmt.Printf("%e\n", 1234.5678)      // 1.234568e+03  scientific notation

    // String
    fmt.Printf("%s\n", "hello")        // hello
    fmt.Printf("%q\n", "hello")        // "hello"       quoted
    fmt.Printf("%10s\n", "hi")         // "        hi"  right-aligned width 10
    fmt.Printf("%-10s|\n", "hi")       // "hi        |" left-aligned

    // Pointer
    x := 42
    fmt.Printf("%p\n", &x)             // 0xc0000140a0  memory address
}
```

---

## Naming Conventions and Visibility

```go
// Go doesn't have 'public'/'private' keywords — visibility is determined
// by the CASE of the first letter of the identifier:

func PublicFunction() {}        // capitalized = exported (visible outside the package)
func privateFunction() {}       // lowercase = unexported (package-private)

type PublicStruct struct {      // exported type
    PublicField  string         // exported field — accessible from other packages
    privateField string         // unexported field — only accessible within this package
}

var PublicVar = 1               // exported package-level variable
var privateVar = 2              // unexported

const MaxRetries = 3            // exported constant

// Naming style conventions (enforced by convention, not the compiler):
// camelCase for unexported names, PascalCase for exported
// Short names for short-lived variables (i, j for loop counters; err for errors)
// Longer, descriptive names for package-level/exported identifiers
// Acronyms stay uppercase: ServeHTTP, not ServeHttp; URL not Url; ID not Id
```

---

## Multiple Statements and Line Formatting

```go
package main

import "fmt"

func main() {
    // Multiple statements on one line — separated by semicolons (rare style)
    x := 1; y := 2; fmt.Println(x + y)

    // Standard style: one statement per line (gofmt enforces this in practice)
    x = 1
    y = 2
    fmt.Println(x + y)

    // Blank identifier — discard a value you don't need
    _, err := someFunction()
    if err != nil {
        fmt.Println("error:", err)
    }
}

func someFunction() (int, error) {
    return 42, nil
}
```

---

## The go run vs go build Workflow

```bash
go run main.go                  # compile to a temp binary, run it, delete it — for development
go run .                        # run the package in the current directory

go build                        # compile to a binary named after the module/directory
go build -o myapp               # compile to a binary named 'myapp'
go build ./...                  # build all packages in the module

go install                      # build AND install the binary into $GOPATH/bin (or $GOBIN)

# Cross-compilation — Go can target any OS/architecture from any machine
GOOS=linux GOARCH=amd64 go build -o myapp-linux
GOOS=windows GOARCH=amd64 go build -o myapp.exe
GOOS=darwin GOARCH=arm64 go build -o myapp-mac-arm
# No cross-compilation toolchain needed — this "just works" because Go's
# standard library and runtime are implemented without OS-specific C dependencies
```

---

## Tips

- Run `gofmt -w .` (or configure your editor to format on save) — there's no formatting debate in Go, the tool decides.
- Unused variables and imports are COMPILE ERRORS, not warnings — you'll hit this constantly as a beginner; it's intentional, keeping code clean by construction.
- `%v` is the safe default formatting verb when you're not sure what type you're printing — works for almost anything.
- `%+v` on structs is invaluable for debugging — shows field names alongside values.
- Cross-compilation with `GOOS`/`GOARCH` is one of Go's most underrated features — building a Linux binary from your Mac for deployment takes one command, no Docker or VM needed.

---

## Summary

- `package main` + `func main()` = entry point for an executable; other packages are libraries.
- Braces are mandatory, opening brace stays on the same line (enforced by the compiler).
- `//` for single-line comments; doc comments go directly above the declaration they document, starting with that identifier's name.
- `fmt.Println`, `fmt.Printf`, `fmt.Sprintf` are the core output functions — `%v`, `%d`, `%s`, `%f`, `%t` are the most-used formatting verbs.
- Visibility is determined by capitalization: `PascalCase` = exported, `camelCase` = package-private. No `public`/`private` keywords.
- `go run` for development, `go build` to produce a binary; `GOOS`/`GOARCH` env vars enable trivial cross-compilation.
