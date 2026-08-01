import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComboBoxComponent } from '../../combo-box/combo-box';
import { formatConvertedValue, toComboBoxOptions } from '../../../constants/units/unit-helpers';

@Component({
  selector: 'app-unit-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboBoxComponent],
  templateUrl: './unit-converter.html',
  styleUrl: './unit-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitConverterComponent implements OnChanges {
  @Input() title = 'Unit Converter';
  @Input() description = '';
  @Input() footnote = '';
  @Input() units: UnitDefinition[] = [];

  fromId = '';
  toId = '';
  fromValue = '1';
  toValue = '';
  comboOptions: ComboBoxOption[] = [];
  showAllConversions = false;

  ngOnChanges(): void {
    this.comboOptions = toComboBoxOptions(this.units);

    if (this.units.length === 0) {
      this.fromId = '';
      this.toId = '';
      this.toValue = '';
      return;
    }
    if (!this.units.some(unit => unit.id === this.fromId)) {
      this.fromId = this.units[0].id;
    }
    if (!this.units.some(unit => unit.id === this.toId)) {
      this.toId = this.units.length > 1 ? this.units[1].id : this.units[0].id;
    }
    this.recalculateToValue();
  }

  onFromUnitChange(id: string): void {
    this.fromId = id;
    this.recalculateToValue();
  }

  onToUnitChange(id: string): void {
    this.toId = id;
    this.recalculateToValue();
  }

  onFromValueChange(): void {
    this.recalculateToValue();
  }

  onToValueChange(): void {
    const fromUnit = this.findUnit(this.fromId);
    const toUnit = this.findUnit(this.toId);
    const parsed = parseFloat(this.toValue);
    if (!fromUnit || !toUnit || !Number.isFinite(parsed)) {
      this.fromValue = '';
      return;
    }
    this.fromValue = formatConvertedValue(fromUnit.fromBase(toUnit.toBase(parsed)));
  }

  swap(): void {
    [this.fromId, this.toId] = [this.toId, this.fromId];
    this.recalculateToValue();
  }

  get allConversions(): { label: string; value: string }[] {
    const fromUnit = this.findUnit(this.fromId);
    const parsed = parseFloat(this.fromValue);
    if (!fromUnit || !Number.isFinite(parsed)) {
      return [];
    }
    const baseValue = fromUnit.toBase(parsed);
    return this.units
      .filter(unit => unit.id !== this.fromId)
      .map(unit => ({
        label: unit.label,
        value: formatConvertedValue(unit.fromBase(baseValue)),
      }));
  }

  private recalculateToValue(): void {
    const fromUnit = this.findUnit(this.fromId);
    const toUnit = this.findUnit(this.toId);
    const parsed = parseFloat(this.fromValue);
    if (!fromUnit || !toUnit || !Number.isFinite(parsed)) {
      this.toValue = '';
      return;
    }
    this.toValue = formatConvertedValue(toUnit.fromBase(fromUnit.toBase(parsed)));
  }

  private findUnit(id: string): UnitDefinition | undefined {
    return this.units.find(unit => unit.id === id);
  }
}
