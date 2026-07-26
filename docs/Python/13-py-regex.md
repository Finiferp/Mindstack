---
title: "Regular Expressions"
sidebar_label: "Regex"
sidebar_position: 13
---

# Regular Expressions

The `re` module — patterns, flags, all functions, groups, lookaheads, and common patterns.

---

## The re Module — Core Functions

```python
import re

text = "Hello, my email is alice@example.com and phone is 555-1234."

# re.match() — match at the BEGINNING of string
m = re.match(r"Hello", text)          # Match object or None
m = re.match(r"\d+", text)            # None (no digits at start)

# re.search() — find FIRST match ANYWHERE in string
m = re.search(r"\d+", text)           # Match: "555"
if m:
    print(m.group())   # "555"
    print(m.start())   # start index
    print(m.end())     # end index
    print(m.span())    # (start, end) tuple

# re.findall() — return list of ALL matches
emails = re.findall(r"\w+@\w+\.\w+", text)  # ["alice@example.com"]
digits = re.findall(r"\d+", text)            # ["555", "1234"]

# re.finditer() — return iterator of Match objects (memory efficient)
for m in re.finditer(r"\d+", text):
    print(f"Found {m.group()} at {m.span()}")

# re.sub() — replace matches
result = re.sub(r"\d+", "NUM", text)   # replace all numbers with NUM
result = re.sub(r"\d+", "NUM", text, count=1)   # replace first only

# re.subn() — like sub() but also returns count of replacements
new_text, count = re.subn(r"\d+", "NUM", text)

# re.split() — split by pattern
parts = re.split(r"\s+", "one  two   three")   # ["one","two","three"]
parts = re.split(r"[,;]\s*", "a, b; c,d")      # ["a","b","c","d"]
parts = re.split(r"(\s+)", "one two")           # ["one"," ","two"] (keep separator)

# re.fullmatch() — entire string must match
m = re.fullmatch(r"\d{3}-\d{4}", "555-1234")   # matches
m = re.fullmatch(r"\d{3}-\d{4}", "555-12345")  # None

# Compile pattern for reuse (faster in loops)
pattern = re.compile(r"\d+")
pattern.findall(text)
pattern.search(text)
pattern.sub("NUM", text)
```

---

## Pattern Syntax

```python
# ── Character classes ─────────────────────────────────────────────────────────
r"\d"       # any digit [0-9]
r"\D"       # any non-digit
r"\w"       # word char [a-zA-Z0-9_]
r"\W"       # non-word char
r"\s"       # whitespace [ \t\n\r\f\v]
r"\S"       # non-whitespace
r"."        # any char except newline (use re.DOTALL for all)
r"[aeiou]"  # any vowel
r"[^aeiou]" # any non-vowel
r"[a-z]"    # lowercase a-z
r"[A-Z0-9]" # uppercase or digit

# ── Quantifiers ───────────────────────────────────────────────────────────────
r"a*"       # 0 or more 'a'
r"a+"       # 1 or more 'a'
r"a?"       # 0 or 1 'a'
r"a{3}"     # exactly 3 'a'
r"a{2,5}"   # 2 to 5 'a'
r"a{2,}"    # 2 or more 'a'
r"a{,5}"    # 0 to 5 'a'

# Greedy vs lazy (non-greedy)
r"<.*>"     # greedy: matches as much as possible
r"<.*?>"    # lazy: matches as little as possible
r"<.+?>"    # lazy +

# ── Anchors ───────────────────────────────────────────────────────────────────
r"^"        # start of string (or line with MULTILINE)
r"$"        # end of string (or line with MULTILINE)
r"\b"       # word boundary
r"\B"       # non-word boundary
r"\A"       # start of string (never changes with MULTILINE)
r"\Z"       # end of string (never changes with MULTILINE)

# ── Alternation and grouping ──────────────────────────────────────────────────
r"cat|dog"         # "cat" or "dog"
r"(cat|dog)s?"     # "cat", "cats", "dog", "dogs"
r"(ab)+"           # "ab", "abab", "ababab"
r"(?:ab)+"         # non-capturing group (don't capture "ab")
r"(?P<year>\d{4})" # named group called "year"

# ── Lookahead / lookbehind ────────────────────────────────────────────────────
r"foo(?=bar)"   # foo followed by bar (bar not included in match)
r"foo(?!bar)"   # foo NOT followed by bar
r"(?<=foo)bar"  # bar preceded by foo (foo not included)
r"(?<!foo)bar"  # bar NOT preceded by foo

# Examples
re.findall(r"\d+(?= dollars)", "5 dollars and 10 euros")   # ["5"]
re.findall(r"(?<=\$)\d+", "$100 and $200")                 # ["100","200"]
```

---

## Groups and Capturing

```python
# Capturing groups — () captures a substring
m = re.search(r"(\w+)@(\w+)\.(\w+)", "alice@example.com")
m.group(0)    # "alice@example.com"  (entire match)
m.group(1)    # "alice"              (first group)
m.group(2)    # "example"            (second group)
m.group(3)    # "com"                (third group)
m.groups()    # ("alice","example","com")  (all groups as tuple)

# Named groups
m = re.search(
    r"(?P<user>\w+)@(?P<domain>\w+)\.(?P<tld>\w+)",
    "alice@example.com"
)
m.group("user")    # "alice"
m.group("domain")  # "example"
m.groupdict()      # {"user":"alice","domain":"example","tld":"com"}

# Backreferences — refer to previous group
re.search(r"(\w+) \1", "hello hello world")  # matches "hello hello"
re.sub(r"(\w+) \1", r"\1", "hello hello")   # "hello" (remove duplicate word)

# Non-capturing group (?:...)
m = re.search(r"(?:Mr|Mrs|Ms)\. (\w+)", "Mrs. Smith")
m.group(1)    # "Smith" (not "Mrs")
m.groups()    # ("Smith",)

# findall with groups returns list of tuples
re.findall(r"(\d+)-(\d+)", "555-1234 and 800-5555")
# [("555","1234"),("800","5555")]

# Using groups in re.sub
# Swap first and last name
re.sub(r"(\w+) (\w+)", r"\2, \1", "Alice Smith")  # "Smith, Alice"
re.sub(r"(?P<first>\w+) (?P<last>\w+)", r"\g<last>, \g<first>", "Alice Smith")
```

---

## Flags

```python
# Pass as third argument or use inline (?i)

re.search(r"hello", "HELLO WORLD", re.IGNORECASE)  # case-insensitive
re.search(r"hello", "HELLO WORLD", re.I)            # shorthand

re.findall(r"^\d+", text, re.MULTILINE)   # ^ matches start of each line
re.findall(r"^\d+", text, re.M)           # shorthand

re.search(r"hello.world", "hello\nworld", re.DOTALL)  # . matches \n
re.search(r"hello.world", "hello\nworld", re.S)        # shorthand

re.search(r"hello world", text, re.VERBOSE)  # ignore whitespace in pattern

# Combine flags
re.findall(r"^\w+", text, re.MULTILINE | re.IGNORECASE)

# Inline flags (?ifmsux) inside pattern
re.search(r"(?i)hello", "HELLO")    # case-insensitive inline
re.search(r"(?m)^\d+", text)        # multiline inline

# re.VERBOSE — write readable multi-line patterns
date_pattern = re.compile(r"""
    (?P<year>  \d{4})   # four-digit year
    [-/]                 # separator
    (?P<month> \d{1,2}) # one or two digit month
    [-/]
    (?P<day>   \d{1,2}) # one or two digit day
""", re.VERBOSE)
```

---

## Common Patterns

```python
import re

# Email
email = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

# URL
url = r"https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)"

# Phone (US)
phone = r"(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"

# IP address
ip = r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"

# Date (YYYY-MM-DD)
date = r"\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b"

# Credit card (basic)
credit_card = r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"

# Postal code (US ZIP)
zip_code = r"\b\d{5}(?:-\d{4})?\b"

# Strong password (min 8 chars, upper, lower, digit, special)
password = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"

# Hex colour
hex_colour = r"#(?:[0-9a-fA-F]{3}){1,2}\b"

# Slug (URL-friendly)
slug = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"

# Example usage
def validate_email(email_str):
    pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    return bool(pattern.match(email_str))

def extract_urls(text):
    pattern = re.compile(r"https?://\S+")
    return pattern.findall(text)

def mask_credit_card(text):
    return re.sub(r"\b(\d{4})[- ]?\d{4}[- ]?\d{4}[- ]?(\d{4})\b",
                  r"\1-****-****-\2", text)
```

---

## Tips

- Always use raw strings (`r"..."`) for regex patterns — avoids double-escaping backslashes.
- `re.compile()` once and reuse — faster when the same pattern is used many times.
- Use named groups (`(?P<name>...)`) in complex patterns — self-documenting and accessible by name.
- Prefer `re.search()` over `re.match()` — `match` only checks the start of the string, which surprises most people.
- Use `re.VERBOSE` for complex patterns — add whitespace and comments to make the regex readable.
- Test your regex at [regex101.com](https://regex101.com) — choose Python flavour for accurate testing.

---

## Summary

- `re.search()` — find anywhere; `re.match()` — match at start; `re.fullmatch()` — entire string.
- `re.findall()` — list of matches; `re.finditer()` — iterator of Match objects.
- `re.sub(pattern, repl, string)` — replace matches; `re.split(pattern, string)` — split by pattern.
- Groups: `()` captures; `(?:)` non-capturing; `(?P<name>)` named; `\1` backreference.
- Quantifiers: `*` (0+), `+` (1+), `?` (0-1), `{n,m}` (range); add `?` for lazy match.
- Flags: `re.I` (case-insensitive), `re.M` (multiline), `re.S` (dot matches newline), `re.X` (verbose).
