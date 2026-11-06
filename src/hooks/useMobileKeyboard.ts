import { useEffect } from "react";

const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']";

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function editableFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const element = target.matches(EDITABLE_SELECTOR)
    ? target
    : target.closest<HTMLElement>(EDITABLE_SELECTOR);
  if (!element) return null;
  if (
    element instanceof HTMLInputElement &&
    NON_TEXT_INPUT_TYPES.has(element.type)
  ) {
    return null;
  }
  return element;
}

function findScrollContainer(start: HTMLElement): HTMLElement | null {
  let node = start.parentElement;
  let fallback: HTMLElement | null = null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflowY === "overlay"
    ) {
      if (node.scrollHeight - node.clientHeight > 1) return node;
      if (!fallback) fallback = node;
    }
    node = node.parentElement;
  }
  return fallback;
}

/**
 * Keeps a focused field above the on-screen keyboard and gives the page (or
 * nearest scroll container) enough room to scroll it into view. Mobile
 * browsers shrink the visual viewport without resizing the layout viewport,
 * so native focus scrolling alone often leaves inputs hidden behind the
 * keyboard.
 */
export function useMobileKeyboard() {
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const isTouchDevice = () =>
      window.matchMedia("(pointer: coarse)").matches;

    let active: HTMLElement | null = null;
    let timers: number[] = [];
    let paddedScroller: HTMLElement | null = null;
    let previousPadding = "";

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const clearScrollerPadding = () => {
      if (!paddedScroller) return;
      paddedScroller.style.paddingBottom = previousPadding;
      paddedScroller = null;
      previousPadding = "";
    };

    const keyboardHeight = () =>
      Math.max(0, window.innerHeight - visualViewport.height);

    const clearBodySpace = () => {
      document.documentElement.style.removeProperty("--keyboard-space");
    };

    const syncSpace = () => {
      const height = keyboardHeight();
      clearScrollerPadding();

      if (!active || !isTouchDevice() || height <= 140) {
        clearBodySpace();
        return;
      }

      if (active.closest("[data-keyboard-managed]")) {
        clearBodySpace();
        return;
      }

      const scroller = findScrollContainer(active);
      if (scroller) {
        clearBodySpace();
        previousPadding = scroller.style.paddingBottom;
        const current =
          Number.parseFloat(window.getComputedStyle(scroller).paddingBottom) ||
          0;
        paddedScroller = scroller;
        scroller.style.paddingBottom = `${current + height}px`;
        return;
      }

      document.documentElement.style.setProperty(
        "--keyboard-space",
        `${height}px`,
      );
    };

    const reveal = () => {
      const element = active;
      if (
        !element ||
        !element.isConnected ||
        document.activeElement !== element
      ) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewTop = visualViewport.offsetTop;
      const viewBottom = viewTop + visualViewport.height;
      const gap = Math.min(24, visualViewport.height * 0.08);

      let delta = 0;
      if (rect.bottom > viewBottom - gap) {
        delta = rect.bottom - (viewBottom - gap);
      } else if (rect.top < viewTop + gap) {
        delta = rect.top - (viewTop + gap);
      }
      if (Math.abs(delta) < 1) return;

      const scroller = findScrollContainer(element);
      if (scroller) {
        scroller.scrollBy({ top: delta, behavior: "smooth" });
      } else {
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    };

    const scheduleReveal = () => {
      clearTimers();
      timers = [80, 320, 620].map((delay) =>
        window.setTimeout(() => {
          syncSpace();
          reveal();
        }, delay),
      );
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTouchDevice()) return;
      const element = editableFrom(event.target);
      if (!element) return;
      active = element;
      scheduleReveal();
    };

    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof HTMLElement && editableFrom(next)) return;
      active = null;
      clearTimers();
      clearScrollerPadding();
      clearBodySpace();
    };

    const handleViewportResize = () => {
      if (!active) return;
      syncSpace();
      window.setTimeout(reveal, 60);
    };

    const handleWindowResize = () => {
      if (!active) return;
      syncSpace();
      window.setTimeout(reveal, 60);
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    visualViewport.addEventListener("resize", handleViewportResize);
    window.addEventListener("resize", handleWindowResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      visualViewport.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("resize", handleWindowResize);
      clearTimers();
      clearScrollerPadding();
      clearBodySpace();
    };
  }, []);
}
