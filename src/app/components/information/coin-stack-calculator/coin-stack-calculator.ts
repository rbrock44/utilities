import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ComboBoxComponent } from '../../combo-box/combo-box';
import { GOLD_COIN_DATABASE, SILVER_COIN_DATABASE } from '../../../constants/coins';
import { TROY_OZ_IN_GRAMS } from '../../../constants/constants';
import { SpotPriceService } from '../../../services/spot-price';
import { SavedList, SavedListStore } from '../../../services/saved-lists';
import { SaveShareComponent } from '../../save-share/save-share';

export type Metal = 'gold' | 'silver';

export interface StackItem {
  id: string;
  quantity: number;
  note?: string;
}

function isStackItems(value: unknown): value is StackItem[] {
  return Array.isArray(value) && value.every(
    item => typeof item?.id === 'string' && Number.isInteger(item.quantity) &&
      (item.note === undefined || typeof item.note === 'string')
  );
}

export interface CoinOption {
  id: string;
  label: string;
  metal: Metal;
  spec: CoinSpec;
}

export interface StackRow {
  coin: CoinOption;
  quantity: number | null;
  note?: string;
}

/**
 * Ids are slugs of metal, name, and date range (`silver-morgan-dollar-1878-1921`), not list
 * positions, so shared links and saved stacks keep working when coins are added to the list.
 * Names repeat across years (two Kennedy halves), which is why the description is included.
 */
export const COIN_OPTIONS: CoinOption[] = buildOptions();

function buildOptions(): CoinOption[] {
  const taken = new Set<string>();
  const toOption = (spec: CoinSpec, metal: Metal): CoinOption => {
    const base = `${metal}-${slugify(`${spec.name} ${spec.description ?? ''}`)}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) {
      id = `${base}-${n}`;
    }
    taken.add(id);
    const label = spec.description ? `${spec.name} · ${spec.description}` : spec.name;
    return { id, label, metal, spec };
  };

  return [
    ...GOLD_COIN_DATABASE.map(spec => toOption(spec, 'gold')),
    ...SILVER_COIN_DATABASE.map(spec => toOption(spec, 'silver')),
  ];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * `id~quantity` pairs joined by `_`: characters that never need escaping in a URL. A note
 * rides along as a third `~` part, percent-encoded with `_` and `~` escaped too so it can't
 * split a pair.
 */
export function encodeStack(items: StackItem[]): string {
  return items
    .map(item => {
      const pair = `${item.id}~${item.quantity}`;
      return item.note ? `${pair}~${encodeNote(item.note)}` : pair;
    })
    .join('_');
}

function encodeNote(note: string): string {
  return encodeURIComponent(note).replace(/_/g, '%5F').replace(/~/g, '%7E');
}

function decodeNote(text: string | undefined): string {
  try {
    return decodeURIComponent(text ?? '').trim();
  } catch {
    return '';
  }
}

/** Reads a shared stack, keeping recognizable coins and counting the ones it had to skip. */
export function decodeStack(text: string): { items: StackItem[]; skipped: number } {
  const items: StackItem[] = [];
  let skipped = 0;

  for (const pair of text.split('_').filter(Boolean)) {
    const [id, count, encodedNote] = pair.split('~');
    const quantity = Number(count);
    const note = decodeNote(encodedNote);
    if (COIN_OPTIONS.some(coin => coin.id === id) && Number.isInteger(quantity) && quantity > 0) {
      items.push(note ? { id, quantity, note } : { id, quantity });
    } else {
      skipped++;
    }
  }
  return { items, skipped };
}

export function pureTozPerCoin(spec: CoinSpec): number {
  return (spec.weightGrams * spec.purity) / TROY_OZ_IN_GRAMS;
}

@Component({
  selector: 'app-coin-stack-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboBoxComponent, SaveShareComponent],
  templateUrl: './coin-stack-calculator.html',
  styleUrl: './coin-stack-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinStackCalculatorComponent implements OnInit {
  rows: StackRow[] = [];
  spotGold: number | null = null;
  spotSilver: number | null = null;
  dealerPercent: number | null = 90;
  loadingPrices = false;
  pricesFailed = false;
  pickerValue: string | null = null;
  stackName = '';
  /** Set when a shared link is opened, to say what was loaded from it. */
  linkNotice: string | null = null;

  /** Rows whose empty note box is expanded; a note with text always shows. */
  private openNotes = new Set<StackRow>();

  readonly savedStacks = new SavedListStore<StackItem[]>('utilities-coin-stacks', isStackItems);
  readonly describeStack = (items: StackItem[]) =>
    `${items.reduce((sum, item) => sum + item.quantity, 0)} coins`;
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly comboOptions: ComboBoxOption[] = COIN_OPTIONS.map(coin => ({
    id: coin.id,
    label: `${coin.metal === 'gold' ? 'Gold' : 'Silver'} · ${coin.label}`,
    searchText: `${coin.metal} ${coin.label}`.toLowerCase(),
  }));

  private readonly currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

  constructor(private spotPriceService: SpotPriceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadFromLink();
    this.loadingPrices = true;
    this.spotPriceService.getSpotPrices().subscribe(prices => {
      this.loadingPrices = false;
      // The service reports a failed fetch as -1 rather than erroring.
      if (prices.gold > 0 && prices.silver > 0) {
        this.spotGold = prices.gold;
        this.spotSilver = prices.silver;
      } else {
        this.pricesFailed = true;
      }
      this.cdr.markForCheck();
    });
  }

  /** Picking a coin already in the stack adds one more instead of a duplicate row. */
  addCoin(id: string): void {
    const coin = COIN_OPTIONS.find(option => option.id === id);
    if (!coin) {
      return;
    }

    const existing = this.rows.find(row => row.coin.id === id);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + 1;
      this.rows = [...this.rows];
    } else {
      this.rows = [...this.rows, { coin, quantity: 1 }];
    }
    // The combo box keeps showing the picked label until its [value] input changes, so step
    // it to the id and back to null across two change-detection passes to empty the search.
    this.pickerValue = id;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.pickerValue = null;
      this.cdr.markForCheck();
    });
  }

  get items(): StackItem[] {
    return this.rows
      .filter(row => this.isWholeOrZero(row.quantity) && row.quantity! > 0)
      .map(row => {
        const note = row.note?.trim();
        return note ? { id: row.coin.id, quantity: row.quantity!, note } : { id: row.coin.id, quantity: row.quantity! };
      });
  }

  hasNote(row: StackRow): boolean {
    return !!row.note?.trim();
  }

  /** A note with text always shows; a blank one shows only while toggled open. */
  isNoteShown(row: StackRow): boolean {
    return this.hasNote(row) || this.openNotes.has(row);
  }

  noteToggleTitle(row: StackRow): string {
    if (this.hasNote(row)) return 'Clear the note to hide it';
    return this.openNotes.has(row) ? 'Hide note' : 'Add a note';
  }

  toggleNote(row: StackRow): void {
    if (this.hasNote(row)) return;
    if (this.openNotes.has(row)) {
      this.openNotes.delete(row);
    } else {
      this.openNotes.add(row);
    }
  }

  /** Null until there's at least one coin, which disables Save and the share link. */
  get itemsOrNull(): StackItem[] | null {
    const items = this.items;
    return items.length > 0 ? items : null;
  }

  get shareValue(): string | null {
    const items = this.items;
    return items.length > 0 ? encodeStack(items) : null;
  }

  loadStack(list: SavedList<StackItem[]>): void {
    this.applyItems(list.items);
    this.linkNotice = null;
    this.cdr.markForCheck();
  }

  removeRow(row: StackRow): void {
    this.rows = this.rows.filter(r => r !== row);
  }

  clear(): void {
    this.rows = [];
  }

  rowToz(row: StackRow): number {
    return pureTozPerCoin(row.coin.spec) * this.quantity(row);
  }

  rowValue(row: StackRow): number | null {
    const spot = row.coin.metal === 'gold' ? this.spotGold : this.spotSilver;
    return this.isPositive(spot) ? this.rowToz(row) * spot! : null;
  }

  get goldToz(): number {
    return this.totalToz('gold');
  }

  get silverToz(): number {
    return this.totalToz('silver');
  }

  get coinCount(): number {
    return this.rows.reduce((sum, row) => sum + this.quantity(row), 0);
  }

  get errorMessage(): string | null {
    if (this.rows.some(row => !this.isWholeOrZero(row.quantity))) {
      return 'Quantities must be whole numbers, 0 or more.';
    }
    if (this.needsSpot('gold') && !this.isPositive(this.spotGold)) {
      return 'Enter a gold spot price to value the gold coins.';
    }
    if (this.needsSpot('silver') && !this.isPositive(this.spotSilver)) {
      return 'Enter a silver spot price to value the silver coins.';
    }
    if (this.dealerPercent === null || !Number.isFinite(this.dealerPercent) || this.dealerPercent < 0 || this.dealerPercent > 100) {
      return 'Dealer offer must be between 0% and 100%.';
    }
    return null;
  }

  get meltValue(): number | null {
    if (this.errorMessage !== null || this.rows.length === 0) {
      return null;
    }
    return this.rows.reduce((sum, row) => sum + (this.rowValue(row) ?? 0), 0);
  }

  get dealerValue(): number | null {
    const melt = this.meltValue;
    return melt === null ? null : (melt * this.dealerPercent!) / 100;
  }

  money(value: number | null): string {
    return value === null ? '—' : this.currency.format(value);
  }

  toz(value: number): string {
    return `${value.toFixed(4)} oz t`;
  }

  private loadFromLink(): void {
    const params = this.route?.snapshot.queryParamMap;
    const shared = params?.get('stack');
    if (!shared) {
      return;
    }

    const { items, skipped } = decodeStack(shared);
    this.applyItems(items);
    this.stackName = params?.get('name') ?? '';
    const loaded = `Loaded a shared stack of ${items.length} coin type${items.length === 1 ? '' : 's'}.`;
    const unread = skipped === 1 ? '1 entry in the link wasn\'t' : `${skipped} entries in the link weren't`;
    this.linkNotice = skipped > 0 ? `${loaded} ${unread} recognized.` : loaded;
  }

  private applyItems(items: StackItem[]): void {
    this.rows = items.flatMap(item => {
      const coin = COIN_OPTIONS.find(option => option.id === item.id);
      return coin ? [{ coin, quantity: item.quantity, note: item.note ?? '' }] : [];
    });
  }

  private totalToz(metal: Metal): number {
    return this.rows
      .filter(row => row.coin.metal === metal)
      .reduce((sum, row) => sum + this.rowToz(row), 0);
  }

  private needsSpot(metal: Metal): boolean {
    return this.rows.some(row => row.coin.metal === metal && this.quantity(row) > 0);
  }

  private quantity(row: StackRow): number {
    return this.isWholeOrZero(row.quantity) ? row.quantity! : 0;
  }

  private isPositive(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value > 0;
  }

  private isWholeOrZero(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value >= 0;
  }
}
