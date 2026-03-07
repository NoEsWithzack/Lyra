# Lyra 🎵

**Music overlay for streamers and content creators.**

Lyra is a self-hosted music widget for OBS and live streaming software. It reads your currently playing track via MPRIS/D-Bus (Linux), displays it through a customizable browser source widget, and is controlled through a local dashboard.

> Named after the constellation and the ancient Greek lyre — an instrument synonymous with music and performance.

## Features

- **8 Themes** — Compact, Boxy, Gallery, macOS, Shell, Neon, Float, Alert
- **Cover Modes** — Square, Vinyl (spinning disc with tonearm), or hidden
- **Magic Colors** — Auto-extract accent color from album art
- **Glow Effects** — Cover glow + contrast glow for stream visibility
- **Google Fonts** — Full font library with live search and preview
- **Presets** — Save, load, and manage named configurations
- **i18n** — English and Spanish with full tooltip support
- **Player Filter** — Target a specific player or auto-detect the best one
- **Light & Dark Mode** — Both dashboard and widget
- **Hide on Pause** — Widget fades out when music stops
- **Plugin System** — Extensible themes and data sources
- **Zero Cloud** — Runs 100% locally, no accounts, no tracking

## Quick Start

```bash
git clone https://github.com/NoEsWithzack/lyra.git
cd lyra
npm install
node server.js
```

Open `http://localhost:4640` in your browser. Play a song in any media player.

**Add to OBS:** Create a Browser Source → paste the URL from the "Copy OBS URL" button in the dashboard.

## Project Structure

```
lyra/
├── server.js               → Entry point (28 lines)
├── dashboard.html           → Control panel UI
├── widget.html              → OBS browser source
├── css/
│   ├── dashboard.css        → Dashboard styles
│   └── widget.css           → Widget theme styles
├── js/
│   ├── dashboard.js         → Dashboard logic & state
│   └── widget.js            → Widget renderer & WebSocket
├── src/
│   ├── config.js            → Ports, URLs, settings
│   ├── routes/              → Express API endpoints
│   ├── services/            → MPRIS, album art, WebSocket
│   └── utils/               → Chromium instance helpers
├── plugins/                 → Plugin directory (auto-scanned)
├── package.json
├── ROADMAP.md               → Full feature spec & phases
└── CHANGELOG.md
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `LYRA_PORT` | `4640` | Server port (env variable) |

## Requirements

- **Node.js** 18+
- **Linux** with D-Bus (Ubuntu 22.04+ recommended)
- A media player that supports MPRIS (Spotify, YouTube Music, VLC, etc.)

## Contributing

1. Fork → feature branch (`feature/my-feature`)
2. Vanilla JS/CSS only — no bundler, no frameworks
3. Test on Ubuntu 22.04+ with at least 2 MPRIS players
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Screenshots required for any visual changes
6. PR title format: `[Phase X] Short description`

See [ROADMAP.md](ROADMAP.md) for planned features and phase details.

## License

[MIT](LICENSE) — Zack ([@NoEsWithzack](https://github.com/NoEsWithzack))
