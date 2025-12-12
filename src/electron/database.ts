import { getDatabasePath } from './pathResolver.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

export interface Board {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Column {
    id: string;
    board_id: string;
    name: string;
    position: number;
    created_at: string;
}

export interface Card {
    id: string;
    column_id: string;
    title: string;
    description: string | null;
    notes: string | null;
    due_date: string | null;
    position: number;
    created_at: string;
    updated_at: string;
}

export interface Label {
    id: string;
    name: string;
    color: string;
    board_id: string;
}

export interface CardLabel {
    card_id: string;
    label_id: string;
}

export interface Setting {
    key: string;
    value: string;
}

export interface DatabaseSchema {
    boards: Board[];
    columns: Column[];
    cards: Card[];
    labels: Label[];
    card_labels: CardLabel[];
    settings: Setting[];
}

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
        settings: []
    });

    // Read the database
    await db.read();

    // Initialize default settings if not exists
    if (!db.data.settings.find(s => s.key === 'darkMode')) {
        db.data.settings.push({ key: 'darkMode', value: 'false' });
        await db.write();
    }

    console.log('Database initialized successfully');

    return db;
}
