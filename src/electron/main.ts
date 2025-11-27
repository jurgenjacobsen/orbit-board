import { app, BrowserWindow } from 'electron';
import path from 'path';
import { handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { createTray } from './tray.js';

app.on('ready', () => {
    const mainWindow = new BrowserWindow({
        title: 'Orbit Board',
        icon: path.join(app.getAppPath(), '/src/assets/icon.png'),
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
});
