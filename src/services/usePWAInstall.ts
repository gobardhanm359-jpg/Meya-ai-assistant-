import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level capture so beforeinstallprompt is never missed even if fired before component mount
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalOfflineReady = false;
let globalNeedRefresh = false;
let globalSwRegistered = false;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
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

  // Register PWA Service Worker via virtual:pwa-register
  try {
    updateSWFn = registerSW({
      immediate: true,
      onRegisteredSW() {
        globalSwRegistered = true;
        notifyPWAListeners();
      },
      onOfflineReady() {
        globalOfflineReady = true;
        globalSwRegistered = true;
        notifyPWAListeners();
      },
      onNeedRefresh() {
        globalNeedRefresh = true;
        notifyPWAListeners();
      },
    });
  } catch (err) {
    console.warn('[PWA] Service worker registration info:', err);
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
    if (updateSWFn) {
      await updateSWFn(true);
    } else {
      window.location.reload();
    }
  };

  const dismissOfflineReady = () => {
    globalOfflineReady = false;
    notifyPWAListeners();
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    offlineReady,
    needRefresh,
    swRegistered,
    install,
    refreshApp,
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
