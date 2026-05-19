import { BrowserWindow, app } from 'electron';
import crypto from 'crypto';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function generateId() {
    return crypto.randomUUID();
}

export function formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function handleCloseEvents(mainWindow: BrowserWindow, db: any) {
    let willClose = false;

    mainWindow.on('close', async (e) => {
        if (willClose) {
            return;
        }

        await db.read();
        const closeToTray = db.data.settings.find((s: any) => s.key === 'closeToTray')?.value !== 'false';

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
