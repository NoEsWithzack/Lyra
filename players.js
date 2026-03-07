'use strict';

const { listMprisNames } = require('../services/mpris');
const { collapseChromiumInstances } = require('../utils/chromium');
const { getSelectedPlayer, setSelectedPlayer } = require('../services/broadcast');

/**
 * Register player routes on the Express app.
 */
function register(app) {
    // GET /api/players — player list with chromium instances collapsed
    app.get('/api/players', async (req, res) => {
        try {
            const names   = await listMprisNames();
            const players = collapseChromiumInstances(
                names.map(n => n.replace('org.mpris.MediaPlayer2.', ''))
            );
            res.json({ players, selected: getSelectedPlayer() });
        } catch (e) {
            res.json({ players: [], selected: getSelectedPlayer() });
        }
    });

    // POST /api/player — set server-side player preference
    // body: { player: 'youtube-music' }  or  { player: '' } to clear
    app.post('/api/player', (req, res) => {
        const player = (req.body?.player ?? '').trim();
        setSelectedPlayer(player);
        res.json({ ok: true, selected: getSelectedPlayer() });
    });
}

module.exports = { register };
