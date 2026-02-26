'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURATION ---
const ROTATION = ['James', 'Mark', 'Jayp', 'Ken', 'Mel', 'Gian', 'JC'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_ZONE = 'Asia/Manila';
const ANCHOR_WEEK_START = Date.UTC(2026, 1, 9); // Feb 9, 2026
const ANCHOR_START_INDEX = 0;

// --- TYPES ---
type DayAssignment = {
  date: Date;
  weekday: string;
  displayCleaner: string | null;
  statusLabel: string | null;
  isHoliday: boolean;
  holidayName?: string;
  key: string;
};

type Confirmation = {
  status: 'cleaned' | 'missed' | 'holiday' | 'subbed';
  cleanedBy?: string;
  holidayName?: string;
};

// --- HELPER FUNCTIONS ---
function getManilaDateParts(date: Date) {
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

function getManilaWeekStart(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  const manilaMidnightUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = manilaMidnightUtc.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  manilaMidnightUtc.setUTCDate(manilaMidnightUtc.getUTCDate() + diff);
  return manilaMidnightUtc;
}

function formatDateRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
}

function formatCardDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function toYmdString(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toComparableNumber(date: Date) {
  const { year, month, day } = getManilaDateParts(date);
  return year * 10000 + month * 100 + day;
}

// --- MAIN COMPONENT ---
export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>({});
  const [substitutes, setSubstitutes] = useState<Record<string, string>>({});
  const [holidayInputs, setHolidayInputs] = useState<Record<string, string>>({});

  // 1. Clock Tick
  useEffect(() => {
    setNow(new Date()); 
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. DATABASE: Load Data
  useEffect(() => {
    const fetchConfirmations = async () => {
      const { data, error } = await supabase.from('confirmations').select('*');
      if (error) {
        console.error('Error loading data:', error);
        return;
      }
      
      const map: Record<string, Confirmation> = {};
      data?.forEach((row: any) => {
        map[row.date_key] = {
          status: row.status,
          cleanedBy: row.cleaned_by,
          holidayName: row.holiday_name,
        };
      });
      setConfirmations(map);
    };

    fetchConfirmations();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confirmations' },
        () => fetchConfirmations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- DERIVED STATE ---
  const weekStart = useMemo(() => getManilaWeekStart(viewDate), [viewDate]);
  const dateRange = useMemo(() => formatDateRange(weekStart), [weekStart]);
  
  const todayDate = now || new Date();
  const todayComparable = useMemo(() => toComparableNumber(todayDate), [todayDate]);
  const timeString = useMemo(() => {
    if (!now) return '--:--:--';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);
  }, [now]);

  // --- 🔥 THE "FAIRNESS" ENGINE 🔥 ---
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

        // Triggers the Covering logic (Simplified: No Debt Ledger)
        if (confirmation?.cleanedBy === 'All') {
            statusLabel = `Group Sub for ${plannedCleaner}`;
            
            // Pause the rotation! The person who was subbed out is pushed to the next day.
            rotationIndex--;

        } else if (confirmation?.cleanedBy && confirmation.cleanedBy !== plannedCleaner) {
            // Normal subbing: Point goes to the sub, schedule continues normally tomorrow.
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

// --- SCORING ---
  const scores = useMemo(() => {
    const calculated: Record<string, number> = {};
    ROTATION.forEach(name => { calculated[name] = 0; });
    
    Object.values(confirmations).forEach((conf) => {
      if ((conf.status === 'cleaned' || conf.status === 'subbed') && conf.cleanedBy) {
        if (conf.cleanedBy === 'All') {
          ROTATION.forEach(name => {
            calculated[name] += 1;
          });
        } else {
          calculated[conf.cleanedBy] = (calculated[conf.cleanedBy] || 0) + 1;
        }
      }
    });
    return calculated;
  }, [confirmations]);

  const leaderboard = useMemo(() => {
    return ROTATION
      .map((name) => ({ name, score: scores[name] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [scores]);

  // --- HANDLERS ---
  const handleConfirmation = async (
    key: string, 
    status: 'cleaned' | 'missed' | 'holiday' | 'subbed' | null, 
    cleanedBy?: string, 
    holidayName?: string
  ) => {
    setConfirmations((prev) => {
      const next = { ...prev };
      if (status === null) {
        delete next[key];
      } else {
        next[key] = { 
          status, 
          cleanedBy: (status === 'cleaned' || status === 'subbed') ? cleanedBy : undefined,
          holidayName: status === 'holiday' ? holidayName : undefined
        };
      }
      return next;
    });

    if (status === null) {
      await supabase.from('confirmations').delete().eq('date_key', key);
    } else {
      await supabase.from('confirmations').upsert({
        date_key: key,
        status: status,
        cleaned_by: (status === 'cleaned' || status === 'subbed') ? cleanedBy : null,
        holiday_name: status === 'holiday' ? holidayName : null,
      });
    }
  };

  const changeWeek = (days: number) => {
    const newDate = new Date(viewDate);
    newDate.setUTCDate(newDate.getUTCDate() + days);
    setViewDate(newDate);
  };

  const resetToToday = () => {
    setViewDate(new Date());
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
      <div className="w-full max-w-[1600px] flex flex-col xl:flex-row gap-8 items-start">
        
        {/* --- MAIN LEFT CONTENT --- */}
        <div className="flex-1 min-w-0 w-full">
          
          {/* --- MAIN HEADER --- */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-indigo-200/50">
             <div>
               <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
                 Cleaners Schedule
               </h1>
               <p className="text-indigo-600 font-medium mt-1">
                 {dateRange}
               </p>
             </div>

             <div className="flex flex-col md:items-end gap-3">
               <div className="font-mono text-3xl font-bold text-gray-700 tabular-nums tracking-tight">
                 {timeString}
               </div>
               
               <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                  <button 
                    onClick={() => changeWeek(-7)}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button 
                    onClick={resetToToday}
                    className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 rounded mx-1"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => changeWeek(7)}
                    className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
               </div>
             </div>
          </div>

          {/* --- CARD GRID --- */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-6 border border-white">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {adjustedAssignments.map((day) => {
                const dayComparable = toComparableNumber(day.date);
                const isPast = dayComparable < todayComparable;
                const isToday = dayComparable === todayComparable;
                const isFuture = dayComparable > todayComparable;
                
                const confirmation = confirmations[day.key];
                
                // Status Booleans
                const isCleaned = confirmation?.status === 'cleaned';
                const isMissed = confirmation?.status === 'missed';
                const isHoliday = confirmation?.status === 'holiday';
                const isSubbed = confirmation?.status === 'subbed';
                const isFinalized = isCleaned || isMissed || isHoliday;
                
                const substitute = substitutes[day.key] ?? '';
                const holidayInput = holidayInputs[day.key] ?? '';
                const canConfirm = isToday || isPast;
                
                const cardClassName = isPast
                  ? 'bg-gray-50 text-gray-500 border border-gray-200'
                  : isToday
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-4 ring-amber-100 shadow-lg transform scale-[1.02] z-10 relative'
                    : isHoliday
                      ? 'bg-slate-50 text-slate-400 border border-slate-100'
                      : 'bg-white border border-indigo-100 text-gray-700 shadow-sm hover:border-indigo-300';

                return (
                  <div key={day.key} className={`flex flex-col gap-3 p-4 rounded-xl transition-all ${cardClassName}`}>
                    <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-start justify-between gap-1">
                      <div>
                        <div className="font-bold text-lg leading-tight">{day.weekday}</div>
                        <div className={`text-xs font-medium ${isToday ? 'text-white/90' : 'text-gray-400'}`}>
                          {formatCardDate(day.date)}
                        </div>
                      </div>
                      <div className="text-left sm:text-right xl:text-left">
                        <div className="text-xl font-bold">
                          {isHoliday ? '🎉' : day.displayCleaner}
                        </div>
                        {!isHoliday && day.statusLabel && (
                          <div className="text-[10px] uppercase font-bold bg-black/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                             {day.statusLabel}
                          </div>
                        )}
                        {isHoliday && <div className="text-xs font-medium">{day.holidayName || 'Holiday'}</div>}
                      </div>
                    </div>

                    <div className={`mt-auto pt-3 border-t ${isToday ? 'border-white/20' : 'border-gray-200'}`}>
                      {isFuture && !isFinalized && !isSubbed && (
                        <div className="text-xs italic opacity-60 text-center py-2">
                          Upcoming shift
                        </div>
                      )}

                      {isFinalized ? (
                        <div className="flex flex-col gap-2">
                          <div className={`p-2 rounded-lg flex flex-col gap-1 ${isToday ? 'bg-white/20' : 'bg-gray-200'}`}>
                            <span className="font-bold text-sm">
                              {isCleaned ? '✅ Cleaned' : isMissed ? '❌ Missed' : '🎉 Holiday'}
                            </span>
                            {isCleaned && confirmation.cleanedBy && (
                              <span className="text-xs font-medium opacity-80">
                                 by {confirmation.cleanedBy === 'All' ? 'Everyone' : confirmation.cleanedBy}
                              </span>
                            )}
                            {isHoliday && confirmation.holidayName && (
                              <span className="text-xs font-medium opacity-80">
                                 {confirmation.holidayName}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleConfirmation(day.key, null)}
                            className={`text-[10px] underline text-left hover:opacity-100 opacity-70 ${isToday ? 'text-white' : 'text-gray-500'}`}
                          >
                            Undo / Edit
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          
                          {/* 1. ACTUAL CONFIRMATION */}
                          {canConfirm && (
                            <div className={`p-2 rounded-lg flex flex-col gap-2 ${isToday ? 'bg-black/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
                              <button
                                type="button"
                                onClick={() => handleConfirmation(day.key, 'cleaned', day.displayCleaner ?? undefined)}
                                className="w-full py-2 px-2 rounded bg-green-500 text-white text-[11px] font-bold shadow-sm hover:bg-green-600 transition-all leading-tight"
                              >
                                ✅ Confirm {day.displayCleaner === 'All' ? 'Everyone' : day.displayCleaner}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmation(day.key, 'missed')}
                                className="w-full py-1 text-[10px] font-bold text-gray-500 hover:text-red-500 transition-all"
                              >
                                ❌ Mark Missed
                              </button>
                            </div>
                          )}

                          {/* 2. SCHEDULE SUBSTITUTE WIDGET */}
                          <div className={`p-2 rounded-lg border ${isToday ? 'bg-indigo-900/10 border-indigo-200/30' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className={`text-[9px] font-bold uppercase mb-1.5 ${isToday ? 'text-indigo-100' : 'text-indigo-800'}`}>
                                🔄 Substitute
                            </div>
                            {isSubbed ? (
                               <div className="flex flex-col gap-1 bg-white/60 p-1.5 rounded">
                                 <span className="text-[10px] font-bold text-indigo-700 truncate">Sub: {confirmation.cleanedBy === 'All' ? 'Everyone' : confirmation.cleanedBy}</span>
                                 <button onClick={() => handleConfirmation(day.key, null)} className="text-[9px] text-left text-red-500 font-bold hover:underline">Cancel</button>
                               </div>
                            ) : (
                               <div className="flex flex-col gap-1.5">
                                 <select
                                  value={substitute}
                                  onChange={(e) => setSubstitutes((prev) => ({ ...prev, [day.key]: e.target.value }))}
                                  className="w-full px-1.5 py-1 rounded text-[11px] text-gray-800 border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                 >
                                   <option value="">Select sub...</option>
                                   <option value="All">All (Everyone)</option>
                                   {ROTATION.map((name) => (
                                     <option key={name} value={name}>{name}</option>
                                   ))}
                                 </select>
                                 <button
                                   type="button"
                                   disabled={!substitute}
                                   onClick={() => {
                                      // 🔥 THE FIX: Instantly confirm as 'cleaned' no matter who is selected
                                      handleConfirmation(day.key, 'cleaned', substitute);
                                   }}
                                   className="w-full py-1 rounded bg-indigo-600 text-white text-[10px] font-bold disabled:opacity-50 hover:bg-indigo-700"
                                 >
                                   Set Sub
                                 </button>
                               </div>
                            )}
                          </div>

                          {/* 3. MARK HOLIDAY WIDGET */}
                          <div className={`p-2 rounded-lg border ${isToday ? 'bg-orange-900/10 border-orange-200/30' : 'bg-orange-50 border-orange-100'}`}>
                            <div className={`text-[9px] font-bold uppercase mb-1.5 ${isToday ? 'text-orange-100' : 'text-orange-800'}`}>
                                🌴 Holiday
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                placeholder="Reason..."
                                value={holidayInput}
                                onChange={(e) => setHolidayInputs((prev) => ({ ...prev, [day.key]: e.target.value }))}
                                className="w-full px-1.5 py-1 rounded text-[11px] text-gray-800 border-gray-200 focus:ring-2 focus:ring-orange-500"
                              />
                              <button
                                type="button"
                                disabled={!holidayInput.trim()}
                                onClick={() => handleConfirmation(day.key, 'holiday', undefined, holidayInput.trim())}
                                className="w-full py-1 rounded bg-orange-500 text-white text-[10px] font-bold disabled:opacity-50 hover:bg-orange-600"
                              >
                                Set Holiday
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-400 font-mono">
             Rotation: {ROTATION.join(' → ')}
          </div>
        </div>

        {/* --- RIGHT SIDEBAR (Leaderboard) --- */}
        <div className="w-full xl:w-80 shrink-0 bg-white rounded-xl shadow-lg border border-indigo-50 overflow-hidden xl:sticky top-8 h-fit">
          <div className="bg-indigo-700 px-5 py-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              🏆 Leaderboard
            </h3>
          </div>
          <div className="divide-y divide-gray-100 bg-white/50 backdrop-blur-sm">
            {leaderboard.map((entry, index) => (
              <div key={entry.name} className="flex justify-between items-center px-5 py-3 hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm ${
                    index === 0 ? 'bg-amber-400 text-white ring-2 ring-amber-200' : 
                    index === 1 ? 'bg-slate-300 text-slate-700' : 
                    index === 2 ? 'bg-orange-200 text-orange-800' : 
                    'text-gray-400 bg-gray-100'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`text-base ${index === 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                    {entry.name}
                  </span>
                </div>
                <span className="font-bold text-xl text-indigo-600">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}