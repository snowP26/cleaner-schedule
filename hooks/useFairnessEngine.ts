import { useMemo } from 'react';
import { ROTATION, WEEKDAYS, ANCHOR_WEEK_START, ANCHOR_START_INDEX } from '@/lib/constants';
import { DayAssignment, Confirmation } from '@/lib/types';
import { toYmdString, getManilaDateParts } from '@/utils/dateHelpers';

export function useFairnessEngine(weekStart: Date, confirmations: Record<string, Confirmation>, viewDate: Date) {
  
  const adjustedAssignments = useMemo(() => {
    const assignments: DayAssignment[] = [];
    let cursor = new Date(ANCHOR_WEEK_START);
    
    const targetEnd = new Date(weekStart);
    targetEnd.setUTCDate(targetEnd.getUTCDate() + 5); 

    let rotationIndex = ANCHOR_START_INDEX;

    while (cursor <= targetEnd) {
      const key = toYmdString(cursor);
      const weekdayVal = cursor.getUTCDay();
      const isWeekday = weekdayVal >= 1 && weekdayVal <= 5;

      const confirmation = confirmations[key];
      const isHoliday = confirmation?.status === 'holiday';
      const holidayName = confirmation?.holidayName;

      let displayCleaner = null;
      let statusLabel = null;

      if (isWeekday && !isHoliday) {
        const plannedCleaner = ROTATION[rotationIndex % ROTATION.length];
        rotationIndex++; 
        
        const actualCleaner = confirmation?.cleanedBy ?? plannedCleaner;
        displayCleaner = actualCleaner;

        if (confirmation?.cleanedBy === 'All') {
            statusLabel = `Group Sub for ${plannedCleaner}`;
            rotationIndex--; // Pause rotation
        } else if (confirmation?.cleanedBy && confirmation.cleanedBy !== plannedCleaner) {
            statusLabel = `Subbed for ${plannedCleaner}`;
        }
      }

      if (cursor >= weekStart && cursor < targetEnd && isWeekday) {
        assignments.push({
          date: new Date(cursor),
          weekday: WEEKDAYS[weekdayVal - 1],
          displayCleaner,
          statusLabel,
          isHoliday,
          holidayName,
          key
        });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return assignments;
  }, [weekStart, confirmations]);

  const leaderboard = useMemo(() => {
    const scores: Record<string, number> = {};
    ROTATION.forEach(name => { scores[name] = 0; });
    
    // 1. Figure out what month we are currently viewing
    const { year, month } = getManilaDateParts(viewDate);
    // Creates a prefix like "2026-03" (or "2026-02" if viewing last month)
    const targetMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    // 2. Loop through entries so we can check the date key
    Object.entries(confirmations).forEach(([key, conf]) => {
      // Ignore records that don't belong to the currently viewed month
      if (!key.startsWith(targetMonthPrefix)) return;

      if ((conf.status === 'cleaned' || conf.status === 'subbed') && conf.cleanedBy) {
        if (conf.cleanedBy === 'All') {
          ROTATION.forEach(name => { scores[name] += 1; });
        } else {
          scores[conf.cleanedBy] = (scores[conf.cleanedBy] || 0) + 1;
        }
      }
    });

    return ROTATION
      .map((name) => ({ name, score: scores[name] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [confirmations, viewDate]);

  return { adjustedAssignments, leaderboard };
}