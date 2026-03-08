'use strict';

// ─── OBS Recommended Browser Source Sizes ────────────────────────────────────
// Width × Height in pixels. Shown in the dashboard so the streamer knows
// exactly what to type in OBS → Browser Source → Width / Height.
const THEME_SIZES = {
    compact: { w: 800,  h: 100,  note: 'Horizontal bar'        },
    boxy:    { w: 800,  h: 130,  note: 'Two-panel bar'          },
    gallery: { w: 320,  h: 480,  note: 'Portrait card'          },
    macos:   { w: 390,  h: 105,  note: 'macOS music pill'       },
    shell:   { w: 470,  h: 135,  note: 'Terminal window'        },
    neon:    { w: 430,  h: 125,  note: 'Neon waveform bar'      },
    float:   { w: 260,  h: 530,  note: 'Floating panels stack'  },
    notif:   { w: 440,  h: 95,   note: 'Slide-in toast'         },
};

// ─── Dashboard Preview Iframe Sizes ──────────────────────────────────────────
// Scaled to fit the preview panel. Gallery and Float are taller than the
// default 180 px, so they get a larger frame to avoid clipping.
const PREVIEW_SIZES = {
    compact: { w: 490, h: 130 },
    boxy:    { w: 490, h: 185 },
    gallery: { w: 380, h: 540 },
    macos:   { w: 460, h: 190 },   // 390px widget + 50px margins + buffer
    shell:   { w: 545, h: 220 },   // 470px widget + 50px margins + buffer
    neon:    { w: 500, h: 185 },
    float:   { w: 320, h: 590 },
    notif:   { w: 490, h: 130 },
};

const state = { theme: 'compact', cover: 'square', mode: 'dark', lang: 'en' };
let _lastPlayer = '', _selectedFont = '', _currentBg = 'concert', _iframeReady = false, _updatePending = false;

const dashI18n = {
    en: {
        sidebar_title: "Lyra", label_appearance: "Appearance", label_cover: "Cover", label_mode: "Mode",
        label_lang: "Language", label_player: "Player Source", player_all: "All Players", label_font: "Font",
        label_presets: "Presets", label_accent: "Accent & Effects", label_hostname: "Shell Command",
        label_bg: "Preview Background", btn_copy: "COPY OBS URL", btn_reset: "RESET DEFAULTS",
        btn_save: "Save", btn_load_preset: "Load preset…", btn_update: "Update",
    },
    es: {
        sidebar_title: "Lyra", label_appearance: "Apariencia", label_cover: "Portada", label_mode: "Modo",
        label_lang: "Idioma", label_player: "Reproductor", player_all: "Todos", label_font: "Fuente",
        label_presets: "Preajustes", label_accent: "Acento y Efectos", label_hostname: "Comando Shell",
        label_bg: "Fondo de Vista Previa", btn_copy: "COPIAR URL OBS", btn_reset: "RESTABLECER",
        btn_save: "Guardar", btn_load_preset: "Cargar preajuste…", btn_update: "Actualizar",
    }
};

// --- Configuración de fondos por defecto ---
let defaultBgs = [
    { key: 'concert',  icon: '🎸', label: 'Concert' },
    { key: 'dark',     icon: '⬛', label: 'Dark' },
    { key: 'charcoal', icon: '🩶', label: 'Charcoal' },
    { key: 'purple',   icon: '🟣', label: 'Purple' },
    { key: 'teal',     icon: '🔵', label: 'Teal' },
    { key: 'amber',    icon: '🟠', label: 'Amber' }
];

function applyDashLang() {
    const d = dashI18n[state.lang] || dashI18n.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (d[k] !== undefined) el.innerText = d[k];
    });
}

// --- Galería de Fondos Dinámica ---

async function refreshBgGrid() {
    const grid = document.getElementById('bg-grid');
    grid.innerHTML = '';

    // 1. Botones por defecto
    defaultBgs.forEach(bg => {
        const div = createBgOpt(bg.key, bg.icon, bg.label, true);
        grid.appendChild(div);
    });

    // 2. Botón Transparente (No se puede borrar)
    const noneDiv = document.createElement('div');
    noneDiv.className = 'opt' + (_currentBg === 'none' ? ' active' : '');
    noneDiv.innerHTML = `<span>🚫</span><span style="font-size:9px">None</span>`;
    noneDiv.onclick = () => setBg('none', noneDiv);
    grid.appendChild(noneDiv);

    // 3. Fondos subidos por el usuario (desde el servidor)
    try {
        const res = await fetch('/api/backgrounds');
        const { bgs } = await res.json();
        bgs.forEach(url => {
            const fileName = url.split('/').pop();
            const div = createBgOpt(url, '🖼️', 'Custom', false, fileName);
            grid.appendChild(div);
        });
    } catch(e) {}

    // 4. Botón de Subir (+)
    const addDiv = document.createElement('div');
    addDiv.className = 'opt';
    addDiv.style.border = '1px dashed var(--text-dim)';
    addDiv.innerHTML = `<span>📁</span><span style="font-size:9px">Upload</span>`;
    addDiv.onclick = () => document.getElementById('bg-upload').click();
    grid.appendChild(addDiv);
}

function createBgOpt(key, icon, label, isDefault, fileName = '') {
    const div = document.createElement('div');
    div.className = 'opt' + (_currentBg === key ? ' active' : '');
    div.style.position = 'relative';
    div.innerHTML = `<span>${icon}</span><span style="font-size:9px">${label}</span>`;
    
    // Botón de borrar (X)
    const del = document.createElement('button');
    del.innerText = '×';
    del.style = "position:absolute; top:-5px; right:-5px; width:18px; height:18px; border-radius:50%; background:#f43f5e; color:white; border:none; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; line-height:1;";
    del.onclick = (e) => {
        e.stopPropagation();
        deleteBackground(key, isDefault, fileName);
    };
    div.appendChild(del);

    div.onclick = () => setBg(key, div);
    return div;
}

async function deleteBackground(key, isDefault, fileName) {
    if (!confirm('¿Borrar este fondo?')) return;
    
    if (isDefault) {
        // Si es defecto, solo lo quitamos de la lista visual
        defaultBgs = defaultBgs.filter(b => b.key !== key);
    } else {
        // Si es archivo, lo borramos del servidor
        await fetch(`/api/backgrounds/${fileName}`, { method: 'DELETE' });
    }
    
    if (_currentBg === key) _currentBg = 'none';
    refreshBgGrid();
    applyBg(_currentBg);
}

function setBg(key, el) {
    _currentBg = key;
    applyBg(key);
    document.querySelectorAll('#bg-grid .opt').forEach(o => o.classList.remove('active'));
    if (el) el.classList.add('active');
    localStorage.setItem('lyra-bg', key);
}

function applyBg(key) {
    const box = document.getElementById('preview-box');
    box.className = box.className.replace(/\bbg-\w+/g, '').trim();
    if (key.startsWith('/backgrounds/')) {
        box.style.backgroundImage = `url(${key})`;
        box.classList.add('bg-custom');
    } else {
        box.style.backgroundImage = '';
        box.classList.add(`bg-${key}`);
    }
}

async function handleBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showToast('⏳ Uploading...');
    const reader = new FileReader();
    reader.onload = async (e) => {
        const res = await fetch('/api/backgrounds/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: e.target.result })
        });
        const data = await res.json();
        if (data.ok) {
            _currentBg = data.url;
            await refreshBgGrid();
            applyBg(data.url);
            showToast('🖼 Background Saved');
        }
    };
    reader.readAsDataURL(file);
}

// --- Resto de funciones (Presets, Players, etc) ---

async function refreshPlayers() {
    try {
        const res = await fetch('/api/players');
        const { players, selected } = await res.json();
        const sel = document.getElementById('player-select');
        const d = dashI18n[state.lang] || dashI18n.en;
        sel.innerHTML = `<option value="">${d.player_all}</option>`;
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            sel.appendChild(opt);
        });
        if (selected) sel.value = selected;
    } catch(e) {}
}

async function syncPlayerToServer(player) {
    await fetch('/api/player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player }) });
}

async function refreshPresets() {
    const res = await fetch('/api/presets');
    const { presets } = await res.json();
    const sel = document.getElementById('preset-select');
    const d = dashI18n[state.lang] || dashI18n.en;
    sel.innerHTML = `<option value="" disabled selected>${d.btn_load_preset}</option>`;
    Object.keys(presets).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
    });
}

function exportPreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) return showToast('Select a preset');
    fetch('/api/presets').then(r => r.json()).then(data => {
        const blob = new Blob([JSON.stringify(data.presets[name], null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.lyrapreset`;
        a.click();
    });
}

function triggerImport() { document.getElementById('preset-import').click(); }
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const config = JSON.parse(e.target.result);
            const name = file.name.replace('.lyrapreset', '');
            await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config }) });
            refreshPresets();
            showToast('📥 Imported');
        } catch(e) { showToast('❌ Error'); }
    };
    reader.readAsText(file);
}

async function loadPreset() {
    const name = document.getElementById('preset-select').value;
    const { presets } = await (await fetch('/api/presets')).json();
    const cfg = presets[name];
    if (!cfg) return;
    state.theme = cfg.t; state.cover = cfg.c; state.mode = cfg.m; state.lang = cfg.lang;
    document.getElementById('acc').value = cfg.acc;
    document.getElementById('magic').checked = !!cfg.magic;
    document.getElementById('glow').checked = !!cfg.glow;
    document.getElementById('wglow').checked = !!cfg.wglow;
    document.getElementById('hide_paused').checked = !!cfg.hide_paused;
    document.getElementById('hostname').value = cfg.hostname || '';
    document.getElementById('player-select').value = cfg.player || '';
    _selectedFont = cfg.font || '';
    _currentBg = cfg.background || 'concert';
    applyBg(_currentBg);
    // Restore vinyl options (default: spin on, circular off, arm on)
    const spinEl     = document.getElementById('vinyl_spin');
    const circEl     = document.getElementById('vinyl_circular');
    const armEl      = document.getElementById('vinyl_tonearm');
    if (spinEl) spinEl.checked     = cfg.vinyl_spin     !== false;
    if (circEl) circEl.checked     = !!cfg.vinyl_circular;
    if (armEl)  armEl.checked      = cfg.vinyl_tonearm  !== false;
    // Show/hide vinyl options panel to match cover setting
    const vinylOpts = document.getElementById('vinyl-options');
    if (vinylOpts) vinylOpts.style.display = (cfg.c === 'vinyl') ? 'block' : 'none';
    update();
    showToast(`Loaded: ${name}`);
}

async function savePreset() {
    const name = document.getElementById('preset-name').value.trim();
    if (!name) return showToast('Enter name');
    await fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config: currentConfig() }) });
    refreshPresets();
    showToast('✅ Saved');
}

function currentConfig() {
    return {
        t: state.theme, c: state.cover, m: state.mode, lang: state.lang,
        acc: document.getElementById('acc').value,
        magic: document.getElementById('magic').checked,
        glow: document.getElementById('glow').checked,
        wglow: document.getElementById('wglow').checked,
        hostname: document.getElementById('hostname').value,
        player: document.getElementById('player-select').value,
        font: _selectedFont,
        hide_paused: document.getElementById('hide_paused').checked,
        background: _currentBg,
        // Vinyl-specific options (only meaningful when cover === 'vinyl')
        vinyl_spin:     document.getElementById('vinyl_spin')?.checked     ?? true,
        vinyl_circular: document.getElementById('vinyl_circular')?.checked ?? false,
        vinyl_tonearm:  document.getElementById('vinyl_tonearm')?.checked  ?? true,
    };
}

function update() {
    const cfg = currentConfig();
    const q = `?theme=${cfg.t}&cover=${cfg.c}&mode=${cfg.m}&lang=${cfg.lang}&acc=${encodeURIComponent(cfg.acc)}&magic=${cfg.magic}&glow=${cfg.glow}&wglow=${cfg.wglow}&hostname=${encodeURIComponent(cfg.hostname)}&player=${encodeURIComponent(cfg.player)}&font=${encodeURIComponent(cfg.font)}&hide_paused=${cfg.hide_paused}&vinyl_spin=${cfg.vinyl_spin}&vinyl_circular=${cfg.vinyl_circular}&vinyl_tonearm=${cfg.vinyl_tonearm}`;
    const frame = document.getElementById('preview');
    frame.setAttribute('data-url', q);

    // ── Resize iframe to match the selected theme so nothing is clipped ──────
    const ps = PREVIEW_SIZES[cfg.t] || PREVIEW_SIZES.compact;
    frame.width  = ps.w;
    frame.height = ps.h;

    // ── Show OBS recommended browser-source size ──────────────────────────────
    const ts = THEME_SIZES[cfg.t];
    const obsInfo = document.getElementById('obs-info');
    if (obsInfo && ts) {
        obsInfo.innerHTML =
            `📐 OBS Browser Source &nbsp;→&nbsp; <strong>${ts.w} × ${ts.h} px</strong> <span style="opacity:0.6;font-size:11px">(${ts.note})</span>`;
    }

    // ── Sync player filter to server (only when it changes) ──────────────────
    // The widget does client-side filtering via postMessage, but the server
    // also needs to know the selection so it broadcasts the right player data.
    if (cfg.player !== _lastPlayer) {
        _lastPlayer = cfg.player;
        syncPlayerToServer(cfg.player);
    }

    if (frame.contentWindow && _iframeReady) frame.contentWindow.postMessage({ type: 'UPDATE_CONFIG', data: cfg }, '*');
}

function showToast(m) {
    const t = document.getElementById('toast');
    t.innerText = m; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

window.onload = () => {
    applyDashLang();
    refreshPlayers();
    refreshPresets();
    refreshBgGrid();
    const savedBg = localStorage.getItem('lyra-bg');
    if (savedBg) { _currentBg = savedBg; applyBg(savedBg); }
};

window.addEventListener('message', e => {
    if (e.data?.type === 'WIDGET_READY') { _iframeReady = true; update(); }
});

function setTheme(v, el) { state.theme = v; activateOpt(el); update(); }
function setCover(v, el) {
    state.cover = v;
    activateOpt(el);
    const opts = document.getElementById('vinyl-options');
    if (opts) opts.style.display = (v === 'vinyl') ? 'block' : 'none';
    update();
}
function setMode(v, el)  { state.mode  = v; activateOpt(el); update(); }
function setLang(v, el)  { state.lang  = v; activateOpt(el); applyDashLang(); update(); }
function activateOpt(el) {
    el.parentNode.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
}
function reset() { window.location.reload(); }
function copy() {
    const url = window.location.origin + '/widget' + document.getElementById('preview').getAttribute('data-url');
    navigator.clipboard.writeText(url);
    showToast('📋 URL Copied');
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD THEME TOGGLE (light / dark for the control panel itself)
// ═══════════════════════════════════════════════════════════════════════════

function toggleDashTheme() {
    const html    = document.documentElement;
    const isDark  = html.getAttribute('data-theme') !== 'light';
    const next    = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('lyra-dash-theme', next);
    document.getElementById('icon-sun').style.display  = isDark ? 'block' : 'none';
    document.getElementById('icon-moon').style.display = isDark ? 'none'  : 'block';
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOW CHANGE — called by both Cover Glow and Contrast Glow checkboxes
// ═══════════════════════════════════════════════════════════════════════════

function onGlowChange() { update(); }

// ═══════════════════════════════════════════════════════════════════════════
// PRESET — Update & Delete
// ═══════════════════════════════════════════════════════════════════════════

async function updatePreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) return showToast('Select a preset first');
    await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config: currentConfig() })
    });
    showToast(`✅ Updated: ${name}`);
}

async function deletePreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) return showToast('Select a preset first');
    if (!confirm(`Delete preset "${name}"?`)) return;
    await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    refreshPresets();
    showToast(`🗑 Deleted: ${name}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

function triggerBgUpload() {
    document.getElementById('bg-upload').click();
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE FONTS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

let _allFonts = [];

async function loadFonts() {
    if (_allFonts.length > 0) return;
    try {
        const res  = await fetch('/api/fonts');
        const data = await res.json();
        const raw  = Array.isArray(data.fonts) ? data.fonts : [];
        // The Google Fonts metadata API returns objects like { family: "Inter", ... }
        // but some routes may normalise it to plain strings already — handle both.
        _allFonts = raw.map(f => (typeof f === 'string' ? f : f.family)).filter(Boolean);
    } catch(e) { _allFonts = []; }
}

function openFontDropdown() {
    loadFonts().then(() => {
        filterFonts();
        document.getElementById('font-dropdown').style.display = 'block';
    });
}

function closeFontDropdown() {
    setTimeout(() => {
        document.getElementById('font-dropdown').style.display = 'none';
    }, 180);
}

function filterFonts() {
    const query    = document.getElementById('font-input').value.toLowerCase().trim();
    const dropdown = document.getElementById('font-dropdown');
    dropdown.innerHTML = '';
    const matches = query
        ? _allFonts.filter(f => f.toLowerCase().includes(query)).slice(0, 50)
        : _allFonts.slice(0, 50);
    if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding:8px 12px;opacity:0.5;font-size:12px;">No fonts found</div>';
        return;
    }
    matches.forEach(font => {
        const item = document.createElement('div');
        item.className   = 'font-option';
        item.textContent = font;
        item.onmousedown = () => selectFont(font);
        dropdown.appendChild(item);
    });
}

function selectFont(font) {
    _selectedFont = font;
    document.getElementById('font-input').value = font;
    document.getElementById('font-dropdown').style.display = 'none';
    update();
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT — restore dash theme on load
// ═══════════════════════════════════════════════════════════════════════════

(function restoreDashTheme() {
    const saved = localStorage.getItem('lyra-dash-theme');
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        const sun  = document.getElementById('icon-sun');
        const moon = document.getElementById('icon-moon');
        if (sun)  sun.style.display  = 'block';
        if (moon) moon.style.display = 'none';
    }
})();
