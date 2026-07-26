---
title: "Strings"
sidebar_label: "Strings"
sidebar_position: 2
---

# Strings

Python strings are immutable sequences of Unicode characters. They are one of Python's most-used types and come with a rich set of methods.


---

## Creating Strings

```python
s1 = 'single quotes'
s2 = "double quotes"
s3 = """triple double quotes
span multiple lines"""
s4 = '''triple single quotes
also multi-line'''

# Raw strings — backslashes not treated as escape characters
path = r"C:\Users\Alice\Documents"
regex = r"\d+\.\d+"

# Byte strings
b = b"bytes"                 # bytes object, not str
b = b"\x48\x65\x6c\x6c\x6f"  # b"Hello"

# Repeated string
s = "ha" * 3                 # "hahaha"

# String from a list
s = "".join(["a", "b", "c"]) # "abc"
s = ", ".join(["one", "two", "three"])  # "one, two, three"
```

---

## Indexing and Slicing

```python
s = "Hello, World!"

# Indexing — zero-based; negative counts from end
print(s[0])    # H
print(s[-1])   # !
print(s[-6])   # W

# Slicing — s[start:stop:step]  (stop is exclusive)
print(s[0:5])    # Hello
print(s[7:12])   # World
print(s[:5])     # Hello    (start defaults to 0)
print(s[7:])     # World!   (stop defaults to end)
print(s[:])      # Hello, World!  (full copy)
print(s[::2])    # Hlo ol!  (every 2nd char)
print(s[::-1])   # !dlroW ,olleH  (reverse)

# Length
print(len(s))    # 13

# in / not in
print("World" in s)      # True
print("Python" not in s) # True
```

---

## Escape Characters

```python
# Common escape sequences
print("Hello\nWorld")    # newline
print("Hello\tWorld")    # tab
print("Say \"hi\"")      # embedded quotes
print("Back\\slash")     # backslash
print("Line 1\r\nLine 2") # Windows CRLF
print("\u0041")           # Unicode: A
print("\U0001F600")       # Unicode emoji: 😀
print("\x41")             # hex: A

# Raw strings avoid escape processing
import re
pattern = r"\d+\.\d+"    # matches numbers like 3.14
```

---

## f-Strings (Formatted String Literals)

```python
name = "Alice"
age = 30
pi = 3.14159

# Basic interpolation
print(f"Hello, {name}!")             # Hello, Alice!

# Expressions inside {}
print(f"2 + 2 = {2 + 2}")           # 2 + 2 = 4
print(f"{name.upper()}")             # ALICE
print(f"{len(name)} chars")          # 5 chars

# Format specifiers
print(f"{pi:.2f}")                   # 3.14      (2 decimal places)
print(f"{pi:.4f}")                   # 3.1416
print(f"{1000000:,}")                # 1,000,000 (thousands separator)
print(f"{0.1234:.1%}")               # 12.3%     (percentage)
print(f"{255:08b}")                  # 11111111  (binary, 8 chars, zero-padded)
print(f"{255:x}")                    # ff        (hex)
print(f"{255:X}")                    # FF        (hex uppercase)
print(f"{42:05d}")                   # 00042     (zero-padded integer)
print(f"{name:>10}")                 # "     Alice" (right-align, width 10)
print(f"{name:<10}")                 # "Alice     " (left-align)
print(f"{name:^10}")                 # "  Alice   " (centre)
print(f"{name:*^10}")                # "**Alice***" (centre, fill with *)

# Debug shorthand (Python 3.8+)
x = 42
print(f"{x=}")                       # x=42  (shows name and value)

# Multi-line f-string
message = (
    f"Name: {name}\n"
    f"Age: {age}\n"
    f"Pi: {pi:.2f}"
)
```

---

## String Methods — Complete Reference

```python
s = "  Hello, World!  "

# Case
s.upper()               # "  HELLO, WORLD!  "
s.lower()               # "  hello, world!  "
s.title()               # "  Hello, World!  "
s.capitalize()          # "  hello, world!  " (only first char of whole string)
s.swapcase()            # "  hELLO, wORLD!  "
s.casefold()            # aggressive lowercase (for case-insensitive comparison)

# Stripping whitespace
s.strip()               # "Hello, World!"   (both ends)
s.lstrip()              # "Hello, World!  " (left only)
s.rstrip()              # "  Hello, World!" (right only)
"xxhelloxx".strip("x")  # "hello"           (strip specific chars)

# Searching
s.find("World")         # 9  (index of first occurrence, or -1 if not found)
s.rfind("l")            # 11 (last occurrence)
s.index("World")        # 9  (like find but raises ValueError if not found)
s.count("l")            # 3  (count occurrences)
s.startswith("  H")    # True
s.endswith("!  ")      # True

# Replacing
s.replace("World", "Python")    # "  Hello, Python!  "
s.replace("l", "L", 2)         # replace first 2 occurrences

# Splitting
"a,b,c".split(",")             # ["a", "b", "c"]
"a,b,,c".split(",")            # ["a", "b", "", "c"]
"a,b,c".split(",", 1)         # ["a", "b,c"] (max 1 split)
"hello world".split()          # ["hello", "world"] (split on whitespace)
"line1\nline2\nline3".splitlines() # ["line1", "line2", "line3"]
"a,b,c".rsplit(",", 1)        # ["a,b", "c"]

# Checking content
"hello".isalpha()       # True  (only letters)
"hello123".isalnum()    # True  (letters or digits)
"123".isdigit()         # True  (only digits)
"123".isnumeric()       # True  (digits + numeric chars like ²)
"123".isdecimal()       # True  (only 0-9)
" ".isspace()           # True
"Hello World".istitle() # True
"HELLO".isupper()       # True
"hello".islower()       # True
"hello".isidentifier()  # True (valid Python identifier)
"".isalpha()            # False (empty string)

# Padding
"hello".ljust(10)        # "hello     "
"hello".rjust(10)        # "     hello"
"hello".center(11)       # "   hello   "
"hello".ljust(10, "-")   # "hello-----"
"42".zfill(5)            # "00042"

# Encoding
"hello".encode("utf-8")  # b"hello" (bytes)
b"hello".decode("utf-8") # "hello"  (str)

# Other
"hello".expandtabs(4)    # replace \t with spaces
chr(65)                   # "A" (int → char)
ord("A")                  # 65  (char → int)
" ".join(["a", "b", "c"]) # "a b c"
```

---

## String Formatting Comparison

```python
name = "Alice"
score = 95.678

# 1. f-strings (recommended, Python 3.6+)
f"Name: {name}, Score: {score:.1f}"

# 2. str.format()
"Name: {}, Score: {:.1f}".format(name, score)
"Name: {n}, Score: {s:.1f}".format(n=name, s=score)

# 3. % formatting (old style — avoid in new code)
"Name: %s, Score: %.1f" % (name, score)

# 4. Template strings (safe for user-provided strings)
from string import Template
t = Template("Name: $name, Score: $score")
t.substitute(name=name, score=score)
```

---

## Common String Patterns

```python
# Reverse a string
s = "Hello"
reversed_s = s[::-1]           # "olleH"
reversed_s = "".join(reversed(s))  # same

# Check palindrome
def is_palindrome(s):
    s = s.lower().replace(" ", "")
    return s == s[::-1]

# Count words
sentence = "the quick brown fox"
word_count = len(sentence.split())   # 4

# Remove duplicates from string (preserve order)
seen = set()
result = "".join(c for c in "hello" if not (c in seen or seen.add(c)))

# Truncate with ellipsis
def truncate(s, max_len):
    return s if len(s) <= max_len else s[:max_len-3] + "..."

# Wrap text
import textwrap
wrapped = textwrap.fill("long text here...", width=40)
```

---

## Tips

- Strings are immutable — methods return new strings, never modify in place.
- Use `"hello" in text` for substring checking — faster and more readable than `.find()`.
- `str.split()` (no argument) splits on any whitespace and removes empty strings — useful for parsing.
- `"".join(list)` is the fastest way to concatenate many strings — never use `+=` in a loop.
- Use `s.strip()` when reading user input or file lines to remove accidental whitespace.
- `casefold()` is more aggressive than `lower()` for case-insensitive comparison of international text.

---

## Summary

- Strings are immutable Unicode sequences; single, double, or triple quotes.
- Slicing: `s[start:stop:step]` — `s[::-1]` reverses, `s[:5]` first 5 chars.
- f-strings: `f"Hello {name}"` — support expressions and format specifiers like `{pi:.2f}`.
- Key methods: `strip()`, `split()`, `join()`, `replace()`, `find()`, `upper()`/`lower()`, `startswith()`/`endswith()`.
- Encoding: `str.encode("utf-8")` → `bytes`; `bytes.decode("utf-8")` → `str`.
