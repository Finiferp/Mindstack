---
title: "Browser Storage & Modern APIs"
sidebar_label: "Browser Storage & APIs"
sidebar_position: 25
---

# Browser Storage & Modern APIs

A thorough reference for browser-side storage mechanisms, the IndexedDB API, the History API, the Clipboard API, and other Web Platform APIs that W3Schools covers.

---

## localStorage and sessionStorage — Full Reference

Both implement the same `Storage` interface. The difference is scope: `localStorage` persists indefinitely; `sessionStorage` is cleared when the tab closes.

```js
// ── Writing ────────────────────────────────────────────────────────────────
localStorage.setItem("theme", "dark");
localStorage.setItem("user", JSON.stringify({ id: 1, name: "Alice" }));
localStorage.setItem("count", "42");          // values are ALWAYS strings

// ── Reading ────────────────────────────────────────────────────────────────
localStorage.getItem("theme");                 // "dark" or null if missing
localStorage.getItem("missing");               // null

const user = JSON.parse(localStorage.getItem("user") ?? "null");

// Safe read with default
function getItem(key, defaultValue = null) {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    try { return JSON.parse(item); }
    catch { return item; }          // return raw string if not JSON
}

// ── Removing ───────────────────────────────────────────────────────────────
localStorage.removeItem("theme");              // remove one key
localStorage.clear();                          // remove ALL keys

// ── Iterating ──────────────────────────────────────────────────────────────
localStorage.length;                           // number of items
localStorage.key(0);                           // key name at index 0

// All keys
Object.keys(localStorage)
Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))

// All entries
Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, i) => {
        const key = localStorage.key(i);
        return [key, localStorage.getItem(key)];
    })
)

// ── Storage event (cross-tab communication) ─────────────────────────────────
// Fires in OTHER tabs when localStorage changes (NOT the tab that made the change)
window.addEventListener("storage", (event) => {
    event.key;          // changed key (null if clear() was called)
    event.oldValue;     // previous value (null if new key)
    event.newValue;     // new value (null if key was removed)
    event.storageArea;  // localStorage or sessionStorage
    event.url;          // URL of tab that made the change

    if (event.key === "theme") {
        applyTheme(event.newValue);   // sync theme across tabs
    }
});

// ── sessionStorage (same API, different scope) ─────────────────────────────
sessionStorage.setItem("formDraft", JSON.stringify(formData));
sessionStorage.getItem("formDraft");
sessionStorage.removeItem("formDraft");
sessionStorage.clear();
sessionStorage.length;
```

### Storage Size Limits and Errors

```js
// localStorage limit is typically 5-10MB per origin
// Always handle QuotaExceededError

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
            console.warn("Storage quota exceeded. Clearing old data...");
            localStorage.clear();
            try { localStorage.setItem(key, value); return true; }
            catch { return false; }
        }
        return false;
    }
}

// Check available space (approximate)
function getStorageSize() {
    let size = 0;
    for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            size += (localStorage.getItem(key)?.length ?? 0) + key.length;
        }
    }
    return (size * 2) / 1024;  // approximate KB (UTF-16 = 2 bytes per char)
}
```

---

## Cookies — Full Reference

```js
// ── Setting a cookie ────────────────────────────────────────────────────────
// Syntax: key=value; options
document.cookie = "name=Alice";
document.cookie = "name=Alice Smith";          // no need to encode spaces in value
document.cookie = "name=" + encodeURIComponent("Alice & Bob");  // encode special chars

// With expiry
document.cookie = "name=Alice; max-age=3600";          // 1 hour in seconds
document.cookie = "name=Alice; max-age=" + (7 * 24 * 3600); // 7 days
document.cookie = "name=Alice; expires=Fri, 31 Dec 2024 23:59:59 GMT";

// With path — cookie only sent for this path and below
document.cookie = "pref=dark; path=/";           // available everywhere
document.cookie = "pref=dark; path=/admin";      // only for /admin/*

// With domain
document.cookie = "id=1; domain=.example.com";   // subdomains too
document.cookie = "id=1; domain=example.com";    // only this domain

// Security flags
document.cookie = "session=abc; secure";          // HTTPS only
document.cookie = "session=abc; HttpOnly";        // not accessible via JS (server-set only)
document.cookie = "session=abc; SameSite=Strict"; // only sent for same-site requests
document.cookie = "session=abc; SameSite=Lax";   // sent for cross-site GET (default)
document.cookie = "session=abc; SameSite=None; Secure"; // cross-site (requires Secure)

// ── Reading cookies ────────────────────────────────────────────────────────
document.cookie  // "name=Alice; theme=dark; session=xyz" — all as one string!

// Parse a specific cookie
function getCookie(name) {
    const cookies = document.cookie.split("; ");
    const cookie  = cookies.find(c => c.startsWith(name + "="));
    return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}
getCookie("name");   // "Alice"

// Parse all cookies into object
function getAllCookies() {
    return Object.fromEntries(
        document.cookie.split("; ")
            .filter(Boolean)
            .map(c => {
                const [key, ...val] = c.split("=");
                return [key, decodeURIComponent(val.join("="))];
            })
    );
}

// ── Deleting a cookie ──────────────────────────────────────────────────────
// Set max-age=0 (or past expiry) — MUST match path and domain
document.cookie = "name=; max-age=0";
document.cookie = "name=; max-age=0; path=/; domain=example.com";
document.cookie = "name=; expires=Thu, 01 Jan 1970 00:00:00 GMT";

// ── Cookie Store API (modern, async) ──────────────────────────────────────
// Available in modern browsers and service workers
const cookie = await cookieStore.get("name");
cookie.name;        // "name"
cookie.value;       // "Alice"
cookie.expires;     // timestamp or null
cookie.secure;      // boolean
cookie.sameSite;    // "strict" | "lax" | "none"

await cookieStore.set("theme", "dark");
await cookieStore.set({ name: "session", value: "abc", maxAge: 3600, secure: true });
await cookieStore.delete("session");

const all = await cookieStore.getAll();

// Watch for changes
cookieStore.addEventListener("change", (event) => {
    event.changed.forEach(c => console.log("Changed:", c.name));
    event.deleted.forEach(c => console.log("Deleted:", c.name));
});
```

---

## IndexedDB — Complete Reference

IndexedDB is a low-level async database in the browser. It stores large amounts of structured data including files and blobs.

```js
// Open (or create) a database
const request = indexedDB.open("MyDatabase", 1);  // name, version

request.onerror = (event) => {
    console.error("Database error:", event.target.error);
};

request.onupgradeneeded = (event) => {
    // Runs when DB is created or version is upgraded
    const db = event.target.result;

    // Create object stores (like tables)
    const userStore = db.createObjectStore("users", {
        keyPath:       "id",          // primary key field
        autoIncrement: true           // auto-generate id
    });

    // Create indexes for searching
    userStore.createIndex("email",     "email",     { unique: true });
    userStore.createIndex("role",      "role",      { unique: false });
    userStore.createIndex("createdAt", "createdAt", { unique: false });

    // Compound index
    userStore.createIndex("name_email", ["name", "email"], { unique: false });

    const postStore = db.createObjectStore("posts", { keyPath: "id", autoIncrement: true });
    postStore.createIndex("userId", "userId", { unique: false });
};

request.onsuccess = (event) => {
    const db = event.target.result;
    // Now use the db
};

// ── Promise wrapper (much cleaner) ─────────────────────────────────────────
function openDB(name, version, { upgrade } = {}) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(name, version);
        req.onerror         = () => reject(req.error);
        req.onsuccess        = () => resolve(req.result);
        req.onupgradeneeded = (e) => upgrade?.(e.target.result, e.oldVersion);
    });
}

function transaction(db, stores, mode = "readonly") {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
        tx.onabort    = () => reject(new Error("Transaction aborted"));
        resolve(tx);
    });
}

function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror   = () => reject(request.error);
    });
}

// ── Full CRUD with clean API ───────────────────────────────────────────────
const db = await openDB("MyDatabase", 2, {
    upgrade(db, oldVersion) {
        if (oldVersion < 1) {
            const store = db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
            store.createIndex("email", "email", { unique: true });
        }
        if (oldVersion < 2) {
            // Version 2 migration — add new index
            const store = db.transaction.objectStore("users");
            store.createIndex("role", "role", { unique: false });
        }
    }
});

// Add a record
const id = await idbRequest(
    db.transaction("users", "readwrite")
      .objectStore("users")
      .add({ name: "Alice", email: "alice@example.com", role: "admin", createdAt: new Date() })
);

// Get by key
const user = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .get(1)
);

// Get by index
const alice = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .index("email")
      .get("alice@example.com")
);

// Get all
const allUsers = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .getAll()
);

// Get all by index
const admins = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .index("role")
      .getAll("admin")
);

// Get count
const total = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .count()
);

// Update (put = add or update)
await idbRequest(
    db.transaction("users", "readwrite")
      .objectStore("users")
      .put({ id: 1, name: "Alice Smith", email: "alice@example.com", role: "admin", createdAt: new Date() })
);

// Delete
await idbRequest(
    db.transaction("users", "readwrite")
      .objectStore("users")
      .delete(1)
);

// ── Cursor — iterate through records ────────────────────────────────────────
async function iterateUsers(db, callback) {
    return new Promise((resolve, reject) => {
        const request = db
            .transaction("users")
            .objectStore("users")
            .openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                callback(cursor.value);
                cursor.continue();      // move to next record
            } else {
                resolve();              // done
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// ── Range queries ──────────────────────────────────────────────────────────
const range = IDBKeyRange.only(42);            // exactly 42
const range2 = IDBKeyRange.lowerBound(10);     // >= 10
const range3 = IDBKeyRange.upperBound(100);    // <= 100
const range4 = IDBKeyRange.bound(10, 100);     // 10 to 100 inclusive
const range5 = IDBKeyRange.bound(10, 100, true, true); // 10 < x < 100 exclusive

const users10to100 = await idbRequest(
    db.transaction("users")
      .objectStore("users")
      .getAll(IDBKeyRange.bound(10, 100))
);

// ── Use idb library for much cleaner API ──────────────────────────────────
// npm install idb
import { openDB } from "idb";

const db2 = await openDB("MyDB", 1, {
    upgrade(db) {
        db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
    }
});

await db2.add("users", { name: "Alice", email: "alice@example.com" });
const user2 = await db2.get("users", 1);
const all2  = await db2.getAll("users");
await db2.put("users", { id: 1, name: "Alice Smith", email: "alice@example.com" });
await db2.delete("users", 1);
const count2 = await db2.count("users");
await db2.clear("users");
```

---

## History API

```js
// ── Reading history state ──────────────────────────────────────────────────
history.length          // number of entries in history
history.scrollRestoration  // "auto" | "manual"
history.state           // current state object

// ── Navigation ────────────────────────────────────────────────────────────
history.back()          // go back one step
history.forward()       // go forward one step
history.go(0)           // reload current page
history.go(-1)          // same as back()
history.go(2)           // go forward 2 steps
history.go(-3)          // go back 3 steps

// ── Manipulating history ───────────────────────────────────────────────────
// pushState — add new entry to history stack (changes URL, no page reload)
history.pushState(
    { userId: 42, page: "profile" },  // state object (serializable)
    "",                                // title (mostly ignored by browsers)
    "/users/42"                        // new URL (must be same origin)
);

// replaceState — replace current entry (no new stack entry)
history.replaceState(
    { page: "home" },
    "",
    "/"
);

// ── popstate event — fires when user navigates back/forward ───────────────
window.addEventListener("popstate", (event) => {
    console.log("Location:", window.location.href);
    console.log("State:", event.state);
    // Restore UI based on state
    if (event.state?.userId) {
        loadUserProfile(event.state.userId);
    }
});

// ── Full SPA router pattern ────────────────────────────────────────────────
const routes = {
    "/":        renderHome,
    "/about":   renderAbout,
    "/contact": renderContact
};

function navigate(path) {
    history.pushState({ path }, "", path);
    render(path);
}

function render(path) {
    const handler = routes[path] ?? render404;
    document.querySelector("#app").innerHTML = handler();
}

// Initial render
render(location.pathname);

// Handle browser back/forward
window.addEventListener("popstate", (e) => render(location.pathname));

// Intercept link clicks for SPA navigation
document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.host !== location.host) return;   // external link — let it navigate
    e.preventDefault();
    navigate(link.pathname);
});
```

---

## Clipboard API

```js
// ── Modern Clipboard API (requires HTTPS or localhost) ─────────────────────

// Write text
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log("Copied!");
    } catch (err) {
        console.error("Copy failed:", err);
        fallbackCopy(text);
    }
}

// Read text
async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        return text;
    } catch (err) {
        console.error("Paste failed:", err);
        return null;
    }
}

// Write multiple formats (images, HTML, text)
async function copyRichContent() {
    const html = "<b>Hello World</b>";
    const text = "Hello World";
    const item  = new ClipboardItem({
        "text/html":  new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
    });
    await navigator.clipboard.write([item]);
}

// Read clipboard items
async function readClipboard() {
    const items = await navigator.clipboard.read();
    for (const item of items) {
        if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            console.log(await blob.text());
        }
        if (item.types.includes("image/png")) {
            const blob = await item.getType("image/png");
            const url  = URL.createObjectURL(blob);
            document.querySelector("img").src = url;
        }
    }
}

// ── Legacy fallback (document.execCommand) ─────────────────────────────────
function fallbackCopy(text) {
    const textarea     = document.createElement("textarea");
    textarea.value     = text;
    textarea.style.position = "fixed";
    textarea.style.opacity  = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand("copy");
    } finally {
        document.body.removeChild(textarea);
    }
}

// ── Clipboard events ───────────────────────────────────────────────────────
document.addEventListener("copy", (event) => {
    const selection = window.getSelection()?.toString();
    if (selection) {
        event.clipboardData.setData("text/plain", selection.toUpperCase());
        event.preventDefault();  // override default copy behavior
    }
});

document.addEventListener("paste", (event) => {
    const text = event.clipboardData.getData("text/plain");
    const html  = event.clipboardData.getData("text/html");
    const items = event.clipboardData.items;
    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            handleImagePaste(file);
        }
    }
    event.preventDefault();
});

document.addEventListener("cut", (event) => {
    event.clipboardData.setData("text/plain", getSelectedText());
    deleteSelectedText();
    event.preventDefault();
});
```

---

## Drag and Drop API — Complete

```js
// ── Making elements draggable ──────────────────────────────────────────────
// HTML: <div draggable="true" id="draggable">Drag me</div>

const draggable = document.querySelector("#draggable");

draggable.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "move";   // "copy"|"move"|"link"|"copyMove"|"all"|"none"
    event.dataTransfer.setData("text/plain", "item-id-42");
    event.dataTransfer.setData("application/json", JSON.stringify({ id: 42, name: "Item" }));

    // Custom drag image
    const img = new Image();
    img.src = "/drag-icon.png";
    event.dataTransfer.setDragImage(img, 10, 10);  // image, x offset, y offset

    draggable.classList.add("dragging");
});

draggable.addEventListener("drag", (event) => {
    // Fires continuously while dragging
});

draggable.addEventListener("dragend", (event) => {
    draggable.classList.remove("dragging");
    if (event.dataTransfer.dropEffect === "move") {
        draggable.remove();   // remove from original location on move
    }
});

// ── Drop zone ──────────────────────────────────────────────────────────────
const dropZone = document.querySelector("#drop-zone");

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();                       // REQUIRED to allow drop
    event.dataTransfer.dropEffect = "move";
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (event) => {
    // Only fire if leaving the drop zone entirely (not entering a child)
    if (!dropZone.contains(event.relatedTarget)) {
        dropZone.classList.remove("drag-over");
    }
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");

    const text     = event.dataTransfer.getData("text/plain");
    const jsonData = event.dataTransfer.getData("application/json");
    const files    = event.dataTransfer.files;     // dropped files

    if (jsonData) {
        const item = JSON.parse(jsonData);
        handleItemDrop(item, event.clientX, event.clientY);
    }

    // Handle file drops
    for (const file of files) {
        console.log("Dropped file:", file.name, file.type, file.size);
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.querySelector("img").src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
});

// ── DataTransfer properties ────────────────────────────────────────────────
event.dataTransfer.dropEffect      // "copy"|"move"|"link"|"none"
event.dataTransfer.effectAllowed   // allowed operations
event.dataTransfer.files           // FileList of dropped files
event.dataTransfer.items           // DataTransferItemList
event.dataTransfer.types           // array of data types set
```

---

## Screen and Display APIs

```js
// ── Screen object ──────────────────────────────────────────────────────────
screen.width           // total screen width in pixels
screen.height          // total screen height
screen.availWidth      // available width (excluding taskbar, etc.)
screen.availHeight
screen.colorDepth      // bit depth (24 or 32)
screen.pixelDepth      // same as colorDepth
screen.orientation.type   // "portrait-primary"|"landscape-primary"|etc.
screen.orientation.angle  // 0, 90, 180, 270

// Orientation change
screen.orientation.addEventListener("change", () => {
    console.log("Orientation:", screen.orientation.type);
});

// Lock orientation (mobile)
await screen.orientation.lock("portrait");

// ── devicePixelRatio ──────────────────────────────────────────────────────
window.devicePixelRatio  // 1 = normal, 2 = retina, 3 = high-DPI

// Detect DPI change
const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
mediaQuery.addEventListener("change", () => {
    console.log("DPI changed to:", window.devicePixelRatio);
});

// ── Media Queries in JS ────────────────────────────────────────────────────
const mq = window.matchMedia("(max-width: 768px)");
mq.matches   // true/false
mq.media     // "(max-width: 768px)"

mq.addEventListener("change", (event) => {
    if (event.matches) console.log("Mobile!");
    else               console.log("Desktop!");
});

// Common breakpoints
const isMobile  = window.matchMedia("(max-width: 639px)").matches;
const isTablet  = window.matchMedia("(min-width: 640px) and (max-width: 1023px)").matches;
const isDarkMode= window.matchMedia("(prefers-color-scheme: dark)").matches;
const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isHighContrast  = window.matchMedia("(prefers-contrast: high)").matches;
const isTouchDevice   = window.matchMedia("(pointer: coarse)").matches;
```

---

## Navigator and Browser Detection

```js
// ── Navigator object ──────────────────────────────────────────────────────
navigator.userAgent      // full UA string (for analytics, avoid for feature detection)
navigator.language       // preferred language: "en-US", "fr-FR"
navigator.languages      // all preferred: ["en-US", "en", "fr"]
navigator.platform       // deprecated — avoid
navigator.onLine         // true if browser thinks it's online
navigator.cookieEnabled  // true if cookies are enabled
navigator.maxTouchPoints // max simultaneous touch points (0 = no touch)
navigator.hardwareConcurrency  // number of logical CPU cores
navigator.deviceMemory   // GB of RAM (approximate, rounded)
navigator.connection     // NetworkInformation API

// ── Network Information API ───────────────────────────────────────────────
const conn = navigator.connection;
conn.effectiveType   // "slow-2g"|"2g"|"3g"|"4g"
conn.type            // "wifi"|"cellular"|"ethernet"|"none"|"unknown"
conn.downlink        // Mbps
conn.rtt             // round-trip time in ms
conn.saveData        // true if user enabled data saver

navigator.connection.addEventListener("change", () => {
    console.log("Network changed:", navigator.connection.effectiveType);
});

// ── Battery Status API ────────────────────────────────────────────────────
const battery = await navigator.getBattery();
battery.level           // 0 to 1
battery.charging        // boolean
battery.chargingTime    // seconds until full (Infinity if not charging)
battery.dischargingTime // seconds until empty

battery.addEventListener("levelchange",    () => console.log("Level:", battery.level));
battery.addEventListener("chargingchange", () => console.log("Charging:", battery.charging));

// ── Share API ─────────────────────────────────────────────────────────────
if (navigator.share) {
    await navigator.share({
        title: "Check this out!",
        text:  "A great article I found",
        url:   "https://example.com/article"
    });
}

// Share a file
if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
        files:  [file],
        title:  "My Image",
        text:   "Here's an image for you"
    });
}

// ── Vibration API (mobile) ────────────────────────────────────────────────
navigator.vibrate(200);               // vibrate for 200ms
navigator.vibrate([100, 50, 200]);    // vibrate, pause, vibrate
navigator.vibrate(0);                 // stop vibration

// ── Beacon API — send data on page unload ─────────────────────────────────
window.addEventListener("unload", () => {
    navigator.sendBeacon("/analytics/exit", JSON.stringify({
        userId:    currentUser.id,
        sessionId: sessionId,
        duration:  Date.now() - pageLoadTime
    }));
    // Unlike fetch(), sendBeacon() works even as the page is closing
});

// ── User Activation API ────────────────────────────────────────────────────
navigator.userActivation.isActive       // user interacted recently
navigator.userActivation.hasBeenActive  // user has ever interacted
```

---

## FormData and File APIs

```js
// ── FormData ──────────────────────────────────────────────────────────────
const form     = document.querySelector("form");
const formData = new FormData(form);          // from a form element
const formData = new FormData();              // empty

formData.append("name", "Alice");
formData.append("avatar", fileInput.files[0]);
formData.append("tags", "js");
formData.append("tags", "ts");               // multiple values for same key

formData.get("name");                         // "Alice"
formData.getAll("tags");                      // ["js", "ts"]
formData.has("name");                         // true
formData.delete("name");
formData.set("name", "Bob");                  // replace (vs append which adds)

for (const [key, value] of formData.entries()) {
    console.log(key, value);
}
formData.keys();
formData.values();

// Send with fetch (browser sets Content-Type + boundary automatically)
const res = await fetch("/upload", { method: "POST", body: formData });

// ── File object properties ─────────────────────────────────────────────────
const file = fileInput.files[0];
file.name           // "photo.jpg"
file.size           // bytes
file.type           // "image/jpeg"
file.lastModified   // timestamp
file.lastModifiedDate // Date object

// ── FileReader — read file contents ───────────────────────────────────────
const reader = new FileReader();

reader.readAsText(file);          // read as text string
reader.readAsDataURL(file);       // read as base64 data URL
reader.readAsArrayBuffer(file);   // read as ArrayBuffer (binary)
reader.readAsBinaryString(file);  // deprecated — use ArrayBuffer

reader.onload    = (e) => console.log("Result:", e.target.result);
reader.onerror   = (e) => console.error("Error:", e.target.error);
reader.onprogress= (e) => console.log("Progress:", e.loaded / e.total * 100, "%");
reader.onabort   = ()  => console.log("Aborted");

reader.abort();   // cancel the read

// ── Modern approach with File.text() / arrayBuffer() ──────────────────────
const text   = await file.text();
const buffer = await file.arrayBuffer();
const stream = file.stream();             // ReadableStream

// ── Blob (File extends Blob) ───────────────────────────────────────────────
const blob  = new Blob(["Hello, World!"], { type: "text/plain" });
const blob2 = new Blob([buffer],          { type: "image/png" });
const blob3 = new Blob([jsonString],      { type: "application/json" });

blob.size     // bytes
blob.type     // "text/plain"

// Slice a blob
const slice = blob.slice(0, 100);
const slice2= blob.slice(100, 200, "text/plain");

// Create download URL
const url = URL.createObjectURL(blob);
const a   = document.createElement("a");
a.href     = url;
a.download = "my-file.txt";
a.click();
URL.revokeObjectURL(url);   // release memory when done

// ── File System Access API (modern) ───────────────────────────────────────
// Open a file picker and read file
const [fileHandle] = await window.showOpenFilePicker({
    types: [{
        description: "Text Files",
        accept: { "text/plain": [".txt", ".md"] }
    }],
    multiple: false
});
const file2 = await fileHandle.getFile();
const text2 = await file2.text();

// Save a file
const saveHandle = await window.showSaveFilePicker({
    suggestedName: "output.txt",
    types: [{ description: "Text", accept: { "text/plain": [".txt"] } }]
});
const writable = await saveHandle.createWritable();
await writable.write("Content to save");
await writable.close();

// Pick a directory
const dirHandle = await window.showDirectoryPicker();
for await (const [name, entry] of dirHandle.entries()) {
    console.log(name, entry.kind);   // "file" or "directory"
}
```

---

## Summary

- `localStorage` persists across sessions; `sessionStorage` is per-tab. Both store strings only — serialize with `JSON.stringify`.
- Use the `storage` event to sync changes across tabs (fires only in OTHER tabs).
- Always handle `QuotaExceededError` when writing to storage.
- Cookies need `max-age` or `expires` to persist beyond the browser session. Use `secure`, `HttpOnly`, and `SameSite` in production.
- IndexedDB stores large structured data — use the `idb` library for a clean Promise-based API.
- `history.pushState()` changes the URL without reloading — essential for SPAs.
- The Clipboard API requires user gesture permission — call from a click handler, not on page load.
- `URL.createObjectURL(blob)` creates a temporary URL — always call `URL.revokeObjectURL()` when done to release memory.
- `navigator.sendBeacon()` sends data reliably on page unload — fetch() may be cancelled when the page closes.
