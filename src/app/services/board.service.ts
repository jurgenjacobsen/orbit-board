import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ElectronService } from './electron.service';
import { Board, Column, Card, Label } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private boardsSubject = new BehaviorSubject<Board[]>([]);
  private currentBoardSubject = new BehaviorSubject<Board | null>(null);
  private columnsSubject = new BehaviorSubject<Column[]>([]);
  private labelsSubject = new BehaviorSubject<Label[]>([]);

  boards$ = this.boardsSubject.asObservable();
  currentBoard$ = this.currentBoardSubject.asObservable();
  columns$ = this.columnsSubject.asObservable();
  labels$ = this.labelsSubject.asObservable();

  constructor(private electronService: ElectronService) {}

  // Generate unique ID
  private generateId(): string {
    return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
      return ((Math.random() * 16) | 0).toString(16);
    });
  }

  // Board operations
  async loadBoards(): Promise<void> {
    const boards = await this.electronService.getBoards();
    this.boardsSubject.next(boards);
  }

  async loadBoard(id: string): Promise<void> {
    const board = await this.electronService.getBoard(id);
    this.currentBoardSubject.next(board);
    if (board) {
      await this.loadColumns(board.id);
      await this.loadLabels(board.id);
    }
  }

  async createBoard(name: string, description?: string): Promise<Board | null> {
    const board: Board = {
      id: this.generateId(),
      name,
      description
    };
    const created = await this.electronService.createBoard(board);
    if (created) {
      await this.loadBoards();
    }
    return created;
  }

  async updateBoard(board: Board): Promise<Board | null> {
    const updated = await this.electronService.updateBoard(board);
    if (updated) {
      await this.loadBoards();
      if (this.currentBoardSubject.value?.id === board.id) {
        this.currentBoardSubject.next(updated);
      }
    }
    return updated;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const deleted = await this.electronService.deleteBoard(id);
    if (deleted) {
      await this.loadBoards();
      if (this.currentBoardSubject.value?.id === id) {
        this.currentBoardSubject.next(null);
        this.columnsSubject.next([]);
      }
    }
    return deleted;
  }

  // Column operations
  async loadColumns(boardId: string): Promise<void> {
    const columns = await this.electronService.getColumns(boardId);
    
    // Load cards for each column
    for (const column of columns) {
      column.cards = await this.electronService.getCards(column.id);
      
      // Load labels for each card
      for (const card of column.cards) {
        card.labels = await this.electronService.getCardLabels(card.id);
      }
    }
    
    this.columnsSubject.next(columns);
  }

  async createColumn(name: string): Promise<Column | null> {
    const board = this.currentBoardSubject.value;
    if (!board) return null;

    const columns = this.columnsSubject.value;
    const column: Column = {
      id: this.generateId(),
      board_id: board.id,
      name,
      position: columns.length
    };
    
    const created = await this.electronService.createColumn(column);
    if (created) {
      await this.loadColumns(board.id);
    }
    return created;
  }

  async updateColumn(column: Column): Promise<Column | null> {
    const updated = await this.electronService.updateColumn(column);
    if (updated && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return updated;
  }

  async deleteColumn(id: string): Promise<boolean> {
    const deleted = await this.electronService.deleteColumn(id);
    if (deleted && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return deleted;
  }

  async updateColumnsOrder(columns: Column[]): Promise<boolean> {
    const positions = columns.map((col, index) => ({
      id: col.id,
      position: index
    }));
    const updated = await this.electronService.updateColumnsPositions(positions);
    if (updated && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return updated;
  }

  // Card operations
  async createCard(columnId: string, title: string): Promise<Card | null> {
    const columns = this.columnsSubject.value;
    const column = columns.find(c => c.id === columnId);
    if (!column) return null;

    const card: Card = {
      id: this.generateId(),
      column_id: columnId,
      title,
      position: column.cards?.length || 0
    };
    
    const created = await this.electronService.createCard(card);
    if (created && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return created;
  }

  async updateCard(card: Card): Promise<Card | null> {
    const updated = await this.electronService.updateCard(card);
    if (updated && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return updated;
  }

  async deleteCard(id: string): Promise<boolean> {
    const deleted = await this.electronService.deleteCard(id);
    if (deleted && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return deleted;
  }

  async moveCard(cardId: string, fromColumnId: string, toColumnId: string, newPosition: number): Promise<boolean> {
    const columns = this.columnsSubject.value;
    const fromColumn = columns.find(c => c.id === fromColumnId);
    const toColumn = columns.find(c => c.id === toColumnId);
    
    if (!fromColumn?.cards || !toColumn?.cards) return false;

    const card = fromColumn.cards.find(c => c.id === cardId);
    if (!card) return false;

    // Update positions
    const updates: { id: string; column_id: string; position: number }[] = [];
    
    if (fromColumnId === toColumnId) {
      // Reorder within same column
      const cards = [...toColumn.cards];
      const oldIndex = cards.findIndex(c => c.id === cardId);
      cards.splice(oldIndex, 1);
      cards.splice(newPosition, 0, card);
      
      cards.forEach((c, index) => {
        updates.push({ id: c.id, column_id: toColumnId, position: index });
      });
    } else {
      // Move to different column
      const fromCards = fromColumn.cards.filter(c => c.id !== cardId);
      fromCards.forEach((c, index) => {
        updates.push({ id: c.id, column_id: fromColumnId, position: index });
      });

      const toCards = [...toColumn.cards];
      toCards.splice(newPosition, 0, { ...card, column_id: toColumnId });
      toCards.forEach((c, index) => {
        updates.push({ id: c.id, column_id: toColumnId, position: index });
      });
    }

    const updated = await this.electronService.updateCardsPositions(updates);
    if (updated && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return updated;
  }

  // Label operations
  async loadLabels(boardId: string): Promise<void> {
    const labels = await this.electronService.getLabels(boardId);
    this.labelsSubject.next(labels);
  }

  async createLabel(name: string, color: string): Promise<Label | null> {
    const board = this.currentBoardSubject.value;
    if (!board) return null;

    const label: Label = {
      id: this.generateId(),
      name,
      color,
      board_id: board.id
    };
    
    const created = await this.electronService.createLabel(label);
    if (created) {
      await this.loadLabels(board.id);
    }
    return created;
  }

  async updateLabel(label: Label): Promise<Label | null> {
    const updated = await this.electronService.updateLabel(label);
    if (updated && this.currentBoardSubject.value) {
      await this.loadLabels(this.currentBoardSubject.value.id);
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return updated;
  }

  async deleteLabel(id: string): Promise<boolean> {
    const deleted = await this.electronService.deleteLabel(id);
    if (deleted && this.currentBoardSubject.value) {
      await this.loadLabels(this.currentBoardSubject.value.id);
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return deleted;
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<boolean> {
    const added = await this.electronService.addLabelToCard(cardId, labelId);
    if (added && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return added;
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<boolean> {
    const removed = await this.electronService.removeLabelFromCard(cardId, labelId);
    if (removed && this.currentBoardSubject.value) {
      await this.loadColumns(this.currentBoardSubject.value.id);
    }
    return removed;
  }

  // Export/Import
  async exportData(): Promise<boolean> {
    return this.electronService.exportData();
  }

  async importData(): Promise<boolean> {
    const imported = await this.electronService.importData();
    if (imported) {
      await this.loadBoards();
      this.currentBoardSubject.next(null);
      this.columnsSubject.next([]);
      this.labelsSubject.next([]);
    }
    return imported;
  }
}
