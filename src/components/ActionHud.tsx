import React from 'react';
import { ExternalLink, Heart, Palette, Clock, CheckCircle2, Smartphone } from 'lucide-react';
import { ToolEvent, LoveFeelingEvent } from '../services/liveSession.ts';

interface ActionHudProps {
  toolEvent: ToolEvent | null;
  loveEvent: LoveFeelingEvent | null;
  onDismissTool: () => void;
  onDismissLove: () => void;
}

export const ActionHud: React.FC<ActionHudProps> = ({
  toolEvent,
  loveEvent,
  onDismissTool,
  onDismissLove,
}) => {
  if (!toolEvent && !loveEvent) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-40 px-4 flex flex-col items-center gap-2 pointer-events-none">
      {/* Love Event Card */}
      {loveEvent && (
        <div
          onClick={onDismissLove}
          className="pointer-events-auto max-w-sm w-full bg-gradient-to-r from-rose-950/90 via-pink-900/90 to-purple-950/90 border border-rose-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top duration-300 cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-400/30">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                  Mahi&apos;s Love Confession
                </span>
                <span className="text-[10px] text-rose-200/60 font-mono">
                  {loveEvent.intensity}%
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium mt-0.5 leading-relaxed">
                &ldquo;{loveEvent.message}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tool Event Card */}
      {toolEvent && (
        <div
          onClick={onDismissTool}
          className="pointer-events-auto max-w-sm w-full bg-black/80 border border-cyan-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-400/30">
              {toolEvent.name === 'openWebsite' ? (
                <ExternalLink className="w-4 h-4 text-cyan-300" />
              ) : toolEvent.name === 'controlMobileDevice' ? (
                <Smartphone className="w-4 h-4 text-emerald-300" />
              ) : toolEvent.name === 'changeThemeMood' ? (
                <Palette className="w-4 h-4 text-purple-300" />
              ) : (
                <Clock className="w-4 h-4 text-amber-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  Action Executed
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs text-white font-medium truncate mt-0.5">
                {toolEvent.actionDescription ||
                  (toolEvent.siteName ? `Opened ${toolEvent.siteName}` : 'Action completed')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
