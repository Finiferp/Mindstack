---
title: "Operators"
sidebar_label: "Operators"
sidebar_position: 3
---

# Operators

All Python operators — arithmetic, assignment, comparison, logical, identity, membership, bitwise, and the ternary expression.


---

## Arithmetic Operators

```python
x, y = 10, 3

print(x + y)     # 13   addition
print(x - y)     # 7    subtraction
print(x * y)     # 30   multiplication
print(x / y)     # 3.333...  true division (always float)
print(x // y)    # 3    floor division (rounds toward -infinity)
print(x % y)     # 1    modulo (remainder)
print(x ** y)    # 1000 exponentiation

# Floor division behaviour with negatives
print(-7 // 2)   # -4  (rounds toward -infinity, not toward zero)
print(-7 % 2)    # 1   (always same sign as divisor)

# Useful combinations
print(divmod(10, 3))   # (3, 1) — quotient and remainder at once

# String and list repetition
print("ha" * 3)        # "hahaha"
print([0] * 5)         # [0, 0, 0, 0, 0]
```

---

## Assignment Operators

```python
x = 10          # assign
x += 5          # x = x + 5   → 15
x -= 3          # x = x - 3   → 12
x *= 2          # x = x * 2   → 24
x /= 4          # x = x / 4   → 6.0  (note: becomes float)
x //= 2         # x = x // 2  → 3.0
x %= 2          # x = x % 2   → 1.0
x **= 3         # x = x ** 3  → 1.0
x = 10
x &= 6          # x = x & 6   bitwise AND
x |= 4          # x = x | 4   bitwise OR
x ^= 2          # x = x ^ 2   bitwise XOR
x >>= 1         # x = x >> 1  right shift
x <<= 2         # x = x << 2  left shift

# Walrus operator := (Python 3.8+) — assign AND use in one expression
import re
text = "Order #1234"
if m := re.search(r"\d+", text):
    print(f"Found number: {m.group()}")   # Found number: 1234

# Useful in while loops
data = [1, 2, 3, 4, 5]
while chunk := data[:2]:
    print(chunk)
    data = data[2:]
```

---

## Comparison Operators

```python
x, y = 5, 10

print(x == y)    # False  equal to
print(x != y)    # True   not equal to
print(x > y)     # False  greater than
print(x < y)     # True   less than
print(x >= y)    # False  greater than or equal
print(x <= y)    # True   less than or equal

# Chained comparisons — unique to Python
age = 25
print(18 <= age < 65)      # True (adult, working age)
print(0 < x < 10 < y)     # True

# Comparing different types
print(1 == 1.0)    # True  (int and float compared by value)
print(1 == True)   # True  (bool is subclass of int)
print(0 == False)  # True

# Object identity vs equality
a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b)      # True  (same contents)
print(a is b)      # False (different objects in memory)
print(a is c)      # True  (same object)
print(id(a) == id(c))  # True (same memory address)
```

---

## Logical Operators

```python
# and, or, not
print(True and True)    # True
print(True and False)   # False
print(True or False)    # True
print(False or False)   # False
print(not True)         # False
print(not False)        # True

# Short-circuit evaluation
def side_effect():
    print("called!")
    return True

False and side_effect()    # side_effect() NOT called
True or side_effect()      # side_effect() NOT called
True and side_effect()     # side_effect() IS called → "called!"

# 'and' and 'or' return values, not just True/False
print(0 or "default")     # "default"   (0 is falsy, returns second operand)
print("" or "fallback")   # "fallback"
print("hello" or "other") # "hello"     (truthy first operand returned)
print(5 and 10)            # 10          (both truthy; returns last)
print(0 and 10)            # 0           (0 is falsy; short-circuits)

# Common pattern: default values
name = user_input or "Anonymous"
config = provided_config or default_config

# 'not' always returns True or False
print(not 0)       # True
print(not "")      # True
print(not [])      # True
print(not "hello") # False
```

---

## Identity Operators

```python
# 'is' checks if two variables point to the SAME object (same id())
# '==' checks if two variables have the SAME VALUE

a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a is b)       # False — different list objects
print(a is c)       # True  — same object
print(a is not b)   # True

# Always use 'is' for None, True, False comparisons
x = None
if x is None:       # correct
    pass
if x == None:       # works but not idiomatic (PEP 8 says use 'is')
    pass

# Small integers and strings are cached (interned) — don't rely on this
x = 256
y = 256
print(x is y)   # True  (CPython caches -5 to 256)
x = 257
y = 257
print(x is y)   # False (may vary by implementation)
```

---

## Membership Operators

```python
# 'in' and 'not in' — test membership in a sequence or collection

# Strings
print("ell" in "hello")        # True
print("xyz" not in "hello")    # True

# Lists — O(n) linear scan
fruits = ["apple", "banana", "cherry"]
print("apple" in fruits)        # True
print("grape" not in fruits)    # True

# Tuples — O(n)
print(2 in (1, 2, 3))           # True

# Sets — O(1) average (hash-based)
numbers = {1, 2, 3, 4, 5}
print(3 in numbers)              # True

# Dicts — checks KEYS by default — O(1)
d = {"a": 1, "b": 2}
print("a" in d)                  # True  (key check)
print(1 in d)                    # False (1 is a value, not a key)
print(1 in d.values())           # True

# Ranges
print(5 in range(0, 10))         # True  — O(1) for ranges!
```

---

## Bitwise Operators

```python
a = 0b1010   # 10
b = 0b1100   # 12

print(a & b)    # 8  = 0b1000  AND
print(a | b)    # 14 = 0b1110  OR
print(a ^ b)    # 6  = 0b0110  XOR (bits differ)
print(~a)       # -11 (bitwise NOT; flips all bits; ~n = -(n+1))
print(a << 1)   # 20 = 0b10100 left shift by 1 (multiply by 2)
print(a >> 1)   # 5  = 0b0101  right shift by 1 (floor divide by 2)

# Practical uses
# Check if a number is even/odd
n = 42
print(n & 1 == 0)    # True — even (last bit is 0)
print(n & 1 == 1)    # False — odd

# Multiply/divide by powers of 2 (fast)
print(5 << 3)   # 40  (5 * 8)
print(40 >> 3)  # 5   (40 // 8)

# Flags / bitmasks
READ    = 0b001   # 1
WRITE   = 0b010   # 2
EXECUTE = 0b100   # 4

permissions = READ | WRITE    # 3 = 0b011
print(permissions & READ != 0)    # True — has read
print(permissions & EXECUTE != 0) # False — no execute
permissions |= EXECUTE             # add execute
permissions &= ~WRITE              # remove write
```

---

## Ternary (Conditional) Expression

```python
# value_if_true if condition else value_if_false
x = 10
result = "positive" if x > 0 else "non-positive"
print(result)   # positive

# Nested ternary (use sparingly — readability suffers)
grade = "A" if x >= 90 else "B" if x >= 80 else "C"

# Common patterns
age = 20
status = "adult" if age >= 18 else "minor"

# In function arguments
print("even" if x % 2 == 0 else "odd")

# Equivalent to:
if x > 0:
    result = "positive"
else:
    result = "non-positive"
```

---

## Operator Precedence (High to Low)

```python
# From highest to lowest precedence:
# ()                    — parentheses (override everything)
# **                    — exponentiation (right-to-left)
# +x, -x, ~x           — unary operators
# *, /, //, %           — multiplication, division, floor div, modulo
# +, -                  — addition, subtraction
# <<, >>                — bitwise shifts
# &                     — bitwise AND
# ^                     — bitwise XOR
# |                     — bitwise OR
# ==, !=, <, >, <=, >=, is, is not, in, not in  — comparisons
# not                   — logical NOT
# and                   — logical AND
# or                    — logical OR
# := (walrus)           — assignment expression (lowest)

# Examples
print(2 + 3 * 4)         # 14 (not 20) — * before +
print((2 + 3) * 4)       # 20 — parentheses first
print(2 ** 3 ** 2)       # 512 (not 64) — ** is right-to-left: 2 ** (3**2) = 2**9
print(-2 ** 2)            # -4 (not 4) — unary - applied after **
print((-2) ** 2)          # 4
print(True + True * False)  # 1 — * before +
print(not True or False)    # False — not before or
```

---

## Tips

- `//` (floor division) always rounds toward negative infinity: `-7 // 2 == -4`, not `-3`.
- `or` and `and` return one of their operands, not necessarily `True`/`False` — use this for default values: `x = value or default`.
- Use `is` only for `None`, `True`, `False` — never for comparing integers or strings in production code.
- `**` is right-associative: `2 ** 3 ** 2` = `2 ** 9` = 512, not `8 ** 2` = 64.
- The walrus operator `:=` is powerful in `while` loops and comprehension filters — keeps assignment close to use.

---

## Summary

- Arithmetic: `+ - * / // % **` — `/` always returns float; `//` floors toward `-inf`.
- Assignment shortcuts: `+= -= *= /= //= %= **=` plus bitwise variants.
- Comparison: `== != < > <= >=` — chainable: `0 < x < 10`.
- Logical: `and or not` — short-circuit; return operand values, not just booleans.
- Identity: `is` / `is not` — compares object identity; use only for `None`/`True`/`False`.
- Membership: `in` / `not in` — O(1) for sets/dicts, O(n) for lists, O(1) for ranges.
- Ternary: `value_if_true if condition else value_if_false`.
