import React from 'react';
import { Music, X, Volume2, VolumeX, Play, Pause, Sparkles } from 'lucide-react';
import { AMBIENT_TRACKS, AmbientVibe } from '../services/ambientMusicSynth.ts';

interface AmbientMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  currentVibe: AmbientVibe;
  volume: number;
  onTogglePlay: () => void;
  onSelectVibe: (vibe: AmbientVibe) => void;
  onChangeVolume: (val: number) => void;
}

export const AmbientMusicModal: React.FC<AmbientMusicModalProps> = ({
  isOpen,
  onClose,
  isPlaying,
  currentVibe,
  volume,
  onTogglePlay,
  onSelectVibe,
  onChangeVolume,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-purple-500/40 rounded-3xl p-5 shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Ambient Music & Vibe Engine 🎵
                <span className="text-[10px] font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">
                  Synthesizer
                </span>
              </h2>
              <p className="text-[11px] text-purple-200/70">
                Call ke background mein romantic lofi dhun chalao
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Play / Pause Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-black border border-purple-500/30 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                isPlaying
                  ? 'bg-purple-500 text-black shadow-purple-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
            </button>
            <div>
              <span className="text-xs font-bold text-white block">
                {isPlaying ? 'Ambient Music Playing' : 'Ambient Music Paused'}
              </span>
              <span className="text-[10px] text-purple-200/60">
                {isPlaying ? 'Mahi ki voice ke saath gentle chalta rahega' : 'Play button dabayein dhun sunne ke liye'}
              </span>
            </div>
          </div>

          {/* Equalizer animation */}
          {isPlaying && (
            <div className="flex items-end gap-1 h-6">
              <span className="w-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
              <span className="w-1 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.15s] h-5" />
              <span className="w-1 bg-rose-300 rounded-full animate-bounce h-6" />
              <span className="w-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.2s] h-4" />
            </div>
          )}
        </div>

        {/* Volume Slider */}
        <div className="mb-4 p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-white/50 shrink-0" />
          ) : (
            <Volume2 className="w-4 h-4 text-purple-300 shrink-0" />
          )}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-full accent-purple-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-white/60 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Tracks List */}
        <div className="space-y-2.5 mb-2">
          {AMBIENT_TRACKS.map((track) => {
            const isSelected = currentVibe === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelectVibe(track.id)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-purple-500/20 border-purple-400 shadow-md shadow-purple-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{track.name}</span>
                    <span className="text-[10px] font-medium text-purple-300">
                      {track.hindiName}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 mt-0.5">{track.description}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-purple-400 bg-purple-500' : 'border-white/30'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tip */}
        <p className="mt-2 text-[10px] text-white/40 text-center">
          💡 Mahi se call par boliye: <span className="text-purple-300">"Mahi, romantic lofi music play karo!"</span>
        </p>
      </div>
    </div>
  );
};
