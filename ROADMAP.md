# Lyra — Project Roadmap & Feature Specification

> **Proposed name: Lyra**
> Named after the constellation and the ancient Greek lyre — an instrument synonymous with music and performance.
> Clean, short, memorable, and open source friendly.
> Tagline: *"Music overlay for streamers and content creators."*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Architecture](#2-current-architecture)
3. [Technology Decisions](#3-technology-decisions)
4. [Development Phases](#4-development-phases)
5. [Feature Specifications](#5-feature-specifications)
6. [Project File Structure](#6-project-file-structure)
7. [Error Reporting System](#7-error-reporting-system)
8. [Open Source Guidelines](#8-open-source-guidelines)
9. [Documentation Plan](#9-documentation-plan)
10. [Recommended Additional Features](#10-recommended-additional-features)

---

## 1. Project Overview

**Lyra** is a self-hosted music widget overlay system for OBS and live streaming software.
It reads currently playing track data via MPRIS/D-Bus (Linux), displays it through a
customizable browser source widget, and is controlled through a local dashboard.

**Core principles:**
- Zero cloud dependency — runs 100% locally
- OBS-first design — browser source compatible out of the box
- Theme-based — multiple visual styles, fully customizable
- Open source — community contributions and plugins welcome

---

## 2. Current Architecture

```
server.js          Node.js + Express (port 4640)
  ├─ GET  /              → dashboard.html
  ├─ GET  /widget        → widget.html
  ├─ GET  /api/players   → lists active MPRIS players
  ├─ WebSocket ws://     → broadcasts JSON every 1s on data change
  └─ static files

dashboard.html
  └─ <iframe id="preview" src="/widget">
     postMessage ↔ WIDGET_READY / UPDATE_CONFIG

widget.html
  └─ WebSocket client
     URL params on load
     postMessage from dashboard (live preview)
```

**Current dependencies:** `express`, `ws`, `dbus-next`

**Data source:** MPRIS/D-Bus (Linux only — Phase 3 expands this)

**Current themes:** Compact, Boxy, Gallery, macOS, Shell, Neon, Chill

---

## 3. Technology Decisions

### App Framework — Electron

**Recommendation: Electron** (not Tauri, not plain web app)

| Criteria | Electron | Tauri | Web App Only |
|---|---|---|---|
| Reuse existing HTML/CSS/JS | ✅ Direct | ⚠️ Rust backend required | ✅ |
| Cross-platform (Win/Mac/Linux) | ✅ | ✅ | ❌ Manual |
| System tray icon | ✅ Built-in | ✅ | ❌ |
| Bundle as installer | ✅ electron-builder | ✅ | ❌ |
| Community / ecosystem | 🟢 Huge | 🟡 Growing | — |
| Migration effort from current code | 🟢 Zero rewrite | 🔴 Full backend rewrite | 🟢 None |
| Binary size | ~150 MB | ~10 MB | ~0 MB |

The existing codebase is 100% HTML/CSS/JS + Node.js. Electron wraps it directly with
no rewriting required. Tauri would require rewriting the backend in Rust — unnecessary
complexity for an open source community project.

### OBS Integration — Browser Source (now) vs Native Plugin (later, optional)

A native OBS plugin requires C++ and the OBS SDK. The browser source approach already
works perfectly. A native plugin only adds value if the community specifically demands it.

**Decision:** Ship with browser source. Keep native plugin as an optional Phase 3 exploration.

---

## 4. Development Phases

---

### Phase 0 — Immediate Bug Fixes
**Timeline: Current sprint — must complete before any new features**
**Platform: Linux/Ubuntu**

| # | Bug | Status |
|---|---|---|
| 0.1 | Shell `sh-val` renders bold (font-weight 500 in JetBrains Mono) | ✅ Fixed |
| 0.2 | Bracket progress bar doesn't fill full row width dynamically | ✅ Fixed |
| 0.3 | Shell input only accepted hostname — now accepts full command line | ✅ Fixed |
| 0.4 | Player filter race condition (WS arrives before postMessage) | ✅ Fixed |
| 0.5 | Shell prompt: `~$ ./user` part has wrong color/weight vs hostname | 🔲 Pending |
| 0.6 | Chill theme: verify 3-box visual separation in real OBS browser source | 🔲 Verify |

**Detail — Bug 0.5 (Shell Prompt Colors):**

The full prompt line (e.g. `root@user:~$ ./user --nowplaying`) must be split into
three segments with distinct styling — but all at `font-weight: 400`:

```
[accent color, w400]  root@user
[muted color,  w400]  :~$ ./user --nowplaying
```

The muted color must respect light/dark mode: `rgba(255,255,255,0.5)` dark,
`rgba(0,0,0,0.4)` light. The command part after `:~$ ` must NOT be white or bold.

---

### Phase 1 — Short Term: Linux/Ubuntu Feature Complete
**Timeline: 3–6 weeks after Phase 0**
**Platform: Linux/Ubuntu**
**Goal: All planned features working on Linux before any porting or packaging work**

#### 1.1 — Visibility Toggle: Hide on Pause ⏸️
**Category: Short Term | Priority: High**

A dashboard toggle that makes the widget fully invisible when playback is paused,
fading back in when a track resumes.

Behavior:
- Smooth fade out when paused (opacity 0 + slight scale down)
- Smooth fade in when playing (opacity 1, scale 1)
- Default transition: 0.4s ease
- Widget is `pointer-events: none` while hidden (doesn't block OBS input)
- Works with all themes

Config param: `hide_paused=true` (URL + postMessage)

Dashboard: checkbox "Hide when paused 👁️" in sidebar

Implementation — CSS only, zero new DOM logic:
```css
#widget.hide-paused.paused {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.96);
    transition: opacity 0.4s ease, transform 0.4s ease;
}
```

The `paused` class is already applied by the existing JS — this feature requires
only the checkbox, the URL param, and the CSS rule.

---

#### 1.2 — Google Fonts Selector 🔤
**Category: Short Term | Priority: Medium**

Allow users to select a display font for widget text from a curated list of
streaming-friendly Google Fonts.

Curated list (15 fonts across categories):

| Font | Category | Best for |
|---|---|---|
| Inter (default) | Sans-serif | All themes |
| Space Grotesk | Sans-serif | Modern, compact |
| DM Sans | Sans-serif | Clean, readable |
| Outfit | Sans-serif | Friendly, casual |
| Nunito | Rounded sans | Chill theme |
| Raleway | Elegant sans | Gallery, boxy |
| Syne | Display | Neon, bold streams |
| Oxanium | Geometric | Gaming, Shell |
| Orbitron | Display | Neon, gaming |
| Bebas Neue | Condensed display | Large titles |
| JetBrains Mono | Monospace | Shell (default for cmd) |
| Space Mono | Monospace | Technical feel |
| Fira Code | Monospace | Shell alt |
| Playfair Display | Serif | Elegant streams |
| Lora | Serif | Lo-fi, chill |

Shell theme exception: the command line (`#sh-cmd`) always uses JetBrains Mono
regardless of font selection. The chosen font applies to Title and Artist only.

Config param: `font=SpaceGrotesk`

Implementation: widget injects a `<link id="lyra-font-link">` into `<head>` on config
update. CSS: `body { font-family: var(--lyra-font, 'Inter'), sans-serif; }`.

---

#### 1.3 — Presets / Profiles System 💾
**Category: Short Term | Priority: High**

Save and load complete named configurations. Essential for streamers who switch
between multiple scenes or stream types.

Each preset stores the full config object:
```json
{
  "id": "a1b2c3d4",
  "name": "Lo-fi Stream",
  "created": "2025-01-01T00:00:00Z",
  "config": {
    "theme": "chill",
    "cover": "square",
    "mode": "dark",
    "acc": "#9b59b6",
    "font": "Nunito",
    "magic": false,
    "glow": true,
    "wglow": false,
    "hide_paused": true,
    "hostname": "root@user:~$ ./user --nowplaying",
    "player": "youtube-music",
    "background": "purple-gradient"
  }
}
```

Storage: `localStorage` in Phase 1. Migrates to `~/.config/lyra/presets.json` in Phase 2.

Dashboard UI:
- "Save as preset" button → name prompt → saves
- Preset list (cards or dropdown) → click to load
- Delete preset (with confirmation)
- Export as `.lyrapreset` file (JSON download) — shareable with community
- Import `.lyrapreset` file (file input)

---

#### 1.4 — Background Customization 🎨
**Category: Short Term | Priority: Medium**

Replace the fixed Unsplash image in the dashboard preview with selectable options.
Affects dashboard preview only — not the OBS widget output.

Built-in options:
1. Concert blur (current default — Unsplash)
2. Solid dark `#09090b`
3. Solid charcoal `#1a1a1d`
4. Purple/indigo gradient (streamer aesthetic)
5. Blue/teal gradient
6. Warm amber gradient
7. Static noise texture
8. Transparent / none (most accurate OBS preview)

User upload:
- `<input type="file" accept="image/*">` → reads as base64 → stored in localStorage
- Blur `20px` + dark overlay `rgba(0,0,0,0.65)` applied automatically
- No server changes required in Phase 1

---

#### 1.5 — Error Reporting System 🛡️
**Category: Short Term | Priority: High**
**See full spec in Section 7**

Automatic structured error logging with file export. Dashboard shows a banner
notification when an error log is created. Must ship before public open source launch.

---

### Phase 2 — Medium Term: Desktop App
**Timeline: 6–12 weeks after Phase 1 is stable**
**Platform: Linux (primary), Windows (secondary)**

#### 2.1 — Electron App Conversion
**Category: Medium Term | Priority: Core Phase 2**

Wrap existing server + dashboard into an Electron desktop application.

```
Electron main process
  ├─ Spawns Express server internally (same server.js logic, refactored)
  ├─ System tray icon
  │   ├─ "Open Dashboard"
  │   ├─ "Copy OBS URL" → clipboard
  │   ├─ "Now Playing: [song]" (live, read-only)
  │   └─ "Quit Lyra"
  ├─ Auto-start on login (OS-level toggle in settings)
  └─ BrowserWindow → loads localhost:4640 (same dashboard.html — zero rewrite)
```

Packaging via `electron-builder`:
- Linux: `.AppImage` (portable) + `.deb` (system install)
- Windows: `.exe` NSIS installer (Phase 3)

The app bundles Node.js — no system Node.js required on the end user's machine.

---

#### 2.2 — Auto-Installer & Dependency Management
**Category: Medium Term | Priority: Core Phase 2**

The installer handles everything. End users should never need to touch a terminal
except for the initial install (and even that should be one command or a GUI click).

Linux `.deb` install:
```bash
# User runs once:
sudo dpkg -i lyra_1.0.0_amd64.deb
# App appears in application launcher — that's it
```

Linux `.AppImage` (no install):
```bash
chmod +x Lyra-1.0.0.AppImage && ./Lyra-1.0.0.AppImage
```

First-run checks:
- D-Bus available? (Linux) → warn if not with instructions
- Port 4640 free? → offer to change port in settings if occupied
- `dbus-next` bundled inside app — user installs nothing manually

---

#### 2.3 — First-Run Onboarding Tutorial
**Category: Medium Term | Priority: Medium**

Step-by-step overlay shown on first launch inside the dashboard:

1. **Welcome** — Lyra logo + one-line description
2. **Play a song** — "Open any media player and play a track. We'll detect it automatically."
   → Live indicator: shows green when data arrives
3. **Pick your style** — theme selector appears, preview updates live
4. **Add to OBS** — "Copy this URL and add it as a Browser Source in OBS"
   → Copy button, shows OBS dimensions for the chosen theme
5. **Done** — dismiss tutorial

Re-accessible via "?" button in dashboard header.
Skippable at any step.

---

#### 2.4 — Plugin System Architecture 🔌
**Category: Medium Term | Priority: Medium**
**Design in Phase 1, implement in Phase 2**

Two plugin types:

**Theme Plugins** — new visual widget styles:
```javascript
// my-theme.lyraplugin/index.js
LyraPlugin.registerTheme({
  id: 'cyberpunk',
  name: 'Cyberpunk',
  version: '1.0.0',
  author: 'your-name',
  obsSize: [500, 160],
  css: `/* scoped CSS for this theme */`,
  render(data, config) {
    // Returns HTML string or DOM mutations
  }
});
```

**Data Source Plugins** — new music data providers:
```javascript
// spotify.lyraplugin/index.js
LyraPlugin.registerSource({
  id: 'spotify',
  name: 'Spotify Web API',
  version: '1.0.0',
  configSchema: [
    { key: 'client_id', label: 'Client ID', type: 'text' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' }
  ],
  poll(config, callback) {
    // Calls callback({ title, artist, artUrl, playing, position, length })
  }
});
```

Plugin loader scans `~/.config/lyra/plugins/` on startup.
Dashboard "Plugins" tab: lists installed plugins, enable/disable toggles, config panels.
Community distribution: `.lyraplugin` ZIP files (manifest + JS + optional assets).

---

#### 2.5 — Presets Migration to File System
Migrate localStorage presets to `~/.config/lyra/presets.json` for cross-browser
persistence and future sync. Automatic migration from localStorage on first Electron launch.

---

### Phase 3 — Long Term: Cross-Platform & Ecosystem
**Timeline: 3–6 months after Phase 2 stable**

#### 3.1 — Windows Support
**Category: Long Term**

Challenges:
- No MPRIS/D-Bus on Windows → requires SMTC (System Media Transport Controls) source plugin
- `node-windows-media` or custom native module for SMTC
- `.exe` installer via electron-builder (already supported)

Windows-specific data source plugin:
```javascript
LyraPlugin.registerSource({
  id: 'smtc',
  name: 'Windows Media Session',
  platform: 'win32',
  // Uses Windows.Media.Control WinRT API
});
```

---

#### 3.2 — Alternative Music Sources
**Category: Long Term | Required for Windows, optional enhancement on Linux**

| Source | Platform | Implementation |
|---|---|---|
| MPRIS/D-Bus | Linux | Current — stable |
| Windows SMTC | Windows | Native node module (Phase 3.1) |
| Spotify Web API | All | OAuth2 + polling |
| Last.fm | All | API polling (now-playing endpoint) |
| YouTube Music (direct) | All | Browser extension bridge |
| Apple Music / iTunes | macOS | AppleScript bridge |

**YouTube Music Browser Extension Bridge:**
A lightweight Chrome/Firefox extension that intercepts YT Music DOM events and
sends them to `http://localhost:4640/api/source/ytmusic`. This gives accurate
per-tab data without relying on the Chromium MPRIS instance naming (which caused
the interference bug). Available as a separate install alongside Lyra.

---

#### 3.3 — Community Theme Marketplace
GitHub-based directory of `.lyraplugin` files with one-click install from the dashboard.
"Browse community themes" → opens marketplace → download + install without leaving the app.

---

#### 3.4 — Native OBS Plugin (Optional)
**Category: Long Term | Low priority**

A C++ OBS plugin for native panel integration. Only pursue if browser source
approach has concrete limitations reported by the community. Significant engineering effort.

---

#### 3.5 — macOS Support
After Windows is stable. Uses AppleScript for Apple Music, Electron runs natively
on arm64 (Apple Silicon) + x86_64.

---

## 5. Feature Specifications

### Shell Prompt Formatting (Bug 0.5 + Feature 1.6)

The `config.hostname` field stores the **complete first line** of the shell prompt,
e.g. `root@user:~$ ./user --nowplaying`.

Rendering rules:
```
Split on first occurrence of ":~$ "

Left part  → color: var(--acc), font-weight: 400
":~$ "     → color: rgba(255,255,255,0.5) dark / rgba(0,0,0,0.4) light, weight: 400
Right part → color: rgba(255,255,255,0.5) dark / rgba(0,0,0,0.4) light, weight: 400

If ":~$ " not found → render whole line in var(--acc), weight: 400
Titlebar  → text before first ":" only
```

No segment should ever be bold. All segments respect light/dark mode.

### Visibility Toggle (Feature 1.1)

```
URL param:     hide_paused=true
postMessage:   included in UPDATE_CONFIG

CSS:
  #widget.hide-paused.paused {
      opacity: 0 !important;
      pointer-events: none;
      transform: scale(0.96);
      transition: opacity 0.4s ease, transform 0.4s ease;
  }
  #widget.hide-paused {
      transition: opacity 0.4s ease, transform 0.4s ease;
  }
```

### Google Fonts (Feature 1.2)

```
URL param: font=SpaceGrotesk
Widget: injects <link id="lyra-font-link" rel="stylesheet" href="..."> dynamically
CSS:    :root { --lyra-font: 'Inter'; }
        body { font-family: var(--lyra-font), sans-serif; }
Shell exception: #sh-cmd always font-family: 'JetBrains Mono', monospace
```

### Preset Schema (Feature 1.3)

```json
{
  "id": "string (uuid-v4)",
  "name": "string",
  "created": "ISO 8601 timestamp",
  "config": {
    "theme": "compact|boxy|gallery|macos|shell|neon|chill",
    "cover": "square|vinyl|none",
    "mode": "dark|light",
    "acc": "#hex",
    "font": "string (Google Fonts name)",
    "magic": "boolean",
    "glow": "boolean",
    "wglow": "boolean",
    "hide_paused": "boolean",
    "hostname": "string (full shell command line)",
    "player": "string (MPRIS player name or empty)",
    "background": "string (preset key or 'custom')"
  }
}
```

---

## 6. Project File Structure

### Phase 1 (current — web server)
```
lyra/
├── server.js
├── widget.html
├── dashboard.html
├── package.json
├── package-lock.json
├── README.md
├── ROADMAP.md
├── CHANGELOG.md
├── LICENSE                  (MIT)
├── .gitignore
└── docs/
    ├── installation.md
    ├── usage.md
    ├── themes.md
    ├── obs-setup.md
    └── contributing.md
```

### Phase 2 (Electron app)
```
lyra/
├── electron/
│   ├── main.js              (Electron main process)
│   ├── tray.js              (system tray)
│   ├── preload.js           (context bridge)
│   └── autostart.js         (login item)
├── src/
│   ├── server/
│   │   ├── index.js         (Express, refactored from server.js)
│   │   ├── mpris.js         (MPRIS/D-Bus logic)
│   │   ├── errors.js        (error reporting module)
│   │   └── sources/
│   │       ├── base.js
│   │       └── mpris.js
│   ├── dashboard/
│   │   ├── index.html
│   │   └── assets/
│   │       └── backgrounds/
│   └── widget/
│       └── index.html
├── plugins/                 (built-in plugins)
│   └── ytmusic-bridge/
├── build/                   (electron-builder output, gitignored)
├── electron-builder.yml
├── package.json
└── docs/
```

---

## 7. Error Reporting System

### Overview
All server errors are caught globally, formatted as structured JSON reports, and saved
automatically to `~/.config/lyra/logs/`. The dashboard receives a WebSocket notification
and shows a dismissible banner with a link to the log file.

### Error Report Schema
```json
{
  "lyra_version": "1.0.0",
  "platform": "linux",
  "timestamp": "2025-01-01T12:34:56.789Z",
  "session_id": "uuid-v4",
  "error": {
    "code": "MPRIS_CONNECTION_FAILED",
    "message": "Human-readable description",
    "stack": "Error stack trace...",
    "context": {}
  },
  "system": {
    "node_version": "v20.0.0",
    "os_release": "Ubuntu 22.04",
    "arch": "x64"
  }
}
```

### Error Code Registry

| Code | Trigger | Auto-recovery |
|---|---|---|
| `MPRIS_CONNECTION_FAILED` | D-Bus unavailable | Retry every 5s |
| `MPRIS_PLAYER_LOST` | Player disconnects mid-session | Wait for new player |
| `ART_FETCH_FAILED` | iTunes API timeout/error | Use blank art, continue |
| `WS_SEND_FAILED` | WebSocket client error | Drop client, reconnect |
| `CONFIG_PARSE_FAILED` | Invalid URL params | Fall back to defaults |
| `PLUGIN_LOAD_FAILED` | Plugin throws on register | Disable plugin, log, continue |
| `PRESET_CORRUPT` | Invalid preset JSON | Skip preset, warn user |
| `UNCAUGHT_EXCEPTION` | Any unhandled error | Log + attempt restart |
| `UNHANDLED_REJECTION` | Unhandled async rejection | Log, continue |

### Implementation (server-side)
```javascript
// src/server/errors.js
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const LOG_DIR = path.join(os.homedir(), '.config', 'lyra', 'logs');

function writeErrorReport(code, error, context = {}) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const report = {
    lyra_version: require('../../package.json').version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    session_id: global.LYRA_SESSION_ID,
    error: { code, message: error.message, stack: error.stack, context },
    system: { node_version: process.version, os_release: os.release(), arch: process.arch }
  };
  const filename = `lyra-error-${Date.now()}.json`;
  fs.writeFileSync(path.join(LOG_DIR, filename), JSON.stringify(report, null, 2));
  console.error(`[Lyra] Error logged: ${code} → ${filename}`);
  // Notify dashboard via WebSocket
  if (global.lyraWSS) {
    global.lyraWSS.clients.forEach(c => {
      if (c.readyState === 1) c.send(JSON.stringify({ type: 'ERROR_REPORT', code, filename }));
    });
  }
}

process.on('uncaughtException',  (e) => writeErrorReport('UNCAUGHT_EXCEPTION', e));
process.on('unhandledRejection', (r) => writeErrorReport('UNHANDLED_REJECTION', new Error(String(r))));

module.exports = { writeErrorReport };
```

### Dashboard Notification (widget.html)
```javascript
// On WS message type === 'ERROR_REPORT':
showErrorBanner(code, filename);

function showErrorBanner(code, filename) {
  const banner = document.createElement('div');
  banner.style = `position:fixed;bottom:20px;right:20px;background:#1a1a1d;
    border:1px solid #f43f5e;border-radius:12px;padding:14px 18px;
    color:white;font-size:12px;z-index:9999;max-width:360px;`;
  banner.innerHTML = `
    <strong style="color:#f43f5e">⚠ Error logged: ${code}</strong><br>
    <span style="color:#71717a;font-size:11px">Saved to ~/.config/lyra/logs/${filename}</span>
    <button onclick="this.parentNode.remove()"
      style="float:right;background:none;border:none;color:#71717a;cursor:pointer;font-size:14px">✕</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 10000);
}
```

---

## 8. Open Source Guidelines

### License
**MIT** — permissive, compatible with Electron distribution, community-friendly.

### Repository
```
github.com/[username]/lyra

Labels:    bug, enhancement, good-first-issue, phase-1, phase-2, phase-3,
           theme-plugin, data-source, documentation
Projects:  One Kanban board per phase
Releases:  Tagged with CHANGELOG excerpt
Wiki:      Extended docs, community themes showcase
```

### Versioning (SemVer)
```
0.x.x    — Pre-release / alpha (current)
1.0.0    — Phase 1 complete (Linux stable, all features)
1.x.0    — Phase 1 additions / patches
2.0.0    — Phase 2 complete (Electron app, installer)
3.0.0    — Phase 3 complete (cross-platform)
```

### CHANGELOG.md format
```markdown
## [Unreleased]
### Added
### Fixed
### Changed

## [0.4.0] - 2025-xx-xx
### Added
- Visibility toggle: hide on pause (#12)
- Google Fonts selector with 15 curated options (#14)
- Presets system with import/export as .lyrapreset (#15)
### Fixed
- Shell prompt color/weight inconsistency (#11)
- Chill theme box separation in OBS browser source (#9)
```

### CONTRIBUTING.md (summary)
1. Fork → feature branch (`feature/my-feature`)
2. Vanilla JS/CSS only in widget.html and dashboard.html — no bundler, no frameworks
3. Test on Ubuntu 22.04+ with at least 2 simultaneous MPRIS players
4. Update CHANGELOG.md under `[Unreleased]`
5. Screenshots required for any visual changes in the PR description
6. PR title format: `[Phase X] Short description`

---

## 9. Documentation Plan

### Phase 1 — Required before public launch

| File | Contents |
|---|---|
| `README.md` | Overview, screenshot, 3-command quick start, feature list |
| `docs/installation.md` | Ubuntu/Debian install, Node.js setup, `npm install`, running |
| `docs/usage.md` | Dashboard walkthrough, every control explained with screenshots |
| `docs/themes.md` | Screenshot + OBS dimensions for each theme |
| `docs/obs-setup.md` | How to add browser source, chroma key tips, recommended OBS settings |
| `docs/contributing.md` | How to file bugs, submit PRs, contribute themes |

### Phase 2

| File | Contents |
|---|---|
| `docs/plugins.md` | Plugin API reference, annotated theme plugin example |
| `docs/presets.md` | Preset schema, sharing .lyrapreset files |
| `docs/electron-build.md` | Building from source, signing, packaging |

### Phase 3

| File | Contents |
|---|---|
| `docs/windows.md` | Windows-specific install, SMTC source setup |
| `docs/sources.md` | All data sources, configuration per source |
| `docs/marketplace.md` | Publishing plugins to community marketplace |

---

## 10. Recommended Additional Features

Features not requested but consistent with the project vision, ordered by value/effort:

| Feature | Phase | Rationale |
|---|---|---|
| **Widget opacity slider** | 1 | Quick win — global opacity control for all themes |
| **OS dark/light mode follow** | 1 | `prefers-color-scheme` auto-switches widget mode |
| **Now Playing history log** | 1 | Log tracks during stream, export as CSV/text |
| **Multi-widget / multi-port** | 2 | Two widget instances for different OBS scenes |
| **Custom CSS injection** | 2 | Power users inject raw CSS per theme |
| **Transition animations** | 2 | Slide/fade animation when track changes |
| **OBS WebSocket integration** | 2 | Auto-hide widget when specific scenes are active |
| **Keyboard shortcut overlay** | 2 | Hotkey to copy OBS URL during stream setup |
| **Stream countdown widget** | 3 | Extend beyond music to general overlay elements |
| **WebSocket auth token** | 2 | Optional local token for shared network security |
| **Track "skip" / "pause" controls** | 2 | Media controls directly in the dashboard |
| **Discord Rich Presence sync** | 3 | Update Discord status with currently playing track |

---

*Last updated: 2025 — Lyra Project*
*This is a living document. Update phase status and add entries as the project evolves.*
