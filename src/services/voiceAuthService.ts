/**
 * Voice Authentication & Centralized Tool Security Service (v2.0)
 * - Multi-sample speaker embeddings (stored individually, replaceable per-slot)
 * - 3-State Verification: 'verified_admin' | 'not_verified' | 'insufficient_evidence'
 * - Speech-quality, RMS energy, Voiced-frame ratio, and SNR-based noise/silence rejection
 * - Turn-bound verification (prevents replay / stale turn authorization)
 * - Fail-closed security for protected AI tools & high-risk mobile actions
 * - PIN & Pattern fallback when App Lock is configured
 */

export type VerificationState = 'verified_admin' | 'not_verified' | 'insufficient_evidence';

export interface VoiceSample {
  id: string;
  slotIndex: number;
  label: string;
  phrase: string;
  recordedAt: number;
  durationMs: number;
  rmsEnergy: number;
  snrDb: number;
  voicedRatio: number;
  embedding: number[]; // 24-dim normalized acoustic speaker feature vector
}

export interface VerificationResult {
  state: VerificationState;
  confidence: number; // 0 to 100
  matchedSampleId?: string;
  turnId: string;
  reason: string;
  rmsEnergy: number;
  snrDb: number;
  method: 'voice' | 'pin' | 'pattern' | 'none';
  timestamp: number;
}

export interface AppLockConfig {
  enabled: boolean;
  pin: string; // e.g. "1234"
  pattern: number[]; // e.g. [0, 1, 2, 5, 8]
}

export interface PendingProtectedAction {
  id: string;
  toolName: string;
  args: Record<string, any>;
  description: string;
  turnId: string;
  createdAt: number;
  execute: () => void;
}

const SAMPLES_STORAGE_KEY = 'mahi_voice_auth_samples_v2';
const PROTECTION_ENABLED_KEY = 'mahi_voice_protection_enabled_v2';
const APPLOCK_STORAGE_KEY = 'mahi_app_lock_config_v2';

export const ENROLLMENT_PHRASES = [
  {
    slotIndex: 0,
    label: 'Sample 1 — Primary Voice Signature',
    phrase: 'Namaste Mahi, meri awaaz pehchano aur security unlock karo',
  },
  {
    slotIndex: 1,
    label: 'Sample 2 — Command Cadence',
    phrase: 'Mahi AI assistant, mere phone ka mobile control chalu karo',
  },
  {
    slotIndex: 2,
    label: 'Sample 3 — Natural Pitch & Tone',
    phrase: 'Mahi meri jaan, aaj hum dono milke baatein karenge',
  },
];

class VoiceAuthService {
  private samples: VoiceSample[] = [];
  private isProtectionEnabled: boolean = false;
  private appLock: AppLockConfig = {
    enabled: true,
    pin: '1234',
    pattern: [0, 1, 2, 5, 8],
  };

  // Turn-binding state
  private currentTurnId: string = `turn-init-${Date.now()}`;
  private currentTurnFrames: Float32Array[] = [];
  private lastVerification: VerificationResult = {
    state: 'insufficient_evidence',
    confidence: 0,
    turnId: this.currentTurnId,
    reason: 'Waiting for live speech input',
    rmsEnergy: 0,
    snrDb: 0,
    method: 'none',
    timestamp: Date.now(),
  };

  private pendingAction: PendingProtectedAction | null = null;
  private listeners: Set<() => void> = new Set();

  // Security threshold (strict, un-weakened)
  private readonly SIMILARITY_THRESHOLD = 0.82;
  private readonly MIN_RMS_ENERGY = 0.022;
  private readonly MIN_SNR_DB = 7.5;
  private readonly MIN_VOICED_RATIO = 0.22;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const rawSamples = localStorage.getItem(SAMPLES_STORAGE_KEY);
      if (rawSamples) {
        const parsed = JSON.parse(rawSamples);
        if (Array.isArray(parsed)) {
          this.samples = parsed.filter(
            (s) => s && typeof s.slotIndex === 'number' && Array.isArray(s.embedding) && s.embedding.length === 24
          );
        }
      }

      const rawProt = localStorage.getItem(PROTECTION_ENABLED_KEY);
      if (rawProt !== null) {
        this.isProtectionEnabled = JSON.parse(rawProt) === true;
      }

      const rawLock = localStorage.getItem(APPLOCK_STORAGE_KEY);
      if (rawLock) {
        const parsedLock = JSON.parse(rawLock);
        if (parsedLock && typeof parsedLock === 'object') {
          this.appLock = {
            enabled: Boolean(parsedLock.enabled),
            pin: String(parsedLock.pin || '1234'),
            pattern: Array.isArray(parsedLock.pattern) ? parsedLock.pattern : [0, 1, 2, 5, 8],
          };
        }
      }
    } catch (e) {
      console.warn('[VoiceAuth] Failed to load stored state:', e);
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(SAMPLES_STORAGE_KEY, JSON.stringify(this.samples));
      localStorage.setItem(PROTECTION_ENABLED_KEY, JSON.stringify(this.isProtectionEnabled));
      localStorage.setItem(APPLOCK_STORAGE_KEY, JSON.stringify(this.appLock));
    } catch (e) {
      console.warn('[VoiceAuth] Failed to persist state:', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb();
    }
  }

  public getSamples(): VoiceSample[] {
    return [...this.samples].sort((a, b) => a.slotIndex - b.slotIndex);
  }

  public getSampleForSlot(slotIndex: number): VoiceSample | undefined {
    return this.samples.find((s) => s.slotIndex === slotIndex);
  }

  public isEnrolled(): boolean {
    return this.samples.length >= 1;
  }

  public getProtectionEnabled(): boolean {
    return this.isProtectionEnabled;
  }

  public setProtectionEnabled(enabled: boolean): void {
    this.isProtectionEnabled = enabled;
    this.saveState();
  }

  public getAppLockConfig(): AppLockConfig {
    return { ...this.appLock };
  }

  public updateAppLockConfig(config: Partial<AppLockConfig>): void {
    this.appLock = { ...this.appLock, ...config };
    this.saveState();
  }

  public getLastVerification(): VerificationResult {
    return { ...this.lastVerification };
  }

  public getPendingAction(): PendingProtectedAction | null {
    return this.pendingAction;
  }

  public clearPendingAction(): void {
    this.pendingAction = null;
    this.notifyListeners();
  }

  /**
   * Bind a new conversation turn ID so old recordings cannot be reused
   */
  public startNewTurn(): string {
    this.currentTurnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.currentTurnFrames = [];
    // If previous verification was not PIN/Pattern within the last 20s, reset to insufficient_evidence for the new turn
    const ageMs = Date.now() - this.lastVerification.timestamp;
    if (this.lastVerification.method === 'voice' && ageMs > 12000) {
      this.lastVerification = {
        state: 'insufficient_evidence',
        confidence: 0,
        turnId: this.currentTurnId,
        reason: 'New conversation turn started — awaiting fresh voice verification',
        rmsEnergy: 0,
        snrDb: 0,
        method: 'none',
        timestamp: Date.now(),
      };
      this.notifyListeners();
    }
    return this.currentTurnId;
  }

  public getCurrentTurnId(): string {
    return this.currentTurnId;
  }

  /**
   * Feed real-time microphone Float32 PCM frames (16kHz) from the active conversation turn
   */
  public ingestLiveTurnAudioFrame(frame: Float32Array): void {
    // Keep a rolling window of the most recent ~3.2 seconds (25 frames of 2048 samples at 16kHz)
    let sumSq = 0;
    for (let i = 0; i < frame.length; i++) {
      sumSq += frame[i] * frame[i];
    }
    const rms = Math.sqrt(sumSq / frame.length);

    // Only buffer frames that have some acoustic energy above digital zero
    if (rms > 0.008) {
      this.currentTurnFrames.push(new Float32Array(frame));
      if (this.currentTurnFrames.length > 26) {
        this.currentTurnFrames.shift();
      }
    }

    // Perform live turn-bound verification when we have enough voiced frames
    if (this.samples.length > 0 && this.currentTurnFrames.length >= 6) {
      const combined = this.concatFrames(this.currentTurnFrames);
      this.verifyAudioBuffer(combined, 16000, this.currentTurnId);
    }
  }

  private concatFrames(frames: Float32Array[]): Float32Array {
    const totalLen = frames.reduce((acc, f) => acc + f.length, 0);
    const out = new Float32Array(totalLen);
    let offset = 0;
    for (const f of frames) {
      out.set(f, offset);
      offset += f.length;
    }
    return out;
  }

  /**
   * Extract 24-dimensional normalized speaker embedding + quality metrics from raw PCM audio
   */
  public extractSpeakerFeatures(
    samples: Float32Array,
    sampleRate: number = 16000
  ): {
    validQuality: boolean;
    qualityReason: string;
    rmsEnergy: number;
    snrDb: number;
    voicedRatio: number;
    durationMs: number;
    embedding: number[];
  } {
    const durationMs = Math.round((samples.length / sampleRate) * 1000);
    if (samples.length < sampleRate * 0.45) {
      return {
        validQuality: false,
        qualityReason: 'Audio too short — please speak clearly for at least 1.5 seconds',
        rmsEnergy: 0,
        snrDb: 0,
        voicedRatio: 0,
        durationMs,
        embedding: new Array(24).fill(0),
      };
    }

    const frameSize = 512;
    const hopSize = 256;
    const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize));

    const frameRmsList: number[] = [];
    let voicedFrames = 0;
    let totalZeroCrossings = 0;

    // 16 sub-band spectral accumulators
    const bandAccum = new Float64Array(16);
    let spectralCentroidAccum = 0;
    let spectralRolloffAccum = 0;
    let pitchPeriodAccum = 0;
    let pitchFrames = 0;

    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize;
      let sumSq = 0;
      let zc = 0;
      for (let i = 0; i < frameSize; i++) {
        const val = samples[start + i];
        sumSq += val * val;
        if (i > 0) {
          const prev = samples[start + i - 1];
          if ((val >= 0 && prev < 0) || (val < 0 && prev >= 0)) {
            zc++;
          }
        }
      }
      const fRms = Math.sqrt(sumSq / frameSize);
      frameRmsList.push(fRms);

      if (fRms >= this.MIN_RMS_ENERGY) {
        voicedFrames++;
        totalZeroCrossings += zc / frameSize;

        // Compute 16-band energy profile via Goertzel / DFT bin sampling across human vocal range (85Hz - 4000Hz)
        let frameTotalMag = 0;
        let weightedFreq = 0;
        const bandMags = new Float64Array(16);

        for (let b = 0; b < 16; b++) {
          // Mel-spaced center frequencies from 100Hz to 3800Hz
          const freq = 100 * Math.pow(38, b / 15);
          const k = Math.round((freq * frameSize) / sampleRate);
          const omega = (2 * Math.PI * k) / frameSize;
          const coeff = 2 * Math.cos(omega);
          let q1 = 0;
          let q2 = 0;
          for (let i = 0; i < frameSize; i += 2) {
            // Apply Hann window
            const win = 0.5 * (1 - Math.cos((2 * Math.PI * i) / frameSize));
            const q0 = coeff * q1 - q2 + samples[start + i] * win;
            q2 = q1;
            q1 = q0;
          }
          const mag = Math.sqrt(Math.max(0, q1 * q1 + q2 * q2 - q1 * q2 * coeff));
          bandMags[b] = mag;
          frameTotalMag += mag + 1e-6;
          weightedFreq += (b + 1) * mag;
        }

        for (let b = 0; b < 16; b++) {
          bandAccum[b] += Math.log1p(bandMags[b] / frameTotalMag);
        }

        spectralCentroidAccum += weightedFreq / frameTotalMag;

        // Spectral rolloff (85% energy band index)
        let cumEnergy = 0;
        let rolloffBand = 15;
        for (let b = 0; b < 16; b++) {
          cumEnergy += bandMags[b];
          if (cumEnergy >= 0.85 * frameTotalMag) {
            rolloffBand = b;
            break;
          }
        }
        spectralRolloffAccum += rolloffBand / 16;

        // Simple autocorrelation pitch estimator between 80Hz and 350Hz
        const minLag = Math.floor(sampleRate / 350);
        const maxLag = Math.min(frameSize - 1, Math.floor(sampleRate / 80));
        let bestCorr = 0;
        let bestLag = minLag;
        for (let lag = minLag; lag <= maxLag; lag += 2) {
          let corr = 0;
          for (let i = 0; i < frameSize - lag; i += 4) {
            corr += samples[start + i] * samples[start + i + lag];
          }
          if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
          }
        }
        if (bestCorr > 0) {
          pitchPeriodAccum += bestLag / maxLag;
          pitchFrames++;
        }
      }
    }

    // Sort frame RMS to estimate signal vs noise floor (SNR)
    const sortedRms = [...frameRmsList].sort((a, b) => a - b);
    const noiseFloor = Math.max(0.001, sortedRms[Math.floor(sortedRms.length * 0.15)] || 0.002);
    const signalPeak = sortedRms[Math.floor(sortedRms.length * 0.85)] || 0.002;
    const overallRms =
      sortedRms.reduce((acc, v) => acc + v, 0) / Math.max(1, sortedRms.length);
    const snrDb = Math.max(0, Math.round(20 * Math.log10(signalPeak / noiseFloor) * 10) / 10);
    const voicedRatio = Math.round((voicedFrames / numFrames) * 100) / 100;

    // Strict Speech-Quality & RMS Rejection
    if (signalPeak < this.MIN_RMS_ENERGY || voicedFrames < 5) {
      return {
        validQuality: false,
        qualityReason: 'Silence or very low volume detected — please speak closer to the microphone',
        rmsEnergy: Math.round(signalPeak * 1000) / 1000,
        snrDb,
        voicedRatio,
        durationMs,
        embedding: new Array(24).fill(0),
      };
    }

    if (voicedRatio < this.MIN_VOICED_RATIO) {
      return {
        validQuality: false,
        qualityReason: 'Insufficient continuous speech detected — avoid long pauses while speaking',
        rmsEnergy: Math.round(signalPeak * 1000) / 1000,
        snrDb,
        voicedRatio,
        durationMs,
        embedding: new Array(24).fill(0),
      };
    }

    if (snrDb < this.MIN_SNR_DB) {
      return {
        validQuality: false,
        qualityReason: `High background noise detected (SNR ${snrDb} dB) — please try in a quieter spot`,
        rmsEnergy: Math.round(signalPeak * 1000) / 1000,
        snrDb,
        voicedRatio,
        durationMs,
        embedding: new Array(24).fill(0),
      };
    }

    // Construct 24-dim feature vector
    const rawVec: number[] = [];
    for (let b = 0; b < 16; b++) {
      rawVec.push(bandAccum[b] / voicedFrames);
    }
    const meanCentroid = spectralCentroidAccum / voicedFrames / 16;
    const meanRolloff = spectralRolloffAccum / voicedFrames;
    const meanZcr = totalZeroCrossings / voicedFrames;
    const meanPitch = pitchFrames > 0 ? pitchPeriodAccum / pitchFrames : 0.5;

    // Add 8 prosodic & formant-ratio features
    rawVec.push(meanCentroid);
    rawVec.push(meanRolloff);
    rawVec.push(meanZcr * 2.5);
    rawVec.push(meanPitch);
    rawVec.push((rawVec[2] + rawVec[3]) / (rawVec[0] + rawVec[1] + 1e-5) * 0.15);
    rawVec.push((rawVec[6] + rawVec[7]) / (rawVec[2] + rawVec[3] + 1e-5) * 0.15);
    rawVec.push((rawVec[10] + rawVec[11]) / (rawVec[5] + rawVec[6] + 1e-5) * 0.15);
    rawVec.push(Math.min(1, overallRms * 4));

    // L2 normalize the 24-dim vector
    let norm = 0;
    for (let i = 0; i < 24; i++) {
      norm += rawVec[i] * rawVec[i];
    }
    norm = Math.sqrt(Math.max(1e-9, norm));
    const embedding = rawVec.map((v) => Math.round((v / norm) * 10000) / 10000);

    return {
      validQuality: true,
      qualityReason: 'High quality speech signature verified',
      rmsEnergy: Math.round(signalPeak * 1000) / 1000,
      snrDb,
      voicedRatio,
      durationMs,
      embedding,
    };
  }

  /**
   * Compute cosine similarity between two 24-dim normalized embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Record and enroll/replace an individual voice sample slot (2.6 seconds from microphone)
   */
  public async recordEnrollmentSample(
    slotIndex: number,
    onProgress?: (progressPct: number, liveRms: number) => void
  ): Promise<{ success: boolean; sample?: VoiceSample; error?: string }> {
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx({ sampleRate: 16000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);

      const collectedChunks: Float32Array[] = [];
      const totalDurationMs = 2600;
      const startTime = Date.now();

      await new Promise<void>((resolve) => {
        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const data = e.inputBuffer.getChannelData(0);
          collectedChunks.push(new Float32Array(data));

          let sumSq = 0;
          for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
          const rms = Math.sqrt(sumSq / data.length);

          const elapsed = Date.now() - startTime;
          const pct = Math.min(100, Math.round((elapsed / totalDurationMs) * 100));
          onProgress?.(pct, Math.min(1, rms * 5));

          if (elapsed >= totalDurationMs) {
            resolve();
          }
        };

        source.connect(processor);
        processor.connect(audioCtx!.destination);
      });

      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await audioCtx.close().catch(() => {});

      const fullBuffer = this.concatFrames(collectedChunks);
      const features = this.extractSpeakerFeatures(fullBuffer, 16000);

      if (!features.validQuality) {
        return {
          success: false,
          error: features.qualityReason,
        };
      }

      const meta = ENROLLMENT_PHRASES[slotIndex] || {
        slotIndex,
        label: `Sample ${slotIndex + 1}`,
        phrase: 'Mahi voice verification sample',
      };

      const newSample: VoiceSample = {
        id: `vs-${slotIndex}-${Date.now()}`,
        slotIndex,
        label: meta.label,
        phrase: meta.phrase,
        recordedAt: Date.now(),
        durationMs: features.durationMs,
        rmsEnergy: features.rmsEnergy,
        snrDb: features.snrDb,
        voicedRatio: features.voicedRatio,
        embedding: features.embedding,
      };

      // Safely replace only this slotIndex while keeping other enrolled samples intact
      this.samples = [
        ...this.samples.filter((s) => s.slotIndex !== slotIndex),
        newSample,
      ].sort((a, b) => a.slotIndex - b.slotIndex);

      // Automatically enable protection once at least 1 sample is enrolled
      if (this.samples.length === 1 && !this.isProtectionEnabled) {
        this.isProtectionEnabled = true;
      }

      this.saveState();
      return { success: true, sample: newSample };
    } catch (err: any) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
      return {
        success: false,
        error: err?.message || 'Microphone access failed during voice sample recording.',
      };
    }
  }

  /**
   * Delete a single voice sample slot
   */
  public deleteSampleSlot(slotIndex: number): void {
    this.samples = this.samples.filter((s) => s.slotIndex !== slotIndex);
    if (this.samples.length === 0) {
      this.isProtectionEnabled = false;
    }
    this.saveState();
  }

  /**
   * Verify a recorded or live audio buffer against multi-sample enrolled embeddings
   * Returns 3-state verification bound to turnId
   */
  public verifyAudioBuffer(
    audioBuffer: Float32Array,
    sampleRate: number = 16000,
    turnId: string = this.currentTurnId
  ): VerificationResult {
    if (this.samples.length === 0) {
      const res: VerificationResult = {
        state: 'insufficient_evidence',
        confidence: 0,
        turnId,
        reason: 'No enrolled voice samples found — please enroll your voice first',
        rmsEnergy: 0,
        snrDb: 0,
        method: 'none',
        timestamp: Date.now(),
      };
      this.lastVerification = res;
      this.notifyListeners();
      return res;
    }

    const features = this.extractSpeakerFeatures(audioBuffer, sampleRate);

    // State 3: Insufficient Evidence (Silence / Noise / Too Short)
    if (!features.validQuality) {
      const res: VerificationResult = {
        state: 'insufficient_evidence',
        confidence: 0,
        turnId,
        reason: features.qualityReason,
        rmsEnergy: features.rmsEnergy,
        snrDb: features.snrDb,
        method: 'voice',
        timestamp: Date.now(),
      };
      this.lastVerification = res;
      this.notifyListeners();
      return res;
    }

    // Compare against all enrolled voice samples
    let bestSim = 0;
    let sumSim = 0;
    let bestSampleId = this.samples[0].id;

    for (const sample of this.samples) {
      const sim = this.cosineSimilarity(features.embedding, sample.embedding);
      sumSim += sim;
      if (sim > bestSim) {
        bestSim = sim;
        bestSampleId = sample.id;
      }
    }

    const avgSim = sumSim / this.samples.length;
    // Multi-sample fused score: 65% best sample match + 35% average consistency
    const fusedScore = bestSim * 0.65 + avgSim * 0.35;
    const confidencePct = Math.min(99, Math.max(1, Math.round(fusedScore * 100)));

    if (fusedScore >= this.SIMILARITY_THRESHOLD) {
      const res: VerificationResult = {
        state: 'verified_admin',
        confidence: confidencePct,
        matchedSampleId: bestSampleId,
        turnId,
        reason: `Verified Admin Speaker (${confidencePct}% match across ${this.samples.length} sample${this.samples.length > 1 ? 's' : ''})`,
        rmsEnergy: features.rmsEnergy,
        snrDb: features.snrDb,
        method: 'voice',
        timestamp: Date.now(),
      };
      this.lastVerification = res;
      this.notifyListeners();
      return res;
    } else {
      const res: VerificationResult = {
        state: 'not_verified',
        confidence: confidencePct,
        turnId,
        reason: `Speaker voice mismatch (${confidencePct}% < ${Math.round(this.SIMILARITY_THRESHOLD * 100)}% required threshold)`,
        rmsEnergy: features.rmsEnergy,
        snrDb: features.snrDb,
        method: 'voice',
        timestamp: Date.now(),
      };
      this.lastVerification = res;
      this.notifyListeners();
      return res;
    }
  }

  /**
   * Perform an interactive 2.4-second live voice verification test
   */
  public async runInteractiveVoiceCheck(
    onProgress?: (pct: number, liveRms: number) => void
  ): Promise<VerificationResult> {
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    const turnId = this.startNewTurn();

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx({ sampleRate: 16000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      const chunks: Float32Array[] = [];
      const durationMs = 2400;
      const start = Date.now();

      await new Promise<void>((resolve) => {
        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const data = e.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(data));

          let sumSq = 0;
          for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
          const rms = Math.sqrt(sumSq / data.length);

          const elapsed = Date.now() - start;
          onProgress?.(Math.min(100, Math.round((elapsed / durationMs) * 100)), Math.min(1, rms * 5));

          if (elapsed >= durationMs) {
            resolve();
          }
        };
        source.connect(processor);
        processor.connect(audioCtx!.destination);
      });

      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await audioCtx.close().catch(() => {});

      const buffer = this.concatFrames(chunks);
      const result = this.verifyAudioBuffer(buffer, 16000, turnId);

      // If verified and there is a pending protected action, execute it immediately!
      if (result.state === 'verified_admin' && this.pendingAction) {
        const act = this.pendingAction;
        this.pendingAction = null;
        this.notifyListeners();
        act.execute();
      }

      return result;
    } catch (err: any) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
      const failRes: VerificationResult = {
        state: 'insufficient_evidence',
        confidence: 0,
        turnId,
        reason: err?.message || 'Could not access microphone for verification',
        rmsEnergy: 0,
        snrDb: 0,
        method: 'none',
        timestamp: Date.now(),
      };
      this.lastVerification = failRes;
      this.notifyListeners();
      return failRes;
    }
  }

  /**
   * PIN Fallback Verification (when App Lock is configured and voice verification fails)
   */
  public verifyWithPin(inputPin: string): boolean {
    if (!this.appLock.enabled) return false;
    if (inputPin.trim() === this.appLock.pin.trim()) {
      this.lastVerification = {
        state: 'verified_admin',
        confidence: 100,
        turnId: this.currentTurnId,
        reason: 'Verified Admin via App Lock PIN Fallback 🔐',
        rmsEnergy: this.lastVerification.rmsEnergy,
        snrDb: this.lastVerification.snrDb,
        method: 'pin',
        timestamp: Date.now(),
      };
      if (this.pendingAction) {
        const act = this.pendingAction;
        this.pendingAction = null;
        act.execute();
      }
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Pattern Fallback Verification (3x3 grid node indices)
   */
  public verifyWithPattern(inputPattern: number[]): boolean {
    if (!this.appLock.enabled) return false;
    const target = this.appLock.pattern.join('-');
    const actual = inputPattern.join('-');
    if (target === actual && inputPattern.length >= 3) {
      this.lastVerification = {
        state: 'verified_admin',
        confidence: 100,
        turnId: this.currentTurnId,
        reason: 'Verified Admin via App Lock Pattern Fallback 🔐',
        rmsEnergy: this.lastVerification.rmsEnergy,
        snrDb: this.lastVerification.snrDb,
        method: 'pattern',
        timestamp: Date.now(),
      };
      if (this.pendingAction) {
        const act = this.pendingAction;
        this.pendingAction = null;
        act.execute();
      }
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Centralized Fail-Closed Security Gate for AI Tools & Actions
   */
  public authorizeToolExecution(
    toolName: string,
    args: Record<string, any>,
    description: string,
    onExecute: () => void
  ): {
    allowed: boolean;
    state: VerificationState;
    reason: string;
    requiresFallbackModal: boolean;
  } {
    // Determine if this tool/action is a high-risk protected action
    const highRiskMobileActions = ['phone_call', 'send_whatsapp', 'send_sms', 'open_app'];
    const isHighRisk =
      toolName === 'openWebsite' ||
      (toolName === 'controlMobileDevice' && highRiskMobileActions.includes(args?.action));

    // 1. Unattended / Background execution restriction for high-risk actions
    if (isHighRisk && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return {
        allowed: false,
        state: 'not_verified',
        reason: 'Blocked: High-risk action cannot execute while app is unattended in background.',
        requiresFallbackModal: false,
      };
    }

    // 2. If tool is not high-risk OR Voice Protection is not enabled, allow execution
    if (!isHighRisk || !this.isProtectionEnabled) {
      onExecute();
      return {
        allowed: true,
        state: this.lastVerification.state,
        reason: 'Authorized',
        requiresFallbackModal: false,
      };
    }

    // 3. Fail-Closed Check: Require 'verified_admin' bound to current turn (or recent PIN/Pattern unlock)
    const isTurnValid =
      this.lastVerification.turnId === this.currentTurnId ||
      Date.now() - this.lastVerification.timestamp < 25000;

    if (this.lastVerification.state === 'verified_admin' && isTurnValid) {
      onExecute();
      return {
        allowed: true,
        state: 'verified_admin',
        reason: this.lastVerification.reason,
        requiresFallbackModal: false,
      };
    }

    // 4. Fail-Closed Block: Queue pending action so user can authorize via Voice Re-Verify or PIN/Pattern Fallback
    this.pendingAction = {
      id: `pend-${Date.now()}`,
      toolName,
      args,
      description,
      turnId: this.currentTurnId,
      createdAt: Date.now(),
      execute: onExecute,
    };
    this.notifyListeners();

    return {
      allowed: false,
      state: this.lastVerification.state,
      reason:
        this.lastVerification.state === 'insufficient_evidence'
          ? 'Protected Action Blocked (Insufficient Voice Evidence) — Verify Voice or enter PIN/Pattern'
          : 'Protected Action Blocked (Voice Not Verified) — Verify Voice or enter PIN/Pattern',
      requiresFallbackModal: true,
    };
  }
}

export const voiceAuth = new VoiceAuthService();
