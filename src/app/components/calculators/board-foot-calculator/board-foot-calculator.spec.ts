import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardFootCalculatorComponent } from './board-foot-calculator';

describe('BoardFootCalculatorComponent', () => {
  let component: BoardFootCalculatorComponent;
  let fixture: ComponentFixture<BoardFootCalculatorComponent>;

  const setFirstRow = (
    values: Partial<{
      quantity: number;
      thickness: number;
      width: number;
      length: number;
      lengthUnit: 'in' | 'ft';
      pricePerBoardFoot: number;
    }>
  ) => {
    Object.assign(component.rows[0], values);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardFootCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoardFootCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate board feet for a single 2x4x8', () => {
    setFirstRow({ quantity: 1, thickness: 2, width: 4, length: 8, lengthUnit: 'ft' });

    // 2 x 4 x 96 / 144 = 5.333
    expect(component.boardFeet(component.rows[0])).toBeCloseTo(5.3333, 3);
  });

  it('should treat a 1x12x12in board as one board foot', () => {
    setFirstRow({ quantity: 1, thickness: 1, width: 12, length: 12, lengthUnit: 'in' });

    expect(component.boardFeet(component.rows[0])).toBeCloseTo(1, 6);
  });

  it('should multiply by quantity', () => {
    setFirstRow({ quantity: 3, thickness: 2, width: 4, length: 8, lengthUnit: 'ft' });

    expect(component.boardFeet(component.rows[0])).toBeCloseTo(16, 4);
  });

  it('should treat feet and equivalent inches identically', () => {
    setFirstRow({ quantity: 1, thickness: 2, width: 6, length: 10, lengthUnit: 'ft' });
    const inFeet = component.boardFeet(component.rows[0]);

    setFirstRow({ length: 120, lengthUnit: 'in' });
    const inInches = component.boardFeet(component.rows[0]);

    expect(inInches).toBeCloseTo(inFeet, 6);
  });

  it('should calculate linear feet independent of thickness and width', () => {
    setFirstRow({ quantity: 4, thickness: 2, width: 12, length: 8, lengthUnit: 'ft' });

    expect(component.linearFeet(component.rows[0])).toBeCloseTo(32, 4);
  });

  it('should return zero for incomplete rows rather than NaN', () => {
    setFirstRow({ thickness: 0, width: 4, length: 8 });
    expect(component.boardFeet(component.rows[0])).toBe(0);

    setFirstRow({ thickness: 2, width: -1 });
    expect(component.boardFeet(component.rows[0])).toBe(0);
  });

  it('should total board feet across rows', () => {
    setFirstRow({ quantity: 1, thickness: 2, width: 4, length: 8, lengthUnit: 'ft' });
    component.addRow({ label: '1×6', thickness: 1, width: 6 });
    Object.assign(component.rows[1], { quantity: 1, length: 8, lengthUnit: 'ft' });

    expect(component.totalBoardFeet).toBeCloseTo(5.3333 + 4, 3);
  });

  it('should apply the waste factor to the total', () => {
    setFirstRow({ quantity: 1, thickness: 1, width: 12, length: 12, lengthUnit: 'in' });
    component.wastePercent = 10;

    expect(component.boardFeetWithWaste).toBeCloseTo(1.1, 6);
    expect(component.hasWaste).toBe(true);
  });

  it('should ignore a zero or negative waste factor', () => {
    setFirstRow({ quantity: 1, thickness: 1, width: 12, length: 12, lengthUnit: 'in' });
    component.wastePercent = 0;

    expect(component.boardFeetWithWaste).toBeCloseTo(1, 6);
    expect(component.hasWaste).toBe(false);
  });

  it('should cost a row by price per board foot', () => {
    setFirstRow({
      quantity: 1,
      thickness: 1,
      width: 12,
      length: 12,
      lengthUnit: 'in',
      pricePerBoardFoot: 6.5,
    });

    expect(component.rowCost(component.rows[0])).toBeCloseTo(6.5, 4);
    expect(component.hasCost).toBe(true);
  });

  it('should apply waste to the cost as well', () => {
    setFirstRow({
      quantity: 1,
      thickness: 1,
      width: 12,
      length: 12,
      lengthUnit: 'in',
      pricePerBoardFoot: 10,
    });
    component.wastePercent = 25;

    expect(component.costWithWaste).toBeCloseTo(12.5, 4);
  });

  it('should report no cost when no price is entered', () => {
    setFirstRow({ pricePerBoardFoot: 0 });

    expect(component.hasCost).toBe(false);
    expect(component.totalCost).toBe(0);
  });

  it('should add a row prefilled from a nominal size', () => {
    component.addRow({ label: '2×10', thickness: 2, width: 10 });
    const added = component.rows[component.rows.length - 1];

    expect(added.thickness).toBe(2);
    expect(added.width).toBe(10);
  });

  it('should count total pieces', () => {
    setFirstRow({ quantity: 5 });
    component.addRow();
    component.rows[1].quantity = 3;

    expect(component.pieceCount).toBe(8);
  });

  it('should keep one row after removing the last one', () => {
    component.removeRow(component.rows[0].id);

    expect(component.rows.length).toBe(1);
  });
});
