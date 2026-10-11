import { CUSTOM_PURITY, goldTypes, silverTypes } from '../../../constants/constants';

export type ListMetal = 'gold' | 'silver';

/** One weighed piece as it's saved or shared: the row minus its on-screen id. */
export interface MetalListItem {
  metal: ListMetal;
  type: string;
  weight: number;
  unit: 'grams' | 'toz';
  note?: string;
  /** Percent fine, only for a custom percent row. */
  purity?: number;
}

function typesFor(metal: ListMetal): MetalType[] {
  return metal === 'gold' ? goldTypes : silverTypes;
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
    (item?.metal === 'gold' || item?.metal === 'silver') &&
    hasValidType(item) &&
    typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0 &&
    (item.unit === 'grams' || item.unit === 'toz') &&
    (item.note === undefined || typeof item.note === 'string')
  );
}

export function isMetalItems(value: unknown): value is MetalListItem[] {
  return Array.isArray(value) && value.every(isMetalItem);
}

/**
 * Notes are free text, so the link carries the rows as compact JSON in URL-safe base64
 * instead of a delimiter format that a note could break. Each row is
 * `[g|s, type, weight, g|t, note?]` to keep links short; a custom percent row puts its
 * percent (a number) where the type name would be.
 */
export function encodeMetalList(items: MetalListItem[]): string {
  const rows = items.map(item => {
    const type = item.type === CUSTOM_PURITY ? item.purity! : item.type;
    const row: (string | number)[] = [item.metal === 'gold' ? 'g' : 's', type, item.weight, item.unit === 'toz' ? 't' : 'g'];
    if (item.note) {
      row.push(item.note);
    }
    return row;
  });

  const bytes = new TextEncoder().encode(JSON.stringify(rows));
  let binary = '';
  bytes.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reads a shared list, keeping valid rows and counting the ones it had to skip. */
export function decodeMetalList(text: string): { items: MetalListItem[]; skipped: number } {
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

  const items: MetalListItem[] = [];
  let skipped = 0;
  for (const row of rows) {
    const [metal, type, weight, unit, note] = Array.isArray(row) ? row : [];
    const item: MetalListItem = {
      metal: metal === 'g' ? 'gold' : 'silver',
      type: typeof type === 'number' ? CUSTOM_PURITY : type,
      ...(typeof type === 'number' ? { purity: type } : {}),
      weight,
      unit: unit === 't' ? 'toz' : 'grams',
      ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
    };
    if ((metal === 'g' || metal === 's') && (unit === 'g' || unit === 't') && isMetalItem(item)) {
      items.push(item);
    } else {
      skipped++;
    }
  }
  return { items, skipped };
}

/** Spot prices ride along in a share link as `gold_silver_time`, time in epoch milliseconds. */
export function encodeSpotPrices(prices: SpotPrices): string | null {
  const time = new Date(prices.timestamp).getTime();
  if (!(prices.gold > 0 && prices.silver > 0 && Number.isFinite(time))) {
    return null;
  }
  return `${prices.gold}_${prices.silver}_${time}`;
}

export function decodeSpotPrices(text: string | null | undefined): SpotPrices | null {
  const parts = (text ?? '').split('_');
  if (parts.length !== 3 || parts.some(part => part.trim() === '')) {
    return null;
  }
  const [gold, silver, time] = parts.map(Number);
  if (!(gold > 0 && silver > 0 && Number.isFinite(gold) && Number.isFinite(silver) && Number.isFinite(time))) {
    return null;
  }
  return { gold, silver, timestamp: new Date(time) };
}
