import React, { useRef, useEffect } from 'react';
import { MessageSquare, X, Copy, Check, Trash2, Heart, Bot, User } from 'lucide-react';
import { TranscriptEntry } from '../services/liveSession.ts';

interface LiveTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcripts: TranscriptEntry[];
  onClear: () => void;
}

export const LiveTranscriptModal: React.FC<LiveTranscriptModalProps> = ({
  isOpen,
  onClose,
  transcripts,
  onClear,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = transcripts
      .map((t) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.sender === 'mahi' ? 'Mahi ❤️' : 'You'}: ${t.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-rose-500/40 rounded-3xl p-5 shadow-2xl shadow-rose-950/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/40">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Live Subtitles & Hindi Transcript
                <span className="text-[10px] font-semibold bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </h2>
              <p className="text-[11px] text-rose-200/70">
                Baat-cheet ka live Hindi audio record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {transcripts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Transcript"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  title="Clear Chat History (Long-Term Memory stays safe)"
                  className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-white/70 hover:text-rose-300 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Chat</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 p-2 rounded-2xl bg-black/40 border border-white/5 min-h-[250px]"
        >
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40">
              <Heart className="w-10 h-10 text-rose-500/40 mb-2 animate-pulse" />
              <p className="text-xs font-semibold text-white/60">Abhi koi transcript nahi hai</p>
              <p className="text-[10px] text-white/40 mt-1">
                Call connect karke Hindi mein boliye, yahan sab subtitle bankar aayega!
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              const isMahi = entry.sender === 'mahi';
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2.5 ${isMahi ? 'justify-start' : 'justify-end'}`}
                >
                  {isMahi && (
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-rose-400/50 shadow-sm mt-0.5">
                      <img src="/anime/mahi_wink.jpg" alt="Mahi" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                      isMahi
                        ? 'bg-rose-950/40 border border-rose-500/40 text-rose-100'
                        : 'bg-white/10 border border-white/15 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-bold text-white/40 mb-1">
                      <span>{isMahi ? 'Mahi ❤️' : 'Aap (You)'}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="font-medium whitespace-pre-wrap">{entry.text}</p>
                  </div>

                  {!isMahi && (
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-white/40 px-1">
          <span>Debounced Live Stream + Auto-Flush</span>
          <span className="text-emerald-300/80">Long-Term Memory Protected 🧠</span>
        </div>
      </div>
    </div>
  );
};
