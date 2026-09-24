/**
 * BackgroundLockService
 * 1. Screen Wake Lock: Keeps the device screen ON (prevents phone from locking/sleeping)
 * 2. Background Call Keeper: Keeps audio & mic pipeline alive when user locks screen or turns screen OFF
 */

export class BackgroundLockService {
  private wakeLockSentinel: any = null;
  private isWakeLockRequested: boolean = true;
  private silentAudio: HTMLAudioElement | null = null;
  private isBackgroundAudioActive: boolean = false;
  private onStatusChange?: (isScreenAwake: boolean, isBackgroundReady: boolean) => void;

  constructor(onStatusChange?: (isScreenAwake: boolean, isBackgroundReady: boolean) => void) {
    this.onStatusChange = onStatusChange;
    this.initMediaSession();
    this.setupVisibilityListener();
  }

  /**
   * Request Screen Wake Lock to prevent screen from turning off or locking
   */
  public async requestWakeLock(): Promise<boolean> {
    this.isWakeLockRequested = true;
    if ('wakeLock' in navigator) {
      try {
        if (this.wakeLockSentinel) {
          try {
            await this.wakeLockSentinel.release();
          } catch (_) {}
          this.wakeLockSentinel = null;
        }

        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        console.log('[BackgroundLock] Screen Wake Lock acquired: Screen will not turn off');

        this.wakeLockSentinel.addEventListener('release', () => {
          console.log('[BackgroundLock] Screen Wake Lock was released');
          this.wakeLockSentinel = null;
          this.notify();
        });

        this.notify();
        return true;
      } catch (err: any) {
        console.warn('[BackgroundLock] Screen Wake Lock request failed:', err?.message);
        this.notify();
        return false;
      }
    } else {
      console.log('[BackgroundLock] Screen Wake Lock API not supported in this browser');
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
   * Uses an audio loop + MediaSession to keep the mobile browser process alive
   * even when the user manually presses the power button or locks their screen.
   */
  public startBackgroundAudioKeeper(): void {
    if (this.isBackgroundAudioActive) return;

    try {
      if (!this.silentAudio) {
        // Create an audio element with an ultra-short silent audio base64 wav
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
          console.log('[BackgroundLock] Background audio keeper active for screen-off calls');
          this.notify();
        })
        .catch((e) => {
          console.warn('[BackgroundLock] Could not auto-play silent audio keeper:', e);
        });
    } catch (e) {
      console.warn('[BackgroundLock] Background audio keeper setup error:', e);
    }
  }

  public stopBackgroundAudioKeeper(): void {
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
   * Configure MediaSession API for OS lock screen controls & keeping audio active
   */
  private initMediaSession(): void {
    if ('mediaSession' in navigator) {
      try {
        const MediaMetadataClass = (window as any).MediaMetadata || (navigator as any).mediaSession?.MediaMetadata;
        if (MediaMetadataClass) {
          (navigator as any).mediaSession.metadata = new MediaMetadataClass({
            title: 'Mahi - Voice Call ❤️ (Hindi)',
            artist: 'Mahi AI Girlfriend',
            album: 'Mahi Live Voice Session',
            artwork: [
              { src: '/anime/mahi_wink.jpg', sizes: '512x512', type: 'image/jpeg' },
              { src: '/anime/mahi_talking.jpg', sizes: '512x512', type: 'image/jpeg' },
            ],
          });
        }

        // Keep session active on play/pause from lock screen
        (navigator as any).mediaSession.setActionHandler('play', () => {
          this.startBackgroundAudioKeeper();
        });
        (navigator as any).mediaSession.setActionHandler('pause', () => {
          console.log('[BackgroundLock] Lock screen pause action');
        });
      } catch (e) {
        console.warn('[BackgroundLock] MediaSession setup notice:', e);
      }
    }
  }

  private updateMediaSessionState(state: 'playing' | 'paused' | 'none'): void {
    if ('mediaSession' in navigator) {
      try {
        (navigator as any).mediaSession.playbackState = state;
      } catch (_) {}
    }
  }

  /**
   * Handle Visibility Changes (e.g. Phone screen locked / turned off, or unlocked)
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('[BackgroundLock] Screen unlocked / tab visible again');
        // Re-acquire wake lock if user still wants screen awake
        if (this.isWakeLockRequested && !this.wakeLockSentinel) {
          await this.requestWakeLock();
        }
      } else {
        console.log('[BackgroundLock] Screen locked or tab hidden: maintaining background connection');
        // Make sure background audio keeper stays active
        if (this.isBackgroundAudioActive && this.silentAudio && this.silentAudio.paused) {
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
    this.releaseWakeLock();
    this.stopBackgroundAudioKeeper();
  }
}

export const backgroundLock = new BackgroundLockService();
