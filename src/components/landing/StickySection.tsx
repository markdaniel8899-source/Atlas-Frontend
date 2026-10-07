import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";
import { useCallback, useSyncExternalStore } from "react";
import type { ReactNode, RefObject } from "react";

/** True while the viewport is at least `minWidth` px wide (no SSR window). */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function CoverLayer({
  targetRef,
  children,
}: {
  targetRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  // The z-axis cover is a desktop-only effect: on phones/tablets the
  // previous section scrolls away in normal flow, so dimming it while the
  // next one approaches would only hide content the reader still needs.
  const enabled = useMediaQuery("(min-width: 1024px)");

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "start start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const brightness = useTransform(scrollYProgress, [0, 1], [1, 0.55]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 8]);
  const filter = useMotionTemplate`brightness(${brightness}) blur(${blur}px)`;

  return (
    <motion.div
      className="h-full w-full will-change-transform"
      style={enabled ? { scale, filter } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface StickySectionProps {
  children: ReactNode;
  zIndex: number;
  background?: string;
  nextRef?: RefObject<HTMLElement | null>;
  sectionRef?: RefObject<HTMLElement | null>;
  shadow?: boolean;
  id?: string;
  className?: string;
  heightClassName?: string;
}

export function StickySection({
  children,
  zIndex,
  background,
  nextRef,
  sectionRef,
  shadow = true,
  id,
  className = "",
  heightClassName = "h-screen",
}: StickySectionProps) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className={`sticky top-0 w-full overflow-hidden ${heightClassName} ${
        shadow
          ? "shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.75)]"
          : ""
      } ${className}`}
      style={{ zIndex, background }}
    >
      {nextRef ? (
        <CoverLayer targetRef={nextRef}>{children}</CoverLayer>
      ) : (
        children
      )}
    </section>
  );
}

export { CoverLayer };
