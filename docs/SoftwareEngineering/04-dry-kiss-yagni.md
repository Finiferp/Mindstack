---
title: "DRY, KISS, and YAGNI"
sidebar_label: "DRY, KISS, YAGNI"
sidebar_position: 4
---

# DRY, KISS, and YAGNI

Three of the most quoted principles in software engineering — and three of the most commonly misapplied. This page covers what each one actually means, and the situations where following one strictly works against the others.

---

## DRY — Don't Repeat Yourself

**Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.**

```python
# Violates DRY — the tax rate (a piece of KNOWLEDGE) is duplicated;
# a future rate change requires finding and updating every occurrence
def calculate_us_tax(amount):
    return amount * 0.08

def calculate_invoice_total(subtotal):
    tax = subtotal * 0.08
    return subtotal + tax

def calculate_receipt_tax(amount):
    return amount * 0.08


# Follows DRY — one authoritative source for the tax rate
TAX_RATE = 0.08

def calculate_us_tax(amount):
    return amount * TAX_RATE

def calculate_invoice_total(subtotal):
    return subtotal + calculate_us_tax(subtotal)

def calculate_receipt_tax(amount):
    return calculate_us_tax(amount)
```

**The important nuance: DRY is about knowledge, not about identical-looking code.** Two pieces of code that happen to look similar right now, but represent genuinely different business rules that could independently change in the future, are not a DRY violation — they're an *incidental* duplication, and merging them creates a false coupling.

```python
# These look identical today...
def validate_username_length(username):
    return 3 <= len(username) <= 20

def validate_display_name_length(display_name):
    return 3 <= len(display_name) <= 20

# ...but they represent DIFFERENT rules that could diverge independently:
# marketing might want display names to allow up to 50 characters next
# quarter, while username length stays a hard technical constraint.
# Merging these into one shared function would couple two unrelated
# business rules — a future change to one would risk silently
# affecting the other.
```

---

## KISS — Keep It Simple, Stupid

**Prefer the simplest solution that correctly solves the problem. Complexity should be justified by an actual requirement, not added speculatively.**

```python
# Violates KISS — a configurable, pluggable, strategy-pattern-based
# system for a rule that has been "multiply by 1.08" for three years
# and shows no sign of changing
class TaxStrategy(ABC):
    @abstractmethod
    def calculate(self, amount: float) -> float: ...

class StandardTaxStrategy(TaxStrategy):
    def calculate(self, amount):
        return amount * 1.08

class TaxCalculatorFactory:
    @staticmethod
    def create(strategy_type: str) -> TaxStrategy:
        if strategy_type == "standard":
            return StandardTaxStrategy()
        raise ValueError("unknown strategy")

class TaxCalculator:
    def __init__(self, factory: TaxCalculatorFactory):
        self.factory = factory

    def calculate(self, amount, strategy_type="standard"):
        strategy = self.factory.create(strategy_type)
        return strategy.calculate(amount)


# Follows KISS — solves the actual problem, nothing more
def calculate_total_with_tax(amount, tax_rate=0.08):
    return amount * (1 + tax_rate)
```

The strategy-pattern version isn't *wrong* in the abstract — it's wrong *for this problem*, because the flexibility it offers isn't needed yet, and every layer of indirection is a cost paid by every future reader, whether or not the flexibility is ever used.

**KISS is not an excuse for sloppy code.** "Simple" means minimal necessary complexity, not minimal effort — a simple solution is often the result of *more* thought, not less, because finding the simplest correct approach is harder than reaching for the first pattern that comes to mind.

---

## YAGNI — You Aren't Gonna Need It

**Don't build functionality on the speculation that you might need it in the future. Build what the current requirement actually needs.**

```python
# Violates YAGNI — building a generic plugin system, multi-currency
# support, and configurable rounding strategies for a feature request
# that only ever asked for "calculate USD sales tax"
class RoundingStrategy(ABC):
    @abstractmethod
    def round(self, value: float) -> float: ...

class BankersRounding(RoundingStrategy):
    def round(self, value):
        ...

class CurrencyConverter:
    def __init__(self, rates: dict):
        self.rates = rates
    def convert(self, amount, from_currency, to_currency):
        ...

class TaxCalculator:
    def __init__(self, rounding: RoundingStrategy, converter: CurrencyConverter):
        ...
    # none of this was asked for; none of it is tested against real
    # multi-currency requirements, because there ARE no real requirements yet


# Follows YAGNI — solves today's actual, specific requirement
def calculate_us_sales_tax(amount_usd, tax_rate=0.08):
    return round(amount_usd * (1 + tax_rate), 2)

# If multi-currency support becomes an ACTUAL requirement later,
# build it then — informed by real constraints (which currencies?
# which rounding rules do THOSE currencies actually need? what's
# the real conversion rate source?) instead of guesses made today.
```

Why YAGNI matters: speculative features are built against imagined requirements, not real ones. When the real requirement eventually shows up, it rarely matches the guess exactly — so you end up reworking the speculative code anyway, except now you're also paying to *remove* the parts of the guess that turned out wrong. Building it when actually needed is usually cheaper in total than building it early and adjusting later.

---

## When These Principles Conflict

This is the part most explanations skip, and it's the part that actually matters in practice.

### DRY vs KISS

```
Aggressively removing every trace of duplication can produce a more
COMPLEX system than tolerating a small amount of duplication.

Example: three functions each do a slightly different validation.
Factoring them into one mega-function with five boolean flags to
handle the "slight differences" is technically DRY (one function)
but has made each individual case harder to read, understand, and
change than three small, slightly-repetitive functions would have.

Rule of thumb: prefer KISS when strict DRY would require adding
parameters/flags/conditionals to force unification of things that
aren't QUITE the same. A little duplication is often cheaper than
the wrong abstraction.
```

### DRY vs YAGNI

```
DRY can tempt you into building a shared abstraction the MOMENT you
see the second occurrence of similar code — but if you don't yet know
whether a third case is coming, or what it might need, that shared
abstraction is a guess, and guesses violate YAGNI.

The "Rule of Three" is a common compromise: tolerate duplication the
first two times you see it. On the THIRD occurrence, you likely have
enough real examples to know what the actual shared abstraction should
look like — extracting it then is informed by evidence, not speculation.
```

### KISS vs "doing it right"

```
Sometimes the simplest solution today creates a harder problem later —
this isn't a KISS violation to avoid, it's a genuine trade-off to make
consciously (see file 20, Technical Debt). KISS says "don't add
complexity you don't need YET" — it doesn't say "never add complexity."
When a requirement genuinely needs it, add it; KISS just asks you to
justify the complexity against a real need, not skip the justification.
```

---

## A Practical Synthesis

```
1. Build the simplest thing that solves the ACTUAL current requirement (YAGNI + KISS)
2. Tolerate a small amount of duplication early — don't abstract on
   the first or even second occurrence (DRY, applied patiently)
3. When a real THIRD case appears, or a change requires editing the
   same logic in multiple places, extract the shared abstraction —
   now informed by real examples, not speculation (DRY, correctly timed)
4. If the abstraction starts requiring flags/parameters to handle
   cases that aren't truly the same thing, that's a sign to un-DRY it
   back into separate, simpler pieces (KISS, correcting an overreach)
```

---

## Tips

- When you feel the urge to build something "flexible" or "future-proof," ask what SPECIFIC, CURRENTLY KNOWN requirement demands that flexibility — if the honest answer is "none yet," that's YAGNI telling you to wait.
- Apply the Rule of Three for DRY: tolerate duplication through the second occurrence, extract on the third — this avoids both premature abstraction and unbounded copy-paste.
- If a "simple" solution requires you to explain several non-obvious tricks to a teammate, it's not actually simple — KISS is about genuine simplicity, not brevity or cleverness.
- These three principles pull in different directions in genuine edge cases — that's expected, not a sign you're doing it wrong. Use judgment about the specific situation rather than mechanically applying one principle to its extreme.

---

## Summary

- DRY: every piece of *knowledge* (a business rule, a rate, a formula) should have one authoritative source — but incidentally similar code that represents genuinely different concerns is not a DRY violation.
- KISS: prefer the simplest correct solution — added complexity should be justified by a real, current requirement, not by speculation.
- YAGNI: don't build for imagined future requirements — real requirements, when they arrive, rarely match the guess and are cheaper to build then than to build early and rework.
- The three principles conflict at the edges: over-applying DRY can violate KISS (the wrong abstraction); over-applying DRY can violate YAGNI (abstracting before you have enough evidence).
- Practical synthesis: build the simplest thing that solves today's actual need, tolerate duplication through roughly the third occurrence, then extract a shared abstraction informed by real examples.
