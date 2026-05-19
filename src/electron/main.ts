import { app, BrowserWindow, dialog, ipcMain, Notification } from 'electron';
import { formatICalDate, generateId, handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { createTray } from './tray.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import type { Board, Column, Card, Label, Setting, CardLabel, Attachment, UserProfile } from '../types.js';
import type { LowDatabase } from './database.js';
import { initDatabase } from './database.js';
import fs from 'fs';
import { initDiscordRPC, setActivity, clearActivity } from './discord.js';

let mainWindow: BrowserWindow | null = null;
let db: LowDatabase;
const notificationTimeouts: NodeJS.Timeout[] = [];
const notifiedCards = new Set<string>();

async function checkDueDates(db: LowDatabase, window: BrowserWindow) {
    if (!window || window.isDestroyed()) return;
    try {
        await db.read();

        const notificationsEnabled = db.data.settings.find(s => s.key === 'notificationsEnabled')?.value === 'true';
        if (!notificationsEnabled) return;

        const reminderMinutesStr = db.data.settings.find(s => s.key === 'notificationDueReminder')?.value || '30';
        const reminderMinutes = parseInt(reminderMinutesStr, 10);
        const reminderMs = reminderMinutes * 60 * 1000;

        const cardsWithDueDates = db.data.cards
            .filter((card: Card) => card.due_date && !card.deleted_at && !card.archived)
            .map((card: Card) => {
                const column = db.data.columns.find((col: Column) => col.id === card.column_id);
                const board = column ? db.data.boards.find((b: Board) => b.id === column.board_id) : null;
                return {
                    ...card,
                    column_name: column?.name,
                    board_name: board?.name,
                    board_id: board?.id
                };
            });

        const now = new Date();

        for (const card of cardsWithDueDates) {
            const dueDate = new Date(card.due_date!);
            const timeDiff = dueDate.getTime() - now.getTime();

            const isDueSoon = timeDiff > 0 && timeDiff <= reminderMs;
            const isOverdue = timeDiff < 0 && timeDiff > -5 * 60 * 1000;

            const notificationKey = `${card.id}-${card.due_date}`;

            if ((isDueSoon || isOverdue) && !notifiedCards.has(notificationKey)) {
                const isVerySoon = timeDiff > 0 && timeDiff <= 1 * 60 * 1000;

                let body = `"${card.title}" on board "${card.board_name}" is due soon.`;
                if (isOverdue) {
                    body = `"${card.title}" on board "${card.board_name}" is overdue!`;
                } else if (isVerySoon) {
                    body = `"${card.title}" on board "${card.board_name}" is due now!`;
                } else {
                    body = `"${card.title}" on board "${card.board_name}" is due in ${reminderMinutes} minutes.`;
                }

                const notification = new Notification({
                    title: isOverdue ? '⚠️ Task Overdue!' : '⏰ Task Due Soon!',
                    body,
                    icon: path.join(app.getAppPath(), isDev() ? '.' : '..', '/src/assets/icon_rounded.png')
                });

                notification.on('click', () => {
                    window.show();
                    if (app.dock) {
                        app.dock.show();
                    }
                    if (card.board_id) {
                        window.webContents.send('navigate', `/board/${card.board_id}`);
                    }
                });

                notification.show();
                notifiedCards.add(notificationKey);
            }
        }
    } catch (error) {
        console.error('Error checking due dates:', error);
    }
}

async function purgeRecycleBin(db: LowDatabase) {
    try {
        await db.read();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.getTime();

        db.data.boards = db.data.boards.filter((b: Board) =>
            !b.deleted_at || new Date(b.deleted_at).getTime() > cutoff
        );
        db.data.columns = db.data.columns.filter((c: Column) =>
            !c.deleted_at || new Date(c.deleted_at).getTime() > cutoff
        );
        db.data.cards = db.data.cards.filter((c: Card) =>
            !c.deleted_at || new Date(c.deleted_at).getTime() > cutoff
        );

        await db.write();
    } catch (error) {
        console.error('Error purging recycle bin:', error);
    }
}

app.on('ready', async () => {
    app.name = 'Orbit Board';
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.orbitboard.app');
    }

    db = await initDatabase();
    await purgeRecycleBin(db);

    const launchAtStartup = db.data.settings.find(s => s.key === 'launchAtStartup')?.value === 'true';
    const startMinimized = db.data.settings.find(s => s.key === 'startMinimized')?.value === 'true';

    if (!isDev()) {
        app.setLoginItemSettings({
            openAtLogin: launchAtStartup,
            args: startMinimized ? ['--minimized'] : []
        });
    }

    mainWindow = new BrowserWindow({
        title: 'Orbit Board',
        icon: path.join(app.getAppPath(), '/src/assets/icon.png'),
        autoHideMenuBar: true,
        show: !startMinimized,
        webPreferences: {
            preload: getPreloadPath(),
        }
    });

    if (startMinimized && app.dock) {
        app.dock.hide();
    }

    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123');
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'))
    }

    createTray(mainWindow, db);
    handleCloseEvents(mainWindow, db);

    const dueCheckInterval = setInterval(() => {
        if (mainWindow) checkDueDates(db, mainWindow);
    }, 1 * 60 * 1000);

    const initialCheck = setTimeout(() => {
        if (mainWindow) checkDueDates(db, mainWindow);
    }, 5000);
    notificationTimeouts.push(initialCheck);

    app.on('before-quit', () => {
        clearInterval(dueCheckInterval);
        notificationTimeouts.forEach(t => clearTimeout(t));
    });

    const autoUpdateEnabled = db.data.settings.find(s => s.key === 'autoUpdateEnabled')?.value !== 'false';
    if (autoUpdateEnabled && !isDev()) {
        autoUpdater.checkForUpdates();
    }

    const discordEnabled = db.data.settings.find(s => s.key === 'discordEnabled')?.value === 'true';
    if (discordEnabled) {
        initDiscordRPC();
    }
});

// Auto Updater Configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater:update-not-available', info);
});

autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:error', typeof err === 'string' ? err : err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('updater:download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:update-downloaded', info);
});

ipcMain.handle('updater:check', () => {
    if (!isDev()) {
        return autoUpdater.checkForUpdates();
    }
    return null;
});

ipcMain.handle('updater:download', () => {
    return autoUpdater.downloadUpdate();
});

ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.handle('discord:setActivity', async (_event, details: string, state: string, context?: { boardName?: string, cardTitle?: string }) => {
    await db.read();
    const enabled = db.data.settings.find(s => s.key === 'discordEnabled')?.value === 'true';
    if (!enabled) {
        clearActivity();
        return;
    }

    const showBoard = db.data.settings.find(s => s.key === 'discordShowBoard')?.value === 'true';
    const showCard = db.data.settings.find(s => s.key === 'discordShowCard')?.value === 'true';

    let filteredDetails = details;
    let filteredState = state;

    if (context) {
        if (context.boardName) {
            filteredDetails = showBoard ? `Board: ${context.boardName}` : 'Working on a Board';
        }
        if (context.cardTitle) {
            filteredState = showCard ? `Task: ${context.cardTitle}` : 'Working on a Task';
        }
    }

    setActivity(filteredDetails, filteredState);
});

ipcMain.handle('discord:clearActivity', () => {
    clearActivity();
});

// Database IPC Handlers
ipcMain.handle('db:getBoards', async (_event, options: { includeArchived?: boolean; includeDeleted?: boolean } = {}) => {
    try {
        // Removed redundant db.read() for performance
        let boards = db.data.boards;

        if (!options.includeDeleted) {
            boards = boards.filter((b: Board) => !b.deleted_at);
        }
        if (!options.includeArchived) {
            boards = boards.filter((b: Board) => !b.archived);
        }

        boards = boards.sort((a: Board, b: Board) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return { success: true, data: boards };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getBoard', async (_event, id: string) => {
    try {
        const board = db.data.boards.find((b: Board) => b.id === id);
        return { success: true, data: board };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:createBoard', async (_event, board: Board) => {
    try {
        const newBoard = {
            ...board,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived: false,
            deleted_at: null
        };
        db.data.boards.push(newBoard);
        const defaultColumns: Column[] = [
            { id: generateId(), board_id: board.id, name: 'To Do', position: 0, created_at: new Date().toISOString(), archived: false, deleted_at: null },
            { id: generateId(), board_id: board.id, name: 'In Progress', position: 1, created_at: new Date().toISOString(), archived: false, deleted_at: null },
            { id: generateId(), board_id: board.id, name: 'Done', position: 2, created_at: new Date().toISOString(), archived: false, deleted_at: null }
        ];
        db.data.columns.push(...defaultColumns);
        await db.write();
        return { success: true, data: newBoard };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:updateBoard', async (_event, board: Board) => {
    try {
        const index = db.data.boards.findIndex((b: Board) => b.id === board.id);
        if (index >= 0) {
            db.data.boards[index] = { ...board, updated_at: new Date().toISOString() };
            await db.write();
        }
        return { success: true, data: board };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:archiveBoard', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.boards.findIndex((b: Board) => b.id === id);
        if (index >= 0) {
            db.data.boards[index].archived = true;
            db.data.boards[index].updated_at = new Date().toISOString();
            await db.write();
        }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:restoreBoard', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.boards.findIndex((b: Board) => b.id === id);
        if (index >= 0) {
            db.data.boards[index].archived = false;
            db.data.boards[index].deleted_at = null;
            db.data.boards[index].updated_at = new Date().toISOString();
            await db.write();
        }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:bulkRestoreBoards', async (_event, ids: string[]) => {
    try {
        await db.read();
        let changed = false;
        for (const id of ids) {
            const index = db.data.boards.findIndex((b: Board) => b.id === id);
            if (index >= 0) {
                db.data.boards[index].archived = false;
                db.data.boards[index].deleted_at = null;
                db.data.boards[index].updated_at = new Date().toISOString();
                changed = true;
            }
        }
        if (changed) await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:deleteBoard', async (_event, { id, permanent }: { id: string, permanent?: boolean }) => {
    try {
        await db.read();
        if (permanent) {
            db.data.boards = db.data.boards.filter((b: Board) => b.id !== id);
            const columnIds = new Set<string>();
            db.data.columns = db.data.columns.filter((c: Column) => {
                if (c.board_id === id) { columnIds.add(c.id); return false; }
                return true;
            });
            db.data.cards = db.data.cards.filter((c: Card) => !columnIds.has(c.column_id));
            const labelIds = new Set<string>();
            db.data.labels = db.data.labels.filter((l: Label) => {
                if (l.board_id === id) { labelIds.add(l.id); return false; }
                return true;
            });
            db.data.card_labels = db.data.card_labels.filter((cl: CardLabel) => !labelIds.has(cl.label_id));
        } else {
            const index = db.data.boards.findIndex((b: Board) => b.id === id);
            if (index >= 0) {
                db.data.boards[index].deleted_at = new Date().toISOString();
                db.data.boards[index].updated_at = new Date().toISOString();
            }
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:bulkDeleteBoards', async (_event, { ids, permanent }: { ids: string[], permanent?: boolean }) => {
    try {
        await db.read();
        if (permanent) {
            const idSet = new Set(ids);
            db.data.boards = db.data.boards.filter((b: Board) => !idSet.has(b.id));
            const columnIds = new Set<string>();
            db.data.columns = db.data.columns.filter((c: Column) => {
                if (idSet.has(c.board_id)) { columnIds.add(c.id); return false; }
                return true;
            });
            db.data.cards = db.data.cards.filter((c: Card) => !columnIds.has(c.column_id));
            const labelIds = new Set<string>();
            db.data.labels = db.data.labels.filter((l: Label) => {
                if (idSet.has(l.board_id)) { labelIds.add(l.id); return false; }
                return true;
            });
            db.data.card_labels = db.data.card_labels.filter((cl: CardLabel) => !labelIds.has(cl.label_id));
        } else {
            for (const id of ids) {
                const index = db.data.boards.findIndex((b: Board) => b.id === id);
                if (index >= 0) {
                    db.data.boards[index].deleted_at = new Date().toISOString();
                    db.data.boards[index].updated_at = new Date().toISOString();
                }
            }
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:emptyRecycleBin', async () => {
    try {
        await db.read();
        const deletedBoardIds = new Set(db.data.boards.filter(b => b.deleted_at).map(b => b.id));
        db.data.boards = db.data.boards.filter(b => !b.deleted_at);
        const deletedColumnIds = new Set<string>();
        db.data.columns = db.data.columns.filter(c => {
            if (c.deleted_at || deletedBoardIds.has(c.board_id)) { deletedColumnIds.add(c.id); return false; }
            return true;
        });
        db.data.cards = db.data.cards.filter(c => !c.deleted_at && !deletedColumnIds.has(c.column_id));
        const deletedLabelIds = new Set<string>();
        db.data.labels = db.data.labels.filter(l => {
            if (deletedBoardIds.has(l.board_id)) { deletedLabelIds.add(l.id); return false; }
            return true;
        });
        db.data.card_labels = db.data.card_labels.filter(cl => !deletedLabelIds.has(cl.label_id));
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getColumns', async (_event, { boardId, options = {} }: { boardId: string, options: { includeArchived?: boolean, includeDeleted?: boolean } }) => {
    try {
        // Removed redundant db.read()
        let columns = db.data.columns.filter((c: Column) => c.board_id === boardId);
        if (!options.includeDeleted) columns = columns.filter((c: Column) => !c.deleted_at);
        if (!options.includeArchived) columns = columns.filter((c: Column) => !c.archived);
        columns = columns.sort((a: Column, b: Column) => a.position - b.position);
        return { success: true, data: columns };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:createColumn', async (_event, column: Column) => {
    try {
        await db.read();
        const newColumn = { ...column, created_at: new Date().toISOString(), archived: false, deleted_at: null };
        db.data.columns.push(newColumn);
        await db.write();
        return { success: true, data: newColumn };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:updateColumn', async (_event, column: Column) => {
    try {
        await db.read();
        const index = db.data.columns.findIndex((c: Column) => c.id === column.id);
        if (index >= 0) { db.data.columns[index] = column; await db.write(); }
        return { success: true, data: column };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:archiveColumn', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.columns.findIndex((c: Column) => c.id === id);
        if (index >= 0) { db.data.columns[index].archived = true; await db.write(); }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:restoreColumn', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.columns.findIndex((c: Column) => c.id === id);
        if (index >= 0) { db.data.columns[index].archived = false; db.data.columns[index].deleted_at = null; await db.write(); }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:deleteColumn', async (_event, { id, permanent }: { id: string, permanent?: boolean }) => {
    try {
        await db.read();
        if (permanent) {
            db.data.columns = db.data.columns.filter((c: Column) => c.id !== id);
            db.data.cards = db.data.cards.filter((c: Card) => c.column_id !== id);
        } else {
            const index = db.data.columns.findIndex((c: Column) => c.id === id);
            if (index >= 0) db.data.columns[index].deleted_at = new Date().toISOString();
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:updateColumnsPositions', async (_event, columns: { id: string; position: number }[]) => {
    try {
        await db.read();
        for (const col of columns) {
            const index = db.data.columns.findIndex((c: Column) => c.id === col.id);
            if (index >= 0) db.data.columns[index].position = col.position;
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getCards', async (_event, { columnId, options = {} }: { columnId: string, options: { includeArchived?: boolean } }) => {
    try {
        await db.read();
        let cards = db.data.cards.filter((c: Card) => c.column_id === columnId && !c.deleted_at);
        if (!options.includeArchived) cards = cards.filter((c: Card) => !c.archived);
        const cardsWithData = cards.map((card: Card) => {
            const attachmentCount = db.data.attachments.filter((a: Attachment) => a.card_id === card.id).length;
            const labelIds = db.data.card_labels.filter((cl: CardLabel) => cl.card_id === card.id).map((cl: CardLabel) => cl.label_id);
            return { ...card, attachmentCount, labelIds };
        });
        return { success: true, data: cardsWithData.sort((a: Card, b: Card) => a.position - b.position) };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getCardsByBoard', async (_event, { boardId, options = {} }: { boardId: string, options: { includeArchived?: boolean } }) => {
    try {
        await db.read();
        const columnIds = db.data.columns.filter((col: Column) => col.board_id === boardId).map((col: Column) => col.id);
        let cards = db.data.cards.filter((c: Card) => columnIds.includes(c.column_id) && !c.deleted_at);
        if (!options.includeArchived) cards = cards.filter((c: Card) => !c.archived);
        return { success: true, data: cards.sort((a: Card, b: Card) => a.position - b.position) };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:createCard', async (_event, card: Card) => {
    try {
        await db.read();
        const newCard = { ...card, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), archived: false, deleted_at: null };
        db.data.cards.push(newCard);
        await db.write();
        return { success: true, data: newCard };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:updateCard', async (_event, card: Card) => {
    try {
        await db.read();
        const index = db.data.cards.findIndex((c: Card) => c.id === card.id);
        if (index >= 0) { db.data.cards[index] = { ...card, updated_at: new Date().toISOString() }; await db.write(); }
        return { success: true, data: card };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:archiveCard', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.cards.findIndex((c: Card) => c.id === id);
        if (index >= 0) { db.data.cards[index].archived = true; db.data.cards[index].updated_at = new Date().toISOString(); await db.write(); }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:restoreCard', async (_event, id: string) => {
    try {
        await db.read();
        const index = db.data.cards.findIndex((c: Card) => c.id === id);
        if (index >= 0) { db.data.cards[index].archived = false; db.data.cards[index].deleted_at = null; db.data.cards[index].updated_at = new Date().toISOString(); await db.write(); }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:deleteCard', async (_event, { id, permanent }: { id: string, permanent?: boolean }) => {
    try {
        await db.read();
        if (permanent) {
            db.data.cards = db.data.cards.filter((c: Card) => c.id !== id);
            db.data.attachments = db.data.attachments.filter((a: Attachment) => a.card_id !== id);
        } else {
            const index = db.data.cards.findIndex((c: Card) => c.id === id);
            if (index >= 0) { db.data.cards[index].deleted_at = new Date().toISOString(); db.data.cards[index].updated_at = new Date().toISOString(); }
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:updateCardsPositions', async (_event, cards: { id: string; column_id: string; position: number }[]) => {
    try {
        await db.read();
        for (const card of cards) {
            const index = db.data.cards.findIndex((c: Card) => c.id === card.id);
            if (index >= 0) { db.data.cards[index].column_id = card.column_id; db.data.cards[index].position = card.position; }
        }
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:searchCards', async (_event, query: string) => {
    try {
        await db.read();
        const lowerQuery = query.toLowerCase();
        const matchingLabelIds = new Set(db.data.labels.filter((l: Label) => l.name.toLowerCase().includes(lowerQuery)).map((l: Label) => l.id));
        const cardIdsFromLabels = new Set(db.data.card_labels.filter((cl: CardLabel) => matchingLabelIds.has(cl.label_id)).map((cl: CardLabel) => cl.card_id));
        const cards = db.data.cards.filter((c: Card) => !c.deleted_at && (c.title.toLowerCase().includes(lowerQuery) || (c.description && c.description.toLowerCase().includes(lowerQuery)) || (c.notes && c.notes.toLowerCase().includes(lowerQuery)) || cardIdsFromLabels.has(c.id)));
        const cardsWithBoardId = cards.map((c: Card) => {
            const column = db.data.columns.find((col: Column) => col.id === c.column_id);
            return { ...c, board_id: column?.board_id };
        });
        return { success: true, data: cardsWithBoardId };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getAttachments', async (_event, cardId: string) => {
    try { await db.read(); return { success: true, data: db.data.attachments.filter((a: Attachment) => a.card_id === cardId) }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:addAttachment', async (_event, { cardId, file }: { cardId: string, file: { name: string, path: string, type: string, size: number } }) => {
    try {
        await db.read();
        const newAttachment: Attachment = { id: generateId(), card_id: cardId, name: file.name, path: file.path, type: file.type, size: file.size, created_at: new Date().toISOString() };
        db.data.attachments.push(newAttachment);
        await db.write();
        return { success: true, data: newAttachment };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:removeAttachment', async (_event, id: string) => {
    try { await db.read(); db.data.attachments = db.data.attachments.filter((a: Attachment) => a.id !== id); await db.write(); return { success: true }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:getOverviewData', async () => {
    try {
        await db.read();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
        const allCards = db.data.cards.filter((c: Card) => !c.deleted_at && !c.archived);
        const enrichedCards = allCards.map((card: Card) => {
            const column = db.data.columns.find((col: Column) => col.id === card.column_id);
            const board = column ? db.data.boards.find((b: Board) => b.id === column.board_id) : null;
            if (!column || !board) return null;
            return { ...card, columnName: column.name, boardName: board.name, boardId: board.id };
        }).filter((c): c is (Card & { columnName: string; boardName: string; boardId: string }) => c !== null);
        const upcoming = enrichedCards.filter(c => c.due_date && new Date(c.due_date) >= today && new Date(c.due_date) <= nextWeek).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 10);
        const recent = [...enrichedCards].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10);
        return { success: true, data: { upcoming, recent } };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getLabels', async (_event, boardId: string) => {
    try { await db.read(); return { success: true, data: db.data.labels.filter((l: Label) => l.board_id === boardId) }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:createLabel', async (_event, label: Label) => {
    try { await db.read(); db.data.labels.push(label); await db.write(); return { success: true, data: label }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:updateLabel', async (_event, label: Label) => {
    try {
        await db.read();
        const index = db.data.labels.findIndex((l: Label) => l.id === label.id);
        if (index >= 0) { db.data.labels[index] = label; await db.write(); }
        return { success: true, data: label };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:deleteLabel', async (_event, id: string) => {
    try {
        await db.read();
        db.data.labels = db.data.labels.filter((l: Label) => l.id !== id);
        db.data.card_labels = db.data.card_labels.filter((cl: CardLabel) => cl.label_id !== id);
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getCardLabels', async (_event, cardId: string) => {
    try {
        await db.read();
        const labelIds = db.data.card_labels.filter((cl: CardLabel) => cl.card_id === cardId).map((cl: CardLabel) => cl.label_id);
        return { success: true, data: db.data.labels.filter((l: Label) => labelIds.includes(l.id)) };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:addLabelToCard', async (_event, { cardId, labelId }: { cardId: string, labelId: string }) => {
    try {
        await db.read();
        const exists = db.data.card_labels.some((cl: CardLabel) => cl.card_id === cardId && cl.label_id === labelId);
        if (!exists) { db.data.card_labels.push({ card_id: cardId, label_id: labelId }); await db.write(); }
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:removeLabelFromCard', async (_event, { cardId, labelId }: { cardId: string, labelId: string }) => {
    try {
        await db.read();
        db.data.card_labels = db.data.card_labels.filter((cl: CardLabel) => !(cl.card_id === cardId && cl.label_id === labelId));
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:getSetting', async (_event, key: string) => {
    try { await db.read(); const setting = db.data.settings.find((s: Setting) => s.key === key); return { success: true, data: setting ? setting.value : null }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:setSetting', async (_event, { key, value }: { key: string, value: string }) => {
    try {
        await db.read();
        const index = db.data.settings.findIndex((s: Setting) => s.key === key);
        if (index >= 0) db.data.settings[index].value = value;
        else db.data.settings.push({ key, value });
        await db.write();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:exportData', async () => {
    try {
        await db.read();
        const exportData = { version: '1.0', exportDate: new Date().toISOString(), boards: db.data.boards, columns: db.data.columns, cards: db.data.cards, labels: db.data.labels, cardLabels: db.data.card_labels, settings: db.data.settings };
        const { filePath } = await dialog.showSaveDialog(mainWindow!, { title: 'Export Board Data', defaultPath: 'orbit-board-export.json', filters: [{ name: 'JSON Files', extensions: ['json'] }] });
        if (filePath) { fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2)); return { success: true, data: filePath }; }
        return { success: false, error: 'Export cancelled' };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:exportCalendar', async (_event, options: { boardId?: string, cardId?: string } = {}) => {
    try {
        await db.read();
        let cardsToExport = db.data.cards.filter(c => c.due_date && !c.deleted_at && !c.archived);
        if (options.cardId) cardsToExport = cardsToExport.filter(c => c.id === options.cardId);
        else if (options.boardId) {
            const columnIds = db.data.columns.filter(col => col.board_id === options.boardId).map(col => col.id);
            cardsToExport = cardsToExport.filter(c => columnIds.includes(c.column_id));
        }
        if (cardsToExport.length === 0) return { success: false, error: 'No cards with due dates found for export' };
        let icalContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Orbit Board//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'].join('\r\n') + '\r\n';
        for (const card of cardsToExport) {
            const column = db.data.columns.find(col => col.id === card.column_id);
            const board = column ? db.data.boards.find(b => b.id === column.board_id) : null;
            const dueDate = new Date(card.due_date!);
            const startDate = new Date(dueDate.getTime() - 30 * 60 * 1000);
            icalContent += ['BEGIN:VEVENT', `UID:${card.id}@orbitboard.app`, `DTSTAMP:${formatICalDate(new Date())}`, `DTSTART:${formatICalDate(startDate)}`, `DTEND:${formatICalDate(dueDate)}`, `SUMMARY:${card.title}${board ? ` (${board.name})` : ''}`, `DESCRIPTION:${(card.description || '').replace(/\n/g, '\\n')}`, 'STATUS:CONFIRMED', 'END:VEVENT'].join('\r\n') + '\r\n';
        }
        icalContent += 'END:VCALENDAR';
        const { filePath } = await dialog.showSaveDialog(mainWindow!, { title: 'Export Calendar', defaultPath: 'orbit-board-calendar.ics', filters: [{ name: 'iCalendar Files', extensions: ['ics'] }] });
        if (filePath) { fs.writeFileSync(filePath, icalContent); return { success: true, data: filePath }; }
        return { success: false, error: 'Export cancelled' };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:importData', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow!, { title: 'Import Board Data', filters: [{ name: 'JSON Files', extensions: ['json'] }], properties: ['openFile'] });
        if (filePaths && filePaths.length > 0) {
            const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
            const importData = JSON.parse(fileContent);
            if (!importData.version || !importData.boards) return { success: false, error: 'Invalid import file format' };
            await db.read();
            db.data.boards = importData.boards || []; db.data.columns = importData.columns || []; db.data.cards = importData.cards || []; db.data.labels = importData.labels || []; db.data.card_labels = importData.cardLabels || [];
            if (importData.settings) db.data.settings = importData.settings;
            await db.write();
            return { success: true, data: 'Import successful' };
        }
        return { success: false, error: 'Import cancelled' };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('db:resetApplication', async () => {
    try { await db.read(); db.data.boards = []; db.data.columns = []; db.data.cards = []; db.data.labels = []; db.data.card_labels = []; db.data.settings = []; await db.write(); return { success: true }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:getUserProfile', async () => {
    try { await db.read(); const profileSetting = db.data.settings.find(s => s.key === 'userProfile'); if (profileSetting) return { success: true, data: JSON.parse(profileSetting.value) as UserProfile }; return { success: true, data: { name: 'User Name', username: 'username', avatar: '' } as UserProfile }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:updateUserProfile', async (_event, profile: UserProfile) => {
    try { await db.read(); const index = db.data.settings.findIndex(s => s.key === 'userProfile'); const value = JSON.stringify(profile); if (index >= 0) db.data.settings[index].value = value; else db.data.settings.push({ key: 'userProfile', value }); await db.write(); return { success: true }; }
    catch (error: unknown) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
});

ipcMain.handle('db:getActivityStats', async () => {
    try {
        await db.read();
        const stats: { [date: string]: number } = {};
        const addDate = (dateStr: string | null | undefined) => { if (!dateStr || typeof dateStr !== 'string') return; try { const d = new Date(dateStr); if (isNaN(d.getTime())) return; const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; stats[dateKey] = (stats[dateKey] || 0) + 1; } catch {} };
        db.data.cards.forEach(card => { addDate(card.created_at); if (card.updated_at && card.updated_at !== card.created_at) addDate(card.updated_at); });
        db.data.boards.forEach(b => addDate(b.created_at)); db.data.columns.forEach(c => addDate(c.created_at)); db.data.attachments.forEach(a => addDate(a.created_at));
        return { success: true, data: stats };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
