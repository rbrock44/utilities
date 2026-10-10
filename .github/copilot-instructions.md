# Utilities

Angular 22 (standalone components, `OnPush`) app holding a collection of client-side
calculators, converters, and file tools. Every page is prerendered at build time
(`outputMode: "static"`) and deployed as plain files to GitHub Pages at
`utilities.ryan-brock.com` (custom domain via `CNAME`). There is no server.

## Commands

- Install: `npm install` (Node version pinned in `.nvmrc`)
- Run locally: `npm start` (= `ng serve`), then open `http://localhost:4200/<param>`
- Build: `npm run build` (= `ng build`, output to `dist/utilities/browser`)
- Unit tests (Vitest via `@angular/build:unit-test`, jsdom): `npx ng test --watch=false`
- Production build as CI runs it: `npm run deploy` (`ng build`, then
  `scripts/finish-static-build.mjs` writes `sitemap.xml` and `404.html`)

There is no lint script, and CI deliberately has no lint gate.

## Architecture

- **Routes.** `src/app/app.routes.ts` builds one route per tool at `/<param>` from two
  sources: `src/app/constants/categories.ts` (the home-page catalog: `title`,
  `description`, `icon`, `param`) and `src/app/constants/tools.ts` (param → lazy `load`,
  optional `inputs`, legacy `alias`, `unlisted`). `tools.spec.ts` fails if they drift.
- **Prerendering.** `app.routes.server.ts` prerenders every route. `ToolPageComponent`
  loads the widget in `afterNextRender`, which never runs during prerendering, so widgets
  stay browser-only and can use `window`/canvas/storage freely. The static page carries
  only the shell, placeholder, and that tool's metadata.
- **SEO.** `SeoTitleStrategy` (`src/app/services/seo.ts`) sets title, description, og/twitter
  tags, canonical (with trailing slash, the URL Pages actually serves), and robots from
  route data. Unlisted tools (`cleaning-payout-calculator`) get `noindex` and are left out
  of the sitemap.
- **Legacy links.** Old `/?tile=<alias|param>` URLs redirect to `/<param>` through the
  `redirectLegacyTile` guard on the home route. Never remove an existing `alias`.
- **History.** `App` slots a home entry under a deep-linked page so browser back and the
  back button (`location.back()`) land home instead of leaving the site.
- The home page search matches on category name, tile title, and description.
- Widgets live in `src/app/components/<group>/<folder>/`, where group is `calculators/`
  (math and conversion), `information/` (reference data), or `utilities/` (everything
  else). The group and the home-page category are independent.
- The length/weight/volume/temperature converters are one `unit-converter` component fed
  different unit tables from `src/app/constants/units/` via `inputs` in `tools.ts`.
- `precious-metal-breakdown` is a child of `precious-metals`, not a standalone tile.
- External data: spot prices from `home-page-api.ryan-brock.com/spot-price`, exchange
  rates from `api.frankfurter.dev`. Services fall back to a sentinel value (`-1`) instead
  of throwing when the API is down. Everything else runs entirely in the browser.
- Theming: light/dark via CSS custom properties in `src/styles.scss`, toggled by
  `ThemeService` and persisted in `localStorage` under `utilities-theme`. An inline script
  in `src/index.html` applies the stored theme before Angular boots to avoid a flash.
- Code that runs during prerendering (shell, header, home grid, services they use) must
  not touch browser globals directly — inject `DOCUMENT`, guard `localStorage`.

## Conventions

- Adding a widget: use the `add-utility` skill in `.claude/skills/add-utility/`. It
  covers the 3 files to create, the 2 files to edit, and the styling rules.
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
blocks the deploy. `404.html` is the client-only shell (`index.csr.html`), which Pages
serves for any path without a file; the router then sends unknown paths home.
`.github/workflows/test.yml` runs the same tests on pull requests into
`master`.
