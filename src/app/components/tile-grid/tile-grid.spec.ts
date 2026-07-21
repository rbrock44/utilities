import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileGridComponent } from './tile-grid';

describe('TileGridComponent', () => {
  let component: TileGridComponent;
  let fixture: ComponentFixture<TileGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileGridComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
