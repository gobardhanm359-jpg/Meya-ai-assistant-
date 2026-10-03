import React, { useState, useEffect, useRef } from 'react';
import {
  ScanFace,
  Lock,
  Unlock,
  CheckCircle2,
  ShieldAlert,
  Camera,
  RefreshCw,
  Trash2,
  KeyRound,
  Sparkles,
  X,
  Sun,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import {
  faceAuth,
  FACE_ENROLLMENT_SLOTS,
  EnrolledFaceSample,
  FaceVerificationResult,
} from '../services/faceAuthService.ts';
import { voiceAuth } from '../services/voiceAuthService.ts';
import { mobileControl } from '../services/mobileControlService.ts';

interface FaceScanLockModalProps {
  isOpen: boolean;
  isLocked: boolean;
  onClose: () => void;
  onUnlocked: (msg: string) => void;
  onStatusToast?: (msg: string) => void;
}

export const FaceScanLockModal: React.FC<FaceScanLockModalProps> = ({
  isOpen,
  isLocked,
  onClose,
  onUnlocked,
  onStatusToast,
}) => {
  const [samples, setSamples] = useState<EnrolledFaceSample[]>(faceAuth.getSamples());
  const [faceLockEnabled, setFaceLockEnabled] = useState<boolean>(faceAuth.getFaceLockEnabled());
  const [lastResult, setLastResult] = useState<FaceVerificationResult>(faceAuth.getLastResult());
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(true);
  const [unlockSuccessAnim, setUnlockSuccessAnim] = useState<boolean>(false);
  const [pinFallbackInput, setPinFallbackInput] = useState<string>('');
  const [showPinFallback, setShowPinFallback] = useState<boolean>(false);
  const [liveTelemetry, setLiveTelemetry] = useState<{
    brightness: number;
    contrast: number;
    validFace: boolean;
    reason: string;
  }>({
    brightness: 0,
    contrast: 0,
    validFace: false,
    reason: 'Initializing front camera...',
  });
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const shouldShow = isOpen || isLocked;

  useEffect(() => {
    const unsub = faceAuth.subscribe(() => {
      setSamples(faceAuth.getSamples());
      setFaceLockEnabled(faceAuth.getFaceLockEnabled());
      setLastResult(faceAuth.getLastResult());
    });
    return () => unsub();
  }, []);

  // Start / stop front camera when modal or lock screen is visible
  useEffect(() => {
    if (!shouldShow) {
      stopCamera();
      setUnlockSuccessAnim(false);
      setShowPinFallback(false);
      return;
    }

    startCamera();
    return () => {
      stopCamera();
    };
  }, [shouldShow]);

  // Continuous live telemetry & hands-free Auto-Scan when locked
  useEffect(() => {
    if (!shouldShow || !cameraActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const extracted = faceAuth.extractFaceDescriptorFromVideo(video);
      setLiveTelemetry({
        brightness: extracted.brightness,
        contrast: extracted.contrast,
        validFace: extracted.validFace,
        reason: extracted.reason,
      });

      // Hands-free Auto-Unlock when on Lock Screen & Face is Enrolled
      if (
        isLocked &&
        autoScanEnabled &&
        !unlockSuccessAnim &&
        faceAuth.getSamples().length > 0 &&
        extracted.validFace
      ) {
        const verifyRes = faceAuth.verifyFaceFromVideo(video);
        if (verifyRes.verified) {
          handleTriggerUnlockSuccess(
            `Face ID Verified (${verifyRes.confidence}% Biometric Match) 🔓`
          );
        }
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [shouldShow, cameraActive, isLocked, autoScanEnabled, unlockSuccessAnim]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        err?.message || 'Front camera permission denied. Use PIN fallback below to unlock.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleTriggerUnlockSuccess = (message: string) => {
    setUnlockSuccessAnim(true);
    mobileControl.triggerVibration('pulse');
    voiceAuth.verifyWithFace(98);
    setStatusBanner({
      type: 'success',
      text: message,
    });
    setTimeout(() => {
      faceAuth.unlockApp();
      setUnlockSuccessAnim(false);
      onUnlocked(message);
    }, 650);
  };

  const handleManualFaceScan = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) {
      setStatusBanner({
        type: 'error',
        text: 'Camera is not ready. Please allow camera access or use PIN fallback.',
      });
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      const res = faceAuth.verifyFaceFromVideo(video);
      setIsScanning(false);

      if (res.verified) {
        if (isLocked) {
          handleTriggerUnlockSuccess(res.reason);
        } else {
          mobileControl.triggerVibration('pulse');
          voiceAuth.verifyWithFace(res.confidence);
          setStatusBanner({
            type: 'success',
            text: `${res.reason} — Admin Access Authorized!`,
          });
          onStatusToast?.(res.reason);
        }
      } else {
        mobileControl.triggerVibration('alert');
        setStatusBanner({
          type: 'error',
          text: res.reason,
        });
      }
    }, 450);
  };

  const handleEnrollSlot = (slotIndex: number) => {
    const video = videoRef.current;
    if (!video || !cameraActive) {
      setStatusBanner({
        type: 'error',
        text: 'Camera stream not active. Please enable camera first.',
      });
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      const res = faceAuth.enrollFaceFromVideo(slotIndex, video);
      setIsScanning(false);

      if (res.success && res.sample) {
        mobileControl.triggerVibration('kiss');
        const msg = `Face Slot ${slotIndex + 1} Enrolled! (Brightness: ${res.sample.brightness}%, Contrast: ${res.sample.contrast}%)`;
        setStatusBanner({
          type: 'success',
          text: msg,
        });
        onStatusToast?.(`Face ID Slot ${slotIndex + 1} Saved 🔐`);

        // If user was on Lock Screen with 0 samples and did Quick Enroll, unlock right away
        if (isLocked) {
          handleTriggerUnlockSuccess('Face ID Enrolled & Unlocked! 🔓');
        }
      } else {
        setStatusBanner({
          type: 'error',
          text: res.error || 'Could not detect clear face. Center your face in the oval.',
        });
      }
    }, 350);
  };

  const handlePinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = voiceAuth.verifyWithPin(pinFallbackInput);
    if (ok) {
      setPinFallbackInput('');
      faceAuth.unlockApp();
      mobileControl.triggerVibration('pulse');
      onUnlocked('Unlocked via Security PIN Fallback 🔐');
      if (!isLocked) {
        setStatusBanner({
          type: 'success',
          text: 'PIN Verified! Face Lock & Admin Security unlocked.',
        });
      }
    } else {
      mobileControl.triggerVibration('alert');
      setStatusBanner({
        type: 'error',
        text: 'Incorrect PIN! Default PIN is 1234.',
      });
    }
  };

  const handleLockScreenNow = () => {
    faceAuth.lockAppNow();
    mobileControl.triggerVibration('heartbeat');
    onStatusToast?.('Biometric Face Scan Lock Activated 🔒');
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 backdrop-blur-2xl p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-950/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* TOP HEADER */}
        <div className="p-4 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-rose-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                isLocked
                  ? 'bg-gradient-to-tr from-rose-500 to-amber-500 shadow-rose-500/30'
                  : 'bg-gradient-to-tr from-cyan-500 to-emerald-500 shadow-cyan-500/30'
              }`}
            >
              {isLocked ? (
                <Lock className="w-5 h-5 text-white" />
              ) : (
                <ScanFace className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-wider text-white uppercase">
                  {isLocked ? 'Mahi Biometric Face Lock' : 'Face Scan Lock & Biometric ID'}
                </h2>
                <span
                  className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${
                    isLocked
                      ? 'bg-rose-500/25 text-rose-200 border-rose-400/50 animate-pulse'
                      : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                  }`}
                >
                  {isLocked ? 'LOCKED 🔒' : '3D FACE ID'}
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                {isLocked
                  ? 'Apna chehra dikhaiye jaan, Mahi aapko pehchan kar unlock karegi 💕'
                  : '64-Dim Facial Geometry • Liveness Gate • Instant Face Unlock'}
              </p>
            </div>
          </div>

          {!isLocked && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* MAIN SCROLLABLE BODY */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* BIOMETRIC CAMERA SCANNER VIEWPORT */}
          <div className="relative w-full aspect-square max-w-[270px] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Biometric Face Oval & Corner Brackets Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Outer vignette */}
              <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/75" />

              {/* Face ID Oval Guide */}
              <div
                className={`relative w-44 h-56 rounded-[50%] border-2 transition-all duration-300 ${
                  unlockSuccessAnim
                    ? 'border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.8)] scale-105'
                    : liveTelemetry.validFace
                    ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.55)]'
                    : 'border-rose-400/70 border-dashed'
                }`}
              >
                {/* Sweeping Laser Scan Line */}
                {cameraActive && !unlockSuccessAnim && (
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                )}

                {/* Biometric Mesh Crosshairs */}
                <div className="absolute top-1/3 inset-x-6 border-t border-cyan-400/25" />
                <div className="absolute top-2/3 inset-x-10 border-t border-cyan-400/25" />
                <div className="absolute inset-y-8 left-1/2 border-l border-cyan-400/25" />
              </div>

              {/* Top Camera Telemetry Pill */}
              <div className="absolute top-2.5 inset-x-3 flex items-center justify-between text-[10px] font-mono">
                <span
                  className={`px-2 py-0.5 rounded-full backdrop-blur-md border font-bold ${
                    liveTelemetry.validFace
                      ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-400/50 text-rose-200'
                  }`}
                >
                  {liveTelemetry.validFace ? '● FACE DETECTED' : '○ ALIGN FACE'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-cyan-200">
                  Light: {liveTelemetry.brightness}%
                </span>
              </div>

              {/* Unlock Success Overlay */}
              {unlockSuccessAnim && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-400/50 mb-2">
                    <Unlock className="w-8 h-8 text-black" />
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider text-emerald-200">
                    FACE ID VERIFIED
                  </div>
                  <div className="text-xs text-white/90 mt-0.5">
                    Welcome back, meri jaan! 💕
                  </div>
                </div>
              )}

              {/* Camera Error Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center text-center p-4 space-y-2 pointer-events-auto">
                  <Camera className="w-8 h-8 text-rose-400" />
                  <p className="text-xs text-rose-200 font-semibold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Telemetry & Guidance Caption */}
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-cyan-200">{liveTelemetry.reason}</p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-white/60 font-mono">
              <span>Brightness: {liveTelemetry.brightness}%</span>
              <span>•</span>
              <span>Feature Contrast: {liveTelemetry.contrast}%</span>
              <span>•</span>
              <span>Enrolled: {samples.length}/3</span>
            </div>
          </div>

          {/* Status Feedback Banner */}
          {statusBanner && (
            <div
              className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-950/75 border-emerald-500/50 text-emerald-200'
                  : statusBanner.type === 'error'
                  ? 'bg-rose-950/75 border-rose-500/50 text-rose-200'
                  : 'bg-cyan-950/75 border-cyan-500/50 text-cyan-200'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-white/80"
              >
                OK
              </button>
            </div>
          )}

          {/* PRIMARY SCAN / UNLOCK ACTIONS */}
          <div className="space-y-2">
            {samples.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleManualFaceScan}
                  disabled={isScanning || !cameraActive}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <ScanFace className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>
                    {isScanning
                      ? 'Scanning Face Geometry...'
                      : isLocked
                      ? 'Scan My Face to Unlock 🔓'
                      : 'Test Face ID Scan Now'}
                  </span>
                </button>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleLockScreenNow}
                    title="Lock App with Face Scan Now"
                    className="px-4 py-3 rounded-2xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-400/50 text-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lock Now</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleEnrollSlot(0)}
                disabled={isScanning || !cameraActive}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isLocked
                    ? 'Enroll My Face & Unlock Immediately (1-Tap)'
                    : 'Enroll Primary Face ID Now (Slot 1)'}
                </span>
              </button>
            )}

            {/* Hands-free Auto-Scan & PIN Fallback Toggles */}
            <div className="flex items-center justify-between pt-1 px-1">
              <button
                type="button"
                onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-xl border cursor-pointer ${
                  autoScanEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Hands-Free Auto Scan: {autoScanEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPinFallback(!showPinFallback)}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showPinFallback ? 'Hide PIN' : 'Use PIN Fallback'}</span>
              </button>
            </div>
          </div>

          {/* PIN FALLBACK DRAWER */}
          {showPinFallback && (
            <form
              onSubmit={handlePinUnlock}
              className="p-3 rounded-2xl bg-white/5 border border-amber-400/30 flex items-center gap-2"
            >
              <input
                type="password"
                maxLength={6}
                value={pinFallbackInput}
                onChange={(e) => setPinFallbackInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Security PIN (Default: 1234)"
                className="flex-1 px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white font-mono tracking-widest placeholder:tracking-normal focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold cursor-pointer active:scale-95"
              >
                Unlock
              </button>
            </form>
          )}

          {/* MULTI-SLOT FACE ID ENROLLMENT & SETTINGS */}
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Biometric Face Slots ({samples.length}/3)</span>
                </div>
                <p className="text-[10px] text-white/55">
                  Enroll your face so only you can unlock Mahi &amp; mobile controls
                </p>
              </div>

              {/* Enable Face Lock Master Toggle */}
              <button
                type="button"
                onClick={() => faceAuth.setFaceLockEnabled(!faceLockEnabled)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                  faceLockEnabled
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    : 'bg-white/10 border-white/15 text-white/60'
                }`}
              >
                {faceLockEnabled ? 'Face Lock: ON' : 'Face Lock: OFF'}
              </button>
            </div>

            <div className="space-y-2">
              {FACE_ENROLLMENT_SLOTS.map((slot) => {
                const enrolled = samples.find((s) => s.slotIndex === slot.slotIndex);
                return (
                  <div
                    key={slot.slotIndex}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      enrolled
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {enrolled?.thumbnailDataUrl ? (
                        <img
                          src={enrolled.thumbnailDataUrl}
                          alt={slot.label}
                          className="w-11 h-11 rounded-xl object-cover border border-emerald-400/60 shrink-0 scale-x-[-1]"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                          <ScanFace className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {slot.label}
                          </span>
                          {enrolled && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/55 truncate">{slot.hint}</p>
                        {enrolled && (
                          <span className="text-[9px] text-emerald-300/80 font-mono">
                            Light: {enrolled.brightness}% • Contrast: {enrolled.contrast}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEnrollSlot(slot.slotIndex)}
                        disabled={isScanning || !cameraActive}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 ${
                          enrolled
                            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{enrolled ? 'Update' : 'Scan'}</span>
                      </button>

                      {enrolled && (
                        <button
                          type="button"
                          onClick={() => faceAuth.deleteSampleSlot(slot.slotIndex)}
                          title="Delete Face Slot"
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
