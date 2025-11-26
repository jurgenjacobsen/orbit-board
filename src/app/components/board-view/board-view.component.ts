import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDropListGroup, CdkDrag, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { Board, Column, Card, Label } from '../../models';
import { ColumnComponent } from '../column/column.component';
import { CardModalComponent } from '../card-modal/card-modal.component';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropListGroup, CdkDropList, CdkDrag, ColumnComponent, CardModalComponent],
  templateUrl: './board-view.component.html'
})
export class BoardViewComponent implements OnInit, OnDestroy {
  board: Board | null = null;
  columns: Column[] = [];
  labels: Label[] = [];
  
  showAddColumn = false;
  newColumnName = '';
  
  selectedCard: Card | null = null;
  cardToDelete: Card | null = null;
  columnToDelete: Column | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private boardService: BoardService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const boardId = params['id'];
      if (boardId) {
        this.loadBoard(boardId);
      }
    });

    this.boardService.currentBoard$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      this.board = board;
    });

    this.boardService.columns$.pipe(takeUntil(this.destroy$)).subscribe(columns => {
      this.columns = columns;
    });

    this.boardService.labels$.pipe(takeUntil(this.destroy$)).subscribe(labels => {
      this.labels = labels;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadBoard(boardId: string): Promise<void> {
    await this.boardService.loadBoard(boardId);
  }

  getConnectedLists(): string[] {
    return this.columns.map(c => c.id);
  }

  // Column operations
  showAddColumnForm(): void {
    this.showAddColumn = true;
    this.newColumnName = '';
  }

  cancelAddColumn(): void {
    this.showAddColumn = false;
    this.newColumnName = '';
  }

  async addColumn(): Promise<void> {
    if (!this.newColumnName.trim()) return;
    await this.boardService.createColumn(this.newColumnName.trim());
    this.cancelAddColumn();
  }

  async onColumnUpdate(column: Column): Promise<void> {
    await this.boardService.updateColumn(column);
  }

  confirmDeleteColumn(column: Column): void {
    this.columnToDelete = column;
  }

  cancelDeleteColumn(): void {
    this.columnToDelete = null;
  }

  async deleteColumn(): Promise<void> {
    if (!this.columnToDelete) return;
    await this.boardService.deleteColumn(this.columnToDelete.id);
    this.columnToDelete = null;
  }

  // Column drag & drop
  async onColumnDrop(event: CdkDragDrop<Column[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    
    const columns = [...this.columns];
    moveItemInArray(columns, event.previousIndex, event.currentIndex);
    
    // Update local state immediately for responsiveness
    this.columns = columns;
    
    // Persist changes
    await this.boardService.updateColumnsOrder(columns);
  }

  // Card operations
  async onCardCreate(event: { columnId: string; title: string }): Promise<void> {
    await this.boardService.createCard(event.columnId, event.title);
  }

  openCardModal(card: Card): void {
    this.selectedCard = card;
  }

  closeCardModal(): void {
    this.selectedCard = null;
  }

  async onCardSave(card: Card): Promise<void> {
    await this.boardService.updateCard(card);
  }

  confirmDeleteCard(card: Card): void {
    this.cardToDelete = card;
  }

  cancelDeleteCard(): void {
    this.cardToDelete = null;
  }

  async deleteCard(): Promise<void> {
    if (!this.cardToDelete) return;
    await this.boardService.deleteCard(this.cardToDelete.id);
    this.cardToDelete = null;
    this.selectedCard = null;
  }

  // Card drag & drop
  async onCardDrop(event: CdkDragDrop<Card[]>): Promise<void> {
    const card = event.item.data as Card;
    const fromColumnId = event.previousContainer.id;
    const toColumnId = event.container.id;
    
    if (fromColumnId === toColumnId && event.previousIndex === event.currentIndex) {
      return;
    }

    // Update local state immediately
    if (fromColumnId === toColumnId) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Persist changes
    await this.boardService.moveCard(card.id, fromColumnId, toColumnId, event.currentIndex);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
