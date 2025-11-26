import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { BoardService } from '../../services/board.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  constructor(
    public themeService: ThemeService,
    public boardService: BoardService,
    private router: Router
  ) {}

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  async exportData(): Promise<void> {
    await this.boardService.exportData();
  }

  async importData(): Promise<void> {
    const imported = await this.boardService.importData();
    if (imported) {
      this.router.navigate(['/']);
    }
  }
}
