---
title: "Object-Oriented Programming"
sidebar_label: "OOP"
sidebar_position: 7
---

# Object-Oriented Programming

Classes, objects, inheritance, polymorphism, encapsulation, magic methods, and dataclasses.


---

## Classes and Objects

```python
class Dog:
    # Class variable — shared by ALL instances
    species = "Canis familiaris"

    # __init__ — constructor (called when creating an instance)
    def __init__(self, name, age):
        # Instance variables — unique to each instance
        self.name = name     # self = the instance being created
        self.age = age

    # Instance method
    def bark(self):
        return f"{self.name} says Woof!"

    def description(self):
        return f"{self.name} is {self.age} years old"

    # String representation
    def __repr__(self):
        return f"Dog(name={self.name!r}, age={self.age!r})"

    def __str__(self):
        return f"{self.name} (age {self.age})"

# Creating instances
fido = Dog("Fido", 3)
buddy = Dog("Buddy", 5)

# Accessing attributes and methods
print(fido.name)           # Fido
print(fido.age)            # 3
print(fido.bark())         # Fido says Woof!
print(Dog.species)         # Canis familiaris
print(fido.species)        # Canis familiaris (accessed from instance too)

# Modifying instance attributes
fido.age = 4

# Class variable vs instance variable
fido.species = "Modified"  # creates instance variable; class variable unchanged
print(fido.species)        # Modified
print(Dog.species)         # Canis familiaris (unchanged)
print(buddy.species)       # Canis familiaris

# Delete an attribute
del fido.age
# print(fido.age)   # AttributeError

# Check if attribute exists
hasattr(fido, "name")      # True
hasattr(fido, "email")     # False
getattr(fido, "name")      # "Fido"
getattr(fido, "email", "N/A")  # "N/A" (default)
setattr(fido, "email", "fido@dogs.com")
```

---

## Properties and Encapsulation

```python
class Temperature:
    def __init__(self, celsius=0):
        self._celsius = celsius   # convention: _ = private

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("Temperature below absolute zero!")
        self._celsius = value

    @celsius.deleter
    def celsius(self):
        del self._celsius

    @property
    def fahrenheit(self):   # computed property — no setter
        return self._celsius * 9/5 + 32

t = Temperature(25)
print(t.celsius)       # 25 (calls getter)
print(t.fahrenheit)    # 77.0
t.celsius = 100        # calls setter
# t.celsius = -300     # ValueError!

# Name mangling — double underscore makes attribute harder to access
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance   # name-mangled to _BankAccount__balance

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

    def get_balance(self):
        return self.__balance

account = BankAccount(1000)
account.deposit(500)
print(account.get_balance())     # 1500
# print(account.__balance)       # AttributeError
print(account._BankAccount__balance)  # 1500 (still accessible, just harder)
```

---

## Class Methods and Static Methods

```python
from datetime import date

class Person:
    population = 0

    def __init__(self, name, birth_year):
        self.name = name
        self.birth_year = birth_year
        Person.population += 1

    # classmethod — receives the class (cls) as first arg, not instance
    # Use for: alternative constructors, accessing class state
    @classmethod
    def from_birth_date(cls, name, birth_date_str):
        year = int(birth_date_str.split("-")[0])
        return cls(name, year)

    @classmethod
    def get_population(cls):
        return cls.population

    # staticmethod — no access to class or instance
    # Use for: utility functions logically related to the class
    @staticmethod
    def is_adult(age):
        return age >= 18

    def age(self):
        return date.today().year - self.birth_year

# Usage
alice = Person("Alice", 1994)
bob = Person.from_birth_date("Bob", "1990-05-15")  # alternative constructor

print(Person.get_population())        # 2
print(Person.is_adult(20))            # True
print(alice.is_adult(alice.age()))    # depends on current year
```

---

## Inheritance

```python
# Base class (parent)
class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        return f"{self.name} says {self.sound}"

    def __repr__(self):
        return f"{type(self).__name__}(name={self.name!r})"

# Derived class (child)
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name, "Woof")   # call parent __init__
        self.breed = breed

    # Override parent method
    def speak(self):
        return f"{super().speak()} (tail wagging)"

    def fetch(self):
        return f"{self.name} fetches the ball!"

class Cat(Animal):
    def __init__(self, name):
        super().__init__(name, "Meow")

    def purr(self):
        return "Purrrr..."

# Usage
dog = Dog("Rex", "Labrador")
cat = Cat("Whiskers")

print(dog.speak())     # Rex says Woof (tail wagging)
print(cat.speak())     # Whiskers says Meow
print(dog.fetch())     # Rex fetches the ball!

# isinstance / issubclass
print(isinstance(dog, Dog))       # True
print(isinstance(dog, Animal))    # True (checks inheritance chain)
print(issubclass(Dog, Animal))    # True

# Multiple inheritance
class Flyable:
    def fly(self):
        return f"{self.name} is flying"

class FlyingDog(Dog, Flyable):
    pass

fd = FlyingDog("AirBud", "Golden")
print(fd.fly())    # AirBud is flying
print(fd.speak())  # AirBud says Woof (tail wagging)

# Method Resolution Order (MRO) — how Python finds methods in multiple inheritance
print(FlyingDog.__mro__)
# (FlyingDog, Dog, Flyable, Animal, object)
# C3 linearisation — depth-first, left-to-right, no duplicates
```

---

## Polymorphism

```python
# Duck typing — "if it walks like a duck and quacks like a duck, it's a duck"
# Python doesn't care about the type, only whether the method exists

class Duck:
    def sound(self):
        return "Quack"

class Cat:
    def sound(self):
        return "Meow"

class Dog:
    def sound(self):
        return "Woof"

def make_sound(animal):
    print(animal.sound())   # works for any object with a .sound() method

for animal in [Duck(), Cat(), Dog()]:
    make_sound(animal)

# Operator overloading via magic methods
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar):
        return Vector(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar):   # scalar * vector
        return self.__mul__(scalar)

    def __len__(self):
        return 2

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

v1 = Vector(1, 2)
v2 = Vector(3, 4)
print(v1 + v2)     # Vector(4, 6)
print(v1 * 3)      # Vector(3, 6)
print(3 * v1)      # Vector(3, 6)
print(len(v1))     # 2
```

---

## Magic (Dunder) Methods

```python
class Book:
    def __init__(self, title, author, pages):
        self.title = title
        self.author = author
        self.pages = pages

    # String representations
    def __str__(self):          # for print() and str()
        return f"{self.title} by {self.author}"

    def __repr__(self):         # for repr() and debugging
        return f"Book({self.title!r}, {self.author!r}, {self.pages})"

    # Comparison operators
    def __eq__(self, other):    # ==
        return self.title == other.title and self.author == other.author

    def __lt__(self, other):    # <
        return self.pages < other.pages

    def __le__(self, other):    # <=
        return self.pages <= other.pages

    # Makes objects sortable if __lt__ is defined
    # Or use @functools.total_ordering to auto-generate from __eq__ and one comparison

    # Container behaviour
    def __len__(self):          # len(book)
        return self.pages

    def __contains__(self, item):  # "Python" in book
        return item.lower() in self.title.lower()

    # Arithmetic
    def __add__(self, other):   # book1 + book2 = combined pages
        return self.pages + other.pages

    # Callable
    def __call__(self, *args):
        print(f"Reading {self.title}")

    # Context manager
    def __enter__(self):
        print(f"Opening {self.title}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        print(f"Closing {self.title}")
        return False  # don't suppress exceptions

    # Attribute access
    def __getattr__(self, name):   # called when attribute not found
        return f"No attribute: {name}"

    # Boolean value
    def __bool__(self):
        return self.pages > 0

    # Hashing (needed to use as dict key or in set)
    def __hash__(self):
        return hash((self.title, self.author))

# Usage
b1 = Book("Python Tricks", "Dan Bader", 302)
b2 = Book("Fluent Python", "Luciano Ramalho", 792)

print(str(b1))           # Python Tricks by Dan Bader
print(repr(b1))          # Book('Python Tricks', 'Dan Bader', 302)
print(b1 < b2)           # True (302 < 792)
print(len(b1))           # 302
print("Python" in b1)   # True
b1()                     # Reading Python Tricks

with b1 as book:
    print(f"Page count: {len(book)}")

books = sorted([b2, b1])  # sorts by pages
```

---

## Dataclasses (Python 3.7+)

```python
from dataclasses import dataclass, field, asdict, astuple
from typing import List

@dataclass
class Point:
    x: float
    y: float

    def distance_to_origin(self):
        return (self.x**2 + self.y**2) ** 0.5

p = Point(3.0, 4.0)
print(p)            # Point(x=3.0, y=4.0)  — auto __repr__
print(p == Point(3.0, 4.0))   # True  — auto __eq__

@dataclass
class Student:
    name: str
    grade: float
    courses: List[str] = field(default_factory=list)  # mutable default
    _id: int = field(default=0, repr=False)   # hidden from repr

    def __post_init__(self):
        self.name = self.name.strip().title()

s = Student("alice", 3.8)
s.courses.append("Math")

# Frozen dataclass — immutable (like a namedtuple with types)
@dataclass(frozen=True)
class Coordinate:
    lat: float
    lon: float

c = Coordinate(40.7128, -74.0060)
# c.lat = 0   # FrozenInstanceError

# Conversion
print(asdict(p))    # {"x": 3.0, "y": 4.0}
print(astuple(p))   # (3.0, 4.0)

# Ordering
@dataclass(order=True)
class Version:
    major: int
    minor: int
    patch: int

versions = [Version(1,2,3), Version(1,0,0), Version(2,0,0)]
print(sorted(versions))  # [Version(1,0,0), Version(1,2,3), Version(2,0,0)]
```

---

## Tips

- Use `__repr__` for debugging output (should be unambiguous); `__str__` for user-facing display.
- `@property` is the Pythonic way to add getters/setters — don't write `get_x()`/`set_x()` methods.
- Prefer `dataclass` over plain classes when the class is mainly a data container — removes boilerplate.
- Use `super().__init__()` in child `__init__` — always call the parent constructor explicitly.
- `isinstance(obj, MyClass)` is better than `type(obj) == MyClass` — works correctly with inheritance.
- Name mangling (`__attr`) is not true private — use single underscore (`_attr`) as a convention for "don't touch this".

---

## Summary

- `class Name:` defines a class; `__init__(self, ...)` is the constructor; `self` is the instance.
- Class variables shared across instances; instance variables unique to each (set on `self`).
- `@property` for computed attributes and controlled setters; `@classmethod` for alternative constructors; `@staticmethod` for utility functions.
- Inheritance: `class Child(Parent):`; `super()` to call parent methods.
- Magic methods: `__str__`, `__repr__`, `__eq__`, `__lt__`, `__len__`, `__add__`, `__call__`, `__enter__`/`__exit__`.
- `@dataclass` auto-generates `__init__`, `__repr__`, `__eq__` from type-annotated fields.
