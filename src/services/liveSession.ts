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

  // Reconnect & Continuity management
  private userInitiatedDisconnect: boolean = true;
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

    // Wi-Fi / Network connectivity recovery listener
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.userInitiatedDisconnect && this.state === 'disconnected') {
          console.log('[LiveSession] Network restored — reconnecting Live session with context continuity');
          this.connect(true);
        }
      });
    }
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
      await this.micStreamer.start();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/live-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[LiveSession] WebSocket connected');
        this.reconnectAttempts = 0;

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
            }
          } else if (msg.type === 'tool_call') {
            this.handleToolCall(msg);
          } else if (msg.type === 'error') {
            console.error('[LiveSession] Server error:', msg.error);
            this.callbacks.onError(msg.error);
          } else if (msg.type === 'closed') {
            console.warn('[LiveSession] Gemini connection closed by server');
            this.handleUnexpectedDrop();
          }
        } catch (err) {
          console.error('[LiveSession] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveSession] WebSocket error:', err);
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
      console.error('[LiveSession] Connect failed:', err);
      this.callbacks.onError(
        err?.message || 'Could not start voice session. Check microphone access.'
      );
      this.disconnect();
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

    if (this.reconnectAttempts < 3 && navigator.onLine) {
      this.reconnectAttempts++;
      const delayMs = this.reconnectAttempts * 1200;
      console.log(`[LiveSession] Auto-reconnecting (attempt ${this.reconnectAttempts}/3) in ${delayMs}ms...`);
      this.cleanupSocketAndAudio(true);
      this.reconnectTimer = setTimeout(() => {
        if (!this.userInitiatedDisconnect) {
          this.connect(true);
        }
      }, delayMs);
    } else {
      this.cleanupSocketAndAudio();
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
    }
  }

  private executeAuthorizedMobileAction(action: string, args: Record<string, any>): void {
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
        this.callbacks.onToolAction({
          id: `mob-${Date.now()}`,
          name: 'controlMobileDevice',
          actionDescription: `Phone Battery: ${bat.level}% ${bat.charging ? '⚡ Charging' : '🔋'}`,
          timestamp: Date.now(),
        });
      });
      return;
    } else if (action === 'phone_call') {
      desc = mobileControl.makePhoneCall(args?.phoneNumber || '');
    } else if (action === 'send_whatsapp') {
      desc = mobileControl.sendWhatsApp(args?.phoneNumber || '', args?.message || '');
    } else if (action === 'send_sms') {
      desc = mobileControl.sendSms(args?.phoneNumber || '', args?.message || '');
    } else if (action === 'open_app') {
      const res = mobileControl.openMobileApp(args?.appName || 'google', args?.message || '');
      desc = `Opened ${res.title} 📱`;
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

  private cleanupSocketAndAudio(keepConnectingState: boolean = false): void {
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
