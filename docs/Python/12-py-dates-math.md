---
title: "Dates, Math, and Random"
sidebar_label: "Dates & Math"
sidebar_position: 12
---

# Dates, Math, and Random

The `datetime`, `math`, `random`, and `statistics` standard library modules.

---

## datetime Module

```python
from datetime import datetime, date, time, timedelta, timezone
import datetime as dt

# ── Current date and time ─────────────────────────────────────────────────────
now = datetime.now()          # local time, no timezone info
utc_now = datetime.now(timezone.utc)   # UTC with timezone info
today = date.today()          # date only (no time)

print(now)         # 2024-01-15 14:30:25.123456
print(today)       # 2024-01-15
print(utc_now)     # 2024-01-15 14:30:25.123456+00:00

# ── Creating datetime objects ─────────────────────────────────────────────────
dt1 = datetime(2024, 1, 15)             # year, month, day
dt2 = datetime(2024, 1, 15, 10, 30)    # + hour, minute
dt3 = datetime(2024, 1, 15, 10, 30, 45, 123456)  # + second, microsecond
d = date(2024, 1, 15)
t = time(10, 30, 45)

# ── Accessing components ──────────────────────────────────────────────────────
now = datetime.now()
now.year          # 2024
now.month         # 1
now.day           # 15
now.hour          # 14
now.minute        # 30
now.second        # 25
now.microsecond   # 123456
now.weekday()     # 0=Monday ... 6=Sunday
now.isoweekday()  # 1=Monday ... 7=Sunday
now.date()        # date object
now.time()        # time object

# ── Formatting ────────────────────────────────────────────────────────────────
now.strftime("%Y-%m-%d")              # "2024-01-15"
now.strftime("%d/%m/%Y %H:%M:%S")    # "15/01/2024 14:30:25"
now.strftime("%B %d, %Y")            # "January 15, 2024"
now.strftime("%A")                   # "Monday"
now.strftime("%I:%M %p")             # "02:30 PM"
now.isoformat()                       # "2024-01-15T14:30:25.123456"

# Format codes:
# %Y  4-digit year      %y  2-digit year
# %m  month 01-12       %B  month name    %b  month abbrev
# %d  day 01-31         %A  weekday name  %a  weekday abbrev
# %H  hour 00-23        %I  hour 01-12    %p  AM/PM
# %M  minute 00-59      %S  second 00-59
# %f  microseconds      %Z  timezone name %z  UTC offset
# %j  day of year       %U  week of year  %w  weekday 0=Sun

# ── Parsing ──────────────────────────────────────────────────────────────────
dt = datetime.strptime("2024-01-15", "%Y-%m-%d")
dt = datetime.strptime("15/01/2024 14:30", "%d/%m/%Y %H:%M")
dt = datetime.fromisoformat("2024-01-15T14:30:25")  # ISO 8601

# ── Arithmetic with timedelta ─────────────────────────────────────────────────
delta = timedelta(days=30)
delta = timedelta(weeks=2, days=3, hours=5, minutes=30)

future = now + timedelta(days=7)
past   = now - timedelta(hours=48)
diff   = future - now              # timedelta object

# timedelta attributes
delta = timedelta(days=1, hours=2, minutes=30)
delta.days            # 1
delta.seconds         # 9000  (only hours + minutes in seconds)
delta.total_seconds() # 95400.0  (everything as total seconds)

# Date arithmetic
d1 = date(2024, 1, 1)
d2 = date(2024, 12, 31)
days_between = (d2 - d1).days   # 365

# ── Timezone handling ─────────────────────────────────────────────────────────
from datetime import timezone, timedelta

utc = timezone.utc
est = timezone(timedelta(hours=-5), "EST")
cet = timezone(timedelta(hours=1), "CET")

# Create timezone-aware datetime
aware = datetime(2024, 1, 15, 10, 0, tzinfo=utc)
aware_est = aware.astimezone(est)   # convert to EST

# With zoneinfo (Python 3.9+)  ← recommended for real timezone support
from zoneinfo import ZoneInfo
ny = ZoneInfo("America/New_York")
paris = ZoneInfo("Europe/Paris")
now_ny = datetime.now(ny)
now_paris = now_ny.astimezone(paris)

# With third-party 'pytz' (legacy but still common)
# import pytz
# utc = pytz.UTC
# eastern = pytz.timezone("US/Eastern")

# ── Timestamps ────────────────────────────────────────────────────────────────
import time
timestamp = time.time()                           # Unix timestamp (float)
dt = datetime.fromtimestamp(timestamp)            # local time
dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)  # UTC
ts = datetime.now(timezone.utc).timestamp()       # datetime → timestamp
```

---

## math Module

```python
import math

# Constants
math.pi         # 3.141592653589793
math.e          # 2.718281828459045
math.tau        # 6.283185307179586  (2π)
math.inf        # float('inf')
math.nan        # float('nan')

# Basic operations
math.sqrt(16)       # 4.0   square root
math.cbrt(27)       # 3.0   cube root (Python 3.11+)
math.pow(2, 10)     # 1024.0  (returns float; use ** for int)
math.exp(1)         # 2.718...  (e^x)
math.log(100, 10)   # 2.0   (log base 10)
math.log2(8)        # 3.0
math.log10(1000)    # 3.0
math.log(math.e)    # 1.0   (natural log)

# Rounding
math.floor(3.7)     # 3   (largest int ≤ x)
math.ceil(3.2)      # 4   (smallest int ≥ x)
math.trunc(3.9)     # 3   (toward zero)
round(3.5)          # 4   (banker's rounding — built-in)

# Absolute value
abs(-5)             # 5   (built-in; works on any number)
math.fabs(-5.0)    # 5.0  (always float)

# Integer operations
math.factorial(5)   # 120
math.gcd(48, 18)    # 6    greatest common divisor
math.lcm(4, 6)      # 12   least common multiple (Python 3.9+)
math.comb(5, 2)     # 10   combinations (n choose k)
math.perm(5, 2)     # 20   permutations

# Float operations
math.isclose(0.1 + 0.2, 0.3, rel_tol=1e-9)  # True (safe float comparison)
math.isnan(float("nan"))    # True
math.isinf(float("inf"))    # True
math.isfinite(42.0)         # True

# Trigonometry (angles in radians)
math.sin(math.pi / 2)    # 1.0
math.cos(0)              # 1.0
math.tan(math.pi / 4)    # 1.0
math.asin(1.0)           # 1.5707... (π/2)
math.degrees(math.pi)    # 180.0  (radians → degrees)
math.radians(180)        # 3.14159...  (degrees → radians)

# Hyperbolic
math.sinh(1)   # 1.175...
math.cosh(1)   # 1.543...

# Useful combinations
math.hypot(3, 4)          # 5.0   (√(3²+4²) — Euclidean distance)
math.hypot(1, 1, 1)       # √3    (supports multiple args Python 3.8+)
math.dist((0,0), (3,4))   # 5.0   (Euclidean distance between two points)

# Sums with better precision
math.fsum([0.1, 0.2, 0.3])   # 0.6  (more accurate than sum())

# Number theory
math.prod([1,2,3,4,5])    # 120  (product of iterable, Python 3.8+)
```

---

## random Module

```python
import random

# Seed for reproducibility
random.seed(42)

# Floats
random.random()           # float in [0.0, 1.0)
random.uniform(1.5, 10.5) # float in [a, b]
random.gauss(0, 1)        # Gaussian: mean=0, std=1
random.normalvariate(0, 1)  # same; slightly slower but thread-safe
random.expovariate(1/30)    # exponential distribution (mean=30)

# Integers
random.randint(1, 10)     # int in [a, b] inclusive
random.randrange(0, 10)   # int in [start, stop) like range()
random.randrange(0, 100, 5)  # multiples of 5: 0,5,10,...95

# Sequences
items = [1, 2, 3, 4, 5, 6]
random.choice(items)              # one random element
random.choices(items, k=3)        # k random with replacement
random.choices(items, weights=[10,1,1,1,1,1], k=3)  # weighted
random.sample(items, k=3)         # k random WITHOUT replacement

random.shuffle(items)             # in-place shuffle
shuffled = random.sample(items, len(items))  # new shuffled copy

# Cryptographically secure random (for tokens, passwords)
import secrets
secrets.token_hex(16)             # "a3f4..." 32 hex chars
secrets.token_urlsafe(16)         # URL-safe base64 string
secrets.randbelow(100)            # int in [0, 100)
secrets.choice("ABCDEFGH")        # random char
# Use secrets instead of random for security-sensitive code!

# SystemRandom — OS-level randomness
rng = random.SystemRandom()
rng.random()    # uses os.urandom()

# Reproducible experiments
rng = random.Random(42)    # independent instance with its own seed
rng.random()               # won't affect global state
```

---

## statistics Module

```python
import statistics

data = [2, 4, 4, 4, 5, 5, 7, 9]

# Central tendency
statistics.mean(data)           # 5.0   (arithmetic mean)
statistics.fmean(data)          # 5.0   (fast mean, returns float)
statistics.geometric_mean(data) # 4.67... (geometric mean)
statistics.harmonic_mean(data)  # 4.57... (harmonic mean)
statistics.median(data)         # 4.5   (middle value)
statistics.median_low(data)     # 4     (lower middle)
statistics.median_high(data)    # 5     (upper middle)
statistics.mode(data)           # 4     (most common; error if tie pre-3.8)
statistics.multimode(data)      # [4]   (all modes — Python 3.8+)

# Spread
statistics.variance(data)       # 4.571...  (sample variance)
statistics.pvariance(data)      # 4.0       (population variance)
statistics.stdev(data)          # 2.138...  (sample std dev)
statistics.pstdev(data)         # 2.0       (population std dev)

# Quantiles (Python 3.8+)
statistics.quantiles(data, n=4)  # quartiles [Q1, Q2, Q3]

# NormalDist (Python 3.8+)
dist = statistics.NormalDist(mu=50, sigma=10)
dist.pdf(50)           # 0.0399... (probability density)
dist.cdf(60)           # 0.8413... (P(X ≤ 60))
dist.inv_cdf(0.95)     # 66.45...  (95th percentile)
dist.mean              # 50
dist.stdev             # 10
```

---

## Tips

- Always use `datetime.now(timezone.utc)` for timestamping — naive datetimes (no tzinfo) cause bugs when systems are in different timezones.
- Use `math.isclose(a, b)` instead of `a == b` for floats — floating-point arithmetic is never exactly equal.
- Use `secrets` module instead of `random` for passwords, tokens, and anything security-related — `random` is not cryptographically secure.
- `timedelta.total_seconds()` is more reliable than `.days` and `.seconds` separately — use it when you need a single duration value.
- `zoneinfo` (Python 3.9+) is the modern, built-in timezone solution — prefer it over `pytz` for new code.

---

## Summary

- `datetime.now(timezone.utc)` — current UTC time (always use timezone-aware); `date.today()` — date only.
- `strftime("%Y-%m-%d")` → format; `strptime("2024-01-15", "%Y-%m-%d")` → parse.
- `timedelta(days=7, hours=3)` — add/subtract from dates; `.total_seconds()` for duration in seconds.
- `math`: `sqrt`, `floor`, `ceil`, `log`, `sin`/`cos`/`tan`, `factorial`, `gcd`, `comb`, `isclose`.
- `random`: `random()`, `randint()`, `choice()`, `shuffle()`, `sample()` — use `secrets` for security.
- `statistics`: `mean()`, `median()`, `mode()`, `stdev()`, `variance()`, `quantiles()`.
