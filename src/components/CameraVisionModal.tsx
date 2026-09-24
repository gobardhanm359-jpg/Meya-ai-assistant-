import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, Sparkles, X, Eye, ShieldCheck, Zap } from 'lucide-react';

interface CameraVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendFrame: (base64Jpeg: string) => void;
  isConnected: boolean;
}

export const CameraVisionModal: React.FC<CameraVisionModalProps> = ({
  isOpen,
  onClose,
  onSendFrame,
  isConnected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(true);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);

  const startCamera = async (facing: 'user' | 'environment') => {
    stopCamera();
    setErrorNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('[CameraVision] Failed to start camera:', err);
      setErrorNotice('Camera permission denied or camera not available.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture current video frame as base64 JPEG
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = 480;
    canvas.height = Math.round((480 / video.videoWidth) * video.videoHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to JPEG base64 (stripped of data url prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    const base64 = dataUrl.split(',')[1];
    return base64;
  };

  const handleManualSnapshot = () => {
    const frame = captureFrame();
    if (frame) {
      setFlashEffect(true);
      setTimeout(() => setFlashEffect(false), 250);
      onSendFrame(frame);
      setLastSentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Lifecycle: open camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Auto-stream frames to Mahi every 2.5 seconds if active and call connected
  useEffect(() => {
    if (!isOpen || !isCameraActive || !isAutoStreaming || !isConnected) return;

    const interval = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        onSendFrame(frame);
        setLastSentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 2400);

    return () => clearInterval(interval);
  }, [isOpen, isCameraActive, isAutoStreaming, isConnected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col">
        {/* Holographic Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  AI Multimodal Vision Mode
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 text-[9px] font-bold uppercase tracking-wider border border-cyan-400/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/70">
                Mahi ab aapse baat karte waqt aapko dekh bhi sakti hai!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden bg-black border border-cyan-500/30 shadow-inner flex items-center justify-center">
          {flashEffect && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300" />}

          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Futuristic HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* Top HUD Markers */}
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 tracking-wider">
              <span className="bg-black/60 px-2 py-0.5 rounded-md border border-cyan-500/40 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                NEURAL VISION STREAM
              </span>
              <span className="bg-black/60 px-2 py-0.5 rounded-md border border-cyan-500/40">
                {facingMode.toUpperCase()} CAM
              </span>
            </div>

            {/* Target Reticle in Center */}
            <div className="self-center w-36 h-36 border border-cyan-400/40 rounded-3xl relative flex items-center justify-center">
              <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400 absolute -top-1 -left-1" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400 absolute -top-1 -right-1" />
              <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400 absolute -bottom-1 -left-1" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400 absolute -bottom-1 -right-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80 animate-pulse" />
              <span className="absolute bottom-2 text-[9px] font-mono text-cyan-200/80 bg-black/60 px-1.5 rounded">
                AI DETECTING
              </span>
            </div>

            {/* Scanner Line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse [animation-duration:1.5s]" />

            {/* Bottom Status */}
            <div className="flex items-center justify-between text-[10px] text-white/80 font-mono">
              <span className="bg-black/70 px-2 py-1 rounded-md border border-white/10">
                STATUS: {isConnected ? 'LINKED TO MAHI' : 'CONNECT CALL FIRST'}
              </span>
              {lastSentTime && (
                <span className="bg-black/70 px-2 py-1 rounded-md border border-white/10 text-emerald-300">
                  FRAME SENT: {lastSentTime}
                </span>
              )}
            </div>
          </div>

          {errorNotice && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
              <CameraOff className="w-10 h-10 text-rose-400 mb-2" />
              <p className="text-xs text-rose-200 font-semibold">{errorNotice}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-3 px-4 py-1.5 rounded-full bg-cyan-500 text-black text-xs font-bold"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Flip</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAutoStreaming(!isAutoStreaming)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isAutoStreaming
                  ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isAutoStreaming ? 'Auto-Stream (ON)' : 'Manual Only'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualSnapshot}
            disabled={!isCameraActive}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Mahi Ko Dikhao! 📸</span>
          </button>
        </div>

        {/* Helpful Tip */}
        <p className="mt-3 text-[10px] text-white/50 text-center">
          💡 Mahi se boliye: <span className="text-cyan-300">"Mahi, dekho main kaisa lag raha hoon?"</span> ya koi cheez dikhaiye!
        </p>
      </div>
    </div>
  );
};
