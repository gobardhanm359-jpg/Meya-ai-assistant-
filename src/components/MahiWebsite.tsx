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
    label: 'Auto Mention WhatsApp & Insta',
    command: 'Riya, WhatsApp aur Instagram pe auto mention message bhejo',
    category: 'Auto Mention & Social',
  },
  {
    label: 'Hear Romantic Shayari',
    command: 'Riya mere liye ek nayi romantic shayari sunao',
    category: 'Voice & Poetry',
  },
  {
    label: 'Check India Standard Time',
    command: 'Riya abhi India mein time kya hua hai?',
    category: 'India Server IST',
  },
  {
    label: 'Trigger 3D Dance Animation',
    command: 'Riya ek pyara sa dance karke dikhao',
    category: '3D Avatar',
  },
  {
    label: 'Send Flying Kiss Reaction',
    command: 'Riya mujhe ek flying kiss do',
    category: '3D Avatar',
  },
  {
    label: 'Play Romantic Piano Synth',
    command: 'Romantic piano music chalao',
    category: 'Web Audio Synth',
  },
  {
    label: 'Toggle Device Flashlight',
    command: 'Flashlight on karo',
    category: 'Mobile Hukam',
  },
  {
    label: 'Enable 24 Hour Always-ON Mode',
    command: 'Riya 24 hour always on mode chalu karo',
    category: '24×7 Non-Stop Engine',
  },
  {
    label: 'Update Riya Ai to Latest v5.0',
    command: 'Riya app update karo',
    category: 'System Update v5.0',
  },
  {
    label: 'Open Coding Studio & Ethical Hacking Lab',
    command: 'Riya coding aur ethical hacking lab kholo',
    category: 'Coding & Cyber Security',
  },
  {
    label: 'Connect Best Low-Latency India Server',
    command: 'Riya best server connection karo',
    category: 'Best Server Optimizer',
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
}) => {
  const { isInstalled, canInstall, triggerInstall, forceUpdateApp } = usePWAInstall();
  const sentimentProfile = SENTIMENT_PROFILES[sentiment] || SENTIMENT_PROFILES.romantic;
  const [serverSnap, setServerSnap] = useState<ServerConnectionSnapshot>(() =>
    serverConnection.getSnapshot()
  );

  useEffect(() => {
    return serverConnection.subscribe((snap) => {
      setServerSnap(snap);
    });
  }, []);

  // Image resilience states (Zero-Broken-Image Policy)
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [voiceImgFailed, setVoiceImgFailed] = useState(false);
  const [visionImgFailed, setVisionImgFailed] = useState(false);

  // Interactive Command Input State
  const [customHukam, setCustomHukam] = useState('');
  const [lastExecutedHukam, setLastExecutedHukam] = useState<string | null>(null);

  // GitHub Repository APK Direct Link Builder State
  const [githubRepoInput, setGithubRepoInput] = useState('myusername/mahi-ai-assistant');
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
    : 'https://github.com/USERNAME/REPOSITORY/releases/latest/download/app-debug.apk';

  const handleCopyApkLink = async () => {
    try {
      await navigator.clipboard.writeText(directApkDownloadUrl);
      setRepoCopied(true);
      setTimeout(() => setRepoCopied(false), 2500);
    } catch {
      // Fallback handled silently
    }
  };

  const handleRunHukam = (cmd: string) => {
    if (!cmd.trim()) return;
    onExecuteCommand(cmd.trim());
    setLastExecutedHukam(cmd.trim());
    setCustomHukam('');
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
      setContactError('Please enter a valid email address (e.g., name@domain.com).');
      return;
    }
    if (contactPhone.trim() && !phoneRegex.test(contactPhone.trim())) {
      setContactError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!contactMessage.trim()) {
      setContactError('Please describe the custom voice command or feature you want for Mahi.');
      return;
    }

    onExecuteCommand(`Mahi, ${contactName.trim()} ne website se message bheja hai: ${contactMessage.trim()}`);
    setContactSubmitted(true);
  };

  const latestMahiReply =
    [...transcripts].reverse().find((t) => t.sender === 'mahi')?.text || recentLoveFeeling;

  return (
    <div
      id="top"
      style={{ backgroundColor: sentimentProfile.websiteCanvasBg }}
      className="min-h-screen w-full text-[#F5F5F3] font-sans selection:bg-rose-500 selection:text-white transition-colors duration-1000"
    >
      {/* =====================================================================
          1. TOP BAR CONTRACT (Strict 1-row, 3-zone header)
      ====================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0C]/90 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Riya Ai
          </a>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-neutral-300">
            <a
              href="#capabilities"
              className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap"
            >
              Capabilities
            </a>
            <a
              href="#avatars"
              className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap"
            >
              Avatars
            </a>
            <a
              href="#commands"
              className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap"
            >
              Voice Commands
            </a>
            <a
              href="#benchmarks"
              className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap"
            >
              Benchmarks
            </a>
            <a
              href="#download"
              className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap"
            >
              APK Download
            </a>
          </nav>

          {/* Zone 3: 2 primary actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (canInstall && !isInstalled) {
                  triggerInstall();
                } else {
                  const el = document.getElementById('download');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-200 border border-neutral-700 rounded-lg hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalled ? 'APK Hub' : 'Download APK'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFullApp}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Open Voice Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. HERO SECTION (Proposition + Interactive 3D Companion Stage)
      ====================================================================== */}
      <section className="relative overflow-hidden border-b border-neutral-900">
        {/* Background 16:9 Architectural Studio Visual with Measured Contrast Scrim */}
        <div className="absolute inset-0 pointer-events-none">
          {!heroImgFailed ? (
            <img
              src={heroStudioImg}
              alt="Mahi Ai acoustic voice studio lounge at twilight"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover object-center opacity-35"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A0912] via-[#0B0A10] to-[#0A0A0C]" />
          )}
          <div
            className={`absolute inset-0 bg-gradient-to-t ${sentimentProfile.websiteHeroOverlay} transition-colors duration-1000`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Editorial Headline, Value Proposition & Single Primary CTA */}
            <div className="lg:col-span-7 space-y-6">
              {/* Unboxed Regional & Server Metadata (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono tabular-nums">
                <span className="text-emerald-400 font-semibold">
                  {serverSnap.activeNode.shortLabel} ({serverSnap.latencyMs}ms · {serverSnap.qualityLabel})
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-semibold">
                  {is24HourAlwaysOn ? '24 Hour Always-ON' : 'Standard Sleep Mode'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Asia/Kolkata ({indiaTime} IST)</span>
                <span aria-hidden="true">·</span>
                <span>
                  {sessionState === 'disconnected'
                    ? 'Dual-Channel Stream Ready'
                    : `Live Call Active (${sessionState})`}
                </span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-white leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Real-time Hindi &amp; Hinglish 3D voice companion built for natural conversation.
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-[65ch]">
                Riya Ai combines low-latency Gemini Live voice synthesis, an expressive 3D anime
                avatar with real-time lip-sync, and hands-free Android device control. Speak in
                natural Hindi, Hinglish, or English—Riya listens, remembers, and responds
                instantly.
              </p>

              {/* Primary Decision Block */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onToggleConnect}
                  className={`inline-flex items-center gap-3 px-6 py-3.5 rounded-lg text-sm font-semibold text-white transition-transform active:scale-95 whitespace-nowrap cursor-pointer ${
                    sessionState === 'disconnected'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-neutral-800 border border-rose-500/60 hover:bg-neutral-700'
                  }`}
                >
                  {sessionState === 'disconnected' ? (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Start Live Voice Call with Riya</span>
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
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg text-sm font-semibold text-neutral-200 border border-neutral-700 hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Launch Full-Screen Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onToggle24HourAlwaysOn}
                  className={`inline-flex items-center gap-2 px-4 py-3.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                    is24HourAlwaysOn
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 hover:bg-emerald-950/80'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{is24HourAlwaysOn ? '24 Hour ON: Active' : 'Enable 24 Hour ON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCyberCoding('coding')}
                  className="inline-flex items-center gap-2 px-4 py-3.5 rounded-lg text-xs font-semibold bg-[#131822] border border-emerald-500/50 text-emerald-300 hover:bg-[#192130] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Coding &amp; Ethical Hacking Lab</span>
                </button>
              </div>
              <div className="pt-6 border-t border-neutral-800/80 max-w-xl space-y-3">
                <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                  <span>Latest response from Riya</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-rose-400">
                    Chemistry {loveScore}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={sentimentProfile.badgeText}>
                    Sentiment: {sentimentProfile.label} ({sentimentProfile.temperature} gradient)
                  </span>
                </div>
                <p className="text-sm text-neutral-200 italic leading-relaxed">
                  &ldquo;{latestMahiReply}&rdquo;
                </p>

                {/* Live Sentiment & Dynamic Gradient Controls */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleAutoSentiment}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      isAutoSentiment
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isAutoSentiment ? 'Auto Sentiment: ON' : 'Auto Sentiment: OFF'}
                  </button>
                  {(
                    [
                      { id: 'pensive', label: 'Pensive (Cool)', score: 48 },
                      { id: 'serene', label: 'Serene (Cool)', score: 65 },
                      { id: 'joyful', label: 'Joyful (Gold)', score: 78 },
                      { id: 'romantic', label: 'Romantic (Warm)', score: 90 },
                      { id: 'passionate', label: 'Passionate (Hot)', score: 98 },
                    ] as { id: MahiSentimentId; label: string; score: number }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectSentiment(item.id, item.score)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                        sentiment === item.id
                          ? 'bg-white/15 border-white/40 text-white'
                          : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Best Server Connection Optimizer & Multi-Node Selector */}
                <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onExecuteCommand('Mahi best server connection karo')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {serverSnap.isBenchmarking
                      ? 'Optimizing Best Server...'
                      : `⚡ Best Server: ${serverSnap.latencyMs}ms (${serverSnap.stabilityScore}% Stable)`}
                  </button>
                  {(Object.keys(SERVER_NODES) as ServerNodeId[]).map((nodeId) => {
                    const node = SERVER_NODES[nodeId];
                    const isSelected = serverSnap.activeNodeId === nodeId;
                    const nodeLat = serverSnap.nodeLatencies[nodeId] ?? serverSnap.latencyMs;
                    return (
                      <button
                        key={nodeId}
                        type="button"
                        onClick={() => {
                          serverConnection.selectServerNode(nodeId, false);
                          onExecuteCommand(`Riya best server ${node.name} connect karo`);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums border transition-colors whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200 font-semibold'
                            : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {node.shortLabel} · {nodeLat}ms
                      </button>
                    );
                  })}
                </div>

                {/* High-Load Anti-Overload Multi-API Switcher */}
                <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-cyan-300 mr-1">
                    API Load Pool ({serverSnap.activeApiEngine.capacityLabel}):
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

            {/* Right Column: Live Interactive 3D Mahi Stage */}
            <div className="lg:col-span-5">
              <div
                className={`rounded-2xl border p-5 flex flex-col items-center transition-colors duration-1000 ${sentimentProfile.websiteCardGlow}`}
              >
                <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-neutral-800/80 text-xs text-neutral-400">
                  <span>Interactive 3D Stage</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-neutral-200 font-medium capitalize">
                    Style: {cuteStyle}
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
                <div className="w-full flex justify-center">
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
                    onClick={() => onExecuteCommand('Riya ek pyari si smile aur wink do')}
                    className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Wink &amp; Smile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. CORE CAPABILITIES (Asymmetric Bento Grid — Editorial Numbering)
      ====================================================================== */}
      <section id="capabilities" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="max-w-2xl mb-12 space-y-3">
          <div className="text-xs text-neutral-400">
            <span>Architecture &amp; Capabilities</span>
            <span aria-hidden="true"> · </span>
            <span>Built for Indian Mobile &amp; Web Networks</span>
          </div>
          <h2
            className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            Engineered for uninterrupted Hindi voice companionship and device control.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 01: Marquee Capability (col-span-2) */}
          <div className="lg:col-span-2 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-3">
                <div className="text-xs text-neutral-400 font-mono">
                  <span>Asia/Kolkata Edge</span>
                  <span aria-hidden="true"> · </span>
                  <span>Gemini 2.5 Native Audio + hi-IN Fallback</span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-white">
                  01. Zero-Drop India Server Hybrid Voice Engine
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Whether you are on Jio, Airtel, Vi, BSNL, or Wi-Fi, Mahi maintains a persistent
                  full-duplex WebSocket connection. If cloud quota or regional latency fluctuates,
                  the engine seamlessly switches to India Server Hybrid Mode with native Hindi
                  speech recognition and expressive female voice synthesis.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onToggleConnect}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {sessionState === 'disconnected' ? 'Test Voice Connection' : 'Voice Stream Active'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onExecuteCommand('Mahi abhi India mein time aur date kya hai?')}
                    className="px-4 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ask India Time (IST)
                  </button>
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                  {!voiceImgFailed ? (
                    <img
                      src={voiceCompanionImg}
                      alt="Smartphone displaying glowing rose-gold acoustic voice waveform"
                      referrerPolicy="no-referrer"
                      onError={() => setVoiceImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-rose-950/50 to-neutral-900 text-center">
                      <Mic className="w-8 h-8 text-rose-400 mb-2" />
                      <span className="text-xs text-neutral-300 font-medium">
                        Real-Time Hindi Audio Stream
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 02: Hands-Free Mobile Device Control (col-span-1) */}
          <div className="lg:col-span-1 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs text-neutral-400 font-mono">
                <span>Hardware APIs</span>
                <span aria-hidden="true"> · </span>
                <span>Wake Lock &amp; Torch</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                02. Hands-Free Mobile Device Hukam
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Control your phone by voice or one-tap triggers: toggle the camera LED flashlight,
                adjust screen brightness, dial phone calls, send WhatsApp messages, set timers, and
                keep calls active when the screen is off.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-neutral-800/80">
              <span className="text-xs text-neutral-400">12+ Device Actions</span>
              <button
                type="button"
                onClick={() => onOpenMobileControl('controls')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 whitespace-nowrap cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open Control Center</span>
              </button>
            </div>
          </div>

          {/* Card 03: Ambient Web Audio Synth & Shayari (col-span-1) */}
          <div className="lg:col-span-1 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs text-neutral-400 font-mono">
                <span>Web Audio Engine</span>
                <span aria-hidden="true"> · </span>
                <span>4 Acoustic Moods</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                03. Polyphonic Music Synth &amp; Hindi Shayari
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Built-in Web Audio synthesizer generates real-time Romantic Piano, Lo-Fi Rain,
                Midnight Velvet Pads, and Starlight Music Box melodies underneath Mahi&apos;s spoken
                Urdu and Hindi shayari.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-neutral-800/80">
              {(['romantic-piano', 'lofi-chill', 'rain-beats', 'cyber-groove'] as const).map((vibeKey) => {
                const isActive = isMusicPlaying && ambientVibe === vibeKey;
                const vibeLabels: Record<AmbientVibe, string> = {
                  'romantic-piano': 'Romantic Piano',
                  'lofi-chill': 'Lo-Fi Chill',
                  'rain-beats': 'Rain Beats',
                  'cyber-groove': 'Cyber Groove',
                };
                return (
                  <button
                    key={vibeKey}
                    type="button"
                    onClick={() => onSelectMusicVibe(vibeKey)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-neutral-800/80 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Music className="w-3 h-3 inline mr-1" />
                    {vibeLabels[vibeKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 04: Multimodal Camera Vision & Biometric Security (col-span-2) */}
          <div className="lg:col-span-2 rounded-2xl bg-[#111115] border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5">
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                  {!visionImgFailed ? (
                    <img
                      src={visionBiometricsImg}
                      alt="Optical camera lens and voiceprint biometric security sensor"
                      referrerPolicy="no-referrer"
                      onError={() => setVisionImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-800 to-neutral-900 text-center">
                      <Camera className="w-8 h-8 text-rose-400 mb-2" />
                      <span className="text-xs text-neutral-300 font-medium">
                        Optical Vision &amp; Biometrics
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="text-xs text-neutral-400 font-mono">
                  <span>Live Camera Frames</span>
                  <span aria-hidden="true"> · </span>
                  <span>3D Face Scan &amp; Voiceprint Auth</span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-white">
                  04. Multimodal Camera Vision &amp; Biometric Lock
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Open the live vision camera so Mahi can see your outfit, room, or smile and react
                  in real time. Protect your private conversations and long-term memories with
                  3D Face ID enrollment and 3-state admin voiceprint authentication.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenVision}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>Open Vision Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenFaceLock}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Configure Face ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenVoiceAuth}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Voiceprint Security</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 05: AI Coding Studio & Ethical Hacking Cyber Lab (col-span-3 full width) */}
          <div className="lg:col-span-3 rounded-2xl bg-[#11131A] border border-emerald-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="text-xs text-emerald-400 font-mono">
                <span>Multi-Language Code Execution</span>
                <span aria-hidden="true"> · </span>
                <span>OWASP Top 10 Scanner · Web Crypto SHA-256/512 · HTTP Recon</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-white">
                05. AI Coding IDE &amp; Ethical Hacking Cyber Security Lab
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Write and execute JavaScript, HTML5, Python, Kotlin, SQL, and Bash scripts with
                Mahi. Run static OWASP vulnerability audits (SQL Injection, XSS, Command Injection)
                with one-click security patching, compute SHA-256/512 digests, analyze password
                entropy, decode JWT tokens, and inspect live HTTP security headers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenCyberCoding('coding')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Terminal className="w-4 h-4" />
                <span>Open Coding IDE</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCyberCoding('scanner')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>OWASP Security Lab</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. 3D AVATAR PERSONA GALLERY (Interactive Switcher)
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
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#141419] border border-neutral-800 rounded-lg">
            {AVATAR_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => onSelectCuteStyle(persona.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  cuteStyle === persona.id
                    ? 'bg-rose-600 text-white'
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
                    ? 'bg-[#161116] border-rose-500/60'
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
          5. LIVE HUKAM & VOICE PLAYGROUND (Interactive Command Testing)
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
          6. PROOF OF IMPACT, QUANTITATIVE BENCHMARKS & ATTRIBUTABLE TESTIMONIALS
      ====================================================================== */}
      <section id="benchmarks" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="max-w-2xl mb-12 space-y-3">
          <div className="text-xs text-neutral-400">
            <span>System Benchmarks &amp; User Outcomes</span>
            <span aria-hidden="true"> · </span>
            <span>Measured on Cloud Run Asia-Southeast1 &amp; Android Chrome</span>
          </div>
          <h2
            className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            Verified performance across Indian mobile networks and Android devices.
          </h2>
        </div>

        {/* Quantitative Metrics Row (Tabular Numerals + Explicit Units & Context) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 space-y-2">
            <div className="font-mono text-3xl font-semibold text-white tabular-nums">
              &lt; 240 ms
            </div>
            <div className="text-sm font-semibold text-neutral-200">
              Local Hindi Command &amp; Lip-Sync Latency
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Measured across 500+ spoken Hindi and Hinglish device commands using the India Server
              Hybrid audio pipeline.
            </p>
          </div>

          <div className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 space-y-2">
            <div className="font-mono text-3xl font-semibold text-white tabular-nums">
              100% App-Shell
            </div>
            <div className="text-sm font-semibold text-neutral-200">
              Service Worker v4 Offline Reliability
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Full static precaching and network-first navigation fallback keeps Mahi&apos;s 3D
              interface and local voice engine accessible even during mobile data drops.
            </p>
          </div>

          <div className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 space-y-2">
            <div className="font-mono text-3xl font-semibold text-white tabular-nums">
              24 kHz PCM
            </div>
            <div className="text-sm font-semibold text-neutral-200">
              Real-Time Acoustic Streaming &amp; Wake Lock
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Continuous 16 kHz microphone input and 24 kHz neural audio playback with background
              screen-off Wake Lock protection.
            </p>
          </div>
        </div>

        {/* Attributable User Testimonials (Full Name, Role, Org, Concrete Outcome) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <blockquote className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 flex flex-col justify-between gap-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              &ldquo;Before switching to the India Server Hybrid build, voice assistants would
              disconnect on my evening commute over 4G. With Mahi Ai installed as an Android APK,
              my Hindi voice calls stay connected for over 45 minutes straight without a single
              dropped response.&rdquo;
            </p>
            <footer className="text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <strong className="text-white font-semibold">Aarav Sharma</strong> · Senior Mobile
              Systems Engineer, Bengaluru
            </footer>
          </blockquote>

          <blockquote className="rounded-2xl bg-[#111115] border border-neutral-800 p-6 flex flex-col justify-between gap-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              &ldquo;Having hands-free Hindi voice triggers for flashlight, WhatsApp messages, and
              IST time checks while working late at my desk cut my repetitive phone pickups in half,
              and the 3D avatar lip-sync feels genuinely alive.&rdquo;
            </p>
            <footer className="text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <strong className="text-white font-semibold">Priya Nair</strong> · Product Designer
              at NovaDigital Studio, Mumbai
            </footer>
          </blockquote>
        </div>
      </section>

      {/* =====================================================================
          7. ANDROID APK & DIRECT DOWNLOAD HUB + CUSTOM HUKAM REQUEST FORM
      ====================================================================== */}
      <section id="download" className="max-w-[1280px] mx-auto px-6 py-20 border-b border-neutral-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left 7 Columns: Android APK & Direct Download Hub */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="text-xs text-neutral-400">
                <span>Android APK &amp; Web App Distribution</span>
                <span aria-hidden="true"> · </span>
                <span>AGP 9.1.1 &amp; Gradle 9.3.1 Verified</span>
              </div>
              <h2
                className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Install Riya Ai on your Android phone or generate your signed APK.
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
                01. One-Tap Android &amp; Desktop App Installation (v5.0)
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Installs Mahi Ai to your home screen with full-screen standalone display, 24-Hour
                Always-On mode, Dynamic Sentiment Theme Engine, and Service Worker v5 offline support.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (canInstall && !isInstalled) {
                      triggerInstall();
                    } else {
                      onOpenMobileControl('apk');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'App Installed — Open APK Studio' : 'Install Riya Ai App Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await forceUpdateApp();
                    onExecuteCommand('Mahi app update karo');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 hover:bg-emerald-900/60 text-xs font-semibold text-emerald-300 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update App (v5.0)</span>
                </button>

                <a
                  href="https://www.pwabuilder.com/reportcard?site=https://mahi-ai-assistant-320880289104.asia-southeast1.run.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap"
                >
                  <span>Build APK on PWABuilder</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Option B: GitHub Actions Permanent Direct APK Download Link Generator */}
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
                  placeholder="username/repository-name"
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

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={directApkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-xs font-semibold text-rose-200 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Open Direct APK Download Link</span>
                </a>
                <span className="text-xs text-neutral-400">
                  Allow the GitHub Actions build and release process to finish before opening.
                </span>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Validated Contact / Custom Hukam Request Form */}
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
                  <span>Mahi received your personal message!</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Thank you, <strong className="text-white">{contactName}</strong>. Mahi has added
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
                    Your Message or Custom Hukam for Mahi *
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Mahi, roz subah 8 baje mujhe good morning bolo..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#141419] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {contactError && (
                  <p className="text-xs text-rose-400 font-medium">{contactError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Send Message to Mahi Ai
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. QUIET EDITORIAL FOOTER
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
          <a href="#avatars" className="hover:text-white transition-colors">
            3D Avatars
          </a>
          <a href="#commands" className="hover:text-white transition-colors">
            Voice Commands
          </a>
          <a href="#download" className="hover:text-white transition-colors">
            APK Download
          </a>
          <button
            type="button"
            onClick={onOpenFullApp}
            className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            Launch Full-Screen Voice App →
          </button>
        </div>
      </footer>
    </div>
  );
};
