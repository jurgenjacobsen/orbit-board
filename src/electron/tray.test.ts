import { expect, Mock, test, vi } from 'vitest';
import { createTray } from './tray.js';
import { app, BrowserWindow, Menu, Tray, MenuItem } from 'electron';

vi.mock('electron', () => {
    return {
        Tray: vi.fn().mockImplementation(function(this: Tray) {
            this.setContextMenu = vi.fn();
            this.on = vi.fn();
        }),
        app: {
            getAppPath: vi.fn().mockReturnValue('/'),
            dock: { show: vi.fn() },
            quit: vi.fn(),
        },
        Menu: {
            buildFromTemplate: vi.fn(),
        },
    };
});

const mainWindow = {
    show: vi.fn(),
    webContents: {
        send: vi.fn(),
    } as unknown as BrowserWindow['webContents'],
} as unknown as BrowserWindow;

const mockDb = {
    read: vi.fn().mockResolvedValue(undefined),
    data: {
        boards: []
    }
};

test('tray menu items and actions', async () => {
    await createTray(mainWindow, mockDb);

    const calls = (Menu.buildFromTemplate as unknown as Mock).mock.calls;
    const args = calls[0] as Parameters<typeof Menu.buildFromTemplate>;
    const template = args[0];
    
    // 0: Orbit Board, 1: Sep, 2: Show, 3: Sep, 4: Quit
    expect(template).toHaveLength(5);

    expect(template[2].label).toEqual('Show');
    template[2]?.click?.({} as MenuItem, undefined, {} as Electron.KeyboardEvent);
    expect(mainWindow.show).toHaveBeenCalled();
    expect(app.dock?.show).toHaveBeenCalled();

    expect(template[4].label).toEqual('Quit');
    template[4]?.click?.({} as MenuItem, undefined, {} as Electron.KeyboardEvent);
    expect(app.quit).toHaveBeenCalled();
});
