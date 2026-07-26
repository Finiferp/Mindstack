---
title: "Advanced Python"
sidebar_label: "Advanced"
sidebar_position: 15
---

# Advanced Python

Type hints, dataclasses, ABCs, protocols, context managers, functools, closures, and modern Python features.

---

## Type Hints

```python
# Python 3.10+ — use built-in types directly
def greet(name: str) -> str:
    return f"Hello, {name}!"

def process(items: list[int]) -> dict[str, int]:
    return {"sum": sum(items), "count": len(items)}

# Optional — value or None (Python 3.10+: use X | None)
def find(x: int | None = None) -> int | None:
    return x

# Union (Python 3.10+: use X | Y)
def stringify(val: int | float | str) -> str:
    return str(val)

# Older style (Python 3.9 and below — still common)
from typing import Optional, Union, List, Dict, Tuple, Set
from typing import Any, Callable, Iterator, Generator, Type

def find_old(x: Optional[int]) -> Optional[int]:
    return x

def old_union(val: Union[int, float, str]) -> str:
    return str(val)

# Collections
def process_old(
    items: List[int],
    mapping: Dict[str, int],
    pair: Tuple[int, str],
) -> List[str]:
    return [str(i) for i in items]

# Callable
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# Any — opt out of type checking for a value
def dynamic(value: Any) -> Any:
    return value

# Type aliases
Vector = list[float]
Matrix = list[list[float]]

def scale(scalar: float, vector: Vector) -> Vector:
    return [scalar * v for v in vector]

# TypeVar — generic functions
from typing import TypeVar
T = TypeVar("T")

def first(lst: list[T]) -> T:
    return lst[0]

# Generic classes (Python 3.12+ syntax)
# class Stack[T]:
#     def push(self, item: T) -> None: ...
#     def pop(self) -> T: ...

# Runtime checking — type hints not enforced by default
# Use mypy, pyright, or pytype for static checking:
# mypy script.py
# pyright script.py

# TypedDict — typed dict structure
from typing import TypedDict

class Movie(TypedDict):
    title: str
    year: int
    rating: float

def process_movie(movie: Movie) -> str:
    return f"{movie['title']} ({movie['year']})"

# Literal — only specific values allowed
from typing import Literal

def set_direction(direction: Literal["north", "south", "east", "west"]) -> None:
    ...

# Final — cannot be reassigned
from typing import Final
MAX_SIZE: Final = 100

# Protocol — structural subtyping (duck typing with type safety)
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...
    def resize(self, factor: float) -> None: ...

def render(shape: Drawable) -> None:
    shape.draw()   # any object with draw() method works

# overload — different signatures for the same function
from typing import overload

@overload
def double(x: int) -> int: ...
@overload
def double(x: str) -> str: ...

def double(x):
    return x * 2
```

---

## Abstract Base Classes

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    """Abstract base class for shapes."""

    @abstractmethod
    def area(self) -> float:
        """Must be implemented by subclasses."""
        ...

    @abstractmethod
    def perimeter(self) -> float: ...

    # Concrete method — shared by all subclasses
    def describe(self) -> str:
        return f"{type(self).__name__}: area={self.area():.2f}"

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        import math
        return math.pi * self.radius ** 2

    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self.radius

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

    def perimeter(self) -> float:
        return 2 * (self.width + self.height)

# Shape()          # TypeError: Can't instantiate abstract class
c = Circle(5)
print(c.describe())   # Circle: area=78.54

# Register virtual subclasses (without inheritance)
class Triangle:
    def area(self): return 0.5 * 3 * 4
    def perimeter(self): return 12

Shape.register(Triangle)
print(isinstance(Triangle(), Shape))   # True

# Built-in ABCs
from collections.abc import (
    Iterable, Iterator, Sequence, Mapping,
    MutableMapping, MutableSequence,
    Callable, Hashable, Sized
)

def process_any_sequence(seq: Sequence) -> None:
    for item in seq:   # works with list, tuple, str, etc.
        print(item)
```

---

## Context Managers

```python
from contextlib import contextmanager, asynccontextmanager
import contextlib, time

# Class-based context manager
class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False   # don't suppress exceptions

with Timer() as t:
    time.sleep(0.1)
# t.elapsed available after the block

# Generator-based context manager
@contextmanager
def database_transaction(connection):
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

with database_transaction(get_connection()) as conn:
    conn.execute("INSERT ...")

# Async context manager
@asynccontextmanager
async def async_timer():
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"Async elapsed: {time.perf_counter()-start:.4f}s")

# contextlib utilities
with contextlib.suppress(FileNotFoundError):
    os.remove("maybe_exists.txt")

with contextlib.redirect_stdout(open("output.txt", "w")):
    print("this goes to file")

output = contextlib.redirect_stdout
with contextlib.ExitStack() as stack:
    files = [stack.enter_context(open(f)) for f in filenames]

# nullcontext — placeholder context manager
def process(conn=None):
    ctx = conn or contextlib.nullcontext()
    with ctx:
        do_work()
```

---

## functools

```python
from functools import (
    lru_cache, cache, partial, reduce, wraps,
    total_ordering, singledispatch
)

# lru_cache — memoisation with bounded cache
@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2: return n
    return fibonacci(n-1) + fibonacci(n-2)

fibonacci(50)          # instant after first call
fibonacci.cache_info() # CacheInfo(hits=48, misses=51, ...)
fibonacci.cache_clear()

# cache — unbounded cache (Python 3.9+, simpler than lru_cache)
@cache
def expensive(n: int) -> int:
    return sum(range(n))

# partial — fix some arguments of a function
def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube   = partial(power, exponent=3)
print(square(5))   # 25
print(cube(3))     # 27

# partial with positional args
from functools import partial
double = partial(lambda x, n: x * n, n=2)

# reduce — left fold over an iterable
from functools import reduce
total = reduce(lambda acc, x: acc + x, [1,2,3,4,5])   # 15
product = reduce(lambda a, b: a * b, [1,2,3,4,5])      # 120

# total_ordering — implement __eq__ and one comparison; get the rest free
from functools import total_ordering

@total_ordering
class Student:
    def __init__(self, name, grade):
        self.name = name
        self.grade = grade

    def __eq__(self, other):
        return self.grade == other.grade

    def __lt__(self, other):
        return self.grade < other.grade

    # Gets __gt__, __le__, __ge__ automatically

# singledispatch — function overloading by argument type
from functools import singledispatch

@singledispatch
def process(value):
    raise NotImplementedError(f"No handler for {type(value)}")

@process.register(int)
def _(value):
    return value * 2

@process.register(str)
def _(value):
    return value.upper()

@process.register(list)
def _(value):
    return [process(v) for v in value]

process(5)          # 10
process("hello")    # "HELLO"
process([1,"a",3])  # [2,"A",6]
```

---

## Closures and Functional Patterns

```python
# Closure — inner function captures outer variables
def make_multiplier(n):
    def multiply(x):
        return x * n   # 'n' captured from outer scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))   # 10
print(triple(5))   # 15

# Closure for memoisation (manual)
def make_cached(func):
    cache = {}
    def cached(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return cached

# Currying (partial application step by step)
def curry(func):
    import inspect
    n = len(inspect.signature(func).parameters)

    def curried(*args):
        if len(args) >= n:
            return func(*args)
        return lambda *more: curried(*(args + more))
    return curried

@curry
def add(a, b, c):
    return a + b + c

print(add(1)(2)(3))    # 6
print(add(1, 2)(3))    # 6
print(add(1)(2, 3))    # 6

# Function composition
def compose(*functions):
    from functools import reduce
    return reduce(lambda f, g: lambda x: f(g(x)), functions)

double  = lambda x: x * 2
add_one = lambda x: x + 1
square  = lambda x: x ** 2

transform = compose(double, add_one, square)  # double(add_one(square(x)))
print(transform(3))   # double(add_one(9)) = double(10) = 20
```

---

## Walrus Operator and Modern Features

```python
# Walrus operator := (Python 3.8+) — assign and use in one expression
import re

# Without walrus
match = re.search(r"\d+", text)
if match:
    print(match.group())

# With walrus
if match := re.search(r"\d+", text):
    print(match.group())

# In while loop — read until empty
while chunk := file.read(8192):
    process(chunk)

# In comprehension filter
data = [1, -2, 3, -4, 5, -6]
processed = [y for x in data if (y := expensive_transform(x)) > 0]

# Positional-only params (Python 3.8+)
def greet(name, /, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Alice")          # Hello, Alice!
greet("Alice", "Hi")    # Hi, Alice!
# greet(name="Alice")  # TypeError

# f-string debugging (Python 3.8+)
x = 42
print(f"{x=}")          # x=42
print(f"{x*2=}")        # x*2=84
print(f"{x!r=}")        # x=42

# Structural pattern matching (Python 3.10+) — see py-control-flow.md

# Exception groups (Python 3.11+)
try:
    raise ExceptionGroup("multiple errors", [
        ValueError("bad value"),
        TypeError("bad type"),
    ])
except* ValueError as eg:
    print(f"ValueErrors: {eg.exceptions}")
except* TypeError as eg:
    print(f"TypeErrors: {eg.exceptions}")

# tomllib — built-in TOML parsing (Python 3.11+)
import tomllib
with open("pyproject.toml", "rb") as f:
    config = tomllib.load(f)

# Self type (Python 3.11+)
from typing import Self

class Builder:
    def set_name(self, name: str) -> Self:
        self.name = name
        return self

    def set_age(self, age: int) -> Self:
        self.age = age
        return self
```

---

## Tips

- Use `from __future__ import annotations` to use new-style type hints (`list[int]` instead of `List[int]`) in Python 3.7+.
- `@cache` (Python 3.9+) is a simpler, unbounded version of `@lru_cache(maxsize=None)` — use it when you don't need an eviction limit.
- Protocols are better than ABCs for library code — they enable structural typing without requiring inheritance.
- Always use `@functools.wraps(func)` in decorators — preserves `__name__`, `__doc__`, and other metadata.
- The walrus operator reduces redundant variable assignments — but only use it where it genuinely improves readability.

---

## Summary

- Type hints: `name: str`, `-> int`, `list[int]`, `dict[str, Any]`, `int | None` (3.10+).
- ABCs: inherit from `ABC`, mark methods `@abstractmethod` — subclasses must implement them.
- Protocols: define structural interfaces — any class with matching methods satisfies the protocol.
- `@contextmanager` + `yield` = clean context manager without `__enter__`/`__exit__`.
- `@lru_cache` / `@cache` — one-line memoisation; `partial()` — pre-fill arguments; `reduce()` — fold.
- Closures capture outer-scope variables; use `nonlocal` to modify them.
