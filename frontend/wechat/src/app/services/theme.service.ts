import { Injectable, Signal, computed, signal } from '@angular/core';

export type ThemeType = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSignal = signal<ThemeType>('system');
  private systemThemeDark = signal<boolean>(false);
  
  readonly currentTheme: Signal<ThemeType> = this.themeSignal.asReadonly();
  
  readonly isDarkMode = computed(() => {
    if (this.themeSignal() === 'system') {
      return this.systemThemeDark();
    }
    return this.themeSignal() === 'dark';
  });

  constructor() {
    // Load theme from localStorage on initialization
    this.loadSavedTheme();
    
    // Watch for system theme changes
    this.watchSystemTheme();
  }

  private loadSavedTheme(): void {
    const savedTheme = localStorage.getItem('theme-preference') as ThemeType;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      this.themeSignal.set(savedTheme);
    }
    
    // Check initial system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.systemThemeDark.set(true);
    }
  }

  private watchSystemTheme(): void {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (e) => {
          this.systemThemeDark.set(e.matches);
          this.applyThemeToDOM();
        });
    }
  }

  setTheme(theme: ThemeType): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme-preference', theme);
    this.applyThemeToDOM();
  }

  applyThemeToDOM(): void {
    const isDark = this.isDarkMode();
    const htmlElement = document.documentElement;
    
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }
}
