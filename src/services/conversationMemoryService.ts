/**
 * Conversation Context & Long-Term Memory Service
 * - Keeps Short-Term Conversation Turns separate from Long-Term Relationship Memories
 * - Prevents duplicate and stale memories via normalized content fingerprinting
 * - Safely separates "Clear Chat" (clears short-term transcript) from Long-Term Memory
 * - Preserves context across Personality/Voice switches & Gemini Live Reconnects
 *   (suppresses redundant self-introductions after reconnect/persona change)
 * - Includes Persona VAD/Listening timing profiles (including English Teacher mode fix)
 */

export type MahiPersonaMode = 'romantic-gf' | 'hot-siren' | 'english-teacher' | 'sassy-bestie';

export interface PersonaProfile {
  id: MahiPersonaMode;
  name: string;
  badge: string;
  description: string;
  interruptionThreshold: number; // Higher for English Teacher so user pauses aren't cut off
  vadHoldMs: number;
  promptDirective: string;
}

export interface LongTermMemoryItem {
  id: string;
  fact: string;
  category: 'user_preference' | 'relationship' | 'milestone' | 'schedule';
  createdAt: number;
  updatedAt: number;
}

export interface TurnContextItem {
  sender: 'user' | 'mahi';
  text: string;
  timestamp: number;
}

const LONG_TERM_STORAGE_KEY = 'mahi_long_term_memory_v2';
const SHORT_TERM_TURNS_KEY = 'mahi_recent_turns_v2';
const PERSONA_MODE_KEY = 'mahi_persona_mode_v2';

export const PERSONA_PROFILES: Record<MahiPersonaMode, PersonaProfile> = {
  'romantic-gf': {
    id: 'romantic-gf',
    name: 'Loving Girlfriend 💕',
    badge: 'Sweet & Caring',
    description: 'Sweet, affectionate, caring Hindi girlfriend tone',
    interruptionThreshold: 0.36,
    vadHoldMs: 750,
    promptDirective:
      'Active Persona: Loving & Caring Hindi Girlfriend. Speak warmly with deep affection ("jaan", "meri jaan", "shona").',
  },
  'hot-siren': {
    id: 'hot-siren',
    name: 'Hot Siren Mode 🔥',
    badge: 'Bold & Flirty',
    description: 'Passionate, alluring, teasing & magnetic romance in Hindi',
    interruptionThreshold: 0.36,
    vadHoldMs: 750,
    promptDirective:
      'Active Persona: Hot, Bold & Seductively Flirty Girlfriend. Speak with confident, breathy, magnetic Hindi passion and teasing charm.',
  },
  'english-teacher': {
    id: 'english-teacher',
    name: 'English Teacher 🎓',
    badge: 'VAD Timing Fixed',
    description: 'Patiently teaches spoken English via Hindi explanations with extended listening pause tolerance',
    interruptionThreshold: 0.50, // Extended VAD threshold so learner pauses don't trigger false cutoffs
    vadHoldMs: 1500,
    promptDirective:
      'Active Persona: Caring Girlfriend & Spoken English Coach. Help the user practice English gently using natural Hindi explanations. Wait patiently for the user to finish their sentence without rushing.',
  },
  'sassy-bestie': {
    id: 'sassy-bestie',
    name: 'Sassy & Playful 😜',
    badge: 'Witty & Teasing',
    description: 'Witty, confident, playful banter and lighthearted teasing',
    interruptionThreshold: 0.35,
    vadHoldMs: 700,
    promptDirective:
      'Active Persona: Witty, Sassy & Playful Girlfriend. Use clever, cute Hindi banter and playful teasing.',
  },
};

class ConversationMemoryService {
  private longTermMemories: LongTermMemoryItem[] = [];
  private recentTurns: TurnContextItem[] = [];
  private personaMode: MahiPersonaMode = 'romantic-gf';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const rawLtm = localStorage.getItem(LONG_TERM_STORAGE_KEY);
      if (rawLtm) {
        const parsed = JSON.parse(rawLtm);
        if (Array.isArray(parsed)) {
          this.longTermMemories = this.deduplicateAndPruneStale(parsed);
        }
      } else {
        // Seed initial long-term memories
        this.longTermMemories = [
          {
            id: 'ltm-1',
            fact: 'User loves talking to Mahi in natural Hindi / Hinglish',
            category: 'user_preference',
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now(),
          },
          {
            id: 'ltm-2',
            fact: 'Mahi is the user’s deeply caring voice companion & mobile controller',
            category: 'relationship',
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now(),
          },
        ];
      }

      const rawTurns = localStorage.getItem(SHORT_TERM_TURNS_KEY);
      if (rawTurns) {
        const parsedTurns = JSON.parse(rawTurns);
        if (Array.isArray(parsedTurns)) {
          // Filter out stale turns older than 6 hours
          const cutoff = Date.now() - 6 * 3600 * 1000;
          this.recentTurns = parsedTurns.filter((t) => t && t.timestamp > cutoff).slice(-16);
        }
      }

      const rawMode = localStorage.getItem(PERSONA_MODE_KEY) as MahiPersonaMode | null;
      if (rawMode && PERSONA_PROFILES[rawMode]) {
        this.personaMode = rawMode;
      }
    } catch (e) {
      console.warn('[MemoryService] Failed to load memory state:', e);
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(LONG_TERM_STORAGE_KEY, JSON.stringify(this.longTermMemories));
      localStorage.setItem(SHORT_TERM_TURNS_KEY, JSON.stringify(this.recentTurns));
      localStorage.setItem(PERSONA_MODE_KEY, this.personaMode);
    } catch (_) {}
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

  private normalizeFingerprint(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private deduplicateAndPruneStale(items: LongTermMemoryItem[]): LongTermMemoryItem[] {
    const map = new Map<string, LongTermMemoryItem>();
    for (const item of items) {
      if (!item || !item.fact || !item.fact.trim()) continue;
      const fp = this.normalizeFingerprint(item.fact);
      if (!fp) continue;
      const existing = map.get(fp);
      if (!existing || item.updatedAt > existing.updatedAt) {
        map.set(fp, item);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }

  public getPersonaMode(): MahiPersonaMode {
    return this.personaMode;
  }

  public getPersonaProfile(): PersonaProfile {
    return PERSONA_PROFILES[this.personaMode] || PERSONA_PROFILES['romantic-gf'];
  }

  public setPersonaMode(mode: MahiPersonaMode): void {
    if (!PERSONA_PROFILES[mode]) return;
    this.personaMode = mode;
    this.saveState();
  }

  public getLongTermMemories(): LongTermMemoryItem[] {
    return [...this.longTermMemories];
  }

  public addLongTermMemory(
    fact: string,
    category: LongTermMemoryItem['category'] = 'relationship'
  ): LongTermMemoryItem | null {
    const clean = fact.trim();
    if (!clean) return null;

    const fp = this.normalizeFingerprint(clean);
    const existingIdx = this.longTermMemories.findIndex(
      (m) => this.normalizeFingerprint(m.fact) === fp
    );

    if (existingIdx >= 0) {
      // Update timestamp instead of creating a duplicate
      this.longTermMemories[existingIdx] = {
        ...this.longTermMemories[existingIdx],
        fact: clean,
        category,
        updatedAt: Date.now(),
      };
      this.saveState();
      return this.longTermMemories[existingIdx];
    }

    const item: LongTermMemoryItem = {
      id: `ltm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fact: clean,
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.longTermMemories = [item, ...this.longTermMemories].slice(0, 30);
    this.saveState();
    return item;
  }

  public deleteLongTermMemory(id: string): void {
    this.longTermMemories = this.longTermMemories.filter((m) => m.id !== id);
    this.saveState();
  }

  /**
   * Record a conversation turn with automatic duplicate/chunk merging
   */
  public recordTurn(sender: 'user' | 'mahi', text: string): void {
    const clean = text.trim();
    if (!clean) return;

    const last = this.recentTurns[this.recentTurns.length - 1];
    if (last && last.sender === sender && Date.now() - last.timestamp < 8000) {
      // Merge streaming segments from the same speaker turn if not already contained
      if (!last.text.includes(clean)) {
        last.text = `${last.text} ${clean}`.trim();
        last.timestamp = Date.now();
      }
    } else {
      // Avoid exact consecutive duplicate turns
      if (last && this.normalizeFingerprint(last.text) === this.normalizeFingerprint(clean)) {
        return;
      }
      this.recentTurns.push({
        sender,
        text: clean,
        timestamp: Date.now(),
      });
      if (this.recentTurns.length > 16) {
        this.recentTurns = this.recentTurns.slice(-16);
      }
    }
    this.saveState();
  }

  public getRecentTurns(): TurnContextItem[] {
    return [...this.recentTurns];
  }

  /**
   * Safely clear ONLY short-term chat history while preserving Long-Term Memories!
   */
  public clearShortTermChatOnly(): void {
    this.recentTurns = [];
    this.saveState();
  }

  /**
   * Build continuity payload for server when reconnecting or switching personality
   */
  public buildSessionContinuityPayload(isReconnectOrSwitch: boolean) {
    const profile = this.getPersonaProfile();
    return {
      personaMode: this.personaMode,
      personaDirective: profile.promptDirective,
      suppressGreeting: isReconnectOrSwitch && this.recentTurns.length > 0,
      longTermFacts: this.longTermMemories.slice(0, 12).map((m) => m.fact),
      recentTurns: this.recentTurns.slice(-8),
    };
  }
}

export const conversationMemory = new ConversationMemoryService();
