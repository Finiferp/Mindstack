---
title: "Angular State & RxJS"
sidebar_label: "State & RxJS"
sidebar_position: 14
---

# Angular State Management & RxJS

State is data that your UI needs to display and react to. RxJS is the reactive programming library that Angular is built on. Understanding both lets you build UIs that update correctly and efficiently as data changes.

---

## State Management Approaches

Angular doesn't force a single state management solution. Choose based on complexity:

| Approach | Use when |
|---|---|
| Component signals | State only used by one component |
| Service + signals | Shared state across multiple components |
| RxJS Subjects in services | Complex async flows, streams |
| NgRx / Elf / NGXS | Large apps, complex business logic, time-travel debugging |

---

## Signals — Complete Reference

```typescript
import {
    signal, computed, effect, untracked,
    WritableSignal, Signal,
    toSignal, toObservable
} from "@angular/core";

// ── signal() ───────────────────────────────────────────────────────────────
const count    = signal(0);                     // WritableSignal<number>
const name     = signal("Alice");               // WritableSignal<string>
const user     = signal<User | null>(null);     // WritableSignal<User | null>
const items    = signal<string[]>([]);
const loading  = signal(false);

// Read
count()         // 0
name()          // "Alice"

// Write
count.set(5);
name.set("Bob");
count.update(n => n + 1);               // update based on current
items.update(arr => [...arr, "new"]);   // immutable array update
user.update(u => u ? { ...u, name: "Updated" } : u);

// Expose as read-only (good practice for services)
const publicCount: Signal<number> = count.asReadonly();
// publicCount.set(5)  // TypeScript error — can't write to ReadonlySignal

// ── computed() ─────────────────────────────────────────────────────────────
// Lazy — only recalculates when dependencies change AND value is read
const doubled   = computed(() => count() * 2);
const isEmpty   = computed(() => items().length === 0);
const fullName  = computed(() => `${firstName()} ${lastName()}`);

// Can depend on multiple signals
const summary = computed(() =>
    `${user()?.name ?? "Guest"} has ${count()} items (loading: ${loading()})`
);

// Computed with previous value (Angular 19+)
// const countWithHistory = linkedSignal(() => count());

// ── effect() ───────────────────────────────────────────────────────────────
// Runs when signals it reads change
// Tracks any signal read during execution — dynamic dependency tracking
const effectRef = effect(() => {
    const n = count();            // tracked
    const u = user();             // tracked
    console.log(`${u?.name}: ${n}`);

    // Cleanup function (runs before next effect execution)
    return () => {
        console.log("Cleaning up previous effect");
    };
});

// Destroy effect manually
effectRef.destroy();

// Run outside Angular's injection context
effect(() => { ... }, { injector: this.injector });

// Allow signal writes inside effects (use carefully)
effect(() => {
    const val = someSignal();
    anotherSignal.set(val * 2);  // normally triggers warning
}, { allowSignalWrites: true });

// ── untracked() — read without creating dependency ─────────────────────────
effect(() => {
    const key   = searchKey();                     // tracked — effect re-runs when this changes
    const cache = untracked(() => cacheService.get(key));  // NOT tracked
    console.log("Cache hit:", !!cache);
});

// ── toSignal() — convert Observable to Signal ─────────────────────────────
import { toSignal } from "@angular/core/rxjs-interop";

const users = toSignal(this.userService.getAll(), { initialValue: [] });
const route = toSignal(this.router.events);

// With error handling
const data = toSignal(this.http.get<Data[]>("/api/data"), {
    initialValue:  [],
    rejectErrors:  false   // don't throw on error (default: true)
});

// ── toObservable() — convert Signal to Observable ─────────────────────────
import { toObservable } from "@angular/core/rxjs-interop";

const count$ = toObservable(count);  // Observable<number>
count$.subscribe(n => console.log("Count:", n));

// ── input() signal — for component @Input() ───────────────────────────────
import { input, model, output } from "@angular/core";

@Component({ ... })
export class MyComponent {
    // input() returns Signal — readable but not writable from outside
    userId  = input.required<number>();
    label   = input("default");
    config  = input<Config>();

    ngOnInit() {
        console.log(this.userId());   // read the input value
    }
}

// ── model() — two-way binding signal ─────────────────────────────────────
@Component({
    selector: "app-counter",
    template: `
        <button (click)="decrement()">-</button>
        {{ value() }}
        <button (click)="increment()">+</button>
    `
})
export class CounterComponent {
    value = model(0);  // ModelSignal<number>

    increment() { this.value.update(n => n + 1); }
    decrement() { this.value.update(n => n - 1); }
}

// Parent usage:
// <app-counter [(value)]="parentCount" />
```

---

## Service with Signals — Full Pattern

```typescript
// src/app/core/services/cart.service.ts
import { Injectable, signal, computed } from "@angular/core";

export interface CartItem {
    id:       number;
    name:     string;
    price:    number;
    quantity: number;
    imageUrl: string;
}

@Injectable({ providedIn: "root" })
export class CartService {

    // Private writable — only this service modifies it
    private _items    = signal<CartItem[]>([]);
    private _coupon   = signal<string | null>(null);
    private _discount = signal(0);

    // ── Public read-only signals ───────────────────────────────────────
    readonly items    = this._items.asReadonly();
    readonly coupon   = this._coupon.asReadonly();

    // ── Computed ──────────────────────────────────────────────────────
    readonly count       = computed(() => this._items().reduce((s, i) => s + i.quantity, 0));
    readonly isEmpty     = computed(() => this._items().length === 0);
    readonly subtotal    = computed(() => this._items().reduce((s, i) => s + i.price * i.quantity, 0));
    readonly discountAmt = computed(() => this.subtotal() * this._discount() / 100);
    readonly total       = computed(() => this.subtotal() - this.discountAmt());
    readonly itemCount   = computed(() => this._items().length);

    // ── Actions ───────────────────────────────────────────────────────
    addItem(item: Omit<CartItem, "quantity">, qty = 1): void {
        this._items.update(items => {
            const existing = items.find(i => i.id === item.id);
            if (existing) {
                return items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [...items, { ...item, quantity: qty }];
        });
    }

    removeItem(id: number): void {
        this._items.update(items => items.filter(i => i.id !== id));
    }

    updateQuantity(id: number, qty: number): void {
        if (qty <= 0) { this.removeItem(id); return; }
        this._items.update(items => items.map(i => i.id === id ? { ...i, quantity: qty } : i));
    }

    increment(id: number): void { this.updateQuantity(id, (this._items().find(i => i.id === id)?.quantity ?? 0) + 1); }
    decrement(id: number): void { this.updateQuantity(id, (this._items().find(i => i.id === id)?.quantity ?? 1) - 1); }

    clear(): void {
        this._items.set([]);
        this._coupon.set(null);
        this._discount.set(0);
    }

    async applyCoupon(code: string): Promise<void> {
        const discount = await this.couponService.validate(code);
        this._coupon.set(code);
        this._discount.set(discount);
    }

    // Persist to localStorage
    constructor() {
        const saved = localStorage.getItem("cart");
        if (saved) this._items.set(JSON.parse(saved));

        effect(() => {
            localStorage.setItem("cart", JSON.stringify(this._items()));
        });
    }
}
```

---

## RxJS — Complete Operator Reference

### Creating Observables

```typescript
import {
    Observable, of, from, fromEvent, interval, timer,
    EMPTY, NEVER, throwError, defer, generate
} from "rxjs";

// of — emit values then complete
of(1, 2, 3).subscribe(console.log);    // 1, 2, 3

// from — convert promise, array, iterable
from([1, 2, 3]);
from(fetch("/api/users"));             // from Promise
from("hello");                         // "h","e","l","l","o"
from(new Set([1, 2, 3]));

// fromEvent — DOM/Node events
const clicks$ = fromEvent(document, "click");
const resize$ = fromEvent(window, "resize");
const keyups$ = fromEvent<KeyboardEvent>(document, "keyup");

// interval — emit 0,1,2... every N ms
interval(1000);                        // 0, 1, 2... every second

// timer — emit after delay, then optionally repeat
timer(2000);                           // emit 0 after 2s, then complete
timer(0, 1000);                        // emit immediately, then every 1s

// EMPTY — complete immediately without emitting
EMPTY.subscribe({ complete: () => console.log("done") });

// NEVER — never emits, never completes
NEVER.subscribe();

// throwError — emit error immediately
throwError(() => new Error("Something went wrong"));

// defer — create Observable lazily (re-evaluates factory per subscriber)
defer(() => from(fetchCurrentUser()));  // re-fetches for each subscriber

// Observable constructor
new Observable<number>(subscriber => {
    subscriber.next(1);
    subscriber.next(2);
    subscriber.error(new Error("failed"));
    subscriber.complete();
    return () => console.log("Teardown");  // cleanup on unsubscribe
});
```

### Subscribing

```typescript
obs$.subscribe(value => console.log(value));

obs$.subscribe({
    next:     (value) => console.log("Value:", value),
    error:    (err)   => console.error("Error:", err),
    complete: ()      => console.log("Complete")
});

// Unsubscribe to prevent memory leaks
const sub = obs$.subscribe(console.log);
sub.unsubscribe();

// Using takeUntil pattern (most common in Angular)
private destroy$ = new Subject<void>();

ngOnInit() {
    obs$.pipe(takeUntil(this.destroy$)).subscribe(v => this.value = v);
}
ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
}
```

### Transformation Operators

```typescript
import {
    map, mapTo, pluck, mergeMap, concatMap, switchMap, exhaustMap,
    scan, reduce, toArray, bufferTime, bufferCount, windowTime,
    expand, mergeScan
} from "rxjs/operators";

// map — transform each value
of(1, 2, 3).pipe(map(n => n * 2));            // 2, 4, 6
users$.pipe(map(users => users.filter(u => u.active)));
users$.pipe(map(user => user.name));

// switchMap — cancel previous inner Observable when new outer value arrives
// BEST FOR: search autocomplete, navigation
searchTerm$.pipe(
    switchMap(term => this.http.get<User[]>(`/api/search?q=${term}`))
    // If user types before previous request completes, it's cancelled
);

// mergeMap / flatMap — run all inner Observables concurrently (no cancellation)
// BEST FOR: parallel requests, event handling where order doesn't matter
clicks$.pipe(
    mergeMap(click => this.http.post("/api/log", { click }))
    // All click logs are sent, possibly in parallel
);

// concatMap — queue inner Observables, run one at a time in order
// BEST FOR: ordered operations, file uploads, sequential writes
actions$.pipe(
    concatMap(action => this.processAction(action))
    // Processes actions one at a time, in order
);

// exhaustMap — ignore new outer values while inner Observable is active
// BEST FOR: login button (ignore extra clicks while logging in)
loginClicks$.pipe(
    exhaustMap(() => this.authService.login(credentials))
    // Ignores clicks while login request is in flight
);

// scan — like reduce but emits intermediate values
of(1, 2, 3, 4, 5).pipe(
    scan((acc, n) => acc + n, 0)
);
// 1, 3, 6, 10, 15

// reduce — collect all values into one (emits only when source completes)
of(1, 2, 3, 4, 5).pipe(reduce((acc, n) => acc + n, 0));
// 15 (once)

// toArray — collect all values into array
of(1, 2, 3).pipe(toArray());   // [1, 2, 3] once
```

### Filtering Operators

```typescript
import {
    filter, take, takeLast, takeWhile, takeUntil,
    skip, skipLast, skipWhile, skipUntil,
    first, last, find, findIndex,
    distinct, distinctUntilChanged, distinctUntilKeyChanged,
    debounceTime, throttleTime, auditTime, sampleTime,
    elementAt, single, ignoreElements
} from "rxjs/operators";

// filter — only pass values that match predicate
of(1,2,3,4,5).pipe(filter(n => n % 2 === 0));  // 2, 4

// take — complete after N values
interval(100).pipe(take(5));                    // 0,1,2,3,4

// takeLast — emit last N values (after source completes)
of(1,2,3,4,5).pipe(takeLast(2));               // 4, 5

// takeWhile — complete when predicate returns false
of(1,2,3,4,5).pipe(takeWhile(n => n < 4));     // 1, 2, 3

// takeUntil — complete when notifier emits
obs$.pipe(takeUntil(destroy$));

// skip — ignore first N values
of(1,2,3,4,5).pipe(skip(2));                   // 3, 4, 5

// first — take first (optional predicate), then complete
obs$.pipe(first());
obs$.pipe(first(n => n > 3));                  // first value > 3

// last — take last value when source completes
of(1,2,3).pipe(last());                        // 3

// distinct — only emit if never seen this value before
of(1,2,1,3,2).pipe(distinct());               // 1, 2, 3

// distinctUntilChanged — only emit if different from previous
of(1,1,2,2,3,1).pipe(distinctUntilChanged());  // 1, 2, 3, 1

// distinctUntilKeyChanged — compare by object property
users$.pipe(distinctUntilKeyChanged("role"));

// debounceTime — emit only after N ms of silence
// BEST FOR: search inputs, resize handlers
searchInput$.pipe(debounceTime(300));

// throttleTime — emit at most once per N ms
// BEST FOR: scroll handlers, button clicks
scrollEvents$.pipe(throttleTime(100));

// auditTime — emit last value from window after N ms
// Similar to throttle but emits the LAST value in the window
scrollEvents$.pipe(auditTime(100));
```

### Combination Operators

```typescript
import {
    merge, concat, combineLatest, combineLatestWith,
    zip, forkJoin, startWith, withLatestFrom,
    pairwise, race, switchAll, mergeAll, concatAll
} from "rxjs";
import { combineLatestWith, withLatestFrom } from "rxjs/operators";

// merge — interleave multiple observables
merge(obs1$, obs2$, obs3$);            // emits from all, completes when all complete

// concat — emit from each source sequentially (wait for one to complete)
concat(obs1$, obs2$, obs3$);           // obs1 first, then obs2, then obs3

// combineLatest — emit when ANY source emits, with LATEST from all
// BEST FOR: forms with multiple fields, dashboard with multiple data sources
combineLatest([firstName$, lastName$]).pipe(
    map(([first, last]) => `${first} ${last}`)
);

// forkJoin — wait for ALL to complete, emit LAST value of each
// BEST FOR: parallel API calls where you need all results
forkJoin({
    user:    this.http.get<User>("/api/user/1"),
    posts:   this.http.get<Post[]>("/api/user/1/posts"),
    profile: this.http.get<Profile>("/api/user/1/profile")
}).subscribe(({ user, posts, profile }) => {
    this.loadData(user, posts, profile);
});

// zip — emit when ALL sources have emitted, pair them positionally
zip([of("a","b","c"), of(1,2,3)]);    // ["a",1], ["b",2], ["c",3]

// withLatestFrom — combine with latest from second, triggered by first
// BEST FOR: button click + current form value
saveButton$.pipe(
    withLatestFrom(formValue$),
    switchMap(([_, form]) => this.save(form))
);

// startWith — emit initial value before source
obs$.pipe(startWith(null));            // null first, then obs values

// pairwise — emit [previous, current] pairs
values$.pipe(pairwise());              // [prev, curr] on each emission
```

### Error Handling Operators

```typescript
import {
    catchError, retry, retryWhen, onErrorResumeNext,
    throwIfEmpty, timeout, timeoutWith
} from "rxjs/operators";
import { EMPTY, of, timer } from "rxjs";

// catchError — handle error and recover
this.http.get("/api/users").pipe(
    catchError(err => {
        console.error("Error:", err);
        return of([]);                  // recover with empty array
        // OR: return throwError(() => err);  // re-throw
        // OR: return EMPTY;            // complete without emitting
    })
);

// retry — resubscribe on error, N times
this.http.get("/api/data").pipe(
    retry(3)                           // retry up to 3 times
);

// retry with config (RxJS 7+)
this.http.get("/api/data").pipe(
    retry({
        count: 3,
        delay: 1000                    // wait 1s between retries
    })
);

// retryWhen — custom retry strategy
this.http.get("/api/data").pipe(
    retryWhen(errors =>
        errors.pipe(
            delayWhen((err, i) => timer(Math.pow(2, i) * 1000)),  // exponential backoff
            take(3)                    // max 3 retries
        )
    )
);

// timeout — throw if source doesn't emit within time limit
this.http.get("/api/data").pipe(
    timeout(5000)                      // throw TimeoutError after 5s
);

timeout({ first: 5000, each: 2000 }); // first emission within 5s, each within 2s
```

### Utility Operators

```typescript
import {
    tap, delay, delayWhen, observeOn, subscribeOn,
    finalize, timestamp, timeInterval, materialize, dematerialize
} from "rxjs/operators";
import { asyncScheduler } from "rxjs";

// tap — side effects, doesn't change the stream
obs$.pipe(
    tap(v => console.log("Before:", v)),
    map(v => v * 2),
    tap(v => console.log("After:", v))
);

tap({
    next:     v  => console.log("Next:", v),
    error:    e  => console.error("Error:", e),
    complete: () => console.log("Done")
});

// delay — wait N ms before emitting
of("hello").pipe(delay(1000));

// finalize — runs on complete OR error (like finally)
this.http.get("/api/data").pipe(
    finalize(() => this.loading.set(false))
);

// timestamp — attach timestamp to each emission
obs$.pipe(timestamp());   // { value: x, timestamp: 1234567890 }

// timeInterval — time between emissions
obs$.pipe(timeInterval()); // { value: x, interval: 123 }
```

### Subject Types

```typescript
import { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from "rxjs";

// Subject — multicast, no initial value, new subscribers miss past values
const events$ = new Subject<string>();
events$.next("click");        // only current subscribers receive this
events$.subscribe(e => {});   // subscribes AFTER the "click" — misses it
events$.complete();

// BehaviorSubject — has current value, new subscribers get it immediately
const user$ = new BehaviorSubject<User | null>(null);
user$.value;                  // get current value synchronously
user$.getValue();             // same
user$.next(newUser);          // push new value

// New subscriber immediately gets current value:
user$.subscribe(u => console.log("Current user:", u));  // fires immediately with current

// ReplaySubject — replays last N values to new subscribers
const history$ = new ReplaySubject<string>(3);  // buffer last 3
history$.next("a");
history$.next("b");
history$.next("c");
history$.next("d");
history$.subscribe(v => console.log(v));  // gets "b","c","d" immediately

// With time window: replay values from last 1000ms
const timed$ = new ReplaySubject<string>(Infinity, 1000);

// AsyncSubject — emit only last value WHEN completed
const async$ = new AsyncSubject<string>();
async$.next("a");
async$.next("b");
async$.next("c");
async$.complete();
async$.subscribe(v => console.log(v));  // only "c"

// Practical BehaviorSubject pattern (auth service)
@Injectable({ providedIn: "root" })
export class AuthService {
    private _user$  = new BehaviorSubject<User | null>(null);
    readonly user$  = this._user$.asObservable();           // expose as read-only
    readonly isLoggedIn$ = this._user$.pipe(map(u => !!u));

    login(user: User)  { this._user$.next(user); }
    logout()           { this._user$.next(null); }
    currentUser()      { return this._user$.getValue(); }
    isLoggedIn()       { return this._user$.getValue() !== null; }
}
```

---

## Memory Leak Prevention

```typescript
// ── Method 1: takeUntil + destroy$ ────────────────────────────────────────
@Component({ ... })
export class MyComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    ngOnInit() {
        this.userService.users$
            .pipe(takeUntil(this.destroy$))
            .subscribe(users => this.users = users);

        interval(1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(n => this.tick = n);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

// ── Method 2: takeUntilDestroyed (Angular 16+) — simplest ─────────────────
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({ ... })
export class MyComponent {
    private destroyRef = inject(DestroyRef);

    ngOnInit() {
        this.userService.users$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(users => this.users = users);
    }
}

// Even simpler — inject in constructor field
@Component({ ... })
export class MyComponent {
    users$ = this.userService.users$.pipe(
        takeUntilDestroyed()   // works when called in injection context
    );
}

// ── Method 3: async pipe — automatic unsubscribe ──────────────────────────
// No manual unsubscribe needed at all!
@Component({
    template: `
        @if (users$ | async; as users) {
            @for (user of users; track user.id) {
                <p>{{ user.name }}</p>
            }
        }
    `
})
export class MyComponent {
    users$ = this.userService.getAll();  // Observable, never subscribed manually
}
```

---

## Summary

- Use signals for simple, synchronous state — cleaner and more performant than Observables for UI state.
- Use Observables (RxJS) for async event streams — HTTP, WebSocket, real-time data, complex event pipelines.
- `switchMap` for search-style cancellation; `mergeMap` for parallel; `concatMap` for ordered sequential; `exhaustMap` for ignoring duplicates while busy.
- `BehaviorSubject` is the go-to for shared mutable state that needs a current value.
- Always unsubscribe — use `takeUntilDestroyed()`, `async` pipe, or `takeUntil(destroy$)`.
- `forkJoin` for parallel calls where you need all results; `combineLatest` for reactive combined state.
- `debounceTime(300)` + `distinctUntilChanged()` is the standard search-input pattern.
