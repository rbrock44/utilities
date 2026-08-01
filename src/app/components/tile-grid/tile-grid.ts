import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryComponent } from '../category/category';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-tile-grid',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CategoryComponent
  ],
  templateUrl: './tile-grid.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tile-grid.scss',
})
export class TileGridComponent {
  searchTerm = '';

  constructor(
    public settingsService: SettingsService
  ) {
  }

  get filteredCategories(): Category[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.settingsService.categories;
    }

    return this.settingsService.categories
      .map(category => {
        const categoryMatches = category.name.toLowerCase().includes(term);
        const tiles = categoryMatches
          ? category.tiles
          : category.tiles.filter(tile =>
              tile.title.toLowerCase().includes(term) || tile.description.toLowerCase().includes(term)
            );
        return { ...category, tiles };
      })
      .filter(category => category.tiles.length > 0);
  }
}
