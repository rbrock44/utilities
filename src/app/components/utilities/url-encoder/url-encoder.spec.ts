import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlEncoderComponent } from './url-encoder';

describe('UrlEncoderComponent', () => {
  let component: UrlEncoderComponent;
  let fixture: ComponentFixture<UrlEncoderComponent>;

  const enterText = (text: string) => {
    component.text = text;
    component.convert();
  };

  const enterUrl = (text: string) => {
    component.urlInput = text;
    component.parseUrl();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrlEncoderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UrlEncoderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should escape reserved characters in component scope', () => {
    enterText('a b&c=d/e');

    expect(component.textOutput).toBe('a%20b%26c%3Dd%2Fe');
  });

  it('should keep reserved characters in full-URI scope', () => {
    component.scope = 'full';
    enterText('https://example.com/a b?q=1&r=2');

    expect(component.textOutput).toBe('https://example.com/a%20b?q=1&r=2');
  });

  it('should decode percent-encoded text', () => {
    component.setDirection('decode');
    enterText('a%20b%26c');

    expect(component.textOutput).toBe('a b&c');
  });

  it('should treat + as a space when asked', () => {
    component.setDirection('decode');
    component.plusAsSpace = true;
    enterText('hello+world');

    expect(component.textOutput).toBe('hello world');
  });

  it('should keep + literal when the option is off', () => {
    component.setDirection('decode');
    component.plusAsSpace = false;
    enterText('hello+world');

    expect(component.textOutput).toBe('hello+world');
  });

  it('should report malformed percent-encoding', () => {
    component.setDirection('decode');
    enterText('%E0%A4%A');

    expect(component.textOutput).toBe('');
    expect(component.textError).toBeTruthy();
  });

  it('should round-trip multi-byte characters', () => {
    enterText('héllo 😀');
    const encoded = component.textOutput;

    component.setDirection('decode');
    enterText(encoded);

    expect(component.textOutput).toBe('héllo 😀');
  });

  it('should swap the output back into the input and flip direction', () => {
    enterText('a b');
    component.swap();

    expect(component.text).toBe('a%20b');
    expect(component.direction).toBe('decode');
    expect(component.textOutput).toBe('a b');
  });

  it('should break a URL into its parts', () => {
    enterUrl('https://example.com:8443/search/deep?q=hello#results');

    const value = (label: string) => component.parts.find((part) => part.label === label)?.value;
    expect(value('Protocol')).toBe('https');
    expect(value('Host')).toBe('example.com');
    expect(value('Port')).toBe('8443');
    expect(value('Path')).toBe('/search/deep');
    expect(value('Fragment')).toBe('results');
  });

  it('should omit URL parts that are empty', () => {
    enterUrl('https://example.com/');

    expect(component.parts.some((part) => part.label === 'Port')).toBe(false);
  });

  it('should assume https when no protocol is given', () => {
    enterUrl('example.com/path');

    expect(component.assumedProtocol).toBe(true);
    expect(component.urlError).toBeNull();
    expect(component.rebuiltUrl).toBe('https://example.com/path');
  });

  it('should decode query parameter values', () => {
    enterUrl('https://example.com/?q=hello+world&page=2');

    expect(component.params).toEqual([
      { key: 'q', value: 'hello world' },
      { key: 'page', value: '2' },
    ]);
  });

  it('should rebuild the URL when a parameter is edited', () => {
    enterUrl('https://example.com/?q=hello&page=2');
    component.params[1].value = '5';

    expect(component.rebuiltUrl).toBe('https://example.com/?q=hello&page=5');
  });

  it('should drop a removed parameter from the rebuilt URL', () => {
    enterUrl('https://example.com/?q=hello&page=2');
    component.removeParam(1);

    expect(component.rebuiltUrl).toBe('https://example.com/?q=hello');
  });

  it('should ignore parameters with a blank name', () => {
    enterUrl('https://example.com/?q=hello');
    component.addParam();

    expect(component.rebuiltUrl).toBe('https://example.com/?q=hello');
  });

  it('should drop the question mark when every parameter is removed', () => {
    enterUrl('https://example.com/?q=hello');
    component.removeParam(0);

    expect(component.rebuiltUrl).toBe('https://example.com/');
  });

  it('should reject text that is not a URL', () => {
    enterUrl('http://');

    expect(component.urlError).toBeTruthy();
    expect(component.parts.length).toBe(0);
  });
});
