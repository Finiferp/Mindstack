---
title: "DOM & Web APIs"
sidebar_label: "DOM & Web APIs"
sidebar_position: 20
---

# DOM & Web APIs

The DOM (Document Object Model) is the browser's representation of your HTML as a tree of objects. Web APIs are browser-provided interfaces for storage, networking, geolocation, and more. These are browser-only — not available in Node.js.

---

## The DOM Tree

```
document
└── <html>
    ├── <head>
    │   ├── <title>
    │   └── <meta>
    └── <body>
        ├── <header>
        │   └── <h1>
        ├── <main>
        │   ├── <p>
        │   └── <ul>
        │       ├── <li>
        │       └── <li>
        └── <footer>
```

Every HTML element is a **node**. Node types: Element, Text, Comment, Document.

---

## Selecting Elements

```js
// Single element — returns first match or null
document.getElementById("myId")
document.querySelector(".my-class")
document.querySelector("#myId")
document.querySelector("h1")
document.querySelector("ul li:first-child")
document.querySelector("[data-id='42']")
document.querySelector("input[type='email']")

// Multiple elements — returns NodeList (not a real array)
document.querySelectorAll("p")
document.querySelectorAll(".card")
document.querySelectorAll("input[required]")
document.getElementsByClassName("my-class")   // live HTMLCollection
document.getElementsByTagName("div")          // live HTMLCollection
document.getElementsByName("username")        // by name attribute

// Convert NodeList/HTMLCollection to array
Array.from(document.querySelectorAll("p"))
[...document.querySelectorAll("p")]

// Relative selection
const container = document.querySelector(".container");
container.querySelector("p")          // first <p> inside container
container.querySelectorAll("p")       // all <p> inside container
container.getElementsByTagName("p")   // same, live

// Special elements
document.documentElement    // <html>
document.head               // <head>
document.body               // <body>
document.title              // page title string
```

---

## Traversing the DOM

```js
const el = document.querySelector(".parent");

// Children
el.childNodes                // NodeList: all children including text nodes
el.children                  // HTMLCollection: only element children
el.firstChild                // first child (may be text node)
el.lastChild                 // last child (may be text node)
el.firstElementChild         // first element child (ignores text nodes)
el.lastElementChild          // last element child

// Siblings
el.nextSibling               // next sibling (may be text node)
el.previousSibling           // previous sibling (may be text node)
el.nextElementSibling        // next element sibling
el.previousElementSibling    // previous element sibling

// Parent
el.parentNode                // parent node (could be document)
el.parentElement             // parent element (null if parent is not Element)
el.closest(".ancestor")      // nearest ancestor matching selector (including self)

// Contents
el.childElementCount         // number of element children
el.hasChildNodes()           // true if has any children

// DOM walking
function walkDOM(node, callback) {
    callback(node);
    node = node.firstChild;
    while (node) {
        walkDOM(node, callback);
        node = node.nextSibling;
    }
}
```

---

## Element Properties

```js
const el = document.querySelector("p");

// Content
el.innerHTML         // HTML content as string (can include tags) — XSS risk with user data
el.outerHTML         // element itself + content as HTML string
el.textContent       // all text content (strips HTML, safer than innerHTML)
el.innerText         // visible text only (respects CSS display:none)

el.innerHTML = "<strong>Bold</strong>";   // SET — parses HTML
el.textContent = "<strong>Bold</strong>"; // SET — treats as plain text (safe)

// Attributes
el.id                        // "myId"
el.className                 // "class1 class2" (space-separated string)
el.classList                 // DOMTokenList (see below)
el.tagName                   // "P" (always uppercase)
el.nodeName                  // "P" for elements, "#text" for text nodes
el.nodeType                  // 1=Element, 3=Text, 8=Comment, 9=Document

// Form elements
el.value                     // current value (input, textarea, select)
el.checked                   // checkbox/radio checked state
el.disabled                  // disabled state
el.readOnly                  // readOnly state
el.placeholder               // placeholder text

// Dimensions and position
el.offsetWidth               // width including padding and border
el.offsetHeight
el.clientWidth               // width including padding, NOT border
el.clientHeight
el.scrollWidth               // full scrollable width
el.scrollHeight
el.offsetTop                 // distance from top of offsetParent
el.offsetLeft
el.scrollTop                 // how far scrolled vertically
el.scrollLeft

const rect = el.getBoundingClientRect();
rect.top     // distance from viewport top
rect.left    // distance from viewport left
rect.right   // rect.left + rect.width
rect.bottom  // rect.top + rect.height
rect.width
rect.height
rect.x       // same as left
rect.y       // same as top
```

---

## Attributes

```js
const el = document.querySelector("a");

// Get / Set / Remove / Check
el.getAttribute("href")             // get attribute value (or null)
el.setAttribute("href", "/new")     // set or create attribute
el.removeAttribute("href")          // remove attribute
el.hasAttribute("href")             // true/false
el.toggleAttribute("disabled")      // toggle boolean attribute
el.toggleAttribute("disabled", true) // force on/off

// Data attributes — custom data-* attributes
// HTML: <div data-user-id="42" data-role="admin">
el.dataset.userId         // "42" — camelCase access
el.dataset.role           // "admin"
el.dataset.userId = "99"  // set
delete el.dataset.userId  // remove

// Named attributes
el.getAttribute("data-user-id")   // "42" — raw attribute access

// Boolean attributes — presence = true, absence = false
el.setAttribute("disabled", "")   // add disabled
el.removeAttribute("disabled")    // remove disabled
// or just:
el.disabled = true;
el.disabled = false;
```

---

## Class Manipulation

```js
const el = document.querySelector(".button");

// classList — best way to work with classes
el.classList.add("active")               // add one class
el.classList.add("active", "highlight")  // add multiple
el.classList.remove("inactive")          // remove one
el.classList.remove("a", "b", "c")      // remove multiple
el.classList.toggle("visible")           // add if absent, remove if present
el.classList.toggle("visible", true)     // force add
el.classList.toggle("visible", false)    // force remove
el.classList.contains("active")          // true/false
el.classList.replace("old", "new")       // replace one class with another
el.classList.item(0)                     // class at index
el.classList.length                      // number of classes
[...el.classList]                        // array of class names

// Direct className (less preferred)
el.className = "class1 class2";
el.className += " class3";
```

---

## Style Manipulation

```js
const el = document.querySelector("div");

// Inline styles
el.style.color           = "red";
el.style.backgroundColor = "blue";       // camelCase
el.style.fontSize        = "16px";
el.style.display         = "none";
el.style.display         = "";           // remove (reset to CSS default)
el.style.cssText         = "color:red; font-size:16px;"; // set multiple at once

// Computed styles — what's actually applied (including CSS)
const computed = getComputedStyle(el);
computed.color              // "rgb(255, 0, 0)"
computed.fontSize           // "16px"
computed.display            // "block"
computed.getPropertyValue("background-color")

// CSS Custom Properties (variables)
el.style.setProperty("--my-color", "blue");
el.style.getPropertyValue("--my-color");
el.style.removeProperty("--my-color");
getComputedStyle(el).getPropertyValue("--my-color");

// CSS properties — hyphenated vs camelCase
el.style["font-size"] = "16px";          // bracket with hyphen
el.style.fontSize     = "16px";          // camelCase
el.style.setProperty("font-size", "16px"); // setProperty with hyphen
```

---

## Creating and Modifying Elements

```js
// Create elements
const div  = document.createElement("div");
const text = document.createTextNode("Hello");
const frag = document.createDocumentFragment();   // lightweight container

// Set content
div.textContent = "Hello World";
div.innerHTML   = "<span>Hello</span> World";

// Add to DOM
parent.appendChild(child)               // add as last child
parent.prepend(child)                   // add as first child
parent.append(child1, child2)           // append multiple (also accepts strings)
parent.prepend("text", child)           // prepend multiple

element.before(sibling)                 // insert before element
element.after(sibling)                  // insert after element
element.replaceWith(newElement)         // replace element

parent.insertBefore(newChild, refChild) // insert before reference child
parent.insertBefore(newChild, parent.firstChild)  // prepend
parent.insertBefore(newChild, null)     // append (same as appendChild)

// insertAdjacentHTML — insert HTML at specific position (fast)
el.insertAdjacentHTML("beforebegin", "<p>Before el</p>")  // before opening tag
el.insertAdjacentHTML("afterbegin",  "<p>First child</p>") // first child
el.insertAdjacentHTML("beforeend",   "<p>Last child</p>")  // last child
el.insertAdjacentHTML("afterend",    "<p>After el</p>")    // after closing tag

el.insertAdjacentElement("beforebegin", otherEl)   // same positions but with element
el.insertAdjacentText("beforebegin", "raw text")   // same but text node

// Remove elements
el.remove()                       // remove from DOM
parent.removeChild(child)         // remove specific child
parent.replaceChild(newChild, oldChild)

// Clone
const clone = el.cloneNode(false)     // shallow — element only, no children
const deep  = el.cloneNode(true)      // deep — element + all descendants

// Check containment
parent.contains(child)           // true if child is a descendant
el.matches(".my-class")          // true if element matches the selector
el.matches("p.active[data-id]")  // any valid CSS selector

// DocumentFragment — batch DOM operations for performance
const frag = document.createDocumentFragment();
for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    frag.appendChild(li);
}
ul.appendChild(frag);   // single DOM update instead of N updates
```

---

## Events — Complete Reference

### Adding and Removing Listeners

```js
// addEventListener — preferred
el.addEventListener("click",  handleClick);
el.addEventListener("click",  handleClick, { once: true });      // auto-removes after first call
el.addEventListener("click",  handleClick, { passive: true });   // promise not to call preventDefault (scroll performance)
el.addEventListener("click",  handleClick, { capture: true });   // capture phase (top-down)
el.addEventListener("keyup",  handleKeyUp);
el.addEventListener("resize", handleResize);

el.removeEventListener("click", handleClick);   // must be same function reference!
el.removeEventListener("click", handleClick, { capture: true });  // capture flag must match

// AbortController — remove multiple listeners at once
const controller = new AbortController();
el.addEventListener("click",   handler1, { signal: controller.signal });
el.addEventListener("keydown", handler2, { signal: controller.signal });
controller.abort();   // removes BOTH listeners
```

### Event Object Properties

```js
element.addEventListener("click", (event) => {
    // General
    event.type              // "click"
    event.target            // element that triggered the event
    event.currentTarget     // element the listener is attached to
    event.timeStamp         // ms since page load

    // Phases
    event.eventPhase        // 1=capture, 2=target, 3=bubble

    // Bubble / Default
    event.bubbles           // true if event bubbles
    event.cancelable        // true if preventDefault() has effect
    event.defaultPrevented  // true if preventDefault() was called

    event.preventDefault()   // stop default behavior (link navigation, form submit)
    event.stopPropagation()  // stop bubbling to parent elements
    event.stopImmediatePropagation() // stop bubbling AND other same-element listeners
});
```

### Mouse Events

```js
el.addEventListener("click",      (e) => {});   // single click
el.addEventListener("dblclick",   (e) => {});   // double click
el.addEventListener("mousedown",  (e) => {});   // mouse button pressed
el.addEventListener("mouseup",    (e) => {});   // mouse button released
el.addEventListener("mousemove",  (e) => {});   // mouse moved over element
el.addEventListener("mouseover",  (e) => {});   // mouse entered (bubbles)
el.addEventListener("mouseout",   (e) => {});   // mouse left (bubbles)
el.addEventListener("mouseenter", (e) => {});   // mouse entered (no bubble)
el.addEventListener("mouseleave", (e) => {});   // mouse left (no bubble)
el.addEventListener("contextmenu",(e) => {});   // right-click

// Mouse event properties
event.clientX / event.clientY    // coordinates relative to viewport
event.pageX   / event.pageY      // coordinates relative to document
event.screenX / event.screenY    // coordinates relative to screen
event.offsetX / event.offsetY    // coordinates relative to target element
event.button                     // 0=left, 1=middle, 2=right
event.buttons                    // bitmask of pressed buttons
event.altKey   / event.ctrlKey   // modifier keys
event.shiftKey / event.metaKey   // modifier keys
```

### Keyboard Events

```js
document.addEventListener("keydown",  (e) => {});  // key pressed (repeats if held)
document.addEventListener("keyup",    (e) => {});  // key released
document.addEventListener("keypress", (e) => {});  // deprecated — avoid

// Keyboard event properties
event.key         // "a", "Enter", "ArrowUp", "Escape", "F1", " "
event.code        // "KeyA", "Enter", "ArrowUp" — physical key, layout-independent
event.keyCode     // deprecated numeric code — avoid
event.altKey      // true if Alt held
event.ctrlKey     // true if Ctrl held
event.shiftKey    // true if Shift held
event.metaKey     // true if Cmd (Mac) or Win key held
event.repeat      // true if key is held down and repeating

// Common key values
// "Enter", "Escape", "Tab", "Backspace", "Delete", "Space"
// "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
// "Home", "End", "PageUp", "PageDown"
// "F1"–"F12"
// "a"–"z", "A"–"Z", "0"–"9"
```

### Form Events

```js
input.addEventListener("input",  (e) => {});    // value changed (every keystroke)
input.addEventListener("change", (e) => {});    // value committed (blur for text)
input.addEventListener("focus",  (e) => {});    // element received focus
input.addEventListener("blur",   (e) => {});    // element lost focus
input.addEventListener("select", (e) => {});    // text selected

form.addEventListener("submit",  (e) => {
    e.preventDefault();     // stop default form submission
    const data = new FormData(form);
    data.get("username");
    data.getAll("tags");
    Object.fromEntries(data);   // plain object
});
form.addEventListener("reset",   (e) => {});    // form reset

// Drag events
el.addEventListener("dragstart",  (e) => {});
el.addEventListener("drag",       (e) => {});
el.addEventListener("dragend",    (e) => {});
el.addEventListener("dragover",   (e) => { e.preventDefault(); }); // required to allow drop
el.addEventListener("dragenter",  (e) => {});
el.addEventListener("dragleave",  (e) => {});
el.addEventListener("drop",       (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
});
```

### Event Delegation

```js
// Instead of adding listener to EACH button (expensive),
// add ONE listener to a parent and check event.target

document.querySelector("#user-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const userId = btn.closest("[data-user-id]")?.dataset.userId;

    if (action === "delete") deleteUser(userId);
    if (action === "edit")   editUser(userId);
});
```

### Custom Events

```js
// Create and dispatch
const event = new CustomEvent("userLoggedIn", {
    detail: { userId: 42, email: "alice@example.com" },
    bubbles: true,
    cancelable: true
});
document.dispatchEvent(event);
element.dispatchEvent(event);

// Listen
document.addEventListener("userLoggedIn", (e) => {
    console.log("User logged in:", e.detail.email);
});

// Simple event (no detail)
element.dispatchEvent(new Event("change", { bubbles: true }));
```

---

## Window and Location

```js
// Window dimensions
window.innerWidth    // viewport width
window.innerHeight   // viewport height
window.outerWidth    // browser window width
window.outerHeight   // browser window height
window.devicePixelRatio  // screen pixel density (1=normal, 2=retina)

// Scroll
window.scrollX       // horizontal scroll position
window.scrollY       // vertical scroll position
window.scrollTo(0, 0)                     // scroll to top
window.scrollTo({ top: 500, behavior: "smooth" })
window.scrollBy(0, 100)                   // scroll relative to current

// Location
window.location.href        // full URL
window.location.protocol    // "https:"
window.location.host        // "example.com:8080"
window.location.hostname    // "example.com"
window.location.port        // "8080"
window.location.pathname    // "/path/to/page"
window.location.search      // "?key=value"
window.location.hash        // "#section"
window.location.origin      // "https://example.com"

window.location.assign("https://example.com")   // navigate (adds to history)
window.location.replace("https://example.com")  // navigate (no history entry)
window.location.reload()                         // reload page

// URLSearchParams — parse/build query strings
const params = new URLSearchParams(window.location.search);
params.get("page")                // "1"
params.getAll("tags")             // ["a", "b"]
params.has("sort")                // true/false
params.set("page", "2")
params.append("tag", "new")
params.delete("sort")
params.toString()                 // "page=2&tag=new"
[...params.entries()]             // [["page","2"], ["tag","new"]]

const url = new URL("https://example.com/path?foo=bar#section");
url.pathname    // "/path"
url.searchParams.get("foo")  // "bar"
url.hash        // "#section"

// History
history.back()
history.forward()
history.go(-2)
history.pushState({ data: "value" }, "", "/new-path")    // add to history
history.replaceState({ data: "value" }, "", "/new-path") // replace current entry
window.addEventListener("popstate", (e) => {
    console.log("State:", e.state);
    console.log("URL:", location.pathname);
});
```

---

## Storage

```js
// localStorage — persists across sessions
localStorage.setItem("key", "value")
localStorage.setItem("user", JSON.stringify({ id: 1, name: "Alice" }))
localStorage.getItem("key")                      // "value" or null
JSON.parse(localStorage.getItem("user"))         // { id: 1, name: "Alice" }
localStorage.removeItem("key")
localStorage.clear()                             // remove all
localStorage.length                              // number of items
localStorage.key(0)                              // key name at index 0
Object.keys(localStorage)                        // all keys

// sessionStorage — cleared when tab is closed
// Same API as localStorage
sessionStorage.setItem("key", "value")
sessionStorage.getItem("key")
sessionStorage.removeItem("key")
sessionStorage.clear()

// Storage events — when another tab changes storage
window.addEventListener("storage", (e) => {
    e.key             // key that changed
    e.newValue        // new value (null if removed)
    e.oldValue        // previous value
    e.storageArea     // localStorage or sessionStorage
    e.url             // URL of the document that made the change
});
```

---

## Cookies

```js
// Set
document.cookie = "name=Alice";
document.cookie = "name=Alice; expires=Fri, 31 Dec 2024 23:59:59 GMT";
document.cookie = "name=Alice; max-age=3600";          // 1 hour in seconds
document.cookie = "name=Alice; path=/; secure; samesite=strict";
document.cookie = `token=${value}; max-age=${7*24*3600}; path=/; samesite=lax`;

// Read — document.cookie returns ALL cookies as one string
document.cookie  // "name=Alice; theme=dark; session=abc123"

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

// Delete — set max-age to 0 (or past expiry date)
document.cookie = "name=; max-age=0; path=/";
```

---

## Fetch API — Browser

```js
// GET
const response = await fetch("https://api.example.com/users");
if (!response.ok) throw new Error(`HTTP ${response.status}`);

const users = await response.json();
const text  = await response.text();
const blob  = await response.blob();      // images, files
const buffer= await response.arrayBuffer();
const form  = await response.formData();

// Response properties
response.ok          // true if status 200-299
response.status      // 200, 404, 500, etc.
response.statusText  // "OK", "Not Found", etc.
response.headers     // Headers object
response.url         // final URL (after redirects)
response.redirected  // true if redirected

response.headers.get("Content-Type")
response.headers.has("X-Custom")
[...response.headers.entries()]

// POST with JSON
const created = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Alice", email: "a@b.com" })
});

// POST with FormData (file upload)
const formData = new FormData();
formData.append("name", "Alice");
formData.append("avatar", fileInput.files[0]);
const res = await fetch("/api/upload", { method: "POST", body: formData });
// Don't set Content-Type — browser sets it with boundary automatically

// Request options
fetch(url, {
    method:      "GET",
    headers:     { "Authorization": "Bearer token" },
    body:        null,
    mode:        "cors",         // "cors" | "no-cors" | "same-origin"
    credentials: "same-origin",  // "omit" | "same-origin" | "include" (cookies)
    cache:       "default",      // "no-cache" | "reload" | "force-cache"
    redirect:    "follow",       // "follow" | "manual" | "error"
    referrer:    "about:client",
    signal:      controller.signal  // AbortController
});
```

---

## Timers and Animation

```js
// setTimeout
const id = setTimeout(callback, 1000);
clearTimeout(id);

// setInterval
const id = setInterval(callback, 1000);
clearInterval(id);

// requestAnimationFrame — for smooth animations (synced with browser repaint ~60fps)
function animate(timestamp) {
    // timestamp = ms since page load
    element.style.left = (timestamp / 10) % 300 + "px";
    requestAnimationFrame(animate);   // keep animating
}
const rafId = requestAnimationFrame(animate);
cancelAnimationFrame(rafId);   // stop

// IntersectionObserver — detect when element enters/leaves viewport
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);  // stop observing once visible
        }
    });
}, {
    root:       null,          // null = viewport
    rootMargin: "0px 0px -100px 0px",  // shrink the root
    threshold:  0.1            // trigger when 10% visible
});
observer.observe(document.querySelector(".lazy-image"));

// MutationObserver — detect DOM changes
const mutationObs = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        if (m.type === "childList") console.log("Children changed");
        if (m.type === "attributes") console.log("Attribute:", m.attributeName);
    });
});
mutationObs.observe(element, {
    childList:  true,   // watch for added/removed children
    attributes: true,   // watch for attribute changes
    subtree:    true,   // watch all descendants
    characterData: true // watch text content changes
});
mutationObs.disconnect();

// ResizeObserver — detect element size changes
const resizeObs = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log(`Size changed: ${width}x${height}`);
    }
});
resizeObs.observe(element);
resizeObs.unobserve(element);
resizeObs.disconnect();
```

---

## Other Web APIs

```js
// ── Clipboard ──────────────────────────────────────────────────────────────
await navigator.clipboard.writeText("Copy this text");
const text = await navigator.clipboard.readText();

// ── Geolocation ───────────────────────────────────────────────────────────
navigator.geolocation.getCurrentPosition(
    (position) => {
        position.coords.latitude
        position.coords.longitude
        position.coords.accuracy
    },
    (error) => console.error(error.message),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
);

const watchId = navigator.geolocation.watchPosition(callback);
navigator.geolocation.clearWatch(watchId);

// ── Notifications ─────────────────────────────────────────────────────────
const permission = await Notification.requestPermission();  // "granted"|"denied"|"default"
if (permission === "granted") {
    new Notification("Hello!", {
        body: "This is a notification",
        icon: "/icon.png"
    });
}

// ── Web Workers ───────────────────────────────────────────────────────────
const worker = new Worker("worker.js");
worker.postMessage({ data: [1, 2, 3, 4, 5] });
worker.onmessage = (e) => console.log("Result:", e.data);
worker.onerror   = (e) => console.error("Worker error:", e.message);
worker.terminate();

// worker.js (runs in separate thread):
// self.onmessage = (e) => {
//     const result = e.data.data.reduce((a, b) => a + b, 0);
//     self.postMessage(result);
// };

// ── Service Workers ───────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("SW registered:", reg.scope);
}

// ── WebSocket ─────────────────────────────────────────────────────────────
const ws = new WebSocket("wss://echo.websocket.events");
ws.onopen    = ()  => ws.send("Hello Server!");
ws.onmessage = (e) => console.log("Received:", e.data);
ws.onerror   = (e) => console.error("WS error");
ws.onclose   = (e) => console.log("Closed:", e.code, e.reason);
ws.send("message");
ws.close(1000, "Done");
ws.readyState  // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED

// ── MediaDevices ──────────────────────────────────────────────────────────
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
videoEl.srcObject = stream;

// ── Fullscreen ────────────────────────────────────────────────────────────
document.documentElement.requestFullscreen();
document.exitFullscreen();
document.fullscreenElement   // current fullscreen element or null
document.addEventListener("fullscreenchange", () => { });

// ── Page Visibility ───────────────────────────────────────────────────────
document.hidden                // true if tab is not visible
document.visibilityState       // "visible" | "hidden" | "prerender"
document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideo();
    else playVideo();
});

// ── Online / Offline ──────────────────────────────────────────────────────
navigator.onLine   // true if connected
window.addEventListener("online",  () => console.log("Back online"));
window.addEventListener("offline", () => console.log("Gone offline"));
```

---

## Summary

- Use `querySelector` / `querySelectorAll` — they work with any CSS selector and are the modern standard.
- `textContent` is safer than `innerHTML` for inserting user-provided content — no XSS risk.
- Use event delegation (one listener on a parent) instead of listeners on every child.
- `addEventListener` supports an options object: `{ once, passive, capture, signal }`.
- `localStorage` persists across sessions; `sessionStorage` is cleared when the tab closes.
- `getBoundingClientRect()` gives element position relative to the viewport.
- `requestAnimationFrame` is the right way to animate — it syncs with the browser's repaint cycle.
- `IntersectionObserver`, `MutationObserver`, and `ResizeObserver` are efficient alternatives to scroll/resize event listeners.
