import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

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
});
