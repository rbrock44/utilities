import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type SgMode = 'in-water' | 'displaced' | 'direct';

export interface SgMaterial {
  name: string;
  nominal: number;
  min: number;
  max: number;
  precious: boolean;
  note?: string;
}

// Ranges cover common alloy variation (yellow vs. white golds, Pt950 with Ru vs. Co).
export const SG_MATERIALS: SgMaterial[] = [
  { name: 'Platinum (pure / Pt900 Ir)', nominal: 21.45, min: 21.2, max: 21.6, precious: true },
  { name: 'Platinum 950', nominal: 20.1, min: 19.9, max: 20.9, precious: true },
  { name: 'Gold 24k (.999)', nominal: 19.32, min: 19.2, max: 19.4, precious: true },
  { name: 'Tungsten', nominal: 19.25, min: 19.1, max: 19.35, precious: false, note: 'Same SG as fine gold — common counterfeit core' },
  { name: 'Gold 22k (.917)', nominal: 17.8, min: 17.5, max: 18.0, precious: true },
  { name: 'Gold 18k (.750)', nominal: 15.6, min: 14.7, max: 16.1, precious: true },
  { name: 'Gold 14k (.585)', nominal: 13.1, min: 12.9, max: 14.6, precious: true },
  { name: 'Palladium', nominal: 12.0, min: 11.8, max: 12.1, precious: true },
  { name: 'Gold 10k (.417)', nominal: 11.6, min: 11.0, max: 12.6, precious: true },
  { name: 'Lead', nominal: 11.34, min: 11.2, max: 11.4, precious: false, note: 'Overlaps 10k gold' },
  { name: 'Fine silver (.999)', nominal: 10.49, min: 10.4, max: 10.55, precious: true },
  { name: 'Sterling silver (.925)', nominal: 10.36, min: 10.25, max: 10.4, precious: true },
  { name: 'Coin silver (.900)', nominal: 10.31, min: 10.2, max: 10.35, precious: true },
  { name: 'Copper', nominal: 8.96, min: 8.85, max: 8.96, precious: false },
  { name: 'Brass', nominal: 8.5, min: 8.4, max: 8.75, precious: false },
  { name: 'Steel', nominal: 7.85, min: 7.75, max: 7.9, precious: false },
  { name: 'Tin / pewter', nominal: 7.3, min: 7.2, max: 7.4, precious: false },
  { name: 'Zinc', nominal: 7.13, min: 7.0, max: 7.2, precious: false },
  { name: 'Aluminum', nominal: 2.7, min: 2.6, max: 2.8, precious: false }
];

// Home scales read to 0.01 g, which moves SG by roughly this much on a typical ring or coin.
export const SG_TOLERANCE = 0.05;

@Component({
  selector: 'app-specific-gravity-calculator',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './specific-gravity-calculator.html',
  styleUrl: './specific-gravity-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecificGravityCalculatorComponent {
  readonly materials = SG_MATERIALS;
  readonly modes: { value: SgMode; label: string }[] = [
    { value: 'in-water', label: 'Weight in water' },
    { value: 'displaced', label: 'Water displaced' },
    { value: 'direct', label: 'Enter SG' }
  ];

  mode: SgMode = 'in-water';
  dryWeight: number | null = null;
  secondWeight: number | null = null;
  sgInput: number | null = null;

  get hasInputs(): boolean {
    return this.mode === 'direct'
      ? this.sgInput != null
      : this.dryWeight != null && this.secondWeight != null;
  }

  get errorMessage(): string | null {
    if (!this.hasInputs) {
      return null;
    }
    if (this.mode === 'direct') {
      return this.sgInput! > 0 ? null : 'Specific gravity must be greater than 0.';
    }
    const dry = this.dryWeight!;
    const second = this.secondWeight!;
    if (dry <= 0) {
      return 'Dry weight must be greater than 0.';
    }
    if (this.mode === 'in-water') {
      if (second < 0) {
        return 'Weight in water cannot be negative.';
      }
      if (second >= dry) {
        return 'Weight in water must be less than the dry weight.';
      }
      return null;
    }
    return second > 0 ? null : 'Water displaced must be greater than 0.';
  }

  get sg(): number | null {
    if (!this.hasInputs || this.errorMessage) {
      return null;
    }
    if (this.mode === 'direct') {
      return this.sgInput!;
    }
    const dry = this.dryWeight!;
    const displaced = this.mode === 'in-water' ? dry - this.secondWeight! : this.secondWeight!;
    return dry / displaced;
  }

  get matches(): SgMaterial[] {
    const sg = this.sg;
    if (sg == null) {
      return [];
    }
    return this.materials
      .filter(m => sg >= m.min - SG_TOLERANCE && sg <= m.max + SG_TOLERANCE)
      .sort((a, b) => Math.abs(a.nominal - sg) - Math.abs(b.nominal - sg));
  }

  get closest(): SgMaterial | null {
    const sg = this.sg;
    if (sg == null) {
      return null;
    }
    return this.materials.reduce((best, m) =>
      Math.abs(m.nominal - sg) < Math.abs(best.nominal - sg) ? m : best
    );
  }

  get hasNonPreciousMatch(): boolean {
    return this.matches.some(m => !m.precious);
  }

  get secondLabel(): string {
    return this.mode === 'in-water' ? 'Weight in water' : 'Water displaced';
  }

  isMatch(material: SgMaterial): boolean {
    return this.matches.includes(material);
  }

  setMode(mode: SgMode): void {
    this.mode = mode;
  }

  clear(): void {
    this.dryWeight = null;
    this.secondWeight = null;
    this.sgInput = null;
  }
}
