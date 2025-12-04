// Mock API for browser-based development/testing
// This provides fake data when window.api is not available (i.e., not in Electron)

interface MockBoard {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface MockColumn {
    id: string;
    board_id: string;
    name: string;
    position: number;
    created_at: string;
}

interface MockCard {
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

let mockBoards: MockBoard[] = [
    {
        id: 'demo-board-1',
        name: 'Development Board',
        description: 'This is a demo board for development',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];

let mockColumns: MockColumn[] = [
    {
        id: 'col-1',
        board_id: 'demo-board-1',
        name: 'To Do',
        position: 0,
        created_at: new Date().toISOString(),
    },
    {
        id: 'col-2',
        board_id: 'demo-board-1',
        name: 'In Progress',
        position: 1,
        created_at: new Date().toISOString(),
    },
    {
        id: 'col-3',
        board_id: 'demo-board-1',
        name: 'Done',
        position: 2,
        created_at: new Date().toISOString(),
    }
];

let mockCards: MockCard[] = [
    {
        id: 'card-1',
        column_id: 'col-1',
        title: 'Sample Task 1',
        description: 'This is a sample task',
        notes: null,
        due_date: null,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'card-2',
        column_id: 'col-1',
        title: 'Sample Task 2',
        description: 'Another sample task',
        notes: null,
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'card-3',
        column_id: 'col-2',
        title: 'In Progress Task',
        description: 'Currently working on this',
        notes: 'Some notes here',
        due_date: null,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];

export const mockApi = {
    getBoards: async () => {
        return { success: true, data: mockBoards };
    },
    getBoard: async (id: string) => {
        const board = mockBoards.find(b => b.id === id);
        return { success: true, data: board || mockBoards[0] };
    },
    createBoard: async (board: Omit<MockBoard, 'created_at' | 'updated_at'>) => {
        const newBoard: MockBoard = {
            ...board,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mockBoards.push(newBoard);
        return { success: true, data: newBoard };
    },
    updateBoard: async (board: MockBoard) => {
        const index = mockBoards.findIndex(b => b.id === board.id);
        if (index >= 0) {
            mockBoards[index] = { ...board, updated_at: new Date().toISOString() };
        }
        return { success: true, data: board };
    },
    deleteBoard: async (id: string) => {
        mockBoards = mockBoards.filter(b => b.id !== id);
        return { success: true };
    },
    getColumns: async (boardId: string) => {
        const columns = mockColumns.filter(c => c.board_id === boardId);
        return { success: true, data: columns };
    },
    createColumn: async (column: Omit<MockColumn, 'created_at'>) => {
        const newColumn: MockColumn = {
            ...column,
            created_at: new Date().toISOString(),
        };
        mockColumns.push(newColumn);
        return { success: true, data: newColumn };
    },
    updateColumn: async (column: MockColumn) => {
        const index = mockColumns.findIndex(c => c.id === column.id);
        if (index >= 0) {
            mockColumns[index] = column;
        }
        return { success: true, data: column };
    },
    deleteColumn: async (id: string) => {
        mockColumns = mockColumns.filter(c => c.id !== id);
        mockCards = mockCards.filter(c => c.column_id !== id);
        return { success: true };
    },
    updateColumnsPositions: async (columns: Array<{ id: string; position: number }>) => {
        for (const col of columns) {
            const index = mockColumns.findIndex(c => c.id === col.id);
            if (index >= 0) {
                mockColumns[index].position = col.position;
            }
        }
        return { success: true };
    },
    getCards: async (columnId: string) => {
        const cards = mockCards.filter(c => c.column_id === columnId);
        return { success: true, data: cards };
    },
    getCardsByBoard: async (boardId: string) => {
        const columnIds = mockColumns.filter(c => c.board_id === boardId).map(c => c.id);
        const cards = mockCards.filter(c => columnIds.includes(c.column_id));
        return { success: true, data: cards };
    },
    createCard: async (card: Omit<MockCard, 'created_at' | 'updated_at'>) => {
        const newCard: MockCard = {
            ...card,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mockCards.push(newCard);
        return { success: true, data: newCard };
    },
    updateCard: async (card: MockCard) => {
        const index = mockCards.findIndex(c => c.id === card.id);
        if (index >= 0) {
            mockCards[index] = { ...card, updated_at: new Date().toISOString() };
        }
        return { success: true, data: card };
    },
    deleteCard: async (id: string) => {
        mockCards = mockCards.filter(c => c.id !== id);
        return { success: true };
    },
    updateCardsPositions: async (cards: Array<{ id: string; column_id: string; position: number }>) => {
        for (const card of cards) {
            const index = mockCards.findIndex(c => c.id === card.id);
            if (index >= 0) {
                mockCards[index].column_id = card.column_id;
                mockCards[index].position = card.position;
            }
        }
        return { success: true };
    },
};

// Helper to get API (real or mock)
export const getApi = () => {
    if (typeof window !== 'undefined' && window.api) {
        return window.api;
    }
    console.warn('Using mock API - window.api not available (not running in Electron)');
    return mockApi;
};
