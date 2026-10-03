import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  Volume2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Sun,
  Type,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  Radio,
  Layers,
  Zap,
  Sliders,
  Play,
  VolumeX,
  ExternalLink,
} from 'lucide-react';
import { accessibilityService, AccessibilityTelemetry } from '../services/accessibilityService.ts';
import { appHeads, AppHeadsConfig } from '../services/appHeadsService.ts';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusToast: (msg: string) => void;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  onStatusToast,
}) => {
  const [telemetry, setTelemetry] = useState<AccessibilityTelemetry>(() =>
    accessibilityService.getTelemetry()
  );
  const [headsConfig, setHeadsConfig] = useState<AppHeadsConfig>(() => appHeads.getConfig());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'accessibility' | 'app_heads' | 'android_bridge'>('accessibility');
  const [speechTestText, setSpeechTestText] = useState<string>(
    'Namaste! Riya Accessibility Suite active hai. Aap voice hukam aur auto mention use kar sakte hain.'
  );

  useEffect(() => {
    const unsubAcc = accessibilityService.subscribe((t) => setTelemetry(t));
    const unsubHeads = appHeads.subscribe((c) => setHeadsConfig(c));
    return () => {
      unsubAcc();
      unsubHeads();
    };
  }, []);

  if (!isOpen) return null;

  const handleSyncAccessibility = async () => {
    setIsSyncing(true);
    appHeads.vibrate([20, 50, 20]);
    const updated = await accessibilityService.toggleAccessibilityService();
    setIsSyncing(false);
    onStatusToast(
      updated.state === 'enabled'
        ? 'Accessibility Service Synchronized & Active ♿'
        : 'Accessibility Service Paused'
    );
  };

  const handleTestSpeech = () => {
    appHeads.vibrate(30);
    appHeads.speakNarration(speechTestText);
    onStatusToast('🔊 Playing Spoken TTS Accessibility Feedback');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility & App Heads Suite"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950/95 border border-cyan-500/30 text-white shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-wide text-white">
                  Accessibility & App Heads
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Universal Suite
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Spoken narration, visual enhancements & floating bubble overlay
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800/80 bg-neutral-900/30 px-3 pt-2 gap-1">
          {[
            { id: 'accessibility', label: '♿ Accessibility Suite', icon: Eye },
            { id: 'app_heads', label: '🎀 App Heads Floating', icon: Layers },
            { id: 'android_bridge', label: '📱 Android Service Bridge', icon: Smartphone },
          ].map((tab) => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  appHeads.vibrate(15);
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 py-2.5 px-2 rounded-t-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isAct
                    ? 'bg-neutral-800/90 text-cyan-300 border-t-2 border-cyan-400 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      telemetry.state === 'enabled'
                        ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                        : telemetry.state === 'syncing'
                        ? 'bg-amber-400 animate-spin'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Accessibility Status:{' '}
                      <span
                        className={
                          telemetry.state === 'enabled'
                            ? 'text-emerald-400 uppercase font-black'
                            : 'text-rose-400 uppercase font-black'
                        }
                      >
                        {telemetry.state}
                      </span>
                    </p>
                    <p className="text-[10px] text-neutral-400">{telemetry.statusDetail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAccessibility}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Bridge'}
                </button>
              </div>

              {/* Spoken Screen Reader (TTS) Section */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Spoken Screen Reader (Hindi & English TTS)
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Voice announcements for subtitles, buttons, love meter & device telemetry
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      appHeads.vibrate(25);
                      const act = appHeads.toggleScreenReader();
                      onStatusToast(act ? 'Screen Reader ON 🔊' : 'Screen Reader OFF 🔇');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      headsConfig.screenReaderActive
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {headsConfig.screenReaderActive ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {/* Test Speech Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={speechTestText}
                    onChange={(e) => setSpeechTestText(e.target.value)}
                    className="flex-1 bg-black/60 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    placeholder="Type sample phrase for TTS..."
                  />
                  <button
                    type="button"
                    onClick={handleTestSpeech}
                    className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 hover:brightness-110 active:scale-95 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Test Voice
                  </button>
                </div>
              </div>

              {/* Visual Enhancements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* High Contrast OLED */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">High Contrast OLED</p>
                      <p className="text-[10px] text-neutral-400">Pure black & neon outlines</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      appHeads.vibrate(20);
                      const act = appHeads.toggleHighContrast();
                      onStatusToast(act ? 'High Contrast OLED Mode ON' : 'High Contrast OFF');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      headsConfig.highContrast ? 'bg-amber-500' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        headsConfig.highContrast ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Large Typography Scale */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <Type className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Large Text Scale</p>
                      <p className="text-[10px] text-neutral-400">125% enlarged typography</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      appHeads.vibrate(20);
                      const act = appHeads.toggleLargeFont();
                      onStatusToast(act ? 'Large Typography Mode ON' : 'Large Typography OFF');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      headsConfig.largeFont ? 'bg-purple-500' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        headsConfig.largeFont ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Reduced Motion */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Reduce Animations</p>
                      <p className="text-[10px] text-neutral-400">Disable pulse & heavy motion</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      appHeads.vibrate(20);
                      const act = appHeads.toggleReduceMotion();
                      onStatusToast(act ? 'Motion Reduced' : 'Standard Animations Active');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      headsConfig.reduceMotion ? 'bg-emerald-500' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        headsConfig.reduceMotion ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Haptic Vibrations */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Haptic Touch Feedback</p>
                      <p className="text-[10px] text-neutral-400">Tactile buzz on tap & voice</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const act = appHeads.toggleHaptics();
                      appHeads.vibrate(50);
                      onStatusToast(act ? 'Haptic Feedback Enabled' : 'Haptics Disabled');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      headsConfig.hapticEnabled ? 'bg-pink-500' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        headsConfig.hapticEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'app_heads' && (
            <div className="space-y-4">
              {/* App Heads Toggle Switch */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-neutral-900/60 to-purple-950/40 border border-rose-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-xl">
                    🎀
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Floating App Heads Bubble</h4>
                    <p className="text-xs text-neutral-400">
                      Draggable on-screen companion with auto-mention & quick mic
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    appHeads.vibrate(30);
                    const act = appHeads.toggleEnabled();
                    onStatusToast(act ? 'App Heads Bubble Enabled 🎀' : 'App Heads Bubble Disabled');
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                    headsConfig.enabled
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {headsConfig.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Bubble Size Selector */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-300">
                  Bubble Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sm', label: 'Compact (48px)' },
                    { id: 'md', label: 'Standard (56px)' },
                    { id: 'lg', label: 'Large (64px)' },
                  ].map((sz) => {
                    const isAct = headsConfig.bubbleSize === sz.id;
                    return (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => {
                          appHeads.vibrate(20);
                          appHeads.setBubbleSize(sz.id as any);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAct
                            ? 'bg-rose-500/20 border border-rose-400 text-rose-300 shadow-sm'
                            : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {sz.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Picture-in-Picture / Popout Window */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Picture-in-Picture Popout</h5>
                    <p className="text-[10px] text-neutral-400">
                      Float Riya over other desktop apps and browser tabs
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    appHeads.vibrate(30);
                    appHeads.requestPictureInPicture().then((ok) => {
                      onStatusToast(
                        ok ? 'Picture-in-Picture Window Opened 🪟' : 'PiP Window Launched'
                      );
                    });
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 hover:brightness-110 active:scale-95 shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Popout PiP
                </button>
              </div>
            </div>
          )}

          {activeTab === 'android_bridge' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Android System Permissions & Manifest
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  For the native Android build (<code className="text-rose-400">com.Riya.assistant</code>),
                  App Heads & Accessibility utilize native Android system services:
                </p>

                <div className="space-y-1.5 pt-1 text-[11px] text-neutral-300 font-mono bg-black/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>android.permission.SYSTEM_ALERT_WINDOW</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>android.permission.BIND_ACCESSIBILITY_SERVICE</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>android.permission.FOREGROUND_SERVICE_SPECIAL_USE</span>
                  </div>
                </div>
              </div>

              {/* Race Condition Fix explanation */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
                <h5 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Multi-Pass Race Condition Shield Active
                </h5>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  When switching between Android Settings and Riya, our multi-pass probe
                  (120ms/380ms/850ms) locks the true state across focus & visibility transitions without
                  flicker.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-neutral-800/80 bg-neutral-900/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            Riya Voice, Accessibility & App Heads Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
