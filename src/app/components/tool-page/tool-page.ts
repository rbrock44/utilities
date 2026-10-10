import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button';
import { PageData } from '../../constants/site';
import { findTool } from '../../constants/tool-index';
import { FavoritesService } from '../../services/favorites';

/**
 * Hosts one tool. The widget is only loaded in the browser (afterNextRender never runs
 * while prerendering), so widgets can use window, canvas, and storage freely and the static
 * page ships just the placeholder plus that tool's metadata.
 */
@Component({
  selector: 'app-tool-page',
  standalone: true,
  imports: [NgComponentOutlet, BackButtonComponent],
  templateUrl: './tool-page.html',
  styleUrl: './tool-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolPageComponent {
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly data = this.route.data as PageData;
  readonly favorites = inject(FavoritesService);
  readonly param = this.route.routeConfig?.path ?? '';
  /** Unlisted tools have no tile, so there is nowhere to pin them. */
  readonly canPin = findTool(this.param) !== undefined;

  readonly heading = this.data.heading ?? '';
  readonly component = signal<Type<unknown> | null>(null);
  readonly inputs = this.data.tool?.inputs ?? {};

  constructor() {
    afterNextRender(() => {
      this.favorites.recordVisit(this.param);
      this.data.tool?.load().then(component => this.component.set(component));
    });
  }
}
