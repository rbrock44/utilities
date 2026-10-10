import { signal } from '@angular/core';

export interface SavedList<T> {
  name: string;
  items: T;
  savedAt: string;
}

/**
 * Named lists a tool saves in this browser's localStorage, newest first. Each tool makes its
 * own store with its own key and a check for what a valid saved `items` value looks like,
 * so a stale or hand-edited entry is dropped instead of breaking the page.
 */
export class SavedListStore<T> {
  readonly lists = signal<SavedList<T>[]>([]);

  constructor(
    private readonly storageKey: string,
    private readonly isItems: (value: unknown) => value is T
  ) {
    this.lists.set(this.read());
  }

  /** Saving under an existing name (any case) replaces that list instead of adding a copy. */
  save(name: string, items: T): void {
    const list: SavedList<T> = { name, items, savedAt: new Date().toISOString() };
    const next = [list, ...this.lists().filter(l => l.name.toLowerCase() !== name.toLowerCase())];
    this.lists.set(next);
    this.write(next);
  }

  remove(name: string): void {
    const next = this.lists().filter(l => l.name !== name);
    this.lists.set(next);
    this.write(next);
  }

  // localStorage is missing while prerendering and in the test runner, and blocked outright
  // in some privacy modes.
  private read(): SavedList<T>[] {
    try {
      const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(this.storageKey) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(entry => this.isSavedList(entry)) : [];
    } catch {
      return [];
    }
  }

  private write(lists: SavedList<T>[]): void {
    try {
      globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(lists));
    } catch {
      // ignore: the list just won't survive a reload
    }
  }

  private isSavedList(value: unknown): value is SavedList<T> {
    const list = value as SavedList<T>;
    return typeof list?.name === 'string' && typeof list.savedAt === 'string' && this.isItems(list.items);
  }
}
