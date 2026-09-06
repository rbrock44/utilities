import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'utilities-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    this.storeTheme(next);
  }

  private readInitialTheme(): Theme {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') {
      return current;
    }

    const stored = this.readStoredTheme();
    if (stored) {
      return stored;
    }

    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // localStorage is missing in the test runner and blocked outright in some privacy modes.
  private readStoredTheme(): Theme | null {
    try {
      const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }

  private storeTheme(theme: Theme): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore: theme preference just will not persist
    }
  }
}
