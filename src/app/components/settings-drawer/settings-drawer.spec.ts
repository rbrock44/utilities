import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsDrawerComponent } from './settings-drawer';

@Component({
  standalone: true,
  imports: [SettingsDrawerComponent],
  template: `
    <button class="opener" (click)="open.set(true)">open</button>
    @if (open()) {
      <app-settings-drawer heading="Tool settings" (closed)="open.set(false)"><p class="content">form</p></app-settings-drawer>
    }
  `,
})
class HostComponent {
  readonly open = signal(false);
}

describe('SettingsDrawerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const el = () => fixture.nativeElement as HTMLElement;
  const opener = () => el().querySelector('.opener') as HTMLButtonElement;
  const openDrawer = async () => {
    opener().focus();
    opener().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('should show its heading and content as a dialog, focusing the close button', async () => {
    await openDrawer();
    const dialog = el().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('h2')?.textContent).toBe('Tool settings');
    expect(dialog.querySelector('.content')).toBeTruthy();
    expect(document.activeElement).toBe(el().querySelector('.close'));
  });

  it('should close on Escape and give focus back to the opener', async () => {
    await openDrawer();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el().querySelector('app-settings-drawer')).toBeNull();
    expect(document.activeElement).toBe(opener());
  });

  it('should close from the backdrop', async () => {
    await openDrawer();
    (el().querySelector('.backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(el().querySelector('app-settings-drawer')).toBeNull();
  });
});
