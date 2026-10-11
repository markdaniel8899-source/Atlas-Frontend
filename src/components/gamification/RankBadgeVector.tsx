import { useId } from "react";
import { TIERS, type TierKey } from "../../lib/gamification";

interface RankBadgeVectorProps {
  /** Which rank family the badge belongs to */
  rank: TierKey;
  /** Tier within the rank (1-4, adds chevrons / wings / aura) */
  tier: number;
  size?: number;
  className?: string;
}

/** Metallic gradient stops per rank: [light, mid, dark], vertical. */
const METAL: Record<TierKey, [string, string, string]> = {
  bronze: ["#f2b483", "#cd7f32", "#7c4a12"],
  silver: ["#f1f5f9", "#c0c0c0", "#6b7280"],
  gold: ["#fff0a8", "#ffd700", "#a1740a"],
  platinum: ["#a5f3fc", "#22d3ee", "#0b6678"],
  diamond: ["#ddd0ff", "#9370db", "#4c2a8f"],
  conqueror: ["#ff8fa8", "#ff0055", "#8f0f34"],
};

/** Tier-4 aura glow color (Platinum / Diamond / Conqueror). */
const AURA: Partial<Record<TierKey, string>> = {
  platinum: "#67e8f9",
  diamond: "#a78bfa",
  conqueror: "#ff2e6e",
};

/** Tier-4 winged ranks (Bronze / Silver / Gold); the rest get an aura. */
const WINGED: readonly TierKey[] = ["bronze", "silver", "gold"];

/** Unique base shape per rank (48x48 viewBox; silver is a circle). */
const SHAPE: Record<TierKey, string> = {
  bronze: "M24 3 L41.5 13.25 V33.75 L24 44 L6.5 33.75 V13.25 Z", // hexagon
  silver: "", // circle, rendered as <circle>
  gold: "M24 4 L42 11 V25 C42 35 34 41.5 24 44.5 C14 41.5 6 35 6 25 V11 Z", // pointed shield
  platinum: "M24 3 L45 24 L24 45 L3 24 Z", // rhombus
  diamond: "M14 8 H34 L43 19 L24 44 L5 19 Z", // faceted gem
  conqueror:
    "M24 3 L27.83 14.76 L38.85 9.15 L33.24 20.17 L45 24 L33.24 27.83 " +
    "L38.85 38.85 L27.83 33.24 L24 45 L20.17 33.24 L9.15 38.85 L14.76 27.83 " +
    "L3 24 L14.76 20.17 L9.15 9.15 L20.17 14.76 Z", // starburst
};
const GEM_FACETS =
  "M14 8 V19 M34 8 V19 M5 19 H43 M14 19 L24 44 M34 19 L24 44";

/** Small two-feather wing on the right side; mirrored for the left. */
const WING =
  "M36.5 17.5 C42 16.5 46 18.5 47.5 23.5 C44.5 21.5 41.5 21.8 39.5 23.5 " +
  "C42.5 25 43.5 28 43 31.5 C39.5 29 37 27 35.5 24 Z";

/** A small filled chevron (V pointing up) with apex at (24, y). */
function chevron(y: number): string {
  return `M18 ${y + 5.5} L24 ${y} L30 ${y + 5.5} V${y + 8.4} L24 ${y + 2.9} L18 ${y + 8.4} Z`;
}

/** Shrink the base shape slightly so tier-4 wings fit inside the viewBox. */
const WINGED_SHRINK = "translate(24 24) scale(0.84) translate(-24 -24)";

/**
 * Vector winged rank badge — a unique metallic base shape per rank
 * (hexagon, round shield, pointed shield, rhombus, gem, starburst) with
 * tiers that evolve by ADDING elements:
 *   I   · base shape only
 *   II  · + one chevron inside
 *   III · + two chevrons inside
 *   IV  · + two wings on the sides (Bronze/Silver/Gold)
 *         or a glowing aura (Platinum/Diamond/Conqueror)
 */
export function RankBadgeVector({
  rank,
  tier,
  size = 48,
  className = "",
}: RankBadgeVectorProps) {
  const uid = useId();
  const clamped = Math.min(Math.max(tier, 1), 4);
  const label = TIERS[rank].label;
  const isWingedTier = clamped === 4 && WINGED.includes(rank);
  const aura = clamped === 4 ? AURA[rank] : undefined;
  const chevrons = clamped === 2 ? [20] : clamped >= 3 ? [17, 23] : [];
  const [mLight, mMid, mDark] = METAL[rank];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform hover:scale-110 ${className}`}
      role="img"
      aria-label={`${label} tier ${clamped} rank badge`}
    >
      <defs>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mLight} />
          <stop offset="50%" stopColor={mMid} />
          <stop offset="100%" stopColor={mDark} />
        </linearGradient>
        {aura && (
          <filter
            id={`g-${uid}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        )}
      </defs>

      {/* Tier-4 glowing aura behind the base (Platinum/Diamond/Conqueror) */}
      {aura && (
        <g filter={`url(#g-${uid})`} opacity="0.55">
          <path
            d={SHAPE[rank]}
            transform="translate(24 24) scale(1.12) translate(-24 -24)"
            fill={aura}
          />
        </g>
      )}

      {/* Unique metallic base shape (+ chevrons, scaled down when winged) */}
      <g transform={isWingedTier ? WINGED_SHRINK : undefined}>
        {rank === "silver" ? (
          <circle
            cx="24"
            cy="24"
            r="20"
            fill={`url(#m-${uid})`}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1"
          />
        ) : (
          <path
            d={SHAPE[rank]}
            fill={`url(#m-${uid})`}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        )}
        {rank === "diamond" && (
          <path
            d={GEM_FACETS}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        )}
        {/* Tier chevrons (tier 2: one, tier 3-4: two) */}
        {chevrons.map((y) => (
          <path
            key={y}
            d={chevron(y)}
            fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.28)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* Tier-4 wings (Bronze/Silver/Gold) */}
      {isWingedTier && (
        <>
          <path
            d={WING}
            fill={`url(#m-${uid})`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d={WING}
            transform="matrix(-1 0 0 1 48 0)"
            fill={`url(#m-${uid})`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
