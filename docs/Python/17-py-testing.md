---
title: "Testing"
sidebar_label: "Testing"
sidebar_position: 17
---

# Testing

unittest, pytest, mocking, fixtures, parametrize, and coverage.

---

## unittest — Standard Library

```python
import unittest

def add(a, b): return a + b
def divide(a, b):
    if b == 0: raise ValueError("Cannot divide by zero")
    return a / b

class TestMath(unittest.TestCase):

    # setUp / tearDown run before/after EACH test
    def setUp(self):
        self.data = [1, 2, 3]

    def tearDown(self):
        pass   # cleanup

    # Test methods must start with 'test_'
    def test_add_positive(self):
        self.assertEqual(add(2, 3), 5)

    def test_add_negative(self):
        self.assertEqual(add(-1, -2), -3)

    def test_divide_normal(self):
        self.assertAlmostEqual(divide(10, 3), 3.333, places=3)

    def test_divide_by_zero(self):
        with self.assertRaises(ValueError):
            divide(10, 0)

    def test_divide_by_zero_message(self):
        with self.assertRaises(ValueError) as ctx:
            divide(10, 0)
        self.assertIn("zero", str(ctx.exception))

    # All assertion methods
    def test_assertions(self):
        self.assertEqual(1 + 1, 2)          # a == b
        self.assertNotEqual(1, 2)            # a != b
        self.assertTrue(1 < 2)              # bool(x)
        self.assertFalse(1 > 2)             # not bool(x)
        self.assertIsNone(None)              # x is None
        self.assertIsNotNone(1)             # x is not None
        self.assertIn(1, [1, 2, 3])         # a in b
        self.assertNotIn(4, [1, 2, 3])      # a not in b
        self.assertIsInstance([], list)      # isinstance(a, b)
        self.assertAlmostEqual(0.1+0.2, 0.3, places=10)
        self.assertGreater(5, 3)
        self.assertLess(3, 5)
        self.assertListEqual([1,2], [1,2])  # with nice diff
        self.assertDictEqual({"a":1}, {"a":1})

    # Skip tests
    @unittest.skip("not implemented yet")
    def test_future(self): pass

    @unittest.skipIf(True, "skip on some condition")
    def test_conditional(self): pass

    @unittest.expectedFailure
    def test_known_bug(self):
        self.assertEqual(1, 2)  # expected to fail

# setUpClass / tearDownClass — run once per class
class TestWithDB(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = create_test_db()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

---

## pytest — The Modern Testing Framework

```bash
pip install pytest pytest-cov pytest-asyncio

pytest                        # run all tests
pytest tests/                 # specific directory
pytest tests/test_math.py     # specific file
pytest tests/test_math.py::TestMath::test_add  # specific test
pytest -v                     # verbose output
pytest -x                     # stop on first failure
pytest -k "add or divide"     # run tests matching keyword
pytest --tb=short             # shorter traceback
pytest -s                     # show print() output
pytest --co                   # collect only (list tests)
pytest -n auto                # parallel (pip install pytest-xdist)
pytest --cov=src --cov-report=html   # coverage report
```

```python
# tests/test_math.py
import pytest

# Simple function tests (no class needed)
def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -2) == -3

# Test exceptions
def test_divide_by_zero():
    with pytest.raises(ValueError):
        divide(10, 0)

def test_divide_by_zero_message():
    with pytest.raises(ValueError, match="zero"):
        divide(10, 0)

# Approximate equality
def test_float():
    assert divide(10, 3) == pytest.approx(3.333, rel=1e-3)
    assert 0.1 + 0.2 == pytest.approx(0.3)
```

---

## Fixtures

```python
import pytest
from pathlib import Path

# Basic fixture — returns a value
@pytest.fixture
def sample_data():
    return [1, 2, 3, 4, 5]

def test_sum(sample_data):
    assert sum(sample_data) == 15

# Fixture with setup and teardown (yield)
@pytest.fixture
def db_connection():
    conn = create_test_db()
    yield conn         # test runs here
    conn.close()       # teardown

def test_insert(db_connection):
    db_connection.execute("INSERT ...")
    assert db_connection.count() == 1

# Fixture scope — how often the fixture is created
@pytest.fixture(scope="session")   # once per test session
def api_client():
    client = TestClient(app)
    return client

@pytest.fixture(scope="module")    # once per test file
def database():
    db = setup_test_database()
    yield db
    teardown_test_database(db)

@pytest.fixture(scope="class")     # once per class
@pytest.fixture(scope="function")  # default — once per test

# Fixtures using other fixtures
@pytest.fixture
def user(db_connection):
    user = db_connection.create_user("Alice", "alice@test.com")
    return user

def test_user_name(user):
    assert user.name == "Alice"

# conftest.py — shared fixtures available to all tests in the directory
# (no import needed — pytest discovers them automatically)
# tests/conftest.py
@pytest.fixture(scope="session")
def app():
    from myapp import create_app
    app = create_app(testing=True)
    return app

@pytest.fixture
def client(app):
    with app.test_client() as c:
        yield c

# Parametrize fixtures
@pytest.fixture(params=["sqlite", "postgres"])
def database_url(request):
    if request.param == "sqlite":
        return "sqlite:///:memory:"
    return "postgresql://localhost/test"
```

---

## Parametrize

```python
import pytest

# Run same test with multiple inputs
@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (100, 200, 300),
])
def test_add_parametrized(a, b, expected):
    assert add(a, b) == expected

# Single parameter
@pytest.mark.parametrize("value", [0, -1, None, "", [], {}])
def test_falsy(value):
    assert not value

# With ids for readable output
@pytest.mark.parametrize("n, expected", [
    (0, 1),
    (1, 1),
    (5, 120),
    (10, 3628800),
], ids=["zero", "one", "five", "ten"])
def test_factorial(n, expected):
    assert factorial(n) == expected

# Nested parametrize — cartesian product
@pytest.mark.parametrize("x", [1, 2])
@pytest.mark.parametrize("y", [10, 20])
def test_multiply(x, y):
    assert multiply(x, y) == x * y
# Runs: (1,10), (1,20), (2,10), (2,20)
```

---

## Mocking

```python
from unittest.mock import Mock, MagicMock, patch, AsyncMock, call
import pytest

# Basic Mock
mock = Mock()
mock.method()
mock.method(1, 2, key="val")
mock.method.assert_called_once()
mock.method.assert_called_with(1, 2, key="val")
mock.method.assert_called_once_with(1, 2, key="val")
mock.method.assert_any_call(1, 2)
mock.method.call_count    # how many times called
mock.method.call_args     # most recent call args
mock.method.call_args_list  # all calls

# Return values
mock.method.return_value = 42
mock.method.side_effect = ValueError("fail")   # raise exception
mock.method.side_effect = [1, 2, 3]            # return each in sequence

# MagicMock — supports magic methods (__len__, __iter__, etc.)
magic = MagicMock()
magic.__len__.return_value = 5
len(magic)   # 5

# patch as context manager
with patch("mymodule.requests.get") as mock_get:
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"user": "Alice"}
    result = fetch_user(1)
    mock_get.assert_called_once_with("https://api.example.com/users/1")

# patch as decorator
@patch("mymodule.requests.get")
@patch("mymodule.datetime")
def test_api(mock_datetime, mock_get):   # decorators apply bottom-up
    mock_get.return_value.json.return_value = {"id": 1}
    mock_datetime.now.return_value = datetime(2024, 1, 1)
    result = api_call()
    assert result["id"] == 1

# patch.object — patch specific attribute on an object
with patch.object(MyClass, "method", return_value=42):
    obj = MyClass()
    assert obj.method() == 42

# patch in pytest with fixture
@pytest.fixture
def mock_requests(monkeypatch):
    mock = Mock()
    mock.get.return_value.status_code = 200
    mock.get.return_value.json.return_value = {"data": []}
    monkeypatch.setattr("mymodule.requests", mock)
    return mock

def test_fetch(mock_requests):
    result = fetch_all()
    mock_requests.get.assert_called_once()

# AsyncMock for async functions
with patch("mymodule.async_fetch") as mock:
    mock_get = AsyncMock(return_value={"data": []})
    result = await my_async_function()

# pytest-mock plugin (cleaner than unittest.mock)
# pip install pytest-mock
def test_with_mocker(mocker):
    mock = mocker.patch("mymodule.requests.get")
    mock.return_value.json.return_value = {"id": 1}
    result = fetch_user(1)
    mock.assert_called_once()
```

---

## Async Testing

```python
# pip install pytest-asyncio
import pytest
import asyncio

@pytest.mark.asyncio
async def test_async_function():
    result = await my_async_fn()
    assert result == 42

@pytest.fixture
async def async_client(app):
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_endpoint(async_client):
    response = await async_client.get("/users/1")
    assert response.status_code == 200

# Configure in pytest.ini or pyproject.toml:
# [pytest]
# asyncio_mode = auto   # marks all async tests automatically
```

---

## Coverage

```bash
pip install pytest-cov

pytest --cov=src --cov-report=term-missing
pytest --cov=src --cov-report=html   # open htmlcov/index.html
pytest --cov=src --cov-fail-under=80 # fail if coverage < 80%

# .coveragerc
[run]
source = src/
omit = tests/*, venv/*
[report]
show_missing = True
skip_covered = False
```

---

## Tips

- pytest is the industry standard — simpler syntax, better output, richer plugins than `unittest`.
- Use `conftest.py` for shared fixtures — pytest discovers them automatically with no imports needed.
- `@pytest.mark.parametrize` is the cleanest way to test multiple inputs — far better than loops inside a test.
- Mock at the boundary of your system (HTTP calls, database queries, file I/O) — not the internals.
- Aim for 80% coverage as a baseline — 100% is not always worth chasing; focus on critical paths.

---

## Summary

- `pytest` discovers any `test_*.py` file with functions starting `test_`; no class needed.
- `@pytest.fixture` provides reusable setup/teardown; `scope=` controls how often they run.
- `@pytest.mark.parametrize("a,b,expected", [...])` runs one test for each set of values.
- `unittest.mock.patch` replaces a name in a module for the duration of the test.
- `pytest --cov=src` measures test coverage; aim for 80%+ on critical code.
