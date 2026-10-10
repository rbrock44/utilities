import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button';
import { PageData } from '../../constants/site';

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
  private readonly data = inject(ActivatedRoute).snapshot.data as PageData;

  readonly component = signal<Type<unknown> | null>(null);
  readonly inputs = this.data.tool?.inputs ?? {};

  constructor() {
    afterNextRender(() => {
      this.data.tool?.load().then(component => this.component.set(component));
    });
  }
}
