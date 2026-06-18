---
title: "Vue Router, Pinia & Composables"
sidebar_label: "Router, Pinia & Composables"
sidebar_position: 16
---

# Vue Router, Pinia & Composables

Vue Router handles navigation between pages. Pinia is the official state management store. Composables are reusable reactive logic — the Vue equivalent of React hooks.

---

## Vue Router — Complete Reference

```bash
npm install vue-router
```

### Setup

```typescript
// src/router/index.ts
import {
    createRouter, createWebHistory, createWebHashHistory,
    createMemoryHistory, RouteRecordRaw, RouterView
} from "vue-router";
import { useAuthStore } from "@/stores/auth";

// Declare meta types for TypeScript
declare module "vue-router" {
    interface RouteMeta {
        requiresAuth?:  boolean;
        requiresGuest?: boolean;
        roles?:         string[];
        title?:         string;
        keepAlive?:     boolean;
    }
}

const routes: RouteRecordRaw[] = [
    // Redirect
    { path: "/", redirect: "/home" },

    // Basic routes (lazy-loaded — code split automatically)
    { path: "/home",  component: () => import("@/views/HomeView.vue"),  meta: { title: "Home" } },
    { path: "/about", component: () => import("@/views/AboutView.vue"), meta: { title: "About" } },

    // Auth routes
    {
        path: "/login",
        component: () => import("@/views/LoginView.vue"),
        meta: { requiresGuest: true, title: "Login" }
    },

    // Protected routes
    {
        path: "/dashboard",
        component: () => import("@/views/DashboardView.vue"),
        meta: { requiresAuth: true, title: "Dashboard" }
    },

    // Route with params
    {
        path: "/users/:id",
        name: "UserDetail",
        component: () => import("@/views/UserDetailView.vue"),
        meta: { requiresAuth: true },
        props: true    // pass :id as component prop
    },

    // Nested routes (layouts)
    {
        path: "/admin",
        component: () => import("@/layouts/AdminLayout.vue"),
        meta: { requiresAuth: true, roles: ["admin"] },
        children: [
            { path: "",          redirect: "users" },
            { path: "users",     component: () => import("@/views/admin/AdminUsersView.vue") },
            { path: "users/:id", component: () => import("@/views/admin/AdminUserDetailView.vue"), props: true },
            { path: "settings",  component: () => import("@/views/admin/AdminSettingsView.vue") },
            { path: "reports",   component: () => import("@/views/admin/AdminReportsView.vue") }
        ]
    },

    // Named views — multiple router-view in one layout
    {
        path: "/profile",
        components: {
            default: () => import("@/views/ProfileView.vue"),
            sidebar: () => import("@/views/ProfileSidebar.vue")
        }
    },

    // Dynamic segment with regex constraint
    { path: "/users/:id(\\d+)", component: () => import("@/views/UserView.vue") },
    { path: "/files/:path(.*)*",  component: () => import("@/views/FileView.vue") },  // catch-all param

    // Catch-all 404
    { path: "/:pathMatch(.*)*", name: "NotFound", component: () => import("@/views/NotFoundView.vue") }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    // history: createWebHashHistory()   // /#/path — for static hosting
    // history: createMemoryHistory()    // for SSR
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition;   // browser back/forward
        if (to.hash) return { el: to.hash, behavior: "smooth" };
        return { top: 0, behavior: "smooth" };
    },
    linkActiveClass:      "router-link-active",
    linkExactActiveClass: "router-link-exact-active"
});

// ── Navigation Guards ──────────────────────────────────────────────────────

// Global before guard — runs before every navigation
router.beforeEach(async (to, from) => {
    const auth = useAuthStore();

    // Set page title
    document.title = to.meta.title ? `${to.meta.title} | MyApp` : "MyApp";

    // Redirect logged-in users away from login/register
    if (to.meta.requiresGuest && auth.isLoggedIn) {
        return { path: "/dashboard" };
    }

    // Auth required
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
        return {
            path: "/login",
            query: { redirect: to.fullPath }
        };
    }

    // Role required
    if (to.meta.roles?.length && !to.meta.roles.includes(auth.user?.role ?? "")) {
        return { path: "/forbidden" };
    }

    // Allow navigation
    return true;
    // or: return undefined (same)
    // return false — cancels navigation
    // return "/other-path" — redirects
    // return { name: "Login" } — named route redirect
});

// Global after guard — runs after navigation completes (no abort possible)
router.afterEach((to, from, failure) => {
    if (!failure) {
        analytics.trackPageView(to.fullPath);
    }
});

// Global resolve guard — runs after all in-component guards resolved
router.beforeResolve(async (to) => {
    if (to.meta.requiresData) {
        await loadRequiredData(to);
    }
});

export default router;
```

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";

createApp(App)
    .use(createPinia())
    .use(router)
    .mount("#app");
```

### Router in Templates

```html
<!-- RouterLink — declarative navigation -->
<RouterLink to="/home">Home</RouterLink>
<RouterLink to="/users/42">User 42</RouterLink>

<!-- Named route -->
<RouterLink :to="{ name: 'UserDetail', params: { id: 42 } }">User</RouterLink>

<!-- With query params -->
<RouterLink :to="{ path: '/search', query: { q: 'vue', page: 1 } }">Search</RouterLink>

<!-- With hash -->
<RouterLink :to="{ path: '/about', hash: '#team' }">Team</RouterLink>

<!-- Replace (no history entry) -->
<RouterLink :to="{ path: '/login' }" replace>Login</RouterLink>

<!-- Active class customization -->
<RouterLink to="/users" active-class="my-active" exact-active-class="my-exact">Users</RouterLink>

<!-- RouterView — where routed components render -->
<RouterView />

<!-- Named router-view -->
<RouterView name="sidebar" />

<!-- Transition on route changes -->
<RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
        <component :is="Component" :key="$route.path" />
    </Transition>
</RouterView>

<!-- KeepAlive — cache component state -->
<RouterView v-slot="{ Component }">
    <KeepAlive :include="cachedRoutes">
        <component :is="Component" />
    </KeepAlive>
</RouterView>
```

### Router in Script

```typescript
import { useRouter, useRoute, onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";

const router = useRouter();
const route  = useRoute();

// ── Current route info ─────────────────────────────────────────────────────
route.path                   // "/users/42"
route.fullPath               // "/users/42?tab=posts#section"
route.name                   // "UserDetail"
route.params                 // { id: "42" } — always strings
route.query                  // { tab: "posts" }
route.hash                   // "#section"
route.meta                   // { requiresAuth: true, ... }
route.matched                // array of matched route records
route.redirectedFrom         // if redirected, the original route

// ── Navigate programmatically ──────────────────────────────────────────────
router.push("/users")
router.push({ path: "/users" })
router.push({ name: "UserDetail", params: { id: 42 } })
router.push({ query: { page: 2, sort: "name" } })
router.push({ hash: "#section" })
router.push({ path: "/login", query: { redirect: route.fullPath } })

router.replace("/login")     // no back button entry
router.go(-1)                // go back
router.go(1)                 // go forward
router.back()                // go back
router.forward()             // go forward

// navigate returns a Promise
router.push("/users").then(() => console.log("Navigated!"))

// ── In-component route guards ──────────────────────────────────────────────
// Runs before leaving this component's route
onBeforeRouteLeave((to, from) => {
    if (hasUnsavedChanges.value) {
        const confirm = window.confirm("You have unsaved changes. Leave anyway?");
        if (!confirm) return false;  // cancel navigation
    }
});

// Runs when same route but different params (e.g. /users/1 → /users/2)
onBeforeRouteUpdate(async (to, from) => {
    await loadUser(parseInt(to.params.id as string));
});

// ── Route params as props ──────────────────────────────────────────────────
// With props: true in route config, params are passed as component props:
const props = defineProps<{ id: string }>();
// instead of: const route = useRoute(); route.params.id

// ── Typed routes (Vue Router 4.4+) ────────────────────────────────────────
import type { RouteLocationRaw } from "vue-router";
const userRoute: RouteLocationRaw = { name: "UserDetail", params: { id: 42 } };
```

---

## Pinia — Complete Reference

```bash
npm install pinia
```

### Setup Store (Recommended)

```typescript
// src/stores/users.ts
import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import type { User, CreateUserDto, UpdateUserDto, UserFilters } from "@/types";
import { userApi } from "@/services/userApi";

export const useUsersStore = defineStore("users", () => {

    // ── State ──────────────────────────────────────────────────────────────
    const users       = ref<User[]>([]);
    const currentUser = ref<User | null>(null);
    const isLoading   = ref(false);
    const error       = ref<string | null>(null);
    const pagination  = reactive({
        page:       0,
        limit:      20,
        total:      0,
        totalPages: 0
    });

    // ── Getters ────────────────────────────────────────────────────────────
    const activeUsers   = computed(() => users.value.filter(u => u.active));
    const adminUsers    = computed(() => users.value.filter(u => u.role === "ADMIN"));
    const userCount     = computed(() => users.value.length);
    const hasNextPage   = computed(() => pagination.page < pagination.totalPages - 1);
    const hasPrevPage   = computed(() => pagination.page > 0);
    const getUserById   = computed(() => (id: number) => users.value.find(u => u.id === id));

    // ── Actions ────────────────────────────────────────────────────────────
    async function fetchUsers(filters: UserFilters = {}) {
        isLoading.value = true;
        error.value     = null;
        try {
            const response = await userApi.getAll({
                page:   pagination.page,
                limit:  pagination.limit,
                ...filters
            });
            users.value           = response.data;
            pagination.total      = response.total;
            pagination.totalPages = response.totalPages;
        } catch (err: any) {
            error.value = err.response?.data?.message ?? "Failed to load users";
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchUserById(id: number) {
        // Check cache first
        const cached = users.value.find(u => u.id === id);
        if (cached) { currentUser.value = cached; return cached; }

        isLoading.value = true;
        try {
            const user = await userApi.getById(id);
            currentUser.value = user;
            return user;
        } finally {
            isLoading.value = false;
        }
    }

    async function createUser(data: CreateUserDto) {
        const user = await userApi.create(data);
        users.value = [user, ...users.value];
        pagination.total++;
        return user;
    }

    async function updateUser(id: number, data: UpdateUserDto) {
        const updated = await userApi.update(id, data);
        users.value   = users.value.map(u => u.id === id ? updated : u);
        if (currentUser.value?.id === id) currentUser.value = updated;
        return updated;
    }

    async function deleteUser(id: number) {
        await userApi.delete(id);
        users.value = users.value.filter(u => u.id !== id);
        if (currentUser.value?.id === id) currentUser.value = null;
        pagination.total--;
    }

    function setPage(page: number) {
        pagination.page = page;
        fetchUsers();
    }

    function clearError() { error.value = null; }
    function clearCurrentUser() { currentUser.value = null; }

    function $reset() {
        users.value       = [];
        currentUser.value = null;
        isLoading.value   = false;
        error.value       = null;
        pagination.page   = 0;
        pagination.total  = 0;
    }

    return {
        // State
        users, currentUser, isLoading, error, pagination,
        // Getters
        activeUsers, adminUsers, userCount, hasNextPage, hasPrevPage, getUserById,
        // Actions
        fetchUsers, fetchUserById, createUser, updateUser, deleteUser,
        setPage, clearError, clearCurrentUser, $reset
    };
});

// TypeScript: infer types
export type UsersStore = ReturnType<typeof useUsersStore>;
```

### Option Store (Alternative Style)

```typescript
// src/stores/counter.ts
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", {
    // State — function that returns initial state
    state: () => ({
        count:    0,
        name:     "Alice",
        history:  [] as number[]
    }),

    // Getters — computed properties
    getters: {
        doubleCount: (state) => state.count * 2,
        tripleCount(): number { return this.count * 3 },  // use this for other getters
        countHistory: (state) => state.history.join(", ")
    },

    // Actions — methods that can modify state and be async
    actions: {
        increment() {
            this.history.push(this.count);
            this.count++;
        },
        decrement() {
            this.history.push(this.count);
            this.count--;
        },
        reset() {
            this.count = 0;
            this.history = [];
        },
        async incrementAsync() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.count++;
        }
    }
});
```

### Using Stores in Components

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useUsersStore } from "@/stores/users";

const store = useUsersStore();

// storeToRefs — destructure state/getters while keeping reactivity
// DON'T use storeToRefs for actions (they're plain functions, no reactivity needed)
const {
    users,
    isLoading,
    error,
    activeUsers,
    userCount,
    pagination,
    hasNextPage
} = storeToRefs(store);

// Actions — destructure directly (no storeToRefs needed)
const {
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    setPage
} = store;

onMounted(() => fetchUsers());

// Direct store access (alternative to destructuring)
store.users;           // reactive
store.fetchUsers();    // action
store.activeUsers;     // getter
store.isLoading;       // state
</script>

<template>
    <div>
        @if (isLoading) { <p>Loading...</p> }
        @if (error) { <p class="error">{{ error }}</p> }

        <p>{{ userCount }} users total</p>

        <ul>
            <li v-for="user in activeUsers" :key="user.id">
                {{ user.name }} — {{ user.email }}
                <button @click="deleteUser(user.id)">Delete</button>
            </li>
        </ul>

        <div class="pagination">
            <button :disabled="!pagination.page" @click="setPage(pagination.page - 1)">Prev</button>
            <span>{{ pagination.page + 1 }} / {{ pagination.totalPages }}</span>
            <button :disabled="!hasNextPage" @click="setPage(pagination.page + 1)">Next</button>
        </div>
    </div>
</template>
```

### Store Composition — Stores Using Other Stores

```typescript
// src/stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useUsersStore } from "./users";
import { useRouter } from "vue-router";

export const useAuthStore = defineStore("auth", () => {
    const router     = useRouter();
    const usersStore = useUsersStore();   // use another store

    const user  = ref<User | null>(JSON.parse(localStorage.getItem("user") || "null"));
    const token = ref<string | null>(localStorage.getItem("token"));

    const isLoggedIn = computed(() => !!token.value);
    const isAdmin    = computed(() => user.value?.role === "ADMIN");
    const isMod      = computed(() => user.value?.role === "MODERATOR");
    const isAdminOrMod = computed(() => isAdmin.value || isMod.value);

    function accessToken() { return token.value; }

    async function login(email: string, password: string) {
        const response = await fetch("/api/auth/login", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message ?? "Login failed");
        }

        const data = await response.json();
        user.value  = data.user;
        token.value = data.accessToken;

        localStorage.setItem("user",  JSON.stringify(data.user));
        localStorage.setItem("token", data.accessToken);

        const redirect = router.currentRoute.value.query.redirect as string;
        router.push(redirect || "/dashboard");
    }

    function logout() {
        user.value  = null;
        token.value = null;
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        usersStore.$reset();   // clear users store too
        router.push("/login");
    }

    return { user, token, isLoggedIn, isAdmin, isMod, isAdminOrMod, login, logout, accessToken };
});
```

### Pinia Plugins

```typescript
// Persist state to localStorage automatically
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// In store — add persist option
export const useAuthStore = defineStore("auth", () => { ... }, {
    persist: true                         // persist entire store
});

export const useCartStore = defineStore("cart", () => { ... }, {
    persist: {
        storage: sessionStorage,          // use sessionStorage
        paths:   ["items", "coupon"],     // only persist these
        key:     "my-cart"               // custom storage key
    }
});

// Custom Pinia plugin
function myPlugin(context: PiniaPluginContext) {
    // Add property to all stores
    context.store.$onAction(({ name, store, args, after, onError }) => {
        const start = Date.now();
        after(() => {
            console.log(`Action ${name} took ${Date.now() - start}ms`);
        });
        onError(error => {
            console.error(`Action ${name} failed:`, error);
        });
    });
}
pinia.use(myPlugin);
```

---

## Composables — Complete Patterns

Composables encapsulate and reuse stateful logic. They must be called in `setup()` or `<script setup>`.

### useFetch — Data Fetching

```typescript
// src/composables/useFetch.ts
import { ref, shallowRef, watchEffect, toValue, MaybeRefOrGetter } from "vue";

export interface UseFetchOptions {
    immediate?: boolean;      // fetch on mount (default: true)
    refetch?:   boolean;      // re-fetch when url changes (default: true)
}

export function useFetch<T>(
    url: MaybeRefOrGetter<string>,
    options: UseFetchOptions = {}
) {
    const data      = shallowRef<T | null>(null);
    const error     = ref<Error | null>(null);
    const isLoading = ref(false);
    const isFetched = ref(false);

    const controller = ref<AbortController | null>(null);

    async function execute() {
        // Cancel any in-flight request
        controller.value?.abort();
        controller.value = new AbortController();

        isLoading.value = true;
        error.value     = null;

        try {
            const resolvedUrl = toValue(url);
            const res = await fetch(resolvedUrl, { signal: controller.value.signal });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            data.value = await res.json();
            isFetched.value = true;
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                error.value = err as Error;
            }
        } finally {
            isLoading.value = false;
        }
    }

    function refresh() { return execute(); }

    if (options.immediate !== false) {
        if (options.refetch !== false) {
            watchEffect(execute);   // re-fetch when url changes
        } else {
            execute();
        }
    }

    return { data, error, isLoading, isFetched, execute, refresh };
}

// Usage
const { data: users, isLoading, error, refresh } = useFetch<User[]>("/api/users");

// With reactive URL — re-fetches when userId changes
const userId = ref(1);
const { data: user } = useFetch<User>(() => `/api/users/${userId.value}`);
```

### useLocalStorage — Persisted State

```typescript
// src/composables/useLocalStorage.ts
import { ref, watch, Ref } from "vue";

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
    const stored = localStorage.getItem(key);
    const initial: T = stored ? JSON.parse(stored) : defaultValue;
    const data = ref<T>(initial) as Ref<T>;

    watch(data, (newVal) => {
        if (newVal === null || newVal === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(newVal));
        }
    }, { deep: true });

    // Listen for changes in other tabs
    window.addEventListener("storage", (e) => {
        if (e.key === key && e.newValue) {
            data.value = JSON.parse(e.newValue);
        }
    });

    return data;
}

// Usage
const theme    = useLocalStorage("theme", "light");
const language = useLocalStorage("lang",  "en");
theme.value = "dark";   // auto-saved
```

### useDebounce

```typescript
// src/composables/useDebounce.ts
import { ref, watch, Ref } from "vue";

export function useDebounce<T>(source: Ref<T>, delay = 300): Ref<T> {
    const debounced = ref<T>(source.value) as Ref<T>;
    let timer: ReturnType<typeof setTimeout>;

    watch(source, (val) => {
        clearTimeout(timer);
        timer = setTimeout(() => { debounced.value = val; }, delay);
    });

    return debounced;
}

export function useDebouncedFn<T extends (...args: any[]) => any>(fn: T, delay = 300) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Usage
const searchInput   = ref("");
const debouncedSearch = useDebounce(searchInput, 400);

watchEffect(async () => {
    if (debouncedSearch.value.length >= 2) {
        results.value = await searchUsers(debouncedSearch.value);
    }
});
```

### useWindowSize

```typescript
// src/composables/useWindowSize.ts
import { ref, readonly, onMounted, onUnmounted, computed } from "vue";

export function useWindowSize() {
    const width   = ref(window.innerWidth);
    const height  = ref(window.innerHeight);

    const isMobile  = computed(() => width.value < 640);
    const isTablet  = computed(() => width.value >= 640 && width.value < 1024);
    const isDesktop = computed(() => width.value >= 1024);

    function update() {
        width.value  = window.innerWidth;
        height.value = window.innerHeight;
    }

    onMounted(() => window.addEventListener("resize", update, { passive: true }));
    onUnmounted(() => window.removeEventListener("resize", update));

    return {
        width:     readonly(width),
        height:    readonly(height),
        isMobile,
        isTablet,
        isDesktop
    };
}
```

### usePagination

```typescript
// src/composables/usePagination.ts
import { ref, computed, Ref } from "vue";

export function usePagination(total: Ref<number>, pageSize = 20) {
    const currentPage = ref(0);

    const totalPages  = computed(() => Math.ceil(total.value / pageSize));
    const hasNext     = computed(() => currentPage.value < totalPages.value - 1);
    const hasPrev     = computed(() => currentPage.value > 0);
    const offset      = computed(() => currentPage.value * pageSize);

    function next()  { if (hasNext.value) currentPage.value++; }
    function prev()  { if (hasPrev.value) currentPage.value--; }
    function goTo(p: number) { currentPage.value = Math.max(0, Math.min(p, totalPages.value - 1)); }
    function reset() { currentPage.value = 0; }

    return { currentPage, totalPages, hasNext, hasPrev, offset, next, prev, goTo, reset };
}
```

### useClipboard

```typescript
import { ref } from "vue";

export function useClipboard() {
    const copied  = ref(false);
    const error   = ref<Error | null>(null);
    let timer: ReturnType<typeof setTimeout>;

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            copied.value = true;
            clearTimeout(timer);
            timer = setTimeout(() => copied.value = false, 2000);
        } catch (err) {
            error.value = err as Error;
        }
    }

    async function paste(): Promise<string> {
        return navigator.clipboard.readText();
    }

    return { copy, paste, copied, error };
}
```

### useEventListener

```typescript
import { onMounted, onUnmounted, Ref, isRef } from "vue";

export function useEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | Ref<HTMLElement | null>,
    event:  K,
    handler: (e: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
) {
    onMounted(() => {
        const el = isRef(target) ? target.value : target;
        el?.addEventListener(event, handler as EventListener, options);
    });

    onUnmounted(() => {
        const el = isRef(target) ? target.value : target;
        el?.removeEventListener(event, handler as EventListener, options);
    });
}

// Usage
useEventListener(window, "resize", () => { width.value = window.innerWidth; });
useEventListener(buttonRef, "click", handleClick);
```

### useIntersectionObserver

```typescript
import { ref, Ref, onUnmounted } from "vue";

export function useIntersectionObserver(
    target: Ref<Element | null>,
    options: IntersectionObserverInit = {}
) {
    const isVisible = ref(false);
    const entry     = ref<IntersectionObserverEntry | null>(null);

    const observer = new IntersectionObserver(([e]) => {
        isVisible.value = e.isIntersecting;
        entry.value     = e;
    }, { threshold: 0, ...options });

    const stop = () => observer.disconnect();

    const start = () => {
        if (target.value) observer.observe(target.value);
    };

    onMounted(start);
    onUnmounted(stop);

    return { isVisible, entry, stop };
}

// Usage — infinite scroll, lazy images
const sentinel = ref<HTMLDivElement | null>(null);
const { isVisible } = useIntersectionObserver(sentinel);
watch(isVisible, (visible) => {
    if (visible) loadNextPage();
});
```

### useForm — Complete Form Management

```typescript
import { reactive, computed, ref } from "vue";
import { z } from "zod";

export function useForm<T extends Record<string, any>>(
    schema: z.ZodType<T>,
    initial: T
) {
    const values = reactive({ ...initial }) as T;
    const errors = reactive<Partial<Record<keyof T, string>>>({});
    const touched = reactive<Partial<Record<keyof T, boolean>>>({});
    const isSubmitting = ref(false);

    const isValid = computed(() =>
        schema.safeParse(values).success && Object.keys(errors).length === 0
    );

    function touch(field: keyof T) {
        touched[field] = true;
        validate(field);
    }

    function validate(field?: keyof T) {
        const result = schema.safeParse(values);
        if (result.success) {
            if (field) delete errors[field];
            else Object.keys(errors).forEach(k => delete errors[k as keyof T]);
            return true;
        }

        const fieldErrors = result.error.flatten().fieldErrors;
        if (field) {
            const fieldErrs = fieldErrors[field as string];
            if (fieldErrs?.length) errors[field] = fieldErrs[0];
            else delete errors[field];
        } else {
            Object.keys(values).forEach(k => {
                const errs = fieldErrors[k];
                if (errs?.length) errors[k as keyof T] = errs[0];
                else delete errors[k as keyof T];
            });
        }
        return false;
    }

    function validateAll() {
        Object.keys(values).forEach(k => {
            touched[k as keyof T] = true;
        });
        return validate();
    }

    function reset() {
        Object.assign(values, initial);
        Object.keys(errors).forEach(k => delete errors[k as keyof T]);
        Object.keys(touched).forEach(k => delete touched[k as keyof T]);
    }

    async function handleSubmit(onSubmit: (data: T) => Promise<void>) {
        if (!validateAll()) return;
        isSubmitting.value = true;
        try { await onSubmit({ ...values } as T); }
        finally { isSubmitting.value = false; }
    }

    return { values, errors, touched, isValid, isSubmitting, touch, validate, validateAll, reset, handleSubmit };
}

// Usage
const LoginSchema = z.object({
    email:    z.string().email(),
    password: z.string().min(8)
});

const { values, errors, touched, isSubmitting, touch, handleSubmit } = useForm(
    LoginSchema,
    { email: "", password: "" }
);
```

---

## HTTP with Axios — Full Setup

```bash
npm install axios
```

```typescript
// src/lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const api: AxiosInstance = axios.create({
    baseURL:         import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
    timeout:         10_000,
    headers:         { "Content-Type": "application/json" },
    withCredentials: true
});

// Request interceptor — add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const auth = useAuthStore();
        if (auth.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

function processQueue(error: any, token: string | null = null) {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
    failedQueue = [];
}

// Response interceptor — handle errors + token refresh
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
        const original = error.config;
        const auth     = useAuthStore();

        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }

            original._retry = true;
            isRefreshing     = true;

            try {
                const newToken = await auth.refreshToken();
                processQueue(null, newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError, null);
                auth.logout();
                router.push("/login");
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status === 403) router.push("/forbidden");
        if (error.response?.status === 404) router.push("/not-found");

        return Promise.reject(error);
    }
);

export default api;
```

---

## Summary

- Use named routes (`{ name: "UserDetail", params: { id: 42 } }`) — paths can change, names don't.
- `router.beforeEach` returns `true`/`undefined` (allow), `false` (cancel), or a route location (redirect).
- `storeToRefs()` keeps reactivity when destructuring state and getters — skip it for actions.
- Composables are functions starting with `use` that call Vue reactivity APIs — must be called in setup context.
- `watchEffect` auto-tracks dependencies; `watch` requires explicit sources but gives old/new values.
- Set up Axios interceptors once — they handle auth tokens and error redirects for every request automatically.
