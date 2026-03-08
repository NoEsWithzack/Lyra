'use strict';

/**
 * main.js — Electron entry point for Lyra
 *
 * Responsibilities:
 *   1. Start the Express + WebSocket server (server.js)
 *   2. Create the BrowserWindow with correct icon
 *   3. Load the dashboard once the HTTP server is ready
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { PORT } = require('./src/config');

let mainWindow = null;

// Start the HTTP + WebSocket server
require('./server');

const SERVER_URL = `http://localhost:${PORT}`;

function createWindow() {
    mainWindow = new BrowserWindow({
        width:           1280,
        height:           860,
        minWidth:          960,
        minHeight:         600,
        title:           'Lyra',
        autoHideMenuBar:  true,
        backgroundColor: '#12121A',
        // ── App icon: used in taskbar, dock, alt+tab, and window title bar ──
        // Electron on Linux requires an absolute path to a PNG file.
        icon: path.join(__dirname, 'public', 'icon.png'),
        webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
        },
    });

    // Open external links in the system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Grace period: give server.listen() time to bind
    setTimeout(() => {
        mainWindow.loadURL(SERVER_URL).catch(() => {
            setTimeout(() => mainWindow.loadURL(SERVER_URL), 1500);
        });
    }, 800);

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
