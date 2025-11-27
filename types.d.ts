type EventPayloadMapping = {
    'db:getBoards':
        { success: boolean; data: unknown[]; error?: undefined; } |
        { success: boolean; error: any; data?: undefined; },
    'db:getBoard':
        { success: boolean; data: unknown; error?: undefined; } |
        { success: boolean; error: any; data?: undefined; },
    'db:createBoard': any,
    'db:updateBoard': any,
    'db:deleteBoard': void,

    // Column events
    'db:getColumns': any[],
    'db:createColumn': any,
    'db:updateColumn': any,
    'db:deleteColumn': void,
    'db:updateColumnsPositions': void,

    // Card events
    'db:getCards': any[],
    'db:getCardsByBoard': any[],
    'db:createCard': any,
    'db:updateCard': any,
    'db:deleteCard': void,
    'db:updateCardsPositions': void,

    // Label events
    'db:getLabels': any[],
    'db:createLabel': any,
    'db:updateLabel': any,
    'db:deleteLabel': void,
    'db:getCardLabels': any[],
    'db:addLabelToCard': void,
    'db:removeLabelFromCard': void,

    // Settings events
    'db:getSetting': any,
    'db:setSetting': { success: boolean; error?: undefined; } | { success: boolean; error: any; },

    // Export/Import events
    'db:exportData': any,
    'db:importData': void
};

interface Window {
    electronAPI: {
        // Board operations
        getBoards: () => any,
        getBoard: (event: any, id: string) => any,
        createBoard: (board) => any,
        updateBoard: (board) => any,
        deleteBoard: (id) => any,

        // Column operations
        getColumns: (boardId) => any,
        createColumn: (column) => any,
        updateColumn: (column) => any,
        deleteColumn: (id) => any,
        updateColumnsPositions: (columns) => any,

        // Card operations
        getCards: (columnId) => any,
        getCardsByBoard: (boardId) => any,
        createCard: (card) => any,
        updateCard: (card) => any,
        deleteCard: (id) => any,
        updateCardsPositions: (cards) => any,

        // Label operations
        getLabels: (boardId) => any,
        createLabel: (label) => any,
        updateLabel: (label) => any,
        deleteLabel: (id) => any,
        getCardLabels: (cardId) => any,
        addLabelToCard: (cardId, labelId) => any,
        removeLabelFromCard: (cardId, labelId) => any,
        // Settings operations
        getSetting: (key) => any,
        setSetting: () => any,

        // Export/Import
        exportData: () => any,
        importData: () => any
    }
}
