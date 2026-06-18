---
title: "Angular Testing"
sidebar_label: "Angular Testing"
sidebar_position: 30
---

# Angular Testing

Angular has excellent built-in testing support via the `TestBed` API. This covers unit testing components, services, pipes, directives, and HTTP — plus end-to-end testing with Playwright.

---

## Setup

Angular CLI projects come pre-configured with Jasmine + Karma. Switching to Vitest or Jest is increasingly common.

```bash
# Run existing tests
ng test              # watch mode (Karma + Jasmine)
ng test --no-watch   # run once

# Install Jest (alternative)
ng add @angular-builders/jest

# Install Vitest + Angular (modern)
npm install -D vitest @analogjs/vitest-angular
```

### TestBed

`TestBed` is Angular's testing module — it creates a mini Angular app for each test.

```typescript
import { TestBed } from "@angular/core/testing";

// Create a testing module
TestBed.configureTestingModule({
    imports:      [ComponentToTest, CommonModule, RouterTestingModule],
    providers:    [
        UserService,
        { provide: HttpClient, useClass: HttpClientTestingModule }
    ],
    declarations: []  // for non-standalone components
});

// Compile (required if using templateUrl or styleUrl)
await TestBed.compileComponents();
```

---

## Testing Components

### Basic Component Test

```typescript
// user-card.component.spec.ts
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By }                         from "@angular/platform-browser";
import { UserCardComponent }          from "./user-card.component";

describe("UserCardComponent", () => {
    let component: UserCardComponent;
    let fixture:   ComponentFixture<UserCardComponent>;

    const mockUser = {
        id:     1,
        name:   "Alice",
        email:  "alice@example.com",
        role:   "admin",
        active: true
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UserCardComponent]  // standalone component
        }).compileComponents();

        fixture   = TestBed.createComponent(UserCardComponent);
        component = fixture.componentInstance;
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });

    describe("when user input is set", () => {
        beforeEach(() => {
            component.user = mockUser;
            fixture.detectChanges();  // trigger change detection
        });

        it("displays the user name", () => {
            const el = fixture.debugElement.query(By.css("h2"));
            expect(el.nativeElement.textContent).toContain("Alice");
        });

        it("displays the user email", () => {
            const emailEl = fixture.nativeElement.querySelector("[data-testid='email']");
            expect(emailEl.textContent).toContain("alice@example.com");
        });

        it("shows active badge when user is active", () => {
            const badge = fixture.debugElement.query(By.css(".badge-active"));
            expect(badge).toBeTruthy();
        });

        it("hides active badge when user is inactive", () => {
            component.user = { ...mockUser, active: false };
            fixture.detectChanges();
            const badge = fixture.debugElement.query(By.css(".badge-active"));
            expect(badge).toBeNull();
        });
    });

    describe("events", () => {
        beforeEach(() => {
            component.user = mockUser;
            fixture.detectChanges();
        });

        it("emits deleted event when delete button clicked", () => {
            let emittedId: number | undefined;
            component.deleted.subscribe((id: number) => emittedId = id);

            const deleteBtn = fixture.debugElement.query(By.css("[data-testid='delete-btn']"));
            deleteBtn.triggerEventHandler("click", null);

            expect(emittedId).toBe(1);
        });

        it("emits selected event when card is clicked", () => {
            const spy = jasmine.createSpy("selected");
            component.selected.subscribe(spy);

            fixture.nativeElement.click();

            expect(spy).toHaveBeenCalledWith(mockUser);
        });
    });
});
```

### Component with Signals

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CounterComponent }          from "./counter.component";

describe("CounterComponent", () => {
    let component: CounterComponent;
    let fixture:   ComponentFixture<CounterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CounterComponent]
        }).compileComponents();

        fixture   = TestBed.createComponent(CounterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("starts at 0", () => {
        expect(component.count()).toBe(0);
    });

    it("increments on button click", () => {
        const btn = fixture.nativeElement.querySelector("[data-testid='increment']");
        btn.click();
        fixture.detectChanges();

        expect(component.count()).toBe(1);
        const display = fixture.nativeElement.querySelector("[data-testid='count']");
        expect(display.textContent).toBe("1");
    });

    it("computed values update when signal changes", () => {
        component.count.set(5);
        fixture.detectChanges();
        expect(component.doubled()).toBe(10);
    });
});
```

### Component with Router

```typescript
import { RouterTestingModule, RouterTestingHarness } from "@angular/router/testing";
import { Router }                                     from "@angular/router";
import { provideRouter }                              from "@angular/router";
import { routes }                                     from "../app.routes";

describe("Component with routing", () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [provideRouter(routes)]
        }).compileComponents();

        harness = await RouterTestingHarness.create();
    });

    it("loads user detail for route /users/42", async () => {
        const component = await harness.navigateByUrl("/users/42", UserDetailComponent);
        harness.detectChanges();
        expect(component.userId()).toBe(42);
    });

    it("redirects to login when not authenticated", async () => {
        await TestBed.inject(Router).navigate(["/dashboard"]);
        expect(TestBed.inject(Router).url).toBe("/login");
    });
});
```

---

## Testing Services

### Service with HttpClient

```typescript
import { TestBed }             from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { UserService }         from "./user.service";

describe("UserService", () => {
    let service:    UserService;
    let httpMock:   HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports:   [HttpClientTestingModule],
            providers: [UserService]
        });
        service  = TestBed.inject(UserService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();  // ensure no unexpected requests were made
    });

    describe("getAll()", () => {
        it("returns list of users", async () => {
            const mockUsers = [
                { id: 1, name: "Alice", email: "alice@example.com" },
                { id: 2, name: "Bob",   email: "bob@example.com" }
            ];

            // Call the service
            let result: any;
            service.getAll().subscribe(users => result = users);

            // Expect a GET request
            const req = httpMock.expectOne("/api/users");
            expect(req.request.method).toBe("GET");

            // Flush mock response
            req.flush(mockUsers);

            expect(result).toEqual(mockUsers);
            expect(result.length).toBe(2);
        });

        it("handles HTTP error", () => {
            let error: any;
            service.getAll().subscribe({
                error: (err) => error = err
            });

            const req = httpMock.expectOne("/api/users");
            req.flush("Server Error", { status: 500, statusText: "Internal Server Error" });

            expect(error).toBeTruthy();
        });

        it("sends Authorization header", async () => {
            service.getAll().subscribe();
            const req = httpMock.expectOne("/api/users");
            expect(req.request.headers.get("Authorization")).toBe("Bearer test-token");
            req.flush([]);
        });
    });

    describe("getById()", () => {
        it("requests correct URL", () => {
            service.getById(42).subscribe();
            const req = httpMock.expectOne("/api/users/42");
            expect(req.request.method).toBe("GET");
            req.flush({ id: 42, name: "Alice" });
        });
    });

    describe("create()", () => {
        it("sends POST with user data", () => {
            const newUser = { name: "Carol", email: "carol@example.com" };
            service.create(newUser).subscribe();

            const req = httpMock.expectOne("/api/users");
            expect(req.request.method).toBe("POST");
            expect(req.request.body).toEqual(newUser);
            req.flush({ id: 3, ...newUser });
        });
    });

    describe("delete()", () => {
        it("sends DELETE request", () => {
            service.delete(1).subscribe();
            const req = httpMock.expectOne("/api/users/1");
            expect(req.request.method).toBe("DELETE");
            req.flush(null);
        });
    });
});
```

### Service with Dependencies Mocked

```typescript
import { TestBed }    from "@angular/core/testing";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { Router }      from "@angular/router";
import { of, throwError } from "rxjs";

describe("AuthService", () => {
    let authService: AuthService;
    let userServiceSpy: jasmine.SpyObj<UserService>;
    let routerSpy:      jasmine.SpyObj<Router>;

    beforeEach(() => {
        userServiceSpy = jasmine.createSpyObj("UserService", ["getByEmail", "create"]);
        routerSpy      = jasmine.createSpyObj("Router", ["navigate", "navigateByUrl"]);

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userServiceSpy },
                { provide: Router,      useValue: routerSpy }
            ]
        });
        authService = TestBed.inject(AuthService);
    });

    describe("login()", () => {
        const credentials = { email: "alice@example.com", password: "pass123" };

        it("navigates to dashboard on successful login", async () => {
            const mockUser = { id: 1, email: "alice@example.com", role: "user" };
            userServiceSpy.getByEmail.and.returnValue(of(mockUser));

            await authService.login(credentials.email, credentials.password);

            expect(routerSpy.navigate).toHaveBeenCalledWith(["/dashboard"]);
        });

        it("sets current user on successful login", async () => {
            const mockUser = { id: 1, email: "alice@example.com", role: "user" };
            userServiceSpy.getByEmail.and.returnValue(of(mockUser));

            await authService.login(credentials.email, credentials.password);

            expect(authService.currentUser()?.email).toBe("alice@example.com");
        });

        it("throws error on failed login", async () => {
            userServiceSpy.getByEmail.and.returnValue(throwError(() => new Error("Invalid credentials")));

            await expectAsync(authService.login(credentials.email, credentials.password))
                .toBeRejectedWithError("Invalid credentials");
        });
    });

    describe("logout()", () => {
        it("clears user and navigates to login", () => {
            authService.logout();
            expect(authService.currentUser()).toBeNull();
            expect(routerSpy.navigate).toHaveBeenCalledWith(["/login"]);
        });
    });
});
```

---

## Testing Pipes

```typescript
import { TruncatePipe } from "./truncate.pipe";

describe("TruncatePipe", () => {
    let pipe: TruncatePipe;

    beforeEach(() => {
        pipe = new TruncatePipe();  // pipes are plain classes — no TestBed needed
    });

    it("creates an instance", () => {
        expect(pipe).toBeTruthy();
    });

    it("returns full string if shorter than limit", () => {
        expect(pipe.transform("Hello", 10)).toBe("Hello");
    });

    it("truncates string at limit", () => {
        expect(pipe.transform("Hello, World!", 5)).toBe("He...");
    });

    it("uses custom ellipsis", () => {
        expect(pipe.transform("Hello, World!", 5, " →")).toBe("Hel →");
    });

    it("handles empty string", () => {
        expect(pipe.transform("", 10)).toBe("");
    });

    it("handles null/undefined gracefully", () => {
        expect(pipe.transform(null as any, 10)).toBe("");
        expect(pipe.transform(undefined as any, 10)).toBe("");
    });
});
```

---

## Testing Directives

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component }                 from "@angular/core";
import { By }                        from "@angular/platform-browser";
import { HighlightDirective }        from "./highlight.directive";

// Create a test host component
@Component({
    standalone: true,
    imports:    [HighlightDirective],
    template:   `
        <p appHighlight="cyan" data-testid="default">Default</p>
        <p appHighlight="yellow" [defaultColor]="'gray'" data-testid="custom">Custom</p>
    `
})
class TestHostComponent {}

describe("HighlightDirective", () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TestHostComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
    });

    it("sets background color on mouseover", () => {
        const el = fixture.debugElement.query(By.css("[data-testid='default']"));

        el.triggerEventHandler("mouseenter", null);
        fixture.detectChanges();

        expect(el.nativeElement.style.backgroundColor).toBe("cyan");
    });

    it("resets background color on mouseleave", () => {
        const el = fixture.debugElement.query(By.css("[data-testid='default']"));

        el.triggerEventHandler("mouseenter", null);
        el.triggerEventHandler("mouseleave", null);
        fixture.detectChanges();

        expect(el.nativeElement.style.backgroundColor).toBe("transparent");
    });

    it("uses custom default color", () => {
        const el = fixture.debugElement.query(By.css("[data-testid='custom']"));

        el.triggerEventHandler("mouseleave", null);
        fixture.detectChanges();

        expect(el.nativeElement.style.backgroundColor).toBe("gray");
    });

    it("finds all elements with directive", () => {
        const elements = fixture.debugElement.queryAll(By.directive(HighlightDirective));
        expect(elements.length).toBe(2);
    });
});
```

---

## Testing Guards

```typescript
import { TestBed }     from "@angular/core/testing";
import { Router }      from "@angular/router";
import { authGuard }   from "./auth.guard";
import { AuthService } from "../services/auth.service";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { provideRouter } from "@angular/router";

describe("authGuard", () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy:      jasmine.SpyObj<Router>;

    function runGuard(url = "/dashboard") {
        const route = { data: {} } as ActivatedRouteSnapshot;
        const state = { url }      as RouterStateSnapshot;
        return TestBed.runInInjectionContext(() => authGuard(route, state));
    }

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj("AuthService", ["isLoggedIn"]);
        routerSpy      = jasmine.createSpyObj("Router", ["createUrlTree"]);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router,      useValue: routerSpy },
                provideRouter([])
            ]
        });
    });

    it("returns true when user is logged in", () => {
        authServiceSpy.isLoggedIn.and.returnValue(true);
        const result = runGuard();
        expect(result).toBe(true);
    });

    it("redirects to login when user is not logged in", () => {
        authServiceSpy.isLoggedIn.and.returnValue(false);
        const urlTree = jasmine.createSpyObj("UrlTree", []);
        routerSpy.createUrlTree.and.returnValue(urlTree);

        const result = runGuard("/protected");

        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(
            ["/login"],
            jasmine.objectContaining({ queryParams: { returnUrl: "/protected" } })
        );
        expect(result).toBe(urlTree);
    });
});
```

---

## Testing with Spectator (Optional — cleaner API)

```bash
npm install -D @ngneat/spectator
```

```typescript
import { createComponentFactory, Spectator } from "@ngneat/spectator";
import { UserCardComponent }                  from "./user-card.component";

describe("UserCardComponent with Spectator", () => {
    let spectator: Spectator<UserCardComponent>;

    const createComponent = createComponentFactory({
        component: UserCardComponent,
        detectChanges: false
    });

    const mockUser = { id: 1, name: "Alice", email: "alice@example.com", active: true };

    beforeEach(() => {
        spectator = createComponent({ props: { user: mockUser } });
    });

    it("renders user name", () => {
        spectator.detectChanges();
        expect(spectator.query("h2")).toHaveText("Alice");
    });

    it("emits deleted event on delete click", () => {
        spectator.detectChanges();
        let emittedId: number | undefined;
        spectator.output("deleted").subscribe(id => emittedId = id);
        spectator.click("[data-testid='delete-btn']");
        expect(emittedId).toBe(1);
    });

    it("sets active class when user is active", () => {
        spectator.detectChanges();
        expect(spectator.query(".card")).toHaveClass("active");
    });
});
```

---

## End-to-End Testing with Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// e2e/auth.spec.ts
import { test, expect, Page } from "@playwright/test";

// playwright.config.ts
export default {
    baseURL: "http://localhost:4200",
    use: {
        headless:  true,
        viewport:  { width: 1280, height: 720 },
        screenshot:"only-on-failure",
        video:     "retain-on-failure"
    }
};

test.describe("Authentication", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("user can log in with valid credentials", async ({ page }) => {
        await page.goto("/login");

        // Fill form
        await page.fill("[data-testid='email-input']",    "alice@example.com");
        await page.fill("[data-testid='password-input']", "Password1!");
        await page.click("[data-testid='login-btn']");

        // Assert redirect to dashboard
        await expect(page).toHaveURL("/dashboard");
        await expect(page.locator("[data-testid='welcome-msg']")).toContainText("Alice");
    });

    test("shows error for invalid credentials", async ({ page }) => {
        await page.goto("/login");
        await page.fill("[data-testid='email-input']",    "wrong@example.com");
        await page.fill("[data-testid='password-input']", "wrongpassword");
        await page.click("[data-testid='login-btn']");

        await expect(page.locator("[data-testid='error-msg']")).toBeVisible();
        await expect(page.locator("[data-testid='error-msg']")).toContainText("Invalid");
        await expect(page).toHaveURL("/login");
    });

    test("redirects to login when accessing protected route unauthenticated", async ({ page }) => {
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe("User Management", () => {
    test.beforeEach(async ({ page }) => {
        // Log in before each test
        await page.goto("/login");
        await page.fill("[data-testid='email-input']",    "admin@example.com");
        await page.fill("[data-testid='password-input']", "Admin1234!");
        await page.click("[data-testid='login-btn']");
        await expect(page).toHaveURL("/dashboard");
    });

    test("admin can create a new user", async ({ page }) => {
        await page.goto("/admin/users");
        await page.click("[data-testid='create-user-btn']");

        await page.fill("[name='name']",  "New User");
        await page.fill("[name='email']", "new@example.com");
        await page.fill("[name='password']", "Password1!");
        await page.click("[type='submit']");

        await expect(page.locator("[data-testid='success-toast']")).toBeVisible();
        await expect(page.locator("table")).toContainText("New User");
    });

    test("can filter users by role", async ({ page }) => {
        await page.goto("/admin/users");
        await page.selectOption("[data-testid='role-filter']", "admin");
        await page.waitForTimeout(300);  // debounce

        const rows = page.locator("tbody tr");
        const count = await rows.count();
        for (let i = 0; i < count; i++) {
            await expect(rows.nth(i)).toContainText("admin");
        }
    });

    test("can delete a user with confirmation", async ({ page }) => {
        await page.goto("/admin/users");

        // Get initial count
        const initialCount = await page.locator("tbody tr").count();

        // Click delete and confirm
        await page.click("tbody tr:first-child [data-testid='delete-btn']");
        page.on("dialog", dialog => dialog.accept());

        await expect(page.locator("tbody tr")).toHaveCount(initialCount - 1);
    });
});

// Page Object Model pattern — reusable page interactions
class LoginPage {
    constructor(private page: Page) {}

    async goto()                        { await this.page.goto("/login"); }
    async fillEmail(email: string)      { await this.page.fill("[data-testid='email-input']", email); }
    async fillPassword(password: string){ await this.page.fill("[data-testid='password-input']", password); }
    async submit()                      { await this.page.click("[data-testid='login-btn']"); }
    async errorMessage()                { return this.page.locator("[data-testid='error-msg']"); }

    async login(email: string, password: string) {
        await this.fillEmail(email);
        await this.fillPassword(password);
        await this.submit();
    }
}

test("login with page object model", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("alice@example.com", "Password1!");
    await expect(page).toHaveURL("/dashboard");
});
```

---

## Summary

- `TestBed.configureTestingModule()` creates a mini Angular environment per test file.
- Always call `fixture.detectChanges()` after setting inputs or changing state — Angular doesn't run change detection automatically in tests.
- Use `httpMock.verify()` in `afterEach` to catch unexpected HTTP requests.
- `jasmine.createSpyObj("ServiceName", ["method1", "method2"])` creates a fully mocked service.
- `By.css()` selects elements in the template; `.nativeElement` gives you the actual DOM element.
- Add `data-testid` attributes to elements in templates — they survive refactoring and make tests readable.
- Use `RouterTestingHarness` to test routed components without a real browser.
- Playwright is the modern E2E tool — use Page Object Model to keep tests maintainable.
