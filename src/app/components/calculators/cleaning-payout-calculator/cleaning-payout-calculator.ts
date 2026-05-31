import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CleaningScheduleService } from '../../../services/cleaning-schedule';

@Component({
  selector: 'app-cleaning-payout-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cleaning-payout-calculator.html',
  styleUrl: './cleaning-payout-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CleaningPayoutCalculatorComponent implements OnInit {
  loading = false;
  errorMessage: string | null = null;
  expandedPeople = new Set<string>();
  availableYears: number[] = [];
  availableMonthOptions: Array<{ value: number; label: string }> = [];
  availablePeople: string[] = [];
  selectedYearFilter: number | null = null;
  selectedMonthFilterMonth: number | null = null;
  selectedPersonFilter: string | null = null;

  private readonly monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];
  private monthsByYear = new Map<number, number[]>();

  private allMeetings: MeetingViewModel[] = [];

  personSummaries: PersonSummary[] = [];

  titleRateConfigs: Record<string, TitleRateConfig> = {
    // TODO: Fill out your title defaults here.
    Bo: {
      amount: 100,
      billingMode: 'perMeeting',
      // datedRates: [
      //   // Supports single effective date or date range overrides.
      //   { startDate: '2026-06-01', amount: 120, billingMode: 'perMeeting' }
      // ]
    }
  };

  grandTotals = {
    totalOwed: 0,
    totalPaid: 0,
    remainingBalance: 0
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private meetingScheduleService: CleaningScheduleService
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.loading = true;
    this.errorMessage = null;

    this.meetingScheduleService.getMeetings().subscribe({
      next: (meetings) => {
        this.allMeetings = meetings.map((meeting) => this.toViewModel(meeting));
        this.initializeDateFilters();
        this.ensureTitleConfigDefaults();
        this.recalculate();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load meetings right now.';
        this.personSummaries = [];
        this.resetGrandTotals();
        this.cdr.markForCheck();
      }
    });
  }

  onSelectedYearChange(): void {
    this.syncAvailableMonthsForSelectedYear();
    this.selectedMonthFilterMonth = null;
    this.syncAvailablePeopleForCurrentDateFilters();
    this.selectedPersonFilter = null;
    this.recalculate();
    this.cdr.markForCheck();
  }

  onSelectedMonthChange(): void {
    this.syncAvailablePeopleForCurrentDateFilters();
    this.selectedPersonFilter = null;
    this.recalculate();
    this.cdr.markForCheck();
  }

  onSelectedPersonChange(): void {
    this.recalculate();
    this.cdr.markForCheck();
  }

  toggleMeetings(person: string): void {
    if (this.expandedPeople.has(person)) {
      this.expandedPeople.delete(person);
    } else {
      this.expandedPeople.add(person);
    }
  }

  isMeetingsExpanded(person: string): boolean {
    return this.expandedPeople.has(person);
  }

  recalculate(): void {
    const filteredMeetings = this.getFilteredMeetings();
    const personMap = new Map<string, MeetingViewModel[]>();

    for (const meeting of filteredMeetings) {
      const personKey = meeting.person.trim() || 'Unknown Person';
      const meetingsForPerson = personMap.get(personKey) ?? [];
      meetingsForPerson.push(meeting);
      personMap.set(personKey, meetingsForPerson);
    }

    const summaries: PersonSummary[] = [];

    for (const [person, meetings] of personMap.entries()) {
      const titleMap = new Map<string, MeetingViewModel[]>();

      for (const meeting of meetings) {
        const titleKey = meeting.title.trim() || 'Untitled';
        const meetingsForTitle = titleMap.get(titleKey) ?? [];
        meetingsForTitle.push(meeting);
        titleMap.set(titleKey, meetingsForTitle);
      }

      const titleSummaries: TitleSummary[] = [];

      for (const [title, titleMeetings] of titleMap.entries()) {
        this.ensureSingleTitleConfig(title);

        const totalHours = titleMeetings.reduce((total, meeting) => total + meeting.durationHours, 0);
        const paidMeetings = titleMeetings.filter((meeting) => meeting.isPaid);
        const paidMeetingCount = paidMeetings.length;

        const totalOwed = titleMeetings.reduce((sum, meeting) => {
          return sum + this.getMeetingPayoutAmount(title, meeting);
        }, 0);

        const totalPaid = paidMeetings.reduce((sum, meeting) => {
          return sum + this.getMeetingPayoutAmount(title, meeting);
        }, 0);

        titleSummaries.push({
          title,
          meetingCount: titleMeetings.length,
          totalHours,
          paidMeetingCount,
          totalOwed,
          totalPaid,
          remainingBalance: totalOwed - totalPaid
        });
      }

      titleSummaries.sort((a, b) => a.title.localeCompare(b.title));

      const totalOwed = titleSummaries.reduce((sum, summary) => sum + summary.totalOwed, 0);
      const totalPaid = titleSummaries.reduce((sum, summary) => sum + summary.totalPaid, 0);

      summaries.push({
        person,
        titleSummaries,
        meetings: [...meetings].sort((a, b) => this.compareMeetings(a, b)),
        totalOwed,
        totalPaid,
        remainingBalance: totalOwed - totalPaid
      });
    }

    this.personSummaries = summaries.sort((a, b) => a.person.localeCompare(b.person));

    this.grandTotals.totalOwed = this.personSummaries.reduce((sum, summary) => sum + summary.totalOwed, 0);
    this.grandTotals.totalPaid = this.personSummaries.reduce((sum, summary) => sum + summary.totalPaid, 0);
    this.grandTotals.remainingBalance = this.grandTotals.totalOwed - this.grandTotals.totalPaid;
  }

  toCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  updateRateAmount(title: string, amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      this.titleRateConfigs[title].amount = 0;
    }

    this.recalculate();
    this.cdr.markForCheck();
  }

  updateBillingMode(title: string, billingMode: BillingMode): void {
    this.titleRateConfigs[title].billingMode = billingMode;
    this.recalculate();
    this.cdr.markForCheck();
  }

  updateBillingModeFromCheckbox(title: string, isPerMeeting: boolean): void {
    this.titleRateConfigs[title].billingMode = isPerMeeting ? 'perMeeting' : 'perHour';
    this.recalculate();
    this.cdr.markForCheck();
  }

  private resetGrandTotals(): void {
    this.grandTotals = {
      totalOwed: 0,
      totalPaid: 0,
      remainingBalance: 0
    };
  }

  private getFilteredMeetings(): MeetingViewModel[] {
    return this.getDateFilteredMeetings().filter((meeting) => {
      if (this.selectedPersonFilter !== null && meeting.person !== this.selectedPersonFilter) {
        return false;
      }

      return true;
    });
  }

  private getDateFilteredMeetings(): MeetingViewModel[] {
    return this.allMeetings.filter((meeting) => {
      if (!meeting.parsedDate) {
        return false;
      }

      const meetingYear = meeting.parsedDate.getFullYear();
      const meetingMonth = meeting.parsedDate.getMonth();

      if (this.selectedYearFilter !== null && meetingYear !== this.selectedYearFilter) {
        return false;
      }

      if (this.selectedMonthFilterMonth !== null && meetingMonth !== this.selectedMonthFilterMonth) {
        return false;
      }

      return true;
    });
  }

  private initializeDateFilters(): void {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>();
    const monthsByYear = new Map<number, Set<number>>();

    for (const meeting of this.allMeetings) {
      if (meeting.parsedDate) {
        const year = meeting.parsedDate.getFullYear();
        const month = meeting.parsedDate.getMonth();
        yearSet.add(year);

        if (!monthsByYear.has(year)) {
          monthsByYear.set(year, new Set<number>());
        }

        monthsByYear.get(year)?.add(month);
      }
    }

    this.availableYears = Array.from(yearSet).sort((a, b) => b - a);
    this.monthsByYear = new Map<number, number[]>();

    for (const [year, months] of monthsByYear.entries()) {
      this.monthsByYear.set(year, Array.from(months).sort((a, b) => a - b));
    }

    if (this.availableYears.length === 0) {
      this.selectedYearFilter = null;
      this.selectedMonthFilterMonth = null;
      this.selectedPersonFilter = null;
      this.availableMonthOptions = [];
      this.availablePeople = [];
      return;
    }

    this.selectedYearFilter = this.availableYears.includes(currentYear) ? currentYear : null;
    this.selectedMonthFilterMonth = null;
    this.selectedPersonFilter = null;
    this.syncAvailableMonthsForSelectedYear();
    this.syncAvailablePeopleForCurrentDateFilters();
  }

  private syncAvailableMonthsForSelectedYear(): void {
    const months = this.selectedYearFilter === null
      ? this.getAllAvailableMonths()
      : (this.monthsByYear.get(this.selectedYearFilter) ?? []);

    this.availableMonthOptions = months
      .map((month) => this.monthOptions.find((option) => option.value === month))
      .filter((option): option is { value: number; label: string } => option !== undefined);
  }

  private getAllAvailableMonths(): number[] {
    const monthSet = new Set<number>();

    for (const months of this.monthsByYear.values()) {
      for (const month of months) {
        monthSet.add(month);
      }
    }

    return Array.from(monthSet).sort((a, b) => a - b);
  }

  private syncAvailablePeopleForCurrentDateFilters(): void {
    const peopleSet = new Set<string>();

    for (const meeting of this.getDateFilteredMeetings()) {
      peopleSet.add(meeting.person.trim() || 'Unknown Person');
    }

    this.availablePeople = Array.from(peopleSet).sort((a, b) => a.localeCompare(b));

    if (
      this.selectedPersonFilter !== null &&
      !this.availablePeople.includes(this.selectedPersonFilter)
    ) {
      this.selectedPersonFilter = null;
    }
  }

  private toViewModel(meeting: Meeting): MeetingViewModel {
    return {
      ...meeting,
      isPaid: meeting.hasBeenPaid ?? false,
      durationHours: this.calculateDurationHours(meeting.startTime, meeting.endTime),
      parsedDate: this.parseDate(meeting.date)
    };
  }

  private parseDate(dateValue: string): Date | null {
    const parsedDate = new Date(dateValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    const fallback = new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  private calculateDurationHours(startTime: string, endTime: string): number {
    const startMinutes = this.toMinutes(startTime);
    const endMinutes = this.toMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return 0;
    }

    let diff = endMinutes - startMinutes;
    if (diff < 0) {
      diff += 24 * 60;
    }

    return diff / 60;
  }

  private toMinutes(timeValue: string): number | null {
    const parts = timeValue.split(':').map((part) => Number(part));
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
      return null;
    }

    return (parts[0] * 60) + parts[1];
  }

  private ensureTitleConfigDefaults(): void {
    const titles = new Set(this.allMeetings.map((meeting) => meeting.title));
    for (const title of titles) {
      this.ensureSingleTitleConfig(title);
    }
  }

  private ensureSingleTitleConfig(title: string): void {
    if (!this.titleRateConfigs[title]) {
      this.titleRateConfigs[title] = {
        amount: 0,
        billingMode: 'perMeeting'
      };
    }
  }

  private getMeetingPayoutAmount(title: string, meeting: MeetingViewModel): number {
    const resolvedRate = this.resolveRateForMeeting(title, meeting);

    if (resolvedRate.billingMode === 'perMeeting') {
      return resolvedRate.amount;
    }

    return meeting.durationHours * resolvedRate.amount;
  }

  private resolveRateForMeeting(
    title: string,
    meeting: MeetingViewModel
  ): { amount: number; billingMode: BillingMode } {
    const titleConfig = this.titleRateConfigs[title];
    const defaultRate = {
      amount: titleConfig.amount,
      billingMode: titleConfig.billingMode
    };

    if (!meeting.parsedDate || !titleConfig.datedRates || titleConfig.datedRates.length === 0) {
      return defaultRate;
    }

    const meetingTime = meeting.parsedDate.getTime();
    let bestMatch: { amount: number; billingMode: BillingMode; startTime: number } | null = null;

    for (const datedRate of titleConfig.datedRates) {
      const startTime = this.toDateBoundaryTime(datedRate.startDate, false);
      const endTime = this.toDateBoundaryTime(datedRate.endDate, true);

      if (meetingTime < startTime || meetingTime > endTime) {
        continue;
      }

      const candidate = {
        amount: datedRate.amount,
        billingMode: datedRate.billingMode ?? defaultRate.billingMode,
        startTime
      };

      if (!bestMatch || candidate.startTime > bestMatch.startTime) {
        bestMatch = candidate;
      }
    }

    if (!bestMatch) {
      return defaultRate;
    }

    return {
      amount: bestMatch.amount,
      billingMode: bestMatch.billingMode
    };
  }

  private toDateBoundaryTime(dateValue: string | undefined, endOfDay: boolean): number {
    if (!dateValue || dateValue.trim() === '') {
      return endOfDay ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }

    const normalized = endOfDay ? `${dateValue}T23:59:59.999` : `${dateValue}T00:00:00.000`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return endOfDay ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }

    return parsed.getTime();
  }

  private compareMeetings(a: MeetingViewModel, b: MeetingViewModel): number {
    if (a.parsedDate && b.parsedDate) {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
    }

    return a.startTime.localeCompare(b.startTime);
  }
}
