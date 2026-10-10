import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { RANKS, type RankData } from "../../lib/gamification";
import { RankBadge } from "./RankBadge";
import { EASE } from "../../lib/motion";

interface RankProgressionModalProps {
  open: boolean;
  onClose: () => void;
  currentRank: RankData;
}

/**
 * Modal showing the full rank progression path from Bronze I to Conqueror.
 * Highlights the user's current rank and shows XP thresholds.
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="w-full max-w-lg rounded-2xl bg-[#0a0a14]/95 border border-white/10 shadow-[0_32px_90px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-6 pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-star/70">
                  Rank Progression
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Your Journey
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Currently {currentRank.name} · {currentRank.xpToNext} XP to next
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/50 transition-colors hover:border-white/20 hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Progress path */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-3">
                {RANKS.map((rank, idx) => {
                  const isCurrent = rank.key === currentRank.current.key;
                  const isPast = idx < currentIndex;

                  return (
                    <div
                      key={rank.key}
                      className={`flex items-center gap-4 rounded-xl border p-3 transition-all ${
                        isCurrent
                          ? `border-white/20 bg-white/[0.07] ring-1 ring-star/40`
                          : isPast
                            ? "border-white/[0.06] bg-white/[0.02]"
                            : "border-white/[0.04] bg-white/[0.01] opacity-60"
                      }`}
                    >
                      {/* Badge */}
                      <div
                        className={`shrink-0 transition-transform ${
                          isCurrent ? "scale-110" : isPast ? "scale-100" : "scale-90"
                        }`}
                      >
                        <RankBadge rank={rank} size={44} />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold ${
                              isCurrent ? "text-white" : "text-white/80"
                            }`}
                          >
                            {rank.name}
                          </p>
                          {isCurrent && (
                            <span className="rounded-full bg-star/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-star">
                              You
                            </span>
                          )}
                          {isPast && (
                            <span className="text-[10px] text-emerald-400/70">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {rank.minXP.toLocaleString()} XP minimum
                        </p>
                      </div>

                      {/* Progress indicator for current */}
                      {isCurrent && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-white">
                            {Math.round(currentRank.percent)}%
                          </p>
                          <p className="text-[10px] text-white/40">
                            {currentRank.xpInto.toLocaleString()} /{" "}
                            {currentRank.xpNeed.toLocaleString()} XP
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] p-4 px-6">
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
