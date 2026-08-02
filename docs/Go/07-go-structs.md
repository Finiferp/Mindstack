---
title: "Structs and Methods"
sidebar_label: "Structs & Methods"
sidebar_position: 7
---

# Structs and Methods

Structs are Go's way of grouping related data. Combined with methods and embedding, they replace classes and inheritance entirely — Go has neither.

---

## Defining and Creating Structs

```go
type Person struct {
    Name string
    Age  int
    City string
}

// Creating instances
p1 := Person{Name: "Alice", Age: 30, City: "NYC"}           // named fields (preferred)
p2 := Person{"Bob", 25, "LA"}                               // positional (fragile — avoid)
p3 := Person{Name: "Carol"}                                 // partial — rest are zero values

var p4 Person                                               // zero value: {Name:"" Age:0 City:""}

// Pointer to a struct — very common, avoids copying
p5 := &Person{Name: "Dave", Age: 40}
fmt.Println(p5.Name)                                        // Go automatically dereferences — no need for (*p5).Name

// new() — allocates zero-valued struct, returns a pointer
p6 := new(Person)                                           // equivalent to &Person{}

// Anonymous structs — for one-off, unnamed struct types
point := struct {
    X, Y int
}{X: 1, Y: 2}
```

---

## Fields and Access

```go
type Address struct {
    Street string
    City   string
    Zip    string
}

type Person struct {
    Name    string
    Age     int
    Address Address     // nested struct
}

p := Person{
    Name: "Alice",
    Age:  30,
    Address: Address{
        Street: "123 Main St",
        City:   "NYC",
        Zip:    "10001",
    },
}

fmt.Println(p.Address.City)     // NYC — dot notation chains through nesting
p.Address.Zip = "10002"         // modify nested field directly

// Pointer field vs value field — matters for mutation through a copy
type Node struct {
    Value int
    Next  *Node                 // pointer — enables linked structures (self-reference)
}
// Next *Node (not Node) is REQUIRED for self-referential structs —
// a struct cannot contain itself by VALUE (infinite size), only by pointer
```

---

## Methods

```go
type Rectangle struct {
    Width, Height float64
}

// Method with a VALUE receiver — receives a COPY of the Rectangle
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Method with a POINTER receiver — can modify the original
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

rect := Rectangle{Width: 10, Height: 5}
fmt.Println(rect.Area())            // 50 — value receiver, doesn't need explicit &

rect.Scale(2)                       // Go automatically takes &rect for pointer receiver
fmt.Println(rect.Width)             // 20 — the original WAS modified

// Calling a pointer-receiver method on a value works because Go inserts
// the & automatically IF the value is addressable (a local variable is;
// a map value or an interface value might not be — see gotchas below)
```

### Value Receiver vs Pointer Receiver — the Rule

```go
// RULE OF THUMB: if ANY method on a type needs a pointer receiver
// (to mutate, or to avoid copying a large struct), make ALL methods
// on that type use pointer receivers, for consistency

type Counter struct {
    count int
}

func (c *Counter) Increment() {     // must be pointer — mutates
    c.count++
}

func (c *Counter) Value() int {     // could be value receiver, but pointer
    return c.count                  // is used for consistency with Increment
}

// When value receivers make sense:
//   Small structs (a few primitive fields) where copying is cheap
//   Immutable data — you never need to mutate through the method
//   The type will be used as a map key or in other contexts requiring
//   value semantics

// Gotcha: methods with pointer receivers are NOT in a value type's
// method set when used via an interface — this trips people up:
type Shape interface {
    Area() float64
}

type Circle struct{ Radius float64 }
func (c *Circle) Area() float64 { return math.Pi * c.Radius * c.Radius }

var s Shape = Circle{Radius: 5}     // COMPILE ERROR: Circle does not implement
                                    // Shape (Area has pointer receiver)
var s2 Shape = &Circle{Radius: 5}   // OK — *Circle satisfies the interface
```

---

## Embedding — Composition Instead of Inheritance

Go has no `extends`/inheritance. Instead, structs can EMBED other structs, "promoting" their fields and methods.

```go
type Animal struct {
    Name string
}

func (a Animal) Describe() string {
    return "I am " + a.Name
}

type Dog struct {
    Animal        // embedded — no field name, just the type
    Breed string
}

d := Dog{
    Animal: Animal{Name: "Rex"},
    Breed:  "Labrador",
}

fmt.Println(d.Name)             // "Rex" — promoted field, accessed directly
fmt.Println(d.Describe())       // "I am Rex" — promoted method, accessed directly
fmt.Println(d.Animal.Name)      // also valid — explicit path always works

// Overriding a promoted method — just define one with the same name
func (d Dog) Describe() string {
    return "Woof! I am " + d.Name + " the " + d.Breed
}
fmt.Println(d.Describe())       // now calls Dog's own Describe, not Animal's

// Multiple embedding — a struct can embed several types
type Swimmer struct{}
func (s Swimmer) Swim() string { return "swimming" }

type Flyer struct{}
func (f Flyer) Fly() string { return "flying" }

type Duck struct {
    Animal
    Swimmer
    Flyer
}

duck := Duck{Animal: Animal{Name: "Donald"}}
fmt.Println(duck.Describe())        // from Animal
fmt.Println(duck.Swim())            // from Swimmer
fmt.Println(duck.Fly())             // from Flyer

// Ambiguity: if two embedded types have the same method/field name,
// you MUST disambiguate explicitly (d.Animal.Name vs d.OtherType.Name) —
// the compiler refuses to guess

// Interface satisfaction via embedding — a common pattern for extending
// behavior without reimplementing (e.g. wrapping an io.Reader)
type LoggingReader struct {
    io.Reader                       // embedding an INTERFACE, not just a struct — legal in Go
}
func (lr LoggingReader) Read(p []byte) (int, error) {
    n, err := lr.Reader.Read(p)
    fmt.Printf("read %d bytes\n", n)
    return n, err
}
```

---

## Struct Tags

```go
// Struct tags are metadata strings attached to fields, read via reflection —
// used pervasively for JSON/database/validation libraries

type User struct {
    ID       int    `json:"id" db:"id"`
    Name     string `json:"name" db:"full_name" validate:"required"`
    Email    string `json:"email,omitempty" db:"email"`
    Password string `json:"-" db:"password_hash"`    // "-" excludes from JSON
}

import "encoding/json"

u := User{ID: 1, Name: "Alice", Email: "alice@example.com", Password: "secret"}
data, _ := json.Marshal(u)
fmt.Println(string(data))
// {"id":1,"name":"Alice","email":"alice@example.com"}
// Password excluded due to json:"-"; Email included because it's non-empty
// (omitempty only omits when the field IS the zero value)
```

---

## Struct Comparison

```go
type Point struct{ X, Y int }

p1 := Point{1, 2}
p2 := Point{1, 2}
fmt.Println(p1 == p2)    // true — structs ARE comparable if all fields are comparable

// Structs containing slices/maps/functions are NOT comparable
type Container struct {
    Items []int
}
// c1 == c2             // COMPILE ERROR — Container has a non-comparable field (slice)

// Structs as map keys (requires full comparability)
visited := make(map[Point]bool)
visited[Point{1, 2}] = true
```

---

## Constructor Pattern

```go
// Go has no constructors — the idiomatic pattern is a New* function

type Server struct {
    host string
    port int
    tls  bool
}

func NewServer(host string, port int) *Server {
    return &Server{
        host: host,
        port: port,
        tls:  false,       // sensible default
    }
}

// Functional options pattern — for structs with many optional configurations
type ServerOption func(*Server)

func WithTLS() ServerOption {
    return func(s *Server) { s.tls = true }
}

func WithPort(port int) ServerOption {
    return func(s *Server) { s.port = port }
}

func NewServerWithOptions(host string, opts ...ServerOption) *Server {
    s := &Server{host: host, port: 8080}   // defaults
    for _, opt := range opts {
        opt(s)
    }
    return s
}

server := NewServerWithOptions("localhost", WithPort(443), WithTLS())
```

---

## Tips

- Follow the rule consistently: if any method on a type needs a pointer receiver, use pointer receivers for ALL its methods — mixed receiver types on the same type is a common source of subtle bugs.
- Struct embedding is Go's answer to "inheritance" — it's composition, not true inheritance (no polymorphic dispatch up a hierarchy), but it covers most of the same practical use cases cleanly.
- Use struct tags (`json:"..."`, `db:"..."`) for any struct that crosses a serialization boundary — this is how virtually every Go web framework and ORM works.
- The `New*` constructor function + functional options pattern is the idiomatic way to handle structs with many optional configuration parameters — you'll see this constantly in the standard library and popular packages.
- Remember a pointer-receiver method set doesn't include the value type when satisfying an interface — this compile error confuses almost everyone the first time they hit it.

---

## Summary

- `type Name struct { Field Type }` — create instances with named fields (`Name{Field: value}`), preferred over positional.
- Methods: `func (receiver Type) Name()` — value receiver copies, pointer receiver (`*Type`) mutates the original; be consistent across a type's methods.
- Embedding (`type Dog struct { Animal }`) promotes fields/methods — Go's composition-based alternative to inheritance; override by redefining the method name.
- Struct tags (`` `json:"name"` ``) provide metadata for reflection-based libraries — JSON, database mapping, validation.
- Structs are comparable with `==` only if every field is comparable (no slices/maps/functions).
- No constructors — the `New*` function pattern (optionally combined with functional options) is idiomatic Go.
