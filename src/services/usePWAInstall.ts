import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level capture so beforeinstallprompt is never missed even if fired before component mount
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalOfflineReady = false;
let globalNeedRefresh = false;
let globalSwRegistered = false;
const pwaListeners = new Set<() => void>();

function notifyPWAListeners() {
  for (const cb of pwaListeners) {
    cb();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPWAListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyPWAListeners();
  });

  // Clean up any stale workbox-precache or older v1-v4 caches and register /sw.js immediately
  if ('serviceWorker' in navigator) {
    const registerMahiServiceWorker = async () => {
      try {
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            if (
              key.includes('workbox-precache') ||
              (key.startsWith('mahi-ai-') && !key.endsWith('-v5'))
            ) {
              await caches.delete(key);
            }
          }
        }
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        globalSwRegistered = Boolean(reg);
        globalOfflineReady = true;
        notifyPWAListeners();

        reg.update().catch(() => {});

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              globalNeedRefresh = true;
              notifyPWAListeners();
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] Service worker registration info:', err);
      }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      registerMahiServiceWorker();
    } else {
      window.addEventListener('DOMContentLoaded', registerMahiServiceWorker);
    }
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [offlineReady, setOfflineReady] = useState(globalOfflineReady);
  const [needRefresh, setNeedRefresh] = useState(globalNeedRefresh);
  const [swRegistered, setSwRegistered] = useState(globalSwRegistered);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setOfflineReady(globalOfflineReady);
      setNeedRefresh(globalNeedRefresh);
      setSwRegistered(globalSwRegistered);
      checkStandalone();
    };

    pwaListeners.add(syncState);
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener?.('change', checkStandalone);

    return () => {
      pwaListeners.delete(syncState);
      mediaQuery.removeEventListener?.('change', checkStandalone);
    };
  }, []);

  const install = async () => {
    if (!globalDeferredPrompt) return false;
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      notifyPWAListeners();
      return true;
    }
    return false;
  };

  const refreshApp = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => !k.endsWith('-v5'))
            .map((k) => caches.delete(k))
        );
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
    } catch (_) {}
    window.location.reload();
  };

  const forceUpdateApp = async (): Promise<string> => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (!k.endsWith('-v5')) {
            await caches.delete(k);
          }
        }
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
      globalNeedRefresh = false;
      notifyPWAListeners();
    } catch (_) {}
    return '✅ Mahi Ai Updated to Latest Version v5.0 (24h ON + Sentiment Engine + India IST)';
  };

  const dismissOfflineReady = () => {
    globalOfflineReady = false;
    notifyPWAListeners();
  };

  return {
    isInstallable: !!deferredPrompt,
    canInstall: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    offlineReady,
    needRefresh,
    swRegistered,
    install,
    triggerInstall: install,
    refreshApp,
    forceUpdateApp,
    dismissOfflineReady,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
