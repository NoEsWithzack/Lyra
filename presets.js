'use strict';

const fs = require('fs');
const { PRESETS_FILE } = require('../config');

function loadPresetsFile() {
    try {
        if (fs.existsSync(PRESETS_FILE))
            return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    } catch(e) { console.warn('[Lyra] Could not read presets.json:', e.message); }
    return {};
}

function savePresetsFile(presets) {
    try {
        fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf8');
        return true;
    } catch(e) {
        console.error('[Lyra] Could not write presets.json:', e.message);
        return false;
    }
}

/**
 * Register preset routes on the Express app.
 */
function register(app) {
    // GET /api/presets
    app.get('/api/presets', (req, res) => {
        res.json({ presets: loadPresetsFile() });
    });

    // POST /api/presets — body: { name: string, config: object }
    app.post('/api/presets', (req, res) => {
        const { name, config } = req.body || {};
        if (!name || typeof name !== 'string' || !config) {
            return res.status(400).json({ error: 'name and config required' });
        }
        const safe = name.trim().slice(0, 64);
        const presets = loadPresetsFile();
        presets[safe] = { ...config, savedAt: new Date().toISOString() };
        if (savePresetsFile(presets)) {
            console.log(`[Lyra] Preset saved: "${safe}"`);
            res.json({ ok: true, name: safe });
        } else {
            res.status(500).json({ error: 'Could not write presets.json' });
        }
    });

    // DELETE /api/presets/:name
    app.delete('/api/presets/:name', (req, res) => {
        const name = req.params.name;
        const presets = loadPresetsFile();
        if (!presets[name]) return res.status(404).json({ error: 'Preset not found' });
        delete presets[name];
        savePresetsFile(presets);
        console.log(`[Lyra] Preset deleted: "${name}"`);
        res.json({ ok: true });
    });
}

module.exports = { register };
