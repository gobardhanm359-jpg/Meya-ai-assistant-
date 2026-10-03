/**
 * App Heads & Floating Overlay Service
 * - Manages draggable floating chat head / overlay bubble state
 * - Provides Picture-in-Picture (PiP) & Document PiP triggers
 * - Bridges with Android SYSTEM_ALERT_WINDOW / Floating Service
 * - Integrates with Accessibility Narration and Auto-Mention express triggers
 */

export interface AppHeadPosition {
  x: number;
  y: number;
}

export interface AppHeadsConfig {
  enabled: boolean;
  isExpanded: boolean;
  bubbleSize: 'sm' | 'md' | 'lg';
  position: AppHeadPosition;
  edgeSnap: boolean;
  highContrast: boolean;
  largeFont: boolean;
  screenReaderActive: boolean;
  reduceMotion: boolean;
  hapticEnabled: boolean;
}

const STORAGE_KEY = 'riya_app_heads_config_v1';

const DEFAULT_CONFIG: AppHeadsConfig = {
  enabled: true,
  isExpanded: false,
  bubbleSize: 'md',
  position: { x: 24, y: 160 },
  edgeSnap: true,
  highContrast: false,
  largeFont: false,
  screenReaderActive: false,
  reduceMotion: false,
  hapticEnabled: true,
};

class AppHeadsManager {
  private config: AppHeadsConfig = { ...DEFAULT_CONFIG };
  private listeners: Set<(config: AppHeadsConfig) => void> = new Set();
  private pipWindow: Window | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      }
    } catch (_) {}
    this.applyAccessibilityClasses();
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (_) {}
    this.applyAccessibilityClasses();
    this.notify();
  }

  private applyAccessibilityClasses(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (this.config.highContrast) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }

    if (this.config.largeFont) {
      root.classList.add('large-font-mode');
    } else {
      root.classList.remove('large-font-mode');
    }

    if (this.config.reduceMotion) {
      root.classList.add('reduce-motion-mode');
    } else {
      root.classList.remove('reduce-motion-mode');
    }
  }

  public subscribe(listener: (config: AppHeadsConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.getConfig());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getConfig();
    for (const cb of this.listeners) {
      cb(snap);
    }
  }

  public getConfig(): AppHeadsConfig {
    return { ...this.config };
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.config.isExpanded = false;
    }
    this.save();
  }

  public toggleEnabled(): boolean {
    const next = !this.config.enabled;
    this.setEnabled(next);
    return next;
  }

  public setExpanded(expanded: boolean): void {
    this.config.isExpanded = expanded;
    this.save();
  }

  public toggleExpanded(): boolean {
    const next = !this.config.isExpanded;
    this.setExpanded(next);
    return next;
  }

  public setPosition(pos: AppHeadPosition): void {
    this.config.position = pos;
    this.save();
  }

  public setBubbleSize(size: 'sm' | 'md' | 'lg'): void {
    this.config.bubbleSize = size;
    this.save();
  }

  public toggleHighContrast(): boolean {
    this.config.highContrast = !this.config.highContrast;
    this.save();
    return this.config.highContrast;
  }

  public toggleLargeFont(): boolean {
    this.config.largeFont = !this.config.largeFont;
    this.save();
    return this.config.largeFont;
  }

  public toggleReduceMotion(): boolean {
    this.config.reduceMotion = !this.config.reduceMotion;
    this.save();
    return this.config.reduceMotion;
  }

  public toggleScreenReader(): boolean {
    this.config.screenReaderActive = !this.config.screenReaderActive;
    this.save();
    if (this.config.screenReaderActive) {
      this.speakNarration('Screen Reader aur Spoken Accessibility chalu ho gaya hai.');
    } else {
      this.speakNarration('Screen Reader band kiya gaya.');
    }
    return this.config.screenReaderActive;
  }

  public toggleHaptics(): boolean {
    this.config.hapticEnabled = !this.config.hapticEnabled;
    this.save();
    return this.config.hapticEnabled;
  }

  /**
   * Spoken feedback / TTS for screen reader
   */
  public speakNarration(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  /**
   * Haptic vibration trigger
   */
  public vibrate(pattern: number | number[] = 35): void {
    if (!this.config.hapticEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  /**
   * Request Picture-in-Picture (PiP) floating window
   */
  public async requestPictureInPicture(videoEl?: HTMLVideoElement | null): Promise<boolean> {
    try {
      // 1. Check Document Picture-in-Picture API (Chrome 116+)
      const win = window as any;
      if ('documentPictureInPicture' in win && typeof win.documentPictureInPicture?.requestWindow === 'function') {
        const pipWin = await win.documentPictureInPicture.requestWindow({
          width: 320,
          height: 480,
        });
        this.pipWindow = pipWin;
        // Inject styles
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
          pipWin.document.head.appendChild(node.cloneNode(true));
        });
        return true;
      }

      // 2. Fallback to HTMLVideoElement PiP
      if (videoEl && typeof videoEl.requestPictureInPicture === 'function') {
        await videoEl.requestPictureInPicture();
        return true;
      }
    } catch (e) {
      console.warn('PiP not available:', e);
    }
    return false;
  }
}

export const appHeads = new AppHeadsManager();
