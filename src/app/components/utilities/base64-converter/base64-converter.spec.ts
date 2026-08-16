import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Base64ConverterComponent } from './base64-converter';

describe('Base64ConverterComponent', () => {
  let component: Base64ConverterComponent;
  let fixture: ComponentFixture<Base64ConverterComponent>;

  const enter = (text: string) => {
    component.input = text;
    component.convert();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Base64ConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Base64ConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should encode plain text', () => {
    enter('Hello');

    expect(component.output).toBe('SGVsbG8=');
    expect(component.errorMessage).toBeNull();
  });

  it('should decode plain text', () => {
    component.setDirection('decode');
    enter('SGVsbG8=');

    expect(component.output).toBe('Hello');
  });

  it('should round-trip multi-byte characters', () => {
    const original = 'héllo 😀 世界';
    enter(original);
    const encoded = component.output;

    component.setDirection('decode');
    enter(encoded);

    expect(component.output).toBe(original);
  });

  it('should produce a URL-safe alphabet when asked', () => {
    component.urlSafe = true;
    enter('ÿÿÿ~');

    expect(component.output).not.toContain('+');
    expect(component.output).not.toContain('/');
    expect(component.output).not.toContain('=');
  });

  it('should decode URL-safe input without padding', () => {
    component.setDirection('decode');
    enter('SGVsbG8');

    expect(component.output).toBe('Hello');
  });

  it('should ignore whitespace and line breaks when decoding', () => {
    component.setDirection('decode');
    enter('SGVs\nbG8=');

    expect(component.output).toBe('Hello');
  });

  it('should reject input that is not Base64', () => {
    component.setDirection('decode');
    enter('not base64!!');

    expect(component.output).toBe('');
    expect(component.errorMessage).toContain('valid Base64');
  });

  it('should report when decoded bytes are not valid UTF-8', () => {
    component.setDirection('decode');
    enter('//4=');

    expect(component.output).toBe('');
    expect(component.errorMessage).toContain('UTF-8');
  });

  it('should swap the result back into the input and flip direction', () => {
    enter('Hello');
    component.swap();

    expect(component.input).toBe('SGVsbG8=');
    expect(component.direction).toBe('decode');
    expect(component.output).toBe('Hello');
  });

  it('should clear text state', () => {
    enter('Hello');
    component.clearText();

    expect(component.input).toBe('');
    expect(component.output).toBe('');
  });

  it('should empty the output when the input is emptied', () => {
    enter('Hello');
    enter('');

    expect(component.output).toBe('');
    expect(component.errorMessage).toBeNull();
  });
});
