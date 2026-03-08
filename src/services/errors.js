'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');

const LOG_DIR    = path.join(os.homedir(), '.config', 'lyra', 'logs');
const SESSION_ID = crypto.randomUUID();

// ─── Error code registry ────────────────────────────────────────────────────
// See ROADMAP Section 7 for the full specification.
const CODES = {
    MPRIS_CONNECTION_FAILED: 'D-Bus session bus unavailable',
    MPRIS_PLAYER_LOST:       'Player disconnected mid-session',
    ART_FETCH_FAILED:        'Album art API timeout or error',
    WS_SEND_FAILED:          'WebSocket client error during broadcast',
    CONFIG_PARSE_FAILED:     'Invalid URL params or config',
    PLUGIN_LOAD_FAILED:      'Plugin threw on register',
    PRESET_CORRUPT:          'Invalid preset JSON',
    UNCAUGHT_EXCEPTION:      'Unhandled exception',
    UNHANDLED_REJECTION:     'Unhandled async rejection',
};

// ─── Write structured error report to disk ──────────────────────────────────

function writeErrorReport(code, error, context = {}) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch(e) {
        console.error('[Lyra] Could not create log directory:', e.message);
        return null;
    }

    let version = '0.4.0';
    try { version = require('../../package.json').version; } catch(e) {}

    const report = {
        lyra_version: version,
        platform:     process.platform,
        timestamp:    new Date().toISOString(),
        session_id:   SESSION_ID,
        error: {
            code,
            message: error?.message || String(error),
            stack:   error?.stack || '',
            context,
        },
        system: {
            node_version: process.version,
            os_release:   os.release(),
            arch:         process.arch,
        },
    };

    const filename = `lyra-error-${Date.now()}.json`;
    const filepath = path.join(LOG_DIR, filename);

    try {
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        console.error(`[Lyra] Error logged: ${code} → ${filename}`);
    } catch(e) {
        console.error('[Lyra] Could not write error report:', e.message);
        return null;
    }

    // Notify dashboard via WebSocket
    if (global.lyraWSS) {
        const notification = JSON.stringify({ type: 'ERROR_REPORT', code, filename });
        global.lyraWSS.clients.forEach(c => {
            if (c.readyState === 1) {
                try { c.send(notification); } catch(e) {}
            }
        });
    }

    return filename;
}

// ─── Convenience wrappers ───────────────────────────────────────────────────

function reportError(code, error, context) {
    return writeErrorReport(code, error instanceof Error ? error : new Error(String(error)), context);
}

// ─── Global handlers ────────────────────────────────────────────────────────

function init() {
    process.on('uncaughtException', (err) => {
        writeErrorReport('UNCAUGHT_EXCEPTION', err);
        // Don't re-throw — let the process survive non-fatal errors
    });

    process.on('unhandledRejection', (reason) => {
        writeErrorReport('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
    });

    console.log(`[Lyra] Error reporting active — logs → ${LOG_DIR}`);
}

module.exports = { init, reportError, writeErrorReport, CODES, SESSION_ID };
