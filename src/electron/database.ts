import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'path';
import { getDatabasePath } from './pathResolver.js';

export function initDatabase() {
    const dbPath = getDatabasePath();
    console.log('Database path:', dbPath);

    const db = new Database(dbPath);

    // Enable WAL mode for better performance and concurrent read access
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        column_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        due_date TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        board_id TEXT NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS card_labels (
        card_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        PRIMARY KEY (card_id, label_id),
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
        );
    `);

    // Initialize default settings if not exists
    const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    stmt.run('darkMode', 'false');

    console.log('Database initialized successfully');

    return db;
}
