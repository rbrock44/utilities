import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IndexedTool, searchTools } from '../../constants/tool-index';
import { CommandPaletteService } from '../../services/command-palette';
import { FavoritesService } from '../../services/favorites';

interface PaletteItem {
  tool: IndexedTool;
  index: number;
}

interface PaletteSection {
  label: string;
  items: PaletteItem[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  readonly palette = inject(CommandPaletteService);
  readonly favorites = inject(FavoritesService);

  readonly query = signal('');
  readonly activeIndex = signal(0);
  /** The phone jump button tucks away while scrolling down so it doesn't cover content. */
  readonly fabTucked = signal(false);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private returnFocusTo: HTMLElement | null = null;

  /** With no query: pinned, then recent, then everything else. With a query: ranked matches. */
  readonly sections = computed<PaletteSection[]>(() => {
    const query = this.query().trim();
    const groups: { label: string; tools: IndexedTool[] }[] = [];

    if (query) {
      groups.push({ label: 'Results', tools: searchTools(query) });
    } else {
      const pinned = this.favorites.pinnedTools();
      const recent = this.favorites.recentTools();
      const shown = new Set([...pinned, ...recent].map(tool => tool.param));
      groups.push(
        { label: 'Pinned', tools: pinned },
        { label: 'Recent', tools: recent },
        { label: 'All tools', tools: searchTools('').filter(tool => !shown.has(tool.param)) }
      );
    }

    let index = 0;
    return groups
      .filter(group => group.tools.length > 0)
      .map(group => ({
        label: group.label,
        items: group.tools.map(tool => ({ tool, index: index++ })),
      }));
  });

  readonly items = computed(() => this.sections().flatMap(section => section.items));
  readonly activeId = computed(() =>
    this.items().length > 0 ? `palette-option-${this.activeIndex()}` : null
  );

  constructor() {
    // Opening can come from the shortcut or the header button, so reset on the state change.
    effect(() => {
      if (this.palette.isOpen()) {
        untracked(() => {
          this.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          this.query.set('');
          this.activeIndex.set(0);
        });
      }
    });
    effect(() => {
      this.input()?.nativeElement.focus();
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let lastY = window.scrollY;
      const onScroll = () => {
        const y = window.scrollY;
        // A few pixels of slack so small scroll jitter doesn't flicker the button.
        if (y < 80 || y < lastY - 8) {
          this.fabTucked.set(false);
        } else if (y > lastY + 8) {
          this.fabTucked.set(true);
        }
        if (Math.abs(y - lastY) > 8 || y < 80) {
          lastY = y;
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const isSlash = event.key === '/' && !this.isTyping(event.target);

    if (isShortcut || (isSlash && !this.palette.isOpen())) {
      event.preventDefault();
      if (this.palette.isOpen()) {
        this.close();
      } else {
        this.palette.open();
      }
    }
  }

  close(): void {
    this.palette.close();
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  onQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.items().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.setActive((this.activeIndex() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.setActive((this.activeIndex() - 1 + count) % count);
        break;
      case 'Enter': {
        event.preventDefault();
        const item = this.items()[this.activeIndex()];
        if (!item) break;
        if (event.shiftKey) {
          this.favorites.toggle(item.tool.param);
        } else {
          this.go(item.tool);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // The input is the only focus stop inside the dialog; keep focus there.
        event.preventDefault();
        break;
    }
  }

  go(tool: IndexedTool): void {
    this.palette.close();
    this.returnFocusTo = null;
    this.router.navigate(['/', tool.param]);
  }

  private setActive(index: number): void {
    this.activeIndex.set(index);
    document.getElementById(`palette-option-${index}`)?.scrollIntoView?.({ block: 'nearest' });
  }

  private isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    );
  }
}
