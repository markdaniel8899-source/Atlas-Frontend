import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/motion";
import TextType from "./TextType";

interface PreloaderProps {
  /** Fired the moment the curtain starts opening, so the hero can animate in. */
  onReveal?: () => void;
}

type Phase = "loading" | "reveal" | "done";

/**
 * Cinematic entry: a black stage types WELCOME TO ATLAS, then splits down
 * the middle and slides apart to uncover the hero.
 */
export function Preloader({ onReveal }: PreloaderProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("loading");
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;
  const beatRef = useRef<number | null>(null);

  const startReveal = useCallback(() => {
    setPhase((p) => (p === "loading" ? "reveal" : p));
  }, []);

  // Fallback: open anyway if the typing callback never lands.
  useEffect(() => {
    const hold = reduced ? 1800 : 6500;
    const t = window.setTimeout(startReveal, hold);
    return () => window.clearTimeout(t);
  }, [reduced, startReveal]);

  // Typing finished → let the full word breathe, then open.
  const handleTyped = useCallback(() => {
    if (beatRef.current) window.clearTimeout(beatRef.current);
    beatRef.current = window.setTimeout(startReveal, reduced ? 900 : 2400);
  }, [reduced, startReveal]);

  useEffect(
    () => () => {
      if (beatRef.current) window.clearTimeout(beatRef.current);
    },
    [],
  );

  // Signal the hero, then retire the overlay once the panels have cleared.
  useEffect(() => {
    if (phase !== "reveal") return;
    revealRef.current?.();
    const life = reduced ? 500 : 2100;
    const t = window.setTimeout(() => setPhase("done"), life);
    return () => window.clearTimeout(t);
  }, [phase, reduced]);

  // Nothing scrolls behind a closed curtain.
  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  if (phase === "done") return null;

  const opening = phase === "reveal";

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[9999] h-[100dvh] overflow-hidden"
    >
      {/* ── Curtain panels ── */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-void"
        initial={false}
        animate={opening ? { y: "-101%" } : { y: "0%" }}
        transition={{ duration: reduced ? 0.3 : 1.3, ease: EASE, delay: opening ? 0.22 : 0 }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-void"
        initial={false}
        animate={opening ? { y: "101%" } : { y: "0%" }}
        transition={{ duration: reduced ? 0.3 : 1.3, ease: EASE, delay: opening ? 0.22 : 0 }}
      />

      {/* ── Seam light: flares open along the split ── */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-center bg-[linear-gradient(90deg,transparent,rgba(207,158,255,0.85),#ffffff,rgba(207,158,255,0.85),transparent)]"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={opening ? { scaleX: 1, opacity: [0, 1, 0] } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: reduced ? 0.3 : 1.4, ease: EASE }}
      />

      {/* ── Wordmark ── */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-6"
        initial={false}
        animate={
          opening
            ? { opacity: 0, scale: 1.1, filter: "blur(12px)" }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="relative">
          <motion.div
            animate={reduced ? undefined : { opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex justify-center"
          >
            {reduced ? (
              <p className="font-outfit text-center text-[clamp(1.05rem,3.2vw,2rem)] font-semibold uppercase tracking-[0.3em] text-white [text-indent:0.3em] drop-shadow-[0_0_28px_rgba(207,158,255,0.8)]">
                Welcome to Atlas
              </p>
            ) : (
              <TextType
                as="p"
                text="Welcome to Atlas"
                typingSpeed={90}
                initialDelay={300}
                pauseDuration={1500}
                showCursor
                cursorCharacter="|"
                cursorBlinkDuration={0.5}
                loop={false}
                onComplete={handleTyped}
                className="font-outfit text-center text-[clamp(1.05rem,3.2vw,2rem)] font-semibold uppercase tracking-[0.3em] text-white [text-indent:0.3em] drop-shadow-[0_0_28px_rgba(207,158,255,0.8)]"
              />
            )}
          </motion.div>
          <span
            className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(207,158,255,0.35),transparent)] blur-xl"
          />
        </div>

        {/* Progress hairline */}
        <div className="h-px w-40 overflow-hidden bg-white/10">
          <motion.div
            className="h-full w-full origin-left bg-[linear-gradient(90deg,transparent,rgba(207,158,255,0.9),#ffffff,rgba(207,158,255,0.9),transparent)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduced ? 0.3 : 3, ease: "easeInOut" }}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span
            data-animate
            className="size-1.5 rounded-full bg-[#cf9eff] shadow-[0_0_10px_2px_rgba(207,158,255,0.8)]"
            style={{ animation: "preloader-breathe 1.1s ease-in-out infinite" }}
          />
          <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40">
            Loading
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default Preloader;
