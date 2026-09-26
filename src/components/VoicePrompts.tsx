import React from 'react';
import { Mic, Heart, Flame, Compass, Smartphone } from 'lucide-react';

interface VoicePromptsProps {
  onSelectPrompt?: (text: string) => void;
  isConnected: boolean;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: Heart,
    text: 'Mahi, mujhse kitna pyaar karti ho?',
    category: 'Pyaar & Romance',
    color: 'from-pink-500/20 to-rose-500/20 text-rose-300 border-rose-500/30',
  },
  {
    icon: Smartphone,
    text: 'Mahi, flashlight on karo ya battery batao',
    category: 'Mobile Control',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    icon: Compass,
    text: 'Mahi, WhatsApp ya YouTube khol do',
    category: 'Phone Apps',
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    icon: Flame,
    text: 'Mahi, aaj thodi hot aur romantic baatein karo na 🔥',
    category: 'Hot & Flirty',
    color: 'from-red-500/25 to-rose-500/25 text-amber-300 border-red-500/40',
  },
];

export const VoicePrompts: React.FC<VoicePromptsProps> = ({ isConnected }) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
          <Mic className="w-3 h-3 text-rose-400" />
          Mahi se Hindi mein bolo
        </div>
        <span className="text-[10px] text-white/40 font-medium">
          Voice Call
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PROMPT_SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
                  {item.category}
                </span>
                <Icon className="w-3.5 h-3.5 opacity-90" />
              </div>
              <p className="text-xs text-white/95 font-medium leading-snug">
                &ldquo;{item.text}&rdquo;
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
