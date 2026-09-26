import React from 'react';
import { Eye, MessageSquare, Music, Sparkles, Bell, Camera, Smartphone } from 'lucide-react';

interface FuturisticControlBarProps {
  onOpenVision: () => void;
  onOpenTranscript: () => void;
  onOpenMusic: () => void;
  onToggleHologram: () => void;
  isHologramActive: boolean;
  onOpenReminders: () => void;
  remindersCount: number;
  onOpenMemories: () => void;
  isMusicPlaying: boolean;
  onOpenMobileControl: () => void;
  isTorchActive?: boolean;
}

export const FuturisticControlBar: React.FC<FuturisticControlBarProps> = ({
  onOpenVision,
  onOpenTranscript,
  onOpenMusic,
  onToggleHologram,
  isHologramActive,
  onOpenReminders,
  remindersCount,
  onOpenMemories,
  isMusicPlaying,
  onOpenMobileControl,
  isTorchActive = false,
}) => {
  return (
    <div className="w-full max-w-md mx-auto px-2 mb-2">
      <div className="p-1.5 rounded-2xl bg-neutral-950/85 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-around gap-0.5">
        {/* 1. Mobile Control Center (NEW) */}
        <button
          type="button"
          onClick={onOpenMobileControl}
          title="Mobile Phone Control Center (Torch, Call, WhatsApp, APK)"
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all group cursor-pointer ${
            isTorchActive
              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
              : 'hover:bg-emerald-500/20 text-white/85 hover:text-emerald-300'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/35 text-emerald-400 relative">
            <Smartphone className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-extrabold tracking-tight text-emerald-300">Mobile</span>
        </button>

        {/* 2. AI Vision (Camera) */}
        <button
          type="button"
          onClick={onOpenVision}
          title="AI Vision (Mahi ko camera dikhao)"
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-cyan-500/20 text-white/70 hover:text-cyan-300 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-cyan-500/15 group-hover:bg-cyan-500/30 text-cyan-400">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">Vision</span>
        </button>

        {/* 2. Live Subtitles / Transcript */}
        <button
          type="button"
          onClick={onOpenTranscript}
          title="Live Hindi Subtitles & Transcript"
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-rose-500/20 text-white/70 hover:text-rose-300 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-rose-500/15 group-hover:bg-rose-500/30 text-rose-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">Transcript</span>
        </button>

        {/* 3. Ambient Music / Lofi */}
        <button
          type="button"
          onClick={onOpenMusic}
          title="Ambient Romantic & Lofi Music"
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-purple-500/20 text-white/70 hover:text-purple-300 transition-all group"
        >
          <div className={`p-1.5 rounded-lg text-purple-400 relative ${isMusicPlaying ? 'bg-purple-500/40 shadow-sm shadow-purple-500/50' : 'bg-purple-500/15 group-hover:bg-purple-500/30'}`}>
            <Music className="w-4 h-4" />
            {isMusicPlaying && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            )}
          </div>
          <span className="text-[9px] font-bold tracking-tight">Music</span>
        </button>

        {/* 4. Cyber Hologram Toggle */}
        <button
          type="button"
          onClick={onToggleHologram}
          title="Futuristic Hologram Mode"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            isHologramActive
              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-md shadow-cyan-500/30'
              : 'hover:bg-white/10 text-white/70 hover:text-cyan-300'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-cyan-400/20 text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">
            {isHologramActive ? 'Holo ON' : 'Hologram'}
          </span>
        </button>

        {/* 5. Sweet Reminders */}
        <button
          type="button"
          onClick={onOpenReminders}
          title="Sweet Reminders & Care"
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-amber-500/20 text-white/70 hover:text-amber-300 transition-all group relative"
        >
          <div className="p-1.5 rounded-lg bg-amber-500/15 group-hover:bg-amber-500/30 text-amber-400 relative">
            <Bell className="w-4 h-4" />
            {remindersCount > 0 && (
              <span className="absolute -top-1 -right-1.5 px-1 py-0.2 bg-amber-500 text-black text-[8px] font-extrabold rounded-full">
                {remindersCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold tracking-tight">Reminders</span>
        </button>

        {/* 6. Photo Memories Album */}
        <button
          type="button"
          onClick={onOpenMemories}
          title="Photo Memories Album"
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-pink-500/20 text-white/70 hover:text-pink-300 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-pink-500/15 group-hover:bg-pink-500/30 text-pink-400">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">Memories</span>
        </button>
      </div>
    </div>
  );
};
