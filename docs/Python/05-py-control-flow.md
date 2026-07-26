---
title: "Control Flow"
sidebar_label: "Control Flow"
sidebar_position: 5
---

# Control Flow

if/elif/else, match/case, while, for, break/continue/pass, range, and comprehensions.

---

## if / elif / else

```python
# Basic if
x = 10
if x > 0:
    print("positive")

# if / else
if x % 2 == 0:
    print("even")
else:
    print("odd")

# if / elif / else — only first matching branch runs
score = 75
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
elif score >= 60:
    grade = "D"
else:
    grade = "F"
print(f"Grade: {grade}")

# One-liner (ternary expression)
status = "adult" if age >= 18 else "minor"

# Truthy / falsy in conditions
if name:               # truthy — non-empty string
    print(name)
if not items:          # falsy — empty list
    print("no items")
if data is not None:   # explicit None check
    process(data)

# Multiple conditions
if 18 <= age < 65 and country == "US":
    print("eligible")

# 'in' in conditions
if role in ("admin", "superuser"):
    allow_access()
```

---

## match / case (Python 3.10+)

Structural pattern matching — more powerful than switch/case in other languages.

```python
# Match a value
command = "quit"
match command:
    case "quit":
        print("Quitting")
    case "start":
        print("Starting")
    case "help":
        print("Showing help")
    case _:           # wildcard — matches anything (like default)
        print(f"Unknown command: {command}")

# Match with guard (if clause)
x = 15
match x:
    case n if n < 0:
        print("negative")
    case 0:
        print("zero")
    case n if n > 100:
        print("large")
    case n:
        print(f"small positive: {n}")

# Match tuples (structural)
point = (0, 5)
match point:
    case (0, 0):
        print("origin")
    case (x, 0):
        print(f"on x-axis at {x}")
    case (0, y):
        print(f"on y-axis at {y}")
    case (x, y):
        print(f"at ({x}, {y})")

# Match class instances
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(1, 2)
match p:
    case Point(x=0, y=0):
        print("origin")
    case Point(x=0, y=y):
        print(f"y-axis at {y}")
    case Point(x=x, y=y):
        print(f"at ({x}, {y})")

# Match sequences
command = ["move", 10, 20]
match command:
    case ["quit"]:
        quit()
    case ["move", x, y]:
        print(f"moving to ({x}, {y})")
    case ["fire"]:
        fire()
    case ["move", *rest]:
        print(f"move with args: {rest}")

# Match dicts (only specified keys need to match)
config = {"action": "save", "format": "json", "path": "/tmp/out.json"}
match config:
    case {"action": "save", "format": fmt, "path": path}:
        print(f"saving as {fmt} to {path}")
    case {"action": "load", "path": path}:
        print(f"loading from {path}")

# OR patterns
match status_code:
    case 400 | 401 | 403:
        print("client error")
    case 500 | 502 | 503:
        print("server error")
```

---

## while Loop

```python
# Basic while
count = 0
while count < 5:
    print(count)
    count += 1

# while with else — else runs when condition becomes False (not on break)
n = 10
while n > 0:
    n -= 1
else:
    print("done")   # runs after loop finishes normally

# Infinite loop with break
while True:
    user_input = input("Enter command (q to quit): ")
    if user_input == "q":
        break
    process(user_input)

# continue — skip to next iteration
i = 0
while i < 10:
    i += 1
    if i % 2 == 0:
        continue     # skip even numbers
    print(i)         # prints 1, 3, 5, 7, 9

# Countdown
n = 5
while n:            # n is truthy until 0
    print(n)
    n -= 1
```

---

## for Loop

```python
# Iterate over any iterable
for char in "hello":
    print(char)      # h e l l o

for item in [1, 2, 3]:
    print(item)

for key in {"a": 1, "b": 2}:
    print(key)       # a b

for key, val in {"a": 1, "b": 2}.items():
    print(f"{key}={val}")

# range()
for i in range(5):          # 0 1 2 3 4
    print(i)

for i in range(2, 8):       # 2 3 4 5 6 7
    print(i)

for i in range(0, 10, 2):   # 0 2 4 6 8  (step=2)
    print(i)

for i in range(10, 0, -1):  # 10 9 8 7 6 5 4 3 2 1  (countdown)
    print(i)

# enumerate — index + value
fruits = ["apple", "banana", "cherry"]
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")

for i, fruit in enumerate(fruits, start=1):  # start index at 1
    print(f"{i}: {fruit}")

# zip — multiple iterables together
names = ["Alice", "Bob", "Carol"]
ages = [30, 25, 35]
for name, age in zip(names, ages):
    print(f"{name} is {age}")

# zip stops at shortest iterable by default
# zip_longest pads with None
from itertools import zip_longest
for a, b in zip_longest([1,2,3], ["a","b"], fillvalue="?"):
    print(a, b)

# Nested for
for i in range(3):
    for j in range(3):
        print(f"({i},{j})", end=" ")
    print()

# for with else
for n in range(2, 10):
    if n % 2 == 0:
        print(f"{n} is even")
        break
else:
    print("no even number found")  # runs only if loop didn't break

# Iterate with index and reverse
for i in reversed(range(5)):       # 4 3 2 1 0
    print(i)

for item in sorted(["banana", "apple", "cherry"]):
    print(item)
```

---

## break, continue, pass

```python
# break — exit the loop immediately
for i in range(10):
    if i == 5:
        break
    print(i)    # 0 1 2 3 4

# continue — skip rest of current iteration
for i in range(10):
    if i % 2 == 0:
        continue
    print(i)    # 1 3 5 7 9

# pass — do nothing (placeholder for empty blocks)
if condition:
    pass        # TODO: implement later

for item in items:
    pass        # empty loop body

class EmptyClass:
    pass        # valid empty class

def stub_function():
    pass        # function that does nothing yet

# Nested loop control with labels (Python doesn't have labeled break)
# Use a flag variable or extract to a function
found = False
for i in range(5):
    for j in range(5):
        if i + j == 7:
            found = True
            break
    if found:
        break
```

---

## Comprehensions

The most Pythonic way to build collections from iterables.

### List Comprehensions

```python
# [expression for item in iterable if condition]

# Basic
squares = [x**2 for x in range(10)]      # [0,1,4,9,16,25,36,49,64,81]

# With condition (filter)
evens = [x for x in range(20) if x % 2 == 0]

# String transformation
words = ["hello", "world", "python"]
upper = [w.upper() for w in words]
lengths = [len(w) for w in words]

# Nested (flatten a 2D list)
matrix = [[1,2,3],[4,5,6],[7,8,9]]
flat = [n for row in matrix for n in row]  # [1,2,3,4,5,6,7,8,9]

# Multiple conditions
result = [x for x in range(50) if x % 2 == 0 if x % 3 == 0]  # [0,6,12,18,24,30,36,42,48]

# if/else expression inside comprehension
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ["even","odd","even","odd","even"]

# Nested list comprehension (matrix transpose)
matrix = [[1,2,3],[4,5,6],[7,8,9]]
transposed = [[row[i] for row in matrix] for i in range(3)]
```

### Dict Comprehensions

```python
# {key_expr: val_expr for item in iterable if condition}

squares = {n: n**2 for n in range(1, 6)}
# {1:1, 2:4, 3:9, 4:16, 5:25}

# Swap keys and values
d = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in d.items()}
# {1:"a", 2:"b", 3:"c"}

# Filter a dict
big = {k: v for k, v in d.items() if v > 1}

# From two lists
keys = ["name", "age", "city"]
vals = ["Alice", 30, "NYC"]
combined = {k: v for k, v in zip(keys, vals)}
```

### Set Comprehensions

```python
# {expression for item in iterable if condition}

unique_lengths = {len(word) for word in ["cat", "dog", "elephant", "ant"]}
# {3, 8}  — set of unique lengths

vowels = {c for c in "hello world" if c in "aeiou"}
# {"e", "o"}
```

### Generator Expressions

```python
# Like list comprehension but lazy — doesn't build the whole list in memory
# Use parentheses instead of square brackets

gen = (x**2 for x in range(1_000_000))  # no memory used yet
total = sum(x**2 for x in range(1_000_000))  # memory-efficient sum

# Pass directly to functions that consume iterables
print(sum(x for x in range(10) if x % 2 == 0))  # 20

# Convert to list if you need to reuse
lst = list(x**2 for x in range(5))
```

---

## Tips

- List comprehensions are faster than equivalent `for` + `append` loops — prefer them for transformations.
- Use generator expressions (`sum(x for x in ...)`) instead of list comprehensions when you only need to consume the result once — saves memory.
- `match/case` is better than long `if/elif` chains when matching the structure of data, not just values.
- `for/else` and `while/else` are Python-specific — the `else` branch runs when the loop completes normally (no `break`). Use for search patterns.
- `break` and `continue` apply only to the **innermost** loop — for nested loops, use a function and `return` instead.

---

## Summary

- `if/elif/else`: standard conditionals; `elif` chains replace switch-like patterns pre-3.10.
- `match/case` (3.10+): structural pattern matching — matches values, types, tuples, dicts, class attributes.
- `while`: loop while condition true; `for`: iterate over any iterable.
- `break`: exit loop; `continue`: skip to next iteration; `pass`: do nothing (placeholder).
- `range(start, stop, step)`: generate integer sequences.
- Comprehensions: `[expr for x in iterable if cond]` — concise, fast, Pythonic.
- Generator expressions: `(expr for x in iterable)` — lazy evaluation, memory-efficient.
