/**
 * Curtain transitions cover the whole screen with an opaque panel while the
 * next route mounts underneath. Chromium can rasterize backdrop-filter / blur
 * layers that paint while fully occluded and then keep that stale "blob"
 * raster after the curtain lifts, so the glass cards and glow discs only look
 * sharp after a hard refresh. The curtains broadcast their reveal; the route
 * shell listens and forces one extra layout + paint pass so those layers
 * redraw against the real backdrop.
 */
export const CURTAIN_REVEALED_EVENT = "atlas:curtain-revealed";

export function notifyCurtainRevealed(): void {
  window.dispatchEvent(new Event(CURTAIN_REVEALED_EVENT));
}

/**
 * Toggling display destroys the subtree's paint layers; the browser must
 * rebuild and re-raster everything on the restore flush. Both writes happen
 * in one task, so nothing ever paints the half-hidden state.
 */
export function forceRepaint(root: HTMLElement | null): void {
  if (!root) return;
  const prev = root.style.display;
  root.style.display = "none";
  void root.offsetHeight;
  root.style.display = prev;
}
