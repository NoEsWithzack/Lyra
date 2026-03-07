'use strict';

const dbus          = require('dbus-next');
const { Message }   = require('dbus-next');
const { MUSIC_APP_PRIORITY } = require('../config');
const { getCanonicalName, playerMatches } = require('../utils/chromium');

// ─── Lazy D-Bus connection ───────────────────────────────────────────────────
// Created on first use rather than at module load. This prevents crashes when
// D-Bus is unavailable (e.g. during Electron startup before desktop session).
let _bus = null;

function getBus() {
    if (!_bus) {
        _bus = dbus.sessionBus();
    }
    return _bus;
}

// ─── List active MPRIS players ───────────────────────────────────────────────
async function listMprisNames() {
    const bus   = getBus();
    const obj   = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
    const iface = obj.getInterface('org.freedesktop.DBus');
    const names = await iface.ListNames();
    return names.filter(n => n.startsWith('org.mpris.MediaPlayer2'));
}

// ─── Player priority scoring ─────────────────────────────────────────────────
function playerPriority(shortName) {
    const canonical = getCanonicalName(shortName);
    const idx = MUSIC_APP_PRIORITY.indexOf(canonical);
    if (idx !== -1)                        return idx;   // known music app
    if (shortName.includes('.instance'))   return 1000;  // generic browser tab
    return 500;                                          // unknown app
}

// ─── Fetch metadata from a single MPRIS player ──────────────────────────────
async function fetchPlayerData(bus, playerName) {
    const shortName = playerName.replace('org.mpris.MediaPlayer2.', '');

    const msgMeta = new Message({
        destination: playerName, path: '/org/mpris/MediaPlayer2',
        interface: 'org.freedesktop.DBus.Properties', member: 'Get',
        signature: 'ss', body: ['org.mpris.MediaPlayer2.Player', 'Metadata'],
    });
    const metaVariant = (await bus.call(msgMeta)).body[0];

    const msgStatus = new Message({
        destination: playerName, path: '/org/mpris/MediaPlayer2',
        interface: 'org.freedesktop.DBus.Properties', member: 'Get',
        signature: 'ss', body: ['org.mpris.MediaPlayer2.Player', 'PlaybackStatus'],
    });
    const status = (await bus.call(msgStatus)).body[0].value;

    const msgPos = new Message({
        destination: playerName, path: '/org/mpris/MediaPlayer2',
        interface: 'org.freedesktop.DBus.Properties', member: 'Get',
        signature: 'ss', body: ['org.mpris.MediaPlayer2.Player', 'Position'],
    });
    const position = (await bus.call(msgPos)).body[0].value;
    const length   = metaVariant.value['mpris:length']?.value || 0;

    return {
        title:    metaVariant.value['xesam:title']?.value          || 'Sin título',
        artist:   metaVariant.value['xesam:artist']?.value?.[0]    || 'Artista desconocido',
        artUrl:   metaVariant.value['mpris:artUrl']?.value         || '',
        playing:  status === 'Playing',
        position: Number(position) / 1_000_000,
        length:   Number(length)   / 1_000_000,
        player:   getCanonicalName(shortName),
    };
}

// ─── Get best MPRIS data based on selected player preference ─────────────────
async function getMprisData(selectedPlayer) {
    try {
        const bus = getBus();
        const allNames = await listMprisNames();
        if (allNames.length === 0) return null;

        // When a player is selected, only look at matching players
        const candidates = selectedPlayer
            ? allNames.filter(n =>
                  playerMatches(n.replace('org.mpris.MediaPlayer2.', ''), selectedPlayer))
            : allNames;

        if (candidates.length === 0) return null;

        // Collect data for all candidates
        const results = [];
        for (const playerName of candidates) {
            try {
                results.push(await fetchPlayerData(bus, playerName));
            } catch { continue; }
        }

        if (results.length === 0) return null;

        // Selected player: first Playing, else first Paused
        if (selectedPlayer) {
            return results.find(r => r.playing) ?? results[0];
        }

        // Best-available mode: Playing > Paused, then by priority score
        const playing = results.filter(r => r.playing);
        const pool    = playing.length > 0 ? playing : results;
        pool.sort((a, b) => playerPriority(a.player) - playerPriority(b.player));
        return pool[0];

    } catch { return null; }
}

module.exports = { listMprisNames, getMprisData };
