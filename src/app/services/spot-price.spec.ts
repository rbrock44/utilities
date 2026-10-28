import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SpotPriceService } from './spot-price';

describe('SpotPriceService', () => {
  let service: SpotPriceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SpotPriceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should read the time the API scraped the prices, and fill in missing metals', () => {
    let prices: SpotPrices | undefined;
    service.getSpotPrices().subscribe(result => (prices = result));

    TestBed.inject(HttpTestingController)
      .expectOne('https://home-page-api.ryan-brock.com/spot-price')
      .flush({ gold: 4000, silver: 50, platinum: 1500, timeStamp: '2026-10-28T18:17:58.118Z' });

    expect(prices).toEqual({
      gold: 4000,
      silver: 50,
      platinum: 1500,
      palladium: -1,
      timestamp: new Date('2026-10-28T18:17:58.118Z'),
    });
  });
});
