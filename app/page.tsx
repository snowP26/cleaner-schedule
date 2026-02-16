

const ROTATION = ['James', 'Mark', 'Jayp', 'Ken', 'Mel', 'Gian', 'JC'];
const CLEANERS_PER_WEEK = 5;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_ZONE = 'Asia/Manila';
const ANCHOR_WEEK_START = Date.UTC(2026, 1, 9);
const ANCHOR_START_INDEX = 0;
const HOLIDAYS: Record<string, string> = {
  '2026-02-17': 'Holiday',
};

function getManilaDateParts(date: Date): { year: number; month: number; day: number } {
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

function getManilaWeekStart(date: Date): Date {
  const { year, month, day } = getManilaDateParts(date);
  const manilaMidnightUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = manilaMidnightUtc.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  manilaMidnightUtc.setUTCDate(manilaMidnightUtc.getUTCDate() + diff);

  return manilaMidnightUtc;
}

function getCurrentWeekCleaners(now: Date): string[] {
  const weekStart = getManilaWeekStart(now).getTime();
  const weeksSinceAnchor = Math.floor((weekStart - ANCHOR_WEEK_START) / (7 * 24 * 60 * 60 * 1000));
  const startIndex = (ANCHOR_START_INDEX + weeksSinceAnchor * CLEANERS_PER_WEEK) % ROTATION.length;
  const cleaners: string[] = [];

  for (let i = 0; i < CLEANERS_PER_WEEK; i++) {
    const cleanerIndex = (startIndex + i) % ROTATION.length;
    cleaners.push(ROTATION[cleanerIndex]);
  }

  return cleaners;
}

function formatDateRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });

  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
}

function formatCardDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function toYmdString(date: Date): string {
  const { year, month, day } = getManilaDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toComparableNumber(date: Date): number {
  const { year, month, day } = getManilaDateParts(date);
  return year * 10000 + month * 100 + day;
}

export default function Home() {
  const now = new Date();
  const weekStart = getManilaWeekStart(now);
  const cleaners = getCurrentWeekCleaners(now);
  const dateRange = formatDateRange(weekStart);
  const todayComparable = toComparableNumber(now);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Cleaners This Week
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {dateRange} (Manila time)
        </p>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cleaners.map((cleaner, index) => {
              const dayDate = new Date(weekStart);
              dayDate.setUTCDate(dayDate.getUTCDate() + index);
              const dayComparable = toComparableNumber(dayDate);
              const isPast = dayComparable < todayComparable;
              const isToday = dayComparable === todayComparable;
              const ymd = toYmdString(dayDate);
              const holidayLabel = HOLIDAYS[ymd];

              const cardClassName = isPast
                ? 'bg-gray-200 text-gray-500'
                : isToday
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-amber-200'
                  : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white';

              return (
                <div
                  key={ymd}
                  className={`flex items-center justify-between p-4 rounded-lg shadow-md ${cardClassName}`}
                >
                  <div>
                    <div className="font-semibold">{WEEKDAYS[index]}</div>
                    <div className="text-xs opacity-80">{formatCardDate(dayDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg">
                      {holidayLabel ? holidayLabel : cleaner}
                    </div>
                    {holidayLabel && (
                      <div className="text-xs opacity-80">No work</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Rotation order: {ROTATION.join(', ')}
        </div>
      </div>
    </main>
  );
}
