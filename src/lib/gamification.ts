import type { LucideIcon } from "lucide-react";
import { Crown, Diamond, Flame, Medal, Shield, Star } from "lucide-react";

export type RankKey =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "heroic";

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

/** Free Fire style tiers: Bronze 1-10, Silver 11-20, Gold 21-30,
 *  Platinum 31-40, Diamond 41-49, Heroic 50+. */
export const RANK_TIERS: RankTier[] = [
  {
    key: "bronze",
    label: "Bronze",
    minLevel: 1,
    text: "text-orange-400",
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/60",
    glow: "shadow-[0_0_12px_rgba(249,115,22,0.3)]",
    gradient: "from-orange-600 to-amber-500",
    icon: Shield,
  },
  {
    key: "silver",
    label: "Silver",
    minLevel: 11,
    text: "text-zinc-200",
    border: "border-zinc-300/40",
    bg: "bg-zinc-300/10",
    ring: "ring-zinc-300/70",
    glow: "shadow-[0_0_12px_rgba(212,212,216,0.3)]",
    gradient: "from-zinc-400 to-slate-200",
    icon: Medal,
  },
  {
    key: "gold",
    label: "Gold",
    minLevel: 21,
    text: "text-yellow-300",
    border: "border-yellow-400/45",
    bg: "bg-yellow-400/10",
    ring: "ring-yellow-400/70",
    glow: "shadow-[0_0_16px_rgba(250,204,21,0.4)]",
    gradient: "from-yellow-500 to-amber-300",
    icon: Star,
  },
  {
    key: "platinum",
    label: "Platinum",
    minLevel: 31,
    text: "text-cyan-300",
    border: "border-cyan-400/45",
    bg: "bg-cyan-400/10",
    ring: "ring-cyan-400/70",
    glow: "shadow-[0_0_16px_rgba(34,211,238,0.4)]",
    gradient: "from-cyan-400 to-sky-300",
    icon: Crown,
  },
  {
    key: "diamond",
    label: "Diamond",
    minLevel: 41,
    text: "text-blue-300",
    border: "border-blue-400/45",
    bg: "bg-blue-400/10",
    ring: "ring-blue-400/75",
    glow: "shadow-[0_0_18px_rgba(96,165,250,0.45)]",
    gradient: "from-blue-500 to-purple-500",
    icon: Diamond,
  },
  {
    key: "heroic",
    label: "Heroic",
    minLevel: 50,
    text: "text-rose-300",
    border: "border-rose-400/50",
    bg: "bg-rose-400/10",
    ring: "ring-rose-500/80",
    glow: "shadow-[0_0_24px_rgba(244,63,94,0.6)]",
    gradient: "from-rose-500 to-red-500",
    icon: Flame,
  },
];

/** Mirrors the SQL CASE in migration 0012 (rank generated column). */
export function rankForLevel(level: number): RankTier {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  let tier = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) {
    if (safe >= candidate.minLevel) tier = candidate;
  }
  return tier;
}
