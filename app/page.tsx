'use client';

import { useEffect, useMemo, useState } from 'react';
import { ROTATION, TIME_ZONE } from '@/lib/constants';
import { getManilaWeekStart, formatDateRange, toComparableNumber } from '@/utils/dateHelpers';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useFairnessEngine } from '@/hooks/useFairnessEngine';
import Leaderboard from '@/components/Leaderboard';
import DayCard from '@/components/DayCard';

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const { confirmations, handleConfirmation } = useScheduleData();
  const weekStart = useMemo(() => getManilaWeekStart(viewDate), [viewDate]);
  const { adjustedAssignments, leaderboard } = useFairnessEngine(weekStart, confirmations, viewDate);

  // Clock Tick
  useEffect(() => {
    setNow(new Date()); 
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateRange = useMemo(() => formatDateRange(weekStart), [weekStart]);
  const todayComparable = useMemo(() => toComparableNumber(now || new Date()), [now]);
  
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

  const changeWeek = (days: number) => {
    const newDate = new Date(viewDate);
    newDate.setUTCDate(newDate.getUTCDate() + days);
    setViewDate(newDate);
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
                  <button onClick={() => changeWeek(-7)} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button onClick={() => setViewDate(new Date())} className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 rounded mx-1">
                    Today
                  </button>
                  <button onClick={() => changeWeek(7)} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
               </div>
             </div>
          </div>

          {/* --- CARD GRID --- */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-6 border border-white">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {adjustedAssignments.map((day) => (
                <DayCard
                  key={day.key}
                  day={day}
                  confirmation={confirmations[day.key]}
                  todayComparable={todayComparable}
                  handleConfirmation={handleConfirmation}
                />
              ))}
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-400 font-mono">
             Rotation: {ROTATION.join(' → ')}
          </div>
        </div>

        {/* --- RIGHT SIDEBAR --- */}
        <Leaderboard leaderboard={leaderboard} />

      </div>
    </main>
  );
}