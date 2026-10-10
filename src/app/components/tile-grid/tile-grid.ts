import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryComponent } from '../category/category';
import { CATEGORIES } from '../../constants/categories';

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
