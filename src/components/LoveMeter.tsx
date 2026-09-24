import React from 'react';
import { Heart, Flame, Sparkles } from 'lucide-react';

interface LoveMeterProps {
  score: number; // 0 to 100
  recentFeeling?: string;
  theme: string;
}

export const LoveMeter: React.FC<LoveMeterProps> = ({ score, recentFeeling, theme }) => {
  const getStatusText = (val: number) => {
    if (val >= 95) return 'Deewana Pyaar ❤️ (Madly in Love)';
    if (val >= 85) return 'Sweetheart Mode ✨ (Pyaar Hi Pyaar)';
    if (val >= 70) return 'Flirty & Sassy 🔥 (Chulbuli Mahi)';
    if (val >= 50) return 'Playful Teasing 😉 (Masti Mood)';
    return 'Warming Up 💫 (Pyar Ki Shuruat)';
  };

  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
      {/* Ambient background glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            {score >= 85 ? (
              <Flame className="w-4 h-4 text-white animate-pulse" />
            ) : (
              <Heart className="w-4 h-4 text-white fill-white" />
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-rose-300 font-semibold flex items-center gap-1">
              Chemistry & Affection
              <Sparkles className="w-3 h-3 text-amber-300 inline" />
            </div>
            <div className="text-xs font-bold text-white tracking-wide">
              {getStatusText(clampedScore)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-300 to-amber-200">
            {clampedScore}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 shadow-[0_0_12px_rgba(244,63,94,0.7)]"
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      {recentFeeling && (
        <div className="mt-2 text-[11px] text-rose-200/80 italic line-clamp-1 flex items-center gap-1">
          <span>&ldquo;{recentFeeling}&rdquo;</span>
        </div>
      )}
    </div>
  );
};
