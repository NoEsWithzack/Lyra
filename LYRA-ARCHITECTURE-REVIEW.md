# Lyra — Architecture Review & Refactoring Strategy

**Prepared for:** Project Owner  
**Date:** March 2026  
**Scope:** Full codebase analysis of `server.js`, `dashboard.html`, `widget.html`, `ROADMAP.md`

---

## 1. Codebase Analysis Summary

Lyra is a self-hosted OBS music widget overlay powered by MPRIS/D-Bus on Linux. The current codebase consists of 3 functional files totaling ~2,450 lines: a Node.js server (364 lines), a dashboard SPA (1,067 lines), and a widget renderer (1,023 lines). The project is functional, well-designed visually, and clearly authored with care — but it has accumulated structural limitations that will compound as the roadmap progresses.

### What's Working Well

The project has several genuine strengths that should be preserved:

- **Product vision is sharp.** The ROADMAP is one of the best-organized feature specs I've seen for a project at this stage. Phase gates are realistic, and the tech decisions (Electron over Tauri, browser source over native OBS plugin) are pragmatic.
- **UX polish is high.** The theming system (8 themes, vinyl record CSS, glow system, notification animation) is remarkably refined for an early-stage project. The i18n system is already bilingual with tooltip support.
- **Server-side player prioritization is clever.** The MPRIS candidate ranking with dedicated music apps beating generic browser tabs is well-thought-out.
- **Plugin architecture has a viable skeleton.** The plugin loader scans a directory, validates exports, injects CSS — the foundation is there even though it's early.
- **WebSocket broadcast with deduplication** avoids unnecessary client updates.
- **Presets system** works end-to-end with server-backed persistence.

---

## 2. Architecture Evaluation

### 2.1 — Monolithic File Structure (Critical)

**Problem:** The entire application lives in 3 files. `dashboard.html` contains 309 lines of CSS, 155 lines of HTML, and 490 lines of JavaScript — all inline. `widget.html` is similarly structured at 1,023 lines. `server.js` mixes HTTP routing, D-Bus communication, external API calls, WebSocket management, caching, and file I/O into a single 364-line file.

**Why it matters:** Every change to any part of the system requires editing one of these monoliths. Two developers cannot work on dashboard styling and dashboard logic simultaneously without merge conflicts. The ROADMAP plans to add background customization, error reporting, onboarding tutorials, and plugin management — all of which would inflate these files further. By Phase 2, `dashboard.html` alone could exceed 3,000 lines.

**Current state vs. good practice:**

| Principle | Current | Target |
|---|---|---|
| Separation of concerns | CSS/HTML/JS all inline | Separate files per concern |
| Module boundaries | None — all global scope | ES modules or IIFE namespaces |
| File responsibility | 1 file = 1 entire layer | 1 file = 1 focused concern |

### 2.2 — Global State Soup (High)

**Problem:** Both `dashboard.html` and `widget.html` declare state as bare global variables. The dashboard uses `t`, `c`, `m`, `l`, `_lastPlayer`, `_selectedFont`, `_fontList`, `_filteredFonts`, `_fontPage`, `_fontDropTimer`, `_previewFontsLoaded` — all floating in window scope. The widget has `config`, `pos`, `dur`, `playing`, `currentTitle`, `currentArtist`, `_prevNotifTitle`, `_notifHideTimer`, `_notifExitTimer`, and `_loadedFonts` all as globals.

**Why it matters:** Any new feature that adds state risks colliding with existing variables. Plugin scripts injected into the page can accidentally overwrite these. Debugging requires tracing through the entire file to find where state is mutated. The single-letter variable names (`t`, `c`, `m`, `l`) are especially fragile — `l` is one typo away from `1`.

### 2.3 — Widget Theme Duplication (High)

**Problem:** The widget renderer duplicates track/artist/progress updates across every theme. The `updateUI()` function manually sets `innerText` for 4 parallel sets of elements: standard (`#track`, `#artist`, `#curr`, `#total`), macOS (`#macos-track`, `#macos-artist`, `#macos-curr`, `#macos-total`), Float (`#float-track`, `#float-artist`, `#float-curr`, `#float-total`), and Shell (`#sh-title-val`, `#sh-artist-val`, `#sh-curr`, `#sh-total`). The same pattern repeats in the progress tick interval, the WebSocket handler, and image sync.

**Why it matters:** Adding a new theme requires touching at least 5 different locations in `updateUI()`, plus the progress tick, plus the WebSocket handler. The Notification theme already demonstrates this problem — it has its own `#notif-track`, `#notif-artist`, `#notif-art` that must be synced separately. Each new theme multiplies the maintenance surface linearly. By theme #12, this function would be unreadable.

### 2.4 — Server.js Lacks Layered Architecture (Medium)

**Problem:** `server.js` combines Express route definitions, D-Bus interaction, HTTP client calls (iTunes API, Google Fonts API), WebSocket broadcasting, file I/O for presets, plugin loading, in-memory caching, and player matching logic in a single flat file.

**Why it matters:** Testing any single concern requires loading the entire server. The D-Bus connection (`dbus.sessionBus()`) is created eagerly at module load — making the server crash immediately on non-Linux systems or when D-Bus isn't available. The iTunes API art fetcher is tightly coupled to the broadcast loop. Adding the error reporting system from Section 7 of the ROADMAP would add yet another concern to this file.

### 2.5 — Hard-Coded Configuration (Medium)

**Problem:** Port `4640` is hard-coded in `server.js`. Theme OBS dimensions are duplicated in both `dashboard.html` (the `sizes` object in `update()`) and conceptually in the ROADMAP. The player priority list is a hard-coded array. The iTunes API endpoint and Google Fonts metadata URL are inline strings.

**Why it matters:** The ROADMAP explicitly calls for configurable ports (Phase 2.2 first-run checks). Changing any of these values requires editing source code rather than configuration.

### 2.6 — No Error Handling in Client-Server Communication (Medium)

**Problem:** The dashboard's `fetch()` calls have minimal error handling. `refreshPlayers()`, `syncPlayerToServer()`, and `loadPlugins()` silently swallow errors. The widget's WebSocket reconnects on close but doesn't surface connection issues to the user. The server has no centralized error handling — individual `try/catch` blocks log to console but don't notify clients.

**Why it matters:** The ROADMAP Section 7 specifies a full error reporting system with structured JSON logs and dashboard notifications. The current codebase has no foundation for this — it would need to be retrofitted across every async operation.

### 2.7 — CSS Architecture Lacks Namespacing (Low-Medium)

**Problem:** Widget CSS uses deeply nested combinator selectors like `#widget.glow:not(.t-gallery):not(.t-float):not(.t-macos):not(.t-shell):not(.c-canvas) #art`. Adding a new theme requires updating these exclusion lists. The glow system alone has 15+ rules that enumerate every theme/cover combination.

**Why it matters:** Every new theme added must be accounted for in the glow exclusion selectors. Missing one causes visual bugs. A theme-scoped CSS approach (where each theme opts _in_ to glow behavior rather than being excluded from a default) would scale much better.

---

## 3. Refactor Strategy

### Guiding Principles

1. **Incremental migration** — no big-bang rewrites. Each step produces a working system.
2. **Zero feature regression** — every theme, plugin, preset, and i18n string must work identically after each step.
3. **Phase 1 alignment** — prioritize refactors that directly enable ROADMAP Phase 1 features.
4. **Vanilla JS constraint respected** — the CONTRIBUTING.md states "no bundler, no frameworks." All improvements stay within this boundary.

### Phase R1 — Server Decomposition (High Impact, Low Risk)

**Goal:** Split `server.js` into focused modules that can be tested, extended, and understood independently.

```
src/
├── server.js              ← entry point (15 lines: imports, app.listen)
├── config.js              ← PORT, external URLs, player priority list
├── routes/
│   ├── fonts.js           ← GET /api/fonts + Google Fonts fetch/cache
│   ├── presets.js         ← GET/POST/DELETE /api/presets
│   ├── plugins.js         ← GET /api/plugins + loader
│   └── players.js         ← GET /api/players, POST /api/player
├── services/
│   ├── mpris.js           ← D-Bus connection, listMprisNames, getMprisData
│   ├── albumArt.js        ← iTunes API fetch + track-keyed cache
│   └── broadcast.js       ← WebSocket server, broadcastNow loop
└── utils/
    └── chromium.js        ← getCanonicalName, collapseChromiumInstances, playerMatches
```

**Implementation approach:**
- Extract each section marked with the `═══` comment banners into its own file
- Each route file exports a function that receives `app` (Express) and registers its routes
- `mpris.js` exports async functions; it does NOT create the bus at module level (lazy init instead)
- `config.js` reads from environment variables with defaults: `PORT = process.env.LYRA_PORT || 4640`
- Total lines of new code: ~0. This is pure extraction with `module.exports` wiring.

**Risk:** Near zero. The refactor is mechanical — cut, paste, wire. Verify by running the server and confirming all API routes respond identically.

### Phase R2 — Widget Theme Abstraction (High Impact, Medium Risk)

**Goal:** Eliminate the per-theme duplication in `updateUI()` and the progress tick by introducing a lightweight theme adapter pattern.

**Current problem (concrete example):** When a WebSocket message arrives with position data, the code updates:
```
currEl.innerText                                    = fmt(pos);
document.getElementById('macos-curr').innerText     = fmt(pos);
document.getElementById('sh-curr').innerText        = fmt(pos);
document.getElementById('float-curr').innerText     = fmt(pos);
```

**Proposed solution:** A theme registry where each theme declares its DOM mapping:

```javascript
// themes/registry.js
const THEMES = {
    compact: { track: '#track', artist: '#artist', curr: '#curr', total: '#total', barFill: '#bar-fill', art: '#art' },
    macos:   { track: '#macos-track', artist: '#macos-artist', curr: '#macos-curr', total: '#macos-total', barFill: '#macos-bar-fill', art: '#macos-art' },
    shell:   { track: '#sh-title-val', artist: '#sh-artist-val', curr: '#sh-curr', total: '#sh-total', barFill: null, art: null },
    float:   { track: '#float-track', artist: '#float-artist', curr: '#float-curr', total: '#float-total', barFill: '#float-bar-fill', art: '#float-art' },
    notif:   { track: '#notif-track', artist: '#notif-artist', curr: null, total: null, barFill: null, art: '#notif-art' },
};

// Standard themes (compact, boxy, gallery, neon) share the same selectors
['boxy', 'gallery', 'neon'].forEach(t => THEMES[t] = THEMES.compact);
```

Then `updateUI()` becomes:

```javascript
const map = THEMES[config.t] || THEMES.compact;
setText(map.track, title);
setText(map.artist, artist);
// ...where setText is a null-safe helper
```

And the progress tick simplifies from 8 lines to 3:

```javascript
setWidth(map.barFill, pct);
setText(map.curr, fmt(pos));
```

**Risk:** Medium. The DOM structure is preserved exactly; only the JS update path changes. Each theme must be visually verified after the change.

### Phase R3 — Dashboard State Management (Medium Impact, Low Risk)

**Goal:** Replace bare globals with a single state object and a centralized `update` dispatcher.

```javascript
const state = {
    theme: 'compact', cover: 'square', mode: 'dark', lang: 'en',
    accent: '#1db954', magic: false, glow: false, wglow: false,
    hostname: '', player: '', font: '', hidePaused: false,
};

function setState(partial) {
    Object.assign(state, partial);
    syncUI();         // update DOM active classes
    pushToWidget();   // postMessage to iframe
}
```

**Benefits:**
- `currentConfig()` becomes `() => ({ ...state })` — no more reading from 8 DOM elements
- Preset loading becomes `setState(presetConfig)` — one call instead of 12 `getElementById` lines
- The `reset()` function becomes `setState(DEFAULT_STATE)`
- Debugging: `console.log(state)` shows everything in one place

### Phase R4 — CSS Extraction (Medium Impact, Low Risk)

**Goal:** Move inline `<style>` blocks into external `.css` files served by Express static middleware (already configured).

```
public/
├── css/
│   ├── dashboard.css
│   ├── widget-base.css
│   ├── widget-compact.css
│   ├── widget-boxy.css
│   ├── widget-gallery.css
│   ├── widget-macos.css
│   ├── widget-shell.css
│   ├── widget-neon.css
│   ├── widget-float.css
│   ├── widget-notif.css
│   └── widget-glow.css
├── js/
│   ├── dashboard.js
│   └── widget.js
├── dashboard.html          ← now ~160 lines (pure HTML structure)
└── widget.html             ← now ~100 lines (pure HTML structure)
```

**Benefits:**
- Theme CSS files can be added/modified independently
- Browser caches CSS separately from HTML (performance win on reload)
- Plugin themes can reference the same CSS patterns
- Developers can work on `widget-shell.css` without touching any other file

### Phase R5 — Glow CSS Inversion (Low Impact, Low Risk)

**Goal:** Reverse the glow selector strategy from opt-out to opt-in.

**Current (fragile):**
```css
#widget.glow:not(.t-gallery):not(.t-float):not(.t-macos):not(.t-shell):not(.c-canvas) #art { ... }
```

**Proposed (scalable):**
```css
/* Base glow — themes that use standard #art get it for free */
.glow-target--art   { filter: drop-shadow(0 0 14px var(--acc)); }
.glow-target--box   { box-shadow: 0 0 18px 4px var(--acc); }
.glow-target--text  { text-shadow: 0 0 8px var(--acc), 0 0 20px var(--acc); }
```

Each theme's layout code applies the appropriate `glow-target--*` class to its art element. No exclusion lists. New themes automatically work correctly by choosing their glow target class.

---

## 4. Implementation Roadmap

### Recommended Order

| Step | Refactor | Effort | Risk | Enables |
|---|---|---|---|---|
| 1 | R1: Server decomposition | ~2 hours | Very Low | Error reporting (ROADMAP 1.5), testability, Phase 2 Electron |
| 2 | R4: CSS extraction | ~2 hours | Very Low | Theme plugin development, developer onboarding |
| 3 | R3: Dashboard state | ~1.5 hours | Low | Presets (cleaner), background customization (ROADMAP 1.4) |
| 4 | R2: Widget theme abstraction | ~3 hours | Medium | New theme development velocity, plugin themes |
| 5 | R5: Glow CSS inversion | ~1 hour | Low | Plugin theme glow support |

### What NOT to Do Right Now

- **Don't introduce a bundler.** The vanilla JS constraint is correct for this stage. A bundler adds toolchain complexity that doesn't pay off until the codebase exceeds ~20 files.
- **Don't switch to TypeScript.** Same reasoning — the migration cost isn't justified until Phase 2 when the Electron wrapper provides a natural migration point.
- **Don't abstract the D-Bus layer prematurely.** The ROADMAP plans alternative data sources in Phase 3. Abstracting now would be speculative. When Phase 3 arrives, the `services/mpris.js` module from R1 is already isolated and ready to sit behind an interface.
- **Don't rewrite the widget DOM structure.** The HTML is well-organized. The problem is the JS update path, not the markup.

---

## 5. Quick Wins (Can Ship Today)

These are zero-risk improvements that require no architectural changes:

**5.1 — Replace single-letter state variables in dashboard.** Rename `t → theme`, `c → cover`, `m → mode`, `l → lang`. A find-and-replace within the `<script>` block. Eliminates the risk of accidental shadowing and makes the code self-documenting.

**5.2 — Add `'use strict'` to server.js.** Catches accidental globals and silent assignment errors. One line at the top of the file.

**5.3 — Lazy D-Bus initialization.** Wrap `const bus = dbus.sessionBus()` in a function that creates the bus on first call and caches it. Prevents the server from crashing on startup if D-Bus is unavailable (relevant for Phase 2 Electron packaging where the app may start before the desktop session is ready).

**5.4 — Environment-based port.** Replace `const PORT = 4640` with `const PORT = parseInt(process.env.LYRA_PORT, 10) || 4640`. Unblocks the ROADMAP 2.2 port configuration requirement with one line.

**5.5 — Add `.gitignore` entries.** The project should ignore `node_modules/`, `presets.json` (user data), `build/`, and `*.AppImage`.

---

## 6. Risk Assessment

| Change | Breaks if... | Mitigation |
|---|---|---|
| Server decomposition | Module paths wrong | Verify all API routes with curl after each extraction |
| CSS extraction | Selector specificity changes | Copy CSS verbatim; diff rendered output in browser |
| State centralization | Event handler references stale variable | Keep setter functions (`setT`, `setC`) as thin wrappers |
| Theme abstraction | DOM selector mapping is wrong | Automated screenshot comparison for each theme |
| Glow inversion | A theme forgets to add glow class | Default glow class in base theme styles |

---

## 7. Summary

Lyra is a well-crafted product with a clear vision, constrained by an architecture that was appropriate at 500 lines but is now straining at 2,500. The five proposed refactoring phases are ordered by impact and safety. Each phase produces a fully working system. None require new dependencies, frameworks, or build tools.

The single most impactful change is **R1 (server decomposition)** because it directly enables the error reporting system, makes the codebase testable, and prepares the ground for the Phase 2 Electron migration. The single most satisfying change will be **R2 (widget theme abstraction)** because it transforms "add a theme" from a 5-location scavenger hunt into a one-object registration.

The codebase is in a good position. These aren't emergency repairs — they're investments that will pay off every time a new feature is added for the next 12 months.
