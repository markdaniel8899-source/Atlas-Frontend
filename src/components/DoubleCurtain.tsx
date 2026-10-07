import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { NavigateFunction } from "react-router-dom";
import { EASE } from "../lib/motion";
import { notifyCurtainRevealed } from "../lib/repaint";

/**
 * Double curtain: two panels close over the screen from top and bottom, the
 * route swaps underneath, then they part again with the seam flare — the
 * same split-open beat as the landing preloader. Every in-app navigation
 * goes through it, so each transition always plays in both directions.
 */
const CLOSE_DURATION = 0.7;
const OPEN_DURATION = 1.05;
const OPEN_DELAY = 0.18;
const CLOSE_MS = Math.round(CLOSE_DURATION * 1000);
const OPEN_MS = Math.round((OPEN_DELAY + OPEN_DURATION + 0.2) * 1000);
/** Waits for onExitComplete; covers routes that don't remount the tree. */
const REVEAL_FALLBACK_MS = 500;

type Stage = null | "cover" | "open";
type StageFn = (stage: Stage) => void;

let stageFn: StageFn | null = null;
let revealPending: (() => void) | null = null;
let playing = false;

/**
 * Close the curtain, swap the route beneath it, then part it again.
 * Reveal is driven by the route AnimatePresence's onExitComplete (App.tsx),
 * so the destination has mounted before the curtain opens.
 */
export function doubleCurtainNavigate(
  navigate: NavigateFunction,
  to: string,
  opts?: { replace?: boolean },
): void {
  if (playing) return;
  if (!stageFn) {
    navigate(to, opts);
    return;
  }

  playing = true;
  stageFn("cover");

  window.setTimeout(() => {
    revealPending = () => {
      if (!playing) return;
      playing = false;
      revealPending = null;
      stageFn?.("open");
      window.setTimeout(() => {
        // Skip if a new cycle already started while this one was opening.
        if (!playing) {
          stageFn?.(null);
          // Panels are fully parted: repaint the uncovered route so blur
          // layers that painted while occluded redraw sharp.
          notifyCurtainRevealed();
        }
      }, OPEN_MS);
    };

    navigate(to, opts);

    window.setTimeout(() => revealPending?.(), REVEAL_FALLBACK_MS);
  }, CLOSE_MS);
}

/** Wired to <AnimatePresence onExitComplete> in App.tsx. */
export function notifyDoubleCurtainRouteExitComplete(): void {
  revealPending?.();
}

/** Persistent across routes: lives in App, outside the route AnimatePresence. */
export function DoubleCurtain() {
  const [stage, setStage] = useState<Stage>(null);

  useEffect(() => {
    stageFn = setStage;
    return () => {
      stageFn = null;
    };
  }, []);

  const covering = stage === "cover";

  return (
    <AnimatePresence>
      {stage !== null && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[9997] overflow-hidden"
        >
          {/* ── Curtain panels: close from top/bottom, then part ── */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-void"
            initial={{ y: "-101%" }}
            animate={{ y: covering ? "0%" : "-101%" }}
            transition={{
              duration: covering ? CLOSE_DURATION : OPEN_DURATION,
              delay: covering ? 0 : OPEN_DELAY,
              ease: EASE,
            }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-void"
            initial={{ y: "101%" }}
            animate={{ y: covering ? "0%" : "101%" }}
            transition={{
              duration: covering ? CLOSE_DURATION : OPEN_DURATION,
              delay: covering ? 0 : OPEN_DELAY,
              ease: EASE,
            }}
          />

          {/* ── Seam light: flares open along the split (as in the preloader) ── */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-center bg-[linear-gradient(90deg,transparent,rgba(207,158,255,0.85),#ffffff,rgba(207,158,255,0.85),transparent)]"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={
              covering
                ? { scaleX: 1, opacity: 0 }
                : { scaleX: 1, opacity: [0, 1, 0] }
            }
            transition={{ duration: covering ? 0.4 : 1.4, ease: EASE }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
