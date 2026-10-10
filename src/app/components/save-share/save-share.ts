import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  model,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SavedList, SavedListStore } from '../../services/saved-lists';

/**
 * Save, load, delete, and share-link controls for a tool's current list. The host owns the
 * list and its link encoding; this panel owns naming, storage, and the clipboard.
 */
@Component({
  selector: 'app-save-share',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './save-share.html',
  styleUrl: './save-share.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveShareComponent<T> implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly store = input.required<SavedListStore<T>>();
  /** The current list, or null when there's nothing worth saving or sharing yet. */
  readonly items = input<T | null>(null);
  /** The encoded list for the share link's query parameter. */
  readonly shareValue = input<string | null>(null);
  readonly shareParam = input('list');
  /** What a saved list holds, e.g. "12 coins", shown beside its name. */
  readonly describe = input<(items: T) => string>(() => '');
  readonly noun = input('list');
  readonly nameLabel = input('List name');
  readonly placeholder = input('Name this list');

  readonly name = model('');
  readonly loadList = output<SavedList<T>>();

  readonly notice = signal<string | null>(null);
  readonly justCopied = signal(false);
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly canSave = computed(() => this.name().trim() !== '' && this.items() !== null);
  readonly canShare = computed(() => this.shareValue() !== null);

  save(): void {
    const items = this.items();
    if (!this.canSave() || items === null) {
      return;
    }
    const name = this.name().trim();
    this.store().save(name, items);
    this.notice.set(`Saved “${name}” in this browser.`);
  }

  load(list: SavedList<T>): void {
    this.name.set(list.name);
    this.loadList.emit(list);
    this.notice.set(`Loaded “${list.name}”.`);
  }

  remove(list: SavedList<T>): void {
    this.store().remove(list.name);
    this.notice.set(`Deleted “${list.name}”.`);
  }

  shareLink(): string {
    const params = new URLSearchParams({ [this.shareParam()]: this.shareValue() ?? '' });
    if (this.name().trim()) {
      params.set('name', this.name().trim());
    }
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }

  async copyLink(): Promise<void> {
    if (!this.canShare()) {
      return;
    }
    await navigator.clipboard.writeText(this.shareLink());

    this.justCopied.set(true);
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopied.set(false);
      this.cdr.markForCheck();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }
}
