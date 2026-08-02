---
title: "Standard Library Essentials"
sidebar_label: "Standard Library"
sidebar_position: 15
---

# Standard Library Essentials

Go's standard library is unusually comprehensive — HTTP servers, JSON, cryptography, and more are built in, without needing third-party packages for most common tasks.

---

## strings

```go
import "strings"

s := "Hello, World!"

strings.ToUpper(s)                              // "HELLO, WORLD!"
strings.ToLower(s)                              // "hello, world!"
strings.Contains(s, "World")                    // true
strings.HasPrefix(s, "Hello")                   // true
strings.HasSuffix(s, "!")                       // true
strings.Index(s, "World")                       // 7 (index of first occurrence, -1 if not found)
strings.Replace(s, "World", "Go", 1)            // replace first N occurrences
strings.ReplaceAll(s, "l", "L")                 // replace all
strings.Split(s, ", ")                          // ["Hello" "World!"]
strings.SplitN(s, ",", 2)                       // split, max 2 results
strings.Fields("  hello   world  ")             // ["hello" "world"] — splits on whitespace
strings.Join([]string{"a", "b", "c"}, "-")      // "a-b-c"
strings.TrimSpace("  hello  ")                  // "hello"
strings.Trim("xxhelloxx", "x")                  // "hello"
strings.TrimLeft("xxhello", "x")                // "hello"
strings.TrimRight("helloxx", "x")               // "hello"
strings.TrimPrefix("hello.go", "hello")         // ".go"
strings.TrimSuffix("hello.go", ".go")           // "hello"
strings.Repeat("ab", 3)                         // "ababab"
strings.Count(s, "l")                           // 3
strings.EqualFold("Go", "GO")                   // true — case-insensitive compare

// strings.Builder — efficient string concatenation (avoid += in loops)
var sb strings.Builder
for i := 0; i < 5; i++ {
    sb.WriteString("x")
}
result := sb.String()

// strings.Reader — treat a string as an io.Reader
r := strings.NewReader("hello")
```

---

## strconv

```go
import "strconv"

// String to number
n, err := strconv.Atoi("42")                        // string → int
f, err := strconv.ParseFloat("3.14", 64)            // string → float64
b, err := strconv.ParseBool("true")                 // string → bool
i64, err := strconv.ParseInt("42", 10, 64)          // string → int64 (base 10, 64-bit)

// Number to string
s := strconv.Itoa(42)                               // int → string
s2 := strconv.FormatFloat(3.14, 'f', 2, 64)         // "3.14" — 2 decimal places
s3 := strconv.FormatBool(true)                      // "true"
s4 := strconv.Quote("hello")                        // "\"hello\"" — quoted string
```

---

## time

```go
import "time"

now := time.Now()
fmt.Println(now)

// Creating specific times
t := time.Date(2024, time.January, 15, 10, 30, 0, 0, time.UTC)

// Formatting — Go uses a REFERENCE TIME instead of format codes:
// Mon Jan 2 15:04:05 MST 2006  (this exact date/time is Go's format template)
fmt.Println(now.Format("2006-01-02"))               // "2024-01-15"
fmt.Println(now.Format("2006-01-02 15:04:05"))      // "2024-01-15 10:30:00"
fmt.Println(now.Format("Jan 2, 2006"))              // "Jan 15, 2024"
fmt.Println(now.Format(time.RFC3339))               // ISO 8601 format

// Parsing
parsed, err := time.Parse("2006-01-02", "2024-01-15")
parsed2, err := time.Parse(time.RFC3339, "2024-01-15T10:30:00Z")

// Components
fmt.Println(now.Year(), now.Month(), now.Day())
fmt.Println(now.Hour(), now.Minute(), now.Second())
fmt.Println(now.Weekday())

// Arithmetic
future := now.Add(24 * time.Hour)              // add a day
past := now.Add(-1 * time.Hour)                // subtract an hour
diff := future.Sub(now)                        // time.Duration
fmt.Println(diff.Hours())                      // 24

// Comparison
now.Before(future)          // true
now.After(past)             // true
now.Equal(now)              // true

// Durations
d := 2 * time.Hour + 30*time.Minute
fmt.Println(d)                          // 2h30m0s
time.Sleep(100 * time.Millisecond)      // pause execution

// Timers and Tickers
timer := time.NewTimer(2 * time.Second)
<-timer.C           // blocks until the timer fires

ticker := time.NewTicker(1 * time.Second)
defer ticker.Stop()
for i := 0; i < 3; i++ {
    <-ticker.C
    fmt.Println("tick")
}

// Unix timestamps
unix := now.Unix()                          // seconds since epoch
fromUnix := time.Unix(unix, 0)              // back to time.Time
```

---

## os

```go
import "os"

// Command-line arguments
args := os.Args                 // args[0] is the program name
fmt.Println(os.Args[1:])        // actual arguments

// Environment variables
val := os.Getenv("HOME")
val2, exists := os.LookupEnv("MY_VAR")
os.Setenv("MY_VAR", "value")

// Exit codes
os.Exit(0)              // exit immediately with code 0
os.Exit(1)              // exit with error code — bypasses deferred functions!

// File operations
data, err := os.ReadFile("file.txt")
err = os.WriteFile("output.txt", []byte("content"), 0644)

f, err := os.Open("file.txt")               // read-only
f2, err := os.Create("newfile.txt")         // create/truncate for writing
defer f.Close()

os.Mkdir("newdir", 0755)
os.MkdirAll("a/b/c", 0755)              // create nested directories
os.Remove("file.txt")
os.RemoveAll("directory")
os.Rename("old.txt", "new.txt")

// Standard streams
fmt.Fprintln(os.Stdout, "to stdout")
fmt.Fprintln(os.Stderr, "to stderr")
```

---

## io and bufio

```go
import (
    "bufio"
    "io"
    "os"
)

// io.Reader / io.Writer — the fundamental interfaces (see go-interfaces.md)
func copyData(dst io.Writer, src io.Reader) (int64, error) {
    return io.Copy(dst, src)
}

// bufio.Scanner — read input line by line, memory efficient
file, _ := os.Open("file.txt")
defer file.Close()
scanner := bufio.NewScanner(file)
for scanner.Scan() {
    line := scanner.Text()
    fmt.Println(line)
}
if err := scanner.Err(); err != nil {
    fmt.Println("scan error:", err)
}

// Reading from stdin
scanner2 := bufio.NewScanner(os.Stdin)
for scanner2.Scan() {
    input := scanner2.Text()
    fmt.Println("you typed:", input)
}

// bufio.Reader — more control than Scanner
reader := bufio.NewReader(os.Stdin)
line, err := reader.ReadString('\n')

// bufio.Writer — buffered writing, must Flush() to ensure data is written
writer := bufio.NewWriter(os.Stdout)
writer.WriteString("buffered output\n")
writer.Flush()
```

---

## encoding/json

```go
import "encoding/json"

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email,omitempty"`
}

// Marshal — Go struct → JSON
u := User{ID: 1, Name: "Alice", Email: "alice@example.com"}
data, err := json.Marshal(u)
fmt.Println(string(data))            // {"id":1,"name":"Alice","email":"alice@example.com"}

// MarshalIndent — pretty-printed JSON
data2, _ := json.MarshalIndent(u, "", "  ")

// Unmarshal — JSON → Go struct
jsonStr := `{"id":2,"name":"Bob","email":"bob@example.com"}`
var u2 User
err = json.Unmarshal([]byte(jsonStr), &u2)      // note: pointer required

// Unmarshal into a generic map (unknown/dynamic structure)
var data3 map[string]interface{}
json.Unmarshal([]byte(jsonStr), &data3)

// Working with slices of structs
users := []User{{ID: 1, Name: "Alice"}, {ID: 2, Name: "Bob"}}
usersJSON, _ := json.Marshal(users)

var parsedUsers []User
json.Unmarshal(usersJSON, &parsedUsers)

// Streaming JSON (large payloads — avoid loading everything into memory)
decoder := json.NewDecoder(os.Stdin)
var u3 User
decoder.Decode(&u3)

encoder := json.NewEncoder(os.Stdout)
encoder.Encode(u3)
```

---

## sort

```go
import "sort"

// Sorting basic slices
nums := []int{3, 1, 4, 1, 5, 9}
sort.Ints(nums)                                 // ascending, in place
sort.Sort(sort.Reverse(sort.IntSlice(nums)))    // descending

strs := []string{"banana", "apple", "cherry"}
sort.Strings(strs)

// Custom sorting with sort.Slice — the most common approach for structs
type Person struct {
    Name string
    Age  int
}
people := []Person{{"Bob", 25}, {"Alice", 30}, {"Carol", 20}}

sort.Slice(people, func(i, j int) bool {
    return people[i].Age < people[j].Age     // ascending by age
})

sort.Slice(people, func(i, j int) bool {
    return people[i].Name < people[j].Name    // ascending by name
})

// Check if already sorted
isSorted := sort.SliceIsSorted(people, func(i, j int) bool {
    return people[i].Age < people[j].Age
})

// Since Go 1.21, prefer 'slices.SortFunc' from the slices package —
// generic, type-safe, no reflection overhead
import "slices"
slices.SortFunc(people, func(a, b Person) int {
    return a.Age - b.Age    // negative if a < b, positive if a > b, 0 if equal
})
```

---

## regexp

```go
import "regexp"

re := regexp.MustCompile(`\d+`)                     // compile once, reuse (panics on invalid pattern)
re2, err := regexp.Compile(`\d+`)                   // returns error instead of panicking

fmt.Println(re.MatchString("abc123"))               // true
fmt.Println(re.FindString("abc123def456"))          // "123" — first match
fmt.Println(re.FindAllString("abc123def456", -1))   // ["123" "456"] — all matches, -1 = unlimited
fmt.Println(re.ReplaceAllString("abc123", "X"))     // "abcX"

// Named groups
re3 := regexp.MustCompile(`(?P<year>\d{4})-(?P<month>\d{2})`)
match := re3.FindStringSubmatch("2024-01")
names := re3.SubexpNames()
for i, name := range names {
    if i != 0 && name != "" {
        fmt.Println(name, match[i])
    }
}
```

---

## errors, fmt

```go
// See go-error-handling.md for full coverage of errors.New, errors.Is,
// errors.As, fmt.Errorf with %w wrapping
```

---

## net/http (Preview — Full Coverage in Echo Section)

```go
import "net/http"

// Go's standard library has a fully capable HTTP server built in —
// frameworks like Echo (covered later) add convenience on top of this
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello, World!")
})
http.ListenAndServe(":8080", nil)

// Making HTTP requests
resp, err := http.Get("https://api.example.com/data")
defer resp.Body.Close()
body, err := io.ReadAll(resp.Body)

resp2, err := http.Post("https://api.example.com/data", "application/json",
    strings.NewReader(`{"key":"value"}`))
```

---

## Tips

- `strings.Builder` is significantly faster than `+=` concatenation in a loop — always use it for building strings incrementally.
- Go's time formatting uses a REFERENCE DATE (`Mon Jan 2 15:04:05 MST 2006`) instead of format codes like `%Y-%m-%d` — memorize this reference date once, it unlocks all time formatting.
- `json.Unmarshal` requires a POINTER as its second argument — a very common beginner mistake is passing the struct by value.
- Prefer `slices.SortFunc` (Go 1.21+) over `sort.Slice` for new code — it's generic and type-safe rather than relying on reflection.
- `bufio.Scanner` is the standard way to read input line-by-line efficiently — don't read entire files into memory with `os.ReadFile` if you're processing line-by-line and the file could be large.

---

## Summary

- `strings`: search, split, join, trim, replace, case conversion — `strings.Builder` for efficient concatenation.
- `strconv`: string ↔ number conversions (`Atoi`, `Itoa`, `ParseFloat`, `FormatFloat`).
- `time`: uses a reference-date format string (not format codes); `Format`/`Parse`, arithmetic via `Add`/`Sub`, `time.Duration` for elapsed time.
- `os`: environment variables, file operations, command-line args, exit codes.
- `io`/`bufio`: `io.Reader`/`io.Writer` interfaces underpin all I/O; `bufio.Scanner` for line-by-line reading.
- `encoding/json`: `Marshal`/`Unmarshal` for struct ↔ JSON conversion — struct tags control field names.
- `sort`/`slices`: sorting slices — prefer the generic `slices` package (Go 1.21+) for new code.
- `net/http`: Go's standard library includes a complete, production-capable HTTP server and client.
