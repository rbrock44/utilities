---
name: add-widget
description: >
  Step-by-step guide for adding a new utility widget to the rbrock44/utilities
  Angular app. Use this skill whenever the user asks to create, add, or scaffold
  a new widget, utility, tool, calculator, converter, or generator in this
  project.
---

# Adding a Widget to the Utilities App

Angular 22, standalone components, `ChangeDetectionStrategy.OnPush`. Widgets are **not**
Angular Router routes — `app.routes.ts` is intentionally empty. Instead `app.html` is one
big `@if` switch keyed off `SettingsService.getSelectedTile()`, which is fed by the
`?tile=` query parameter.

Adding a widget means **creating 3 files and editing 3 existing ones**:

| Action | Path |
|---|---|
| Create | `src/app/components/<group>/<folder>/<folder>.ts` |
| Create | `src/app/components/<group>/<folder>/<folder>.html` |
| Create | `src/app/components/<group>/<folder>/<folder>.scss` |
| Edit | `src/app/app.ts` — import + `imports` array |
| Edit | `src/app/app.html` — `@if` branch |
| Edit | `src/app/constants/categories.ts` — tile entry |

Nothing else changes. Not `app.routes.ts`, not `index.html`, not `public/sitemap.xml`
(single-URL site), not the deploy workflow.

---

## Step 1 — Pin down the details

Ask only for what you can't reasonably infer; pick sensible defaults for the rest and
state them.

| Field | Example | Rule |
|---|---|---|
| Display title | `Color Converter` | Title Case |
| Tile description | `Convert HEX, RGB, and HSL, and check WCAG contrast` | One line, no trailing period |
| Emoji icon | `🎨` | Should not duplicate an existing tile's |
| Tile param | `color-converter` | kebab-case, **identical to the folder name** |
| Short alias | `clr` | 2–4 characters, unique across `app.html` |
| Category | `Developer Tools` | Existing name, or a new one |
| Folder group | `utilities` | `calculators/`, `information/`, or `utilities/` |
| Folder / file base | `color-converter` | kebab-case |
| Selector | `app-color-converter` | `app-` + folder name |
| Class | `ColorConverterComponent` | PascalCase + `Component` |

**Folder group and category are independent.** `hex-generator` lives in
`components/utilities/` but is listed under `Generators`; `unit-converter` lives in
`components/calculators/` but powers `Converters`. Pick the group by what kind of code it
is (`calculators/` = math, `information/` = reference data, `utilities/` = everything
else), and the category by where a user would look for it.

**Currently in use — do not collide:**

- Categories: `Converters`, `PDF Utilities`, `Calculators`, `Information`, `Email`,
  `Image Utilities`, `Developer Tools`, `Generators`
- Aliases: `pm` `sic` `gic` `rac` `cpc` `dsc` `itp` `pmc` `ppu` `elg` `hg` `gg` `lc` `wc`
  `vc` `tc` `cc` `nbc` `b64` `tsc` `clr` `lnc` `imr`
- Icons: 📏 ⚖️ 🥄 🌡️ 💱 🧮 📄 📑 ✂️ ⚖ 📐 🏦 🥇 🥈 ✉️ 🖼️ 🔤 ⏰ 🎨 🔢 🆔

---

## Step 2 — Create the component

### `<folder>.ts`

```typescript
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-<folder>',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './<folder>.html',
  styleUrl: './<folder>.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <Class>Component {
  input = '';
  result: string | null = null;
  errorMessage: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  compute(): void {
    this.errorMessage = null;
    // ...
    this.cdr.markForCheck();
  }
}
```

Rules:

- `standalone: true` and `changeDetection: ChangeDetectionStrategy.OnPush`, always
- Inject `ChangeDetectorRef` and call `this.cdr.markForCheck()` after async work or any
  state change not driven directly by a template binding
- Import `FormsModule` whenever the template uses `[(ngModel)]`
- Clean up in `ngOnDestroy`: `clearInterval`/`clearTimeout`, and `URL.revokeObjectURL`
  for any object URL you created
- Debounce expensive recomputation (canvas re-encodes, large loops) with a ~150 ms timer
- **No section banner comments** — not `/* ── Inputs ─────── */`, not `// Helpers`,
  in any file type. A comment that only restates the name of the thing below it is
  noise the maintainer deletes by hand. Comment to explain *why* (a rounding
  strategy, a browser quirk, a non-obvious formula); never to label a region.
- No new dependencies. Prefer platform APIs — `crypto.randomUUID()`,
  `navigator.clipboard`, `FileReader`, `<canvas>`, `Intl.NumberFormat`, `BigInt`. Only
  `jspdf` and `pdf-lib` are available for document work.
- Money and large numbers go through `Intl.NumberFormat`; run financial math in integer
  cents so rounding doesn't drift

### `<folder>.html`

```html
<section class="widget-container">
  <h2>Widget Title</h2>
  <p class="description">One line describing what this does.</p>

  <div class="inputs">
    <label for="valueInput">
      Value
      <input id="valueInput" type="text" [(ngModel)]="input" (ngModelChange)="compute()" />
    </label>
  </div>

  @if (errorMessage) {
    <p class="error" role="alert">{{ errorMessage }}</p>
  }

  @if (result) {
    <div class="results" aria-live="polite">…</div>
  }
</section>
```

Rules:

- Root element is `<section class="widget-container">`
- Use `@if` / `@for` / `@switch` — **never** `*ngIf` / `*ngFor` in new components (some
  older components still use the legacy syntax; don't copy it)
- Every `@for` needs a `track`
- Template expressions are limited: **no `Math.*`, no BigInt literals like `0n`, no
  optional chaining on the left of an assignment.** Expose a getter on the component
  instead.
- `<select>` bound to non-string values needs `[ngValue]` on each `<option>`, not `value`
- Accessibility: `<label for>` paired with a matching `id`, `aria-label` on icon-only
  buttons, `role="alert"` on errors, `aria-live="polite"` on results that update in place

### `<folder>.scss`

See Step 3 — the styling rules matter more than the scaffold.

---

## Step 3 — Style with theme tokens, and watch the size budget

The app has light and dark themes driven by CSS custom properties defined in
`src/styles.scss`. **Hardcoded colors break dark mode.** The only literal color that
belongs in a widget stylesheet is `#ffffff` for text on a solid `var(--brand)` button.

| Purpose | Tokens |
|---|---|
| Surfaces | `--surface`, `--surface-alt`, `--surface-sunken` |
| Borders | `--border`, `--border-strong` |
| Text | `--text`, `--text-soft`, `--text-faint` |
| Brand | `--brand`, `--brand-deep`, `--brand-soft`, `--brand-soft-hover`, `--brand-soft-text`, `--brand-border` |
| Success | `--success`, `--success-deep`, `--success-soft` |
| Error | `--error`, `--error-deep`, `--error-soft`, `--error-soft-strong`, `--error-text`, `--error-border` |
| Warning | `--warning`, `--warning-soft`, `--warning-text` |
| Muted | `--muted`, `--muted-soft`, `--muted-text` |
| Shadows | `--shadow-sm`, `--shadow-md` |

### Size budget — the thing that bites

`angular.json` sets `anyComponentStyle` to **warn at 4 kB and error at 8 kB**, measured on
the *compiled* CSS. A typical widget with a drop zone, a segmented control, and a results
panel lands right around 4 kB, so plan for it rather than trimming afterwards:

- Merge selectors that share declarations (`.options-grid label, .filename-row label { … }`)
- Skip decorative `transition` declarations
- Don't restate inherited `font-size` / `color`
- One `@media` block, not three

Verify with `npm run build` and grep the output for `budget`.

### Layout conventions

- `margin: 1rem auto`, `background: var(--surface)`, `border-radius: 10px`,
  `box-shadow: var(--shadow-sm)`
- **Width follows the content.** A form of short numeric fields reads best at
  `max-width: 700px`. Anything built around a `<textarea>` or a wide table must go
  much wider — `max-width: min(1200px, 96vw)`, up to `min(1600px, 96vw)` for
  side-by-side panes — or most of a desktop screen is empty margin.
- **Give textareas a `min-height` in `vh`**, not just a `rows` attribute: `50vh` for
  a single main editor, `~34vh` for a side-by-side pair, `~18vh` for a secondary
  input. Cap scrollable result panels with `max-height` in `vh` as well.
- `border-radius`: `8px` inputs/buttons, `10px` cards/containers
- Spacing in `0.5rem` multiples; `font-weight: 600` labels, `700` headings
- Primary button: `var(--brand)` bg, `#ffffff` text, hover `var(--brand-deep)`
- Always include a `@media (max-width: 480px)` block that tightens padding and makes
  buttons full width

---

## Step 4 — Register in `src/app/app.ts`

```typescript
import { <Class>Component } from './components/<group>/<folder>/<folder>';
```

…and add `<Class>Component` to the `@Component` `imports` array, near related widgets.
If the widget needs shared constant data (as `unit-converter` does), also expose it as a
`protected readonly` field on `App` and pass it through the template binding.

---

## Step 5 — Add the branch in `src/app/app.html`

Inside the outer `@if (this.settingsService.getSelectedTile() !== null) { … }` block,
after the last existing branch:

```html
@if (
  this.settingsService.getSelectedTile() === '<alias>' ||
  this.settingsService.getSelectedTile() === '<param>'
) {
  <app-<folder>></app-<folder>>
}
```

Both keys are deliberate: the short alias is the legacy URL form, the kebab param is the
current one, so old `?tile=gg` links keep working. New widgets get both.

---

## Step 6 — Add the tile in `src/app/constants/categories.ts`

Append to the matching category's `tiles` array — 4-space indent, single quotes, no
trailing comma on the last property:

```typescript
{
    title: '<Display Title>',
    description: '<Short description>',
    icon: '<emoji>',
    param: '<param>'
}
```

`param` must be the **kebab** form from the `app.html` branch, never the short alias —
that's what `TileComponent.handleClick()` writes into the URL.

If the category doesn't exist, append a new `{ name, tiles: [...] }` object to
`CATEGORIES`. File order is home-page order; new categories go at the end. The home-page
search box matches on `title` and `description`, so put the words a user would actually
type into the description.

---

## Step 7 — Add a spec when there's real logic

Skip it for a thin wrapper around a form. **Write one whenever the widget has pure logic
worth pinning** — parsers, numeric conversion, validation, financial math. Test through
the component's public API with `TestBed`; the canvas/clipboard APIs are unavailable in
jsdom, so set state fields directly and assert on getters instead of driving the DOM.

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { <Class>Component } from './<folder>';

describe('<Class>Component', () => {
  let component: <Class>Component;
  let fixture: ComponentFixture<<Class>Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [<Class>Component] }).compileComponents();
    fixture = TestBed.createComponent(<Class>Component);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

Tests run on vitest via `@angular/build:unit-test`.

---

## Step 8 — Verify

From `C:\workspace\utilities`:

```
npm run build
npx ng test --watch=false
```

Both must exit 0 — `.github/workflows/deploy.yml` runs the tests before building on every
push to `master`. Warnings are acceptable, errors are not, but check that **you** didn't
add a new warning. Two are pre-existing and expected:

- `bundle initial exceeded maximum budget` (1 MB budget, app is over)
- `cleaning-payout-calculator.scss exceeded maximum budget` (4.20 kB)

Then check it by hand: `npm start`, visit `http://localhost:4200/?tile=<param>`, and
toggle the theme in the header to confirm both light and dark look right.

---

## Completion checklist

- [ ] Three files under `src/app/components/<group>/<folder>/`
- [ ] `standalone: true` + `OnPush`, `@if`/`@for` control flow, `markForCheck()` after async
- [ ] Timers and object URLs cleaned up in `ngOnDestroy`
- [ ] SCSS uses theme tokens only, has a mobile breakpoint, compiles under 4 kB
- [ ] Imported and listed in `app.ts`
- [ ] `@if` branch in `app.html` with both the alias and the kebab key
- [ ] Tile in `categories.ts` with `param` matching the folder name
- [ ] Emoji and alias don't collide with an existing utility
- [ ] Spec added if the widget has non-trivial logic
- [ ] `npm run build` and `npx ng test --watch=false` both pass with no new warnings
