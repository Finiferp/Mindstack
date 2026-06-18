---
title: "Angular Fundamentals"
sidebar_label: "Angular Basics"
sidebar_position: 12
---

# Angular Fundamentals

Angular is a full-featured, opinionated framework from Google. Everything you need — routing, forms, HTTP, DI, testing — is built in. It uses TypeScript, follows a component-based architecture, and enforces strict structure that scales well with large teams.

---

## Setup and CLI

```bash
npm install -g @angular/cli

# Create new project
ng new my-app                    # interactive
ng new my-app --routing --style=scss  # with routing and SCSS

cd my-app
ng serve                         # dev server at http://localhost:4200
ng serve --port 4201 --open      # custom port, auto-open browser
ng build                         # production build → dist/
ng build --configuration=development
ng test                          # run unit tests (Karma/Jasmine by default)
ng lint                          # lint the project
```

### Generating Code

```bash
ng generate component features/users/user-list   # component
ng g c features/users/user-list                  # shorthand

ng g service services/user                       # service
ng g directive directives/highlight              # directive
ng g pipe pipes/truncate                         # pipe
ng g guard guards/auth                           # route guard
ng g interface models/user                       # interface
ng g enum models/user-role                       # enum
ng g module features/admin --routing             # module with routing
ng g interceptor interceptors/auth               # HTTP interceptor (standalone)

# Flags
ng g c my-comp --standalone        # standalone component (modern)
ng g c my-comp --skip-tests        # no spec file
ng g c my-comp --inline-template   # template in .ts file
ng g c my-comp --inline-style      # styles in .ts file
```

---

## Project Structure

```
src/
├── app/
│   ├── app.component.ts       ← root component
│   ├── app.component.html
│   ├── app.component.scss
│   ├── app.component.spec.ts
│   ├── app.config.ts          ← providers (standalone API)
│   ├── app.routes.ts          ← routing configuration
│   ├── core/                  ← singletons: auth service, interceptors
│   │   ├── services/
│   │   └── interceptors/
│   ├── shared/                ← reusable components, pipes, directives
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
│   └── features/              ← feature modules
│       ├── users/
│       │   ├── users.component.ts
│       │   ├── users.component.html
│       │   ├── user-detail/
│       │   └── user.service.ts
│       └── dashboard/
├── assets/
├── environments/
│   ├── environment.ts          ← dev config
│   └── environment.prod.ts     ← prod config
├── index.html
├── main.ts
└── styles.scss
```

---

## main.ts and app.config.ts

```typescript
// src/main.ts — bootstraps the application
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";

bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
```

```typescript
// src/app/app.config.ts — application-level providers
import { ApplicationConfig } from "@angular/core";
import { provideRouter, withComponentInputBinding, withViewTransitions } from "@angular/router";
import { provideHttpClient, withInterceptors, withFetch } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            routes,
            withComponentInputBinding(),   // pass route params as @Input()
            withViewTransitions()          // animated route transitions
        ),
        provideHttpClient(
            withFetch(),                   // use fetch API instead of XHR
            withInterceptors([authInterceptor, errorInterceptor])
        ),
        provideAnimationsAsync()
    ]
};
```

---

## Components — Complete Reference

A component = TypeScript class + HTML template + CSS styles.

```typescript
// src/app/features/users/user-card/user-card.component.ts
import {
    Component, Input, Output, EventEmitter,
    OnInit, OnChanges, OnDestroy, AfterViewInit,
    SimpleChanges, ChangeDetectionStrategy,
    inject, signal, computed, effect,
    ViewChild, ElementRef, HostListener, HostBinding
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { UserService } from "../user.service";

export interface User {
    id:       number;
    name:     string;
    email:    string;
    role:     string;
    active:   boolean;
    avatar?:  string;
}

@Component({
    selector:          "app-user-card",          // <app-user-card>
    standalone:        true,                     // no NgModule needed
    changeDetection:   ChangeDetectionStrategy.OnPush, // only check on input changes
    imports:           [CommonModule, RouterModule],
    templateUrl:       "./user-card.component.html",
    styleUrl:          "./user-card.component.scss"
    // Or inline:
    // template: `<div>{{ user.name }}</div>`,
    // styles: [`.card { border: 1px solid #ccc; }`]
})
export class UserCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

    // ── Inputs ──────────────────────────────────────────────────────────
    @Input({ required: true }) user!: User;   // required input (Angular 16+)
    @Input() showEmail = true;
    @Input() showActions = true;
    @Input() maxNameLength = 50;

    // ── Outputs ──────────────────────────────────────────────────────────
    @Output() deleted  = new EventEmitter<number>();      // emits user.id
    @Output() updated  = new EventEmitter<User>();
    @Output() selected = new EventEmitter<User>();

    // ── ViewChild — access DOM elements or child components ──────────────
    @ViewChild("nameEl") nameEl!: ElementRef<HTMLSpanElement>;
    @ViewChild("menuRef") menuRef?: ElementRef;  // optional

    // ── HostListener — listen to host element events ──────────────────────
    @HostListener("click") onClick() {
        this.selected.emit(this.user);
    }

    @HostListener("keydown.enter") onEnter() {
        this.selected.emit(this.user);
    }

    // ── HostBinding — bind host element properties ─────────────────────────
    @HostBinding("class.active") get isActiveClass() { return this.user?.active; }
    @HostBinding("attr.aria-label") get ariaLabel() { return `User: ${this.user?.name}`; }

    // ── Signals ────────────────────────────────────────────────────────────
    isExpanded = signal(false);
    isDeleting = signal(false);

    displayName = computed(() =>
        this.user.name.length > this.maxNameLength
            ? this.user.name.slice(0, this.maxNameLength) + "..."
            : this.user.name
    );

    // ── Services ────────────────────────────────────────────────────────────
    private userService = inject(UserService);

    constructor() {
        // effect() — run side effects when signals change
        effect(() => {
            if (this.isDeleting()) {
                console.log("Deleting user:", this.user?.id);
            }
        });
    }

    // ── Lifecycle Hooks ────────────────────────────────────────────────────
    ngOnInit(): void {
        // Runs after component is created and inputs are set
        // Good for: initial data loading, subscriptions
        console.log("UserCard initialized for:", this.user.name);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Runs when @Input() properties change
        if (changes["user"]) {
            const prev = changes["user"].previousValue as User | undefined;
            const curr = changes["user"].currentValue as User;
            console.log(`User changed from ${prev?.name} to ${curr.name}`);
        }
    }

    ngAfterViewInit(): void {
        // Runs after the view (template + children) is rendered
        // Good for: DOM access, initializing third-party libraries
        console.log("Name element:", this.nameEl.nativeElement.textContent);
    }

    ngOnDestroy(): void {
        // Runs just before component is removed
        // Good for: unsubscribing, clearing timers, cleanup
        console.log("UserCard destroyed");
    }

    // ── Methods ─────────────────────────────────────────────────────────────
    toggleExpand(): void {
        this.isExpanded.update(v => !v);
    }

    async deleteUser(): Promise<void> {
        if (!confirm(`Delete ${this.user.name}?`)) return;
        this.isDeleting.set(true);
        try {
            await this.userService.delete(this.user.id);
            this.deleted.emit(this.user.id);
        } finally {
            this.isDeleting.set(false);
        }
    }
}
```

---

## Templates — Complete Reference

### Interpolation and Expressions

```html
<!-- String interpolation — any expression that converts to string -->
<p>{{ user.name }}</p>
<p>{{ user.name.toUpperCase() }}</p>
<p>{{ 1 + 1 }}</p>
<p>{{ user.age > 18 ? 'Adult' : 'Minor' }}</p>
<p>{{ user.name | titlecase }}</p>          <!-- with pipe -->
<p>{{ 'prefix:' + user.id }}</p>
<p>{{ user.address?.city }}</p>             <!-- optional chaining -->
```

### Property Binding

```html
<!-- [property]="expression" — one-way from component to template -->
<img [src]="user.avatar" [alt]="user.name">
<button [disabled]="isLoading">Save</button>
<input [value]="searchTerm">
<a [href]="profileUrl">Profile</a>

<!-- Class binding -->
<div [class]="currentClass">...</div>       <!-- string -->
<div [class.active]="isActive">...</div>    <!-- toggle single class -->
<div [class.highlight]="score > 90" [class.warning]="score < 50">...</div>
<div [ngClass]="{ active: isActive, error: hasError, 'text-bold': isBold }">...</div>
<div [ngClass]="['base', isActive ? 'active' : 'inactive']">...</div>

<!-- Style binding -->
<div [style.color]="textColor">...</div>
<div [style.font-size]="fontSize + 'px'">...</div>
<div [style.background-color]="isActive ? 'green' : 'red'">...</div>
<div [ngStyle]="{ color: textColor, fontSize: fontSize + 'px' }">...</div>

<!-- Attribute binding (for HTML attributes that aren't DOM properties) -->
<td [attr.colspan]="colSpan">...</td>
<button [attr.aria-expanded]="isOpen">Menu</button>
<input [attr.data-id]="user.id">

<!-- DOM property vs HTML attribute -->
<input [value]="name">        <!-- sets DOM .value property -->
<input value="{{name}}">      <!-- sets HTML attribute — less preferred -->
```

### Event Binding

```html
<!-- (event)="handler" — one-way from template to component -->
<button (click)="save()">Save</button>
<button (click)="delete(user.id)">Delete</button>
<button (click)="handleClick($event)">Click</button>   <!-- $event = MouseEvent -->

<!-- Common events -->
<input (input)="onInput($event)">           <!-- fires on every keystroke -->
<input (change)="onChange($event)">         <!-- fires when focus leaves -->
<input (keyup)="onKey($event)">
<input (keyup.enter)="onEnter()">           <!-- key filter -->
<input (keydown.escape)="close()">
<form (submit)="onSubmit($event)">

<!-- Mouse events -->
<div (click)="onClick()">
<div (dblclick)="onDoubleClick()">
<div (mouseenter)="onHover()">
<div (mouseleave)="onLeave()">
<div (mouseover)="onMouseOver($event)">
<div (contextmenu)="onRightClick($event)">

<!-- Touch events -->
<div (touchstart)="onTouchStart($event)">
<div (touchend)="onTouchEnd($event)">

<!-- Custom events -->
<app-dialog (closed)="onDialogClose()">
<app-user-card (deleted)="onUserDeleted($event)">
```

### Two-Way Binding

```html
<!-- [(ngModel)] — requires FormsModule -->
<input [(ngModel)]="username">
<textarea [(ngModel)]="description"></textarea>
<input type="checkbox" [(ngModel)]="agreed">
<input type="number" [(ngModel)]="age">
<select [(ngModel)]="selectedRole">
    <option value="user">User</option>
    <option value="admin">Admin</option>
</select>

<!-- Under the hood — what [(x)] expands to -->
<input [ngModel]="username" (ngModelChange)="username = $event">

<!-- Custom two-way binding with model() signal (Angular 17+) -->
<!-- Child component: -->
<!-- name = model<string>(); -->
<!-- Parent: -->
<app-input [(name)]="username">
```

### Built-in Control Flow (Angular 17+)

```html
<!-- @if -->
@if (isLoggedIn) {
    <p>Welcome, {{ user.name }}!</p>
} @else if (isLoading) {
    <app-spinner />
} @else {
    <a routerLink="/login">Please log in</a>
}

<!-- @for — track is REQUIRED -->
@for (user of users; track user.id) {
    <app-user-card [user]="user" />
} @empty {
    <p>No users found.</p>
}

<!-- @for with index and other variables -->
@for (item of items; track item.id; let i = $index, let isFirst = $first, let isLast = $last, let isEven = $even, let isOdd = $odd, let count = $count) {
    <div [class.first]="isFirst" [class.last]="isLast">
        {{ i + 1 }}/{{ count }}: {{ item.name }}
    </div>
}

<!-- @switch -->
@switch (user.role) {
    @case ("admin") {
        <span class="badge-red">Admin</span>
    }
    @case ("moderator") {
        <span class="badge-yellow">Moderator</span>
    }
    @default {
        <span class="badge-gray">User</span>
    }
}

<!-- @defer — lazy load components -->
@defer (on viewport) {
    <app-heavy-chart />
} @loading {
    <p>Loading chart...</p>
} @error {
    <p>Failed to load chart</p>
} @placeholder {
    <div class="chart-placeholder"></div>
}

<!-- @defer triggers -->
@defer (on idle)           { }    <!-- load when browser is idle -->
@defer (on viewport)       { }    <!-- load when enters viewport -->
@defer (on interaction)    { }    <!-- load on first user interaction -->
@defer (on hover)          { }    <!-- load on hover -->
@defer (on timer(2s))      { }    <!-- load after 2 seconds -->
@defer (when isVisible())  { }    <!-- load when condition is true -->
```

### Legacy Structural Directives (still common in codebases)

```html
<!-- *ngIf -->
<div *ngIf="isVisible">Shown when true</div>
<div *ngIf="user; else noUser">{{ user.name }}</div>
<ng-template #noUser><p>No user</p></ng-template>

<!-- *ngFor -->
<li *ngFor="let item of items; let i = index; let first = first; let last = last; trackBy: trackById">
    {{ i }}: {{ item.name }}
</li>

<!-- *ngSwitch -->
<div [ngSwitch]="status">
    <span *ngSwitchCase="'active'">Active</span>
    <span *ngSwitchCase="'inactive'">Inactive</span>
    <span *ngSwitchDefault>Unknown</span>
</div>

<!-- trackBy — performance optimization for *ngFor -->
// In component:
trackById(index: number, item: any): number { return item.id; }
```

### Template References and ng-template

```html
<!-- Template reference variable -->
<input #searchInput type="text">
<button (click)="search(searchInput.value)">Search</button>

<!-- Reference to component instance -->
<app-modal #modal>
<button (click)="modal.open()">Open Modal</button>

<!-- ng-template — define reusable template blocks -->
<ng-template #loadingTpl>
    <div class="spinner">Loading...</div>
</ng-template>

<ng-template #errorTpl let-message>
    <div class="error">{{ message }}</div>
</ng-template>

@if (isLoading) {
    <ng-container *ngTemplateOutlet="loadingTpl" />
}

<!-- ng-container — logical grouping, no DOM element -->
<ng-container *ngIf="user">
    <span>{{ user.name }}</span>
    <span>{{ user.email }}</span>
</ng-container>

<!-- ng-content — project content into component -->
<!-- In child component template: -->
<div class="card">
    <ng-content select="[header]"></ng-content>   <!-- named slot -->
    <ng-content></ng-content>                     <!-- default slot -->
    <ng-content select="[footer]"></ng-content>
</div>

<!-- Using the component: -->
<app-card>
    <h2 header>Card Title</h2>
    <p>Card body content</p>
    <button footer>Action</button>
</app-card>
```

---

## Signals — Complete Reference

```typescript
import { signal, computed, effect, untracked, toSignal, toObservable } from "@angular/core";

// ── signal() ───────────────────────────────────────────────────────────────
const count = signal(0);          // WritableSignal<number>
count();                          // read: 0
count.set(5);                     // set to new value
count.update(n => n + 1);         // update based on current value
count.asReadonly();               // ReadonlySignal<number> — for exposing publicly

// Arrays and objects — Angular won't auto-detect mutations, must replace
const items = signal<string[]>([]);
items.set([...items(), "new item"]);          // replace array
items.update(arr => [...arr, "new item"]);    // update pattern

const user = signal({ name: "Alice", age: 30 });
user.update(u => ({ ...u, age: 31 }));        // replace object

// ── computed() ─────────────────────────────────────────────────────────────
const doubled  = computed(() => count() * 2);     // auto-tracks dependencies
const greeting = computed(() => `Hello, ${user().name}!`);

// Computed can depend on multiple signals
const fullInfo = computed(() =>
    `${user().name} (${count()} items)`
);

// Computed is lazy — only recalculates when dependencies change AND it's read
doubled();    // 10 if count = 5

// ── effect() ───────────────────────────────────────────────────────────────
const cleanup = effect(() => {
    console.log("Count is now:", count());
    // Runs immediately, then whenever count changes
    return () => {
        // Optional cleanup function
        console.log("Effect cleaning up");
    };
});
cleanup.destroy();  // stop the effect

// untracked — read a signal without creating a dependency
effect(() => {
    const currentCount = count();          // tracked
    const name = untracked(() => user().name);  // NOT tracked
    console.log(`${name}: ${currentCount}`);
});

// ── Input Signals (Angular 17.1+) ──────────────────────────────────────────
import { input, model, output } from "@angular/core";

@Component({ ... })
export class MyComponent {
    // input() signal — replaces @Input()
    name      = input<string>();                // InputSignal<string | undefined>
    age       = input.required<number>();       // required — InputSignal<number>
    label     = input("default label");        // with default value

    // model() signal — two-way binding, replaces @Input + @Output pair
    value     = model<string>("");             // ModelSignal<string>

    // output() — replaces @Output()
    clicked   = output<void>();               // OutputEmitter<void>
    selected  = output<User>();

    doSomething() {
        this.clicked.emit();
        this.selected.emit(this.currentUser);
    }
}

// ── viewChild() and viewChildren() (Angular 17+) ──────────────────────────
import { viewChild, viewChildren, contentChild } from "@angular/core";

@Component({ ... })
export class ParentComponent {
    // Signal-based view queries
    input    = viewChild<ElementRef>("inputRef");            // ElementRef | undefined
    input    = viewChild.required<ElementRef>("inputRef");   // always defined
    buttons  = viewChildren<ElementRef>("btn");              // Signal<readonly ElementRef[]>
    modal    = contentChild(ModalComponent);                 // projected content
}
```

---

## Services and Dependency Injection

```typescript
// src/app/core/services/user.service.ts
import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export interface User {
    id:        number;
    name:      string;
    email:     string;
    role:      string;
    active:    boolean;
    createdAt: string;
}

export interface PaginatedResponse<T> {
    data:       T[];
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}

@Injectable({ providedIn: "root" })   // singleton across the whole app
export class UserService {

    private http    = inject(HttpClient);
    private baseUrl = "/api/users";

    // Shared state with signals
    private _users    = signal<User[]>([]);
    private _loading  = signal(false);
    private _error    = signal<string | null>(null);

    // Public read-only
    readonly users   = this._users.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error   = this._error.asReadonly();
    readonly count   = computed(() => this._users().length);
    readonly admins  = computed(() => this._users().filter(u => u.role === "ADMIN"));

    async loadAll(params?: { page?: number; limit?: number; search?: string }) {
        this._loading.set(true);
        this._error.set(null);
        try {
            let httpParams = new HttpParams();
            if (params?.page  !== undefined) httpParams = httpParams.set("page",  params.page);
            if (params?.limit !== undefined) httpParams = httpParams.set("limit", params.limit);
            if (params?.search)              httpParams = httpParams.set("search", params.search);

            const result = await firstValueFrom(
                this.http.get<PaginatedResponse<User>>(this.baseUrl, { params: httpParams })
            );
            this._users.set(result.data);
            return result;
        } catch (err: any) {
            this._error.set(err.error?.message ?? "Failed to load users");
            throw err;
        } finally {
            this._loading.set(false);
        }
    }

    async getById(id: number): Promise<User> {
        return firstValueFrom(this.http.get<User>(`${this.baseUrl}/${id}`));
    }

    async create(data: Partial<User>): Promise<User> {
        const user = await firstValueFrom(this.http.post<User>(this.baseUrl, data));
        this._users.update(users => [...users, user]);
        return user;
    }

    async update(id: number, data: Partial<User>): Promise<User> {
        const updated = await firstValueFrom(this.http.put<User>(`${this.baseUrl}/${id}`, data));
        this._users.update(users => users.map(u => u.id === id ? updated : u));
        return updated;
    }

    async delete(id: number): Promise<void> {
        await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
        this._users.update(users => users.filter(u => u.id !== id));
    }
}

// ── Injection tokens — for non-class values ───────────────────────────────
import { InjectionToken } from "@angular/core";

export const API_URL = new InjectionToken<string>("API_URL");
export const APP_CONFIG = new InjectionToken<{ debug: boolean }>("APP_CONFIG");

// In app.config.ts:
{ provide: API_URL, useValue: "https://api.example.com" }
{ provide: APP_CONFIG, useValue: { debug: !environment.production } }
{ provide: API_URL, useFactory: () => environment.apiUrl }

// Inject:
private apiUrl = inject(API_URL);

// ── Service scopes ─────────────────────────────────────────────────────────
@Injectable({ providedIn: "root" })       // singleton: app-wide
@Injectable({ providedIn: "platform" })   // shared across micro-frontends
@Injectable({ providedIn: "any" })        // new instance per lazy module
// Or provide in a component:
@Component({ providers: [UserService] })  // new instance per component
```

---

## Custom Directives

```typescript
// Attribute directive — modifies behavior of host element
import { Directive, ElementRef, Input, HostListener, inject } from "@angular/core";

@Directive({
    selector: "[appHighlight]",
    standalone: true
})
export class HighlightDirective {
    private el = inject(ElementRef);

    @Input("appHighlight") color = "yellow";  // <div appHighlight="blue">
    @Input() defaultColor = "transparent";

    @HostListener("mouseenter") onMouseEnter() {
        this.el.nativeElement.style.backgroundColor = this.color;
    }

    @HostListener("mouseleave") onMouseLeave() {
        this.el.nativeElement.style.backgroundColor = this.defaultColor;
    }
}

// Structural directive
import { Directive, Input, TemplateRef, ViewContainerRef, inject } from "@angular/core";

@Directive({ selector: "[appIfRole]", standalone: true })
export class IfRoleDirective {
    private template = inject(TemplateRef);
    private viewContainer = inject(ViewContainerRef);
    private authService = inject(AuthService);

    @Input() set appIfRole(role: string) {
        if (this.authService.hasRole(role)) {
            this.viewContainer.createEmbeddedView(this.template);
        } else {
            this.viewContainer.clear();
        }
    }
}

// Usage: <button *appIfRole="'admin'">Admin Action</button>
```

---

## Summary

- Angular components = TypeScript class + template + styles — always use standalone components.
- `@Input()` passes data down; `@Output()` + `EventEmitter` sends events up.
- Use `signal()` for reactive state — Angular re-renders only what changed.
- `computed()` derives values from signals automatically.
- `effect()` runs side effects when signals change — use sparingly.
- Services are singletons by default with `providedIn: "root"`.
- `inject()` is the modern way to inject dependencies — use in constructors and field initializers.
- `@if` / `@for` / `@switch` is the new template syntax — prefer over `*ngIf` / `*ngFor`.
- Always provide a `track` expression in `@for` — it tells Angular how to identify items for efficient DOM updates.
