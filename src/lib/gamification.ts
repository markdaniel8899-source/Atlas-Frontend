import type { LucideIcon } from "lucide-react";
import { Crown, Gem, Shield, Sparkles, Star } from "lucide-react";

export type RankKey =
  | "novice"
  | "scholar"
  | "expert"
  | "master"
  | "grandmaster";

export interface RankTier {
  key: RankKey;
  label: string;
  minLevel: number;
  /** Tailwind classes: badge text. */
  text: string;
  /** Tailwind classes: badge border. */
  border: string;
  /** Tailwind classes: badge background. */
  bg: string;
  /** Tailwind classes: avatar ring color. */
  ring: string;
  /** Tailwind classes: soft outer glow for the badge. */
  glow: string;
  /** Tailwind classes: progress-bar fill gradient. */
  gradient: string;
  icon: LucideIcon;
}

/** Five tiers: Novice 1-5, Scholar 6-15, Expert 16-30, Master 31-49, Grandmaster 50+. */
export const RANK_TIERS: RankTier[] = [
  {
    key: "novice",
    label: "Novice",
    minLevel: 1,
    text: "text-zinc-300",
    border: "border-white/15",
    bg: "bg-white/[0.06]",
    ring: "ring-zinc-400/60",
    glow: "shadow-[0_0_12px_rgba(161,161,170,0.2)]",
    gradient: "from-zinc-400 to-slate-300",
    icon: Shield,
  },
  {
    key: "scholar",
    label: "Scholar",
    minLevel: 6,
    text: "text-blue-300",
    border: "border-blue-400/35",
    bg: "bg-blue-400/10",
    ring: "ring-blue-400/70",
    glow: "shadow-[0_0_14px_rgba(96,165,250,0.35)]",
    gradient: "from-blue-500 to-cyan-400",
    icon: Star,
  },
  {
    key: "expert",
    label: "Expert",
    minLevel: 16,
    text: "text-purple-300",
    border: "border-purple-400/40",
    bg: "bg-purple-400/10",
    ring: "ring-purple-400/75",
    glow: "shadow-[0_0_16px_rgba(168,85,247,0.4)]",
    gradient: "from-purple-500 to-fuchsia-400",
    icon: Sparkles,
  },
  {
    key: "master",
    label: "Master",
    minLevel: 31,
    text: "text-amber-300",
    border: "border-amber-400/45",
    bg: "bg-amber-400/10",
    ring: "ring-amber-400/80",
    glow: "shadow-[0_0_18px_rgba(251,191,36,0.45)]",
    gradient: "from-amber-400 to-yellow-300",
    icon: Crown,
  },
  {
    key: "grandmaster",
    label: "Grandmaster",
    minLevel: 50,
    text: "text-rose-300",
    border: "border-rose-400/50",
    bg: "bg-rose-400/10",
    ring: "ring-rose-500/80",
    glow: "shadow-[0_0_22px_rgba(244,63,94,0.55)]",
    gradient: "from-rose-500 to-red-400",
    icon: Gem,
  },
];

/** Mirrors the SQL CASE in migration 0011 (rank generated column). */
export function rankForLevel(level: number): RankTier {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  let tier = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) {
    if (safe >= candidate.minLevel) tier = candidate;
  }
  return tier;
}

/** Next tier above the current one, or null at Grandmaster. */
export function nextRankTier(level: number): RankTier | null {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return RANK_TIERS.find((tier) => tier.minLevel > safe) ?? null;
}

/** XP needed (per 200-XP level step) shown on rank chips. */
export const XP_PER_LEVEL = 200;
