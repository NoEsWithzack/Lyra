'use strict';

const express = require('express');
const http    = require('http');
const path    = require('path');
const { PORT } = require('./src/config');

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Page routes
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/widget', (req, res) => res.sendFile(path.join(__dirname, 'widget.html')));

// API routes — each module self-registers its endpoints
require('./src/routes/fonts').register(app);
require('./src/routes/presets').register(app);
require('./src/routes/plugins').register(app);
require('./src/routes/players').register(app);

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────
const server = http.createServer(app);
require('./src/services/broadcast').init(server);

server.listen(PORT, () =>
    console.log(`✅ Lyra running at http://localhost:${PORT}`));
