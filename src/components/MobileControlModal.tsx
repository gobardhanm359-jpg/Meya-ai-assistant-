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
} from 'lucide-react';
import {
  mobileControl,
  BatteryStatusInfo,
  MobileDeviceInfo,
  VibrationStyle,
} from '../services/mobileControlService.ts';
import { usePWAInstall } from '../services/usePWAInstall.ts';

interface MobileControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isScreenAwake: boolean;
  onToggleScreenAwake: () => void;
  onOpenVisionCamera: () => void;
  onStatusToast: (msg: string) => void;
  initialTab?: 'controls' | 'call_chat' | 'apps' | 'apk';
}

export const MobileControlModal: React.FC<MobileControlModalProps> = ({
  isOpen,
  onClose,
  isScreenAwake,
  onToggleScreenAwake,
  onOpenVisionCamera,
  onStatusToast,
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Call / WhatsApp / SMS inputs
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [messageText, setMessageText] = useState<string>(
    'Hey! Mahi AI se message bhej raha hoon 💕'
  );
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      mobileControl.getBatteryStatus().then(setBattery);
      setDeviceInfo(mobileControl.getDeviceInfo());
      setTorchState(mobileControl.getTorchState());
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsub = mobileControl.onTorchChange((active, screenFallback) => {
      setTorchState({ active, screenFallback });
    });
    return unsub;
  }, []);

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
    const msg = mobileControl.sendWhatsApp(phoneNumber, messageText);
    onStatusToast(msg);
  };

  const handleSms = () => {
    const msg = mobileControl.sendSms(phoneNumber, messageText);
    onStatusToast(msg);
  };

  const handleLaunchApp = (appKey: string) => {
    const res = mobileControl.openMobileApp(appKey, appSearchQuery);
    onStatusToast(`Opening ${res.title}...`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* TOP HEADER */}
        <div className="p-4 bg-gradient-to-r from-rose-950/70 via-purple-950/60 to-cyan-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-rose-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-wide text-white uppercase">
                  Mobile Control Center
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SMART OS
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                {deviceInfo.deviceModel} • {deviceInfo.osName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LIVE DEVICE TELEMETRY BAR */}
        <div className="px-4 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
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

          <div className="flex items-center gap-1 text-rose-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Voice Control Ready</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-900/90 border-b border-white/10 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`py-2 rounded-xl transition-all ${
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
            className={`py-2 rounded-xl transition-all ${
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
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'apps'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🚀 Apps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`py-2 rounded-xl transition-all ${
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

              {/* Haptic Vibration Deck */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-pink-400" />
                    Haptic Vibration Patterns
                  </span>
                  <span className="text-[10px] text-white/50">Feel Mahi&apos;s Touch</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'heartbeat', label: '💓 Heart' },
                      { id: 'kiss', label: '💋 Kiss' },
                      { id: 'pulse', label: '✨ Pulse' },
                      { id: 'sos', label: '🆘 SOS' },
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

              {/* Voice Commands Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/40 to-purple-950/40 border border-rose-500/30 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  Speak to Mahi for Hands-Free Control:
                </div>
                <ul className="text-[11px] text-white/80 space-y-1">
                  <li>• &ldquo;Mahi, mere phone ki <strong>flashlight on</strong> kar do&rdquo;</li>
                  <li>• &ldquo;Mahi, phone ko <strong>heartbeat vibrate</strong> karo&rdquo;</li>
                  <li>• &ldquo;Mahi, mere phone ki <strong>battery kitni hai</strong>?&rdquo;</li>
                  <li>• &ldquo;Mahi, <strong>WhatsApp</strong> ya <strong>Instagram</strong> kholo&rdquo;</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: PHONE CALL, WHATSAPP & SMS */}
          {activeTab === 'call_chat' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    Phone Number (Optional for WhatsApp/Dialer)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    Message Text (WhatsApp / SMS)
                  </label>
                  <textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type message to send..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>

                {/* Quick Message Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Kahan ho? Call karo jaldi 💕',
                    'Main abhi busy hoon, thodi der mein call karta hoon 📱',
                    'Miss you! ❤️',
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

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCall}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSms}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200">
                💡 <strong>Voice Tip:</strong> Call ke dauran Mahi se bolo:{' '}
                <em>&ldquo;Mahi, 9876543210 pe phone call lagao&rdquo;</em> ya{' '}
                <em>&ldquo;Mahi, WhatsApp pe Hello message bhej do&rdquo;</em>!
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
                  placeholder="Optional: Song, video, or place to open in app..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleLaunchApp('youtube')}
                  className="p-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">YouTube</div>
                    <div className="text-[10px] text-white/50">Open app / video</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('whatsapp')}
                  className="p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">WhatsApp</div>
                    <div className="text-[10px] text-white/50">Open chat</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('instagram')}
                  className="p-3 rounded-2xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-pink-500/25 flex items-center justify-center text-pink-400 shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Instagram</div>
                    <div className="text-[10px] text-white/50">Reels & feed</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('spotify')}
                  className="p-3 rounded-2xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-500/25 flex items-center justify-center text-green-400 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Spotify</div>
                    <div className="text-[10px] text-white/50">Play songs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('maps')}
                  className="p-3 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Google Maps</div>
                    <div className="text-[10px] text-white/50">Navigate places</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('google')}
                  className="p-3 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-2.5 text-left transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Google Search</div>
                    <div className="text-[10px] text-white/50">Search web</div>
                  </div>
                </button>
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

          {/* TAB 4: ANDROID APK / PWA INSTALLER */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-teal-950/50 to-neutral-900 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Mahi AI Mobile App (Android / Vivo / iOS)
                    </h3>
                    <p className="text-[11px] text-emerald-300 font-semibold">
                      {isInstalled
                        ? '✅ Installed as Native Standalone App'
                        : 'Ready for Direct Phone Installation'}
                    </p>
                  </div>
                </div>

                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) onStatusToast('Mahi AI App installing on your phone! 🎉');
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>1-Click Install Mahi AI APK (WebAPK)</span>
                  </button>
                )}

                <div className="space-y-2 text-xs text-white/85 bg-black/40 p-3 rounded-xl border border-white/10">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    How to Install on Vivo Y300 / Android Phone:
                  </p>
                  {isIOS ? (
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/75">
                      <li>Tap the <strong>Share</strong> button in Safari.</li>
                      <li>Tap <strong>Add to Home Screen</strong>.</li>
                      <li>Open <strong>Mahi AI</strong> from your home screen like a native app!</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/75">
                      <li>Open this app URL in <strong>Chrome</strong> on your phone.</li>
                      <li>Tap the <strong>⋮ (3-dots menu)</strong> in the top-right corner.</li>
                      <li>Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.</li>
                      <li>Chrome automatically builds and installs the signed <strong>Mahi AI WebAPK</strong> on your phone!</li>
                    </ol>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-cyan-300">
                    📦 Want a Standalone .APK File to Share?
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    This app includes a full PWA Manifest &amp; Service Worker. You can package the live URL into a downloadable Android <code>.apk</code> in 30 seconds using PWABuilder:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      mobileControl.launchUri(
                        `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(window.location.origin)}`,
                        true
                      );
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Generate Standalone .APK on PWABuilder</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
