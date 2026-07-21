import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';

import { SettingsService } from './settings';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideLocationMocks()]
    });
    service = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with no selected tile', () => {
    expect(service.getSelectedTile()).toBeNull();
  });

  it('should store the selected tile', () => {
    service.setSelectedTile('calculator');
    expect(service.getSelectedTile()).toBe('calculator');
  });

  it('should treat an empty tile as no selection', () => {
    service.setSelectedTile('calculator');
    service.setSelectedTile('');
    expect(service.getSelectedTile()).toBeNull();
  });

  it('should clear the selection when called with no argument', () => {
    service.setSelectedTile('calculator');
    service.setSelectedTile();
    expect(service.getSelectedTile()).toBeNull();
  });
});
