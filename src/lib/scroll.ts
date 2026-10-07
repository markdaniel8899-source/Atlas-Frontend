import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instance) {
    instance.scrollTo(el, { offset: 0 });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0, { immediate: true });
  } else {
    window.scrollTo(0, 0);
  }
}

/** User-initiated back-to-top: eased through Lenis when it is active,
 *  native smooth scroll otherwise (e.g. reduced-motion). */
export function smoothScrollToTop() {
  if (instance) {
    instance.scrollTo(0, { duration: 1.2 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
