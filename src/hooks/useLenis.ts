import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "../lib/scroll";

export function useLenis() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.5,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    setLenis(lenis);

    const onKeydown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        el.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const page =
        e.key === " " || e.key === "PageDown" || e.key === "PageUp";
      const line = e.key === "ArrowDown" || e.key === "ArrowUp";
      if (!page && !line) return;
      e.preventDefault();
      const down =
        e.key === "ArrowDown" || e.key === " " || e.key === "PageDown";

      const amount = page ? window.innerHeight * 0.85 : 180;
      lenis.scrollTo(lenis.scroll + (down ? amount : -amount), {
        duration: 1.5,
      });
    };
    window.addEventListener("keydown", onKeydown);

    const onScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      gsap.ticker.remove(raf);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      setLenis(null);
    };
  }, []);
}
