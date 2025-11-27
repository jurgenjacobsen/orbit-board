import { BrowserWindow, ipcMain, WebContents, WebFrameMain, app } from 'electron';
import { pathToFileURL } from 'url';
import crypto from 'crypto';
import { getUIPath } from './pathResolver.js';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function generateId() {
    return crypto.randomUUID();
}

export function ipcMainHandle<Key extends keyof EventPayloadMapping>(
  key: Key,
  handler: () => any //EventPayloadMapping[Key]
) {
  ipcMain.handle(key, (event) => {
    validateEventFrame(event.senderFrame);
    return handler();
  });
}

export function ipcMainOn<Key extends keyof EventPayloadMapping>(
  key: Key,
  handler: (payload: EventPayloadMapping[Key]) => void
) {
  ipcMain.on(key, (event, payload) => {
    validateEventFrame(event.senderFrame);
    return handler(payload);
  });
}

export function ipcWebContentsSend<Key extends keyof EventPayloadMapping>(
  key: Key,
  webContents: WebContents,
  payload: EventPayloadMapping[Key]
) {
  webContents.send(key, payload);
}

export function validateEventFrame(frame: WebFrameMain | null) {
  if (isDev() && new URL(frame?.url || '').host === 'localhost:5123') {
    return;
  }
  if (frame?.url !== pathToFileURL(getUIPath()).toString()) {
    throw new Error('Malicious event');
  }
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
