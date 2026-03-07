'use strict';

const fs   = require('fs');
const path = require('path');
const { PLUGINS_DIR } = require('../config');

const loadedPlugins = [];

function loadPlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        console.log('[Lyra] Created plugins/ directory');
        return;
    }
    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            delete require.cache[require.resolve(path.join(PLUGINS_DIR, file))];
            const mod = require(path.join(PLUGINS_DIR, file));
            if (!mod.name || !mod.version) {
                console.warn(`[Lyra] Plugin ${file} missing name or version, skipped`);
                continue;
            }
            // Validate themes
            const themes = (mod.themes || []).filter(t => t.id && t.label && t.css);
            // Validate sources
            const sources = (mod.sources || []).filter(s => s.id && s.label);
            loadedPlugins.push({ ...mod, themes, sources, _file: file });
            console.log(`[Lyra] Plugin loaded: ${mod.name} v${mod.version} (${themes.length} themes, ${sources.length} sources)`);
        } catch(e) {
            console.error(`[Lyra] Failed to load plugin ${file}:`, e.message);
        }
    }
}

/**
 * Register plugin routes on the Express app.
 * Also triggers plugin scanning on startup.
 */
function register(app) {
    loadPlugins();

    // GET /api/plugins — returns all loaded plugins (CSS inlined per theme)
    app.get('/api/plugins', (req, res) => {
        res.json({ plugins: loadedPlugins.map(p => ({
            name:        p.name,
            version:     p.version,
            author:      p.author  || '',
            description: p.description || '',
            themes: p.themes.map(t => ({
                id:        t.id,
                label:     t.label,
                css:       t.css,
                obsWidth:  t.obsWidth  || 460,
                obsHeight: t.obsHeight || 120,
            })),
            sources: p.sources.map(s => ({ id: s.id, label: s.label })),
        }))});
    });
}

module.exports = { register };
