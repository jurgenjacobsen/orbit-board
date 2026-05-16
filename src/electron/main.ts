import { app, BrowserWindow,dialog,ipcMain,Notification } from 'electron';
import { generateId, handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { createTray } from './tray.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import type { Board, Column, Card, Label, Setting, CardLabel, Attachment, UserProfile } from '../types.js';
import type { LowDatabase } from './database.js';
import { initDatabase } from './database.js';
import fs from 'fs';

const notificationTimeouts: NodeJS.Timeout[] = [];

async function checkDueDates(db: LowDatabase, mainWindow: BrowserWindow) {
    try {
        await db.read();

        // Get cards with due dates by joining data
        const cardsWithDueDates = db.data.cards
            .filter((card: Card) => card.due_date)
            .map((card: Card) => {
                const column = db.data.columns.find((col: Column) => col.id === card.column_id);
                const board = column ? db.data.boards.find((b: Board) => b.id === column.board_id) : null;
                return {
                    ...card,
                    column_name: column?.name,
                    board_name: board?.name
                };
            });

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const card of cardsWithDueDates) {
            const dueDate = new Date(card.due_date!);
            const timeDiff = dueDate.getTime() - now.getTime();

            // Notify if due within 24 hours or overdue
            if (timeDiff <= oneDayMs && timeDiff > -oneDayMs) {
                const isOverdue = timeDiff < 0;
                const notification = new Notification({
                    title: isOverdue ? '⚠️ Task Overdue!' : '⏰ Task Due Soon!',
                    body: `"${card.title}" on board "${card.board_name}" is ${isOverdue ? 'overdue' : 'due within 24 hours'}`,
                    icon: path.join(app.getAppPath(), isDev() ? '.' : '..', '/src/assets/icon.png')
                });

                notification.on('click', () => {
                    mainWindow.show();
                    if (app.dock) {
                        app.dock.show();
                    }
                });

                notification.show();
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

        let changed = false;

        // Purge Boards
        const originalBoardCount = db.data.boards.length;
        db.data.boards = db.data.boards.filter((b: Board) => 
            !b.deleted_at || new Date(b.deleted_at).getTime() > cutoff
        );
        if (db.data.boards.length !== originalBoardCount) changed = true;

        // Purge Columns
        const originalColumnCount = db.data.columns.length;
        db.data.columns = db.data.columns.filter((c: Column) => 
            !c.deleted_at || new Date(c.deleted_at).getTime() > cutoff
        );
        if (db.data.columns.length !== originalColumnCount) changed = true;

        // Purge Cards
        const originalCardCount = db.data.cards.length;
        db.data.cards = db.data.cards.filter((c: Card) => 
            !c.deleted_at || new Date(c.deleted_at).getTime() > cutoff
        );
        if (db.data.cards.length !== originalCardCount) changed = true;

        if (changed) {
            await db.write();
            console.log('Recycle bin purged of items older than 30 days.');
        }
    } catch (error) {
        console.error('Error purging recycle bin:', error);
    }
}

app.on('ready', async () => {
    const db = await initDatabase();
    await purgeRecycleBin(db);

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

    // Check due dates every 30 minutes
    const dueCheckInterval = setInterval(() => {
        checkDueDates(db, mainWindow);
    }, 30 * 60 * 1000);

    // Initial check after app starts (with 5 second delay)
    const initialCheck = setTimeout(() => {
        checkDueDates(db, mainWindow);
    }, 5000);
    notificationTimeouts.push(initialCheck);

    app.on('before-quit', () => {
        clearInterval(dueCheckInterval);
        notificationTimeouts.forEach(t => clearTimeout(t));
    });

    autoUpdater.checkForUpdatesAndNotify();

    // Database IPC Handlers
    // Get all boards
    ipcMain.handle('db:getBoards', async (_event, options: { includeArchived?: boolean; includeDeleted?: boolean } = {}) => {
        try {
            await db.read();
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
            await db.read();
            const board = db.data.boards.find((b: Board) => b.id === id);
            return { success: true, data: board };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:createBoard', async (_event, board: Board) => {
        try {
            await db.read();

            const newBoard = {
                ...board,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived: false,
                deleted_at: null
            };
            db.data.boards.push(newBoard);

            // Create default columns
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
            await db.read();
            const index = db.data.boards.findIndex((b: Board) => b.id === board.id);
            if (index >= 0) {
                db.data.boards[index] = {
                    ...board,
                    updated_at: new Date().toISOString()
                };
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
                // Permanent Delete logic (existing)
                db.data.boards = db.data.boards.filter((b: Board) => b.id !== id);
                const columnIds = new Set<string>();
                db.data.columns = db.data.columns.filter((c: Column) => {
                    if (c.board_id === id) {
                        columnIds.add(c.id);
                        return false;
                    }
                    return true;
                });
                db.data.cards = db.data.cards.filter((c: Card) => !columnIds.has(c.column_id));
                const labelIds = new Set<string>();
                db.data.labels = db.data.labels.filter((l: Label) => {
                    if (l.board_id === id) {
                        labelIds.add(l.id);
                        return false;
                    }
                    return true;
                });
                db.data.card_labels = db.data.card_labels.filter((cl: CardLabel) => !labelIds.has(cl.label_id));
            } else {
                // Move to Recycle Bin
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
                    if (idSet.has(c.board_id)) {
                        columnIds.add(c.id);
                        return false;
                    }
                    return true;
                });
                
                db.data.cards = db.data.cards.filter((c: Card) => !columnIds.has(c.column_id));
                
                const labelIds = new Set<string>();
                db.data.labels = db.data.labels.filter((l: Label) => {
                    if (idSet.has(l.board_id)) {
                        labelIds.add(l.id);
                        return false;
                    }
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
            
            // Boards in recycle bin
            const deletedBoardIds = new Set(
                db.data.boards.filter(b => b.deleted_at).map(b => b.id)
            );

            // 1. Permanently delete boards in recycle bin
            db.data.boards = db.data.boards.filter(b => !b.deleted_at);

            // 2. Permanently delete columns that are either:
            //    a) marked as deleted themselves
            //    b) belong to a board that was in the recycle bin
            const deletedColumnIds = new Set<string>();
            db.data.columns = db.data.columns.filter(c => {
                if (c.deleted_at || deletedBoardIds.has(c.board_id)) {
                    deletedColumnIds.add(c.id);
                    return false;
                }
                return true;
            });

            // 3. Permanently delete cards that are either:
            //    a) marked as deleted themselves
            //    b) belong to a column that was deleted
            db.data.cards = db.data.cards.filter(c => 
                !c.deleted_at && !deletedColumnIds.has(c.column_id)
            );

            // 4. Clean up labels and card_labels for deleted boards
            const deletedLabelIds = new Set<string>();
            db.data.labels = db.data.labels.filter(l => {
                if (deletedBoardIds.has(l.board_id)) {
                    deletedLabelIds.add(l.id);
                    return false;
                }
                return true;
            });
            db.data.card_labels = db.data.card_labels.filter(cl => !deletedLabelIds.has(cl.label_id));

            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Column operations
    ipcMain.handle('db:getColumns', async (_event, { boardId, options = {} }: { boardId: string, options: { includeArchived?: boolean, includeDeleted?: boolean } }) => {
        try {
            await db.read();
            let columns = db.data.columns
                .filter((c: Column) => c.board_id === boardId);

            if (!options.includeDeleted) {
                columns = columns.filter((c: Column) => !c.deleted_at);
            }
            if (!options.includeArchived) {
                columns = columns.filter((c: Column) => !c.archived);
            }

            columns = columns.sort((a: Column, b: Column) => a.position - b.position);
            return { success: true, data: columns };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:createColumn', async (_event, column: Column) => {
        try {
            await db.read();
            const newColumn = {
                ...column,
                created_at: new Date().toISOString(),
                archived: false,
                deleted_at: null
            };
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
            if (index >= 0) {
                db.data.columns[index] = column;
                await db.write();
            }
            return { success: true, data: column };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:archiveColumn', async (_event, id: string) => {
        try {
            await db.read();
            const index = db.data.columns.findIndex((c: Column) => c.id === id);
            if (index >= 0) {
                db.data.columns[index].archived = true;
                await db.write();
            }
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:restoreColumn', async (_event, id: string) => {
        try {
            await db.read();
            const index = db.data.columns.findIndex((c: Column) => c.id === id);
            if (index >= 0) {
                db.data.columns[index].archived = false;
                db.data.columns[index].deleted_at = null;
                await db.write();
            }
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
                if (index >= 0) {
                    db.data.columns[index].deleted_at = new Date().toISOString();
                }
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
                if (index >= 0) {
                    db.data.columns[index].position = col.position;
                }
            }
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Card operations
    ipcMain.handle('db:getCards', async (_event, { columnId, options = {} }: { columnId: string, options: { includeArchived?: boolean } }) => {
        try {
            await db.read();
            let cards = db.data.cards
                .filter((c: Card) => c.column_id === columnId && !c.deleted_at);

            if (!options.includeArchived) {
                cards = cards.filter((c: Card) => !c.archived);
            }

            const cardsWithData = cards.map((card: Card) => {
                const attachmentCount = db.data.attachments.filter((a: Attachment) => a.card_id === card.id).length;
                const labelIds = db.data.card_labels
                    .filter((cl: CardLabel) => cl.card_id === card.id)
                    .map((cl: CardLabel) => cl.label_id);
                return { ...card, attachmentCount, labelIds };
            });

            const sortedCards = cardsWithData.sort((a: Card, b: Card) => a.position - b.position);
            return { success: true, data: sortedCards };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:getCardsByBoard', async (_event, { boardId, options = {} }: { boardId: string, options: { includeArchived?: boolean } }) => {
        try {
            await db.read();
            const columnIds = db.data.columns
                .filter((col: Column) => col.board_id === boardId)
                .map((col: Column) => col.id);
            let cards = db.data.cards
                .filter((c: Card) => columnIds.includes(c.column_id) && !c.deleted_at);

            if (!options.includeArchived) {
                cards = cards.filter((c: Card) => !c.archived);
            }

            cards = cards.sort((a: Card, b: Card) => a.position - b.position);
            return { success: true, data: cards };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:createCard', async (_event, card: Card) => {
        try {
            await db.read();
            const newCard = {
                ...card,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived: false,
                deleted_at: null
            };
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
            if (index >= 0) {
                db.data.cards[index] = {
                    ...card,
                    updated_at: new Date().toISOString()
                };
                await db.write();
            }
            return { success: true, data: card };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:archiveCard', async (_event, id: string) => {
        try {
            await db.read();
            const index = db.data.cards.findIndex((c: Card) => c.id === id);
            if (index >= 0) {
                db.data.cards[index].archived = true;
                db.data.cards[index].updated_at = new Date().toISOString();
                await db.write();
            }
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:restoreCard', async (_event, id: string) => {
        try {
            await db.read();
            const index = db.data.cards.findIndex((c: Card) => c.id === id);
            if (index >= 0) {
                db.data.cards[index].archived = false;
                db.data.cards[index].deleted_at = null;
                db.data.cards[index].updated_at = new Date().toISOString();
                await db.write();
            }
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
                // Also delete attachments
                db.data.attachments = db.data.attachments.filter((a: Attachment) => a.card_id !== id);
            } else {
                const index = db.data.cards.findIndex((c: Card) => c.id === id);
                if (index >= 0) {
                    db.data.cards[index].deleted_at = new Date().toISOString();
                    db.data.cards[index].updated_at = new Date().toISOString();
                }
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
                if (index >= 0) {
                    db.data.cards[index].column_id = card.column_id;
                    db.data.cards[index].position = card.position;
                }
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
            
            // Find labels that match the query
            const matchingLabels = db.data.labels.filter((l: Label) => 
                l.name.toLowerCase().includes(lowerQuery)
            );
            const matchingLabelIds = new Set(matchingLabels.map((l: Label) => l.id));
            
            // Find card IDs associated with those labels
            const cardIdsFromLabels = new Set(
                db.data.card_labels
                    .filter((cl: CardLabel) => matchingLabelIds.has(cl.label_id))
                    .map((cl: CardLabel) => cl.card_id)
            );

            const cards = db.data.cards.filter((c: Card) =>
                !c.deleted_at &&
                (c.title.toLowerCase().includes(lowerQuery) ||
                (c.description && c.description.toLowerCase().includes(lowerQuery)) ||
                (c.notes && c.notes.toLowerCase().includes(lowerQuery)) ||
                cardIdsFromLabels.has(c.id))
            );

            // Add board_id to each card
            const cardsWithBoardId = cards.map((c: Card) => {
                const column = db.data.columns.find((col: Column) => col.id === c.column_id);
                return {
                    ...c,
                    board_id: column?.board_id
                };
            });

            return { success: true, data: cardsWithBoardId };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Attachment operations
    ipcMain.handle('db:getAttachments', async (_event, cardId: string) => {
        try {
            await db.read();
            const attachments = db.data.attachments.filter((a: Attachment) => a.card_id === cardId);
            return { success: true, data: attachments };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:addAttachment', async (_event, { cardId, file }: { cardId: string, file: { name: string, path: string, type: string, size: number } }) => {
        try {
            await db.read();

            // In a real app, we'd copy the file to a local storage folder.
            // For now, we'll just store the reference.
            const newAttachment: Attachment = {
                id: generateId(),
                card_id: cardId,
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size,
                created_at: new Date().toISOString()
            };

            db.data.attachments.push(newAttachment);
            await db.write();
            return { success: true, data: newAttachment };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:removeAttachment', async (_event, id: string) => {
        try {
            await db.read();
            db.data.attachments = db.data.attachments.filter((a: Attachment) => a.id !== id);
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });


    ipcMain.handle('db:getOverviewData', async () => {
        try {
            await db.read();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);

            // Get all non-deleted, non-archived cards
            const allCards = db.data.cards.filter((c: Card) => !c.deleted_at && !c.archived);

            // Enrich with board/column info
            const enrichedCards = allCards.map((card: Card) => {
                const column = db.data.columns.find((col: Column) => col.id === card.column_id);
                const board = column ? db.data.boards.find((b: Board) => b.id === column.board_id) : null;
                
                if (!column || !board) return null;

                return {
                    ...card,
                    columnName: column.name,
                    boardName: board.name,
                    boardId: board.id
                };
            }).filter((c): c is (Card & { columnName: string; boardName: string; boardId: string }) => c !== null);

            // Upcoming Cards (due today or in next 7 days)
            const upcoming = enrichedCards
                .filter(c => c.due_date && new Date(c.due_date) >= today && new Date(c.due_date) <= nextWeek)
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                .slice(0, 10);

            // Recent Activity (last 10 updated cards)
            const recent = [...enrichedCards]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 10);

            return {
                success: true,
                data: {
                    upcoming,
                    recent
                }
            };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Label operations
    ipcMain.handle('db:getLabels', async (_event, boardId: string) => {
        try {
            await db.read();
            const labels = db.data.labels.filter((l: Label) => l.board_id === boardId);
            return { success: true, data: labels };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:createLabel', async (_event, label: Label) => {
        try {
            await db.read();
            db.data.labels.push(label);
            await db.write();
            return { success: true, data: label };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:updateLabel', async (_event, label: Label) => {
        try {
            await db.read();
            const index = db.data.labels.findIndex((l: Label) => l.id === label.id);
            if (index >= 0) {
                db.data.labels[index] = label;
                await db.write();
            }
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

    // Card-Label operations
    ipcMain.handle('db:getCardLabels', async (_event, cardId: string) => {
        try {
            await db.read();
            const labelIds = db.data.card_labels
                .filter((cl: CardLabel) => cl.card_id === cardId)
                .map((cl: CardLabel) => cl.label_id);
            const labels = db.data.labels.filter((l: Label) => labelIds.includes(l.id));
            return { success: true, data: labels };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:addLabelToCard', async (_event, { cardId, labelId }: { cardId: string, labelId: string }) => {
        try {
            await db.read();
            // Check if it already exists
            const exists = db.data.card_labels.some(
                (cl: CardLabel) => cl.card_id === cardId && cl.label_id === labelId
            );
            if (!exists) {
                db.data.card_labels.push({ card_id: cardId, label_id: labelId });
                await db.write();
            }
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:removeLabelFromCard', async (_event, { cardId, labelId }: { cardId: string, labelId: string }) => {
        try {
            await db.read();
            db.data.card_labels = db.data.card_labels.filter(
                (cl: CardLabel) => !(cl.card_id === cardId && cl.label_id === labelId)
            );
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Settings operations
    ipcMain.handle('db:getSetting', async (_event, key: string) => {
        try {
            await db.read();
            const setting = db.data.settings.find((s: Setting) => s.key === key);
            return { success: true, data: setting ? setting.value : null };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:setSetting', async (_event, { key, value }: { key: string, value: string }) => {
        try {
            await db.read();
            const index = db.data.settings.findIndex((s: Setting) => s.key === key);
            if (index >= 0) {
                db.data.settings[index].value = value;
            } else {
                db.data.settings.push({ key, value });
            }
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Export/Import operations
    ipcMain.handle('db:exportData', async () => {
        try {
            await db.read();

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                boards: db.data.boards,
                columns: db.data.columns,
                cards: db.data.cards,
                labels: db.data.labels,
                cardLabels: db.data.card_labels,
                settings: db.data.settings
            };

            const { filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Export Board Data',
                defaultPath: 'orbit-board-export.json',
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });

            if (filePath) {
                fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
                return { success: true, data: filePath };
            }
            return { success: false, error: 'Export cancelled' };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:importData', async () => {
        try {
            const { filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Board Data',
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile']
            });

            if (filePaths && filePaths.length > 0) {
                const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
                const importData = JSON.parse(fileContent);

                // Validate import data structure
                if (!importData.version || !importData.boards) {
                    return { success: false, error: 'Invalid import file format' };
                }

                await db.read();

                // Replace all data
                db.data.boards = importData.boards || [];
                db.data.columns = importData.columns || [];
                db.data.cards = importData.cards || [];
                db.data.labels = importData.labels || [];
                db.data.card_labels = importData.cardLabels || [];
                if (importData.settings) {
                    db.data.settings = importData.settings;
                }

                await db.write();
                return { success: true, data: 'Import successful' };
            }
            return { success: false, error: 'Import cancelled' };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:resetApplication', async () => {
        try {
            await db.read();
            db.data.boards = [];
            db.data.columns = [];
            db.data.cards = [];
            db.data.labels = [];
            db.data.card_labels = [];
            db.data.settings = [];
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Profile & Activity
    ipcMain.handle('db:getUserProfile', async () => {
        try {
            await db.read();
            const profileSetting = db.data.settings.find(s => s.key === 'userProfile');
            if (profileSetting) {
                return { success: true, data: JSON.parse(profileSetting.value) as UserProfile };
            }
            return { 
                success: true, 
                data: { name: 'User Name', username: 'username', avatar: '' } as UserProfile 
            };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:updateUserProfile', async (_event, profile: UserProfile) => {
        try {
            await db.read();
            const index = db.data.settings.findIndex(s => s.key === 'userProfile');
            const value = JSON.stringify(profile);
            if (index >= 0) {
                db.data.settings[index].value = value;
            } else {
                db.data.settings.push({ key: 'userProfile', value });
            }
            await db.write();
            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:getActivityStats', async () => {
        try {
            await db.read();
            const stats: { [date: string]: number } = {};
            
            const addDate = (dateStr: string | null | undefined) => {
                if (!dateStr || typeof dateStr !== 'string') return;
                try {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return;
                    // Use local date for the heatmap keys to match user's perspective
                    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    stats[dateKey] = (stats[dateKey] || 0) + 1;
                } catch {
                    // Ignore invalid dates
                }
            };

            // Process all major entities for activity
            db.data.cards.forEach(card => {
                addDate(card.created_at);
                if (card.updated_at && card.updated_at !== card.created_at) {
                    addDate(card.updated_at);
                }
            });

            db.data.boards.forEach(b => addDate(b.created_at));
            db.data.columns.forEach(c => addDate(c.created_at));
            db.data.attachments.forEach(a => addDate(a.created_at));

            return { success: true, data: stats };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
});
