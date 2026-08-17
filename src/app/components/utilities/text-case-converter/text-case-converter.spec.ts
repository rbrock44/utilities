import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextCaseConverterComponent } from './text-case-converter';

describe('TextCaseConverterComponent', () => {
  let component: TextCaseConverterComponent;
  let fixture: ComponentFixture<TextCaseConverterComponent>;

  const enter = (text: string) => {
    component.input = text;
    component.compute();
  };

  const cased = (key: string) => component.results.find((result) => result.key === key)?.value;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextCaseConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextCaseConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should convert a plain phrase into every identifier case', () => {
    enter('hello world example');

    expect(cased('camel')).toBe('helloWorldExample');
    expect(cased('pascal')).toBe('HelloWorldExample');
    expect(cased('snake')).toBe('hello_world_example');
    expect(cased('kebab')).toBe('hello-world-example');
    expect(cased('constant')).toBe('HELLO_WORLD_EXAMPLE');
  });

  it('should split an existing camelCase identifier', () => {
    enter('helloWorldExample');

    expect(cased('snake')).toBe('hello_world_example');
    expect(cased('kebab')).toBe('hello-world-example');
  });

  it('should split snake_case back into other conventions', () => {
    enter('hello_world_example');

    expect(cased('camel')).toBe('helloWorldExample');
    expect(cased('pascal')).toBe('HelloWorldExample');
  });

  it('should keep acronyms together when splitting humps', () => {
    enter('parseHTTPResponse');

    expect(cased('snake')).toBe('parse_http_response');
    expect(cased('pascal')).toBe('ParseHttpResponse');
  });

  it('should treat any punctuation as a word boundary', () => {
    enter('hello.world/example');

    expect(cased('kebab')).toBe('hello-world-example');
  });

  it('should apply lowercase and uppercase to the whole text', () => {
    enter('Hello World');

    expect(cased('lower')).toBe('hello world');
    expect(cased('upper')).toBe('HELLO WORLD');
  });

  it('should title-case each word while keeping punctuation', () => {
    enter('the quick brown fox.');

    expect(cased('title')).toBe('The Quick Brown Fox.');
  });

  it('should sentence-case after terminating punctuation', () => {
    enter('first sentence. second sentence! third one?');

    expect(cased('sentence')).toBe('First sentence. Second sentence! Third one?');
  });

  it('should fold accents in the slug but keep them in kebab-case', () => {
    enter('Héllo Wörld');

    expect(cased('slug')).toBe('hello-world');
    expect(cased('kebab')).toBe('héllo-wörld');
  });

  it('should count characters, words, lines, and bytes', () => {
    enter('hello world\nsecond line');

    expect(component.counts.characters).toBe(23);
    expect(component.counts.words).toBe(4);
    expect(component.counts.lines).toBe(2);
    expect(component.counts.withoutSpaces).toBe(20);
  });

  it('should count an emoji as a single character but several bytes', () => {
    enter('😀');

    expect(component.counts.characters).toBe(1);
    expect(component.counts.bytes).toBe(4);
  });

  it('should report zero words for whitespace-only input', () => {
    enter('   \n  ');

    expect(component.counts.words).toBe(0);
    expect(component.results.length).toBe(0);
  });

  it('should clear everything', () => {
    enter('hello world');
    component.clear();

    expect(component.input).toBe('');
    expect(component.results.length).toBe(0);
    expect(component.counts.characters).toBe(0);
  });
});
