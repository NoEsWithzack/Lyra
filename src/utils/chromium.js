'use strict';

/**
 * Extract canonical player name from a Chromium instance identifier.
 * e.g. 'chromium.instance234168' → 'chromium'
 *      'spotify'                 → 'spotify'
 */
function getCanonicalName(shortName) {
    const m = shortName.match(/^([a-zA-Z0-9_-]+)\.instance\d+$/);
    return m ? m[1] : shortName;
}

/**
 * Collapse Chromium instance names into a single canonical entry.
 * ['chromium.instance1', 'chromium.instance2', 'spotify']
 *   → ['chromium', 'spotify']
 */
function collapseChromiumInstances(shortNames) {
    const seen   = new Set();
    const result = [];
    for (const name of shortNames) {
        const canonical = getCanonicalName(name);
        if (!seen.has(canonical)) {
            seen.add(canonical);
            result.push(canonical);
        }
    }
    return result;
}

/**
 * Does a D-Bus short name match the user's selected player?
 * 'youtube-music' → exact match only
 * 'chromium'      → matches 'chromium', 'chromium.instance234168', etc.
 */
function playerMatches(shortName, selected) {
    if (!selected) return true;
    if (shortName === selected) return true;
    if (shortName.startsWith(selected + '.instance')) return true;
    return false;
}

module.exports = { getCanonicalName, collapseChromiumInstances, playerMatches };
