# Utilities

Angular 22 (standalone components, `OnPush`) single-page app holding a collection of
client-side calculators, converters, and file tools. Deployed as a static site to GitHub
Pages at `utilities.ryan-brock.com` (custom domain via `CNAME`).

## Commands

- Install: `npm install` (Node version pinned in `.nvmrc`)
- Run locally: `npm start` (= `ng serve`), then open `http://localhost:4200/?tile=<param>`
- Build: `npm run build` (= `ng build`, output to `dist/utilities/browser`)
- Unit tests (Vitest via `@angular/build:unit-test`, jsdom): `npx ng test --watch=false`
- Production build as CI runs it: `npm run deploy` (build with the live `--base-href`)

There is no lint script, and CI deliberately has no lint gate.

## Architecture

- **No router.** `app.routes.ts` does not drive widgets. `src/app/app.html` is one long
  `@if` chain of `isTile('<alias>', '<param>')` branches, each wrapping its widget in
  `@defer (on immediate)` so widgets are lazy-loaded chunks.
- `SettingsService` (`src/app/services/settings.ts`) owns the selected tile as a signal and
  syncs it with the `?tile=` query param through `Location`. `openTile()` pushes a history
  entry so browser back returns home; `restoreFromUrl()` slots a home entry under a deep
  link so back never leaves the site.
- Each widget is reachable by two keys: a short legacy alias (`gg`) and the kebab param
  (`guid-generator`). Old `?tile=gg` links must keep working — never drop an alias.
- `src/app/constants/categories.ts` is the home-page catalog: categories in display order,
  each with tiles (`title`, `description`, `icon`, `param`). The home-page search matches
  on category name, title, and description.
- Widgets live in `src/app/components/<group>/<folder>/`, where group is `calculators/`
  (math and conversion), `information/` (reference data), or `utilities/` (everything
  else). The group and the home-page category are independent.
- The length/weight/volume/temperature converters are one `unit-converter` component fed
  different unit tables from `src/app/constants/units/` through `App` fields.
- `precious-metal-breakdown` is a child of `precious-metals`, not a standalone tile.
- External data: spot prices from `home-page-api.ryan-brock.com/spot-price`, exchange
  rates from `api.frankfurter.dev`. Services fall back to a sentinel value (`-1`) instead
  of throwing when the API is down. Everything else runs entirely in the browser.
- Theming: light/dark via CSS custom properties in `src/styles.scss`, toggled by
  `ThemeService` and persisted in `localStorage` under `utilities-theme`. An inline script
  in `src/index.html` applies the stored theme before Angular boots to avoid a flash.

## Conventions

- Adding a widget: use the `add-utility` skill in `.claude/skills/add-utility/`. It
  covers the 3 files to create, the 3 files to edit, and the styling rules.
- `standalone: true`, `ChangeDetectionStrategy.OnPush`, and `cdr.markForCheck()` after
  async work. New templates use `@if`/`@for`/`@switch`, never `*ngIf`/`*ngFor`.
- Styles use theme tokens only — no raw hex except `#ffffff` on a `var(--brand)` button.
  `angular.json` warns at 4kB and errors at 8kB of compiled CSS per component.
- No new UI libraries; Angular Material is installed for theming tokens only. Prefer
  platform APIs over new dependencies. `jspdf`, `pdf-lib`, `pdfjs-dist`, and `qrcode` are
  the available libraries for document and image work.
- No section banner comments. Comments explain *why*, never label a region.
- Specs for any widget with real logic (parsers, conversions, money math). Canvas and
  clipboard APIs don't exist in jsdom, so set state directly and assert on getters.
  `src/app/accessibility.spec.ts` runs axe-core against the app.

## CI / Deploy

`.github/workflows/deploy.yml` runs on every push to `master` (the default branch — not
`main`): `npm ci`, tests, `npm run deploy`, copies `CNAME` into the output, and publishes
`dist/utilities/browser` to `gh-pages` with `peaceiris/actions-gh-pages`. A failing test
blocks the deploy.
