'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// R2: THEME DISPLAY REGISTRY
// Instead of updating #track, #macos-track, #float-track, #notif-track
// individually in 5 separate code blocks, we define element sets and iterate.
// To add a new theme: add one entry here + its CSS + its layout toggle.
// ═════════════════════════════════════════════════════════════════════════════

const DISPLAY_SETS = [
    // Standard themes (compact, boxy, gallery, neon) share these elements
    { track: 'track',        artist: 'artist',        curr: 'curr',       total: 'total',       barFill: 'bar-fill',       art: 'art' },
    // macOS
    { track: 'macos-track',  artist: 'macos-artist',  curr: 'macos-curr', total: 'macos-total', barFill: 'macos-bar-fill', art: 'macos-art' },
    // Float
    { track: 'float-track',  artist: 'float-artist',  curr: 'float-curr', total: 'float-total', barFill: 'float-bar-fill', art: 'float-art' },
    // Notification
    { track: 'notif-track',  artist: 'notif-artist',  curr: null,         total: null,          barFill: null,             art: 'notif-art' },
];

// ─── DOM helpers ────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function setText(id, text) {
    if (id) { const el = $(id); if (el) el.innerText = text; }
}

function setWidth(id, width) {
    if (id) { const el = $(id); if (el) el.style.width = width; }
}

function syncArt(id, src) {
    if (id && src) { const el = $(id); if (el && el.src !== src) el.src = src; }
}

// ─── Config from URL params ─────────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
let config = {
    t:           params.get('theme')       || 'compact',
    c:           params.get('cover')       || 'square',
    m:           params.get('mode')        || 'dark',
    acc:         params.get('acc')         || '#1db954',
    magic:       params.get('magic')       === 'true',
    glow:        params.get('glow')        === 'true',
    wglow:       params.get('wglow')       === 'true',
    lang:        params.get('lang')        || 'en',
    hostname:    params.get('hostname')    || '',
    player:      params.get('player')      || '',
    font:        params.get('font')        || '',
    hide_paused: params.get('hide_paused') === 'true',
};

const w       = $('widget');
const img     = $('art');
const currEl  = $('curr');
const totalEl = $('total');
let pos = 0, dur = 0, playing = false;
let currentTitle = "", currentArtist = "";

// Notification state — declared here because setLayout() needs to clear timers
let _prevNotifTitle  = '';
let _notifHideTimer  = null;
let _notifExitTimer  = null;

// ─── i18n ───────────────────────────────────────────────────────────────────

const i18n = {
    en: {
        waiting:    "Waiting...",
        notrack:    "No track playing",
        neon_label: "LISTENING TO MUSIC",
        shell_cmd:  "./user --nowplaying",
        sh_title:   "Title:  ",
        sh_artist:  "Artist: ",
        time_zero:  "0:00",
    },
    es: {
        waiting:    "Esperando...",
        notrack:    "Sin reproducción",
        neon_label: "ESCUCHANDO MÚSICA",
        shell_cmd:  "./user --reproduciendo",
        sh_title:   "Título:  ",
        sh_artist:  "Artista: ",
        time_zero:  "0:00",
    }
};
function tr(key) { return (i18n[config.lang] || i18n.en)[key] || key; }

// ─── Layout switcher ─────────────────────────────────────────────────────────
// All theme chrome visibility is now CSS-driven via .t-* class on #widget.
// This function only handles things CSS can't do:
//   - Building waveform DOM nodes (one-time)
//   - Cleaning up notif animation state when switching away from notif theme

function setLayout() {
    // Notif: when switching AWAY, clear animation classes and timers so
    // the CSS default `display: none` takes effect cleanly
    if (config.t !== 'notif') {
        const nc = $('notif-chrome');
        nc.style.display = '';          // clear any inline display:flex from triggerNotification()
        nc.classList.remove('notif-in', 'notif-out');
        clearTimeout(_notifHideTimer);
        clearTimeout(_notifExitTimer);
    }

    // Neon: build waveform bars once (idempotent)
    if (config.t === 'neon') buildWaveform();
}

// ─── Build waveform bars (idempotent) ───────────────────────────────────────

function buildWaveform() {
    const wf = $('waveform');
    if (!wf || wf.children.length > 0) return;
    const heights = [0.2,0.4,0.7,0.9,0.6,1,0.5,0.8,0.3,0.9,0.7,1,0.4,0.6,0.8,0.5,0.9,0.3,0.7,1,
                     0.6,0.4,0.8,1,0.5,0.7,0.3,0.9,0.6,0.4,1,0.7,0.5,0.8,0.3,0.9,0.6,0.4,0.7,0.5];
    heights.forEach((h, i) => {
        const b = document.createElement('div');
        b.className = 'wv-bar';
        b.style.height = (h * 28) + 'px';
        b.style.animationDelay    = (i * 0.04) + 's';
        b.style.animationDuration = (0.5 + Math.random() * 0.6) + 's';
        wf.appendChild(b);
    });
}

// ─── Google Fonts loader ────────────────────────────────────────────────────

let _loadedFonts = new Set(['Inter']);
function applyFont(fontName) {
    const font = fontName && fontName.trim() ? fontName.trim() : 'Inter';
    document.documentElement.style.setProperty('--lyra-font', `'${font}'`);
    $('widget').style.fontFamily = `'${font}', 'Inter', sans-serif`;
    if (_loadedFonts.has(font)) return;
    _loadedFonts.add(font);
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g,'+')}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
}

// ─── Plugin loader ──────────────────────────────────────────────────────────

(async function loadPluginStyles() {
    try {
        const res = await fetch('/api/plugins');
        const { plugins } = await res.json();
        plugins.forEach(p => {
            p.themes.forEach(theme => {
                const style = document.createElement('style');
                style.setAttribute('data-plugin-theme', theme.id);
                style.textContent = theme.css;
                document.head.appendChild(style);
            });
        });
    } catch(e) { /* plugins unavailable, widget still works */ }
})();

// ═════════════════════════════════════════════════════════════════════════════
// MAIN UI RENDERER
// R2: Uses DISPLAY_SETS registry instead of per-theme code blocks.
// Shell-specific rendering (prompt, bracket bar) stays explicit since it
// has unique behavior that doesn't fit the generic model.
// ═════════════════════════════════════════════════════════════════════════════

function updateUI() {
    w.className = [
        `t-${config.t}`,
        `c-${config.c}`,
        `${config.m}-mode`,
        (currentTitle && !playing) ? 'paused' : null,
        config.glow           ? 'glow'         : null,
        config.wglow          ? 'wglow'        : null,
        config.hide_paused    ? 'hide-paused'  : null,
    ].filter(Boolean).join(' ');

    setLayout();

    document.documentElement.style.setProperty('--acc', config.acc);
    applyFont(config.font);

    if (config.magic) {
        applyMagicColors();
    } else {
        document.documentElement.style.setProperty('--acc', config.acc);
    }

    const title  = currentTitle  || tr('waiting');
    const artist = currentArtist || tr('notrack');

    // R2: Update all display sets in one loop
    DISPLAY_SETS.forEach(s => {
        setText(s.track, title);
        setText(s.artist, artist);
        if (!currentTitle) {
            setText(s.curr, tr('time_zero'));
            setText(s.total, tr('time_zero'));
            setWidth(s.barFill, '0%');
        }
        syncArt(s.art, img.src);
    });

    // Notif label (theme-specific text, not in registry)
    $('notif-label').innerText = config.lang === 'es' ? 'Reproduciendo' : 'Now Playing';

    // Trigger notification when title changes (notif theme only)
    if (config.t === 'notif' && currentTitle && currentTitle !== _prevNotifTitle) {
        _prevNotifTitle = currentTitle;
        triggerNotification();
    }

    // ── Shell-specific rendering ────────────────────────────────────────────
    const fullCmd    = config.hostname || 'root@user:~$ ./user --nowplaying';
    const titlebarHost = fullCmd.split(':')[0].trim() || fullCmd;
    $('shell-title').innerText = titlebarHost;

    const splitIdx = fullCmd.indexOf(':~$ ');
    let cmdHTML;
    if (splitIdx !== -1) {
        const hostPart = fullCmd.substring(0, splitIdx);
        const pathPart = ':~$ ';
        const restPart = fullCmd.substring(splitIdx + 4);
        cmdHTML =
            `<span class="sh-host">${hostPart}</span>` +
            `<span class="sh-path">${pathPart}</span>` +
            `<span class="sh-path">${restPart}</span>`;
    } else {
        cmdHTML = `<span class="sh-host">${fullCmd}</span>`;
    }
    $('sh-cmd').innerHTML = cmdHTML;
    setText('sh-title-label',  tr('sh_title'));
    setText('sh-artist-label', tr('sh_artist'));
    setText('sh-title-val',    currentTitle  || '—');
    setText('sh-artist-val',   currentArtist || '—');
    if (!currentTitle) {
        setText('sh-curr',  tr('time_zero'));
        setText('sh-total', tr('time_zero'));
        $('shell-bracket-bar').innerText = '[--------------------]';
    }
}

// ─── postMessage ────────────────────────────────────────────────────────────

window.addEventListener('message', (e) => {
    if (e.data.type === 'UPDATE_CONFIG') {
        const prevT = config.t;
        config = { ...config, ...e.data.data };
        // If switching TO notif theme while a track is playing, show it immediately
        if (config.t === 'notif' && prevT !== 'notif' && currentTitle) {
            _prevNotifTitle = '';
        }
        updateUI();
    }
});
window.parent.postMessage({ type: 'WIDGET_READY' }, '*');

// ─── Notification trigger ───────────────────────────────────────────────────

function triggerNotification() {
    const el = $('notif-chrome');
    clearTimeout(_notifHideTimer);
    clearTimeout(_notifExitTimer);
    el.classList.remove('notif-out');
    el.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.add('notif-in');
    }));
    _notifHideTimer = setTimeout(() => {
        el.classList.remove('notif-in');
        el.classList.add('notif-out');
        _notifExitTimer = setTimeout(() => {
            el.style.display = 'none';
            el.classList.remove('notif-out');
        }, 650);
    }, 5000);
}

// ─── Magic Colors ───────────────────────────────────────────────────────────

function applyMagicColors() {
    if (!config.magic) return;
    if (!img.src || img.naturalWidth === 0) return;
    try {
        const cv  = $('cv');
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        const S   = 12; cv.width = cv.height = S;
        const sw  = img.naturalWidth / 3, sh = img.naturalHeight / 3;
        ctx.drawImage(img, sw, sh, sw, sh, 0, 0, S, S);
        const d   = ctx.getImageData(0, 0, S, S).data;
        let r=0, g=0, b=0; const px = S * S;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        r = Math.round(r/px); g = Math.round(g/px); b = Math.round(b/px);
        const max = Math.max(r, g, b) || 1;
        const f   = (255 / max) * 0.9;
        r = Math.min(255, Math.round(r*f));
        g = Math.min(255, Math.round(g*f));
        b = Math.min(255, Math.round(b*f));
        document.documentElement.style.setProperty('--acc', `rgb(${r},${g},${b})`);
    } catch(err) { console.warn('[Lyra] Magic CORS:', err); }
}

// R2: Centralized art sync on load — one loop instead of 4 manual assignments
img.onload = () => {
    if (!img.src || img.naturalWidth === 0) return;
    DISPLAY_SETS.forEach(s => syncArt(s.art, img.src));
    applyMagicColors();
};

// ─── WebSocket ──────────────────────────────────────────────────────────────

function connectWS() {
    const ws = new WebSocket(`ws://${window.location.host}`);
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        // Player filter (secondary safety net — server-side is primary)
        if (config.player && data.player) {
            const canonical = data.player.replace(/\.instance\d+$/, '');
            const matches   = data.player === config.player
                           || canonical    === config.player
                           || data.player.startsWith(config.player + '.instance');
            if (!matches) return;
        }

        currentTitle  = data.title  || "";
        currentArtist = data.artist || "";
        if (data.artUrl && img.src !== data.artUrl) { img.crossOrigin = "anonymous"; img.src = data.artUrl; }
        pos = data.position || 0;
        dur = data.length   || 0;
        playing = data.playing || false;

        // R2: Update total time across all display sets + shell
        const fmtDur = fmt(dur);
        DISPLAY_SETS.forEach(s => setText(s.total, fmtDur));
        setText('sh-total', fmtDur);

        updateBracketBar(pos, dur);
        updateUI();
    };
    ws.onclose = () => setTimeout(connectWS, 3000);
    ws.onerror = () => ws.close();
}
connectWS();

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmt(s) {
    if (!s) return "0:00";
    return Math.floor(s/60) + ":" + Math.floor(s%60).toString().padStart(2,'0');
}

function updateBracketBar(position, duration) {
    const el = $('shell-bracket-bar');
    if (!el) return;
    const charW = 7.2;
    const COLS  = Math.max(10, Math.floor((el.offsetWidth || 200) / charW) - 2);
    const pct   = duration > 0 ? Math.min(position / duration, 1) : 0;
    const filled = Math.round(pct * COLS);
    el.innerText = '[' + '#'.repeat(filled) + '-'.repeat(COLS - filled) + ']';
}

// ─── Progress tick ──────────────────────────────────────────────────────────
// R2: One loop replaces 8 manual DOM writes

setInterval(() => {
    if (playing && pos < dur) {
        pos++;
        const pct = (dur > 0 ? (pos / dur) * 100 : 0) + "%";

        // Update all progress bars and current times via registry
        DISPLAY_SETS.forEach(s => {
            setWidth(s.barFill, pct);
            setText(s.curr, fmt(pos));
        });

        // Shell uses bracket bar instead of percentage bar
        setText('sh-curr', fmt(pos));
        updateBracketBar(pos, dur);
    }
}, 1000);

updateUI();
