# Lyra — Project Handoff & Continuity Document

> **Purpose:** This document contains everything needed for an AI assistant (Google AI Studio, ChatGPT, or similar) to continue development on the Lyra project without prior context. Give this document + repository access to any AI and it can pick up exactly where development left off.

---

## 1. What Is Lyra

Lyra is a **self-hosted music widget overlay system for OBS** and live streaming software. It runs as a local Node.js server, reads currently playing track data via MPRIS/D-Bus (Linux), and displays it as a browser source in OBS. Streamers use it to show "Now Playing" information on their live streams.

**Repository:** https://github.com/NoEsWithzack/Lyra  
**Author:** Zack (@NoEsWithzack)  
**License:** MIT  
**Tech stack:** Node.js, Express, WebSocket, vanilla JS/CSS/HTML — no bundler, no frameworks  
**Platform:** Linux with D-Bus (Ubuntu 22.04+). Cross-platform planned for Phase 3.

---

## 2. Architecture Overview

```
server.js (30 lines)          ← Entry point, wires Express + WebSocket
├── src/config.js              ← Ports, URLs, constants (env overrides)
├── src/routes/
│   ├── fonts.js               ← GET /api/fonts (Google Fonts metadata cache)
│   ├── presets.js             ← CRUD /api/presets (JSON file storage)
│   ├── plugins.js             ← GET /api/plugins (scan ./plugins/ directory)
│   └── players.js            ← GET /api/players, POST /api/player
├── src/services/
│   ├── mpris.js               ← D-Bus MPRIS integration (lazy bus init)
│   ├── albumArt.js            ← iTunes API art fetch with track-keyed cache
│   ├── broadcast.js           ← WebSocket server + periodic broadcast loop
│   └── errors.js              ← Structured error logging + WS notification
└── src/utils/
    └── chromium.js            ← Chromium instance name helpers

dashboard.html                 ← Control panel (sidebar + live preview iframe)
├── css/dashboard.css          ← Dashboard styles with light/dark design tokens
└── js/dashboard.js            ← State management, i18n, fonts, presets, backgrounds

widget.html                    ← OBS browser source (all themes render here)
├── css/widget.css             ← All 8 theme styles + glow system + vinyl
└── js/widget.js               ← Theme display registry, WebSocket client, renderer
```

### Data Flow

1. `mpris.js` polls D-Bus every 1 second for track metadata
2. `broadcast.js` deduplicates and broadcasts JSON over WebSocket
3. `widget.js` receives JSON, updates DOM via the `DISPLAY_SETS` registry
4. Dashboard communicates with widget iframe via `postMessage` (UPDATE_CONFIG / WIDGET_READY)

### Key Design Decisions

- **No bundler, no frameworks.** Contributing guidelines mandate vanilla JS/CSS. This is intentional for an open-source project that wants zero toolchain barriers.
- **CSS-driven theme visibility.** All theme chrome elements (#shell-chrome, #macos-bar, etc.) are shown/hidden purely via CSS classes on `#widget` (`.t-shell`, `.t-macos`, etc.). No JS inline style toggling for display. This was a hard-learned lesson — earlier versions used JS display toggling which caused overlap bugs when switching themes.
- **DISPLAY_SETS registry in widget.js.** Instead of manually updating `#track`, `#macos-track`, `#float-track`, `#notif-track` separately, all theme element mappings live in a single array. Adding a new theme is one object entry.
- **Lazy D-Bus initialization.** The bus is created on first use, not at module load. This prevents crashes when D-Bus isn't available at server startup.
- **Iframe readiness tracking in dashboard.js.** The dashboard tracks `_iframeReady` and `_updatePending` to prevent lost postMessages during iframe reloads.

---

## 3. Current State (as of handoff)

### Completed Features

| Feature | Status | Notes |
|---|---|---|
| 8 Themes (Compact, Boxy, Gallery, macOS, Shell, Neon, Float, Alert) | ✅ Done | CSS-driven visibility |
| Cover modes (Square, Vinyl, None) | ✅ Done | Vinyl has spinning disc + tonearm |
| Light/Dark mode (widget + dashboard) | ✅ Done | Token-based theming |
| Magic Colors (accent from album art) | ✅ Done | Canvas pixel sampling |
| Cover Glow + Contrast Glow | ✅ Done | Opt-in CSS selectors per theme |
| Google Fonts selector | ✅ Done | Full library, infinite scroll |
| Presets system | ✅ Done | Server-backed JSON file |
| i18n (English + Spanish) | ✅ Done | Tooltips included |
| Player filter + priority | ✅ Done | Server-side + client safety net |
| Hide on Pause | ✅ Done | CSS-only toggle |
| Plugin scaffold | ✅ Done | Scans ./plugins/, injects CSS |
| Background customization | ✅ Done | 7 presets + custom upload |
| Error reporting system | ✅ Done | JSON logs + dashboard banner |
| Modular server architecture | ✅ Done | routes/, services/, utils/ |

### Pending (Phase 0 bugs)

| Bug | Description |
|---|---|
| 0.5 | Shell prompt: `:~$ ./user` part may have wrong color/weight vs hostname in some edge cases |
| 0.6 | Float (Chill) theme: verify 3-box visual separation in real OBS browser source |

### Not Yet Started

| Feature | Phase | Priority |
|---|---|---|
| Preset import/export (.lyrapreset files) | 1 | Medium |
| Widget opacity slider | 1 | Low |
| OS dark/light mode auto-follow | 1 | Low |
| Now Playing history log | 1 | Low |
| Electron app conversion | 2 | Core |
| First-run onboarding tutorial | 2 | Medium |
| Full plugin system (config panels, .lyraplugin ZIP) | 2 | Medium |
| Windows SMTC support | 3 | Core |
| Spotify Web API source | 3 | Medium |
| Community theme marketplace | 3 | Low |

See `ROADMAP.md` in the repository for the full specification of every feature.

---

## 4. File-by-File Reference

### server.js
Entry point. ~30 lines. Initializes error reporting, Express middleware, page routes, API route modules, and WebSocket server. The port reads from `LYRA_PORT` env var (default 4640).

### src/config.js
All hard-coded values extracted here: PORT, PRESETS_FILE path, PLUGINS_DIR path, external API URLs (Google Fonts, iTunes), MUSIC_APP_PRIORITY list, broadcast interval.

### src/services/mpris.js
All D-Bus interaction. Exports `listMprisNames()` and `getMprisData(selectedPlayer)`. The bus is lazy-initialized. Player priority scoring ranks dedicated music apps above generic browser tabs.

### src/services/broadcast.js
WebSocket server management. Exports `init(httpServer)`, `getSelectedPlayer()`, `setSelectedPlayer(player)`, `broadcastNow()`. Runs a 1-second interval that calls `getMprisData` → `resolveArt` → dedup → broadcast.

### src/services/albumArt.js
iTunes API integration. Track-keyed cache prevents redundant lookups. Falls back to iTunes when MPRIS artUrl is empty or a local `file://` path.

### src/services/errors.js
Structured error reporting per ROADMAP Section 7. Writes JSON reports to `~/.config/lyra/logs/`. Notifies the dashboard WebSocket with `{ type: 'ERROR_REPORT', code, filename }`. Registers global `uncaughtException` and `unhandledRejection` handlers.

### css/widget.css
All widget visual styling (~560 lines). Key sections:
- Theme styles: `.t-compact`, `.t-boxy`, `.t-gallery`, `.t-macos`, `.t-shell`, `.t-neon`, `.t-float`, `.t-notif`
- Cover modes: `.c-square`, `.c-vinyl`, `.c-none`
- Glow system: opt-in selectors per theme (no `:not()` exclusion lists)
- Theme Chrome Visibility: CSS rules that show/hide `#shell-chrome`, `#macos-bar`, etc. based on `.t-*` class
- Notification animation: `.notif-in` / `.notif-out` keyframes

### js/widget.js
Widget renderer (~400 lines). Key patterns:
- `DISPLAY_SETS` array: maps each theme to its DOM element IDs for track, artist, progress, art
- `setLayout()`: minimal — only clears notif animation and builds waveform. All visibility is CSS.
- `updateUI()`: sets className on `#widget`, loops DISPLAY_SETS, handles shell-specific rendering
- `connectWS()`: WebSocket client with reconnect and player filter safety net

### js/dashboard.js
Dashboard logic (~600 lines). Key patterns:
- `state` object: `{ theme, cover, mode, lang }` — replaces old single-letter globals
- `update()`: builds query string, syncs to iframe via postMessage (or reloads iframe on player change)
- `_iframeReady` / `_updatePending`: prevents lost postMessages during iframe reload
- Background management: 7 CSS presets + custom upload to localStorage
- Error banner: WebSocket listener shows dismissible notification on error reports
- i18n: `dashI18n` object with `en`/`es` translations including tooltips

---

## 5. Conventions & Rules

### Code Style
- `'use strict'` in all JS files
- Vanilla JS only — no TypeScript, no React, no Vue, no bundler
- CSS uses design tokens (custom properties) for theming
- All DOM IDs use kebab-case: `#preview-box`, `#shell-chrome`, `#float-bar-fill`
- Theme classes use `t-` prefix: `.t-compact`, `.t-shell`
- Cover classes use `c-` prefix: `.c-vinyl`, `.c-none`

### Adding a New Theme
1. Add CSS rules in `css/widget.css` under a new `.t-<id>` section
2. If the theme uses custom chrome (like shell/macOS do), add `#widget .t-<id> #<chrome-element> { display: flex !important; }` and `#<chrome-element> { display: none; }` default
3. Add a `DISPLAY_SETS` entry in `js/widget.js` mapping track/artist/curr/total/barFill/art IDs
4. Add the theme button to `dashboard.html` with `onclick="setTheme('<id>',this)"`
5. Add OBS dimensions to `OBS_SIZES` in `js/dashboard.js`
6. Add glow rules to the opt-in selector lists in `css/widget.css` (glow system section)

### Adding a New Config Parameter
1. Add URL param parsing in `js/widget.js` config initialization
2. Add to `currentConfig()` in `js/dashboard.js`
3. Add to `update()` query string building in `js/dashboard.js`
4. Add to `loadPreset()` restore logic in `js/dashboard.js`
5. Add to `reset()` in `js/dashboard.js`
6. Add i18n entries for both `en` and `es` in `js/dashboard.js`

### Critical Pitfalls to Avoid
- **Never use `element.style.display = 'none'` for theme visibility.** Use CSS classes. This caused the worst bug in the project's history (all themes overlapping).
- **Never remove the `_iframeReady` tracking.** Without it, postMessages are silently lost during iframe reloads.
- **Don't add `:not()` exclusion selectors for glow.** Use opt-in `.glow.t-<theme>` selectors instead.
- **Shell theme `.sh-cmd` always uses JetBrains Mono** regardless of font selection. Don't override this.
- **Plugin CSS is injected at runtime.** Plugins loaded by `src/routes/plugins.js` get their CSS injected into widget `<head>` by `js/widget.js` `loadPluginStyles()`.

---

## 6. Development Workflow

### Running Locally
```bash
cd lyra
npm install
node server.js       # or: LYRA_PORT=8080 node server.js
```
Dashboard: http://localhost:4640  
Widget: http://localhost:4640/widget

### Testing Checklist
- [ ] All 8 themes render correctly with no overlap
- [ ] Switching between themes works instantly (no stale elements)
- [ ] Light and dark mode work for both dashboard and widget
- [ ] Vinyl cover spins, pauses when track pauses
- [ ] Presets save, load, update, and delete
- [ ] Font selection applies to widget (not to shell command line)
- [ ] Hide on Pause fades widget out completely
- [ ] Background selector changes preview only (not OBS widget)
- [ ] Copy OBS URL button produces a working URL

### Git Workflow
- Feature branches: `feature/my-feature`
- PR title format: `[Phase X] Short description`
- Update CHANGELOG.md under `[Unreleased]`
- Screenshots required for visual changes

---

## 7. Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | HTTP server + routing |
| ws | ^8.16.0 | WebSocket server |
| dbus-next | ^0.10.2 | D-Bus/MPRIS integration (Linux) |

No other dependencies. No dev dependencies. No build tools.

---

## 8. Quick Reference: API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | / | Serves dashboard.html |
| GET | /widget | Serves widget.html |
| GET | /api/fonts?q= | Google Fonts list (cached) |
| GET | /api/presets | All saved presets |
| POST | /api/presets | Save/update preset `{ name, config }` |
| DELETE | /api/presets/:name | Delete preset |
| GET | /api/plugins | Loaded plugins with CSS |
| GET | /api/players | Active MPRIS players |
| POST | /api/player | Set player filter `{ player }` |
| WS | ws://host:port | Track data broadcast + error notifications |

### WebSocket Message Types
- **Track data** (server→client): `{ title, artist, artUrl, playing, position, length, player }`
- **Error report** (server→client): `{ type: 'ERROR_REPORT', code, filename }`
- **Config update** (dashboard→widget via postMessage): `{ type: 'UPDATE_CONFIG', data: {...} }`
- **Widget ready** (widget→dashboard via postMessage): `{ type: 'WIDGET_READY' }`

---

*Last updated: March 2026. This document should be updated whenever major architectural decisions are made or new features are implemented.*
