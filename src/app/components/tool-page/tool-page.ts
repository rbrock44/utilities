import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button';
import { PageData } from '../../constants/site';
import { findTool, relatedTools } from '../../constants/tool-index';
import { FavoritesService } from '../../services/favorites';

const RELOAD_KEY = 'utilities-chunk-reload';
/** A second failure this soon after reloading means something other than a stale deploy. */
const RELOAD_WINDOW_MS = 30_000;

/**
 * Hosts one tool. The widget is only loaded in the browser (afterNextRender never runs
 * while prerendering), so widgets can use window, canvas, and storage freely and the static
 * page ships just the placeholder plus that tool's metadata.
 */
@Component({
  selector: 'app-tool-page',
  standalone: true,
  imports: [NgComponentOutlet, BackButtonComponent, RouterLink],
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
  /** Rendered in the page shell, not the widget, so prerendered pages carry these links. */
  readonly related = relatedTools(this.param);

  readonly heading = this.data.heading ?? '';
  readonly component = signal<Type<unknown> | null>(null);
  readonly loadFailed = signal(false);
  readonly inputs = this.data.tool?.inputs ?? {};

  constructor() {
    afterNextRender(() => {
      this.favorites.recordVisit(this.param);
      this.loadWidget();
    });
  }

  retry(): void {
    this.reloadPage();
  }

  private loadWidget(): void {
    this.data.tool?.load()
      .then(component => this.component.set(component))
      .catch(() => this.onLoadError());
  }

  /**
   * Each deploy replaces the hashed widget chunks, so a tab opened before a deploy asks for
   * files that no longer exist. One reload picks up the new build; if loading still fails
   * right after that, it's something else (offline, server down), so show an error instead
   * of reloading forever.
   */
  private onLoadError(): void {
    if (this.reloadedRecently()) {
      this.loadFailed.set(true);
      return;
    }
    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // Without storage there's no loop guard, so don't risk reloading.
      this.loadFailed.set(true);
      return;
    }
    this.reloadPage();
  }

  private reloadedRecently(): boolean {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY));
      return Number.isFinite(last) && Date.now() - last < RELOAD_WINDOW_MS;
    } catch {
      return true;
    }
  }

  protected reloadPage(): void {
    location.reload();
  }
}
