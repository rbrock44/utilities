import { findCoin } from '../../../constants/coin-options';
import { SavedListStore } from '../../../services/saved-lists';
import { CoinListItem, MetalListEntry } from './metal-list';

/** Where the retired Coin Stack Value page kept its saved stacks. */
export const COIN_STACK_KEY = 'utilities-coin-stacks';

/**
 * Moves stacks saved on the retired Coin Stack Value page into saved metal lists, once.
 * A stack whose name is already taken gets " (coins)" added rather than replacing a list.
 * The old entry is removed only after the move, so blocked storage just leaves it in place.
 */
export function migrateCoinStacks(store: SavedListStore<MetalListEntry[]>): void {
  let stacks: unknown;
  try {
    const raw = globalThis.localStorage?.getItem(COIN_STACK_KEY);
    if (!raw) return;
    stacks = JSON.parse(raw);
  } catch {
    return;
  }

  // Oldest first, so the newest stack ends up at the top like it was before.
  for (const stack of (Array.isArray(stacks) ? stacks : []).reverse()) {
    if (typeof stack?.name !== 'string' || !Array.isArray(stack.items)) continue;
    const items: CoinListItem[] = stack.items.flatMap((item: { id?: unknown; quantity?: unknown; note?: unknown }) =>
      typeof item?.id === 'string' && findCoin(item.id) && Number.isInteger(item.quantity) && (item.quantity as number) > 0
        ? [{
            coin: item.id,
            quantity: item.quantity as number,
            ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {}),
          }]
        : []
    );
    if (items.length === 0) continue;

    const taken = store.lists().some(list => list.name.toLowerCase() === stack.name.toLowerCase());
    store.save(taken ? `${stack.name} (coins)` : stack.name, items);
  }

  try {
    globalThis.localStorage?.removeItem(COIN_STACK_KEY);
  } catch {
    // ignore: the stacks will just be offered again next time
  }
}
