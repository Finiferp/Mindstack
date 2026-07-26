---
title: "JSON and REST APIs"
sidebar_label: "JSON & APIs"
sidebar_position: 14
---

# JSON and REST APIs

Working with JSON data, the `requests` library, REST API patterns, and API authentication.

---

## JSON Module

```python
import json

# Python → JSON string
data = {
    "name": "Alice",
    "age": 30,
    "active": True,
    "score": None,
    "tags": ["python", "web"],
    "address": {"city": "NYC", "zip": "10001"}
}

# Type mapping: Python → JSON
# dict       → object {}
# list,tuple → array []
# str        → string ""
# int,float  → number
# True/False → true/false
# None       → null

json_str = json.dumps(data)                 # compact
json_str = json.dumps(data, indent=2)       # pretty-printed
json_str = json.dumps(data, indent=2, sort_keys=True)
json_str = json.dumps(data, ensure_ascii=False)  # keep Unicode chars

# JSON string → Python
parsed = json.loads(json_str)
print(type(parsed))      # dict
print(parsed["name"])    # Alice

# File I/O
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

with open("data.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)

# Custom serialisation
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, UUID):
            return str(obj)
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)

json.dumps({"ts": datetime.now(), "price": Decimal("9.99")},
           cls=CustomEncoder)

# Using default= parameter (simpler for one type)
json.dumps({"ts": datetime.now()},
           default=lambda o: o.isoformat() if isinstance(o, datetime) else str(o))

# Custom decoding
def decode_datetime(d):
    for key, value in d.items():
        if key.endswith("_at") and isinstance(value, str):
            try:
                d[key] = datetime.fromisoformat(value)
            except ValueError:
                pass
    return d

parsed = json.loads(json_str, object_hook=decode_datetime)

# Validate JSON
def is_valid_json(text):
    try:
        json.loads(text)
        return True
    except json.JSONDecodeError:
        return False
```

---

## requests Library

```python
# pip install requests
import requests

BASE_URL = "https://jsonplaceholder.typicode.com"

# ── GET request ──────────────────────────────────────────────────────────────
response = requests.get(f"{BASE_URL}/posts/1")

# Response object
print(response.status_code)       # 200
print(response.ok)                 # True (status 200-299)
print(response.headers)            # dict of headers
print(response.headers["Content-Type"])
print(response.text)               # response body as string
print(response.json())             # parse JSON body → Python dict/list
print(response.content)            # raw bytes

# Raise exception for 4xx/5xx responses
response.raise_for_status()       # raises HTTPError if not 2xx

# Query parameters
params = {"userId": 1, "_limit": 5}
response = requests.get(f"{BASE_URL}/posts", params=params)
print(response.url)  # https://jsonplaceholder.typicode.com/posts?userId=1&_limit=5

# ── POST request ─────────────────────────────────────────────────────────────
payload = {"title": "New Post", "body": "Content", "userId": 1}

# Send JSON body
response = requests.post(f"{BASE_URL}/posts", json=payload)
print(response.status_code)   # 201 Created
print(response.json())

# Send form data
response = requests.post(url, data={"field": "value"})

# Send files
files = {"file": ("report.pdf", open("report.pdf", "rb"), "application/pdf")}
response = requests.post(url, files=files)

# ── PUT / PATCH / DELETE ─────────────────────────────────────────────────────
response = requests.put(f"{BASE_URL}/posts/1", json={"title": "Updated"})
response = requests.patch(f"{BASE_URL}/posts/1", json={"title": "Patched"})
response = requests.delete(f"{BASE_URL}/posts/1")

# ── Headers ──────────────────────────────────────────────────────────────────
headers = {
    "Authorization": "Bearer my-token",
    "Accept": "application/json",
    "X-Request-ID": "abc123",
}
response = requests.get(url, headers=headers)

# ── Timeout ──────────────────────────────────────────────────────────────────
response = requests.get(url, timeout=5)         # 5 second timeout
response = requests.get(url, timeout=(3, 10))   # (connect timeout, read timeout)

# ── Session — reuse connection, persist headers/cookies ──────────────────────
session = requests.Session()
session.headers.update({"Authorization": "Bearer token"})
session.headers.update({"User-Agent": "MyApp/1.0"})

response = session.get(f"{BASE_URL}/posts")     # header applied automatically
response = session.post(f"{BASE_URL}/posts", json=payload)

# Session with base URL pattern
class APIClient:
    def __init__(self, base_url, token):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        })
        self.base_url = base_url

    def get(self, path, **kwargs):
        return self.session.get(f"{self.base_url}{path}", **kwargs)

    def post(self, path, **kwargs):
        return self.session.post(f"{self.base_url}{path}", **kwargs)
```

---

## Error Handling for API Calls

```python
import requests
from requests.exceptions import (
    ConnectionError,
    Timeout,
    HTTPError,
    RequestException
)

def fetch_user(user_id):
    try:
        response = requests.get(
            f"https://api.example.com/users/{user_id}",
            timeout=10,
            headers={"Authorization": "Bearer token"}
        )
        response.raise_for_status()   # raises HTTPError for 4xx/5xx
        return response.json()

    except Timeout:
        raise RuntimeError("Request timed out")
    except ConnectionError:
        raise RuntimeError("Failed to connect to API")
    except HTTPError as e:
        if e.response.status_code == 404:
            return None
        if e.response.status_code == 401:
            raise PermissionError("Invalid credentials")
        raise RuntimeError(f"API error: {e.response.status_code}")
    except RequestException as e:
        raise RuntimeError(f"Request failed: {e}")

# Retry with backoff
import time

def get_with_retry(url, max_retries=3, backoff=1.0):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except (Timeout, ConnectionError) as e:
            if attempt == max_retries - 1:
                raise
            wait = backoff * (2 ** attempt)
            print(f"Attempt {attempt+1} failed. Retrying in {wait}s...")
            time.sleep(wait)
```

---

## Authentication Patterns

```python
import requests

# Basic auth
response = requests.get(url, auth=("username", "password"))
response = requests.get(url, auth=requests.auth.HTTPBasicAuth("user", "pass"))

# Bearer token
headers = {"Authorization": "Bearer eyJhbGci..."}
response = requests.get(url, headers=headers)

# API key in header
response = requests.get(url, headers={"X-API-Key": "my-api-key"})

# API key in query params
response = requests.get(url, params={"api_key": "my-api-key"})

# OAuth2 with requests-oauthlib
# pip install requests-oauthlib
from requests_oauthlib import OAuth2Session
oauth = OAuth2Session(client_id, redirect_uri=redirect_uri)
authorization_url, state = oauth.authorization_url(auth_url)

# Digest auth
response = requests.get(url, auth=requests.auth.HTTPDigestAuth("user", "pass"))

# Custom auth class
class TokenAuth(requests.auth.AuthBase):
    def __init__(self, token):
        self.token = token

    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {self.token}"
        return r

response = requests.get(url, auth=TokenAuth("my-token"))
```

---

## httpx — Modern Alternative to requests

```python
# pip install httpx
# Supports async, HTTP/2, better defaults

import httpx

# Sync (drop-in requests replacement)
with httpx.Client(base_url="https://api.example.com") as client:
    response = client.get("/users/1")
    response = client.post("/users", json={"name": "Alice"})

# Async
import asyncio

async def fetch_multiple():
    async with httpx.AsyncClient(base_url="https://api.example.com") as client:
        # Concurrent requests
        tasks = [client.get(f"/users/{i}") for i in range(1, 11)]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]

asyncio.run(fetch_multiple())
```

---

## Consuming Common APIs — Examples

```python
import requests

# GitHub API
def get_user_repos(username):
    url = f"https://api.github.com/users/{username}/repos"
    headers = {"Accept": "application/vnd.github.v3+json"}
    response = requests.get(url, headers=headers, params={"per_page": 100})
    response.raise_for_status()
    return [{"name": r["name"], "stars": r["stargazers_count"]}
            for r in response.json()]

# OpenWeatherMap
def get_weather(city, api_key):
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": api_key, "units": "metric"}
    r = requests.get(url, params=params, timeout=5)
    r.raise_for_status()
    data = r.json()
    return {
        "city": data["name"],
        "temp": data["main"]["temp"],
        "description": data["weather"][0]["description"],
    }

# Pagination — handle paginated APIs
def get_all_pages(url, headers=None, params=None):
    results = []
    page = 1
    while True:
        p = {**(params or {}), "page": page, "per_page": 100}
        r = requests.get(url, headers=headers, params=p, timeout=10)
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        results.extend(data)
        page += 1
    return results
```

---

## Tips

- Always set a `timeout` — without it, a hung server will block your program indefinitely.
- Use `response.raise_for_status()` right after every request — makes 4xx/5xx failures explicit rather than silently returning wrong data.
- Use `requests.Session()` when making multiple calls to the same API — reuses the TCP connection and reduces overhead.
- Store API keys in environment variables (`os.environ.get("API_KEY")`), never in source code.
- `httpx` is the modern upgrade from `requests` — it supports async, HTTP/2, and has a cleaner API.

---

## Summary

- `json.dumps(data, indent=2)` → JSON string; `json.loads(text)` → Python object.
- `json.dump(data, file)` → write to file; `json.load(file)` → read from file.
- `requests.get/post/put/patch/delete(url, params=, json=, headers=, timeout=)`.
- `response.status_code`, `response.json()`, `response.raise_for_status()` — the three most used response attributes.
- Use `requests.Session()` for multiple API calls — persists headers, cookies, and TCP connections.
- Always handle `Timeout`, `ConnectionError`, `HTTPError` — production API calls always fail eventually.
