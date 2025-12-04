import { app, BrowserWindow,dialog,ipcMain,Notification } from 'electron';
import { generateId, handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { createTray } from './tray.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import type { LowDatabase } from './database.js';
import { initDatabase } from './database.js';
import fs from 'fs';

const notificationTimeouts: NodeJS.Timeout[] = [];

async function checkDueDates(db: LowDatabase, mainWindow: BrowserWindow) {
    try {
        await db.read();
        
        // Get cards with due dates by joining data
        const cardsWithDueDates = db.data.cards
            .filter(card => card.due_date)
            .map(card => {
                const column = db.data.columns.find(col => col.id === card.column_id);
                const board = column ? db.data.boards.find(b => b.id === column.board_id) : null;
                return {
                    ...card,
                    column_name: column?.name,
                    board_name: board?.name
                };
            });

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const card of cardsWithDueDates) {
            if (!card.due_date) continue;
            
            const dueDate = new Date(card.due_date);
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

app.on('ready', async () => {
    const db = await initDatabase();

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
    ipcMain.handle('db:getBoards', async () => {
        try {
            await db.read();
            const boards = [...db.data.boards].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return { success: true, data: boards };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:getBoard', async (event, id) => {
        try {
            await db.read();
            const board = db.data.boards.find(b => b.id === id);
            return { success: true, data: board };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createBoard', async (event, board) => {
        try {
            await db.read();
            
            const newBoard = {
                ...board,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            db.data.boards.push(newBoard);

            // Create default columns
            const defaultColumns = [
                { id: generateId(), board_id: board.id, name: 'To Do', position: 0, created_at: new Date().toISOString() },
                { id: generateId(), board_id: board.id, name: 'In Progress', position: 1, created_at: new Date().toISOString() },
                { id: generateId(), board_id: board.id, name: 'Done', position: 2, created_at: new Date().toISOString() }
            ];
            db.data.columns.push(...defaultColumns);

            await db.write();
            return { success: true, data: newBoard };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateBoard', async (event, board) => {
        try {
            await db.read();
            const index = db.data.boards.findIndex(b => b.id === board.id);
            if (index >= 0) {
                db.data.boards[index] = {
                    ...board,
                    updated_at: new Date().toISOString()
                };
                await db.write();
            }
            return { success: true, data: board };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteBoard', async (event, id) => {
        try {
            await db.read();
            
            // Delete board
            db.data.boards = db.data.boards.filter(b => b.id !== id);
            
            // Delete associated columns
            const columnIds = db.data.columns.filter(c => c.board_id === id).map(c => c.id);
            db.data.columns = db.data.columns.filter(c => c.board_id !== id);
            
            // Delete associated cards
            db.data.cards = db.data.cards.filter(c => !columnIds.includes(c.column_id));
            
            // Delete associated labels
            const labelIds = db.data.labels.filter(l => l.board_id === id).map(l => l.id);
            db.data.labels = db.data.labels.filter(l => l.board_id !== id);
            
            // Delete associated card_labels
            db.data.card_labels = db.data.card_labels.filter(cl => !labelIds.includes(cl.label_id));
            
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Column operations
    ipcMain.handle('db:getColumns', async (event, boardId) => {
        try {
            await db.read();
            const columns = db.data.columns
                .filter(c => c.board_id === boardId)
                .sort((a, b) => a.position - b.position);
            return { success: true, data: columns };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createColumn', async (event, column) => {
        try {
            await db.read();
            const newColumn = {
                ...column,
                created_at: new Date().toISOString()
            };
            db.data.columns.push(newColumn);
            await db.write();
            return { success: true, data: newColumn };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateColumn', async (event, column) => {
        try {
            await db.read();
            const index = db.data.columns.findIndex(c => c.id === column.id);
            if (index >= 0) {
                db.data.columns[index] = column;
                await db.write();
            }
            return { success: true, data: column };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteColumn', async (event, id) => {
        try {
            await db.read();
            
            // Delete column
            db.data.columns = db.data.columns.filter(c => c.id !== id);
            
            // Delete associated cards
            db.data.cards = db.data.cards.filter(c => c.column_id !== id);
            
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateColumnsPositions', async (event, columns) => {
        try {
            await db.read();
            for (const col of columns) {
                const index = db.data.columns.findIndex(c => c.id === col.id);
                if (index >= 0) {
                    db.data.columns[index].position = col.position;
                }
            }
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Card operations
    ipcMain.handle('db:getCards', async (event, columnId) => {
        try {
            await db.read();
            const cards = db.data.cards
                .filter(c => c.column_id === columnId)
                .sort((a, b) => a.position - b.position);
            return { success: true, data: cards };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getCardsByBoard', async (event, boardId) => {
        try {
            await db.read();
            const columnIds = db.data.columns
                .filter(col => col.board_id === boardId)
                .map(col => col.id);
            const cards = db.data.cards
                .filter(c => columnIds.includes(c.column_id))
                .sort((a, b) => a.position - b.position);
            return { success: true, data: cards };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createCard', async (event, card) => {
        try {
            await db.read();
            const newCard = {
                ...card,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            db.data.cards.push(newCard);
            await db.write();
            return { success: true, data: newCard };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateCard', async (event, card) => {
        try {
            await db.read();
            const index = db.data.cards.findIndex(c => c.id === card.id);
            if (index >= 0) {
                db.data.cards[index] = {
                    ...card,
                    updated_at: new Date().toISOString()
                };
                await db.write();
            }
            return { success: true, data: card };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteCard', async (event, id) => {
        try {
            await db.read();
            db.data.cards = db.data.cards.filter(c => c.id !== id);
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateCardsPositions', async (event, cards) => {
        try {
            await db.read();
            for (const card of cards) {
                const index = db.data.cards.findIndex(c => c.id === card.id);
                if (index >= 0) {
                    db.data.cards[index].column_id = card.column_id;
                    db.data.cards[index].position = card.position;
                }
            }
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Label operations
    ipcMain.handle('db:getLabels', async (event, boardId) => {
        try {
            await db.read();
            const labels = db.data.labels.filter(l => l.board_id === boardId);
            return { success: true, data: labels };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createLabel', async (event, label) => {
        try {
            await db.read();
            db.data.labels.push(label);
            await db.write();
            return { success: true, data: label };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateLabel', async (event, label) => {
        try {
            await db.read();
            const index = db.data.labels.findIndex(l => l.id === label.id);
            if (index >= 0) {
                db.data.labels[index] = label;
                await db.write();
            }
            return { success: true, data: label };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteLabel', async (event, id) => {
        try {
            await db.read();
            db.data.labels = db.data.labels.filter(l => l.id !== id);
            db.data.card_labels = db.data.card_labels.filter(cl => cl.label_id !== id);
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Card-Label operations
    ipcMain.handle('db:getCardLabels', async (event, cardId) => {
        try {
            await db.read();
            const labelIds = db.data.card_labels
                .filter(cl => cl.card_id === cardId)
                .map(cl => cl.label_id);
            const labels = db.data.labels.filter(l => labelIds.includes(l.id));
            return { success: true, data: labels };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:addLabelToCard', async (event, { cardId, labelId }) => {
        try {
            await db.read();
            // Check if it already exists
            const exists = db.data.card_labels.some(
                cl => cl.card_id === cardId && cl.label_id === labelId
            );
            if (!exists) {
                db.data.card_labels.push({ card_id: cardId, label_id: labelId });
                await db.write();
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:removeLabelFromCard', async (event, { cardId, labelId }) => {
        try {
            await db.read();
            db.data.card_labels = db.data.card_labels.filter(
                cl => !(cl.card_id === cardId && cl.label_id === labelId)
            );
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Settings operations
    ipcMain.handle('db:getSetting', async (event, key) => {
        try {
            await db.read();
            const setting = db.data.settings.find(s => s.key === key);
            return { success: true, data: setting ? setting.value : null };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:setSetting', async (event, { key, value }) => {
        try {
            await db.read();
            const index = db.data.settings.findIndex(s => s.key === key);
            if (index >= 0) {
                db.data.settings[index].value = value;
            } else {
                db.data.settings.push({ key, value });
            }
            await db.write();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
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
        } catch (error: any) {
            return { success: false, error: error.message };
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
});
