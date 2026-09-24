import React, { useState } from 'react';
import { Bell, X, Check, Trash2, Plus, Clock, Heart, Sparkles } from 'lucide-react';
import { SweetReminderEvent } from '../services/liveSession.ts';

interface SweetRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: (SweetReminderEvent & { completed?: boolean })[];
  onAddReminder: (task: string, time: string) => void;
  onToggleComplete: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const SweetRemindersModal: React.FC<SweetRemindersModalProps> = ({
  isOpen,
  onClose,
  reminders,
  onAddReminder,
  onToggleComplete,
  onDeleteReminder,
}) => {
  const [taskText, setTaskText] = useState<string>('');
  const [timeText, setTimeText] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    onAddReminder(taskText.trim(), timeText.trim() || 'Aaj');
    setTaskText('');
    setTimeText('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-amber-500/40 rounded-3xl p-5 shadow-2xl shadow-amber-950/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Sweet Reminders & Care ⏰
              </h2>
              <p className="text-[11px] text-amber-200/70">
                Mahi ki taraf se aapki health aur daily care ke reminders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px]">Add Reminder</span>
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

        {/* Add Reminder Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="mb-4 p-3.5 rounded-2xl bg-black/50 border border-amber-500/30 space-y-2.5">
            <div className="text-xs font-bold text-amber-200">Naya Reminder Set Karein:</div>
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Kya yaad dilana hai? (e.g. Paani peelo jaan 💧)..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={timeText}
                onChange={(e) => setTimeText(e.target.value)}
                placeholder="Time (e.g. 10 baje, shaam ko)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-colors"
              >
                Set Reminder
              </button>
            </div>
          </form>
        )}

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 p-1">
          {reminders.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-6 text-white/40">
              <Sparkles className="w-8 h-8 text-amber-400/40 mb-2 animate-pulse" />
              <p className="text-xs font-semibold text-white/60">Koi reminder pending nahi hai!</p>
              <p className="text-[10px] text-white/40 mt-1">
                Mahi se call par boliye: "Mahi, mujhe paani peene ka reminder lagao!"
              </p>
            </div>
          ) : (
            reminders.map((rem) => (
              <div
                key={rem.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  rem.completed
                    ? 'bg-white/5 border-white/10 opacity-60'
                    : 'bg-amber-500/10 border-amber-500/30 shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(rem.id)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      rem.completed
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-white/30 hover:border-amber-400'
                    }`}
                  >
                    {rem.completed && <Check className="w-3.5 h-3.5 font-bold" />}
                  </button>

                  <div>
                    <p
                      className={`text-xs font-bold text-white ${
                        rem.completed ? 'line-through text-white/50' : ''
                      }`}
                    >
                      {rem.task}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-amber-300/80 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{rem.time || 'Aaj'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteReminder(rem.id)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Voice Command Hint */}
        <p className="mt-3 text-[10px] text-white/50 text-center">
          ⏰ Mahi se boliye: <span className="text-amber-300">"Mahi, 15 minute baad mujhe call ka reminder do!"</span>
        </p>
      </div>
    </div>
  );
};
