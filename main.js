'use strict';

/**
 * main.js — Electron entry point for Lyra
 */

const { app, BrowserWindow, shell, nativeImage } = require('electron');
const path = require('path');
const { PORT } = require('./src/config');

let mainWindow = null;

// ── Suppress harmless Linux/Chromium startup noise ────────────────────────
// These affect only video hardware-decoding (VA-API) and D-Bus sandboxing,
// NOT GPU rasterization — the app's rendering stays fully GPU-accelerated.
app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecodeLinuxGL,VaapiVideoDecoder');
app.commandLine.appendSwitch('use-gl', 'desktop');          // force desktop OpenGL (not swiftshader)
app.commandLine.appendSwitch('enable-gpu-rasterization');   // explicit: GPU raster stays on

// Required on Linux for GNOME to match the window to the correct .desktop entry.
// Must be called before app.whenReady().
app.setAppUserModelId('com.lyra.musicwidget');

// Start the HTTP + WebSocket server
require('./server');

const SERVER_URL = `http://localhost:${PORT}`;

function loadDashboard() {
    if (!mainWindow) return;
    mainWindow.loadURL(SERVER_URL).catch(err => {
        // Server not ready yet — retry once after 1.5s
        setTimeout(() => {
            if (mainWindow) mainWindow.loadURL(SERVER_URL).catch(() => {});
        }, 1500);
    });
}

function createWindow() {
    // nativeImage inside whenReady — GPU process is guaranteed ready here.
    const appIcon = nativeImage.createFromPath(
        path.join(__dirname, 'public', 'icon.png')
    );

    mainWindow = new BrowserWindow({
        width:           1280,
        height:           860,
        minWidth:          960,
        minHeight:         600,
        title:           'Lyra',
        autoHideMenuBar:  true,
        backgroundColor: '#12121A',
        icon:             appIcon,
        webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
        },
    });

    // Push NET_WM_ICON to the window manager (taskbar icon on GNOME/KDE).
    mainWindow.setIcon(appIcon);

    // Open external links in the system browser, not in Electron.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Give the Express server 800ms to bind before loading.
    setTimeout(loadDashboard, 800);

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
