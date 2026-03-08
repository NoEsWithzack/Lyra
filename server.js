'use strict';

const express = require('express');
const path = require('path');
const http = require('http');
const { PORT } = require('./src/config');

// Load Services
const errors = require('./src/services/errors');
const broadcast = require('./src/services/broadcast');

// Load Routes
const playersRoute = require('./src/routes/players');
const fontsRoute = require('./src/routes/fonts');
const presetsRoute = require('./src/routes/presets');
const pluginsRoute = require('./src/routes/plugins');
const backgroundsRoute = require('./src/routes/backgrounds');

const app = express();
const server = http.createServer(app);

// Initialize system-wide error reporting
errors.init();

// This allows the server to accept images up to 10MB
app.use(express.json({ limit: '50mb' }));

// ─── Serve Static Files ─────────────────────────────────────────────────────
// This tells the server that all our HTML/CSS/JS is now in the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ─── Pages ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/widget', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'widget.html'));
});

// ─── API Routes ─────────────────────────────────────────────────────────────
playersRoute.register(app);
fontsRoute.register(app);
presetsRoute.register(app);
pluginsRoute.register(app);
backgroundsRoute.register(app);

// ─── WebSocket Server ───────────────────────────────────────────────────────
broadcast.init(server);

server.listen(PORT, () => {
    console.log(`
        🎵 Lyra v1.0.0 is ready!

    ---------------------------------------
        URL: http://localhost:${PORT}
    ---------------------------------------
    `);
});