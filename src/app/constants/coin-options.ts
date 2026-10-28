import { GOLD_COIN_DATABASE, SILVER_COIN_DATABASE } from './coins';
import { TROY_OZ_IN_GRAMS } from './constants';

export type CoinMetal = 'gold' | 'silver';

export interface CoinOption {
  id: string;
  label: string;
  metal: CoinMetal;
  spec: CoinSpec;
  /** Years struck, read from the description; an open end (`Pre-1965`, `2016+`) is left out. */
  years?: { from?: number; to?: number };
}

/**
 * Ids are slugs of metal, name, and date range (`silver-morgan-dollar-1878-1921`), not list
 * positions, so shared links and saved lists keep working when coins are added to the list.
 * Names repeat across years (two Kennedy halves), which is why the description is included.
 */
export const COIN_OPTIONS: CoinOption[] = buildOptions();

function buildOptions(): CoinOption[] {
  const taken = new Set<string>();
  const toOption = (spec: CoinSpec, metal: CoinMetal): CoinOption => {
    const base = `${metal}-${slugify(`${spec.name} ${spec.description ?? ''}`)}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) {
      id = `${base}-${n}`;
    }
    taken.add(id);
    const label = spec.description ? `${spec.name} · ${spec.description}` : spec.name;
    const years = yearsFrom(spec.description);
    return { id, label, metal, spec, ...(years ? { years } : {}) };
  };

  return [
    ...GOLD_COIN_DATABASE.map(spec => toOption(spec, 'gold')),
    ...SILVER_COIN_DATABASE.map(spec => toOption(spec, 'silver')),
  ];
}

function yearsFrom(description: string | undefined): CoinOption['years'] {
  const text = description ?? '';
  const before = text.match(/^Pre-(\d{4})$/i);
  if (before) {
    return { to: Number(before[1]) - 1 };
  }
  const since = text.match(/\((\d{4})\+\)/);
  if (since) {
    return { from: Number(since[1]) };
  }
  // Only a leading date, so `1000 toz` isn't read as the year 1000.
  const range = text.match(/^(\d{4})(?:-(\d{4}))?(?:$| \()/);
  if (range) {
    return { from: Number(range[1]), to: Number(range[2] ?? range[1]) };
  }
  return undefined;
}

/** True when a dated coin was struck in `year`; undated coins never match a year. */
export function coinStruckIn(coin: CoinOption, year: number): boolean {
  if (!coin.years) {
    return false;
  }
  return (coin.years.from ?? -Infinity) <= year && year <= (coin.years.to ?? Infinity);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function findCoin(id: string): CoinOption | undefined {
  return COIN_OPTIONS.find(coin => coin.id === id);
}

export function pureTozPerCoin(spec: CoinSpec): number {
  return (spec.weightGrams * spec.purity) / TROY_OZ_IN_GRAMS;
}

export interface LegacyStackItem {
  id: string;
  quantity: number;
  note?: string;
}

/**
 * Reads a link from the retired Coin Stack Value page: `id~quantity` pairs joined by `_`,
 * with an optional percent-encoded `~note`. Unknown coins and bad quantities are counted
 * as skipped.
 */
export function decodeLegacyStack(text: string): { items: LegacyStackItem[]; skipped: number } {
  const items: LegacyStackItem[] = [];
  let skipped = 0;

  for (const pair of text.split('_').filter(Boolean)) {
    const [id, count, encodedNote] = pair.split('~');
    const quantity = Number(count);
    const note = decodeNote(encodedNote);
    if (findCoin(id) && Number.isInteger(quantity) && quantity > 0) {
      items.push(note ? { id, quantity, note } : { id, quantity });
    } else {
      skipped++;
    }
  }
  return { items, skipped };
}

function decodeNote(text: string | undefined): string {
  try {
    return decodeURIComponent(text ?? '').trim();
  } catch {
    return '';
  }
}
