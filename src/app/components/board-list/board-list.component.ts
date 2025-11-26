import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './board-list.component.html'
})
export class BoardListComponent implements OnInit {
  showCreateModal = false;
  newBoardName = '';
  newBoardDescription = '';
  boardToDelete: Board | null = null;

  constructor(
    public boardService: BoardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.boardService.loadBoards();
  }

  openBoard(board: Board): void {
    this.router.navigate(['/board', board.id]);
  }

  openCreateModal(): void {
    this.newBoardName = '';
    this.newBoardDescription = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newBoardName = '';
    this.newBoardDescription = '';
  }

  async createBoard(): Promise<void> {
    if (!this.newBoardName.trim()) return;
    
    const board = await this.boardService.createBoard(
      this.newBoardName.trim(),
      this.newBoardDescription.trim() || undefined
    );
    
    if (board) {
      this.closeCreateModal();
      this.router.navigate(['/board', board.id]);
    }
  }

  confirmDelete(board: Board, event: Event): void {
    event.stopPropagation();
    this.boardToDelete = board;
  }

  cancelDelete(): void {
    this.boardToDelete = null;
  }

  async deleteBoard(): Promise<void> {
    if (!this.boardToDelete) return;
    await this.boardService.deleteBoard(this.boardToDelete.id);
    this.boardToDelete = null;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
