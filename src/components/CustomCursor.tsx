import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";

// Original landing-page glide - do not tune: the smooth trail is intentional
// there (only the login form + dashboard are allowed to change, per user
// complaint about the cursor arriving late behind the real mouse).
const GLIDE = { stiffness: 550, damping: 40, mass: 0.6 } as const;

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);
  const { pathname } = useLocation();
  const snappy =
    pathname === "/login" ||
    pathname === "/wp-admin/login" ||
    pathname.startsWith("/app");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const glideX = useSpring(x, GLIDE);
  const glideY = useSpring(y, GLIDE);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!fine || reduced) return;

    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as HTMLElement | null;
      setHot(
        Boolean(
          target?.closest("a, button, [role='button'], input, textarea, select"),
        ),
      );
    };

    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  // Portaled to <body> so the cursor stacks above portaled modals (quick
  // start, editors): inside #root (z-10) it would paint below a z-50 portal
  // and the custom cursor would vanish the moment a card opens.
  return createPortal(
    <motion.div
      style={{
        x: snappy ? x : glideX,
        y: snappy ? y : glideY,
      }}
      className="pointer-events-none fixed top-0 left-0 z-[10001] mix-blend-difference"
      aria-hidden
    >
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{
          width: hot ? 40 : 8,
          height: hot ? 40 : 8,
          backgroundColor: hot ? "rgba(255,255,255,0)" : "#e8f4ff",
          boxShadow: hot
            ? "0 0 0 1.5px rgba(255,255,255,0.95)"
            : "0 0 14px rgba(157,180,255,0.95)",
        }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
      />
    </motion.div>,
    document.body,
  );
}
