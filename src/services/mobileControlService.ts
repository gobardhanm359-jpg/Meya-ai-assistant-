/**
 * Mobile Control Service
 * Provides hardware & OS-level mobile controls for Android / iOS / Mobile Web:
 * - Flashlight / Torch (Rear Camera LED + Screen Torch fallback)
 * - Haptic Vibration Patterns (Heartbeat, Kiss, SOS, Pulse, Alert, Long)
 * - Live Battery Level & Charging Status
 * - Screen Brightness & Night Dimmer Control
 * - Live Countdown Timer & Alarm with Haptic + Audio Alert
 * - Phone Call Dialer (tel:), SMS (sms:), WhatsApp Direct (wa.me)
 * - 25+ App Deep Links & Android Intent Launchers (YouTube, Instagram, Maps, Spotify, PhonePe, GPay, Paytm, Snapchat, Telegram, Flipkart, Amazon, Zomato, etc.)
 * - Natural Hindi/Hinglish/English Command Parser ("Jo Bolo Wohi Kare" Instant Execution)
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

export interface ActiveTimerInfo {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
}

export type VibrationStyle = 'heartbeat' | 'kiss' | 'pulse' | 'sos' | 'alert' | 'long';

class MobileControlService {
  private torchStream: MediaStream | null = null;
  private torchTrack: MediaStreamTrack | null = null;
  private isTorchOn: boolean = false;
  private isScreenTorchFallback: boolean = false;
  private torchListeners: Set<(active: boolean, screenFallback: boolean) => void> = new Set();

  // Screen brightness (20% to 100%)
  private screenBrightness: number = 100;
  private brightnessListeners: Set<(level: number) => void> = new Set();

  // Active timers
  private timers: ActiveTimerInfo[] = [];
  private timerInterval: any = null;
  private timerListeners: Set<(timers: ActiveTimerInfo[], finishedTimer?: ActiveTimerInfo) => void> = new Set();

  // Command execution log for Mobile Control Center
  private commandHistory: Array<{ id: string; command: string; result: string; timestamp: number }> = [];
  private historyListeners: Set<() => void> = new Set();

  public onTorchChange(listener: (active: boolean, screenFallback: boolean) => void): () => void {
    this.torchListeners.add(listener);
    return () => {
      this.torchListeners.delete(listener);
    };
  }

  public onBrightnessChange(listener: (level: number) => void): () => void {
    this.brightnessListeners.add(listener);
    return () => {
      this.brightnessListeners.delete(listener);
    };
  }

  public onTimerChange(
    listener: (timers: ActiveTimerInfo[], finishedTimer?: ActiveTimerInfo) => void
  ): () => void {
    this.timerListeners.add(listener);
    return () => {
      this.timerListeners.delete(listener);
    };
  }

  public onHistoryChange(listener: () => void): () => void {
    this.historyListeners.add(listener);
    return () => {
      this.historyListeners.delete(listener);
    };
  }

  public recordCommandExecution(command: string, result: string): void {
    this.commandHistory = [
      {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        command,
        result,
        timestamp: Date.now(),
      },
      ...this.commandHistory.slice(0, 19),
    ];
    for (const cb of this.historyListeners) {
      cb();
    }
  }

  public getCommandHistory() {
    return [...this.commandHistory];
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

  public getBrightness(): number {
    return this.screenBrightness;
  }

  public setBrightness(level: number): string {
    const clamped = Math.max(20, Math.min(100, Math.round(level)));
    this.screenBrightness = clamped;
    for (const cb of this.brightnessListeners) {
      cb(clamped);
    }
    const msg = `Screen Brightness set to ${clamped}% ☀️`;
    this.recordCommandExecution(`Set Brightness ${clamped}%`, msg);
    return msg;
  }

  /**
   * Start a countdown timer or alarm on the phone
   */
  public startTimer(seconds: number, label: string = 'Mahi Timer'): string {
    const validSec = Math.max(3, Math.min(86400, Math.round(seconds)));
    const newTimer: ActiveTimerInfo = {
      id: `tmr-${Date.now()}`,
      label: label || 'Mahi Alarm',
      totalSeconds: validSec,
      remainingSeconds: validSec,
      running: true,
    };
    this.timers = [newTimer, ...this.timers.slice(0, 4)];
    this.ensureTimerLoop();
    this.notifyTimers();
    const formatted =
      validSec >= 60
        ? `${Math.floor(validSec / 60)}m ${validSec % 60 ? (validSec % 60) + 's' : ''}`.trim()
        : `${validSec}s`;
    const msg = `Timer set for ${formatted} (${newTimer.label}) ⏰`;
    this.recordCommandExecution(`Timer: ${label}`, msg);
    return msg;
  }

  public cancelTimer(id: string): void {
    this.timers = this.timers.filter((t) => t.id !== id);
    this.notifyTimers();
  }

  public getTimers(): ActiveTimerInfo[] {
    return [...this.timers];
  }

  private ensureTimerLoop(): void {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      if (this.timers.length === 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        return;
      }

      let finished: ActiveTimerInfo | undefined;
      this.timers = this.timers
        .map((t) => {
          if (!t.running) return t;
          const next = t.remainingSeconds - 1;
          if (next <= 0) {
            finished = { ...t, remainingSeconds: 0, running: false };
            return null;
          }
          return { ...t, remainingSeconds: next };
        })
        .filter(Boolean) as ActiveTimerInfo[];

      if (finished) {
        this.triggerVibration('alert');
        this.playAlarmChime();
      }
      this.notifyTimers(finished);
    }, 1000);
  }

  private notifyTimers(finishedTimer?: ActiveTimerInfo): void {
    for (const cb of this.timerListeners) {
      cb([...this.timers], finishedTimer);
    }
  }

  private playAlarmChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.36);
      });
    } catch (_) {}
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
      const msg = 'Flashlight turned OFF 🔦';
      this.recordCommandExecution('Flashlight OFF', msg);
      return {
        active: false,
        mode: 'off',
        message: msg,
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
            const msg = 'Phone Rear LED Flashlight ON 🔦';
            this.recordCommandExecution('Flashlight ON', msg);
            return {
              active: true,
              mode: 'hardware_led',
              message: msg,
            };
          } else {
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
    const msg = 'Screen Flashlight Torch ON 💡';
    this.recordCommandExecution('Flashlight ON', msg);
    return {
      active: true,
      mode: 'screen_torch',
      message: msg,
    };
  }

  public stopTorch(): void {
    if (this.torchTrack) {
      try {
        this.torchTrack
          .applyConstraints({
            advanced: [{ torch: false } as any],
          })
          .catch(() => {});
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
      long: [600, 100, 600],
    };

    const pattern = patterns[style] || patterns.heartbeat;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        const msg = `Phone vibrated (${style} rhythm) 💓`;
        this.recordCommandExecution(`Vibrate (${style})`, msg);
        return {
          supported: true,
          style,
          message: msg,
        };
      } catch (_) {}
    }

    const msg = `Haptic pulse triggered (${style}) 💓`;
    this.recordCommandExecution(`Vibrate (${style})`, msg);
    return {
      supported: false,
      style,
      message: msg,
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

    const conn =
      (navigator as any)?.connection ||
      (navigator as any)?.mozConnection ||
      (navigator as any)?.webkitConnection;
    const connectionType = conn?.effectiveType
      ? String(conn.effectiveType).toUpperCase()
      : 'WIFI / 5G';

    return {
      deviceModel,
      osName,
      connectionType,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isFullscreen: typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,
      screenSize:
        typeof window !== 'undefined'
          ? `${window.screen.width}×${window.screen.height}`
          : '1080×2400',
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
    const msg = cleaned ? `Calling ${cleaned} 📞` : 'Opened Phone Dialer 📞';
    this.recordCommandExecution(`Call ${cleaned || 'Dialer'}`, msg);
    return msg;
  }

  /**
   * Send WhatsApp message with auto-mention formatting
   */
  public sendWhatsApp(phoneNumber: string = '', message: string = '', mentionTag: string = ''): string {
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    const fullMsg = mentionTag ? `${mentionTag.startsWith('@') ? mentionTag : '@' + mentionTag} ${message}` : message;
    const encodedMsg = encodeURIComponent(fullMsg || 'Hey! 💕 (Sent via Riya AI)');
    const url = cleaned
      ? `https://wa.me/${cleaned}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    this.launchUri(url, true);
    const msg = cleaned
      ? `Opening WhatsApp chat with ${cleaned} [Mention: ${mentionTag || 'Direct'}] 💬`
      : `Opening WhatsApp [Mention: ${mentionTag || 'Direct'}] 💬`;
    this.recordCommandExecution(`WhatsApp ${mentionTag || cleaned || ''}`.trim(), msg);
    return msg;
  }

  /**
   * Open Instagram Direct Message / Profile with auto-mention
   */
  public openInstagram(username: string = '', message: string = ''): string {
    const cleanUser = username.replace(/^@/, '').trim();
    const encodedMsg = encodeURIComponent(message || '');
    let url = 'https://www.instagram.com/direct/inbox/';
    if (cleanUser) {
      // Direct deep link to user inbox / profile
      url = message
        ? `https://ig.me/m/${cleanUser}?text=${encodedMsg}`
        : `https://www.instagram.com/${cleanUser}/`;
    }
    this.launchUri(url, true);
    const msg = cleanUser
      ? `Opening Instagram DM with @${cleanUser} 📸`
      : 'Opening Instagram Direct 📸';
    this.recordCommandExecution(`Instagram @${cleanUser || 'Direct'}`, msg);
    return msg;
  }

  /**
   * Open Facebook Messenger with auto-mention / recipient
   */
  public openMessenger(recipientId: string = '', message: string = ''): string {
    const cleanRecipient = recipientId.replace(/^@/, '').trim();
    const encodedMsg = encodeURIComponent(message || '');
    const url = cleanRecipient
      ? `https://m.me/${cleanRecipient}${message ? `?text=${encodedMsg}` : ''}`
      : 'https://www.messenger.com/';
    this.launchUri(url, true);
    const msg = cleanRecipient
      ? `Opening Messenger chat with @${cleanRecipient} ⚡`
      : 'Opening Facebook Messenger ⚡';
    this.recordCommandExecution(`Messenger @${cleanRecipient || 'Inbox'}`, msg);
    return msg;
  }

  /**
   * Send SMS message with auto-mention formatting
   */
  public sendSms(phoneNumber: string = '', message: string = '', mentionTag: string = ''): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const fullMsg = mentionTag ? `${mentionTag.startsWith('@') ? mentionTag : '@' + mentionTag} ${message}` : message;
    const encodedMsg = encodeURIComponent(fullMsg || '');
    const uri = fullMsg ? `sms:${cleaned}?body=${encodedMsg}` : `sms:${cleaned}`;
    this.launchUri(uri);
    const msg = cleaned
      ? `Opening SMS to ${cleaned} [Mention: ${mentionTag || 'Direct'}] ✉️`
      : `Opened SMS App [Mention: ${mentionTag || 'Direct'}] ✉️`;
    this.recordCommandExecution(`SMS ${mentionTag || cleaned || ''}`.trim(), msg);
    return msg;
  }

  /**
   * Unified Auto-Mention Social Dispatcher
   */
  public autoMentionSocial(
    platform: 'whatsapp' | 'instagram' | 'messenger' | 'sms',
    target: string,
    message: string,
    mentionTag: string = ''
  ): string {
    if (platform === 'whatsapp') {
      return this.sendWhatsApp(target, message, mentionTag);
    } else if (platform === 'instagram') {
      return this.openInstagram(target, mentionTag ? `${mentionTag} ${message}` : message);
    } else if (platform === 'messenger') {
      return this.openMessenger(target, mentionTag ? `${mentionTag} ${message}` : message);
    } else {
      return this.sendSms(target, message, mentionTag);
    }
  }

  /**
   * Copy text to mobile clipboard
   */
  public async copyToClipboard(text: string): Promise<string> {
    try {
      await navigator.clipboard.writeText(text);
      const msg = `Copied to Phone Clipboard 📋: "${text.slice(0, 30)}"`;
      this.recordCommandExecution('Copy Clipboard', msg);
      return msg;
    } catch (_) {
      return 'Clipboard ready 📋';
    }
  }

  /**
   * Launch popular mobile apps or searches (25+ Indian & Global Apps supported)
   */
  public openMobileApp(appName: string, query: string = ''): { title: string; url: string } {
    const lower = appName.toLowerCase().trim();
    const encodedQuery = encodeURIComponent(query.trim());

    let result: { title: string; url: string };

    if (lower.includes('youtube') || lower.includes('yt') || lower.includes('video')) {
      const url = query
        ? `https://m.youtube.com/results?search_query=${encodedQuery}`
        : 'https://m.youtube.com';
      this.launchUri(url, true);
      result = { title: query ? `YouTube: ${query}` : 'YouTube', url };
    } else if (lower.includes('whatsapp') || lower.includes('wa')) {
      const url = query
        ? `https://api.whatsapp.com/send?text=${encodedQuery}`
        : 'https://wa.me/';
      this.launchUri(url, true);
      result = { title: 'WhatsApp', url };
    } else if (lower.includes('instagram') || lower.includes('insta') || lower.includes('reel')) {
      const url = query
        ? `https://www.instagram.com/${encodedQuery}/`
        : 'https://www.instagram.com/';
      this.launchUri(url, true);
      result = { title: 'Instagram', url };
    } else if (
      lower.includes('spotify') ||
      lower.includes('song') ||
      lower.includes('music') ||
      lower.includes('gaana') ||
      lower.includes('jiosaavn')
    ) {
      const url = query
        ? `https://open.spotify.com/search/${encodedQuery}`
        : 'https://open.spotify.com/';
      this.launchUri(url, true);
      result = { title: query ? `Spotify: ${query}` : 'Spotify Music', url };
    } else if (lower.includes('map') || lower.includes('navigation') || lower.includes('location') || lower.includes('rasta')) {
      const url = query
        ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`
        : 'https://www.google.com/maps';
      this.launchUri(url, true);
      result = { title: query ? `Maps: ${query}` : 'Google Maps', url };
    } else if (lower.includes('snapchat') || lower.includes('snap')) {
      const url = 'https://www.snapchat.com/';
      this.launchUri(url, true);
      result = { title: 'Snapchat', url };
    } else if (lower.includes('telegram') || lower.includes('tg')) {
      const url = 'https://t.me/';
      this.launchUri(url, true);
      result = { title: 'Telegram', url };
    } else if (lower.includes('facebook') || lower.includes('fb')) {
      const url = 'https://m.facebook.com';
      this.launchUri(url, true);
      result = { title: 'Facebook', url };
    } else if (lower.includes('twitter') || lower === 'x') {
      const url = 'https://x.com';
      this.launchUri(url, true);
      result = { title: 'X (Twitter)', url };
    } else if (lower.includes('phonepe')) {
      const url = 'https://www.phonepe.com/';
      this.launchUri(url, true);
      result = { title: 'PhonePe', url };
    } else if (lower.includes('gpay') || lower.includes('google pay') || lower.includes('tez')) {
      const url = 'https://pay.google.com/';
      this.launchUri(url, true);
      result = { title: 'Google Pay (GPay)', url };
    } else if (lower.includes('paytm')) {
      const url = 'https://paytm.com/';
      this.launchUri(url, true);
      result = { title: 'Paytm', url };
    } else if (lower.includes('flipkart')) {
      const url = query
        ? `https://www.flipkart.com/search?q=${encodedQuery}`
        : 'https://www.flipkart.com/';
      this.launchUri(url, true);
      result = { title: 'Flipkart', url };
    } else if (lower.includes('amazon')) {
      const url = query
        ? `https://www.amazon.in/s?k=${encodedQuery}`
        : 'https://www.amazon.in/';
      this.launchUri(url, true);
      result = { title: 'Amazon', url };
    } else if (lower.includes('zomato')) {
      const url = 'https://www.zomato.com/';
      this.launchUri(url, true);
      result = { title: 'Zomato', url };
    } else if (lower.includes('swiggy')) {
      const url = 'https://www.swiggy.com/';
      this.launchUri(url, true);
      result = { title: 'Swiggy', url };
    } else if (lower.includes('dial') || lower.includes('call') || lower.includes('phone')) {
      this.makePhoneCall(query);
      result = { title: 'Phone Dialer', url: `tel:${query}` };
    } else if (lower.includes('sms') || lower.includes('message')) {
      this.sendSms('', query);
      result = { title: 'Messages / SMS', url: 'sms:' };
    } else if (lower.includes('mail') || lower.includes('gmail')) {
      const url = `mailto:?subject=${encodedQuery}`;
      this.launchUri(url);
      result = { title: 'Email / Gmail', url };
    } else if (lower.includes('calculator') || lower.includes('calc') || lower.includes('hisab')) {
      const url = 'https://www.google.com/search?q=calculator';
      this.launchUri(url, true);
      result = { title: 'Calculator', url };
    } else if (lower.includes('calendar') || lower.includes('date')) {
      const url = 'https://calendar.google.com/';
      this.launchUri(url, true);
      result = { title: 'Calendar', url };
    } else if (lower.includes('weather') || lower.includes('mausam')) {
      const url = 'https://www.google.com/search?q=weather';
      this.launchUri(url, true);
      result = { title: 'Live Weather', url };
    } else if (lower.includes('chrome') || lower.includes('google') || lower.includes('search')) {
      const url = query
        ? `https://www.google.com/search?q=${encodedQuery}`
        : 'https://www.google.com';
      this.launchUri(url, true);
      result = { title: query ? `Google: ${query}` : 'Google Search', url };
    } else {
      // Default fallback: Google search for the requested app/query
      const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(
        (appName + ' ' + query).trim()
      )}`;
      this.launchUri(fallbackUrl, true);
      result = { title: appName, url: fallbackUrl };
    }

    this.recordCommandExecution(`Open ${result.title}`, `Opened ${result.title} 🚀`);
    return result;
  }

  /**
   * Toggle fullscreen immersive mode
   */
  public async toggleFullscreen(): Promise<boolean> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        this.recordCommandExecution('Fullscreen ON', 'Fullscreen Mode Enabled 📱');
        return true;
      } else {
        await document.exitFullscreen();
        this.recordCommandExecution('Fullscreen OFF', 'Exited Fullscreen Mode 📱');
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
