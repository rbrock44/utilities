import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SpotPriceService } from '../../../services/spot-price';
import { PreciousMetalBreakdownComponent } from '../precious-metal-breakdown/precious-metal-breakdown';
import { CARAT_IN_GRAMS, CUSTOM_PURITY, emptyMetalTotal, goldTypes, METAL_UNITS, silverTypes, TROY_OZ_IN_GRAMS } from '../../../constants/constants';
import { MetalService, validStone } from '../../../services/metal';
import { SavedList, SavedListStore } from '../../../services/saved-lists';
import { SaveShareComponent } from '../../save-share/save-share';
import { COIN_OPTIONS, CoinOption, coinStruckAt, coinStruckIn, findCoin } from '../../../constants/coin-options';
import { KEY_DATES, KeyDate, keyDateLabel, keyDateMatches } from '../../../constants/key-dates';
import { ComboBoxComponent } from '../../combo-box/combo-box';
import {
  CoinListItem,
  decodeMetalList,
  decodeSpotPrices,
  encodeMetalList,
  encodeSpotPrices,
  isCoinEntry,
  isMetalItems,
  ListMetal,
  MetalListEntry,
  MetalListItem,
  priceOf,
  typesFor,
} from './metal-list';
import { migrateCoinStacks } from './coin-stack-migration';
import { buildMetalQuote, MetalQuote, quoteFileName } from './metal-quote';

type SpotMetal = ListMetal;
/** Platinum and palladium live in their own section, closed until asked for. */
type PgmMetal = 'platinum' | 'palladium';
/** Each metal section folds away behind its header. */
type Section = 'gold' | 'silver' | 'pgm';

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
    platinum: -1.00,
    palladium: -1.00,
    timestamp: new Date()
  };
  livePrices: SpotPrices = this.spotPrices;
  loading = true;

  readonly spotMetals: { key: 'gold' | 'silver'; label: string }[] = [
    { key: 'gold', label: 'Gold' },
    { key: 'silver', label: 'Silver' }
  ];
  readonly pgmMetals: { key: PgmMetal; label: string; types: MetalType[] }[] = [
    { key: 'platinum', label: 'Platinum', types: typesFor('platinum') },
    { key: 'palladium', label: 'Palladium', types: typesFor('palladium') },
  ];
  editingMetal: SpotMetal | null = null;
  editPrice: number | null = null;
  overridden: Record<SpotMetal, boolean> = { gold: false, silver: false, platinum: false, palladium: false };
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

  /** Gold and silver start open; platinum and palladium stay closed until asked for. */
  open: Record<Section, boolean> = { gold: true, silver: true, pgm: false };
  pgmRows: Record<PgmMetal, MetalRow[]> = {
    platinum: [{ id: 1, type: typesFor('platinum')[0].name, weight: 0, unit: 'grams' }],
    palladium: [{ id: 2, type: typesFor('palladium')[0].name, weight: 0, unit: 'grams' }],
  };
  pgmBreakdowns: Record<PgmMetal, PreciousMetalBreakdown[]> = { platinum: [], palladium: [] };
  pgmTotals: Record<PgmMetal, MetalTotals> = { platinum: emptyMetalTotal, palladium: emptyMetalTotal };
  private nextPgmId = 3;

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
  private openStones = new Set<MetalRow>();

  coinRows: CoinRow[] = [];
  coinPickerValue: string | null = null;
  /** Key date warnings by option id, so the matcher can tell them from coins. */
  private readonly keyDateOptions = new Map<string, KeyDate>(
    KEY_DATES.map(key => [`key-${key.coin}-${key.year}-${key.mint.toLowerCase()}`, key]));

  /**
   * Coins with no metal in them (clad, nickel) add nothing to a melt total, so they can't be picked;
   * they show as a hint instead, so a search for a 1976-D Ike says why it isn't silver. Key date
   * warnings are hints too, listed first so they sit right under the coin they're about.
   */
  readonly coinOptions: ComboBoxOption[] = [
    ...[...this.keyDateOptions].map(([id, key]) => {
      const coin = findCoin(key.coin)!;
      return {
        id,
        label: `⚠ ${keyDateLabel(key)} ${coin.spec.name} is a key date · often worth far more than melt, check before selling`,
        searchText: `${coin.metal} ${coin.label}`.toLowerCase(),
        disabled: true,
        warning: true,
      };
    }),
    ...COIN_OPTIONS.map(coin => coin.spec.purity > 0
      ? {
        id: coin.id,
        label: `${coin.metal === 'gold' ? 'Gold' : 'Silver'} · ${coin.label}`,
        searchText: `${coin.metal} ${coin.label}`.toLowerCase(),
      }
      : {
        id: coin.id,
        label: `${coin.label} · no silver`,
        searchText: coin.label.toLowerCase(),
        disabled: true,
      }),
  ];

  readonly coinMatches = (option: ComboBoxOption, words: string[]): boolean => {
    const key = this.keyDateOptions.get(option.id);
    return key
      ? keyDateMatches(key, option.searchText, words)
      : words.every(word => this.coinMatchesWord(option, word));
  };

  /**
   * A typed year like `1944` finds coins struck that year, not just ones whose label has it, and a
   * mint mark (`1976 s`, `1976-s`, `1976s`) narrows to coins that mint struck in silver or gold.
   */
  private coinMatchesWord(option: ComboBoxOption, word: string): boolean {
    const coin = findCoin(option.id);
    const dated = word.match(/^(\d{4})-?(p|d|s|o|w|cc)?$/);
    if (coin && dated && coin.years) {
      return coinStruckIn(coin, Number(dated[1])) && (!dated[2] || coinStruckAt(coin, dated[2]));
    }
    if (coin && /^(p|d|s|o|w|cc)$/.test(word)) {
      return coinStruckAt(coin, word);
    }
    return option.searchText.includes(word);
  }

  goldMetalTypes: MetalType[] = goldTypes;
  silverMetalTypes: MetalType[] = silverTypes;
  readonly metalUnits = METAL_UNITS;
  /** One weight unit for every breakdown, oz t until picked. */
  breakdownUnit: MetalUnitId = 'toz';

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

  hasStone(row: MetalRow): boolean {
    return validStone(row.stone) > 0;
  }

  /** Like a note, a stone with a weight always shows; an empty one shows only while toggled open. */
  isStoneShown(row: MetalRow): boolean {
    return this.hasStone(row) || this.openStones.has(row);
  }

  stoneToggleTitle(row: MetalRow): string {
    if (this.hasStone(row)) return 'Clear the stone weight to hide it';
    return this.openStones.has(row) ? 'Hide stone' : 'Take a stone\'s weight off';
  }

  toggleStone(row: MetalRow) {
    if (this.hasStone(row)) return;
    if (this.openStones.has(row)) {
      this.openStones.delete(row);
    } else {
      this.openStones.add(row);
    }
  }

  /** A stone as heavy as the piece leaves no metal to value, so the row says so. */
  isStoneTooHeavy(row: MetalRow): boolean {
    const unit = METAL_UNITS.find(known => known.id === row.unit);
    return !!unit && row.weight > 0 && validStone(row.stone) * CARAT_IN_GRAMS >= row.weight * unit.grams;
  }

  /** Picking a coin already in the list adds one more instead of a duplicate row. */
  addCoin(id: string) {
    const coin = findCoin(id);
    if (!coin || coin.spec.purity === 0) return;

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
    if (metal === 'platinum' || metal === 'palladium') {
      return this.pgmRows[metal];
    }
    return [...(metal === 'gold' ? this.goldRows : this.silverRows), ...this.coinMetalRows(metal)];
  }

  /** Every row with a weight, in on-screen order: gold, silver, platinum, palladium, then coins. */
  get items(): MetalListEntry[] {
    const toItems = (metal: ListMetal, rows: MetalRow[]) => rows
      .filter(row => Number.isFinite(row.weight) && row.weight > 0)
      .map(row => ({
        metal,
        type: row.type,
        weight: row.weight,
        unit: row.unit,
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
        ...(row.type === CUSTOM_PURITY ? { purity: row.purity } : {}),
        ...(this.hasStone(row) ? { stone: row.stone! } : {}),
      }));
    const coins: CoinListItem[] = this.coinRows
      .filter(row => this.coinQuantity(row) > 0)
      .map(row => ({
        coin: row.coin.id,
        quantity: this.coinQuantity(row),
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
      }));
    return [
      ...toItems('gold', this.goldRows),
      ...toItems('silver', this.silverRows),
      ...toItems('platinum', this.pgmRows.platinum),
      ...toItems('palladium', this.pgmRows.palladium),
      ...coins,
    ];
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
      this.metalService.calculateSilverPrice(prices, this.valuedRows('silver')).totals.spotValue +
      this.metalService.calculatePlatinumPrice(prices, this.valuedRows('platinum')).totals.spotValue +
      this.metalService.calculatePalladiumPrice(prices, this.valuedRows('palladium')).totals.spotValue;
  }

  /** "Gold $4,000.00 · Silver $50.00", plus platinum and palladium when they're known. */
  priceSummary(prices: SpotPrices): string {
    return [...this.spotMetals, ...this.pgmMetals]
      .filter(metal => priceOf(prices, metal.key) > 0)
      .map(metal => `${metal.label} $${priceOf(prices, metal.key).toFixed(2)}`)
      .join(' · ');
  }

  price(metal: SpotMetal): number {
    return priceOf(this.spotPrices, metal);
  }

  livePrice(metal: SpotMetal): number {
    return priceOf(this.livePrices, metal);
  }

  useSharedPrices() {
    this.pricePrompt = false;
    this.usingSharedPrices = true;
    this.applySharedPrices();
  }

  useTodaysPrices() {
    this.pricePrompt = false;
    this.usingSharedPrices = false;
    const kept = this.spotPrices;
    if (this.livePrices.gold > 0) {
      this.spotPrices = { ...this.livePrices };
    }
    this.overridden = { gold: false, silver: false, platinum: false, palladium: false };
    this.keepTypedPrices(kept);
    this.calculate();
  }

  /** Live prices replace typed ones, except where the feed has none (palladium), so a typed price survives. */
  private keepTypedPrices(kept: SpotPrices) {
    for (const { key } of this.pgmMetals) {
      if (this.livePrice(key) <= 0 && priceOf(kept, key) > 0) {
        this.spotPrices = { ...this.spotPrices, [key]: kept[key] };
        this.overridden = { ...this.overridden, [key]: true };
      }
    }
  }

  /** The shared prices count as set by hand, so the reset button goes back to live once live prices arrive. */
  private applySharedPrices() {
    const shared = this.sharedPrices;
    if (!shared) return;
    const kept = this.spotPrices;
    const differs = (metal: SpotMetal) => this.livePrice(metal) > 0 && priceOf(shared, metal) > 0 &&
      priceOf(shared, metal) !== this.livePrice(metal);
    // A link without platinum or palladium prices keeps whatever this page already has for them.
    this.spotPrices = {
      ...shared,
      platinum: priceOf(shared, 'platinum') > 0 ? shared.platinum : kept.platinum,
      palladium: priceOf(shared, 'palladium') > 0 ? shared.palladium : kept.palladium,
    };
    this.overridden = {
      gold: differs('gold'),
      silver: differs('silver'),
      platinum: differs('platinum'),
      palladium: differs('palladium') || (this.livePrice('palladium') <= 0 && this.price('palladium') > 0),
    };
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

    const decoded = decodeMetalList(shared);
    // A coin with no metal in it can't be picked, so one in a link gets the picker's hint, not a $0 row.
    const noMetal = (entry: MetalListEntry) => isCoinEntry(entry) && findCoin(entry.coin)?.spec.purity === 0;
    const items = decoded.items.filter(entry => !noMetal(entry));
    const leftOut = decoded.items.filter(isCoinEntry).filter(noMetal).map(entry => findCoin(entry.coin)!.label);
    const skipped = decoded.skipped;
    this.applyItems(items);
    this.listName = params?.get('name') ?? '';
    this.sharedPrices = decodeSpotPrices(params?.get('spot'));
    this.pricePrompt = this.sharedPrices !== null;
    const loaded = `Loaded a shared list of ${describeEntries(items)}.`;
    const unread = skipped === 1 ? '1 entry in the link wasn\'t' : `${skipped} entries in the link weren't`;
    this.linkNotice = [
      loaded,
      ...(skipped > 0 ? [`${unread} recognized.`] : []),
      ...(leftOut.length > 0 ? [`Left out ${leftOut.join(', ')}: no silver.`] : []),
    ].join(' ');
  }

  /** Replaces every section; a metal with nothing in the list keeps one empty row to type into. */
  private applyItems(entries: MetalListEntry[]) {
    const items = entries.filter((entry): entry is MetalListItem => !isCoinEntry(entry));
    const toRows = (metal: ListMetal, nextId: () => number, defaultType: string): MetalRow[] => {
      const rows = items
        .filter(item => item.metal === metal)
        .map(item => ({
          id: nextId(),
          type: item.type,
          weight: item.weight,
          unit: item.unit,
          note: item.note ?? '',
          ...(item.purity !== undefined ? { purity: item.purity } : {}),
          ...(item.stone !== undefined ? { stone: item.stone } : {}),
        }));
      return rows.length > 0 ? rows : [{ id: nextId(), type: defaultType, weight: 0, unit: 'grams' }];
    };

    this.goldRows = toRows('gold', () => this.nextGoldId++, goldTypes[0].name);
    this.silverRows = toRows('silver', () => this.nextSilverId++, silverTypes[0].name);
    this.pgmRows = {
      platinum: toRows('platinum', () => this.nextPgmId++, typesFor('platinum')[0].name),
      palladium: toRows('palladium', () => this.nextPgmId++, typesFor('palladium')[0].name),
    };
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
          const kept = this.spotPrices;
          this.spotPrices = { ...prices };
          this.overridden = { gold: false, silver: false, platinum: false, palladium: false };
          this.keepTypedPrices(kept);
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

  toggleSection(section: Section) {
    this.open = { ...this.open, [section]: !this.open[section] };
  }

  addPgmRow(metal: PgmMetal) {
    this.pgmRows[metal].push({ id: this.nextPgmId++, type: typesFor(metal)[0].name, weight: 0, unit: 'grams' });
    this.calculate();
  }

  /** Removes the row, or resets it to defaults when it is the only one left. */
  removePgmRow(metal: PgmMetal, id: number) {
    const rows = this.pgmRows[metal];
    this.pgmRows[metal] = rows.length > 1
      ? rows.filter(row => row.id !== id)
      : [{ id: this.nextPgmId++, type: typesFor(metal)[0].name, weight: 0, unit: 'grams' }];
    this.calculate();
  }

  /**
   * Shown on a closed section so what it adds to the totals is never out of sight:
   * "2 pieces · 5 coins · $1234.56". Gold and silver count their coins too.
   */
  sectionSummary(section: Section): string | null {
    const rows = section === 'gold' ? this.goldRows
      : section === 'silver' ? this.silverRows
      : [...this.pgmRows.platinum, ...this.pgmRows.palladium];
    const pieces = rows.filter(row => row.weight > 0).length;
    const coins = section === 'pgm' ? 0 : this.coinRows
      .filter(row => row.coin.metal === section)
      .reduce((sum, row) => sum + this.coinQuantity(row), 0);
    if (pieces + coins === 0) return null;

    const value = section === 'gold' ? this.goldTotals.spotValue
      : section === 'silver' ? this.silverTotals.spotValue
      : this.pgmTotals.platinum.spotValue + this.pgmTotals.palladium.spotValue;
    const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
    return [pieces > 0 ? plural(pieces, 'piece') : '', coins > 0 ? plural(coins, 'coin') : '', `$${value.toFixed(2)}`]
      .filter(Boolean)
      .join(' · ');
  }

  calculate() {
    if (!this.spotPrices) return;

    this.calculateGold();
    this.calculateSilver();
    this.calculatePgm();
    this.calculateGrandTotals();
  }

  private calculatePgm() {
    const platinum = this.metalService.calculatePlatinumPrice(this.spotPrices, this.pgmRows.platinum);
    const palladium = this.metalService.calculatePalladiumPrice(this.spotPrices, this.pgmRows.palladium);
    this.pgmBreakdowns = { platinum: platinum.breakdowns, palladium: palladium.breakdowns };
    this.pgmTotals = { platinum: platinum.totals, palladium: palladium.totals };
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
    const all = [this.goldTotals, this.silverTotals, this.pgmTotals.platinum, this.pgmTotals.palladium];
    const sum = (field: 'spotValue' | 'value90' | 'value80' | 'value70') => all.reduce((total, t) => total + t[field], 0);
    this.grandTotals = {
      spotValue: sum('spotValue'),
      value90: sum('value90'),
      value80: sum('value80'),
      value70: sum('value70')
    };
    this.syncOffer();
  }

  startPriceEdit(metal: SpotMetal) {
    this.editingMetal = metal;
    this.editPrice = this.price(metal) > 0 ? this.price(metal) : null;
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
    const perGramPure = this.price(metal) / TROY_OZ_IN_GRAMS;
    return typesFor(metal).map(type => ({
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
      others: this.pgmMetals
        .filter(({ key }) => this.pgmBreakdowns[key].length > 0)
        .map(({ key, label }) => ({ title: label as 'Platinum' | 'Palladium', breakdowns: this.pgmBreakdowns[key], totals: this.pgmTotals[key] })),
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
