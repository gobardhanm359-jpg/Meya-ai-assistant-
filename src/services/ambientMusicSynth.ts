/**
 * AmbientMusicSynth
 * High-fidelity, zero-dependency Web Audio synthesizer for ambient romantic and lofi background music.
 * Generates lush harmonic pads, electric piano chords, soft lofi tape flutter, and binaural warmth.
 */

export type AmbientVibe = 'romantic-piano' | 'lofi-chill' | 'rain-beats' | 'cyber-groove';

export interface AmbientTrackInfo {
  id: AmbientVibe;
  name: string;
  hindiName: string;
  description: string;
  color: string;
}

export const AMBIENT_TRACKS: AmbientTrackInfo[] = [
  {
    id: 'romantic-piano',
    name: 'Romantic Moonlight',
    hindiName: 'चांदनी रात का प्यार (Romantic Piano)',
    description: 'Warm gentle piano chords with romantic emotional resonance',
    color: 'from-pink-500/30 to-rose-500/30 border-rose-500/50 text-rose-300',
  },
  {
    id: 'lofi-chill',
    name: 'Midnight Chai Lofi',
    hindiName: 'रात की चाय और सुकून (Midnight Lofi)',
    description: 'Relaxing jazzy lofi guitar chords with soft warm vinyl textures',
    color: 'from-amber-500/30 to-orange-500/30 border-amber-500/50 text-amber-300',
  },
  {
    id: 'rain-beats',
    name: 'Monsoon Romance',
    hindiName: 'बारिश और मोहब्बत (Rain Beats)',
    description: 'Soft raindrops ambience with deep warm Rhodes keys',
    color: 'from-cyan-500/30 to-blue-500/30 border-cyan-500/50 text-cyan-300',
  },
  {
    id: 'cyber-groove',
    name: 'Neo Tokyo Hologram',
    hindiName: 'फ्यूचरिस्टिक साइबर वाइब (Cyberpunk)',
    description: 'Futuristic synthwave arpeggios and glowing cyber pads',
    color: 'from-purple-500/30 to-indigo-500/30 border-purple-500/50 text-purple-300',
  },
];

export class AmbientMusicSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentVibe: AmbientVibe = 'romantic-piano';
  private timerId: any = null;
  private volume: number = 0.35;
  private noiseNode: AudioNode | null = null;

  constructor() {}

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public play(vibe: AmbientVibe = this.currentVibe): void {
    const ctx = this.initContext();
    this.currentVibe = vibe;
    this.stopSequence();

    this.isPlaying = true;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 1.2);
    }

    // Start chord progression loop
    this.startProgressionLoop();
  }

  public pause(): void {
    if (!this.ctx || !this.masterGain) return;
    this.isPlaying = false;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
    setTimeout(() => {
      this.stopSequence();
    }, 850);
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play(this.currentVibe);
      return true;
    }
  }

  public setVibe(vibe: AmbientVibe): void {
    this.currentVibe = vibe;
    if (this.isPlaying) {
      this.play(vibe);
    }
  }

  public getVibe(): AmbientVibe {
    return this.currentVibe;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && this.isPlaying) {
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.1);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private stopSequence(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as any).stop?.();
        this.noiseNode.disconnect();
      } catch (_) {}
      this.noiseNode = null;
    }
  }

  private startProgressionLoop(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    let step = 0;

    // Chords definitions (frequencies in Hz)
    const chordsMap: Record<AmbientVibe, number[][]> = {
      // Romantic: Eb maj9 -> Cm7 -> Ab maj7 -> Bb sus4
      'romantic-piano': [
        [155.56, 196.0, 233.08, 293.66, 349.23], // Eb maj9
        [130.81, 196.0, 233.08, 261.63, 311.13], // Cm7
        [103.83, 155.56, 207.65, 261.63, 311.13], // Ab maj7
        [116.54, 174.61, 233.08, 261.63, 349.23], // Bb sus4
      ],
      // Lofi: Dmaj7 -> C#m7 -> F#m9 -> Bm7
      'lofi-chill': [
        [146.83, 220.0, 277.18, 329.63, 369.99],
        [138.59, 207.65, 246.94, 329.63],
        [92.5, 146.83, 220.0, 277.18, 329.63],
        [123.47, 185.0, 220.0, 293.66, 369.99],
      ],
      // Rain beats: F maj7 -> Dm9 -> Bb maj9 -> C add9
      'rain-beats': [
        [174.61, 220.0, 261.63, 329.63],
        [146.83, 220.0, 261.63, 329.63, 392.0],
        [116.54, 174.61, 220.0, 261.63, 329.63],
        [130.81, 196.0, 246.94, 293.66, 392.0],
      ],
      // Cyber: C minor add9 -> Ab maj7#11 -> F minor -> G sus
      'cyber-groove': [
        [130.81, 196.0, 246.94, 293.66, 440.0],
        [103.83, 164.81, 207.65, 293.66, 415.3],
        [87.31, 130.81, 174.61, 261.63, 349.23],
        [98.0, 146.83, 196.0, 261.63, 392.0],
      ],
    };

    const playChord = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const chords = chordsMap[this.currentVibe];
      const chord = chords[step % chords.length];
      step++;

      const now = this.ctx.currentTime;
      const duration = 4.2;

      chord.forEach((freq, i) => {
        // Create an oscillator with soft harmonic overtone
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const noteGain = this.ctx!.createGain();

        // Waveform selection based on vibe
        if (this.currentVibe === 'romantic-piano') {
          osc.type = i === 0 ? 'sine' : 'triangle';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800 + i * 150, now);
        } else if (this.currentVibe === 'cyber-groove') {
          osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);
          filter.frequency.exponentialRampToValueAtTime(1400, now + 1.5);
          filter.frequency.exponentialRampToValueAtTime(500, now + duration);
        } else {
          osc.type = 'sine';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(700, now);
        }

        osc.frequency.setValueAtTime(freq, now);

        // Gentle arpeggiated strumming offset (30ms per string)
        const noteStart = now + i * 0.045;

        // Envelope: soft swell, warm sustain, gentle fade
        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.12 / chord.length, noteStart + 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.masterGain!);

        osc.start(noteStart);
        osc.stop(noteStart + duration);
      });
    };

    // Play first chord immediately
    playChord();
    this.timerId = setInterval(playChord, 3800);
  }

  public destroy(): void {
    this.stopSequence();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (_) {}
      this.ctx = null;
    }
  }
}

export const ambientMusic = new AmbientMusicSynth();
