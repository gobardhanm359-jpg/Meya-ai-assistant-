import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Flashlight,
  Vibrate,
  Battery,
  BatteryCharging,
  Wifi,
  Phone,
  MessageCircle,
  Send,
  Maximize2,
  Sun,
  Share2,
  ExternalLink,
  Download,
  Camera,
  MapPin,
  Music,
  Youtube,
  Instagram,
  Sparkles,
  CheckCircle2,
  Mic,
  Search,
  Clock,
  Crown,
  Volume2,
  Clipboard,
  ShoppingBag,
  CreditCard,
  Calculator,
  CloudSun,
  Trash2,
  AtSign,
  Zap,
} from 'lucide-react';
import {
  mobileControl,
  BatteryStatusInfo,
  MobileDeviceInfo,
  VibrationStyle,
  ActiveTimerInfo,
} from '../services/mobileControlService.ts';
import { voiceAuth } from '../services/voiceAuthService.ts';
import { usePWAInstall } from '../services/usePWAInstall.ts';
import { StorePackageStudio } from './StorePackageStudio.tsx';

interface MobileControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isScreenAwake: boolean;
  onToggleScreenAwake: () => void;
  onOpenVisionCamera: () => void;
  onStatusToast: (msg: string) => void;
  onExecuteCommand?: (cmdText: string) => void;
  initialTab?: 'controls' | 'call_chat' | 'apps' | 'apk';
}

export const MobileControlModal: React.FC<MobileControlModalProps> = ({
  isOpen,
  onClose,
  isScreenAwake,
  onToggleScreenAwake,
  onOpenVisionCamera,
  onStatusToast,
  onExecuteCommand,
  initialTab = 'controls',
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'call_chat' | 'apps' | 'apk'>(initialTab);
  const [battery, setBattery] = useState<BatteryStatusInfo>({
    level: 100,
    charging: false,
    supported: false,
  });
  const [deviceInfo, setDeviceInfo] = useState<MobileDeviceInfo>(mobileControl.getDeviceInfo());
  const [torchState, setTorchState] = useState(mobileControl.getTorchState());
  const [brightness, setBrightness] = useState<number>(mobileControl.getBrightness());
  const [timers, setTimers] = useState<ActiveTimerInfo[]>(mobileControl.getTimers());
  const [cmdHistory, setCmdHistory] = useState(mobileControl.getCommandHistory());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [instantObey, setInstantObey] = useState<boolean>(voiceAuth.getInstantObeyMode());

  // Direct Hukam Input inside Modal
  const [hukamText, setHukamText] = useState<string>('');
  const [timerSecondsInput, setTimerSecondsInput] = useState<number>(60);
  const [clipboardInput, setClipboardInput] = useState<string>('');

  // Call / WhatsApp / Instagram / Messenger / SMS inputs
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [mentionTag, setMentionTag] = useState<string>('@jaan');
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<
    'whatsapp' | 'instagram' | 'messenger' | 'sms' | 'call'
  >('whatsapp');
  const [messageText, setMessageText] = useState<string>(
    'Hey! Riya AI se message bhej raha hoon 💕 Always thinking of you!'
  );
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      mobileControl.getBatteryStatus().then(setBattery);
      setDeviceInfo(mobileControl.getDeviceInfo());
      setTorchState(mobileControl.getTorchState());
      setBrightness(mobileControl.getBrightness());
      setTimers(mobileControl.getTimers());
      setCmdHistory(mobileControl.getCommandHistory());
      setIsFullscreen(Boolean(document.fullscreenElement));
      setInstantObey(voiceAuth.getInstantObeyMode());
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsubTorch = mobileControl.onTorchChange((active, screenFallback) => {
      setTorchState({ active, screenFallback });
    });
    const unsubBright = mobileControl.onBrightnessChange((lvl) => {
      setBrightness(lvl);
    });
    const unsubTimer = mobileControl.onTimerChange((list, finished) => {
      setTimers(list);
      if (finished) {
        onStatusToast(`⏰ Timer Complete: ${finished.label}!`);
      }
    });
    const unsubHist = mobileControl.onHistoryChange(() => {
      setCmdHistory(mobileControl.getCommandHistory());
    });
    const unsubAuth = voiceAuth.subscribe(() => {
      setInstantObey(voiceAuth.getInstantObeyMode());
    });
    return () => {
      unsubTorch();
      unsubBright();
      unsubTimer();
      unsubHist();
      unsubAuth();
    };
  }, [onStatusToast]);

  if (!isOpen) return null;

  const handleToggleTorch = async () => {
    const res = await mobileControl.toggleFlashlight();
    onStatusToast(res.message);
  };

  const handleVibrate = (style: VibrationStyle) => {
    const res = mobileControl.triggerVibration(style);
    onStatusToast(res.message);
  };

  const handleToggleFullscreen = async () => {
    const next = await mobileControl.toggleFullscreen();
    setIsFullscreen(next);
    onStatusToast(next ? 'Fullscreen Mode Active 📱' : 'Exited Fullscreen Mode');
  };

  const handleShare = async () => {
    const msg = await mobileControl.shareApp();
    onStatusToast(msg);
  };

  const handleCall = () => {
    const msg = mobileControl.makePhoneCall(phoneNumber);
    onStatusToast(msg);
  };

  const handleWhatsApp = () => {
    const msg = mobileControl.sendWhatsApp(phoneNumber, messageText, mentionTag);
    onStatusToast(msg);
  };

  const handleInstagram = () => {
    const msg = mobileControl.openInstagram(phoneNumber, `${mentionTag} ${messageText}`.trim());
    onStatusToast(msg);
  };

  const handleMessenger = () => {
    const msg = mobileControl.openMessenger(phoneNumber, `${mentionTag} ${messageText}`.trim());
    onStatusToast(msg);
  };

  const handleSms = () => {
    const msg = mobileControl.sendSms(phoneNumber, messageText, mentionTag);
    onStatusToast(msg);
  };

  const handleLaunchApp = (appKey: string) => {
    const res = mobileControl.openMobileApp(appKey, appSearchQuery);
    onStatusToast(`Opening ${res.title}...`);
  };

  const handleToggleInstantObey = () => {
    const next = !instantObey;
    voiceAuth.setInstantObeyMode(next);
    setInstantObey(next);
    onStatusToast(
      next
        ? '👑 Hukam Mode ON: Mahi aapki har baat turant maanegi!'
        : '🔐 Strict Voice Lock Enabled'
    );
  };

  const handleSendHukam = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = hukamText.trim();
    if (!clean) return;
    if (onExecuteCommand) {
      onExecuteCommand(clean);
    }
    setHukamText('');
  };

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* TOP HEADER */}
        <div className="p-4 bg-gradient-to-r from-rose-950/70 via-purple-950/60 to-cyan-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-rose-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-wide text-white">
                  Mobile Control &amp; Hukam Center
                </h2>
              </div>
              <p className="text-[11px] text-white/60">
                {deviceInfo.deviceModel} · {deviceInfo.osName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LIVE DEVICE TELEMETRY BAR */}
        <div className="px-4 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold tabular-nums">
            {battery.charging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              {battery.level}% {battery.charging ? '(Charging ⚡)' : 'Battery'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>{deviceInfo.connectionType}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleInstantObey}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
              instantObey
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-white/10 border-white/15 text-white/60'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>{instantObey ? 'Hukam Mode: ON' : 'Hukam Mode: OFF'}</span>
          </button>
        </div>

        {/* DIRECT HUKAM BAR INSIDE MODAL */}
        <form
          onSubmit={handleSendHukam}
          className="px-3 py-2 bg-neutral-900/95 border-b border-white/10 flex items-center gap-1.5"
        >
          <input
            type="text"
            value={hukamText}
            onChange={(e) => setHukamText(e.target.value)}
            placeholder="Mahi ko jo bolo wohi karegi (e.g. YouTube kholo, Torch on, Kiss do)..."
            className="flex-1 px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-rose-400"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Hukam</span>
          </button>
        </form>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-900/90 border-b border-white/10 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🎛️ Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('call_chat')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'call_chat'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            📞 Call/WA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'apps'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🚀 18+ Apps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            📲 APK / App
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: HARDWARE & SYSTEM CONTROLS */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Quick Hardware Tile Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Flashlight / Torch */}
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start gap-2 transition-all cursor-pointer active:scale-95 ${
                    torchState.active
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                    <Flashlight className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold">
                      {torchState.active ? 'Flashlight: ON' : 'Flashlight / Torch'}
                    </div>
                    <div className="text-[10px] opacity-65">
                      {torchState.active
                        ? torchState.screenFallback
                          ? 'Screen Torch Active'
                          : 'Rear LED Active'
                        : 'Tap to toggle phone light'}
                    </div>
                  </div>
                </button>

                {/* Screen Wake Lock */}
                <button
                  type="button"
                  onClick={onToggleScreenAwake}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start gap-2 transition-all cursor-pointer active:scale-95 ${
                    isScreenAwake
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-lg shadow-rose-500/20'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold">
                      {isScreenAwake ? 'Wake Lock: ON' : 'Wake Lock: OFF'}
                    </div>
                    <div className="text-[10px] opacity-65">
                      Keep phone screen awake
                    </div>
                  </div>
                </button>

                {/* Fullscreen Immersive Mode */}
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start gap-2 transition-all cursor-pointer active:scale-95 ${
                    isFullscreen
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold">
                      {isFullscreen ? 'Fullscreen: ON' : 'Fullscreen Mode'}
                    </div>
                    <div className="text-[10px] opacity-65">
                      Immersive mobile display
                    </div>
                  </div>
                </button>

                {/* AI Camera Vision */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVisionCamera();
                  }}
                  className="p-3.5 rounded-2xl border bg-white/5 border-white/10 text-white/80 hover:bg-purple-500/15 hover:border-purple-400/40 flex flex-col items-start gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold">Mobile Camera Vision</div>
                    <div className="text-[10px] opacity-65">
                      Show rear/front cam to Mahi
                    </div>
                  </div>
                </button>
              </div>

              {/* Screen Brightness Slider */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Sun className="w-4 h-4" />
                    Screen Brightness Control
                  </span>
                  <span className="text-white/80 tabular-nums">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={brightness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    mobileControl.setBrightness(val);
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between gap-2 pt-1">
                  {[35, 65, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const msg = mobileControl.setBrightness(preset);
                        onStatusToast(msg);
                      }}
                      className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-white/75 cursor-pointer"
                    >
                      {preset === 35 ? '🌙 Night (35%)' : preset === 65 ? '🌤️ Medium (65%)' : '☀️ Max (100%)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* App Heads & Accessibility Suite Quick Deck */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-neutral-900/60 to-rose-950/40 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    App Heads & Accessibility Suite
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold">Floating & Screen Reader</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onExecuteCommand) {
                        onExecuteCommand('Riya, App Heads floating bubble chalu karo');
                      }
                      onStatusToast('App Heads Floating Bubble Triggered 🎀');
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>🎀 App Heads Bubble</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onExecuteCommand) {
                        onExecuteCommand('Riya, accessibility aur screen reader open karo');
                      }
                      onStatusToast('Accessibility & Screen Reader Triggered ♿');
                    }}
                    className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>♿ Accessibility Hub</span>
                  </button>
                </div>
              </div>

              {/* Haptic Vibration Deck */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-pink-400" />
                    Haptic Vibration Patterns
                  </span>
                  <span className="text-[10px] text-white/50">Feel Mahi&apos;s Touch</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'heartbeat', label: '💓 Heartbeat' },
                      { id: 'kiss', label: '💋 Kiss Pulse' },
                      { id: 'pulse', label: '✨ Soft Tap' },
                      { id: 'sos', label: '🆘 SOS Signal' },
                      { id: 'alert', label: '🔔 Strong Alert' },
                      { id: 'long', label: '🌊 Deep Wave' },
                    ] as { id: VibrationStyle; label: string }[]
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVibrate(v.id)}
                      className="py-2 px-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 border border-pink-500/30 text-pink-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Timer & Alarm Deck */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Phone Timer &amp; Alarm
                  </span>
                  <div className="flex items-center gap-1">
                    {[30, 60, 300].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          const msg = mobileControl.startTimer(
                            sec,
                            sec >= 60 ? `${sec / 60}m Timer` : `${sec}s Timer`
                          );
                          onStatusToast(msg);
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 text-[10px] font-bold cursor-pointer"
                      >
                        +{sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {timers.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {timers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/50 border border-cyan-500/30 text-xs"
                      >
                        <span className="text-white/85 font-semibold">{t.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300 tabular-nums">
                            {formatRemaining(t.remainingSeconds)}
                          </span>
                          <button
                            type="button"
                            onClick={() => mobileControl.cancelTimer(t.id)}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Executed Commands Log */}
              {cmdHistory.length > 0 && (
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-300">
                    Recent Commands Executed by Mahi:
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {cmdHistory.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-[11px] text-white/75"
                      >
                        <span className="truncate">{item.result}</span>
                        <span className="text-[9px] text-white/40 tabular-nums shrink-0 ml-2">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTO MENTION & SOCIAL COMMUNICATOR */}
          {activeTab === 'call_chat' && (
            <div className="space-y-3.5">
              {/* Target Platform Selector */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <AtSign className="w-3.5 h-3.5" />
                    Auto Mention Platform:
                  </span>
                  <span className="text-[10px] text-white/50">1-Tap Direct Launch</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', color: 'from-emerald-600 to-green-600 border-emerald-400' },
                    { id: 'instagram', label: 'Instagram', color: 'from-pink-600 to-rose-600 border-pink-400' },
                    { id: 'messenger', label: 'Messenger', color: 'from-blue-600 to-indigo-600 border-blue-400' },
                    { id: 'sms', label: 'SMS Msg', color: 'from-purple-600 to-pink-600 border-purple-400' },
                  ].map((p) => {
                    const isSelected = activeSocialPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActiveSocialPlatform(p.id as any)}
                        className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? `bg-gradient-to-r ${p.color} text-white shadow-md font-extrabold`
                            : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient & Auto-Mention Tag Form */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-white/70 mb-1">
                      Recipient (Phone No. / @Username)
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={
                        activeSocialPlatform === 'whatsapp' || activeSocialPlatform === 'sms'
                          ? 'e.g. +91 9876543210'
                          : 'e.g. @username or profile ID'
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-white/70 mb-1">
                      Auto @Tag
                    </label>
                    <input
                      type="text"
                      value={mentionTag}
                      onChange={(e) => setMentionTag(e.target.value)}
                      placeholder="@tag"
                      className="w-full px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Auto-Mention Quick Tag Pills */}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-white/50">Quick Mention Tags:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['@jaan', '@boss', '@love', '@riya', '@friend', '@everyone', '@urgent'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setMentionTag(tag)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          mentionTag === tag
                            ? 'bg-amber-500/25 border-amber-400/60 text-amber-200 font-bold'
                            : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    Message Content (with Auto Mention)
                  </label>
                  <textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type message text..."
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                {/* Quick Message Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-white/50">Pre-composed Templates:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Kahan ho? Call karo jaldi 💕',
                      'Main abhi busy hoon, thodi der mein call karta hoon 📱',
                      'Riya AI ke sath chatting kar raha hoon! 💖',
                      'Urgent task reminder — check now 🚨',
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMessageText(preset)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/75 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct 1-Click Launchers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInstagram}
                    className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-lg shadow-pink-500/20 cursor-pointer active:scale-95"
                  >
                    <Instagram className="w-3.5 h-3.5 shrink-0" />
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMessenger}
                    className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Messenger</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSms}
                    className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>SMS Msg</span>
                  </button>
                </div>
              </div>

              {/* Quick Clipboard Tool & Phone Call Dialer */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCall}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-left flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Direct Phone Call</div>
                    <div className="text-[10px] text-white/50">Open dialer / call</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const fullText = `${mentionTag} ${messageText}`.trim();
                    const msg = await mobileControl.copyToClipboard(fullText);
                    onStatusToast(msg);
                  }}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/40 text-left flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                    <Clipboard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Copy Mention Note</div>
                    <div className="text-[10px] text-white/50">Save to clipboard</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MOBILE APPS & DEEP LAUNCHER */}
          {activeTab === 'apps' && (
            <div className="space-y-3.5">
              {/* Optional Search Query */}
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  placeholder="Optional: Song, video, product, or place to search..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'youtube', name: 'YouTube', sub: 'Videos & shorts', icon: Youtube, color: 'bg-red-500/15 border-red-500/30 text-red-400' },
                  { key: 'whatsapp', name: 'WhatsApp', sub: 'Chats & calls', icon: MessageCircle, color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
                  { key: 'instagram', name: 'Instagram', sub: 'Reels & stories', icon: Instagram, color: 'bg-pink-500/15 border-pink-500/30 text-pink-400' },
                  { key: 'spotify', name: 'Spotify Music', sub: 'Play Hindi songs', icon: Music, color: 'bg-green-500/15 border-green-500/30 text-green-400' },
                  { key: 'maps', name: 'Google Maps', sub: 'Navigation & routes', icon: MapPin, color: 'bg-blue-500/15 border-blue-500/30 text-blue-400' },
                  { key: 'phonepe', name: 'PhonePe', sub: 'UPI payments', icon: CreditCard, color: 'bg-purple-500/15 border-purple-500/30 text-purple-400' },
                  { key: 'gpay', name: 'Google Pay', sub: 'GPay UPI transfer', icon: CreditCard, color: 'bg-sky-500/15 border-sky-500/30 text-sky-400' },
                  { key: 'paytm', name: 'Paytm', sub: 'Wallet & recharge', icon: CreditCard, color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' },
                  { key: 'snapchat', name: 'Snapchat', sub: 'Camera & snaps', icon: Camera, color: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' },
                  { key: 'telegram', name: 'Telegram', sub: 'Channels & chat', icon: Send, color: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
                  { key: 'flipkart', name: 'Flipkart', sub: 'Shopping deals', icon: ShoppingBag, color: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' },
                  { key: 'amazon', name: 'Amazon', sub: 'Online store', icon: ShoppingBag, color: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
                  { key: 'zomato', name: 'Zomato', sub: 'Food delivery', icon: Sparkles, color: 'bg-rose-500/15 border-rose-500/30 text-rose-300' },
                  { key: 'calculator', name: 'Calculator', sub: 'Quick math', icon: Calculator, color: 'bg-teal-500/15 border-teal-500/30 text-teal-300' },
                  { key: 'weather', name: 'Live Weather', sub: 'Mausam update', icon: CloudSun, color: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
                  { key: 'google', name: 'Google Search', sub: 'Search anything', icon: ExternalLink, color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
                ].map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => handleLaunchApp(app.key)}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95 hover:bg-white/10 ${app.color}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{app.name}</div>
                        <div className="text-[10px] text-white/55 truncate">{app.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-rose-400" />
                <span>Share Mahi AI App to Friends</span>
              </button>
            </div>
          )}

          {/* TAB 4: STORE PACKAGE & ANDROID APK / PWA INSTALLER */}
          {activeTab === 'apk' && (
            <StorePackageStudio onStatusToast={onStatusToast} />
          )}
        </div>
      </div>
    </div>
  );
};
