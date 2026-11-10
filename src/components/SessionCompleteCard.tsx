import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useTimer } from "../context/TimerContext";
import { EASE } from "../lib/motion";

/**
 * Bottom-right "Session Complete!" card shown when a focus session hits
 * its target. Purely in-app: no Notification permission required (the
 * native browser API is unreliable without an explicit permission flow).
 * Auto-hides after 8 seconds (handled in TimerContext) or on close.
 */
export function SessionCompleteCard() {
  const { showCompletionCard, dismissCompletionCard } = useTimer();

  return (
    <AnimatePresence initial={false}>
      {showCompletionCard && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="session-complete-surface fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-[#cf9eff]/20 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_60px_-18px_rgba(0,0,0,0.95)]"
        >
          {/* Hairline of light along the top edge. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <div className="relative flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#cf9eff]/25 bg-[#cf9eff]/10">
              <CheckCircle2 className="size-5 text-[#cf9eff]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Session Complete!
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                Great job! Your focus session has ended.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissCompletionCard}
              aria-label="Close notification"
              className="-m-1 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
