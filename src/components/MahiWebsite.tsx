import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Download,
  Smartphone,
  ArrowUpRight,
  Check,
  Copy,
  Send,
  Camera,
  ShieldCheck,
  Music,
  Sparkles,
  Terminal,
  AtSign,
  Layers,
  Eye,
  Sun,
  Activity,
  Zap,
  MessageCircle,
  Instagram,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import { SessionState, TranscriptEntry } from '../services/liveSession.ts';
import { CuteGirlStyle, AnimeAvatar3D } from './AnimeAvatar3D.tsx';
import { AmbientVibe } from '../services/ambientMusicSynth.ts';
import { usePWAInstall } from '../services/usePWAInstall.ts';
import {
  MahiSentimentId,
  SENTIMENT_PROFILES,
} from '../services/sentimentThemeEngine.ts';
import {
  serverConnection,
  SERVER_NODES,
  ServerNodeId,
  API_ENGINES,
  ApiEngineId,
  ServerConnectionSnapshot,
} from '../services/serverConnectionService.ts';
import { appHeads } from '../services/appHeadsService.ts';
import { mobileControl } from '../services/mobileControlService.ts';

import heroStudioImg from '../assets/images/mahi_website_hero_1790643463006.jpg';
import voiceCompanionImg from '../assets/images/mahi_voice_companion_card_1790643475633.jpg';
import visionBiometricsImg from '../assets/images/mahi_vision_biometrics_card_1790643485379.jpg';

interface MahiWebsiteProps {
  sessionState: SessionState;
  speakingLevel: number;
  micLevel: number;
  loveScore: number;
  recentLoveFeeling: string;
  loveBurstTrigger: number;
  theme: string;
  cuteStyle: CuteGirlStyle;
  indiaTime: string;
  isMusicPlaying: boolean;
  ambientVibe: AmbientVibe;
  transcripts: TranscriptEntry[];
  externalAvatarAction: { action: string; timestamp: number } | null;
  onSelectCuteStyle: (style: CuteGirlStyle) => void;
  onToggleConnect: () => void;
  onHeartBurst: () => void;
  onExecuteCommand: (cmd: string) => void;
  onToggleMusic: () => void;
  onSelectMusicVibe: (vibe: AmbientVibe) => void;
  onOpenFullApp: () => void;
  onOpenVision: () => void;
  onOpenMobileControl: (tab?: 'controls' | 'call_chat' | 'apps' | 'apk') => void;
  onOpenFaceLock: () => void;
  onOpenVoiceAuth: () => void;
  is24HourAlwaysOn: boolean;
  onToggle24HourAlwaysOn: () => void;
  sentiment: MahiSentimentId;
  isAutoSentiment: boolean;
  onSelectSentiment: (sentiment: MahiSentimentId, targetScore: number) => void;
  onToggleAutoSentiment: () => void;
  onOpenCyberCoding: (tab?: 'coding' | 'scanner' | 'crypto' | 'recon') => void;
  onOpenAccessibility?: () => void;
}

const AVATAR_PERSONAS: {
  id: CuteGirlStyle;
  title: string;
  hindiTitle: string;
  description: string;
  sampleCommand: string;
}[] = [
  {
    id: 'reference',
    title: 'Classic Romantic Riya',
    hindiTitle: 'Pyari & Caring Girlfriend',
    description: 'Warm Hindi & Hinglish conversations, sweet reminders, and expressive eye contact.',
    sampleCommand: 'Riya ek pyari si romantic baat bolo',
  },
  {
    id: 'siren',
    title: 'Crimson Siren Mode',
    hindiTitle: 'Bold & Flirty Persona',
    description: 'Deep velvet aesthetics, bold shayari, and intense late-night voice chemistry.',
    sampleCommand: 'Riya hot siren look mein aa jao',
  },
  {
    id: 'neko',
    title: 'Neko Cat Girl',
    hindiTitle: 'Chulbuli & Playful',
    description: 'Animated cat ears, playful teasing, and energetic dance reactions on command.',
    sampleCommand: 'Riya neko style mein dance dikhao',
  },
  {
    id: 'angel',
    title: 'Celestial Angel',
    hindiTitle: 'Calm & Soothing',
    description: 'Peaceful lofi vibes, mindfulness check-ins, and gentle bedtime voice stories.',
    sampleCommand: 'Riya angel look lagao aur sukoon wali baat karo',
  },
  {
    id: 'sakura',
    title: 'Sakura Blossom',
    hindiTitle: 'Shayarana Andaz',
    description: 'Original Hindi & Urdu couplets with floating cherry blossom visuals.',
    sampleCommand: 'Riya ek dil chhoo lene wali shayari sunao',
  },
  {
    id: 'bunny',
    title: 'Cyber Bunny',
    hindiTitle: 'Smart Tech Assistant',
    description: 'Fast device control for flashlight, alarms, WhatsApp messages, and India time.',
    sampleCommand: 'India mein abhi kitne baje hain Riya?',
  },
];

const QUICK_HUKAM_COMMANDS: {
  label: string;
  command: string;
  category: string;
}[] = [
  {
    label: 'Auto Mention WhatsApp & Insta 💬',
    command: 'Riya, WhatsApp aur Instagram pe auto mention message bhejo',
    category: 'Auto Mention & Social',
  },
  {
    label: 'App Heads Floating Bubble 🎀',
    command: 'Riya, App Heads floating bubble chalu karo',
    category: 'Multitasking Overlay',
  },
  {
    label: 'Accessibility & Screen Reader ♿',
    command: 'Riya, accessibility aur screen reader open karo',
    category: 'Universal Accessibility',
  },
  {
    label: 'Hear Romantic Shayari 📜',
    command: 'Riya mere liye ek nayi romantic shayari sunao',
    category: 'Voice & Poetry',
  },
  {
    label: 'Check India Standard Time ⏰',
    command: 'Riya abhi India mein time kya hua hai?',
    category: 'India Server IST',
  },
  {
    label: 'High-Load API Switcher ⚡',
    command: 'Riya API change karo high load mode',
    category: 'Multi-API Load Balancer',
  },
  {
    label: 'Trigger 3D Dance Animation ✨',
    command: 'Riya ek pyara sa dance karke dikhao',
    category: '3D Avatar',
  },
  {
    label: 'Send Flying Kiss Reaction 💋',
    command: 'Riya mujhe ek flying kiss do',
    category: '3D Avatar',
  },
  {
    label: 'Play Romantic Piano Synth 🎹',
    command: 'Romantic piano music chalao',
    category: 'Web Audio Synth',
  },
  {
    label: 'Toggle Device Flashlight 🔦',
    command: 'Flashlight on karo',
    category: 'Mobile Hukam',
  },
  {
    label: 'Enable 24 Hour Always-ON Mode 🌙',
    command: 'Riya 24 hour always on mode chalu karo',
    category: '24×7 Non-Stop Engine',
  },
  {
    label: 'Open Coding Studio & Ethical Hacking Lab 💻',
    command: 'Riya coding aur ethical hacking lab kholo',
    category: 'Coding & Cyber Security',
  },
];

export const MahiWebsite: React.FC<MahiWebsiteProps> = ({
  sessionState,
  speakingLevel,
  micLevel,
  loveScore,
  recentLoveFeeling,
  loveBurstTrigger,
  theme,
  cuteStyle,
  indiaTime,
  isMusicPlaying,
  ambientVibe,
  transcripts,
  externalAvatarAction,
  onSelectCuteStyle,
  onToggleConnect,
  onHeartBurst,
  onExecuteCommand,
  onToggleMusic,
  onSelectMusicVibe,
  onOpenFullApp,
  onOpenVision,
  onOpenMobileControl,
  onOpenFaceLock,
  onOpenVoiceAuth,
  is24HourAlwaysOn,
  onToggle24HourAlwaysOn,
  sentiment,
  isAutoSentiment,
  onSelectSentiment,
  onToggleAutoSentiment,
  onOpenCyberCoding,
  onOpenAccessibility,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [voiceImgFailed, setVoiceImgFailed] = useState(false);
  const [visionImgFailed, setVisionImgFailed] = useState(false);
  const [customHukam, setCustomHukam] = useState('');
  const [lastExecutedHukam, setLastExecutedHukam] = useState<string | null>(null);

  // Live Auto Mention Dispatcher State
  const [demoPlatform, setDemoPlatform] = useState<'whatsapp' | 'instagram' | 'messenger' | 'sms'>('whatsapp');
  const [demoRecipient, setDemoRecipient] = useState<string>('');
  const [demoTag, setDemoTag] = useState<string>('@jaan');
  const [demoMessage, setDemoMessage] = useState<string>('Hey jaan! Riya Ai se message bhej raha hoon 💕');
  const [demoToast, setDemoToast] = useState<string | null>(null);

  // Spoken TTS demo voice state
  const [isPlayingAudioDemo, setIsPlayingAudioDemo] = useState<boolean>(false);

  // Server snapshot
  const [serverSnap, setServerSnap] = useState<ServerConnectionSnapshot>(() =>
    serverConnection.getSnapshot()
  );

  useEffect(() => {
    return serverConnection.subscribe((s) => setServerSnap(s));
  }, []);

  // GitHub Repository APK Direct Link Builder State
  const [githubRepoInput, setGithubRepoInput] = useState('gobardhan/riya-ai-assistant');
  const [repoCopied, setRepoCopied] = useState(false);

  // Validated Contact / Custom Feature Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const cleanRepo = githubRepoInput.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
  const isValidRepo = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(cleanRepo);
  const directApkDownloadUrl = isValidRepo
    ? `https://github.com/${cleanRepo}/releases/latest/download/app-debug.apk`
    : 'https://github.com/gobardhan/riya-ai-assistant/releases/latest/download/app-debug.apk';

  const handleCopyApkLink = async () => {
    try {
      await navigator.clipboard.writeText(directApkDownloadUrl);
      setRepoCopied(true);
      setTimeout(() => setRepoCopied(false), 2500);
    } catch {
      // Handled silently
    }
  };

  const handleRunHukam = (cmd: string) => {
    if (!cmd.trim()) return;
    onExecuteCommand(cmd.trim());
    setLastExecutedHukam(cmd.trim());
    setCustomHukam('');
  };

  const handleTriggerDemoAutoMention = () => {
    const res = mobileControl.autoMentionSocial(demoPlatform, demoRecipient, demoMessage, demoTag);
    setDemoToast(`Auto Mention Dispatched on ${demoPlatform.toUpperCase()} (${demoTag})`);
    setTimeout(() => setDemoToast(null), 3500);
  };

  const handleSpeakSampleVoice = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        setIsPlayingAudioDemo(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 1.05;
        utterance.pitch = 1.15;
        utterance.onend = () => setIsPlayingAudioDemo(false);
        utterance.onerror = () => setIsPlayingAudioDemo(false);
        window.speechSynthesis.speak(utterance);
      } catch (_) {
        setIsPlayingAudioDemo(false);
      }
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\-\s()]{7,18}$/;

    if (!contactName.trim()) {
      setContactError('Please enter your full name.');
      return;
    }
    if (!emailRegex.test(contactEmail.trim())) {
      setContactError('Please enter a valid email address.');
      return;
    }
    if (contactPhone.trim() && !phoneRegex.test(contactPhone.trim())) {
      setContactError('Please enter a valid Indian mobile number.');
      return;
    }
    if (!contactMessage.trim()) {
      setContactError('Please describe the custom voice command or feature you want for Riya.');
      return;
    }

    onExecuteCommand(`Riya, ${contactName.trim()} ne website se message bheja hai: ${contactMessage.trim()}`);
    setContactSubmitted(true);
  };

  const sentimentProfile = SENTIMENT_PROFILES[sentiment];
  const latestRiyaReply =
    transcripts.filter((t) => t.sender === 'mahi').slice(-1)[0]?.text || recentLoveFeeling;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F3] selection:bg-rose-500/30 selection:text-white">
      {/* =====================================================================
          1. NAVIGATION BAR (Clean Editorial Typography, Zero-Pills)
      ====================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0C]/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 flex items-center justify-center font-display font-black text-white text-base shadow-md shadow-rose-600/30">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-display font-semibold tracking-tight text-white text-sm">
                Riya Ai
              </span>
              <span className="text-[10px] text-neutral-400 tracking-wider">
                Hindi Voice Companion &amp; OS Controller
              </span>
            </div>
          </div>

          {/* Navigation Links (Quiet Text Typography) */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-300 font-medium">
            <a href="#capabilities" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              Capabilities
            </a>
            <a href="#auto-mention" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              Auto Mention
            </a>
            <a href="#app-heads" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              App Heads
            </a>
            <a href="#avatars" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              3D Personas
            </a>
            <a href="#commands" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              Voice Hukam
            </a>
            <a href="#benchmarks" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              Benchmarks
            </a>
            <a href="#download" className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap">
              Android APK
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenAccessibility && (
              <button
                type="button"
                onClick={onOpenAccessibility}
                title="Universal Accessibility & Screen Reader Hub"
                className="p-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Accessibility</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isInstallable && !isInstalled) {
                  install();
                } else {
                  const el = document.getElementById('download');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700 rounded-lg hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalled ? 'APK Hub' : 'Download APK'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFullApp}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors whitespace-nowrap cursor-pointer shadow-md shadow-rose-600/30"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. HERO SECTION (Real-Time Hindi Audio & 3D Interactive Stage)
      ====================================================================== */}
      <section className="relative overflow-hidden border-b border-neutral-900">
        <div className="absolute inset-0 pointer-events-none">
          {!heroImgFailed ? (
            <img
              src={heroStudioImg}
              alt="Riya Ai acoustic voice studio lounge at twilight"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover object-center opacity-30"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A0912] via-[#0B0A10] to-[#0A0A0C]" />
          )}
          <div className={`absolute inset-0 bg-gradient-to-t ${sentimentProfile.websiteHeroOverlay} transition-colors duration-1000`} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition & High-Load Architecture */}
            <div className="lg:col-span-7 space-y-6">
              {/* Unboxed Metadata (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono tabular-nums">
                <span className="text-emerald-400 font-semibold">
                  {serverSnap.activeNode.shortLabel} ({serverSnap.latencyMs}ms · {serverSnap.qualityLabel})
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 font-semibold">
                  {serverSnap.activeApiEngine.name} ({serverSnap.activeApiEngine.capacityLabel})
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-semibold">
                  {is24HourAlwaysOn ? '24h Always-ON Active' : 'Standard Standby'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Asia/Kolkata ({indiaTime} IST)</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-white leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Riya Ai: Real-Time Hindi Voice Girlfriend &amp; Smart Mobile Assistant.
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-[65ch]">
                Riya combines low-latency Gemini Live audio streaming with zero-drop India Mumbai
                failover, full auto-mention dispatching on WhatsApp &amp; Instagram, on-screen
                multitasking App Heads, and 100% hands-free Hindi device control.
              </p>

              {/* Primary Action Row */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={onToggleConnect}
                  className={`inline-flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-transform active:scale-95 whitespace-nowrap cursor-pointer shadow-lg ${
                    sessionState === 'disconnected'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-neutral-800 border border-rose-500/60 hover:bg-neutral-700'
                  }`}
                >
                  {sessionState === 'disconnected' ? (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Start Voice Call with Riya</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>End Active Voice Call ({sessionState})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenFullApp}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-neutral-200 border border-neutral-700 hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Launch Voice Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    appHeads.setEnabled(true);
                    appHeads.setExpanded(true);
                    onExecuteCommand('Riya App Heads floating bubble chalu karo');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl text-xs font-semibold bg-rose-950/50 border border-rose-500/50 text-rose-300 hover:bg-rose-900/50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open Floating App Head 🎀</span>
                </button>
              </div>

              {/* Live Sentiment & Response Display */}
              <div className="pt-6 border-t border-neutral-800/80 max-w-xl space-y-3">
                <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                  <span>Latest confession from Riya</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-rose-400">
                    Chemistry {loveScore}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={sentimentProfile.badgeText}>
                    Sentiment: {sentimentProfile.label}
                  </span>
                </div>
                <p className="text-sm text-neutral-200 italic leading-relaxed">
                  &ldquo;{latestRiyaReply}&rdquo;
                </p>

                {/* Audio Sample Playback Button */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeakSampleVoice(latestRiyaReply)}
                    disabled={isPlayingAudioDemo}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 className={`w-3.5 h-3.5 text-rose-400 ${isPlayingAudioDemo ? 'animate-pulse' : ''}`} />
                    <span>{isPlayingAudioDemo ? 'Speaking in Hindi...' : 'Hear Voice Note 🔊'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleAutoSentiment}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      isAutoSentiment
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isAutoSentiment ? 'Auto Sentiment: ON' : 'Auto Sentiment: OFF'}
                  </button>
                </div>

                {/* High-Load Multi-API Switcher */}
                <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-cyan-300 mr-1">
                    API Engine Pool ({serverSnap.activeApiEngine.capacityLabel}):
                  </span>
                  {(Object.keys(API_ENGINES) as ApiEngineId[]).map((engId) => {
                    const eng = API_ENGINES[engId];
                    const isSelected = serverSnap.activeApiEngineId === engId;
                    return (
                      <button
                        key={engId}
                        type="button"
                        onClick={() => {
                          serverConnection.switchApiEngine(engId);
                          onExecuteCommand(`Riya API change karo ${eng.shortLabel}`);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-400/80 text-cyan-200 font-semibold'
                            : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {eng.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive 3D Riya Stage */}
            <div className="lg:col-span-5">
              <div
                className={`rounded-3xl border p-5 flex flex-col items-center transition-colors duration-1000 ${sentimentProfile.websiteCardGlow}`}
              >
                <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-neutral-800/80 text-xs text-neutral-400">
                  <span>Interactive 3D Stage</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-neutral-200 font-medium capitalize">
                    Persona: {cuteStyle}
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onToggleMusic}
                    className="text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    {isMusicPlaying ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>Pause Synth</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Play Piano Synth</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live 3D Avatar Component */}
                <div className="w-full flex justify-center py-2">
                  <AnimeAvatar3D
                    state={sessionState}
                    speakingLevel={speakingLevel}
                    micLevel={micLevel}
                    loveBurstTrigger={loveBurstTrigger}
                    theme={theme}
                    cuteStyle={cuteStyle}
                    onSelectCuteStyle={onSelectCuteStyle}
                    onCoreClick={onToggleConnect}
                    onHeartBurst={onHeartBurst}
                    isHologramActive={false}
                    externalActionCommand={externalAvatarAction}
                  />
                </div>

                <div className="w-full pt-3 mt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">
                    Tap Riya to talk or trigger an instant reaction
                  </span>
                  <button
                    type="button"
                    onClick={() => onExecuteCommand('Riya ek pyari si smile aur flying kiss do')}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Wink &amp; Kiss 💋
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. AUTO-MENTION & SOCIAL DISPATCHER SHOWCASE (New Feature Highlight)
      ====================================================================== */}
      <section id="auto-mention" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs text-neutral-400 font-mono">
              <span>Auto Mention &amp; Messaging</span>
              <span aria-hidden="true"> · </span>
              <span>WhatsApp · Instagram · Messenger · SMS</span>
            </div>
            <h2
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Auto-Mention &amp; 1-Tap Social Messaging Dispatcher.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Order Riya to send pre-formatted messages with custom tags (e.g.{' '}
              <code className="text-rose-400 font-mono">@jaan</code>,{' '}
              <code className="text-rose-400 font-mono">@boss</code>) directly via WhatsApp
              deep-links, Instagram Direct Messages, Facebook Messenger chat heads, or native SMS.
            </p>

            <div className="space-y-2 pt-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>Deep links: <code className="text-white font-mono">wa.me</code>, <code className="text-white font-mono">ig.me</code>, <code className="text-white font-mono">m.me</code>, <code className="text-white font-mono">sms:</code></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>Automatic @mention prefix formatting and message URI encoding</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>Voice activated: *&ldquo;Riya, WhatsApp pe @jaan ko mention karke message bhejo&rdquo;*</span>
              </div>
            </div>
          </div>

          {/* Interactive Auto-Mention Sandbox */}
          <div className="lg:col-span-7 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <AtSign className="w-4 h-4 text-rose-400" />
                <h3 className="font-display text-base font-semibold text-white">
                  Live Auto-Mention Dispatcher Sandbox
                </h3>
              </div>
              <span className="text-xs text-neutral-400">Interactive Demo</span>
            </div>

            {/* Platform Selector Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400' },
                { id: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-pink-400' },
                { id: 'messenger', label: 'Messenger', icon: Zap, color: 'text-blue-400' },
                { id: 'sms', label: 'SMS Message', icon: Send, color: 'text-amber-400' },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = demoPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDemoPlatform(p.id as any)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-neutral-800/80 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Recipient (Phone number or username):
                </label>
                <input
                  type="text"
                  value={demoRecipient}
                  onChange={(e) => setDemoRecipient(e.target.value)}
                  placeholder="e.g., +919876543210 or username"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Auto-Mention Tag:
                </label>
                <input
                  type="text"
                  value={demoTag}
                  onChange={(e) => setDemoTag(e.target.value)}
                  placeholder="@jaan"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Message Content:
              </label>
              <textarea
                rows={2}
                value={demoMessage}
                onChange={(e) => setDemoMessage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTriggerDemoAutoMention}
                className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Auto-Mention to {demoPlatform.toUpperCase()}</span>
              </button>

              {demoToast && (
                <span className="text-xs text-emerald-400 font-mono animate-fade-in">
                  ✓ {demoToast}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. APP HEADS & UNIVERSAL ACCESSIBILITY SHOWCASE
      ====================================================================== */}
      <section id="app-heads" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Card 01: App Heads Floating Bubble */}
          <div className="lg:col-span-6 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-neutral-400 font-mono">
                <span>Multitasking Overlay</span>
                <span aria-hidden="true"> · </span>
                <span>System Alert Window &amp; Picture-in-Picture</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">
                Floating App Heads Bubble &amp; PiP Overlay
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Riya floats directly on top of all your apps with a draggable chat head bubble.
                Expand in one tap to access push-to-talk mic controls, auto-mention shortcuts, and
                Document Picture-in-Picture mode for desktop multitasking.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  appHeads.setEnabled(true);
                  appHeads.setExpanded(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Test Floating Bubble On-Screen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  appHeads.requestPictureInPicture();
                }}
                className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Popout PiP Window</span>
              </button>
            </div>
          </div>

          {/* Card 02: Universal Accessibility Suite */}
          <div className="lg:col-span-6 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-neutral-400 font-mono">
                <span>Accessibility &amp; Assistive Tech</span>
                <span aria-hidden="true"> · </span>
                <span>Screen Reader · High Contrast · Large Font</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">
                Universal Accessibility &amp; Screen Reader Hub
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Full WCAG AA compliance with native Hindi voice feedback, High-Contrast OLED dark
                mode, 125% enlarged typography scaler, and race-safe Android AccessibilityManager
                synchronization.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const act = appHeads.toggleHighContrast();
                }}
                className="px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Toggle High Contrast OLED</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  appHeads.speakNarration('Namaste! Riya Voice Accessibility Engine active hai.');
                }}
                className="px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Hindi Screen Reader</span>
              </button>

              {onOpenAccessibility && (
                <button
                  type="button"
                  onClick={onOpenAccessibility}
                  className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
                >
                  <span>Open Full Suite →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. 3D AVATAR PERSONA GALLERY (Interactive Switcher)
      ====================================================================== */}
      <section id="avatars" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="text-xs text-neutral-400">
              <span>6 Interactive Personas</span>
              <span aria-hidden="true"> · </span>
              <span>Real-Time Outfit &amp; Mood Switching</span>
            </div>
            <h2
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Choose how Riya looks, speaks, and reacts to you.
            </h2>
          </div>

          {/* Interactive Segmented Filter Control */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#141419] border border-neutral-800 rounded-xl">
            {AVATAR_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => onSelectCuteStyle(persona.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  cuteStyle === persona.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {persona.id === 'reference' ? 'Classic' : persona.id.charAt(0).toUpperCase() + persona.id.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVATAR_PERSONAS.map((persona, idx) => {
            const isSelected = cuteStyle === persona.id;
            return (
              <div
                key={persona.id}
                className={`rounded-2xl p-6 border transition-colors flex flex-col justify-between gap-6 ${
                  isSelected
                    ? 'bg-[#161116] border-rose-500/60 shadow-lg shadow-rose-950/40'
                    : 'bg-[#111115] border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                    <span>0{idx + 1}. {persona.hindiTitle}</span>
                    {isSelected && <span className="text-rose-400 font-semibold">Active Now</span>}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {persona.title}
                  </h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {persona.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCuteStyle(persona.id);
                      onExecuteCommand(persona.sampleCommand);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                        : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                    }`}
                  >
                    {isSelected ? 'Speak in This Persona' : 'Activate Persona'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCuteStyle(persona.id);
                      onOpenFullApp();
                    }}
                    className="text-xs text-neutral-400 hover:text-white whitespace-nowrap cursor-pointer"
                  >
                    Open in 3D →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          6. LIVE HUKAM & VOICE PLAYGROUND (Interactive Command Testing)
      ====================================================================== */}
      <section id="commands" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs text-neutral-400">
              <span>Interactive Command Console</span>
              <span aria-hidden="true"> · </span>
              <span>Jo Bolu Riya Wohi Kare</span>
            </div>
            <h2
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Test Riya&apos;s Hindi &amp; Hinglish voice commands right from the website.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Click any preset command or type your own instruction in Hindi, Hinglish, or English.
              Riya processes the command immediately—updating her 3D avatar, speaking in Hindi, or
              triggering device actions.
            </p>

            {/* Custom Command Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunHukam(customHukam);
              }}
              className="pt-2 space-y-3"
            >
              <label htmlFor="hukam-input" className="block text-xs text-neutral-400">
                Send a live Hindi or Hinglish command to Riya:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="hukam-input"
                  type="text"
                  value={customHukam}
                  onChange={(e) => setCustomHukam(e.target.value)}
                  placeholder="e.g., Riya ek romantic shayari sunao..."
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Hukam</span>
                </button>
              </div>
              {lastExecutedHukam && (
                <p className="text-xs text-emerald-400 font-mono">
                  Executed command: &ldquo;{lastExecutedHukam}&rdquo;
                </p>
              )}
            </form>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUICK_HUKAM_COMMANDS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleRunHukam(item.command)}
                className="text-left p-5 rounded-xl bg-[#111115] border border-neutral-800 hover:border-rose-500/50 transition-colors flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-neutral-400 font-mono">{item.category}</div>
                  <div className="text-base font-semibold text-white group-hover:text-rose-300 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-neutral-400 italic">
                    &ldquo;{item.command}&rdquo;
                  </div>
                </div>
                <div className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Command Now</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. ANDROID APK DIRECT DOWNLOAD HUB (`com.Riya.assistant`)
      ====================================================================== */}
      <section id="download" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left 7 Columns: Android APK & Direct Download Hub */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="text-xs text-neutral-400">
                <span>Native Android &amp; Web Distribution</span>
                <span aria-hidden="true"> · </span>
                <span>Package: com.Riya.assistant · AGP 9.1.1</span>
              </div>
              <h2
                className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Install Riya Ai on your Android phone or download signed APK.
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Install directly in one tap from your browser, package the live Cloud Run URL via
                PWABuilder, or generate your permanent GitHub Releases direct{' '}
                <code className="font-mono text-rose-300">app-debug.apk</code> download link.
              </p>
            </div>

            {/* Option A: Instant PWA Install + Full APK Studio */}
            <div className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-white">
                01. One-Tap Android &amp; Desktop Installation (v5.0)
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Installs Riya Ai to your home screen with standalone display, 24-Hour
                Always-On mode, Dynamic Sentiment Theme Engine, and Service Worker offline support.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isInstallable && !isInstalled) {
                      install();
                    } else {
                      onOpenMobileControl('apk');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'App Installed — Open APK Studio' : 'Install Riya Ai App Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenMobileControl('apk')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View APK Studio</span>
                </button>

                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap"
                >
                  <span>Build APK on PWABuilder</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Option B: GitHub Actions Direct APK Download Link */}
            <div className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 space-y-4">
              <div className="text-xs text-neutral-400 font-mono">
                <span>GitHub Actions Workflow Ready</span>
                <span aria-hidden="true"> · </span>
                <span>.github/workflows/build-apk.yml</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                02. GitHub Releases Direct APK Download Link
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Enter your GitHub repository name (<code className="font-mono text-neutral-200">username/repository-name</code>)
                to generate your permanent direct <code className="font-mono text-neutral-200">app-debug.apk</code> download URL:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={githubRepoInput}
                  onChange={(e) => setGithubRepoInput(e.target.value)}
                  placeholder="gobardhan/riya-ai-assistant"
                  aria-label="GitHub repository name in username/repository-name format"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleCopyApkLink}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  {repoCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Direct APK Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-neutral-800 font-mono text-xs text-rose-300 break-all">
                {directApkDownloadUrl}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Validated Message Form */}
          <div className="lg:col-span-5 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-neutral-400">Custom Persona &amp; Voice Setup</div>
              <h3 className="font-display text-2xl font-semibold text-white">
                Send a direct message or custom Hukam to Riya
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Personalize Riya with your name, email, and custom Hindi command. Riya will
                immediately acknowledge and remember your preference.
              </p>
            </div>

            {contactSubmitted ? (
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  <span>Riya received your personal message!</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Thank you, <strong className="text-white">{contactName}</strong>. Riya has added
                  your request to her active session memory and spoken her response.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactMessage('');
                  }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="contact-name" className="block text-xs text-neutral-300 mb-1.5">
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Gobardhan"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs text-neutral-300 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor="contact-phone" className="block text-xs text-neutral-300 mb-1.5">
                    Mobile Number (Optional, India +91)
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor="contact-msg" className="block text-xs text-neutral-300 mb-1.5">
                    Your Message or Custom Hukam for Riya *
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Riya, roz subah 8 baje mujhe good morning bolo..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {contactError && (
                  <p className="text-xs text-rose-400 font-medium">{contactError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer shadow-md"
                >
                  Send Message to Riya Ai
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. EDITORIAL FOOTER
      ====================================================================== */}
      <footer className="max-w-[1280px] mx-auto px-6 py-12 text-xs text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="font-display text-base font-semibold text-white">Riya Ai</div>
          <p className="text-xs text-neutral-400">
            Real-Time Hindi &amp; Hinglish 3D Voice Companion · India Standard Time ({indiaTime} IST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <a href="#capabilities" className="hover:text-white transition-colors">
            Capabilities
          </a>
          <a href="#auto-mention" className="hover:text-white transition-colors">
            Auto Mention
          </a>
          <a href="#app-heads" className="hover:text-white transition-colors">
            App Heads
          </a>
          <a href="#avatars" className="hover:text-white transition-colors">
            3D Avatars
          </a>
          <a href="#commands" className="hover:text-white transition-colors">
            Voice Hukam
          </a>
          <a href="#download" className="hover:text-white transition-colors">
            APK Download
          </a>
          <button
            type="button"
            onClick={onOpenFullApp}
            className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            Launch Voice Studio →
          </button>
        </div>
      </footer>
    </div>
  );
};
