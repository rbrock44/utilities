import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type Format = 'hex' | 'rgb' | 'hsl';

@Component({
  selector: 'app-color-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-converter.html',
  styleUrl: './color-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorConverterComponent {
  readonly formats: { key: Format; label: string; placeholder: string }[] = [
    { key: 'hex', label: 'HEX', placeholder: '#1976D2' },
    { key: 'rgb', label: 'RGB', placeholder: 'rgb(25, 118, 210)' },
    { key: 'hsl', label: 'HSL', placeholder: 'hsl(210, 79%, 46%)' },
  ];

  color: Rgb = { r: 25, g: 118, b: 210 };
  values: Record<Format, string> = { hex: '', rgb: '', hsl: '' };
  errorMessage: string | null = null;
  copiedKey: string | null = null;

  background: Rgb = { r: 255, g: 255, b: 255 };
  backgroundHex = '#FFFFFF';
  backgroundError: string | null = null;

  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    this.refresh();
  }

  get pickerValue(): string {
    return this.toHex(this.color);
  }

  get colorCss(): string {
    return this.toHex(this.color);
  }

  get backgroundCss(): string {
    return this.toHex(this.background);
  }

  onFieldChange(format: Format): void {
    const parsed = this.parse(this.values[format], format);

    if (parsed === null) {
      this.errorMessage = `That is not a valid ${format.toUpperCase()} color.`;
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = null;
    this.color = parsed;
    this.refresh(format);
  }

  onPickerChange(event: Event): void {
    const parsed = this.parse((event.target as HTMLInputElement).value, 'hex');
    if (parsed !== null) {
      this.color = parsed;
      this.errorMessage = null;
      this.refresh();
    }
  }

  onBackgroundChange(): void {
    const parsed = this.parse(this.backgroundHex, 'hex');

    if (parsed === null) {
      this.backgroundError = 'That is not a valid HEX color.';
      this.cdr.markForCheck();
      return;
    }

    this.backgroundError = null;
    this.background = parsed;
    this.cdr.markForCheck();
  }

  onBackgroundPickerChange(event: Event): void {
    this.backgroundHex = (event.target as HTMLInputElement).value.toUpperCase();
    this.onBackgroundChange();
  }

  swap(): void {
    const previousForeground = this.color;
    this.color = this.background;
    this.background = previousForeground;
    this.backgroundHex = this.toHex(this.background);
    this.errorMessage = null;
    this.backgroundError = null;
    this.refresh();
  }

  get contrastRatio(): number {
    const light = this.luminance(this.color);
    const dark = this.luminance(this.background);
    const brighter = Math.max(light, dark);
    const dimmer = Math.min(light, dark);
    return (brighter + 0.05) / (dimmer + 0.05);
  }

  get contrastLabel(): string {
    return `${this.contrastRatio.toFixed(2)}:1`;
  }

  get checks(): { label: string; threshold: number; passes: boolean }[] {
    const ratio = this.contrastRatio;
    return [
      { label: 'AA normal', threshold: 4.5, passes: ratio >= 4.5 },
      { label: 'AA large', threshold: 3, passes: ratio >= 3 },
      { label: 'AAA normal', threshold: 7, passes: ratio >= 7 },
      { label: 'AAA large', threshold: 4.5, passes: ratio >= 4.5 },
    ];
  }

  async copy(key: string, value: string): Promise<void> {
    if (value === '') {
      return;
    }

    await navigator.clipboard.writeText(value);

    this.copiedKey = key;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.copiedKey = null;
      this.cdr.markForCheck();
    }, 2000);
  }

  private refresh(except?: Format): void {
    if (except !== 'hex') {
      this.values.hex = this.toHex(this.color);
    }
    if (except !== 'rgb') {
      this.values.rgb = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    }
    if (except !== 'hsl') {
      const { h, s, l } = this.toHsl(this.color);
      this.values.hsl = `hsl(${h}, ${s}%, ${l}%)`;
    }
    this.cdr.markForCheck();
  }

  private parse(text: string, format: Format): Rgb | null {
    switch (format) {
      case 'hex':
        return this.parseHex(text);
      case 'rgb':
        return this.parseRgb(text);
      default:
        return this.parseHsl(text);
    }
  }

  private parseHex(text: string): Rgb | null {
    let value = text.trim().replace(/^#/, '');

    if (/^[0-9a-f]{3}$/i.test(value)) {
      value = value
        .split('')
        .map((character) => character + character)
        .join('');
    }

    if (!/^[0-9a-f]{6}$/i.test(value)) {
      return null;
    }

    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  private parseRgb(text: string): Rgb | null {
    const parts = this.numericParts(text, /^rgba?\(/i);
    if (parts === null) {
      return null;
    }

    const channels = parts.map((part) =>
      part.endsWith('%') ? (parseFloat(part) / 100) * 255 : Number(part)
    );

    if (channels.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
      return null;
    }

    return {
      r: Math.round(channels[0]),
      g: Math.round(channels[1]),
      b: Math.round(channels[2]),
    };
  }

  private parseHsl(text: string): Rgb | null {
    const parts = this.numericParts(text, /^hsla?\(/i);
    if (parts === null) {
      return null;
    }

    const hue = parseFloat(parts[0]);
    const saturation = parseFloat(parts[1]);
    const lightness = parseFloat(parts[2]);

    if ([hue, saturation, lightness].some((value) => !Number.isFinite(value))) {
      return null;
    }
    if (saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) {
      return null;
    }

    return this.hslToRgb(((hue % 360) + 360) % 360, saturation, lightness);
  }

  private numericParts(text: string, prefix: RegExp): string[] | null {
    const parts = text
      .trim()
      .replace(prefix, '')
      .replace(/\)$/, '')
      .split(/[\s,/]+/)
      .filter((part) => part !== '');

    return parts.length >= 3 ? parts.slice(0, 3) : null;
  }

  private toHex(color: Rgb): string {
    const pair = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
    return `#${pair(color.r)}${pair(color.g)}${pair(color.b)}`;
  }

  private toHsl(color: Rgb): { h: number; s: number; l: number } {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (delta !== 0) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1));

      if (max === r) {
        hue = ((g - b) / delta) % 6;
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }

      hue *= 60;
      if (hue < 0) {
        hue += 360;
      }
    }

    return {
      h: Math.round(hue),
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100),
    };
  }

  private hslToRgb(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
    const saturation = saturationPercent / 100;
    const lightness = lightnessPercent / 100;

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = lightness - chroma / 2;

    let [r, g, b] = [0, 0, 0];

    if (hue < 60) {
      [r, g, b] = [chroma, second, 0];
    } else if (hue < 120) {
      [r, g, b] = [second, chroma, 0];
    } else if (hue < 180) {
      [r, g, b] = [0, chroma, second];
    } else if (hue < 240) {
      [r, g, b] = [0, second, chroma];
    } else if (hue < 300) {
      [r, g, b] = [second, 0, chroma];
    } else {
      [r, g, b] = [chroma, 0, second];
    }

    return {
      r: Math.round((r + offset) * 255),
      g: Math.round((g + offset) * 255),
      b: Math.round((b + offset) * 255),
    };
  }

  private luminance(color: Rgb): number {
    const channel = (value: number) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  }
}
