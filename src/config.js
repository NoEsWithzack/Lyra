'use strict';

const path = require('path');

module.exports = {
    PORT: parseInt(process.env.LYRA_PORT, 10) || 4640,

    // File paths
    PRESETS_FILE: path.join(__dirname, '..', 'presets.json'),
    PLUGINS_DIR:  path.join(__dirname, '..', 'plugins'),

    // External APIs
    GOOGLE_FONTS_URL: 'https://fonts.google.com/metadata/fonts',
    ITUNES_SEARCH_URL: 'https://itunes.apple.com/search',

    // Player priority — lower index wins in "best available" mode.
    // Dedicated music apps always beat generic browser tabs.
    MUSIC_APP_PRIORITY: [
        'spotify', 'youtube-music', 'YouTubeMusicDesktopApp',
        'vlc', 'rhythmbox', 'clementine', 'strawberry', 'lollypop',
        'audacious', 'deadbeef', 'mpd', 'ncspot',
    ],

    // Broadcast interval (ms)
    BROADCAST_INTERVAL: 1000,

    // WebSocket reconnect delay on client (informational — used by docs, not server)
    WS_RECONNECT_DELAY: 3000,
};
