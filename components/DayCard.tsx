import { useState } from 'react';
import { DayAssignment, Confirmation } from '@/lib/types';
import { ROTATION } from '@/lib/constants';
import { formatCardDate, toComparableNumber } from '@/utils/dateHelpers';

interface DayCardProps {
  day: DayAssignment;
  confirmation: Confirmation | undefined;
  todayComparable: number;
  handleConfirmation: (key: string, status: any, cleanedBy?: string, holidayName?: string) => void;
}

export default function DayCard({ day, confirmation, todayComparable, handleConfirmation }: DayCardProps) {
  // Localized state for inputs (Huge performance boost!)
  const [substitute, setSubstitute] = useState('');
  const [holidayInput, setHolidayInput] = useState('');

  const dayComparable = toComparableNumber(day.date);
  const isPast = dayComparable < todayComparable;
  const isToday = dayComparable === todayComparable;
  const isFuture = dayComparable > todayComparable;
  const canConfirm = isToday || isPast;

  const isCleaned = confirmation?.status === 'cleaned';
  const isMissed = confirmation?.status === 'missed';
  const isHoliday = confirmation?.status === 'holiday';
  const isSubbed = confirmation?.status === 'subbed';
  const isFinalized = isCleaned || isMissed || isHoliday;

  const cardClassName = isPast
    ? 'bg-gray-50 text-gray-500 border border-gray-200'
    : isToday
      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-4 ring-amber-100 shadow-lg transform scale-[1.02] z-10 relative'
      : isHoliday
        ? 'bg-slate-50 text-slate-400 border border-slate-100'
        : 'bg-white border border-indigo-100 text-gray-700 shadow-sm hover:border-indigo-300';

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl transition-all ${cardClassName}`}>
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
          <div className="text-xs italic opacity-60 text-center py-2">Upcoming shift</div>
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
                <span className="text-xs font-medium opacity-80">{confirmation.holidayName}</span>
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
                      onChange={(e) => setSubstitute(e.target.value)}
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
                        handleConfirmation(day.key, 'cleaned', substitute);
                        setSubstitute(''); // Reset after submit
                      }}
                      className="w-full py-1 rounded bg-indigo-600 text-white text-[10px] font-bold disabled:opacity-50 hover:bg-indigo-700"
                    >
                      Set Sub
                    </button>
                  </div>
              )}
            </div>

            <div className={`p-2 rounded-lg border ${isToday ? 'bg-orange-900/10 border-orange-200/30' : 'bg-orange-50 border-orange-100'}`}>
              <div className={`text-[9px] font-bold uppercase mb-1.5 ${isToday ? 'text-orange-100' : 'text-orange-800'}`}>
                  🌴 Holiday
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Reason..."
                  value={holidayInput}
                  onChange={(e) => setHolidayInput(e.target.value)}
                  className="w-full px-1.5 py-1 rounded text-[11px] text-gray-800 border-gray-200 focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  disabled={!holidayInput.trim()}
                  onClick={() => {
                    handleConfirmation(day.key, 'holiday', undefined, holidayInput.trim());
                    setHolidayInput(''); // Reset after submit
                  }}
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
}