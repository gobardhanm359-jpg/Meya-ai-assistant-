import React, { useState } from 'react';
import { Camera, X, Heart, Sparkles, Calendar, Trash2, Plus } from 'lucide-react';
import { PhotoMemoryEvent } from '../services/liveSession.ts';

interface PhotoMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: PhotoMemoryEvent[];
  onAddMemory: (caption: string, moodTag: string) => void;
  onDeleteMemory: (id: string) => void;
}

export const PhotoMemoriesModal: React.FC<PhotoMemoriesModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [newCaption, setNewCaption] = useState<string>('');
  const [newMood, setNewMood] = useState<string>('romantic');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;
    onAddMemory(newCaption.trim(), newMood);
    setNewCaption('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-pink-500/40 rounded-3xl p-5 shadow-2xl shadow-pink-950/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-pink-500/20 text-pink-300 border border-pink-400/40">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Mahi Photo Memories Album 💕
              </h2>
              <p className="text-[11px] text-pink-200/70">
                Aapke aur Mahi ke pyare lamhon ki gallery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-400/30 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px]">Photo Save</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Memory Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="mb-4 p-3.5 rounded-2xl bg-black/50 border border-pink-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-pink-200">
              <span>Nayi Photo Memory Add Karein:</span>
            </div>
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Caption likho (e.g. Mahi ke saath pehli video call 💕)..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-pink-400"
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={newMood}
                onChange={(e) => setNewMood(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black border border-white/20 text-white text-xs"
              >
                <option value="romantic">💖 Romantic</option>
                <option value="cute">🥰 Cute & Sweet</option>
                <option value="sassy">😉 Sassy Fun</option>
                <option value="special">✨ Special Moment</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-bold text-xs shadow-md transition-colors"
              >
                Save Memory
              </button>
            </div>
          </form>
        )}

        {/* Grid of Polaroid Cards */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3.5 p-1">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="group relative bg-white rounded-2xl p-2.5 pb-4 shadow-xl text-neutral-900 flex flex-col transform hover:-rotate-1 hover:scale-[1.02] transition-all duration-300"
            >
              {/* Photo Area */}
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-pink-100 relative mb-2 shadow-inner border border-black/5">
                <img
                  src="/anime/mahi_wink.jpg"
                  alt="Mahi Memory"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                  <span>{mem.moodTag || 'Love'}</span>
                </div>
              </div>

              {/* Polaroid Caption */}
              <div className="px-1 flex-1 flex flex-col justify-between">
                <p className="text-xs font-bold font-sans text-neutral-800 leading-snug line-clamp-2">
                  {mem.caption}
                </p>
                <div className="flex items-center justify-between text-[9px] font-medium text-neutral-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(mem.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteMemory(mem.id)}
                    className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Voice Command Hint */}
        <p className="mt-3 text-[10px] text-white/50 text-center">
          📸 Mahi se boliye: <span className="text-pink-300">"Mahi, hamari ek photo memory save kar do!"</span>
        </p>
      </div>
    </div>
  );
};
