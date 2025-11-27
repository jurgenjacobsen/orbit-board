import { app, BrowserWindow } from 'electron';
import path from 'path';
import { handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { initDatabase } from './database.js';
import { createTray } from './tray.js';
import { registerIpcHandlers } from './ipcHandlers.js';

app.on('ready', () => {
    const db = initDatabase();

    const mainWindow = new BrowserWindow({
        title: 'Orbit Board',
        icon: path.join(app.getAppPath(), '/assets/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: getPreloadPath(),
        }
    });

    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123');
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'))
    }

    createTray(mainWindow);
    handleCloseEvents(mainWindow);

    // Register all IPC handlers
    registerIpcHandlers(db, mainWindow);
});
