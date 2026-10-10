import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailLinkGeneratorComponent } from './email-link-generator';

describe('EmailLinkGeneratorComponent', () => {
  let component: EmailLinkGeneratorComponent;
  let fixture: ComponentFixture<EmailLinkGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailLinkGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailLinkGeneratorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a bare mailto link from just an address', () => {
    component.email = '  someone@example.com ';
    component.generateLink();

    expect(component.generatedLink).toBe('mailto:someone@example.com');
  });

  it('should add encoded cc, bcc, subject, and body in order', () => {
    component.email = 'a@example.com';
    component.cc = 'b@example.com';
    component.bcc = 'c@example.com';
    component.subject = 'Hello & welcome';
    component.body = 'Line one\nLine two';
    component.generateLink();

    expect(component.generatedLink).toBe(
      'mailto:a@example.com?cc=b%40example.com&bcc=c%40example.com' +
      '&subject=Hello%20%26%20welcome&body=Line%20one%0ALine%20two'
    );
  });

  it('should skip blank optional fields', () => {
    component.email = 'a@example.com';
    component.cc = '   ';
    component.subject = 'Hi';
    component.generateLink();

    expect(component.generatedLink).toBe('mailto:a@example.com?subject=Hi');
  });

  it('should produce no link without an address', () => {
    component.subject = 'Hi';
    component.generateLink();

    expect(component.generatedLink).toBe('');
  });

  it('should not copy when there is no link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await component.copyToClipboard();

    expect(writeText).not.toHaveBeenCalled();
    expect(component.justCopied).toBe(false);
  });
});
