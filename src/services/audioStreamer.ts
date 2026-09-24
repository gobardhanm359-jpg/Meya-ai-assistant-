/**
 * AudioStreamer: High-fidelity, low-latency 24kHz Web Audio playback engine
 * for Gemini Live API audio responses.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying: boolean = false;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private checkInterval: any = null;

  constructor(onSpeakingChange?: (isSpeaking: boolean) => void) {
    this.onSpeakingChange = onSpeakingChange;
  }

  public async init(): Promise<void> {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      document.addEventListener('visibilitychange', () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkPlaybackStatus();
      }, 100);
    }
  }

  /**
   * Enqueue and schedule base64 PCM16 24kHz audio chunk for gapless playback
   */
  public async playChunk(base64Data: string): Promise<void> {
    try {
      await this.init();
      if (!this.audioContext || !this.gainNode) return;

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little-endian to Float32 [-1, 1]
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Array.length,
        24000
      );
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime + 0.005, this.nextStartTime);
      source.start(startTime);

      this.nextStartTime = startTime + audioBuffer.duration;
      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onSpeakingChange?.(true);
      }

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        this.checkPlaybackStatus();
      };
    } catch (err) {
      console.error('[AudioStreamer] Error playing audio chunk:', err);
    }
  }

  private checkPlaybackStatus(): void {
    if (!this.audioContext) return;
    const isStillActive =
      this.activeSources.length > 0 &&
      this.audioContext.currentTime < this.nextStartTime;

    if (!isStillActive && this.isPlaying) {
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
    }
  }

  /**
   * Stop immediately when user interrupts or disconnects
   */
  public stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
    }
  }

  /**
   * Get frequency data array for visualizer
   */
  public getFrequencyData(outputArray: Uint8Array<any>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(outputArray as any);
    } else {
      outputArray.fill(0);
    }
  }

  /**
   * Get current volume level [0, 1]
   */
  public getVolume(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return Math.min(1, (sum / buffer.length) / 128);
  }

  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.analyser = null;
    this.gainNode = null;
  }
}
