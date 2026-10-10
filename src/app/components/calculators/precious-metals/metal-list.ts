import { goldTypes, silverTypes } from '../../../constants/constants';

export type ListMetal = 'gold' | 'silver';

/** One weighed piece as it's saved or shared: the row minus its on-screen id. */
export interface MetalListItem {
  metal: ListMetal;
  type: string;
  weight: number;
  unit: 'grams' | 'toz';
  note?: string;
}

function typesFor(metal: ListMetal): MetalType[] {
  return metal === 'gold' ? goldTypes : silverTypes;
}

export function isMetalItem(value: unknown): value is MetalListItem {
  const item = value as MetalListItem;
  return (
    (item?.metal === 'gold' || item?.metal === 'silver') &&
    typesFor(item.metal).some(type => type.name === item.type) &&
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
 * `[g|s, type, weight, g|t, note?]` to keep links short.
 */
export function encodeMetalList(items: MetalListItem[]): string {
  const rows = items.map(item => {
    const row: (string | number)[] = [item.metal === 'gold' ? 'g' : 's', item.type, item.weight, item.unit === 'toz' ? 't' : 'g'];
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
      type,
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
