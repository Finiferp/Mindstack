---
title: "Testing Strategy"
sidebar_label: "Testing Strategy"
sidebar_position: 18
---

# Testing Strategy

Tests are what let you change code with confidence instead of fear. This page covers the test pyramid, when to use TDD, and how to think about mocking — the strategic layer above the mechanics of writing individual tests (which the language courses cover for their specific frameworks).

---

## The Test Pyramid

```
                    ▲
                   ╱ ╲
                  ╱E2E╲                 Few — slow, brittle, expensive
                 ╱─────╲                to maintain, but test the
                ╱       ╲               REAL system end to end
               ╱Integr.  ╲
              ╱  Tests    ╲             Some — test how components
             ╱─────────────╲            work together
            ╱               ╲
           ╱   Unit Tests    ╲          Many — fast, isolated, cheap
          ╱───────────────────╲         to write and maintain
         ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

The pyramid shape is a recommendation about RELATIVE QUANTITY:
many fast unit tests forming a broad foundation, fewer integration
tests, and very few slow, expensive end-to-end tests at the top.
```

```
Unit tests:
  Test a single function/class/module in isolation, with dependencies
  mocked or faked (see Mocking, below). Fast (milliseconds), so you
  can run thousands of them on every save/commit without friction.

Integration tests:
  Test how multiple components work together — a service talking to
  a real (test) database, an API endpoint hit with a real HTTP request.
  Slower than unit tests, but catch problems unit tests can't (a
  correct function called with the wrong SQL, a mismatched interface
  between two components that both pass their own unit tests individually).

End-to-end (E2E) tests:
  Test the full system as a user would experience it — a real
  browser driving a real UI against a real (or realistic staging)
  backend. Slowest and most brittle (a UI text change can break an
  E2E test that has nothing to do with the actual logic being
  tested), but catch problems that only show up when everything is
  genuinely wired together.
```

---

## Why the Pyramid Shape, Not an Inverted Pyramid

```
The "ice cream cone" anti-pattern — many teams accidentally end up
here, then wonder why their test suite is slow and fragile:

         ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲
        ╱      E2E        ╲           Many — slow, whole test suite
       ╱───────────────────╲          takes 45+ minutes, flaky
      ╱     Integration     ╲         due to timing/environment
     ╱───────────────────────╲        issues unrelated to actual bugs
    ╱          Unit           ╲
   ╱───────────────────────────╲      Few — the fast, reliable
  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔     layer is underused

Why this happens: E2E tests feel like they test "the real thing," so
they seem more valuable per-test — but they're expensive to write,
slow to run, and fail for reasons unrelated to the actual bug being
tested (a flaky network call, a timing race in the UI). A large E2E
suite becomes something the team starts distrusting and ignoring
("oh, that test is just flaky, ignore it") — which defeats the
entire purpose of having tests.

The pyramid shape exists because unit tests are CHEAP to write and
run, so you can afford MANY of them covering fine-grained logic
thoroughly; E2E tests are EXPENSIVE, so you reserve them for the
critical, high-value user journeys (login, checkout) rather than
trying to cover every edge case at that level.
```

---

## What to Test at Each Layer

```
Unit tests — the bulk of your coverage:
  Business logic, calculations, validation rules, edge cases
  (empty input, boundary values, error conditions)
  Anything with meaningful conditional logic or calculations

Integration tests — targeted, at real component boundaries:
  Does this repository correctly save and retrieve from a REAL
  database (even if the business logic calling it is already
  unit-tested with a mock repository)?
  Does this API endpoint correctly parse a request and return the
  right status code and shape (even if the underlying service logic
  is already unit-tested separately)?

E2E tests — sparse, for the highest-value user journeys only:
  Can a user actually sign up, log in, and complete a purchase,
  start to finish, through the real UI?
  Reserve these for flows where a break would be a genuine business
  emergency — not every possible user interaction.
```

---

## Test-Driven Development (TDD)

Write the test BEFORE the code that makes it pass — a discipline, not just a testing technique.

```
The TDD cycle — "Red, Green, Refactor":

  1. RED      — write a test for behavior that doesn't exist yet;
              run it; watch it fail (confirms the test actually
              tests something real, not a test that would pass
              even with no implementation at all)

  2. GREEN    — write the SIMPLEST code that makes the test pass —
              not the most elegant, not handling every future case,
              just enough to pass THIS test

  3. REFACTOR   — now that the test is passing (a safety net), clean
              up the implementation: better names, remove
              duplication, improve structure — the test suite
              catches you immediately if a "cleanup" accidentally
              changes behavior

  Repeat for the next small piece of behavior.
```

```python
# 1. RED — write the test first, watch it fail (FizzBuzz doesn't exist yet)
def test_fizzbuzz_returns_number_as_string_for_normal_numbers():
    assert fizzbuzz(1) == "1"
    assert fizzbuzz(2) == "2"

# 2. GREEN — the simplest possible implementation that passes THIS test
def fizzbuzz(n):
    return str(n)

# 1. RED again — a new test for the next piece of behavior
def test_fizzbuzz_returns_fizz_for_multiples_of_three():
    assert fizzbuzz(3) == "Fizz"

# 2. GREEN — extend just enough to pass, without over-building ahead
def fizzbuzz(n):
    if n % 3 == 0:
        return "Fizz"
    return str(n)

# ... continue the cycle for "Buzz" and "FizzBuzz" cases ...

# 3. REFACTOR — once all cases pass, clean up with the safety net in place
def fizzbuzz(n):
    result = ""
    if n % 3 == 0:
        result += "Fizz"
    if n % 5 == 0:
        result += "Buzz"
    return result or str(n)
```

```
Benefits of TDD:
  Forces you to think about the API/interface from the CALLER's
  perspective before implementation details, often producing cleaner
  designs
  Guarantees test coverage for the behavior you actually built
  (rather than tests written after the fact, which tend to test
  what the code DOES rather than what it SHOULD do)
  The tight feedback loop catches mistakes within seconds, not
  during a later debugging session

When TDD is a harder fit:
  Exploratory/spike work, where you don't yet know the right shape
  of the solution — writing tests first assumes you know what
  "correct" looks like, which isn't always true early in exploring
  an unfamiliar problem
  UI-heavy work where the "correctness" is largely visual/subjective

Practical middle ground many teams land on: use TDD for business
logic and algorithms where correctness is well-defined; write tests
after the fact (but still BEFORE considering the work "done") for
more exploratory or UI-heavy work.
```

---

## Mocking — When and How Much

A mock replaces a real dependency (a database, an external API, another service) with a controllable fake, so a test can run fast and deterministically without that real dependency.

```python
# Testing business logic WITHOUT a real payment gateway — fast,
# deterministic, no real money moved, no network dependency
class FakePaymentGateway:
    def __init__(self, should_succeed=True):
        self.should_succeed = should_succeed
        self.charged_amount = None

    def charge(self, amount):
        self.charged_amount = amount
        if not self.should_succeed:
            raise PaymentDeclinedError()
        return {"status": "success"}

def test_order_completes_when_payment_succeeds():
    gateway = FakePaymentGateway(should_succeed=True)
    service = OrderService(payment_gateway=gateway)

    result = service.complete_order(order, amount=100)

    assert result.status == "completed"
    assert gateway.charged_amount == 100

def test_order_fails_gracefully_when_payment_declined():
    gateway = FakePaymentGateway(should_succeed=False)
    service = OrderService(payment_gateway=gateway)

    result = service.complete_order(order, amount=100)

    assert result.status == "payment_failed"
```

```
Mock at ARCHITECTURAL BOUNDARIES — external services, databases,
the filesystem, the network, time (see below) — not internal
implementation details of your own code.

Over-mocking (a real anti-pattern):
  Mocking every single internal collaborator, including simple,
  pure internal functions, produces tests that verify "did I call
  method X with these exact arguments" rather than "does the actual
  behavior work correctly." These tests pass even when the real
  behavior is broken, and BREAK every time you refactor internal
  implementation details — even when the actual, externally-visible
  behavior hasn't changed at all. This is a strong signal the test
  suite has become a maintenance burden rather than a safety net.

This connects directly to hexagonal architecture (file 13) — code
designed with clear ports/adapters at its EXTERNAL boundaries
naturally has the right places to mock, and nowhere else tempting
to mock unnecessarily.
```

```python
# A common, worth-mocking special case: TIME. Tests that depend on
# "the current time" are flaky and hard to reason about unless time
# itself is injected/mockable
class SubscriptionService:
    def __init__(self, clock=None):
        self.clock = clock or datetime.now       # real clock by default,
                                                     # injectable for tests

    def is_expired(self, subscription):
        return self.clock() > subscription.expires_at

def test_subscription_is_expired_after_expiry_date():
    fixed_time = lambda: datetime(2024, 6, 1)
    service = SubscriptionService(clock=fixed_time)
    subscription = Subscription(expires_at=datetime(2024, 5, 1))

    assert service.is_expired(subscription) is True
    # deterministic — doesn't depend on when the test actually runs
```

---

## Test Quality Signals

```
Good tests are:
  Fast — a slow test suite gets run less often, defeating the point
  Deterministic — same input, same result, every time (no flaky
  tests depending on timing, network, or unseeded randomness)
  Independent — each test can run alone, in any order, without
  depending on another test's side effects
  Focused — one test verifies one behavior; when it fails, the
  failure message alone tells you roughly what's wrong, without
  needing to dig through the test body

A test suite you don't trust is worse than no test suite — if flaky
or slow tests get routinely ignored ("just rerun it"), the team has
effectively lost the safety net without realizing it, while still
paying the maintenance cost of keeping the tests around.
```

---

## Tips

- Aim for the pyramid shape deliberately — many fast unit tests, a moderate number of integration tests at real component boundaries, very few E2E tests reserved for your highest-value user journeys.
- Use TDD where correctness is well-defined (business logic, algorithms, calculations) and relax it for genuinely exploratory or UI-heavy work — it's a tool for specific situations, not a universal mandate.
- Mock at real architectural boundaries (external services, databases, time) — mocking your own internal implementation details produces brittle tests that break on harmless refactors.
- Treat flaky tests as a serious problem to fix immediately, not something to routinely rerun and ignore — a distrusted test suite provides no real safety net while still costing real maintenance time.
- A failing test's name and assertion message should tell you what's actually wrong without needing to read the test's full implementation — invest in clear test names and focused, single-behavior tests.

---

## Summary

- The test pyramid recommends many fast unit tests, fewer integration tests, and very few expensive E2E tests — the inverted "ice cream cone" shape leads to slow, flaky, distrusted test suites.
- TDD (Red-Green-Refactor) writes the test before the implementation, producing a design informed by the caller's perspective and guaranteed coverage for what was actually built — best suited to well-defined logic, less natural for exploratory work.
- Mock at architectural boundaries (external services, databases, time) — over-mocking internal implementation details produces tests that verify "was this called correctly" instead of "does this actually work."
- Good tests are fast, deterministic, independent, and focused — a flaky or slow test suite gets ignored, silently losing its value as a safety net while still costing real maintenance time.
