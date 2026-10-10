import { computed, Injectable, signal } from '@angular/core';
import { findTool, IndexedTool } from '../constants/tool-index';

const PINNED_KEY = 'utilities-pinned';
const RECENT_KEY = 'utilities-recent';
const MAX_RECENT = 6;

/**
 * Pinned and recently opened tools, kept per browser in localStorage. Stored params that no
 * longer match a home-page tool are dropped on read, so removing a tool can't leave a ghost.
 */
@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  readonly pinned = signal<string[]>(this.read(PINNED_KEY));
  readonly recent = signal<string[]>(this.read(RECENT_KEY));

  readonly pinnedTools = computed(() => this.toTools(this.pinned()));
  /** Recents that aren't already pinned, so a tool never shows up in both rows. */
  readonly recentTools = computed(() =>
    this.toTools(this.recent().filter(param => !this.pinned().includes(param)))
  );

  isPinned(param: string): boolean {
    return this.pinned().includes(param);
  }

  toggle(param: string): void {
    if (!findTool(param)) {
      return;
    }

    const next = this.isPinned(param)
      ? this.pinned().filter(p => p !== param)
      : [...this.pinned(), param];
    this.pinned.set(next);
    this.write(PINNED_KEY, next);
  }

  recordVisit(param: string): void {
    if (!findTool(param)) {
      return;
    }

    const next = [param, ...this.recent().filter(p => p !== param)].slice(0, MAX_RECENT);
    this.recent.set(next);
    this.write(RECENT_KEY, next);
  }

  private toTools(params: string[]): IndexedTool[] {
    return params.map(findTool).filter((tool): tool is IndexedTool => tool !== undefined);
  }

  // localStorage is missing while prerendering and in the test runner, and blocked outright
  // in some privacy modes.
  private read(key: string): string[] {
    try {
      const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(key) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter((p): p is string => typeof p === 'string' && findTool(p) !== undefined)
        : [];
    } catch {
      return [];
    }
  }

  private write(key: string, params: string[]): void {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(params));
    } catch {
      // ignore: favorites just won't survive a reload
    }
  }
}
