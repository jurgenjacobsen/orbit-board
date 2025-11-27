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

export type DragItem = {
  type: 'card' | 'column';
  id: string;
  columnId?: string;
  position: number;
};
