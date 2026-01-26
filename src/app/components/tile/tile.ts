import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tile.html',
  styleUrl: './tile.scss',
})
export class TileComponent {
  @Input() tile: any;

  handleClick() {
    if (this.tile.action) {
      this.tile.action();
    } else if (this.tile.route) {
      // Handle routing if needed
      console.log('Navigate to:', this.tile.route);
    }
  }
}