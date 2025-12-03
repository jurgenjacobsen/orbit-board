import { app, BrowserWindow,dialog,ipcMain,Notification } from 'electron';
import { generateId, handleCloseEvents, isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { createTray } from './tray.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import type { Database } from 'better-sqlite3';
import { initDatabase } from './database.js';
import fs from 'fs';

const notificationTimeouts: NodeJS.Timeout[] = [];

function checkDueDates(db: Database, mainWindow: BrowserWindow) {
    try {
        // Get cards with due dates
        const stmt = db.prepare(`
            SELECT c.id, c.title, c.due_date, col.name as column_name, b.name as board_name
            FROM cards c
            JOIN columns col ON c.column_id = col.id
            JOIN boards b ON col.board_id = b.id
            WHERE c.due_date IS NOT NULL
        `);
        const cards = stmt.all() as any[];

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const card of cards) {
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

app.on('ready', () => {
    const db = initDatabase();

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
    ipcMain.handle('db:getBoards', () => {
        try {
            const stmt = db.prepare('SELECT * FROM boards ORDER BY created_at DESC');
            return { success: true, data: stmt.all() };
        } catch (error: unknown) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('db:getBoard', (event, id) => {
        try {
            const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
            return { success: true, data: stmt.get(id) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createBoard', (event, board) => {
        try {
            const stmt = db.prepare('INSERT INTO boards (id, name, description) VALUES (?, ?, ?)');
            stmt.run(board.id, board.name, board.description || null);

            // Create default columns
            const columnStmt = db.prepare('INSERT INTO columns (id, board_id, name, position) VALUES (?, ?, ?, ?)');
            columnStmt.run(generateId(), board.id, 'To Do', 0);
            columnStmt.run(generateId(), board.id, 'In Progress', 1);
            columnStmt.run(generateId(), board.id, 'Done', 2);

            return { success: true, data: board };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateBoard', (event, board) => {
        try {
            const stmt = db.prepare('UPDATE boards SET name = ?, description = ?, updated_at = datetime("now") WHERE id = ?');
            stmt.run(board.name, board.description || null, board.id);
            return { success: true, data: board };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteBoard', (event, id) => {
        try {
            const stmt = db.prepare('DELETE FROM boards WHERE id = ?');
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Column operations
    ipcMain.handle('db:getColumns', (event, boardId) => {
        try {
            const stmt = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC');
            return { success: true, data: stmt.all(boardId) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createColumn', (event, column) => {
        try {
            const stmt = db.prepare('INSERT INTO columns (id, board_id, name, position) VALUES (?, ?, ?, ?)');
            stmt.run(column.id, column.board_id, column.name, column.position);
            return { success: true, data: column };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateColumn', (event, column) => {
        try {
            const stmt = db.prepare('UPDATE columns SET name = ?, position = ? WHERE id = ?');
            stmt.run(column.name, column.position, column.id);
            return { success: true, data: column };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteColumn', (event, id) => {
        try {
            const stmt = db.prepare('DELETE FROM columns WHERE id = ?');
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateColumnsPositions', (event, columns) => {
        try {
            const stmt = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
            const transaction = db.transaction((cols) => {
                for (const col of cols) {
                    stmt.run(col.position, col.id);
                }
            });
            transaction(columns);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Card operations
    ipcMain.handle('db:getCards', (event, columnId) => {
        try {
            const stmt = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC');
            return { success: true, data: stmt.all(columnId) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getCardsByBoard', (event, boardId) => {
        try {
            const stmt = db.prepare(`
            SELECT c.* FROM cards c
            JOIN columns col ON c.column_id = col.id
            WHERE col.board_id = ?
            ORDER BY c.position ASC
            `);
            return { success: true, data: stmt.all(boardId) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createCard', (event, card) => {
        try {
            const stmt = db.prepare(`
            INSERT INTO cards (id, column_id, title, description, notes, due_date, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(card.id, card.column_id, card.title, card.description || null, card.notes || null, card.due_date || null, card.position);
            return { success: true, data: card };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateCard', (event, card) => {
        try {
            const stmt = db.prepare(`
            UPDATE cards SET
                column_id = ?, title = ?, description = ?, notes = ?, due_date = ?, position = ?, updated_at = datetime("now")
            WHERE id = ?
            `);
            stmt.run(card.column_id, card.title, card.description || null, card.notes || null, card.due_date || null, card.position, card.id);
            return { success: true, data: card };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteCard', (event, id) => {
        try {
            const stmt = db.prepare('DELETE FROM cards WHERE id = ?');
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateCardsPositions', (event, cards) => {
        try {
            const stmt = db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');
            const transaction = db.transaction((cardList) => {
            for (const card of cardList) {
                stmt.run(card.column_id, card.position, card.id);
            }
            });
            transaction(cards);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Label operations
    ipcMain.handle('db:getLabels', (event, boardId) => {
        try {
            const stmt = db.prepare('SELECT * FROM labels WHERE board_id = ?');
            return { success: true, data: stmt.all(boardId) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createLabel', (event, label) => {
        try {
            const stmt = db.prepare('INSERT INTO labels (id, name, color, board_id) VALUES (?, ?, ?, ?)');
            stmt.run(label.id, label.name, label.color, label.board_id);
            return { success: true, data: label };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateLabel', (event, label) => {
        try {
            const stmt = db.prepare('UPDATE labels SET name = ?, color = ? WHERE id = ?');
            stmt.run(label.name, label.color, label.id);
            return { success: true, data: label };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteLabel', (event, id) => {
        try {
            const stmt = db.prepare('DELETE FROM labels WHERE id = ?');
            stmt.run(id);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Card-Label operations
    ipcMain.handle('db:getCardLabels', (event, cardId) => {
        try {
            const stmt = db.prepare(`
            SELECT l.* FROM labels l
            JOIN card_labels cl ON l.id = cl.label_id
            WHERE cl.card_id = ?
            `);
            return { success: true, data: stmt.all(cardId) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:addLabelToCard', (event, { cardId, labelId }) => {
        try {
            const stmt = db.prepare('INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)');
            stmt.run(cardId, labelId);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:removeLabelFromCard', (event, { cardId, labelId }) => {
        try {
            const stmt = db.prepare('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?');
            stmt.run(cardId, labelId);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Settings operations
    ipcMain.handle('db:getSetting', (event, key) => {
        try {
            const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
            const result = stmt.get(key) as any;
            return { success: true, data: result ? result.value : null };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:setSetting', (event, { key, value }) => {
        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            stmt.run(key, value);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Export/Import operations
    ipcMain.handle('db:exportData', async () => {
        try {
            const boards = db.prepare('SELECT * FROM boards').all();
            const columns = db.prepare('SELECT * FROM columns').all();
            const cards = db.prepare('SELECT * FROM cards').all();
            const labels = db.prepare('SELECT * FROM labels').all();
            const cardLabels = db.prepare('SELECT * FROM card_labels').all();
            const settings = db.prepare('SELECT * FROM settings').all();

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                boards,
                columns,
                cards,
                labels,
                cardLabels,
                settings
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

            // Clear existing data and import new data
            const transaction = db.transaction(() => {
                // Clear existing data
                db.exec('DELETE FROM card_labels');
                db.exec('DELETE FROM labels');
                db.exec('DELETE FROM cards');
                db.exec('DELETE FROM columns');
                db.exec('DELETE FROM boards');

                // Import boards
                const boardStmt = db.prepare('INSERT INTO boards (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
                for (const board of importData.boards) {
                    boardStmt.run(board.id, board.name, board.description, board.created_at, board.updated_at);
                }

                // Import columns
                const columnStmt = db.prepare('INSERT INTO columns (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)');
                for (const column of importData.columns) {
                    columnStmt.run(column.id, column.board_id, column.name, column.position, column.created_at);
                }

                // Import cards
                const cardStmt = db.prepare('INSERT INTO cards (id, column_id, title, description, notes, due_date, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                for (const card of importData.cards) {
                    cardStmt.run(card.id, card.column_id, card.title, card.description, card.notes, card.due_date, card.position, card.created_at, card.updated_at);
                }

                // Import labels
                const labelStmt = db.prepare('INSERT INTO labels (id, name, color, board_id) VALUES (?, ?, ?, ?)');
                for (const label of importData.labels) {
                    labelStmt.run(label.id, label.name, label.color, label.board_id);
                }

                // Import card-labels
                const cardLabelStmt = db.prepare('INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)');
                for (const cl of importData.cardLabels) {
                    cardLabelStmt.run(cl.card_id, cl.label_id);
                }

                // Import settings
                if (importData.settings) {
                const settingStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
                    for (const setting of importData.settings) {
                        settingStmt.run(setting.key, setting.value);
                    }
                }
            });

            transaction();
            return { success: true, data: 'Import successful' };
            }
            return { success: false, error: 'Import cancelled' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
});
