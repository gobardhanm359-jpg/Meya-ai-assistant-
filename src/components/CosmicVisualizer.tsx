import React, { useEffect, useRef } from 'react';
import { SessionState } from '../services/liveSession.ts';
import { AudioStreamer } from '../services/audioStreamer.ts';
import { MicStreamer } from '../services/micStreamer.ts';
import { Heart, Sparkles } from 'lucide-react';

interface CosmicVisualizerProps {
  state: SessionState;
  audioStreamer: AudioStreamer | null;
  micStreamer: MicStreamer | null;
  speakingLevel: number;
  micLevel: number;
  loveBurstTrigger: number;
  theme: string;
  onCoreClick: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  isHeart?: boolean;
}

export const CosmicVisualizer: React.FC<CosmicVisualizerProps> = ({
  state,
  audioStreamer,
  micStreamer,
  speakingLevel,
  micLevel,
  loveBurstTrigger,
  theme,
  onCoreClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(64));

  // Theme color palette definitions
  const getThemeColors = () => {
    switch (theme) {
      case 'romantic-blush':
        return {
          primary: '#ec4899', // pink-500
          secondary: '#f43f5e', // rose-500
          accent: '#fda4af', // rose-300
          glow: 'rgba(244, 63, 94, 0.45)',
        };
      case 'midnight-velvet':
        return {
          primary: '#8b5cf6', // purple-500
          secondary: '#6366f1', // indigo-500
          accent: '#c084fc', // purple-400
          glow: 'rgba(139, 92, 246, 0.45)',
        };
      case 'starlight-gold':
        return {
          primary: '#f59e0b', // amber-500
          secondary: '#ec4899', // pink-500
          accent: '#fde047', // yellow-300
          glow: 'rgba(245, 158, 11, 0.45)',
        };
      case 'cyber-neon':
      default:
        return {
          primary: '#06b6d4', // cyan-500
          secondary: '#ec4899', // pink-500
          accent: '#a855f7', // purple-500
          glow: 'rgba(6, 182, 212, 0.45)',
        };
    }
  };

  // Trigger heart burst particles whenever loveBurstTrigger increments
  useEffect(() => {
    if (loveBurstTrigger > 0) {
      const colors = ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#f472b6'];
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        particlesRef.current.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: 14 + Math.random() * 18,
          opacity: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 60 + Math.random() * 40,
          isHeart: true,
        });
      }
    }
  }, [loveBurstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rotation = 0;
    let pulsePhase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Fetch audio data
      if (state === 'speaking' && audioStreamer) {
        audioStreamer.getFrequencyData(freqDataRef.current);
      } else if (state === 'listening' && micStreamer) {
        micStreamer.getFrequencyData(freqDataRef.current);
      } else {
        freqDataRef.current.fill(0);
      }

      rotation += 0.015;
      pulsePhase += 0.035;

      const themeColors = getThemeColors();
      const baseRadius = Math.min(width, height) * 0.22;
      const currentLevel = state === 'speaking' ? speakingLevel : micLevel;
      const dynamicRadius = baseRadius + currentLevel * 38;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw background ambient diffuse glow
      const bgGlow = ctx.createRadialGradient(0, 0, baseRadius * 0.3, 0, 0, dynamicRadius * 1.8);
      if (state === 'speaking') {
        bgGlow.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
        bgGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.2)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (state === 'listening') {
        bgGlow.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        bgGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (state === 'connecting') {
        bgGlow.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        bgGlow.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(0, 0, dynamicRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Outer cyber frequency wave bars (when active)
      if (state === 'speaking' || state === 'listening') {
        const bars = 48;
        const step = (Math.PI * 2) / bars;

        for (let i = 0; i < bars; i++) {
          const angle = i * step + rotation;
          const dataIdx = Math.floor((i / bars) * (freqDataRef.current.length * 0.75));
          const val = (freqDataRef.current[dataIdx] || 0) / 255;
          const barHeight = 8 + val * 45 + Math.sin(pulsePhase + i) * 3;

          const r1 = dynamicRadius + 8;
          const r2 = r1 + barHeight;

          const x1 = Math.cos(angle) * r1;
          const y1 = Math.sin(angle) * r1;
          const x2 = Math.cos(angle) * r2;
          const y2 = Math.sin(angle) * r2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle =
            state === 'speaking'
              ? `rgba(244, 63, 94, ${0.4 + val * 0.6})`
              : `rgba(6, 182, 212, ${0.4 + val * 0.6})`;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Concentric orbital rings with rotating dots
      const ringCount = state === 'connecting' ? 3 : 2;
      for (let r = 0; r < ringCount; r++) {
        const ringRadius = dynamicRadius + 15 + r * 14;
        const ringRotation = (r % 2 === 0 ? 1 : -1) * (rotation * (0.8 + r * 0.4));

        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle =
          state === 'connecting'
            ? `rgba(168, 85, 247, ${0.3 + 0.3 * Math.sin(pulsePhase + r)})`
            : state === 'speaking'
            ? 'rgba(236, 72, 153, 0.25)'
            : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbiting glowing satellites
        const satAngle = ringRotation * 1.5;
        const sx = Math.cos(satAngle) * ringRadius;
        const sy = Math.sin(satAngle) * ringRadius;

        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = themeColors.accent;
        ctx.shadowColor = themeColors.accent;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Center glowing core orb
      const coreGrad = ctx.createRadialGradient(
        -dynamicRadius * 0.25,
        -dynamicRadius * 0.25,
        0,
        0,
        0,
        dynamicRadius
      );

      if (state === 'speaking') {
        coreGrad.addColorStop(0, '#ffe4e6'); // rose-100
        coreGrad.addColorStop(0.3, '#f43f5e'); // rose-500
        coreGrad.addColorStop(0.8, '#be185d'); // pink-700
        coreGrad.addColorStop(1, '#881337'); // rose-900
      } else if (state === 'listening') {
        coreGrad.addColorStop(0, '#e0f2fe'); // sky-100
        coreGrad.addColorStop(0.3, '#06b6d4'); // cyan-500
        coreGrad.addColorStop(0.8, '#6366f1'); // indigo-500
        coreGrad.addColorStop(1, '#312e81'); // indigo-900
      } else if (state === 'connecting') {
        coreGrad.addColorStop(0, '#f3e8ff'); // purple-100
        coreGrad.addColorStop(0.4, '#a855f7'); // purple-500
        coreGrad.addColorStop(1, '#4c1d95'); // purple-900
      } else {
        coreGrad.addColorStop(0, '#fda4af'); // rose-300
        coreGrad.addColorStop(0.4, '#e11d48'); // rose-600
        coreGrad.addColorStop(1, '#1e1b4b'); // dark navy
      }

      ctx.beginPath();
      ctx.arc(0, 0, dynamicRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = themeColors.primary;
      ctx.shadowBlur = 24 + currentLevel * 30;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner liquid shimmer wave on the orb
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      const waveOffset = Math.sin(pulsePhase * 1.5) * 15;
      ctx.ellipse(0, waveOffset, dynamicRadius * 0.85, dynamicRadius * 0.4, rotation * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.restore();

      // Render floating particles and hearts
      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.opacity = 1 - p.life / p.maxLife;

        if (p.isHeart) {
          // Draw heart shape
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(p.size / 24, p.size / 24);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-10, -12, -20, -5, -20, 6);
          ctx.bezierCurveTo(-20, 16, 0, 24, 0, 28);
          ctx.bezierCurveTo(0, 24, 20, 16, 20, 6);
          ctx.bezierCurveTo(20, -5, 10, -12, 0, 0);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fill();
        }

        if (p.life < p.maxLife) {
          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      // Occasional romantic sparkle particle while connected
      if (state !== 'disconnected' && Math.random() < 0.25) {
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = baseRadius * (0.8 + Math.random() * 0.6);
        particlesRef.current.push({
          x: Math.cos(pAngle) * pDist,
          y: Math.sin(pAngle) * pDist,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.6 - Math.random() * 0.8,
          size: 2 + Math.random() * 3,
          opacity: 0.9,
          color: themeColors.accent,
          life: 0,
          maxLife: 40 + Math.random() * 30,
        });
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, speakingLevel, micLevel, theme]);

  return (
    <div className="relative w-full max-w-sm aspect-square flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        className="w-full h-full cursor-pointer touch-none"
        onClick={onCoreClick}
      />

      {/* Center Icon Overlay */}
      <button
        type="button"
        onClick={onCoreClick}
        aria-label={state === 'disconnected' ? 'Connect to Mahi' : 'Disconnect from Mahi'}
        className="absolute inset-0 m-auto w-24 h-24 rounded-full flex flex-col items-center justify-center text-white transition-all transform active:scale-95 focus:outline-none pointer-events-auto"
      >
        {state === 'speaking' ? (
          <div className="flex flex-col items-center animate-pulse">
            <Heart className="w-9 h-9 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] fill-white" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/90 mt-1 drop-shadow">
              Speaking
            </span>
          </div>
        ) : state === 'listening' ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 mb-1">
              <span className="w-1 h-4 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-6 bg-cyan-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-4 bg-cyan-300 rounded-full animate-bounce" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200 drop-shadow">
              Listening
            </span>
          </div>
        ) : state === 'connecting' ? (
          <div className="flex flex-col items-center">
            <Sparkles className="w-8 h-8 text-purple-200 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200 mt-1">
              Connecting
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center group">
            <Heart className="w-9 h-9 text-rose-300 group-hover:text-white transition-transform group-hover:scale-110 drop-shadow" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-200/90 mt-1 group-hover:text-white">
              Talk to Mahi
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
