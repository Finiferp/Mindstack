---
title: "Design Patterns"
sidebar_label: "Design Patterns"
sidebar_position: 6
---

# Design Patterns

Design patterns are named, reusable solutions to problems that recur across many different codebases. Knowing their names lets engineers communicate a whole design in one word ("just use a Strategy here") instead of re-explaining the structure from scratch every time.

---

## Why Patterns Matter — and Their Biggest Risk

```
The value of a pattern is communication and proven structure —
"Observer" instantly tells another engineer the shape of your design.

The risk is over-engineering: applying a pattern because you know it,
not because the problem actually calls for it. A pattern applied to
a problem that doesn't need it ADDS complexity without adding value —
this is one of the most common anti-patterns in real codebases
(see file 24, Anti-Patterns).

Rule of thumb: reach for a pattern when you recognize its problem
shape already appearing in your code (often as a code smell — see
file 03) — not preemptively, on the assumption you might need it.
```

---

## Creational Patterns — Object Creation

### Factory Method

Delegates object creation to a method, so the calling code doesn't need to know which concrete class to instantiate.

```python
class Notification(ABC):
    @abstractmethod
    def send(self, message): ...

class EmailNotification(Notification):
    def send(self, message):
        print(f"Emailing: {message}")

class SMSNotification(Notification):
    def send(self, message):
        print(f"Texting: {message}")

def notification_factory(channel: str) -> Notification:
    if channel == "email":
        return EmailNotification()
    if channel == "sms":
        return SMSNotification()
    raise ValueError(f"unknown channel: {channel}")

notifier = notification_factory("email")
notifier.send("Your order has shipped")
```

**Use when:** the exact class to instantiate depends on a runtime condition, and you want calling code to depend only on the abstract type, not every concrete implementation (this is Dependency Inversion from file 02, applied to object creation specifically).

### Builder

Constructs a complex object step by step, useful when a constructor would otherwise need many optional parameters (see Long Parameter List, file 03).

```python
class HttpRequestBuilder:
    def __init__(self):
        self._method = "GET"
        self._headers = {}
        self._body = None

    def method(self, method):
        self._method = method
        return self

    def header(self, key, value):
        self._headers[key] = value
        return self

    def body(self, body):
        self._body = body
        return self

    def build(self):
        return HttpRequest(self._method, self._headers, self._body)

request = (
    HttpRequestBuilder()
    .method("POST")
    .header("Content-Type", "application/json")
    .body('{"key": "value"}')
    .build()
)
```

**Use when:** an object has many optional configuration values, and you want a readable, chainable way to construct it instead of a constructor with ten optional parameters.

### Singleton

Ensures a class has exactly one instance, globally accessible.

```python
class ConfigManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._settings = {}
        return cls._instance

    def set(self, key, value):
        self._settings[key] = value

    def get(self, key):
        return self._settings.get(key)

# Every call returns the SAME instance
config1 = ConfigManager()
config2 = ConfigManager()
config1.set("debug", True)
print(config2.get("debug"))   # True — same underlying instance
```

**Use with caution.** Singletons introduce global mutable state, which makes tests harder to isolate (one test's changes can leak into another) and hides a dependency that would otherwise be visible in a constructor. In most modern codebases, dependency injection (passing a shared instance explicitly, see file 02's DIP) achieves the same goal — one shared instance — without the hidden global coupling. Reach for a true Singleton rarely, and prefer DI where practical.

---

## Structural Patterns — Composing Objects

### Adapter

Converts the interface of one class into an interface a client expects, letting incompatible interfaces work together.

```python
# Third-party library with an interface you don't control
class LegacyPaymentGateway:
    def make_payment(self, amount_cents: int):
        ...

# Your application's expected interface
class PaymentProcessor(ABC):
    @abstractmethod
    def process(self, amount_dollars: float): ...

# Adapter bridges the mismatch
class LegacyPaymentAdapter(PaymentProcessor):
    def __init__(self, legacy_gateway: LegacyPaymentGateway):
        self._gateway = legacy_gateway

    def process(self, amount_dollars: float):
        amount_cents = int(amount_dollars * 100)
        self._gateway.make_payment(amount_cents)

processor: PaymentProcessor = LegacyPaymentAdapter(LegacyPaymentGateway())
processor.process(19.99)
```

**Use when:** integrating a third-party library or legacy code whose interface doesn't match what the rest of your application expects, and you can't (or shouldn't) modify the original.

### Decorator

Adds behavior to an object dynamically, without modifying its class or affecting other instances of the same class.

```python
class Coffee(ABC):
    @abstractmethod
    def cost(self): ...
    @abstractmethod
    def description(self): ...

class SimpleCoffee(Coffee):
    def cost(self):
        return 2.0
    def description(self):
        return "Coffee"

class MilkDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee
    def cost(self):
        return self._coffee.cost() + 0.5
    def description(self):
        return self._coffee.description() + " + Milk"

class SyrupDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee
    def cost(self):
        return self._coffee.cost() + 0.3
    def description(self):
        return self._coffee.description() + " + Syrup"

order = SyrupDecorator(MilkDecorator(SimpleCoffee()))
print(order.description(), "=", order.cost())   # Coffee + Milk + Syrup = 2.8
```

**Use when:** you need to add optional, combinable behaviors to an object, and subclassing for every combination would explode the number of classes needed (one class per combination of milk/syrup/etc. would be unmanageable).

### Facade

Provides a simplified interface to a complex subsystem.

```python
# Complex subsystem with many interacting parts
class InventorySystem:
    def check_stock(self, item): ...
class PaymentSystem:
    def charge(self, amount): ...
class ShippingSystem:
    def schedule_delivery(self, item, address): ...
class NotificationSystem:
    def send_confirmation(self, email): ...

# Facade — one simple entry point hides the coordination complexity
class OrderFacade:
    def __init__(self):
        self.inventory = InventorySystem()
        self.payment = PaymentSystem()
        self.shipping = ShippingSystem()
        self.notification = NotificationSystem()

    def place_order(self, item, amount, address, email):
        self.inventory.check_stock(item)
        self.payment.charge(amount)
        self.shipping.schedule_delivery(item, address)
        self.notification.send_confirmation(email)

# Calling code doesn't need to know about four separate subsystems
order_system = OrderFacade()
order_system.place_order("Widget", 29.99, "123 Main St", "user@example.com")
```

**Use when:** a subsystem has many interacting parts, and most calling code only needs a simple, common-case entry point rather than direct access to every part.

---

## Behavioral Patterns — Object Interaction

### Strategy

Defines a family of interchangeable algorithms, selected at runtime.

```python
class SortStrategy(ABC):
    @abstractmethod
    def sort(self, data: list) -> list: ...

class QuickSort(SortStrategy):
    def sort(self, data):
        # ... quicksort implementation ...
        return sorted(data)

class MergeSort(SortStrategy):
    def sort(self, data):
        # ... merge sort implementation ...
        return sorted(data)

class Sorter:
    def __init__(self, strategy: SortStrategy):
        self._strategy = strategy

    def sort(self, data):
        return self._strategy.sort(data)

sorter = Sorter(QuickSort())
sorter.sort([3, 1, 2])
```

**Use when:** you have several interchangeable ways to perform a task (this is the same shape as the Open/Closed Principle example in file 02) and want to swap between them without conditional logic (`if strategy == "quick"`) scattered through the codebase.

### Observer

Defines a one-to-many dependency so that when one object changes state, all its dependents are notified automatically.

```python
class Subject:
    def __init__(self):
        self._observers = []

    def subscribe(self, observer):
        self._observers.append(observer)

    def notify(self, event):
        for observer in self._observers:
            observer.update(event)

class EmailAlertObserver:
    def update(self, event):
        print(f"Sending email alert: {event}")

class LogObserver:
    def update(self, event):
        print(f"Logging event: {event}")

order_events = Subject()
order_events.subscribe(EmailAlertObserver())
order_events.subscribe(LogObserver())
order_events.notify("Order #123 shipped")
# Sending email alert: Order #123 shipped
# Logging event: Order #123 shipped
```

**Use when:** multiple parts of a system need to react to an event without the event source needing to know about each reactor specifically — this is the foundation of most pub/sub and event-driven systems (see file 12, Event-Driven Architecture).

### Command

Encapsulates a request as an object, allowing you to parametrize clients with different requests, queue them, or support undo.

```python
class Command(ABC):
    @abstractmethod
    def execute(self): ...
    @abstractmethod
    def undo(self): ...

class AddTextCommand(Command):
    def __init__(self, document, text):
        self.document = document
        self.text = text

    def execute(self):
        self.document.content += self.text

    def undo(self):
        self.document.content = self.document.content[:-len(self.text)]

class CommandHistory:
    def __init__(self):
        self._history = []

    def execute(self, command: Command):
        command.execute()
        self._history.append(command)

    def undo_last(self):
        if self._history:
            self._history.pop().undo()

history = CommandHistory()
history.execute(AddTextCommand(document, "Hello"))
history.undo_last()   # cleanly reverses the last action
```

**Use when:** you need undo/redo functionality, request queuing, or the ability to log/replay a sequence of operations.

---

## Choosing Whether to Use a Pattern at All

```
Before reaching for a named pattern, ask:

  1. Does this problem ACTUALLY have the shape the pattern solves?
     (Not "could I force this pattern to fit," but "does this pattern's
     problem genuinely match mine.")

  2. Is the added indirection worth the flexibility it buys?
     Every layer of abstraction (an interface, a factory, a decorator
     chain) costs a reader some effort to trace through. That cost
     needs to be repaid by genuine, current flexibility need —
     not hypothetical future need (see file 04, YAGNI).

  3. Would a simpler, more direct piece of code be just as clear?
     Sometimes three concrete if/elif branches ARE simpler and more
     readable than a Strategy pattern with three classes — especially
     if you're confident there will never be a fourth case.

Patterns are tools for RECOGNIZED, RECURRING problems — not a checklist
to apply to every class you write.
```

---

## Tips

- Learn pattern names even if you rarely deliberately apply them — the vocabulary alone makes design discussions with other engineers dramatically faster ("let's make this a Strategy" communicates an entire structure in three words).
- Prefer dependency injection over the Singleton pattern in almost all modern code — you get the "one shared instance" benefit without the hidden global state that makes testing harder.
- If you notice yourself with a long `if/elif` chain selecting between different implementations of the same operation, that's usually the signal to introduce Strategy or Factory Method — recognize the smell, then reach for the pattern, not the other way around.
- Don't force a pattern onto a problem that doesn't need it — a simple, direct solution beats an elegant, unnecessary one every time (this connects directly to KISS and YAGNI in file 04).

---

## Summary

- Design patterns are named, reusable solutions to recurring design problems — their main value is communication and proven structure, not mandatory application.
- Creational: Factory Method (delegate object creation), Builder (step-by-step construction for complex objects), Singleton (one shared instance — prefer DI in most cases).
- Structural: Adapter (bridge incompatible interfaces), Decorator (add combinable behavior dynamically), Facade (simplify access to a complex subsystem).
- Behavioral: Strategy (swap interchangeable algorithms), Observer (one-to-many event notification), Command (encapsulate a request as an object, enabling undo/queuing).
- Apply a pattern when you recognize its problem shape already present in your code — not preemptively; forcing a pattern onto a problem it doesn't fit adds complexity without value.
