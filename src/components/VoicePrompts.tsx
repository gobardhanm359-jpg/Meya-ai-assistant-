import React, { useState } from 'react';
import {
  Mic,
  Send,
  Flame,
  Smartphone,
  Flashlight,
  Youtube,
  MessageCircle,
  Heart,
  Camera,
  Vibrate,
  Battery,
  Music,
  Clock,
  Crown,
  ScanFace,
  Terminal,
  Sparkles,
  Zap,
  AtSign,
} from 'lucide-react';

interface VoicePromptsProps {
  onExecuteCommand: (commandText: string) => void;
  onOpenMobileControl: () => void;
  isConnected: boolean;
}

const QUICK_HUKAM_CHIPS = [
  {
    label: 'App Heads 🎀',
    cmd: 'Riya, App Heads floating bubble chalu karo',
    icon: Sparkles,
    style: 'bg-rose-500/25 hover:bg-rose-500/40 border-rose-400/50 text-rose-200',
  },
  {
    label: 'Accessibility ♿',
    cmd: 'Riya, accessibility aur screen reader open karo',
    icon: Sparkles,
    style: 'bg-cyan-500/25 hover:bg-cyan-500/40 border-cyan-400/50 text-cyan-200',
  },
  {
    label: 'Auto Mention 💬',
    cmd: 'Riya, WhatsApp aur Instagram pe auto mention message ready karo',
    icon: AtSign,
    style: 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-400/50 text-emerald-200',
  },
  {
    label: 'High-Load API 🚀',
    cmd: 'Riya, API change karo high load mode',
    icon: Sparkles,
    style: 'bg-cyan-500/25 hover:bg-cyan-500/40 border-cyan-400/50 text-cyan-200',
  },
  {
    label: 'Best Server ⚡',
    cmd: 'Riya, best server connection karo',
    icon: Crown,
    style: 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-400/50 text-emerald-200',
  },
  {
    label: 'Coding / Hack 💻',
    cmd: 'Riya, coding aur ethical hacking lab kholo',
    icon: Terminal,
    style: 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-400/50 text-emerald-200',
  },
  {
    label: 'Face Lock 🔒',
    cmd: 'Riya, face lock lagao',
    icon: ScanFace,
    style: 'bg-cyan-500/25 hover:bg-cyan-500/40 border-cyan-400/50 text-cyan-200',
  },
  {
    label: 'Torch ON',
    cmd: 'Riya, mere phone ki flashlight on kar do',
    icon: Flashlight,
    style: 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/40 text-amber-200',
  },
  {
    label: 'YouTube Kholo',
    cmd: 'Riya, YouTube open karo',
    icon: Youtube,
    style: 'bg-red-500/20 hover:bg-red-500/35 border-red-400/40 text-red-200',
  },
  {
    label: 'WhatsApp',
    cmd: 'Riya, WhatsApp kholo',
    icon: MessageCircle,
    style: 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/40 text-emerald-200',
  },
  {
    label: 'Kiss Do 💋',
    cmd: 'Riya, mujhe ek pyari si kiss do',
    icon: Heart,
    style: 'bg-pink-500/20 hover:bg-pink-500/35 border-pink-400/40 text-pink-200',
  },
  {
    label: 'Hot Mode 🔥',
    cmd: 'Riya, hot mode on karo aur romantic baatein karo',
    icon: Flame,
    style: 'bg-rose-600/25 hover:bg-rose-600/40 border-rose-400/50 text-amber-200',
  },
  {
    label: 'Vibrate 💓',
    cmd: 'Riya, phone ko heartbeat vibrate karo',
    icon: Vibrate,
    style: 'bg-purple-500/20 hover:bg-purple-500/35 border-purple-400/40 text-purple-200',
  },
  {
    label: 'Camera Kholo',
    cmd: 'Riya, camera on karo aur mujhe dekho',
    icon: Camera,
    style: 'bg-cyan-500/20 hover:bg-cyan-500/35 border-cyan-400/40 text-cyan-200',
  },
  {
    label: 'Battery Check',
    cmd: 'Riya, mere phone ki battery kitni hai?',
    icon: Battery,
    style: 'bg-teal-500/20 hover:bg-teal-500/35 border-teal-400/40 text-teal-200',
  },
  {
    label: 'Music Chalao',
    cmd: 'Riya, romantic music play karo',
    icon: Music,
    style: 'bg-indigo-500/20 hover:bg-indigo-500/35 border-indigo-400/40 text-indigo-200',
  },
  {
    label: '1m Timer ⏰',
    cmd: 'Riya, 1 minute ka timer lagao',
    icon: Clock,
    style: 'bg-orange-500/20 hover:bg-orange-500/35 border-orange-400/40 text-orange-200',
  },
];

export const VoicePrompts: React.FC<VoicePromptsProps> = ({
  onExecuteCommand,
  onOpenMobileControl,
  isConnected,
}) => {
  const [commandInput, setCommandInput] = useState<string>('');
  const [isDictating, setIsDictating] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = commandInput.trim();
    if (!clean) return;
    onExecuteCommand(clean);
    setCommandInput('');
  };

  const handleQuickVoiceDictation = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      onOpenMobileControl();
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsDictating(true);
      recognition.onresult = (event: any) => {
        const spokenText = event?.results?.[0]?.[0]?.transcript;
        setIsDictating(false);
        if (spokenText && spokenText.trim()) {
          onExecuteCommand(spokenText.trim());
        }
      };
      recognition.onerror = () => {
        setIsDictating(false);
      };
      recognition.onend = () => {
        setIsDictating(false);
      };
      recognition.start();
    } catch (_) {
      setIsDictating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[11px] font-extrabold tracking-wide text-amber-300 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Hukam Mode: Jo Bolo Riya Wohi Karegi</span>
        </div>
        <button
          type="button"
          onClick={onOpenMobileControl}
          className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer"
        >
          <Smartphone className="w-3 h-3" />
          <span>Full Phone Control →</span>
        </button>
      </div>

      {/* Direct Command Input Bar ("Jo Bolo Wohi Kare") */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder={
              isConnected
                ? 'Bolkar ya likhkar hukam do (e.g. YouTube kholo, Torch on)...'
                : 'Riya ko hukam do (e.g. Torch on, WhatsApp kholo, Kiss do)...'
            }
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-black/65 border border-white/15 focus:border-rose-400 text-xs text-white placeholder:text-white/40 focus:outline-none backdrop-blur-md"
          />
          <button
            type="button"
            onClick={handleQuickVoiceDictation}
            title="Speak Hindi Command"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isDictating
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-rose-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Karo</span>
        </button>
      </form>

      {/* 1-Tap Instant Obedience Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {QUICK_HUKAM_CHIPS.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onExecuteCommand(chip.cmd)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${chip.style}`}
            >
              <Icon className="w-3 h-3" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
