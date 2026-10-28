import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SilverInCoinComponent } from './silver-in-coin';
import { SpotPriceService } from '../../../services/spot-price';

describe('SilverInCoinComponent', () => {
  let component: SilverInCoinComponent;
  let fixture: ComponentFixture<SilverInCoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilverInCoinComponent],
      providers: [{ provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold: 2000, silver: 25, timestamp: new Date() }) } }],
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
