'use strict';

const { WebSocketServer } = require('ws');
const { BROADCAST_INTERVAL } = require('../config');
const { getMprisData } = require('./mpris');
const { resolveArt }   = require('./albumArt');

let _wss            = null;
let _selectedPlayer  = '';
let _lastDataString  = '';
let _broadcastTimer  = null;

// ─── Player preference ──────────────────────────────────────────────────────

function getSelectedPlayer() {
    return _selectedPlayer;
}

function setSelectedPlayer(player) {
    _selectedPlayer = player;
    console.log(`[Lyra] Player filter → ${_selectedPlayer || '(any)'}`);
    broadcastNow(); // re-broadcast immediately so clients don't wait up to 1s
}

// ─── WebSocket server ────────────────────────────────────────────────────────

function getWSS() {
    return _wss;
}

/**
 * Create a WebSocket server attached to the given HTTP server,
 * and start the periodic broadcast loop.
 */
function init(httpServer) {
    _wss = new WebSocketServer({ server: httpServer });
    // Expose globally for plugin/error-reporting access (matches original behavior)
    global.lyraWSS = _wss;

    _broadcastTimer = setInterval(broadcastNow, BROADCAST_INTERVAL);
    return _wss;
}

// ─── Broadcast loop ──────────────────────────────────────────────────────────

async function broadcastNow() {
    const data = await getMprisData(_selectedPlayer);
    if (!data) return;

    data.artUrl = await resolveArt(data);

    const str = JSON.stringify(data);
    if (str !== _lastDataString) {
        _lastDataString = str;
        if (_wss) {
            _wss.clients.forEach(c => { if (c.readyState === 1) c.send(str); });
        }
    }
}

module.exports = {
    init,
    getWSS,
    getSelectedPlayer,
    setSelectedPlayer,
    broadcastNow,
};
