import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CleaningPayoutCalculatorComponent } from './cleaning-payout-calculator';
import { CleaningScheduleService } from '../../../services/cleaning-schedule';

type ViewModel = ReturnType<CleaningPayoutCalculatorComponent['toViewModel']>;

class MockCleaningScheduleService {
  meetings: Meeting[] = [];
  error = false;

  getMeetings() {
    return this.error ? throwError(() => new Error('boom')) : of(this.meetings);
  }
}

describe('CleaningPayoutCalculatorComponent', () => {
  let component: CleaningPayoutCalculatorComponent;
  let fixture: ComponentFixture<CleaningPayoutCalculatorComponent>;
  let service: MockCleaningScheduleService;
  let nextId: number;

  const meeting = (overrides: Partial<Meeting> = {}): Meeting => ({
    id: nextId++,
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '11:00',
    title: 'Bo',
    person: 'Ryan',
    hasBeenPaid: false,
    ...overrides,
  });

  /** Runs a raw `Meeting` through the component's own view-model conversion. */
  const vm = (overrides: Partial<Meeting> = {}): ViewModel =>
    component['toViewModel'](meeting(overrides));

  beforeEach(async () => {
    nextId = 1;
    service = new MockCleaningScheduleService();

    await TestBed.configureTestingModule({
      imports: [CleaningPayoutCalculatorComponent],
      providers: [{ provide: CleaningScheduleService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(CleaningPayoutCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('duration and date parsing', () => {
    it('should compute the hours between two times', () => {
      expect(component['calculateDurationHours']('09:00', '11:00')).toBe(2);
      expect(component['calculateDurationHours']('13:00', '15:30')).toBe(2.5);
    });

    it('should treat a shift that crosses midnight as wrapping to the next day', () => {
      expect(component['calculateDurationHours']('23:00', '01:00')).toBe(2);
    });

    it('should treat an unparsable time as zero duration', () => {
      expect(component['calculateDurationHours']('not-a-time', '11:00')).toBe(0);
      expect(component['calculateDurationHours']('09', '11:00')).toBe(0);
    });

    it('should parse a plain date string', () => {
      // A date-only string parses as UTC midnight, so read it back with the UTC getters —
      // local getters would drift a day in any timezone behind UTC.
      const parsed = component['parseDate']('2026-06-15');
      expect(parsed?.getUTCFullYear()).toBe(2026);
      expect(parsed?.getUTCMonth()).toBe(5);
      expect(parsed?.getUTCDate()).toBe(15);
    });

    it('should return null for a date that cannot be parsed at all', () => {
      expect(component['parseDate']('not a date')).toBeNull();
    });
  });

  describe('payout arithmetic', () => {
    it('should pay a flat amount per meeting under perMeeting billing', () => {
      component.titleRateConfigs = { Bo: { amount: 100, billingMode: 'perMeeting' } };
      const entry = vm({ title: 'Bo', startTime: '09:00', endTime: '15:00' });

      expect(component['getMeetingPayoutAmount']('Bo', entry)).toBe(100);
    });

    it('should scale with duration under perHour billing', () => {
      component.titleRateConfigs = { 'Deep Clean': { amount: 20, billingMode: 'perHour' } };
      const entry = vm({ title: 'Deep Clean', startTime: '13:00', endTime: '15:30' });

      expect(component['getMeetingPayoutAmount']('Deep Clean', entry)).toBe(50);
    });

    it('should use a dated rate once the meeting falls inside its window', () => {
      component.titleRateConfigs = {
        Bo: {
          amount: 100,
          billingMode: 'perMeeting',
          datedRates: [{ startDate: '2026-06-01', amount: 120 }],
        },
      };

      const before = vm({ title: 'Bo', date: '2026-05-15' });
      const after = vm({ title: 'Bo', date: '2026-06-15' });

      expect(component['getMeetingPayoutAmount']('Bo', before)).toBe(100);
      expect(component['getMeetingPayoutAmount']('Bo', after)).toBe(120);
    });

    it('should fall outside a dated rate that has already ended', () => {
      component.titleRateConfigs = {
        Bo: {
          amount: 100,
          billingMode: 'perMeeting',
          datedRates: [{ startDate: '2026-01-01', endDate: '2026-03-31', amount: 90 }],
        },
      };

      const inWindow = vm({ title: 'Bo', date: '2026-02-01' });
      const afterWindow = vm({ title: 'Bo', date: '2026-04-15' });

      expect(component['getMeetingPayoutAmount']('Bo', inWindow)).toBe(90);
      expect(component['getMeetingPayoutAmount']('Bo', afterWindow)).toBe(100);
    });

    it('should prefer the most recently started dated rate among overlapping windows', () => {
      component.titleRateConfigs = {
        Bo: {
          amount: 100,
          billingMode: 'perMeeting',
          datedRates: [
            { startDate: '2026-01-01', amount: 110 },
            { startDate: '2026-06-01', amount: 120 },
          ],
        },
      };

      const entry = vm({ title: 'Bo', date: '2026-08-01' });

      expect(component['getMeetingPayoutAmount']('Bo', entry)).toBe(120);
    });

    it('should let a dated rate override the billing mode too', () => {
      component.titleRateConfigs = {
        Bo: {
          amount: 100,
          billingMode: 'perMeeting',
          datedRates: [{ startDate: '2026-01-01', amount: 20, billingMode: 'perHour' }],
        },
      };

      const entry = vm({ title: 'Bo', date: '2026-02-01', startTime: '09:00', endTime: '12:00' });

      expect(component['getMeetingPayoutAmount']('Bo', entry)).toBe(60);
    });

    it('should treat an open start or end date as unbounded', () => {
      expect(component['toDateBoundaryTime'](undefined, false)).toBe(Number.NEGATIVE_INFINITY);
      expect(component['toDateBoundaryTime'](undefined, true)).toBe(Number.POSITIVE_INFINITY);
      expect(component['toDateBoundaryTime']('', true)).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('recalculate', () => {
    it('should total owed and paid per person, split out by title', () => {
      component.titleRateConfigs = {
        Bo: { amount: 100, billingMode: 'perMeeting' },
        'Deep Clean': { amount: 20, billingMode: 'perHour' },
      };
      component['allMeetings'] = [
        vm({ title: 'Bo', person: 'Ryan', hasBeenPaid: true }),
        vm({ title: 'Bo', person: 'Ryan', hasBeenPaid: false }),
        vm({
          title: 'Deep Clean',
          person: 'Ryan',
          startTime: '13:00',
          endTime: '15:00',
          hasBeenPaid: true,
        }),
      ];

      component.recalculate();

      expect(component.personSummaries.length).toBe(1);
      const ryan = component.personSummaries[0];
      expect(ryan.person).toBe('Ryan');
      expect(ryan.totalOwed).toBe(240);
      expect(ryan.totalPaid).toBe(140);
      expect(ryan.remainingBalance).toBe(100);

      const bo = ryan.titleSummaries.find((t) => t.title === 'Bo')!;
      expect(bo.meetingCount).toBe(2);
      expect(bo.paidMeetingCount).toBe(1);
      expect(bo.totalOwed).toBe(200);
      expect(bo.totalPaid).toBe(100);

      expect(component.grandTotals.totalOwed).toBe(240);
      expect(component.grandTotals.totalPaid).toBe(140);
      expect(component.grandTotals.remainingBalance).toBe(100);
    });

    it('should sort people and titles alphabetically', () => {
      component.titleRateConfigs = { Bo: { amount: 10, billingMode: 'perMeeting' } };
      component['allMeetings'] = [
        vm({ title: 'Bo', person: 'Taylor' }),
        vm({ title: 'Bo', person: 'Morgan' }),
      ];

      component.recalculate();

      expect(component.personSummaries.map((p) => p.person)).toEqual(['Morgan', 'Taylor']);
    });

    it('should fall back to placeholder names for blank person or title', () => {
      component.titleRateConfigs = {};
      component['allMeetings'] = [vm({ title: '  ', person: '  ' })];

      component.recalculate();

      expect(component.personSummaries[0].person).toBe('Unknown Person');
      expect(component.personSummaries[0].titleSummaries[0].title).toBe('Untitled');
    });

    it('should filter by year, month and person before totaling', () => {
      // Day 15 keeps the local date well clear of the UTC-parsed midnight boundary.
      component.titleRateConfigs = { Bo: { amount: 10, billingMode: 'perMeeting' } };
      component['allMeetings'] = [
        vm({ title: 'Bo', person: 'Ryan', date: '2025-03-15' }),
        vm({ title: 'Bo', person: 'Ryan', date: '2026-03-15' }),
        vm({ title: 'Bo', person: 'Taylor', date: '2026-03-15' }),
        vm({ title: 'Bo', person: 'Ryan', date: '2026-07-15' }),
      ];

      component.selectedYearFilter = 2026;
      component.selectedMonthFilterMonth = 2; // March
      component.selectedPersonFilter = 'Ryan';
      component.recalculate();

      expect(component.personSummaries.length).toBe(1);
      expect(component.personSummaries[0].person).toBe('Ryan');
      expect(component.personSummaries[0].titleSummaries[0].meetingCount).toBe(1);
    });

    it('should drop meetings whose date could not be parsed', () => {
      component.titleRateConfigs = { Bo: { amount: 10, billingMode: 'perMeeting' } };
      component['allMeetings'] = [vm({ title: 'Bo', date: 'garbage' })];

      component.recalculate();

      expect(component.personSummaries).toEqual([]);
    });

    it('should order a person meetings by date and then by start time', () => {
      component.titleRateConfigs = { Bo: { amount: 10, billingMode: 'perMeeting' } };
      component['allMeetings'] = [
        vm({ title: 'Bo', date: '2026-01-02', startTime: '08:00' }),
        vm({ title: 'Bo', date: '2026-01-01', startTime: '09:00' }),
        vm({ title: 'Bo', date: '2026-01-01', startTime: '08:00' }),
      ];

      component.recalculate();

      expect(component.personSummaries[0].meetings.map((m) => `${m.date} ${m.startTime}`)).toEqual([
        '2026-01-01 08:00',
        '2026-01-01 09:00',
        '2026-01-02 08:00',
      ]);
    });
  });

  describe('loading meetings', () => {
    it('should populate year, month and person filters from the loaded meetings', () => {
      const currentYear = new Date().getFullYear();
      service.meetings = [
        meeting({ title: 'Bo', person: 'Ryan', date: `${currentYear}-01-10` }),
        meeting({ title: 'Bo', person: 'Taylor', date: `${currentYear}-06-20` }),
        meeting({ title: 'Bo', person: 'Ryan', date: `${currentYear - 1}-03-05` }),
      ];

      component.loadMeetings();

      expect(component.loading).toBe(false);
      expect(component.availableYears).toEqual([currentYear, currentYear - 1]);
      expect(component.selectedYearFilter).toBe(currentYear);
      expect(component.availableMonthOptions.map((m) => m.value)).toEqual([0, 5]);
      expect(component.availablePeople).toEqual(['Ryan', 'Taylor']);
    });

    it('should leave the year filter unset when the current year has no meetings', () => {
      service.meetings = [meeting({ date: '2020-01-10' })];

      component.loadMeetings();

      expect(component.selectedYearFilter).toBeNull();
      expect(component.availableYears).toEqual([2020]);
    });

    it('should default a newly seen title to a zero perMeeting rate', () => {
      service.meetings = [meeting({ title: 'Brand New Title' })];

      component.loadMeetings();

      expect(component.titleRateConfigs['Brand New Title']).toEqual({
        amount: 0,
        billingMode: 'perMeeting',
      });
    });

    it('should reset state and report an error when loading fails', () => {
      service.error = true;

      component.loadMeetings();

      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('Unable to load meetings right now.');
      expect(component.personSummaries).toEqual([]);
      expect(component.grandTotals).toEqual({
        totalOwed: 0,
        totalPaid: 0,
        remainingBalance: 0,
      });
    });

    it('should drop people who are no longer available after the year changes', () => {
      const currentYear = new Date().getFullYear();
      service.meetings = [
        meeting({ person: 'Ryan', date: `${currentYear}-01-10` }),
        meeting({ person: 'Taylor', date: `${currentYear - 1}-01-10` }),
      ];
      component.loadMeetings();
      component.selectedPersonFilter = 'Ryan';

      component.selectedYearFilter = currentYear - 1;
      component.onSelectedYearChange();

      expect(component.availablePeople).toEqual(['Taylor']);
      expect(component.selectedPersonFilter).toBeNull();
    });
  });

  describe('formatting and UI state', () => {
    it('should format a number as US currency', () => {
      expect(component.toCurrency(1234.5)).toBe('$1,234.50');
      expect(component.toCurrency(0)).toBe('$0.00');
    });

    it('should toggle a person meetings expanded state', () => {
      expect(component.isMeetingsExpanded('Ryan')).toBe(false);

      component.toggleMeetings('Ryan');
      expect(component.isMeetingsExpanded('Ryan')).toBe(true);

      component.toggleMeetings('Ryan');
      expect(component.isMeetingsExpanded('Ryan')).toBe(false);
    });

    it('should clamp an invalid rate amount back to zero', () => {
      component.titleRateConfigs = { Bo: { amount: -5, billingMode: 'perMeeting' } };

      component.updateRateAmount('Bo', -5);

      expect(component.titleRateConfigs['Bo'].amount).toBe(0);
    });

    it('should leave a valid rate amount alone', () => {
      component.titleRateConfigs = { Bo: { amount: 75, billingMode: 'perMeeting' } };

      component.updateRateAmount('Bo', 75);

      expect(component.titleRateConfigs['Bo'].amount).toBe(75);
    });

    it('should switch billing mode from the checkbox helper', () => {
      component.titleRateConfigs = { Bo: { amount: 10, billingMode: 'perMeeting' } };

      component.updateBillingModeFromCheckbox('Bo', false);
      expect(component.titleRateConfigs['Bo'].billingMode).toBe('perHour');

      component.updateBillingModeFromCheckbox('Bo', true);
      expect(component.titleRateConfigs['Bo'].billingMode).toBe('perMeeting');
    });
  });
});
