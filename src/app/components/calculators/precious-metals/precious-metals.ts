import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SpotPriceService } from '../../../services/spot-price';
import { PreciousMetalBreakdownComponent } from '../precious-metal-breakdown/precious-metal-breakdown';
import { CUSTOM_SILVER, emptyMetalTotal, goldTypes, silverTypes } from '../../../constants/constants';
import { MetalService } from '../../../services/metal';
import { SavedList, SavedListStore } from '../../../services/saved-lists';
import { SaveShareComponent } from '../../save-share/save-share';
import { decodeMetalList, encodeMetalList, isMetalItems, MetalListItem } from './metal-list';

type SpotMetal = 'gold' | 'silver';

@Component({
  selector: 'app-precious-metals',
  standalone: true,
  imports: [CommonModule, FormsModule, PreciousMetalBreakdownComponent, SaveShareComponent],
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

  readonly customSilver = CUSTOM_SILVER;
  /** Rows whose empty note box is expanded; a note with text always shows. */
  private openNotes = new Set<MetalRow>();

  goldMetalTypes: MetalType[] = goldTypes;
  silverMetalTypes: MetalType[] = silverTypes;

  private nextGoldId = 2;
  private nextSilverId = 2;

  listName = '';
  /** Set when a shared link is opened, to say what was loaded from it. */
  linkNotice: string | null = null;
  readonly savedLists = new SavedListStore<MetalListItem[]>('utilities-metal-lists', isMetalItems);
  readonly describeList = (items: MetalListItem[]) => `${items.length} piece${items.length === 1 ? '' : 's'}`;
  private readonly route = inject(ActivatedRoute, { optional: true });

  constructor(
    private cdr: ChangeDetectorRef,
    private spotPriceService: SpotPriceService,
    private metalService: MetalService
  ) { }

  ngOnInit() {
    this.loadFromLink();
    this.loadSpotPrices();
  }

  hasNote(row: MetalRow): boolean {
    return !!row.note?.trim();
  }

  isNoteOpen(row: MetalRow): boolean {
    return this.openNotes.has(row);
  }

  toggleNote(row: MetalRow) {
    if (this.openNotes.has(row)) {
      this.openNotes.delete(row);
    } else {
      this.openNotes.add(row);
    }
  }

  /** Every row with a weight, in on-screen order: gold first, then silver. */
  get items(): MetalListItem[] {
    const toItems = (metal: 'gold' | 'silver', rows: MetalRow[]) => rows
      .filter(row => Number.isFinite(row.weight) && row.weight > 0)
      .map(row => ({
        metal,
        type: row.type,
        weight: row.weight,
        unit: row.unit,
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
        ...(row.type === CUSTOM_SILVER ? { purity: row.purity } : {}),
      }));
    return [...toItems('gold', this.goldRows), ...toItems('silver', this.silverRows)];
  }

  /** Null until something is weighed, which disables Save and the share link. */
  get itemsOrNull(): MetalListItem[] | null {
    const items = this.items;
    return items.length > 0 ? items : null;
  }

  get shareValue(): string | null {
    const items = this.items;
    return items.length > 0 ? encodeMetalList(items) : null;
  }

  loadList(list: SavedList<MetalListItem[]>) {
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
    const loaded = `Loaded a shared list of ${items.length} piece${items.length === 1 ? '' : 's'}.`;
    const unread = skipped === 1 ? '1 entry in the link wasn\'t' : `${skipped} entries in the link weren't`;
    this.linkNotice = skipped > 0 ? `${loaded} ${unread} recognized.` : loaded;
  }

  /** Replaces both sections; a metal with nothing in the list keeps one empty row to type into. */
  private applyItems(items: MetalListItem[]) {
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
    this.calculate();
  }

  loadSpotPrices() {
    this.loading = true;
    this.spotPriceService.getSpotPrices().subscribe({
      next: (prices) => {
        this.livePrices = prices;
        this.spotPrices = { ...prices };
        this.overridden = { gold: false, silver: false };
        this.loading = false;
        this.calculate();
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

    const goldCalc = this.metalService.calculateGoldPrice(this.spotPrices, this.goldRows)

    this.goldBreakdowns = goldCalc.breakdowns;
    this.goldTotals = goldCalc.totals
  }

  private calculateSilver() {
    if (!this.spotPrices) return;

    const silverCalc = this.metalService.calculateSilverPrice(this.spotPrices, this.silverRows)

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

  resetPrice(metal: SpotMetal) {
    this.spotPrices = { ...this.spotPrices, [metal]: this.livePrices[metal] };
    this.overridden = { ...this.overridden, [metal]: false };
    this.calculate();
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