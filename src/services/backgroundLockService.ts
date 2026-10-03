/**
 * BackgroundLockService
 * 1. 24-Hour Always-On Engine: Keeps Cloud Run server, WebSocket, Wake Lock, and Audio alive 24x7
 * 2. Screen Wake Lock: Keeps the device screen ON (prevents phone from locking/sleeping)
 * 3. Background Call Keeper: Keeps audio & mic pipeline alive when user locks screen or turns screen OFF
 */

export class BackgroundLockService {
  private wakeLockSentinel: any = null;
  private isWakeLockRequested: boolean = true;
  private is24HourAlwaysOn: boolean = true;
  private silentAudio: HTMLAudioElement | null = null;
  private isBackgroundAudioActive: boolean = false;
  private keepAliveTimer: any = null;
  private startedAt: number = Date.now();
  private onStatusChange?: (isScreenAwake: boolean, isBackgroundReady: boolean) => void;

  constructor(onStatusChange?: (isScreenAwake: boolean, isBackgroundReady: boolean) => void) {
    this.onStatusChange = onStatusChange;
    this.initMediaSession();
    this.setupVisibilityListener();
    this.setupAutoInteractionLock();
    this.start24HourServerKeepAlive();
  }

  /**
   * Enable or disable 24-Hour Always-On Mode
   */
  public async set24HourAlwaysOn(enabled: boolean): Promise<boolean> {
    this.is24HourAlwaysOn = enabled;
    if (enabled) {
      await this.requestWakeLock();
      this.startBackgroundAudioKeeper();
      this.start24HourServerKeepAlive();
    } else {
      this.stop24HourServerKeepAlive();
    }
    this.notify();
    return this.is24HourAlwaysOn;
  }

  public get24HourAlwaysOn(): boolean {
    return this.is24HourAlwaysOn;
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  /**
   * Ping /api/keepalive every 25 seconds so Cloud Run & mobile carrier NAT never idle-timeout over 24 hours
   */
  public start24HourServerKeepAlive(): void {
    if (typeof window === 'undefined') return;
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);

    const pingServer = () => {
      if (!this.is24HourAlwaysOn) return;
      fetch('/api/keepalive', { cache: 'no-store' }).catch(() => {});
    };

    pingServer();
    this.keepAliveTimer = setInterval(pingServer, 25000);
  }

  public stop24HourServerKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Automatically acquire Wake Lock & Background Audio Keeper on first user gesture
   */
  private setupAutoInteractionLock(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleUserGesture = () => {
      if (this.is24HourAlwaysOn || this.isWakeLockRequested) {
        if (!this.wakeLockSentinel) {
          this.requestWakeLock().catch(() => {});
        }
      }
      if (this.is24HourAlwaysOn && !this.isBackgroundAudioActive) {
        this.startBackgroundAudioKeeper();
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    // Attempt initial wake lock immediately on load
    setTimeout(() => {
      this.requestWakeLock().catch(() => {});
    }, 300);
  }

  /**
   * Request Screen Wake Lock to prevent screen from turning off or locking
   */
  public async requestWakeLock(): Promise<boolean> {
    this.isWakeLockRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLockSentinel) {
          return true;
        }

        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
          this.notify();
          // If 24-Hour Always-On is active and tab is visible, re-acquire immediately
          if (
            (this.is24HourAlwaysOn || this.isWakeLockRequested) &&
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
          ) {
            setTimeout(() => {
              this.requestWakeLock().catch(() => {});
            }, 500);
          }
        });

        this.notify();
        return true;
      } catch (_) {
        this.notify();
        return false;
      }
    } else {
      this.notify();
      return false;
    }
  }

  /**
   * Release Screen Wake Lock so screen can sleep normally
   */
  public async releaseWakeLock(): Promise<void> {
    this.isWakeLockRequested = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (_) {}
      this.wakeLockSentinel = null;
    }
    this.notify();
  }

  public toggleWakeLock(): boolean {
    if (this.isWakeLockRequested) {
      this.releaseWakeLock();
      return false;
    } else {
      this.requestWakeLock();
      return true;
    }
  }

  public isAwakeActive(): boolean {
    return !!this.wakeLockSentinel || this.isWakeLockRequested;
  }

  /**
   * Start Background Audio Keeper
   * Uses an audio loop + MediaSession to keep the mobile browser process alive 24 hours
   * even when the user manually presses the power button or locks their screen.
   */
  public startBackgroundAudioKeeper(): void {
    if (this.isBackgroundAudioActive && this.silentAudio && !this.silentAudio.paused) return;

    try {
      if (!this.silentAudio) {
        // 1-second silent WAV base64
        const silentWavBase64 =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.silentAudio = new Audio(silentWavBase64);
        this.silentAudio.loop = true;
        this.silentAudio.volume = 0.01;
      }

      this.silentAudio
        .play()
        .then(() => {
          this.isBackgroundAudioActive = true;
          this.updateMediaSessionState('playing');
          this.notify();
        })
        .catch(() => {
          // Will auto-start on next pointerdown/touchstart gesture
        });
    } catch (_) {}
  }

  public stopBackgroundAudioKeeper(): void {
    if (this.is24HourAlwaysOn) {
      // Keep running in 24-Hour Always-On mode unless explicitly disabled
      return;
    }
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      } catch (_) {}
    }
    this.isBackgroundAudioActive = false;
    this.updateMediaSessionState('none');
    this.notify();
  }

  /**
   * Configure MediaSession API for OS lock screen controls & keeping audio active 24/7
   */
  private initMediaSession(): void {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        const MediaMetadataClass =
          (window as any).MediaMetadata || (navigator as any).mediaSession?.MediaMetadata;
        if (MediaMetadataClass) {
          (navigator as any).mediaSession.metadata = new MediaMetadataClass({
            title: 'Mahi Ai — 24 Hour Always-On ❤️ (Hindi)',
            artist: 'Mahi AI Companion (24×7 Active)',
            album: 'Mahi Live Voice Session',
            artwork: [
              { src: '/anime/mahi_wink.jpg', sizes: '512x512', type: 'image/jpeg' },
              { src: '/anime/mahi_talking.jpg', sizes: '512x512', type: 'image/jpeg' },
            ],
          });
        }

        (navigator as any).mediaSession.setActionHandler('play', () => {
          this.startBackgroundAudioKeeper();
        });
        (navigator as any).mediaSession.setActionHandler('pause', () => {
          if (this.is24HourAlwaysOn) {
            this.startBackgroundAudioKeeper();
          }
        });
      } catch (_) {}
    }
  }

  private updateMediaSessionState(state: 'playing' | 'paused' | 'none'): void {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        (navigator as any).mediaSession.playbackState = state;
      } catch (_) {}
    }
  }

  /**
   * Handle Visibility Changes (e.g. Phone screen locked / turned off, or unlocked)
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        if ((this.is24HourAlwaysOn || this.isWakeLockRequested) && !this.wakeLockSentinel) {
          await this.requestWakeLock();
        }
      } else {
        if (
          (this.is24HourAlwaysOn || this.isBackgroundAudioActive) &&
          this.silentAudio &&
          this.silentAudio.paused
        ) {
          this.silentAudio.play().catch(() => {});
        }
      }
    });
  }

  private notify(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.isAwakeActive(), this.isBackgroundAudioActive);
    }
  }

  public destroy(): void {
    this.is24HourAlwaysOn = false;
    this.stop24HourServerKeepAlive();
    this.releaseWakeLock();
    this.stopBackgroundAudioKeeper();
  }
}

export const backgroundLock = new BackgroundLockService();
