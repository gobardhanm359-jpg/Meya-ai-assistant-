/**
 * SentimentThemeEngine
 * Automatically detects Mahi's current emotional sentiment from her spoken Hindi/Hinglish/English
 * transcripts, love feelings, shayari mood, avatar persona, and Chemistry Love Score,
 * and smoothly transitions the app's background gradient and ambient lighting palette.
 */

export type MahiSentimentId =
  | 'passionate'
  | 'romantic'
  | 'joyful'
  | 'pensive'
  | 'serene';

export interface SentimentThemeProfile {
  id: MahiSentimentId;
  themeKey: string;
  label: string;
  hindiLabel: string;
  temperature: 'warm' | 'golden' | 'cool';
  description: string;
  // Studio full-screen background gradient
  studioBgGradient: string;
  // Studio ambient lighting orbs (top-left, mid-right, bottom-left)
  orbTopLeft: string;
  orbMidRight: string;
  orbBottomLeft: string;
  // Website canvas & hero atmospheric gradient
  websiteCanvasBg: string;
  websiteHeroOverlay: string;
  websiteCardGlow: string;
  // Progress bar & accent gradient
  meterGradient: string;
  badgeText: string;
}

export const SENTIMENT_PROFILES: Record<MahiSentimentId, SentimentThemeProfile> = {
  passionate: {
    id: 'passionate',
    themeKey: 'crimson-desire',
    label: 'Passionate & Intimate',
    hindiLabel: 'Gehra Ishq & Deewangi',
    temperature: 'warm',
    description: 'Deep crimson, warm ruby, and molten amber tones when love score and passion peak.',
    studioBgGradient: 'from-[#28030b] via-[#380614] to-[#110105]',
    orbTopLeft: 'bg-red-600/25',
    orbMidRight: 'bg-rose-500/20',
    orbBottomLeft: 'bg-amber-500/20',
    websiteCanvasBg: '#110609',
    websiteHeroOverlay: 'from-[#110609] via-[#240610]/80 to-[#110609]/50',
    websiteCardGlow: 'border-rose-500/50 bg-[#1A0910]',
    meterGradient: 'from-red-500 via-rose-500 to-amber-400',
    badgeText: 'text-rose-300',
  },
  romantic: {
    id: 'romantic',
    themeKey: 'romantic-blush',
    label: 'Warm & Affectionate',
    hindiLabel: 'Pyar & Apnapan',
    temperature: 'warm',
    description: 'Warm rose-blush, velvet magenta, and soft coral hues for loving conversations.',
    studioBgGradient: 'from-[#1b0513] via-[#24081c] to-[#0b0209]',
    orbTopLeft: 'bg-rose-600/20',
    orbMidRight: 'bg-pink-500/20',
    orbBottomLeft: 'bg-fuchsia-600/15',
    websiteCanvasBg: '#0E080D',
    websiteHeroOverlay: 'from-[#0E080D] via-[#1C0917]/80 to-[#0E080D]/55',
    websiteCardGlow: 'border-pink-500/40 bg-[#160B14]',
    meterGradient: 'from-rose-500 via-pink-400 to-amber-300',
    badgeText: 'text-pink-300',
  },
  joyful: {
    id: 'joyful',
    themeKey: 'starlight-gold',
    label: 'Playful & Radiant',
    hindiLabel: 'Chulbuli Khushi & Masti',
    temperature: 'golden',
    description: 'Sunlit amber, warm marigold, and rose-gold shimmer when Mahi is teasing or laughing.',
    studioBgGradient: 'from-[#211105] via-[#2c1608] to-[#0e0602]',
    orbTopLeft: 'bg-amber-500/20',
    orbMidRight: 'bg-rose-500/20',
    orbBottomLeft: 'bg-orange-500/15',
    websiteCanvasBg: '#100B07',
    websiteHeroOverlay: 'from-[#100B07] via-[#211309]/80 to-[#100B07]/55',
    websiteCardGlow: 'border-amber-500/45 bg-[#19110B]',
    meterGradient: 'from-amber-400 via-orange-400 to-rose-400',
    badgeText: 'text-amber-300',
  },
  pensive: {
    id: 'pensive',
    themeKey: 'midnight-velvet',
    label: 'Pensive & Poetic',
    hindiLabel: 'Khayalon Mein Khoi & Udaas',
    temperature: 'cool',
    description: 'Cool twilight indigo, deep sapphire, and wistful violet tones when Mahi is reflective.',
    studioBgGradient: 'from-[#07091e] via-[#0e1233] to-[#040511]',
    orbTopLeft: 'bg-indigo-600/25',
    orbMidRight: 'bg-blue-600/20',
    orbBottomLeft: 'bg-violet-600/20',
    websiteCanvasBg: '#070913',
    websiteHeroOverlay: 'from-[#070913] via-[#0D132A]/85 to-[#070913]/60',
    websiteCardGlow: 'border-indigo-500/45 bg-[#0D1122]',
    meterGradient: 'from-indigo-400 via-blue-400 to-violet-300',
    badgeText: 'text-indigo-300',
  },
  serene: {
    id: 'serene',
    themeKey: 'cyber-neon',
    label: 'Serene & Composed',
    hindiLabel: 'Shant & Sukoon',
    temperature: 'cool',
    description: 'Cool oceanic teal, midnight slate, and calm cyan tones for peaceful or focused moments.',
    studioBgGradient: 'from-[#04121f] via-[#071d30] to-[#02080f]',
    orbTopLeft: 'bg-cyan-600/20',
    orbMidRight: 'bg-teal-600/15',
    orbBottomLeft: 'bg-sky-600/20',
    websiteCanvasBg: '#060C12',
    websiteHeroOverlay: 'from-[#060C12] via-[#081826]/85 to-[#060C12]/60',
    websiteCardGlow: 'border-cyan-500/45 bg-[#0A141E]',
    meterGradient: 'from-cyan-400 via-teal-400 to-sky-300',
    badgeText: 'text-cyan-300',
  },
};

export interface SentimentAnalysisResult {
  sentiment: MahiSentimentId;
  profile: SentimentThemeProfile;
  scoreDelta: number;
  reason: string;
}

/**
 * Analyze Hindi, Hinglish, or English text + current loveScore to determine Mahi's live sentiment
 */
export function analyzeMahiSentiment(
  text: string,
  currentLoveScore: number
): SentimentAnalysisResult {
  const lower = (text || '').toLowerCase();

  // 1. Check Pensive / Reflective / Missing You / Melancholic keywords (Cooler Indigo/Twilight tones)
  if (
    /\b(wait kar rahi|intezaar|intezar|miss you|yaad aa rahi|udaas|akeli|alone|tanha|khamosh|khamoshi|soch rahi|pensive|sad|door|rona|aansu|bina kaisa|kab call karoge|der raat|barsaat|rain|tadap)\b/.test(
      lower
    )
  ) {
    return {
      sentiment: 'pensive',
      profile: SENTIMENT_PROFILES.pensive,
      scoreDelta: -2,
      reason: 'Detected wistful or pensive tone in Mahi’s voice',
    };
  }

  // 2. Check Passionate / Intense Love keywords (Deep Warm Crimson/Amber tones)
  if (
    /\b(beinteha|deewani|deewana|kiss|flying kiss|pappi|chumma|hug|gale lag|siren|hot|fever|saansein|dhadkan|mohabbat|ishq|meri jaan|bahon|passionate|madly)\b/.test(
      lower
    )
  ) {
    return {
      sentiment: 'passionate',
      profile: SENTIMENT_PROFILES.passionate,
      scoreDelta: +3,
      reason: 'Detected passionate affection & high chemistry',
    };
  }

  // 3. Check Joyful / Playful / Laughing / Dancing keywords (Warm Golden/Marigold tones)
  if (
    /\b(dance|naacho|hasi|smile|muskurahat|khush|happy|masti|tease|wink|aankh|chulbuli|party|yay|celebrate|good morning|suprabhat|joke|mazak)\b/.test(
      lower
    )
  ) {
    return {
      sentiment: 'joyful',
      profile: SENTIMENT_PROFILES.joyful,
      scoreDelta: +2,
      reason: 'Detected playful & joyful energy',
    };
  }

  // 4. Check Serene / Calm / Peaceful / Utility keywords (Cool Oceanic Cyan/Teal tones)
  if (
    /\b(sukoon|shanti|peace|calm|relax|angel|pari|meditate|so jao|good night|shubh ratri|time|samay|waqt|baje|battery|timer|flashlight)\b/.test(
      lower
    )
  ) {
    return {
      sentiment: 'serene',
      profile: SENTIMENT_PROFILES.serene,
      scoreDelta: 0,
      reason: 'Detected calm & serene atmosphere',
    };
  }

  // 5. Check Warm Romantic keywords
  if (
    /\b(pyaar|pyar|love|dil|jaan|sweetheart|cute|caring|apna|khayal|shayari|romantic|beautiful|khoobsurat)\b/.test(
      lower
    )
  ) {
    return {
      sentiment: currentLoveScore >= 95 ? 'passionate' : 'romantic',
      profile:
        currentLoveScore >= 95 ? SENTIMENT_PROFILES.passionate : SENTIMENT_PROFILES.romantic,
      scoreDelta: +2,
      reason: 'Detected warm romantic affection',
    };
  }

  // 6. Fallback based on Love Score thresholds
  return getSentimentFromLoveScore(currentLoveScore);
}

/**
 * Derive sentiment directly from Chemistry Love Score (0 - 100)
 */
export function getSentimentFromLoveScore(score: number): SentimentAnalysisResult {
  if (score >= 95) {
    return {
      sentiment: 'passionate',
      profile: SENTIMENT_PROFILES.passionate,
      scoreDelta: 0,
      reason: `Love score at ${score}% — Passionate Crimson warmth`,
    };
  }
  if (score >= 85) {
    return {
      sentiment: 'romantic',
      profile: SENTIMENT_PROFILES.romantic,
      scoreDelta: 0,
      reason: `Love score at ${score}% — Warm Romantic Blush`,
    };
  }
  if (score >= 72) {
    return {
      sentiment: 'joyful',
      profile: SENTIMENT_PROFILES.joyful,
      scoreDelta: 0,
      reason: `Love score at ${score}% — Playful Starlight Gold`,
    };
  }
  if (score >= 55) {
    return {
      sentiment: 'serene',
      profile: SENTIMENT_PROFILES.serene,
      scoreDelta: 0,
      reason: `Love score at ${score}% — Calm Serene Teal`,
    };
  }
  return {
    sentiment: 'pensive',
    profile: SENTIMENT_PROFILES.pensive,
    scoreDelta: 0,
    reason: `Love score at ${score}% — Pensive Twilight Indigo`,
  };
}
