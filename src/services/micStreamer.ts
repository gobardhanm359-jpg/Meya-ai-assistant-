/**
 * MicStreamer: Captures microphone input, downsamples/encodes to PCM16 16kHz,
 * and streams base64 chunks to Gemini Live.
 */

export class MicStreamer {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioChunk?: (base64Pcm: string) => void;
  private onVolumeChange?: (volume: number) => void;
  private isCapturing: boolean = false;
  private isMuted: boolean = false;

  constructor(
    onAudioChunk?: (base64Pcm: string) => void,
    onVolumeChange?: (volume: number) => void
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onVolumeChange = onVolumeChange;
  }

  public async start(): Promise<void> {
    if (this.isCapturing) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Target 16kHz as requested for Gemini Live
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      this.sourceNode.connect(this.analyser);

      // Buffer size 2048 or 4096. 2048 at 16kHz is ~128ms per chunk
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isCapturing || this.isMuted) return;

        const inputChannelData = event.inputBuffer.getChannelData(0);
        const actualSampleRate = event.inputBuffer.sampleRate;

        // Calculate current mic volume
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += Math.abs(inputChannelData[i]);
        }
        const avg = sum / inputChannelData.length;
        this.onVolumeChange?.(Math.min(1, avg * 5));

        // Downsample to 16000 if actual sample rate differs
        let targetData: Float32Array = inputChannelData as any;
        if (actualSampleRate !== 16000) {
          targetData = this.downsampleTo16k(inputChannelData, actualSampleRate);
        }

        // Convert Float32 to Int16 PCM
        const pcm16 = this.floatTo16BitPCM(targetData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer as any);

        this.onAudioChunk?.(base64);
      };

      this.sourceNode.connect(this.processorNode);
      // ScriptProcessor needs to be connected to destination in webkit/blink to fire
      this.processorNode.connect(this.audioContext.destination);

      this.isCapturing = true;
    } catch (err) {
      console.error('[MicStreamer] Failed to access microphone:', err);
      this.stop();
      throw err;
    }
  }

  private downsampleTo16k(buffer: Float32Array, sampleRate: number): Float32Array {
    if (sampleRate === 16000) return buffer;
    const ratio = sampleRate / 16000;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer];
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getFrequencyData(outputArray: Uint8Array<any>): void {
    if (this.analyser && this.isCapturing && !this.isMuted) {
      this.analyser.getByteFrequencyData(outputArray as any);
    } else {
      outputArray.fill(0);
    }
  }

  public stop(): void {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }
}
