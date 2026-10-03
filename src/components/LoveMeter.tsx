import React from 'react';
import { Heart, Flame, Sparkles, CloudMoon, Sun } from 'lucide-react';
import {
  MahiSentimentId,
  SENTIMENT_PROFILES,
  SentimentThemeProfile,
} from '../services/sentimentThemeEngine.ts';

interface LoveMeterProps {
  score: number; // 0 to 100
  recentFeeling?: string;
  theme: string;
  sentiment?: MahiSentimentId;
  isAutoSentiment?: boolean;
  onSelectSentiment?: (sentiment: MahiSentimentId, targetScore: number) => void;
  onToggleAutoSentiment?: () => void;
}

const QUICK_MOOD_PRESETS: {
  id: MahiSentimentId;
  label: string;
  score: number;
  tempLabel: string;
}[] = [
  { id: 'pensive', label: 'Pensive', score: 48, tempLabel: 'Cool' },
  { id: 'serene', label: 'Serene', score: 65, tempLabel: 'Cool' },
  { id: 'joyful', label: 'Joyful', score: 78, tempLabel: 'Gold' },
  { id: 'romantic', label: 'Romantic', score: 90, tempLabel: 'Warm' },
  { id: 'passionate', label: 'Passionate', score: 98, tempLabel: 'Hot' },
];

export const LoveMeter: React.FC<LoveMeterProps> = ({
  score,
  recentFeeling,
  sentiment = 'romantic',
  isAutoSentiment = true,
  onSelectSentiment,
  onToggleAutoSentiment,
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const profile: SentimentThemeProfile =
    SENTIMENT_PROFILES[sentiment] || SENTIMENT_PROFILES.romantic;

  const isCool = profile.temperature === 'cool';

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-3 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden transition-colors duration-1000">
      {/* Dynamic ambient glow matching sentiment temperature */}
      <div
        className={`absolute -right-8 -top-8 w-28 h-28 ${profile.orbTopLeft} rounded-full blur-2xl pointer-events-none transition-colors duration-1000`}
      />
      <div
        className={`absolute -left-8 -bottom-8 w-28 h-28 ${profile.orbBottomLeft} rounded-full blur-2xl pointer-events-none transition-colors duration-1000`}
      />

      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${profile.meterGradient} flex items-center justify-center shadow-lg transition-all duration-700`}
          >
            {sentiment === 'passionate' ? (
              <Flame className="w-4 h-4 text-white animate-pulse" />
            ) : isCool ? (
              <CloudMoon className="w-4 h-4 text-white" />
            ) : sentiment === 'joyful' ? (
              <Sun className="w-4 h-4 text-white" />
            ) : (
              <Heart className="w-4 h-4 text-white fill-white" />
            )}
          </div>
          <div>
            <div className="text-[10px] tracking-wider text-white/60 font-medium flex items-center gap-1.5">
              <span>Sentiment: {profile.label}</span>
              <span aria-hidden="true">·</span>
              <span className={profile.badgeText}>
                {profile.temperature === 'cool'
                  ? 'Cool Tones'
                  : profile.temperature === 'golden'
                  ? 'Golden Glow'
                  : 'Warm Tones'}
              </span>
            </div>
            <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{profile.hindiLabel}</span>
              {onToggleAutoSentiment && (
                <button
                  type="button"
                  onClick={onToggleAutoSentiment}
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    isAutoSentiment
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-white/10 border-white/15 text-white/60'
                  }`}
                  title="Toggle automatic sentiment-driven background theme transitions"
                >
                  {isAutoSentiment ? 'Auto-Theme ON' : 'Manual'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`text-lg font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r ${profile.meterGradient}`}
          >
            {clampedScore}%
          </span>
        </div>
      </div>

      {/* Dynamic Sentiment Progress Bar */}
      <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${profile.meterGradient}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      {/* Interactive Sentiment & Temperature Switcher */}
      {onSelectSentiment && (
        <div className="mt-2.5 flex items-center justify-between gap-1">
          {QUICK_MOOD_PRESETS.map((preset) => {
            const active = sentiment === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectSentiment(preset.id, preset.score)}
                className={`flex-1 py-1 px-1 rounded-md text-[9px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                    : 'bg-white/5 text-white/55 hover:text-white/90 hover:bg-white/10 border border-transparent'
                }`}
                title={`Preview ${preset.label} sentiment (${preset.tempLabel} gradient, ${preset.score}% love score)`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {recentFeeling && (
        <div className="mt-2 text-[11px] text-white/75 italic line-clamp-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
          <span className="truncate">&ldquo;{recentFeeling}&rdquo;</span>
        </div>
      )}
    </div>
  );
};
