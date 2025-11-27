import { ipcMain, dialog, BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import fs from 'fs';
import { generateId } from './util.js';

// Types for API responses
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Board types
interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at?: string;
}

interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  due_date: string | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
  board_id: string;
}

// Helper function to wrap database operations
function dbOperation<T>(operation: () => T): ApiResponse<T> {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database operation failed:', message);
    return { success: false, error: message };
  }
}

export function registerIpcHandlers(db: Database.Database, mainWindow: BrowserWindow) {
  // ==================== BOARD OPERATIONS ====================
  
  ipcMain.handle('db:getBoards', (): ApiResponse<Board[]> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT * FROM boards ORDER BY updated_at DESC');
      return stmt.all() as Board[];
    });
  });

  ipcMain.handle('db:getBoard', (_event, id: string): ApiResponse<Board> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
      return stmt.get(id) as Board;
    });
  });

  ipcMain.handle('db:createBoard', (_event, board: Board): ApiResponse<Board> => {
    return dbOperation(() => {
      const insertBoard = db.prepare(
        'INSERT INTO boards (id, name, description, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))'
      );
      insertBoard.run(board.id, board.name, board.description || null);

      // Create default columns in a transaction
      const insertColumn = db.prepare(
        'INSERT INTO columns (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      );
      
      const createDefaultColumns = db.transaction(() => {
        insertColumn.run(generateId(), board.id, 'To Do', 0);
        insertColumn.run(generateId(), board.id, 'In Progress', 1);
        insertColumn.run(generateId(), board.id, 'Done', 2);
      });
      
      createDefaultColumns();
      
      // Return the created board with timestamps
      const getBoard = db.prepare('SELECT * FROM boards WHERE id = ?');
      return getBoard.get(board.id) as Board;
    });
  });

  ipcMain.handle('db:updateBoard', (_event, board: Board): ApiResponse<Board> => {
    return dbOperation(() => {
      const stmt = db.prepare(
        'UPDATE boards SET name = ?, description = ?, updated_at = datetime("now") WHERE id = ?'
      );
      const result = stmt.run(board.name, board.description || null, board.id);
      
      if (result.changes === 0) {
        throw new Error(`Board with id ${board.id} not found`);
      }
      
      // Return updated board
      const getBoard = db.prepare('SELECT * FROM boards WHERE id = ?');
      return getBoard.get(board.id) as Board;
    });
  });

  ipcMain.handle('db:deleteBoard', (_event, id: string): ApiResponse<void> => {
    return dbOperation(() => {
      // Delete in correct order due to foreign keys
      const deleteTransaction = db.transaction(() => {
        // Get all columns for this board
        const columns = db.prepare('SELECT id FROM columns WHERE board_id = ?').all(id) as { id: string }[];
        
        for (const column of columns) {
          // Get all cards for this column
          const cards = db.prepare('SELECT id FROM cards WHERE column_id = ?').all(column.id) as { id: string }[];
          
          for (const card of cards) {
            // Delete card labels
            db.prepare('DELETE FROM card_labels WHERE card_id = ?').run(card.id);
          }
          
          // Delete cards
          db.prepare('DELETE FROM cards WHERE column_id = ?').run(column.id);
        }
        
        // Delete columns
        db.prepare('DELETE FROM columns WHERE board_id = ?').run(id);
        
        // Delete labels for this board
        db.prepare('DELETE FROM labels WHERE board_id = ?').run(id);
        
        // Delete board
        db.prepare('DELETE FROM boards WHERE id = ?').run(id);
      });
      
      deleteTransaction();
    });
  });

  // ==================== COLUMN OPERATIONS ====================

  ipcMain.handle('db:getColumns', (_event, boardId: string): ApiResponse<Column[]> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC');
      return stmt.all(boardId) as Column[];
    });
  });

  ipcMain.handle('db:createColumn', (_event, column: Column): ApiResponse<Column> => {
    return dbOperation(() => {
      const stmt = db.prepare(
        'INSERT INTO columns (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      );
      stmt.run(column.id, column.board_id, column.name, column.position);
      
      const getColumn = db.prepare('SELECT * FROM columns WHERE id = ?');
      return getColumn.get(column.id) as Column;
    });
  });

  ipcMain.handle('db:updateColumn', (_event, column: Column): ApiResponse<Column> => {
    return dbOperation(() => {
      const stmt = db.prepare('UPDATE columns SET name = ?, position = ? WHERE id = ?');
      const result = stmt.run(column.name, column.position, column.id);
      
      if (result.changes === 0) {
        throw new Error(`Column with id ${column.id} not found`);
      }
      
      const getColumn = db.prepare('SELECT * FROM columns WHERE id = ?');
      return getColumn.get(column.id) as Column;
    });
  });

  ipcMain.handle('db:deleteColumn', (_event, id: string): ApiResponse<void> => {
    return dbOperation(() => {
      const deleteTransaction = db.transaction(() => {
        // Get all cards for this column
        const cards = db.prepare('SELECT id FROM cards WHERE column_id = ?').all(id) as { id: string }[];
        
        for (const card of cards) {
          // Delete card labels
          db.prepare('DELETE FROM card_labels WHERE card_id = ?').run(card.id);
        }
        
        // Delete cards
        db.prepare('DELETE FROM cards WHERE column_id = ?').run(id);
        
        // Delete column
        db.prepare('DELETE FROM columns WHERE id = ?').run(id);
      });
      
      deleteTransaction();
    });
  });

  ipcMain.handle('db:updateColumnsPositions', (_event, columns: { id: string; position: number }[]): ApiResponse<void> => {
    return dbOperation(() => {
      const stmt = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
      
      const updatePositions = db.transaction(() => {
        for (const col of columns) {
          stmt.run(col.position, col.id);
        }
      });
      
      updatePositions();
    });
  });

  // ==================== CARD OPERATIONS ====================

  ipcMain.handle('db:getCards', (_event, columnId: string): ApiResponse<Card[]> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC');
      return stmt.all(columnId) as Card[];
    });
  });

  ipcMain.handle('db:getCardsByBoard', (_event, boardId: string): ApiResponse<Card[]> => {
    return dbOperation(() => {
      const stmt = db.prepare(`
        SELECT c.* FROM cards c
        JOIN columns col ON c.column_id = col.id
        WHERE col.board_id = ?
        ORDER BY c.position ASC
      `);
      return stmt.all(boardId) as Card[];
    });
  });

  ipcMain.handle('db:createCard', (_event, card: Card): ApiResponse<Card> => {
    return dbOperation(() => {
      const stmt = db.prepare(`
        INSERT INTO cards (id, column_id, title, description, notes, due_date, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
      `);
      stmt.run(
        card.id,
        card.column_id,
        card.title,
        card.description || null,
        card.notes || null,
        card.due_date || null,
        card.position
      );
      
      const getCard = db.prepare('SELECT * FROM cards WHERE id = ?');
      return getCard.get(card.id) as Card;
    });
  });

  ipcMain.handle('db:updateCard', (_event, card: Card): ApiResponse<Card> => {
    return dbOperation(() => {
      const stmt = db.prepare(`
        UPDATE cards SET
          column_id = ?,
          title = ?,
          description = ?,
          notes = ?,
          due_date = ?,
          position = ?,
          updated_at = datetime("now")
        WHERE id = ?
      `);
      
      const result = stmt.run(
        card.column_id,
        card.title,
        card.description || null,
        card.notes || null,
        card.due_date || null,
        card.position,
        card.id
      );
      
      if (result.changes === 0) {
        throw new Error(`Card with id ${card.id} not found`);
      }
      
      const getCard = db.prepare('SELECT * FROM cards WHERE id = ?');
      return getCard.get(card.id) as Card;
    });
  });

  ipcMain.handle('db:deleteCard', (_event, id: string): ApiResponse<void> => {
    return dbOperation(() => {
      const deleteTransaction = db.transaction(() => {
        // Delete card labels first
        db.prepare('DELETE FROM card_labels WHERE card_id = ?').run(id);
        // Delete card
        db.prepare('DELETE FROM cards WHERE id = ?').run(id);
      });
      
      deleteTransaction();
    });
  });

  ipcMain.handle('db:updateCardsPositions', (_event, cards: { id: string; column_id: string; position: number }[]): ApiResponse<void> => {
    return dbOperation(() => {
      const stmt = db.prepare('UPDATE cards SET column_id = ?, position = ?, updated_at = datetime("now") WHERE id = ?');
      
      const updatePositions = db.transaction(() => {
        for (const card of cards) {
          stmt.run(card.column_id, card.position, card.id);
        }
      });
      
      updatePositions();
    });
  });

  // ==================== LABEL OPERATIONS ====================

  ipcMain.handle('db:getLabels', (_event, boardId: string): ApiResponse<Label[]> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT * FROM labels WHERE board_id = ?');
      return stmt.all(boardId) as Label[];
    });
  });

  ipcMain.handle('db:createLabel', (_event, label: Label): ApiResponse<Label> => {
    return dbOperation(() => {
      const stmt = db.prepare('INSERT INTO labels (id, name, color, board_id) VALUES (?, ?, ?, ?)');
      stmt.run(label.id, label.name, label.color, label.board_id);
      return label;
    });
  });

  ipcMain.handle('db:updateLabel', (_event, label: Label): ApiResponse<Label> => {
    return dbOperation(() => {
      const stmt = db.prepare('UPDATE labels SET name = ?, color = ? WHERE id = ?');
      const result = stmt.run(label.name, label.color, label.id);
      
      if (result.changes === 0) {
        throw new Error(`Label with id ${label.id} not found`);
      }
      
      return label;
    });
  });

  ipcMain.handle('db:deleteLabel', (_event, id: string): ApiResponse<void> => {
    return dbOperation(() => {
      const deleteTransaction = db.transaction(() => {
        // Delete card-label associations first
        db.prepare('DELETE FROM card_labels WHERE label_id = ?').run(id);
        // Delete label
        db.prepare('DELETE FROM labels WHERE id = ?').run(id);
      });
      
      deleteTransaction();
    });
  });

  // ==================== CARD-LABEL OPERATIONS ====================

  ipcMain.handle('db:getCardLabels', (_event, cardId: string): ApiResponse<Label[]> => {
    return dbOperation(() => {
      const stmt = db.prepare(`
        SELECT l.* FROM labels l
        JOIN card_labels cl ON l.id = cl.label_id
        WHERE cl.card_id = ?
      `);
      return stmt.all(cardId) as Label[];
    });
  });

  ipcMain.handle('db:addLabelToCard', (_event, { cardId, labelId }: { cardId: string; labelId: string }): ApiResponse<void> => {
    return dbOperation(() => {
      const stmt = db.prepare('INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)');
      stmt.run(cardId, labelId);
    });
  });

  ipcMain.handle('db:removeLabelFromCard', (_event, { cardId, labelId }: { cardId: string; labelId: string }): ApiResponse<void> => {
    return dbOperation(() => {
      const stmt = db.prepare('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?');
      stmt.run(cardId, labelId);
    });
  });

  // ==================== SETTINGS OPERATIONS ====================

  ipcMain.handle('db:getSetting', (_event, key: string): ApiResponse<string | null> => {
    return dbOperation(() => {
      const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
      const result = stmt.get(key) as { value: string } | undefined;
      return result ? result.value : null;
    });
  });

  ipcMain.handle('db:setSetting', (_event, { key, value }: { key: string; value: string }): ApiResponse<void> => {
    return dbOperation(() => {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      stmt.run(key, value);
    });
  });

  // ==================== EXPORT/IMPORT OPERATIONS ====================

  ipcMain.handle('db:exportData', async (): Promise<ApiResponse<string>> => {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('db:importData', async (): Promise<ApiResponse<string>> => {
    try {
      const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Board Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
      const importData = JSON.parse(fileContent);

      // Validate import data structure
      if (!importData.version || !importData.boards) {
        return { success: false, error: 'Invalid import file format' };
      }

      // Clear existing data and import new data in a transaction
      const importTransaction = db.transaction(() => {
        // Clear existing data in correct order
        db.exec('DELETE FROM card_labels');
        db.exec('DELETE FROM labels');
        db.exec('DELETE FROM cards');
        db.exec('DELETE FROM columns');
        db.exec('DELETE FROM boards');

        // Import boards
        const boardStmt = db.prepare(
          'INSERT INTO boards (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        );
        for (const board of importData.boards) {
          boardStmt.run(board.id, board.name, board.description, board.created_at, board.updated_at);
        }

        // Import columns
        if (importData.columns) {
          const columnStmt = db.prepare(
            'INSERT INTO columns (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)'
          );
          for (const column of importData.columns) {
            columnStmt.run(column.id, column.board_id, column.name, column.position, column.created_at);
          }
        }

        // Import cards
        if (importData.cards) {
          const cardStmt = db.prepare(
            'INSERT INTO cards (id, column_id, title, description, notes, due_date, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          );
          for (const card of importData.cards) {
            cardStmt.run(
              card.id, card.column_id, card.title, card.description,
              card.notes, card.due_date, card.position, card.created_at, card.updated_at
            );
          }
        }

        // Import labels
        if (importData.labels) {
          const labelStmt = db.prepare(
            'INSERT INTO labels (id, name, color, board_id) VALUES (?, ?, ?, ?)'
          );
          for (const label of importData.labels) {
            labelStmt.run(label.id, label.name, label.color, label.board_id);
          }
        }

        // Import card-labels
        if (importData.cardLabels) {
          const cardLabelStmt = db.prepare(
            'INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)'
          );
          for (const cl of importData.cardLabels) {
            cardLabelStmt.run(cl.card_id, cl.label_id);
          }
        }

        // Import settings
        if (importData.settings) {
          const settingStmt = db.prepare(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
          );
          for (const setting of importData.settings) {
            settingStmt.run(setting.key, setting.value);
          }
        }
      });

      importTransaction();
      return { success: true, data: 'Import successful' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
