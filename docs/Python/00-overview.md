---
title: "Python Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# Python Overview

Python is the world's most popular programming language — readable, versatile, and backed by one of the largest ecosystems in software. Used everywhere from scripting and data science to web APIs and machine learning.

This is a **condensed reference**, not a tutorial. Each page covers the most important syntax and patterns for that topic. When you need depth, use the official resources below.

---

## Official Resources

| Resource | What it covers | Link |
|---|---|---|
| **Python Docs** | Full language reference and stdlib | [docs.python.org/3](https://docs.python.org/3) |
| **Python Tutorial** | Official beginner tutorial | [docs.python.org/3/tutorial](https://docs.python.org/3/tutorial) |
| **W3Schools Python** | Quick examples and exercises | [w3schools.com/python](https://www.w3schools.com/python) |
| **Real Python** | In-depth practical articles | [realpython.com](https://realpython.com) |
| **PyPI** | Package index (pip packages) | [pypi.org](https://pypi.org) |
| **Django Docs** | Django full reference | [docs.djangoproject.com](https://docs.djangoproject.com) |
| **FastAPI Docs** | FastAPI full reference | [fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| **Pydantic Docs** | Pydantic v2 reference | [docs.pydantic.dev](https://docs.pydantic.dev) |

**How to look things up fast:**
- `python -m pydoc str` — offline docs for any builtin or module
- `help(str)` inside the Python REPL
- `dir(obj)` — list all attributes/methods of any object

---

## Why Python

```
Readable syntax — code reads almost like English
Huge standard library — "batteries included"
Massive ecosystem — 500,000+ packages on PyPI
Versatile — web, data science, ML, scripting, automation, APIs
Rapid development — prototype in hours, not days
Cross-platform — Windows, macOS, Linux
Interpreted — no compile step; instant feedback
Dynamically typed — less boilerplate, faster to write
```

---

## Where Python Is Used

```
Web backends:        Django, FastAPI, Flask (Instagram, Pinterest, Dropbox)
Data science:        NumPy, Pandas, Matplotlib, SciPy
Machine learning:    TensorFlow, PyTorch, scikit-learn
Automation:          Selenium, Playwright, scripting
DevOps:              Ansible, Fabric, AWS Lambda, Google Cloud Functions
APIs:                FastAPI, Django REST Framework
Databases:           SQLAlchemy, Django ORM, SQLite
CLI tools:           Click, Typer, argparse
Testing:             pytest, unittest, hypothesis
```

---

## Installation and Setup

```bash
# Check if installed
python --version       # or python3 --version

# Install (macOS via Homebrew)
brew install python

# Install (Ubuntu/Debian)
sudo apt install python3 python3-pip python3-venv

# Windows: download from python.org

# Virtual environments (always use one per project)
python -m venv venv             # create
source venv/bin/activate         # activate (Mac/Linux)
venv\Scripts\activate            # activate (Windows)
deactivate                       # deactivate

# pip — package manager
pip install requests             # install a package
pip install -r requirements.txt  # install from file
pip freeze > requirements.txt    # save current packages
pip list                         # list installed packages
pip show requests                # details about a package
pip uninstall requests           # remove a package
pip install --upgrade requests   # upgrade

# Modern tools (prefer over raw pip)
pip install uv                   # ultra-fast package/project manager (Astral)
uv venv && source .venv/bin/activate
uv pip install requests

# pyproject.toml — modern project config (replaces setup.py)
# [project]
# name = "my-app"
# version = "0.1.0"
# requires-python = ">=3.11"
# dependencies = ["fastapi", "sqlalchemy"]
```

---

## Python Versions

```
Python 2: end-of-life January 2020 — never use
Python 3.8: minimum for most modern code
Python 3.10: structural pattern matching (match/case)
Python 3.11: 25% faster, better error messages
Python 3.12: f-string improvements, better error messages
Python 3.13: current stable (2024) — free-threaded mode (no GIL!)

Always use Python 3.11+ for new projects.
Check version: python --version
```

---

## Tips

- Use Python 3.11+ — the performance improvements alone are worth it.
- Always use a virtual environment — never install packages globally.
- `python -m module` is the correct way to run modules (`python -m pytest`, `python -m http.server`).
- Type hints (`def greet(name: str) -> str:`) are not enforced at runtime but enable IDE autocomplete, mypy checks, and FastAPI magic.
- `uv` is dramatically faster than `pip` for package installation — worth adopting for any new project.
