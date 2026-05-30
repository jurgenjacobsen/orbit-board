// Mock API for browser-based development/testing
// This provides fake data when window.api is not available (i.e., not in Electron)
import type { Board, Column, Card, Label, ApiResult, Attachment, UserProfile } from '../../types';

const INITIAL_BOARDS: Board[] = [
    { id: '1', name: 'Personal Tasks', description: 'My daily to-do list', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', name: 'Work Project', description: 'Orbit Board development', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', name: 'Vacation Planning', description: 'Summer trip 2026', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_COLUMNS: Column[] = [
    { id: 'c1', board_id: '1', name: 'To Do', position: 0, created_at: new Date().toISOString() },
    { id: 'c2', board_id: '1', name: 'In Progress', position: 1, created_at: new Date().toISOString() },
    { id: 'c3', board_id: '1', name: 'Done', position: 2, created_at: new Date().toISOString() }
];

const INITIAL_CARDS: Card[] = [
    { id: 'card1', column_id: 'c1', title: 'Buy milk', description: '2% or whole', notes: null, due_date: null, position: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'card2', column_id: 'c1', title: 'Call bank', description: 'Ask about credit card', notes: null, due_date: new Date().toISOString(), position: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_LABELS: Label[] = [
    { id: 'l1', board_id: '1', name: 'Urgent', color: '#ef4444' },
    { id: 'l2', board_id: '1', name: 'Low Priority', color: '#10b981' }
];

let mockBoards: Board[] = JSON.parse(JSON.stringify(INITIAL_BOARDS));
let mockColumns: Column[] = JSON.parse(JSON.stringify(INITIAL_COLUMNS));
let mockCards: Card[] = JSON.parse(JSON.stringify(INITIAL_CARDS));
let mockLabels: Label[] = JSON.parse(JSON.stringify(INITIAL_LABELS));
let mockAttachments: Attachment[] = [];

export const mockApi = {
    getBoards: async (options?: { includeArchived?: boolean, includeDeleted?: boolean }): Promise<ApiResult<Board[]>> => {
        let boards = [...mockBoards];
        if (!options?.includeDeleted) boards = boards.filter(b => !b.deleted_at);
        if (!options?.includeArchived) boards = boards.filter(b => !b.archived);
        return { success: true, data: boards };
    },
    getBoard: async (id: string): Promise<ApiResult<Board>> => {
        const board = mockBoards.find(b => b.id === id);
        return board ? { success: true, data: board } : { success: false, error: 'Board not found' };
    },
    createBoard: async (board: Partial<Board>): Promise<ApiResult<Board>> => {
        const newBoard = { 
            ...board, 
            id: crypto.randomUUID(), 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString(),
            archived: false,
            deleted_at: null
        } as Board;
        mockBoards.push(newBoard);
        return { success: true, data: newBoard };
    },
    updateBoard: async (board: Board): Promise<ApiResult<Board>> => {
        const index = mockBoards.findIndex(b => b.id === board.id);
        if (index >= 0) {
            mockBoards[index] = { ...board, updated_at: new Date().toISOString() };
            return { success: true, data: mockBoards[index] };
        }
        return { success: false, error: 'Board not found' };
    },
    archiveBoard: async (id: string): Promise<ApiResult<void>> => {
        const board = mockBoards.find(b => b.id === id);
        if (board) board.archived = true;
        return { success: true };
    },
    restoreBoard: async (id: string): Promise<ApiResult<void>> => {
        const board = mockBoards.find(b => b.id === id);
        if (board) {
            board.archived = false;
            board.deleted_at = null;
        }
        return { success: true };
    },
    deleteBoard: async (id: string, permanent?: boolean): Promise<ApiResult<void>> => {
        if (permanent) {
            mockBoards = mockBoards.filter(b => b.id !== id);
        } else {
            const board = mockBoards.find(b => b.id === id);
            if (board) board.deleted_at = new Date().toISOString();
        }
        return { success: true };
    },
    bulkRestoreBoards: async (ids: string[]): Promise<ApiResult<void>> => {
        ids.forEach(id => {
            const board = mockBoards.find(b => b.id === id);
            if (board) {
                board.archived = false;
                board.deleted_at = null;
            }
        });
        return { success: true };
    },
    bulkDeleteBoards: async (ids: string[], permanent?: boolean): Promise<ApiResult<void>> => {
        if (permanent) {
            const idSet = new Set(ids);
            mockBoards = mockBoards.filter(b => !idSet.has(b.id));
        } else {
            ids.forEach(id => {
                const board = mockBoards.find(b => b.id === id);
                if (board) board.deleted_at = new Date().toISOString();
            });
        }
        return { success: true };
    },
    emptyRecycleBin: async (): Promise<ApiResult<void>> => {
        mockBoards = mockBoards.filter(b => !b.deleted_at);
        return { success: true };
    },

    getColumns: async (boardId: string): Promise<ApiResult<Column[]>> => {
        return { success: true, data: mockColumns.filter(c => c.board_id === boardId) };
    },
    createColumn: async (column: Partial<Column>): Promise<ApiResult<Column>> => {
        const newColumn = { ...column, id: crypto.randomUUID(), created_at: new Date().toISOString() } as Column;
        mockColumns.push(newColumn);
        return { success: true, data: newColumn };
    },
    updateColumn: async (column: Column): Promise<ApiResult<Column>> => {
        const index = mockColumns.findIndex(c => c.id === column.id);
        if (index >= 0) {
            mockColumns[index] = column;
            return { success: true, data: column };
        }
        return { success: false, error: 'Column not found' };
    },
    deleteColumn: async (id: string): Promise<ApiResult<void>> => {
        mockColumns = mockColumns.filter(c => c.id !== id);
        return { success: true };
    },
    archiveColumn: async (id: string): Promise<ApiResult<void>> => {
        const col = mockColumns.find(c => c.id === id);
        if (col) col.archived = true;
        return { success: true };
    },
    restoreColumn: async (id: string): Promise<ApiResult<void>> => {
        const col = mockColumns.find(c => c.id === id);
        if (col) col.archived = false;
        return { success: true };
    },
    updateColumnsPositions: async (columns: { id: string, position: number }[]): Promise<ApiResult<void>> => {
        columns.forEach(c => {
            const col = mockColumns.find(col => col.id === c.id);
            if (col) col.position = c.position;
        });
        return { success: true };
    },

    getCards: async (columnId: string, options?: { includeArchived?: boolean }): Promise<ApiResult<Card[]>> => {
        let cards = mockCards.filter(c => c.column_id === columnId && !c.deleted_at);
        if (!options?.includeArchived) cards = cards.filter(c => !c.archived);

        const cardsWithAttachments = cards.map(card => {
            const attachmentCount = mockAttachments.filter(a => a.card_id === card.id).length;
            return { ...card, attachmentCount };
        });

        return { success: true, data: cardsWithAttachments };
    },
    getCardsByBoard: async (boardId: string): Promise<ApiResult<Card[]>> => {
        const columnIds = mockColumns.filter(c => c.board_id === boardId).map(c => c.id);
        return { success: true, data: mockCards.filter(c => columnIds.includes(c.column_id)) };
    },
    createCard: async (card: Partial<Card>): Promise<ApiResult<Card>> => {
        const newCard = { ...card, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Card;
        mockCards.push(newCard);
        return { success: true, data: newCard };
    },
    updateCard: async (card: Card): Promise<ApiResult<Card>> => {
        const index = mockCards.findIndex(c => c.id === card.id);
        if (index >= 0) {
            mockCards[index] = { ...card, updated_at: new Date().toISOString() };
            return { success: true, data: card };
        }
        return { success: false, error: 'Card not found' };
    },
    deleteCard: async (id: string): Promise<ApiResult<void>> => {
        mockCards = mockCards.filter(c => c.id !== id);
        return { success: true };
    },
    archiveCard: async (id: string): Promise<ApiResult<void>> => {
        const card = mockCards.find(c => c.id === id);
        if (card) card.archived = true;
        return { success: true };
    },
    restoreCard: async (id: string): Promise<ApiResult<void>> => {
        const card = mockCards.find(c => c.id === id);
        if (card) card.archived = false;
        return { success: true };
    },
    updateCardsPositions: async (cards: { id: string, column_id: string, position: number }[]): Promise<ApiResult<void>> => {
        cards.forEach(c => {
            const card = mockCards.find(card => card.id === c.id);
            if (card) {
                card.column_id = c.column_id;
                card.position = c.position;
            }
        });
        return { success: true };
    },
    searchCards: async (query: string): Promise<ApiResult<Card[]>> => {
        const lowerQuery = query.toLowerCase();
        const results = mockCards.filter(c => 
            c.title.toLowerCase().includes(lowerQuery) || 
            (c.description && c.description.toLowerCase().includes(lowerQuery))
        );
        return { success: true, data: results };
    },

    getAttachments: async (cardId: string): Promise<ApiResult<Attachment[]>> => {
        return { success: true, data: mockAttachments.filter(a => a.card_id === cardId) };
    },
    addAttachment: async (cardId: string, file: { name: string, path: string, type: string, size: number }): Promise<ApiResult<Attachment>> => {
        const att = { id: crypto.randomUUID(), card_id: cardId, ...file, created_at: new Date().toISOString() };
        mockAttachments.push(att);
        return { success: true, data: att };
    },
    removeAttachment: async (id: string): Promise<ApiResult<void>> => {
        mockAttachments = mockAttachments.filter(a => a.id !== id);
        return { success: true };
    },

    getLabels: async (boardId: string): Promise<ApiResult<Label[]>> => {
        return { success: true, data: mockLabels.filter(l => l.board_id === boardId) };
    },
    createLabel: async (label: Partial<Label>): Promise<ApiResult<Label>> => {
        const newLabel = { ...label, id: crypto.randomUUID() } as Label;
        mockLabels.push(newLabel);
        return { success: true, data: newLabel };
    },
    updateLabel: async (label: Label): Promise<ApiResult<Label>> => {
        const index = mockLabels.findIndex(l => l.id === label.id);
        if (index >= 0) {
            mockLabels[index] = label;
            return { success: true, data: label };
        }
        return { success: false, error: 'Label not found' };
    },
    deleteLabel: async (id: string): Promise<ApiResult<void>> => {
        mockLabels = mockLabels.filter(l => l.id !== id);
        return { success: true };
    },
    getCardLabels: async (_cardId: string): Promise<ApiResult<Label[]>> => {
        return { success: true, data: [] };
    },
    addLabelToCard: async (_cardId: string, _labelId: string): Promise<ApiResult<void>> => {
        return { success: true };
    },
    removeLabelFromCard: async (_cardId: string, _labelId: string): Promise<ApiResult<void>> => {
        return { success: true };
    },

    getSetting: async (_key: string): Promise<ApiResult<string | null>> => {
        return { success: true, data: null };
    },
    setSetting: async (_key: string, _value: string): Promise<ApiResult<void>> => {
        return { success: true };
    },
    exportData: async (): Promise<ApiResult<string>> => {
        return { success: true, data: 'mock-export-path.json' };
    },
    importData: async (): Promise<ApiResult<string>> => {
        return { success: true, data: 'Import successful' };
    },
    exportCalendar: async (options?: { boardId?: string, cardId?: string }): Promise<ApiResult<string>> => {
        console.log('Mock export calendar with options:', options);
        return { success: true, data: 'mock-calendar-export.ics' };
    },

    // Updater
    checkForUpdates: async () => {
        console.log('Mock check for updates');
        return null;
    },
    downloadUpdate: async () => {
        console.log('Mock download update');
        return null;
    },
    installUpdate: () => {
        console.log('Mock install update');
    },
    onUpdaterEvent: (_callback: (event: string, data?: unknown) => void) => {
        // Mock sending an update available event after 3 seconds if requested
        // setTimeout(() => callback('updater:update-available', { version: '1.0.1' }), 3000);
        return () => {};
    },

    resetApplication: async (): Promise<ApiResult<void>> => {
        mockBoards = JSON.parse(JSON.stringify(INITIAL_BOARDS));
        mockColumns = JSON.parse(JSON.stringify(INITIAL_COLUMNS));
        mockCards = JSON.parse(JSON.stringify(INITIAL_CARDS));
        mockLabels = JSON.parse(JSON.stringify(INITIAL_LABELS));
        mockAttachments = [];
        return { success: true };
    },
    getOverviewData: async (): Promise<ApiResult<{
        upcoming: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
        recent: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
    }>> => {
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);

        const allCards = mockCards.filter(c => !c.deleted_at && !c.archived);

        const upcoming = allCards
            .filter(c => c.due_date && new Date(c.due_date) <= sevenDaysFromNow && new Date(c.due_date) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
            .slice(0, 10);

        const recent = allCards
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 10);

        const enrich = (card: Card) => {
            const column = mockColumns.find(col => col.id === card.column_id);
            const board = mockBoards.find(b => b.id === column?.board_id);
            return {
                ...card,
                columnName: column?.name,
                boardName: board?.name,
                boardId: board?.id
            };
        };

        return {
            success: true,
            data: {
                upcoming: upcoming.map(enrich),
                recent: recent.map(enrich)
            }
        };
    },
    getUserProfile: async (): Promise<ApiResult<UserProfile>> => {
        return { 
            success: true, 
            data: { name: 'Demo User', username: 'demo_user', avatar: '', bio: 'Software Engineer & Productivity enthusiast.' } 
        };
    },
    updateUserProfile: async (_profile: UserProfile): Promise<ApiResult<void>> => {
        return { success: true };
    },
    getActivityStats: async (): Promise<ApiResult<{ [date: string]: number }>> => {
        const stats: { [date: string]: number } = {};
        const now = new Date();
        for (let i = 0; i < 90; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            if (Math.random() > 0.3) {
                stats[dateStr] = Math.floor(Math.random() * 8);
            }
        }
        return { success: true, data: stats };
    },
    setDiscordActivity: async (details: string, state: string, context?: { boardName?: string, cardTitle?: string }): Promise<void> => {
        console.log(`[Mock Discord] Setting activity: ${details} - ${state}`, context);
    },
    clearDiscordActivity: async (): Promise<void> => {
        console.log(`[Mock Discord] Clearing activity`);
    },

    // Plugins
    getPlugins: async (): Promise<ApiResult<PluginInfo[]>> => {
        return { success: true, data: [] };
    },
    togglePlugin: async (_id: string, _enabled: boolean): Promise<ApiResult<void>> => {
        return { success: true };
    },
    updatePluginSetting: async (_id: string, _key: string, _value: unknown): Promise<ApiResult<void>> => {
        return { success: true };
    }
};

export const getApi = () => {
    if (typeof window !== 'undefined' && window.api) {
        return window.api;
    }
    console.warn('Using mock API - window.api not available (not running in Electron)');
    return mockApi as unknown as Window['api'];
};
