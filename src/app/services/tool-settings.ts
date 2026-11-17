import { computed, Injectable, Signal, signal } from '@angular/core';

export interface SelectSetting {
  kind: 'select';
  key: string;
  label: string;
  hint?: string;
  default: string;
  options: { value: string; label: string }[];
}

export interface NumberSetting {
  kind: 'number';
  key: string;
  label: string;
  hint?: string;
  default: number;
  min: number;
  max: number;
  /** Whole numbers only, e.g. a count of coats. */
  integer?: boolean;
  suffix?: string;
}

/** A fixed-length row of numbers, e.g. the three percent columns of a table. */
export interface NumberListSetting {
  kind: 'numbers';
  key: string;
  label: string;
  hint?: string;
  default: number[];
  /** One label per number, read out by screen readers. */
  labels: string[];
  min: number;
  max: number;
  integer?: boolean;
  suffix?: string;
}

export type SettingDefinition = SelectSetting | NumberSetting | NumberListSetting;
export type SettingValue = string | number | number[];
export type SettingValues = Record<string, SettingValue>;

const STORAGE_KEY = 'utilities-settings';

type Stored = Record<string, Record<string, unknown>>;

export function isValidNumber(definition: NumberSetting | NumberListSetting, value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= definition.min && value <= definition.max
    && (!definition.integer || Number.isInteger(value));
}

/** Each number is checked on its own, so one bad entry doesn't throw away the rest. */
function validValue(definition: SettingDefinition, stored: unknown): SettingValue {
  if (definition.kind === 'select') {
    return definition.options.some(option => option.value === stored) ? stored as string : definition.default;
  }
  if (definition.kind === 'number') {
    return isValidNumber(definition, stored) ? stored : definition.default;
  }
  const list = Array.isArray(stored) ? stored : [];
  return definition.default.map((fallback, i) => isValidNumber(definition, list[i]) ? list[i] : fallback);
}

export function isDefaultValue(definition: SettingDefinition, value: SettingValue): boolean {
  return Array.isArray(definition.default)
    ? Array.isArray(value) && definition.default.every((fallback, i) => value[i] === fallback)
    : value === definition.default;
}

/**
 * Keys whose value differs between two resolutions, or every key the first time. A widget
 * applies only these, so changing one setting doesn't undo what's been typed in another field.
 */
export function changedSettings(previous: SettingValues | undefined, next: SettingValues): Set<string> {
  return new Set(Object.keys(next).filter(key =>
    !previous || JSON.stringify(previous[key]) !== JSON.stringify(next[key])));
}

/** Stored values for one tool, with anything missing, stale, or out of range swapped for its default. */
export function resolveSettings(definitions: SettingDefinition[], stored: unknown): SettingValues {
  const raw = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {};
  return Object.fromEntries(definitions.map(definition => [definition.key, validValue(definition, raw[definition.key])]));
}

/**
 * Per-tool preferences (default units, table columns, ...) kept in localStorage under one
 * key, so a tool opens the way its user last set it up.
 */
@Injectable({
  providedIn: 'root'
})
export class ToolSettingsService {
  private readonly stored = signal<Stored>(this.read());

  values(param: string, definitions: SettingDefinition[]): Signal<SettingValues> {
    return computed(() => resolveSettings(definitions, this.stored()[param]));
  }

  /** Read inside a computed to follow saved changes, like `values` without its own signal. */
  current(param: string, definitions: SettingDefinition[]): SettingValues {
    return resolveSettings(definitions, this.stored()[param]);
  }

  /** Keys whose value differs from the default; saving a default back counts as unchanged. */
  changedKeys(param: string, definitions: SettingDefinition[]): string[] {
    const values = resolveSettings(definitions, this.stored()[param]);
    return definitions.filter(definition => !isDefaultValue(definition, values[definition.key])).map(definition => definition.key);
  }

  set(param: string, key: string, value: SettingValue): void {
    const current = this.stored();
    this.save({ ...current, [param]: { ...current[param], [key]: value } });
  }

  /** Resets the given keys, or the whole tool without any. */
  reset(param: string, keys?: string[]): void {
    const { [param]: tool, ...rest } = this.stored();
    if (!keys) {
      this.save(rest);
      return;
    }
    const kept = Object.fromEntries(Object.entries(tool ?? {}).filter(([key]) => !keys.includes(key)));
    this.save(Object.keys(kept).length > 0 ? { ...rest, [param]: kept } : rest);
  }

  private save(next: Stored): void {
    this.stored.set(next);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore: the settings still apply until the page is closed
    }
  }

  // localStorage is missing while prerendering and in the test runner, and blocked outright
  // in some privacy modes.
  private read(): Stored {
    try {
      const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Stored : {};
    } catch {
      return {};
    }
  }
}
