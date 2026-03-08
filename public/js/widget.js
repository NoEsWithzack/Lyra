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
    t:              params.get('theme')        || 'compact',
    c:              params.get('cover')        || 'square',
    m:              params.get('mode')         || 'dark',
    acc:            params.get('acc')          || '#1db954',
    magic:          params.get('magic')        === 'true',
    glow:           params.get('glow')         === 'true',
    wglow:          params.get('wglow')        === 'true',
    lang:           params.get('lang')         || 'en',
    hostname:       params.get('hostname')     || '',
    player:         params.get('player')       || '',
    font:           params.get('font')         || '',
    hide_paused:    params.get('hide_paused')  === 'true',
    // Vinyl options — default: spin on, full disc, tonearm visible
    vinyl_spin:     params.get('vinyl_spin')     !== 'false',  // true unless explicitly false
    vinyl_circular: params.get('vinyl_circular') === 'true',   // false unless explicitly true
    vinyl_tonearm:  params.get('vinyl_tonearm')  !== 'false',  // true unless explicitly false
};

const w       = $('widget');
const img     = $('art');
const currEl  = $('curr');
const totalEl = $('total');
let pos = 0, dur = 0, playing = false;
let lastSyncTime = Date.now(); // NUEVO: rastrea el tiempo exacto del servidor
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
    // 1. Encontrar y eliminar solo las clases propias de Lyra (protege los futuros plugins)
    const oldClasses = Array.from(w.classList).filter(c => 
        c.startsWith('t-') || c.startsWith('c-') || c.endsWith('-mode') || 
        ['paused', 'glow', 'wglow', 'hide-paused',
         'vinyl-no-spin', 'vinyl-circular', 'vinyl-no-arm'].includes(c)
    );
    oldClasses.forEach(c => w.classList.remove(c));

    // 2. Agregar las nuevas clases de la configuración actual
    w.classList.add(`t-${config.t}`, `c-${config.c}`, `${config.m}-mode`);
    if (currentTitle && !playing) w.classList.add('paused');
    if (config.glow) w.classList.add('glow');
    if (config.wglow) w.classList.add('wglow');
    if (config.hide_paused) w.classList.add('hide-paused');
    // Vinyl customization classes
    if (config.c === 'vinyl') {
        if (!config.vinyl_spin)     w.classList.add('vinyl-no-spin');
        if (config.vinyl_circular)  w.classList.add('vinyl-circular');
        if (!config.vinyl_tonearm)  w.classList.add('vinyl-no-arm');
    }

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
    const fullCmd = config.hostname || 'root@user:~$ ./user --nowplaying';
    const separator = ":~$ ";
    const splitIdx = fullCmd.indexOf(separator);

    let cmdHTML;
    if (splitIdx !== -1) {
        const hostPart = fullCmd.substring(0, splitIdx);
        const restPart = fullCmd.substring(splitIdx + separator.length);
        
        // This creates three segments: the host (colored), the prompt (muted), and the command (muted)
        cmdHTML = 
            `<span class="sh-host">${hostPart}</span>` +
            `<span class="sh-path">${separator}</span>` +
            `<span class="sh-path">${restPart}</span>`;
            
        // Update the window title to just show the user/host part
        $('shell-title').innerText = hostPart.split(':')[0] || "Terminal";
    } else {
        // Fallback if the user typed something custom without the :~$ 
        cmdHTML = `<span class="sh-host">${fullCmd}</span>`;
        $('shell-title').innerText = fullCmd.split(':')[0] || "Terminal";
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
        lastSyncTime = Date.now(); // NUEVO: Reinicia el reloj cada vez que el servidor habla

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

/// ─── Progress tick (60 FPS Smooth Engine) ───────────────────────────────────

function tick() {
    if (playing && dur > 0) {
        // Calcula exactamente cuánto tiempo ha pasado desde el último mensaje del WebSocket
        const elapsedSeconds = (Date.now() - lastSyncTime) / 1000;
        let visualPos = pos + elapsedSeconds;

        // Evita que la barra se desborde antes de que el servidor confirme el cambio de canción
        if (visualPos > dur) visualPos = dur;

        const pct = (visualPos / dur) * 100 + "%";
        const flooredPos = Math.floor(visualPos); // Para los textos (1:23)

        // Actualiza el DOM usando el registro DISPLAY_SETS
        DISPLAY_SETS.forEach(s => {
            setWidth(s.barFill, pct);
            // Solo actualiza el texto si cambió el segundo entero para no estresar el DOM
            if ($(s.curr) && $(s.curr).innerText !== fmt(flooredPos)) {
                setText(s.curr, fmt(flooredPos));
            }
        });

        // Actualizaciones específicas para el tema Shell
        if ($('sh-curr') && $('sh-curr').innerText !== fmt(flooredPos)) {
            setText('sh-curr', fmt(flooredPos));
        }
        updateBracketBar(visualPos, dur);
    }
    
    // Pide al navegador que ejecute esto en el próximo frame de renderizado (~60fps)
    requestAnimationFrame(tick);
}

// Iniciar el ciclo de renderizado
requestAnimationFrame(tick);