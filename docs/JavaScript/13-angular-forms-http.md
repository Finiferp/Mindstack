---
title: "Angular Forms & HTTP"
sidebar_label: "Forms & HTTP"
sidebar_position: 13
---

# Angular Forms & HTTP

Angular has two form systems: **Reactive Forms** (recommended — form structure in TypeScript, fully testable) and **Template-Driven Forms** (simpler but less powerful). `HttpClient` is Angular's built-in HTTP service — it returns Observables and integrates with interceptors for cross-cutting concerns.

---

## Reactive Forms — Setup

```typescript
// app.config.ts
import { provideRouter } from "@angular/router";
// ReactiveFormsModule is standalone — just import it in the component
```

```typescript
// in component imports array
import { ReactiveFormsModule } from "@angular/forms";

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule]
})
```

---

## FormControl — Single Field

```typescript
import { FormControl, Validators, AbstractControl, ValidationErrors } from "@angular/forms";

// Basic
const nameControl = new FormControl("");
const nameControl = new FormControl("", Validators.required);
const nameControl = new FormControl("", [Validators.required, Validators.minLength(2)]);

// Typed (Angular 14+)
const nameControl = new FormControl<string>("", { nonNullable: true });

// Read values
nameControl.value         // current value
nameControl.valid         // true if all validators pass
nameControl.invalid       // true if any validator fails
nameControl.dirty         // true if user has changed the value
nameControl.pristine      // true if user has NOT changed the value
nameControl.touched       // true if field has been focused and blurred
nameControl.untouched     // true if field has never been touched
nameControl.errors        // { required: true } | { minlength: { requiredLength: 2, actualLength: 1 } } | null
nameControl.status        // "VALID" | "INVALID" | "PENDING" | "DISABLED"
nameControl.statusChanges // Observable<string> — emits every status change
nameControl.valueChanges  // Observable<string> — emits every value change

// Update values
nameControl.setValue("Alice");        // set full value
nameControl.patchValue("Alice");      // same for single controls
nameControl.reset();                  // reset to initial value + mark pristine/untouched
nameControl.reset("default");         // reset to specific value

// State management
nameControl.markAsTouched();
nameControl.markAsUntouched();
nameControl.markAsDirty();
nameControl.markAsPristine();
nameControl.disable();                // disable the control
nameControl.enable();
nameControl.setValidators([Validators.required, Validators.email]);
nameControl.clearValidators();
nameControl.updateValueAndValidity(); // re-run validation after changing validators
nameControl.setErrors({ custom: true }); // manually set errors
```

---

## FormGroup — Multiple Fields

```typescript
import { FormBuilder, FormGroup, FormControl, Validators } from "@angular/forms";
import { inject } from "@angular/core";

@Component({ ... })
export class RegisterFormComponent {
    private fb = inject(FormBuilder);

    // Method 1: FormBuilder (concise)
    form = this.fb.group({
        name:     ["", [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        email:    ["", [Validators.required, Validators.email]],
        password: ["", [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%])/)
        ]],
        confirmPassword: ["", Validators.required],
        age:      [null, [Validators.min(18), Validators.max(120)]],
        role:     ["user", Validators.required],
        newsletter: [false],
        address: this.fb.group({          // nested group
            street:  [""],
            city:    ["", Validators.required],
            country: ["", Validators.required],
            zip:     ["", Validators.pattern(/^\d{5}$/)]
        })
    }, {
        validators: [passwordMatchValidator, ageConfirmationValidator]
    });

    // Method 2: Direct FormGroup (verbose but explicit types)
    form2 = new FormGroup({
        name:  new FormControl("", { validators: Validators.required, nonNullable: true }),
        email: new FormControl("", { validators: [Validators.required, Validators.email], nonNullable: true })
    });

    // Access controls
    get name()     { return this.form.get("name")!; }
    get email()    { return this.form.get("email")!; }
    get password() { return this.form.get("password")!; }
    get address()  { return this.form.get("address") as FormGroup; }
    get city()     { return this.form.get("address.city")!; }  // nested path

    // Form state
    this.form.value         // { name: "Alice", email: "...", ... }
    this.form.valid
    this.form.invalid
    this.form.dirty
    this.form.touched
    this.form.errors        // group-level errors (from group validators)

    // Update
    this.form.setValue({    // set ALL fields — must provide all
        name: "Alice", email: "alice@example.com",
        password: "Secret1!", confirmPassword: "Secret1!",
        age: 25, role: "user", newsletter: false,
        address: { street: "", city: "Paris", country: "FR", zip: "" }
    });
    this.form.patchValue({  // set SOME fields — others unchanged
        name: "Alice",
        address: { city: "London" }  // only updates city
    });
    this.form.reset();
    this.form.markAllAsTouched();     // show all errors (on submit)

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        console.log(this.form.value);
        console.log(this.form.getRawValue()); // includes disabled controls
    }
}

// Cross-field validator — runs at the group level
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password        = group.get("password")?.value;
    const confirmPassword = group.get("confirmPassword")?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
}

function ageConfirmationValidator(group: AbstractControl): ValidationErrors | null {
    const age      = group.get("age")?.value;
    const role     = group.get("role")?.value;
    if (role === "admin" && age < 21) return { tooYoungForAdmin: true };
    return null;
}
```

---

## Reactive Form Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">

    <!-- Text input -->
    <div class="field">
        <label for="name">Name</label>
        <input id="name" type="text" formControlName="name" placeholder="Enter your name">

        @if (name.invalid && name.touched) {
            @if (name.errors?.["required"])  { <span class="error">Name is required</span> }
            @if (name.errors?.["minlength"]) {
                <span class="error">Minimum {{ name.errors?.["minlength"].requiredLength }} characters</span>
            }
            @if (name.errors?.["maxlength"]) { <span class="error">Too long</span> }
        }
    </div>

    <!-- Email -->
    <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" formControlName="email">
        @if (email.invalid && email.touched) {
            @if (email.errors?.["required"]) { <span class="error">Email is required</span> }
            @if (email.errors?.["email"])    { <span class="error">Invalid email format</span> }
        }
    </div>

    <!-- Password with strength indicator -->
    <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" formControlName="password">
        <div class="strength-bar" [class]="getStrengthClass()"></div>
        @if (password.invalid && password.touched) {
            @if (password.errors?.["required"]) { <span class="error">Password is required</span> }
            @if (password.errors?.["minlength"]) { <span class="error">At least 8 characters</span> }
            @if (password.errors?.["pattern"])   { <span class="error">Must have uppercase, number, symbol</span> }
        }
    </div>

    <!-- Confirm password — group-level error -->
    <div class="field">
        <label for="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" formControlName="confirmPassword">
        @if (form.errors?.["passwordMismatch"] && confirmPassword.touched) {
            <span class="error">Passwords do not match</span>
        }
    </div>

    <!-- Select -->
    <div class="field">
        <label for="role">Role</label>
        <select id="role" formControlName="role">
            <option value="">Select a role</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
        </select>
    </div>

    <!-- Checkbox -->
    <div class="field">
        <label>
            <input type="checkbox" formControlName="newsletter">
            Subscribe to newsletter
        </label>
    </div>

    <!-- Radio buttons -->
    <div class="field">
        <label><input type="radio" formControlName="role" value="user"> User</label>
        <label><input type="radio" formControlName="role" value="admin"> Admin</label>
    </div>

    <!-- Nested group -->
    <div formGroupName="address">
        <input formControlName="city" placeholder="City">
        <input formControlName="country" placeholder="Country">
        @if (city.invalid && city.touched) {
            <span class="error">City is required</span>
        }
    </div>

    <!-- Submit -->
    <button type="submit" [disabled]="form.invalid || form.pristine">
        @if (isSubmitting) { Saving... } @else { Save }
    </button>
    <button type="button" (click)="form.reset()">Reset</button>

    <!-- Debug helper -->
    <!-- <pre>{{ form.value | json }}</pre> -->
    <!-- <pre>{{ form.errors | json }}</pre> -->

</form>
```

---

## FormArray — Dynamic Lists

```typescript
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { inject } from "@angular/core";

@Component({ ... })
export class OrderFormComponent {
    private fb = inject(FormBuilder);

    form = this.fb.group({
        customerName: ["", Validators.required],
        items: this.fb.array([this.newItem()])  // start with one item
    });

    get items(): FormArray { return this.form.get("items") as FormArray; }

    newItem(): FormGroup {
        return this.fb.group({
            productName: ["",  Validators.required],
            quantity:    [1,   [Validators.required, Validators.min(1)]],
            unitPrice:   [0,   [Validators.required, Validators.min(0)]],
            discount:    [0,   [Validators.min(0), Validators.max(100)]]
        });
    }

    addItem(): void { this.items.push(this.newItem()); }
    removeItem(i: number): void { this.items.removeAt(i); }
    moveUp(i: number): void { if (i > 0) this.items.setControl(i - 1, this.items.at(i)); }

    get total(): number {
        return this.items.controls.reduce((sum, item) => {
            const qty      = item.get("quantity")!.value;
            const price    = item.get("unitPrice")!.value;
            const discount = item.get("discount")!.value;
            return sum + qty * price * (1 - discount / 100);
        }, 0);
    }

    // Programmatically setting values in arrays
    loadOrder(order: any): void {
        const itemFGs = order.items.map((item: any) =>
            this.fb.group({ productName: item.name, quantity: item.qty, unitPrice: item.price, discount: 0 })
        );
        this.form.setControl("items", this.fb.array(itemFGs));
    }
}
```

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <input formControlName="customerName" placeholder="Customer name">

    <div formArrayName="items">
        @for (item of items.controls; track $index; let i = $index) {
            <div [formGroupName]="i" class="order-item">
                <input formControlName="productName" placeholder="Product">
                <input type="number" formControlName="quantity" min="1">
                <input type="number" formControlName="unitPrice" min="0" step="0.01">
                <input type="number" formControlName="discount" min="0" max="100">
                <button type="button" (click)="removeItem(i)"
                    [disabled]="items.length === 1">Remove</button>
            </div>
        }
    </div>

    <button type="button" (click)="addItem()">+ Add Item</button>
    <p>Total: {{ total | currency }}</p>
    <button type="submit" [disabled]="form.invalid">Place Order</button>
</form>
```

---

## All Built-in Validators

```typescript
import { Validators } from "@angular/forms";

Validators.required                     // field must not be empty
Validators.requiredTrue                 // checkbox must be checked (terms of service)
Validators.min(0)                       // number >= 0
Validators.max(100)                     // number <= 100
Validators.minLength(2)                 // string >= 2 characters
Validators.maxLength(100)               // string <= 100 characters
Validators.email                        // must be valid email format
Validators.pattern(/^[0-9]+$/)         // must match regex
Validators.pattern("^[a-zA-Z]+$")      // pattern as string
Validators.nullValidator                // always valid (no-op)
Validators.compose([v1, v2, v3])       // combine validators (same as array)
Validators.composeAsync([v1, v2])      // combine async validators
```

### Custom Validators

```typescript
import { AbstractControl, ValidationErrors, AsyncValidatorFn, ValidatorFn } from "@angular/forms";
import { Observable, of, debounceTime, switchMap, map, first } from "rxjs";

// Sync validator
export function noSpacesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        return /\s/.test(control.value) ? { noSpaces: "No spaces allowed" } : null;
    };
}

export function passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value: string = control.value || "";
        const errors: any = {};
        if (!/[A-Z]/.test(value)) errors.noUppercase = true;
        if (!/[a-z]/.test(value)) errors.noLowercase = true;
        if (!/[0-9]/.test(value)) errors.noNumber = true;
        if (!/[!@#$%^&*]/.test(value)) errors.noSymbol = true;
        return Object.keys(errors).length ? errors : null;
    };
}

export function matchFieldValidator(matchTo: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const parent = control.parent;
        if (!parent) return null;
        const other = parent.get(matchTo);
        return other && control.value !== other.value ? { fieldMismatch: true } : null;
    };
}

// Async validator — checks server-side (e.g. email uniqueness)
export function uniqueEmailValidator(userService: UserService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value || !control.dirty) return of(null);
        return of(control.value).pipe(
            debounceTime(400),           // wait 400ms before checking
            switchMap(email => userService.checkEmailTaken(email)),
            map(isTaken => isTaken ? { emailTaken: true } : null),
            first()                      // complete after first emission
        );
    };
}

// Using custom validators
const form = this.fb.group({
    username: ["", [Validators.required, noSpacesValidator()]],
    password: ["", [Validators.required, passwordStrengthValidator()]],
    confirm:  ["", [Validators.required, matchFieldValidator("password")]],
    email:    ["", {
        validators:      [Validators.required, Validators.email],
        asyncValidators: [uniqueEmailValidator(this.userService)],
        updateOn:        "blur"   // only validate on blur, not every keypress
    }]
});
```

---

## Template-Driven Forms

```typescript
import { FormsModule } from "@angular/forms";

@Component({
    standalone: true,
    imports:    [FormsModule, CommonModule],
    template: `
        <form #form="ngForm" (ngSubmit)="onSubmit(form)">
            <input
                name="email"
                type="email"
                [(ngModel)]="model.email"
                required
                email
                minlength="5"
                #emailField="ngModel"
            >
            @if (emailField.invalid && emailField.touched) {
                @if (emailField.errors?.["required"]) { <span>Required</span> }
                @if (emailField.errors?.["email"])    { <span>Invalid email</span> }
            }

            <button [disabled]="form.invalid">Submit</button>
        </form>
    `
})
export class TemplateFormComponent {
    model = { name: "", email: "", role: "user" };

    onSubmit(form: NgForm): void {
        if (form.valid) {
            console.log(form.value);
            form.reset();
        }
    }
}
```

---

## HttpClient — Complete Reference

```typescript
// app.config.ts
import { provideHttpClient, withInterceptors, withFetch } from "@angular/common/http";
providers: [
    provideHttpClient(
        withFetch(),                                      // use fetch API
        withInterceptors([authInterceptor, errorInterceptor, loggingInterceptor])
    )
]
```

```typescript
// src/app/core/services/api.service.ts
import { Injectable, inject } from "@angular/core";
import {
    HttpClient, HttpHeaders, HttpParams,
    HttpRequest, HttpResponse, HttpEventType
} from "@angular/common/http";
import { Observable, firstValueFrom } from "rxjs";
import { map, catchError, retry, timeout } from "rxjs/operators";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class ApiService {
    private http    = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    // ── GET ────────────────────────────────────────────────────────────
    get<T>(path: string, params?: Record<string, any>): Observable<T> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== null && v !== undefined) {
                    httpParams = httpParams.set(k, String(v));
                }
            });
        }
        return this.http.get<T>(`${this.baseUrl}${path}`, { params: httpParams });
    }

    // ── POST ───────────────────────────────────────────────────────────
    post<T>(path: string, body: any): Observable<T> {
        return this.http.post<T>(`${this.baseUrl}${path}`, body);
    }

    // ── PUT ────────────────────────────────────────────────────────────
    put<T>(path: string, body: any): Observable<T> {
        return this.http.put<T>(`${this.baseUrl}${path}`, body);
    }

    // ── PATCH ──────────────────────────────────────────────────────────
    patch<T>(path: string, body: any): Observable<T> {
        return this.http.patch<T>(`${this.baseUrl}${path}`, body);
    }

    // ── DELETE ─────────────────────────────────────────────────────────
    delete<T = void>(path: string): Observable<T> {
        return this.http.delete<T>(`${this.baseUrl}${path}`);
    }

    // ── Full Response (access headers, status) ─────────────────────────
    getWithHeaders<T>(path: string): Observable<HttpResponse<T>> {
        return this.http.get<T>(`${this.baseUrl}${path}`, {
            observe: "response"   // get full HttpResponse, not just body
        });
    }

    // ── File Upload with Progress ──────────────────────────────────────
    uploadFile(path: string, file: File): Observable<number | string> {
        const formData = new FormData();
        formData.append("file", file, file.name);

        return this.http.post(`${this.baseUrl}${path}`, formData, {
            reportProgress: true,
            observe:        "events"
        }).pipe(
            map(event => {
                switch (event.type) {
                    case HttpEventType.UploadProgress:
                        return Math.round(100 * (event.loaded / (event.total ?? 1)));
                    case HttpEventType.Response:
                        return "Upload complete!";
                    default:
                        return 0;
                }
            })
        );
    }

    // ── Download ───────────────────────────────────────────────────────
    download(path: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}${path}`, {
            responseType: "blob"   // "json" | "text" | "blob" | "arraybuffer"
        });
    }
}
```

### Using HttpClient in a Service

```typescript
@Injectable({ providedIn: "root" })
export class UserService {
    private http = inject(HttpClient);

    // Return Observable — component subscribes
    getUsers(): Observable<User[]> {
        return this.http.get<User[]>("/api/users");
    }

    // Return Promise — component awaits
    async getUserById(id: number): Promise<User> {
        return firstValueFrom(this.http.get<User>(`/api/users/${id}`));
    }

    // With operators
    getActiveUsers(): Observable<User[]> {
        return this.http.get<User[]>("/api/users").pipe(
            map(users => users.filter(u => u.active)),
            retry(2),                              // retry on error, up to 2 times
            timeout(5000),                         // throw if no response in 5s
            catchError(err => {
                console.error("Failed to fetch users:", err);
                return of([]);                     // return empty array on error
            })
        );
    }

    // With custom headers
    getPrivateData(): Observable<any> {
        const headers = new HttpHeaders({
            "X-Custom-Header": "value",
            "Accept-Language":  "en"
        });
        return this.http.get("/api/private", { headers });
    }
}
```

### HTTP Interceptors

```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const auth  = inject(AuthService);
    const token = auth.accessToken();

    // Don't add token to auth endpoints
    if (req.url.includes("/auth/login") || req.url.includes("/auth/register")) {
        return next(req);
    }

    if (token) {
        const authReq = req.clone({
            headers: req.headers.set("Authorization", `Bearer ${token}`)
        });
        return next(authReq);
    }
    return next(req);
};
```

```typescript
// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError, switchMap } from "rxjs";
import { AuthService } from "../services/auth.service";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const auth   = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Try to refresh token
                return auth.refreshToken().pipe(
                    switchMap(newToken => {
                        const retryReq = req.clone({
                            headers: req.headers.set("Authorization", `Bearer ${newToken}`)
                        });
                        return next(retryReq);
                    }),
                    catchError(() => {
                        auth.logout();
                        router.navigate(["/login"]);
                        return throwError(() => error);
                    })
                );
            }

            if (error.status === 403) {
                router.navigate(["/forbidden"]);
            }

            if (error.status === 0) {
                console.error("Network error — check your connection");
            }

            // Re-throw the error so components can handle it
            return throwError(() => error);
        })
    );
};
```

```typescript
// Logging interceptor
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const start = Date.now();
    console.log(`→ ${req.method} ${req.url}`);

    return next(req).pipe(
        tap({
            next: event => {
                if (event instanceof HttpResponse) {
                    console.log(`← ${req.method} ${req.url} ${event.status} (${Date.now() - start}ms)`);
                }
            },
            error: err => {
                console.error(`← ${req.method} ${req.url} ERROR ${err.status} (${Date.now() - start}ms)`);
            }
        })
    );
};

// Caching interceptor
export const cachingInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.method !== "GET") return next(req);

    const cache = inject(HttpCacheService);
    const cached = cache.get(req.url);
    if (cached) return of(cached);

    return next(req).pipe(
        tap(response => {
            if (response instanceof HttpResponse) cache.set(req.url, response);
        })
    );
};
```

---

## Built-in Pipes — Complete Reference

```html
<!-- DatePipe -->
{{ today | date }}                              <!-- Apr 15, 2024 -->
{{ today | date:"short" }}                      <!-- 4/15/24, 12:00 PM -->
{{ today | date:"medium" }}                     <!-- Apr 15, 2024, 12:00:00 PM -->
{{ today | date:"long" }}                       <!-- April 15, 2024 at 12:00:00 PM GMT+1 -->
{{ today | date:"full" }}                       <!-- Monday, April 15, 2024 at 12:00:00 PM -->
{{ today | date:"shortDate" }}                  <!-- 4/15/24 -->
{{ today | date:"longDate" }}                   <!-- April 15, 2024 -->
{{ today | date:"shortTime" }}                  <!-- 12:00 PM -->
{{ today | date:"dd/MM/yyyy" }}                 <!-- 15/04/2024 -->
{{ today | date:"yyyy-MM-dd HH:mm:ss" }}        <!-- 2024-04-15 12:00:00 -->
{{ today | date:"MMMM d" }}                     <!-- April 15 -->
{{ today | date:"h:mm a" }}                     <!-- 12:00 PM -->
{{ today | date:"dd/MM/yyyy":"UTC" }}           <!-- in UTC timezone -->
{{ today | date:"dd/MM/yyyy":"":"fr" }}         <!-- French locale -->

<!-- NumberPipe: number:"minIntegerDigits.minFractionDigits-maxFractionDigits" -->
{{ 1234.5678 | number }}                        <!-- 1,234.568 (default: 1.0-3) -->
{{ 1234.5678 | number:"1.2-2" }}                <!-- 1,234.57 -->
{{ 0.5 | number:"1.0-0" }}                      <!-- 1 -->
{{ 1234.5 | number:"4.2-2" }}                   <!-- 1,234.50 -->

<!-- CurrencyPipe -->
{{ 19.99 | currency }}                          <!-- $19.99 (default: USD) -->
{{ 19.99 | currency:"EUR" }}                    <!-- €19.99 -->
{{ 19.99 | currency:"GBP":"symbol":"1.2-2" }}   <!-- £19.99 -->
{{ 19.99 | currency:"USD":"code" }}             <!-- USD19.99 -->
{{ 19.99 | currency:"USD":"symbol":"":"fr" }}   <!-- 19,99 $US (French) -->

<!-- PercentPipe -->
{{ 0.75 | percent }}                            <!-- 75% -->
{{ 0.7567 | percent:"1.0-2" }}                  <!-- 75.67% -->

<!-- DecimalPipe — same as NumberPipe -->
{{ 3.14159 | number:"1.2-2" }}                  <!-- 3.14 -->

<!-- UpperCasePipe / LowerCasePipe / TitleCasePipe -->
{{ "hello world" | uppercase }}                 <!-- HELLO WORLD -->
{{ "HELLO WORLD" | lowercase }}                 <!-- hello world -->
{{ "hello world" | titlecase }}                 <!-- Hello World -->

<!-- SlicePipe -->
{{ [1,2,3,4,5] | slice:1:3 }}                   <!-- [2, 3] -->
{{ "hello world" | slice:0:5 }}                 <!-- hello -->
{{ "hello world" | slice:-5 }}                  <!-- world -->

<!-- JsonPipe — debugging -->
{{ myObject | json }}

<!-- KeyValuePipe — iterate object in template -->
@for (item of myObject | keyvalue; track item.key) {
    <p>{{ item.key }}: {{ item.value }}</p>
}

<!-- AsyncPipe — subscribe + unsubscribe automatically -->
{{ user$ | async }}
{{ (user$ | async)?.name }}
@if (users$ | async; as users) {
    @for (user of users; track user.id) {
        <p>{{ user.name }}</p>
    }
}

<!-- i18nPluralPipe -->
{{ messageCount | i18nPlural: { "=0": "No messages", "=1": "1 message", "other": "# messages" } }}
<!-- "# messages" — # is replaced with the value -->

<!-- i18nSelectPipe -->
{{ gender | i18nSelect: { "male": "his", "female": "her", "other": "their" } }}
```

### Custom Pipes

```typescript
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "truncate", standalone: true })
export class TruncatePipe implements PipeTransform {
    transform(value: string, limit = 100, ellipsis = "..."): string {
        if (!value || value.length <= limit) return value;
        return value.slice(0, limit).trimEnd() + ellipsis;
    }
}

@Pipe({ name: "timeAgo", standalone: true })
export class TimeAgoPipe implements PipeTransform {
    transform(value: Date | string): string {
        const date = new Date(value);
        const now  = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60)   return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400)return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}

@Pipe({ name: "filterBy", standalone: true, pure: false })  // pure:false = re-runs on any change
export class FilterByPipe implements PipeTransform {
    transform<T>(items: T[], key: keyof T, value: any): T[] {
        if (!items || !key || value === undefined) return items;
        return items.filter(item => item[key] === value);
    }
}

// Usage:
// {{ longText | truncate:50 }}
// {{ user.createdAt | timeAgo }}
// {{ users | filterBy:"role":"admin" }}
```

---

## Summary

- Reactive forms define structure in TypeScript — easy to test, validate, and control programmatically.
- Always show errors only after the user has touched the field (`control.touched`).
- `FormArray` handles dynamic lists — add/remove with `push()`/`removeAt()`.
- Use `form.getRawValue()` to include disabled fields; `form.value` excludes them.
- `HttpClient` returns Observables — use `firstValueFrom()` to convert to a Promise.
- Interceptors are the right place to add auth headers, handle 401 refresh, and log requests.
- `async` pipe subscribes and unsubscribes automatically — prefer it over manual subscriptions in templates.
- Custom pipes must implement `transform(value, ...args)` — pure by default (only re-runs when input changes).
