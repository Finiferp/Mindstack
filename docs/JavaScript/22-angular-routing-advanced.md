---
title: "Angular Routing — Advanced"
sidebar_label: "Angular Routing"
sidebar_position: 22
---

# Angular Routing — Advanced

Routing in Angular is more than navigating between pages. It handles lazy loading, guards, resolvers, nested routes, title strategies, and query parameter management.

---

## Route Configuration — Full Reference

```typescript
// src/app/app.routes.ts
import { Routes, Route } from "@angular/router";

export const routes: Routes = [
    // Redirect
    { path: "",       redirectTo: "home", pathMatch: "full" },
    { path: "**",     redirectTo: "not-found" },          // catch-all

    // Static route
    {
        path:      "home",
        component: HomeComponent,
        title:     "Home — MyApp",           // static title
        data:      { animation: "HomePage" } // arbitrary data
    },

    // Route with parameters
    {
        path:      "users/:id",
        component: UserDetailComponent,
        title:     (route) => `User ${route.paramMap.get("id")}`, // dynamic title
        data:      { breadcrumb: "User Detail" }
    },

    // Optional parameters (use query params for optional)
    {
        path:  "search",
        // /search?q=alice&page=2
        component: SearchComponent
    },

    // Lazy loaded feature route
    {
        path:          "admin",
        loadChildren:  () => import("./features/admin/admin.routes")
                           .then(m => m.adminRoutes),
        canMatch:      [authGuard, adminGuard],     // canMatch runs before loading
        title:         "Admin"
    },

    // Lazy loaded component (without routes file)
    {
        path:          "settings",
        loadComponent: () => import("./features/settings/settings.component")
                           .then(m => m.SettingsComponent),
        canActivate:   [authGuard]
    },

    // Nested / child routes
    {
        path:      "dashboard",
        component: DashboardLayoutComponent,
        children:  [
            { path: "",         redirectTo: "overview", pathMatch: "full" },
            { path: "overview", component: DashboardOverviewComponent },
            { path: "stats",    component: DashboardStatsComponent },
            { path: "reports",  component: DashboardReportsComponent }
        ]
    },

    // Multiple named router outlets
    {
        path:       "compose",
        component:  UserListComponent,
        outlet:     "panel"     // <router-outlet name="panel">
    },

    // Route with resolve (pre-fetch data)
    {
        path:      "users/:id",
        component: UserDetailComponent,
        resolve:   { user: userResolver }
    },

    // Route with all guards
    {
        path:       "protected",
        component:  ProtectedComponent,
        canActivate:       [authGuard],        // can navigate to this route?
        canActivateChild:  [authGuard],        // can navigate to child routes?
        canDeactivate:     [unsavedChangesGuard],  // can leave this route?
        canMatch:          [featureFlagGuard], // should this route even be considered?
        resolve:           { data: dataResolver }
    }
];
```

---

## Route Guards — All Types

### canActivate

```typescript
// src/app/guards/auth.guard.ts
import { inject }        from "@angular/core";
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthService }   from "../core/services/auth.service";

export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn()) return true;

    // Save the attempted URL for redirecting after login
    return router.createUrlTree(["/login"], {
        queryParams: { returnUrl: state.url }
    });
};

export const adminGuard: CanActivateFn = () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    if (auth.isAdmin()) return true;
    return router.createUrlTree(["/forbidden"]);
};

// Guard that checks roles from route data
export const roleGuard: CanActivateFn = (route) => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const requiredRoles = route.data["roles"] as string[];

    if (!requiredRoles || auth.hasAnyRole(requiredRoles)) return true;
    return router.createUrlTree(["/forbidden"]);
};
```

### canDeactivate

```typescript
// src/app/guards/unsaved-changes.guard.ts
import { CanDeactivateFn } from "@angular/router";

export interface CanComponentDeactivate {
    canDeactivate(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
    return component.canDeactivate?.() ?? true;
};

// Component implements the interface
@Component({ ... })
export class EditUserComponent implements CanComponentDeactivate {
    hasUnsavedChanges = signal(false);

    canDeactivate(): boolean {
        if (!this.hasUnsavedChanges()) return true;
        return window.confirm("You have unsaved changes. Are you sure you want to leave?");
    }
}
```

### canMatch

```typescript
// Runs BEFORE the route is matched and loaded — lighter than canActivate
export const featureFlagGuard: CanMatchFn = (route) => {
    const featureFlags = inject(FeatureFlagService);
    const flag = route.data?.["featureFlag"] as string;
    return !flag || featureFlags.isEnabled(flag);
};
```

### Resolvers — Pre-fetch Data

```typescript
// src/app/resolvers/user.resolver.ts
import { inject }            from "@angular/core";
import { ResolveFn, Router } from "@angular/router";
import { UserService }       from "../core/services/user.service";

export const userResolver: ResolveFn<User> = async (route) => {
    const userService = inject(UserService);
    const router      = inject(Router);
    const id          = parseInt(route.paramMap.get("id")!, 10);

    try {
        return await userService.getById(id);
    } catch {
        router.navigate(["/not-found"]);
        return null!;
    }
};

// Use in component
@Component({ ... })
export class UserDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    user          = signal<User | null>(null);

    ngOnInit() {
        // Data is already loaded — no loading state needed
        this.user.set(this.route.snapshot.data["user"]);

        // Or subscribe for changes
        this.route.data.subscribe(data => this.user.set(data["user"]));
    }
}
```

---

## ActivatedRoute — Reading Route Info

```typescript
import { ActivatedRoute, ParamMap } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

@Component({ ... })
export class UserDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);

    // Snapshot — current values, doesn't update if route changes
    id       = parseInt(this.route.snapshot.paramMap.get("id")!, 10);
    section  = this.route.snapshot.queryParamMap.get("section");
    userData = this.route.snapshot.data["user"] as User;

    // Observable — updates when route changes (e.g. /users/1 → /users/2)
    id$      = this.route.paramMap.pipe(map(p => parseInt(p.get("id")!, 10)));
    section$ = this.route.queryParamMap.pipe(map(p => p.get("section")));

    // Signal versions (Angular 16+)
    idSignal = toSignal(this.id$);

    // All route info
    this.route.params                // Observable<Params>: { id: "42" }
    this.route.queryParams           // Observable<Params>: { page: "1" }
    this.route.fragment              // Observable<string | null>: "section-1"
    this.route.data                  // Observable<Data>: resolved data
    this.route.url                   // Observable<UrlSegment[]>
    this.route.parent?.paramMap      // parent route's params
    this.route.children              // child routes

    // Snapshot versions
    this.route.snapshot.params
    this.route.snapshot.queryParams
    this.route.snapshot.fragment
    this.route.snapshot.data
    this.route.snapshot.url
    this.route.snapshot.routeConfig?.path
}
```

---

## Router Navigation

```typescript
import { Router, NavigationExtras } from "@angular/router";

@Component({ ... })
export class MyComponent {
    private router = inject(Router);

    navigate() {
        // Basic
        this.router.navigate(["/users"]);
        this.router.navigate(["/users", userId]);
        this.router.navigate(["/users", userId, "posts", postId]);

        // With query params
        this.router.navigate(["/users"], { queryParams: { page: 2, sort: "name" } });

        // Preserve existing query params and add/overwrite
        this.router.navigate(["/users"], {
            queryParams: { page: 2 },
            queryParamsHandling: "merge"   // "merge" | "preserve" | ""
        });

        // With fragment (hash)
        this.router.navigate(["/docs"], { fragment: "installation" });

        // Replace URL (no back button entry)
        this.router.navigate(["/login"], { replaceUrl: true });

        // Skip location change (URL stays the same, component changes)
        this.router.navigate(["/modal"], { skipLocationChange: true });

        // Relative navigation (from current route)
        this.router.navigate(["../sibling"], { relativeTo: this.route });
        this.router.navigate(["./child"],    { relativeTo: this.route });
        this.router.navigate(["../../parent"],{relativeTo: this.route });

        // navigateByUrl — absolute URL string
        this.router.navigateByUrl("/users/42?tab=posts#bio");

        // Return URL from query param after login
        const returnUrl = this.route.snapshot.queryParamMap.get("returnUrl") || "/dashboard";
        this.router.navigateByUrl(returnUrl);
    }
}
```

---

## RouterLink — Template Navigation

```html
<!-- Basic -->
<a routerLink="/users">Users</a>
<a routerLink="/users/42">User 42</a>
<a [routerLink]="['/users', userId]">User</a>
<a [routerLink]="['/users', userId, 'posts']">Posts</a>

<!-- Query params -->
<a [routerLink]="['/users']" [queryParams]="{ page: 2, sort: 'name' }">Page 2</a>
<a [routerLink]="['/users']"
   [queryParams]="{ filter: 'active' }"
   queryParamsHandling="merge">Filter</a>

<!-- Fragment -->
<a [routerLink]="['/about']" fragment="team">Team</a>

<!-- Replace URL -->
<a [routerLink]="['/login']" replaceUrl>Login</a>

<!-- Relative -->
<a [routerLink]="['../sibling']" [relativeTo]="route">Sibling</a>

<!-- Active class -->
<a routerLink="/users" routerLinkActive="active">Users</a>
<a routerLink="/users" routerLinkActive="active" ariaCurrentWhenActive="page">Users</a>

<!-- Exact active (only when exact match, not on child routes) -->
<a routerLink="/users" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
    Users
</a>

<!-- routerLinkActive on parent element -->
<li routerLinkActive="active">
    <a routerLink="/users">Users</a>
</li>

<!-- Named outlet navigation -->
<a [routerLink]="[{ outlets: { panel: ['compose'] } }]">Open Panel</a>
<a [routerLink]="[{ outlets: { panel: null } }]">Close Panel</a>
```

---

## Router Events

```typescript
import {
    NavigationStart, NavigationEnd, NavigationCancel, NavigationError,
    RoutesRecognized, GuardsCheckStart, GuardsCheckEnd,
    ResolveStart, ResolveEnd, ChildActivationStart, ChildActivationEnd,
    ActivationStart, ActivationEnd, Scroll
} from "@angular/router";

@Component({ ... })
export class AppComponent implements OnInit {
    private router = inject(Router);

    ngOnInit() {
        this.router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                this.isLoading = true;
                console.log("Navigation started:", event.url);
            }
            if (event instanceof NavigationEnd) {
                this.isLoading = false;
                console.log("Navigation ended:", event.urlAfterRedirects);
            }
            if (event instanceof NavigationCancel) {
                this.isLoading = false;
                console.log("Navigation cancelled:", event.reason);
            }
            if (event instanceof NavigationError) {
                this.isLoading = false;
                console.error("Navigation error:", event.error);
            }
        });
    }
}

// Loading indicator using router events
@Component({
    selector: "app-root",
    template: `
        <div class="loading-bar" [class.visible]="isLoading()"></div>
        <router-outlet />
    `
})
export class AppComponent {
    private router = inject(Router);
    isLoading = toSignal(
        this.router.events.pipe(
            map(e => e instanceof NavigationStart),
            startWith(false)
        ),
        { initialValue: false }
    );
}
```

---

## Lazy Loading and Code Splitting

```typescript
// Route-level lazy loading (automatic code splitting)
{
    path: "admin",
    loadChildren: () => import("./admin/admin.routes").then(m => m.adminRoutes)
}

// Component-level lazy loading
{
    path: "settings",
    loadComponent: () => import("./settings/settings.component")
        .then(m => m.SettingsComponent)
}

// Preloading strategies
import { PreloadAllModules, QuicklinkStrategy } from "@angular/router";

provideRouter(routes, withPreloading(PreloadAllModules))   // preload all lazy routes
provideRouter(routes, withPreloading(NoPreloading))         // no preloading (default)

// Custom preloading strategy — preload only routes with data.preload = true
@Injectable({ providedIn: "root" })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
    preload(route: Route, fn: () => Observable<any>): Observable<any> {
        return route.data?.["preload"] ? fn() : of(null);
    }
}
provideRouter(routes, withPreloading(SelectivePreloadingStrategy))

// In routes:
{ path: "frequently-used", loadChildren: ..., data: { preload: true } }
```

---

## Query Parameters — Full Management

```typescript
// Reading query params reactively
@Component({ ... })
export class SearchComponent {
    private route  = inject(ActivatedRoute);
    private router = inject(Router);

    // As signal
    queryParams = toSignal(this.route.queryParamMap.pipe(
        map(params => ({
            q:     params.get("q") ?? "",
            page:  parseInt(params.get("page") ?? "0", 10),
            limit: parseInt(params.get("limit") ?? "20", 10),
            sort:  params.get("sort") ?? "name",
            order: params.get("order") ?? "asc",
            role:  params.get("role") ?? undefined
        }))
    ), { initialValue: { q: "", page: 0, limit: 20, sort: "name", order: "asc", role: undefined } });

    // Update query params without full navigation
    updateFilter(key: string, value: any) {
        this.router.navigate([], {
            relativeTo:         this.route,
            queryParams:        { [key]: value, page: 0 },  // reset to page 0
            queryParamsHandling: "merge"
        });
    }

    goToPage(page: number) {
        this.router.navigate([], {
            relativeTo:         this.route,
            queryParams:        { page },
            queryParamsHandling: "merge"
        });
    }

    clearFilters() {
        this.router.navigate([], {
            relativeTo:  this.route,
            queryParams: { q: null, role: null, page: null }, // null removes the param
            queryParamsHandling: "merge"
        });
    }
}
```

---

## Title Strategy

```typescript
// Custom title strategy
import { Injectable } from "@angular/core";
import { Title }      from "@angular/platform-browser";
import { TitleStrategy, RouterStateSnapshot } from "@angular/router";

@Injectable({ providedIn: "root" })
export class AppTitleStrategy extends TitleStrategy {
    constructor(private title: Title) { super(); }

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const pageTitle = this.buildTitle(snapshot);
        this.title.setTitle(pageTitle ? `${pageTitle} | MyApp` : "MyApp");
    }
}

// Register in app.config.ts
{ provide: TitleStrategy, useClass: AppTitleStrategy }
```

---

## Summary

- Use `loadChildren` for feature routes with multiple components; `loadComponent` for standalone lazy-loaded pages.
- `canActivate` runs after route is matched; `canMatch` runs before — prefer `canMatch` for conditional routes.
- `resolve` pre-fetches data so the component always receives it immediately on init.
- Use `queryParamsHandling: "merge"` when updating a single filter — preserves all other query params.
- `routerLinkActive` adds a class when the route is active — use `[routerLinkActiveOptions]="{ exact: true }"` for the exact URL only.
- `this.router.navigate([], { relativeTo: this.route, queryParams: {...}, queryParamsHandling: "merge" })` is the pattern for updating query params without navigation.
- Set `null` as a query param value to remove it from the URL.
