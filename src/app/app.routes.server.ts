import { RenderMode, ServerRoute } from '@angular/ssr';

/** GitHub Pages only serves files, so every page is prerendered at build time. */
export const serverRoutes: ServerRoute[] = [
  // Only redirects, so there's no page to build: GitHub Pages serves the 404.html app shell
  // for it and the redirect runs in the browser.
  { path: 'coin-stack-calculator', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
