import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings';

const WIDGET_LAYOUT: Record<string, { maxWidth: string; padding: string }> = {
  pm: { maxWidth: '1000px', padding: '1rem' },
  sic: { maxWidth: '1400px', padding: '1rem' },
  gic: { maxWidth: '1400px', padding: '1rem' },
  rac: { maxWidth: '900px', padding: '1rem' },
  cpc: { maxWidth: '1200px', padding: '1.5rem' },
  dsc: { maxWidth: '920px', padding: '1rem' },
  itp: { maxWidth: '800px', padding: '1rem' },
  pmc: { maxWidth: '800px', padding: '1rem' },
};

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-button.html',
  styleUrl: './back-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  constructor(private settingsService: SettingsService) {}

  getContainerStyle(): { 'max-width': string; 'padding-left': string; 'padding-right': string } {
    const tile = this.settingsService.getSelectedTile() ?? '';
    const layout = WIDGET_LAYOUT[tile] ?? { maxWidth: '900px', padding: '1rem' };
    return {
      'max-width': layout.maxWidth,
      'padding-left': layout.padding,
      'padding-right': layout.padding,
    };
  }

  goBack(): void {
    this.settingsService.setSelectedTile();
    this.settingsService.resetUrl();
  }
}
