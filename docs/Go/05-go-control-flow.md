---
title: "Control Flow — if, switch, for"
sidebar_label: "Control Flow"
sidebar_position: 5
---

# Control Flow — if, switch, for

Go has exactly ONE looping construct (`for`, used for everything), a powerful `switch`, and an `if` that supports an initialization statement. No `while`, no `do-while`, no ternary.

---

## if / else

```go
age := 20

if age >= 18 {
    fmt.Println("adult")
} else if age >= 13 {
    fmt.Println("teenager")
} else {
    fmt.Println("child")
}

// No parentheses needed around the condition — braces ARE required
// if (age >= 18) { }   // parens allowed but not idiomatic; gofmt won't remove them

// if with an initialization statement — scoped ONLY to the if/else block
if err := doSomething(); err != nil {
    fmt.Println("error:", err)
}
// err is NOT accessible here — out of scope

// Extremely common Go idiom: check error immediately after calling a function
if val, err := strconv.Atoi("42"); err != nil {
    fmt.Println("parse error:", err)
} else {
    fmt.Println("parsed:", val)
}
```

---

## switch

```go
// Basic switch — NO fallthrough by default (unlike C/Java/JS!)
day := "Monday"

switch day {
case "Saturday", "Sunday":     // multiple values in one case
    fmt.Println("Weekend")
case "Monday":
    fmt.Println("Start of week")
default:
    fmt.Println("Midweek")
}
// After a matching case executes, switch exits automatically — no break needed

// Explicit fallthrough (rare, must be requested)
switch 2 {
case 1:
    fmt.Println("one")
case 2:
    fmt.Println("two")
    fallthrough           // forces execution to continue into the next case
case 3:
    fmt.Println("three")  // this ALSO prints, because of fallthrough above
}

// switch with no expression — replaces long if/else chains
score := 85
switch {
case score >= 90:
    fmt.Println("A")
case score >= 80:
    fmt.Println("B")
case score >= 70:
    fmt.Println("C")
default:
    fmt.Println("F")
}

// switch with initialization statement
switch x := compute(); {
case x > 0:
    fmt.Println("positive")
case x < 0:
    fmt.Println("negative")
default:
    fmt.Println("zero")
}

// Type switch — switch on the DYNAMIC TYPE of an interface value
func describe(i interface{}) {
    switch v := i.(type) {
    case int:
        fmt.Printf("int: %d\n", v)
    case string:
        fmt.Printf("string: %s\n", v)
    case bool:
        fmt.Printf("bool: %t\n", v)
    case []int:
        fmt.Printf("slice of int, len %d\n", len(v))
    case nil:
        fmt.Println("nil value")
    default:
        fmt.Printf("unknown type: %T\n", v)
    }
}
```

---

## for — The Only Loop Construct

```go
// Classic three-part for loop (like C)
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// While-style loop — 'for' with just a condition (no init/post)
n := 5
for n > 0 {
    fmt.Println(n)
    n--
}

// Infinite loop
for {
    fmt.Println("forever")
    break                   // must break explicitly, or return, or panic
}

// range — iterate over slices, arrays, strings, maps, channels
nums := []int{10, 20, 30}
for i, v := range nums {
    fmt.Println(i, v)      // index, value
}

for i := range nums {       // index only
    fmt.Println(i)
}

for _, v := range nums {     // value only (discard index with _)
    fmt.Println(v)
}

for i := range 5 {            // Go 1.22+ — range over an integer, like Python's range()
    fmt.Println(i)            // 0 1 2 3 4
}

// range over a map — order is randomized (see go-arrays-slices-maps.md)
m := map[string]int{"a": 1, "b": 2}
for k, v := range m {
    fmt.Println(k, v)
}

// range over a string — iterates by RUNE (Unicode code point), not byte
for i, r := range "héllo" {
    fmt.Printf("%d: %c\n", i, r)
}

// range over a channel — receives until the channel is closed (see go-concurrency.md)
ch := make(chan int, 3)
ch <- 1; ch <- 2; ch <- 3
close(ch)
for v := range ch {
    fmt.Println(v)
}
```

---

## break, continue, and Labels

```go
// break — exit the innermost loop
for i := 0; i < 10; i++ {
    if i == 5 {
        break
    }
    fmt.Println(i)     // 0 1 2 3 4
}

// continue — skip to next iteration
for i := 0; i < 10; i++ {
    if i%2 == 0 {
        continue
    }
    fmt.Println(i)      // 1 3 5 7 9
}

// Labels — break/continue a SPECIFIC outer loop from within a nested loop
// (Go has no labeled loops in most languages, but DOES support this)
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i == 1 && j == 1 {
            break outer         // breaks the OUTER loop, not just the inner one
        }
        fmt.Println(i, j)
    }
}

// continue with a label — skip to next iteration of the LABELED loop
search:
for i := 0; i < 5; i++ {
    for j := 0; j < 5; j++ {
        if j == 2 {
            continue search      // continues the outer 'search' loop
        }
        fmt.Println(i, j)
    }
}

// Labels also work with 'switch' inside a loop (switch's own break only
// exits the switch, not the loop — labels/break-with-label solve this)
loop:
for i := 0; i < 5; i++ {
    switch i {
    case 3:
        break loop              // exits the FOR loop, not just the switch
    default:
        fmt.Println(i)
    }
}
```

---

## goto (Rarely Used)

```go
// Go has goto, but it's rarely idiomatic — mentioned for completeness
func example() {
    i := 0
loop:
    if i < 5 {
        fmt.Println(i)
        i++
        goto loop
    }
}
// Common legitimate use: jumping to a shared cleanup section (though
// 'defer' — see go-error-handling.md — replaces this need in almost all cases)
```

---

## Defer in Control Flow (Preview — Full Coverage in Error Handling)

```go
// defer schedules a function call to run when the SURROUNDING function returns
// (not covered in depth here — see go-error-handling.md — but relevant to
// control flow because it interacts with loops in a commonly-mistaken way)

func processFiles(paths []string) {
    for _, path := range paths {
        f, err := os.Open(path)
        if err != nil {
            continue
        }
        defer f.Close()      // ⚠ MISTAKE: defers accumulate until processFiles
                             // RETURNS, not until each loop iteration ends —
                             // if paths has 10,000 entries, 10,000 files stay open
    }
    // correct pattern: wrap the per-file logic in its own function,
    // so defer fires at the end of EACH call, not at the end of the loop
}

func processFilesCorrect(paths []string) {
    for _, path := range paths {
        func() {
            f, err := os.Open(path)
            if err != nil {
                return
            }
            defer f.Close()     // fires when this anonymous function returns —
                                // i.e., once per loop iteration, correctly
            // ... use f ...
        }()
    }
}
```

---

## Tips

- `switch` in Go does NOT fall through by default — this is the opposite of C/Java/JavaScript and trips up almost everyone coming from those languages initially.
- `for` is Go's only loop keyword — it covers classic for-loops, while-loops, infinite loops, and range-based iteration; there's nothing else to learn here.
- Labeled `break`/`continue` are the correct way to control an outer loop from inside a nested loop or switch — don't reach for flag variables when a label does the job cleanly.
- `range` over a string iterates by rune (handling multi-byte UTF-8 correctly automatically) — this is usually what you want, but be aware the index values will skip ahead for multi-byte characters.
- Watch out for `defer` inside a loop — it doesn't fire per-iteration, it fires when the enclosing FUNCTION returns; wrap loop bodies in their own function if you need per-iteration cleanup.

---

## Summary

- `if condition { }` — no parens required; supports an initialization statement scoped to the if/else block (`if err := f(); err != nil { }`).
- `switch` has no implicit fallthrough (opposite of C-family languages); supports multiple values per case, a condition-less form (replacing long if/else chains), and type switches (`switch v := i.(type)`).
- `for` is the only loop keyword — covers classic, while-style, infinite, and `range`-based iteration over slices, maps, strings, channels, and (Go 1.22+) integers.
- `break`/`continue` support labels to target a specific outer loop from a nested context.
- `defer` inside a loop fires when the enclosing function returns, not per-iteration — wrap loop bodies in an anonymous function if per-iteration cleanup is needed.
