import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryComponent } from '../category/category';

interface Tile {
  title: string;
  description: string;
  icon: string;
  route?: string;
  action?: () => void;
}

interface Category {
  name: string;
  tiles: Tile[];
}

@Component({
  selector: 'app-tile-grid',
  standalone: true,
  imports: [CommonModule, CategoryComponent],
  templateUrl: './tile-grid.html',
  styleUrl: './tile-grid.scss',
})
export class TileGridComponent {
  categories: Category[] = [
    {
      name: 'Productivity',
      tiles: [
        {
          title: 'Calculator',
          description: 'Basic calculator utility',
          icon: '🧮'
        },
        {
          title: 'Timer',
          description: 'Countdown and stopwatch',
          icon: '⏱️'
        },
        {
          title: 'Notes',
          description: 'Quick note taking',
          icon: '📝'
        }
      ]
    },
    {
      name: 'Converters',
      tiles: [
        {
          title: 'Unit Converter',
          description: 'Convert between units',
          icon: '📏'
        },
        {
          title: 'Currency',
          description: 'Exchange rates',
          icon: '💱'
        }
      ]
    }
  ];
}
