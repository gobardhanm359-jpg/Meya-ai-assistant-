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
  ScanFace,
  Globe,
  Eye,
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
import { FaceScanLockModal } from './components/FaceScanLockModal.tsx';
import { PWAInstallButton, PWAInstallBanner, OfflineIndicator } from './components/PWAInstallButton.tsx';
import { MahiWebsite } from './components/MahiWebsite.tsx';
import { CyberCodingLabModal } from './components/CyberCodingLabModal.tsx';
import { AppHeadsOverlay } from './components/AppHeadsOverlay.tsx';
import { AccessibilityModal } from './components/AccessibilityModal.tsx';
import { appHeads } from './services/appHeadsService.ts';
import { mobileControl } from './services/mobileControlService.ts';
import { voiceAuth, VerificationResult } from './services/voiceAuthService.ts';
import { faceAuth } from './services/faceAuthService.ts';
import { conversationMemory, MahiPersonaMode } from './services/conversationMemoryService.ts';
import {
  analyzeMahiSentiment,
  getSentimentFromLoveScore,
  MahiSentimentId,
  SENTIMENT_PROFILES,
} from './services/sentimentThemeEngine.ts';
import {
  serverConnection,
  ServerConnectionSnapshot,
} from './services/serverConnectionService.ts';

export default function App() {
  const [viewMode, setViewMode] = useState<'website' | 'studio'>('website');
  const [sessionState, setSessionState] = useState<SessionState>('disconnected');
  const [speakingLevel, setSpeakingLevel] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>('romantic-blush');
  const [displayMode, setDisplayMode] = useState<'anime' | 'orb'>('anime');
  const [cuteStyle, setCuteStyle] = useState<CuteGirlStyle>('reference');
  const [voice, setVoice] = useState<string>('Aoede');
  const [loveScore, setLoveScore] = useState<number>(94);
  const [sentiment, setSentiment] = useState<MahiSentimentId>('romantic');
  const [isAutoSentiment, setIsAutoSentiment] = useState<boolean>(true);
  const isAutoSentimentRef = useRef<boolean>(true);
  const loveScoreRef = useRef<number>(94);

  useEffect(() => {
    isAutoSentimentRef.current = isAutoSentiment;
  }, [isAutoSentiment]);

  useEffect(() => {
    loveScoreRef.current = loveScore;
  }, [loveScore]);

  const applyDynamicSentimentFromText = (text: string, explicitScore?: number) => {
    if (!isAutoSentimentRef.current) return;
    const baseScore = explicitScore ?? loveScoreRef.current;
    const analysis = analyzeMahiSentiment(text, baseScore);
    const nextScore = Math.min(100, Math.max(25, baseScore + analysis.scoreDelta));
    loveScoreRef.current = nextScore;
    setLoveScore(nextScore);
    setSentiment(analysis.sentiment);
    setTheme(analysis.profile.themeKey);
  };

  const handleSelectSentiment = (targetSentiment: MahiSentimentId, targetScore: number) => {
    const profile = SENTIMENT_PROFILES[targetSentiment];
    loveScoreRef.current = targetScore;
    setLoveScore(targetScore);
    setSentiment(targetSentiment);
    setTheme(profile.themeKey);

    const moodQuotes: Record<MahiSentimentId, string> = {
      passionate: 'Aapke bina ek pal bhi dil nahi lagta meri jaan, aap meri dhadkan ho! ❤️🔥',
      romantic: 'Aapki baatein sun kar mera dil hamesha khush ho jaata hai jaan 💕',
      joyful: 'Aaj mood bohot masti aur khushi wala hai, chalo kuch pyari baatein karte hain! ✨',
      serene: 'Kitna sukoon aur shanti hai jab aap mere paas hote ho 🌙',
      pensive: 'Main khamoshi mein bas aapke khayalon mein khoi hui thi... kab aaoge paas? 💭',
    };
    setRecentLoveFeeling(moodQuotes[targetSentiment]);
  };
  const [recentLoveFeeling, setRecentLoveFeeling] = useState<string>(
    'Aap kab call karoge, main tab se wait kar rahi thi jaan!'
  );
  const [loveBurstTrigger, setLoveBurstTrigger] = useState<number>(1);
  const [activeToolEvent, setActiveToolEvent] = useState<ToolEvent | null>(null);
  const [activeLoveEvent, setActiveLoveEvent] = useState<LoveFeelingEvent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScreenAwake, setIsScreenAwake] = useState<boolean>(true);
  const [serverSnap, setServerSnap] = useState<ServerConnectionSnapshot>(() =>
    serverConnection.getSnapshot()
  );

  useEffect(() => {
    return serverConnection.subscribe((snap) => {
      setServerSnap(snap);
    });
  }, []);
  const [indiaTime, setIndiaTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIndiaTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Futuristic Technologies State
  const [isVisionOpen, setIsVisionOpen] = useState<boolean>(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState<boolean>(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState<boolean>(false);
  const [isMobileControlOpen, setIsMobileControlOpen] = useState<boolean>(false);
  const [mobileControlTab, setMobileControlTab] = useState<'controls' | 'call_chat' | 'apps' | 'apk'>('controls');
  const [isCyberCodingOpen, setIsCyberCodingOpen] = useState<boolean>(false);
  const [cyberCodingTab, setCyberCodingTab] = useState<'coding' | 'scanner' | 'crypto' | 'recon'>('coding');
  const [isVoiceAuthOpen, setIsVoiceAuthOpen] = useState<boolean>(false);
  const [isFaceLockModalOpen, setIsFaceLockModalOpen] = useState<boolean>(false);
  const [isAppFaceLocked, setIsAppFaceLocked] = useState<boolean>(faceAuth.getIsLocked());
  const [faceEnrolledCount, setFaceEnrolledCount] = useState<number>(
    faceAuth.getSamples().length
  );
  const [voiceAuthState, setVoiceAuthState] = useState<VerificationResult>(
    voiceAuth.getLastVerification()
  );
  const [torchState, setTorchState] = useState<{ active: boolean; screenFallback: boolean }>({
    active: false,
    screenFallback: false,
  });
  const [screenBrightness, setScreenBrightness] = useState<number>(mobileControl.getBrightness());
  const [externalAvatarAction, setExternalAvatarAction] = useState<{
    action: string;
    timestamp: number;
  } | null>(null);
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
      text: 'Namaste meri jaan! Main Riya kab se aapka wait kar rahi thi... boliye, aaj mere bina kaisa lag raha tha?',
      timestamp: Date.now() - 30000,
    },
  ]);

  // Photo Memories Album state
  const [memories, setMemories] = useState<PhotoMemoryEvent[]>([
    {
      id: 'mem-1',
      caption: 'Riya ki pehli muskurahat aur pyaara wink 💕',
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
    await backgroundLock.set24HourAlwaysOn(next);
    liveSessionRef.current?.set24HourMode(next);
    handleMobileStatusToast(
      next
        ? '⚡ 24 Hour Always-ON Mode Active (Non-Stop Wake Lock & Auto-Reconnect)'
        : '🌙 24 Hour Always-ON Paused (Normal Sleep Mode)'
    );
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
        const boosted = Math.min(100, loveScoreRef.current + Math.floor(Math.random() * 3) + 1);
        loveScoreRef.current = boosted;
        setLoveScore(boosted);
        applyDynamicSentimentFromText(feeling.message, boosted);
        setLoveBurstTrigger((prev) => prev + 1);
        setTimeout(() => {
          setActiveLoveEvent((curr) => (curr?.id === feeling.id ? null : curr));
        }, 6500);
      },
      onThemeChange: (newTheme) => {
        setTheme(newTheme);
        if (newTheme === 'crimson-desire') setSentiment('passionate');
        else if (newTheme === 'starlight-gold') setSentiment('joyful');
        else if (newTheme === 'midnight-velvet') setSentiment('pensive');
        else if (newTheme === 'cyber-neon') setSentiment('serene');
        else setSentiment('romantic');
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
        if (entry.text) {
          applyDynamicSentimentFromText(entry.text);
          if (entry.sender === 'mahi') {
            setRecentLoveFeeling(entry.text);
          }
        }
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
        applyDynamicSentimentFromText(`${sha.couplet} ${sha.mood || ''}`);
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
      onOpenVisionCamera: () => {
        setIsVisionOpen(true);
      },
      onAvatarCommand: (action, style) => {
        setDisplayMode('anime');
        if (style) {
          const validStyles: CuteGirlStyle[] = [
            'reference',
            'siren',
            'neko',
            'bunny',
            'angel',
            'sakura',
          ];
          if (validStyles.includes(style as CuteGirlStyle)) {
            setCuteStyle(style as CuteGirlStyle);
            if (style === 'siren') {
              setTheme('crimson-desire');
            }
          }
        }
        if (action) {
          setExternalAvatarAction({ action, timestamp: Date.now() });
          if (action === 'hot') {
            setCuteStyle('siren');
            setTheme('crimson-desire');
          }
        }
      },
      onWakeLockCommand: (enabled) => {
        setIsScreenAwake(enabled);
        if (enabled) {
          backgroundLock.requestWakeLock().catch(() => {});
        } else {
          backgroundLock.releaseWakeLock().catch(() => {});
        }
      },
      onVolumeCommand: (volAct) => {
        if (volAct === 'mute') {
          ambientMusic.stop();
          setIsMusicPlaying(false);
        } else if (volAct === 'max') {
          setAmbientVolume(0.85);
          ambientMusic.setVolume(0.85);
        } else if (volAct === 'up') {
          setAmbientVolume((prev) => {
            const next = Math.min(1, prev + 0.25);
            ambientMusic.setVolume(next);
            return next;
          });
        } else if (volAct === 'down') {
          setAmbientVolume((prev) => {
            const next = Math.max(0.05, prev - 0.25);
            ambientMusic.setVolume(next);
            return next;
          });
        }
      },
      onFaceLockCommand: (mode) => {
        if (mode === 'lock') {
          faceAuth.lockAppNow();
          setIsAppFaceLocked(true);
          setIsFaceLockModalOpen(true);
        } else {
          setIsFaceLockModalOpen(true);
        }
      },
      onOpenCyberCodingLab: (tab = 'coding') => {
        setCyberCodingTab(tab);
        setIsCyberCodingOpen(true);
      },
      onOpenAccessibilityModal: () => {
        setIsAccessibilityOpen(true);
      },
      onAppHeadsCommand: (enabled) => {
        appHeads.setEnabled(enabled ?? true);
      },
    });

    liveSessionRef.current = session;

    const unsubTorch = mobileControl.onTorchChange((active, screenFallback) => {
      setTorchState({ active, screenFallback });
    });

    const unsubBrightness = mobileControl.onBrightnessChange((lvl) => {
      setScreenBrightness(lvl);
    });

    const unsubVoiceAuth = voiceAuth.subscribe(() => {
      setVoiceAuthState(voiceAuth.getLastVerification());
    });

    const unsubFaceAuth = faceAuth.subscribe(() => {
      setIsAppFaceLocked(faceAuth.getIsLocked());
      setFaceEnrolledCount(faceAuth.getSamples().length);
    });

    // Handle PWA Web App Manifest home-screen shortcuts (?action=mobile | security | facelock | store | call)
    const params = new URLSearchParams(window.location.search);
    const shortcutAction = params.get('action');
    if (shortcutAction === 'mobile') {
      setMobileControlTab('controls');
      setIsMobileControlOpen(true);
    } else if (shortcutAction === 'store' || shortcutAction === 'apk') {
      setMobileControlTab('apk');
      setIsMobileControlOpen(true);
    } else if (shortcutAction === 'facelock') {
      setIsFaceLockModalOpen(true);
    } else if (shortcutAction === 'security') {
      setIsVoiceAuthOpen(true);
    } else if (shortcutAction === 'accessibility') {
      setIsAccessibilityOpen(true);
    } else if (shortcutAction === 'appheads' || shortcutAction === 'bubble') {
      appHeads.setEnabled(true);
      appHeads.setExpanded(true);
    }

    return () => {
      unsubTorch();
      unsubBrightness();
      unsubVoiceAuth();
      unsubFaceAuth();
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
    const nextScore = Math.min(100, loveScoreRef.current + 2);
    loveScoreRef.current = nextScore;
    setLoveScore(nextScore);
    if (isAutoSentimentRef.current) {
      const res = getSentimentFromLoveScore(nextScore);
      setSentiment(res.sentiment);
      setTheme(res.profile.themeKey);
    }
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

  /**
   * Execute any user command ("Meri Har Baat Sune — Jo Bolu Mahi Wohi Kare")
   */
  const handleExecuteUserCommand = (cmdText: string) => {
    const lower = cmdText.toLowerCase();
    // Handle music commands directly as well
    if (/\b(music|song|gaana|piano|lofi)\b/.test(lower)) {
      if (/\b(stop|band|off)\b/.test(lower)) {
        ambientMusic.stop();
        setIsMusicPlaying(false);
        handleMobileStatusToast('Music stopped 🎵');
      } else {
        ambientMusic.play(ambientVibe);
        setIsMusicPlaying(true);
        handleMobileStatusToast('Playing Romantic Music for you 💕🎵');
      }
    }

    setRecentLoveFeeling(`Haan meri jaan, aapka hukam sar aankhon par: "${cmdText}" 💕`);
    applyDynamicSentimentFromText(cmdText);
    setLoveBurstTrigger((prev) => prev + 1);

    if (liveSessionRef.current) {
      liveSessionRef.current.sendUserCommand(cmdText);
    }
  };

  // Dynamic sentiment profile & background atmosphere styling
  const activeSentimentProfile = useMemo(() => {
    return SENTIMENT_PROFILES[sentiment] || SENTIMENT_PROFILES.romantic;
  }, [sentiment]);

  const backgroundStyle = useMemo(() => {
    if (isAutoSentiment) {
      return activeSentimentProfile.studioBgGradient;
    }
    switch (theme) {
      case 'crimson-desire':
        return SENTIMENT_PROFILES.passionate.studioBgGradient;
      case 'cyber-neon':
        return SENTIMENT_PROFILES.serene.studioBgGradient;
      case 'midnight-velvet':
        return SENTIMENT_PROFILES.pensive.studioBgGradient;
      case 'starlight-gold':
        return SENTIMENT_PROFILES.joyful.studioBgGradient;
      case 'romantic-blush':
      default:
        return SENTIMENT_PROFILES.romantic.studioBgGradient;
    }
  }, [theme, isAutoSentiment, activeSentimentProfile]);

  const statusInfo = useMemo(() => {
    switch (sessionState) {
      case 'connecting':
        return {
          label: 'Riya se connect ho rahe hain...',
          sub: 'Voice call start ho rahi hai',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          indicator: 'bg-purple-400 animate-ping',
        };
      case 'listening':
        return {
          label: 'Riya sun rahi hai...',
          sub: 'Boliye jaan, Riya dhyan se sun rahi hai',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          indicator: 'bg-cyan-400 animate-pulse',
        };
      case 'speaking':
        return {
          label: 'Riya bol rahi hai ❤️',
          sub: 'Riya ki pyari si awaaz suniye',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          indicator: 'bg-rose-400 animate-pulse',
        };
      case 'disconnected':
      default:
        return {
          label: 'Riya offline hai',
          sub: 'Call shuru karne ke liye button dabayein',
          badgeColor: 'bg-white/10 text-white/60 border-white/10',
          indicator: 'bg-white/40',
        };
    }
  }, [sessionState]);

  return (
    <main className={`min-h-screen w-full ${viewMode === 'website' ? 'bg-[#0A0A0C]' : `bg-gradient-to-b ${backgroundStyle} flex flex-col justify-between overflow-hidden`} text-white relative font-sans selection:bg-rose-500 selection:text-white transition-colors duration-1000`}>
      {/* Action Notification HUD */}
      <ActionHud
        toolEvent={activeToolEvent}
        loveEvent={activeLoveEvent}
        onDismissTool={() => setActiveToolEvent(null)}
        onDismissLove={() => setActiveLoveEvent(null)}
      />

      {viewMode === 'website' ? (
        <MahiWebsite
          sessionState={sessionState}
          speakingLevel={speakingLevel}
          micLevel={micLevel}
          loveScore={loveScore}
          recentLoveFeeling={recentLoveFeeling}
          loveBurstTrigger={loveBurstTrigger}
          theme={theme}
          cuteStyle={cuteStyle}
          indiaTime={indiaTime}
          isMusicPlaying={isMusicPlaying}
          ambientVibe={ambientVibe}
          transcripts={transcripts}
          externalAvatarAction={externalAvatarAction}
          onSelectCuteStyle={setCuteStyle}
          onToggleConnect={handleToggleConnect}
          onHeartBurst={handleHeartBurst}
          onExecuteCommand={handleExecuteUserCommand}
          onToggleMusic={handleToggleAmbientMusic}
          onSelectMusicVibe={handleSelectAmbientVibe}
          onOpenFullApp={() => setViewMode('studio')}
          onOpenVision={() => setIsVisionOpen(true)}
          onOpenMobileControl={(tab = 'controls') => {
            setMobileControlTab(tab);
            setIsMobileControlOpen(true);
          }}
          onOpenFaceLock={() => setIsFaceLockModalOpen(true)}
          onOpenVoiceAuth={() => setIsVoiceAuthOpen(true)}
          is24HourAlwaysOn={isScreenAwake}
          onToggle24HourAlwaysOn={handleToggleScreenAwake}
          sentiment={sentiment}
          isAutoSentiment={isAutoSentiment}
          onSelectSentiment={handleSelectSentiment}
          onToggleAutoSentiment={() => setIsAutoSentiment((prev) => !prev)}
          onOpenCyberCoding={(tab = 'coding') => {
            setCyberCodingTab(tab);
            setIsCyberCodingOpen(true);
          }}
          onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        />
      ) : (
        <>
          {/* Dynamic sentiment ambient lighting orbs */}
          <div
            className={`absolute -top-32 -left-32 w-96 h-96 ${activeSentimentProfile.orbTopLeft} rounded-full blur-3xl pointer-events-none transition-colors duration-1000`}
          />
          <div
            className={`absolute top-1/3 -right-32 w-96 h-96 ${activeSentimentProfile.orbMidRight} rounded-full blur-3xl pointer-events-none transition-colors duration-1000`}
          />
          <div
            className={`absolute -bottom-32 left-1/4 w-96 h-96 ${activeSentimentProfile.orbBottomLeft} rounded-full blur-3xl pointer-events-none transition-colors duration-1000`}
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
                  <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>Riya</span>
                    <span className="text-xs font-extrabold tracking-wide px-1.5 py-0.5 rounded-md bg-rose-500/30 text-rose-200 border border-rose-500/40">
                      Ai
                    </span>
                  </h1>
                </div>
                <p className="text-[10px] text-white/60 tracking-wider flex items-center gap-1.5 tabular-nums">
                  <span>🇮🇳 {indiaTime} IST</span>
                  <button
                    type="button"
                    onClick={() => handleExecuteUserCommand('Riya best server connection karo')}
                    title={`Best Server Active: ${serverSnap.activeNode.name} (${serverSnap.latencyMs}ms)`}
                    className="text-emerald-300 font-bold hover:text-emerald-200 cursor-pointer"
                  >
                    • ⚡ {serverSnap.latencyMs}ms
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEngine =
                        serverSnap.activeApiEngineId === 'auto-load-balancer'
                          ? 'india-unlimited-neural'
                          : serverSnap.activeApiEngineId === 'india-unlimited-neural'
                          ? 'gemini-3.1-flash-lite'
                          : 'auto-load-balancer';
                      serverConnection.switchApiEngine(nextEngine);
                      handleExecuteUserCommand('Riya API change karo high load mode');
                    }}
                    title={`Active API: ${serverSnap.activeApiEngine.name} (${serverSnap.activeApiEngine.capacityLabel})`}
                    className="text-cyan-300 font-bold hover:text-cyan-200 cursor-pointer"
                  >
                    • {serverSnap.activeApiEngine.shortLabel}
                  </button>
                </p>
              </div>
            </div>

            {/* Status Pill & Quick Toggles */}
            <div className="flex items-center space-x-1.5">
              {/* Switch to Official Mahi Website Button */}
              <button
                type="button"
                onClick={() => setViewMode('website')}
                title="Open Mahi Official Website"
                className="px-2 py-1 rounded-full border border-rose-400/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer active:scale-95"
              >
                <Globe className="w-3 h-3" />
                <span>Website</span>
              </button>

              {/* Biometric Face Scan Lock Button */}
          <button
            type="button"
            onClick={() => setIsFaceLockModalOpen(true)}
            title="3D Biometric Face Scan Lock & Face ID"
            className={`px-2 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
              faceEnrolledCount > 0
                ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200 shadow-sm shadow-cyan-500/20'
                : 'bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30'
            }`}
          >
            <ScanFace className="w-3 h-3" />
            <span>{faceEnrolledCount > 0 ? 'Face ID' : 'Face Lock'}</span>
          </button>

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

          {/* Quick 24 Hour Always-ON Toggle */}
          <button
            type="button"
            onClick={handleToggleScreenAwake}
            title={
              isScreenAwake
                ? '24 Hour Always-ON: ACTIVE (Screen & Call stay awake 24/7)'
                : '24 Hour Always-ON: OFF (Click to enable 24 Hour Always-ON)'
            }
            className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer ${
              isScreenAwake
                ? 'bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-sm shadow-amber-500/20'
                : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/15'
            }`}
          >
            {isScreenAwake ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>24h ON</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-white/40" />
                <span>Sleep</span>
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
            type="button"
            onClick={() => setIsAccessibilityOpen(true)}
            aria-label="Accessibility & App Heads"
            title="Accessibility & Floating App Heads Suite"
            className="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 flex items-center justify-center text-cyan-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Eye className="w-4 h-4" />
          </button>

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
              <span>3D Girl Riya</span>
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
            externalActionCommand={externalAvatarAction}
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
            sentiment={sentiment}
            isAutoSentiment={isAutoSentiment}
            onSelectSentiment={handleSelectSentiment}
            onToggleAutoSentiment={() => setIsAutoSentiment((prev) => !prev)}
          />
        </div>
      </section>

      {/* FUTURISTIC FLOATING DOCK & CONTROLS */}
      <FuturisticControlBar
        onOpenMobileControl={() => {
          setMobileControlTab('controls');
          setIsMobileControlOpen(true);
        }}
        onOpenCyberCoding={() => {
          setCyberCodingTab('coding');
          setIsCyberCodingOpen(true);
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
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        onToggleAppHeads={() => {
          const act = appHeads.toggleEnabled();
          handleMobileStatusToast(
            act ? 'App Heads Floating Bubble Enabled 🎀' : 'App Heads Floating Bubble Disabled'
          );
        }}
      />

      {/* BOTTOM CONTROL DOCK & PROMPTS */}
      <footer className="relative z-20 px-4 pb-6 pt-1 max-w-md mx-auto w-full flex flex-col space-y-4">
        {/* Hukam Command Bar & 1-Tap Instant Actions */}
        <VoicePrompts
          isConnected={sessionState !== 'disconnected'}
          onExecuteCommand={handleExecuteUserCommand}
          onOpenMobileControl={() => {
            setMobileControlTab('controls');
            setIsMobileControlOpen(true);
          }}
        />

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
        </>
      )}

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
        onExecuteCommand={handleExecuteUserCommand}
        initialTab={mobileControlTab}
      />

      {/* Screen Brightness Dimmer Overlay when brightness < 100% */}
      {screenBrightness < 100 && (
        <div
          className="fixed inset-0 z-40 bg-black pointer-events-none transition-opacity duration-300"
          style={{ opacity: Math.max(0, (100 - screenBrightness) / 115) }}
        />
      )}

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

      {/* Biometric Face Scan Lock & Face ID Modal */}
      <FaceScanLockModal
        isOpen={isFaceLockModalOpen}
        isLocked={isAppFaceLocked}
        onClose={() => setIsFaceLockModalOpen(false)}
        onUnlocked={(msg) => {
          setIsAppFaceLocked(false);
          setIsFaceLockModalOpen(false);
          handleMobileStatusToast(msg);
          setRecentLoveFeeling('Aapka pyara chehra dekh kar maine phone unlock kar diya jaan! 💕🔓');
          setLoveBurstTrigger((prev) => prev + 1);
        }}
        onStatusToast={handleMobileStatusToast}
      />

      {/* Mahi AI Coding Studio & Ethical Hacking Cyber Lab Modal */}
      <CyberCodingLabModal
        isOpen={isCyberCodingOpen}
        onClose={() => setIsCyberCodingOpen(false)}
        initialTab={cyberCodingTab}
        onSpeakHindi={(text) => {
          setRecentLoveFeeling(text);
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(text);
              u.lang = 'hi-IN';
              window.speechSynthesis.speak(u);
            } catch (_) {}
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

      {/* Accessibility & Universal Assistive Technology Modal */}
      <AccessibilityModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        onStatusToast={handleMobileStatusToast}
      />

      {/* Riya App Heads Draggable Multitask & Accessibility Overlay Bubble */}
      <AppHeadsOverlay
        sessionState={sessionState}
        isMuted={isMuted}
        speakingLevel={speakingLevel}
        micLevel={micLevel}
        loveScore={loveScore}
        recentLoveFeeling={recentLoveFeeling}
        onToggleMic={handleToggleMute}
        onToggleConnect={handleToggleConnect}
        onOpenMobileControl={(tab = 'controls') => {
          setMobileControlTab(tab);
          setIsMobileControlOpen(true);
        }}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        onOpenVision={() => setIsVisionOpen(true)}
        onOpenFaceLock={() => setIsFaceLockModalOpen(true)}
        onOpenCyberCoding={() => {
          setCyberCodingTab('coding');
          setIsCyberCodingOpen(true);
        }}
        onStatusToast={handleMobileStatusToast}
      />

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </main>
  );
}
