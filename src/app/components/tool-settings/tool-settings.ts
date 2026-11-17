import { ChangeDetectionStrategy, Component, computed, inject, Input, OnInit, Signal } from '@angular/core';
import { isValidNumber, NumberListSetting, SettingDefinition, SettingValues, ToolSettingsService } from '../../services/tool-settings';

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
export class ToolSettingsComponent implements OnInit {
  @Input({ required: true }) param = '';
  @Input({ required: true }) definitions: SettingDefinition[] = [];
  @Input() heading = '';

  private readonly service = inject(ToolSettingsService);
  values!: Signal<SettingValues>;
  private readonly changed = computed(() => this.service.changedKeys(this.param, this.definitions));
  readonly customized = computed(() => this.changed().length > 0);

  ngOnInit(): void {
    this.values = this.service.values(this.param, this.definitions);
  }

  get headingId(): string {
    return `settings-${this.param}`;
  }

  isChanged(key: string): boolean {
    return this.changed().includes(key);
  }

  selectValue(key: string): string {
    return this.values()[key] as string;
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

  reset(): void {
    this.service.reset(this.param);
  }
}
