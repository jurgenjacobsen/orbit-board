import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(
    private electronService: ElectronService,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadThemePreference();
  }

  private async loadThemePreference(): Promise<void> {
    const darkMode = await this.electronService.getSetting('darkMode');
    const isDark = darkMode === 'true';
    this.isDarkModeSubject.next(isDark);
    this.applyTheme(isDark);
  }

  async toggleDarkMode(): Promise<void> {
    const newValue = !this.isDarkModeSubject.value;
    this.isDarkModeSubject.next(newValue);
    this.applyTheme(newValue);
    await this.electronService.setSetting('darkMode', String(newValue));
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
  }

  get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }
}
