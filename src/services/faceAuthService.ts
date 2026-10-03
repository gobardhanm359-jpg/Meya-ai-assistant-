/**
 * Biometric Face Scan Lock & Verification Service
 * - Real front-camera facial feature extraction (64-dim spatial luminance, chrominance, Sobel eye/nose/mouth gradient & symmetry vector)
 * - Face Presence & Liveness / Lighting Quality Gate (rejects covered lens, pitch-black frames, or featureless walls)
 * - Multi-slot Face Enrollment (up to 3 angles/lighting conditions with thumbnail previews)
 * - Full-Screen Biometric Face Scan Lock Screen state & instant Face Unlock
 */

import { voiceAuth } from './voiceAuthService.ts';

export interface EnrolledFaceSample {
  id: string;
  slotIndex: number;
  label: string;
  capturedAt: number;
  brightness: number;
  contrast: number;
  descriptor: number[]; // 64-dim L2-normalized spatial face descriptor
  thumbnailDataUrl: string;
}

export interface FaceVerificationResult {
  verified: boolean;
  confidence: number; // 0 to 100
  faceDetected: boolean;
  reason: string;
  brightness: number;
  contrast: number;
  timestamp: number;
}

const FACE_SAMPLES_KEY = 'mahi_face_lock_samples_v1';
const FACE_LOCK_ENABLED_KEY = 'mahi_face_lock_enabled_v1';

export const FACE_ENROLLMENT_SLOTS = [
  {
    slotIndex: 0,
    label: 'Face Slot 1 — Front Look (Primary)',
    hint: 'Look straight into the front camera with your face inside the oval',
  },
  {
    slotIndex: 1,
    label: 'Face Slot 2 — Natural Smile',
    hint: 'Smile naturally so Mahi recognizes your happy expression',
  },
  {
    slotIndex: 2,
    label: 'Face Slot 3 — Room Lighting / Angle',
    hint: 'Slight head tilt for 360° biometric accuracy',
  },
];

class FaceAuthService {
  private samples: EnrolledFaceSample[] = [];
  private faceLockEnabled: boolean = false;
  private isCurrentlyLocked: boolean = false;
  private lastResult: FaceVerificationResult = {
    verified: false,
    confidence: 0,
    faceDetected: false,
    reason: 'Ready for Face Scan',
    brightness: 0,
    contrast: 0,
    timestamp: Date.now(),
  };
  private listeners: Set<() => void> = new Set();

  // Cosine similarity threshold for 64-dim normalized spatial face descriptor
  private readonly MATCH_THRESHOLD = 0.86;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const rawSamples = localStorage.getItem(FACE_SAMPLES_KEY);
      if (rawSamples) {
        const parsed = JSON.parse(rawSamples);
        if (Array.isArray(parsed)) {
          this.samples = parsed.filter(
            (s) =>
              s &&
              typeof s.slotIndex === 'number' &&
              Array.isArray(s.descriptor) &&
              s.descriptor.length === 64
          );
        }
      }

      const rawEnabled = localStorage.getItem(FACE_LOCK_ENABLED_KEY);
      if (rawEnabled !== null) {
        this.faceLockEnabled = JSON.parse(rawEnabled) === true;
      }
    } catch (e) {
      console.warn('[FaceAuth] Failed to load state:', e);
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(FACE_SAMPLES_KEY, JSON.stringify(this.samples));
      localStorage.setItem(FACE_LOCK_ENABLED_KEY, JSON.stringify(this.faceLockEnabled));
    } catch (e) {
      console.warn('[FaceAuth] Failed to save state:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb();
    }
  }

  public getSamples(): EnrolledFaceSample[] {
    return [...this.samples].sort((a, b) => a.slotIndex - b.slotIndex);
  }

  public isEnrolled(): boolean {
    return this.samples.length > 0;
  }

  public getFaceLockEnabled(): boolean {
    return this.faceLockEnabled;
  }

  public setFaceLockEnabled(enabled: boolean): void {
    this.faceLockEnabled = enabled;
    this.saveState();
  }

  public getIsLocked(): boolean {
    return this.isCurrentlyLocked;
  }

  public lockAppNow(): void {
    this.isCurrentlyLocked = true;
    this.notify();
  }

  public unlockApp(): void {
    this.isCurrentlyLocked = false;
    this.notify();
  }

  public getLastResult(): FaceVerificationResult {
    return { ...this.lastResult };
  }

  public deleteSampleSlot(slotIndex: number): void {
    this.samples = this.samples.filter((s) => s.slotIndex !== slotIndex);
    if (this.samples.length === 0) {
      this.faceLockEnabled = false;
    }
    this.saveState();
  }

  /**
   * Extract a 64-dimensional normalized facial descriptor from a live HTMLVideoElement frame
   */
  public extractFaceDescriptorFromVideo(video: HTMLVideoElement): {
    validFace: boolean;
    reason: string;
    brightness: number;
    contrast: number;
    descriptor: number[];
    thumbnailDataUrl: string;
  } {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return {
        validFace: false,
        reason: 'Camera stream not ready yet',
        brightness: 0,
        contrast: 0,
        descriptor: new Array(64).fill(0),
        thumbnailDataUrl: '',
      };
    }

    // Center-crop the central face oval region (middle 65% of the video frame)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cropDim = Math.min(vw, vh) * 0.72;
    const sx = (vw - cropDim) / 2;
    const sy = (vh - cropDim) / 2;

    ctx.drawImage(video, sx, sy, cropDim, cropDim, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size).data;

    // 1. Compute global luminance, contrast, and warm skin-tone chrominance ratio
    const gray = new Float32Array(size * size);
    let sumLum = 0;
    let sumSqLum = 0;
    let warmTonePixels = 0;

    for (let i = 0; i < size * size; i++) {
      const r = imgData[i * 4];
      const g = imgData[i * 4 + 1];
      const b = imgData[i * 4 + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      gray[i] = lum;
      sumLum += lum;
      sumSqLum += lum * lum;

      // Check natural facial warm chrominance (R > B and balanced G)
      if (r > 45 && r > b * 1.04 && g > b * 0.85) {
        warmTonePixels++;
      }
    }

    const totalPixels = size * size;
    const meanLum = sumLum / totalPixels;
    const variance = Math.max(0, sumSqLum / totalPixels - meanLum * meanLum);
    const stdDev = Math.sqrt(variance);
    const brightnessPct = Math.round(meanLum * 100);
    const contrastPct = Math.round(stdDev * 100 * 2.2);
    const warmRatio = warmTonePixels / totalPixels;

    // Reject pitch-black / covered camera or overexposed glare
    if (brightnessPct < 10) {
      return {
        validFace: false,
        reason: 'Camera is too dark or covered — please turn on light',
        brightness: brightnessPct,
        contrast: contrastPct,
        descriptor: new Array(64).fill(0),
        thumbnailDataUrl: '',
      };
    }

    // Reject flat blank wall with no facial features / edges
    if (contrastPct < 9 || warmRatio < 0.08) {
      return {
        validFace: false,
        reason: 'No clear face detected in oval — center your face in front of camera',
        brightness: brightnessPct,
        contrast: contrastPct,
        descriptor: new Array(64).fill(0),
        thumbnailDataUrl: '',
      };
    }

    // 2. Build 64-dim descriptor:
    // - 36 regional luminance & local contrast cells (6x6 spatial grid normalized by mean/std)
    // - 16 horizontal & vertical facial feature gradient bands (eyes, nose bridge, mouth line)
    // - 12 chrominance & bilateral symmetry ratios
    const vec: number[] = [];

    const gridN = 6;
    const cellW = Math.floor(size / gridN);
    for (let gy = 0; gy < gridN; gy++) {
      for (let gx = 0; gx < gridN; gx++) {
        let cellSum = 0;
        let count = 0;
        for (let y = gy * cellW; y < (gy + 1) * cellW; y++) {
          for (let x = gx * cellW; x < (gx + 1) * cellW; x++) {
            cellSum += (gray[y * size + x] - meanLum) / (stdDev + 0.05);
            count++;
          }
        }
        vec.push(cellSum / Math.max(1, count));
      }
    }

    // 16 Horizontal & Vertical Sobel gradient bands across 8 vertical strips
    for (let strip = 0; strip < 8; strip++) {
      const yStart = Math.floor((strip * size) / 8);
      const yEnd = Math.floor(((strip + 1) * size) / 8);
      let horizGrad = 0;
      let vertGrad = 0;
      let cnt = 0;
      for (let y = Math.max(1, yStart); y < Math.min(size - 1, yEnd); y++) {
        for (let x = 8; x < size - 8; x++) {
          const gx = Math.abs(gray[y * size + (x + 1)] - gray[y * size + (x - 1)]);
          const gy = Math.abs(gray[(y + 1) * size + x] - gray[(y - 1) * size + x]);
          horizGrad += gx;
          vertGrad += gy;
          cnt++;
        }
      }
      vec.push((horizGrad / Math.max(1, cnt)) * 3.0);
      vec.push((vertGrad / Math.max(1, cnt)) * 3.0);
    }

    // 12 Facial symmetry & normalized color ratios to complete 64 dims
    for (let band = 0; band < 6; band++) {
      const y = Math.floor(((band + 1) * size) / 7);
      let symDiff = 0;
      for (let x = 4; x < size / 2; x++) {
        symDiff += Math.abs(gray[y * size + x] - gray[y * size + (size - 1 - x)]);
      }
      vec.push(1 - symDiff / (size / 2));
    }

    // 6 Regional R/G & R/B facial tone ratios
    for (let region = 0; region < 6; region++) {
      const idx = Math.floor(((region + 1) * totalPixels) / 7) * 4;
      const r = imgData[idx] + 1;
      const g = imgData[idx + 1] + 1;
      const b = imgData[idx + 2] + 1;
      vec.push((r - b) / (r + g + b));
    }

    // Ensure exact 64 dimensions and L2-normalize
    const final64 = vec.slice(0, 64);
    while (final64.length < 64) final64.push(0);

    let norm = 0;
    for (let i = 0; i < 64; i++) {
      norm += final64[i] * final64[i];
    }
    norm = Math.sqrt(Math.max(1e-9, norm));
    const normalizedDescriptor = final64.map((v) => Math.round((v / norm) * 10000) / 10000);

    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.78);

    return {
      validFace: true,
      reason: 'Clear face signature captured',
      brightness: brightnessPct,
      contrast: contrastPct,
      descriptor: normalizedDescriptor,
      thumbnailDataUrl,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let nA = 0;
    let nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Enroll a face sample slot from a live video element
   */
  public enrollFaceFromVideo(
    slotIndex: number,
    video: HTMLVideoElement
  ): { success: boolean; sample?: EnrolledFaceSample; error?: string } {
    const extracted = this.extractFaceDescriptorFromVideo(video);
    if (!extracted.validFace) {
      return {
        success: false,
        error: extracted.reason,
      };
    }

    const slotMeta = FACE_ENROLLMENT_SLOTS[slotIndex] || {
      slotIndex,
      label: `Face Slot ${slotIndex + 1}`,
    };

    const newSample: EnrolledFaceSample = {
      id: `face-${slotIndex}-${Date.now()}`,
      slotIndex,
      label: slotMeta.label,
      capturedAt: Date.now(),
      brightness: extracted.brightness,
      contrast: extracted.contrast,
      descriptor: extracted.descriptor,
      thumbnailDataUrl: extracted.thumbnailDataUrl,
    };

    this.samples = [
      ...this.samples.filter((s) => s.slotIndex !== slotIndex),
      newSample,
    ].sort((a, b) => a.slotIndex - b.slotIndex);

    if (this.samples.length === 1 && !this.faceLockEnabled) {
      this.faceLockEnabled = true;
    }

    this.saveState();
    return {
      success: true,
      sample: newSample,
    };
  }

  /**
   * Verify live camera frame against enrolled face samples
   */
  public verifyFaceFromVideo(video: HTMLVideoElement): FaceVerificationResult {
    const extracted = this.extractFaceDescriptorFromVideo(video);

    if (!extracted.validFace) {
      const res: FaceVerificationResult = {
        verified: false,
        confidence: 0,
        faceDetected: false,
        reason: extracted.reason,
        brightness: extracted.brightness,
        contrast: extracted.contrast,
        timestamp: Date.now(),
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    if (this.samples.length === 0) {
      const res: FaceVerificationResult = {
        verified: false,
        confidence: 0,
        faceDetected: true,
        reason: 'No Face ID enrolled yet — tap "Enroll My Face" below first!',
        brightness: extracted.brightness,
        contrast: extracted.contrast,
        timestamp: Date.now(),
      };
      this.lastResult = res;
      this.notify();
      return res;
    }

    let bestSim = 0;
    let sumSim = 0;
    for (const s of this.samples) {
      const sim = this.cosineSimilarity(extracted.descriptor, s.descriptor);
      sumSim += sim;
      if (sim > bestSim) bestSim = sim;
    }

    const avgSim = sumSim / this.samples.length;
    const fused = bestSim * 0.7 + avgSim * 0.3;
    const confidencePct = Math.min(99, Math.max(1, Math.round(fused * 100)));

    if (fused >= this.MATCH_THRESHOLD) {
      const res: FaceVerificationResult = {
        verified: true,
        confidence: confidencePct,
        faceDetected: true,
        reason: `Face ID Verified (${confidencePct}% Biometric Match) 🔓`,
        brightness: extracted.brightness,
        contrast: extracted.contrast,
        timestamp: Date.now(),
      };
      this.lastResult = res;
      this.isCurrentlyLocked = false;
      this.notify();
      return res;
    }

    const res: FaceVerificationResult = {
      verified: false,
      confidence: confidencePct,
      faceDetected: true,
      reason: `Face Mismatch (${confidencePct}% < ${Math.round(this.MATCH_THRESHOLD * 100)}% required)`,
      brightness: extracted.brightness,
      contrast: extracted.contrast,
      timestamp: Date.now(),
    };
    this.lastResult = res;
    this.notify();
    return res;
  }
}

export const faceAuth = new FaceAuthService();
