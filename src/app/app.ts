import { ChangeDetectionStrategy, ChangeDetectorRef, Component, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TileGridComponent } from './components/tile-grid/tile-grid';
import { HeaderComponent } from './components/header/header';
import { SettingsService } from './services/settings';
import { PreciousMetalsComponent } from './components/calculators/precious-metals/precious-metals';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent, 
    TileGridComponent, 
    PreciousMetalsComponent,
    RouterOutlet,
    CommonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('utilities');

  constructor(
    public settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tileParam = params[this.settingsService.tileUrlParam];
      console.log('TILE PARAM: ', tileParam)
      if (tileParam !== null && tileParam !== undefined && tileParam !== "") {
        console.log('GOOD PATH')
        this.settingsService.setSelectedTile(tileParam);
        this.cdr.markForCheck();
      } 
    });
  }

  
}
