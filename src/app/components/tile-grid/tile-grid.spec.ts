import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileGrid } from './tile-grid';

describe('TileGrid', () => {
  let component: TileGrid;
  let fixture: ComponentFixture<TileGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
