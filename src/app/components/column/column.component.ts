import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { Column, Card } from '../../models';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CardComponent],
  templateUrl: './column.component.html'
})
export class ColumnComponent {
  @Input() column!: Column;
  @Input() connectedLists: string[] = [];
  @Output() cardDrop = new EventEmitter<CdkDragDrop<Card[]>>();
  @Output() cardClick = new EventEmitter<Card>();
  @Output() cardDelete = new EventEmitter<Card>();
  @Output() cardCreate = new EventEmitter<{ columnId: string; title: string }>();
  @Output() columnUpdate = new EventEmitter<Column>();
  @Output() columnDelete = new EventEmitter<Column>();

  isEditing = false;
  editName = '';
  showAddCard = false;
  newCardTitle = '';

  startEditing(): void {
    this.editName = this.column.name;
    this.isEditing = true;
  }

  saveEdit(): void {
    if (this.editName.trim() && this.editName !== this.column.name) {
      this.columnUpdate.emit({ ...this.column, name: this.editName.trim() });
    }
    this.isEditing = false;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editName = '';
  }

  deleteColumn(): void {
    this.columnDelete.emit(this.column);
  }

  showAddCardForm(): void {
    this.showAddCard = true;
    this.newCardTitle = '';
  }

  addCard(): void {
    if (!this.newCardTitle.trim()) return;
    this.cardCreate.emit({ columnId: this.column.id, title: this.newCardTitle.trim() });
    this.newCardTitle = '';
    this.showAddCard = false;
  }

  cancelAddCard(): void {
    this.showAddCard = false;
    this.newCardTitle = '';
  }

  onCardDrop(event: CdkDragDrop<Card[]>): void {
    this.cardDrop.emit(event);
  }

  onCardClick(card: Card): void {
    this.cardClick.emit(card);
  }

  onCardDelete(card: Card): void {
    this.cardDelete.emit(card);
  }
}
