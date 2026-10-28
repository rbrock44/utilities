import { findCoin } from '../../../constants/coin-options';
import {
  CUSTOM_PURITY, findMetalUnit, goldTypes, METAL_UNITS, palladiumTypes, platinumTypes, silverTypes,
} from '../../../constants/constants';

export type ListMetal = 'gold' | 'silver' | 'platinum' | 'palladium';

/** One letter per metal in a share link. */
const METAL_CODES: Record<ListMetal, string> = { gold: 'g', silver: 's', platinum: 'p', palladium: 'd' };

const METAL_TYPES: Record<ListMetal, MetalType[]> = {
  gold: goldTypes, silver: silverTypes, platinum: platinumTypes, palladium: palladiumTypes,
};

/** Unset spot prices are -1 or missing; anything not above zero means there's no price. */
export function priceOf(prices: SpotPrices, metal: ListMetal): number {
  const price = prices[metal];
  return price !== undefined && price > 0 ? price : -1;
}

/** One weighed piece as it's saved or shared: the row minus its on-screen id. */
export interface MetalListItem {
  metal: ListMetal;
  type: string;
  weight: number;
  unit: MetalUnitId;
  note?: string;
  /** Percent fine, only for a custom percent row. */
  purity?: number;
  /** Carats of stone to take off the weight. */
  stone?: number;
}

/** A counted coin from the coin list, valued from its standard weight and purity. */
export interface CoinListItem {
  coin: string;
  quantity: number;
  note?: string;
}

export type MetalListEntry = MetalListItem | CoinListItem;

export function isCoinEntry(entry: MetalListEntry): entry is CoinListItem {
  return 'coin' in entry;
}

export function isCoinItem(value: unknown): value is CoinListItem {
  const item = value as CoinListItem;
  return (
    typeof item?.coin === 'string' && !!findCoin(item.coin) &&
    Number.isInteger(item.quantity) && item.quantity > 0 &&
    (item.note === undefined || typeof item.note === 'string')
  );
}

export function typesFor(metal: ListMetal): MetalType[] {
  return METAL_TYPES[metal];
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100;
}

function hasValidType(item: MetalListItem): boolean {
  if (item.type === CUSTOM_PURITY) {
    return isPercent(item.purity);
  }
  return item.purity === undefined && typesFor(item.metal).some(type => type.name === item.type);
}

export function isMetalItem(value: unknown): value is MetalListItem {
  const item = value as MetalListItem;
  return (
    !!item && item.metal in METAL_CODES &&
    hasValidType(item) &&
    typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0 &&
    !!findMetalUnit(item.unit) &&
    (item.note === undefined || typeof item.note === 'string') &&
    (item.stone === undefined || (typeof item.stone === 'number' && Number.isFinite(item.stone) && item.stone > 0))
  );
}

export function isMetalItems(value: unknown): value is MetalListEntry[] {
  return Array.isArray(value) && value.every(item => isMetalItem(item) || isCoinItem(item));
}

/**
 * Notes are free text, so the link carries the rows as compact JSON in URL-safe base64
 * instead of a delimiter format that a note could break. Each row is
 * `[g|s|p|d, type, weight, unit code, note?, stone carats?]` to keep links short (a stone with no
 * note leaves the note blank); a custom percent row puts its
 * percent (a number) where the type name would be. A coin is `[c, coin id, quantity, note?]`.
 */
export function encodeMetalList(items: MetalListEntry[]): string {
  const rows = items.map(item => {
    if (isCoinEntry(item)) {
      return item.note ? ['c', item.coin, item.quantity, item.note] : ['c', item.coin, item.quantity];
    }
    const type = item.type === CUSTOM_PURITY ? item.purity! : item.type;
    const row: (string | number)[] = [METAL_CODES[item.metal], type, item.weight, findMetalUnit(item.unit)!.code];
    if (item.note || item.stone) {
      row.push(item.note ?? '');
    }
    if (item.stone) {
      row.push(item.stone);
    }
    return row;
  });

  const bytes = new TextEncoder().encode(JSON.stringify(rows));
  let binary = '';
  bytes.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reads a shared list, keeping valid rows and counting the ones it had to skip. */
export function decodeMetalList(text: string): { items: MetalListEntry[]; skipped: number } {
  let rows: unknown;
  try {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    rows = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { items: [], skipped: 1 };
  }
  if (!Array.isArray(rows)) {
    return { items: [], skipped: 1 };
  }

  const items: MetalListEntry[] = [];
  let skipped = 0;
  for (const row of rows) {
    const [metal, type, weight, unit, note, stone] = Array.isArray(row) ? row : [];
    if (metal === 'c') {
      const [, coin, quantity, coinNote] = row as unknown[];
      const item: CoinListItem = {
        coin: coin as string,
        quantity: quantity as number,
        ...(typeof coinNote === 'string' && coinNote.trim() ? { note: coinNote.trim() } : {}),
      };
      if (isCoinItem(item)) {
        items.push(item);
      } else {
        skipped++;
      }
      continue;
    }
    const listMetal = (Object.keys(METAL_CODES) as ListMetal[]).find(key => METAL_CODES[key] === metal);
    const item: MetalListItem = {
      metal: listMetal!,
      type: typeof type === 'number' ? CUSTOM_PURITY : type,
      ...(typeof type === 'number' ? { purity: type } : {}),
      weight,
      unit: METAL_UNITS.find(known => known.code === unit)?.id as MetalUnitId,
      ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
      ...(stone !== undefined ? { stone } : {}),
    };
    if (listMetal && isMetalItem(item)) {
      items.push(item);
    } else {
      skipped++;
    }
  }
  return { items, skipped };
}

/**
 * Spot prices ride along in a share link as `gold_silver_time`, time in epoch milliseconds, then
 * `_platinum_palladium` when either is known, 0 standing in for the one that isn't.
 */
export function encodeSpotPrices(prices: SpotPrices): string | null {
  const time = new Date(prices.timestamp).getTime();
  if (!(prices.gold > 0 && prices.silver > 0 && Number.isFinite(time))) {
    return null;
  }
  const base = `${prices.gold}_${prices.silver}_${time}`;
  const platinum = Math.max(0, priceOf(prices, 'platinum'));
  const palladium = Math.max(0, priceOf(prices, 'palladium'));
  return platinum > 0 || palladium > 0 ? `${base}_${platinum}_${palladium}` : base;
}

export function decodeSpotPrices(text: string | null | undefined): SpotPrices | null {
  const parts = (text ?? '').split('_');
  if ((parts.length !== 3 && parts.length !== 5) || parts.some(part => part.trim() === '')) {
    return null;
  }
  const [gold, silver, time, platinum, palladium] = parts.map(Number);
  if (!(gold > 0 && silver > 0 && Number.isFinite(gold) && Number.isFinite(silver) && Number.isFinite(time))) {
    return null;
  }
  const prices: SpotPrices = { gold, silver, timestamp: new Date(time) };
  if (platinum > 0) prices.platinum = platinum;
  if (palladium > 0) prices.palladium = palladium;
  return prices;
}
