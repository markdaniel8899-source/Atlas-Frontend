/**
 * Free Fire style step-based rank system with 17 ranks:
 * Bronze I-IV, Silver I-IV, Gold I-IV, Platinum I-IV, Conqueror
 * Uses scaling XP requirements and Roman numeral notation.
 */

export type TierKey = "bronze" | "silver" | "gold" | "platinum" | "conqueror";

export interface Tier {
  key: TierKey;
  label: string;
  /** Tailwind classes for text color */
  text: string;
  /** Tailwind classes for border color */
  border: string;
  /** Tailwind classes for background */
  bg: string;
  /** Tailwind classes for progress bar gradient */
  gradient: string;
}

export interface RankStep {
  /** Unique key like "bronze_1" */
  key: string;
  /** Display name like "Bronze I" */
  name: string;
  /** Tier this step belongs to */
  tier: Tier;
  /** XP required to enter this rank (cumulative) */
  minXP: number;
  /** Step within tier (1-4, or 0 for Conqueror) */
  step: number;
  /** Roman numeral */
  numeral: string;
}

export interface RankData {
  current: RankStep;
  tier: Tier;
  name: string;
  /** Progress within current rank (0-100) */
  percent: number;
  /** XP into current rank */
  xpInto: number;
  /** XP needed for current rank */
  xpNeed: number;
  /** XP remaining to next rank */
  xpToNext: number;
  /** Next rank name, or null if max rank */
  nextRankName: string | null;
}

/** Tier color definitions */
export const TIERS: Record<TierKey, Tier> = {
  bronze: {
    key: "bronze",
    label: "Bronze",
    text: "text-orange-400",
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
    gradient: "from-orange-600 to-amber-500",
  },
  silver: {
    key: "silver",
    label: "Silver",
    text: "text-zinc-300",
    border: "border-zinc-400/40",
    bg: "bg-zinc-400/10",
    gradient: "from-zinc-500 to-slate-300",
  },
  gold: {
    key: "gold",
    label: "Gold",
    text: "text-yellow-300",
    border: "border-yellow-400/40",
    bg: "bg-yellow-400/10",
    gradient: "from-yellow-500 to-amber-400",
  },
  platinum: {
    key: "platinum",
    label: "Platinum",
    text: "text-cyan-300",
    border: "border-cyan-400/40",
    bg: "bg-cyan-400/10",
    gradient: "from-cyan-500 to-sky-400",
  },
  conqueror: {
    key: "conqueror",
    label: "Conqueror",
    text: "text-purple-300",
    border: "border-purple-500/50",
    bg: "bg-purple-500/15",
    gradient: "from-purple-600 via-fuchsia-500 to-rose-500",
  },
};

/** Roman numerals for steps I-IV */
const NUMERALS = ["I", "II", "III", "IV"];

/**
 * Scaling XP thresholds for each rank (cumulative from 0).
 * Formula: each step requires ~1.25x more XP than the previous.
 * Bronze I starts at 0, Conqueror is the final rank.
 */
export const RANK_THRESHOLDS = [
  // Bronze (0-1000 XP total)
  { key: "bronze_1", tier: "bronze" as TierKey, step: 1, minXP: 0 },
  { key: "bronze_2", tier: "bronze" as TierKey, step: 2, minXP: 200 },
  { key: "bronze_3", tier: "bronze" as TierKey, step: 3, minXP: 450 },
  { key: "bronze_4", tier: "bronze" as TierKey, step: 4, minXP: 750 },
  // Silver (1000-3100 XP total)
  { key: "silver_1", tier: "silver" as TierKey, step: 1, minXP: 1100 },
  { key: "silver_2", tier: "silver" as TierKey, step: 2, minXP: 1500 },
  { key: "silver_3", tier: "silver" as TierKey, step: 3, minXP: 1950 },
  { key: "silver_4", tier: "silver" as TierKey, step: 4, minXP: 2450 },
  // Gold (3100-6800 XP total)
  { key: "gold_1", tier: "gold" as TierKey, step: 1, minXP: 3000 },
  { key: "gold_2", tier: "gold" as TierKey, step: 2, minXP: 3600 },
  { key: "gold_3", tier: "gold" as TierKey, step: 3, minXP: 4250 },
  { key: "gold_4", tier: "gold" as TierKey, step: 4, minXP: 4950 },
  // Platinum (6800-12000 XP total)
  { key: "platinum_1", tier: "platinum" as TierKey, step: 1, minXP: 5700 },
  { key: "platinum_2", tier: "platinum" as TierKey, step: 2, minXP: 6500 },
  { key: "platinum_3", tier: "platinum" as TierKey, step: 3, minXP: 7350 },
  { key: "platinum_4", tier: "platinum" as TierKey, step: 4, minXP: 8250 },
  // Conqueror (12000+ XP total)
  { key: "conqueror", tier: "conqueror" as TierKey, step: 0, minXP: 9200 },
];

/** Build the full rank list with resolved tier objects and numerals */
export const RANKS: RankStep[] = RANK_THRESHOLDS.map((t) => ({
  key: t.key,
  name:
    t.tier === "conqueror"
      ? "Conqueror"
      : `${TIERS[t.tier].label} ${NUMERALS[t.step - 1]}`,
  tier: TIERS[t.tier],
  minXP: t.minXP,
  step: t.step,
  numeral: t.tier === "conqueror" ? "" : NUMERALS[t.step - 1],
}));

/**
 * Get the current rank from total XP.
 * Returns rank name, tier styling, progress percentage, and XP details.
 */
export function getRankFromXP(totalXP: number): RankData {
  const xp = Math.max(0, Math.floor(totalXP));

  // Binary search for current rank
  let low = 0;
  let high = RANKS.length - 1;
  let currentIdx = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (RANKS[mid].minXP <= xp) {
      currentIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const current = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] ?? null;

  const xpInto = xp - current.minXP;
  const xpNeed = next ? next.minXP - current.minXP : 0;
  const xpToNext = next ? Math.max(0, next.minXP - xp) : 0;
  const percent = next ? Math.min(100, (xpInto / xpNeed) * 100) : 100;

  return {
    current,
    tier: current.tier,
    name: current.name,
    percent,
    xpInto,
    xpNeed,
    xpToNext,
    nextRankName: next?.name ?? null,
  };
}

/**
 * Get the full rank progression path (for the modal).
 */
export function getRankProgression(): RankStep[] {
  return RANKS;
}
