import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../services/favorites';

@Component({
  selector: 'app-tile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tile.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tile.scss',
})
export class TileComponent {
  readonly favorites = inject(FavoritesService);

  @Input() tile: Tile = {
    title: '',
    description: '',
    icon: '',
    param: ''
  };
}