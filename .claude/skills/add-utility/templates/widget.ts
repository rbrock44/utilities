// Template for src/app/components/<group>/<folder>/<folder>.ts
// Replace: app-widget-name -> app-<folder>, WidgetNameComponent -> <Class>Component,
// ./widget-name -> ./<folder>. Delete anything below you don't need.
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-widget-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './widget-name.html',
  styleUrl: './widget-name.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetNameComponent {
  input = '';
  result: string | null = null;
  errorMessage: string | null = null;
  justCopied = false;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  compute(): void {
    this.errorMessage = null;
    this.result = null;

    const value = this.input.trim();
    if (value === '') {
      this.errorMessage = 'Enter a value to continue.';
      this.cdr.markForCheck();
      return;
    }

    this.result = value;
    this.cdr.markForCheck();
  }

  async copyToClipboard(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);

    this.justCopied = true;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }
}
