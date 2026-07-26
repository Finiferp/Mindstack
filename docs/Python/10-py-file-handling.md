---
title: "File Handling"
sidebar_label: "File Handling"
sidebar_position: 10
---

# File Handling

Reading and writing files, pathlib, CSV, JSON, and working with directories.

---

## Opening Files — open()

```python
# open(file, mode, encoding)
# Always use a context manager (with) — auto-closes the file

# Modes
# "r"  — read (default); error if file doesn't exist
# "w"  — write; creates or OVERWRITES
# "a"  — append; creates if not exists; adds to end
# "x"  — exclusive create; error if file exists
# "rb" — read binary
# "wb" — write binary
# "r+" — read and write
# "b"  — binary mode (add to any mode)
# "t"  — text mode (default)

# Always specify encoding for text files
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Without context manager (not recommended)
f = open("file.txt", "r")
try:
    content = f.read()
finally:
    f.close()   # must close manually
```

---

## Reading Files

```python
# Read entire file as a string
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()
    print(content)

# Read line by line (memory efficient for large files)
with open("file.txt", "r", encoding="utf-8") as f:
    for line in f:                    # file object is iterable
        print(line.strip())           # strip newline

# Read all lines into a list
with open("file.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()             # ["line1\n", "line2\n", ...]

# Read one line at a time
with open("file.txt", "r", encoding="utf-8") as f:
    first_line = f.readline()         # "line1\n"
    second_line = f.readline()        # "line2\n"

# Read a specific number of characters
with open("file.txt", "r", encoding="utf-8") as f:
    chunk = f.read(100)               # first 100 characters

# Tell and seek — file position
with open("file.txt", "r", encoding="utf-8") as f:
    f.read(10)
    print(f.tell())   # current position in bytes
    f.seek(0)         # go back to start
    f.seek(0, 2)      # go to end (whence=2)

# Read binary file
with open("image.png", "rb") as f:
    data = f.read()
    print(data[:4])   # b'\x89PNG'

# Check file header / magic bytes
with open("file", "rb") as f:
    header = f.read(4)
    if header == b"\x89PNG":
        print("PNG image")
    elif header[:2] == b"PK":
        print("ZIP file")
```

---

## Writing Files

```python
# Write string to file (overwrites if exists)
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("Hello, World!\n")
    f.write("Second line\n")

# Write multiple lines
lines = ["line one\n", "line two\n", "line three\n"]
with open("output.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)           # no separator added automatically

# Use print() to write to file
with open("output.txt", "w", encoding="utf-8") as f:
    print("Hello", file=f)
    print("World", file=f)
    print(f"Pi = {3.14:.4f}", file=f)

# Append to existing file
with open("log.txt", "a", encoding="utf-8") as f:
    f.write("New log entry\n")

# Buffered writing — flush manually or let context manager handle it
with open("output.txt", "w", encoding="utf-8") as f:
    for i in range(1000):
        f.write(f"line {i}\n")
    # flushed and closed on __exit__

# Write binary data
with open("output.bin", "wb") as f:
    f.write(b"\x00\x01\x02\x03")
    f.write(bytes([10, 20, 30, 40]))

# Atomic write pattern — write to temp, rename (safe against corruption)
import os, tempfile

def atomic_write(path, content):
    dir_name = os.path.dirname(path) or "."
    with tempfile.NamedTemporaryFile("w", dir=dir_name,
                                      delete=False, encoding="utf-8") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    os.replace(tmp_path, path)   # atomic on POSIX
```

---

## pathlib — Modern Path Handling

```python
from pathlib import Path

# Creating paths
p = Path(".")                          # current directory
p = Path("/home/user/docs/file.txt")   # absolute
p = Path("data") / "processed" / "out.csv"  # join with /

# Path components
p = Path("/home/user/docs/report.txt")
p.name          # "report.txt"
p.stem          # "report"
p.suffix        # ".txt"
p.suffixes      # [".txt"] (or [".tar", ".gz"] for .tar.gz)
p.parent        # Path("/home/user/docs")
p.parents[0]    # Path("/home/user/docs")
p.parents[1]    # Path("/home/user")
p.parts         # ('/', 'home', 'user', 'docs', 'report.txt')
p.anchor        # "/"  (on Windows: "C:\\")

# Checking
p.exists()      # True/False
p.is_file()     # True/False
p.is_dir()      # True/False
p.is_absolute() # True
p.is_relative_to("/home")  # True (Python 3.9+)

# Reading and writing (convenience methods)
text = p.read_text(encoding="utf-8")
p.write_text("content", encoding="utf-8")
data = p.read_bytes()
p.write_bytes(b"\x00\x01")

# Directory operations
p = Path("my_dir")
p.mkdir()                          # create directory
p.mkdir(parents=True, exist_ok=True)  # create all parents; no error if exists
p.rmdir()                          # remove empty directory
import shutil
shutil.rmtree(p)                   # remove directory and all contents

# Listing directory contents
p = Path(".")
list(p.iterdir())                  # all entries (files and dirs)
list(p.glob("*.py"))              # files matching pattern
list(p.glob("**/*.py"))          # recursive glob (all .py files)
list(p.rglob("*.py"))            # same as **/*.py

# File operations
p.touch()                          # create empty file or update mtime
p.unlink()                         # delete file
p.unlink(missing_ok=True)         # no error if not found (Python 3.8+)
p.rename(Path("new_name.txt"))    # rename (move within same filesystem)
p.replace(Path("dest.txt"))       # rename (overwrites dest)
shutil.copy2(p, Path("backup"))   # copy file with metadata

# Resolve
p = Path("../docs/./file.txt")
p.resolve()                        # absolute path, resolves symlinks and ..

# Path to string
str(p)                             # "/home/user/docs/file.txt"
p.as_posix()                       # always forward slashes (cross-platform)

# Example: process all CSV files in a directory
data_dir = Path("data/raw")
output_dir = Path("data/processed")
output_dir.mkdir(exist_ok=True)

for csv_file in data_dir.glob("*.csv"):
    output_file = output_dir / csv_file.name
    process(csv_file, output_file)
```

---

## CSV Files

```python
import csv

# Read CSV
with open("data.csv", "r", newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)           # skip header row
    for row in reader:
        print(row)                  # list of strings

# Read CSV as dict (header row becomes keys)
with open("data.csv", "r", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])  # access by column name

# Write CSV
rows = [["Alice", 30, "NYC"], ["Bob", 25, "LA"]]
with open("output.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age", "city"])   # header
    writer.writerows(rows)                      # all rows at once

# Write CSV from dicts
data = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
with open("output.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age"])
    writer.writeheader()
    writer.writerows(data)

# Custom delimiter (TSV, semicolon-separated, etc.)
with open("data.tsv", "r", newline="") as f:
    reader = csv.reader(f, delimiter="\t")
```

---

## JSON Files

```python
import json

# Write JSON to file
data = {
    "name": "Alice",
    "age": 30,
    "hobbies": ["reading", "coding"],
    "address": {"city": "NYC", "zip": "10001"}
}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Read JSON from file
with open("data.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)

# JSON string conversion
json_str = json.dumps(data, indent=2, sort_keys=True)
parsed = json.loads(json_str)

# Custom serialisation (e.g. dates)
from datetime import datetime
import json

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

json.dumps({"ts": datetime.now()}, cls=DateTimeEncoder)

# or with a default function:
json.dumps({"ts": datetime.now()},
           default=lambda o: o.isoformat() if isinstance(o, datetime) else str(o))
```

---

## Working with Directories

```python
import os, shutil
from pathlib import Path

# Create directories
os.makedirs("a/b/c", exist_ok=True)
Path("a/b/c").mkdir(parents=True, exist_ok=True)

# List directory
os.listdir(".")                         # list names (unsorted)
for entry in os.scandir("."):          # more info (DirEntry objects)
    print(entry.name, entry.is_file(), entry.stat().st_size)

# Walk directory tree
for root, dirs, files in os.walk("."):
    for file in files:
        full_path = os.path.join(root, file)
        print(full_path)

# Copy / move / delete
shutil.copy("src.txt", "dst.txt")        # copy file (no metadata)
shutil.copy2("src.txt", "dst.txt")       # copy file with metadata
shutil.copytree("src_dir", "dst_dir")    # copy directory tree
shutil.move("src", "dst")               # move file or directory
shutil.rmtree("dir_to_delete")          # delete directory tree
os.remove("file.txt")                    # delete a file
os.unlink("file.txt")                   # same

# Temporary files and directories
import tempfile

with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
    tmp.write(b"temporary content")
    print(tmp.name)

with tempfile.TemporaryDirectory() as tmpdir:
    path = Path(tmpdir) / "file.txt"
    path.write_text("temp data")
    # directory deleted on exit
```

---

## Tips

- Always use `with open(...)` — it guarantees the file is closed even if an exception occurs.
- Specify `encoding="utf-8"` explicitly — the default depends on the OS (Windows often uses cp1252).
- Use `newline=""` when opening CSV files — lets the `csv` module handle line endings correctly.
- `pathlib.Path` is cleaner than `os.path` for everything path-related — prefer it in new code.
- For large files, iterate line-by-line (`for line in f:`) rather than `f.readlines()` to avoid loading the whole file into memory.

---

## Summary

- `with open(path, mode, encoding="utf-8") as f:` — always use context managers for files.
- Modes: `"r"` read, `"w"` write (overwrites), `"a"` append, `"rb"`/`"wb"` binary.
- `f.read()` whole file, `f.readlines()` all lines as list, `for line in f:` memory-efficient iteration.
- `pathlib.Path` — modern, cross-platform path operations: `read_text()`, `write_text()`, `glob()`, `mkdir()`.
- `csv.DictReader`/`DictWriter` — work with CSV rows as dicts (column names as keys).
- `json.load(f)` / `json.dump(data, f, indent=2)` — read/write JSON files.
