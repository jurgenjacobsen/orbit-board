export interface Board {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    archived?: boolean;
    deleted_at?: string | null;
}

export interface Column {
    id: string;
    board_id: string;
    name: string;
    position: number;
    created_at: string;
    archived?: boolean;
    deleted_at?: string | null;
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
    archived?: boolean;
    deleted_at?: string | null;
    attachmentCount?: number;
}

export interface Attachment {
    id: string;
    card_id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    created_at: string;
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

export interface UserProfile {
    name: string;
    username: string;
    avatar?: string;
    bio?: string;
}

export interface DatabaseSchema {
    boards: Board[];
    columns: Column[];
    cards: Card[];
    labels: Label[];
    card_labels: CardLabel[];
    attachments: Attachment[];
    settings: Setting[];
}

export interface ApiResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}
