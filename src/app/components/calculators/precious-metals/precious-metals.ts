import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SpotPriceService } from '../../../services/spot-price';
import { PreciousMetalBreakdownComponent } from '../precious-metal-breakdown/precious-metal-breakdown';
import { CUSTOM_PURITY, emptyMetalTotal, goldTypes, METAL_UNITS, silverTypes, TROY_OZ_IN_GRAMS } from '../../../constants/constants';
import { MetalService } from '../../../services/metal';
import { SavedList, SavedListStore } from '../../../services/saved-lists';
import { SaveShareComponent } from '../../save-share/save-share';
import { COIN_OPTIONS, CoinOption, findCoin } from '../../../constants/coin-options';
import { ComboBoxComponent } from '../../combo-box/combo-box';
import {
  CoinListItem,
  decodeMetalList,
  decodeSpotPrices,
  encodeMetalList,
  encodeSpotPrices,
  isCoinEntry,
  isMetalItems,
  MetalListEntry,
  MetalListItem,
} from './metal-list';
import { migrateCoinStacks } from './coin-stack-migration';
import { buildMetalQuote, MetalQuote, quoteFileName } from './metal-quote';

type SpotMetal = 'gold' | 'silver';

export interface CoinRow {
  coin: CoinOption;
  quantity: number | null;
  note?: string;
}

/** Anything with an optional note: a weighed row or a coin row. */
type NoteRow = { note?: string };

@Component({
  selector: 'app-precious-metals',
  standalone: true,
  imports: [CommonModule, FormsModule, PreciousMetalBreakdownComponent, SaveShareComponent, ComboBoxComponent],
  templateUrl: './precious-metals.html',
  styleUrl: './precious-metals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreciousMetalsComponent implements OnInit {
  spotPrices: SpotPrices = {
    gold: -1.00,
    silver: -1.00,
    timestamp: new Date()
  };
  livePrices: SpotPrices = this.spotPrices;
  loading = true;

  readonly spotMetals: { key: SpotMetal; label: string }[] = [
    { key: 'gold', label: 'Gold' },
    { key: 'silver', label: 'Silver' }
  ];
  editingMetal: SpotMetal | null = null;
  editPrice: number | null = null;
  overridden: Record<SpotMetal, boolean> = { gold: false, silver: false };
  /** Whether the per-type price lists are dropped down; gold and silver open together. */
  typePricesOpen = false;

  @ViewChild('priceInput') set priceInput(input: ElementRef<HTMLInputElement> | undefined) {
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }

  goldRows: MetalRow[] = [{ id: 1, type: goldTypes[0].name, weight: 0, unit: 'grams' }];
  silverRows: MetalRow[] = [{ id: 1, type: silverTypes[0].name, weight: 0, unit: 'grams' }];

  goldBreakdowns: PreciousMetalBreakdown[] = [];
  silverBreakdowns: PreciousMetalBreakdown[] = [];

  goldTotals: MetalTotals = emptyMetalTotal;
  silverTotals: MetalTotals = emptyMetalTotal;

  grandTotals = {
    spotValue: 0,
    value90: 0,
    value80: 0,
    value70: 0
  };

  offerOpen = false;
  offerAmount: number | null = null;
  offerPercent: number | null = null;
  private offerSource: 'amount' | 'percent' = 'amount';

  readonly customPurity = CUSTOM_PURITY;
  /** Rows whose empty note box is expanded; a note with text always shows. */
  private openNotes = new Set<NoteRow>();

  coinRows: CoinRow[] = [];
  coinPickerValue: string | null = null;
  /** Coins with no metal in them (clad, nickel) are left out; they'd add nothing to a melt total. */
  readonly coinOptions: ComboBoxOption[] = COIN_OPTIONS
    .filter(coin => coin.spec.purity > 0)
    .map(coin => ({
      id: coin.id,
      label: `${coin.metal === 'gold' ? 'Gold' : 'Silver'} · ${coin.label}`,
      searchText: `${coin.metal} ${coin.label}`.toLowerCase(),
    }));

  goldMetalTypes: MetalType[] = goldTypes;
  silverMetalTypes: MetalType[] = silverTypes;
  readonly metalUnits = METAL_UNITS;

  private nextGoldId = 2;
  private nextSilverId = 2;

  /** Prices a shared link was valued at; the user picks those or today's before they apply. */
  sharedPrices: SpotPrices | null = null;
  pricePrompt = false;
  private usingSharedPrices = false;

  listName = '';
  /** Set when a shared link is opened, to say what was loaded from it. */
  linkNotice: string | null = null;
  readonly savedLists = new SavedListStore<MetalListEntry[]>('utilities-metal-lists', isMetalItems);
  readonly describeList = describeEntries;
  private readonly route = inject(ActivatedRoute, { optional: true });

  constructor(
    private cdr: ChangeDetectorRef,
    private spotPriceService: SpotPriceService,
    private metalService: MetalService
  ) { }

  ngOnInit() {
    migrateCoinStacks(this.savedLists);
    this.loadFromLink();
    this.loadSpotPrices();
  }

  hasNote(row: NoteRow): boolean {
    return !!row.note?.trim();
  }

  isNoteOpen(row: NoteRow): boolean {
    return this.openNotes.has(row);
  }

  /** A note with text always shows; a blank one shows only while toggled open. */
  isNoteShown(row: NoteRow): boolean {
    return this.hasNote(row) || this.isNoteOpen(row);
  }

  noteToggleTitle(row: NoteRow): string {
    if (this.hasNote(row)) return 'Clear the note to hide it';
    return this.isNoteOpen(row) ? 'Hide note' : 'Add a note';
  }

  toggleNote(row: NoteRow) {
    if (this.hasNote(row)) return;
    if (this.openNotes.has(row)) {
      this.openNotes.delete(row);
    } else {
      this.openNotes.add(row);
    }
  }

  /** Picking a coin already in the list adds one more instead of a duplicate row. */
  addCoin(id: string) {
    const coin = findCoin(id);
    if (!coin) return;

    const existing = this.coinRows.find(row => row.coin.id === id);
    if (existing) {
      existing.quantity = (this.coinQuantity(existing)) + 1;
      this.coinRows = [...this.coinRows];
    } else {
      this.coinRows = [...this.coinRows, { coin, quantity: 1, note: '' }];
    }
    this.calculate();
    // The combo box keeps showing the picked label until its [value] input changes, so step
    // it to the id and back to null across two change-detection passes to empty the search.
    this.coinPickerValue = id;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.coinPickerValue = null;
      this.cdr.markForCheck();
    });
  }

  removeCoinRow(row: CoinRow) {
    this.coinRows = this.coinRows.filter(r => r !== row);
    this.calculate();
  }

  /** Blank, negative, or fractional counts are treated as none until fixed. */
  coinQuantity(row: CoinRow): number {
    return row.quantity !== null && Number.isInteger(row.quantity) && row.quantity > 0 ? row.quantity : 0;
  }

  /** Each counted coin is valued as a custom-percent row of its total weight, named after the coin. */
  private coinMetalRows(metal: SpotMetal): MetalRow[] {
    return this.coinRows
      .filter(row => row.coin.metal === metal && this.coinQuantity(row) > 0)
      .map((row, index) => ({
        id: -(index + 1),
        type: CUSTOM_PURITY,
        purity: row.coin.spec.purity * 100,
        weight: row.coin.spec.weightGrams * this.coinQuantity(row),
        unit: 'grams' as const,
        label: `${row.coin.label} × ${this.coinQuantity(row)}`,
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
      }));
  }

  private valuedRows(metal: SpotMetal): MetalRow[] {
    return [...(metal === 'gold' ? this.goldRows : this.silverRows), ...this.coinMetalRows(metal)];
  }

  /** Every row with a weight, in on-screen order: gold first, then silver, then coins. */
  get items(): MetalListEntry[] {
    const toItems = (metal: 'gold' | 'silver', rows: MetalRow[]) => rows
      .filter(row => Number.isFinite(row.weight) && row.weight > 0)
      .map(row => ({
        metal,
        type: row.type,
        weight: row.weight,
        unit: row.unit,
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
        ...(row.type === CUSTOM_PURITY ? { purity: row.purity } : {}),
      }));
    const coins: CoinListItem[] = this.coinRows
      .filter(row => this.coinQuantity(row) > 0)
      .map(row => ({
        coin: row.coin.id,
        quantity: this.coinQuantity(row),
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
      }));
    return [...toItems('gold', this.goldRows), ...toItems('silver', this.silverRows), ...coins];
  }

  /** Null until something is weighed or counted, which disables Save and the share link. */
  get itemsOrNull(): MetalListEntry[] | null {
    const items = this.items;
    return items.length > 0 ? items : null;
  }

  get shareValue(): string | null {
    const items = this.items;
    return items.length > 0 ? encodeMetalList(items) : null;
  }

  /** The prices in use go in the link so the person it's sent to can see the same numbers. */
  get shareExtras(): Record<string, string> {
    const spot = encodeSpotPrices(this.spotPrices);
    return spot ? { spot } : {};
  }

  /** Combined spot value of the current rows at the given prices, or null without prices. */
  spotTotalAt(prices: SpotPrices): number | null {
    if (!(prices.gold > 0 && prices.silver > 0)) return null;
    return this.metalService.calculateGoldPrice(prices, this.valuedRows('gold')).totals.spotValue +
      this.metalService.calculateSilverPrice(prices, this.valuedRows('silver')).totals.spotValue;
  }

  useSharedPrices() {
    this.pricePrompt = false;
    this.usingSharedPrices = true;
    this.applySharedPrices();
  }

  useTodaysPrices() {
    this.pricePrompt = false;
    this.usingSharedPrices = false;
    if (this.livePrices.gold > 0) {
      this.spotPrices = { ...this.livePrices };
    }
    this.overridden = { gold: false, silver: false };
    this.calculate();
  }

  /** The shared prices count as set by hand, so the reset button goes back to live once live prices arrive. */
  private applySharedPrices() {
    const shared = this.sharedPrices;
    if (!shared) return;
    const differs = (metal: SpotMetal) => this.livePrices[metal] > 0 && shared[metal] !== this.livePrices[metal];
    this.spotPrices = { ...shared };
    this.overridden = { gold: differs('gold'), silver: differs('silver') };
    this.calculate();
  }

  refreshPrices() {
    this.usingSharedPrices = false;
    this.pricePrompt = false;
    this.loadSpotPrices();
  }

  loadList(list: SavedList<MetalListEntry[]>) {
    this.applyItems(list.items);
    this.linkNotice = null;
    this.cdr.markForCheck();
  }

  private loadFromLink() {
    const params = this.route?.snapshot.queryParamMap;
    const shared = params?.get('metals');
    if (!shared) return;

    const { items, skipped } = decodeMetalList(shared);
    this.applyItems(items);
    this.listName = params?.get('name') ?? '';
    this.sharedPrices = decodeSpotPrices(params?.get('spot'));
    this.pricePrompt = this.sharedPrices !== null;
    const loaded = `Loaded a shared list of ${describeEntries(items)}.`;
    const unread = skipped === 1 ? '1 entry in the link wasn\'t' : `${skipped} entries in the link weren't`;
    this.linkNotice = skipped > 0 ? `${loaded} ${unread} recognized.` : loaded;
  }

  /** Replaces every section; a metal with nothing in the list keeps one empty row to type into. */
  private applyItems(entries: MetalListEntry[]) {
    const items = entries.filter((entry): entry is MetalListItem => !isCoinEntry(entry));
    const toRows = (metal: 'gold' | 'silver', nextId: () => number, defaultType: string): MetalRow[] => {
      const rows = items
        .filter(item => item.metal === metal)
        .map(item => ({
          id: nextId(),
          type: item.type,
          weight: item.weight,
          unit: item.unit,
          note: item.note ?? '',
          ...(item.purity !== undefined ? { purity: item.purity } : {}),
        }));
      return rows.length > 0 ? rows : [{ id: nextId(), type: defaultType, weight: 0, unit: 'grams' }];
    };

    this.goldRows = toRows('gold', () => this.nextGoldId++, goldTypes[0].name);
    this.silverRows = toRows('silver', () => this.nextSilverId++, silverTypes[0].name);
    this.coinRows = entries.filter(isCoinEntry).flatMap(entry => {
      const coin = findCoin(entry.coin);
      return coin ? [{ coin, quantity: entry.quantity, note: entry.note ?? '' }] : [];
    });
    this.calculate();
  }

  loadSpotPrices() {
    this.loading = true;
    this.spotPriceService.getSpotPrices().subscribe({
      next: (prices) => {
        this.livePrices = prices;
        this.loading = false;
        if (this.usingSharedPrices) {
          this.applySharedPrices();
        } else {
          this.spotPrices = { ...prices };
          this.overridden = { gold: false, silver: false };
          this.calculate();
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading spot prices:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  addGoldRow() {
    this.goldRows.push({
      id: this.nextGoldId++,
      type: goldTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
    this.calculate();
  }

  addSilverRow() {
    this.silverRows.push({
      id: this.nextSilverId++,
      type: silverTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
    this.calculate();
  }

  /** Removes the row, or resets it to defaults when it is the only one left. */
  removeGoldRow(id: number) {
    if (this.goldRows.length > 1) {
      this.goldRows = this.goldRows.filter(row => row.id !== id);
    } else {
      this.goldRows = [{ id: this.nextGoldId++, type: goldTypes[0].name, weight: 0, unit: 'grams' }];
    }
    this.calculate();
  }

  /** Removes the row, or resets it to defaults when it is the only one left. */
  removeSilverRow(id: number) {
    if (this.silverRows.length > 1) {
      this.silverRows = this.silverRows.filter(row => row.id !== id);
    } else {
      this.silverRows = [{ id: this.nextSilverId++, type: silverTypes[0].name, weight: 0, unit: 'grams' }];
    }
    this.calculate();
  }

  calculate() {
    if (!this.spotPrices) return;

    this.calculateGold();
    this.calculateSilver();
    this.calculateGrandTotals();
  }

  private calculateGold() {
    if (!this.spotPrices) return;

    const goldCalc = this.metalService.calculateGoldPrice(this.spotPrices, this.valuedRows('gold'))

    this.goldBreakdowns = goldCalc.breakdowns;
    this.goldTotals = goldCalc.totals
  }

  private calculateSilver() {
    if (!this.spotPrices) return;

    const silverCalc = this.metalService.calculateSilverPrice(this.spotPrices, this.valuedRows('silver'))

    this.silverBreakdowns = silverCalc.breakdowns;
    this.silverTotals = silverCalc.totals
  }

  private calculateGrandTotals() {
    this.grandTotals = {
      spotValue: this.goldTotals.spotValue + this.silverTotals.spotValue,
      value90: this.goldTotals.value90 + this.silverTotals.value90,
      value80: this.goldTotals.value80 + this.silverTotals.value80,
      value70: this.goldTotals.value70 + this.silverTotals.value70
    };
    this.syncOffer();
  }

  startPriceEdit(metal: SpotMetal) {
    this.editingMetal = metal;
    this.editPrice = this.spotPrices[metal] > 0 ? this.spotPrices[metal] : null;
  }

  /** Applies the typed price; blank or non-positive input leaves the price unchanged. */
  commitPriceEdit() {
    const metal = this.editingMetal;
    if (!metal) return;
    this.editingMetal = null;

    if (this.editPrice == null || this.editPrice <= 0) return;
    this.spotPrices = { ...this.spotPrices, [metal]: this.editPrice };
    this.overridden = { ...this.overridden, [metal]: this.editPrice !== this.livePrices[metal] };
    this.calculate();
  }

  cancelPriceEdit() {
    this.editingMetal = null;
  }

  /** A click on a card opens the per-type prices, unless it landed on the price, its input or a button. */
  onSpotCardClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('button, input')) return;
    this.toggleTypePrices();
  }

  toggleTypePrices() {
    this.typePricesOpen = !this.typePricesOpen;
  }

  /** What a gram of each fineness is worth at the current spot price, named without the metal ("14K (58.3%)"). */
  typePrices(metal: SpotMetal): { name: string; perGram: number }[] {
    const types = metal === 'gold' ? goldTypes : silverTypes;
    const perGramPure = this.spotPrices[metal] / TROY_OZ_IN_GRAMS;
    return types.map(type => ({
      name: type.name.replace(/\s*(Gold|Silver)\b/, '').replace('German/European', 'European'),
      perGram: perGramPure * type.purity,
    }));
  }

  resetPrice(metal: SpotMetal) {
    this.spotPrices = { ...this.spotPrices, [metal]: this.livePrices[metal] };
    this.overridden = { ...this.overridden, [metal]: false };
    this.calculate();
  }

  /** Everything the printable quote shows; the offer only counts while the offer check is open. */
  get quote(): MetalQuote {
    const offer = this.offerOpen && this.offerAmount != null && this.offerPercent != null
      ? { amount: this.offerAmount, percent: this.offerPercent }
      : null;
    return {
      name: this.listName,
      date: new Date(),
      spotPrices: this.spotPrices,
      manual: this.overridden,
      gold: this.goldBreakdowns,
      silver: this.silverBreakdowns,
      goldTotals: this.goldTotals,
      silverTotals: this.silverTotals,
      grandTotals: this.grandTotals,
      offer,
    };
  }

  /** jsPDF is loaded on demand so it stays out of the calculator's own chunk. */
  async downloadQuote() {
    const { jsPDF } = await import('jspdf');
    const quote = this.quote;
    buildMetalQuote(jsPDF, quote).save(quoteFileName(quote));
  }

  toggleOffer() {
    this.offerOpen = !this.offerOpen;
  }

  onOfferAmountChange(amount: number | null) {
    this.offerAmount = amount;
    this.offerSource = 'amount';
    this.syncOffer();
  }

  onOfferPercentChange(percent: number | null) {
    this.offerPercent = percent;
    this.offerSource = 'percent';
    this.syncOffer();
  }

  /** Recomputes whichever offer field the user did not type in last, against the combined spot value. */
  private syncOffer() {
    const spot = this.grandTotals.spotValue;
    if (spot <= 0) return;

    if (this.offerSource === 'amount') {
      this.offerPercent = this.offerAmount == null ? null : this.round2(this.offerAmount / spot * 100);
    } else {
      this.offerAmount = this.offerPercent == null ? null : this.round2(spot * this.offerPercent / 100);
    }
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/** "2 pieces", "12 coins", or "2 pieces · 12 coins". */
export function describeEntries(entries: MetalListEntry[]): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const pieces = entries.filter(entry => !isCoinEntry(entry)).length;
  const coins = entries.filter(isCoinEntry).reduce((sum, entry) => sum + entry.quantity, 0);
  const parts = [pieces > 0 ? plural(pieces, 'piece') : '', coins > 0 ? plural(coins, 'coin') : ''].filter(Boolean);
  return parts.join(' · ') || plural(0, 'piece');
}
