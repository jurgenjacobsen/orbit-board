import { BrowserWindow, app } from 'electron';
import crypto from 'crypto';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function generateId() {
    return crypto.randomUUID();
}

export function handleCloseEvents(mainWindow: BrowserWindow) {
    let willClose = false;

    mainWindow.on('close', (e) => {
        if (willClose) {
            return;
        }
        e.preventDefault();
        mainWindow.hide();
        if (app.dock) {
            app.dock.hide();
        }
    });

    app.on('before-quit', () => {
        willClose = true;
    });

    mainWindow.on('show', () => {
        willClose = false;
    });
}
