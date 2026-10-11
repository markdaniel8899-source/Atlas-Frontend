import { useId } from "react";
import { TIERS, type TierKey } from "../../lib/gamification";

interface RankBadgeProps {
  /** Which rank family the badge belongs to */
  rank: TierKey;
  /** Tier within the rank (1-4, rendered as I / II / III / IIII) */
  tier: number;
  size?: number;
  className?: string;
}

/** Roman numerals for tiers 1-4 (IIII, not IV) */
const NUMERALS = ["I", "II", "III", "IIII"];

/** Geometric shape paths, drawn in a 48x48 viewBox. */
const HEXAGON = "M24 3 L41.5 13.25 V33.75 L24 44 L6.5 33.75 V13.25 Z";
const SHIELD = "M24 4 L42 11 V25 C42 35 34 41.5 24 44.5 C14 41.5 6 35 6 25 V11 Z";
const RHOMBUS = "M24 3 L45 24 L24 45 L3 24 Z";
const GEM = "M14 8 H34 L43 19 L24 44 L5 19 Z";
const GEM_FACETS = "M14 8 V19 M34 8 V19 M5 19 H43 M14 19 L24 44 M34 19 L24 44";
const STARBURST =
  "M24 3 L27.83 14.76 L38.85 9.15 L33.24 20.17 L45 24 L33.24 27.83 " +
  "L38.85 38.85 L27.83 33.24 L24 45 L20.17 33.24 L9.15 38.85 L14.76 27.83 " +
  "L3 24 L14.76 20.17 L9.15 9.15 L20.17 14.76 Z";

/**
 * Minimalist geometric rank badge — one distinct shape + color per rank,
 * with the tier shown as a bold white Roman numeral (I, II, III, IIII):
 *   Bronze hexagon #cd7f32 · Silver circle #c0c0c0 · Gold shield #ffd700
 *   Platinum rhombus #00ffff · Diamond gem #9370db
 *   Conqueror starburst #ff0055→#ff5500 with a subtle CSS pulse
 */
export function RankBadge({
  rank,
  tier,
  size = 48,
  className = "",
}: RankBadgeProps) {
  const uid = useId();
  const numeral = NUMERALS[Math.min(Math.max(tier, 1), 4) - 1];
  const isConqueror = rank === "conqueror";
  const label = TIERS[rank].label;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${isConqueror ? "rank-pulse " : ""}${className}`}
      role="img"
      aria-label={`${label} ${numeral} rank badge`}
    >
      {isConqueror && (
        <defs>
          <linearGradient
            id={`conqueror-${uid}`}
            x1="10%"
            y1="0%"
            x2="90%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ff0055" />
            <stop offset="100%" stopColor="#ff5500" />
          </linearGradient>
        </defs>
      )}

      {rank === "bronze" && (
        <path
          d={HEXAGON}
          fill="#cd7f32"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {rank === "silver" && (
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="#c0c0c0"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
        />
      )}

      {rank === "gold" && (
        <path
          d={SHIELD}
          fill="#ffd700"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {rank === "platinum" && (
        <path
          d={RHOMBUS}
          fill="#00ffff"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {rank === "diamond" && (
        <>
          <path
            d={GEM}
            fill="#9370db"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d={GEM_FACETS}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </>
      )}

      {rank === "conqueror" && (
        <path
          d={STARBURST}
          fill={`url(#conqueror-${uid})`}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {/* Tier numeral — white, bold, centered (dark halo keeps it legible
          on the bright gold/cyan fills) */}
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={numeral.length > 2 ? 12 : 14}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
        paintOrder="stroke"
      >
        {numeral}
      </text>
    </svg>
  );
}
