---
title: "Python Basics"
sidebar_label: "Basics"
sidebar_position: 1
---

# Python Basics

Syntax, output, comments, variables, data types, numbers, casting, booleans, None, and user input — everything before collections and control flow.

---

## Syntax Rules

```python
# Python uses INDENTATION to define code blocks (not braces)
# Standard: 4 spaces per indent level (never mix tabs and spaces)

if 5 > 2:
    print("Five is greater")   # this line is inside the if block
    print("Still inside")      # same block
print("Outside the block")     # dedented = outside

# Statements end at the end of the line (no semicolons needed)
x = 5
y = 10

# Multiple statements on one line (avoid unless trivial)
x = 5; y = 10

# Line continuation — backslash or open bracket
total = 1 + 2 + \
        3 + 4

total = (1 + 2 +
         3 + 4)   # preferred — parentheses allow multi-line

# Python is case-sensitive
name = "Alice"
Name = "Bob"    # different variable!

# Naming conventions
my_variable = 1         # snake_case for variables and functions
MY_CONSTANT = 100       # SCREAMING_SNAKE_CASE for constants
MyClass = ...           # PascalCase for classes
_private = ...          # leading underscore = private by convention
__dunder__ = ...        # double underscores = special/magic methods
```

---

## Output

```python
# print() — the standard output function
print("Hello, World!")
print("Hello", "World")          # multiple args, space-separated
print("Hello", "World", sep="-") # Hello-World
print("Hello", end="")           # no newline at end (default end="\n")
print()                           # just a newline

# Variables in print
name = "Alice"
age = 30
print(name, age)                  # Alice 30
print(name + " is " + str(age))  # Alice is 30 (must convert to str)

# f-strings (recommended, Python 3.6+)
print(f"Hello, {name}! You are {age} years old.")
print(f"{2 + 2}")                 # 4 — expressions inside {}
print(f"{name.upper()}")          # ALICE — method calls inside {}
print(f"{age:.2f}")               # 30.00 — format specifier
print(f"{'hello':>10}")           # "     hello" — right-align in 10 chars
print(f"{'hello':^10}")           # "  hello   " — centered
print(f"{1000000:,}")             # 1,000,000 — thousands separator
print(f"{0.12345:.2%}")           # 12.35% — percentage

# Other formatting methods
print("Hello, {}!".format(name))
print("Hello, {0}! {0} again.".format(name))
print("Hello, {name}!".format(name="Alice"))
print("%s is %d years old" % (name, age))   # old style (avoid)

# Print to stderr
import sys
print("Error!", file=sys.stderr)
```

---

## Comments

```python
# Single-line comment

x = 5  # inline comment

"""
Multi-line string used as a block comment (not a real comment — creates a string object)
Best practice: use # for each line instead
"""

# TODO: add error handling
# FIXME: this breaks with empty input
# NOTE: see issue #123

def my_function():
    """
    Docstring — describes what the function does.
    This IS stored as __doc__ and shown by help().
    First line: brief summary.
    
    Args:
        None
    
    Returns:
        None
    """
    pass
```

---

## Variables

```python
# Assignment — no declaration needed; type inferred from value
x = 5
name = "Alice"
is_active = True

# Multiple assignment
a, b, c = 1, 2, 3
x = y = z = 0       # all three equal to 0

# Swap without temp variable
a, b = b, a

# Augmented assignment
x = 10
x += 5    # x = 15
x -= 3    # x = 12
x *= 2    # x = 24
x //= 5   # x = 4 (floor division)
x **= 2   # x = 16 (power)
x %= 3    # x = 1 (remainder)

# Variable names — rules
valid_name = 1
_also_valid = 2
CamelCase = 3
name2 = 4
# 2name = 5   # ERROR: cannot start with digit
# my-var = 5  # ERROR: hyphens not allowed

# Delete a variable
del x
# print(x)  # NameError: name 'x' is not defined

# Check if variable exists
try:
    print(x)
except NameError:
    print("x is not defined")

# Global variables
count = 0

def increment():
    global count      # must declare global to modify
    count += 1

increment()
print(count)  # 1

# nonlocal (for nested functions)
def outer():
    x = 10
    def inner():
        nonlocal x
        x += 1
    inner()
    print(x)  # 11
```

---

## Data Types

```python
# Python's built-in types
print(type(42))           # int
print(type(3.14))         # float
print(type(3+2j))         # complex
print(type("hello"))      # str
print(type(True))         # bool
print(type(None))         # NoneType
print(type([1,2,3]))      # list
print(type((1,2,3)))      # tuple
print(type({1,2,3}))      # set
print(type({"a":1}))      # dict
print(type(b"bytes"))     # bytes
print(type(bytearray(3))) # bytearray
print(type(range(5)))     # range

# isinstance() — check type (preferred over type() ==)
x = 42
print(isinstance(x, int))        # True
print(isinstance(x, (int, float))) # True — check against multiple

# type() for exact type check (doesn't account for inheritance)
print(type(x) == int)   # True
```

---

## Numbers

```python
# Integers — unlimited precision
x = 42
x = -17
x = 1_000_000      # underscores for readability
x = 0xFF           # hexadecimal = 255
x = 0o77           # octal = 63
x = 0b1010         # binary = 10

# Floats
y = 3.14
y = -0.5
y = 1.5e2          # scientific: 150.0
y = 1.5e-2         # 0.015
y = float('inf')   # positive infinity
y = float('nan')   # not a number

# Complex
z = 3 + 2j
z.real             # 3.0
z.imag             # 2.0

# Arithmetic
print(10 + 3)      # 13  addition
print(10 - 3)      # 7   subtraction
print(10 * 3)      # 30  multiplication
print(10 / 3)      # 3.333...  true division (always float)
print(10 // 3)     # 3   floor division (integer result)
print(10 % 3)      # 1   modulo (remainder)
print(10 ** 3)     # 1000  power

# Math functions (built-in)
abs(-5)            # 5
round(3.7)         # 4
round(3.567, 2)    # 3.57
max(1, 2, 3)       # 3
min(1, 2, 3)       # 1
sum([1, 2, 3])     # 6
pow(2, 10)         # 1024

# Integer methods
(255).bit_length() # 8
(10).to_bytes(2, byteorder='big')  # b'\x00\n'

# Float issues (IEEE 754)
print(0.1 + 0.2)           # 0.30000000000000004
print(0.1 + 0.2 == 0.3)   # False!
# Use decimal for exact arithmetic:
from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2"))  # 0.3 (exact)

# Number limits
import sys
sys.maxsize          # 9223372036854775807 on 64-bit
float('inf') > 1e308  # True — inf is bigger than any float
```

---

## Type Casting

```python
# Convert between types explicitly
int("42")          # 42  (str → int)
int("FF", 16)      # 255 (hex string → int)
int(3.9)           # 3   (float → int, truncates toward zero!)
int(True)          # 1
int(False)         # 0

float("3.14")      # 3.14
float(42)          # 42.0
float("inf")       # inf

str(42)            # "42"
str(3.14)          # "3.14"
str(True)          # "True"
str([1,2,3])       # "[1, 2, 3]"

bool(0)            # False  — zero is falsy
bool(1)            # True
bool(-1)           # True  — any non-zero is truthy
bool("")           # False — empty string is falsy
bool("hello")      # True
bool([])           # False — empty list is falsy
bool([0])          # True  — list with one element
bool(None)         # False

list("hello")      # ['h','e','l','l','o']
list((1,2,3))      # [1,2,3]  tuple → list
list({1,2,3})      # [1,2,3]  set → list (order not guaranteed)

tuple([1,2,3])     # (1,2,3)
set([1,1,2,3])     # {1,2,3}  (removes duplicates)

# Falsy values in Python (evaluate to False in boolean context):
# False, None, 0, 0.0, 0j, "", [], (), {}, set(), range(0)
# Everything else is truthy
```

---

## Booleans

```python
True   # capital T
False  # capital F

# Boolean operations
True and False   # False
True or False    # True
not True         # False

# Short-circuit evaluation
False and risky_fn()   # risky_fn() NOT called
True or risky_fn()     # risky_fn() NOT called

# Comparison operators return bool
print(5 > 3)    # True
print(5 == 5)   # True
print(5 != 3)   # True
print(5 >= 5)   # True
print(5 <= 4)   # False

# Chained comparisons (unique to Python)
x = 5
print(1 < x < 10)      # True — equivalent to 1 < x and x < 10
print(0 <= x <= 10)     # True

# any() and all()
any([False, False, True])   # True  — at least one truthy
all([True, True, True])     # True  — all truthy
all([True, False, True])    # False

# bool is a subclass of int
True + True    # 2
True * 5       # 5
sum([True, False, True, True])  # 3 — count True values
```

---

## None

```python
# None represents the absence of a value (like null in other languages)
x = None
print(x)           # None
print(type(x))     # NoneType

# Check for None — always use 'is', never '=='
if x is None:
    print("x is None")

if x is not None:
    print("x has a value")

# Functions return None by default
def no_return():
    pass

result = no_return()
print(result)      # None
print(result is None)  # True

# Common pattern — optional parameter default
def greet(name=None):
    if name is None:
        name = "World"
    print(f"Hello, {name}!")

greet()            # Hello, World!
greet("Alice")     # Hello, Alice!

# None is falsy
if not None:
    print("None is falsy")   # prints

# None vs False vs 0 vs ""
print(None == False)   # False
print(None == 0)       # False
print(None is None)    # True  — None is a singleton
```

---

## User Input

```python
# input() — always returns a string
name = input("Enter your name: ")
print(f"Hello, {name}!")

# Convert to other types
age = int(input("Enter your age: "))
price = float(input("Enter price: "))

# Handle invalid input
while True:
    try:
        age = int(input("Enter your age: "))
        break
    except ValueError:
        print("Please enter a valid number")

# Multiple inputs on one line
x, y = input("Enter two numbers separated by space: ").split()
x, y = int(x), int(y)

# Or with map
x, y = map(int, input("Enter two numbers: ").split())
```

---

## Tips

- Use f-strings for all string formatting — cleaner, faster, and more readable than `.format()` or `%`.
- `isinstance(x, int)` is better than `type(x) == int` — it handles inheritance correctly.
- `int()` truncates toward zero, not toward negative infinity — `int(-3.9)` is `-3`, not `-4`. Use `math.floor()` for floor behavior.
- Always check for `None` with `is None`, never `== None` — it's faster and semantically correct.
- The falsy values are worth memorising: `False, None, 0, 0.0, "", [], (), {}, set()`.

---

## Summary

- Python uses indentation (4 spaces) for code blocks — no braces.
- `print(f"Hello {name}")` — f-strings are the modern way to format strings.
- Variables need no declaration; type is inferred. `a, b = 1, 2` for multiple assignment.
- Numbers: `int` (unlimited), `float` (IEEE 754), `complex`. `10/3 = 3.333`, `10//3 = 3`, `10**3 = 1000`.
- Casting: `int()`, `float()`, `str()`, `bool()`, `list()`, `tuple()`, `set()`.
- `None` is the null value — always compare with `is None`, never `== None`.
- `input()` always returns a string — convert with `int()`, `float()` as needed.
