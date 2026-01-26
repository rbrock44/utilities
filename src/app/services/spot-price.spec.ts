import { TestBed } from '@angular/core/testing';

import { SpotPrice } from './spot-price';

describe('SpotPrice', () => {
  let service: SpotPrice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpotPrice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
