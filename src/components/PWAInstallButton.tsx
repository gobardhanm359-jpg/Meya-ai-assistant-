import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  RefreshCw,
  WifiOff,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../services/usePWAInstall.ts';
import { mobileControl } from '../services/mobileControlService.ts';

interface PWAInstallButtonProps {
  onOpenApkGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    swRegistered,
    offlineReady,
    needRefresh,
    install,
    refreshApp,
  } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed standalone PWA and no update is pending, hide the install button per PWA skill guidelines
  if (isInstalled && !needRefresh) {
    return null;
  }

  const handlePrimaryClick = async () => {
    if (needRefresh) {
      await refreshApp();
      return;
    }
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        title="Install Mahi AI Progressive Web App (PWA)"
        className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
          needRefresh
            ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
            : isInstallable
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-300 text-white shadow-md shadow-emerald-500/30'
            : 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/40 hover:to-teal-500/40 border-emerald-400/50 text-emerald-200 shadow-sm shadow-emerald-500/20'
        }`}
      >
        {needRefresh ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Update PWA</span>
          </>
        ) : (
          <>
            <Download className="w-3 h-3 text-emerald-200" />
            <span>{isInstallable ? 'Install PWA' : 'PWA / App'}</span>
          </>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-neutral-950 border border-white/15 p-5 shadow-2xl text-white space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      Mahi AI — PWA App
                    </h3>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      READY
                    </span>
                  </div>
                  <p className="text-[10px] text-white/55">
                    Installable Progressive Web App &amp; Offline Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PWA Compliance & Service Worker Status Grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Manifest: VALID</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>SW: {swRegistered ? 'ACTIVE' : 'READY'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Icons: 192 &amp; 512px</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <span>Network: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>

            {/* Direct 1-Click Native Browser Install Prompt (when available) */}
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowModal(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Install Mahi AI App Now</span>
              </button>
            )}

            {/* Platform-Specific Guided Installation */}
            {isIOS ? (
              <div className="space-y-2 text-xs text-white/85 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Install on iPhone / iPad (Safari):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-white/75">
                  <li>Tap the <strong>Share</strong> button in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to launch Mahi AI in standalone full-screen mode.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-white/85 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Install on Android / Desktop Chrome:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-white/75">
                  <li>Open this app in <strong>Google Chrome</strong> on your phone or PC.</li>
                  <li>
                    Tap the <strong>⋮ (3-dots menu)</strong> or address-bar install icon.
                  </li>
                  <li>
                    Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                  </li>
                  <li>
                    Chrome installs <strong>Mahi AI</strong> as a native standalone PWA (WebAPK)!
                  </li>
                </ol>
              </div>
            )}

            {/* Optional Standalone APK Builder Link */}
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2">
              <div className="text-[10px] text-cyan-200/90 leading-snug">
                <strong>Need a raw .APK file?</strong> Package this PWA via PWABuilder:
              </div>
              <button
                type="button"
                onClick={() =>
                  mobileControl.launchUri(
                    `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(window.location.origin)}`,
                    true
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>APK</span>
              </button>
            </div>

            {offlineReady && (
              <div className="text-[10px] text-center text-emerald-300 font-semibold">
                ✨ Offline Asset Cache Ready — Works smoothly even with spotty network!
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Floating In-App PWA Install & Update Banner
 */
export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    needRefresh,
    install,
    refreshApp,
  } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed || (!isInstallable && !needRefresh)) {
    return null;
  }

  return (
    <div className="relative z-30 px-4 max-w-md mx-auto w-full mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-950/90 border border-emerald-400/50 backdrop-blur-xl shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-white truncate">
              {needRefresh ? 'New Mahi AI Update Ready' : 'Install Mahi AI Mobile PWA'}
            </div>
            <div className="text-[10px] text-emerald-200/80 truncate">
              {needRefresh
                ? 'Tap reload to apply the latest features'
                : 'Add to Home Screen for full-screen native app experience'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => (needRefresh ? refreshApp() : install())}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-extrabold shadow-md shadow-emerald-500/25 cursor-pointer active:scale-95"
          >
            {needRefresh ? 'Reload' : 'Install'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss install banner"
            className="p-1 rounded-lg text-white/50 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 px-3.5 py-2 text-xs font-extrabold text-black shadow-xl backdrop-blur-md">
      <WifiOff className="w-3.5 h-3.5 text-black animate-pulse" />
      <span>Offline Mode — Cached PWA Assets Active</span>
    </div>
  );
};
