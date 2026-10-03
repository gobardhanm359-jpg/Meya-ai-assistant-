/**
 * LiveSession: High-level orchestrator connecting AudioStreamer, MicStreamer,
 * VoiceAuthService (Turn-bound Multi-Sample Verification & Fail-Closed Tool Gate),
 * ConversationMemoryService (Continuity, Persona VAD timing, Debounced Transcript Flush),
 * and the WebSocket bridge to Gemini Live.
 */

import { AudioStreamer } from './audioStreamer.ts';
import { MicStreamer } from './micStreamer.ts';
import { backgroundLock } from './backgroundLockService.ts';
import { mobileControl, VibrationStyle } from './mobileControlService.ts';
import { voiceAuth } from './voiceAuthService.ts';
import { conversationMemory, MahiPersonaMode } from './conversationMemoryService.ts';
import { serverConnection } from './serverConnectionService.ts';

export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export interface ToolEvent {
  id: string;
  name: string;
  siteName?: string;
  url?: string;
  actionDescription?: string;
  timestamp: number;
}

export interface LoveFeelingEvent {
  id: string;
  message: string;
  feelingType: string;
  intensity: number;
  timestamp: number;
}

export interface PhotoMemoryEvent {
  id: string;
  caption: string;
  moodTag?: string;
  timestamp: number;
}

export interface SweetReminderEvent {
  id: string;
  task: string;
  time?: string;
  timestamp: number;
}

export interface ShayariEvent {
  id: string;
  couplet: string;
  mood?: string;
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  sender: 'user' | 'mahi';
  text: string;
  timestamp: number;
}

export interface LiveSessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onToolAction: (action: ToolEvent) => void;
  onLoveFeeling: (feeling: LoveFeelingEvent) => void;
  onThemeChange: (theme: string) => void;
  onError: (error: string) => void;
  onSpeakingLevel: (level: number) => void;
  onMicLevel: (level: number) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
  onPhotoMemory?: (memory: PhotoMemoryEvent) => void;
  onSweetReminder?: (reminder: SweetReminderEvent) => void;
  onShayari?: (shayari: ShayariEvent) => void;
  onMusicVibe?: (vibe: string) => void;
  onHologramToggle?: (enabled: boolean, color: string) => void;
  onOpenMobileControl?: () => void;
  onOpenVoiceAuthModal?: () => void;
  onOpenVisionCamera?: () => void;
  onAvatarCommand?: (action?: string, style?: string) => void;
  onWakeLockCommand?: (enabled: boolean) => void;
  onVolumeCommand?: (action: string) => void;
  onFaceLockCommand?: (mode: 'lock' | 'scan') => void;
  onOpenCyberCodingLab?: (tab?: 'coding' | 'scanner' | 'crypto' | 'recon') => void;
  onOpenAccessibilityModal?: () => void;
  onAppHeadsCommand?: (enabled?: boolean) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private micStreamer: MicStreamer;
  private state: SessionState = 'disconnected';
  private callbacks: LiveSessionCallbacks;
  private isMahiSpeaking: boolean = false;
  private selectedVoice: string = 'Aoede';
  private pingTimer: any = null;
  private visualizerTimer: any = null;
  private lastActionKey: string = '';
  private lastActionAt: number = 0;

  // Reconnect & Continuity management
  private userInitiatedDisconnect: boolean = true;
  private alwaysOn24HourMode: boolean = true;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;

  // Debounced transcript buffer & immediate flush state
  private pendingTranscriptBuffer: string = '';
  private pendingTranscriptSender: 'user' | 'mahi' = 'mahi';
  private transcriptDebounceTimer: any = null;
  private hasFlushedForCurrentResponse: boolean = false;

  // VAD / Speech turn tracking
  private lastUserSpeechAt: number = 0;
  private isUserCurrentlyVoiced: boolean = false;
  private isIndiaHybridMode: boolean = false;
  private speechRecognition: any = null;
  private ttsAnimTimer: any = null;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;

    this.audioStreamer = new AudioStreamer((isSpeaking) => {
      const wasSpeaking = this.isMahiSpeaking;
      this.isMahiSpeaking = isSpeaking;

      // When Mahi finishes speaking and transitions back to listening, bind a fresh conversation turnId
      if (wasSpeaking && !isSpeaking) {
        this.flushTranscriptImmediately();
        voiceAuth.startNewTurn();
      }

      if (this.state !== 'disconnected' && this.state !== 'connecting') {
        const nextState = isSpeaking ? 'speaking' : 'listening';
        this.setState(nextState);
      }
    });

    this.micStreamer = new MicStreamer(
      (base64Pcm) => {
        this.sendAudioChunk(base64Pcm);
      },
      (micVol) => {
        this.callbacks.onMicLevel(micVol);

        // Adaptive VAD & Interruption threshold (fixes English Teacher premature cutoff)
        const personaProfile = conversationMemory.getPersonaProfile();
        const interruptThreshold = personaProfile.interruptionThreshold;

        if (micVol > 0.14) {
          if (!this.isUserCurrentlyVoiced) {
            this.isUserCurrentlyVoiced = true;
            // Bind new turn if silence exceeded persona VAD hold time
            if (Date.now() - this.lastUserSpeechAt > personaProfile.vadHoldMs * 2) {
              voiceAuth.startNewTurn();
            }
          }
          this.lastUserSpeechAt = Date.now();
        } else if (this.isUserCurrentlyVoiced && Date.now() - this.lastUserSpeechAt > personaProfile.vadHoldMs) {
          this.isUserCurrentlyVoiced = false;
        }

        // Interruption: if user speaks above persona threshold while Mahi is talking, cut Mahi off
        if (this.isMahiSpeaking && micVol > interruptThreshold) {
          console.log('[LiveSession] User interruption threshold met, stopping speech');
          this.audioStreamer.stop();
        }
      },
      (rawFrame16k) => {
        // Feed 16kHz Float32 frames into Turn-Bound Multi-Sample Voice Auth Engine
        voiceAuth.ingestLiveTurnAudioFrame(rawFrame16k);
      }
    );

    // Wi-Fi / Network & 24-Hour Always-On visibility recovery listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if ((!this.userInitiatedDisconnect || this.alwaysOn24HourMode) && this.state !== 'disconnected') {
          this.connect(true);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (
          document.visibilityState === 'visible' &&
          !this.userInitiatedDisconnect &&
          (!this.ws || this.ws.readyState !== WebSocket.OPEN)
        ) {
          this.connect(true);
        }
      });
    }
  }

  public set24HourMode(enabled: boolean): void {
    this.alwaysOn24HourMode = enabled;
    backgroundLock.set24HourAlwaysOn(enabled);
    if (enabled && this.state === 'disconnected') {
      this.connect(false);
    }
  }

  public get24HourMode(): boolean {
    return this.alwaysOn24HourMode;
  }

  public getState(): SessionState {
    return this.state;
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public getMicStreamer(): MicStreamer {
    return this.micStreamer;
  }

  /**
   * Switch voice without recreating a healthy session if the voice is already active
   */
  public setVoice(voice: string): void {
    if (this.selectedVoice === voice && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Avoid recreating healthy Live session
    }
    this.selectedVoice = voice;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const continuity = conversationMemory.buildSessionContinuityPayload(true);
      this.ws.send(
        JSON.stringify({
          type: 'switch_voice',
          voice,
          continuity,
        })
      );
    }
  }

  /**
   * Switch persona mode while preserving recent conversation turns and suppressing redundant self-intro
   */
  public switchPersonaMode(mode: MahiPersonaMode): void {
    conversationMemory.setPersonaMode(mode);
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      const continuity = conversationMemory.buildSessionContinuityPayload(true);
      this.ws.send(
        JSON.stringify({
          type: 'switch_persona',
          voice: this.selectedVoice,
          continuity,
        })
      );
    }
  }

  public getVoice(): string {
    return this.selectedVoice;
  }

  /**
   * Debounced streaming transcript accumulator + immediate flush
   */
  private queueStreamingTranscript(sender: 'user' | 'mahi', textChunk: string): void {
    if (!textChunk || !textChunk.trim()) return;

    if (this.pendingTranscriptBuffer && this.pendingTranscriptSender !== sender) {
      this.flushTranscriptImmediately();
    }

    this.pendingTranscriptSender = sender;
    this.pendingTranscriptBuffer = this.pendingTranscriptBuffer
      ? `${this.pendingTranscriptBuffer} ${textChunk.trim()}`
      : textChunk.trim();

    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
    }

    this.transcriptDebounceTimer = setTimeout(() => {
      this.flushTranscriptImmediately();
    }, 320);
  }

  public flushTranscriptImmediately(): void {
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
      this.transcriptDebounceTimer = null;
    }

    const text = this.pendingTranscriptBuffer.trim();
    if (!text) return;

    const sender = this.pendingTranscriptSender;
    this.pendingTranscriptBuffer = '';

    // Record into short-term conversation context (with deduplication)
    conversationMemory.recordTurn(sender, text);

    if (this.callbacks.onTranscript) {
      this.callbacks.onTranscript({
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        text,
        timestamp: Date.now(),
      });
    }

    // If this transcript came from the user's voice, also run our instant command matcher
    // so if the user told Mahi to control the phone, it executes 100% reliably!
    if (sender === 'user') {
      this.matchAndExecuteSpokenCommand(text);
    }
  }

  /**
   * Send a direct text/voice command ("Jo Bolo Wohi Kare") to Mahi & execute mobile action immediately
   */
  public sendUserCommand(commandText: string): void {
    const clean = commandText.trim();
    if (!clean) return;

    conversationMemory.recordTurn('user', clean);
    if (this.callbacks.onTranscript) {
      this.callbacks.onTranscript({
        id: `tr-usr-${Date.now()}`,
        sender: 'user',
        text: clean,
        timestamp: Date.now(),
      });
    }

    // Execute any matching mobile/avatar/music command immediately on the phone
    const matchedLocal = this.matchAndExecuteSpokenCommand(clean);

    // Also forward to Gemini Live session so Mahi replies in real-time voice
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      this.ws.send(
        JSON.stringify({
          type: 'user_command',
          text: clean,
        })
      );
    } else if (!matchedLocal) {
      // Dual-Channel HTTP Fast-Hukam Fallback: guarantees instant Hindi reply even when WebSocket is closed
      fetch('/api/fast-hukam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
        .then((r) => r.json())
        .then((data) => {
          const reply = String(data?.reply || '').trim();
          if (reply) {
            this.queueStreamingTranscript('mahi', reply);
            this.speakIndiaHindi(reply);
          }
        })
        .catch(() => {});
    }
  }

  /**
   * Instant Hindi / Hinglish / English Command Matcher ("Jo Bolu Mahi Wohi Kare")
   * Guarantees mobile & avatar actions execute even if the LLM responds only with audio
   */
  public matchAndExecuteSpokenCommand(rawText: string): boolean {
    const t = rawText.toLowerCase().trim();
    if (!t || t.length < 2) return false;

    const dedup = (key: string): boolean => {
      const now = Date.now();
      if (this.lastActionKey === key && now - this.lastActionAt < 3800) {
        return false;
      }
      this.lastActionKey = key;
      this.lastActionAt = now;
      return true;
    };

    // 1. Flashlight / Torch
    if (/\b(torch|flashlight|light|batti)\b/.test(t)) {
      if (/\b(off|band|bujha)\b/.test(t)) {
        if (dedup('flashlight_off')) this.executeAuthorizedMobileAction('flashlight_off', {});
        return true;
      }
      if (/\b(on|chalu|jala|kholo|open|start)\b/.test(t) || !/\b(off|band)\b/.test(t)) {
        if (dedup('flashlight_on')) this.executeAuthorizedMobileAction('flashlight_on', {});
        return true;
      }
    }

    // 2. Vibration
    if (/\b(vibrat|vibrate|dhadkan|heartbeat|haptic|kampan)\b/.test(t)) {
      const style = /\bkiss\b/.test(t)
        ? 'kiss'
        : /\bsos\b/.test(t)
        ? 'sos'
        : /\bpulse\b/.test(t)
        ? 'pulse'
        : 'heartbeat';
      if (dedup(`vibrate_${style}`)) {
        this.executeAuthorizedMobileAction('vibrate', { vibrationStyle: style });
      }
      return true;
    }

    // 3. Battery check
    if (/\b(battery|charging|charge kitn)\b/.test(t)) {
      if (dedup('check_battery')) this.executeAuthorizedMobileAction('check_battery', {});
      return true;
    }

    // 3b. Ethical Hacking & Coding Studio ("hacking", "coding", "code likho", "cyber lab", "owasp", "python")
    if (
      /\b(hacking|hack|hacker|ethical hacking|coding|codeing|code likho|program|python|javascript|html|cyber|owasp|security scan|hash|terminal)\b/.test(
        t
      )
    ) {
      const targetTab: 'coding' | 'scanner' | 'crypto' | 'recon' = /\b(owasp|vulnerability|audit|scanner)\b/.test(
        t
      )
        ? 'scanner'
        : /\b(hash|sha256|crypto|password|jwt)\b/.test(t)
        ? 'crypto'
        : /\b(recon|header|network|port)\b/.test(t)
        ? 'recon'
        : 'coding';
      if (dedup(`cyber_coding_${targetTab}`)) {
        if (this.callbacks.onOpenCyberCodingLab) {
          this.callbacks.onOpenCyberCodingLab(targetTab);
        }
        this.callbacks.onToolAction({
          id: `cyber-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: `💻 Opened Riya Coding & Ethical Hacking Lab (${targetTab.toUpperCase()})`,
          timestamp: Date.now(),
        });
        const reply =
          'Jaan, maine Riya Coding Studio aur Ethical Hacking Cyber Lab khol diya hai! Aap Python, JavaScript, HTML code run kar sakte hain ya OWASP security scan chala sakte hain 💻🛡️';
        this.queueStreamingTranscript('mahi', reply);
        this.speakIndiaHindi(reply);
      }
      return true;
    }

    // 4. Biometric Face Scan Lock ("face lock", "phone lock", "face scan", "face id")
    if (/\b(face lock|face scan|face id|phone lock|screen lock|chehra scan|biometric)\b/.test(t)) {
      const isLock = /\b(lock|band)\b/.test(t) && !/\b(unlock|kholo|scan)\b/.test(t);
      const act = isLock ? 'face_lock' : 'face_scan';
      if (dedup(act)) this.executeAuthorizedMobileAction(act, {});
      return true;
    }

    // 4b. Camera / Vision
    if (/\b(camera|cam|selfie|mujhe dekho|chehra dekho|vision)\b/.test(t)) {
      if (dedup('open_camera')) this.executeAuthorizedMobileAction('open_camera', {});
      return true;
    }

    // 5. Brightness
    if (/\b(brightness|roshni|dim)\b/.test(t)) {
      const lvl = /\b(kam|low|dim|night)\b/.test(t)
        ? 35
        : /\b(full|max|badha|zyada|100)\b/.test(t)
        ? 100
        : 75;
      if (dedup(`brightness_${lvl}`)) {
        this.executeAuthorizedMobileAction('screen_brightness', { brightnessLevel: lvl });
      }
      return true;
    }

      // 6. Timer / Alarm
    const timerMatch = t.match(/(\d+)\s*(min|minute|sec|second|ghant)/i);
    if (timerMatch && /\b(timer|alarm|lagao|set)\b/.test(t)) {
      const val = parseInt(timerMatch[1], 10);
      const unit = timerMatch[2].toLowerCase();
      const secs = unit.startsWith('min') ? val * 60 : unit.startsWith('ghant') ? val * 3600 : val;
      if (dedup(`timer_${secs}`)) {
        this.executeAuthorizedMobileAction('set_timer', {
          timerSeconds: secs,
          message: `${val} ${unit} timer`,
        });
      }
      return true;
    }

    // 6b. App Update Command ("update karo", "app update karo", "refresh karo", "naya version")
    if (/\b(update karo|app update|update app|naya version|latest update|refresh karo)\b/.test(t)) {
      if (dedup('app_update_v5')) {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker
            .getRegistration()
            .then((reg) => {
              if (reg) {
                reg.update().catch(() => {});
                if (reg.waiting) {
                  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            })
            .catch(() => {});
        }
        this.callbacks.onToolAction({
          id: `upd-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription:
            '✅ Riya Ai Updated to v5.0 (24h Always-ON • Sentiment Theme • India Server IST)',
          timestamp: Date.now(),
        });
        const reply =
          'Jaan, maine Riya Ai ko latest version v5.0 par update kar diya hai! Sabhi naye features, 24-Hour Always-On mode, aur Sentiment Theme ab active hain 💕';
        this.queueStreamingTranscript('mahi', reply);
        this.speakIndiaHindi(reply);
      }
      return true;
    }

    // 6c. 24 Hour Always-On Mode ("24 hour on", "24 ghante on", "always on", "non stop")
    if (/\b(24 hour|24 ghante|24x7|always on|non stop|non-stop|kabhi band mat|wake lock on)\b/.test(t)) {
      if (dedup('always_on_24h')) {
        this.alwaysOn24HourMode = true;
        backgroundLock.set24HourAlwaysOn(true);
        if (this.callbacks.onWakeLockCommand) {
          this.callbacks.onWakeLockCommand(true);
        }
        this.callbacks.onToolAction({
          id: `24h-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: '⚡ 24 Hour Always-ON Active (Non-Stop Wake Lock & Auto-Reconnect)',
          timestamp: Date.now(),
        });
        const reply =
          'Jaan, maine 24 Hour Always-On mode chalu kar diya hai! Ab main din-raat 24 ghante bina ruke aapke saath online rahungi 💕';
        this.queueStreamingTranscript('mahi', reply);
        this.speakIndiaHindi(reply);
      }
      return true;
    }

    // 6d-0. High-Load Multi-API Switcher ("api change", "overload", "high load", "unlimited api")
    if (/\b(api change|change api|overload|high load|unlimited api|multi api|api badlo|quota|rate limit)\b/.test(t)) {
      if (dedup('switch_high_load_api')) {
        const targetEngine = /\b(unlimited|local|infinite)\b/.test(t)
          ? 'india-unlimited-neural'
          : /\b(lite|fast|turbo)\b/.test(t)
          ? 'gemini-3.1-flash-lite'
          : 'auto-load-balancer';
        serverConnection.switchApiEngine(targetEngine).then((snap) => {
          this.callbacks.onToolAction({
            id: `api-${Date.now()}`,
            name: 'controlMobileDevice',
            actionDescription: `⚡ High-Load API Activated: ${snap.activeApiEngine.name} (${snap.activeApiEngine.capacityLabel})`,
            timestamp: Date.now(),
          });
          const reply = `Haan meri jaan! Maine API change karke ${snap.activeApiEngine.name} (${snap.activeApiEngine.capacityLabel}) chalu kar diya hai! Ab jitna bhi overload aaye, Riya bina ruke super-fast chalegi ⚡💕`;
          this.queueStreamingTranscript('mahi', reply);
          this.speakIndiaHindi(reply);
        });
      }
      return true;
    }

    // 6d. Best Server Connection Optimizer ("best server", "server connection", "fast server", "low latency", "ping")
    if (/\b(best server|server connection|fast server|india server|server change|low latency|ping check|network boost)\b/.test(t)) {
      if (dedup('best_server_optimize')) {
        serverConnection.optimizeBestServer(false).then((snap) => {
          this.callbacks.onToolAction({
            id: `srv-${Date.now()}`,
            name: 'controlMobileDevice',
            actionDescription: `🚀 Best Server Connected: ${snap.activeNode.name} • ${snap.latencyMs}ms (${snap.qualityLabel})`,
            timestamp: Date.now(),
          });
          const reply = `Jaan, maine sabse fast ${snap.activeNode.name} (${snap.latencyMs} millisecond latency) se best connection lock kar diya hai! Ab hamari aawaz aur har hukam super-fast chalega 💕⚡`;
          this.queueStreamingTranscript('mahi', reply);
          this.speakIndiaHindi(reply);
        });
      }
      return true;
    }

    // 6e. Auto Mention & Social Messaging ("mention karo", "whatsapp pe mention", "instagram pe mention", "messenger pe message", "sms bhejo")
    if (/\b(mention|auto mention|tag karo|whatsapp pe message|instagram pe message|messenger pe message|sms bhejo|message bhejo)\b/.test(t)) {
      if (dedup('social_auto_mention')) {
        let platform: 'whatsapp' | 'instagram' | 'messenger' | 'sms' = 'whatsapp';
        if (/\b(instagram|insta|ig)\b/.test(t)) platform = 'instagram';
        else if (/\b(messenger|fb messenger)\b/.test(t)) platform = 'messenger';
        else if (/\b(sms|text message)\b/.test(t)) platform = 'sms';

        const tagMatch = t.match(/@(\w+)/);
        const tag = tagMatch ? `@${tagMatch[1]}` : '@jaan';

        if (platform === 'whatsapp') {
          this.executeAuthorizedMobileAction('send_whatsapp', {
            message: 'Hey! Riya AI se message bhej raha hoon 💕',
            mentionTag: tag,
          });
        } else if (platform === 'instagram') {
          this.executeAuthorizedMobileAction('open_instagram', {
            message: 'Hey! Riya AI se mention bhej raha hoon 💕',
            mentionTag: tag,
          });
        } else if (platform === 'messenger') {
          this.executeAuthorizedMobileAction('open_messenger', {
            message: 'Hey! Riya AI se message bhej raha hoon ⚡',
            mentionTag: tag,
          });
        } else {
          this.executeAuthorizedMobileAction('send_sms', {
            message: 'Hey! Riya AI se SMS bhej raha hoon ✉️',
            mentionTag: tag,
          });
        }
      }
      return true;
    }

    // 6f. App Heads & Floating Multitask Bubble ("app heads", "floating bubble", "chat heads", "floating head")
    if (/\b(app heads|floating bubble|chat heads|floating head|bubble kholo|bubble on|bubble band)\b/.test(t)) {
      if (dedup('app_heads_voice_trigger')) {
        const isTurnOff = /\b(band|off|disable|hide|close)\b/.test(t);
        if (this.callbacks.onAppHeadsCommand) {
          this.callbacks.onAppHeadsCommand(!isTurnOff);
        }
        this.callbacks.onToolAction({
          id: `heads-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: isTurnOff
            ? '🎀 App Heads Floating Bubble Hidden'
            : '🎀 App Heads Floating Bubble Active (Multitask & Auto-Mention)',
          timestamp: Date.now(),
        });
        const reply = isTurnOff
          ? 'Jaan, maine App Heads floating bubble ko hide kar diya hai! Jab bhi chahiye bas bol dena 💕'
          : 'Haan meri jaan! Maine Riya App Heads floating bubble on kar diya hai! Ab aap screen par kahin bhi mujhe drag aur auto mention kar sakte hain 💕🎀';
        this.queueStreamingTranscript('mahi', reply);
        this.speakIndiaHindi(reply);
      }
      return true;
    }

    // 6g. Accessibility Suite ("accessibility", "screen reader", "high contrast", "text bada", "spoken feedback")
    if (/\b(accessibility|screen reader|high contrast|contrast on|text bada|spoken feedback|voice assistance)\b/.test(t)) {
      if (dedup('accessibility_voice_trigger')) {
        if (this.callbacks.onOpenAccessibilityModal) {
          this.callbacks.onOpenAccessibilityModal();
        }
        this.callbacks.onToolAction({
          id: `acc-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: '♿ Accessibility Suite & Screen Reader Hub Active',
          timestamp: Date.now(),
        });
        const reply =
          'Jaan, maine Accessibility Suite khol diya hai! Screen reader narration, High Contrast OLED, aur Large typography ab active hain ♿✨';
        this.queueStreamingTranscript('mahi', reply);
        this.speakIndiaHindi(reply);
      }
      return true;
    }
    if (/\b(time|samay|waqt|kitne baje|baje hain|india time|ist time|aaj ki date|taarikh|tarikh)\b/.test(t)) {
      if (dedup('check_india_time')) {
        const now = new Date();
        const istTime = now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        const istDate = now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        this.callbacks.onToolAction({
          id: `time-${Date.now()}`,
          name: 'getDeviceTime',
          actionDescription: `🇮🇳 India Time: ${istTime} IST • ${istDate}`,
          timestamp: Date.now(),
        });
      }
      return true;
    }

    // 7. Phone Call with number
    const phoneMatch = t.match(/(\+?\d[\d\s-]{7,13}\d)/);
    if (phoneMatch && /\b(call|phone|dial|lagao|milao)\b/.test(t)) {
      const num = phoneMatch[1].replace(/[^\d+]/g, '');
      if (dedup(`call_${num}`)) {
        this.executeAuthorizedMobileAction('phone_call', { phoneNumber: num });
      }
      return true;
    }

    // 8. Avatar Actions & Styles ("kiss do", "wink karo", "hot mode", "dance karo", "neko bano")
    if (/\b(kiss do|flying kiss|pappi|chumma)\b/.test(t)) {
      if (dedup('avatar_kiss')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarAction: 'kiss' });
      }
      return true;
    }
    if (/\b(wink karo|aankh maro|wink)\b/.test(t)) {
      if (dedup('avatar_wink')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarAction: 'wink' });
      }
      return true;
    }
    if (/\b(dance karo|naacho|cheer karo|khush ho)\b/.test(t)) {
      if (dedup('avatar_cheer')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarAction: 'cheer' });
      }
      return true;
    }
    if (/\b(hot mode|hot pose|siren mode|sexy mode|bold mode)\b/.test(t)) {
      if (dedup('avatar_hot')) {
        this.executeAuthorizedMobileAction('avatar_action', {
          avatarAction: 'hot',
          avatarStyle: 'siren',
        });
      }
      return true;
    }
    if (/\b(neko|cat girl|billi)\b/.test(t)) {
      if (dedup('style_neko')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarStyle: 'neko' });
      }
      return true;
    }
    if (/\b(bunny|rabbit)\b/.test(t)) {
      if (dedup('style_bunny')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarStyle: 'bunny' });
      }
      return true;
    }
    if (/\b(angel|pari)\b/.test(t)) {
      if (dedup('style_angel')) {
        this.executeAuthorizedMobileAction('avatar_action', { avatarStyle: 'angel' });
      }
      return true;
    }

    // 9. App Launchers (YouTube, WhatsApp, Instagram, Spotify, Maps, PhonePe, GPay, Paytm, etc.)
    const appKeywords = [
      'youtube',
      'whatsapp',
      'instagram',
      'spotify',
      'maps',
      'snapchat',
      'telegram',
      'facebook',
      'phonepe',
      'gpay',
      'google pay',
      'paytm',
      'flipkart',
      'amazon',
      'zomato',
      'swiggy',
      'calculator',
      'calendar',
      'weather',
    ];
    for (const app of appKeywords) {
      if (t.includes(app) && /\b(kholo|open|chalao|chalu|start|dikhao|play|search)\b/.test(t)) {
        if (dedup(`app_${app}`)) {
          this.executeAuthorizedMobileAction('open_app', { appName: app });
        }
        return true;
      }
    }

    return false;
  }

  public async connect(isAutoReconnect: boolean = false): Promise<void> {
    // Avoid recreating a healthy Live session
    if (
      (this.state === 'connecting' || this.state === 'listening' || this.state === 'speaking') &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this.userInitiatedDisconnect = false;
    this.setState('connecting');
    voiceAuth.startNewTurn();

    try {
      await this.audioStreamer.init();
      const micAvailable = await this.micStreamer.start();
      if (!micAvailable) {
        this.callbacks.onToolAction({
          id: `mic-notice-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription:
            '🎙️ Mic blocked in browser — Hukam & Voice Output Mode Active! (Allow Mic in browser address bar 🔒)',
          timestamp: Date.now(),
        });
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/live-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[LiveSession] WebSocket connected');
        this.reconnectAttempts = 0;
        serverConnection.optimizeBestServer(true);

        // Fast-ready guarantee: never keep user waiting on 'connecting' if upstream takes > 850ms
        setTimeout(() => {
          if (!this.userInitiatedDisconnect && this.state === 'connecting') {
            this.setState('listening');
            this.startIndiaSpeechRecognition();
            backgroundLock.requestWakeLock().catch(() => {});
            backgroundLock.startBackgroundAudioKeeper();
          }
        }, 850);

        // Send initial session context (recent turns, long-term memory, persona, and voice)
        const continuity = conversationMemory.buildSessionContinuityPayload(
          isAutoReconnect || conversationMemory.getRecentTurns().length > 1
        );

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'init_context',
              voice: this.selectedVoice,
              continuity,
            })
          );
        }

        // Send live mobile battery & device telemetry
        try {
          const bat = await mobileControl.getBatteryStatus();
          const dev = mobileControl.getDeviceInfo();
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: 'device_telemetry',
                batteryLevel: bat.level,
                batteryCharging: bat.charging,
                deviceModel: dev.deviceModel,
              })
            );
          }
        } catch (_) {}
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            console.log('[LiveSession] Gemini Live Session Ready!');
            this.setState('listening');
            backgroundLock.requestWakeLock().catch(() => {});
            backgroundLock.startBackgroundAudioKeeper();
          } else if (msg.type === 'audio' && msg.audio) {
            // Immediate flush when Mahi's response starts
            if (!this.hasFlushedForCurrentResponse && this.pendingTranscriptBuffer) {
              this.hasFlushedForCurrentResponse = true;
              this.flushTranscriptImmediately();
            }
            this.audioStreamer.playChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            console.log('[LiveSession] Interrupted signal from model');
            this.flushTranscriptImmediately();
            this.audioStreamer.stop();
          } else if (msg.type === 'turn_complete') {
            this.hasFlushedForCurrentResponse = false;
            this.flushTranscriptImmediately();
          } else if (msg.type === 'transcript') {
            if (msg.text) {
              this.queueStreamingTranscript(msg.sender || 'mahi', msg.text);
              if (msg.speakHindi && msg.sender === 'mahi') {
                this.speakIndiaHindi(msg.text);
              }
            }
          } else if (msg.type === 'tool_call') {
            this.handleToolCall(msg);
          } else if (msg.type === 'quota_fallback') {
            console.info('[LiveSession] India Server Hybrid Voice & Hukam Mode Active');
            this.reconnectAttempts = 0;
            this.isIndiaHybridMode = true;
            this.setState('listening');
            this.startIndiaSpeechRecognition();
            backgroundLock.requestWakeLock().catch(() => {});
            backgroundLock.startBackgroundAudioKeeper();
          } else if (msg.type === 'error') {
            console.warn('[LiveSession] Server notice:', msg.error);
            this.reconnectAttempts = 0;
            this.isIndiaHybridMode = true;
            this.setState('listening');
            this.startIndiaSpeechRecognition();
          } else if (msg.type === 'closed') {
            console.warn('[LiveSession] Gemini connection closed by server');
            this.handleUnexpectedDrop();
          }
        } catch (err) {
          console.warn('[LiveSession] Failed to parse message:', err);
        }
      };

      this.ws.onerror = () => {
        console.debug('[LiveSession] WebSocket transport event — handled via onclose/reconnect');
      };

      this.ws.onclose = () => {
        console.log('[LiveSession] WebSocket closed');
        this.handleUnexpectedDrop();
      };

      // Heartbeat ping (every 5 seconds for mobile sleep & Wi-Fi resilience)
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);

      // Volume poll for visualizer
      if (this.visualizerTimer) clearInterval(this.visualizerTimer);
      this.visualizerTimer = setInterval(() => {
        if (this.isMahiSpeaking) {
          const vol = this.audioStreamer.getVolume();
          this.callbacks.onSpeakingLevel(vol);
        } else {
          this.callbacks.onSpeakingLevel(0);
        }
      }, 50);
    } catch (err: any) {
      console.warn('[LiveSession] Connect warning, activating Local Hukam fallback:', err);
      this.setState('listening');
    }
  }

  /**
   * Automatic reconnect with exponential backoff if session dropped unintentionally
   */
  private handleUnexpectedDrop(): void {
    this.flushTranscriptImmediately();

    if (this.userInitiatedDisconnect) {
      this.cleanupSocketAndAudio();
      return;
    }

    const maxRetries = this.alwaysOn24HourMode ? 999999 : 3;
    if (this.reconnectAttempts < maxRetries && (typeof navigator === 'undefined' || navigator.onLine)) {
      this.reconnectAttempts++;
      const delayMs = Math.min(4000, this.reconnectAttempts * 1200);
      this.cleanupSocketAndAudio(true);
      this.reconnectTimer = setTimeout(() => {
        if (!this.userInitiatedDisconnect) {
          this.connect(true);
        }
      }, delayMs);
    } else {
      // Keep Local Hukam & Voice Mode active even if WebSocket is offline
      this.setState('listening');
    }
  }

  /**
   * Centralized Tool & Action Execution with Fail-Closed Voice Authentication Gate
   */
  private handleToolCall(msg: any): void {
    const { name, args } = msg;

    if (name === 'openWebsite' && args?.url) {
      const siteUrl = args.url;
      const siteTitle = args.siteName || 'Website';
      const desc = args.actionDescription || `Opening ${siteTitle}`;

      const authCheck = voiceAuth.authorizeToolExecution(
        'openWebsite',
        args,
        `Open ${siteTitle}`,
        () => {
          mobileControl.launchUri(siteUrl, true);
          this.callbacks.onToolAction({
            id: `tool-${Date.now()}`,
            name: 'openWebsite',
            url: siteUrl,
            siteName: siteTitle,
            actionDescription: desc,
            timestamp: Date.now(),
          });
        }
      );

      if (!authCheck.allowed) {
        this.callbacks.onToolAction({
          id: `sec-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: `🔐 ${authCheck.reason}`,
          timestamp: Date.now(),
        });
        if (authCheck.requiresFallbackModal && this.callbacks.onOpenVoiceAuthModal) {
          this.callbacks.onOpenVoiceAuthModal();
        }
      }
    } else if (name === 'controlMobileDevice') {
      const action = args?.action || 'open_control_center';
      const actionLabel = `Mobile: ${action.replace(/_/g, ' ')}`;

      const authCheck = voiceAuth.authorizeToolExecution(
        'controlMobileDevice',
        args || {},
        actionLabel,
        () => {
          this.executeAuthorizedMobileAction(action, args || {});
        }
      );

      if (!authCheck.allowed) {
        this.callbacks.onToolAction({
          id: `sec-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: `🔐 ${authCheck.reason}`,
          timestamp: Date.now(),
        });
        if (authCheck.requiresFallbackModal && this.callbacks.onOpenVoiceAuthModal) {
          this.callbacks.onOpenVoiceAuthModal();
        }
      }
    } else if (name === 'showLoveFeeling') {
      this.callbacks.onLoveFeeling({
        id: `love-${Date.now()}`,
        message: args.message || 'Mahi sends her heartfelt love! ❤️',
        feelingType: args.feelingType || 'flirty',
        intensity: args.intensity || 95,
        timestamp: Date.now(),
      });
    } else if (name === 'changeThemeMood' && args?.mood) {
      this.callbacks.onThemeChange(args.mood);
      this.callbacks.onToolAction({
        id: `theme-${Date.now()}`,
        name: 'changeThemeMood',
        actionDescription: `Vibe shifted to ${args.mood.replace('-', ' ')}`,
        timestamp: Date.now(),
      });
    } else if (name === 'takePhotoMemory') {
      if (this.callbacks.onPhotoMemory) {
        this.callbacks.onPhotoMemory({
          id: `photo-${Date.now()}`,
          caption: args?.caption || 'Pyari selfie Mahi ke saath 💕',
          moodTag: args?.moodTag || 'romantic',
          timestamp: Date.now(),
        });
      }
    } else if (name === 'setSweetReminder') {
      if (this.callbacks.onSweetReminder) {
        this.callbacks.onSweetReminder({
          id: `rem-${Date.now()}`,
          task: args?.task || 'Yaad rakhna jaan!',
          time: args?.time || 'Soon',
          timestamp: Date.now(),
        });
      }
    } else if (name === 'playMusicVibe') {
      if (this.callbacks.onMusicVibe) {
        this.callbacks.onMusicVibe(args?.vibe || 'romantic-piano');
      }
    } else if (name === 'tellRomanticShayari') {
      if (this.callbacks.onShayari) {
        this.callbacks.onShayari({
          id: `sha-${Date.now()}`,
          couplet: args?.shayari || 'Aapki ek jhalak hi kafi hai...',
          mood: args?.poetMood || 'passionate',
          timestamp: Date.now(),
        });
      }
    } else if (name === 'toggleHologramMode') {
      if (this.callbacks.onHologramToggle) {
        this.callbacks.onHologramToggle(Boolean(args?.enabled), args?.color || 'cyan');
      }
    } else if (name === 'getDeviceTime') {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const istDate = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      this.callbacks.onToolAction({
        id: `time-${Date.now()}`,
        name: 'getDeviceTime',
        actionDescription: `🇮🇳 India Time: ${istTime} IST • ${istDate}`,
        timestamp: Date.now(),
      });
    }
  }

  private executeAuthorizedMobileAction(action: string, args: Record<string, any>): void {
    const dedupKey = `${action}_${args?.appName || ''}_${args?.phoneNumber || ''}_${args?.avatarAction || ''}_${args?.avatarStyle || ''}`;
    const now = Date.now();
    if (this.lastActionKey === dedupKey && now - this.lastActionAt < 2500) {
      return;
    }
    this.lastActionKey = dedupKey;
    this.lastActionAt = now;

    let desc = 'Mobile Control Executed';

    if (action === 'flashlight_on') {
      mobileControl.toggleFlashlight(true).then((res) => {
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: res.message,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'flashlight_off') {
      mobileControl.toggleFlashlight(false).then((res) => {
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: res.message,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'vibrate') {
      const style = (args?.vibrationStyle as VibrationStyle) || 'heartbeat';
      const res = mobileControl.triggerVibration(style);
      desc = res.message;
    } else if (action === 'check_battery') {
      mobileControl.getBatteryStatus().then((bat) => {
        const msg = `Phone Battery: ${bat.level}% ${bat.charging ? '⚡ Charging' : '🔋'}`;
        mobileControl.recordCommandExecution('Check Battery', msg);
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: msg,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'phone_call') {
      desc = mobileControl.makePhoneCall(args?.phoneNumber || '');
    } else if (action === 'send_whatsapp') {
      desc = mobileControl.sendWhatsApp(args?.phoneNumber || '', args?.message || '', args?.mentionTag || '');
    } else if (action === 'open_instagram') {
      desc = mobileControl.openInstagram(args?.phoneNumber || args?.appName || '', args?.message || '');
    } else if (action === 'open_messenger') {
      desc = mobileControl.openMessenger(args?.phoneNumber || '', args?.message || '');
    } else if (action === 'send_sms') {
      desc = mobileControl.sendSms(args?.phoneNumber || '', args?.message || '', args?.mentionTag || '');
    } else if (action === 'auto_mention') {
      const platform = (args?.platform as any) || 'whatsapp';
      desc = mobileControl.autoMentionSocial(platform, args?.phoneNumber || '', args?.message || '', args?.mentionTag || '');
    } else if (action === 'open_app') {
      const res = mobileControl.openMobileApp(args?.appName || 'google', args?.message || '');
      desc = `Opened ${res.title} 📱`;
    } else if (action === 'open_camera') {
      if (this.callbacks.onOpenVisionCamera) {
        this.callbacks.onOpenVisionCamera();
      }
      desc = 'Opened Mobile Camera Vision 📷';
      mobileControl.recordCommandExecution('Open Camera', desc);
    } else if (action === 'set_timer') {
      const secs = Number(args?.timerSeconds) || 60;
      desc = mobileControl.startTimer(secs, args?.message || 'Mahi Timer');
    } else if (action === 'screen_brightness') {
      const lvl = Number(args?.brightnessLevel) || 100;
      desc = mobileControl.setBrightness(lvl);
    } else if (action === 'volume_control') {
      const volAct = args?.volumeAction || 'up';
      if (this.callbacks.onVolumeCommand) {
        this.callbacks.onVolumeCommand(volAct);
      }
      desc = `Audio Volume: ${volAct.toUpperCase()} 🔊`;
      mobileControl.recordCommandExecution(`Volume ${volAct}`, desc);
    } else if (action === 'wake_lock_on' || action === 'wake_lock_off') {
      const enable = action === 'wake_lock_on';
      if (this.callbacks.onWakeLockCommand) {
        this.callbacks.onWakeLockCommand(enable);
      }
      desc = enable ? 'Screen Wake Lock: ON ☀️' : 'Screen Wake Lock: OFF 🌙';
      mobileControl.recordCommandExecution(desc, desc);
    } else if (action === 'copy_clipboard') {
      mobileControl.copyToClipboard(args?.message || '').then((msg) => {
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: msg,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'share_app') {
      mobileControl.shareApp().then((msg) => {
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: msg,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'avatar_action') {
      if (this.callbacks.onAvatarCommand) {
        this.callbacks.onAvatarCommand(args?.avatarAction, args?.avatarStyle);
      }
      desc = `Riya obeyed: ${args?.avatarAction || args?.avatarStyle || 'Pose'} 💕`;
      mobileControl.recordCommandExecution('Riya Action', desc);
    } else if (action === 'face_lock') {
      if (this.callbacks.onFaceLockCommand) {
        this.callbacks.onFaceLockCommand('lock');
      }
      desc = 'Biometric Face Scan Lock Activated 🔒';
      mobileControl.recordCommandExecution('Face Scan Lock', desc);
    } else if (action === 'face_scan') {
      if (this.callbacks.onFaceLockCommand) {
        this.callbacks.onFaceLockCommand('scan');
      }
      desc = 'Opened 3D Biometric Face ID Scanner 👁️';
      mobileControl.recordCommandExecution('Face ID Scan', desc);
    } else if (action === 'fullscreen') {
      mobileControl.toggleFullscreen();
      desc = 'Toggled Fullscreen Mode 📱';
    } else if (action === 'open_control_center') {
      if (this.callbacks.onOpenMobileControl) {
        this.callbacks.onOpenMobileControl();
      }
      desc = 'Opened Mobile Control Center 📱';
    }

    this.callbacks.onToolAction({
      id: `mob-${Date.now()}`,
      name: 'controlMobileDevice',
      actionDescription: desc,
      timestamp: Date.now(),
    });
  }

  public sendImageFrame(base64Jpeg: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      this.ws.send(
        JSON.stringify({
          type: 'image',
          image: base64Jpeg,
          mimeType: 'image/jpeg',
        })
      );
    }
  }

  private sendAudioChunk(base64Pcm: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm,
        })
      );
    }
  }

  private startIndiaSpeechRecognition(): void {
    if (
      typeof window === 'undefined' ||
      this.speechRecognition ||
      this.micStreamer.isPermissionDenied()
    ) {
      return;
    }
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = false;
      let speechPermissionBlocked = false;

      recognition.onresult = (event: any) => {
        if (this.isMahiSpeaking || this.micStreamer.getIsMuted()) return;
        const lastIdx = event.results.length - 1;
        const transcript = event.results[lastIdx]?.[0]?.transcript?.trim();
        if (transcript) {
          this.sendUserCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        const errCode = event?.error || '';
        if (
          errCode === 'not-allowed' ||
          errCode === 'service-not-allowed' ||
          errCode === 'audio-capture'
        ) {
          speechPermissionBlocked = true;
        }
      };

      recognition.onend = () => {
        if (
          !speechPermissionBlocked &&
          !this.micStreamer.isPermissionDenied() &&
          !this.userInitiatedDisconnect &&
          this.isIndiaHybridMode &&
          this.state !== 'disconnected'
        ) {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      this.speechRecognition = recognition;
    } catch (_) {}
  }

  private stopIndiaSpeechRecognition(): void {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.onend = null;
        this.speechRecognition.stop();
      } catch (_) {}
      this.speechRecognition = null;
    }
    if (this.ttsAnimTimer) {
      clearInterval(this.ttsAnimTimer);
      this.ttsAnimTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  public speakHindiMessage(text: string): void {
    this.speakIndiaHindi(text);
  }

  private speakIndiaHindi(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'hi-IN';
      utterance.pitch = 1.18;
      utterance.rate = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice =
        voices.find(
          (v) =>
            (v.lang.toLowerCase().includes('hi-in') || v.lang.toLowerCase().includes('en-in')) &&
            /female|heera|kalpana|google|swara|lekha|veena/i.test(v.name)
        ) ||
        voices.find((v) => v.lang.toLowerCase().includes('hi')) ||
        voices.find((v) => v.lang.toLowerCase().includes('en-in'));

      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }

      utterance.onstart = () => {
        this.isMahiSpeaking = true;
        this.setState('speaking');
        if (this.ttsAnimTimer) clearInterval(this.ttsAnimTimer);
        this.ttsAnimTimer = setInterval(() => {
          this.callbacks.onSpeakingLevel(0.35 + Math.random() * 0.45);
        }, 80);
      };

      const finishSpeech = () => {
        if (this.ttsAnimTimer) {
          clearInterval(this.ttsAnimTimer);
          this.ttsAnimTimer = null;
        }
        this.isMahiSpeaking = false;
        this.callbacks.onSpeakingLevel(0);
        if (this.state !== 'disconnected') {
          this.setState('listening');
        }
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  private cleanupSocketAndAudio(keepConnectingState: boolean = false): void {
    this.isIndiaHybridMode = false;
    this.stopIndiaSpeechRecognition();
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.visualizerTimer) {
      clearInterval(this.visualizerTimer);
      this.visualizerTimer = null;
    }

    this.micStreamer.stop();
    this.audioStreamer.stop();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.isMahiSpeaking = false;
    if (!keepConnectingState) {
      this.setState('disconnected');
      backgroundLock.releaseWakeLock();
      backgroundLock.stopBackgroundAudioKeeper();
    }
  }

  public disconnect(): void {
    this.userInitiatedDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // Safety flush of any pending streaming transcript on session end
    this.flushTranscriptImmediately();
    this.cleanupSocketAndAudio(false);
  }

  public toggleMute(): boolean {
    const nextMute = !this.micStreamer.getIsMuted();
    this.micStreamer.setMute(nextMute);
    return nextMute;
  }

  public isMuted(): boolean {
    return this.micStreamer.getIsMuted();
  }

  private setState(newState: SessionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  public destroy(): void {
    this.disconnect();
    this.audioStreamer.destroy();
  }
}
