import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'utilities-coin-stacks';

export interface StackItem {
  id: string;
  quantity: number;
}

export interface SavedStack {
  name: string;
  items: StackItem[];
  savedAt: string;
}

/** Named coin stacks saved in this browser's localStorage, newest first. */
@Injectable({
  providedIn: 'root'
})
export class CoinStacksService {
  readonly stacks = signal<SavedStack[]>(this.read());

  /** Saving under an existing name replaces that stack instead of adding a second copy. */
  save(name: string, items: StackItem[]): void {
    const stack: SavedStack = { name, items, savedAt: new Date().toISOString() };
    const next = [stack, ...this.stacks().filter(s => s.name.toLowerCase() !== name.toLowerCase())];
    this.stacks.set(next);
    this.write(next);
  }

  remove(name: string): void {
    const next = this.stacks().filter(s => s.name !== name);
    this.stacks.set(next);
    this.write(next);
  }

  // localStorage is missing while prerendering and in the test runner, and blocked outright
  // in some privacy modes.
  private read(): SavedStack[] {
    try {
      const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isSavedStack) : [];
    } catch {
      return [];
    }
  }

  private write(stacks: SavedStack[]): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stacks));
    } catch {
      // ignore: the stack just won't survive a reload
    }
  }
}

function isSavedStack(value: unknown): value is SavedStack {
  const stack = value as SavedStack;
  return (
    typeof stack?.name === 'string' &&
    typeof stack.savedAt === 'string' &&
    Array.isArray(stack.items) &&
    stack.items.every(item => typeof item?.id === 'string' && Number.isInteger(item.quantity))
  );
}
