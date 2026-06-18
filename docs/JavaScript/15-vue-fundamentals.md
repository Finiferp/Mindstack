---
title: "Vue.js Fundamentals"
sidebar_label: "Vue Basics"
sidebar_position: 15
---

# Vue.js Fundamentals

Vue is a progressive framework for building UIs. It's simpler to learn than Angular, more structured than plain JavaScript, and extremely flexible. This reference uses the Composition API with `<script setup>` — the modern, recommended style.

---

## Setup

```bash
npm create vue@latest     # creates a Vue 3 project with options
# Select: TypeScript, Router, Pinia, ESLint, Prettier

cd my-app
npm install
npm run dev               # http://localhost:5173
npm run build             # production build → dist/
npm run preview           # preview the production build
```

---

## Single-File Components (SFC)

Every Vue component is a `.vue` file with three optional sections:

```vue
<script setup lang="ts">
// Logic — this is "setup" context
// Variables/functions declared here are auto-exposed to the template
import { ref, computed, onMounted } from "vue";

const count = ref(0);
const double = computed(() => count.value * 2);

function increment() {
    count.value++;
}

onMounted(() => {
    console.log("Component mounted");
});
</script>

<template>
    <!-- HTML — all script variables are available here -->
    <div class="counter">
        <p>Count: {{ count }}</p>
        <p>Double: {{ double }}</p>
        <button @click="increment">+</button>
        <button @click="count--">-</button>
    </div>
</template>

<style scoped>
/* CSS — scoped = only applies to THIS component */
.counter { display: flex; gap: 1rem; align-items: center; }
button { padding: 4px 12px; }
</style>
```

---

## Reactivity — ref, reactive, shallowRef

### ref() — Any Value

```typescript
import { ref, Ref, isRef, unref, toRef } from "vue";

// Create
const count   = ref(0);             // Ref<number>
const name    = ref("Alice");       // Ref<string>
const active  = ref(true);          // Ref<boolean>
const user    = ref<User | null>(null);  // Ref<User | null>
const items   = ref<string[]>([]);   // Ref<string[]>

// Read — requires .value in <script>
count.value           // 0
name.value            // "Alice"

// Write
count.value = 5;
name.value = "Bob";
count.value++;
items.value.push("new item");
items.value = [...items.value, "new"];  // immutable style (recommended)

// In <template>: Vue auto-unwraps, no .value needed
// <p>{{ count }}</p>   ← no .value

// Utilities
isRef(count)          // true
isRef(5)              // false
unref(count)          // 0 — returns .value if ref, else the value itself
unref(5)              // 5

// Ref from reactive property
const state = reactive({ name: "Alice", age: 30 });
const nameRef = toRef(state, "name");  // still linked to state.name
nameRef.value = "Bob";   // also updates state.name
```

### reactive() — Objects Only

```typescript
import { reactive, isReactive, toRaw, markRaw } from "vue";

// Create — returns Proxy, no .value needed
const user = reactive({
    name:    "Alice",
    age:     30,
    address: { city: "Paris", country: "France" }
});

// Read/write — direct property access
user.name               // "Alice"
user.name = "Bob";      // reactive — components update
user.address.city = "London";  // nested objects are also reactive

// Limitations of reactive:
// 1. Can't reassign the whole object (loses reactivity)
// user = { name: "Bob" }   // breaks reactivity!
// user.value = { ... }     // no .value — use Object.assign or individual props

// 2. Destructuring loses reactivity
// const { name } = user;   // name is NOT reactive string now
// const { name } = toRefs(user);  // FIX: toRefs wraps each property in a ref

import { toRefs } from "vue";
const { name, age } = toRefs(user);  // name and age are now Refs, still linked

// 3. Primitives can't be reactive — use ref() for those

// isReactive
isReactive(user)       // true
isReactive(ref({}))    // false (ref wraps reactive in an extra .value layer)

// toRaw — get the raw non-reactive object (for passing to non-Vue code)
const raw = toRaw(user);

// markRaw — prevent object from ever becoming reactive
const chart = markRaw(new SomeHeavyChart());
```

### shallowRef / shallowReactive

```typescript
import { shallowRef, shallowReactive } from "vue";

// shallowRef — only .value itself is tracked, not nested properties
const state = shallowRef({ count: 0, user: { name: "Alice" } });
state.value = { count: 1, user: { name: "Bob" } };  // triggers update (replaces .value)
state.value.count = 5;  // does NOT trigger update (nested not tracked)

// shallowReactive — only top-level properties are tracked
const obj = shallowReactive({ a: 1, nested: { b: 2 } });
obj.a = 2;           // triggers update
obj.nested.b = 3;    // does NOT trigger update
```

### computed()

```typescript
import { ref, computed, WritableComputedRef } from "vue";

const firstName = ref("Alice");
const lastName  = ref("Smith");

// Read-only computed
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
fullName.value   // "Alice Smith" — read only

// Writable computed (getter + setter)
const fullName2 = computed<string>({
    get: () => `${firstName.value} ${lastName.value}`,
    set: (val: string) => {
        const [first, last] = val.split(" ");
        firstName.value = first;
        lastName.value  = last ?? "";
    }
});
fullName2.value = "Bob Jones";  // sets firstName and lastName

// Computed from array
const numbers = ref([1, 2, 3, 4, 5]);
const evens   = computed(() => numbers.value.filter(n => n % 2 === 0));
const sum     = computed(() => numbers.value.reduce((a, b) => a + b, 0));
const sorted  = computed(() => [...numbers.value].sort((a, b) => a - b));
```

### watch() and watchEffect()

```typescript
import { ref, watch, watchEffect, watchPostEffect, watchSyncEffect } from "vue";

const userId = ref(1);
const user   = ref<User | null>(null);

// watch — explicit source, runs when it changes
watch(userId, async (newId, oldId) => {
    console.log(`Changed from ${oldId} to ${newId}`);
    user.value = await fetchUser(newId);
});

// Watch multiple sources
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
    console.log(`Name changed: ${oldFirst} ${oldLast} → ${newFirst} ${newLast}`);
});

// Watch a reactive object property
const state = reactive({ name: "Alice", count: 0 });
watch(() => state.name, (newName) => console.log("Name:", newName));
watch(() => state.count, (newCount) => console.log("Count:", newCount));

// Deep watch — detect nested changes (expensive)
const config = ref({ theme: { color: "blue", size: 14 } });
watch(config, (newConfig) => {
    console.log("Config changed:", newConfig);
}, { deep: true });

// Immediate — runs immediately on mount AND on change
watch(userId, async (newId) => {
    user.value = await fetchUser(newId);
}, { immediate: true });

// Once — only fires once (Vue 3.4+)
watch(userId, (id) => console.log("Initial:", id), { once: true });

// Flush timing — when the watcher callback runs relative to DOM updates
// "pre"  — before DOM updates (default)
// "post" — after DOM updates (use to access updated DOM)
// "sync" — synchronously before anything else (use sparingly)
watch(count, () => { }, { flush: "post" });
watchPostEffect(() => { });  // shorthand for watchEffect + flush:"post"

// watchEffect — auto-tracks dependencies, no explicit source
watchEffect(async () => {
    // Automatically re-runs when userId.value changes
    // because it's read inside the effect
    const data = await fetchUser(userId.value);
    user.value = data;
});

// Stop a watcher
const stop = watchEffect(() => { /* ... */ });
stop();  // stops the watcher

// Cleanup side effects between runs
watchEffect((onCleanup) => {
    const controller = new AbortController();
    fetch(`/api/users/${userId.value}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => user.value = data);

    onCleanup(() => {
        controller.abort();  // cancel previous fetch when userId changes
    });
});
```

---

## Template Syntax — Complete Reference

### Interpolation

```html
<!-- Text -->
{{ message }}
{{ 1 + 1 }}
{{ ok ? "yes" : "no" }}
{{ message.split("").reverse().join("") }}
{{ user?.address?.city ?? "Unknown" }}

<!-- Raw HTML (XSS risk — only use with trusted content) -->
<p v-html="rawHtml"></p>

<!-- Attributes — v-bind or : shorthand -->
<img :src="imageUrl">
<a :href="pageUrl" :target="openInNewTab ? '_blank' : '_self'">Link</a>
<button :disabled="isSubmitting">
    {{ isSubmitting ? "Saving..." : "Save" }}
</button>
<div :id="`section-${id}`">

<!-- Boolean attributes -->
<button :disabled="isLoading">       <!-- removes attribute if false -->
<input :checked="isChecked">
<input :required="isRequired">

<!-- Dynamic attribute name -->
<div :[attributeName]="value">       <!-- v-bind with dynamic key -->
<button @[eventName]="handler">      <!-- v-on with dynamic event -->

<!-- Binding multiple attributes at once -->
const attrs = { id: "myId", class: "myClass", "data-foo": "bar" };
<div v-bind="attrs">                 <!-- spreads all attrs -->
```

### Class and Style Bindings

```html
<!-- Class — object syntax -->
<div :class="{ active: isActive, 'text-danger': hasError }">

<!-- Class — array syntax -->
<div :class="[baseClass, isActive ? 'active' : '', errorClass]">

<!-- Class — mixed -->
<div :class="[{ active: isActive }, errorClass]">

<!-- Class — computed object -->
<!-- const classObj = computed(() => ({ active: isActive.value, ... })) -->
<div :class="classObj">

<!-- Style — object syntax -->
<div :style="{ color: textColor, fontSize: fontSize + 'px', 'background-color': bgColor }">

<!-- Style — array (merge multiple style objects) -->
<div :style="[baseStyles, overrideStyles]">

<!-- Style — auto-prefixing -->
<div :style="{ transform: 'rotate(45deg)' }">   <!-- adds -webkit-, etc. -->

<!-- Style — multiple values (browser picks last supported) -->
<div :style="{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }">
```

### Event Handling — v-on

```html
<!-- Inline handler -->
<button @click="count++">Increment</button>
<button @click="count = count > 0 ? count - 1 : 0">Safe decrement</button>

<!-- Method handler -->
<button @click="handleClick">Click</button>
<button @click="handleClick($event, user)">Click</button>

<!-- Multiple events -->
<input @focus="onFocus" @blur="onBlur" @input="onInput">

<!-- Event modifiers -->
<form @submit.prevent="onSubmit">          <!-- preventDefault() -->
<a @click.stop="doThis">                   <!-- stopPropagation() -->
<a @click.stop.prevent="doThis">          <!-- both -->
<div @click.self="onClick">               <!-- only if target === element itself -->
<button @click.once="doOnce">             <!-- only fires once -->
<div @scroll.passive="onScroll">          <!-- improves scroll performance -->
<input @click.capture="capture">          <!-- capture phase -->

<!-- Key modifiers -->
<input @keyup.enter="submit">
<input @keyup.esc="cancel">
<input @keyup.tab="nextField">
<input @keyup.delete="clearField">
<input @keyup.space="doAction">
<input @keyup.up="moveUp">
<input @keyup.down="moveDown">
<input @keyup.left="moveLeft">
<input @keyup.right="moveRight">
<input @keyup.ctrl.enter="submit">        <!-- key combos -->
<input @keyup.alt.enter="submit">
<input @keyup.shift.enter="newLine">
<input @keyup.meta.enter="submit">        <!-- cmd on mac, win on windows -->
<input @keyup.exact.ctrl.c="copy">        <!-- ONLY ctrl+c, not ctrl+shift+c -->

<!-- Mouse button modifiers -->
<button @click.left="onLeft">
<button @click.right="onRight">
<button @click.middle="onMiddle">
```

### Two-Way Binding — v-model

```html
<!-- Text input -->
<input v-model="text">

<!-- Textarea -->
<textarea v-model="message"></textarea>

<!-- Checkbox — boolean when no value, array when multiple -->
<input type="checkbox" v-model="agreed">
<input type="checkbox" v-model="checkedItems" value="A">
<input type="checkbox" v-model="checkedItems" value="B">

<!-- Radio -->
<input type="radio" v-model="picked" value="option1">
<input type="radio" v-model="picked" value="option2">

<!-- Select -->
<select v-model="selected">
    <option value="">Please select</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
    </option>
</select>

<!-- Multiple select (array) -->
<select v-model="selectedMultiple" multiple>
    <option value="a">A</option>
    <option value="b">B</option>
</select>

<!-- v-model modifiers -->
<input v-model.trim="name">          <!-- strip whitespace -->
<input v-model.number="age">         <!-- coerce to Number -->
<input v-model.lazy="value">         <!-- sync on change event, not input -->

<!-- Custom component v-model -->
<app-input v-model="text">
<app-input v-model:title="post.title" v-model:body="post.body">  <!-- multiple -->
```

### Directives — v-if, v-show, v-for, v-slot

```html
<!-- v-if / v-else-if / v-else — add/remove from DOM -->
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>Other</div>

<!-- v-show — toggle display:none (stays in DOM) -->
<div v-show="isVisible">Always in DOM, may be hidden</div>

<!-- Use v-if for rarely shown content; v-show for frequently toggled -->

<!-- v-for — iterate array -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>

<!-- v-for with index -->
<li v-for="(item, index) in items" :key="item.id">{{ index + 1 }}. {{ item.name }}</li>

<!-- v-for object — iterates values -->
<li v-for="(value, key, index) in myObject" :key="key">
    {{ index }}. {{ key }}: {{ value }}
</li>

<!-- v-for with range -->
<span v-for="n in 10" :key="n">{{ n }}</span>   <!-- 1, 2, ..., 10 -->

<!-- v-for on template (multiple elements per iteration) -->
<template v-for="user in users" :key="user.id">
    <tr><td>{{ user.name }}</td></tr>
    <tr><td>{{ user.email }}</td></tr>
</template>

<!-- v-for + v-if — use template to avoid v-if on same element -->
<template v-for="user in users" :key="user.id">
    <li v-if="user.active">{{ user.name }}</li>
</template>

<!-- NEVER put v-if and v-for on the same element — v-if takes priority -->

<!-- v-once — render once, never re-render -->
<span v-once>{{ expensiveCalc() }}</span>

<!-- v-memo — skip re-render if dependencies unchanged (Vue 3.2+) -->
<div v-memo="[item.id, item.name]">{{ item }}</div>

<!-- v-pre — skip Vue compilation (display raw template syntax) -->
<span v-pre>{{ this will not be compiled }}</span>

<!-- v-cloak — hide uncompiled template until Vue mounts -->
<div v-cloak>{{ message }}</div>
<!-- .v-cloak { display: none; } in CSS -->
```

---

## Props and Emits — Complete

```typescript
// Child component — defineProps and defineEmits are compiler macros
// No import needed for them in <script setup>

// ── Props ──────────────────────────────────────────────────────────────────
// Type-only syntax (TypeScript)
const props = defineProps<{
    user:        User;
    title:       string;
    count?:      number;        // optional
    items?:      string[];
    config?:     UserConfig;
    onAction?:   () => void;    // function prop
}>();

// With defaults — use withDefaults
const props = withDefaults(defineProps<{
    title:    string;
    count?:   number;
    items?:   string[];
    variant?: "primary" | "secondary" | "danger";
}>(), {
    count:   0,
    items:   () => [],           // factory for reference types
    variant: "primary"
});

// Runtime validation syntax (JS-style)
defineProps({
    user: {
        type:     Object as PropType<User>,
        required: true
    },
    count: {
        type:     Number,
        default:  0,
        validator: (val: number) => val >= 0
    },
    title: {
        type:    String,
        default: "Untitled"
    },
    items: {
        type:    Array as PropType<string[]>,
        default: () => []
    },
    status: {
        type:      String,
        validator: (val: string) => ["active", "inactive"].includes(val)
    }
});

// Accessing props
props.user.name
props.count
props.items

// ── Emits ──────────────────────────────────────────────────────────────────
// Type-only syntax
const emit = defineEmits<{
    "update:modelValue": [value: string];
    deleted:             [id: number];
    saved:               [user: User];
    cancelled:           [];
    "item-selected":     [item: Item, index: number];
}>();

// Runtime syntax
const emit2 = defineEmits(["deleted", "saved", "cancelled"]);
// with validation:
const emit3 = defineEmits({
    deleted: (id: number) => typeof id === "number",
    saved:   (user: User) => !!user.id
});

// Emit events
emit("deleted", userId);
emit("saved", updatedUser);
emit("cancelled");
emit("update:modelValue", newValue);
```

---

## Lifecycle Hooks — Complete

```typescript
import {
    onBeforeMount,  onMounted,
    onBeforeUpdate, onUpdated,
    onBeforeUnmount, onUnmounted,
    onErrorCaptured, onActivated, onDeactivated,
    onRenderTracked, onRenderTriggered
} from "vue";

// ── Setup phase (runs before any hooks) ────────────────────────────────────
// <script setup> itself IS the setup() function

onBeforeMount(() => {
    // Component is about to be inserted into the DOM
    // Template is compiled but not yet mounted
    // Cannot access DOM elements yet
});

onMounted(() => {
    // Component is inserted into DOM
    // Can access DOM elements via template refs
    // Good for: fetch data, set up subscriptions, initialize third-party libs
    inputRef.value?.focus();
    chart = new Chart(canvasRef.value!);
});

onBeforeUpdate(() => {
    // Reactive data changed, DOM about to be re-rendered
    // Can read DOM before update
});

onUpdated(() => {
    // DOM has been re-rendered after reactive change
    // Don't modify state here — causes infinite loop
});

onBeforeUnmount(() => {
    // Component is about to be removed
    // Last chance to access the DOM
    chart?.destroy();
    subscription?.unsubscribe();
});

onUnmounted(() => {
    // Component has been removed
    // Clean up: timers, subscriptions, event listeners
    clearInterval(timer);
    window.removeEventListener("resize", handleResize);
    worker?.terminate();
});

// Keep-alive specific hooks
onActivated(() => {
    // Called when a kept-alive component is inserted
});

onDeactivated(() => {
    // Called when a kept-alive component is removed from DOM but cached
});

// Error boundary
onErrorCaptured((err, instance, info) => {
    console.error("Child component error:", err, info);
    return false;  // false = don't propagate to parent error handlers
});

// Dev-only — for debugging reactivity
onRenderTracked((event) => {
    console.log("Tracked dependency:", event);
});
onRenderTriggered((event) => {
    console.log("Re-render triggered by:", event);
});
```

---

## Template Refs

```typescript
import { ref, useTemplateRef, onMounted } from "vue";

// Modern syntax (Vue 3.5+)
const inputEl = useTemplateRef<HTMLInputElement>("myInput");

// Classic syntax
const inputEl2 = ref<HTMLInputElement | null>(null);

onMounted(() => {
    inputEl.value?.focus();
    inputEl.value!.value = "Hello";
});
```

```html
<!-- Classic ref -->
<input ref="inputEl2" type="text">

<!-- Modern useTemplateRef -->
<input ref="myInput" type="text">

<!-- v-for template refs — array of elements -->
<li v-for="item in items" :key="item.id" ref="listItems">

<!-- Component ref — access exposed methods/properties -->
<MyComponent ref="myComp">
<!-- myComp.value.focusInput() — if component uses defineExpose -->
```

---

## defineExpose and defineOptions

```typescript
// defineExpose — what parent components can access via ref
const count = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);

function focus() { inputEl.value?.focus(); }
function increment() { count.value++; }

defineExpose({
    count,       // parent can read/watch this
    focus,       // parent can call this
    increment
});

// defineOptions — component options not available in <script setup>
defineOptions({
    name:        "MyComponent",
    inheritAttrs: false        // don't auto-inherit attrs on root element
});
```

---

## Summary

- `ref()` for primitives and any value you want to reassign; `reactive()` for objects you modify in place.
- Always use `.value` to access refs in `<script>`. Templates auto-unwrap — no `.value` needed there.
- `computed()` is lazy and cached — only recalculates when its dependencies change.
- `watch()` for explicit dependency tracking with old/new values; `watchEffect()` for auto-tracking.
- Use `:key` on every `v-for` — without it Vue can't efficiently update lists.
- `v-if` removes from DOM (higher cost to show/hide); `v-show` just toggles CSS (better for frequent toggles).
- `defineProps` and `defineEmits` are compiler macros — no import needed in `<script setup>`.
- `defineExpose` is required to let parent components access properties/methods via template refs.
