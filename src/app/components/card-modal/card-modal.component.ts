import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Card, Label } from '../../models';
import { BoardService } from '../../services/board.service';

@Component({
  selector: 'app-card-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card-modal.component.html'
})
export class CardModalComponent implements OnInit, OnDestroy {
  @Input() card!: Card;
  @Input() labels: Label[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Card>();
  @Output() delete = new EventEmitter<Card>();

  editedCard!: Card;
  showLabelPicker = false;
  showAddLabel = false;
  newLabelName = '';
  newLabelColor = '#3b82f6';

  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  labelColors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
  ];

  constructor(private boardService: BoardService) {}

  ngOnInit(): void {
    this.editedCard = { ...this.card };
    
    // Setup autosave with debounce
    this.saveSubject.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.autoSave();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFieldChange(): void {
    this.saveSubject.next();
  }

  private async autoSave(): Promise<void> {
    await this.boardService.updateCard(this.editedCard);
  }

  async saveAndClose(): Promise<void> {
    this.save.emit(this.editedCard);
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    this.delete.emit(this.card);
    this.close.emit();
  }

  toggleLabelPicker(): void {
    this.showLabelPicker = !this.showLabelPicker;
    this.showAddLabel = false;
  }

  isLabelSelected(label: Label): boolean {
    return this.editedCard.labels?.some(l => l.id === label.id) || false;
  }

  async toggleLabel(label: Label): Promise<void> {
    if (this.isLabelSelected(label)) {
      await this.boardService.removeLabelFromCard(this.card.id, label.id);
      this.editedCard.labels = this.editedCard.labels?.filter(l => l.id !== label.id) || [];
    } else {
      await this.boardService.addLabelToCard(this.card.id, label.id);
      if (!this.editedCard.labels) {
        this.editedCard.labels = [];
      }
      this.editedCard.labels.push(label);
    }
  }

  showAddLabelForm(): void {
    this.showAddLabel = true;
    this.newLabelName = '';
    this.newLabelColor = '#3b82f6';
  }

  cancelAddLabel(): void {
    this.showAddLabel = false;
  }

  async addLabel(): Promise<void> {
    if (!this.newLabelName.trim()) return;
    
    const label = await this.boardService.createLabel(this.newLabelName.trim(), this.newLabelColor);
    if (label) {
      this.labels.push(label);
      await this.boardService.addLabelToCard(this.card.id, label.id);
      if (!this.editedCard.labels) {
        this.editedCard.labels = [];
      }
      this.editedCard.labels.push(label);
    }
    this.showAddLabel = false;
  }
}
