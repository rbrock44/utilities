import { ComponentFixture, TestBed } from '@angular/core/testing';
import axe from 'axe-core';

import { TileGridComponent } from './components/tile-grid/tile-grid';
import { TileComponent } from './components/tile/tile';
import { CategoryComponent } from './components/category/category';

/**
 * The rules that actually mean something under jsdom. Most of axe's visual checks
 * (color-contrast, focus-order-semantics, etc.) need real layout and paint, which jsdom
 * does not provide — they report as "incomplete" rather than pass/fail and would only add
 * noise here. The aria/role/name/structure rules below are exactly what this repo's 161
 * aria/role attributes are meant to keep correct, and they run fully in jsdom.
 */
const RUN_ONLY = {
  runOnly: {
    type: 'rule' as const,
    values: [
      'aria-allowed-attr',
      'aria-allowed-role',
      'aria-command-name',
      'aria-hidden-body',
      'aria-hidden-focus',
      'aria-input-field-name',
      'aria-required-attr',
      'aria-required-children',
      'aria-required-parent',
      'aria-roles',
      'aria-toggle-field-name',
      'aria-valid-attr',
      'aria-valid-attr-value',
      'button-name',
      'duplicate-id',
      'duplicate-id-aria',
      'form-field-multiple-labels',
      'heading-order',
      'image-alt',
      'input-button-name',
      'label',
      'landmark-unique',
      'link-name',
      'list',
      'listitem',
      'role-img-alt',
    ],
  },
};

/** Runs axe against an element and fails with the rule ids and offending selectors. */
async function expectNoViolations(element: HTMLElement): Promise<void> {
  const results = await axe.run(element, RUN_ONLY);
  const summary = results.violations
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n');
  expect(results.violations, summary).toEqual([]);
}

describe('accessibility', () => {
  describe('TileGridComponent', () => {
    let fixture: ComponentFixture<TileGridComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TileGridComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TileGridComponent);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should render the full widget dashboard with no aria/role violations', async () => {
      await expectNoViolations(fixture.nativeElement as HTMLElement);
    });

    it('should still pass once a search narrows the visible tiles', async () => {
      fixture.componentInstance.searchTerm = 'convert';
      fixture.detectChanges();
      await fixture.whenStable();

      await expectNoViolations(fixture.nativeElement as HTMLElement);
    });
  });

  describe('CategoryComponent', () => {
    it('should render a category of tiles with no aria/role violations', async () => {
      const fixture: ComponentFixture<CategoryComponent> = TestBed.createComponent(
        CategoryComponent
      );
      fixture.componentInstance.category = {
        name: 'Sample category',
        tiles: [
          { title: 'First tool', description: 'Does the first thing', icon: '🔧', param: 'a' },
          { title: 'Second tool', description: 'Does the second thing', icon: '⚙️', param: 'b' },
        ],
      };
      fixture.detectChanges();
      await fixture.whenStable();

      await expectNoViolations(fixture.nativeElement as HTMLElement);
    });
  });

  describe('TileComponent', () => {
    it('should render a single tile with no aria/role violations', async () => {
      const fixture: ComponentFixture<TileComponent> = TestBed.createComponent(TileComponent);
      fixture.componentInstance.tile = {
        title: 'JWT Decoder',
        description: 'Decode a JSON Web Token',
        icon: '🔑',
        param: 'jwt-decoder',
      };
      fixture.detectChanges();
      await fixture.whenStable();

      await expectNoViolations(fixture.nativeElement as HTMLElement);
    });
  });
});
