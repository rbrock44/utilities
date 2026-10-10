import { Component, ChangeDetectionStrategy, afterNextRender, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme';
import { CommandPaletteService } from '../../services/command-palette';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.scss',
})
export class HeaderComponent {
  /** Prerendered pages can't know the visitor's OS, so Mac gets its label once in the browser. */
  readonly shortcut = signal('Ctrl K');

  constructor(
    public themeService: ThemeService,
    public palette: CommandPaletteService
  ) {
    afterNextRender(() => {
      if (/Mac|iPhone|iPad/.test(navigator.userAgent)) {
        this.shortcut.set('⌘ K');
      }
    });
  }
}
