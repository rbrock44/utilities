import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tile.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tile.scss',
})
export class TileComponent {
  @Input() tile: Tile = {
    title: '',
    description: '',
    icon: '',
    param: ''
  };
}