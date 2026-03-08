'use strict';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const LOG_DIR    = path.join(os.homedir(), '.config', 'lyra', 'logs');
const SESSION_ID = crypto.randomUUID();

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

async function writeErrorReport(code, error, context = {}) {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch(e) {
        console.error('[Lyra] Could not create log directory:', e.message);
        return null;
    }

    let version = '1.0.0';
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
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        console.log(`[Lyra] Error logged: ${code} → ${filename}`);
        
        if (global.lyraWSS) {
            const notification = JSON.stringify({ type: 'ERROR_REPORT', code, filename });
            global.lyraWSS.clients.forEach(c => {
                if (c.readyState === 1) {
                    try { c.send(notification); } catch(e) {}
                }
            });
        }
    } catch(e) {
        console.error('[Lyra] Could not write error report:', e.message);
        return null;
    }

    return filename;
}

function reportError(code, error, context) {
    writeErrorReport(code, error instanceof Error ? error : new Error(String(error)), context);
}

function init() {
    process.on('uncaughtException', (err) => {
        writeErrorReport('UNCAUGHT_EXCEPTION', err);
    });

    process.on('unhandledRejection', (reason) => {
        writeErrorReport('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
    });

    console.log(`[Lyra] Error reporting active — logs → ${LOG_DIR}`);
}

module.exports = { init, reportError, writeErrorReport, CODES, SESSION_ID };