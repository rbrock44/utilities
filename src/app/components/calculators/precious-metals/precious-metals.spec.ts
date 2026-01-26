import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreciousMetals } from './precious-metals';

describe('PreciousMetals', () => {
  let component: PreciousMetals;
  let fixture: ComponentFixture<PreciousMetals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreciousMetals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
