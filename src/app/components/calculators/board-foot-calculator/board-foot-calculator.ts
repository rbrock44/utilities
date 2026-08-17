import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LengthUnit = 'in' | 'ft';

interface LumberRow {
  id: number;
  quantity: number;
  thickness: number;
  width: number;
  length: number;
  lengthUnit: LengthUnit;
  pricePerBoardFoot: number;
}

interface NominalSize {
  label: string;
  thickness: number;
  width: number;
}

@Component({
  selector: 'app-board-foot-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './board-foot-calculator.html',
  styleUrl: './board-foot-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFootCalculatorComponent {
  readonly nominalSizes: NominalSize[] = [
    { label: '1×4', thickness: 1, width: 4 },
    { label: '1×6', thickness: 1, width: 6 },
    { label: '1×8', thickness: 1, width: 8 },
    { label: '2×4', thickness: 2, width: 4 },
    { label: '2×6', thickness: 2, width: 6 },
    { label: '2×8', thickness: 2, width: 8 },
    { label: '2×10', thickness: 2, width: 10 },
    { label: '4×4', thickness: 4, width: 4 },
  ];

  rows: LumberRow[] = [
    { id: 1, quantity: 1, thickness: 2, width: 4, length: 8, lengthUnit: 'ft', pricePerBoardFoot: 0 },
  ];

  wastePercent = 10;

  private nextId = 2;

  private readonly currency = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  });

  constructor(private cdr: ChangeDetectorRef) {}

  boardFeet(row: LumberRow): number {
    const thickness = Number(row.thickness);
    const width = Number(row.width);
    const length = Number(row.length);
    const quantity = Number(row.quantity);

    if (
      !this.positive(thickness) ||
      !this.positive(width) ||
      !this.positive(length) ||
      !this.positive(quantity)
    ) {
      return 0;
    }

    const lengthInches = row.lengthUnit === 'ft' ? length * 12 : length;
    return (thickness * width * lengthInches * quantity) / 144;
  }

  linearFeet(row: LumberRow): number {
    const length = Number(row.length);
    const quantity = Number(row.quantity);

    if (!this.positive(length) || !this.positive(quantity)) {
      return 0;
    }

    const lengthFeet = row.lengthUnit === 'ft' ? length : length / 12;
    return lengthFeet * quantity;
  }

  rowCost(row: LumberRow): number {
    const price = Number(row.pricePerBoardFoot);
    return this.positive(price) ? this.boardFeet(row) * price : 0;
  }

  get totalBoardFeet(): number {
    return this.rows.reduce((total, row) => total + this.boardFeet(row), 0);
  }

  get totalLinearFeet(): number {
    return this.rows.reduce((total, row) => total + this.linearFeet(row), 0);
  }

  get totalCost(): number {
    return this.rows.reduce((total, row) => total + this.rowCost(row), 0);
  }

  get wasteMultiplier(): number {
    const waste = Number(this.wastePercent);
    return Number.isFinite(waste) && waste > 0 ? 1 + waste / 100 : 1;
  }

  get boardFeetWithWaste(): number {
    return this.totalBoardFeet * this.wasteMultiplier;
  }

  get costWithWaste(): number {
    return this.totalCost * this.wasteMultiplier;
  }

  get hasWaste(): boolean {
    return this.wasteMultiplier > 1;
  }

  get hasCost(): boolean {
    return this.totalCost > 0;
  }

  get pieceCount(): number {
    return this.rows.reduce((total, row) => {
      const quantity = Number(row.quantity);
      return total + (this.positive(quantity) ? Math.floor(quantity) : 0);
    }, 0);
  }

  addRow(size?: NominalSize): void {
    const previous = this.rows[this.rows.length - 1];

    this.rows = [
      ...this.rows,
      {
        id: this.nextId++,
        quantity: 1,
        thickness: size ? size.thickness : (previous?.thickness ?? 2),
        width: size ? size.width : (previous?.width ?? 4),
        length: previous?.length ?? 8,
        lengthUnit: previous?.lengthUnit ?? 'ft',
        pricePerBoardFoot: previous?.pricePerBoardFoot ?? 0,
      },
    ];
    this.cdr.markForCheck();
  }

  removeRow(id: number): void {
    this.rows = this.rows.filter((row) => row.id !== id);
    if (this.rows.length === 0) {
      this.addRow();
    }
    this.cdr.markForCheck();
  }

  onChange(): void {
    this.cdr.markForCheck();
  }

  money(value: number): string {
    return this.currency.format(value);
  }

  feet(value: number): string {
    return value.toFixed(2);
  }

  private positive(value: number): boolean {
    return Number.isFinite(value) && value > 0;
  }
}
