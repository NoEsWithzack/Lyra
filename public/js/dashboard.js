'use strict';

// ─── Centralized State ──────────────────────────────────────────────────────
// R3: Replaces bare globals (t, c, m, l) with a single state object.
// All reads/writes go through this object. No more single-letter variables.

const state = {
    theme:      'compact',
    cover:      'square',
    mode:       'dark',
    lang:       'en',
};

// Font state
let _lastPlayer     = '';
let _selectedFont   = '';
let _currentBg      = 'concert';

// Iframe readiness — prevents lost postMessages during reload
let _iframeReady    = false;
let _updatePending  = false;

// ─── i18n ───────────────────────────────────────────────────────────────────
const dashI18n = {
    en: {
        sidebar_title:    "Lyra",
        label_appearance: "Appearance",
        label_cover:      "Cover",
        label_mode:       "Mode",
        label_lang:       "Language",
        label_player:     "Player Source",
        player_all:       "All Players",
        label_font:       "Font",
        label_presets:    "Presets",
        label_accent:     "Accent & Effects",
        label_hostname:   "Shell Command",
        label_bg:         "Preview Background",
        t_compact:"Compact", t_boxy:"Boxy", t_gallery:"Gallery",
        t_macos:"macOS", t_shell:"Shell", t_neon:"Neon", t_chill:"Float", t_notif:"Alert",
        c_square:"Square", c_vinyl:"Vinyl", c_none:"None",
        m_dark:"Dark 🌙", m_light:"Light ☀️",
        p_magic:"Magic Colors ✨", p_glow:"Cover Glow 🕯️", p_wglow:"Contrast Glow ⚪",
        p_hide_paused:"Hide when paused 🙈",
        btn_copy:"COPY OBS URL", btn_reset:"RESET DEFAULTS", obs_label:"OBS Size",
        btn_save:"Save", btn_load_preset:"Load preset…", btn_update:"Update",
        // Tooltips
        tip_compact:  "Horizontal bar: art thumbnail\n+ track info side by side",
        tip_boxy:     "Two separate frosted boxes:\nart on left, info on right",
        tip_gallery:  "Tall card: large cover art\non top, info below",
        tip_macos:    "macOS-style window bar\nwith art and progress",
        tip_shell:    "Terminal window showing\nnow playing as a command",
        tip_neon:     "Dark bar with waveform\nvisualizer and glow effects",
        tip_float:    "Three separate floating boxes:\nart · info · progress",
        tip_notif:    "Notification popup — slides in\nwhen a new song starts,\nauto-hides after 5 seconds",
        tip_c_square: "Square album art cover",
        tip_c_vinyl:  "Spinning vinyl record\nwith tonearm needle",
        tip_c_none:   "Hide album art cover",
        tip_m_dark:   "Dark widget background",
        tip_m_light:  "Light widget background",
        tip_l_en:     "Widget labels in English",
        tip_l_es:     "Widget labels in Spanish",
        tip_player:   "Filter by music player.\nUse 'All Players' to show\nwhatever is playing",
        tip_refresh:  "Refresh player list",
        tip_save:     "Save current settings as\na named preset",
        tip_update:   "Overwrite selected preset\nwith current settings",
        tip_delete:   "Delete selected preset",
        tip_magic:    "Extracts the dominant color\nfrom the album art and uses\nit as the accent color",
        tip_glow:     "Adds a colored halo around\nthe album art matching\nthe accent color",
        tip_wglow:    "Adds a soft white rim around\nthe whole widget to improve\nvisibility on any background",
        tip_hide_paused: "Widget fades out completely\nwhen playback is paused",
    },
    es: {
        sidebar_title:    "Lyra",
        label_appearance: "Apariencia",
        label_cover:      "Portada",
        label_mode:       "Modo",
        label_lang:       "Idioma",
        label_player:     "Reproductor",
        player_all:       "Todos",
        label_font:       "Fuente",
        label_presets:    "Preajustes",
        label_accent:     "Acento y Efectos",
        label_hostname:   "Comando Shell",
        label_bg:         "Fondo de Vista Previa",
        t_compact:"Compacto", t_boxy:"Cajón", t_gallery:"Galería",
        t_macos:"macOS", t_shell:"Terminal", t_neon:"Neón", t_chill:"Flotante", t_notif:"Alerta",
        c_square:"Cuadrado", c_vinyl:"Vinilo", c_none:"Ninguno",
        m_dark:"Oscuro 🌙", m_light:"Claro ☀️",
        p_magic:"Colores Mágicos ✨", p_glow:"Brillo 🕯️", p_wglow:"Contraste ⚪",
        p_hide_paused:"Ocultar al pausar 🙈",
        btn_copy:"COPIAR URL OBS", btn_reset:"RESTABLECER", obs_label:"Tamaño OBS",
        btn_save:"Guardar", btn_load_preset:"Cargar preajuste…", btn_update:"Actualizar",
        // Tooltips
        tip_compact:  "Barra horizontal: miniatura\nde portada + info lateral",
        tip_boxy:     "Dos cajas separadas:\nportada a la izq., info a la der.",
        tip_gallery:  "Tarjeta vertical: portada\ngrande arriba, info abajo",
        tip_macos:    "Barra estilo macOS con\nportada y barra de progreso",
        tip_shell:    "Ventana de terminal que muestra\nlo que suena como comando",
        tip_neon:     "Barra oscura con visualizador\nde forma de onda y efectos",
        tip_float:    "Tres cajas flotantes separadas:\nportada · info · progreso",
        tip_notif:    "Notificación emergente — aparece\ncuando empieza una canción\nnueva, se oculta tras 5 segundos",
        tip_c_square: "Portada cuadrada",
        tip_c_vinyl:  "Disco de vinilo girando\ncon aguja de tonearm",
        tip_c_none:   "Ocultar la portada",
        tip_m_dark:   "Fondo oscuro del widget",
        tip_m_light:  "Fondo claro del widget",
        tip_l_en:     "Etiquetas del widget en inglés",
        tip_l_es:     "Etiquetas del widget en español",
        tip_player:   "Filtrar por reproductor.\nUsa 'Todos' para mostrar\ncualquier fuente activa",
        tip_refresh:  "Actualizar lista de reproductores",
        tip_save:     "Guardar la configuración\nactual como preajuste",
        tip_update:   "Sobrescribir el preajuste\nseleccionado con los ajustes actuales",
        tip_delete:   "Eliminar preajuste seleccionado",
        tip_magic:    "Extrae el color dominante\nde la portada y lo usa\ncomo color de acento",
        tip_glow:     "Agrega un halo de color\nalrededor de la portada\nmatcheando el color de acento",
        tip_wglow:    "Agrega un borde blanco suave\nalrededor del widget para\nmejorar la visibilidad",
        tip_hide_paused: "El widget se desvanece\ncompletamente al pausar",
    }
};

function applyDashLang() {
    const d = dashI18n[state.lang] || dashI18n.en;
    // Translate text labels
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (d[k] !== undefined) el.innerText = d[k];
    });
    // Translate tooltips — data-tip-key drives the data-tip CSS attr
    document.querySelectorAll('[data-tip-key]').forEach(el => {
        const k = el.getAttribute('data-tip-key');
        if (d[k] !== undefined) el.setAttribute('data-tip', d[k]);
    });
    const allOpt = document.getElementById('player-all-opt');
    if (allOpt) allOpt.innerText = d.player_all || 'All Players';
    const obsEl = document.getElementById('obs-info');
    if (obsEl && obsEl.innerText) {
        const dims = obsEl.innerText.match(/\d+px x \d+px/);
        if (dims) obsEl.innerText = `${d.obs_label}: ${dims[0]}`;
    }
}

// ─── Dashboard light/dark ───────────────────────────────────────────────────
function toggleDashTheme() {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    html.setAttribute('data-theme', isLight ? 'dark' : 'light');
    document.getElementById('icon-sun').style.display  = isLight ? 'none'  : '';
    document.getElementById('icon-moon').style.display = isLight ? ''      : 'none';
    try { localStorage.setItem('lyra-dash-theme', isLight ? 'dark' : 'light'); } catch(e){}
}

function initDashTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem('lyra-dash-theme') || 'dark'; } catch(e){}
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('icon-sun').style.display  = saved === 'light' ? '' : 'none';
    document.getElementById('icon-moon').style.display = saved === 'light' ? 'none' : '';
}

// ─── Player source ──────────────────────────────────────────────────────────
async function refreshPlayers() {
    try {
        const res = await fetch('/api/players');
        const { players, selected: serverSelected } = await res.json();
        const sel = document.getElementById('player-select');
        const d   = dashI18n[state.lang] || dashI18n.en;
        sel.innerHTML = `<option id="player-all-opt" value="">${d.player_all || 'All Players'}</option>`;
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            sel.appendChild(opt);
        });
        const toSelect = serverSelected || '';
        if (toSelect && players.includes(toSelect)) {
            sel.value = toSelect; _lastPlayer = toSelect;
        }
    } catch(e) { console.warn('Could not fetch players:', e); }
}

async function syncPlayerToServer(player) {
    try {
        await fetch('/api/player', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });
    } catch(e) {}
}

// ─── Font search — infinite scroll ──────────────────────────────────────────
let _fontList      = [];
let _filteredFonts = [];
let _fontPage      = 0;
let _fontDropTimer = null;
const FONTS_PER_PAGE = 120;

async function initFonts() {
    try {
        const res = await fetch('/api/fonts');
        const { fonts } = await res.json();
        _fontList = fonts || [];
    } catch(e) { console.warn('Could not load font list:', e); }
    // Attach infinite scroll on dropdown
    document.getElementById('font-dropdown').addEventListener('scroll', function() {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 60) {
            loadMoreFonts();
        }
    });
}

function buildFontItems(fonts, append) {
    const dd = document.getElementById('font-dropdown');
    if (!append) {
        dd.innerHTML = '';
        // Default option — Inter, always loaded
        const def = document.createElement('div');
        def.className = 'font-opt' + (_selectedFont === '' ? ' active' : '');
        def.innerHTML = `<span style="font-family:'Inter',sans-serif">Inter (Default)</span><span class="font-cat">sans-serif</span>`;
        def.onmousedown = () => selectFont('', 'Inter (Default)');
        dd.appendChild(def);
    }
    fonts.forEach(f => {
        const opt = document.createElement('div');
        opt.className = 'font-opt' + (_selectedFont === f.family ? ' active' : '');
        opt.innerHTML = `<span style="font-family:'${f.family}',sans-serif">${f.family}</span><span class="font-cat">${f.category||''}</span>`;
        opt.onmousedown = () => selectFont(f.family, f.family);
        opt.dataset.fontFamily = f.family;
        dd.appendChild(opt);
    });
    _injectFontPreviewLink(fonts.map(f => f.family));
}

// Batch-load up to 12 fonts at a time for preview
let _previewFontsLoaded = new Set();
function _injectFontPreviewLink(families) {
    const toLoad = families.filter(f => f && !_previewFontsLoaded.has(f)).slice(0, 12);
    if (!toLoad.length) return;
    toLoad.forEach(f => _previewFontsLoaded.add(f));
    const params = toLoad.map(f => `family=${encodeURIComponent(f)}:wght@400`).join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
    document.head.appendChild(link);
}

function loadMoreFonts() {
    const start = _fontPage * FONTS_PER_PAGE;
    const slice = _filteredFonts.slice(start, start + FONTS_PER_PAGE);
    if (!slice.length) return;
    buildFontItems(slice, true);
    _fontPage++;
}

function openFontDropdown() {
    clearTimeout(_fontDropTimer);
    document.getElementById('font-input').value = '';
    _filteredFonts = _fontList;
    _fontPage = 0;
    buildFontItems(_filteredFonts.slice(0, FONTS_PER_PAGE), false);
    _fontPage = 1;
    document.getElementById('font-dropdown').classList.add('open');
}

function filterFonts() {
    const q = document.getElementById('font-input').value.toLowerCase().trim();
    _filteredFonts = q ? _fontList.filter(f => f.family.toLowerCase().includes(q)) : _fontList;
    _fontPage = 0;
    buildFontItems(_filteredFonts.slice(0, FONTS_PER_PAGE), false);
    _fontPage = 1;
    document.getElementById('font-dropdown').classList.add('open');
}

function closeFontDropdown() {
    _fontDropTimer = setTimeout(() => {
        document.getElementById('font-dropdown').classList.remove('open');
        document.getElementById('font-input').value = _selectedFont || '';
    }, 180);
}

function selectFont(family, displayName) {
    _selectedFont = family;
    document.getElementById('font-input').value = displayName || '';
    document.getElementById('font-dropdown').classList.remove('open');
    update();
}

// ─── Presets ────────────────────────────────────────────────────────────────
function showToast(msg) {
    const el = document.getElementById('toast');
    el.innerText = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
}

async function refreshPresets() {
    try {
        const { presets } = await (await fetch('/api/presets')).json();
        const d   = dashI18n[state.lang] || dashI18n.en;
        const sel = document.getElementById('preset-select');
        const cur = sel.value;
        sel.innerHTML = `<option value="" disabled>${d.btn_load_preset || 'Load preset…'}</option>`;
        Object.keys(presets).sort().forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            sel.appendChild(opt);
        });
        if (cur && sel.querySelector(`option[value="${CSS.escape(cur)}"]`)) sel.value = cur;
        else sel.value = '';
    } catch(e) {}
}

async function updatePreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) { showToast((dashI18n[state.lang]||dashI18n.en).toast_select_first || 'Select a preset first'); return; }
    try {
        const res = await fetch('/api/presets', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, config: currentConfig() })
        });
        if ((await res.json()).ok) {
            showToast(`✅ Updated "${name}"`);
            await refreshPresets();
            document.getElementById('preset-select').value = name;
        }
    } catch(e) { showToast('Update failed'); }
}

async function savePreset() {
    const name = document.getElementById('preset-name').value.trim();
    if (!name) { showToast('Enter a preset name first'); return; }
    try {
        const res = await fetch('/api/presets', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, config: currentConfig() })
        });
        if ((await res.json()).ok) {
            showToast(`✅ Saved "${name}"`);
            document.getElementById('preset-name').value = '';
            await refreshPresets();
            document.getElementById('preset-select').value = name;
        }
    } catch(e) { showToast('Save failed'); }
}

async function loadPreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) return;
    try {
        const { presets } = await (await fetch('/api/presets')).json();
        const cfg = presets[name]; if (!cfg) return;

        // R3: Apply preset to state
        state.theme = cfg.t || 'compact';
        state.cover = cfg.c || 'square';
        state.mode  = cfg.m || 'dark';
        state.lang  = cfg.lang || 'en';
        _selectedFont = cfg.font || '';

        document.getElementById('acc').value      = cfg.acc || '#1db954';
        document.getElementById('magic').checked  = !!cfg.magic;
        document.getElementById('glow').checked   = !!cfg.glow;
        document.getElementById('wglow').checked  = !!cfg.wglow;
        document.getElementById('hide_paused').checked = !!cfg.hide_paused;
        document.getElementById('hostname').value = cfg.hostname || '';
        document.getElementById('font-input').value = cfg.font || '';
        document.getElementById('player-select').value = cfg.player || '';
        if ((cfg.player || '') !== _lastPlayer) syncPlayerToServer(cfg.player || '');

        // Update active classes on option buttons
        document.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
        [`t-${state.theme}`,`c-${state.cover}`,`m-${state.mode}`,`l-${state.lang}`].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('active');
        });

        // Restore background from preset
        if (cfg.background && cfg.background !== 'custom') {
            const bgBtn = document.querySelector(`#bg-grid [data-bg="${cfg.background}"]`);
            setBg(cfg.background, bgBtn);
        }

        applyDashLang(); update();
        showToast(`✅ Loaded "${name}"`);
    } catch(e) { showToast('Load failed'); }
}

async function deletePreset() {
    const name = document.getElementById('preset-select').value;
    if (!name) { showToast('Select a preset to delete'); return; }
    if (!confirm(`Delete preset "${name}"?`)) return;
    try {
        await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
        showToast(`🗑 Deleted "${name}"`);
        await refreshPresets();
    } catch(e) { showToast('Delete failed'); }
}

// R3: Build config from centralized state + DOM checkboxes
function currentConfig() {
    return {
        t:           state.theme,
        c:           state.cover,
        m:           state.mode,
        lang:        state.lang,
        acc:         document.getElementById('acc').value,
        magic:       document.getElementById('magic').checked,
        glow:        document.getElementById('glow').checked,
        wglow:       document.getElementById('wglow').checked,
        hostname:    document.getElementById('hostname').value || '',
        player:      document.getElementById('player-select').value || '',
        font:        _selectedFont || '',
        hide_paused: document.getElementById('hide_paused').checked,
        background:  _currentBg,
    };
}

// ─── Preview Background (1.4) ───────────────────────────────────────────────
// Affects dashboard preview only — NOT the OBS widget output.
// Built-in options + custom image upload stored in localStorage.

const BG_PRESETS = ['concert', 'dark', 'charcoal', 'purple', 'teal', 'amber', 'none', 'custom'];

function setBg(key, el) {
    if (key === 'custom' && !_hasCustomBg()) return;  // triggerBgUpload handles this
    _currentBg = key;
    applyBg(key);
    // Update active states in bg grid
    document.querySelectorAll('#bg-grid .opt').forEach(o => o.classList.remove('active'));
    if (el) el.classList.add('active');
    try { localStorage.setItem('lyra-bg', key); } catch(e) {}
}

function applyBg(key) {
    const box = document.getElementById('preview-box');
    // Remove all bg-* classes
    box.className = box.className.replace(/\bbg-\w+/g, '').trim();
    if (key === 'custom') {
        const img = _loadCustomBg();
        if (img) {
            box.classList.add('bg-custom');
            box.style.backgroundImage = `url(${img})`;
        } else {
            box.classList.add('bg-concert'); // fallback
        }
    } else {
        box.style.backgroundImage = '';
        box.classList.add(`bg-${key}`);
    }
}

function triggerBgUpload() {
    document.getElementById('bg-upload').click();
}

function handleBgUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { localStorage.setItem('lyra-bg-custom', e.target.result); } catch(err) {
            showToast('Image too large for localStorage');
            return;
        }
        // Activate the custom option
        const customOpt = document.querySelector('#bg-grid [data-bg="custom"]');
        setBg('custom', customOpt);
        showToast('✅ Background uploaded');
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // allow re-uploading same file
}

function _hasCustomBg() { try { return !!localStorage.getItem('lyra-bg-custom'); } catch(e) { return false; } }
function _loadCustomBg() { try { return localStorage.getItem('lyra-bg-custom'); } catch(e) { return null; } }

function initBg() {
    let saved = 'concert';
    try { saved = localStorage.getItem('lyra-bg') || 'concert'; } catch(e) {}
    _currentBg = saved;
    applyBg(saved);
    // Set active state on the matching button
    const btn = document.querySelector(`#bg-grid [data-bg="${saved}"]`);
    if (btn) {
        document.querySelectorAll('#bg-grid .opt').forEach(o => o.classList.remove('active'));
        btn.classList.add('active');
    }
}

// ─── Error Banner (1.5) ─────────────────────────────────────────────────────
// Listens for ERROR_REPORT messages on the dashboard WebSocket.
// Displays a dismissible banner with the error code and log filename.

let _dashWs = null;

function initDashWebSocket() {
    _dashWs = new WebSocket(`ws://${window.location.host}`);
    _dashWs.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'ERROR_REPORT') {
                showErrorBanner(msg.code, msg.filename);
            }
            // ignore regular track data on dashboard WS
        } catch(err) {}
    };
    _dashWs.onclose = () => setTimeout(initDashWebSocket, 5000);
    _dashWs.onerror = () => _dashWs.close();
}

function showErrorBanner(code, filename) {
    const container = document.getElementById('error-banner-container');
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML = `
        <button class="error-close" onclick="this.parentNode.remove()">✕</button>
        <strong>⚠ ${code}</strong>
        <div class="error-detail">Saved to ~/.config/lyra/logs/${filename || 'unknown'}</div>
    `;
    container.appendChild(banner);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 10000);
}

// ─── Plugins ────────────────────────────────────────────────────────────────
async function loadPlugins() {
    try {
        const { plugins } = await (await fetch('/api/plugins')).json();
        const allThemes = plugins.flatMap(p => p.themes.map(th => ({ ...th, _plugin: p.name })));
        if (!allThemes.length) return;
        const section = document.getElementById('plugin-themes-section');
        const grid    = document.getElementById('plugin-theme-grid');
        section.style.display = 'block';
        allThemes.forEach(theme => {
            (document.lyraPluginSizes = document.lyraPluginSizes || {})[theme.id] = [theme.obsWidth, theme.obsHeight];
            const btn = document.createElement('div');
            btn.id = `t-${theme.id}`; btn.className = 'opt'; btn.title = theme._plugin;
            btn.textContent = theme.label; btn.onclick = () => setTheme(theme.id, btn);
            grid.appendChild(btn);
        });
    } catch(e) {}
}

// ─── Setters ────────────────────────────────────────────────────────────────
// R3: Named setters that update centralized state
function setTheme(v, el) { state.theme = v; activateOpt(el); update(); }
function setCover(v, el) { state.cover = v; activateOpt(el); update(); }
function setMode(v, el)  { state.mode  = v; activateOpt(el); update(); }
function setLang(v, el)  { state.lang  = v; activateOpt(el); applyDashLang(); update(); }

function activateOpt(el) {
    el.parentNode.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
}

function reset() {
    state.theme = 'compact';
    state.cover = 'square';
    state.mode  = 'dark';
    state.lang  = 'en';
    document.getElementById('acc').value         = '#1db954';
    document.getElementById('magic').checked     = false;
    document.getElementById('glow').checked      = false;
    document.getElementById('wglow').checked     = false;
    document.getElementById('hide_paused').checked = false;
    document.getElementById('hostname').value    = '';
    document.getElementById('player-select').value = '';
    document.getElementById('font-input').value  = '';
    _selectedFont = '';
    syncPlayerToServer('');
    document.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
    ['t-compact','c-square','m-dark','l-en'].forEach(id => document.getElementById(id)?.classList.add('active'));
    // Reset background to default
    const concertBtn = document.querySelector('#bg-grid [data-bg="concert"]');
    setBg('concert', concertBtn);
    applyDashLang(); update();
}

// ─── OBS size registry ──────────────────────────────────────────────────────
const OBS_SIZES = {
    compact: [460, 120],
    boxy:    [600, 210],
    gallery: [370, 480],
    macos:   [450, 150],
    shell:   [510, 190],
    neon:    [490, 140],
    float:   [290, 420],
    notif:   [460, 120],
};

// Fix 4: Cover Glow and Contrast Glow are mutually exclusive
function onGlowChange(which) {
    const glowEl  = document.getElementById('glow');
    const wglowEl = document.getElementById('wglow');
    if (which === 'glow' && glowEl.checked)  wglowEl.checked = false;
    if (which === 'wglow' && wglowEl.checked) glowEl.checked = false;
    update();
}

let _updateTimer = null;

function update() {
    clearTimeout(_updateTimer);
    
    _updateTimer = setTimeout(() => {
        const magic       = document.getElementById('magic').checked;
        const glow        = document.getElementById('glow').checked;
        const wglow       = document.getElementById('wglow').checked;
        const acc         = document.getElementById('acc').value;
        const hostname    = document.getElementById('hostname').value || '';
        const player      = document.getElementById('player-select').value || '';
        const font        = _selectedFont || '';
        const hide_paused = document.getElementById('hide_paused').checked;

        document.getElementById('shell-hostname-wrap').style.display = (state.theme === 'shell') ? 'block' : 'none';

        const sizes = { ...OBS_SIZES, ...(document.lyraPluginSizes || {}) };
        const [ws, hs] = sizes[state.theme] ||[490, 180];
        const frame = document.getElementById('preview');
        frame.width = ws; frame.height = hs;

        const d = dashI18n[state.lang] || dashI18n.en;
        document.getElementById('obs-info').innerText = `${d.obs_label}: ${ws}px x ${hs}px`;

        const q = `?theme=${state.theme}&cover=${state.cover}&mode=${state.mode}&lang=${state.lang}&acc=${encodeURIComponent(acc)}&magic=${magic}&glow=${glow}&wglow=${wglow}&hostname=${encodeURIComponent(hostname)}&player=${encodeURIComponent(player)}&font=${encodeURIComponent(font)}&hide_paused=${hide_paused}`;
        frame.setAttribute('data-url', q);

        if (player !== _lastPlayer) {
            _lastPlayer = player;
            syncPlayerToServer(player);
            _iframeReady = false;
            _updatePending = true;
            frame.src = '/widget' + q;
            return;
        }

        if (!_iframeReady) {
            _updatePending = true;
            return;
        }

        if (frame.contentWindow) {
            frame.contentWindow.postMessage({
                type: 'UPDATE_CONFIG',
                data: {
                    t: state.theme, c: state.cover, m: state.mode,
                    acc, magic, glow, wglow, lang: state.lang,
                    hostname, player, font, hide_paused,
                }
            }, '*');
        }
    }, 100);
}

function copy() {
    const url = window.location.origin + '/widget' + document.getElementById('preview').getAttribute('data-url');
    navigator.clipboard.writeText(url);
    const b = document.getElementById('copyBtn');
    const d = dashI18n[state.lang] || dashI18n.en;
    b.innerText = 'COPIED! ✅'; b.classList.add('success');
    setTimeout(() => { b.innerText = d.btn_copy; b.classList.remove('success'); }, 2000);
}

// ─── Init ───────────────────────────────────────────────────────────────────
window.onload = () => {
    initDashTheme();
    applyDashLang();
    initBg();
    refreshPlayers();
    initFonts();
    refreshPresets();
    loadPlugins();
    initDashWebSocket();
    // Initial update fires after iframe sends WIDGET_READY
    _iframeReady = false;
    _updatePending = true;
};
window.addEventListener('message', e => {
    if (e.data?.type === 'WIDGET_READY') {
        _iframeReady = true;
        if (_updatePending) { _updatePending = false; update(); }
    }
});
