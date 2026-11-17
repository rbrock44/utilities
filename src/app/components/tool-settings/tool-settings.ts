import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import { isValidNumber, NumberListSetting, NumberSetting, SettingDefinition, ToolSettingsService } from '../../services/tool-settings';

/**
 * One tool's settings form, shown in the settings drawer on its tool page or listed with
 * every other tool's on the home page. Every change is saved as it's made.
 */
@Component({
  selector: 'app-tool-settings',
  standalone: true,
  templateUrl: './tool-settings.html',
  styleUrl: './tool-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolSettingsComponent {
  // Signals behind the inputs, so a search narrowing the list re-reads values and badges.
  private readonly paramSignal = signal('');
  private readonly definitionsSignal = signal<SettingDefinition[]>([]);

  @Input({ required: true }) set param(value: string) { this.paramSignal.set(value); }
  get param(): string { return this.paramSignal(); }

  /** May be a subset of the tool's settings, e.g. the ones a search matched. */
  @Input({ required: true }) set definitions(value: SettingDefinition[]) { this.definitionsSignal.set(value); }
  get definitions(): SettingDefinition[] { return this.definitionsSignal(); }

  @Input() heading = '';

  private readonly service = inject(ToolSettingsService);
  readonly values = computed(() => this.service.current(this.paramSignal(), this.definitionsSignal()));
  private readonly changed = computed(() => this.service.changedKeys(this.paramSignal(), this.definitionsSignal()));
  readonly customized = computed(() => this.changed().length > 0);

  get headingId(): string {
    return `settings-${this.param}`;
  }

  isChanged(key: string): boolean {
    return this.changed().includes(key);
  }

  selectValue(key: string): string {
    return this.values()[key] as string;
  }

  singleValue(key: string): number {
    return this.values()[key] as number;
  }

  /** Same rules as a number in a list: saved on change, put back if invalid. */
  commitSingle(definition: NumberSetting, input: HTMLInputElement): void {
    const value = input.value.trim() === '' ? NaN : Number(input.value);
    if (!isValidNumber(definition, value)) {
      input.value = String(this.singleValue(definition.key));
      return;
    }
    this.service.set(this.param, definition.key, value);
  }

  numberValue(key: string, index: number): number {
    return (this.values()[key] as number[])[index];
  }

  pick(key: string, value: string): void {
    this.service.set(this.param, key, value);
  }

  /**
   * Saved on change rather than per keystroke, so typing "92.5" isn't cut short at "92.".
   * A blank or out-of-range number isn't saved; the box goes back to the number in use.
   */
  commitNumber(definition: NumberListSetting, index: number, input: HTMLInputElement): void {
    const value = input.value.trim() === '' ? NaN : Number(input.value);
    if (!isValidNumber(definition, value)) {
      input.value = String(this.numberValue(definition.key, index));
      return;
    }
    const next = [...(this.values()[definition.key] as number[])];
    next[index] = value;
    this.service.set(this.param, definition.key, next);
  }

  /** Only the settings shown, so a narrowed list can't reset ones that are hidden. */
  reset(): void {
    this.service.reset(this.param, this.definitions.map(definition => definition.key));
  }
}
