import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../models';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html'
})
export class CardComponent {
  @Input() card!: Card;
  @Output() cardClick = new EventEmitter<Card>();
  @Output() deleteClick = new EventEmitter<Card>();

  onClick(): void {
    this.cardClick.emit(this.card);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteClick.emit(this.card);
  }

  isOverdue(): boolean {
    if (!this.card.due_date) return false;
    return new Date(this.card.due_date) < new Date();
  }

  isDueSoon(): boolean {
    if (!this.card.due_date) return false;
    const dueDate = new Date(this.card.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  }

  formatDueDate(): string {
    if (!this.card.due_date) return '';
    return new Date(this.card.due_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
