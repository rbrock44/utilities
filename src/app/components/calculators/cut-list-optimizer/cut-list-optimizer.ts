import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LengthUnit = 'in' | 'ft';

interface PartRow {
  id: number;
  quantity: number;
  length: number;
  label: string;
}

interface PlacedPiece {
  length: number;
  label: string;
}

interface BoardPlan {
  pieces: PlacedPiece[];
  used: number;
  offcut: number;
}

/** Boards cut the same way, collapsed into one row of the plan. */
interface BoardGroup {
  pieces: PlacedPiece[];
  used: number;
  offcut: number;
  count: number;
}

interface CutPlan {
  groups: BoardGroup[];
  boardCount: number;
  pieceCount: number;
  partLength: number;
  stockUsed: number;
  kerfLoss: number;
  offcutLoss: number;
  trimLoss: number;
  wastePercent: number;
  longestOffcut: number;
  tooLong: string[];
}

const EMPTY_PLAN: CutPlan = {
  groups: [],
  boardCount: 0,
  pieceCount: 0,
  partLength: 0,
  stockUsed: 0,
  kerfLoss: 0,
  offcutLoss: 0,
  trimLoss: 0,
  wastePercent: 0,
  longestOffcut: 0,
  tooLong: [],
};

const MAX_PIECES = 2000;

@Component({
  selector: 'app-cut-list-optimizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cut-list-optimizer.html',
  styleUrl: './cut-list-optimizer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CutListOptimizerComponent {
  unit: LengthUnit = 'in';
  stockLength = 96;
  kerf = 0.125;
  trimPerEnd = 0;
  boardsOnHand = 0;

  rows: PartRow[] = [
    { id: 1, quantity: 4, length: 30, label: 'Leg' },
    { id: 2, quantity: 2, length: 42, label: 'Rail' },
  ];

  plan: CutPlan = EMPTY_PLAN;
  errorMessage: string | null = null;

  private nextId = 3;

  constructor(private cdr: ChangeDetectorRef) {
    this.recalculate();
  }

  addRow(): void {
    this.rows = [...this.rows, { id: this.nextId++, quantity: 1, length: 0, label: '' }];
    this.recalculate();
  }

  removeRow(id: number): void {
    this.rows = this.rows.filter((row) => row.id !== id);
    this.recalculate();
  }

  onChange(): void {
    this.recalculate();
  }

  get unitLabel(): string {
    return this.unit === 'ft' ? 'ft' : 'in';
  }

  /** Inches per unit, so the kerf (always inches) can mix with feet-based lengths. */
  private get scale(): number {
    return this.unit === 'ft' ? 12 : 1;
  }

  get usableLength(): number {
    const stock = this.toInches(this.stockLength);
    const trim = Math.max(0, Number(this.trimPerEnd) || 0);
    return stock - trim * 2;
  }

  get shortBy(): number {
    const onHand = Math.max(0, Math.floor(Number(this.boardsOnHand) || 0));
    return onHand > 0 ? Math.max(0, this.plan.boardCount - onHand) : 0;
  }

  formatLength(inches: number): string {
    const value = this.unit === 'ft' ? inches / 12 : inches;
    return `${Number(value.toFixed(3))} ${this.unitLabel}`;
  }

  /** Width of a piece as a percentage of the cuttable length, for the layout bar. */
  barWidth(length: number): number {
    const usable = this.usableLength;
    return usable > 0 ? (length / usable) * 100 : 0;
  }

  recalculate(): void {
    this.errorMessage = null;

    const usable = this.usableLength;
    const kerf = Math.max(0, Number(this.kerf) || 0);
    const trim = Math.max(0, Number(this.trimPerEnd) || 0);

    if (!Number.isFinite(usable) || usable <= 0) {
      this.errorMessage = 'Stock length has to be longer than the end trim.';
      this.plan = EMPTY_PLAN;
      this.cdr.markForCheck();
      return;
    }

    const pieces: PlacedPiece[] = [];
    const tooLong: string[] = [];

    for (const row of this.rows) {
      const length = this.toInches(row.length);
      const quantity = Math.floor(Number(row.quantity) || 0);
      if (!Number.isFinite(length) || length <= 0 || quantity <= 0) {
        continue;
      }

      const label = row.label.trim() || `${this.formatLength(length)} part`;
      if (length > usable) {
        tooLong.push(`${label} (${this.formatLength(length)})`);
        continue;
      }
      for (let i = 0; i < quantity && pieces.length < MAX_PIECES; i++) {
        pieces.push({ length, label });
      }
    }

    if (pieces.length >= MAX_PIECES) {
      this.errorMessage = `Only the first ${MAX_PIECES} pieces are laid out.`;
    }

    this.plan = this.pack(pieces, usable, kerf, trim, tooLong);
    this.cdr.markForCheck();
  }

  /**
   * First-fit decreasing: longest pieces first, each dropped on the first board with room.
   * Optimal packing is NP-hard, but on real cut lists this lands within a board of the
   * best possible answer and runs instantly.
   */
  private pack(
    pieces: PlacedPiece[],
    usable: number,
    kerf: number,
    trim: number,
    tooLong: string[]
  ): CutPlan {
    if (pieces.length === 0) {
      return { ...EMPTY_PLAN, tooLong };
    }

    const sorted = [...pieces].sort((a, b) => b.length - a.length);
    const boards: BoardPlan[] = [];

    for (const piece of sorted) {
      // Every cut after the first on a board loses a saw kerf.
      const board = boards.find(
        (candidate) => candidate.used + kerf + piece.length <= usable
      );
      if (board) {
        board.used += kerf + piece.length;
        board.pieces.push(piece);
      } else {
        boards.push({ pieces: [piece], used: piece.length, offcut: 0 });
      }
    }

    for (const board of boards) {
      board.offcut = usable - board.used;
    }

    const partLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
    const kerfLoss = boards.reduce((sum, board) => sum + (board.pieces.length - 1) * kerf, 0);
    const offcutLoss = boards.reduce((sum, board) => sum + board.offcut, 0);
    const trimLoss = boards.length * trim * 2;
    const stockUsed = boards.length * (usable + trim * 2);

    return {
      groups: this.group(boards),
      boardCount: boards.length,
      pieceCount: pieces.length,
      partLength,
      stockUsed,
      kerfLoss,
      offcutLoss,
      trimLoss,
      wastePercent: stockUsed > 0 ? ((stockUsed - partLength) / stockUsed) * 100 : 0,
      longestOffcut: boards.reduce((longest, board) => Math.max(longest, board.offcut), 0),
      tooLong,
    };
  }

  private group(boards: BoardPlan[]): BoardGroup[] {
    const groups = new Map<string, BoardGroup>();

    for (const board of boards) {
      const key = board.pieces.map((piece) => `${piece.label}:${piece.length}`).join('|');
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        groups.set(key, {
          pieces: board.pieces,
          used: board.used,
          offcut: board.offcut,
          count: 1,
        });
      }
    }

    return [...groups.values()];
  }

  private toInches(value: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number * this.scale : 0;
  }
}
