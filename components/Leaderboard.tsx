import { LeaderboardEntry } from '@/lib/types';

export default function Leaderboard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  return (
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
  );
}