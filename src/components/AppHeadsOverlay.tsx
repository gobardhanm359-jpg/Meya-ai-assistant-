import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Radio,
  Send,
  MessageCircle,
  Instagram,
  Eye,
  Sun,
  Shield,
  Volume2,
  ChevronDown,
  Layers,
  AtSign,
  Maximize2,
  Check,
  Zap,
  Activity,
  X,
  Smartphone,
  ScanFace,
  Terminal,
  VolumeX,
} from 'lucide-react';
import { appHeads, AppHeadsConfig } from '../services/appHeadsService.ts';
import { mobileControl } from '../services/mobileControlService.ts';
import { accessibilityService, AccessibilityTelemetry } from '../services/accessibilityService.ts';
import { SessionState } from '../services/liveSession.ts';

interface AppHeadsOverlayProps {
  sessionState: SessionState;
  isMuted: boolean;
  speakingLevel: number;
  micLevel: number;
  loveScore: number;
  recentLoveFeeling: string;
  onToggleMic: () => void;
  onToggleConnect: () => void;
  onOpenMobileControl: (tab?: 'controls' | 'call_chat' | 'apps' | 'apk') => void;
  onOpenAccessibility: () => void;
  onOpenVision: () => void;
  onOpenFaceLock: () => void;
  onOpenCyberCoding: () => void;
  onStatusToast: (msg: string) => void;
}

export const AppHeadsOverlay: React.FC<AppHeadsOverlayProps> = ({
  sessionState,
  isMuted,
  speakingLevel,
  micLevel,
  loveScore,
  recentLoveFeeling,
  onToggleMic,
  onToggleConnect,
  onOpenMobileControl,
  onOpenAccessibility,
  onOpenVision,
  onOpenFaceLock,
  onOpenCyberCoding,
  onStatusToast,
}) => {
  const [config, setConfig] = useState<AppHeadsConfig>(() => appHeads.getConfig());
  const [accTelemetry, setAccTelemetry] = useState<AccessibilityTelemetry>(() =>
    accessibilityService.getTelemetry()
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => config.position);
  const [mentionRecipient, setMentionRecipient] = useState<string>('');
  const [mentionTag, setMentionTag] = useState<string>('@jaan');
  const [quickMsg, setQuickMsg] = useState<string>('Hey jaan! 💕');
  const [activeSocial, setActiveSocial] = useState<'wa' | 'ig' | 'msg' | 'sms'>('wa');

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubHeads = appHeads.subscribe((next) => {
      setConfig(next);
      setPos(next.position);
    });
    const unsubAcc = accessibilityService.subscribe((t) => {
      setAccTelemetry(t);
    });
    return () => {
      unsubHeads();
      unsubAcc();
    };
  }, []);

  if (!config.enabled) return null;

  // Pointer drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header or bubble
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const maxX = Math.max(10, window.innerWidth - (config.isExpanded ? 340 : 70));
    const maxY = Math.max(10, window.innerHeight - (config.isExpanded ? 460 : 70));

    const nextX = Math.min(Math.max(12, dragStartRef.current.initialX + dx), maxX);
    const nextY = Math.min(Math.max(12, dragStartRef.current.initialY + dy), maxY);

    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (!hasMovedRef.current) {
      // Tap without drag -> toggle expand
      appHeads.vibrate(25);
      appHeads.toggleExpanded();
    } else {
      // Snap to closest edge if not expanded
      let finalX = pos.x;
      if (!config.isExpanded && config.edgeSnap) {
        const mid = window.innerWidth / 2;
        finalX = pos.x > mid ? window.innerWidth - 76 : 14;
        setPos((p) => ({ ...p, x: finalX }));
      }
      appHeads.setPosition({ x: finalX, y: pos.y });
    }
  };

  const handleSendAutoMention = (platform: 'wa' | 'ig' | 'msg' | 'sms') => {
    appHeads.vibrate(35);
    if (platform === 'wa') {
      const url = mobileControl.sendWhatsApp(mentionRecipient, quickMsg, mentionTag);
      onStatusToast(`WhatsApp Auto Mention Sent with tag ${mentionTag} 💬`);
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else if (platform === 'ig') {
      const url = mobileControl.openInstagram(mentionRecipient || 'jaan', `${mentionTag} ${quickMsg}`);
      onStatusToast(`Instagram Direct Mention opened 📸`);
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else if (platform === 'msg') {
      const url = mobileControl.openMessenger(mentionRecipient || 'jaan', `${mentionTag} ${quickMsg}`);
      onStatusToast(`Messenger Chat Head opened ⚡`);
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else if (platform === 'sms') {
      const url = mobileControl.sendSms(mentionRecipient, quickMsg, mentionTag);
      onStatusToast(`SMS Message prepared ✉️`);
      if (typeof window !== 'undefined') window.location.href = url;
    }
  };

  const isConnected = sessionState === 'listening' || sessionState === 'speaking';
  const isConnecting = sessionState === 'connecting';

  const handleReadCurrentState = () => {
    appHeads.vibrate(40);
    const connStr = isConnected
      ? 'Riya Voice Live Session Juda hua hai'
      : 'Riya Voice Session band hai';
    const text = `Riya App Head Accessibility. ${connStr}. Love score ${loveScore} pratishat. Latest sandesh: ${recentLoveFeeling}. Accessibility service ${accTelemetry.state}.`;
    appHeads.speakNarration(text);
    onStatusToast('🔊 Reading status via Screen Reader');
  };

  const bubbleDiameter =
    config.bubbleSize === 'sm' ? 'w-12 h-12' : config.bubbleSize === 'lg' ? 'w-16 h-16' : 'w-14 h-14';

  const audioGlow = isConnected
    ? speakingLevel > 0.08
      ? 'ring-4 ring-rose-400/80 shadow-[0_0_24px_rgba(244,63,94,0.7)] animate-pulse'
      : 'ring-2 ring-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
    : 'ring-1 ring-white/20 shadow-lg';

  return (
    <aside
      role="region"
      aria-label="Riya App Heads Floating Assistant"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`fixed top-0 left-0 z-50 select-none transition-[transform,box-shadow] duration-75 ${
        isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
      }`}
    >
      {!config.isExpanded ? (
        /* MINIMIZED FLOATING BUBBLE */
        <div
          className={`relative ${bubbleDiameter} rounded-full flex items-center justify-center bg-gradient-to-br from-rose-950/95 via-neutral-950/95 to-purple-950/95 backdrop-blur-xl border border-rose-500/40 ${audioGlow} group hover:scale-110 active:scale-95 transition-transform`}
          title="Riya App Head (Drag to move, Tap to open HUD)"
        >
          {/* Audio Wave Ring */}
          {isConnected && (
            <span
              className="absolute inset-0 rounded-full border border-rose-400 animate-ping opacity-40 pointer-events-none"
              style={{ animationDuration: speakingLevel > 0.1 ? '0.8s' : '2s' }}
            />
          )}

          {/* Avatar Face Icon / Reactive Emoji */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-xl leading-none">
              {isConnected ? (speakingLevel > 0.1 ? '🗣️' : '💖') : '🎀'}
            </span>
          </div>

          {/* Mini Live Status Pip */}
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-neutral-950 ${
              isConnected
                ? isMuted
                  ? 'bg-amber-400'
                  : 'bg-emerald-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />

          {/* Quick Mention Badge */}
          <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-rose-600 text-[8px] font-black text-white rounded-full uppercase tracking-tighter shadow-md">
            Heads
          </span>
        </div>
      ) : (
        /* EXPANDED APP HEADS HUD CAPSULE */
        <div className="w-[330px] rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-rose-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Bar & Drag Grip */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
                <span className="text-sm">🎀</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                    Riya App Heads
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    Overlay
                  </span>
                </div>
                <p className="text-[9px] text-neutral-400 font-medium">
                  Floating Multitask & Accessibility Bubble
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  appHeads.vibrate(20);
                  appHeads.toggleExpanded();
                }}
                className="p-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Minimize Bubble"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  appHeads.vibrate(25);
                  appHeads.setEnabled(false);
                  onStatusToast('App Heads Floating Bubble hidden (Enable from Settings or Voice)');
                }}
                className="p-1 rounded-lg bg-neutral-800/60 hover:bg-rose-500/30 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Close App Heads"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Live Capsule Controller */}
          <div className="p-2.5 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 animate-ping'
                    : isConnecting
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-neutral-600'
                }`}
              />
              <div className="truncate">
                <p className="text-[11px] font-bold text-white truncate">
                  {isConnected ? 'Live Voice Active 💕' : 'Voice Offline'}
                </p>
                <p className="text-[9px] text-neutral-400 truncate">
                  Love Score: <span className="text-rose-400 font-bold">{loveScore}%</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      appHeads.vibrate(25);
                      onToggleMic();
                    }}
                    className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                    }`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      appHeads.vibrate(30);
                      onToggleConnect();
                    }}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold cursor-pointer"
                  >
                    End
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    appHeads.vibrate(35);
                    onToggleConnect();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-md shadow-rose-600/30 cursor-pointer"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Auto-Mention Social Express Dispatcher */}
          <div className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-rose-300 uppercase flex items-center gap-1">
                <AtSign className="w-3 h-3 text-rose-400" />
                Auto Mention Express
              </span>
              <span className="text-[8px] text-neutral-400">1-Tap Send</span>
            </div>

            {/* Social Platform Chips */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'wa', label: 'WhatsApp', icon: MessageCircle, color: 'hover:bg-emerald-500/30 text-emerald-300' },
                { id: 'ig', label: 'Instagram', icon: Instagram, color: 'hover:bg-pink-500/30 text-pink-300' },
                { id: 'msg', label: 'Messenger', icon: Zap, color: 'hover:bg-blue-500/30 text-blue-300' },
                { id: 'sms', label: 'SMS', icon: Send, color: 'hover:bg-amber-500/30 text-amber-300' },
              ].map((plat) => {
                const Icon = plat.icon;
                const isAct = activeSocial === plat.id;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSocial(plat.id as any);
                    }}
                    className={`py-1 px-1.5 rounded-xl text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isAct
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                        : `bg-neutral-800/60 text-neutral-300 ${plat.color}`
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {plat.label}
                  </button>
                );
              })}
            </div>

            {/* Input Row for Tag & Send */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 bg-black/50 border border-neutral-700/60 rounded-xl px-2 py-1">
                <span className="text-[10px] text-rose-400 font-bold">@</span>
                <input
                  type="text"
                  value={mentionTag.replace(/^@/, '')}
                  onChange={(e) => setMentionTag(`@${e.target.value.replace(/^@/, '')}`)}
                  placeholder="jaan / username"
                  className="w-full bg-transparent text-white text-[11px] font-medium outline-none placeholder:text-neutral-600"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendAutoMention(activeSocial);
                }}
                className="px-2.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl text-white text-[10px] font-extrabold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3 h-3" />
                Send
              </button>
            </div>
          </div>

          {/* Fast Accessibility Suite Controls */}
          <div className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                Accessibility & Tools
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAccessibility();
                }}
                className="text-[9px] text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                Full Suite →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Screen Reader Speech */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReadCurrentState();
                }}
                className="p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white flex flex-col items-center gap-0.5 text-center transition-all cursor-pointer"
                title="Speak Current Screen via TTS"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[8px] font-bold">Screen Read</span>
              </button>

              {/* High Contrast Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  appHeads.vibrate(20);
                  const active = appHeads.toggleHighContrast();
                  onStatusToast(active ? 'High Contrast OLED Mode ON 👁️' : 'High Contrast Mode OFF');
                }}
                className={`p-1.5 rounded-xl flex flex-col items-center gap-0.5 text-center transition-all cursor-pointer ${
                  config.highContrast
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                    : 'bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                }`}
                title="Toggle High Contrast Mode"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[8px] font-bold">Contrast</span>
              </button>

              {/* Picture-in-Picture Floating Window */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  appHeads.vibrate(25);
                  appHeads.requestPictureInPicture().then((ok) => {
                    onStatusToast(
                      ok
                        ? 'Picture-in-Picture Floating Head Active 🪟'
                        : 'PiP supported on Chrome / Desktop'
                    );
                  });
                }}
                className="p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white flex flex-col items-center gap-0.5 text-center transition-all cursor-pointer"
                title="Popout Document PiP Mini Window"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[8px] font-bold">PiP Window</span>
              </button>
            </div>
          </div>

          {/* Quick Hardware & Apps Launcher */}
          <div className="grid grid-cols-4 gap-1 pt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMobileControl('controls');
              }}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-neutral-800/80 flex flex-col items-center gap-0.5 transition-all cursor-pointer"
              title="Mobile Device Control"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8px] font-bold">Mobile</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenVision();
              }}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 border border-neutral-800/80 flex flex-col items-center gap-0.5 transition-all cursor-pointer"
              title="Camera Vision AI"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[8px] font-bold">Vision</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFaceLock();
              }}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-pink-500/20 text-neutral-300 hover:text-pink-300 border border-neutral-800/80 flex flex-col items-center gap-0.5 transition-all cursor-pointer"
              title="Biometric Face Scan Lock"
            >
              <ScanFace className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[8px] font-bold">Face Lock</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCyberCoding();
              }}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-neutral-800/80 flex flex-col items-center gap-0.5 transition-all cursor-pointer"
              title="Cyber Coding Lab"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8px] font-bold">Coding Lab</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
