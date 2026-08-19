import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CutListOptimizerComponent } from './cut-list-optimizer';

describe('CutListOptimizerComponent', () => {
  let component: CutListOptimizerComponent;
  let fixture: ComponentFixture<CutListOptimizerComponent>;

  const cutList = (parts: [number, number][]) => {
    component.rows = parts.map(([quantity, length], index) => ({
      id: index + 1,
      quantity,
      length,
      label: `Part ${index + 1}`,
    }));
    component.recalculate();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CutListOptimizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CutListOptimizerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fit whole pieces onto as few boards as possible', () => {
    component.stockLength = 96;
    component.kerf = 0;
    cutList([[4, 30]]);

    // 3 × 30 fits in 96, so four legs take two boards.
    expect(component.plan.boardCount).toBe(2);
    expect(component.plan.pieceCount).toBe(4);
  });

  it('should charge a kerf for every cut after the first on a board', () => {
    component.stockLength = 96;
    component.kerf = 0.125;
    cutList([[3, 32]]);

    // 32 × 3 is exactly 96, so the two kerfs push the third piece onto a second board.
    expect(component.plan.boardCount).toBe(2);
    expect(component.plan.kerfLoss).toBeCloseTo(0.125, 6);
  });

  it('should pack the longest pieces first', () => {
    component.stockLength = 100;
    component.kerf = 0;
    cutList([
      [1, 60],
      [1, 40],
      [1, 55],
      [1, 45],
    ]);

    expect(component.plan.boardCount).toBe(2);
    expect(component.plan.offcutLoss).toBeCloseTo(0, 6);
  });

  it('should subtract the end trim from every board', () => {
    component.stockLength = 96;
    component.kerf = 0;
    component.trimPerEnd = 1;
    cutList([[1, 95]]);

    expect(component.usableLength).toBe(94);
    expect(component.plan.tooLong.length).toBe(1);
    expect(component.plan.boardCount).toBe(0);
  });

  it('should report waste against the stock actually consumed', () => {
    component.stockLength = 100;
    component.kerf = 0;
    cutList([[1, 75]]);

    expect(component.plan.stockUsed).toBe(100);
    expect(component.plan.partLength).toBe(75);
    expect(component.plan.offcutLoss).toBe(25);
    expect(component.plan.wastePercent).toBeCloseTo(25, 6);
    expect(component.plan.longestOffcut).toBe(25);
  });

  it('should collapse boards cut the same way', () => {
    component.stockLength = 96;
    component.kerf = 0;
    cutList([[6, 48]]);

    expect(component.plan.boardCount).toBe(3);
    expect(component.plan.groups.length).toBe(1);
    expect(component.plan.groups[0].count).toBe(3);
  });

  it('should read lengths in feet while the kerf stays in inches', () => {
    component.unit = 'ft';
    component.stockLength = 8;
    component.kerf = 0.125;
    cutList([[2, 4]]);

    expect(component.usableLength).toBe(96);
    // 48 + 0.125 + 48 is over 96, so the pair cannot share a board.
    expect(component.plan.boardCount).toBe(2);
  });

  it('should flag a stock length shorter than the trim', () => {
    component.stockLength = 1;
    component.trimPerEnd = 2;
    component.recalculate();

    expect(component.errorMessage).toBe('Stock length has to be longer than the end trim.');
    expect(component.plan.boardCount).toBe(0);
  });

  it('should count how many boards short the shop is', () => {
    component.stockLength = 96;
    component.kerf = 0;
    component.boardsOnHand = 1;
    cutList([[6, 48]]);

    expect(component.shortBy).toBe(2);
  });

  it('should ignore rows without a quantity or a length', () => {
    component.stockLength = 96;
    cutList([
      [0, 20],
      [2, 0],
      [1, 20],
    ]);

    expect(component.plan.pieceCount).toBe(1);
  });
});
