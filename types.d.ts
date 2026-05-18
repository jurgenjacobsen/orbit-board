import type { Board, Column, Card, Label, ApiResult, Attachment, UserProfile } from './src/types';

declare global {
    interface Window {
        api: {
            // Board operations
            getBoards: (options?: { includeArchived?: boolean; includeDeleted?: boolean }) => Promise<ApiResult<Board[]>>,
            getBoard: (id: string) => Promise<ApiResult<Board>>,
            createBoard: (board: Partial<Board>) => Promise<ApiResult<Board>>,
            updateBoard: (board: Board) => Promise<ApiResult<Board>>,
            deleteBoard: (id: string, permanent?: boolean) => Promise<ApiResult<void>>,
            bulkDeleteBoards: (ids: string[], permanent?: boolean) => Promise<ApiResult<void>>,
            archiveBoard: (id: string) => Promise<ApiResult<void>>,
            restoreBoard: (id: string) => Promise<ApiResult<void>>,
            bulkRestoreBoards: (ids: string[]) => Promise<ApiResult<void>>,
            emptyRecycleBin: () => Promise<ApiResult<void>>,

            // Column operations
            getColumns: (boardId: string, options?: { includeArchived?: boolean; includeDeleted?: boolean }) => Promise<ApiResult<Column[]>>,
            createColumn: (column: Partial<Column>) => Promise<ApiResult<Column>>,
            updateColumn: (column: Column) => Promise<ApiResult<Column>>,
            deleteColumn: (id: string, permanent?: boolean) => Promise<ApiResult<void>>,
            archiveColumn: (id: string) => Promise<ApiResult<void>>,
            restoreColumn: (id: string) => Promise<ApiResult<void>>,
            updateColumnsPositions: (columns: { id: string; position: number }[]) => Promise<ApiResult<void>>,

            // Card operations
            getCards: (columnId: string, options?: { includeArchived?: boolean; includeDeleted?: boolean }) => Promise<ApiResult<Card[]>>,
            getCardsByBoard: (boardId: string, options?: { includeArchived?: boolean; includeDeleted?: boolean }) => Promise<ApiResult<Card[]>>,
            createCard: (card: Partial<Card>) => Promise<ApiResult<Card>>,
            updateCard: (card: Card) => Promise<ApiResult<Card>>,
            deleteCard: (id: string, permanent?: boolean) => Promise<ApiResult<void>>,
            archiveCard: (id: string) => Promise<ApiResult<void>>,
            restoreCard: (id: string) => Promise<ApiResult<void>>,
            updateCardsPositions: (cards: { id: string; column_id: string; position: number }[]) => Promise<ApiResult<void>>,
            searchCards: (query: string) => Promise<ApiResult<Card[]>>,

            // Attachment operations
            getAttachments: (cardId: string) => Promise<ApiResult<Attachment[]>>,
            addAttachment: (cardId: string, file: { name: string; path: string; type: string; size: number }) => Promise<ApiResult<Attachment>>,
            removeAttachment: (id: string) => Promise<ApiResult<void>>,

            // Label operations
            getLabels: (boardId: string) => Promise<ApiResult<Label[]>>,
            createLabel: (label: Partial<Label>) => Promise<ApiResult<Label>>,
            updateLabel: (label: Label) => Promise<ApiResult<Label>>,
            deleteLabel: (id: string) => Promise<ApiResult<void>>,
            getCardLabels: (cardId: string) => Promise<ApiResult<Label[]>>,
            addLabelToCard: (cardId: string, labelId: string) => Promise<ApiResult<void>>,
            removeLabelFromCard: (cardId: string, labelId: string) => Promise<ApiResult<void>>,

            // Settings operations
            getSetting: (key: string) => Promise<ApiResult<string | null>>,
            setSetting: (key: string, value: string) => Promise<ApiResult<void>>,

            // Export/Import
            exportData: () => Promise<ApiResult<string>>,
            importData: () => Promise<ApiResult<string>>,
            resetApplication: () => Promise<ApiResult<void>>,
            getOverviewData: () => Promise<ApiResult<{
                upcoming: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
                recent: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
            }>>,

            // Profile & Activity
            getUserProfile: () => Promise<ApiResult<UserProfile>>,
            updateUserProfile: (profile: UserProfile) => Promise<ApiResult<void>>,
            getActivityStats: () => Promise<ApiResult<{ [date: string]: number }>>,

            // Discord RPC
            setDiscordActivity: (details: string, state: string, context?: { boardName?: string, cardTitle?: string }) => Promise<void>,
            clearDiscordActivity: () => Promise<void>,

            // Navigation from Tray
            onNavigate: (callback: (path: string) => void) => () => void
        }
    }
}

export {};
