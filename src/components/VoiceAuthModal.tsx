import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Mic,
  Lock,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  X,
  Accessibility,
  Brain,
  Plus,
  Play,
  Sparkles,
  Grid,
} from 'lucide-react';
import {
  voiceAuth,
  ENROLLMENT_PHRASES,
  VoiceSample,
  VerificationResult,
  PendingProtectedAction,
} from '../services/voiceAuthService.ts';
import {
  accessibilityService,
  AccessibilityTelemetry,
} from '../services/accessibilityService.ts';
import {
  conversationMemory,
  LongTermMemoryItem,
  PERSONA_PROFILES,
  MahiPersonaMode,
} from '../services/conversationMemoryService.ts';

interface VoiceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchPersona?: (mode: MahiPersonaMode) => void;
  onStatusToast?: (msg: string) => void;
  initialTab?: 'verify_enroll' | 'pin_pattern' | 'accessibility_memory';
}

export const VoiceAuthModal: React.FC<VoiceAuthModalProps> = ({
  isOpen,
  onClose,
  onSwitchPersona,
  onStatusToast,
  initialTab = 'verify_enroll',
}) => {
  const [activeTab, setActiveTab] = useState<'verify_enroll' | 'pin_pattern' | 'accessibility_memory'>(initialTab);
  const [samples, setSamples] = useState<VoiceSample[]>(voiceAuth.getSamples());
  const [protectionEnabled, setProtectionEnabled] = useState<boolean>(voiceAuth.getProtectionEnabled());
  const [verification, setVerification] = useState<VerificationResult>(voiceAuth.getLastVerification());
  const [pendingAction, setPendingAction] = useState<PendingProtectedAction | null>(voiceAuth.getPendingAction());

  // Recording / Verification progress state (no stuck spinners)
  const [recordingSlot, setRecordingSlot] = useState<number | null>(null);
  const [isVerifyingVoice, setIsVerifyingVoice] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [liveRms, setLiveRms] = useState<number>(0);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // PIN & Pattern Fallback state
  const [pinInput, setPinInput] = useState<string>('');
  const [patternInput, setPatternInput] = useState<number[]>([]);
  const [newPinConfig, setNewPinConfig] = useState<string>(voiceAuth.getAppLockConfig().pin);
  const [isEditingPin, setIsEditingPin] = useState<boolean>(false);

  // Accessibility & Memory state
  const [accTelemetry, setAccTelemetry] = useState<AccessibilityTelemetry>(
    accessibilityService.getTelemetry()
  );
  const [longTermMemories, setLongTermMemories] = useState<LongTermMemoryItem[]>(
    conversationMemory.getLongTermMemories()
  );
  const [newMemoryFact, setNewMemoryFact] = useState<string>('');
  const [personaMode, setPersonaMode] = useState<MahiPersonaMode>(
    conversationMemory.getPersonaMode()
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSamples(voiceAuth.getSamples());
      setProtectionEnabled(voiceAuth.getProtectionEnabled());
      setVerification(voiceAuth.getLastVerification());
      setPendingAction(voiceAuth.getPendingAction());
      setAccTelemetry(accessibilityService.getTelemetry());
      setLongTermMemories(conversationMemory.getLongTermMemories());
      setPersonaMode(conversationMemory.getPersonaMode());
      setFeedbackBanner(null);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsubVoice = voiceAuth.subscribe(() => {
      setSamples(voiceAuth.getSamples());
      setProtectionEnabled(voiceAuth.getProtectionEnabled());
      setVerification(voiceAuth.getLastVerification());
      setPendingAction(voiceAuth.getPendingAction());
    });
    const unsubAcc = accessibilityService.subscribe((tel) => {
      setAccTelemetry(tel);
    });
    const unsubMem = conversationMemory.subscribe(() => {
      setLongTermMemories(conversationMemory.getLongTermMemories());
      setPersonaMode(conversationMemory.getPersonaMode());
    });
    return () => {
      unsubVoice();
      unsubAcc();
      unsubMem();
    };
  }, []);

  if (!isOpen) return null;

  const handleRecordSampleSlot = async (slotIndex: number) => {
    if (recordingSlot !== null || isVerifyingVoice) return;
    setRecordingSlot(slotIndex);
    setProgressPct(0);
    setLiveRms(0);
    setFeedbackBanner({
      type: 'info',
      text: `Recording Sample ${slotIndex + 1}... Please read the phrase clearly in Hindi.`,
    });

    const res = await voiceAuth.recordEnrollmentSample(slotIndex, (pct, rms) => {
      setProgressPct(pct);
      setLiveRms(rms);
    });

    setRecordingSlot(null);
    setProgressPct(0);
    setLiveRms(0);

    if (res.success && res.sample) {
      setFeedbackBanner({
        type: 'success',
        text: `Sample ${slotIndex + 1} saved! (RMS: ${res.sample.rmsEnergy}, SNR: ${res.sample.snrDb} dB)`,
      });
      onStatusToast?.(`Voice Sample ${slotIndex + 1} enrolled successfully 🔐`);
    } else {
      setFeedbackBanner({
        type: 'error',
        text: res.error || 'Sample rejected due to low audio quality or noise.',
      });
    }
  };

  const handleLiveVoiceVerify = async () => {
    if (recordingSlot !== null || isVerifyingVoice) return;
    setIsVerifyingVoice(true);
    setProgressPct(0);
    setLiveRms(0);
    setFeedbackBanner({
      type: 'info',
      text: 'Listening for 2.4s... Speak naturally to verify your identity.',
    });

    const res = await voiceAuth.runInteractiveVoiceCheck((pct, rms) => {
      setProgressPct(pct);
      setLiveRms(rms);
    });

    setIsVerifyingVoice(false);
    setProgressPct(0);
    setLiveRms(0);

    if (res.state === 'verified_admin') {
      setFeedbackBanner({
        type: 'success',
        text: res.reason,
      });
      onStatusToast?.('Voice Verified: Admin Access Granted 🔐');
    } else if (res.state === 'insufficient_evidence') {
      setFeedbackBanner({
        type: 'error',
        text: `Insufficient Evidence: ${res.reason}`,
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        text: `Not Verified: ${res.reason}. Use PIN/Pattern fallback if needed.`,
      });
    }
  };

  const handlePinUnlock = () => {
    const ok = voiceAuth.verifyWithPin(pinInput);
    if (ok) {
      setPinInput('');
      setFeedbackBanner({
        type: 'success',
        text: 'Unlocked via App Lock PIN Fallback! Protected actions authorized.',
      });
      onStatusToast?.('Admin Verified via PIN Fallback 🔐');
    } else {
      setFeedbackBanner({
        type: 'error',
        text: 'Incorrect PIN. Default PIN is 1234 unless changed below.',
      });
    }
  };

  const handleTogglePatternNode = (nodeIdx: number) => {
    setPatternInput((prev) => (prev.includes(nodeIdx) ? prev : [...prev, nodeIdx]));
  };

  const handlePatternUnlock = () => {
    const ok = voiceAuth.verifyWithPattern(patternInput);
    if (ok) {
      setPatternInput([]);
      setFeedbackBanner({
        type: 'success',
        text: 'Unlocked via App Lock Pattern Fallback! Protected actions authorized.',
      });
      onStatusToast?.('Admin Verified via Pattern Fallback 🔐');
    } else {
      setPatternInput([]);
      setFeedbackBanner({
        type: 'error',
        text: 'Pattern did not match enrolled pattern (Default: Top-Left → Top-Right → Bottom-Right: 1-2-3-6-9).',
      });
    }
  };

  const handleSaveNewPin = () => {
    if (newPinConfig.trim().length < 4) {
      setFeedbackBanner({
        type: 'error',
        text: 'PIN must be at least 4 digits.',
      });
      return;
    }
    voiceAuth.updateAppLockConfig({ pin: newPinConfig.trim(), enabled: true });
    setIsEditingPin(false);
    setFeedbackBanner({
      type: 'success',
      text: 'App Lock Fallback PIN updated successfully!',
    });
  };

  const handleAddMemoryFact = () => {
    if (!newMemoryFact.trim()) return;
    conversationMemory.addLongTermMemory(newMemoryFact.trim(), 'relationship');
    setNewMemoryFact('');
    onStatusToast?.('Saved to Long-Term Memory 🧠');
  };

  // 3-State Verification Badge UI
  const renderVerificationStateBadge = () => {
    if (verification.state === 'verified_admin') {
      return (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  STATE: VERIFIED ADMIN
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 font-mono font-bold">
                  {verification.confidence}%
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5">{verification.reason}</p>
              <p className="text-[9px] text-emerald-300/70 font-mono mt-0.5">
                Turn-Bound ID: {verification.turnId.slice(0, 18)} • Method: {verification.method.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (verification.state === 'not_verified') {
      return (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/25 border border-rose-400/50 flex items-center justify-center text-rose-300 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                  STATE: NOT VERIFIED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-100 font-mono font-bold">
                  {verification.confidence}% Match
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5">{verification.reason}</p>
              <p className="text-[9px] text-rose-300/70 font-mono mt-0.5">
                Fail-Closed Protection Active • Use Voice Check or PIN/Pattern Fallback
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <ShieldQuestion className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                STATE: INSUFFICIENT EVIDENCE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-100 font-mono font-bold">
                RMS / SNR Gate
              </span>
            </div>
            <p className="text-[11px] text-white/80 mt-0.5">{verification.reason}</p>
            <p className="text-[9px] text-amber-300/70 font-mono mt-0.5">
              Silence/noisy audio rejected automatically • Turn: {verification.turnId.slice(0, 16)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-purple-950/70 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-wide text-white uppercase">
                  Voice Auth &amp; Security
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v2.0 FAIL-CLOSED
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Multi-Sample Embeddings • Turn-Bound • PIN Fallback
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PENDING PROTECTED ACTION BANNER (FAIL-CLOSED INTERCEPT) */}
        {pendingAction && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-rose-950/90 to-amber-950/90 border border-rose-400/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                Protected Action Awaiting Authorization
              </span>
              <button
                type="button"
                onClick={() => voiceAuth.clearPendingAction()}
                className="text-[10px] text-white/60 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-white font-semibold">
              Blocked Action: <span className="text-amber-300">{pendingAction.description}</span>
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleLiveVoiceVerify}
                disabled={isVerifyingVoice}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Verify by Voice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pin_pattern')}
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Use PIN / Pattern</span>
              </button>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-neutral-900/90 border-b border-white/10 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('verify_enroll')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'verify_enroll'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🎙️ Voice Samples ({samples.length}/3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pin_pattern')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'pin_pattern'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🔐 PIN / Pattern
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accessibility_memory')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'accessibility_memory'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            ♿ Access &amp; Memory
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 3-State Live Verification Status Card */}
          {renderVerificationStateBadge()}

          {/* Feedback / Progress Banner */}
          {(recordingSlot !== null || isVerifyingVoice) && (
            <div className="p-3 rounded-2xl bg-cyan-950/70 border border-cyan-400/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  {isVerifyingVoice
                    ? 'Analyzing Speaker Embedding & SNR...'
                    : `Recording Voice Sample ${recordingSlot! + 1}...`}
                </span>
                <span className="font-mono">{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-cyan-300/80 font-mono">
                <span>Live Mic RMS Level: {(liveRms * 100).toFixed(0)}%</span>
                <span>Noise &amp; Silence Gate: ACTIVE</span>
              </div>
            </div>
          )}

          {feedbackBanner && recordingSlot === null && !isVerifyingVoice && (
            <div
              className={`p-3 rounded-2xl border text-xs font-medium flex items-center justify-between gap-2 ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : feedbackBanner.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200'
              }`}
            >
              <span>{feedbackBanner.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-[10px] opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded bg-black/30"
              >
                OK
              </button>
            </div>
          )}

          {/* TAB 1: MULTI-SAMPLE VOICE ENROLLMENT & LIVE CHECK */}
          {activeTab === 'verify_enroll' && (
            <div className="space-y-4">
              {/* Fail-Closed Protection Master Switch & Live Check */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Fail-Closed Tool Security Gate
                    </div>
                    <p className="text-[10px] text-white/60 mt-0.5">
                      Require verified admin voice (bound to current turn) before executing high-risk mobile/web actions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => voiceAuth.setProtectionEnabled(!protectionEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 cursor-pointer ${
                      protectionEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLiveVoiceVerify}
                  disabled={isVerifyingVoice || recordingSlot !== null || samples.length === 0}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    samples.length === 0
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>
                    {isVerifyingVoice
                      ? 'Verifying Live Voice...'
                      : 'Test Turn-Bound Voice Verification Now (2.4s)'}
                  </span>
                </button>
              </div>

              {/* Multi-Sample Enrollment Slots (Individual Storage & Re-Record) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">
                    Multi-Sample Speaker Embeddings ({samples.length}/3)
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    Individual Slot Storage
                  </span>
                </div>

                {ENROLLMENT_PHRASES.map((slot) => {
                  const existing = samples.find((s) => s.slotIndex === slot.slotIndex);
                  const isSlotRecording = recordingSlot === slot.slotIndex;

                  return (
                    <div
                      key={slot.slotIndex}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        existing
                          ? 'bg-emerald-950/25 border-emerald-500/40'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{slot.label}</span>
                          {existing ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[9px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Enrolled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[9px] font-semibold">
                              Not Recorded
                            </span>
                          )}
                        </div>

                        {existing && (
                          <button
                            type="button"
                            onClick={() => voiceAuth.deleteSampleSlot(slot.slotIndex)}
                            title="Delete this sample slot"
                            className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-amber-200/90 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10 italic">
                        &ldquo;{slot.phrase}&rdquo;
                      </p>

                      {existing && (
                        <div className="flex items-center justify-between text-[10px] text-white/60 font-mono">
                          <span>RMS: {existing.rmsEnergy}</span>
                          <span>SNR: {existing.snrDb} dB</span>
                          <span>Voiced: {Math.round(existing.voicedRatio * 100)}%</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRecordSampleSlot(slot.slotIndex)}
                        disabled={recordingSlot !== null || isVerifyingVoice}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                          existing
                            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md'
                        }`}
                      >
                        {isSlotRecording ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Recording Sample ({progressPct}%)...</span>
                          </>
                        ) : existing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                            <span>Re-Record / Replace Sample {slot.slotIndex + 1}</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Record Sample {slot.slotIndex + 1} (2.6s)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PIN & PATTERN FALLBACK */}
          {activeTab === 'pin_pattern' && (
            <div className="space-y-4">
              {/* PIN Fallback Unlock */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    PIN Fallback Authorization
                  </span>
                  <span className="text-[10px] text-white/50">
                    When Voice Auth Fails / Noisy Room
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter App Lock PIN (Default: 1234)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-sm text-white font-mono tracking-widest placeholder:text-white/30 placeholder:tracking-normal focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handlePinUnlock}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
                  >
                    Unlock
                  </button>
                </div>
              </div>

              {/* 3x3 Pattern Grid Fallback */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    Pattern Fallback (Tap Dots in Order)
                  </span>
                  <button
                    type="button"
                    onClick={() => setPatternInput([])}
                    className="text-[10px] text-white/60 hover:text-white underline cursor-pointer"
                  >
                    Reset Dots
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-w-[180px] mx-auto py-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
                    const order = patternInput.indexOf(idx);
                    const isSelected = order !== -1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTogglePatternNode(idx)}
                        className={`h-12 rounded-2xl border flex items-center justify-center font-mono text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/35 border-cyan-300 text-white scale-105 shadow-md shadow-cyan-500/25'
                            : 'bg-black/50 border-white/15 text-white/40 hover:border-white/40'
                        }`}
                      >
                        {isSelected ? `#${order + 1}` : idx + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handlePatternUnlock}
                  disabled={patternInput.length < 3}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                    patternInput.length >= 3
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  Verify Pattern ({patternInput.map((n) => n + 1).join(' → ') || 'Tap 1→2→3→6→9'})
                </button>
              </div>

              {/* Configure App Lock PIN */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/80">
                    Customize App Lock PIN
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(!isEditingPin)}
                    className="text-[10px] text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    {isEditingPin ? 'Cancel' : 'Change PIN'}
                  </button>
                </div>
                {isEditingPin && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={newPinConfig}
                      onChange={(e) => setNewPinConfig(e.target.value.replace(/\D/g, ''))}
                      placeholder="New 4-6 digit PIN"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewPin}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Save PIN
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCESSIBILITY SERVICE & CONVERSATION MEMORY */}
          {activeTab === 'accessibility_memory' && (
            <div className="space-y-4">
              {/* Accessibility Detection Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Accessibility className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Accessibility Service Detection
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      accTelemetry.state === 'enabled'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : accTelemetry.state === 'syncing'
                        ? 'bg-amber-500/25 text-amber-300 animate-pulse'
                        : 'bg-rose-500/25 text-rose-300'
                    }`}
                  >
                    {accTelemetry.state}
                  </span>
                </div>

                <p className="text-[11px] text-white/70 leading-snug">
                  {accTelemetry.statusDetail}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/70 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div>
                    AccessibilityManager:{' '}
                    <span className="text-emerald-300 font-bold">
                      {accTelemetry.accessibilityManagerActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    Settings.Secure:{' '}
                    <span className="text-emerald-300 font-bold">
                      {accTelemetry.secureSettingsVerified ? 'VERIFIED' : 'OFF'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => accessibilityService.toggleAccessibilityService()}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold cursor-pointer"
                  >
                    {accTelemetry.state === 'enabled'
                      ? 'Re-Sync Service State'
                      : 'Enable Accessibility Bridge'}
                  </button>
                </div>
              </div>

              {/* Persona Continuity & English Teacher Mode Switcher */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    Conversation Persona &amp; VAD Timing
                  </span>
                  <span className="text-[9px] text-emerald-300 font-semibold">
                    Zero Re-Intro Continuity
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PERSONA_PROFILES) as MahiPersonaMode[]).map((modeKey) => {
                    const prof = PERSONA_PROFILES[modeKey];
                    const selected = personaMode === modeKey;
                    return (
                      <button
                        key={modeKey}
                        type="button"
                        onClick={() => {
                          conversationMemory.setPersonaMode(modeKey);
                          onSwitchPersona?.(modeKey);
                          onStatusToast?.(`Switched to ${prof.name} (Context Preserved)`);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'bg-rose-500/25 border-rose-400 text-white shadow-md'
                            : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{prof.name}</div>
                        <div className="text-[9px] text-rose-300 font-semibold">{prof.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Long-Term Memory Vault (Separate from Clear Chat) */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Long-Term Memory Vault ({longTermMemories.length})
                  </span>
                  <span className="text-[9px] text-purple-300 font-semibold">
                    Protected from Clear Chat
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMemoryFact}
                    onChange={(e) => setNewMemoryFact(e.target.value)}
                    placeholder="Add permanent fact (e.g. My birthday is Oct 12)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddMemoryFact}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {longTermMemories.map((item) => (
                    <div
                      key={item.id}
                      className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/85"
                    >
                      <span className="truncate">{item.fact}</span>
                      <button
                        type="button"
                        onClick={() => conversationMemory.deleteLongTermMemory(item.id)}
                        className="text-white/40 hover:text-rose-400 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
