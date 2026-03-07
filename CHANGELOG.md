# Lyra — Changelog

All notable changes are documented here in reverse chronological order.
Format: `[version] — date` → what changed and how it was done.

---

## [0.7.0] — 2025 (Current)

### Fixed

- **Font dropdown — scroll limit** — `slice(0, 80)` cap was applied on every render,
  limiting the list to the first 80 fonts (all starting with "A"). Replaced with
  infinite scroll pagination: loads 120 fonts at a time and appends more when scrolling
  near the bottom (`scrollTop + clientHeight >= scrollHeight - 60`). The full ~1500 font
  catalog is now reachable.

- **Font dropdown — reopening clears list** — `openFontDropdown()` was filtering by the
  input's text value (which contained the selected font name), so reopening only showed
  one result. Fix: `openFontDropdown()` always clears the input and shows the full list.
  Selected font tracked in `_selectedFont` state, restored to input on `closeFontDropdown()`.

- **Magic Colors — toggle not firing with art already loaded** — `applyMagicColors()`
  was only called from `img.onload`. Extracted to named function, called from `updateUI()`
  on every config change. Disabling restores `config.acc` explicitly.

- **Glow — gallery transparent box artifact** — Two-layer fix:
  1. `overflow: hidden` moved from `.t-gallery` (the card) to `#art-container` — the card
     can now let children's shadows bleed outside its bounds.
  2. Glow switched from `filter: drop-shadow` on `#art` to `box-shadow` on `#art-container`.
     `box-shadow` follows `border-radius: 28px 28px 0 0` exactly and is not clipped by ancestor
     `overflow: hidden` (an element's own overflow does not clip its own box-shadow). Art
     corners are now handled by `#art-container`'s own `overflow: hidden`.
  3. `.t-gallery.c-square #art` gets `border-radius: 28px 28px 0 0` to match the container.

- **Glow — float transparent box artifact** — `filter: drop-shadow` inside a `backdrop-filter`
  compositing parent (`.float-box`) renders incorrectly in Chromium/OBS: the shadow is
  composited within the backdrop-filter layer and does not correctly respect `border-radius`,
  producing a rectangular artifact. Fix: switched to `box-shadow` on `#float-art`. `box-shadow`
  always follows `border-radius` (18px square or 50% vinyl) and is not affected by the
  parent's backdrop-filter compositing context.

- **Contrast Glow — inconsistent across themes** — Restored as `filter: drop-shadow`
  (white) on each theme's art element. Shell exception preserved: `text-shadow` neon on
  `.sh-host` and `.sh-val`. Gallery and float use `box-shadow` as above.

- **i18n — missing keys** — Added `btn_save`, `btn_load_preset` to both locales.
  Shell → "Terminal" in ES. Float → "Flotante" in ES. `refreshPresets()` uses translated
  default option. `applyDashLang()` rewrote target logic to use `[data-i18n]` spans only,
  avoiding SVG sibling destruction.

### Added

- **Dashboard Light/Dark mode** — Toggle button (🌙/☀️) in sidebar header. Full CSS
  variable system (`--bg`, `--sidebar`, `--surface`, `--hover`, `--border`, `--text`,
  `--text-muted`, `--text-dim`, `--main-bg`). Preference saved in `localStorage`.

- **SVG theme icons** — Appearance and Cover buttons each show a custom SVG icon above
  the label. All icons preserve on language change (i18n targets inner `<span>` only).

- **Lyra logo** — Custom SVG lyre on a night sky disc with Lyra constellation overlay
  (Vega + ε, ζ, δ, β, γ Lyrae as gold dots with connecting lines and Vega starburst).
  Embedded inline in sidebar header and as `data:` favicon.

- **Tooltip system** — CSS-only `[data-tip]::after` tooltips on all interactive controls:
  theme/cover/mode/language buttons, player select, refresh, save preset, and plugin
  checkboxes. Fully i18n: `data-tip-key` attribute maps to locale string;
  `applyDashLang()` stamps `data-tip` on every language change. Multi-line via
  `white-space: pre-wrap`. Light/dark variants via `[data-theme="light"]` selector.

---

## [0.6.0] — 2025

### Fixed
- **Shell prompt spacing** — Trailing space in `:~$ ` collapsed between inline spans.
  Fix: `white-space: pre` on `.t-shell .sh-prompt`.

- **Font selector not working** — `#widget { font-family: 'Inter' }` overrode the CSS
  variable. Fix: changed to `font-family: var(--lyra-font), 'Inter', sans-serif`.
  `applyFont()` cache was too aggressive; rewrote to always call `setProperty` and
  `widget.style.fontFamily`, using `_loadedFonts Set` only to avoid redundant `<link>` tags.

### Added
- **All Google Fonts** — `GET /api/fonts` fetches full catalog (~1500) from Google
  metadata endpoint at startup, cached in memory, supports `?q=` filtering. Dashboard
  has searchable text input + custom virtual dropdown with live filtering.

- **Presets** — CRUD to `presets.json`. REST API: `GET/POST /api/presets`,
  `DELETE /api/presets/:name`. Dashboard: Save (name input), Load (select), Delete (🗑).
  Loading restores all config values. Toast notifications on all operations.

- **Plugin system** — Server scans `./plugins/*.js` at startup. CommonJS modules export
  `{ name, version, themes[], sources[] }`. CSS injected via `<style data-plugin-theme>`.
  Dashboard adds plugin theme buttons dynamically. OBS dimensions merged into sizes lookup.
  Included: `plugins/example-retro.js` (CRT/scanline theme).

---

## [0.5.0] — 2025

### Added
- **Google Fonts selector** — 13 curated fonts in dashboard sidebar. `<link>` injected
  dynamically in widget `<head>`. `--lyra-font` CSS variable. Shell always stays
  JetBrains Mono. Font flows via URL param `&font=` and postMessage `UPDATE_CONFIG`.

### Fixed
- **Shell prompt bold** — `.t-shell .sh-prompt { font-weight: 700 }` caused inheritance.
  Fix: `font-weight: 400` on `.sh-prompt`, `.sh-host` CSS class (accent color, weight 400).

- **Neon — no progress bar** — `#bar-bg { display:none }` in `.t-neon`. Fix: `height:2px`,
  slim accent bar visible under waveform.

- **macOS vinyl not spinning** — `#macos-art` had hardcoded inline `border-radius:8px`.
  Fix: removed inline style. Added `.t-macos.c-square #macos-art { border-radius:8px }`,
  `.t-macos.c-vinyl #macos-art { border-radius:50%; animation:spin 8s linear infinite }`.

### Changed
- **Chill → Float** — Renamed to better describe 3 separate floating boxes. All references
  updated. Existing `theme=chill` URLs require manual update.

---

## [0.4.0] — 2025

### Fixed
- **Player filter** — Moved to server side. `selectedPlayer` state + `POST /api/player`.
  `getMprisData()` filters before D-Bus queries.

- **Chromium instance grouping** — `getCanonicalName()` collapses `chromium.instanceNNNNNN`
  → `chromium` in `/api/players`. `playerMatches()` handles wildcard matching.

- **Player selection race condition** — `update()` calls `frame.src = '/widget' + q` on
  player change, reloading iframe with correct params baked in from first render.

- **Priority in "All Players" mode** — `MUSIC_APP_PRIORITY` array ranks dedicated apps
  over browser tabs.

### Added
- `GET /api/players` — `{ players, selected }`
- `POST /api/player` — sets server-side filter, triggers immediate re-broadcast
- `syncPlayerToServer()` — called on every player select change and on reset
- `refreshPlayers()` — restores server's `selected` value

---

## [0.3.0] — 2025

### Fixed
- **Shell command line** — Now accepts full prompt line. Parser splits on `:~$ `.
  Host → accent color. Path + command → muted color.

- **Bracket progress bar width** — Now measures `el.offsetWidth` at runtime. ~7.2px/char
  for 12px JetBrains Mono.

### Changed
- Shell input label renamed "Shell Command". Placeholder updated.

---

## [0.2.0] — 2025

### Added
- **Float theme** — 3 separate floating glass boxes: art, info, progress.

- **Player source filter** — `<select>` in dashboard populated by `/api/players`.

- **Shell theme** — Linux style. No macOS dots. Title centered, `— □ ✕` right-aligned.

### Fixed
- **Visual bug on theme switch** — `#waveform` moved via `insertBefore` each switch.
  Fix: placed permanently in `#progress-wrapper` in HTML.

- **sh-val font-weight** — 500 → 400.

---

## [0.1.0] — 2025 (Initial)

### Features shipped
- WebSocket server (Node.js + Express + ws + dbus-next) on port 4640
- MPRIS/D-Bus polling every 1 second
- iTunes Search API fallback for album art (`1000x1000bb`)
- 7 themes: Compact, Boxy, Gallery, macOS, Shell, Neon, Chill
- Cover modes: Square, Vinyl (spin animation), None
- Dark / Light mode
- Magic Colors (canvas pixel sampling from album art)
- Cover Glow + Contrast Glow
- EN / ES i18n on both dashboard and widget
- Accent color picker
- Live dashboard preview via `<iframe>` + postMessage
- OBS URL builder with dimension recommendations per theme
- `COPY OBS URL` and `RESET DEFAULTS` buttons
