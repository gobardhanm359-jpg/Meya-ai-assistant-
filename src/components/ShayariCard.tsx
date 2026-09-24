import React, { useEffect, useState } from 'react';
import { Sparkles, Heart, X, Quote } from 'lucide-react';
import { ShayariEvent } from '../services/liveSession.ts';

interface ShayariCardProps {
  shayari: ShayariEvent | null;
  onClose: () => void;
}

export const ShayariCard: React.FC<ShayariCardProps> = ({ shayari, onClose }) => {
  if (!shayari) return null;

  return (
    <div className="fixed top-20 inset-x-4 max-w-md mx-auto z-40 animate-in fade-in slide-in-from-top-4 duration-400">
      <div className="relative rounded-3xl p-5 bg-gradient-to-br from-rose-950/90 via-pink-950/90 to-black/95 border-2 border-rose-400/60 shadow-2xl shadow-rose-900/50 backdrop-blur-xl overflow-hidden">
        {/* Decorative sparkles */}
        <div className="absolute top-2 right-12 w-2 h-2 rounded-full bg-amber-300 animate-ping" />
        <div className="absolute bottom-3 left-4 w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse" />

        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-rose-300 rotate-180" />
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest flex items-center gap-1">
              Mahi Ki Romantic Shayari 💕
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shayari Couplet Text */}
        <p className="text-sm sm:text-base font-serif italic text-white leading-relaxed text-center my-3 px-2 font-medium tracking-wide">
          "{shayari.couplet}"
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-[10px] text-rose-200/60">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
            Sirf aapke liye
          </span>
          <span className="capitalize">{shayari.mood || 'Dil Se'}</span>
        </div>
      </div>
    </div>
  );
};
