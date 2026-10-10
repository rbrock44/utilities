import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryComponent } from '../category/category';
import { CATEGORIES } from '../../constants/categories';
import { FavoritesService } from '../../services/favorites';
import { CommandPaletteService } from '../../services/command-palette';

@Component({
  selector: 'app-tile-grid',
  standalone: true,
  imports: [
    CommonModule, 
    CategoryComponent
  ],
  templateUrl: './tile-grid.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tile-grid.scss',
})
export class TileGridComponent {
  searchTerm = signal('');
  readonly favorites = inject(FavoritesService);
  readonly palette = inject(CommandPaletteService);

  readonly pinnedCategory = computed<Category>(() => ({ name: 'Pinned', tiles: this.favorites.pinnedTools() }));
  readonly recentCategory = computed<Category>(() => ({ name: 'Recent', tiles: this.favorites.recentTools() }));

  get filteredCategories(): Category[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return CATEGORIES;
    }

    return CATEGORIES
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
