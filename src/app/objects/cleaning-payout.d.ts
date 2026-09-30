type BillingMode = 'perMeeting' | 'perHour';

type TitleDatedRate = {
  startDate?: string;
  endDate?: string;
  amount: number;
  billingMode?: BillingMode;
};

type TitleRateConfig = {
  amount: number;
  billingMode: BillingMode;
  datedRates?: TitleDatedRate[];
};

type MeetingViewModel = Meeting & {
  isPaid: boolean;
  durationHours: number;
  parsedDate: Date | null;
};

type TitleSummary = {
  title: string;
  meetingCount: number;
  totalHours: number;
  paidMeetingCount: number;
  totalOwed: number;
  totalPaid: number;
  remainingBalance: number;
};

type PersonSummary = {
  person: string;
  titleSummaries: TitleSummary[];
  meetings: MeetingViewModel[];
  totalOwed: number;
  totalPaid: number;
  remainingBalance: number;
};
