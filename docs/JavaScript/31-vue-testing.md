---
title: "Vue Testing"
sidebar_label: "Vue Testing"
sidebar_position: 31
---

# Vue Testing

Vue uses Vitest as the standard test runner (matches Vite's tooling) and Vue Test Utils for mounting and interacting with components. This covers component testing, composables, Pinia stores, and E2E testing.

---

## Setup

```bash
npm install -D vitest @vue/test-utils jsdom @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import vue               from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: "jsdom",
        globals:     true,
        setupFiles:  ["./src/test/setup.ts"]
    }
});
```

```bash
npm run test          # watch mode
npm run test:run      # single run
npm run test:coverage # with coverage
```

---

## Mounting Components

```typescript
// Counter.spec.ts
import { describe, it, expect } from "vitest";
import { mount }                 from "@vue/test-utils";
import Counter                   from "./Counter.vue";

describe("Counter", () => {
    it("renders initial count", () => {
        const wrapper = mount(Counter);
        expect(wrapper.text()).toContain("0");
    });

    it("increments when button clicked", async () => {
        const wrapper = mount(Counter);

        await wrapper.find("[data-testid='increment']").trigger("click");

        expect(wrapper.text()).toContain("1");
    });

    it("renders with initial props", () => {
        const wrapper = mount(Counter, {
            props: { initialValue: 10 }
        });
        expect(wrapper.text()).toContain("10");
    });

    it("emits change event", async () => {
        const wrapper = mount(Counter);

        await wrapper.find("[data-testid='increment']").trigger("click");

        expect(wrapper.emitted()).toHaveProperty("change");
        expect(wrapper.emitted("change")![0]).toEqual([1]);
    });
});
```

### Finding Elements

```typescript
const wrapper = mount(MyComponent);

// By CSS selector
wrapper.find(".my-class")
wrapper.find("#my-id")
wrapper.find("button")
wrapper.find("[data-testid='submit']")
wrapper.findAll("li")                  // multiple elements
wrapper.findAll("li").length

// By component
wrapper.findComponent(ChildComponent)
wrapper.findAllComponents(ChildComponent)
wrapper.getComponent(ChildComponent)    // throws if not found (vs find returns null wrapper)

// Element properties
const el = wrapper.find("button");
el.exists()             // true/false
el.text()               // text content
el.html()               // HTML content
el.classes()            // ["class1", "class2"]
el.classes("active")    // true/false — has specific class
el.attributes()         // all attributes object
el.attributes("disabled") // specific attribute value
el.element              // raw DOM element
el.isVisible()          // checks display/visibility CSS

// Form element values
wrapper.find("input").element.value
wrapper.find("select").element.value
```

### Triggering Events

```typescript
// Click
await wrapper.find("button").trigger("click");

// Input
const input = wrapper.find("input");
await input.setValue("new text");          // sets value AND triggers input event

// Form submit
await wrapper.find("form").trigger("submit");
await wrapper.find("form").trigger("submit.prevent");  // with modifier

// Keyboard events
await wrapper.find("input").trigger("keyup", { key: "Enter" });
await wrapper.find("input").trigger("keydown.enter");

// Checkbox / radio
await wrapper.find("input[type='checkbox']").setValue(true);
await wrapper.find("input[type='radio']").setValue();

// Select
await wrapper.find("select").setValue("option2");

// Custom events
await wrapper.find(".draggable").trigger("dragstart", {
    dataTransfer: new DataTransfer()
});
```

---

## Props and Slots

```typescript
// Testing props
const wrapper = mount(UserCard, {
    props: {
        user: { id: 1, name: "Alice", email: "alice@example.com" },
        showEmail: true
    }
});

// Update props after mount
await wrapper.setProps({ showEmail: false });

// Testing slots
const wrapper = mount(Card, {
    slots: {
        default: "Main content",
        header:  "<h2>Card Title</h2>",
        footer:  () => h("button", "Action")  // render function
    }
});
expect(wrapper.html()).toContain("Card Title");

// Testing scoped slots
const wrapper = mount(List, {
    slots: {
        item: (props: { item: { name: string } }) => `<span>${props.item.name}</span>`
    }
});
```

---

## Testing Composables

```typescript
// useCounter.ts
import { ref, computed } from "vue";

export function useCounter(initial = 0) {
    const count  = ref(initial);
    const doubled= computed(() => count.value * 2);

    function increment() { count.value++; }
    function decrement() { count.value--; }
    function reset()     { count.value = initial; }

    return { count, doubled, increment, decrement, reset };
}
```

```typescript
// useCounter.spec.ts
import { describe, it, expect } from "vitest";
import { useCounter }            from "./useCounter";

describe("useCounter", () => {
    it("starts at the initial value", () => {
        const { count } = useCounter(5);
        expect(count.value).toBe(5);
    });

    it("increments correctly", () => {
        const { count, increment } = useCounter();
        increment();
        increment();
        expect(count.value).toBe(2);
    });

    it("computed doubled value updates", () => {
        const { count, doubled, increment } = useCounter();
        increment();
        increment();
        expect(doubled.value).toBe(4);
    });

    it("resets to initial value", () => {
        const { count, increment, reset } = useCounter(10);
        increment();
        increment();
        reset();
        expect(count.value).toBe(10);
    });
});
```

### Testing Composables That Need Component Context

```typescript
// Composables using lifecycle hooks (onMounted, etc.) need a host component
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useFetch } from "./useFetch";

function withSetup<T>(composable: () => T): { result: T; wrapper: ReturnType<typeof mount> } {
    let result!: T;
    const wrapper = mount(
        defineComponent({
            setup() {
                result = composable();
                return () => h("div");
            }
        })
    );
    return { result, wrapper };
}

describe("useFetch", () => {
    it("fetches data on mount", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ id: 1, name: "Alice" }]
        });

        const { result, wrapper } = withSetup(() => useFetch("/api/users"));

        await flushPromises();   // wait for async operations

        expect(result.data.value).toEqual([{ id: 1, name: "Alice" }]);
        expect(result.isLoading.value).toBe(false);

        wrapper.unmount();
    });
});

import { flushPromises } from "@vue/test-utils";
```

---

## Testing Pinia Stores

```bash
npm install -D @pinia/testing
```

```typescript
// users.store.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia }            from "pinia";
import { useUsersStore }                          from "./users.store";
import * as userApi                               from "@/services/userApi";

vi.mock("@/services/userApi");

describe("useUsersStore", () => {
    beforeEach(() => {
        setActivePinia(createPinia());   // fresh store for each test
        vi.clearAllMocks();
    });

    it("starts with empty users array", () => {
        const store = useUsersStore();
        expect(store.users).toEqual([]);
        expect(store.isLoading).toBe(false);
    });

    it("fetchUsers populates the store", async () => {
        const mockUsers = [{ id: 1, name: "Alice", active: true }];
        vi.mocked(userApi.getAll).mockResolvedValue({
            data: mockUsers, total: 1, totalPages: 1
        });

        const store = useUsersStore();
        await store.fetchUsers();

        expect(store.users).toEqual(mockUsers);
        expect(store.isLoading).toBe(false);
    });

    it("sets error on fetch failure", async () => {
        vi.mocked(userApi.getAll).mockRejectedValue(new Error("Network error"));

        const store = useUsersStore();
        await expect(store.fetchUsers()).rejects.toThrow();
        expect(store.error).toBe("Network error");
    });

    it("activeUsers getter filters correctly", () => {
        const store = useUsersStore();
        store.users = [
            { id: 1, name: "Alice", active: true }  as any,
            { id: 2, name: "Bob",   active: false } as any
        ];
        expect(store.activeUsers).toHaveLength(1);
        expect(store.activeUsers[0].name).toBe("Alice");
    });

    it("createUser adds to the store", async () => {
        const newUser = { id: 3, name: "Carol", active: true };
        vi.mocked(userApi.create).mockResolvedValue(newUser);

        const store = useUsersStore();
        await store.createUser({ name: "Carol", email: "c@example.com" } as any);

        expect(store.users).toContainEqual(newUser);
    });
});
```

### Testing Components That Use Pinia

```typescript
import { mount }       from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useUsersStore } from "@/stores/users";
import UserList          from "./UserList.vue";

describe("UserList", () => {
    it("renders users from the store", () => {
        const wrapper = mount(UserList, {
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        users: {
                            users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
                        }
                    },
                    createSpy: vi.fn   // stub all actions automatically
                })]
            }
        });

        expect(wrapper.findAll("li")).toHaveLength(2);
        expect(wrapper.text()).toContain("Alice");
    });

    it("calls fetchUsers action on mount", () => {
        const wrapper = mount(UserList, {
            global: { plugins: [createTestingPinia()] }
        });

        const store = useUsersStore();
        expect(store.fetchUsers).toHaveBeenCalled();   // action is auto-stubbed
    });

    it("calls deleteUser when delete clicked", async () => {
        const wrapper = mount(UserList, {
            global: {
                plugins: [createTestingPinia({
                    initialState: { users: { users: [{ id: 1, name: "Alice" }] } }
                })]
            }
        });

        const store = useUsersStore();
        await wrapper.find("[data-testid='delete-1']").trigger("click");

        expect(store.deleteUser).toHaveBeenCalledWith(1);
    });
});
```

---

## Testing with Router

```typescript
import { mount }            from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";
import UserDetail            from "./UserDetail.vue";

const routes = [
    { path: "/users/:id", component: UserDetail }
];

describe("UserDetail with router", () => {
    it("reads route param", async () => {
        const router = createRouter({ history: createWebHistory(), routes });
        router.push("/users/42");
        await router.isReady();

        const wrapper = mount(UserDetail, {
            global: { plugins: [router] }
        });

        expect(wrapper.vm.userId).toBe(42);
    });

    it("navigates when delete succeeds", async () => {
        const router = createRouter({ history: createWebHistory(), routes });
        const pushSpy = vi.spyOn(router, "push");
        router.push("/users/42");
        await router.isReady();

        const wrapper = mount(UserDetail, {
            global: { plugins: [router] }
        });

        await wrapper.find("[data-testid='delete-btn']").trigger("click");
        await flushPromises();

        expect(pushSpy).toHaveBeenCalledWith("/users");
    });
});
```

### Stub Router for Unit Tests

```typescript
import { mount } from "@vue/test-utils";

const wrapper = mount(MyComponent, {
    global: {
        stubs: {
            RouterLink: {
                template: "<a><slot /></a>"
            },
            RouterView: true
        },
        mocks: {
            $route:  { params: { id: "42" }, query: {} },
            $router: { push: vi.fn(), replace: vi.fn() }
        }
    }
});
```

---

## Mocking and Stubs

```typescript
import { mount } from "@vue/test-utils";

// Stub child components — don't render their internals
const wrapper = mount(ParentComponent, {
    global: {
        stubs: ["ChildComponent", "AnotherComponent"]
        // or: stubs: { ChildComponent: true }
        // or: stubs: { ChildComponent: { template: "<div>stub</div>" } }
    }
});

// Shallow mount — auto-stubs ALL child components
import { shallowMount } from "@vue/test-utils";
const wrapper2 = shallowMount(ParentComponent);

// Mock global properties / plugins
const wrapper3 = mount(MyComponent, {
    global: {
        provide: {
            theme: "dark"
        },
        mocks: {
            $t: (key: string) => key   // mock i18n translate function
        }
    }
});

// Mock a module
vi.mock("@/services/api", () => ({
    fetchUsers: vi.fn().mockResolvedValue([{ id: 1, name: "Alice" }])
}));
```

---

## Snapshot Testing

```typescript
import { mount } from "@vue/test-utils";

describe("UserCard snapshot", () => {
    it("matches snapshot", () => {
        const wrapper = mount(UserCard, {
            props: { user: { id: 1, name: "Alice", email: "alice@example.com" } }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});
```

```bash
vitest run -u    # update snapshots after intentional changes
```

---

## E2E Testing with Playwright (Vue)

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// e2e/users.spec.ts
import { test, expect } from "@playwright/test";

test.describe("User management", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/login");
        await page.fill("[name='email']",    "admin@example.com");
        await page.fill("[name='password']", "admin123");
        await page.click("button[type='submit']");
        await page.waitForURL("/dashboard");
    });

    test("displays the user list", async ({ page }) => {
        await page.goto("/admin/users");
        await expect(page.locator("table tbody tr")).toHaveCount(await page.locator("table tbody tr").count());
        await expect(page.locator("h1")).toHaveText("Users");
    });

    test("can search for a user", async ({ page }) => {
        await page.goto("/admin/users");
        await page.fill("[data-testid='search-input']", "alice");
        await page.waitForTimeout(400);  // debounce delay

        const rows = page.locator("table tbody tr");
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText("Alice");
    });

    test("creates a new user via modal", async ({ page }) => {
        await page.goto("/admin/users");
        await page.click("[data-testid='add-user-btn']");

        await expect(page.locator(".modal")).toBeVisible();

        await page.fill("[name='name']",  "New User");
        await page.fill("[name='email']", "newuser@example.com");
        await page.click("[data-testid='save-btn']");

        await expect(page.locator(".modal")).not.toBeVisible();
        await expect(page.locator("table")).toContainText("New User");
    });
});
```

---

## Test Organization

```typescript
// File naming convention
Component.spec.ts        // unit test for component
Component.test.ts        // alternative naming (also valid)
useComposable.spec.ts    // composable test
store.spec.ts            // Pinia store test

// Test structure
describe("ComponentName", () => {
    describe("rendering", () => {
        it("renders with default props", () => {});
        it("renders with custom props", () => {});
    });

    describe("user interactions", () => {
        it("emits event on click", () => {});
        it("updates state on input", () => {});
    });

    describe("edge cases", () => {
        it("handles empty data gracefully", () => {});
        it("handles null props", () => {});
    });
});
```

---

## Summary

- `mount()` renders the full component tree; `shallowMount()` stubs child components automatically.
- `wrapper.find()` returns a wrapper even if not found — check `.exists()`; `getComponent()` throws if missing.
- `await wrapper.trigger("click")` and always `await` — Vue's reactivity updates are async.
- `wrapper.emitted("eventName")` returns an array of all emission calls — index `[0]` for the first call's arguments.
- Use `createTestingPinia()` from `@pinia/testing` to auto-stub all store actions in component tests.
- `flushPromises()` from `@vue/test-utils` waits for pending microtasks — essential when testing async composables.
- Use Playwright for E2E — it tests the real running app in a real browser, catching issues unit tests miss.
