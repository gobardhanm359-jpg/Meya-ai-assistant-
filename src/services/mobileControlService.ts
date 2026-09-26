/**
 * Mobile Control Service
 * Provides hardware & OS-level mobile controls for Android / iOS / Mobile Web:
 * - Flashlight / Torch (Rear Camera LED + Screen Torch fallback)
 * - Haptic Vibration Patterns (Heartbeat, Kiss, SOS, Pulse)
 * - Live Battery Level & Charging Status
 * - Phone Call Dialer (tel:), SMS (sms:), WhatsApp Direct (wa.me)
 * - App Deep Links & Android Intent Launchers (YouTube, Instagram, Maps, Spotify, Settings)
 * - Fullscreen Mode & Native Share Sheet
 */

export interface BatteryStatusInfo {
  level: number; // 0 to 100
  charging: boolean;
  supported: boolean;
}

export interface MobileDeviceInfo {
  deviceModel: string;
  osName: string;
  connectionType: string;
  isOnline: boolean;
  isFullscreen: boolean;
  screenSize: string;
}

export type VibrationStyle = 'heartbeat' | 'kiss' | 'pulse' | 'sos' | 'alert';

class MobileControlService {
  private torchStream: MediaStream | null = null;
  private torchTrack: MediaStreamTrack | null = null;
  private isTorchOn: boolean = false;
  private isScreenTorchFallback: boolean = false;
  private torchListeners: Set<(active: boolean, screenFallback: boolean) => void> = new Set();

  public onTorchChange(listener: (active: boolean, screenFallback: boolean) => void): () => void {
    this.torchListeners.add(listener);
    return () => {
      this.torchListeners.delete(listener);
    };
  }

  private notifyTorchListeners() {
    for (const cb of this.torchListeners) {
      cb(this.isTorchOn, this.isScreenTorchFallback);
    }
  }

  public getTorchState(): { active: boolean; screenFallback: boolean } {
    return {
      active: this.isTorchOn,
      screenFallback: this.isScreenTorchFallback,
    };
  }

  /**
   * Toggle phone rear LED flashlight (or fallback to bright screen torch if hardware LED unavailable)
   */
  public async toggleFlashlight(forceState?: boolean): Promise<{
    active: boolean;
    mode: 'hardware_led' | 'screen_torch' | 'off';
    message: string;
  }> {
    const targetState = forceState !== undefined ? forceState : !this.isTorchOn;

    if (!targetState) {
      this.stopTorch();
      return {
        active: false,
        mode: 'off',
        message: 'Flashlight turned OFF',
      };
    }

    // Try hardware rear camera LED torch first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
        });
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as Record<string, any>;
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: true } as any],
            });
            this.torchStream = stream;
            this.torchTrack = track;
            this.isTorchOn = true;
            this.isScreenTorchFallback = false;
            this.notifyTorchListeners();
            return {
              active: true,
              mode: 'hardware_led',
              message: 'Phone Rear LED Flashlight ON 🔦',
            };
          } else {
            // Stop camera track if hardware torch is not supported on this lens
            track.stop();
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      }
    } catch (err) {
      console.warn('[MobileControl] Hardware LED torch unavailable, using Screen Torch:', err);
    }

    // Fallback: Ultra-bright Screen Torch mode
    this.isTorchOn = true;
    this.isScreenTorchFallback = true;
    this.notifyTorchListeners();
    return {
      active: true,
      mode: 'screen_torch',
      message: 'Screen Flashlight Torch ON 💡',
    };
  }

  public stopTorch(): void {
    if (this.torchTrack) {
      try {
        this.torchTrack.applyConstraints({
          advanced: [{ torch: false } as any],
        }).catch(() => {});
        this.torchTrack.stop();
      } catch (_) {}
      this.torchTrack = null;
    }
    if (this.torchStream) {
      try {
        this.torchStream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      this.torchStream = null;
    }
    this.isTorchOn = false;
    this.isScreenTorchFallback = false;
    this.notifyTorchListeners();
  }

  /**
   * Trigger mobile haptic vibration pattern
   */
  public triggerVibration(style: VibrationStyle = 'heartbeat'): {
    supported: boolean;
    style: VibrationStyle;
    message: string;
  } {
    const patterns: Record<VibrationStyle, number[]> = {
      heartbeat: [120, 90, 140, 420, 120, 90, 140],
      kiss: [60, 50, 60, 50, 260],
      pulse: [200],
      sos: [100, 60, 100, 60, 100, 200, 300, 60, 300, 60, 300, 200, 100, 60, 100, 60, 100],
      alert: [300, 120, 300, 120, 300],
    };

    const pattern = patterns[style] || patterns.heartbeat;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        return {
          supported: true,
          style,
          message: `Phone vibrated (${style} rhythm) 💓`,
        };
      } catch (_) {}
    }

    return {
      supported: false,
      style,
      message: `Haptic pulse simulated (${style}) 💓`,
    };
  }

  /**
   * Read live battery status
   */
  public async getBatteryStatus(): Promise<BatteryStatusInfo> {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const bat = await (navigator as any).getBattery();
        return {
          level: Math.round((bat.level ?? 1) * 100),
          charging: Boolean(bat.charging),
          supported: true,
        };
      }
    } catch (_) {}

    return {
      level: 100,
      charging: false,
      supported: false,
    };
  }

  /**
   * Detect user's mobile device model & system telemetry
   */
  public getDeviceInfo(): MobileDeviceInfo {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let deviceModel = 'Smartphone';
    let osName = 'Mobile OS';

    if (/vivo/i.test(ua)) {
      const match = ua.match(/vivo\s+([a-zA-Z0-9_-]+)/i) || ua.match(/(V\d{4}[A-Za-z]*)/);
      deviceModel = match ? `Vivo ${match[1]}` : 'Vivo Smartphone';
    } else if (/SM-[A-Z0-9]+/i.test(ua)) {
      const match = ua.match(/(SM-[A-Z0-9]+)/i);
      deviceModel = match ? `Samsung ${match[1]}` : 'Samsung Galaxy';
    } else if (/Redmi|Mi\s|POCO/i.test(ua)) {
      deviceModel = 'Xiaomi / Redmi';
    } else if (/RMX|Realme/i.test(ua)) {
      deviceModel = 'Realme Smartphone';
    } else if (/ONEPLUS|CPH/i.test(ua)) {
      deviceModel = 'OnePlus / Oppo';
    } else if (/Pixel/i.test(ua)) {
      deviceModel = 'Google Pixel';
    } else if (/iPhone/i.test(ua)) {
      deviceModel = 'Apple iPhone';
    } else if (/iPad/i.test(ua)) {
      deviceModel = 'Apple iPad';
    } else if (/Android/i.test(ua)) {
      const buildMatch = ua.match(/;\s*([^;)]+)\s+Build\//i);
      if (buildMatch && buildMatch[1]) {
        deviceModel = buildMatch[1].trim();
      } else {
        deviceModel = 'Android Phone';
      }
    } else {
      deviceModel = 'Desktop / Web Device';
    }

    if (/Android\s+([0-9.]+)/i.test(ua)) {
      const ver = ua.match(/Android\s+([0-9.]+)/i);
      osName = `Android ${ver ? ver[1] : ''}`.trim();
    } else if (/iPhone OS\s+([0-9_]+)/i.test(ua)) {
      const ver = ua.match(/iPhone OS\s+([0-9_]+)/i);
      osName = `iOS ${ver ? ver[1].replace(/_/g, '.') : ''}`.trim();
    } else if (/Mac/i.test(ua)) {
      osName = 'macOS';
    } else if (/Win/i.test(ua)) {
      osName = 'Windows';
    } else if (/Linux/i.test(ua)) {
      osName = 'Linux';
    }

    const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    const connectionType = conn?.effectiveType ? String(conn.effectiveType).toUpperCase() : 'WIFI / 5G';

    return {
      deviceModel,
      osName,
      connectionType,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isFullscreen: typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,
      screenSize: typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : '1080×2400',
    };
  }

  /**
   * Launch URI safely via anchor element
   */
  public launchUri(uri: string, external: boolean = false): void {
    try {
      const a = document.createElement('a');
      a.href = uri;
      if (external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('[MobileControl] Failed to launch URI:', uri, e);
    }
  }

  /**
   * Open phone call dialer with optional phone number
   */
  public makePhoneCall(phoneNumber: string = ''): string {
    const cleaned = phoneNumber.replace(/[^\d+*#]/g, '');
    this.launchUri(`tel:${cleaned}`);
    return cleaned ? `Calling ${cleaned} 📞` : 'Opened Phone Dialer 📞';
  }

  /**
   * Send WhatsApp message
   */
  public sendWhatsApp(phoneNumber: string = '', message: string = ''): string {
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    const encodedMsg = encodeURIComponent(message || 'Hey! 💕');
    const url = cleaned
      ? `https://wa.me/${cleaned}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    this.launchUri(url, true);
    return cleaned ? `Opening WhatsApp chat with ${cleaned} 💬` : 'Opening WhatsApp 💬';
  }

  /**
   * Send SMS message
   */
  public sendSms(phoneNumber: string = '', message: string = ''): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const encodedMsg = encodeURIComponent(message || '');
    const uri = message ? `sms:${cleaned}?body=${encodedMsg}` : `sms:${cleaned}`;
    this.launchUri(uri);
    return cleaned ? `Opening SMS to ${cleaned} ✉️` : 'Opened SMS App ✉️';
  }

  /**
   * Launch popular mobile apps or searches
   */
  public openMobileApp(appName: string, query: string = ''): { title: string; url: string } {
    const lower = appName.toLowerCase().trim();
    const encodedQuery = encodeURIComponent(query.trim());

    if (lower.includes('youtube') || lower.includes('yt')) {
      const url = query
        ? `https://m.youtube.com/results?search_query=${encodedQuery}`
        : 'https://m.youtube.com';
      this.launchUri(url, true);
      return { title: query ? `YouTube: ${query}` : 'YouTube', url };
    }

    if (lower.includes('whatsapp') || lower.includes('wa')) {
      const url = query
        ? `https://api.whatsapp.com/send?text=${encodedQuery}`
        : 'https://wa.me/';
      this.launchUri(url, true);
      return { title: 'WhatsApp', url };
    }

    if (lower.includes('instagram') || lower.includes('insta')) {
      const url = query
        ? `https://www.instagram.com/${encodedQuery}/`
        : 'https://www.instagram.com/';
      this.launchUri(url, true);
      return { title: 'Instagram', url };
    }

    if (lower.includes('spotify') || lower.includes('song') || lower.includes('music')) {
      const url = query
        ? `https://open.spotify.com/search/${encodedQuery}`
        : 'https://open.spotify.com/';
      this.launchUri(url, true);
      return { title: query ? `Spotify: ${query}` : 'Spotify', url };
    }

    if (lower.includes('map') || lower.includes('navigation') || lower.includes('location')) {
      const url = query
        ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`
        : 'https://www.google.com/maps';
      this.launchUri(url, true);
      return { title: query ? `Maps: ${query}` : 'Google Maps', url };
    }

    if (lower.includes('dial') || lower.includes('call') || lower.includes('phone')) {
      this.makePhoneCall(query);
      return { title: 'Phone Dialer', url: `tel:${query}` };
    }

    if (lower.includes('sms') || lower.includes('message')) {
      this.sendSms('', query);
      return { title: 'Messages / SMS', url: 'sms:' };
    }

    if (lower.includes('mail') || lower.includes('gmail')) {
      const url = `mailto:?subject=${encodedQuery}`;
      this.launchUri(url);
      return { title: 'Email / Gmail', url };
    }

    if (lower.includes('facebook') || lower.includes('fb')) {
      const url = 'https://m.facebook.com';
      this.launchUri(url, true);
      return { title: 'Facebook', url };
    }

    if (lower.includes('chrome') || lower.includes('google') || lower.includes('search')) {
      const url = query
        ? `https://www.google.com/search?q=${encodedQuery}`
        : 'https://www.google.com';
      this.launchUri(url, true);
      return { title: query ? `Google: ${query}` : 'Google Search', url };
    }

    // Default fallback: Google search for the requested app/query
    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(appName + ' ' + query)}`;
    this.launchUri(fallbackUrl, true);
    return { title: appName, url: fallbackUrl };
  }

  /**
   * Toggle fullscreen immersive mode
   */
  public async toggleFullscreen(): Promise<boolean> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return true;
      } else {
        await document.exitFullscreen();
        return false;
      }
    } catch (_) {
      return false;
    }
  }

  /**
   * Trigger native mobile share dialog
   */
  public async shareApp(): Promise<string> {
    const shareData = {
      title: 'Mahi AI Assistant',
      text: 'Talk to Mahi AI - Voice-to-Voice Hindi AI Companion & Mobile Controller 💕',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return 'Shared via Mobile Share Sheet ✨';
      }
    } catch (_) {}

    try {
      await navigator.clipboard.writeText(window.location.origin);
      return 'App link copied to clipboard 📋';
    } catch (_) {
      return 'Ready to share';
    }
  }
}

export const mobileControl = new MobileControlService();
