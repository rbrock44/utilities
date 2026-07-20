import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.scss',
})
export class HeaderComponent {
  constructor(
    private settingsService: SettingsService
  ) {
  }

  goHome() {
    this.settingsService.setSelectedTile();
    this.settingsService.resetUrl();
  }
}