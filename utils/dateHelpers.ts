import { TIME_ZONE } from '@/lib/constants';

export function getManilaDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  return { year, month, day };
}

export function getManilaWeekStart(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  const manilaMidnightUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = manilaMidnightUtc.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  manilaMidnightUtc.setUTCDate(manilaMidnightUtc.getUTCDate() + diff);
  return manilaMidnightUtc;
}

export function formatDateRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
}

export function formatCardDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function toYmdString(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toComparableNumber(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  return year * 10000 + month * 100 + day;
}