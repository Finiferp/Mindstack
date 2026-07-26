---
title: "Functions"
sidebar_label: "Functions"
sidebar_position: 6
---

# Functions

Defining functions, all argument types, scope, lambda, decorators, recursion, and generators.


---

## Defining Functions

```python
# Basic function
def greet(name):
    """Greet a person by name."""   # docstring
    print(f"Hello, {name}!")

greet("Alice")

# Return a value
def add(a, b):
    return a + b

result = add(3, 4)   # 7

# Return multiple values (actually returns a tuple)
def min_max(lst):
    return min(lst), max(lst)

lo, hi = min_max([3, 1, 4, 1, 5, 9])   # lo=1, hi=9

# Return None explicitly or implicitly
def do_nothing():
    pass   # returns None

def early_return(x):
    if x < 0:
        return   # returns None early
    return x * 2
```

---

## Parameters and Arguments

```python
# Positional arguments — must be in order
def describe(name, age, city):
    print(f"{name}, {age}, from {city}")

describe("Alice", 30, "NYC")

# Keyword arguments — order doesn't matter
describe(city="NYC", name="Alice", age=30)

# Default parameter values
def greet(name, greeting="Hello"):
    print(f"{greeting}, {name}!")

greet("Alice")             # Hello, Alice!
greet("Bob", "Hi")         # Hi, Bob!
greet("Carol", greeting="Hey")   # Hey, Carol!

# IMPORTANT: never use mutable defaults
def bad(lst=[]):           # BAD — shared across all calls!
    lst.append(1)
    return lst

def good(lst=None):        # GOOD — create new list each time
    if lst is None:
        lst = []
    lst.append(1)
    return lst

# *args — variable positional arguments (collected as a tuple)
def add_all(*args):
    return sum(args)

add_all(1, 2, 3)           # 6
add_all(1, 2, 3, 4, 5)    # 15

# **kwargs — variable keyword arguments (collected as a dict)
def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print_info(name="Alice", age=30, city="NYC")

# Combining all parameter types
# Order: positional, *args, keyword-only, **kwargs
def func(a, b, *args, keyword_only, **kwargs):
    print(a, b, args, keyword_only, kwargs)

func(1, 2, 3, 4, keyword_only="required", extra="data")
# 1 2 (3, 4) required {'extra': 'data'}

# Keyword-only parameters (after *)
def config(*, host="localhost", port=8080, debug=False):
    print(f"{host}:{port}, debug={debug}")

config(port=3000)               # works — all keyword-only
# config("myhost")              # TypeError — no positional args allowed

# Positional-only parameters (before /, Python 3.8+)
def divide(a, b, /):
    return a / b

divide(10, 2)                   # works
# divide(a=10, b=2)            # TypeError — must be positional

# Full signature
def full(pos_only, /, standard, *, kw_only):
    pass
```

---

## Unpacking Arguments

```python
def add(a, b, c):
    return a + b + c

# Unpack list/tuple into positional args
nums = [1, 2, 3]
print(add(*nums))             # 6

# Unpack dict into keyword args
params = {"a": 1, "b": 2, "c": 3}
print(add(**params))          # 6

# Mix
print(add(1, *[2, 3]))       # 6
print(add(*[1, 2], c=3))     # 6

# Forward all args to another function
def wrapper(*args, **kwargs):
    print("before")
    result = add(*args, **kwargs)
    print("after")
    return result
```

---

## Scope (LEGB Rule)

```python
# Python resolves names in this order:
# L — Local (inside current function)
# E — Enclosing (outer functions, for closures)
# G — Global (module level)
# B — Built-in (Python builtins: print, len, range, etc.)

x = "global"

def outer():
    x = "enclosing"

    def inner():
        x = "local"
        print(x)    # local
    inner()
    print(x)        # enclosing

outer()
print(x)            # global

# global keyword — modify global from inside function
count = 0

def increment():
    global count
    count += 1

increment()
print(count)   # 1

# nonlocal keyword — modify enclosing scope variable
def make_counter():
    count = 0
    def counter():
        nonlocal count
        count += 1
        return count
    return counter

c = make_counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3
```

---

## Lambda Functions

Anonymous one-expression functions.

```python
# lambda parameters: expression
square = lambda x: x ** 2
print(square(5))     # 25

add = lambda a, b: a + b
print(add(3, 4))     # 7

# Most common use: as key argument to sorted/min/max/filter/map
students = [
    {"name": "Alice", "grade": 90},
    {"name": "Bob",   "grade": 85},
    {"name": "Carol", "grade": 92},
]
sorted_by_grade = sorted(students, key=lambda s: s["grade"])
best = max(students, key=lambda s: s["grade"])

# map() — apply function to every element
nums = [1, 2, 3, 4, 5]
doubled = list(map(lambda x: x * 2, nums))    # [2,4,6,8,10]
# Prefer list comprehension: [x*2 for x in nums]

# filter() — keep elements where function returns True
evens = list(filter(lambda x: x % 2 == 0, nums))  # [2,4]
# Prefer: [x for x in nums if x % 2 == 0]

# sorted with multiple keys
data = [("Alice", 30), ("Bob", 25), ("Alice", 25)]
sorted_data = sorted(data, key=lambda x: (x[0], x[1]))

# Lambda in dict of functions
ops = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
}
print(ops["+"](3, 4))   # 7
```

---

## Decorators

A decorator wraps a function to add behaviour before or after it.

```python
import functools
import time

# Basic decorator pattern
def my_decorator(func):
    @functools.wraps(func)   # preserves func.__name__, __doc__
    def wrapper(*args, **kwargs):
        print("before")
        result = func(*args, **kwargs)
        print("after")
        return result
    return wrapper

@my_decorator
def say_hello():
    print("hello!")

say_hello()
# before
# hello!
# after

# Equivalent to: say_hello = my_decorator(say_hello)

# Timing decorator
def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(0.1)

# Decorator with arguments
def repeat(n):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(n):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)
def greet():
    print("Hello!")

greet()   # prints "Hello!" 3 times

# Stacking decorators (applied bottom-up)
@timer
@repeat(2)
def my_func():
    pass
# equivalent to: my_func = timer(repeat(2)(my_func))

# Class-based decorator
class Retry:
    def __init__(self, times=3):
        self.times = times

    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(self.times):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == self.times - 1:
                        raise
                    print(f"Retry {attempt + 1}/{self.times}")
        return wrapper

@Retry(times=3)
def flaky_api_call():
    pass

# Built-in decorators
class MyClass:
    @staticmethod
    def static_method():
        pass   # no self — doesn't access instance

    @classmethod
    def class_method(cls):
        pass   # cls = the class itself, not an instance

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, v):
        self._value = v
```

---

## Recursion

```python
# Factorial
def factorial(n):
    if n <= 1:      # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))   # 120

# Fibonacci
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)   # slow — O(2^n) without memoisation

# With memoisation
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)   # O(n) with cache

# Python default recursion limit
import sys
print(sys.getrecursionlimit())   # 1000
sys.setrecursionlimit(5000)      # increase if needed

# Tail recursion not optimised in Python — use iteration for deep recursion
def factorial_iter(n):
    result = 1
    for i in range(2, n+1):
        result *= i
    return result
```

---

## Generators

Functions that yield values one at a time — memory-efficient sequences.

```python
# Generator function — uses yield instead of return
def count_up(n):
    i = 0
    while i < n:
        yield i       # pause, return value, resume on next()
        i += 1

gen = count_up(5)
print(next(gen))   # 0
print(next(gen))   # 1
for val in count_up(3):
    print(val)     # 0 1 2

# Infinite generator
def integers():
    n = 0
    while True:
        yield n
        n += 1

import itertools
first_ten = list(itertools.islice(integers(), 10))

# yield from — delegate to another iterable
def chain(*iterables):
    for it in iterables:
        yield from it

list(chain([1,2], [3,4], [5]))   # [1,2,3,4,5]

# Generator expression (lazy list comprehension)
squares = (x**2 for x in range(1_000_000))   # no memory used
total = sum(x**2 for x in range(1_000_000))  # efficient

# send() — two-way communication with generator
def accumulator():
    total = 0
    while True:
        value = yield total   # yield sends total out; receives value in
        if value is None:
            break
        total += value

gen = accumulator()
next(gen)           # prime the generator (advance to first yield)
gen.send(10)        # total = 10
gen.send(20)        # total = 30
gen.send(5)         # total = 35
```

---

## Tips

- Use `*args` and `**kwargs` in wrapper functions to forward all arguments transparently.
- Always use `@functools.wraps(func)` in decorators — without it, `func.__name__` and `func.__doc__` point to the wrapper.
- Mutable default arguments (`def f(lst=[])`) are shared across all calls — one of Python's most common bugs. Always use `None` as default and create the object inside.
- `@lru_cache` is the simplest way to add memoisation to any pure function — a one-liner speed-up for recursive algorithms.
- Generators are the right tool for large sequences you don't need all at once — they use O(1) memory regardless of sequence length.

---

## Summary

- `def name(params): body` — `return` sends a value back; omitting it returns `None`.
- Parameters: positional, keyword, `*args` (tuple), `**kwargs` (dict), keyword-only (after `*`), positional-only (before `/`).
- LEGB scope: Local → Enclosing → Global → Built-in. Use `global`/`nonlocal` to write to outer scopes.
- `lambda params: expr` — anonymous one-expression function; used with `sorted`, `map`, `filter`.
- Decorators wrap functions: `@decorator` = `func = decorator(func)`. Use `@functools.wraps`.
- Generators use `yield` — produce values lazily; O(1) memory; use for large or infinite sequences.
