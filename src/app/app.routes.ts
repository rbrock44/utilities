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
  { path: '**', redirectTo: '' }
];
