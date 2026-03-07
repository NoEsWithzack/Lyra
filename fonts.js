'use strict';

const https = require('https');
const { GOOGLE_FONTS_URL } = require('../config');

let googleFontsCache = [];

function fetchGoogleFonts() {
    https.get(GOOGLE_FONTS_URL, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
            try {
                // Response starts with ")]}'\n" — strip it
                const clean = body.replace(/^\)\]\}'\n/, '');
                const data  = JSON.parse(clean);
                if (Array.isArray(data.familyMetadataList)) {
                    googleFontsCache = data.familyMetadataList
                        .map(f => ({ family: f.family, category: f.category }))
                        .sort((a, b) => a.family.localeCompare(b.family));
                    console.log(`[Lyra] Loaded ${googleFontsCache.length} Google Fonts`);
                }
            } catch(e) {
                console.warn('[Lyra] Could not parse Google Fonts metadata:', e.message);
            }
        });
    }).on('error', (e) => {
        console.warn('[Lyra] Could not fetch Google Fonts:', e.message);
    });
}

/**
 * Register font routes on the Express app.
 * Also triggers initial font list fetch.
 */
function register(app) {
    // Fetch on startup
    fetchGoogleFonts();

    // GET /api/fonts — returns all font families (optionally filtered by ?q=)
    app.get('/api/fonts', (req, res) => {
        const q = (req.query.q || '').toLowerCase();
        const list = q
            ? googleFontsCache.filter(f => f.family.toLowerCase().includes(q))
            : googleFontsCache;
        res.json({ fonts: list, total: googleFontsCache.length });
    });
}

module.exports = { register };
