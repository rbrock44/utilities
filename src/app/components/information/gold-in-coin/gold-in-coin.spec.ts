import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoldInCoinComponent } from './gold-in-coin';

describe('GoldInCoinComponent', () => {
  let component: GoldInCoinComponent;
  let fixture: ComponentFixture<GoldInCoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldInCoinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoldInCoinComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
