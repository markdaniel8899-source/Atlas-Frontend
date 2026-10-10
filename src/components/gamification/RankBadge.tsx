import type { RankStep } from "../../lib/gamification";

interface RankBadgeProps {
  rank: RankStep;
  size?: number;
  className?: string;
}

/**
 * Unique SVG rank badge for each of the 17 Free Fire style ranks.
 * Bronze: brownish/orange, Silver: gray/white, Gold: yellow/gold metallic,
 * Platinum: cyan/light blue glowing, Conqueror: red/purple animated glow.
 */
export function RankBadge({ rank, size = 48, className = "" }: RankBadgeProps) {
  const tier = rank.tier.key;
  const step = rank.step;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Rank badge: ${rank.name}`}
    >
      <defs>
        {/* Metallic gradient for each tier */}
        {tier === "bronze" && (
          <>
            <linearGradient id={`bronze-grad-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`bronze-shine-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
            </linearGradient>
          </>
        )}
        {tier === "silver" && (
          <>
            <linearGradient id={`silver-grad-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e4e4e7" />
              <stop offset="50%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>
            <linearGradient id={`silver-shine-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fafafa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d4d4d8" stopOpacity="0.3" />
            </linearGradient>
          </>
        )}
        {tier === "gold" && (
          <>
            <linearGradient id={`gold-grad-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id={`gold-shine-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.4" />
            </linearGradient>
          </>
        )}
        {tier === "platinum" && (
          <>
            <linearGradient id={`platinum-grad-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id={`platinum-shine-${step}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
            </linearGradient>
          </>
        )}
        {tier === "conqueror" && (
          <>
            <linearGradient id="conqueror-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="35%" stopColor="#d946ef" />
              <stop offset="70%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <linearGradient id="conqueror-shine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0.5" />
            </linearGradient>
            <filter id="conqueror-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        )}
      </defs>

      {/* Outer hexagon shape */}
      <path
        d="M24 2L42 12.5V33.5L24 44L6 33.5V12.5L24 2Z"
        fill={`url(#${tier}-grad-${tier === "conqueror" ? "" : step})`}
        stroke={
          tier === "conqueror" ? "#e879f9" : `url(#${tier}-shine-${step})`
        }
        strokeWidth="1.5"
        filter={tier === "conqueror" ? "url(#conqueror-glow)" : undefined}
      />

      {/* Inner highlight */}
      <path
        d="M24 6L38 14.5V29.5L24 38L10 29.5V14.5L24 6Z"
        fill={`url(#${tier}-shine-${tier === "conqueror" ? "" : step})`}
        opacity="0.3"
      />

      {/* Step indicator dots or Roman numeral */}
      {tier === "conqueror" ? (
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          ★
        </text>
      ) : (
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        >
          {rank.numeral}
        </text>
      )}

      {/* Step pips (small dots showing tier progress) */}
      {tier !== "conqueror" && (
        <>
          {[1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={18 + (i - 1) * 4}
              y="34"
              r="1.2"
              fill={i <= step ? "#fff" : "rgba(255,255,255,0.3)"}
              opacity={i <= step ? 0.9 : 0.4}
            />
          ))}
        </>
      )}

      {/* Conqueror animated shimmer */}
      {tier === "conqueror" && (
        <path
          d="M10 14.5L24 6L38 14.5"
          stroke="url(#conqueror-shine)"
          strokeWidth="1"
          opacity="0.6"
        />
      )}
    </svg>
  );
}
