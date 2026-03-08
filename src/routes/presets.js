'use strict';

const fs = require('fs').promises;
const { PRESETS_FILE } = require('../config');

// Whitelist of valid config keys - only these get saved to your disk
const VALID_CONFIG_KEYS = ['t', 'c', 'm', 'lang', 'acc', 'magic', 'glow', 'wglow', 'hostname', 'player', 'font', 'hide_paused', 'background'];

async function loadPresetsFile() {
    try {
        const data = await fs.readFile(PRESETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch(e) { 
        return {}; 
    }
}

async function savePresetsFile(presets) {
    try {
        await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf8');
        return true;
    } catch(e) {
        console.error('[Lyra] Could not write presets.json:', e.message);
        return false;
    }
}

function register(app) {
    // GET /api/presets
    app.get('/api/presets', async (req, res) => {
        const presets = await loadPresetsFile();
        res.json({ presets });
    });

    // POST /api/presets
    app.post('/api/presets', async (req, res) => {
        const { name, config } = req.body || {};
        if (!name || typeof name !== 'string' || !config) {
            return res.status(400).json({ error: 'name and config required' });
        }

        // Clean the data: only keep what we know the widget uses
        const cleanConfig = {};
        VALID_CONFIG_KEYS.forEach(key => {
            if (config[key] !== undefined) cleanConfig[key] = config[key];
        });

        const safe = name.trim().slice(0, 64);
        const presets = await loadPresetsFile();
        
        presets[safe] = { ...cleanConfig, savedAt: new Date().toISOString() };
        
        if (await savePresetsFile(presets)) {
            console.log(`[Lyra] Preset saved: "${safe}"`);
            res.json({ ok: true, name: safe });
        } else {
            res.status(500).json({ error: 'Could not write presets.json' });
        }
    });

    // DELETE /api/presets/:name
    app.delete('/api/presets/:name', async (req, res) => {
        const name = req.params.name;
        const presets = await loadPresetsFile();
        if (!presets[name]) return res.status(404).json({ error: 'Preset not found' });
        
        delete presets[name];
        await savePresetsFile(presets);
        console.log(`[Lyra] Preset deleted: "${name}"`);
        res.json({ ok: true });
    });
}

module.exports = { register };