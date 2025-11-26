export interface Board {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at?: string;
  cards?: Card[];
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  notes?: string;
  due_date?: string;
  position: number;
  created_at?: string;
  updated_at?: string;
  labels?: Label[];
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

export interface DbResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ExportData {
  version: string;
  exportDate: string;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  labels: Label[];
  cardLabels: CardLabel[];
  settings: Setting[];
}
