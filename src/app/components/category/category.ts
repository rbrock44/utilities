import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TileComponent } from '../tile/tile';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, TileComponent],
  templateUrl: './category.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './category.scss',
})
export class CategoryComponent {
  @Input() category: Category = {
    name: '',
    tiles: []
  };
}