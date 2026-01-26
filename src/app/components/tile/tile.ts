import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tile } from '../../objects/tile';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tile.html',
  styleUrl: './tile.scss',
})
export class TileComponent {
  @Input() tile: Tile = {
    title: '',
    description: '',
    icon: '',
    param: ''
  };

  constructor(
    private settingsService: SettingsService
  ) {
  }

  handleClick() {
    this.settingsService.setSelectedTile(this.tile.param);
    this.settingsService.resetUrl();
  }
}