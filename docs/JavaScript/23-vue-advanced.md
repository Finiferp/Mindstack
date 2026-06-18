---
title: "Vue — Advanced Patterns"
sidebar_label: "Vue Advanced"
sidebar_position: 23
---

# Vue — Advanced Patterns

This covers the patterns you encounter in real Vue 3 projects — transitions, teleport, provide/inject in depth, custom directives, plugins, server-side rendering considerations, and performance optimization.

---

## Transitions and Animations

Vue's `<Transition>` and `<TransitionGroup>` add CSS classes at specific lifecycle moments so you can animate entering and leaving elements.

```html
<!-- <Transition> — single element enter/leave -->
<Transition name="fade">
    <div v-if="isVisible">Content</div>
</Transition>
```

```css
/* Classes applied automatically by Vue */
.fade-enter-from   { opacity: 0; }            /* start state on enter */
.fade-enter-active { transition: opacity 0.3s ease; }  /* active during enter */
.fade-enter-to     { opacity: 1; }            /* end state on enter */

.fade-leave-from   { opacity: 1; }            /* start state on leave */
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-leave-to     { opacity: 0; }            /* end state on leave */
```

### Transition Modes

```html
<!-- mode="out-in" — old element leaves first, then new one enters -->
<!-- mode="in-out" — new element enters first, then old one leaves -->
<Transition name="slide" mode="out-in">
    <component :is="currentView" :key="currentView" />
</Transition>
```

### CSS Animations (with @keyframes)

```html
<Transition name="bounce">
    <div v-if="show">Bouncy content</div>
</Transition>
```

```css
.bounce-enter-active { animation: bounce-in 0.5s; }
.bounce-leave-active { animation: bounce-in 0.5s reverse; }

@keyframes bounce-in {
    0%   { transform: scale(0); }
    50%  { transform: scale(1.25); }
    100% { transform: scale(1); }
}
```

### JavaScript Hooks

```html
<Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @enter-cancelled="onEnterCancelled"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
    :css="false"          <!-- disable CSS classes — JS-only animation -->
>
    <div v-if="show">Content</div>
</Transition>
```

```typescript
import { gsap } from "gsap";  // example with GSAP animation library

function onEnter(el: Element, done: () => void) {
    gsap.from(el, {
        opacity: 0,
        y: -20,
        duration: 0.4,
        onComplete: done    // MUST call done when animation finishes
    });
}

function onLeave(el: Element, done: () => void) {
    gsap.to(el, {
        opacity: 0,
        y: 20,
        duration: 0.3,
        onComplete: done
    });
}
```

### TransitionGroup — List Animations

```html
<!-- AnimateGroup for lists — adds move transitions too -->
<TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">
        {{ item.text }}
    </li>
</TransitionGroup>
```

```css
.list-enter-from,
.list-leave-to  { opacity: 0; transform: translateX(-30px); }
.list-enter-active,
.list-leave-active { transition: all 0.3s ease; }

/* Move transition — for items that shift position when others are added/removed */
.list-move,
.list-leave-active { position: absolute; }   /* required for smooth move */
.list-move { transition: transform 0.3s ease; }
```

### Transition with appear

```html
<!-- Run the enter transition on initial render -->
<Transition name="fade" appear>
    <div>Animates in on first mount</div>
</Transition>
```

---

## Teleport — Render Anywhere in the DOM

`<Teleport>` renders content in a different part of the DOM (e.g. `<body>`) while keeping it logically inside your component.

```html
<!-- Render inside body — avoids z-index/overflow issues with modals -->
<Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal">
            <h2>{{ title }}</h2>
            <slot />
            <button @click="close">Close</button>
        </div>
    </div>
</Teleport>

<!-- Render inside a specific element -->
<Teleport to="#notifications">
    <div class="toast">{{ message }}</div>
</Teleport>

<!-- Disable teleport conditionally (renders in place) -->
<Teleport to="body" :disabled="isMobile">
    <div class="sidebar">...</div>
</Teleport>

<!-- Multiple teleports to the same target (appended in order) -->
<Teleport to="#modals">
    <Modal v-if="showA">Modal A</Modal>
</Teleport>
<Teleport to="#modals">
    <Modal v-if="showB">Modal B</Modal>
</Teleport>
```

```html
<!-- index.html — define the target element -->
<body>
    <div id="app"></div>
    <div id="modals"></div>     <!-- teleport target -->
    <div id="notifications"></div>
</body>
```

---

## Provide / Inject — Complete Reference

`provide` / `inject` passes data down the component tree without prop drilling.

```typescript
// ── Providing values ────────────────────────────────────────────────────────

// 1. In a component
import { provide, ref, readonly, InjectionKey } from "vue";

// Define typed injection keys (best practice for TypeScript)
export const THEME_KEY:    InjectionKey<Ref<string>>   = Symbol("theme");
export const AUTH_KEY:     InjectionKey<AuthContext>   = Symbol("auth");
export const API_URL_KEY:  InjectionKey<string>        = Symbol("apiUrl");

// In parent component
provide(THEME_KEY, ref("dark"));
provide(API_URL_KEY, "https://api.example.com");

// Provide reactive state with update function
const theme = ref("light");
provide(THEME_KEY, readonly(theme));   // provide read-only to children
provide(Symbol("toggleTheme"), () => {
    theme.value = theme.value === "light" ? "dark" : "light";
});

// 2. In App-level (main.ts or App.vue — available to ALL components)
// App.vue:
provide("globalConfig", { apiUrl: "...", version: "1.0" });

// ── Injecting values ────────────────────────────────────────────────────────
import { inject } from "vue";

// With typed key
const theme     = inject(THEME_KEY);              // Ref<string> | undefined
const theme2    = inject(THEME_KEY, ref("light")); // with default value
const apiUrl    = inject(API_URL_KEY)!;           // assert non-null

// With string key (no type safety)
const config    = inject<AppConfig>("globalConfig");
const fallback  = inject("optional", "default-value");

// With factory default (for expensive defaults)
const service   = inject("service", () => new ExpensiveService(), true);
//                                                              ^ true = factory

// ── Full pattern — service via provide/inject ──────────────────────────────

// Create a composable that provides AND consumes
export function useTheme() {
    const theme    = inject(THEME_KEY);
    const toggle   = inject<() => void>(Symbol("toggleTheme"));

    if (!theme || !toggle) throw new Error("useTheme must be used inside ThemeProvider");

    return { theme: readonly(theme), toggle };
}

// ThemeProvider component
@Component({ ... }) // or just a <script setup>
// provide(THEME_KEY, theme);

// Any child component
const { theme, toggle } = useTheme();
```

---

## Custom Directives — Complete Reference

```typescript
// src/directives/vFocus.ts — auto-focus an input on mount
import { Directive, DirectiveBinding } from "vue";

export const vFocus: Directive = {
    // Directive lifecycle hooks (parallel to component lifecycle)
    created(el, binding, vnode) {
        // Called before element's attributes and event listeners are applied
    },
    beforeMount(el, binding) {
        // Before element is inserted into DOM
    },
    mounted(el, binding) {
        // Element is inserted into DOM
        el.focus();
    },
    beforeUpdate(el, binding) {
        // Before component VNode is updated
    },
    updated(el, binding) {
        // After component and children VNodes are updated
    },
    beforeUnmount(el, binding) {
        // Before element is removed from DOM
    },
    unmounted(el, binding) {
        // Element has been removed
    }
};

// Shorthand — if you only need mounted + updated
export const vFocusShort: Directive = (el) => el.focus();
```

### Directive with Arguments and Modifiers

```typescript
// v-highlight:color.bold="'#ff0'"
// binding.arg       = "color"
// binding.modifiers = { bold: true }
// binding.value     = "#ff0"
// binding.oldValue  = previous value

export const vHighlight: Directive<HTMLElement, string> = {
    mounted(el, binding) {
        el.style.backgroundColor = binding.value ?? "yellow";
        if (binding.modifiers.bold)   el.style.fontWeight = "bold";
        if (binding.modifiers.italic) el.style.fontStyle  = "italic";
        if (binding.arg === "text")   el.style.color       = binding.value;
    },
    updated(el, binding) {
        if (binding.value !== binding.oldValue) {
            el.style.backgroundColor = binding.value ?? "yellow";
        }
    }
};

// Usage:
// <p v-highlight="'cyan'">Text</p>
// <p v-highlight:text.bold="'red'">Bold red text</p>
```

### Click Outside Directive

```typescript
export const vClickOutside: Directive = {
    mounted(el, binding) {
        el._clickOutsideHandler = (event: MouseEvent) => {
            if (!el.contains(event.target as Node)) {
                binding.value(event);
            }
        };
        document.addEventListener("click", el._clickOutsideHandler);
    },
    unmounted(el) {
        document.removeEventListener("click", el._clickOutsideHandler);
    }
};

// Usage: <div v-click-outside="closeDropdown">
```

### Intersection Observer Directive

```typescript
export const vLazyLoad: Directive = {
    mounted(el, binding) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.src = binding.value;      // load the image
                    observer.unobserve(el);       // stop observing
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        el._observer = observer;
    },
    unmounted(el) {
        el._observer?.disconnect();
    }
};

// Usage: <img v-lazy-load="imageUrl" src="placeholder.jpg">
```

### Registering Directives

```typescript
// Global registration (main.ts)
import { createApp } from "vue";
import { vFocus, vHighlight, vClickOutside } from "./directives";

const app = createApp(App);
app.directive("focus",         vFocus);
app.directive("highlight",     vHighlight);
app.directive("click-outside", vClickOutside);

// Local registration (in component)
// <script setup> — just import and prefix with v
import { vFocus } from "./directives/vFocus";
// Then use as: <input v-focus>

// Options API local
export default {
    directives: { focus: vFocus }
};
```

---

## Plugins

A plugin adds global functionality to a Vue app.

```typescript
// src/plugins/toast.ts
import { App, ref, createApp, defineComponent } from "vue";

interface ToastOptions {
    message:  string;
    type?:    "success" | "error" | "warning" | "info";
    duration?: number;
}

export const toastPlugin = {
    install(app: App) {
        const toasts = ref<ToastOptions[]>([]);

        function toast(options: ToastOptions | string) {
            const opts = typeof options === "string" ? { message: options } : options;
            const toast = { type: "info", duration: 3000, ...opts };
            toasts.value.push(toast);
            setTimeout(() => {
                toasts.value = toasts.value.filter(t => t !== toast);
            }, toast.duration);
        }

        toast.success = (msg: string) => toast({ message: msg, type: "success" });
        toast.error   = (msg: string) => toast({ message: msg, type: "error" });
        toast.warning = (msg: string) => toast({ message: msg, type: "warning" });

        // Provide globally — any component can inject
        app.provide("toast", toast);

        // Global property — accessible as this.$toast in Options API
        app.config.globalProperties.$toast = toast;

        // Register global component
        app.component("Toast", defineComponent({ /* ... */ }));
    }
};

// Usage in any component
const toast = inject<ToastFn>("toast")!;
toast.success("User saved!");
toast.error("Something went wrong");
```

```typescript
// main.ts
import { createApp } from "vue";
import { toastPlugin } from "./plugins/toast";
import i18nPlugin from "./plugins/i18n";

const app = createApp(App);
app.use(toastPlugin);
app.use(i18nPlugin, { locale: "en" });  // plugins can receive options
app.mount("#app");
```

---

## Performance Optimization

### v-memo — Skip Re-renders

```html
<!-- Only re-render this subtree if id or selected changes -->
<div v-memo="[item.id, item.selected]">
    <p>{{ item.name }}</p>
    <ComplexChart :data="item.data" />
</div>
```

### shallowRef / shallowReactive

```typescript
import { shallowRef, shallowReactive, triggerRef } from "vue";

// shallowRef — only .value itself is reactive, not nested props
const tableData = shallowRef({ rows: [], columns: [] });

// Mutate in place (normally wouldn't trigger reactivity with shallowRef)
tableData.value.rows.push(newRow);
triggerRef(tableData);   // manually trigger update after mutation

// shallowReactive — only top-level props are reactive
const config = shallowReactive({
    theme: "dark",         // reactive
    settings: {            // NOT reactive deeply
        notifications: true
    }
});
```

### defineAsyncComponent

```typescript
import { defineAsyncComponent } from "vue";

// Basic lazy load
const HeavyChart = defineAsyncComponent(() =>
    import("./components/HeavyChart.vue")
);

// With loading and error states
const AsyncModal = defineAsyncComponent({
    loader:           () => import("./Modal.vue"),
    loadingComponent: LoadingSpinner,
    errorComponent:   ErrorMessage,
    delay:            200,     // show loading component after 200ms
    timeout:          3000,    // show error after 3s
    onError(error, retry, fail, attempts) {
        if (attempts < 3) retry();
        else fail();
    }
});

// With Suspense (parent handles loading/error)
// <Suspense>
//   <template #default><AsyncModal /></template>
//   <template #fallback><LoadingSpinner /></template>
// </Suspense>
```

### KeepAlive — Cache Component State

```html
<!-- Cache the component instance — preserves state when switching -->
<KeepAlive>
    <component :is="currentTab" />
</KeepAlive>

<!-- Include/exclude by component name -->
<KeepAlive :include="['UserList', 'Dashboard']">
    <component :is="currentTab" />
</KeepAlive>
<KeepAlive :exclude="['EditForm']">
    <component :is="currentTab" />
</KeepAlive>

<!-- Max cached instances -->
<KeepAlive :max="5">
    <component :is="currentTab" />
</KeepAlive>
```

```typescript
// Lifecycle hooks for kept-alive components
import { onActivated, onDeactivated } from "vue";

// Called when component is re-inserted from cache
onActivated(() => {
    console.log("Activated — refresh data if stale");
    refreshIfStale();
});

// Called when component is removed but cached (not unmounted)
onDeactivated(() => {
    console.log("Deactivated — pausing operations");
    pauseVideo();
});
```

### Computed Caching

```typescript
// Computed is automatically cached — only recalculates when dependencies change
const sortedUsers = computed(() => {
    console.log("Sorting...");  // only logs when users or sort field changes
    return [...users.value].sort((a, b) => a[sortField.value].localeCompare(b[sortField.value]));
});

// Methods are NOT cached — recalculates every render
function getSortedUsers() {
    console.log("Sorting...");  // logs every render — expensive!
    return [...users.value].sort(...);
}
```

---

## Suspense

`<Suspense>` handles async setup functions and async components.

```html
<Suspense>
    <!-- Main content — may have async setup() -->
    <template #default>
        <UserProfile />
    </template>

    <!-- Shown while waiting -->
    <template #fallback>
        <div class="loading">Loading profile...</div>
    </template>
</Suspense>
```

```typescript
// Component with async setup — works with Suspense
const UserProfile = defineComponent({
    async setup() {
        // This component "suspends" until this resolves
        const user = await userService.getCurrentUser();
        return { user };
    }
});

// Or with <script setup>
const user = await userService.getCurrentUser();  // top-level await
```

```html
<!-- Nested Suspense — each level handles its own loading -->
<Suspense>
    <template #default>
        <UserList>
            <Suspense>
                <template #default><UserDetails /></template>
                <template #fallback><p>Loading details...</p></template>
            </Suspense>
        </UserList>
    </template>
    <template #fallback><p>Loading users...</p></template>
</Suspense>
```

---

## Error Handling

```typescript
// Component-level error boundary
import { onErrorCaptured } from "vue";

onErrorCaptured((err, instance, info) => {
    console.error("Error in child component:", err);
    console.error("Component:", instance);
    console.error("Info:", info);  // "render", "setup", "lifecycle hook", etc.

    // Return false to prevent propagating to parent
    // Return true or nothing to propagate
    errorMessage.value = err.message;
    return false;
});

// App-level global error handler
app.config.errorHandler = (err, instance, info) => {
    // Catches all unhandled errors in the app
    console.error("Global error:", err);
    reportToErrorService(err);
};

// Warning handler (development)
app.config.warnHandler = (msg, instance, trace) => {
    console.warn("Vue warning:", msg);
};
```

---

## Renderless Components

A renderless (or headless) component has no template — it provides logic and lets the parent decide the markup via slots.

```typescript
// Renderless component using render function
import { defineComponent, ref, computed } from "vue";

export default defineComponent({
    name: "Paginator",
    props: {
        total:   { type: Number, required: true },
        perPage: { type: Number, default: 10 }
    },
    emits: ["page-change"],
    setup(props, { slots, emit }) {
        const currentPage = ref(0);
        const totalPages  = computed(() => Math.ceil(props.total / props.perPage));
        const hasNext     = computed(() => currentPage.value < totalPages.value - 1);
        const hasPrev     = computed(() => currentPage.value > 0);

        function next() { if (hasNext.value) { currentPage.value++; emit("page-change", currentPage.value); } }
        function prev() { if (hasPrev.value) { currentPage.value--; emit("page-change", currentPage.value); } }
        function goTo(n: number) { currentPage.value = n; emit("page-change", n); }

        // Expose to slot via scoped slot
        return () => slots.default?.({
            currentPage: currentPage.value,
            totalPages:  totalPages.value,
            hasNext:     hasNext.value,
            hasPrev:     hasPrev.value,
            next, prev, goTo
        });
    }
});
```

```html
<!-- Usage — complete control over markup -->
<Paginator :total="users.length" :per-page="20" @page-change="handleChange">
    <template #default="{ currentPage, totalPages, hasNext, hasPrev, next, prev }">
        <div class="my-pagination">
            <button :disabled="!hasPrev" @click="prev">← Prev</button>
            <span>{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button :disabled="!hasNext" @click="next">Next →</button>
        </div>
    </template>
</Paginator>
```

---

## Summary

- `<Transition>` adds CSS classes at lifecycle moments — `name-enter-from`, `name-enter-active`, `name-enter-to`, same for leave.
- `<TransitionGroup>` also adds `name-move` for list reordering animations.
- `<Teleport to="body">` renders content in a different DOM location — essential for modals, toasts, tooltips.
- `provide` / `inject` with typed `InjectionKey` symbols is the clean pattern for cross-tree state sharing.
- Custom directives have the same lifecycle as components — use `mounted` for most DOM manipulation.
- `defineAsyncComponent` for code-split heavy components; `<KeepAlive>` to preserve state.
- `v-memo` skips re-render of a subtree when dependencies haven't changed — use for expensive list items.
- `onErrorCaptured` creates an error boundary in any component — prevents errors from crashing the whole tree.
