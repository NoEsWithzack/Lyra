# Changelog

All notable changes to Lyra will be documented in this file.

## [Unreleased]

### Added
### Fixed
### Changed

## [0.4.0] - 2025-xx-xx

### Added
- Visibility toggle: hide widget on pause
- Google Fonts selector with full library search
- Presets system with save/load/delete
- Plugin system scaffold (themes + sources)
- i18n: English & Spanish support with tooltips
- 8 themes: Compact, Boxy, Gallery, macOS, Shell, Neon, Float, Alert
- Vinyl record cover mode with tonearm
- Magic Colors: accent from album art
- Cover Glow & Contrast Glow effects
- Player source filter with priority ranking

### Changed
- Modular server architecture (routes, services, utils)
- CSS-driven theme visibility (no inline style toggling)
- Centralized dashboard state management
- Widget theme display registry for extensibility
- Glow system uses opt-in selectors instead of exclusion lists

### Fixed
- Widget switching overlap bug (stale inline styles)
- Contrast glow rendering in light mode
- Light mode font contrast on dashboard
- Vinyl art visibility on compact/boxy themes
- Iframe readiness tracking for reliable config sync
