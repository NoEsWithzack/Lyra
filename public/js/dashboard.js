'use strict';

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
        background: _currentBg
    };
}

function update() {
    const cfg = currentConfig();
    const q = `?theme=${cfg.t}&cover=${cfg.c}&mode=${cfg.m}&lang=${cfg.lang}&acc=${encodeURIComponent(cfg.acc)}&magic=${cfg.magic}&glow=${cfg.glow}&wglow=${cfg.wglow}&hostname=${encodeURIComponent(cfg.hostname)}&player=${encodeURIComponent(cfg.player)}&font=${encodeURIComponent(cfg.font)}&hide_paused=${cfg.hide_paused}`;
    const frame = document.getElementById('preview');
    frame.setAttribute('data-url', q);
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
function setCover(v, el) { state.cover = v; activateOpt(el); update(); }
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