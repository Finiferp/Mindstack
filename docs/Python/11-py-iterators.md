---
title: "Iterators and Generators"
sidebar_label: "Iterators"
sidebar_position: 11
---

# Iterators and Generators

The iterator protocol, itertools, generator functions, and advanced generator patterns.

---

## The Iterator Protocol

```python
# An iterable has __iter__() — returns an iterator
# An iterator has __iter__() and __next__() — produces values one at a time

# iter() and next() built-ins
lst = [1, 2, 3]
it = iter(lst)          # get iterator from iterable
print(next(it))         # 1
print(next(it))         # 2
print(next(it))         # 3
# next(it)              # StopIteration — no more values

# What 'for' does under the hood
for item in lst:
    print(item)
# Equivalent to:
it = iter(lst)
while True:
    try:
        item = next(it)
        print(item)
    except StopIteration:
        break

# Custom iterator class
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self          # iterator returns itself

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

for n in Countdown(5):
    print(n)    # 5 4 3 2 1

# Infinite iterator
class InfiniteCounter:
    def __init__(self, start=0):
        self.n = start

    def __iter__(self):
        return self

    def __next__(self):
        value = self.n
        self.n += 1
        return value

counter = InfiniteCounter()
# Take first 10 values (must limit consumption — never iterate directly!)
first_ten = [next(counter) for _ in range(10)]
```

---

## Generators

```python
# Generator function — yields values lazily (one at a time)
def countdown(n):
    while n > 0:
        yield n
        n -= 1

gen = countdown(5)
print(type(gen))     # generator
print(next(gen))     # 5
print(next(gen))     # 4
for val in countdown(3):
    print(val)       # 3 2 1

# Generator expression — lazy list comprehension
squares = (x**2 for x in range(10))   # generator object
print(type(squares))   # generator
print(next(squares))   # 0
print(list(squares))   # [1, 4, 9, 16, 25, 36, 49, 64, 81] (already consumed 0)

# Memory comparison
import sys
big_list = [x**2 for x in range(1_000_000)]   # ~8MB in memory
big_gen  = (x**2 for x in range(1_000_000))   # ~120 bytes (just the generator)
print(sys.getsizeof(big_list))  # ~8MB
print(sys.getsizeof(big_gen))   # ~120 bytes

# yield from — delegate to sub-generator
def first_n(n):
    yield from range(n)         # yield each from range

def chain_iters(*iterables):
    for it in iterables:
        yield from it

list(chain_iters([1,2], [3,4], [5]))   # [1,2,3,4,5]

# Generator pipeline — compose generators
def read_file(path):
    with open(path) as f:
        yield from f

def filter_comments(lines):
    for line in lines:
        if not line.startswith("#"):
            yield line

def strip_lines(lines):
    for line in lines:
        yield line.strip()

# Pipeline: read → filter → strip
lines = strip_lines(filter_comments(read_file("data.txt")))
for line in lines:
    print(line)   # processes one line at a time — O(1) memory

# send() — two-way generator communication
def accumulator():
    running_total = 0
    while True:
        value = yield running_total   # send value in, yield total out
        if value is None:
            return
        running_total += value

gen = accumulator()
next(gen)        # prime — advance to first yield
gen.send(10)     # 10
gen.send(20)     # 30
gen.send(5)      # 35
gen.close()      # GeneratorExit raised inside generator

# throw() — inject an exception into a generator
def resilient():
    while True:
        try:
            value = yield
            print(f"got: {value}")
        except ValueError:
            print("ignoring bad value")

gen = resilient()
next(gen)
gen.send(42)
gen.throw(ValueError, "bad data")
```

---

## itertools — Standard Library Iterator Tools

```python
import itertools

# ── Infinite iterators ────────────────────────────────────────────────────────
list(itertools.islice(itertools.count(1), 5))       # [1, 2, 3, 4, 5]
list(itertools.islice(itertools.cycle("AB"), 6))    # ['A','B','A','B','A','B']
list(itertools.repeat(10, 3))                        # [10, 10, 10]

# ── Finite iterators ──────────────────────────────────────────────────────────
# chain — concatenate iterables
list(itertools.chain([1,2], [3,4], [5]))            # [1,2,3,4,5]
list(itertools.chain.from_iterable([[1,2],[3,4]]))  # [1,2,3,4]

# compress — select elements where selector is truthy
list(itertools.compress("ABCDEF", [1,0,1,0,1,1]))  # ['A','C','E','F']

# dropwhile / takewhile
list(itertools.dropwhile(lambda x: x<5, [1,4,6,4,1]))  # [6,4,1]
list(itertools.takewhile(lambda x: x<5, [1,4,6,4,1]))  # [1,4]

# filterfalse — opposite of filter
list(itertools.filterfalse(lambda x: x%2, range(10))) # [0,2,4,6,8]

# islice — slice an iterator
list(itertools.islice(range(100), 5, 15, 2))   # [5,7,9,11,13]

# starmap — map with argument unpacking
list(itertools.starmap(pow, [(2,3),(3,2),(4,2)]))  # [8,9,16]

# zip_longest — zip with fillvalue for unequal lengths
list(itertools.zip_longest([1,2,3], ["a","b"], fillvalue=None))
# [(1,'a'),(2,'b'),(3,None)]

# accumulate — running totals (or any binary operation)
list(itertools.accumulate([1,2,3,4,5]))               # [1,3,6,10,15]
import operator
list(itertools.accumulate([1,2,3,4,5], operator.mul)) # [1,2,6,24,120]

# groupby — group consecutive elements (must be sorted first!)
data = sorted(["apple","ant","bee","banana","cherry"], key=lambda x: x[0])
for letter, group in itertools.groupby(data, key=lambda x: x[0]):
    print(f"{letter}: {list(group)}")
# a: ['ant', 'apple']
# b: ['banana', 'bee']
# c: ['cherry']

# pairwise (Python 3.10+)
list(itertools.pairwise([1,2,3,4]))   # [(1,2),(2,3),(3,4)]

# ── Combinatoric iterators ───────────────────────────────────────────────────
# product — cartesian product
list(itertools.product("AB", [1,2]))  # [('A',1),('A',2),('B',1),('B',2)]
list(itertools.product([0,1], repeat=3))  # all 3-bit binary numbers

# permutations — ordered arrangements
list(itertools.permutations("ABC", 2))
# [('A','B'),('A','C'),('B','A'),('B','C'),('C','A'),('C','B')]

# combinations — unordered selections
list(itertools.combinations("ABCD", 2))
# [('A','B'),('A','C'),('A','D'),('B','C'),('B','D'),('C','D')]

# combinations_with_replacement
list(itertools.combinations_with_replacement("AB", 2))
# [('A','A'),('A','B'),('B','B')]
```

---

## more-itertools (Third-Party)

```python
# pip install more-itertools
import more_itertools as mit

# chunked — split into chunks of size n
list(mit.chunked([1,2,3,4,5,6,7], 3))  # [[1,2,3],[4,5,6],[7]]

# windowed — sliding window
list(mit.windowed([1,2,3,4,5], 3))  # [(1,2,3),(2,3,4),(3,4,5)]

# flatten — one-level flatten
list(mit.flatten([[1,2],[3,[4,5]]]))  # [1,2,3,[4,5]]

# first, last, only
mit.first([1,2,3])         # 1
mit.last([1,2,3])          # 3
mit.first([], default=0)   # 0

# one — exactly one element
mit.one([42])              # 42
# mit.one([1,2])           # raises ValueError
```

---

## Practical Patterns

```python
# Lazy file processing pipeline
def process_large_file(path):
    def read_lines():
        with open(path, encoding="utf-8") as f:
            yield from f

    def parse(lines):
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                yield stripped.split(",")

    def to_dict(rows):
        header = None
        for row in rows:
            if header is None:
                header = row
            else:
                yield dict(zip(header, row))

    return to_dict(parse(read_lines()))

# Batching
def batched(iterable, n):
    """Yield successive n-sized chunks."""
    it = iter(iterable)
    while chunk := list(itertools.islice(it, n)):
        yield chunk

for batch in batched(range(100), 10):
    process_batch(batch)

# Round-robin from multiple iterables
def roundrobin(*iterables):
    pending = len(iterables)
    nexts = itertools.cycle(iter(it).__next__ for it in iterables)
    while pending:
        try:
            for next in nexts:
                yield next()
        except StopIteration:
            pending -= 1
            nexts = itertools.cycle(itertools.islice(nexts, pending))

list(roundrobin("ABC", [1,2], ("x","y","z")))
# ['A',1,'x','B',2,'y','C','z']
```

---

## Tips

- Generator expressions use `()` — pass directly to functions like `sum()`, `max()`, `list()` without extra allocation.
- `yield from` is cleaner than `for item in sub: yield item` and also passes `send()`/`throw()` through correctly.
- Always sort before `itertools.groupby()` — it only groups *consecutive* equal elements.
- `itertools.islice()` is how you safely take `n` items from an infinite generator without loading everything.
- Generators are single-pass — once exhausted, they don't reset. Call the generator function again if you need to restart.

---

## Summary

- **Iterable**: has `__iter__()`. **Iterator**: has `__iter__()` and `__next__()`; raises `StopIteration` when done.
- Generator functions use `yield` — produce values lazily; O(1) memory; resumable.
- Generator expressions: `(x**2 for x in range(n))` — same as generator function but inline.
- `yield from sub` delegates to another iterable — flattens one level.
- `itertools`: `chain`, `islice`, `product`, `combinations`, `permutations`, `groupby`, `accumulate`, `takewhile`, `dropwhile`.
- Use generators for large datasets, pipelines, and infinite sequences.
