'use strict';

const https = require('https');
const { ITUNES_SEARCH_URL } = require('../config');

// ─── Track-keyed art cache ───────────────────────────────────────────────────
let _lastTrackKey = '';
let _cachedArtUrl = '';

/**
 * Fetch high-res album art from iTunes.
 * Strips parenthetical/bracket modifiers from title for cleaner search.
 */
function fetchAlbumArt(title, artist) {
    return new Promise(resolve => {
        if (!title) return resolve('');
        const clean = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const q     = encodeURIComponent(`${clean} ${artist}`.trim());
        https.get(`${ITUNES_SEARCH_URL}?term=${q}&media=music&limit=1`, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.results?.length > 0
                        ? json.results[0].artworkUrl100.replace('100x100bb', '1000x1000bb')
                        : '');
                } catch { resolve(''); }
            });
        }).on('error', () => resolve(''));
    });
}

/**
 * Resolve album art for a track, using cache when the track hasn't changed.
 * Falls back to iTunes API when MPRIS artUrl is missing or is a local file://.
 * Returns the art URL string (may be empty).
 */
async function resolveArt(data) {
    const trackKey = `${data.title}-${data.artist}`;
    if (trackKey !== _lastTrackKey) {
        _lastTrackKey = trackKey;
        _cachedArtUrl = (!data.artUrl || data.artUrl.startsWith('file://'))
            ? await fetchAlbumArt(data.title, data.artist)
            : data.artUrl;
    }
    return _cachedArtUrl;
}

module.exports = { resolveArt };
