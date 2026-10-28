import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GoldInCoinComponent } from './gold-in-coin';
import { SpotPriceService } from '../../../services/spot-price';

describe('GoldInCoinComponent', () => {
  let component: GoldInCoinComponent;
  let fixture: ComponentFixture<GoldInCoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldInCoinComponent],
      providers: [{ provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold: 2000, silver: 25, timestamp: new Date() }) } }],
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
