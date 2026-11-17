import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolSettingsComponent } from './tool-settings';
import { SettingDefinition, ToolSettingsService } from '../../services/tool-settings';

const DEFINITIONS: SettingDefinition[] = [
  { kind: 'select', key: 'unit', label: 'Unit', default: 'g', options: [{ value: 'g', label: 'g' }, { value: 'dwt', label: 'dwt' }] },
  { kind: 'numbers', key: 'cols', label: 'Columns', default: [100, 90, 80], labels: ['a', 'b', 'c'], min: 1, max: 200, suffix: '%' },
];

describe('ToolSettingsComponent', () => {
  let fixture: ComponentFixture<ToolSettingsComponent>;
  let service: ToolSettingsService;

  const el = () => fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(key: string) => el().querySelector(`[data-setting="${key}"]`) as T;
  const render = () => { fixture.componentRef.changeDetectorRef.markForCheck(); fixture.detectChanges(); };
  const values = () => service.values('tool', DEFINITIONS)();

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    await TestBed.configureTestingModule({ imports: [ToolSettingsComponent] }).compileComponents();
    service = TestBed.inject(ToolSettingsService);
    fixture = TestBed.createComponent(ToolSettingsComponent);
    fixture.componentRef.setInput('param', 'tool');
    fixture.componentRef.setInput('definitions', DEFINITIONS);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should save a picked option', () => {
    const select = field<HTMLSelectElement>('unit');
    select.value = 'dwt';
    select.dispatchEvent(new Event('change'));
    expect(values()['unit']).toBe('dwt');
  });

  it('should save a valid number and put back an invalid one', () => {
    const second = field<HTMLInputElement>('cols-1');
    expect(second.value).toBe('90');

    second.value = '92.5';
    second.dispatchEvent(new Event('change'));
    expect(values()['cols']).toEqual([100, 92.5, 80]);

    second.value = '500';
    second.dispatchEvent(new Event('change'));
    expect(values()['cols']).toEqual([100, 92.5, 80]);
    expect(second.value).toBe('92.5');
  });

  it('should mark changed settings, enable reset only then, and reset them', () => {
    const reset = () => el().querySelector('.reset') as HTMLButtonElement;
    const badges = () => el().querySelectorAll('.changed').length;
    expect(reset().disabled).toBe(true);
    expect(badges()).toBe(0);

    service.set('tool', 'unit', 'dwt');
    render();
    expect(reset().disabled).toBe(false);
    expect(badges()).toBe(1);
    expect(el().querySelector('label .changed')).toBeTruthy();

    reset().click();
    render();
    expect(values()['unit']).toBe('g');
    expect(field<HTMLSelectElement>('unit').value).toBe('g');
    expect(badges()).toBe(0);
  });

  it('should drop its own box and close button when listed on the home page', () => {
    fixture.componentRef.setInput('heading', 'Precious Metals');
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    expect(el().querySelector('h2')?.textContent).toBe('Precious Metals');
    expect(el().querySelector('.close')).toBeNull();
    expect(el().querySelector('.intro')).toBeNull();
  });

  it('should close from the button and on Escape', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    (el().querySelector('.close') as HTMLButtonElement).click();
    el().querySelector('section')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(2);
  });
});
