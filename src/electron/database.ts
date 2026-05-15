import { getDatabasePath } from './pathResolver.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { DatabaseSchema } from '../types.js';

export type LowDatabase = Low<DatabaseSchema>;

export async function initDatabase(): Promise<LowDatabase> {
    const dbPath = getDatabasePath();
    console.log('Database path:', dbPath);

    // Use JSON file for storage
    const adapter = new JSONFile<DatabaseSchema>(dbPath);
    const db = new Low<DatabaseSchema>(adapter, {
        boards: [],
        columns: [],
        cards: [],
        labels: [],
        card_labels: [],
        attachments: [],
        settings: []
    });

    // Read the database
    await db.read();

    // Clean up recycle bin (items deleted more than 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filterDeleted = (item: { deleted_at?: string | null }) => {
        if (!item.deleted_at) return true;
        return new Date(item.deleted_at) > thirtyDaysAgo;
    };

    let needsWrite = false;
    const boardsLength = db.data.boards.length;
    db.data.boards = db.data.boards.filter(filterDeleted);
    if (db.data.boards.length !== boardsLength) needsWrite = true;

    const columnsLength = db.data.columns.length;
    db.data.columns = db.data.columns.filter(filterDeleted);
    if (db.data.columns.length !== columnsLength) needsWrite = true;

    const cardsLength = db.data.cards.length;
    db.data.cards = db.data.cards.filter(filterDeleted);
    if (db.data.cards.length !== cardsLength) needsWrite = true;

    if (needsWrite) await db.write();

    // Initialize default settings if not exists
    if (!db.data.settings.find(s => s.key === 'darkMode')) {
        db.data.settings.push({ key: 'darkMode', value: 'false' });
        await db.write();
    }

    console.log('Database initialized successfully');

    return db;
}
