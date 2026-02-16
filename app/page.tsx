'use client';

import { useEffect, useMemo, useState } from 'react';

const ROTATION = ['James', 'Mark', 'Jayp', 'Ken', 'Mel', 'Gian', 'JC'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_ZONE = 'Asia/Manila';
const ANCHOR_WEEK_START = Date.UTC(2026, 1, 9);
const ANCHOR_START_INDEX = 0;
const HOLIDAYS: Record<string, string> = {
  '2026-02-17': 'Holiday',
};
const MANILA_OFFSET_HOURS = 8;

type DayAssignment = {
  date: Date;
  weekday: string;
  cleaner: string | null;
  isHoliday: boolean;
  key: string;
};

type Confirmation = {
  status: 'cleaned' | 'missed';
  cleanedBy?: string;
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

function getManilaHour(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
}

function parseManilaDateTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - MANILA_OFFSET_HOURS, minute));
}

function isWorkingDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  const isWeekday = weekday >= 1 && weekday <= 5;
  const holiday = HOLIDAYS[toYmdString(date)];
  return isWeekday && !holiday;
}

function countWorkingDaysSinceAnchor(anchor: Date, target: Date): number {
  let count = 0;
  const cursor = new Date(anchor);

  while (cursor < target) {
    if (isWorkingDay(cursor)) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

function buildWeekAssignments(weekStart: Date, startIndex: number): DayAssignment[] {
  const assignments: DayAssignment[] = [];
  let rotationIndex = startIndex;

  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    const dayDate = new Date(weekStart);
    dayDate.setUTCDate(dayDate.getUTCDate() + i);
    const key = toYmdString(dayDate);
    const isHoliday = Boolean(HOLIDAYS[key]);
    const cleaner = isHoliday ? null : ROTATION[rotationIndex % ROTATION.length];

    if (!isHoliday) {
      rotationIndex += 1;
    }

    assignments.push({
      date: dayDate,
      weekday: WEEKDAYS[i],
      cleaner,
      isHoliday,
      key,
    });
  }

  return assignments;
}

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [assignments, setAssignments] = useState<DayAssignment[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [simulatedNow, setSimulatedNow] = useState('');
  const [substitutes, setSubstitutes] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveNow = useMemo(() => {
    const parsed = parseManilaDateTime(simulatedNow);
    return parsed ?? now;
  }, [now, simulatedNow]);

  const weekStart = useMemo(() => getManilaWeekStart(effectiveNow), [effectiveNow]);
  const workingDaysSinceAnchor = useMemo(
    () => countWorkingDaysSinceAnchor(new Date(ANCHOR_WEEK_START), weekStart),
    [weekStart]
  );
  const rotationStartIndex = useMemo(
    () => (ANCHOR_START_INDEX + workingDaysSinceAnchor) % ROTATION.length,
    [workingDaysSinceAnchor]
  );
  const baseAssignments = useMemo(
    () => buildWeekAssignments(weekStart, rotationStartIndex),
    [weekStart, rotationStartIndex]
  );
  const dateRange = useMemo(() => formatDateRange(weekStart), [weekStart]);
  const todayComparable = useMemo(() => toComparableNumber(effectiveNow), [effectiveNow]);
  const manilaHour = useMemo(() => getManilaHour(effectiveNow), [effectiveNow]);

  useEffect(() => {
    setAssignments(baseAssignments);
  }, [baseAssignments]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedScores = window.localStorage.getItem('cleanerScores');
    const storedConfirmations = window.localStorage.getItem('cleanerConfirmations');

    if (storedScores) {
      setScores(JSON.parse(storedScores) as Record<string, number>);
    } else {
      setScores(
        ROTATION.reduce((acc, name) => {
          acc[name] = 0;
          return acc;
        }, {} as Record<string, number>)
      );
    }

    if (storedConfirmations) {
      setConfirmations(JSON.parse(storedConfirmations) as Record<string, Confirmation>);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('cleanerScores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('cleanerConfirmations', JSON.stringify(confirmations));
  }, [confirmations]);

  const handleConfirmation = (key: string, didClean: boolean, cleanedBy?: string) => {
    const assignedCleaner = assignments.find((day) => day.key === key)?.cleaner ?? undefined;
    const resolvedCleaner = didClean ? cleanedBy ?? assignedCleaner : cleanedBy;

    setConfirmations((previous) => {
      if (previous[key]) {
        return previous;
      }
      return {
        ...previous,
        [key]: {
          status: didClean ? 'cleaned' : 'missed',
          cleanedBy: resolvedCleaner,
        },
      };
    });

    if (didClean) {
      if (resolvedCleaner) {
        setScores((previous) => ({
          ...previous,
          [resolvedCleaner]: (previous[resolvedCleaner] ?? 0) + 1,
        }));
      }
    }

    if (!didClean) {
      if (resolvedCleaner) {
        setScores((previous) => ({
          ...previous,
          [resolvedCleaner]: (previous[resolvedCleaner] ?? 0) + 1,
        }));
      }

      setAssignments((previous) => {
        const currentIndex = previous.findIndex((day) => day.key === key);
        if (currentIndex === -1) {
          return previous;
        }

        const currentDay = previous[currentIndex];
        if (!currentDay.cleaner) {
          return previous;
        }

        let nextIndex = -1;
        for (let i = currentIndex + 1; i < previous.length; i += 1) {
          if (previous[i].cleaner) {
            nextIndex = i;
            break;
          }
        }

        if (nextIndex === -1) {
          return previous;
        }

        const updated = previous.map((day) => ({ ...day }));
        const temp = updated[currentIndex].cleaner;
        updated[currentIndex].cleaner = updated[nextIndex].cleaner;
        updated[nextIndex].cleaner = temp;

        return updated;
      });
    }
  };

  const leaderboard = useMemo(() => {
    return ROTATION
      .map((name) => ({ name, score: scores[name] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [scores]);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Cleaners This Week
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {dateRange} (Manila time)
        </p>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Test Time (Manila)
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="datetime-local"
                value={simulatedNow}
                onChange={(event) => setSimulatedNow(event.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSimulatedNow('2026-02-16T16:00')}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                >
                  Mon 4 PM
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedNow('2026-02-16T18:00')}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                >
                  Mon 6 PM
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedNow('2026-02-23T10:00')}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                >
                  Next Monday
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedNow('')}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Simulates Manila time without changing your system clock.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignments.map((day) => {
              const dayComparable = toComparableNumber(day.date);
              const isPast = dayComparable < todayComparable;
              const isToday = dayComparable === todayComparable;
              const isHoliday = day.isHoliday;
              const confirmation = confirmations[day.key];
              const showConfirmation = isToday && manilaHour >= 17 && !isHoliday;
              const showCleanerConfirm = isToday && !isHoliday && !confirmation;
              const substitute = substitutes[day.key] ?? '';

              const cardClassName = isPast
                ? 'bg-gray-200 text-gray-500'
                : isToday
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-amber-200'
                  : isHoliday
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white';

              return (
                <div
                  key={day.key}
                  className={`flex flex-col gap-3 p-4 rounded-lg shadow-md ${cardClassName}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{day.weekday}</div>
                      <div className="text-xs opacity-80">{formatCardDate(day.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg">
                        {isHoliday ? 'Holiday' : day.cleaner}
                      </div>
                      {isHoliday && (
                        <div className="text-xs opacity-80">No work</div>
                      )}
                    </div>
                  </div>

                  {confirmation && (
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {confirmation.status === 'cleaned'
                        ? `Confirmed${confirmation.cleanedBy ? ` (${confirmation.cleanedBy})` : ''}`
                        : `Not cleaned${confirmation.cleanedBy ? ` (cleaned by ${confirmation.cleanedBy})` : ''}`}
                    </span>
                  )}

                  {showCleanerConfirm && (
                    <button
                      type="button"
                      onClick={() => handleConfirmation(day.key, true, day.cleaner ?? undefined)}
                      className="px-3 py-1 rounded-full bg-white/90 text-gray-800 text-xs font-semibold"
                    >
                      Cleaner: I cleaned
                    </button>
                  )}

                  {showConfirmation && !confirmation && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <select
                          value={substitute}
                          onChange={(event) =>
                            setSubstitutes((previous) => ({
                              ...previous,
                              [day.key]: event.target.value,
                            }))
                          }
                          className="px-2 py-1 rounded-md text-xs text-gray-800"
                        >
                          <option value="">Select who cleaned</option>
                          {ROTATION.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleConfirmation(day.key, true, day.cleaner ?? undefined)}
                          className="px-3 py-1 rounded-full bg-white/90 text-gray-800 text-xs font-semibold"
                        >
                          Confirmed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmation(day.key, false, substitute || undefined)}
                          disabled={!substitute}
                          className="px-3 py-1 rounded-full bg-white/90 text-gray-800 text-xs font-semibold"
                        >
                          Not cleaned
                        </button>
                      </div>
                      <span className="text-[11px] opacity-80">Visible after 5 PM</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            All-Time Leaderboard
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <span className="font-semibold text-gray-800">{entry.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Rotation order: {ROTATION.join(', ')}
        </div>
      </div>
    </main>
  );
}
