import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  RANKS,
  RANK_TIER_KEYS,
  TIERS,
  type RankData,
} from "../../lib/gamification";
import { RankBadge3D } from "./RankBadge3D";
import { EASE } from "../../lib/motion";

interface RankProgressionModalProps {
  open: boolean;
  onClose: () => void;
  currentRank: RankData;
}

/** Compact XP label for under each badge (e.g. 250 → "250", 1375 → "1.4k") */
function fmtXP(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
}

/**
 * Atlas Ranks progression grid — all 24 badges (6 ranks x 4 tiers).
 * Current rank: full opacity + glowing purple ring.
 * Past ranks: full opacity. Future ranks: dimmed to 30%.
 */
export function RankProgressionModal({
  open,
  onClose,
  currentRank,
}: RankProgressionModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const currentIndex = RANKS.findIndex((r) => r.key === currentRank.current.key);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Rank progression"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#0a0a14]/95 shadow-[0_32px_90px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] p-6 pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-star/70">
                  Atlas Ranks
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Your Journey
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  {currentRank.nextRankName
                    ? `Currently ${currentRank.name} · ${currentRank.xpToNext.toLocaleString()} XP to ${currentRank.nextRankName}`
                    : `${currentRank.name} · Max rank reached`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/50 transition-colors hover:border-white/20 hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* 6 x 4 badge grid — scrollable */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-lenis-prevent
            >
              <div className="space-y-5">
                {RANK_TIER_KEYS.map((tierKey) => (
                  <div key={tierKey}>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.28em] ${TIERS[tierKey].text}`}
                    >
                      {TIERS[tierKey].label}
                    </p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2 sm:gap-3">
                      {RANKS.filter((r) => r.tier.key === tierKey).map(
                        (rank) => {
                          const idx = RANKS.indexOf(rank);
                          const isCurrent = idx === currentIndex;
                          const isFuture = idx > currentIndex;

                          return (
                            <div
                              key={rank.key}
                              title={`${rank.name} · ${rank.minXP.toLocaleString()} XP`}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                                isCurrent
                                  ? "border-[#cf9eff]/50 bg-[#cf9eff]/[0.07] shadow-[0_0_22px_rgba(207,158,255,0.35)] ring-1 ring-[#cf9eff]/60"
                                  : "border-white/[0.06] bg-white/[0.02]"
                              }`}
                            >
                              <RankBadge3D
                                rank={rank.tier.key}
                                tier={rank.step}
                                size={44}
                                className={`drop-shadow-[0px_4px_6px_rgba(0,0,0,0.5)]${
                                  isFuture ? " grayscale opacity-40" : ""
                                }${isCurrent ? " scale-110" : ""}`}
                              />
                              <span
                                className={`text-[9px] font-semibold tabular-nums ${
                                  isCurrent
                                    ? "text-[#cf9eff]"
                                    : "text-white/35"
                                }`}
                              >
                                {isCurrent ? (
                                  <span className="font-bold uppercase tracking-wider">
                                    You
                                  </span>
                                ) : (
                                  fmtXP(rank.minXP)
                                )}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/[0.06] p-4 px-6">
              <p className="text-center text-[11px] text-white/35">
                Keep studying and completing quizzes to climb the ranks
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
