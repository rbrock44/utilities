---
name: add-utility
description: >
  Scaffold and wire up a new utility (widget/tool/calculator/converter/generator)
  in the rbrock44/utilities Angular app. Use whenever the user asks to add,
  create, or scaffold a new utility, widget, tool, calculator, converter, or
  generator in this repo.
---

# Adding a Utility to the Utilities App

Angular 22, standalone components, no Angular Router routes for widgets. `app.html`
is one big `@if` switch keyed off `SettingsService.getSelectedTile()`, which is fed
by the `?tile=` query param. Adding a utility means creating 3 files and touching 3
existing files.

**Files created:** `src/app/components/<group>/<folder>/<folder>.{ts,html,scss}`
**Files edited:** `src/app/app.ts`, `src/app/app.html`, `src/app/constants/categories.ts`

Nothing else needs to change — not `app.routes.ts` (intentionally empty), not
`index.html`, not `sitemap.xml` (single-URL site), not the deploy workflow.

---

## Step 1 — Pin down the details

Gather these before writing code. Ask the user only for what you can't reasonably
infer from their request; pick sensible defaults for the rest and state them.

| Field | Example | Rule |
|---|---|---|
| Display title | `GUID Generator` | Title Case |
| Tile description | `Generate random GUIDs (UUID v4)` | One short line, no trailing period |
| Emoji icon | `🆔` | Single emoji, must not duplicate an existing tile's |
| Tile param | `guid-generator` | kebab-case, **identical to the folder name** |
| Short alias | `gg` | 2–4 lowercase letters, unique across `app.html` |
| Category | `Generators` | Existing name from `categories.ts`, or a new one |
| Folder group | `utilities` | One of `calculators/`, `information/`, `utilities/` |
| Folder / file base | `guid-generator` | kebab-case |
| Selector | `app-guid-generator` | `app-` + folder name |
| Class | `GuidGeneratorComponent` | PascalCase + `Component` |

**The folder group and the category name are independent.** `hex-generator` lives in
`components/utilities/` but is listed under the `Generators` category;
`unit-converter` lives in `components/calculators/` but powers the `Converters`
category. Pick the group by what kind of code it is, the category by where a user
would look for it.

Rough mapping for the group: `calculators/` = math/conversion/derived numbers,
`information/` = mostly-static reference data, `utilities/` = everything else
(file manipulation, generators, link builders).

**Currently in use — don't collide:**

- Categories: `Converters`, `PDF Utilities`, `Calculators`, `Information`,
  `Email`, `Image Utilities`, `Developer Tools`, `Generators`
- Aliases: `pm` `sic` `gic` `rac` `cpc` `dsc` `itp` `pmc` `ppu` `elg` `hg` `gg`
  `lc` `wc` `vc` `tc` `cc` `nbc` `b64` `tsc` `clr` `lnc` `imr`
- Icons: 📏 ⚖️ 🥄 🌡️ 💱 🧮 📄 📑 ✂️ ⚖ 📐 🏦 🥇 🥈 ✉️ 🖼️ 🔤 ⏰ 🎨 🔢 🆔

---

## Step 2 — Create the three component files

Directory: `src/app/components/<group>/<folder>/`

Start from `templates/widget.ts`, `templates/widget.html`, and `templates/widget.scss`
in this skill directory — copy them in, rename, and replace the placeholders. The
closest real-world reference to read is
`src/app/components/utilities/guid-generator/` (generate + copy-to-clipboard) or
`src/app/components/calculators/divider-spacing-calculator/` (numeric inputs +
computed results).

Non-negotiable component conventions:

- `standalone: true`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- Inject `ChangeDetectorRef` and call `this.cdr.markForCheck()` after anything async
  or anything that mutates state outside a template binding
- Import `FormsModule` whenever the template uses `[(ngModel)]`
- Use `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor` in new components
  (some older components still use the legacy syntax; do not copy that)
- `@for` always needs a `track` (`track $index` is fine for generated string lists)
- Template expressions are limited: **no `Math.*`, no BigInt literals like `0n`**.
  Expose a getter on the component instead (`get isNegative()`, `get bitLength()`).
- A `<select>` bound to non-string values needs `[ngValue]` on each `<option>`,
  not `value` — otherwise numbers arrive as strings
- Clean up in `ngOnDestroy`: `clearInterval` / `clearTimeout`, and
  `URL.revokeObjectURL` for every object URL you created
- Debounce expensive recomputation (canvas re-encodes, long loops) with a ~150ms
  timer so dragging a slider doesn't thrash
- Run money math in integer cents and format with `Intl.NumberFormat`; per-step
  float rounding drifts noticeably over hundreds of iterations
- **No section banner comments** — not `/* ── Inputs ─────── */`, not `// Helpers`,
  in any file type. A comment that only restates the name of the thing below it is
  noise the maintainer deletes by hand. Comment to explain *why* something is the
  way it is (a rounding strategy, a browser quirk, a non-obvious formula); never to
  label a region.
- No external UI libraries. Angular Material is installed for theming tokens only;
  widgets are hand-written HTML + SCSS.
- Everything runs client-side. Prefer platform APIs (`crypto.randomUUID()`,
  `navigator.clipboard`, `FileReader`, `<canvas>`, `TextEncoder`, `BigInt`) over
  new dependencies. Only `jspdf` and `pdf-lib` are available for document work.

---

## Step 3 — Style with theme tokens, never raw hex

The app has light and dark themes driven by CSS custom properties in
`src/styles.scss` (`:root` and `:root[data-theme='dark']`). **Hardcoded colors break
dark mode.** The only literal color that belongs in a widget stylesheet is `#ffffff`
for text on a solid `var(--brand)` button.

Available tokens:

| Purpose | Tokens |
|---|---|
| Surfaces | `--surface`, `--surface-alt`, `--surface-sunken` |
| Borders | `--border`, `--border-strong` |
| Text | `--text`, `--text-soft`, `--text-faint` |
| Brand / accent | `--brand`, `--brand-deep`, `--brand-soft`, `--brand-soft-hover`, `--brand-soft-text`, `--brand-border` |
| Success | `--success`, `--success-deep`, `--success-soft` |
| Error | `--error`, `--error-deep`, `--error-soft`, `--error-soft-strong`, `--error-text`, `--error-border` |
| Warning | `--warning`, `--warning-soft`, `--warning-text` |
| Muted | `--muted`, `--muted-soft`, `--muted-text` |
| Shadows | `--shadow-sm`, `--shadow-md` |

Layout conventions:

- Root element is `<section class="widget-container">` with `margin: 1rem auto`,
  `background: var(--surface)`, `border-radius: 10px`, `box-shadow: var(--shadow-sm)`
- **Width follows the content.** A form of short numeric fields reads best at
  `max-width: 700px`. Anything built around a `<textarea>` or a wide table must go
  much wider — `max-width: min(1200px, 96vw)`, up to `min(1600px, 96vw)` for
  side-by-side panes — or most of a desktop screen is empty margin.
- **Give textareas a `min-height` in `vh`**, not just a `rows` attribute: `50vh` for
  a single main editor, `~34vh` for a side-by-side pair, `~18vh` for a secondary
  input. `rows` alone leaves a text tool looking like a comment box. Scrollable
  result panels should cap with `max-height` in `vh` too.
- `border-radius`: `8px` inputs/buttons, `10px` cards/containers
- Spacing in `0.5rem` multiples
- `font-weight: 600` labels, `700` headings and emphasized values
- Primary button: `var(--brand)` background, `#ffffff` text, hover `var(--brand-deep)`
- Include a `@media (max-width: 480px)` block that tightens padding and makes
  buttons full width
- **Size budget — plan for it, don't trim afterwards.** `angular.json` sets
  `anyComponentStyle` to **warn at 4kB and error at 8kB**, measured on the
  *compiled* CSS. A widget with a drop zone, a segmented control, and a results
  panel lands right at ~4kB. Keep under it by merging selectors that share
  declarations (`.options-grid label, .filename-row label { … }`), skipping
  decorative `transition` declarations, not restating inherited `font-size` /
  `color`, and using one `@media` block instead of three. Check with
  `npm run build 2>&1 | grep -i budget`.

Accessibility: label every input (`<label for>` + matching `id`), give icon-only
buttons an `aria-label`, put `role="alert"` on error text and `aria-live="polite"`
on result regions that update in place.

---

## Step 4 — Register in `src/app/app.ts`

Two edits:

1. Import next to the other component imports (they're grouped loosely by category —
   put it with its neighbors):
   ```typescript
   import { GuidGeneratorComponent } from './components/utilities/guid-generator/guid-generator';
   ```
2. Add the class to the `@Component` `imports` array, near the related widgets.

If the widget needs shared constant data (like `unit-converter` does), also expose it
as a `protected readonly` field on `App` and pass it through the template binding.

---

## Step 5 — Add the switch branch in `src/app/app.html`

Inside the outer `@if (this.settingsService.getSelectedTile() !== null) { ... }`
block, after the last existing branch, following the established two-key pattern:

```html
@if (
  this.settingsService.getSelectedTile() === 'gg' ||
  this.settingsService.getSelectedTile() === 'guid-generator'
) {
  <app-guid-generator></app-guid-generator>
}
```

Both keys are intentional: the short alias is the legacy URL form and the kebab param
is the current one, so old `?tile=gg` links keep working. New widgets get both.

---

## Step 6 — Add the tile in `src/app/constants/categories.ts`

Append to the matching category's `tiles` array (4-space indentation, single quotes,
no trailing comma on the last property):

```typescript
{
    title: 'GUID Generator',
    description: 'Generate random GUIDs (UUID v4)',
    icon: '🆔',
    param: 'guid-generator'
}
```

`param` must be the **kebab** form from the `app.html` branch, not the short alias —
that's what `TileComponent.handleClick()` writes into the URL.

If the category doesn't exist, append a new `{ name, tiles: [...] }` object to
`CATEGORIES`. Order in the file is the order shown on the home page; new categories
go at the end. The tile's `title` and `description` are what the home-page search box
matches on, so make the description contain the words a user would actually type.

---

## Step 7 — Verify

Run both, from `C:\workspace\utilities`:

```
npm run build
npx ng test --watch=false
```

Both must exit 0 — the deploy workflow (`.github/workflows/deploy.yml`) runs tests
before building on every push to `master`. Errors are never acceptable; check that
**you** didn't add a new warning. Exactly two are pre-existing and expected:

- `bundle initial exceeded maximum budget` (1MB budget, app is over)
- `cleaning-payout-calculator.scss exceeded maximum budget` (4.20kB)

**Write a spec whenever the widget has pure logic worth pinning** — parsers,
numeric conversion, validation, financial math. Skip it only for a thin wrapper
around a form. Test through the component's public API with `TestBed`; canvas and
clipboard APIs don't exist in jsdom, so set state fields directly and assert on
getters rather than driving the DOM. Tests run on vitest via
`@angular/build:unit-test`; follow the style in
`src/app/components/calculators/number-base-converter/number-base-converter.spec.ts`.

Treat a failing new test as a real question, not a nuisance: twice while building
these, the test was wrong about the requirement rather than the code being broken,
and the fix was to state the actual behavior (an auto-detected unit, a lossy
round-trip tolerance) instead of loosening the assertion.

Then confirm manually with `npm start` and visit
`http://localhost:4200/?tile=<param>`, checking both themes via the header toggle.

---

## Completion checklist

- [ ] Three files created under `src/app/components/<group>/<folder>/`
- [ ] `OnPush` + `standalone: true`, `@if`/`@for` control flow, `markForCheck()` after async
- [ ] Timers and object URLs cleaned up in `ngOnDestroy`
- [ ] SCSS uses theme tokens only, has a mobile breakpoint, compiles under 4kB
- [ ] Imported and listed in `app.ts`
- [ ] `@if` branch in `app.html` with both the alias and the kebab key
- [ ] Tile in `categories.ts` with `param` matching the folder name
- [ ] Emoji and short alias don't collide with an existing utility
- [ ] Spec added if the widget has non-trivial logic
- [ ] `npm run build` and `npx ng test --watch=false` both pass with no new warnings
