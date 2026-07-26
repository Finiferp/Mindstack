---
title: "Modules and Packages"
sidebar_label: "Modules & Packages"
sidebar_position: 8
---

# Modules and Packages

How Python organises code across files, the import system, pip, virtual environments, and the standard library highlights.


---

## Modules

```python
# A module is any .py file
# mymodule.py
def greet(name):
    return f"Hello, {name}!"

PI = 3.14159
_private = "not exported by default"

# Importing in another file
import mymodule
print(mymodule.greet("Alice"))
print(mymodule.PI)

# Import specific names
from mymodule import greet, PI
print(greet("Alice"))

# Import with alias
import mymodule as mm
from mymodule import greet as say_hello

# Import everything (avoid — pollutes namespace)
from mymodule import *    # imports everything not starting with _

# __name__ — check if running as script or imported
# mymodule.py
if __name__ == "__main__":
    print("Running directly as script")
    # This block does NOT run when imported
else:
    print("Imported as a module")

# Common pattern for modules with tests
def main():
    print("Running main logic")

if __name__ == "__main__":
    main()
```

---

## Packages

```python
# A package is a directory with an __init__.py file
#
# my_package/
# ├── __init__.py        ← makes the directory a package
# ├── utils.py
# ├── models.py
# └── services/
#     ├── __init__.py
#     ├── email.py
#     └── payment.py

# __init__.py — controls what's exported and sets up the package
# my_package/__init__.py
from .utils import helper_function     # relative import
from .models import User
__version__ = "1.0.0"
__all__ = ["User", "helper_function"]  # controls 'from pkg import *'

# Importing from packages
import my_package
from my_package import User
from my_package.utils import helper_function
from my_package.services.email import send_email
from my_package.services import payment

# Relative imports (inside the package)
# services/email.py
from ..models import User           # go up one level
from ..utils import helper_function
from . import payment               # sibling module
```

---

## Import System Deep Dive

```python
# How Python finds modules (sys.path):
import sys
print(sys.path)
# ['', '/usr/lib/python3.11', ...site-packages...]
# 1. Current directory (or script's directory)
# 2. PYTHONPATH environment variable directories
# 3. Standard library directories
# 4. Site-packages (where pip installs)

# Add to sys.path temporarily
sys.path.insert(0, "/path/to/my/code")

# Reload a module (after changes — useful in REPL)
import importlib
importlib.reload(mymodule)

# Import without executing — compile only
import importlib.util
spec = importlib.util.find_spec("json")
print(spec.origin)   # path to json.py

# Lazy imports — import only when needed
def use_pandas():
    import pandas as pd   # imported only when function is called
    return pd.DataFrame()

# __all__ in a module — controls what 'from module import *' exports
# mymodule.py
__all__ = ["public_func", "PublicClass"]  # only these are exported by *
```

---

## Key Standard Library Modules

```python
# ── os — operating system interface ─────────────────────────────────────────
import os
os.getcwd()                    # current working directory
os.chdir("/tmp")               # change directory
os.listdir(".")                # list directory contents
os.makedirs("a/b/c", exist_ok=True)  # create nested dirs
os.remove("file.txt")          # delete file
os.rename("old.txt", "new.txt")
os.path.exists("file.txt")     # check existence
os.path.join("dir", "file.txt") # path join (cross-platform)
os.path.dirname("/a/b/c.txt")  # "/a/b"
os.path.basename("/a/b/c.txt") # "c.txt"
os.path.splitext("file.txt")   # ("file", ".txt")
os.environ.get("HOME")         # environment variable
os.getpid()                    # process ID
os.cpu_count()                 # number of CPUs

# ── sys ─────────────────────────────────────────────────────────────────────
import sys
sys.argv                       # command-line arguments
sys.exit(0)                    # exit program
sys.version                    # Python version string
sys.platform                   # "linux", "darwin", "win32"
sys.stdin / sys.stdout / sys.stderr

# ── pathlib — modern path handling ──────────────────────────────────────────
from pathlib import Path
p = Path(".")
p = Path("/home/user/docs/file.txt")
p.name           # "file.txt"
p.stem           # "file"
p.suffix         # ".txt"
p.parent         # Path("/home/user/docs")
p.exists()       # True/False
p.is_file()      # True/False
p.is_dir()       # True/False
p.read_text()    # read file contents as string
p.write_text("hello")
p.mkdir(parents=True, exist_ok=True)
list(p.glob("*.txt"))          # list .txt files
list(p.rglob("*.py"))         # recursive glob

# ── json ─────────────────────────────────────────────────────────────────────
import json
data = {"name": "Alice", "age": 30}
json_str = json.dumps(data, indent=2)      # Python → JSON string
parsed = json.loads(json_str)              # JSON string → Python
json.dump(data, open("out.json", "w"))     # write to file
data = json.load(open("out.json"))         # read from file

# ── datetime ─────────────────────────────────────────────────────────────────
from datetime import datetime, date, timedelta
now = datetime.now()
today = date.today()
dt = datetime(2024, 1, 15, 10, 30)
dt.strftime("%Y-%m-%d %H:%M:%S")   # format to string
datetime.strptime("2024-01-15", "%Y-%m-%d")  # parse from string
now + timedelta(days=7)             # add 7 days

# ── collections ──────────────────────────────────────────────────────────────
from collections import Counter, defaultdict, deque, namedtuple, OrderedDict
Counter("hello")                    # {'l':2,'h':1,'e':1,'o':1}
d = defaultdict(list)              # auto-creates missing keys
q = deque([1,2,3], maxlen=5)      # double-ended queue
q.appendleft(0); q.rotate(1)      # efficient operations at both ends

# ── itertools ────────────────────────────────────────────────────────────────
import itertools
list(itertools.chain([1,2],[3,4]))        # [1,2,3,4]
list(itertools.product("AB", [1,2]))     # [('A',1),('A',2),('B',1),('B',2)]
list(itertools.combinations([1,2,3], 2)) # [(1,2),(1,3),(2,3)]
list(itertools.permutations([1,2,3], 2)) # [(1,2),(1,3),(2,1),(2,3),(3,1),(3,2)]
list(itertools.islice(itertools.count(), 5))  # [0,1,2,3,4]
list(itertools.groupby([1,1,2,2,3], key=lambda x: x))  # group consecutive

# ── functools ────────────────────────────────────────────────────────────────
from functools import reduce, partial, lru_cache, wraps
reduce(lambda x,y: x+y, [1,2,3,4])   # 10
double = partial(lambda x,n: x*n, n=2)  # partial application
@lru_cache(maxsize=128)
def fib(n): ...  # memoisation

# ── math ─────────────────────────────────────────────────────────────────────
import math
math.sqrt(16)     # 4.0
math.floor(3.7)   # 3
math.ceil(3.2)    # 4
math.factorial(5) # 120
math.pi           # 3.141592653589793
math.e            # 2.718281828459045
math.log(100, 10) # 2.0  (log base 10)
math.log2(8)      # 3.0
math.sin(math.pi/2)  # 1.0
math.gcd(48, 18)  # 6

# ── random ────────────────────────────────────────────────────────────────────
import random
random.random()                # float in [0.0, 1.0)
random.randint(1, 10)          # random int including both ends
random.choice([1,2,3])         # random element from sequence
random.choices([1,2,3], k=5)  # k random with replacement
random.sample([1,2,3,4,5], k=3)  # k random without replacement
random.shuffle([1,2,3])        # shuffle in place
random.seed(42)                # reproducible randomness

# ── re ────────────────────────────────────────────────────────────────────────
import re  # see py-regex.md for full reference
re.match(r"\d+", "42abc")      # match at start
re.search(r"\d+", "abc42def")  # match anywhere
re.findall(r"\d+", "1 and 2")  # all matches
re.sub(r"\d+", "NUM", "1 and 2") # replace

# ── subprocess ────────────────────────────────────────────────────────────────
import subprocess
result = subprocess.run(["ls", "-la"], capture_output=True, text=True)
print(result.stdout)
print(result.returncode)  # 0 = success

# ── typing ────────────────────────────────────────────────────────────────────
from typing import List, Dict, Tuple, Optional, Union, Any, Callable
# Python 3.10+ use built-in types:
def greet(name: str) -> str: ...
def process(items: list[int]) -> dict[str, int]: ...
def find(x: int | None) -> int | None: ...
```

---

## pip and Virtual Environments

```python
# Virtual environment workflow
python -m venv venv              # create
source venv/bin/activate          # activate (Mac/Linux)
venv\Scripts\activate             # activate (Windows)
pip install requests              # install into venv only
pip install -r requirements.txt  # install all deps
pip freeze > requirements.txt    # save deps
deactivate                        # deactivate

# pip commands
pip install package               # install latest
pip install package==1.2.3        # specific version
pip install "package>=1.0,<2.0"  # version range
pip install -e .                  # install current project in editable mode
pip uninstall package
pip list                          # all installed
pip show package                  # package details
pip search package                # search PyPI (deprecated; use pypi.org)
pip install --upgrade package
pip install --no-cache-dir package

# pyproject.toml (modern standard — replaces setup.py)
[project]
name = "my-project"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.28",
    "fastapi>=0.100",
]

[project.optional-dependencies]
dev = ["pytest", "mypy", "ruff"]
```

---

## Tips

- Always use a virtual environment — never install packages globally.
- Use `from package import specific_thing` rather than `import *` — makes dependencies explicit.
- `if __name__ == "__main__":` guard is essential for any module that also runs as a script.
- `pathlib.Path` is the modern, object-oriented replacement for `os.path` — prefer it for all path operations.
- `collections.deque` is O(1) for append/pop from both ends — use it instead of `list` when you need a queue.

---

## Summary

- A module is a `.py` file; a package is a directory with `__init__.py`.
- `import module`, `from module import name`, `import module as alias` — the three import styles.
- `if __name__ == "__main__":` — code that runs only when the file is executed directly.
- Key stdlib: `os`, `sys`, `pathlib`, `json`, `datetime`, `collections`, `itertools`, `functools`, `math`, `random`, `re`, `subprocess`.
- Always use virtual environments (`python -m venv venv`) — one per project.
- `pyproject.toml` is the modern way to declare project metadata and dependencies.
