import { BrowserWindow, app } from 'electron';
import type { LowDatabase } from './database.js';
import type { Setting } from '../types.js';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export function formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function handleCloseEvents(mainWindow: BrowserWindow, db: LowDatabase) {
    let willClose = false;

    mainWindow.on('close', async (e) => {
        if (willClose) {
            return;
        }

        await db.read();
        const closeToTray = db.data.settings.find((s: Setting) => s.key === 'closeToTray')?.value !== 'false';

        if (closeToTray) {
            e.preventDefault();
            mainWindow.hide();
            if (app.dock) {
                app.dock.hide();
            }
        }
    });

    app.on('before-quit', () => {
        willClose = true;
    });

    mainWindow.on('show', () => {
        willClose = false;
    });
}
