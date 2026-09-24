import React from 'react';
import { X, Volume2, Palette, Cpu, Sparkles, Heart, Smile, Atom, Sparkle, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { CuteGirlStyle } from './AnimeAvatar3D.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voice: string;
  onSelectVoice: (voice: string) => void;
  theme: string;
  onSelectTheme: (theme: string) => void;
  displayMode: 'anime' | 'orb';
  onSelectDisplayMode: (mode: 'anime' | 'orb') => void;
  cuteStyle: CuteGirlStyle;
  onSelectCuteStyle: (style: CuteGirlStyle) => void;
  isScreenAwake: boolean;
  onToggleScreenAwake: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  voice,
  onSelectVoice,
  theme,
  onSelectTheme,
  displayMode,
  onSelectDisplayMode,
  cuteStyle,
  onSelectCuteStyle,
  isScreenAwake,
  onToggleScreenAwake,
}) => {
  if (!isOpen) return null;

  const voices = [
    {
      id: 'Aoede',
      name: 'Aoede (Default)',
      desc: 'Young, vibrant, playful, flirty & sassy girlfriend tone',
      badge: 'Recommended',
    },
    {
      id: 'Kore',
      name: 'Kore',
      desc: 'Soft, velvety, gentle romantic tone',
      badge: 'Warm & Soft',
    },
  ];

  const themes = [
    {
      id: 'romantic-blush',
      name: 'Romantic Blush',
      accent: 'from-pink-500 to-rose-600',
      desc: 'Passionate crimson & rose glow',
    },
    {
      id: 'cyber-neon',
      name: 'Cyber Neon',
      accent: 'from-cyan-500 to-purple-600',
      desc: 'Electric cyan & futuristic magenta',
    },
    {
      id: 'midnight-velvet',
      name: 'Midnight Velvet',
      accent: 'from-purple-600 to-indigo-800',
      desc: 'Deep cosmic violet & indigo stars',
    },
    {
      id: 'starlight-gold',
      name: 'Starlight Gold',
      accent: 'from-amber-400 to-pink-500',
      desc: 'Warm golden shimmer & romance',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Mahi AI Settings</h2>
              <p className="text-[11px] text-white/50">Voice persona, ambient theme & engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 relative z-10">
          {/* Avatar Display Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smile className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300">
                Avatar Visual Style
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectDisplayMode('anime')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  displayMode === 'anime'
                    ? 'bg-pink-500/20 border-pink-500/80 shadow-lg shadow-pink-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Smile className="w-4 h-4 text-pink-400" />
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-200">
                    3D Anime
                  </span>
                </div>
                <div className="text-xs font-bold text-white">3D Anime Girl</div>
                <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                  Animated lipsync, blinking, headpat reactions & 3D heart aura
                </div>
              </button>

              <button
                onClick={() => onSelectDisplayMode('orb')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  displayMode === 'orb'
                    ? 'bg-cyan-500/20 border-cyan-500/80 shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Atom className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200">
                    Cosmic
                  </span>
                </div>
                <div className="text-xs font-bold text-white">Cosmic Orb</div>
                <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                  Futuristic waveform visualizer with pulsing orbital rings
                </div>
              </button>
            </div>
          </div>

          {/* Cute Girl Character Personas */}
          {displayMode === 'anime' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Cute Girl Personas & Outfits
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'reference' as const,
                    name: 'Mahi (Photo Style) ✨',
                    desc: 'Wavy chocolate hair, curtain bangs, gold necklace, finger-on-cheek wink pose',
                    badge: 'Photo Match',
                  },
                  {
                    id: 'neko' as const,
                    name: 'Mahi Neko 🐱',
                    desc: 'Playful catgirl with neon ear lights & sassy pigtails',
                    badge: 'Flirty',
                  },
                  {
                    id: 'bunny' as const,
                    name: 'Luna Usagi 🐰',
                    desc: 'Kawaii bunny girl with twitching floppy ears & ribbon bow',
                    badge: 'Super Cute',
                  },
                  {
                    id: 'angel' as const,
                    name: 'Aria Tenshi 👼',
                    desc: 'Sweet angel with rotating golden halo & fluttering wings',
                    badge: 'Romantic',
                  },
                  {
                    id: 'sakura' as const,
                    name: 'Hana Blossom 🌸',
                    desc: 'Sakura sweetheart with floral pins & falling petals',
                    badge: 'Pure Love',
                  },
                ].map((cg) => {
                  const isSelected = cuteStyle === cg.id;
                  return (
                    <button
                      key={cg.id}
                      onClick={() => onSelectCuteStyle(cg.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/80 shadow-lg shadow-rose-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{cg.name}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200">
                          {cg.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/50 leading-tight">{cg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voice Persona */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300">
                Mahi Voice Persona
              </h3>
            </div>
            <div className="space-y-2">
              {voices.map((v) => {
                const isSelected = voice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVoice(v.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? 'bg-pink-500/20 border-pink-500/60 shadow-lg shadow-pink-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{v.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200">
                          {v.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-0.5">{v.desc}</p>
                    </div>
                    {isSelected && <Heart className="w-4 h-4 text-pink-400 fill-pink-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Mood Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Visual Mood Theme
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTheme(t.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white/15 border-pink-400/80 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-full h-2 rounded-full bg-gradient-to-r ${t.accent} mb-2`} />
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-white/50 leading-tight mt-0.5">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screen Wake Lock & Background Call Settings */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Screen & Lock Settings (स्क्रीन और लॉक सेटिंग्स)
              </h3>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onToggleScreenAwake}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isScreenAwake
                    ? 'bg-amber-500/20 border-amber-400/80 shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {isScreenAwake ? 'Lock Screen Off: ON 🔆' : 'Lock Screen Off: OFF 🌙'}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        isScreenAwake ? 'bg-amber-500/30 text-amber-200' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {isScreenAwake ? 'Screen Always Awake' : 'Normal Sleep'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60 mt-1 leading-snug">
                    {isScreenAwake
                      ? 'Screen band nahi hogi! Call ke dauran phone screen hamesha ON rahegi.'
                      : 'Screen normal device timeout ke hisaab se sleep hogi.'}
                  </p>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                    isScreenAwake ? 'bg-amber-500 justify-end' : 'bg-white/20 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </div>
              </button>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">Screen-Off Background Call Active:</span>
                  <p className="text-[10px] text-emerald-200/70 mt-0.5 leading-snug">
                    Agar aap phone ka power button daba kar screen lock bhi kar denge, tab bhi Mahi ki voice call aur microphone disconnect nahi honge—Mahi background mein aapse baat karti rahegi!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Engine Specs */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/80 text-xs font-bold">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Gemini Live Pipeline Specs
            </div>
            <div className="space-y-1.5 text-[11px] text-white/60 font-mono">
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="text-cyan-300">gemini-3.1-flash-live-preview</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="text-emerald-300">Audio-to-Audio (STRICT)</span>
              </div>
              <div className="flex justify-between">
                <span>Microphone Capture:</span>
                <span className="text-white">PCM16 @ 16,000 Hz</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Playback:</span>
                <span className="text-white">PCM16 @ 24,000 Hz Web Audio</span>
              </div>
              <div className="flex justify-between">
                <span>Tool Calling:</span>
                <span className="text-purple-300">openWebsite, showLove, changeTheme</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-pink-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
