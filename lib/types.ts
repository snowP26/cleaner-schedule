export type DayAssignment = {
  date: Date;
  weekday: string;
  displayCleaner: string | null;
  statusLabel: string | null;
  isHoliday: boolean;
  holidayName?: string;
  key: string;
};

export type Confirmation = {
  status: 'cleaned' | 'missed' | 'holiday' | 'subbed';
  cleanedBy?: string;
  holidayName?: string;
};

export type LeaderboardEntry = {
  name: string;
  score: number;
};