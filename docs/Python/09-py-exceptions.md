---
title: "Exception Handling"
sidebar_label: "Exceptions"
sidebar_position: 9
---

# Exception Handling

try/except/else/finally, raising exceptions, custom exceptions, and the exception hierarchy.


---

## try / except

```python
# Basic structure
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")

# Catch multiple specific exceptions
try:
    value = int(input("Enter number: "))
    result = 10 / value
except ValueError:
    print("Not a valid number")
except ZeroDivisionError:
    print("Cannot divide by zero")

# Multiple exceptions in one clause
try:
    risky_operation()
except (TypeError, ValueError) as e:
    print(f"Type or value error: {e}")

# Catch the exception object
try:
    int("abc")
except ValueError as e:
    print(f"Error: {e}")              # invalid literal for int()
    print(f"Type: {type(e).__name__}") # ValueError
    print(f"Args: {e.args}")          # ('invalid literal...',)

# Bare except — catches EVERYTHING including KeyboardInterrupt (avoid!)
try:
    risky()
except Exception:    # catches all non-system-exiting exceptions (use this)
    print("something went wrong")
except:              # catches literally everything (avoid)
    print("even keyboard interrupt")

# else clause — runs if NO exception occurred
try:
    result = int("42")
except ValueError:
    print("parse failed")
else:
    print(f"Parsed: {result}")   # only runs if try succeeded

# finally — ALWAYS runs (cleanup, close resources)
f = None
try:
    f = open("file.txt")
    data = f.read()
except FileNotFoundError:
    print("File not found")
finally:
    if f:
        f.close()   # always close the file

# Full structure
try:
    result = compute()
except SpecificError as e:
    handle_specific(e)
except Exception as e:
    handle_general(e)
else:
    use_result(result)   # no exception happened
finally:
    cleanup()            # always runs
```

---

## raise

```python
# Raise an exception
raise ValueError("invalid input")
raise TypeError("expected a string")
raise RuntimeError("something went wrong")

# Re-raise the current exception (inside except block)
try:
    risky()
except ValueError as e:
    log_error(e)
    raise    # re-raises the same exception

# Raise a different exception while chaining
try:
    result = int(user_input)
except ValueError as e:
    raise RuntimeError("failed to parse config") from e
    # Output: RuntimeError: failed to parse config
    # Caused by: ValueError: invalid literal for int()

# Suppress the exception chain
try:
    risky()
except ValueError:
    raise RuntimeError("wrapped") from None  # hides the original cause

# Raise in a function with validation
def set_age(age):
    if not isinstance(age, int):
        raise TypeError(f"age must be int, got {type(age).__name__}")
    if age < 0:
        raise ValueError(f"age must be non-negative, got {age}")
    if age > 150:
        raise ValueError(f"age seems unrealistic: {age}")
    return age

# assert — raise AssertionError if condition is False
assert len(items) > 0, "items must not be empty"
assert isinstance(name, str), f"name must be str, got {type(name)}"
# Note: assertions are disabled with python -O (optimised mode)
# Use explicit raises for production validation
```

---

## Custom Exceptions

```python
# Always inherit from Exception (or a more specific base)
class AppError(Exception):
    """Base exception for this application."""
    pass

class ValidationError(AppError):
    """Raised when input validation fails."""
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"Validation error on '{field}': {message}")

class NotFoundError(AppError):
    """Raised when a resource is not found."""
    def __init__(self, resource, identifier):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} with id {identifier!r} not found")

class DatabaseError(AppError):
    """Raised for database-related errors."""
    def __init__(self, message, query=None):
        self.query = query
        super().__init__(message)

# Usage
def find_user(user_id):
    user = db.get(user_id)
    if user is None:
        raise NotFoundError("User", user_id)
    return user

def create_user(name, email):
    if not email or "@" not in email:
        raise ValidationError("email", "must be a valid email address")
    if len(name) < 2:
        raise ValidationError("name", "must be at least 2 characters")

# Catching custom exceptions
try:
    user = find_user(42)
except NotFoundError as e:
    print(f"Not found: {e.resource} #{e.identifier}")
except ValidationError as e:
    print(f"Invalid {e.field}: {e.message}")
except AppError as e:
    print(f"App error: {e}")
```

---

## Exception Hierarchy

```
BaseException
├── SystemExit               ← sys.exit()
├── KeyboardInterrupt        ← Ctrl+C
├── GeneratorExit
└── Exception
    ├── ArithmeticError
    │   ├── ZeroDivisionError
    │   ├── OverflowError
    │   └── FloatingPointError
    ├── AttributeError       ← obj.bad_attr
    ├── ImportError
    │   └── ModuleNotFoundError
    ├── LookupError
    │   ├── IndexError       ← list[99]
    │   └── KeyError         ← dict["missing"]
    ├── NameError            ← undefined variable
    │   └── UnboundLocalError
    ├── OSError (IOError)
    │   ├── FileNotFoundError
    │   ├── PermissionError
    │   ├── TimeoutError
    │   └── ConnectionError
    ├── RuntimeError
    │   └── RecursionError
    ├── StopIteration
    ├── TypeError            ← wrong type
    ├── ValueError           ← right type, bad value
    ├── UnicodeError
    └── NotImplementedError
```

---

## Context Managers with try/finally

```python
# The preferred pattern — use 'with' instead of try/finally for resources

# File (built-in context manager)
with open("file.txt", "r") as f:
    content = f.read()
# f.close() called automatically even if exception occurs

# Multiple context managers
with open("input.txt") as fin, open("output.txt", "w") as fout:
    fout.write(fin.read())

# Custom context manager using contextlib
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire_resource()
    try:
        yield resource          # code in the 'with' block runs here
    except Exception as e:
        log_error(e)
        raise
    finally:
        release_resource(resource)

with managed_resource() as r:
    use(r)

# suppress — silently ignore specific exceptions
from contextlib import suppress

with suppress(FileNotFoundError):
    os.remove("maybe_exists.txt")  # no error if file doesn't exist
```

---

## Exception Best Practices

```python
# 1. Be specific — catch the most specific exception you can
# BAD
try:
    data = json.loads(text)
except Exception:
    data = {}

# GOOD
try:
    data = json.loads(text)
except json.JSONDecodeError:
    data = {}

# 2. Don't swallow exceptions silently
# BAD
try:
    risky()
except Exception:
    pass    # silent failure — very hard to debug

# GOOD
try:
    risky()
except Exception as e:
    logger.error(f"risky() failed: {e}", exc_info=True)
    raise  # or return a safe default

# 3. Use 'from e' for exception chaining
try:
    connect_to_db()
except ConnectionError as e:
    raise ServiceUnavailableError("DB unreachable") from e

# 4. Log exception info
import logging
try:
    risky()
except Exception:
    logging.exception("unexpected error")  # logs message + full traceback

# 5. Exception groups (Python 3.11+)
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(task1())
        tg.create_task(task2())
except* ValueError as eg:    # except* matches exception groups
    for e in eg.exceptions:
        print(f"ValueError: {e}")
```

---

## Tips

- Catch `Exception`, not bare `except:` — the latter catches `KeyboardInterrupt` and `SystemExit` which should propagate.
- The `else` clause is underused — it clearly separates "what runs on success" from the exception handling.
- `finally` runs even if there's a `return` inside `try` — use it for guaranteed cleanup.
- Use `logging.exception()` inside `except` blocks — it automatically includes the traceback.
- Custom exceptions should inherit from `Exception` and accept human-readable messages — makes debugging dramatically easier.

---

## Summary

- `try/except/else/finally` — `except` catches errors; `else` runs on success; `finally` always runs.
- `raise ExceptionType("message")` to raise; bare `raise` to re-raise; `raise X from Y` for chaining.
- Custom exceptions inherit from `Exception` — add fields for structured error information.
- `with` statement (context manager) is the preferred way to manage resources — always prefer it over `try/finally`.
- Be specific with exception types; never silently swallow exceptions; always log with `exc_info=True`.
