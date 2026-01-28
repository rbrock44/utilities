import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilverInCoinComponent } from './silver-in-coin';

describe('SilverInCoinComponent', () => {
  let component: SilverInCoinComponent;
  let fixture: ComponentFixture<SilverInCoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilverInCoinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SilverInCoinComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
