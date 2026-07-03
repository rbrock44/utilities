---
name: add-widget
description: >
  Step-by-step guide for adding a new utility widget to the rbrock44/utilities
  Angular app. Use this skill whenever the user asks to create, add, or scaffold
  a new widget, utility, calculator, or tool in this project.
---

# Adding a New Widget to the Utilities App

This Angular 21 app uses **standalone components**, `ChangeDetectionStrategy.OnPush`, and no routing — widgets are shown/hidden via a `SettingsService.getSelectedTile()` string key. Follow every step below in order.

---

## Step 1 — Decide the widget's details

Gather (or ask the user for) these four things before writing any code:

| Field | Example |
|---|---|
| **Display title** | `Image to PDF` |
| **Short description** (tile subtitle) | `Convert one or more images into a downloadable PDF` |
| **Emoji icon** | `📄` |
| **URL param / tile key** (2-4 lowercase letters) | `itp` |
| **Category** | `Utilities` (or `Calculators`, `Information`, …) |
| **Component folder name** | `image-to-pdf` |
| **Angular selector** | `app-image-to-pdf` |
| **TypeScript class name** | `ImageToPdfComponent` |

Component folders live under `src/app/components/<category-kebab>/`. Existing categories: `calculators/`, `information/`, `utilities/`.

---

## Step 2 — Create the component folder and three files

Create the directory:
```
src/app/components/<category>/<component-folder>/
```

Create exactly **three files** inside it:

### `<name>.ts` — Component class

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-<name>',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './<name>.html',
  styleUrl: './<name>.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class <ClassName>Component {
  // component logic here
}
```

Key conventions:
- Always `standalone: true`
- Always `changeDetection: ChangeDetectionStrategy.OnPush`
- If the component needs to trigger re-renders after async work, inject `ChangeDetectorRef` and call `this.cdr.markForCheck()`
- Import `FormsModule` whenever you use `[(ngModel)]`
- Use Angular 17+ control flow syntax (`@if`, `@for`, `@switch`) — **never** `*ngIf` / `*ngFor`

### `<name>.html` — Template

Wrap content in a `<section>` with class `widget-container` (or `calculator-container` for calculators):

```html
<section class="widget-container">
  <h2>Widget Title</h2>
  <p class="description">One-line description of what the widget does.</p>

  <!-- inputs -->

  <!-- @if (errorMessage) { -->
  <!--   <p class="error" role="alert">{{ errorMessage }}</p> -->
  <!-- } -->

  <!-- @if (result) { -->
  <!--   <div class="results" aria-live="polite"> -->
  <!--     ... -->
  <!--   </div> -->
  <!-- } -->
</section>
```

### `<name>.scss` — Styles

Base scaffold to copy and extend:

```scss
.widget-container {
  max-width: 800px;
  margin: 1rem auto;
  padding: 1rem;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

h2 {
  margin: 0;
  color: #1f2937;
}

.description {
  margin-top: 0.4rem;
  color: #4b5563;
}

.inputs-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 220px));
  justify-content: start;
  gap: 0.75rem;
}

.inputs-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
  color: #111827;
}

input[type='number'],
input[type='text'],
select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font-size: 0.95rem;
}

.error {
  margin-top: 0.75rem;
  color: #b91c1c;
  font-weight: 600;
}

.results {
  margin-top: 0.8rem;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  padding: 0.8rem;
}

.result-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.4rem;
  color: #111827;
}

.result-row strong {
  color: #075985;
}

@media (max-width: 768px) {
  .inputs-grid {
    grid-template-columns: repeat(2, minmax(0, 220px));
  }
}

@media (max-width: 480px) {
  .widget-container {
    margin: 0.5rem;
    padding: 0.75rem;
  }

  .inputs-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

---

## Step 3 — Register the component in `src/app/app.ts`

1. Add an import at the top with the other component imports:
   ```typescript
   import { <ClassName>Component } from './components/<category>/<folder>/<name>';
   ```

2. Add the class to the `imports` array of the `@Component` decorator (keep the list alphabetical by class name or grouped by category — match the existing order):
   ```typescript
   imports: [
     // ... existing imports ...
     <ClassName>Component,
     // ...
   ]
   ```

---

## Step 4 — Add the route condition to `src/app/app.html`

Inside the outer `@if (this.settingsService.getSelectedTile() !== null)` block, add a new `@if` for the new widget's tile key, **before** the closing `}`:

```html
@if (this.settingsService.getSelectedTile() === "<tile-key>") {
  <app-<name>></app-<name>>
}
```

---

## Step 5 — Add the tile to `src/app/constants/categories.ts`

Add an entry to the appropriate category's `tiles` array. If the category doesn't exist yet, add a new category object:

```typescript
{
  name: '<Category Name>',
  tiles: [
    {
      title: '<Display Title>',
      description: '<Short description shown on the tile>',
      icon: '<emoji>',
      param: '<tile-key>'
    }
  ]
}
```

The `param` value must exactly match the string used in `app.html`'s `@if` condition.

---

## Step 6 — Build to verify

Run:
```
npm run build
```
from `C:\workspace\utilities`. The build must complete with **exit code 0** (warnings are acceptable, errors are not). Fix any TypeScript or template compilation errors before considering the task done.

---

## Design conventions to follow

- **Color palette**: blues (`#2563eb`, `#1e3a8a`, `#dbeafe`), neutrals (`#1f2937`, `#4b5563`, `#e2e8f0`), error red (`#b91c1c`)
- **Border radius**: `8px` for inputs/buttons, `10px` for cards/containers
- **Buttons**: solid blue (`#2563eb`) for primary actions; outline red for destructive actions
- **Typography**: system font stack (inherited from global styles); `font-weight: 600` for labels; `font-weight: 700` for headings and strong values
- **Spacing unit**: `0.5rem` multiples
- **No external UI libraries** — all styles are hand-written SCSS
- **No routing** — widgets are toggled via `SettingsService`, not Angular Router routes

## File-naming conventions

| Thing | Convention |
|---|---|
| Folder name | `kebab-case` |
| File names | `kebab-case` (e.g. `image-to-pdf.ts`) |
| Selector | `app-<kebab-case>` |
| Class name | `PascalCaseComponent` |
| Tile key (`param`) | `2-4 lowercase letters` (e.g. `itp`, `dsc`, `rac`) |
