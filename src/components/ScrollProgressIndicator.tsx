import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { EASE } from "../lib/motion";
import { smoothScrollToTop } from "../lib/scroll";

const SHOW_AT_PERCENT = 20;
const RING_RADIUS = 21;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ScrollProgressIndicator() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      // Round to the integer the badge actually renders: identical visuals,
      // but React bails out of re-renders between whole-percent steps instead
      // of committing a new float on every scroll frame.
      const next = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      setPercent((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const visible = percent >= SHOW_AT_PERCENT;
  const dashOffset = RING_CIRCUMFERENCE * (1 - percent / 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.92 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="pointer-events-none fixed right-4 bottom-4 z-[100] flex items-center gap-2.5 sm:right-6 sm:bottom-6"
        >
          <span
            aria-hidden="true"
            className="rounded-full border border-white/10 bg-[#030305]/70 px-2.5 py-1 text-xs font-medium tabular-nums text-white/70 backdrop-blur-md"
          >
            {Math.round(percent)}%
          </span>

          <button
            type="button"
            onClick={smoothScrollToTop}
            aria-label="Scroll back to top"
            className="pointer-events-auto relative flex size-12 items-center justify-center rounded-full border border-white/10 bg-[#030305]/70 text-white/80 backdrop-blur-md transition-colors hover:border-[#cf9eff]/60 hover:text-white"
          >
            <svg
              viewBox="0 0 48 48"
              className="absolute inset-0 size-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2.5"
              />
              <circle
                cx="24"
                cy="24"
                r={RING_RADIUS}
                fill="none"
                stroke="#cf9eff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-150 ease-out"
              />
            </svg>
            <ArrowUp className="size-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
