---
title: "Collections — Lists, Tuples, Sets, Dicts"
sidebar_label: "Collections"
sidebar_position: 4
---

# Collections — Lists, Tuples, Sets, Dicts

Python's four built-in collection types, all methods, and when to use each.


---

## Lists

Ordered, mutable, allows duplicates. The most commonly used collection.

```python
# Creating
lst = [1, 2, 3, 4, 5]
lst = ["apple", "banana", "cherry"]
lst = [1, "hello", True, 3.14]    # mixed types allowed
lst = []                            # empty list
lst = list()                        # empty list
lst = list("hello")                 # ['h','e','l','l','o']
lst = list(range(5))                # [0, 1, 2, 3, 4]
lst = [0] * 5                       # [0, 0, 0, 0, 0]

# Accessing
lst = [10, 20, 30, 40, 50]
print(lst[0])      # 10  (first)
print(lst[-1])     # 50  (last)
print(lst[1:3])    # [20, 30]  (slicing)
print(lst[::-1])   # [50,40,30,20,10]  (reverse)

# Modifying
lst[0] = 99
lst[1:3] = [200, 300]   # replace a slice

# Adding elements
lst.append(60)           # add to end
lst.insert(0, 5)         # insert at index 0
lst.extend([70, 80])     # add multiple items from iterable
lst += [90, 100]         # same as extend

# Removing elements
lst.remove(30)           # remove first occurrence of value (ValueError if not found)
popped = lst.pop()       # remove and return last element
popped = lst.pop(0)      # remove and return element at index
del lst[0]               # delete by index
del lst[1:3]             # delete a slice
lst.clear()              # remove all elements

# Searching and counting
lst = [1, 2, 3, 2, 1]
print(2 in lst)           # True
print(lst.index(2))       # 1  (index of first occurrence)
print(lst.count(2))       # 2  (how many times 2 appears)

# Sorting
lst = [3, 1, 4, 1, 5, 9, 2, 6]
lst.sort()                # in-place ascending
lst.sort(reverse=True)    # in-place descending
lst.sort(key=len)         # sort by length (for strings)
lst.sort(key=lambda x: -x)  # sort by custom key

sorted_lst = sorted(lst)          # returns NEW sorted list (lst unchanged)
sorted_lst = sorted(lst, reverse=True)
sorted_lst = sorted(lst, key=abs) # sort by absolute value

# Reversing
lst.reverse()             # in-place reverse
rev = list(reversed(lst)) # returns iterator → convert to list

# Other operations
lst.copy()                # shallow copy (same as lst[:])
import copy
lst2 = copy.deepcopy(lst) # deep copy (for nested lists)

lst1 + lst2               # concatenate (new list)
lst * 3                    # repeat

len(lst)                   # length
min(lst)                   # minimum
max(lst)                   # maximum
sum(lst)                   # sum (numbers only)

# Unpacking
a, b, c = [1, 2, 3]
first, *rest = [1, 2, 3, 4, 5]        # first=1, rest=[2,3,4,5]
*init, last = [1, 2, 3, 4, 5]         # init=[1,2,3,4], last=5
first, *middle, last = [1, 2, 3, 4, 5] # first=1, middle=[2,3,4], last=5

# Nested lists
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print(matrix[1][2])   # 6

# Zip — combine two lists element-wise
names = ["Alice", "Bob", "Carol"]
scores = [90, 85, 92]
paired = list(zip(names, scores))    # [("Alice",90), ("Bob",85), ("Carol",92)]
for name, score in zip(names, scores):
    print(f"{name}: {score}")

# Enumerate — index + value
for i, name in enumerate(names):
    print(f"{i}: {name}")

for i, name in enumerate(names, start=1):   # start at 1
    print(f"{i}: {name}")
```

---

## Tuples

Ordered, **immutable**, allows duplicates. Use for fixed data.

```python
# Creating
t = (1, 2, 3)
t = 1, 2, 3         # parentheses optional
t = (42,)           # single-element tuple — trailing comma required!
t = 42,             # same
t = ()              # empty tuple
t = tuple([1,2,3])  # from list

# Accessing — same as list
t = (10, 20, 30)
print(t[0])         # 10
print(t[-1])        # 30
print(t[0:2])       # (10, 20)

# Tuples are immutable
# t[0] = 99        # TypeError!

# But can contain mutable objects
t = ([1,2], [3,4])
t[0].append(99)     # works — modifying the list inside
print(t)            # ([1, 2, 99], [3, 4])

# Methods (only 2)
t = (1, 2, 2, 3, 2)
t.count(2)          # 3
t.index(3)          # 3

# Unpacking
a, b, c = (1, 2, 3)
first, *rest = (1, 2, 3, 4)

# Named tuples — tuples with named fields
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p.y)    # 3 4
print(p[0])        # 3
print(p._asdict()) # {'x': 3, 'y': 4}

# When to use tuple vs list:
# Tuple: fixed data (coordinates, RGB colour, DB row), dict keys, function returns
# List: collection that changes (add/remove items)
# Tuple is slightly faster and uses less memory
```

---

## Sets

Unordered, **no duplicates**, mutable. O(1) membership test.

```python
# Creating
s = {1, 2, 3, 4, 5}
s = {"apple", "banana", "cherry"}
s = set()             # empty set — NOT {} (that's an empty dict!)
s = set([1,1,2,3])    # {1, 2, 3} — removes duplicates
s = set("hello")      # {'h', 'e', 'l', 'o'} — unique chars

# Adding / removing
s = {1, 2, 3}
s.add(4)              # add one element
s.update([5, 6, 7])   # add multiple
s.update({8}, [9])    # add from multiple iterables

s.remove(3)           # remove — KeyError if not found
s.discard(99)         # remove — no error if not found
popped = s.pop()      # remove and return arbitrary element
s.clear()             # remove all

# Membership — O(1)
print(3 in {1, 2, 3, 4})   # True (much faster than list for large sets)

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

a | b               # {1,2,3,4,5,6}  union
a.union(b)          # same

a & b               # {3,4}          intersection
a.intersection(b)   # same

a - b               # {1,2}          difference (in a but not b)
a.difference(b)     # same

b - a               # {5,6}          difference (in b but not a)

a ^ b               # {1,2,5,6}      symmetric difference (in either but not both)
a.symmetric_difference(b)

# Subset / superset
{1,2}.issubset({1,2,3})      # True
{1,2,3}.issuperset({1,2})    # True
{1,2}.isdisjoint({3,4})      # True (no common elements)

# In-place operations
a |= b     # a = a | b  (union update)
a &= b     # a = a & b  (intersection update)
a -= b     # a = a - b  (difference update)
a ^= b     # symmetric difference update

# frozenset — immutable set (can be used as dict key or in another set)
fs = frozenset([1, 2, 3])
d = {fs: "value"}    # valid dict key

# Common use: deduplication
names = ["Alice", "Bob", "Alice", "Carol", "Bob"]
unique = list(set(names))    # deduplicate (order not preserved)

# Order-preserving deduplication
seen = set()
unique = [x for x in names if not (x in seen or seen.add(x))]
```

---

## Dictionaries

Ordered (Python 3.7+), mutable, **key-value pairs**, keys must be unique and hashable.

```python
# Creating
d = {"name": "Alice", "age": 30, "city": "NYC"}
d = dict(name="Alice", age=30)           # keyword args
d = dict([("name", "Alice"), ("age", 30)])  # from list of tuples
d = {}                                    # empty dict
d = dict.fromkeys(["a", "b", "c"], 0)   # {"a":0, "b":0, "c":0}

# Accessing
d = {"name": "Alice", "age": 30}
print(d["name"])          # "Alice" — KeyError if key missing
print(d.get("name"))      # "Alice" — None if missing (no error)
print(d.get("email", "N/A"))  # "N/A" — default value

# Modifying
d["email"] = "alice@example.com"   # add or update
d.update({"age": 31, "city": "LA"})  # update multiple keys
d.update(city="Boston")              # keyword syntax

# setdefault — set if key doesn't exist, return current value
d.setdefault("role", "user")   # sets "role"="user" if not present

# Removing
del d["city"]                  # KeyError if not found
popped = d.pop("age")          # remove and return value
popped = d.pop("missing", None) # default if not found
d.popitem()                    # remove and return last inserted (key, value)
d.clear()                      # remove all

# Checking
"name" in d          # True (key check)
"Alice" in d         # False (not a key)
"Alice" in d.values() # True

# Iterating
d = {"a": 1, "b": 2, "c": 3}

for key in d:                    # iterate over keys (default)
    print(key)

for key in d.keys():             # explicit keys
    print(key)

for value in d.values():         # iterate over values
    print(value)

for key, value in d.items():     # iterate over key-value pairs
    print(f"{key}: {value}")

# Views are dynamic — reflect changes
keys_view = d.keys()
d["d"] = 4
print("d" in keys_view)   # True — view updated automatically

# Merging dicts
d1 = {"a": 1, "b": 2}
d2 = {"b": 99, "c": 3}

merged = {**d1, **d2}          # {"a":1, "b":99, "c":3} — d2 overwrites
merged = d1 | d2               # Python 3.9+  same result
d1 |= d2                       # Python 3.9+ in-place merge

# Sorting a dict by key or value
d = {"banana": 3, "apple": 1, "cherry": 2}
by_key = dict(sorted(d.items()))
by_value = dict(sorted(d.items(), key=lambda x: x[1]))

# Nested dicts
users = {
    "alice": {"age": 30, "role": "admin"},
    "bob":   {"age": 25, "role": "user"},
}
print(users["alice"]["role"])   # "admin"

# Dict comprehension
squares = {n: n**2 for n in range(1, 6)}  # {1:1, 2:4, 3:9, 4:16, 5:25}
filtered = {k: v for k, v in d.items() if v > 1}

# defaultdict — auto-creates missing keys
from collections import defaultdict
word_count = defaultdict(int)       # default value: int() = 0
for word in "the quick brown fox the fox".split():
    word_count[word] += 1

groups = defaultdict(list)          # default value: list() = []
groups["fruits"].append("apple")    # no KeyError

# Counter — dict subclass for counting
from collections import Counter
c = Counter("abracadabra")          # Counter({'a':5,'b':2,'r':2,'c':1,'d':1})
c.most_common(3)                    # [('a',5),('b',2),('r',2)]
c["a"]                              # 5
c["z"]                              # 0 (not KeyError)

# OrderedDict — maintains insertion order (redundant in Python 3.7+, still useful)
from collections import OrderedDict
od = OrderedDict([("a", 1), ("b", 2)])
od.move_to_end("a")                 # move to end
od.move_to_end("b", last=False)    # move to beginning
```

---

## When to Use Each

| Collection | Ordered | Mutable | Duplicates | Key feature |
|---|---|---|---|---|
| `list` | ✓ | ✓ | ✓ | General purpose sequence |
| `tuple` | ✓ | ✗ | ✓ | Immutable; dict key; fast |
| `set` | ✗ | ✓ | ✗ | O(1) membership; dedup |
| `frozenset` | ✗ | ✗ | ✗ | Immutable set; dict key |
| `dict` | ✓ (3.7+) | ✓ | Keys: ✗ | Key-value mapping |

---

## Tips

- `in` on a set/dict is O(1) — use a set when you only need membership testing, not a list.
- `dict.get(key, default)` instead of `dict[key]` — avoids KeyError without a try/except.
- `collections.defaultdict` eliminates the common "check if key exists before appending" pattern.
- `collections.Counter` is the fastest way to count occurrences of elements.
- Never modify a list/dict/set while iterating over it — iterate over a copy: `for item in lst[:]`.
- Tuple with one element requires a trailing comma: `(42,)` — `(42)` is just `42` in parentheses.

---

## Summary

- List `[1,2,3]`: ordered, mutable, duplicates — the default sequence type.
- Tuple `(1,2,3)`: ordered, immutable — use for fixed data and multiple return values.
- Set `{1,2,3}`: unordered, no duplicates, O(1) lookup — use for membership testing and deduplication.
- Dict `{"key": "value"}`: ordered key-value store, O(1) access — use for any mapping.
- Key tools: `sorted()`, `zip()`, `enumerate()`, `collections.defaultdict`, `collections.Counter`.
