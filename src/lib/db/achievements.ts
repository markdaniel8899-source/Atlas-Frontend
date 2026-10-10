import { supabase } from "../supabase";
import { apiCheckAchievements } from "../gamificationApi";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export interface Achievement {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
}

export interface AchievementCollection {
  achievements: Achievement[];
  /** achievement_id -> ISO unlocked_at. */
  unlocked: Map<number, string>;
}

export const TIER_STYLES: Record<
  AchievementTier,
  { ring: string; text: string; bg: string; glow: string; label: string }
> = {
  bronze: {
    ring: "border-orange-400/35",
    text: "text-orange-300",
    bg: "bg-orange-400/10",
    glow: "shadow-[0_0_16px_rgba(251,146,60,0.25)]",
    label: "Bronze",
  },
  silver: {
    ring: "border-slate-300/35",
    text: "text-slate-200",
    bg: "bg-slate-300/10",
    glow: "shadow-[0_0_16px_rgba(203,213,225,0.25)]",
    label: "Silver",
  },
  gold: {
    ring: "border-amber-400/45",
    text: "text-amber-300",
    bg: "bg-amber-400/10",
    glow: "shadow-[0_0_18px_rgba(251,191,36,0.35)]",
    label: "Gold",
  },
  legendary: {
    ring: "border-fuchsia-400/45",
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-400/10",
    glow: "shadow-[0_0_22px_rgba(217,70,239,0.4)]",
    label: "Legendary",
  },
};

/** Fetches the achievement catalogue plus this user's unlocks. */
export async function fetchAchievements(
  userId: string,
): Promise<AchievementCollection> {
  const [catalogue, unlocks] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, code, title, description, icon, tier")
      .order("id"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId),
  ]);

  const achievements = (catalogue.data ?? []) as Achievement[];
  const unlocked = new Map<number, string>();
  for (const row of (unlocks.data ?? []) as {
    achievement_id: number;
    unlocked_at: string;
  }[]) {
    unlocked.set(row.achievement_id, row.unlocked_at);
  }

  return { achievements, unlocked };
}

/**
 * Runs the achievement engine (server endpoint first, RPC fallback).
 * Returns the codes unlocked by this run.
 */
export async function runAchievementChecks(): Promise<string[]> {
  const viaApi = await apiCheckAchievements();
  if (viaApi) return viaApi;

  try {
    const { data, error } = await supabase.rpc("check_user_achievements");
    if (error || !data) return [];
    const unlocked = (data as { unlocked?: unknown }).unlocked;
    return Array.isArray(unlocked) ? (unlocked as string[]) : [];
  } catch {
    return [];
  }
}
