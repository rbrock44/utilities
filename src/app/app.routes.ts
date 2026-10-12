import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { CATEGORIES } from './constants/categories';
import { PageData, SITE_DESCRIPTION, SITE_TITLE } from './constants/site';
import { resolveLegacyTile, TOOLS } from './constants/tools';
import { TileGridComponent } from './components/tile-grid/tile-grid';
import { ToolPageComponent } from './components/tool-page/tool-page';

/** Sends old `/?tile=<alias|param>` links to the tool's own page. */
export const redirectLegacyTile: CanActivateFn = route => {
  const param = resolveLegacyTile(route.queryParamMap.get('tile'));
  return param ? inject(Router).createUrlTree(['/', param]) : true;
};

/**
 * Coin Stack Value was folded into Precious Metals. Its links still work: the stack is
 * converted to coin rows in a Precious Metals link, keeping the stack's name.
 */
export const redirectCoinStack: CanActivateFn = async route => {
  const router = inject(Router);
  // Loaded on demand so the coin list stays out of the main bundle.
  const [{ decodeLegacyStack }, { encodeMetalList }] = await Promise.all([
    import('./constants/coin-options'),
    import('./components/calculators/precious-metals/metal-list'),
  ]);
  const stack = decodeLegacyStack(route.queryParamMap.get('stack') ?? '').items;
  const name = route.queryParamMap.get('name');
  const queryParams = {
    ...(stack.length > 0 ? { metals: encodeMetalList(stack.map(item => ({ coin: item.id, quantity: item.quantity, ...(item.note ? { note: item.note } : {}) }))) } : {}),
    ...(name ? { name } : {}),
  };
  return router.createUrlTree(['/', 'precious-metals'], { queryParams });
};

function toolRoute(param: string, title: string, description: string): Routes[number] {
  const tool = TOOLS[param];
  const data: PageData = { description, tool, heading: title, noindex: !!tool.unlisted };
  return { path: param, component: ToolPageComponent, title: `${title} – Utilities`, data };
}

const listedRoutes: Routes = CATEGORIES.flatMap(category =>
  category.tiles.map(tile => toolRoute(tile.param, tile.title, tile.description))
);

const unlistedRoutes: Routes = Object.entries(TOOLS)
  .filter(([, tool]) => tool.unlisted)
  .map(([param, tool]) => toolRoute(param, tool.unlisted!.title, tool.unlisted!.description));

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: TileGridComponent,
    canActivate: [redirectLegacyTile],
    title: SITE_TITLE,
    data: { description: SITE_DESCRIPTION } satisfies PageData
  },
  ...listedRoutes,
  ...unlistedRoutes,
  { path: 'coin-stack-calculator', canActivate: [redirectCoinStack], children: [] },
  { path: '**', redirectTo: '' }
];
