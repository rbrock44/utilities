import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TileComponent } from './tile';

describe('TileComponent', () => {
  let component: TileComponent;
  let fixture: ComponentFixture<TileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the pin from the star button', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    fixture.componentRef.setInput('tile', { title: 'JWT Decoder', description: 'Decode', icon: '🔑', param: 'jwt-decoder' });
    fixture.detectChanges();
    const pin = (fixture.nativeElement as HTMLElement).querySelector('.pin') as HTMLButtonElement;

    pin.click();
    fixture.detectChanges();
    expect(component.favorites.isPinned('jwt-decoder')).toBe(true);
    expect(pin.getAttribute('aria-pressed')).toBe('true');
    expect(pin.textContent).toBe('★');
    vi.unstubAllGlobals();
  });
});
