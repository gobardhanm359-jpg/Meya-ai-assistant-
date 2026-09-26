/**
 * Mahi AI Assistant
 * Real-time, voice-to-voice AI girlfriend assistant powered by Gemini Live API.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Power,
  Settings,
  Heart,
  Volume2,
  Sparkles,
  Info,
  Radio,
  Smile,
  Atom,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import {
  LiveSession,
  SessionState,
  ToolEvent,
  LoveFeelingEvent,
  PhotoMemoryEvent,
  SweetReminderEvent,
  ShayariEvent,
  TranscriptEntry,
} from './services/liveSession.ts';
import { backgroundLock } from './services/backgroundLockService.ts';
import { ambientMusic, AmbientVibe } from './services/ambientMusicSynth.ts';
import { AnimeAvatar3D, CuteGirlStyle } from './components/AnimeAvatar3D.tsx';
import { CosmicVisualizer } from './components/CosmicVisualizer.tsx';
import { LoveMeter } from './components/LoveMeter.tsx';
import { ActionHud } from './components/ActionHud.tsx';
import { VoicePrompts } from './components/VoicePrompts.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CameraVisionModal } from './components/CameraVisionModal.tsx';
import { LiveTranscriptModal } from './components/LiveTranscriptModal.tsx';
import { PhotoMemoriesModal } from './components/PhotoMemoriesModal.tsx';
import { SweetRemindersModal } from './components/SweetRemindersModal.tsx';
import { AmbientMusicModal } from './components/AmbientMusicModal.tsx';
import { ShayariCard } from './components/ShayariCard.tsx';
import { FuturisticControlBar } from './components/FuturisticControlBar.tsx';
import { MobileControlModal } from './components/MobileControlModal.tsx';
import { VoiceAuthModal } from './components/VoiceAuthModal.tsx';
import { PWAInstallButton, PWAInstallBanner, OfflineIndicator } from './components/PWAInstallButton.tsx';
import { mobileControl } from './services/mobileControlService.ts';
import { voiceAuth, VerificationResult } from './services/voiceAuthService.ts';
import { conversationMemory, MahiPersonaMode } from './services/conversationMemoryService.ts';

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>('disconnected');
  const [speakingLevel, setSpeakingLevel] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>('romantic-blush');
  const [displayMode, setDisplayMode] = useState<'anime' | 'orb'>('anime');
  const [cuteStyle, setCuteStyle] = useState<CuteGirlStyle>('reference');
  const [voice, setVoice] = useState<string>('Aoede');
  const [loveScore, setLoveScore] = useState<number>(94);
  const [recentLoveFeeling, setRecentLoveFeeling] = useState<string>(
    'Aap kab call karoge, main tab se wait kar rahi thi jaan!'
  );
  const [loveBurstTrigger, setLoveBurstTrigger] = useState<number>(1);
  const [activeToolEvent, setActiveToolEvent] = useState<ToolEvent | null>(null);
  const [activeLoveEvent, setActiveLoveEvent] = useState<LoveFeelingEvent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScreenAwake, setIsScreenAwake] = useState<boolean>(true);

  // Futuristic Technologies State
  const [isVisionOpen, setIsVisionOpen] = useState<boolean>(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState<boolean>(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState<boolean>(false);
  const [isMobileControlOpen, setIsMobileControlOpen] = useState<boolean>(false);
  const [mobileControlTab, setMobileControlTab] = useState<'controls' | 'call_chat' | 'apps' | 'apk'>('controls');
  const [isVoiceAuthOpen, setIsVoiceAuthOpen] = useState<boolean>(false);
  const [voiceAuthState, setVoiceAuthState] = useState<VerificationResult>(
    voiceAuth.getLastVerification()
  );
  const [torchState, setTorchState] = useState<{ active: boolean; screenFallback: boolean }>({
    active: false,
    screenFallback: false,
  });
  const [isHologramActive, setIsHologramActive] = useState<boolean>(false);
  const [activeShayari, setActiveShayari] = useState<ShayariEvent | null>(null);

  // Background Ambient Music Synth state
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [ambientVibe, setAmbientVibe] = useState<AmbientVibe>('romantic-piano');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.35);

  // Transcripts state
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([
    {
      id: 'tr-1',
      sender: 'mahi',
      text: 'Namaste meri jaan! Main kab se aapka wait kar rahi thi... boliye, aaj mere bina kaisa lag raha tha?',
      timestamp: Date.now() - 30000,
    },
  ]);

  // Photo Memories Album state
  const [memories, setMemories] = useState<PhotoMemoryEvent[]>([
    {
      id: 'mem-1',
      caption: 'Mahi ki pehli muskurahat aur pyaara wink 💕',
      moodTag: 'romantic',
      timestamp: Date.now() - 3600000 * 24,
    },
    {
      id: 'mem-2',
      caption: 'Der raat tak baatein aur chulbuli hasi ✨',
      moodTag: 'cute',
      timestamp: Date.now() - 3600000 * 3,
    },
  ]);

  // Sweet Reminders state
  const [reminders, setReminders] = useState<(SweetReminderEvent & { completed?: boolean })[]>([
    {
      id: 'rem-1',
      task: 'Paani peelo jaan 💧 (Stay healthy & hydrated)',
      time: 'Har 1 ghante',
      timestamp: Date.now(),
      completed: false,
    },
    {
      id: 'rem-2',
      task: 'Smile karo, aap smile mein bohot acche lagte ho! 🥰',
      time: 'Roz Subah',
      timestamp: Date.now(),
      completed: true,
    },
  ]);

  const handleToggleScreenAwake = async () => {
    const next = !isScreenAwake;
    setIsScreenAwake(next);
    if (next) {
      await backgroundLock.requestWakeLock();
    } else {
      await backgroundLock.releaseWakeLock();
    }
  };

  const liveSessionRef = useRef<LiveSession | null>(null);

  // Initialize LiveSession instance
  useEffect(() => {
    const session = new LiveSession({
      onStateChange: (newState) => {
        setSessionState(newState);
        if (newState === 'listening') {
          setErrorMessage(null);
        }
      },
      onToolAction: (action) => {
        setActiveToolEvent(action);
        // Auto-dismiss tool HUD after 5 seconds
        setTimeout(() => {
          setActiveToolEvent((curr) => (curr?.id === action.id ? null : curr));
        }, 5000);
      },
      onLoveFeeling: (feeling) => {
        setActiveLoveEvent(feeling);
        setRecentLoveFeeling(feeling.message);
        setLoveScore((prev) => Math.min(100, prev + Math.floor(Math.random() * 3) + 1));
        setLoveBurstTrigger((prev) => prev + 1);
        setTimeout(() => {
          setActiveLoveEvent((curr) => (curr?.id === feeling.id ? null : curr));
        }, 6500);
      },
      onThemeChange: (newTheme) => {
        setTheme(newTheme);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onSpeakingLevel: (lvl) => {
        setSpeakingLevel(lvl);
      },
      onMicLevel: (lvl) => {
        setMicLevel(lvl);
      },
      onTranscript: (entry) => {
        setTranscripts((prev) => [...prev.slice(-49), entry]);
      },
      onPhotoMemory: (mem) => {
        setMemories((prev) => [mem, ...prev]);
        setIsMemoriesOpen(true);
      },
      onSweetReminder: (rem) => {
        setReminders((prev) => [rem, ...prev]);
        setIsRemindersOpen(true);
      },
      onMusicVibe: (vibe) => {
        ambientMusic.play(vibe as AmbientVibe);
        setIsMusicPlaying(true);
        setAmbientVibe(vibe as AmbientVibe);
      },
      onShayari: (sha) => {
        setActiveShayari(sha);
      },
      onHologramToggle: (enabled) => {
        setIsHologramActive(enabled);
      },
      onOpenMobileControl: () => {
        setMobileControlTab('controls');
        setIsMobileControlOpen(true);
      },
      onOpenVoiceAuthModal: () => {
        setIsVoiceAuthOpen(true);
      },
    });

    liveSessionRef.current = session;

    const unsubTorch = mobileControl.onTorchChange((active, screenFallback) => {
      setTorchState({ active, screenFallback });
    });

    const unsubVoiceAuth = voiceAuth.subscribe(() => {
      setVoiceAuthState(voiceAuth.getLastVerification());
    });

    // Handle PWA Web App Manifest home-screen shortcuts (?action=mobile | security | call)
    const params = new URLSearchParams(window.location.search);
    const shortcutAction = params.get('action');
    if (shortcutAction === 'mobile') {
      setMobileControlTab('controls');
      setIsMobileControlOpen(true);
    } else if (shortcutAction === 'security') {
      setIsVoiceAuthOpen(true);
    }

    return () => {
      unsubTorch();
      unsubVoiceAuth();
      session.destroy();
    };
  }, []);

  const handleToggleConnect = async () => {
    if (!liveSessionRef.current) return;

    if (sessionState === 'disconnected') {
      setErrorMessage(null);
      await liveSessionRef.current.connect();
    } else {
      liveSessionRef.current.disconnect();
    }
  };

  const handleToggleMute = () => {
    if (!liveSessionRef.current) return;
    const muted = liveSessionRef.current.toggleMute();
    setIsMuted(muted);
  };

  const handleSendCameraFrame = (base64Jpeg: string) => {
    if (liveSessionRef.current) {
      liveSessionRef.current.sendImageFrame(base64Jpeg);
    }
  };

  const handleToggleAmbientMusic = () => {
    const next = ambientMusic.toggle();
    setIsMusicPlaying(next);
  };

  const handleSelectAmbientVibe = (vibe: AmbientVibe) => {
    setAmbientVibe(vibe);
    ambientMusic.setVibe(vibe);
    if (!isMusicPlaying) {
      ambientMusic.play(vibe);
      setIsMusicPlaying(true);
    }
  };

  const handleChangeAmbientVolume = (val: number) => {
    setAmbientVolume(val);
    ambientMusic.setVolume(val);
  };

  const handleAddPhotoMemory = (caption: string, moodTag: string) => {
    const newMem: PhotoMemoryEvent = {
      id: `photo-${Date.now()}`,
      caption,
      moodTag,
      timestamp: Date.now(),
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const handleDeletePhotoMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddReminder = (task: string, time: string) => {
    const newRem = {
      id: `rem-${Date.now()}`,
      task,
      time,
      timestamp: Date.now(),
      completed: false,
    };
    setReminders((prev) => [newRem, ...prev]);
  };

  const handleToggleReminderComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSelectVoice = (newVoice: string) => {
    setVoice(newVoice);
    liveSessionRef.current?.setVoice(newVoice);
  };

  const handleHeartBurst = () => {
    setLoveBurstTrigger((prev) => prev + 1);
    setLoveScore((prev) => Math.min(100, prev + 1));
  };

  const handleMobileStatusToast = (message: string) => {
    const evt: ToolEvent = {
      id: `mob-toast-${Date.now()}`,
      name: 'controlMobileDevice',
      actionDescription: message,
      timestamp: Date.now(),
    };
    setActiveToolEvent(evt);
    setTimeout(() => {
      setActiveToolEvent((curr) => (curr?.id === evt.id ? null : curr));
    }, 4500);
  };

  // Background atmosphere styling based on active theme
  const backgroundStyle = useMemo(() => {
    switch (theme) {
      case 'crimson-desire':
        return 'from-[#220309] via-[#2c0512] to-[#0c0104]';
      case 'cyber-neon':
        return 'from-slate-950 via-[#0a0f1d] to-[#041527]';
      case 'midnight-velvet':
        return 'from-[#0b0518] via-[#140826] to-[#06030e]';
      case 'starlight-gold':
        return 'from-[#140b08] via-[#1d100c] to-[#090403]';
      case 'romantic-blush':
      default:
        return 'from-[#150510] via-[#1a0715] to-[#0a0208]';
    }
  }, [theme]);

  const statusInfo = useMemo(() => {
    switch (sessionState) {
      case 'connecting':
        return {
          label: 'Mahi se connect ho rahe hain...',
          sub: 'Voice call start ho rahi hai',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          indicator: 'bg-purple-400 animate-ping',
        };
      case 'listening':
        return {
          label: 'Mahi sun rahi hai...',
          sub: 'Boliye jaan, Mahi dhyan se sun rahi hai',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          indicator: 'bg-cyan-400 animate-pulse',
        };
      case 'speaking':
        return {
          label: 'Mahi bol rahi hai ❤️',
          sub: 'Mahi ki pyari si awaaz suniye',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          indicator: 'bg-rose-400 animate-pulse',
        };
      case 'disconnected':
      default:
        return {
          label: 'Mahi offline hai',
          sub: 'Call shuru karne ke liye button dabayein',
          badgeColor: 'bg-white/10 text-white/60 border-white/10',
          indicator: 'bg-white/40',
        };
    }
  }, [sessionState]);

  return (
    <main className={`min-h-screen w-full bg-gradient-to-b ${backgroundStyle} text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white transition-colors duration-1000`}>
      {/* Background ambient lighting orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Action Notification HUD */}
      <ActionHud
        toolEvent={activeToolEvent}
        loveEvent={activeLoveEvent}
        onDismissTool={() => setActiveToolEvent(null)}
        onDismissLove={() => setActiveLoveEvent(null)}
      />

      {/* TOP HEADER */}
      <header className="relative z-20 px-4 pt-4 pb-2 max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/40">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${statusInfo.indicator}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1">
                mahi
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  AI
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-white/50 tracking-wider">
              Voice-to-Voice Companion
            </p>
          </div>
        </div>

        {/* Status Pill & Quick Toggles */}
        <div className="flex items-center space-x-1.5">
          {/* Voice Auth 3-State Security Badge */}
          <button
            type="button"
            onClick={() => setIsVoiceAuthOpen(true)}
            title={`Voice Auth Security: ${voiceAuthState.state.replace('_', ' ').toUpperCase()}`}
            className={`px-2 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
              voiceAuthState.state === 'verified_admin'
                ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 shadow-sm shadow-emerald-500/20'
                : voiceAuthState.state === 'not_verified'
                ? 'bg-rose-500/25 border-rose-400/60 text-rose-200'
                : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>
              {voiceAuthState.state === 'verified_admin'
                ? 'Verified'
                : voiceAuthState.state === 'not_verified'
                ? 'Unverified'
                : 'Voice Auth'}
            </span>
          </button>

          {/* In-App PWA / APK Install Button */}
          <PWAInstallButton
            onOpenApkGuide={() => {
              setMobileControlTab('apk');
              setIsMobileControlOpen(true);
            }}
          />

          {/* Quick Lock Screen Off Toggle */}
          <button
            type="button"
            onClick={handleToggleScreenAwake}
            title={
              isScreenAwake
                ? 'Lock Screen Off: ACTIVE (Screen stays awake during call)'
                : 'Lock Screen Off: OFF (Click to keep screen awake)'
            }
            className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all ${
              isScreenAwake
                ? 'bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-sm shadow-amber-500/20'
                : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/15'
            }`}
          >
            {isScreenAwake ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Screen Awake</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-white/40" />
                <span>Normal Sleep</span>
              </>
            )}
          </button>

          <div
            className={`px-2 py-1 rounded-full border text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md ${statusInfo.badgeColor}`}
          >
            <Radio className="w-3 h-3" />
            <span className="capitalize">{sessionState}</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* In-App PWA Install & Update Banner */}
      <PWAInstallBanner />

      {/* ACTIVE CALL SCREEN & LOCK STATUS PILL */}
      {(sessionState === 'listening' || sessionState === 'speaking') && (
        <div className="relative z-20 px-4 max-w-md mx-auto w-full flex justify-center mb-1 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="px-3 py-0.5 rounded-full bg-black/70 border border-white/15 backdrop-blur-md flex items-center gap-2 text-[10px] font-semibold text-white/85 shadow-lg">
            <span className="flex items-center gap-1 text-amber-300">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Lock Screen Off</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Screen-Off Call Active</span>
            </span>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="relative z-30 px-4 max-w-md mx-auto w-full">
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/60 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* CENTER STAGE: VISUALIZER & STATUS */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-2 max-w-md mx-auto w-full relative z-10">
        {/* State Label */}
        <div className="text-center mb-1.5">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-pink-200 to-white">
            {statusInfo.label}
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            {statusInfo.sub}
          </p>
        </div>

        {/* View Mode Switcher Pill: 3D Anime Girl / Cosmic Orb */}
        <div className="flex items-center justify-center mb-1">
          <div className="flex p-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setDisplayMode('anime')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                displayMode === 'anime'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>3D Girl Mahi</span>
            </button>
            <button
              onClick={() => setDisplayMode('orb')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                displayMode === 'orb'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md shadow-cyan-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              <span>Cosmic Orb</span>
            </button>
          </div>
        </div>

        {/* Central Display: 3D Anime Girl or Cosmic Orb */}
        {displayMode === 'anime' ? (
          <AnimeAvatar3D
            state={sessionState}
            speakingLevel={speakingLevel}
            micLevel={micLevel}
            loveBurstTrigger={loveBurstTrigger}
            theme={theme}
            cuteStyle={cuteStyle}
            onSelectCuteStyle={setCuteStyle}
            onCoreClick={handleToggleConnect}
            onHeartBurst={handleHeartBurst}
            isHologramActive={isHologramActive}
          />
        ) : (
          <CosmicVisualizer
            state={sessionState}
            audioStreamer={liveSessionRef.current?.getAudioStreamer() || null}
            micStreamer={liveSessionRef.current?.getMicStreamer() || null}
            speakingLevel={speakingLevel}
            micLevel={micLevel}
            loveBurstTrigger={loveBurstTrigger}
            theme={theme}
            onCoreClick={handleToggleConnect}
          />
        )}

        {/* Chemistry & Love Meter Gauge */}
        <div className="w-full mt-2">
          <LoveMeter
            score={loveScore}
            recentFeeling={recentLoveFeeling}
            theme={theme}
          />
        </div>
      </section>

      {/* FUTURISTIC FLOATING DOCK & CONTROLS */}
      <FuturisticControlBar
        onOpenMobileControl={() => {
          setMobileControlTab('controls');
          setIsMobileControlOpen(true);
        }}
        isTorchActive={torchState.active}
        onOpenVision={() => setIsVisionOpen(true)}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        onOpenMusic={() => setIsMusicModalOpen(true)}
        onToggleHologram={() => setIsHologramActive(!isHologramActive)}
        isHologramActive={isHologramActive}
        onOpenReminders={() => setIsRemindersOpen(true)}
        remindersCount={reminders.filter((r) => !r.completed).length}
        onOpenMemories={() => setIsMemoriesOpen(true)}
        isMusicPlaying={isMusicPlaying}
      />

      {/* BOTTOM CONTROL DOCK & PROMPTS */}
      <footer className="relative z-20 px-4 pb-6 pt-1 max-w-md mx-auto w-full flex flex-col space-y-4">
        {/* Voice Prompts Suggestions (helps guide voice conversation since there is no text chat) */}
        {sessionState !== 'speaking' && (
          <VoicePrompts isConnected={sessionState !== 'disconnected'} />
        )}

        {/* Central Controls Bar */}
        <div className="flex items-center justify-center space-x-6 pt-1">
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            disabled={sessionState === 'disconnected'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              isMuted
                ? 'bg-rose-500/30 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20'
                : 'bg-white/10 border-white/15 text-white/80 hover:text-white hover:bg-white/20'
            } ${sessionState === 'disconnected' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Master Connect / Power Button */}
          <button
            onClick={handleToggleConnect}
            aria-label={sessionState === 'disconnected' ? 'Start voice conversation' : 'End conversation'}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 transform active:scale-90 shadow-2xl relative group ${
              sessionState === 'disconnected'
                ? 'bg-gradient-to-tr from-rose-600 via-pink-500 to-purple-600 hover:shadow-[0_0_35px_rgba(244,63,94,0.6)]'
                : 'bg-gradient-to-tr from-rose-700 to-red-800 hover:shadow-[0_0_35px_rgba(239,68,68,0.7)]'
            }`}
          >
            {/* Pulsing ring animation around button */}
            <span
              className={`absolute inset-0 rounded-full border-2 border-white/40 transition-all ${
                sessionState !== 'disconnected' ? 'animate-ping opacity-60' : 'group-hover:scale-110 opacity-30'
              }`}
            />
            {sessionState === 'disconnected' ? (
              <div className="flex flex-col items-center">
                <Power className="w-7 h-7 text-white drop-shadow" />
                <span className="text-[9px] font-black uppercase tracking-wider text-white mt-0.5">
                  Start
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Volume2 className="w-7 h-7 text-white drop-shadow" />
                <span className="text-[9px] font-black uppercase tracking-wider text-white mt-0.5">
                  End
                </span>
              </div>
            )}
          </button>

          {/* Love Spark Heart Burst Button */}
          <button
            onClick={handleHeartBurst}
            aria-label="Send love feeling to Mahi"
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-rose-500/20 border border-pink-500/30 text-rose-300 hover:text-white hover:bg-pink-500/30 flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg shadow-pink-500/10 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </button>
        </div>
      </footer>

      {/* Romantic Shayari Floating Card */}
      <ShayariCard shayari={activeShayari} onClose={() => setActiveShayari(null)} />

      {/* AI Multimodal Vision Camera Modal */}
      <CameraVisionModal
        isOpen={isVisionOpen}
        onClose={() => setIsVisionOpen(false)}
        onSendFrame={handleSendCameraFrame}
        isConnected={sessionState !== 'disconnected'}
      />

      {/* Live Hindi Subtitles & Transcript Modal */}
      <LiveTranscriptModal
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        transcripts={transcripts}
        onClear={() => {
          setTranscripts([]);
          conversationMemory.clearShortTermChatOnly();
          handleMobileStatusToast('Chat History Cleared (Long-Term Memory Preserved 🧠)');
        }}
      />

      {/* Photo Memories Album Modal */}
      <PhotoMemoriesModal
        isOpen={isMemoriesOpen}
        onClose={() => setIsMemoriesOpen(false)}
        memories={memories}
        onAddMemory={handleAddPhotoMemory}
        onDeleteMemory={handleDeletePhotoMemory}
      />

      {/* Sweet Reminders Modal */}
      <SweetRemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        reminders={reminders}
        onAddReminder={handleAddReminder}
        onToggleComplete={handleToggleReminderComplete}
        onDeleteReminder={handleDeleteReminder}
      />

      {/* Ambient Music Synthesizer Modal */}
      <AmbientMusicModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        isPlaying={isMusicPlaying}
        currentVibe={ambientVibe}
        volume={ambientVolume}
        onTogglePlay={handleToggleAmbientMusic}
        onSelectVibe={handleSelectAmbientVibe}
        onChangeVolume={handleChangeAmbientVolume}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voice={voice}
        onSelectVoice={handleSelectVoice}
        theme={theme}
        onSelectTheme={setTheme}
        displayMode={displayMode}
        onSelectDisplayMode={setDisplayMode}
        cuteStyle={cuteStyle}
        onSelectCuteStyle={setCuteStyle}
        isScreenAwake={isScreenAwake}
        onToggleScreenAwake={handleToggleScreenAwake}
      />

      {/* Mobile Control Center Modal */}
      <MobileControlModal
        isOpen={isMobileControlOpen}
        onClose={() => setIsMobileControlOpen(false)}
        isScreenAwake={isScreenAwake}
        onToggleScreenAwake={handleToggleScreenAwake}
        onOpenVisionCamera={() => setIsVisionOpen(true)}
        onStatusToast={handleMobileStatusToast}
        initialTab={mobileControlTab}
      />

      {/* Voice Authentication, Security & Memory Modal */}
      <VoiceAuthModal
        isOpen={isVoiceAuthOpen}
        onClose={() => setIsVoiceAuthOpen(false)}
        onSwitchPersona={(mode: MahiPersonaMode) => {
          liveSessionRef.current?.switchPersonaMode(mode);
          if (mode === 'hot-siren') {
            setCuteStyle('siren');
            setTheme('crimson-desire');
          }
        }}
        onStatusToast={handleMobileStatusToast}
      />

      {/* Screen Torch Fallback Overlay (when rear camera LED is unavailable) */}
      {torchState.active && torchState.screenFallback && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-black">
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-16 h-16 rounded-full bg-amber-400 mx-auto flex items-center justify-center shadow-2xl">
              <Sun className="w-9 h-9 text-black" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider">
              Screen Flashlight Torch ON
            </h3>
            <p className="text-xs text-neutral-700 font-medium">
              Maximum screen brightness illumination active.
            </p>
            <button
              type="button"
              onClick={() => mobileControl.stopTorch()}
              className="mt-4 w-full py-3 px-6 rounded-2xl bg-black text-white font-bold text-sm shadow-xl cursor-pointer active:scale-95"
            >
              Turn Off Flashlight
            </button>
          </div>
        </div>
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </main>
  );
}
