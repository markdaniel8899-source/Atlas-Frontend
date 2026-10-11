import { useId } from "react";
import { TIERS, type TierKey } from "../../lib/gamification";

interface RankBadge3DProps {
  /** Which rank family the badge belongs to */
  rank: TierKey;
  /** Tier within the rank (1-4 → chevrons + star) */
  tier: number;
  size?: number;
  className?: string;
}

/**
 * 3D metallic gradient stops per rank: [light, mid, dark].
 * Vertical light-to-dark stop order simulates a lit beveled edge.
 */
const METAL: Record<TierKey, [string, string, string]> = {
  bronze: ["#f2b483", "#cd7f32", "#7c4a12"],
  silver: ["#f1f5f9", "#c0c0c0", "#6b7280"],
  gold: ["#fff0a8", "#ffd700", "#a1740a"],
  platinum: ["#a5f3fc", "#22d3ee", "#0b6678"],
  diamond: ["#ddd0ff", "#9370db", "#4c2a8f"],
  conqueror: ["#ff8fa8", "#ff0055", "#8f0f34"],
};

/** Brighter icon gradient (chevrons/star) so they pop off the navy face. */
const ICON: Record<TierKey, [string, string]> = {
  bronze: ["#ffd9a8", "#e08a3c"],
  silver: ["#ffffff", "#c8ccd4"],
  gold: ["#fff6c2", "#f5c400"],
  platinum: ["#cffafe", "#38e0f2"],
  diamond: ["#ead9ff", "#a78bfa"],
  conqueror: ["#ffb0c4", "#ff2e6e"],
};

/** Outer hexagon (pointy-top) and its inset navy face, 48x48 viewBox. */
const HEX_OUTER = "M24 3 L41.5 13.25 V33.75 L24 44 L6.5 33.75 V13.25 Z";
const HEX_INNER = "M24 7.6 L37.77 15.55 V31.45 L24 39.4 L10.23 31.45 V15.55 Z";
/** Bevel strokes: bright top-left edges, dark bottom-right edges. */
const BEVEL_LIGHT = "M7.9 14.1 L24 4.6 L40.1 14.1";
const BEVEL_DARK = "M40.1 32.9 L24 42.4 L7.9 32.9";

/** A filled chevron (V pointing up) whose apex sits at (24, y). */
function chevron(y: number): string {
  return `M17 ${y + 6} L24 ${y} L31 ${y + 6} V${y + 9.2} L24 ${y + 3.2} L17 ${y + 9.2} Z`;
}

/** Chevron apex Y positions, bottom-most first (nested stack). */
const CHEVRON_Y = [26, 19.5, 13];

/** Five-point star centered at (24, 10.6), outer r 2.9, inner r 1.25. */
const STAR =
  "M24 7.7 L24.73 9.59 L26.76 9.7 L25.19 10.99 L25.7 12.95 L24 11.85 " +
  "L22.3 12.95 L22.81 10.99 L21.24 9.7 L23.27 9.59 Z";

/**
 * 3D isometric rank badge — one hexagon for every rank, with a thick
 * beveled metallic border and a dark navy (#0f172a) inner face.
 * Tiers are told apart by distinct inner icons (not numerals):
 *   I: one gold chevron · II: two chevrons · III: three chevrons
 *   IV: three chevrons + gold star above
 * The border/icon tint changes per rank (copper, silver, gold, cyan,
 * violet, crimson); Conqueror additionally pulses via animate-pulse.
 */
export function RankBadge3D({
  rank,
  tier,
  size = 48,
  className = "",
}: RankBadge3DProps) {
  const uid = useId();
  const clamped = Math.min(Math.max(tier, 1), 4);
  const isConqueror = rank === "conqueror";
  const label = TIERS[rank].label;
  const [mLight, mMid, mDark] = METAL[rank];
  const [iLight, iDark] = ICON[rank];
  const chevrons = CHEVRON_Y.slice(0, Math.min(clamped, 3));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${isConqueror ? "animate-pulse drop-shadow-[0_0_8px_rgba(255,0,85,0.55)]" : ""}${className}`}
      role="img"
      aria-label={`${label} tier ${clamped} rank badge`}
    >
      <defs>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mLight} />
          <stop offset="50%" stopColor={mMid} />
          <stop offset="100%" stopColor={mDark} />
        </linearGradient>
        <linearGradient id={`i-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={iLight} />
          <stop offset="100%" stopColor={iDark} />
        </linearGradient>
      </defs>

      {/* Thick metallic border */}
      <path
        d={HEX_OUTER}
        fill={`url(#m-${uid})`}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Beveled edges: lit top-left, shaded bottom-right */}
      <path
        d={BEVEL_LIGHT}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={BEVEL_DARK}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dark navy inner face, recessed */}
      <path
        d={HEX_INNER}
        fill="#0f172a"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Tier icons: stacked gold chevrons (+ star for tier 4) */}
      {chevrons.map((y) => (
        <path key={y} d={chevron(y)} fill={`url(#i-${uid})`} />
      ))}
      {clamped === 4 && <path d={STAR} fill={`url(#i-${uid})`} />}
    </svg>
  );
}
