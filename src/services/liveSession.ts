/**
 * LiveSession: High-level orchestrator connecting AudioStreamer, MicStreamer,
 * and the WebSocket bridge to Gemini Live.
 */

import { AudioStreamer } from './audioStreamer.ts';
import { MicStreamer } from './micStreamer.ts';
import { backgroundLock } from './backgroundLockService.ts';

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

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;

    this.audioStreamer = new AudioStreamer((isSpeaking) => {
      this.isMahiSpeaking = isSpeaking;
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
        // Interruption: if user speaks loudly while Mahi is talking, immediately cut Mahi off
        if (this.isMahiSpeaking && micVol > 0.35) {
          console.log('[LiveSession] User interruption threshold met, stopping speech');
          this.audioStreamer.stop();
        }
      }
    );
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

  public setVoice(voice: string): void {
    this.selectedVoice = voice;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'switch_voice', voice }));
    }
  }

  public getVoice(): string {
    return this.selectedVoice;
  }

  public async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'listening' || this.state === 'speaking') {
      return;
    }

    this.setState('connecting');

    try {
      // Initialize audio streamer context
      await this.audioStreamer.init();

      // Start microphone streaming
      await this.micStreamer.start();

      // Connect to server WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/live-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveSession] WebSocket connected');
        // If user configured a specific voice, request it
        if (this.selectedVoice !== 'Aoede') {
          this.ws?.send(JSON.stringify({ type: 'switch_voice', voice: this.selectedVoice }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            console.log('[LiveSession] Gemini Live Session Ready!');
            this.setState('listening');
            // Keep phone screen awake and enable background continuity
            backgroundLock.requestWakeLock().catch(() => {});
            backgroundLock.startBackgroundAudioKeeper();
          } else if (msg.type === 'audio' && msg.audio) {
            this.audioStreamer.playChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            console.log('[LiveSession] Interrupted signal from model');
            this.audioStreamer.stop();
          } else if (msg.type === 'transcript') {
            if (this.callbacks.onTranscript && msg.text) {
              this.callbacks.onTranscript({
                id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                sender: msg.sender || 'mahi',
                text: msg.text,
                timestamp: Date.now(),
              });
            }
          } else if (msg.type === 'tool_call') {
            this.handleToolCall(msg);
          } else if (msg.type === 'error') {
            console.error('[LiveSession] Server error:', msg.error);
            this.callbacks.onError(msg.error);
          } else if (msg.type === 'closed') {
            console.warn('[LiveSession] Gemini connection closed by server');
            this.disconnect();
          }
        } catch (err) {
          console.error('[LiveSession] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveSession] WebSocket error:', err);
        this.callbacks.onError('Connection error to Mahi AI backend.');
        this.disconnect();
      };

      this.ws.onclose = () => {
        console.log('[LiveSession] WebSocket closed');
        this.disconnect();
      };

      // Heartbeat ping (every 5 seconds for mobile sleep resilience)
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);

      // Volume poll for visualizer
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
      this.callbacks.onError(err?.message || 'Could not start voice session. Check microphone access.');
      this.disconnect();
    }
  }

  private handleToolCall(msg: any): void {
    const { name, args } = msg;

    if (name === 'openWebsite' && args?.url) {
      const siteUrl = args.url;
      const siteTitle = args.siteName || 'Website';
      const desc = args.actionDescription || `Opening ${siteTitle}`;

      // Open website in new tab
      try {
        window.open(siteUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Pop-up blocked or failed to open tab:', e);
      }

      this.callbacks.onToolAction({
        id: `tool-${Date.now()}`,
        name: 'openWebsite',
        url: siteUrl,
        siteName: siteTitle,
        actionDescription: desc,
        timestamp: Date.now(),
      });
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

  public disconnect(): void {
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
    this.setState('disconnected');

    // Release Screen Wake Lock and stop background audio keeper
    backgroundLock.releaseWakeLock();
    backgroundLock.stopBackgroundAudioKeeper();
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
