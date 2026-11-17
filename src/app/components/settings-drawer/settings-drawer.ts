import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, EventEmitter, HostListener, inject, Input, Output, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Slides settings in over the page from the right instead of pushing the page down.
 * Closes on the backdrop, the × button, or Escape, and hands focus back to whatever
 * opened it.
 */
@Component({
  selector: 'app-settings-drawer',
  standalone: true,
  templateUrl: './settings-drawer.html',
  styleUrl: './settings-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDrawerComponent {
  @Input() heading = 'Settings';
  @Output() closed = new EventEmitter<void>();

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    const opener = inject(DOCUMENT).activeElement as HTMLElement | null;
    afterNextRender(() => this.closeButton()?.nativeElement.focus());
    inject(DestroyRef).onDestroy(() => opener?.focus?.());
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }
}
