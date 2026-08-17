import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonFormatterComponent } from './json-formatter';

describe('JsonFormatterComponent', () => {
  let component: JsonFormatterComponent;
  let fixture: ComponentFixture<JsonFormatterComponent>;

  const enter = (text: string) => {
    component.input = text;
    component.validate();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonFormatterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JsonFormatterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept valid JSON', () => {
    enter('{"a":1}');

    expect(component.isValid).toBe(true);
    expect(component.failure).toBeNull();
  });

  it('should pretty-print with the chosen indent', () => {
    enter('{"a":1}');
    component.format();

    expect(component.input).toBe('{\n  "a": 1\n}');
  });

  it('should honour a 4-space indent', () => {
    enter('{"a":1}');
    component.indent = '4';
    component.format();

    expect(component.input).toBe('{\n    "a": 1\n}');
  });

  it('should honour tab indentation', () => {
    enter('{"a":1}');
    component.indent = 'tab';
    component.format();

    expect(component.input).toBe('{\n\t"a": 1\n}');
  });

  it('should minify back to a single line', () => {
    enter('{\n  "a": 1,\n  "b": [1, 2]\n}');
    component.minify();

    expect(component.input).toBe('{"a":1,"b":[1,2]}');
  });

  it('should sort keys recursively when asked', () => {
    enter('{"b":1,"a":{"d":2,"c":3}}');
    component.sortKeys = true;
    component.minify();

    expect(component.input).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('should leave key order alone by default', () => {
    enter('{"b":1,"a":2}');
    component.minify();

    expect(component.input).toBe('{"b":1,"a":2}');
  });

  it('should report the line and column of a syntax error', () => {
    enter('{\n  "a": 1,\n  "b" 2\n}');

    expect(component.isValid).toBe(false);
    expect(component.failure!.line).toBe(3);
    expect(component.failure!.column).toBeGreaterThan(0);
  });

  it('should include a caret snippet pointing at the error', () => {
    enter('{\n  "b" 2\n}');

    expect(component.failure!.snippet).toContain('^');
  });

  it('should survive an error with no position information', () => {
    enter('{');

    expect(component.isValid).toBe(false);
    expect(component.failure).not.toBeNull();
  });

  it('should refuse to format invalid JSON', () => {
    enter('{"a":}');
    const before = component.input;

    component.format();

    expect(component.input).toBe(before);
    expect(component.isValid).toBe(false);
  });

  it('should count keys recursively including nested objects', () => {
    enter('{"a":1,"b":{"c":2,"d":{"e":3}}}');

    expect(component.stats!.keys).toBe(5);
  });

  it('should measure nesting depth', () => {
    enter('{"a":{"b":{"c":1}}}');

    expect(component.stats!.depth).toBe(3);
  });

  it('should describe a top-level array with its length', () => {
    enter('[1,2,3]');

    expect(component.stats!.type).toBe('array of 3');
  });

  it('should handle JSON primitives at the top level', () => {
    enter('42');

    expect(component.isValid).toBe(true);
    expect(component.stats!.depth).toBe(0);
    expect(component.stats!.keys).toBe(0);
  });

  it('should clear state when emptied', () => {
    enter('{"a":1}');
    component.clear();

    expect(component.isValid).toBe(false);
    expect(component.stats).toBeNull();
    expect(component.failure).toBeNull();
  });
});
