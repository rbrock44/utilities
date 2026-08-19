import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CronTranslatorComponent } from './cron-translator';

describe('CronTranslatorComponent', () => {
  let component: CronTranslatorComponent;
  let fixture: ComponentFixture<CronTranslatorComponent>;

  const describeCron = (expression: string) => {
    component.expression = expression;
    component.translate();
    return component.description;
  };

  const runsFor = (expression: string, from: Date, count = 3) => {
    const parsed = component.parse(expression);
    expect(parsed).not.toBeNull();
    return component.nextRuns(parsed!, from, count);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CronTranslatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CronTranslatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expand every field of an expression', () => {
    const parsed = component.parse('0 9-11 1,15 */3 mon-fri')!;

    expect(parsed.minutes.values).toEqual([0]);
    expect(parsed.hours.values).toEqual([9, 10, 11]);
    expect(parsed.daysOfMonth.values).toEqual([1, 15]);
    expect(parsed.months.values).toEqual([1, 4, 7, 10]);
    expect(parsed.daysOfWeek.values).toEqual([1, 2, 3, 4, 5]);
  });

  it('should treat day 7 and SUN as the same day', () => {
    expect(component.parse('0 0 * * 7')!.daysOfWeek.values).toEqual([0]);
    expect(component.parse('0 0 * * sun')!.daysOfWeek.values).toEqual([0]);
  });

  it('should expand macros', () => {
    expect(describeCron('@daily')).toBe('At 00:00, every day.');
    expect(describeCron('@weekly')).toBe('At 00:00, on Sunday.');
  });

  it('should describe minute and hour patterns', () => {
    expect(describeCron('* * * * *')).toBe('Every minute, every day.');
    expect(describeCron('*/5 * * * *')).toBe('Every 5 minutes, every day.');
    expect(describeCron('30 * * * *')).toBe('At minute 30 of every hour, every day.');
    expect(describeCron('0 9 * * *')).toBe('At 09:00, every day.');
  });

  it('should describe days and months', () => {
    expect(describeCron('0 9 * * 1-5')).toBe(
      'At 09:00, on Monday, Tuesday, Wednesday, Thursday, and Friday.'
    );
    expect(describeCron('0 0 1 1 *')).toBe('At 00:00, on the 1st, in January.');
    expect(describeCron('0 0 2 * *')).toBe('At 00:00, on the 2nd.');
  });

  it('should read a sixth field as seconds', () => {
    component.expression = '30 0 9 * * *';
    component.translate();

    expect(component.hasSeconds).toBe(true);
    expect(component.fields[0].name).toBe('Second');
    expect(component.parse('30 0 9 * * *')!.seconds.values).toEqual([30]);
  });

  it('should reject expressions it cannot run', () => {
    component.expression = '0 9 * *';
    component.translate();
    expect(component.errorMessage).toBe('Expected 5 fields (or 6 with seconds), found 4.');

    component.expression = '0 99 * * *';
    component.translate();
    expect(component.errorMessage).toBe('hour values have to be between 0 and 23.');

    component.expression = '0 0 L * *';
    component.translate();
    expect(component.errorMessage).toBe('Quartz extensions (L, W, #) are not supported.');

    component.expression = '@fortnightly';
    component.translate();
    expect(component.errorMessage).toContain('not a cron macro');
  });

  it('should list the next runs of a daily schedule', () => {
    const runs = runsFor('0 9 * * *', new Date(2026, 0, 1, 10, 0, 0));

    expect(runs.map((run) => run.toISOString())).toEqual([
      new Date(2026, 0, 2, 9, 0, 0).toISOString(),
      new Date(2026, 0, 3, 9, 0, 0).toISOString(),
      new Date(2026, 0, 4, 9, 0, 0).toISOString(),
    ]);
  });

  it('should step through a stepped minute schedule', () => {
    const runs = runsFor('*/15 * * * *', new Date(2026, 0, 1, 10, 7, 30));

    expect(runs.map((run) => run.getMinutes())).toEqual([15, 30, 45]);
  });

  it('should fire when either day field matches', () => {
    const runs = runsFor('0 0 13 * 5', new Date(2026, 1, 1, 0, 0, 0), 4);

    // February 2026: Fridays fall on the 6th, 13th, 20th, and 27th, so the 13th is
    // counted once even though both fields match it.
    expect(runs.map((run) => run.getDate())).toEqual([6, 13, 20, 27]);
  });

  it('should walk to a once-a-year schedule without giving up', () => {
    const runs = runsFor('0 0 29 2 *', new Date(2026, 5, 1, 0, 0, 0), 2);

    expect(runs.map((run) => run.getFullYear())).toEqual([2028, 2032]);
    expect(runs[0].getMonth()).toBe(1);
    expect(runs[0].getDate()).toBe(29);
  });

  it('should place seconds inside the matching minute', () => {
    const runs = runsFor('15,45 0 9 * * *', new Date(2026, 0, 1, 8, 0, 0), 3);

    expect(runs.map((run) => [run.getHours(), run.getMinutes(), run.getSeconds()])).toEqual([
      [9, 0, 15],
      [9, 0, 45],
      [9, 0, 15],
    ]);
  });
});
