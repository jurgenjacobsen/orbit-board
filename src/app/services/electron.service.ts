import { Injectable } from '@angular/core';
import { Board, Card, Column, Label, DbResponse } from '../models';

// Declare the electron API interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface ElectronAPI {
  // Board operations
  getBoards(): Promise<DbResponse<Board[]>>;
  getBoard(id: string): Promise<DbResponse<Board>>;
  createBoard(board: Board): Promise<DbResponse<Board>>;
  updateBoard(board: Board): Promise<DbResponse<Board>>;
  deleteBoard(id: string): Promise<DbResponse<void>>;

  // Column operations
  getColumns(boardId: string): Promise<DbResponse<Column[]>>;
  createColumn(column: Column): Promise<DbResponse<Column>>;
  updateColumn(column: Column): Promise<DbResponse<Column>>;
  deleteColumn(id: string): Promise<DbResponse<void>>;
  updateColumnsPositions(columns: { id: string; position: number }[]): Promise<DbResponse<void>>;

  // Card operations
  getCards(columnId: string): Promise<DbResponse<Card[]>>;
  getCardsByBoard(boardId: string): Promise<DbResponse<Card[]>>;
  createCard(card: Card): Promise<DbResponse<Card>>;
  updateCard(card: Card): Promise<DbResponse<Card>>;
  deleteCard(id: string): Promise<DbResponse<void>>;
  updateCardsPositions(cards: { id: string; column_id: string; position: number }[]): Promise<DbResponse<void>>;

  // Label operations
  getLabels(boardId: string): Promise<DbResponse<Label[]>>;
  createLabel(label: Label): Promise<DbResponse<Label>>;
  updateLabel(label: Label): Promise<DbResponse<Label>>;
  deleteLabel(id: string): Promise<DbResponse<void>>;
  getCardLabels(cardId: string): Promise<DbResponse<Label[]>>;
  addLabelToCard(cardId: string, labelId: string): Promise<DbResponse<void>>;
  removeLabelFromCard(cardId: string, labelId: string): Promise<DbResponse<void>>;

  // Settings
  getSetting(key: string): Promise<DbResponse<string>>;
  setSetting(key: string, value: string): Promise<DbResponse<void>>;

  // Export/Import
  exportData(): Promise<DbResponse<string>>;
  importData(): Promise<DbResponse<string>>;
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private api: ElectronAPI | null = null;

  constructor() {
    this.initializeAPI();
  }

  private initializeAPI(): void {
    if (typeof window !== 'undefined' && 
        window.electronAPI && 
        typeof window.electronAPI.getBoards === 'function') {
      this.api = window.electronAPI;
    }
  }

  get isElectron(): boolean {
    return this.api !== null;
  }

  // Board operations
  async getBoards(): Promise<Board[]> {
    if (!this.api) return [];
    const result = await this.api.getBoards();
    return result.success ? result.data || [] : [];
  }

  async getBoard(id: string): Promise<Board | null> {
    if (!this.api) return null;
    const result = await this.api.getBoard(id);
    return result.success ? result.data || null : null;
  }

  async createBoard(board: Board): Promise<Board | null> {
    if (!this.api) return null;
    const result = await this.api.createBoard(board);
    return result.success ? result.data || null : null;
  }

  async updateBoard(board: Board): Promise<Board | null> {
    if (!this.api) return null;
    const result = await this.api.updateBoard(board);
    return result.success ? result.data || null : null;
  }

  async deleteBoard(id: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.deleteBoard(id);
    return result.success;
  }

  // Column operations
  async getColumns(boardId: string): Promise<Column[]> {
    if (!this.api) return [];
    const result = await this.api.getColumns(boardId);
    return result.success ? result.data || [] : [];
  }

  async createColumn(column: Column): Promise<Column | null> {
    if (!this.api) return null;
    const result = await this.api.createColumn(column);
    return result.success ? result.data || null : null;
  }

  async updateColumn(column: Column): Promise<Column | null> {
    if (!this.api) return null;
    const result = await this.api.updateColumn(column);
    return result.success ? result.data || null : null;
  }

  async deleteColumn(id: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.deleteColumn(id);
    return result.success;
  }

  async updateColumnsPositions(columns: { id: string; position: number }[]): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.updateColumnsPositions(columns);
    return result.success;
  }

  // Card operations
  async getCards(columnId: string): Promise<Card[]> {
    if (!this.api) return [];
    const result = await this.api.getCards(columnId);
    return result.success ? result.data || [] : [];
  }

  async getCardsByBoard(boardId: string): Promise<Card[]> {
    if (!this.api) return [];
    const result = await this.api.getCardsByBoard(boardId);
    return result.success ? result.data || [] : [];
  }

  async createCard(card: Card): Promise<Card | null> {
    if (!this.api) return null;
    const result = await this.api.createCard(card);
    return result.success ? result.data || null : null;
  }

  async updateCard(card: Card): Promise<Card | null> {
    if (!this.api) return null;
    const result = await this.api.updateCard(card);
    return result.success ? result.data || null : null;
  }

  async deleteCard(id: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.deleteCard(id);
    return result.success;
  }

  async updateCardsPositions(cards: { id: string; column_id: string; position: number }[]): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.updateCardsPositions(cards);
    return result.success;
  }

  // Label operations
  async getLabels(boardId: string): Promise<Label[]> {
    if (!this.api) return [];
    const result = await this.api.getLabels(boardId);
    return result.success ? result.data || [] : [];
  }

  async createLabel(label: Label): Promise<Label | null> {
    if (!this.api) return null;
    const result = await this.api.createLabel(label);
    return result.success ? result.data || null : null;
  }

  async updateLabel(label: Label): Promise<Label | null> {
    if (!this.api) return null;
    const result = await this.api.updateLabel(label);
    return result.success ? result.data || null : null;
  }

  async deleteLabel(id: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.deleteLabel(id);
    return result.success;
  }

  async getCardLabels(cardId: string): Promise<Label[]> {
    if (!this.api) return [];
    const result = await this.api.getCardLabels(cardId);
    return result.success ? result.data || [] : [];
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.addLabelToCard(cardId, labelId);
    return result.success;
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.removeLabelFromCard(cardId, labelId);
    return result.success;
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    if (!this.api) return null;
    const result = await this.api.getSetting(key);
    return result.success ? result.data || null : null;
  }

  async setSetting(key: string, value: string): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.setSetting(key, value);
    return result.success;
  }

  // Export/Import
  async exportData(): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.exportData();
    return result.success;
  }

  async importData(): Promise<boolean> {
    if (!this.api) return false;
    const result = await this.api.importData();
    return result.success;
  }
}
