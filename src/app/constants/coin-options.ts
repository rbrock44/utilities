import { GOLD_COIN_DATABASE, SILVER_COIN_DATABASE } from './coins';
import { TROY_OZ_IN_GRAMS } from './constants';

export type CoinMetal = 'gold' | 'silver';

export interface CoinOption {
  id: string;
  label: string;
  metal: CoinMetal;
  spec: CoinSpec;
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
