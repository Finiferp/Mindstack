---
title: "Testing"
sidebar_label: "Testing"
sidebar_position: 14
---

# Testing

Testing is built directly into the Go toolchain — no external framework required for the basics. `go test` discovers and runs any function following the `TestXxx` naming convention.

---

## Basic Tests

```go
// math.go
package mathutil

func Add(a, b int) int {
    return a + b
}

func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

```go
// math_test.go — test files MUST end in _test.go, live in the same package
package mathutil

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}

func TestDivide(t *testing.T) {
    result, err := Divide(10, 2)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if result != 5 {
        t.Errorf("Divide(10, 2) = %f; want 5", result)
    }
}

func TestDivideByZero(t *testing.T) {
    _, err := Divide(10, 0)
    if err == nil {
        t.Error("expected an error, got nil")
    }
}
```

```bash
go test                             # run all tests in the current package
go test ./...                       # run all tests in all packages, recursively
go test -v                          # verbose — show each test name and result
go test -run TestAdd                # run only tests matching this pattern
go test -count=1                    # disable test result caching (force re-run)
go test -cover                      # show coverage percentage
go test -coverprofile=cover.out     # write coverage data to a file
go tool cover -html=cover.out       # view coverage as an HTML report
```

---

## t.Error vs t.Fatal

```go
func TestExample(t *testing.T) {
    // t.Error/t.Errorf — records the failure, TEST CONTINUES running
    if 1+1 != 2 {
        t.Error("math is broken")
    }

    // t.Fatal/t.Fatalf — records the failure, TEST STOPS IMMEDIATELY
    resp, err := http.Get("http://example.com")
    if err != nil {
        t.Fatalf("request failed: %v", err)     // no point continuing if this failed
    }
    defer resp.Body.Close()
    // ... more assertions using resp, which we now know is non-nil
}

// Rule of thumb: use Fatal when continuing the test would cause a panic
// or meaningless further failures (e.g. a nil pointer from a failed setup
// step); use Error when subsequent checks are still independently useful
```

---

## Table-Driven Tests — The Idiomatic Go Pattern

```go
func TestAddTableDriven(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"zeros", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {         // subtests — each gets its own
            result := Add(tt.a, tt.b)               // pass/fail, shown separately in -v output
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}

// Running a specific subtest:
// go test -run TestAddTableDriven/negative_numbers

// This pattern is used EXTENSIVELY in the Go standard library's own
// tests and is considered the idiomatic way to test multiple input/
// output combinations without duplicating test function boilerplate
```

---

## Setup, Teardown, and Test Main

```go
func TestMain(m *testing.M) {
    fmt.Println("setup: runs once before ALL tests in this package")
    setupDatabase()

    code := m.Run()         // runs all the tests

    fmt.Println("teardown: runs once after ALL tests")
    teardownDatabase()

    os.Exit(code)          // propagate the actual test exit code
}

// Per-test setup/teardown — use t.Cleanup (Go 1.14+)
func TestWithCleanup(t *testing.T) {
    tempFile := createTempFile(t)
    t.Cleanup(func() {
        os.Remove(tempFile)     // runs after THIS test, even if it fails/panics
    })
    // ... use tempFile ...
}

// Helper functions — mark with t.Helper() so failure line numbers point
// to the CALLER, not into the helper itself
func assertEqual(t *testing.T, got, want int) {
    t.Helper()
    if got != want {
        t.Errorf("got %d, want %d", got, want)
    }
}
```

---

## Mocking with Interfaces

Go's implicit interface satisfaction (see go-interfaces.md) makes mocking straightforward without a mocking framework, though frameworks exist for more complex cases.

```go
// Production code depends on an INTERFACE, not a concrete type
type UserRepository interface {
    FindByID(id int) (*User, error)
}

type UserService struct {
    repo UserRepository
}

func (s *UserService) GetUserName(id int) (string, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return "", err
    }
    return user.Name, nil
}

// Test — a simple hand-written mock implementing the same interface
type mockUserRepository struct {
    users map[int]*User
    err   error
}

func (m *mockUserRepository) FindByID(id int) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    user, ok := m.users[id]
    if !ok {
        return nil, errors.New("not found")
    }
    return user, nil
}

func TestGetUserName(t *testing.T) {
    repo := &mockUserRepository{
        users: map[int]*User{1: {ID: 1, Name: "Alice"}},
    }
    service := &UserService{repo: repo}

    name, err := service.GetUserName(1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if name != "Alice" {
        t.Errorf("got %q, want %q", name, "Alice")
    }
}

// For larger projects: gomock (github.com/golang/mock) or testify/mock
// auto-generate mocks from interfaces — worth adopting once hand-written
// mocks become repetitive
```

---

## testify — Popular Third-Party Assertion Library

```go
// pip install github.com/stretchr/testify
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestWithTestify(t *testing.T) {
    result := Add(2, 3)

    assert.Equal(t, 5, result)                      // continues on failure (like t.Error)
    assert.NotNil(t, result)
    assert.True(t, result > 0)
    assert.Contains(t, []int{1, 2, 3}, 2)

    require.Equal(t, 5, result)                     // stops immediately on failure (like t.Fatal)

    // Much more readable failure messages out of the box than raw testing package
}

// testify/suite — for tests needing shared setup across many test methods
import "github.com/stretchr/testify/suite"

type UserTestSuite struct {
    suite.Suite
    repo *mockUserRepository
}

func (s *UserTestSuite) SetupTest() {
    s.repo = &mockUserRepository{users: map[int]*User{}}
}

func (s *UserTestSuite) TestFindUser() {
    s.repo.users[1] = &User{ID: 1, Name: "Alice"}
    user, err := s.repo.FindByID(1)
    s.NoError(err)
    s.Equal("Alice", user.Name)
}

func TestUserTestSuite(t *testing.T) {
    suite.Run(t, new(UserTestSuite))
}
```

---

## Benchmarks

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {      // b.N adjusts automatically for stable timing
        Add(2, 3)
    }
}

func BenchmarkStringConcat(b *testing.B) {
    for i := 0; i < b.N; i++ {
        s := ""
        for j := 0; j < 100; j++ {
            s += "x"
        }
    }
}

func BenchmarkStringBuilder(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        for j := 0; j < 100; j++ {
            sb.WriteString("x")
        }
        _ = sb.String()
    }
}
```

```bash
go test -bench=.                            # run all benchmarks
go test -bench=BenchmarkAdd                 # run a specific benchmark
go test -bench=. -benchmem                  # include memory allocation stats
go test -bench=. -benchtime=5s              # run each benchmark for 5 seconds

# Comparing two versions of code — benchstat (separate tool) statistically
# compares two benchmark runs to determine if a difference is significant
go install golang.org/x/perf/cmd/benchstat@latest
go test -bench=. -count=10 > old.txt        # before your change
go test -bench=. -count=10 > new.txt        # after your change
benchstat old.txt new.txt
```

---

## Example Tests — Documentation That's Verified

```go
// Example functions are BOTH documentation (shown on pkg.go.dev) AND
// actual tests — the "// Output:" comment is verified against real output

func ExampleAdd() {
    result := Add(2, 3)
    fmt.Println(result)
    // Output: 5
}

func ExampleAdd_negative() {     // suffix after underscore for multiple examples of Add
    result := Add(-2, -3)
    fmt.Println(result)
    // Output: -5
}

// go test runs these and FAILS if the actual printed output doesn't
// match the "// Output:" comment exactly — documentation that can't
// silently go stale, unlike comments in most other languages
```

---

## Fuzzing (Go 1.18+)

```go
// Fuzz tests generate random/mutated inputs automatically, searching
// for inputs that cause a crash or a failed invariant

func FuzzReverse(f *testing.F) {
    testcases := []string{"hello", "", "!12345"}
    for _, tc := range testcases {
        f.Add(tc)    // seed corpus — starting inputs for the fuzzer to mutate
    }

    f.Fuzz(func(t *testing.T, orig string) {
        rev := Reverse(orig)
        doubleRev := Reverse(rev)
        if orig != doubleRev {
            t.Errorf("Reverse(Reverse(%q)) = %q, want %q", orig, doubleRev, orig)
        }
    })
}
```

```bash
go test -fuzz=FuzzReverse                   # run the fuzzer (runs until Ctrl+C or a failure)
go test -fuzz=FuzzReverse -fuzztime=30s     # run for a fixed duration
go test                                     # regular test run ALSO replays any
                                            # previously found failing inputs
                                            # (saved under testdata/fuzz/)
```

---

## Tips

- Table-driven tests with subtests (`t.Run`) are the dominant Go testing style — adopt this pattern by default, even for tests that currently only have one case.
- `go test -race` (see go-concurrency.md) should be part of your standard test run for any code touching goroutines/channels — catch data races before they reach production.
- Design production code around interfaces specifically so tests can substitute simple hand-written mocks without needing a mocking framework — this is a natural consequence of Go's implicit interface satisfaction.
- Use `t.Helper()` in any shared assertion helper function — it makes failure messages point to the actual calling test line, not into the helper itself.
- Example functions (`ExampleXxx`) double as verified documentation — use them for anything where showing usage is clearer than describing it in prose.

---

## Summary

- Test files end in `_test.go`; test functions are `func TestXxx(t *testing.T)`, discovered and run automatically by `go test`.
- `t.Error`/`t.Errorf` record a failure and continue; `t.Fatal`/`t.Fatalf` record a failure and stop the test immediately.
- Table-driven tests (`for _, tt := range tests { t.Run(tt.name, ...) }`) are the idiomatic pattern for testing multiple input/output cases.
- `TestMain` for package-wide setup/teardown; `t.Cleanup()` for per-test cleanup that runs even on failure.
- Interfaces make mocking natural without a framework — production code depends on interfaces, tests substitute simple hand-written implementations.
- Benchmarks (`func BenchmarkXxx(b *testing.B)`) measure performance; Example functions serve as verified, always-accurate documentation; fuzz tests (Go 1.18+) automatically search for edge-case failures.
