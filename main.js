'use strict';

const { app, BrowserWindow, Tray, Menu, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Intentamos cargar el puerto desde la configuración
const { PORT } = require('./src/config');

// --- 1. ARRANCAR EL SERVIDOR ---
try {
    console.log("[Lyra] Iniciando servidor interno...");
    require('./server.js');
} catch (e) {
    console.error("[Lyra] ERROR CRÍTICO: El servidor no pudo iniciar:", e);
}

let mainWindow;
let tray;

function createWindow() {
    console.log("[Lyra] Creando ventana...");
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Lyra Dashboard",
        backgroundColor: '#09090b',
        autoHideMenuBar: true,
        show: false, // No la mostramos hasta que esté lista
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Esperamos 2 segundos antes de cargar para que el servidor tenga tiempo de sobra
    setTimeout(() => {
        console.log(`[Lyra] Cargando Dashboard en puerto ${PORT}...`);
        mainWindow.loadURL(`http://127.0.0.1:${PORT}`).catch(err => {
            console.error("[Lyra] No se pudo cargar la URL del servidor:", err);
        });
    }, 2000);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // ESTA LÍNEA ES PARA DEPURAR: Si la ventana abre, verás una consola a la derecha.
        // mainWindow.webContents.openDevTools(); 
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    // Versión simplificada para evitar errores de icono
    const iconPath = path.join(__dirname, 'public', 'icon.png');
    if (!fs.existsSync(iconPath)) {
        console.log("[Lyra] ⚠️ No hay icono en /public/icon.png - Saltando bandeja");
        return;
    }

    try {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Lyra Online', enabled: false },
            { type: 'separator' },
            { label: 'Abrir Panel', click: () => mainWindow.show() },
            { label: 'Salir', click: () => {
                app.isQuitting = true;
                app.quit();
            }}
        ]);
        tray.setContextMenu(contextMenu);
    } catch (e) {
        console.error("[Lyra] Error al crear la bandeja:", e);
    }
}

// Configuración de estabilidad para Linux
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});